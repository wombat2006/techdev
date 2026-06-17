# Tech Stack Decision: Inference Profiles (Model, Effort, CoT, Temperature)

**Document type**: Architecture Decision Record (ADR)  
**ID**: TS-20  
**Version**: 1.0  
**Date**: 2026-06-17  
**Status**: **Accepted (direction)** — documentation and Phase 0 target; code pass-through pending

---

## 1. Context

Wall-Bounce coordinates multiple LLM providers (`agy`, `codex`, `claude`) as **peer Tier 1–3 providers**, with Opus as **Tier 4 aggregator** only. Operators need to control, per task or per provider:

- **Model** — Haiku, Sonnet, Opus, GPT-5 / Codex, Gemini Pro / Flash, etc.
- **Thinking effort** — provider-native reasoning budget (e.g. Claude `--effort`, Codex `reasoning_effort`)
- **CoT (Chain-Of-Thought)** — whether and how step-by-step reasoning is requested and exposed
- **Temperature** — sampling randomness where the provider supports it

Today these knobs are fragmented: model IDs live in `llm-providers.json`, Codex has partial `reasoning_effort`, Claude MCP hardcodes Sonnet 4.5, and the Wall-Bounce API exposes only `taskType` / `mode` / `depth`.

---

## 2. Decision

Introduce a single **`InferenceProfile`** schema and **preset library**, resolved in three layers:

1. **Preset** — `fast` | `balanced` | `deep` | `critical` (default for most requests)
2. **TaskRouter / PromptAnalyzer** — selects preset from task kind, complexity, and constitution round
3. **Override** — optional per-request or per-provider `InferenceProfile` patch

Each provider **adapter** maps `InferenceProfile` to native CLI/MCP flags. Adapters MUST NOT embed provider-specific logic in the orchestrator.

### 2.1 InferenceProfile schema

```typescript
interface InferenceProfile {
  /** Provider model id or alias (haiku, sonnet, opus, gpt-5-codex, gemini-2.5-flash, …) */
  model?: string;

  /** Sampling temperature where supported (0.0–1.0). Low for code, law, aggregation. */
  temperature?: number;

  /**
   * Thinking effort — provider-native reasoning budget.
   * Claude CLI: --effort (low | medium | high | xhigh | max)
   * Codex: reasoning_effort (minimal | medium | high)
   */
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max' | 'minimal';

  /**
   * Chain-Of-Thought (CoT) control — distinct from effort and from SSE "thinking" UI.
   * - off:   no explicit CoT instruction; final answer only
   * - brief: structured internal steps; minimal exposed reasoning in output
   * - full:  explicit step-by-step CoT; may stream via SSE thinking events
   */
  cot?: 'off' | 'brief' | 'full';
}
```

### 2.2 CoT vs Thinking Effort vs SSE "thinking"

| Concept | Purpose | Controlled by |
|---------|---------|---------------|
| **Thinking effort** | Model compute / extended-thinking budget | `effort`, provider flags |
| **CoT** | Prompt and response policy for chain-of-thought | `cot` → adapter prompt template + output filter |
| **SSE thinking events** | UI stream of analysis progress | Orchestrator when `cot !== 'off'`; not a substitute for effort |

CoT MUST be independently controllable: e.g. `effort: high` + `cot: off` (deep reasoning, concise answer) or `effort: low` + `cot: brief` (fast task with light rationale).

### 2.3 Presets (defaults)

| Preset | Typical model | effort | temperature | cot | Use case |
|--------|---------------|--------|-------------|-----|----------|
| `fast` | Haiku / Flash | low / minimal | 0.2 | off | Classification, short Q&A |
| `balanced` | Sonnet / gpt-5 | medium | 0.5 | brief | Default implementation |
| `deep` | Sonnet / Pro | high | 0.3 | full | Design, review, multi-file |
| `critical` | Opus (aggregator) | max / high | 0.2 | brief | Synthesis, security, final integration |

**Aggregator rule**: `llm_aggregate` child tasks use preset `critical` with **pinned** profile overrides; peer providers use TaskRouter-selected presets.

### 2.4 Provider adapter mapping

| Provider | model | effort | temperature | cot |
|----------|-------|--------|-------------|-----|
| **Claude Code** (`claude`) | `--model` | `--effort` | settings / API layer when available | system prompt + output policy |
| **Codex** (`codex`) | config / CLI model | `reasoning_effort` | CLI when supported | prompt template |
| **Antigravity** (`agy`) | `--model` | provider-specific | generation config when exposed | prompt template |

Planned config file: `config/inference-profiles.json` (presets + per-`ChildTaskKind` defaults).

### 2.5 API surface (To-Be)

```typescript
interface WallBounceAnalyzeRequest {
  question: string;
  taskType?: 'basic' | 'premium' | 'critical';
  executionMode?: 'parallel' | 'sequential';
  depth?: number;
  /** Preset name; default from TaskRouter */
  profile?: 'fast' | 'balanced' | 'deep' | 'critical';
  /** Optional per-provider overrides */
  inference?: Partial<Record<string, InferenceProfile>>;
}
```

---

## 3. AS-IS → To-Be

| | AS-IS | To-Be |
|---|--------|--------|
| Model selection | Hardcoded per provider / MCP tool | `InferenceProfile.model` + presets |
| Effort | Codex partial; Claude MCP none | All adapters pass-through |
| CoT | UI streaming only; not configurable | `cot: off \| brief \| full` |
| Temperature | Doc examples only | Profile + adapter |
| Haiku | README mention only | Registered provider + `fast` preset |

---

## 4. Implementation phases

| Phase | Scope |
|-------|--------|
| **0** | `config/inference-profiles.json`, types, Claude MCP `model`/`effort`/`cot` pass-through |
| **1** | Codex MCP `reasoning_effort` + `cot` from profile; agy adapter |
| **2** | Wall-Bounce API `profile` / `inference`; TaskRouter default selection |
| **3** | Haiku provider registration; aggregator pinned `critical` profile |

---

## 5. Related

- [WALL_BOUNCE_SYSTEM.md § Inference Profiles](../WALL_BOUNCE_SYSTEM.md#inference-profiles-model-effort-cot-temperature)
- [WALL_BOUNCE_P5_ARCHITECTURE.md §10](./WALL_BOUNCE_P5_ARCHITECTURE.md#10-inference-profiles)
- [TECH_STACK_LLM_PROVIDER_TRANSPORT.md](./TECH_STACK_LLM_PROVIDER_TRANSPORT.md)
- [DEVELOPMENT_GUIDE.md § CLI inference knobs](../DEVELOPMENT_GUIDE.md#cli-inference-knobs-subscription-quota)
