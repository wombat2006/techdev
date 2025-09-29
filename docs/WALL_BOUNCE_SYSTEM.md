# Wall-Bounce Analysis System

## 🏓 Wall-Bounce Analysis Overview

Wall-Bounce分析システムは、複数のLLMプロバイダーを協調させて高品質な回答を生成する中核機能です。

## 🎯 Core Principles

### 必須ルール
- **最低2プロバイダー**: すべての分析で最低2つのLLMプロバイダーを使用
- **コンセンサス必須**: プロバイダー間での合意形成が必要
- **品質閾値**: 信頼度 ≥ 0.7、コンセンサス ≥ 0.6
- **日本語応答**: 基本的に日本語での回答生成

### LLM Provider Configuration

#### OpenAI
```typescript
// GPT-5専用 - GPT-4/GPT-4o使用禁止
const openaiConfig = {
  model: 'gpt-5', // ONLY GPT-5 allowed
  temperature: 0.7,
  max_tokens: 2000
};
```

#### Anthropic
```typescript
// SDK使用のみ - API_KEY禁止 (MAX x5 Plan cost avoidance)
import { Anthropic } from '@anthropic-ai/sdk';
const anthropic = new Anthropic({
  // SDK経由でのみ使用、API_KEYは使用しない
  apiKey: process.env.ANTHROPIC_SDK_KEY // SDK専用キー
});
```

#### Google Gemini
```typescript
const geminiConfig = {
  model: 'gemini-2.5-flash', // または gemini-2.5-pro
  temperature: 0.8,
  maxTokens: 1500
};
```

## 🏗️ Wall-Bounce Architecture

### Analysis Flow
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ User Query  │───▶│ Wall-Bounce  │───▶│ Response    │
│             │    │ Orchestrator │    │ Integration │
└─────────────┘    └──────────────┘    └─────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   GPT-5     │    │   Gemini    │    │   Claude    │
│   Analysis  │    │   Analysis  │    │   Analysis  │
└─────────────┘    └─────────────┘    └─────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                ┌──────────────────┐
                │ Consensus Engine │
                │ Quality Scoring  │
                └──────────────────┘
```

### Task Types & Provider Selection

#### Basic Task
- **プロバイダー数**: 2
- **使用モデル**: GPT-5 + Gemini 2.5 Flash
- **信頼度閾値**: 0.7
- **コスト優先**: 低コストモデル選択

#### Premium Task
- **プロバイダー数**: 3
- **使用モデル**: GPT-5 + Gemini 2.5 Pro + Claude (SDK)
- **信頼度閾値**: 0.8
- **バランス重視**: 品質とコストのバランス

#### Critical Task
- **プロバイダー数**: 3-4
- **使用モデル**: 全プロバイダー + OpenRouter
- **信頼度閾値**: 0.9
- **品質優先**: 最高品質の分析

## 📊 Quality Metrics

### Confidence Scoring
```typescript
interface QualityMetrics {
  confidence: number;      // 0.0-1.0: 回答の信頼度
  consensus: number;       // 0.0-1.0: プロバイダー間合意度
  coherence: number;       // 0.0-1.0: 回答の一貫性
  completeness: number;    // 0.0-1.0: 回答の完全性
}
```

### Consensus Algorithm
1. **Response Collection**: 各プロバイダーからの回答収集
2. **Semantic Similarity**: 回答間の意味的類似度計算
3. **Quality Scoring**: 各回答の品質スコア算出
4. **Consensus Building**: 重み付き平均による合意形成
5. **Final Integration**: 統合された最終回答生成

## 🔄 Wall-Bounce Process

### Step 1: Query Analysis
```typescript
const queryAnalysis = {
  complexity: 'basic' | 'premium' | 'critical',
  domain: 'technical' | 'business' | 'creative',
  language: 'japanese' | 'english',
  urgency: 'low' | 'medium' | 'high'
};
```

### Step 2: Provider Selection
```typescript
const providerSelection = {
  primary: ['gpt-5', 'gemini-2.5-flash'],
  secondary: ['claude-sonnet', 'gemini-2.5-pro'],
  fallback: ['openrouter-models']
};
```

### Step 3: Parallel Execution
```typescript
const parallelAnalysis = await Promise.all([
  analyzeWithGPT5(query, context),
  analyzeWithGemini(query, context),
  analyzeWithClaude(query, context) // SDK only, no API_KEY
]);
```

### Step 4: Quality Assessment
```typescript
const qualityAssessment = {
  individual_scores: calculateIndividualScores(responses),
  cross_validation: performCrossValidation(responses),
  consensus_level: measureConsensus(responses),
  final_confidence: calculateFinalConfidence(responses)
};
```

### Step 5: Response Integration
```typescript
const integratedResponse = {
  content: buildConsensusResponse(responses, weights),
  confidence: finalConfidence,
  reasoning: explainDecisionProcess(responses),
  metadata: {
    providers_used: providerList,
    processing_time: executionTime,
    cost_breakdown: costAnalysis
  }
};
```

## 🚨 Error Handling & Fallbacks

### Provider Failures
```typescript
const failureHandling = {
  single_failure: 'continue_with_remaining_providers',
  multiple_failures: 'escalate_to_premium_providers',
  complete_failure: 'return_error_with_context'
};
```

### Quality Thresholds
```typescript
if (consensus < 0.6) {
  // 追加プロバイダーでの再分析
  additionalAnalysis();
}

if (confidence < 0.7) {
  // 自動エスカレーション
  escalateToHigherTier();
}
```

## 📈 Performance Optimization

### Caching Strategy
- **Query Caching**: 類似クエリのキャッシュ利用
- **Provider Caching**: プロバイダー応答の一時保存
- **Consensus Caching**: 合意結果の再利用

### Cost Optimization
- **Smart Routing**: コスト効率を考慮したプロバイダー選択
- **Batch Processing**: 複数クエリのまとめ処理
- **Budget Management**: リアルタイムコスト監視

## 🔧 Configuration

### Environment Variables
```bash
# Wall-Bounce Configuration
WALL_BOUNCE_MIN_PROVIDERS=2
WALL_BOUNCE_MAX_PROVIDERS=4
WALL_BOUNCE_CONFIDENCE_THRESHOLD=0.7
WALL_BOUNCE_CONSENSUS_THRESHOLD=0.6

# Provider-Specific Settings
OPENAI_MODEL=gpt-5                    # GPT-5 only
ANTHROPIC_USE_SDK=true                # SDK only, no API_KEY
ANTHROPIC_API_KEY_DISABLED=true       # Explicitly disable API_KEY
GEMINI_MODEL=gemini-2.5-flash
```

### Task Configuration
```typescript
const taskConfigs = {
  basic: {
    minProviders: 2,
    maxProviders: 2,
    confidenceThreshold: 0.7,
    budgetTier: 'standard'
  },
  premium: {
    minProviders: 3,
    maxProviders: 3,
    confidenceThreshold: 0.8,
    budgetTier: 'premium'
  },
  critical: {
    minProviders: 3,
    maxProviders: 4,
    confidenceThreshold: 0.9,
    budgetTier: 'unlimited'
  }
};
```