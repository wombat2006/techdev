# Tech Stack Decision: LLM Provider Transport (Same-Node)

**Status**: Accepted  
**Date**: 2026-06-17  
**Deciders**: TechSapo Development Team  
**Workspace ID**: TS-17

---

## Context

Question: Should inter-provider communication use **HTTP streaming** even when Codex, Claude Code, and Antigravity CLI (`agy`) run on the **same node**?

In Wall-Bounce, LLMs do not talk to each other directly. The **Orchestrator** fans out prompts, collects responses, builds consensus, and injects context into subsequent rounds (2–5 rounds per constitution). Transport choice affects latency, complexity, and future scale-out.

Related: [TECH_STACK_WORKSPACE.md](../TECH_STACK_WORKSPACE.md) · [WALL_BOUNCE_SYSTEM.md](../WALL_BOUNCE_SYSTEM.md)

---

## AS-IS

| Layer | Transport | Implementation |
|-------|-----------|----------------|
| User → API | **HTTP SSE** | `GET /api/v1/wall-bounce/analyze` — `text/event-stream` |
| Orchestrator → Codex / Gemini | **stdio spawn** | `spawn('codex' \| 'gemini', …)` — stdout chunks → `provider:streaming` EventEmitter |
| Orchestrator → Claude | **MCP stdio / SDK** | `@modelcontextprotocol/sdk` stdio transport; Anthropic SDK for aggregation |
| Inter-round data | **In-process text** | Prior round outputs merged into next prompt — not streamed LLM-to-LLM |

---

## Decision

### Default (same node): **stdio / MCP / in-process — not HTTP between providers**

| Boundary | Transport | Rationale |
|----------|-----------|-----------|
| **Browser / external client → Orchestrator** | **HTTP SSE** | Required for real-time UI; already implemented |
| **Orchestrator → co-located CLI (`agy`, `codex`)** | **stdio pipes + EventEmitter** | Lowest latency; no double-streaming overhead |
| **Orchestrator → Claude Code** | **MCP stdio** (same node) | MCP standard; HTTP MCP only when remote |
| **Round N → Round N+1** | **Batch text in prompt** | Consensus model needs completed (or staged) responses, not token pipe between models |

### Optional To-Be: **Provider Gateway (HTTP/SSE)**

Introduce an HTTP streaming **Provider Gateway** layer **only when**:

- Providers run as isolated sidecars (restart / permission boundaries)
- Multi-node or ECS/K8s deployment (TS-08)
- Unified HTTP observability is required across remote adapters

```
Browser ── SSE ──▶ Orchestrator
                      ├── (default) spawn / MCP stdio  → agy, codex, Claude
                      └── (To-Be)     HTTP/SSE Gateway → sidecar adapters
```

Gateway wraps CLI/MCP internally — not a replacement for CLI/SDK security policy.

---

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **stdio/MCP default (chosen)** | Simple, fast, matches CLI tools | Harder to remote without refactor |
| HTTP streaming for all same-node calls | Uniform interface; easy later scale-out | Extra hop; port/health/auth overhead; wraps CLI anyway |
| Direct LLM-to-LLM HTTP | Theoretical pipelining | Not aligned with Wall-Bounce consensus; high complexity |

---

## Consequences

### Positive

- Keeps co-located path minimal — stdout → EventEmitter → user SSE
- Avoids redundant HTTP stack for tools that are natively CLI/MCP
- Clear rule: **HTTP SSE at the outer boundary only** (for now)

### Negative / trade-offs

- Future multi-node move requires Gateway abstraction (planned, not urgent)
- Localhost HTTP prototyping is possible but **not the default**

### Follow-up tasks

- [ ] TS-08: Revisit Gateway if deployment leaves single node
- [ ] Document Provider Gateway sketch in ARCHITECTURE when sidecar work starts
- [ ] Do not add `@aws-sdk`-style HTTP client between providers on same node unless Gateway ADR supersedes this

---

## Sync Required

- [x] `docs/TECH_STACK_WORKSPACE.md` — TS-17 + inventory
- [x] `docs/ARCHITECTURE.md` — data flow note
- [ ] `README.md` — when Gateway implemented
- [ ] `CLAUDE.md` — no change (no new mandatory rule)

---

## References

- `src/services/wall-bounce-analyzer.ts` — spawn + `provider:streaming`
- `src/routes/wall-bounce-api.ts` — SSE to clients
- [MCP_SERVICES.md](../MCP_SERVICES.md)
