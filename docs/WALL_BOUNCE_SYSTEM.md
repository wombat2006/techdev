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

### Inference Profiles (Model, Effort, CoT, Temperature)

All provider invocations SHOULD resolve an **`InferenceProfile`** before spawn/MCP call. Logic ADR: [TECH_STACK_INFERENCE_PROFILES.md](./decisions/TECH_STACK_INFERENCE_PROFILES.md) (TS-20).

**Resolution order**: preset → TaskRouter / PromptAnalyzer default → optional per-request override.

```typescript
interface InferenceProfile {
  model?: string;       // haiku | sonnet | opus | gpt-5-codex | gemini-2.5-flash | …
  temperature?: number; // 0.0–1.0; keep low for code, law, aggregation
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max' | 'minimal';
  cot?: 'off' | 'brief' | 'full';  // Chain-Of-Thought — independent of effort
}
```

#### Presets

| Preset | Model (typical) | effort | temperature | cot | Use |
|--------|-----------------|--------|-------------|-----|-----|
| `fast` | Haiku / Flash | low / minimal | 0.2 | off | Short Q&A, routing |
| `balanced` | Sonnet / gpt-5 | medium | 0.5 | brief | Default work |
| `deep` | Sonnet / Pro | high | 0.3 | full | Design, review |
| `critical` | Opus (aggregator) | max / high | 0.2 | brief | Synthesis only |

**Peer providers** (Tier 1–3: `agy`, `codex`, `claude`) use TaskRouter-selected presets. **Aggregator** (Tier 4: Opus) uses preset `critical` with pinned overrides.

#### CoT vs Thinking Effort vs SSE "thinking"

| Knob | Controls |
|------|----------|
| **`effort`** | Provider reasoning budget (Claude `--effort`, Codex `reasoning_effort`) |
| **`cot`** | Chain-Of-Thought policy: prompt template + how much reasoning appears in output |
| **SSE thinking events** | UI progress stream; enabled when `cot !== 'off'`; not a replacement for `effort` |

Examples: `effort: high` + `cot: off` → deep internal reasoning, concise answer. `effort: low` + `cot: brief` → fast pass with short rationale.

Planned config: `config/inference-profiles.json`. API (To-Be): `profile` and optional `inference` per provider on analyze requests.

### LLM Provider Configuration

Provider adapters map `InferenceProfile` → native CLI/MCP flags. Static defaults below; runtime values come from profiles.

#### OpenAI (Codex CLI / MCP)

```typescript
// GPT-5 only — GPT-4/GPT-4o forbidden
const openaiDefaults: InferenceProfile = {
  model: 'gpt-5-codex',
  temperature: 0.5,
  effort: 'medium',           // reasoning_effort: minimal | medium | high
  cot: 'brief'
};
```

#### Anthropic (Claude Code CLI / MCP)

Peer provider (Tier 3). Models: **Haiku, Sonnet, Opus** (aliases or full ids). OAuth / MAX via CLI — no direct API keys in code.

```typescript
const claudeDefaults: InferenceProfile = {
  model: 'claude-sonnet-4-5-20250929',
  effort: 'medium',           // CLI: --effort low | medium | high | xhigh | max
  cot: 'brief'
};
// CLI: claude --model sonnet --effort high --print "…"
```

#### Google (Antigravity CLI)

Tier 1. Models: **Gemini 2.5 Pro / Flash**. Spawn via **`agy`** (no embedded API keys). → [ANTIGRAVITY_CLI_MIGRATION.md](./ANTIGRAVITY_CLI_MIGRATION.md)

```typescript
const agyDefaults: InferenceProfile = {
  model: 'gemini-2.5-flash',
  temperature: 0.3,
  cot: 'brief'
};
// Execution: spawn('agy', ['--model', profile.model, …]) — migration in progress (legacy gemini in AS-IS code)
```

## Prompt Analysis (Planned — Phase 0)

Japanese user prompts will undergo **morphological analysis** (形態素解析) in `PromptAnalyzer` before RAG / Grounding query generation — replacing regex-only parsing (P5 gap B5).

- **When**: Once per request, before Grounding fetch
- **Uses**: Query normalization, dictionary lookup, TaskRouter features, hybrid search term extraction
- **Not used for**: Direct morpheme substitution of LLM prompts, embedding preprocessing, consensus scoring alone

Details: [WALL_BOUNCE_P5_ARCHITECTURE.md §7](./decisions/WALL_BOUNCE_P5_ARCHITECTURE.md)

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
    budgetTier: 'standard',
    profile: 'fast' as const
  },
  premium: {
    minProviders: 3,
    maxProviders: 3,
    confidenceThreshold: 0.8,
    budgetTier: 'premium',
    profile: 'balanced' as const
  },
  critical: {
    minProviders: 3,
    maxProviders: 4,
    confidenceThreshold: 0.9,
    budgetTier: 'unlimited',
    profile: 'deep' as const,
    aggregatorProfile: 'critical' as const  // Opus synthesis only
  }
};
```

Per-provider overrides: `{ inference: { 'claude-code': { model: 'haiku', effort: 'low', cot: 'off' } } }`. See [TECH_STACK_INFERENCE_PROFILES.md](./decisions/TECH_STACK_INFERENCE_PROFILES.md).
