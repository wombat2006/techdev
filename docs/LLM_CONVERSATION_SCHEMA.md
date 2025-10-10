# LLM Conversation Schema Documentation

LLM間の会話構造を完全に型定義したスキーマドキュメント

## 📋 概要

Wall-Bounce実行時のLLM間会話を構造化し、追跡可能にするためのスキーマ定義です。

### 提供されるスキーマ

1. **TypeScript型定義**: `src/types/llm-conversation-schemas.ts`
2. **JSON Schema**: `src/config/llm-conversation-schema.json`
3. **会話履歴ビルダー**: `src/utils/conversation-history-builder.ts`

---

## 🏗️ アーキテクチャ

```
User Query
    ↓
┌─────────────────────────────────────────────┐
│        ConversationHistory                  │
│  ┌────────────────────────────────────┐     │
│  │  Round 1 (Parallel)                │     │
│  │  ├─ Provider 1 Response            │     │
│  │  ├─ Provider 2 Response            │     │
│  │  └─ Round Result                   │     │
│  └────────────────────────────────────┘     │
│  ┌────────────────────────────────────┐     │
│  │  Round 2 (Sequential)              │     │
│  │  ├─ Provider 3 Response            │     │
│  │  └─ Round Result                   │     │
│  └────────────────────────────────────┘     │
│  ┌────────────────────────────────────┐     │
│  │  ConsensusProcess                  │     │
│  │  ├─ Votes                          │     │
│  │  ├─ Scores                         │     │
│  │  └─ Consensus                      │     │
│  └────────────────────────────────────┘     │
│  ┌────────────────────────────────────┐     │
│  │  AggregationProcess                │     │
│  │  ├─ Aggregator Response            │     │
│  │  └─ Synthesis                      │     │
│  └────────────────────────────────────┘     │
│  └─ Final Result                            │
└─────────────────────────────────────────────┘
```

---

## 📚 主要スキーマ定義

### 1. LLMMessage

LLM間の単一メッセージ

```typescript
interface LLMMessage {
  id: string;                    // メッセージID
  role: 'user' | 'provider' | 'aggregator' | 'system';
  provider?: string;             // プロバイダーID
  content: string;               // メッセージ本文
  timestamp: string;             // ISO 8601
  metadata: {
    confidence?: number;         // 信頼度スコア
    tokens?: { input, output, total };
    cost?: number;               // USD
    latencyMs?: number;
    model?: string;
    reasoning?: string;
  };
}
```

### 2. ConversationRound

1回のLLM呼び出しサイクル

```typescript
interface ConversationRound {
  roundNumber: number;           // ラウンド番号（1始まり）
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  mode: 'parallel' | 'sequential' | 'deep-sequential';
  startTime: string;             // ISO 8601
  endTime?: string;              // ISO 8601

  prompt: {
    original: string;            // 元のプロンプト
    enriched?: string;           // エンリッチされたプロンプト
    context?: string;            // 前ラウンドのコンテキスト
  };

  providerResponses: ProviderResponse[];
  roundResult?: RoundResult;
  errors?: RoundError[];
}
```

### 3. ProviderResponse

単一プロバイダーからの応答

```typescript
interface ProviderResponse {
  providerId: string;
  providerName: string;
  tier: number;                  // 1-4
  message: LLMMessage;
  response: LLMResponse;         // レガシー互換
  executionTime: number;         // ミリ秒
  circuitBreakerState?: 'closed' | 'open' | 'half-open';
}
```

### 4. ConsensusProcess

合意形成プロセス

```typescript
interface ConsensusProcess {
  method: 'quorum' | 'weighted-average' | 'majority-vote';
  scores: ProviderScore[];

  votes?: {
    confirm: number;
    abstain: number;
    reject: number;
    distribution: Record<string, number>;
  };

  consensus: {
    content: string;
    confidence: number;
    reasoning: string;
    achievedAt?: string;
  };

  metrics: {
    averageConfidence: number;
    medianConfidence: number;
    standardDeviation: number;
    agreementRate: number;
  };
}
```

### 5. AggregationProcess

集約プロセス

```typescript
interface AggregationProcess {
  aggregatorId: string;
  aggregatorTier: number;
  inputResponses: ProviderResponse[];
  aggregatorResponse: LLMMessage;

  synthesis: {
    finalAnswer: string;
    confidence: number;
    quality: number;
    reasoning: string;
  };
}
```

### 6. ConversationHistory

全会話履歴

```typescript
interface ConversationHistory {
  conversationId: string;
  sessionId?: string;
  startTime: string;
  endTime?: string;
  executionMode: 'parallel' | 'sequential' | 'deep-sequential';

  rounds: ConversationRound[];
  consensusProcess?: ConsensusProcess;
  aggregationProcess?: AggregationProcess;

  finalResult: {
    answer: string;
    consensusScore: number;
    qualityScore: number;
    providersUsed: string[];
  };

  performance: ConversationPerformance;
}
```

---

## 🔧 使用例

### 基本的な使い方

```typescript
import { createConversationHistoryBuilder } from '../utils/conversation-history-builder';

// 1. ビルダーを初期化
const builder = createConversationHistoryBuilder('parallel', 'session-123');

// 2. ラウンドを開始
builder.startRound(1, 'What is the best architecture for microservices?');

// 3. プロバイダー応答を追加
builder.addProviderResponse(
  'gemini-2.5-pro',
  'Gemini 2.5 Pro',
  1,
  geminiResponse,
  1200 // 実行時間（ms）
);

builder.addProviderResponse(
  'gpt-5',
  'GPT-5',
  2,
  gpt5Response,
  1500
);

// 4. ラウンドを完了
builder.completeRound(
  0.85,  // consensus score
  0.90,  // quality score
  0.015, // total cost
  5000   // total tokens
);

// 5. 会話履歴を構築
const history = builder.build(
  'Final synthesized answer...',
  0.87,
  0.92,
  ['gemini-2.5-pro', 'gpt-5', 'sonnet-4.5']
);

// 6. エクスポート
const exported = builder.export('markdown', history);
console.log(exported.content);
```

### Deep Sequential モード

```typescript
const builder = createConversationHistoryBuilder('deep-sequential');

// Round 1: Gemini
builder.startRound(1, originalPrompt);
builder.addProviderResponse('gemini-2.5-pro', 'Gemini 2.5 Pro', 1, response1, 1200);
builder.completeRound(0.8, 0.85, 0.005, 1500);

// Round 2: GPT-5 with context from Round 1
const contextFromRound1 = response1.content;
builder.startRound(2, originalPrompt, undefined, contextFromRound1);
builder.addProviderResponse('gpt-5', 'GPT-5', 2, response2, 1400);
builder.completeRound(0.85, 0.88, 0.010, 3000);

// Round 3: Sonnet with cumulative context
const cumulativeContext = `${contextFromRound1}\n\n${response2.content}`;
builder.startRound(3, originalPrompt, undefined, cumulativeContext);
builder.addProviderResponse('sonnet-4.5', 'Sonnet 4.5', 3, response3, 1100);
builder.completeRound(0.90, 0.92, 0.020, 5000);

const history = builder.build(finalAnswer, 0.90, 0.92, providers);
```

### Quorum with Early Stop

```typescript
const builder = createConversationHistoryBuilder('parallel');

builder.startRound(1, prompt);

// 3 providers respond
builder.addProviderResponse('gemini-2.5-pro', 'Gemini', 1, r1, 1200);
builder.addProviderResponse('gpt-5', 'GPT-5', 2, r2, 1400);
builder.addProviderResponse('sonnet-4.5', 'Sonnet', 3, r3, 1100);

// Early stop triggered - remaining providers skipped
builder.completeRound(
  0.88,
  0.90,
  0.015,
  4000,
  undefined, // no best response yet
  {
    triggered: true,
    reason: 'Quorum achieved: gpt-5 reached 3/3 votes',
    quorumResult: {
      winner: 'gpt-5',
      votes: { 'gpt-5': 3, 'gemini-2.5-pro': 1 },
      achievedQuorum: true,
      canReachQuorum: true,
      totalResponses: 3,
      remainingProviders: 3,
      earlyStopTriggered: true
    }
  }
);
```

### エラーハンドリング

```typescript
builder.startRound(1, prompt);

try {
  const response = await invokeProvider('unstable-provider', prompt);
  builder.addProviderResponse('unstable-provider', 'Unstable', 2, response, 2000);
} catch (error) {
  builder.addRoundError(
    'unstable-provider',
    error.message,
    true, // recoverable
    'gemini-2.5-flash' // fallback used
  );
}
```

---

## 📤 エクスポート形式

### JSON形式

```typescript
const exported = builder.export('json', history);
// 完全な会話履歴をJSON形式で出力
```

### Markdown形式（人間可読）

```typescript
const exported = builder.export('markdown', history);
// 読みやすいMarkdown形式で出力
```

出力例:
```markdown
# LLM Conversation History

**Conversation ID**: conv_1234567890_abc123
**Execution Mode**: parallel
**Start Time**: 2025-01-15T10:30:00.000Z
**Total Cost**: $0.0250

---

## Round 1 (completed)

**Prompt**: What is the best architecture for microservices?

### Responses:

#### Gemini 2.5 Pro (Tier 1)
- **Confidence**: 0.880
- **Cost**: $0.0050
- **Latency**: 1200ms

[Response content...]
```

### OpenAI ChatCompletion形式

```typescript
const exported = builder.export('openai', history);
// OpenAI API互換形式
```

出力例:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What is the best architecture?"
    },
    {
      "role": "assistant",
      "content": "[Gemini 2.5 Pro] Here's my analysis..."
    }
  ]
}
```

### Anthropic Messages形式

```typescript
const exported = builder.export('anthropic', history);
// Anthropic API互換形式
```

---

## ✅ バリデーション

```typescript
const validation = builder.validate(history);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Warnings:', validation.warnings);
}

console.log('Checks:', validation.checks);
// {
//   hasRounds: true,
//   hasMessages: true,
//   hasFinalResult: true,
//   allRoundsCompleted: true,
//   costsCalculated: true,
//   tokensRecorded: true
// }
```

---

## 🔍 パフォーマンスメトリクス

会話履歴には自動的にパフォーマンスメトリクスが計算されます：

```typescript
const performance = history.performance;

console.log('Total Duration:', performance.totalDurationMs, 'ms');
console.log('Total Cost:', performance.totalCost, 'USD');
console.log('Total Tokens:', performance.totalTokens.total);

// プロバイダー別集計
for (const provider of performance.providerBreakdown) {
  console.log(`${provider.providerId}:`, {
    calls: provider.calls,
    cost: provider.totalCost,
    avgLatency: provider.averageLatencyMs
  });
}

// Early stop効果
if (performance.earlyStopSavings) {
  console.log('Providers Skipped:', performance.earlyStopSavings.providersSkipped);
  console.log('Cost Saved:', performance.earlyStopSavings.estimatedCostSaved);
  console.log('Time Saved:', performance.earlyStopSavings.estimatedTimeSaved, 'ms');
}
```

---

## 🎯 ユースケース

### 1. デバッグ・トレーシング

```typescript
// 全ラウンドを追跡
for (const round of history.rounds) {
  console.log(`Round ${round.roundNumber}:`, {
    status: round.status,
    responses: round.providerResponses.length,
    consensusScore: round.roundResult?.consensusScore
  });
}
```

### 2. コスト分析

```typescript
// プロバイダー別コスト集計
const costByProvider = history.performance.providerBreakdown
  .sort((a, b) => b.totalCost - a.totalCost);

console.log('Most expensive provider:', costByProvider[0]);
```

### 3. 品質評価

```typescript
// 各ラウンドの品質トレンド
const qualityTrend = history.rounds.map(r => ({
  round: r.roundNumber,
  quality: r.roundResult?.qualityScore
}));

console.log('Quality trend:', qualityTrend);
```

### 4. 監査ログ

```typescript
// 完全な監査証跡
const auditLog = builder.export('json', history);
await saveToAuditDatabase(auditLog);
```

---

## 🔄 既存コードへの統合

### Wall-Bounce Analyzer統合例

```typescript
// src/services/wall-bounce-analyzer.ts

import { createConversationHistoryBuilder } from '../utils/conversation-history-builder';

class WallBounceAnalyzer {
  async execute(prompt: string, options: ExecuteOptions): Promise<WallBounceResult> {
    // 1. 会話履歴ビルダーを初期化
    const builder = createConversationHistoryBuilder(
      options.mode || 'parallel',
      options.sessionId
    );

    // 2. ラウンドを開始
    builder.startRound(1, prompt);

    // 3. プロバイダー実行
    const responses = await this.executeProviders(prompt, options);

    for (const response of responses) {
      builder.addProviderResponse(
        response.provider,
        response.providerName,
        response.tier,
        response,
        response.executionTime
      );
    }

    // 4. ラウンド完了
    builder.completeRound(
      consensusScore,
      qualityScore,
      totalCost,
      totalTokens
    );

    // 5. 会話履歴を構築
    const history = builder.build(
      finalAnswer,
      consensusScore,
      qualityScore,
      providersUsed
    );

    // 6. 履歴を保存（オプション）
    await this.saveConversationHistory(history);

    return result;
  }
}
```

---

## 📊 スキーマバージョン管理

- **現在のバージョン**: `v1.0.0`
- **JSON Schema ID**: `https://techsapo.ai/schemas/llm-conversation-v1.json`
- **破壊的変更**: メジャーバージョンアップで通知

---

## 🚀 次のステップ

1. ✅ TypeScript型定義を作成
2. ✅ JSON Schemaを作成
3. ✅ 会話履歴ビルダーを実装
4. ⏳ Wall-Bounce Analyzerに統合
5. ⏳ Redis/データベースへの永続化
6. ⏳ API経由での会話履歴取得エンドポイント
7. ⏳ フロントエンドでの可視化

---

## 📝 関連ドキュメント

- [LLM Providers Guide](./LLM_PROVIDERS_GUIDE.md)
- [Wall-Bounce System](./WALL_BOUNCE_SYSTEM.md)
- [API Reference](./API_REFERENCE.md)
- [Architecture Overview](./ARCHITECTURE_OVERVIEW.md)
