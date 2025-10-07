# TechSapo LLMスキーマ仕様書

## 1. プロバイダー設定スキーマ (`llm-providers.json`)

### Provider Schema
```typescript
{
  "key": string,              // 一意識別子 (例: "gemini-2.5-flash")
  "name": string,             // 表示名 (例: "Gemini2.5Flash") 
  "model": string,            // モデルID (例: "gemini-2.5-flash")
  "modelArgs": {              // モデル固有の引数
    "version"?: string,       // バージョン指定
    "temperature"?: number,   // 温度パラメータ
    "maxTokens"?: number,     // 最大トークン数
    "model"?: string,         // GPT-5用の追加モデル指定
    "specialization"?: string // 専門化タイプ
  },
  "tier": number,             // 優先度階層 (1-4)
  "capabilities": string[],   // 能力リスト
  "invocationType": string,   // 呼び出し方法 ("gemini"|"gpt5"|"claude"|"openrouter")
  "role"?: string,            // 特殊役割 ("default-aggregator"|"complex-aggregator")
  "description"?: string      // 説明文
}
```

### 現在登録されているプロバイダー

| Key | Model | Tier | InvocationType | 主な能力 |
|-----|-------|------|----------------|----------|
| gemini-2.5-deepthinking | gemini-2.5-deep-think | 1 | gemini | 高度な推論、数学、科学的発見 |
| gemini-2.5-pro | gemini-2.5-pro | 1 | gemini | 分析、推論、多言語 |
| gemini-2.5-flash | gemini-2.5-flash | 1 | gemini | 高速分析、コスト効率、大量処理 |
| gpt-5 | gpt-5 | 2 | gpt5 | 汎用推論、分析、知識 |
| gpt-5-codex | gpt-5-codex | 2 | gpt5 | コーディング、デバッグ、アーキテクチャ |
| sonnet-4.5 | claude-sonnet-4-5 | 3 | claude | 集約、統合、高速推論 (デフォルトアグリゲーター) |
| opus-4.1 | claude-opus-4.1 | 4 | claude | 複雑な分析、アーキテクチャ (複雑アグリゲーター) |
| qwen3-coder | qwen/qwen3-coder | 2 | openrouter | コーディング、マルチファイル推論 |

## 2. LLMモデル型定義 (`types/llm-models.ts`)

### LLMModel Interface
```typescript
interface LLMModel {
  // 基本情報
  id: string;
  name: string;
  provider: 'google' | 'openai' | 'anthropic' | 'openrouter';
  tier: number;
  invocationType: 'gemini' | 'gpt5' | 'claude' | 'openrouter';
  
  // 設定
  modelArgs: Record<string, any>;
  modelIdentifier?: string;
  capabilities: string[];
  role?: 'default-aggregator' | 'complex-aggregator';
  
  // 価格設定
  pricing: ModelPricing;
  limits: ModelLimits;
  
  // ステータスと説明
  status: 'active' | 'deprecated' | 'beta';
  description: string;
  specialFeatures?: string[];
  
  // アーキテクチャ情報
  architecture?: ModelArchitecture;
  accessMethod?: string;
  preferredFor?: string[];
  
  // コンテキスト最適化
  contextOptimization?: {
    maxRecommendedTokens: number;
    warningThreshold: number;
    costMultiplierLarge: number;
    latencyPenaltyLarge: number;
    recommendedStrategy: 'tree-sitter' | 'rag' | 'diff-prompt' | 'hybrid';
  };
}
```

### ModelPricing Interface
```typescript
interface ModelPricing {
  inputPrice?: number;          // 入力価格
  outputPrice?: number;         // 出力価格
  inputPriceHighVolume?: number; // 大量利用時の入力価格
  outputPriceHighVolume?: number; // 大量利用時の出力価格
  inputPriceAudio?: number;     // 音声入力価格
  volumeThreshold?: number;     // ボリューム閾値
  tiers?: {                    // 階層別価格
    batch?: PricingTier;
    flex?: PricingTier;
    standard?: PricingTier;
    priority?: PricingTier;
  };
  currency: string;             // 通貨 (USD)
  unit: string;                 // 単位 (per 1M tokens)
}
```

### ModelLimits Interface
```typescript
interface ModelLimits {
  contextWindow: number;        // コンテキストウィンドウサイズ
  maxOutputTokens: number;      // 最大出力トークン数
}
```

## 3. レスポンススキーマ (`types/llm-response.ts`)

### LLMResponse Interface (基本)
```typescript
interface LLMResponse {
  // コア応答データ
  content: string;              // 主要応答テキスト
  text: string;                 // contentのエイリアス（互換性用）
  
  // メタデータ
  provider: string;             // プロバイダーID
  model: string;                // 使用されたモデル
  confidence: number;           // 信頼度スコア (0.0-1.0)
  timestamp: string;            // ISO 8601タイムスタンプ
  
  // トークン使用量
  tokensUsed: number;           // 総トークン数
  usage?: TokenUsage;           // 詳細なトークン内訳
  
  // 拡張データ（オプション）
  reasoning?: string;           // 思考過程
  citations?: Citation[];       // ソース引用
  metadata?: Record<string, unknown>; // プロバイダー固有メタデータ
  
  // 品質指標
  qualityScore?: number;        // 品質評価 (0.0-1.0)
  flags?: ResponseFlag[];       // 応答品質フラグ
}
```

### WallBounceResponse Interface
```typescript
interface WallBounceResponse {
  // 最終集約回答
  finalAnswer: string;
  
  // 個別プロバイダー応答
  providerResponses: ProviderResponse[];
  
  // コンセンサス指標
  consensusScore: number;       // プロバイダー間の合意度 (0.0-1.0)
  qualityScore: number;         // 全体的な品質評価 (0.0-1.0)
  
  // 実行メタデータ
  mode: 'parallel' | 'sequential';
  depth?: number;               // 深度レベル（sequential mode用）
  providersUsed: string[];      // 使用されたプロバイダーIDリスト
  
  // タイミングとコスト
  processingTimeMs: number;     // 総処理時間
  totalCost?: number;           // 総コスト（USD）
  
  // エラーと警告
  errors?: string[];            // 実行エラー
  warnings?: string[];          // 実行警告
}
```

### プロバイダー固有レスポンス型

#### GPT-5 Response
```typescript
interface GPT5Response extends LLMResponse {
  provider: 'gpt-5-codex';
  reasoning?: string;           // 思考連鎖
  citations?: Citation[];       // 引用
  codeBlocks?: CodeBlock[];     // 抽出されたコードブロック
}
```

#### Gemini Response
```typescript
interface GeminiResponse extends LLMResponse {
  provider: 'gemini-2.5-pro' | 'gemini-2.5-flash';
  safetyRatings?: SafetyRating[];
  groundingMetadata?: GroundingMetadata;
}
```

#### Qwen3-Coder Response
```typescript
interface Qwen3Response extends LLMResponse {
  provider: 'openrouter-qwen3-coder';
  codeQuality?: CodeQualityMetrics;
  securityFlags?: string[];
}
```

#### Claude Response
```typescript
interface ClaudeResponse extends LLMResponse {
  provider: 'sonnet-4' | 'sonnet-4.5' | 'opus-4.1';
  stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence';
}
```

## 4. アグリゲーター選択ロジック

### AggregatorSelection Schema
```typescript
{
  "defaultAggregator": "sonnet-4.5",    // デフォルトアグリゲーター
  "complexAggregator": "opus-4.1",      // 複雑タスク用アグリゲーター
  "complexityThreshold": 2,             // 複雑度閾値
  "complexityIndicators": {
    "keywords": [                       // 複雑度キーワード（英語）
      "architect",
      "design pattern",
      "security (audit|review|analysis)",
      "performance optimization"
    ],
    "japaneseKeywords": [               // 複雑度キーワード（日本語）
      "複雑な",
      "高度な",
      "詳細な"
    ],
    "promptLengthThreshold": 500,       // プロンプト長閾値
    "questionMarkThreshold": 3          // 疑問符数閾値
  }
}
```

## 5. タスクタイプマッピング

```typescript
{
  "critical": "opus-4.1"  // クリティカルタスク用プロバイダー
}
```

## 6. 階層（Tier）システム

| Tier | 用途 | プロバイダー |
|------|------|-------------|
| 1 | 高速応答・初期分析 | Gemini 2.5シリーズ |
| 2 | 専門分析・コーディング | GPT-5, Qwen3-Coder |
| 3 | 集約・統合 | Claude Sonnet 4.5 |
| 4 | 複雑な集約・最終判断 | Claude Opus 4.1 |

## 7. 呼び出し方法（InvocationType）

| Type | 方法 | プロバイダー |
|------|------|-------------|
| gemini | Gemini CLI | Gemini 2.5シリーズ |
| gpt5 | Codex MCP | GPT-5, GPT-5 Codex |
| claude | 内部分析 | Claude Sonnet/Opus |
| openrouter | OpenRouter API | Qwen3-Coder |

## 8. 能力（Capabilities）タグ

- **analysis**: 一般分析
- **reasoning**: 推論
- **multilingual**: 多言語対応
- **coding**: コーディング
- **debugging**: デバッグ
- **architecture**: アーキテクチャ設計
- **fast-analysis**: 高速分析
- **cost-efficient**: コスト効率
- **high-volume**: 大量処理
- **aggregation**: 集約
- **synthesis**: 統合
- **complex-analysis**: 複雑な分析
- **advanced-reasoning**: 高度な推論
- **mathematics**: 数学
- **scientific-discovery**: 科学的発見
- **complex-problem-solving**: 複雑な問題解決
- **multi-file-reasoning**: マルチファイル推論

---
このドキュメントは TechSapo システムの LLM スキーマ仕様を定義しています。
生成日: 2025-10-06
