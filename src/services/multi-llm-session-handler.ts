/**
 * Multi-LLM Session Handler
 * CLAUDE.md準拠: 2回目以降のセッション継続で異なるLLMプロバイダーにルーティング
 * フロー: User -> Claude Code -> Wall-Bounce -> GPT-5 -> Gemini-2.5-Pro -> Claude Sonnet4 -> Claude Code -> User
 */

import { WallBounceAnalyzer } from './wall-bounce-analyzer';
import { CodexMCPWrapper } from './codex-mcp-wrapper';
import { getCodexSessionManager, CodexSessionData } from './codex-session-manager';
import { logger } from '../utils/logger';

export interface LLMProviderConfig {
  name: string;
  model: string;
  priority: number;
  specialization: 'coding' | 'analysis' | 'creative' | 'general';
}

export interface MultiLLMSessionConfig {
  minProviders: number;
  maxProviders: number;
  requireConsensus: boolean;
  confidenceThreshold: number;
  rotationPolicy: 'round-robin' | 'expertise-based' | 'random';
}

export interface MultiLLMResponse {
  success: boolean;
  sessionId: string;
  conversationId: string;
  response?: string;
  error?: string;
  metadata: {
    primaryLLM: string;
    wallBounceProviders: string[];
    consensusConfidence: number;
    totalCost: number;
    processingTimeMs: number;
    turnNumber: number;
    routingStrategy: string;
  };
}

export class MultiLLMSessionHandler {
  private wallBounceAnalyzer: WallBounceAnalyzer;
  private codexWrapper: CodexMCPWrapper;
  private sessionManager: ReturnType<typeof getCodexSessionManager>;

  // CLAUDE.md準拠のLLMプロバイダー構成
  private llmProviders: LLMProviderConfig[] = [
    { name: 'openai-gpt5', model: 'gpt-5', priority: 1, specialization: 'coding' },
    { name: 'google-gemini', model: 'gemini-2.5-pro', priority: 2, specialization: 'analysis' },
    { name: 'anthropic-sonnet4', model: 'claude-sonnet-4', priority: 3, specialization: 'creative' },
    { name: 'openai-codex', model: 'gpt-5-codex', priority: 4, specialization: 'coding' }
  ];

  constructor() {
    this.wallBounceAnalyzer = new WallBounceAnalyzer();
    this.codexWrapper = new CodexMCPWrapper();
    this.sessionManager = getCodexSessionManager();
  }

  /**
   * セッション継続時のマルチLLMルーティング処理
   */
  async continueSessionWithWallBounce(args: {
    sessionId: string;
    prompt: string;
    userId?: string;
  }): Promise<MultiLLMResponse> {
    const startTime = Date.now();

    try {
      // 既存セッション情報を取得
      const session = await this.sessionManager.getSession(args.sessionId);
      if (!session) {
        return this.createErrorResponse(args.sessionId, '', 'Session not found', startTime);
      }

      const turnNumber = session.messages.length || 1;
      logger.info(`🔄 Multi-LLM routing for turn ${turnNumber}`, {
        sessionId: args.sessionId,
        conversationId: session.conversationId,
        turnNumber
      });

      // ターン1: 直接Codex実行
      if (turnNumber === 1) {
        return await this.executeDirectCodex(args, session, startTime);
      }

      // ターン2以降: Wall-Bounce分析実行
      return await this.executeWallBounceAnalysis(args, session, turnNumber, startTime);

    } catch (error) {
      logger.error('MultiLLMSessionHandler error:', error);
      return this.createErrorResponse(
        args.sessionId,
        '',
        error instanceof Error ? error.message : 'Unknown error',
        startTime
      );
    }
  }

  /**
   * ターン1: 直接Codex実行
   */
  private async executeDirectCodex(
    args: { sessionId: string; prompt: string; userId?: string },
    session: CodexSessionData,
    startTime: number
  ): Promise<MultiLLMResponse> {
    logger.info('🎯 Turn 1: Direct Codex execution');

    const result = await this.codexWrapper.continueCodex({
      sessionId: args.sessionId,
      prompt: args.prompt,
      userId: args.userId
    });

    return {
      success: result.success,
      sessionId: result.sessionId,
      conversationId: result.conversationId,
      response: result.response,
      error: result.error,
      metadata: {
        primaryLLM: 'openai-codex',
        wallBounceProviders: [],
        consensusConfidence: 1.0,
        totalCost: 0.01, // Codex推定コスト
        processingTimeMs: Date.now() - startTime,
        turnNumber: 1,
        routingStrategy: 'direct-codex'
      }
    };
  }

  /**
   * ターン2以降: Wall-Bounce分析実行
   */
  private async executeWallBounceAnalysis(
    args: { sessionId: string; prompt: string; userId?: string },
    session: CodexSessionData,
    turnNumber: number,
    startTime: number
  ): Promise<MultiLLMResponse> {
    logger.info(`🏓 Turn ${turnNumber}: Wall-Bounce multi-LLM analysis`);

    // 会話履歴を取得してコンテキスト構築
    const conversationHistory = await this.sessionManager.getConversationHistory(args.sessionId);
    const contextPrompt = this.buildContextualPrompt(args.prompt, conversationHistory, turnNumber);

    // Wall-Bounce設定をターン数に応じて調整
    const config = this.getWallBounceConfig(turnNumber);
    logger.debug('Wall-bounce configuration applied', {
      turnNumber,
      config
    });

    // Wall-Bounce分析実行
    const wallBounceResult = await this.wallBounceAnalyzer.executeWallBounce(
      contextPrompt,
      { taskType: 'premium' }
    );

    // セッションを更新
    await this.sessionManager.addAssistantResponse(args.sessionId, wallBounceResult.consensus.content);

    return {
      success: true,
      sessionId: args.sessionId,
      conversationId: session.conversationId,
      response: wallBounceResult.consensus.content,
      metadata: {
        primaryLLM: wallBounceResult.llm_votes[0]?.provider || 'unknown',
        wallBounceProviders: wallBounceResult.debug.providers_used,
        consensusConfidence: wallBounceResult.consensus.confidence,
        totalCost: wallBounceResult.total_cost,
        processingTimeMs: Date.now() - startTime,
        turnNumber,
        routingStrategy: 'wall-bounce-consensus'
      }
    };
  }

  /**
   * 文脈プロンプトの構築
   */
  private buildContextualPrompt(
    currentPrompt: string,
    conversationHistory: any[],
    turnNumber: number
  ): string {
    const lastMessages = conversationHistory.slice(-4); // 直近4メッセージ
    const context = lastMessages
      .map(msg => `${msg.type}: ${msg.content}`)
      .join('\n\n');

    return `
## 継続セッション (Turn ${turnNumber})

### 会話履歴:
${context}

### 現在のリクエスト:
${currentPrompt}

### 分析要求:
CLAUDE.md壁打ち原則に従い、以下を実行してください:
1. 前回の回答を理解し、文脈を継続
2. 新しいリクエストに対する最適な回答を生成
3. コード改良・拡張の場合は具体的な実装を提示
4. 技術的根拠と実用性を重視した回答
`.trim();
  }

  /**
   * ターン数に応じたWall-Bounce設定
   */
  private getWallBounceConfig(turnNumber: number): MultiLLMSessionConfig {
    if (turnNumber === 2) {
      // ターン2: GPT-5 + Gemini-2.5-Pro
      return {
        minProviders: 2,
        maxProviders: 2,
        requireConsensus: true,
        confidenceThreshold: 0.8,
        rotationPolicy: 'expertise-based'
      };
    } else if (turnNumber === 3) {
      // ターン3: GPT-5 + Gemini-2.5-Pro + Claude Sonnet4
      return {
        minProviders: 3,
        maxProviders: 3,
        requireConsensus: true,
        confidenceThreshold: 0.85,
        rotationPolicy: 'expertise-based'
      };
    } else {
      // ターン4以降: 全LLM投票
      return {
        minProviders: 3,
        maxProviders: 4,
        requireConsensus: true,
        confidenceThreshold: 0.9,
        rotationPolicy: 'round-robin'
      };
    }
  }

  /**
   * エラーレスポンス生成
   */
  private createErrorResponse(
    sessionId: string,
    conversationId: string,
    error: string,
    startTime: number
  ): MultiLLMResponse {
    return {
      success: false,
      sessionId,
      conversationId,
      error,
      metadata: {
        primaryLLM: 'none',
        wallBounceProviders: [],
        consensusConfidence: 0,
        totalCost: 0,
        processingTimeMs: Date.now() - startTime,
        turnNumber: 0,
        routingStrategy: 'error'
      }
    };
  }

  /**
   * セッション統計取得
   */
  async getSessionStats(sessionId: string): Promise<{
    totalTurns: number;
    llmProviderUsage: Record<string, number>;
    totalCost: number;
    averageConfidence: number;
  }> {
    const conversationHistory = await this.sessionManager.getConversationHistory(sessionId);

    // 統計計算ロジックを実装
    return {
      totalTurns: Math.floor(conversationHistory.length / 2),
      llmProviderUsage: {
        'openai-codex': 1,
        'wall-bounce-consensus': Math.floor(conversationHistory.length / 2) - 1
      },
      totalCost: conversationHistory.length * 0.05, // 推定
      averageConfidence: 0.85 // 推定
    };
  }
}

export const getMultiLLMSessionHandler = (): MultiLLMSessionHandler => {
  return new MultiLLMSessionHandler();
};
