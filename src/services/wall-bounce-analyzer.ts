/**
 * 壁打ち分析システム - 複数LLMによる協調分析
 * 必須要件: すべてのクエリで最低2つのLLMによる分析を実行
 *
 * このファイルは薄いオーケストレーションレイヤーとして機能し、
 * 実際のロジックは /wall-bounce/ モジュールに委譲されます。
 */

import { logger } from '../utils/logger';
import { WallBounceProviderManager } from './wall-bounce/providers';
import { WallBounceInvoker } from './wall-bounce/invokers';
import { WallBouncePromptBuilder } from './wall-bounce/prompts';
import { WallBounceTaskAnalyzer } from './wall-bounce/task-analyzer';
import { WallBounceConsensus } from './wall-bounce/consensus';
import { WallBounceExecutor } from './wall-bounce/executors';
import { createOpenRouterQwen3Provider } from './openrouter-qwen3-provider';

// Re-export types for backward compatibility
export type {
  LLMProvider,
  LLMResponse,
  WallBounceResult,
  ExecuteOptions
} from './wall-bounce/types';

/**
 * Wall-Bounce Analyzer
 *
 * 複数のLLMを組み合わせて協調的な分析を行うシステム。
 * 各モジュールに処理を委譲し、統合された結果を返します。
 */
export class WallBounceAnalyzer {
  private providerManager: WallBounceProviderManager;
  private invoker: WallBounceInvoker;
  private promptBuilder: WallBouncePromptBuilder;
  private taskAnalyzer: WallBounceTaskAnalyzer;
  private consensus: WallBounceConsensus;
  private executor: WallBounceExecutor;

  constructor() {
    logger.info('🏗️ Initializing Wall-Bounce Analyzer (modular architecture)');

    // Initialize core modules
    this.providerManager = new WallBounceProviderManager();
    this.consensus = new WallBounceConsensus();
    this.taskAnalyzer = new WallBounceTaskAnalyzer();
    this.promptBuilder = new WallBouncePromptBuilder(this.consensus);
    this.invoker = new WallBounceInvoker(this.providerManager);

    // Set task analyzer reference in invoker (for Claude internal analysis)
    this.invoker.setTaskAnalyzer(this.taskAnalyzer);

    // Register invoker callbacks with provider manager
    this.providerManager.setInvokerCallbacks({
      gemini: this.invoker.invokeGemini.bind(this.invoker),
      gpt5: this.invoker.invokeGPT5.bind(this.invoker),
      claude: this.invoker.invokeClaude.bind(this.invoker),
      openrouter: (key: string) => {
        // OpenRouter providers (e.g., Qwen3)
        if (key === 'qwen3-coder') {
          return createOpenRouterQwen3Provider();
        }
        throw new Error(`Unknown OpenRouter provider: ${key}`);
      }
    });

    // Initialize providers
    this.providerManager.initializeProviders();
    this.providerManager.initializeCircuitBreakers();

    // Initialize executor
    this.executor = new WallBounceExecutor(
      this.providerManager,
      this.invoker,
      this.promptBuilder,
      this.taskAnalyzer
    );

    logger.info('✅ Wall-Bounce Analyzer initialized successfully', {
      totalProviders: this.providerManager.providers.size,
      providerOrder: this.providerManager.providerOrder
    });
  }

  /**
   * Wall-Bounce分析を実行
   *
   * @param prompt 分析対象のプロンプト
   * @param options 実行オプション
   * @returns Wall-Bounce分析結果
   */
  async executeWallBounce(
    prompt: string,
    options: import('./wall-bounce/types').ExecuteOptions = {}
  ): Promise<import('./wall-bounce/types').WallBounceResult> {
    logger.info('🚀 Wall-Bounce execution requested', {
      mode: options.mode || 'parallel',
      taskType: options.taskType || 'basic',
      depth: options.depth || 3,
      promptLength: prompt.length
    });

    // Delegate to executor
    return await this.executor.execute(prompt, options);
  }
}

/**
 * Singleton instance for backward compatibility
 */
export const wallBounceAnalyzer = new WallBounceAnalyzer();
