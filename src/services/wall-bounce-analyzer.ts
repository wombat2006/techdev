/**
 * 壁打ち分析システム - 複数LLMによる協調分析
 * 必須要件: すべてのクエリで最低2つのLLMによる分析を実行
 */

import { logger } from '../utils/logger';
import { 
  recordWallBounceAnalysis, 
  recordLLMResponse, 
  recordError 
} from '../metrics/prometheus-client';

export interface LLMProvider {
  name: string;
  model: string;
  invoke: (prompt: string, options?: any) => Promise<LLMResponse>;
}

export interface LLMResponse {
  content: string;
  confidence: number;
  reasoning: string;
  cost: number;
  tokens: {
    input: number;
    output: number;
  };
}

export interface WallBounceResult {
  consensus: {
    content: string;
    confidence: number;
    reasoning: string;
  };
  llm_votes: Array<{
    provider: string;
    model: string;
    response: LLMResponse;
    agreement_score: number;
  }>;
  total_cost: number;
  processing_time_ms: number;
  debug: {
    wall_bounce_verified: boolean;
    providers_used: string[];
    tier_escalated: boolean;
  };
}

export class WallBounceAnalyzer {
  private providers: Map<string, LLMProvider> = new Map();
  
  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Tier 1: Gemini 2.5 Pro (Primary)
    this.providers.set('gemini-2.5-pro', {
      name: 'Gemini',
      model: 'gemini-2.5-pro',
      invoke: this.invokeGemini.bind(this)
    });

    // Tier 2: GPT-5 (Secondary) 
    this.providers.set('gpt-5', {
      name: 'OpenAI',
      model: 'gpt-5',
      invoke: this.invokeGPT5.bind(this)
    });

    // Tier 3: Claude Sonnet4 (Premium)
    this.providers.set('claude-sonnet4', {
      name: 'Claude',
      model: 'claude-3-5-sonnet-latest',
      invoke: this.invokeClaude.bind(this)
    });

    // Tier 4: OpenRouter Ensemble (Auxiliary)
    this.providers.set('openrouter-ensemble', {
      name: 'OpenRouter',
      model: 'meta-llama/llama-3.1-405b-instruct',
      invoke: this.invokeOpenRouter.bind(this)
    });
  }

  /**
   * 壁打ち分析の実行 - 必須：最低2つのLLMで分析
   */
  async executeWallBounce(
    prompt: string,
    taskType: 'basic' | 'premium' | 'critical' = 'basic',
    options: {
      minProviders?: number;
      maxProviders?: number;
      requireConsensus?: boolean;
      confidenceThreshold?: number;
    } = {}
  ): Promise<WallBounceResult> {
    const startTime = Date.now();
    const { 
      minProviders = 2, 
      maxProviders = 4, 
      requireConsensus = true, 
      confidenceThreshold = 0.8 
    } = options;

    // タスクタイプに基づくプロバイダー選択
    const selectedProviders = this.selectProvidersByTaskType(taskType, minProviders, maxProviders);
    
    logger.info('🔄 壁打ち分析開始', {
      taskType,
      providers: selectedProviders.map(p => p.name),
      prompt: prompt.substring(0, 100) + '...'
    });

    // 並列でLLM呼び出し
    const llmVotes = await this.executeLLMCalls(selectedProviders, prompt);
    
    // 合意形成
    const consensus = await this.buildConsensus(llmVotes, requireConsensus, confidenceThreshold);
    
    // エスカレーション判定
    const tierEscalated = await this.checkTierEscalation(llmVotes, consensus, taskType);
    
    const processingTime = Date.now() - startTime;
    const totalCost = llmVotes.reduce((sum, vote) => sum + vote.response.cost, 0);

    const result: WallBounceResult = {
      consensus,
      llm_votes: llmVotes,
      total_cost: totalCost,
      processing_time_ms: processingTime,
      debug: {
        wall_bounce_verified: llmVotes.length >= minProviders,
        providers_used: llmVotes.map(v => v.provider),
        tier_escalated: tierEscalated
      }
    };

    // Prometheusメトリクス記録
    const status = consensus.confidence >= confidenceThreshold ? 'success' : 'error';
    recordWallBounceAnalysis(
      taskType,
      result.debug.providers_used,
      consensus.confidence,
      processingTime,
      totalCost,
      status
    );

    logger.info('✅ 壁打ち分析完了', {
      providers_count: llmVotes.length,
      consensus_confidence: consensus.confidence,
      cost: totalCost,
      time_ms: processingTime,
      metrics_recorded: true
    });

    return result;
  }

  private selectProvidersByTaskType(
    taskType: 'basic' | 'premium' | 'critical',
    minProviders: number,
    maxProviders: number
  ): LLMProvider[] {
    const providers: LLMProvider[] = [];

    switch (taskType) {
      case 'basic':
        // 基本: Gemini + GPT-5
        providers.push(
          this.providers.get('gemini-2.5-pro')!,
          this.providers.get('gpt-5')!
        );
        break;
        
      case 'premium':
        // プレミアム: Gemini + GPT-5 + Claude
        providers.push(
          this.providers.get('gemini-2.5-pro')!,
          this.providers.get('gpt-5')!,
          this.providers.get('claude-sonnet4')!
        );
        break;
        
      case 'critical':
        // クリティカル: 全プロバイダー
        providers.push(...Array.from(this.providers.values()));
        break;
    }

    return providers.slice(0, Math.min(maxProviders, Math.max(minProviders, providers.length)));
  }

  private async executeLLMCalls(providers: LLMProvider[], prompt: string) {
    const promises = providers.map(async (provider) => {
      const llmStartTime = Date.now();
      
      try {
        const response = await provider.invoke(prompt);
        const llmDuration = Date.now() - llmStartTime;
        
        // LLMメトリクス記録
        recordLLMResponse(
          provider.name,
          provider.model,
          llmDuration,
          response.tokens.input,
          response.tokens.output,
          response.cost,
          'success'
        );
        
        return {
          provider: provider.name,
          model: provider.model,
          response,
          agreement_score: 0 // 後で計算
        };
      } catch (error) {
        const llmDuration = Date.now() - llmStartTime;
        
        // エラーメトリクス記録
        recordError('llm_invocation_error', 'high', provider.name);
        recordLLMResponse(
          provider.name,
          provider.model,
          llmDuration,
          0,
          0,
          0,
          'error'
        );
        
        logger.error(`❌ ${provider.name} 呼び出しエラー`, { error });
        return {
          provider: provider.name,
          model: provider.model,
          response: {
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            confidence: 0,
            reasoning: 'LLM呼び出しに失敗',
            cost: 0,
            tokens: { input: 0, output: 0 }
          },
          agreement_score: 0
        };
      }
    });

    const results = await Promise.all(promises);
    
    // 合意スコア計算
    this.calculateAgreementScores(results);
    
    return results;
  }

  private calculateAgreementScores(votes: any[]) {
    // 簡易的なテキスト類似度による合意スコア計算
    for (let i = 0; i < votes.length; i++) {
      let totalSimilarity = 0;
      let comparisons = 0;
      
      for (let j = 0; j < votes.length; j++) {
        if (i !== j) {
          const similarity = this.calculateTextSimilarity(
            votes[i].response.content,
            votes[j].response.content
          );
          totalSimilarity += similarity;
          comparisons++;
        }
      }
      
      votes[i].agreement_score = comparisons > 0 ? totalSimilarity / comparisons : 0;
    }
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // 簡易的なJaccard類似度
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private async buildConsensus(votes: any[], requireConsensus: boolean, confidenceThreshold: number) {
    // 最高信頼度の回答を基準に合意を構築
    const sortedVotes = votes.sort((a, b) => b.response.confidence - a.response.confidence);
    const bestVote = sortedVotes[0];
    
    // 高合意度の回答があるかチェック
    const highAgreementVotes = votes.filter(v => v.agreement_score >= 0.7);
    
    if (highAgreementVotes.length >= 2) {
      return {
        content: bestVote.response.content,
        confidence: Math.min(bestVote.response.confidence * 1.1, 1.0), // 合意ボーナス
        reasoning: `${highAgreementVotes.length}つのLLMが高い合意を示しました: ${bestVote.response.reasoning}`
      };
    } else {
      return {
        content: bestVote.response.content,
        confidence: bestVote.response.confidence * 0.9, // 合意不足のペナルティ
        reasoning: `合意が不十分です。最高信頼度の回答を採用: ${bestVote.response.reasoning}`
      };
    }
  }

  private async checkTierEscalation(votes: any[], consensus: any, taskType: string): Promise<boolean> {
    // エスカレーション条件
    const lowConfidenceCount = votes.filter(v => v.response.confidence < 0.6).length;
    const disagreementCount = votes.filter(v => v.agreement_score < 0.5).length;
    
    return (lowConfidenceCount > votes.length / 2) || 
           (disagreementCount > votes.length / 2) ||
           (consensus.confidence < 0.7 && taskType === 'critical');
  }

  // LLMプロバイダー実装（モック）
  private async invokeGemini(prompt: string): Promise<LLMResponse> {
    // 実際の実装ではGemini APIを呼び出し
    await this.simulateDelay(800, 1200);
    return {
      content: `[Gemini 2.5 Pro分析] ${prompt.substring(0, 50)}...に対する分析結果`,
      confidence: 0.85 + Math.random() * 0.1,
      reasoning: 'Gemini 2.5 Proによる多角的分析',
      cost: 0.003,
      tokens: { input: prompt.length / 4, output: 150 }
    };
  }

  private async invokeGPT5(prompt: string): Promise<LLMResponse> {
    // 実際の実装ではOpenAI GPT-5 APIを呼び出し
    await this.simulateDelay(600, 1000);
    return {
      content: `[GPT-5分析] ${prompt.substring(0, 50)}...に対する包括的な解析`,
      confidence: 0.88 + Math.random() * 0.08,
      reasoning: 'GPT-5による論理的推論',
      cost: 0.005,
      tokens: { input: prompt.length / 4, output: 180 }
    };
  }

  private async invokeClaude(prompt: string): Promise<LLMResponse> {
    // 実際の実装ではClaude APIを呼び出し
    await this.simulateDelay(700, 1100);
    return {
      content: `[Claude Sonnet4分析] ${prompt.substring(0, 50)}...について詳細分析`,
      confidence: 0.82 + Math.random() * 0.12,
      reasoning: 'Claude Sonnet4による構造化分析',
      cost: 0.008,
      tokens: { input: prompt.length / 4, output: 200 }
    };
  }

  private async invokeOpenRouter(prompt: string): Promise<LLMResponse> {
    // 実際の実装ではOpenRouter APIを呼び出し  
    await this.simulateDelay(1000, 1500);
    return {
      content: `[OpenRouter Ensemble分析] ${prompt.substring(0, 50)}...の補助分析`,
      confidence: 0.78 + Math.random() * 0.15,
      reasoning: 'OpenRouter Ensembleによる補完分析',
      cost: 0.002,
      tokens: { input: prompt.length / 4, output: 120 }
    };
  }

  private async simulateDelay(min: number, max: number): Promise<void> {
    const delay = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

// シングルトンインスタンス
export const wallBounceAnalyzer = new WallBounceAnalyzer();