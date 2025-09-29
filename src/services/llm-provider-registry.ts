/**
 * LLM Provider Registry - Single Responsibility: Provider Management
 * 絶対的命令に従ったLLMプロバイダー管理クラス
 */

import { logger } from '../utils/logger';
import { createCodexGPT5Provider } from './codex-gpt5-provider';

export interface LLMProvider {
  name: string;
  model: string;
  invoke: (prompt: string, options?: any) => Promise<LLMResponse>; // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
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

export type TaskType = 'basic' | 'premium' | 'critical';

/**
 * LLMプロバイダーの登録と管理のみを責任とする
 * 絶対的命令:
 * - OpenAI: 必ずcodex経由で呼び出し（直接API使用禁止）
 * - Anthropic: Claude Code直接呼び出しのみ（API使用絶対禁止）
 */
export class LLMProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();
  private tierMapping: Map<TaskType, string[]> = new Map();

  constructor() {
    this.initializeProviders();
    this.initializeTierMapping();
  }

  private initializeProviders() {
    // Tier 1: Gemini 2.5 Pro (Primary - API Key使用)
    this.providers.set('gemini-2.5-pro', {
      name: 'Gemini',
      model: 'gemini-2.5-pro',
      invoke: this.invokeGemini.bind(this)
    });

    // Tier 2: GPT-5 Codex via Codex CLI (絶対的命令: codex経由のみ)
    const codexGPT5Provider = createCodexGPT5Provider();
    this.providers.set('gpt-5-codex', codexGPT5Provider);

    // Tier 2b: GPT-5 via Codex CLI (汎用タスク)
    this.providers.set('gpt-5-codex-general', {
      name: 'GPT5-Codex-General',
      model: 'gpt-5',
      invoke: this.invokeGPT5.bind(this)
    });

    // Tier 3: Claude via Claude Code直接呼び出し (絶対的命令)
    this.providers.set('claude-code-direct', {
      name: 'Claude-Code-Direct',
      model: 'claude-3-5-sonnet-latest',
      invoke: this.invokeClaude.bind(this)
    });

    logger.info('LLM providers initialized', {
      providerCount: this.providers.size,
      providers: Array.from(this.providers.keys())
    });
  }

  private initializeTierMapping() {
    // タスクタイプ別プロバイダー選択ルール
    this.tierMapping.set('basic', ['gemini-2.5-pro', 'gpt-5-codex']);
    this.tierMapping.set('premium', ['gpt-5-codex-general', 'claude-code-direct']);
    this.tierMapping.set('critical', ['claude-code-direct', 'gpt-5-codex-general']);
  }

  /**
   * タスクタイプに基づいてプロバイダーを選択
   */
  getProvidersForTask(taskType: TaskType, minProviders: number = 2): LLMProvider[] {
    const providerNames = this.tierMapping.get(taskType) || ['gemini-2.5-pro', 'gpt-5-codex'];

    const selectedProviders: LLMProvider[] = [];
    for (const name of providerNames) {
      const provider = this.providers.get(name);
      if (provider) {
        selectedProviders.push(provider);
      }
      if (selectedProviders.length >= minProviders) {
        break;
      }
    }

    // 最低限のプロバイダー数を確保
    if (selectedProviders.length < minProviders) {
      const allProviders = Array.from(this.providers.values());
      for (const provider of allProviders) {
        if (!selectedProviders.includes(provider)) {
          selectedProviders.push(provider);
          if (selectedProviders.length >= minProviders) {
            break;
          }
        }
      }
    }

    logger.info('Selected providers for task', {
      taskType,
      selectedCount: selectedProviders.length,
      providers: selectedProviders.map(p => p.name)
    });

    return selectedProviders;
  }

  /**
   * プロバイダーの可用性確認
   */
  isProviderAvailable(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  /**
   * 利用可能なプロバイダー一覧
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  // === プロバイダー実装メソッド（絶対的命令に従う） ===

  private async invokeGemini(prompt: string): Promise<LLMResponse> {
    // Gemini API実装 (既存コードから移植)
    throw new Error(`Gemini provider implementation needed (prompt length: ${prompt.length})`);
  }

  private async invokeGPT5(prompt: string): Promise<LLMResponse> {
    // 絶対的命令: codex経由でのみ呼び出し
    throw new Error(`GPT-5 Codex provider implementation needed (prompt length: ${prompt.length})`);
  }

  private async invokeClaude(prompt: string): Promise<LLMResponse> {
    // 絶対的命令: Claude Code直接呼び出しのみ
    throw new Error(`Claude Code direct provider implementation needed (prompt length: ${prompt.length})`);
  }
}
