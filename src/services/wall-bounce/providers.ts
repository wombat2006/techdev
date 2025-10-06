/**
 * Wall-Bounce Provider Manager
 * プロバイダー管理とCircuit Breaker初期化
 */

import type {
  IWallBounceProviderManager,
  LLMProvider,
  ExecuteOptions,
  TaskType
} from './types';
import { providersConfig, DEFAULT_AGGREGATOR_PROVIDER, COMPLEX_AGGREGATOR_PROVIDER } from './constants';
import { CircuitBreaker } from '../../utils/circuit-breaker';
import { logger } from '../../utils/logger';

export class WallBounceProviderManager implements IWallBounceProviderManager {
  public readonly providers: Map<string, LLMProvider> = new Map();
  public readonly providerOrder: string[] = [];
  public readonly circuitBreakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Invoker登録用のコールバック
   * 実際のLLM呼び出しロジックはInvokerモジュールが提供
   */
  private invokerCallbacks: {
    gemini?: (prompt: string, version: string) => Promise<any>;
    gpt5?: (prompt: string, config: any) => Promise<any>;
    claude?: (prompt: string, version: string) => Promise<any>;
    openrouter?: (key: string) => LLMProvider;
  } = {};

  /**
   * Invokerコールバックを設定
   */
  setInvokerCallbacks(callbacks: {
    gemini?: (prompt: string, version: string) => Promise<any>;
    gpt5?: (prompt: string, config: any) => Promise<any>;
    claude?: (prompt: string, version: string) => Promise<any>;
    openrouter?: (key: string) => LLMProvider;
  }): void {
    this.invokerCallbacks = callbacks;
  }

  /**
   * プロバイダーを初期化
   */
  initializeProviders(): void {
    // Load providers from external configuration
    for (const providerConfig of providersConfig.providers) {
      let providerInstance: LLMProvider | null = null;
      let invokeHandler: ((prompt: string) => Promise<any>) | null = null;

      // Create appropriate invoke handler based on invocation type
      switch (providerConfig.invocationType) {
        case 'gemini':
          if (!this.invokerCallbacks.gemini) {
            logger.warn('Gemini invoker callback not set, skipping provider', { key: providerConfig.key });
            continue;
          }
          invokeHandler = (prompt: string) =>
            this.invokerCallbacks.gemini!(prompt, providerConfig.modelArgs?.version || '2.5-pro');
          break;

        case 'gpt5':
          if (!this.invokerCallbacks.gpt5) {
            logger.warn('GPT-5 invoker callback not set, skipping provider', { key: providerConfig.key });
            continue;
          }
          invokeHandler = (prompt: string) =>
            this.invokerCallbacks.gpt5!(prompt, {
              model: providerConfig.modelArgs?.model || providerConfig.model,
              specialization: providerConfig.modelArgs?.specialization || 'general'
            });
          break;

        case 'claude':
          if (!this.invokerCallbacks.claude) {
            logger.warn('Claude invoker callback not set, skipping provider', { key: providerConfig.key });
            continue;
          }
          invokeHandler = (prompt: string) =>
            this.invokerCallbacks.claude!(prompt, providerConfig.modelArgs?.version || providerConfig.key);
          break;

        case 'openrouter':
          if (!this.invokerCallbacks.openrouter) {
            logger.warn('OpenRouter invoker callback not set, skipping provider', { key: providerConfig.key });
            continue;
          }
          providerInstance = this.invokerCallbacks.openrouter(providerConfig.key);
          break;

        default:
          logger.warn('Unknown invocation type for provider', {
            key: providerConfig.key,
            type: providerConfig.invocationType
          });
          continue;
      }

      if (providerInstance) {
        this.providers.set(providerConfig.key, providerInstance);
      } else if (invokeHandler) {
        this.providers.set(providerConfig.key, {
          name: providerConfig.name,
          model: providerConfig.model,
          modelArgs: providerConfig.modelArgs,
          invoke: invokeHandler
        });
      } else {
        logger.error('Provider registration failed - no handler created', { key: providerConfig.key });
        continue;
      }

      this.providerOrder.push(providerConfig.key);
    }

    // Count providers by type
    const geminiCount = providersConfig.providers.filter(p => p.invocationType === 'gemini').length;
    const gpt5Count = providersConfig.providers.filter(p => p.invocationType === 'gpt5').length;
    const anthropicCount = providersConfig.providers.filter(p => p.invocationType === 'claude').length;
    const openRouterCount = providersConfig.providers.filter(p => p.invocationType === 'openrouter').length;

    logger.info('🚀 Wall-Bounce Providers初期化完了（外部設定ファイルから読み込み）', {
      total_providers: this.providers.size,
      gemini_providers: geminiCount,
      gpt5_providers: gpt5Count,
      anthropic_providers: anthropicCount,
      openrouter_providers: openRouterCount,
      default_aggregator: DEFAULT_AGGREGATOR_PROVIDER,
      complex_aggregator: COMPLEX_AGGREGATOR_PROVIDER,
      config_source: 'src/config/llm-providers.json'
    });
  }

  /**
   * Circuit Breakerを初期化
   */
  initializeCircuitBreakers(): void {
    // 各プロバイダにサーキットブレーカーを設定
    for (const providerKey of this.providers.keys()) {
      const cb = new CircuitBreaker(providerKey, {
        failureThreshold: 5,
        resetTimeout: 60000,
        halfOpenAttempts: 3
      });
      this.circuitBreakers.set(providerKey, cb);
    }

    logger.info('⚡ Circuit Breakers initialized', {
      count: this.circuitBreakers.size
    });
  }

  /**
   * プロバイダー順序を取得
   */
  getProviderOrder(options: ExecuteOptions): string[] {
    const baseOrder = [...this.providerOrder];

    // Provider override指定がある場合
    if (options.providerOverride && options.providerOverride.length > 0) {
      return options.providerOverride;
    }

    // Custom provider order指定がある場合
    if (options.providerOrder && options.providerOrder.length > 0) {
      return options.providerOrder;
    }

    // Coding task detection - GPT-5 Codex を最優先
    const prioritizedCodingProviders = ['gpt-5-codex', 'gpt-5', 'qwen3-coder'];

    if (this.isCodingTask(options)) {
      const codingPreferred = baseOrder.filter(name => prioritizedCodingProviders.includes(name));
      const remaining = baseOrder.filter(name => !prioritizedCodingProviders.includes(name));
      const reordered = [...codingPreferred, ...remaining];

      logger.debug('🧠 Coding task detected, prioritizing GPT-5 Codex', {
        providers: reordered,
        prioritized: codingPreferred
      });

      return reordered;
    }

    return baseOrder;
  }

  /**
   * 特定のプロバイダーを選択
   */
  selectSpecificProviders(taskType: TaskType): string[] {
    // Task type別のprovider推奨
    const taskProviderMap: Record<TaskType, string[]> = {
      'architecture': ['opus-4.1', 'sonnet-4.5', 'gpt-5'],
      'code-review': ['gpt-5-codex', 'gpt-5', 'qwen3-coder', 'sonnet-4.5'],
      'implementation': ['gpt-5-codex', 'gpt-5', 'qwen3-coder', 'gemini-2.5-flash'],
      'security': ['opus-4.1', 'sonnet-4.5', 'gpt-5'],
      'optimization': ['gpt-5-codex', 'qwen3-coder', 'gemini-2.5-pro', 'sonnet-4.5'],
      'integration': ['gpt-5', 'gemini-2.5-pro', 'sonnet-4.5'],
      'general': ['gemini-2.5-flash', 'gpt-5', 'sonnet-4.5']
    };

    const recommended = taskProviderMap[taskType] || taskProviderMap['general'];

    // 利用可能なproviderのみを返す
    const available = recommended.filter(key => this.providers.has(key));

    logger.debug(`🎯 Selected providers for ${taskType} task`, {
      recommended,
      available
    });

    return available;
  }

  /**
   * Aggregatorを選択
   */
  selectAggregator(prompt: string, taskType: 'basic' | 'premium' | 'critical'): string {
    const config = providersConfig.aggregatorSelection;

    // Check task type mapping first
    if (providersConfig.taskTypeMapping[taskType]) {
      const mappedAggregator = providersConfig.taskTypeMapping[taskType];
      logger.info(`🎯 Using ${mappedAggregator} aggregator for ${taskType} task`);
      return mappedAggregator;
    }

    // Build complexity indicators from config
    const indicators = config.complexityIndicators;
    const complexityChecks = [
      // English keywords
      ...indicators.keywords.map(keyword => new RegExp(keyword, 'i')),
      // Japanese keywords
      ...indicators.japaneseKeywords.map(keyword => new RegExp(keyword)),
      // Prompt length
      prompt.length > indicators.promptLengthThreshold,
      // Question marks count
      (prompt.match(/\?/g) || []).length > indicators.questionMarkThreshold
    ];

    const complexityScore = complexityChecks.filter(check =>
      typeof check === 'boolean' ? check : check.test(prompt)
    ).length;

    // Use complex aggregator if complexity score meets threshold
    if (complexityScore >= config.complexityThreshold) {
      logger.info(`🎯 Using ${config.complexAggregator} aggregator for complex query`, { complexityScore });
      return config.complexAggregator;
    }

    // Default to standard aggregator
    logger.info(`🎯 Using ${config.defaultAggregator} aggregator for standard query`, { complexityScore });
    return config.defaultAggregator;
  }

  /**
   * コーディングタスクか判定
   */
  private isCodingTask(options: ExecuteOptions): boolean {
    if (options?.domain === 'coding') {
      return true;
    }

    // プロンプトベースの判定は呼び出し側で行う
    return false;
  }
}
