/**
 * Wall-Bounce Prompt Builder
 * プロンプト構築とWall-Bounce結果構築ロジック
 */

import type {
  IWallBouncePromptBuilder,
  LLMResponse,
  WallBounceResult,
  ExecuteOptions
} from './types';
import { PROVIDER_GUIDANCE, AGGREGATOR_INSTRUCTIONS } from './constants';
import type { WallBounceConsensus } from './consensus';

export class WallBouncePromptBuilder implements IWallBouncePromptBuilder {
  constructor(private consensus: WallBounceConsensus) {}

  /**
   * プロバイダー別プロンプトを構築
   */
  buildProviderPrompt(
    prompt: string,
    providerKey: string,
    options: ExecuteOptions
  ): string {
    const mode = options.mode || 'parallel';
    const guidance = PROVIDER_GUIDANCE[providerKey];

    // Custom guidance優先
    if (options.customGuidance && options.customGuidance[providerKey]) {
      return `${prompt}\n\n追加指示:\n- ${options.customGuidance[providerKey]}`;
    }

    const parallelLines = guidance?.parallel || [
      '提示した課題に対して独自の観点から分析してください。',
      '根拠を明確にし、箇条書き中心で整理してください。'
    ];

    if (mode === 'parallel') {
      const instruction = parallelLines.map(line => `- ${line}`).join('\n');
      return `${prompt}\n\n追加指示:\n${instruction}`;
    }

    // Sequential mode - より詳細なコンテキストが必要な場合は呼び出し側で処理
    const sequentialLine = guidance?.sequential || '既出の出力を踏まえ、新しい観点や注意点を補足してください。';
    return `${prompt}\n\n追加指示:\n- ${sequentialLine}`;
  }

  /**
   * Deep sequentialプロンプトを構築
   */
  buildDeepSequentialPrompt(
    prompt: string,
    providerKey: string,
    roundNumber: number,
    previousResponses: LLMResponse[]
  ): string {
    const maxRounds = 6; // Wall-Bounce最大ラウンド数
    const guidance = PROVIDER_GUIDANCE[providerKey];
    const sequentialLine = guidance?.sequential || '既出の出力を踏まえ、新しい観点や注意点を補足してください。';

    let contextSection = `【Wall-Bounce ラウンド ${roundNumber}/${maxRounds}】\n`;

    // Add previous responses context
    if (previousResponses.length > 0) {
      contextSection += '\n既存の分析結果:\n';
      previousResponses.forEach((resp, idx) => {
        const provider = (resp as any).provider || `Provider-${idx + 1}`;
        contextSection += `【${provider}】\n${this.truncate(resp.content, 600)}\n\n`;
      });
    }

    return `${prompt}\n\n${contextSection}\n追加指示:\n- ${sequentialLine}\n- ラウンド ${roundNumber}/${maxRounds} の分析として、前の分析から深化させてください。`;
  }

  /**
   * Aggregatorプロンプトを構築
   */
  buildAggregatorPrompt(
    prompt: string,
    responses: LLMResponse[]
  ): string {
    const header = AGGREGATOR_INSTRUCTIONS.map(line => `- ${line}`).join('\n');
    const responseSection = responses
      .map((resp, idx) => {
        const provider = (resp as any).provider || `Provider-${idx + 1}`;
        return `【${provider}】(confidence: ${resp.confidence.toFixed(2)})\n${this.truncate(resp.content, 1200)}`;
      })
      .join('\n\n');

    return `${header}\n\n元の依頼:\n${prompt}\n\n個別回答:\n${responseSection}`;
  }

  /**
   * 累積コンテキストを構築
   */
  buildCumulativeContext(responses: LLMResponse[]): string {
    if (responses.length === 0) {
      return '';
    }

    return responses
      .map((resp, idx) => {
        const provider = (resp as any).provider || `Provider-${idx + 1}`;
        return `【${provider}】: ${this.truncate(resp.content, 400)}`;
      })
      .join('\n\n');
  }

  /**
   * Wall-Bounce結果を構築
   */
  buildWallBounceResult(
    finalAnalysis: LLMResponse,
    responses: LLMResponse[],
    options: ExecuteOptions,
    startTime: number
  ): WallBounceResult {
    const processingTimeMs = Date.now() - startTime;

    // Calculate total cost
    const totalCost = responses.reduce(
      (sum, resp) => sum + (resp.cost || 0),
      finalAnalysis.cost || 0
    );

    // Build votes
    const votes = responses.map((resp, idx) => {
      const provider = (resp as any).provider || `provider-${idx}`;
      return {
        provider,
        model: provider,
        response: resp,
        agreement_score: resp.confidence
      };
    });

    // Add aggregator vote
    const aggregatorProvider = (finalAnalysis as any).provider || 'aggregator';
    votes.push({
      provider: aggregatorProvider,
      model: aggregatorProvider,
      response: finalAnalysis,
      agreement_score: finalAnalysis.confidence
    });

    // Calculate consensus score using consensus calculator
    const consensusScore = this.consensus.calculateConsensusScore(responses);

    // Extract provider names
    const providersUsed = responses.map((resp, idx) => {
      return (resp as any).provider || `provider-${idx}`;
    });

    return {
      final_answer: finalAnalysis.content,
      consensus_score: consensusScore,
      quality_score: finalAnalysis.confidence,
      providers_used: providersUsed,
      responses: responses.map((resp, idx) => ({
        provider: (resp as any).provider || `provider-${idx}`,
        content: resp.content,
        confidence: resp.confidence
      })),
      consensus: {
        content: `${finalAnalysis.content}\n\n[Wall-Bounce統合分析完了]`,
        confidence: finalAnalysis.confidence,
        reasoning: finalAnalysis.reasoning
      },
      llm_votes: votes,
      total_cost: totalCost,
      processing_time_ms: processingTimeMs,
      debug: {
        wall_bounce_verified: true,
        providers_used: [...providersUsed, aggregatorProvider],
        tier_escalated: false,
        provider_errors: []
      }
    };
  }

  /**
   * テキストを指定長に切り詰め
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }
}
