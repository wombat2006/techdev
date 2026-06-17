# Wall-Bounce Analysis System

## Wall-Bounce Analysis Overview

The Wall-Bounce analysis system is the core capability that coordinates multiple LLM providers to produce high-quality responses.

## Core Principles

### Mandatory Rules
- **Constitution (supreme)**: Wall-bounce requires **minimum 2 rounds, maximum 5 rounds** (single-round forbidden) — [CLAUDE.md Constitution](../CLAUDE.md#constitution)
- **Minimum 2 providers**: Every analysis uses at least two LLM providers
- **Consensus required**: Providers must reach agreement
- **Quality thresholds**: confidence ≥ 0.7, consensus ≥ 0.6
- **Japanese responses**: Primary language for user-facing output
- **Same-node transport**: stdio/MCP between orchestrator and providers; HTTP SSE for external clients only — [TECH_STACK_LLM_PROVIDER_TRANSPORT.md](./decisions/TECH_STACK_LLM_PROVIDER_TRANSPORT.md)

### LLM Provider Configuration

#### OpenAI
```typescript
// GPT-5 only — GPT-4/GPT-4o forbidden
const openaiConfig = {
  model: 'gpt-5', // ONLY GPT-5 allowed
  temperature: 0.7,
  max_tokens: 2000
};
```

#### Anthropic
```typescript
// SDK only — no API_KEY (MAX x5 Plan cost avoidance)
import { Anthropic } from '@anthropic-ai/sdk';
const anthropic = new Anthropic({
  // SDK only; do not use direct API_KEY
  apiKey: process.env.ANTHROPIC_SDK_KEY // SDK-only key
});
```

#### Google Gemini (via Antigravity CLI)

Tier 1 provider. Models: **Gemini 2.5 Pro / Flash**. Spawn via **Antigravity CLI (`agy`)** (no embedded API keys). → [ANTIGRAVITY_CLI_MIGRATION.md](./ANTIGRAVITY_CLI_MIGRATION.md)

```typescript
const geminiConfig = {
  model: 'gemini-2.5-flash', // or gemini-2.5-pro
  temperature: 0.8,
  maxTokens: 1500
};
// Execution: spawn('agy', …) — migration in progress (current code uses legacy gemini)
```

## Wall-Bounce Architecture

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
- **Providers**: 2
- **Models**: GPT-5 + Gemini 2.5 Flash
- **Confidence threshold**: 0.7
- **Priority**: Cost-efficient model selection

#### Premium Task
- **Providers**: 3
- **Models**: GPT-5 + Gemini 2.5 Pro + Claude (SDK)
- **Confidence threshold**: 0.8
- **Priority**: Balance quality and cost

#### Critical Task
- **Providers**: 3–4
- **Models**: All providers + OpenRouter
- **Confidence threshold**: 0.9
- **Priority**: Highest quality analysis

## Quality Metrics

### Confidence Scoring
```typescript
interface QualityMetrics {
  confidence: number;      // 0.0-1.0: response confidence
  consensus: number;       // 0.0-1.0: inter-provider agreement
  coherence: number;       // 0.0-1.0: response coherence
  completeness: number;    // 0.0-1.0: response completeness
}
```

### Consensus Algorithm
1. **Response Collection**: Gather responses from each provider
2. **Semantic Similarity**: Compute semantic similarity between responses
3. **Quality Scoring**: Score each response
4. **Consensus Building**: Weighted average for agreement
5. **Final Integration**: Produce integrated final response

## Wall-Bounce Process

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

## Error Handling & Fallbacks

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
  // Re-analyze with additional providers
  additionalAnalysis();
}

if (confidence < 0.7) {
  // Auto-escalation
  escalateToHigherTier();
}
```

## Performance Optimization

### Caching Strategy
- **Query Caching**: Reuse cache for similar queries
- **Provider Caching**: Temporarily store provider responses
- **Consensus Caching**: Reuse consensus results

### Cost Optimization
- **Smart Routing**: Provider selection with cost efficiency
- **Batch Processing**: Batch multiple queries
- **Budget Management**: Real-time cost monitoring

## Configuration

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
