# TechSapo Antigravity CLI 統合ガイド

> **2026-06 更新**: 本リポジトリの標準は **Antigravity CLI（`agy`）** です。実装移行の全体方針は [ANTIGRAVITY_CLI_MIGRATION.md](./ANTIGRAVITY_CLI_MIGRATION.md) を参照。本文は legacy Gemini CLI 時代の設計メモを Antigravity 表記に更新したものです。

## Google API から Antigravity CLI への移行戦略

**作成日**: 2025-09-27
**対象**: TechSapo Wall-bounce Analyzer
**目的**: Gemini 2.5 Pro の呼び出し方式変更

---

## 📋 概要

TechSapoの現在のGemini 2.5 Pro統合を、Google API直接呼び出しから**Antigravity CLI経由**に変更する技術ガイドです。

### 変更の背景
- **依存関係軽減**: Google API SDK削除
- **認証簡素化**: Google Login活用
- **コスト削減**: 無料枠の有効活用
- **レート制限改善**: 60 req/min（従来15 req/min）

---

## 🔍 Antigravity CLI 分析結果

### 基本情報
- **プロジェクト**: [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)
- **要件**: Node.js 20+
- **対応OS**: macOS, Linux, Windows

### インストール方法
```bash
# Method 1: NPX（推奨 - インストール不要）
npx @google/gemini-cli

# Method 2: グローバルインストール
npm install -g @google/gemini-cli

# Method 3: Homebrew
brew install gemini-cli
```

### 認証オプション
| 方式 | 無料枠制限 | 推奨用途 |
|------|------------|----------|
| Google Login | 60 req/min, 1,000 req/day | 開発・小規模運用 |
| API Key | 100 req/day | 限定的使用 |
| Vertex AI | エンタープライズ枠 | 本格運用 |

---

## 🏗️ 技術的統合分析

### 現在の実装（Google API直接）
```typescript
// src/services/wall-bounce-analyzer.ts - invokeGemini()
async invokeGemini(prompt: string): Promise<LLMResponse> {
  const startTime = Date.now();

  try {
    const result = await this.genAI.getGenerativeModel({
      model: "gemini-2.5-pro"
    }).generateContent(prompt);

    const response = result.response;
    const text = response.text();

    return {
      content: text,
      provider: 'Gemini',
      tokens: this.estimateTokens(text),
      latency: Date.now() - startTime,
      confidence: 0.85
    };
  } catch (error) {
    // エラーハンドリング
  }
}
```

### 提案する新実装（Antigravity CLI経由）
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async invokeGeminiCLI(prompt: string): Promise<LLMResponse> {
  const startTime = Date.now();

  try {
    // セキュリティ: プロンプトのエスケープ
    const escapedPrompt = this.escapeShellArgument(prompt);

    // Antigravity CLI実行
    const command = `gemini -p "${escapedPrompt}" --output-format json --model gemini-2.5-pro`;

    const { stdout, stderr } = await execAsync(command, {
      timeout: 120000,      // 2分タイムアウト
      maxBuffer: 1024 * 1024, // 1MBバッファ
      cwd: process.cwd()
    });

    // JSON結果パース
    const result = JSON.parse(stdout);

    return {
      content: result.response || result.text,
      provider: 'gemini-cli',
      tokens: result.usage?.totalTokens || this.estimateTokens(result.response),
      latency: Date.now() - startTime,
      confidence: 0.85,
      metadata: {
        usage: result.usage,
        model: result.model || 'gemini-2.5-pro'
      }
    };

  } catch (error) {
    logger.error('Antigravity CLI execution failed', {
      error: error.message,
      stderr: error.stderr
    });
    throw new Error(`Antigravity CLI failed: ${error.message}`);
  }
}

// セキュリティ: シェル引数エスケープ
private escapeShellArgument(arg: string): string {
  return arg.replace(/[;"'`$()\\]/g, '\\$&');
}
```

---

## 🔄 段階的移行戦略

### Phase 1: 並行実装・テスト（1週間）
```typescript
// ハイブリッド実装: 両方式対応
async invokeGeminiWithStrategy(prompt: string): Promise<LLMResponse> {
  const strategy = process.env.GEMINI_STRATEGY || 'api'; // 'api' | 'cli' | 'hybrid'

  switch (strategy) {
    case 'cli':
      return await this.invokeGeminiCLI(prompt);
    case 'hybrid':
      return await this.invokeGeminiWithFallback(prompt);
    default:
      return await this.invokeGeminiAPI(prompt); // 既存
  }
}

// フォールバック戦略
async invokeGeminiWithFallback(prompt: string): Promise<LLMResponse> {
  try {
    // まずCLI試行
    return await this.invokeGeminiCLI(prompt);
  } catch (cliError) {
    logger.warn('Antigravity CLI failed, falling back to API', {
      error: cliError.message
    });

    // API フォールバック
    return await this.invokeGeminiAPI(prompt);
  }
}
```

### Phase 2: A/Bテスト（2週間）
```bash
# 環境変数による制御
GEMINI_CLI_PERCENTAGE=10    # 10%のリクエストでCLI使用
GEMINI_CLI_PERCENTAGE=25    # 25%
GEMINI_CLI_PERCENTAGE=50    # 50%
GEMINI_CLI_PERCENTAGE=100   # 100% - 完全移行
```

```typescript
// A/Bテスト制御ロジック
private shouldUseCLI(): boolean {
  const percentage = parseInt(process.env.GEMINI_CLI_PERCENTAGE || '0');
  const random = Math.random() * 100;
  return random < percentage;
}

async invokeGemini(prompt: string): Promise<LLMResponse> {
  if (this.shouldUseCLI()) {
    return await this.invokeGeminiCLI(prompt);
  } else {
    return await this.invokeGeminiAPI(prompt);
  }
}
```

### Phase 3: 最適化・完全移行（1週間）
```typescript
// CLI専用実装（API削除後）
async invokeGemini(prompt: string): Promise<LLMResponse> {
  return await this.invokeGeminiCLI(prompt);
}

// 依存関係削除
// package.json から @google/generative-ai 削除
npm uninstall @google/generative-ai
```

---

## 📊 パフォーマンス・コスト分析

### レスポンス時間比較
| 方式 | プロセス起動 | ネットワーク | 総時間推定 |
|------|-------------|-------------|------------|
| Google API | 0ms | 56,400ms | 56,400ms |
| Antigravity CLI | +50-100ms | 56,400ms | 56,450-500ms |
| **影響** | **+0.1-0.2%** | **変化なし** | **微小影響** |

### コスト比較（月間1,000リクエスト想定）
```
現在（Google API）:
- Input: 18,000 tokens × $0.00125/1K = $0.0225
- Output: 1,500,000 tokens × $0.005/1K = $7.50
- 月額合計: $7.52

新方式（Antigravity CLI）:
- 無料枠内: $0.00
- 年間削減: $90.24
```

### レート制限比較
| 方式 | 分間制限 | 日間制限 | 現在の使用量 |
|------|----------|----------|-------------|
| Google API | 15 req/min | - | 十分 |
| Antigravity CLI | 60 req/min | 1,000 req/day | **4倍向上** |

---

## 🛠️ 実装手順

### Step 1: 開発環境準備
```bash
# 1. Antigravity CLI 動作確認
npx @google/gemini-cli -p "Hello TechSapo integration test"

# 2. 認証設定
# Google Loginで認証完了

# 3. JSON出力テスト
npx @google/gemini-cli -p "Test JSON output" --output-format json
```

### Step 2: コード実装
```typescript
// src/services/gemini-cli-wrapper.ts (新規ファイル)
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/logger';

export class GeminiCLIWrapper {
  private readonly execAsync = promisify(exec);
  private readonly logger = new Logger('GeminiCLI');

  async generateContent(prompt: string): Promise<GeminiCLIResponse> {
    const startTime = Date.now();

    try {
      const command = this.buildCommand(prompt);
      const result = await this.execAsync(command, {
        timeout: 120000,
        maxBuffer: 1024 * 1024
      });

      return this.parseResponse(result.stdout, startTime);
    } catch (error) {
      this.logger.error('CLI execution failed', { error });
      throw new GeminiCLIError(error.message);
    }
  }

  private buildCommand(prompt: string): string {
    const escaped = this.escapePrompt(prompt);
    return `gemini -p "${escaped}" --output-format json --model gemini-2.5-pro`;
  }

  private escapePrompt(prompt: string): string {
    return prompt.replace(/[\\"`$]/g, '\\$&');
  }

  private parseResponse(stdout: string, startTime: number): GeminiCLIResponse {
    const data = JSON.parse(stdout);
    return {
      content: data.response,
      usage: data.usage,
      latency: Date.now() - startTime,
      model: data.model
    };
  }
}

export interface GeminiCLIResponse {
  content: string;
  usage?: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
  };
  latency: number;
  model: string;
}

export class GeminiCLIError extends Error {
  constructor(message: string) {
    super(`Antigravity CLI Error: ${message}`);
    this.name = 'GeminiCLIError';
  }
}
```

### Step 3: Wall-bounce Analyzer統合
```typescript
// src/services/wall-bounce-analyzer.ts - 既存メソッド更新
import { GeminiCLIWrapper } from './gemini-cli-wrapper';

export class WallBounceAnalyzer {
  private geminiCLI: GeminiCLIWrapper;

  constructor() {
    this.geminiCLI = new GeminiCLIWrapper();
    // 既存のコンストラクタ処理...
  }

  async invokeGemini(prompt: string): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // 戦略選択
      if (this.shouldUseCLI()) {
        return await this.invokeGeminiCLI(prompt);
      } else {
        return await this.invokeGeminiAPI(prompt); // 既存
      }
    } catch (error) {
      logger.error('Gemini invocation failed', { error });
      throw error;
    }
  }

  private async invokeGeminiCLI(prompt: string): Promise<LLMResponse> {
    const result = await this.geminiCLI.generateContent(prompt);

    return {
      content: result.content,
      provider: 'gemini-cli',
      tokens: result.usage?.totalTokens || this.estimateTokens(result.content),
      latency: result.latency,
      confidence: 0.85,
      metadata: {
        usage: result.usage,
        model: result.model
      }
    };
  }

  private shouldUseCLI(): boolean {
    const strategy = process.env.GEMINI_STRATEGY;
    const percentage = parseInt(process.env.GEMINI_CLI_PERCENTAGE || '0');

    switch (strategy) {
      case 'cli':
        return true;
      case 'api':
        return false;
      case 'hybrid':
      default:
        return Math.random() * 100 < percentage;
    }
  }
}
```

---

## 🧪 テスト戦略

### Unit Tests
```typescript
// tests/services/gemini-cli-wrapper.test.ts
import { GeminiCLIWrapper } from '../../src/services/gemini-cli-wrapper';

describe('GeminiCLIWrapper', () => {
  let wrapper: GeminiCLIWrapper;

  beforeEach(() => {
    wrapper = new GeminiCLIWrapper();
  });

  test('should generate content successfully', async () => {
    const prompt = "What is TypeScript?";
    const result = await wrapper.generateContent(prompt);

    expect(result.content).toBeDefined();
    expect(result.latency).toBeGreaterThan(0);
    expect(result.model).toBe('gemini-2.5-pro');
  });

  test('should handle special characters in prompt', async () => {
    const prompt = 'Test with "quotes" and $variables';
    const result = await wrapper.generateContent(prompt);

    expect(result.content).toBeDefined();
  });

  test('should throw error on invalid command', async () => {
    // Mock invalid CLI response
    jest.spyOn(wrapper as any, 'execAsync').mockRejectedValue(new Error('Command failed'));

    await expect(wrapper.generateContent('test')).rejects.toThrow('Antigravity CLI Error');
  });
});
```

### Integration Tests
```typescript
// tests/integration/wall-bounce-gemini-cli.test.ts
describe('Wall-bounce with Antigravity CLI', () => {
  test('should process request with CLI strategy', async () => {
    process.env.GEMINI_STRATEGY = 'cli';

    const analyzer = new WallBounceAnalyzer();
    const result = await analyzer.executeWallBounce('Test prompt', 'basic');

    expect(result.consensus.confidence).toBeGreaterThan(0.7);
    expect(result.providers_used).toContain('gemini-cli');
  });

  test('should fallback to API on CLI failure', async () => {
    process.env.GEMINI_STRATEGY = 'hybrid';

    // Mock CLI failure
    jest.spyOn(GeminiCLIWrapper.prototype, 'generateContent')
        .mockRejectedValue(new Error('CLI failed'));

    const analyzer = new WallBounceAnalyzer();
    const result = await analyzer.executeWallBounce('Test prompt', 'basic');

    expect(result.providers_used).toContain('Gemini'); // API fallback
  });
});
```

---

## 📈 監視・メトリクス

### 追加メトリクス定義
```typescript
// src/metrics/prometheus-client.ts - 追加メトリクス
export const geminiMetrics = {
  cliCallsTotal: new Counter({
    name: 'gemini_cli_calls_total',
    help: 'Total number of Antigravity CLI calls',
    labelNames: ['status', 'model']
  }),

  cliLatencyHistogram: new Histogram({
    name: 'gemini_cli_latency_seconds',
    help: 'Antigravity CLI call latency',
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120]
  }),

  cliErrorsTotal: new Counter({
    name: 'gemini_cli_errors_total',
    help: 'Total number of Antigravity CLI errors',
    labelNames: ['error_type']
  }),

  strategyUsageTotal: new Counter({
    name: 'gemini_strategy_usage_total',
    help: 'Usage of different Gemini strategies',
    labelNames: ['strategy'] // 'cli', 'api', 'fallback'
  })
};
```

### ダッシュボード項目
```yaml
# Grafana Dashboard - Antigravity CLI Metrics
panels:
  - title: "Gemini Strategy Distribution"
    type: "pie"
    targets:
      - expr: "rate(gemini_strategy_usage_total[5m])"

  - title: "CLI vs API Latency Comparison"
    type: "graph"
    targets:
      - expr: "histogram_quantile(0.95, gemini_cli_latency_seconds)"
      - expr: "histogram_quantile(0.95, gemini_api_latency_seconds)"

  - title: "CLI Error Rate"
    type: "stat"
    targets:
      - expr: "rate(gemini_cli_errors_total[5m]) / rate(gemini_cli_calls_total[5m])"
```

---

## 🚨 リスク・緩和策

### 主要リスク
1. **CLI依存**: Antigravity CLI自体の障害
2. **プロセス起動**: オーバーヘッド増加
3. **認証期限**: Google Login セッション切れ
4. **出力解析**: JSON形式変更リスク

### 緩和策
```typescript
// 1. タイムアウト・リトライ機能
class GeminiCLIWrapper {
  async generateContentWithRetry(prompt: string, maxRetries = 3): Promise<GeminiCLIResponse> {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.generateContent(prompt);
      } catch (error) {
        lastError = error;
        await this.delay(Math.pow(2, i) * 1000); // Exponential backoff
      }
    }

    throw lastError;
  }
}

// 2. ヘルスチェック機能
class GeminiHealthChecker {
  async checkCLIHealth(): Promise<boolean> {
    try {
      const result = await execAsync('gemini -p "health check" --output-format json', {
        timeout: 5000
      });
      return true;
    } catch {
      return false;
    }
  }
}

// 3. 自動フォールバック
async invokeGeminiWithAutoFallback(prompt: string): Promise<LLMResponse> {
  // CLI ヘルスチェック
  if (!(await this.healthChecker.checkCLIHealth())) {
    logger.warn('CLI unhealthy, using API fallback');
    return await this.invokeGeminiAPI(prompt);
  }

  return await this.invokeGeminiCLI(prompt);
}
```

---

## ✅ 移行チェックリスト

### 事前準備
```
□ Antigravity CLI動作確認
□ 認証設定完了（Google Login）
□ 開発環境テスト実行
□ セキュリティレビュー完了
□ パフォーマンステスト実施
```

### 実装フェーズ
```
□ GeminiCLIWrapper 実装
□ Wall-bounce Analyzer 統合
□ ユニットテスト作成・実行
□ 統合テスト実施
□ メトリクス・監視設定
```

### 移行フェーズ
```
□ A/Bテスト開始（10%）
□ パフォーマンス監視
□ エラー率・品質確認
□ 段階的拡張（25% → 50% → 100%）
□ 完全移行完了
```

### 完了後
```
□ 既存API削除
□ 依存関係クリーンアップ
□ ドキュメント更新
□ チーム教育・引き継ぎ
```

---

## 📅 実装タイムライン

### Week 1: 基盤実装
- **Day 1-2**: GeminiCLIWrapper 実装
- **Day 3-4**: Wall-bounce統合・テスト
- **Day 5**: コードレビュー・調整

### Week 2: テスト・検証
- **Day 1-2**: A/Bテスト開始（10%）
- **Day 3-4**: 監視・メトリクス分析
- **Day 5**: 25%拡張

### Week 3: 段階移行
- **Day 1-2**: 50%拡張・検証
- **Day 3-4**: 100%移行
- **Day 5**: 最終確認・ドキュメント

### Week 4: 最適化
- **Day 1-3**: API削除・クリーンアップ
- **Day 4-5**: パフォーマンス最適化

---

**推奨開始**: 即座実装
**期待ROI**: 年間$90+ 削減 + 4倍レート制限改善
**技術価値**: 高（依存関係軽減、認証簡素化）

🚀 **Ready to Implement - Let's Modernize Gemini Integration!**