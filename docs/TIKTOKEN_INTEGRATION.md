# Tiktoken トークン計算 - 統合ガイド

## 🔢 Overview

Tiktoken は OpenAI の公式トークナイザーライブラリで、テキストをトークンに変換するためのByte Pair Encoding (BPE) を実装しています。

**公式リポジトリ**: https://github.com/openai/tiktoken
**主な特徴**: 3-6倍高速、可逆的・ロスレス変換、OpenAI モデル対応

## 📊 TechSapoの現状

### ✅ 現在の実装
TechSapoでは独自の `estimateTokenCount` メソッドを使用：

```typescript
// 現在の実装例（src/services/embedding-service.ts）
private estimateTokenCount(texts: string[]): number {
  return texts.reduce((total, text) => {
    const japaneseCharCount = (text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
    const otherCharCount = text.length - japaneseCharCount;
    return total + Math.ceil(japaneseCharCount * 1.5 + otherCharCount * 0.25);
  }, 0);
}
```

### ❌ 限界・改善点
- **精度不足**: 実際のBPEトークナイザーと異なる
- **モデル非対応**: GPT-5固有のエンコーディング未対応
- **コスト計算誤差**: 正確なトークン数によるコスト計算ができない

## 📦 JavaScript/Node.js での Tiktoken 実装

### 推奨ライブラリ

#### 1. js-tiktoken (推奨)
```bash
npm install js-tiktoken
```

#### 2. tiktoken-js (代替)
```bash
npm install @dqbd/tiktoken
```

#### 3. gpt-3-encoder (レガシー)
```bash
npm install gpt-3-encoder
```

## 🚀 TechSapo統合実装

### 1. Tiktokenサービス作成

```typescript
// src/services/tiktoken-service.ts
import { Tiktoken, get_encoding, encoding_for_model } from '@dqbd/tiktoken';

export class TiktokenService {
  private static instance: TiktokenService;
  private encodingCache: Map<string, Tiktoken> = new Map();

  private constructor() {}

  static getInstance(): TiktokenService {
    if (!TiktokenService.instance) {
      TiktokenService.instance = new TiktokenService();
    }
    return TiktokenService.instance;
  }

  /**
   * GPT-5用のエンコーディング取得（TechSapoプロジェクト標準）
   */
  getGPT5Encoding(): Tiktoken {
    const cacheKey = 'gpt-5';

    if (!this.encodingCache.has(cacheKey)) {
      try {
        // GPT-5のエンコーディング（実際のモデル名は確認が必要）
        const encoding = encoding_for_model('gpt-4'); // GPT-5が利用可能になるまではGPT-4を使用
        this.encodingCache.set(cacheKey, encoding);
      } catch (error) {
        // フォールバック: cl100k_base エンコーディング
        const encoding = get_encoding('cl100k_base');
        this.encodingCache.set(cacheKey, encoding);
      }
    }

    return this.encodingCache.get(cacheKey)!;
  }

  /**
   * テキストをトークンにエンコード
   */
  encode(text: string, model: string = 'gpt-5'): number[] {
    const encoding = this.getModelEncoding(model);
    return encoding.encode(text);
  }

  /**
   * トークンをテキストにデコード
   */
  decode(tokens: number[], model: string = 'gpt-5'): string {
    const encoding = this.getModelEncoding(model);
    return encoding.decode(tokens);
  }

  /**
   * トークン数をカウント
   */
  countTokens(text: string, model: string = 'gpt-5'): number {
    const encoding = this.getModelEncoding(model);
    return encoding.encode(text).length;
  }

  /**
   * 複数テキストのトークン数をまとめてカウント
   */
  countTokensBatch(texts: string[], model: string = 'gpt-5'): number {
    const encoding = this.getModelEncoding(model);
    return texts.reduce((total, text) => {
      return total + encoding.encode(text).length;
    }, 0);
  }

  /**
   * メッセージ配列のトークン数をカウント（Chat Completions用）
   */
  countTokensForMessages(messages: Array<{role: string, content: string}>, model: string = 'gpt-5'): number {
    const encoding = this.getModelEncoding(model);
    let totalTokens = 0;

    for (const message of messages) {
      // メッセージのメタデータ用トークン（役割、区切り文字等）
      totalTokens += 4; // 基本的なメッセージフォーマット用

      // 役割（role）のトークン数
      totalTokens += encoding.encode(message.role).length;

      // 内容（content）のトークン数
      totalTokens += encoding.encode(message.content).length;
    }

    // 会話の終了トークン
    totalTokens += 2;

    return totalTokens;
  }

  /**
   * モデル別エンコーディング取得
   */
  private getModelEncoding(model: string): Tiktoken {
    const cacheKey = model;

    if (!this.encodingCache.has(cacheKey)) {
      try {
        let encoding: Tiktoken;

        switch (model) {
          case 'gpt-5':
            // GPT-5が利用可能になるまでの暫定対応
            encoding = get_encoding('cl100k_base');
            break;
          case 'gpt-4':
          case 'gpt-4-turbo':
            encoding = encoding_for_model('gpt-4');
            break;
          case 'gpt-3.5-turbo':
            encoding = encoding_for_model('gpt-3.5-turbo');
            break;
          default:
            // フォールバック
            encoding = get_encoding('cl100k_base');
        }

        this.encodingCache.set(cacheKey, encoding);
      } catch (error) {
        // エラー時はフォールバック
        const encoding = get_encoding('cl100k_base');
        this.encodingCache.set(cacheKey, encoding);
      }
    }

    return this.encodingCache.get(cacheKey)!;
  }

  /**
   * リソース解放
   */
  dispose(): void {
    for (const encoding of this.encodingCache.values()) {
      encoding.free();
    }
    this.encodingCache.clear();
  }
}

// シングルトンインスタンスのエクスポート
export const tiktokenService = TiktokenService.getInstance();
```

### 2. 既存サービスの更新

#### Wall-Bounce Analyzer の改良
```typescript
// src/services/wall-bounce-analyzer.ts の一部を更新
import { tiktokenService } from './tiktoken-service';

export class WallBounceAnalyzer {
  // 既存メソッドを更新
  private estimateTokens(text: string, model: string = 'gpt-5'): number {
    // 従来の estimateTokens を tiktokenService に置き換え
    return tiktokenService.countTokens(text, model);
  }

  private estimateMessagesTokens(messages: Array<{role: string, content: string}>, model: string = 'gpt-5'): number {
    return tiktokenService.countTokensForMessages(messages, model);
  }

  async executeWallBounce(
    query: string,
    taskType: TaskType,
    options: WallBounceOptions = {}
  ): Promise<WallBounceResult> {
    const startTime = Date.now();

    // 正確なトークン数計算でコスト予測
    const inputTokens = tiktokenService.countTokens(query, 'gpt-5');
    const estimatedOutputTokens = Math.min(inputTokens * 2, 4000); // 出力予測

    logger.info('Wall-bounce analysis started', {
      taskType,
      inputTokens,
      estimatedOutputTokens,
      estimatedCost: this.calculateCost('gpt-5', inputTokens, estimatedOutputTokens)
    });

    // 既存のWall-Bounce処理...
    const result = await this.performAnalysis(query, taskType, options);

    // 実際のトークン使用量を記録
    const actualOutputTokens = tiktokenService.countTokens(result.consensus.content, 'gpt-5');

    return {
      ...result,
      token_usage: {
        input_tokens: inputTokens,
        output_tokens: actualOutputTokens,
        total_tokens: inputTokens + actualOutputTokens
      },
      cost_breakdown: {
        input_cost: this.calculateInputCost('gpt-5', inputTokens),
        output_cost: this.calculateOutputCost('gpt-5', actualOutputTokens),
        total_cost: this.calculateCost('gpt-5', inputTokens, actualOutputTokens)
      }
    };
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    // GPT-5の料金体系（実際の価格は確認が必要）
    const pricing = {
      'gpt-5': { input: 0.01, output: 0.03 }, // 1000トークンあたりUSD
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
    };

    const modelPricing = pricing[model as keyof typeof pricing] || pricing['gpt-5'];
    return (inputTokens / 1000) * modelPricing.input + (outputTokens / 1000) * modelPricing.output;
  }
}
```

#### Embedding Service の改良
```typescript
// src/services/embedding-service.ts の一部を更新
import { tiktokenService } from './tiktoken-service';

export class EmbeddingService {
  // estimateTokenCount メソッドを置き換え
  private estimateTokenCount(texts: string[]): number {
    return tiktokenService.countTokensBatch(texts, 'gpt-5');
  }

  async generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const texts = Array.isArray(request.text) ? request.text : [request.text];

    // 正確なトークン数計算
    const accurateTokenCount = this.estimateTokenCount(texts);

    // コスト予測
    const estimatedCost = this.calculateEmbeddingCost(accurateTokenCount);

    logger.info('Embedding generation started', {
      textCount: texts.length,
      totalTokens: accurateTokenCount,
      estimatedCost,
      model: request.model
    });

    // 既存の処理...
    const result = await this.performEmbedding(request);

    return {
      ...result,
      usage: {
        tokenCount: accurateTokenCount,
        processingTime: result.usage.processingTime
      },
      cost: estimatedCost
    };
  }

  private calculateEmbeddingCost(tokens: number): number {
    // Embedding APIの料金（1000トークンあたり）
    const embeddingPrice = 0.0001; // USD per 1000 tokens
    return (tokens / 1000) * embeddingPrice;
  }
}
```

### 3. コスト追跡サービス

```typescript
// src/services/cost-tracking-enhanced.ts
import { tiktokenService } from './tiktoken-service';
import { getRedisService } from './redis-service';

export interface TokenUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: string;
  sessionId?: string;
  taskType?: string;
}

export class EnhancedCostTrackingService {
  private redis = getRedisService();

  async trackTokenUsage(usage: TokenUsage): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const key = `token_usage:${date}`;

    // 日次使用量を蓄積
    await this.redis.hincrbyfloat(key, 'total_cost', usage.cost);
    await this.redis.hincrby(key, 'total_tokens', usage.totalTokens);
    await this.redis.hincrby(key, `${usage.model}_tokens`, usage.totalTokens);
    await this.redis.hincrbyfloat(key, `${usage.model}_cost`, usage.cost);

    // 有効期限を30日に設定
    await this.redis.expire(key, 30 * 24 * 3600);

    // 詳細ログをリストに追加（直近1000件まで）
    await this.redis.lpush(`token_usage_log:${date}`, JSON.stringify(usage));
    await this.redis.ltrim(`token_usage_log:${date}`, 0, 999);
  }

  async getDailyUsage(date: string = new Date().toISOString().split('T')[0]): Promise<DailyUsage> {
    const key = `token_usage:${date}`;
    const usage = await this.redis.hgetall(key);

    return {
      date,
      totalCost: parseFloat(usage.total_cost || '0'),
      totalTokens: parseInt(usage.total_tokens || '0'),
      modelBreakdown: {
        'gpt-5': {
          tokens: parseInt(usage['gpt-5_tokens'] || '0'),
          cost: parseFloat(usage['gpt-5_cost'] || '0')
        },
        'gpt-4': {
          tokens: parseInt(usage['gpt-4_tokens'] || '0'),
          cost: parseFloat(usage['gpt-4_cost'] || '0')
        }
      }
    };
  }

  async getMonthlyUsage(year: number = new Date().getFullYear(), month: number = new Date().getMonth() + 1): Promise<MonthlyUsage> {
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyUsages: DailyUsage[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dailyUsage = await this.getDailyUsage(date);
      dailyUsages.push(dailyUsage);
    }

    const totalCost = dailyUsages.reduce((sum, usage) => sum + usage.totalCost, 0);
    const totalTokens = dailyUsages.reduce((sum, usage) => sum + usage.totalTokens, 0);

    return {
      year,
      month,
      totalCost,
      totalTokens,
      dailyUsages
    };
  }

  async checkBudgetAlert(budgetLimit: number): Promise<BudgetAlert | null> {
    const monthlyUsage = await this.getMonthlyUsage();
    const usagePercent = (monthlyUsage.totalCost / budgetLimit) * 100;

    if (usagePercent >= 90) {
      return {
        level: 'critical',
        message: `予算の${usagePercent.toFixed(1)}%を使用しました（$${monthlyUsage.totalCost.toFixed(2)}/$${budgetLimit}）`,
        currentCost: monthlyUsage.totalCost,
        budgetLimit,
        usagePercent
      };
    } else if (usagePercent >= 75) {
      return {
        level: 'warning',
        message: `予算の${usagePercent.toFixed(1)}%を使用しました`,
        currentCost: monthlyUsage.totalCost,
        budgetLimit,
        usagePercent
      };
    }

    return null;
  }
}

export interface DailyUsage {
  date: string;
  totalCost: number;
  totalTokens: number;
  modelBreakdown: Record<string, { tokens: number; cost: number }>;
}

export interface MonthlyUsage {
  year: number;
  month: number;
  totalCost: number;
  totalTokens: number;
  dailyUsages: DailyUsage[];
}

export interface BudgetAlert {
  level: 'warning' | 'critical';
  message: string;
  currentCost: number;
  budgetLimit: number;
  usagePercent: number;
}

export const enhancedCostTrackingService = new EnhancedCostTrackingService();
```

### 4. ユーティリティ関数

```typescript
// src/utils/token-utils.ts
import { tiktokenService } from '../services/tiktoken-service';

/**
 * テキストをトークン制限に合わせてトリミング
 */
export function trimTextToTokenLimit(text: string, maxTokens: number, model: string = 'gpt-5'): string {
  const tokens = tiktokenService.encode(text, model);

  if (tokens.length <= maxTokens) {
    return text;
  }

  const trimmedTokens = tokens.slice(0, maxTokens);
  return tiktokenService.decode(trimmedTokens, model);
}

/**
 * メッセージ配列をトークン制限に合わせて調整
 */
export function trimMessagesToTokenLimit(
  messages: Array<{role: string, content: string}>,
  maxTokens: number,
  model: string = 'gpt-5'
): Array<{role: string, content: string}> {
  let currentTokens = tiktokenService.countTokensForMessages(messages, model);

  if (currentTokens <= maxTokens) {
    return messages;
  }

  // システムメッセージは保持
  const systemMessages = messages.filter(msg => msg.role === 'system');
  const otherMessages = messages.filter(msg => msg.role !== 'system');

  // 新しいメッセージから優先的に保持
  const trimmedMessages = [...systemMessages];
  let remainingTokens = maxTokens - tiktokenService.countTokensForMessages(systemMessages, model);

  for (let i = otherMessages.length - 1; i >= 0; i--) {
    const message = otherMessages[i];
    const messageTokens = tiktokenService.countTokensForMessages([message], model);

    if (remainingTokens >= messageTokens) {
      trimmedMessages.push(message);
      remainingTokens -= messageTokens;
    } else {
      break;
    }
  }

  // メッセージの順序を復元
  return trimmedMessages.sort((a, b) => {
    const aIndex = messages.indexOf(a);
    const bIndex = messages.indexOf(b);
    return aIndex - bIndex;
  });
}

/**
 * プロンプトテンプレートのトークン数計算
 */
export function calculatePromptTokens(
  template: string,
  variables: Record<string, string>,
  model: string = 'gpt-5'
): { tokens: number; estimatedCost: number; filledPrompt: string } {

  let filledPrompt = template;

  // テンプレート変数を置換
  for (const [key, value] of Object.entries(variables)) {
    filledPrompt = filledPrompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  const tokens = tiktokenService.countTokens(filledPrompt, model);
  const estimatedCost = calculateTokenCost(model, tokens, 0);

  return {
    tokens,
    estimatedCost,
    filledPrompt
  };
}

/**
 * モデル別トークンコスト計算
 */
export function calculateTokenCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = {
    'gpt-5': { input: 0.01, output: 0.03 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
  };

  const modelPricing = pricing[model as keyof typeof pricing] || pricing['gpt-5'];
  return (inputTokens / 1000) * modelPricing.input + (outputTokens / 1000) * modelPricing.output;
}
```

## 🔧 実装手順

### Phase 1: 基本統合 (Week 1)
```bash
# 1. Tiktokenライブラリのインストール
npm install @dqbd/tiktoken

# 2. TiktokenServiceの作成
# src/services/tiktoken-service.ts を作成

# 3. 基本的なユーティリティ関数の作成
# src/utils/token-utils.ts を作成
```

### Phase 2: 既存サービス更新 (Week 2)
```typescript
// 1. Wall-Bounce Analyzer の更新
// - estimateTokens メソッドをtiktokenServiceに置き換え
// - 正確なコスト計算を実装

// 2. Embedding Service の更新
// - estimateTokenCount メソッドをtiktokenServiceに置き換え
// - 正確なトークン数によるコスト追跡

// 3. その他のサービス更新
// - HuggingFace関連サービス
// - MCP統合サービス
```

### Phase 3: 高度な機能 (Week 3)
```typescript
// 1. EnhancedCostTrackingService の実装
// 2. 予算アラート機能
// 3. トークン使用量ダッシュボード
// 4. 自動トークン最適化
```

## 📊 監視・ダッシュボード統合

### Prometheus メトリクス追加
```typescript
// src/metrics/prometheus-client.ts に追加
const tokenMetrics = {
  tokensUsed: new prometheus.Counter({
    name: 'techsapo_tokens_used_total',
    help: 'Total number of tokens used',
    labelNames: ['model', 'service', 'task_type']
  }),

  tokenCost: new prometheus.Counter({
    name: 'techsapo_token_cost_usd_total',
    help: 'Total cost of tokens used in USD',
    labelNames: ['model', 'service']
  }),

  budgetUtilization: new prometheus.Gauge({
    name: 'techsapo_budget_utilization_percent',
    help: 'Current budget utilization percentage'
  })
};

export function recordTokenUsage(model: string, service: string, taskType: string, tokens: number, cost: number) {
  tokenMetrics.tokensUsed.inc({ model, service, task_type: taskType }, tokens);
  tokenMetrics.tokenCost.inc({ model, service }, cost);
}
```

### API エンドポイント追加
```typescript
// src/routes/token-analytics.ts
import express from 'express';
import { enhancedCostTrackingService } from '../services/cost-tracking-enhanced';

const router = express.Router();

router.get('/usage/daily/:date?', async (req, res) => {
  const date = req.params.date || new Date().toISOString().split('T')[0];
  const usage = await enhancedCostTrackingService.getDailyUsage(date);
  res.json(usage);
});

router.get('/usage/monthly/:year?/:month?', async (req, res) => {
  const year = parseInt(req.params.year || new Date().getFullYear().toString());
  const month = parseInt(req.params.month || (new Date().getMonth() + 1).toString());
  const usage = await enhancedCostTrackingService.getMonthlyUsage(year, month);
  res.json(usage);
});

router.get('/budget/alert', async (req, res) => {
  const budgetLimit = parseFloat(process.env.MONTHLY_BUDGET_LIMIT || '100');
  const alert = await enhancedCostTrackingService.checkBudgetAlert(budgetLimit);
  res.json({ alert });
});

export default router;
```

## ⚡ パフォーマンス最適化

### 1. エンコーディングキャッシュ
```typescript
// TiktokenService でエンコーディングをキャッシュして高速化
private encodingCache: Map<string, Tiktoken> = new Map();
```

### 2. バッチ処理
```typescript
// 複数テキストの一括処理で効率化
countTokensBatch(texts: string[], model: string = 'gpt-5'): number
```

### 3. 非同期処理
```typescript
// 大量のトークン計算を非同期で処理
async function processLargeTextBatch(texts: string[]): Promise<TokenCount[]>
```

## 🔍 デバッグ・トラブルシューティング

### デバッグモード
```typescript
// 環境変数でデバッグモード有効化
const TIKTOKEN_DEBUG = process.env.TIKTOKEN_DEBUG === 'true';

if (TIKTOKEN_DEBUG) {
  console.log('Token breakdown:', {
    text: text.substring(0, 100),
    tokenCount: tokens.length,
    tokens: tokens.slice(0, 10) // 最初の10トークンを表示
  });
}
```

### エラーハンドリング
```typescript
// Tiktoken エラーの適切な処理
try {
  const tokens = tiktokenService.countTokens(text, model);
  return tokens;
} catch (error) {
  logger.warn('Tiktoken encoding failed, falling back to estimation', {
    error: error.message,
    textLength: text.length
  });

  // フォールバック: 従来の推定方法
  return this.fallbackEstimateTokens(text);
}
```

## 🎯 期待される効果

### 1. コスト管理の改善
- **正確な予算管理**: 実際のトークン使用量に基づく
- **コスト予測精度**: 95%以上の精度でコスト予測
- **予算アラート**: リアルタイムでの使用量監視

### 2. パフォーマンス向上
- **トークン制限対応**: 正確な制限内でのテキスト処理
- **API効率化**: 無駄なトークン送信の削減
- **応答時間最適化**: 適切なプロンプト長の維持

### 3. 品質向上
- **正確な分析**: 実際のモデル動作に基づく処理
- **エラー削減**: トークン超過エラーの予防
- **デバッグ効率**: 詳細なトークン情報による問題特定

このTiktoken統合により、TechSapoは正確なトークン計算とコスト管理を実現し、より効率的で予測可能な運用が可能になります。