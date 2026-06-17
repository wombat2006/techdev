# Tech Stack Decision: Core vs Add-On Coupling

**Status**: Accepted (direction)  
**Date**: 2026-06-17  
**Deciders**: TechSapo Development Team  
**Workspace ID**: TS-18

---

## Context

TechSapo separates a **forkable Wall-Bounce core** from **replaceable add-ons** (Grounding sources, AWS peripherals, fork profiles, MCP extensions). This ADR records the **merits, demerits, and coupling guidelines** for keeping core and add-on features loosely coupled.

Related:

- [WALL_BOUNCE_P5_ARCHITECTURE.md](./WALL_BOUNCE_P5_ARCHITECTURE.md) — fixed Orchestrator + swappable Grounding / TaskRouter
- [TECH_STACK_AWS_PERIPHERAL.md](./TECH_STACK_AWS_PERIPHERAL.md) — AWS for peripheral services only
- [TECH_STACK_LLM_PROVIDER_TRANSPORT.md](./TECH_STACK_LLM_PROVIDER_TRANSPORT.md) — stdio/MCP for co-located LLMs
- [TECH_STACK_WORKSPACE.md](../TECH_STACK_WORKSPACE.md)

---

## Definitions

| Layer | Scope | Examples |
|-------|--------|----------|
| **Core** | Must not vary per fork; constitution applies | Wall-Bounce (2–5 rounds), fixed Orchestrator, TaskGraph / gate / audit, LLM invoke (agy / codex / Claude), quality thresholds, external API (SSE) |
| **Add-on** | Swappable, fork-specific, or phased (P5+) | Grounding (e-Gov, NDL, Drive RAG), AWS (SES, S3, Secrets, KMS), MCP extensions (Cipher, Context7), fork dictionaries, notifications, export storage |

---

## AS-IS

| Pattern | State | Risk |
|---------|-------|------|
| Fork model (docs) | Core + swappable Grounding / TaskRouter | Documented; partial code split |
| RAG vs Wall-Bounce | **Separate paths** (B2) | Grounding-free LLM inference during add-on gaps |
| Analyzer / SRP | **Dual implementations** (B3) | Tight coupling creep via ad-hoc branches |
| AWS peripheral | Direction accepted; not in code | Clear boundary planned |
| LLM transport (same node) | stdio/MCP tight; HTTP SSE at API edge | Appropriate for core |

---

## Decision

**Adopt loose coupling between core and add-ons via explicit contracts.** Keep the orchestration + Wall-Bounce + gate path **cohesive**; plug add-ons behind stable interfaces (`GroundingProvider`, notification/store adapters, fork profiles).

### Coupling matrix (target)

| Boundary | Coupling | Transport / pattern |
|----------|----------|---------------------|
| Orchestrator ↔ LLM (same node) | **Tight** | stdio / MCP / in-process (TS-17) |
| Orchestrator ↔ client | **Loose** | HTTP SSE |
| Orchestrator ↔ Grounding | **Loose** | Interface + async fetch; Tier merge in Orchestrator |
| Orchestrator ↔ AWS peripheral | **Loose** | AWS SDK; failure must not block core analysis (degraded mode) |
| Fork-specific features | **Loose** | Dictionary, TaskRouter rules, disclaimer profiles |

### Architecture sketch

```
┌─────────────────────────────────────┐
│ Core (prefer cohesive)               │
│ Orchestrator + Wall-Bounce + gate    │
│ LLM invoke: stdio / MCP              │
└──────────────┬──────────────────────┘
               │ explicit contracts
               ▼
┌─────────────────────────────────────┐
│ Add-ons (loose coupling)             │
│ GroundingProvider · Notifier · Store │
│ AWS SES·S3·Secrets · fork dictionary │
└─────────────────────────────────────┘
```

### Implementation order

1. **Fix core contracts first** — `GroundingBundle`, citation format, Hard gate, abstain (Phase 0)
2. **Plug add-ons behind interfaces** — do not embed e-Gov / SES / S3 logic inside `WallBounceAnalyzer`
3. **Degraded mode** — core may run without add-ons; gate / disclaimer must reflect missing Grounding

---

## Merits of Loose Coupling (Core ↔ Add-On)

### 1. Fork and specialization

Inherit Wall-Bounce engine; swap only dictionary, Grounding sources, TaskRouter rules, and UI disclaimer (InfraOps / LegalTech / DevAssist).

### 2. Failure isolation

SES outage or S3 misconfiguration must not stop Wall-Bounce consensus. LLM provider changes must not affect mail/storage infrastructure.

### 3. Security boundaries

- Core: CLI/SDK only; no inference API keys in Secrets Manager  
- Add-ons: Secrets Manager + KMS for non-LLM credentials (TS-13)

### 4. Independent delivery velocity

PoC with core + Wall-Bounce API only; add Grounding / APS in P5+ phases without rewriting consensus logic.

### 5. Team and vendor split

Core team owns Orchestrator contract; platform team owns AWS; fork teams own domain adapters.

### 6. Testability

Core tests use mock Grounding; add-ons get integration tests per provider. Supports 100% Wall-Bounce coverage target.

### 7. Future scale-out

Add-on services can move remote (HTTP Gateway, separate Grounding workers) without changing consensus rules (aligns with TS-17 To-Be).

---

## Demerits of Loose Coupling (Core ↔ Add-On)

### 1. Latency and overhead

Extra hops (HTTP, AWS APIs, separate processes) add latency. Wall-Bounce runs 2–5 rounds × multiple LLMs — slow Grounding fetch dominates SLA.

### 2. Distributed consistency

Partial success (analysis OK, notification failed) requires Outbox, retries, or compensation flows.

### 3. Interface design cost

Weak contracts (`GroundingBundle`, TaskRouter inputs) cause Orchestrator ad-hoc branches → de facto tight coupling (feeds B3 dual implementation).

### 4. Observability complexity

Cross-cutting traces (Orchestrator → Grounding → LLM → Aggregator → AWS) need correlation IDs; hard to debug without them.

### 5. Over-abstraction risk

Premature plugin/microservice split slows PoC while Hard gate is still missing (B1) — quality issues hide behind infrastructure work.

### 6. Grounding gap period

Long add-on rollout means **grounding-free inference** (B2) becomes normal unless core enforces abstain / disclaimer when Tier 0 is empty.

### 7. Operational surface

AWS + Node + LLM CLI + Redis doubles monitoring, backup, and DR scope per add-on SLA.

---

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A. Loose add-ons, cohesive core (chosen)** | Fork-ready; phased P5+; matches proposal | Requires strong interfaces + degraded mode |
| **B. Monolith — all features in Analyzer** | Fast initial PoC | Fork impossible; B2/B3 worsen |
| **C. Full microservices early** | Maximum isolation | High ops cost before gate exists |

---

## Guidelines: When to Loosen vs Tighten

| Prefer **loose** coupling | Keep **tight** coupling |
|---------------------------|-------------------------|
| Swapped per fork | Constitution (2–5 rounds) |
| External SaaS / AWS | Consensus before Aggregator |
| Safe to skip in degraded mode | Hard gate / abstain |
| Different release cadence | Same-node LLM stdio/MCP (TS-17) |
| Optional for PoC | Tier 0 contradiction rules |

---

## Consequences

### Positive

- Aligns documentation, proposal, and P5+ roadmap with implementable boundaries
- Reduces risk of AWS or RAG changes breaking Wall-Bounce core

### Negative / trade-offs

- Must invest in Phase 0 contracts before expanding add-on count
- Degraded-mode UX and monitoring must be designed explicitly

### Follow-up tasks

- [ ] Define `GroundingProvider` interface in code (Phase 0 / 1)
- [ ] Consolidate Analyzer / SRP paths (B3) behind Orchestrator
- [ ] Document degraded mode in API responses when add-ons unavailable
- [ ] Add correlation ID across Orchestrator → add-on calls

---

## Sync Required

- [x] `docs/TECH_STACK_WORKSPACE.md` — TS-18
- [x] `docs/decisions/README.md`
- [ ] `docs/ARCHITECTURE.md` — optional diagram when interfaces exist in code
- [ ] `docs/proposals/WALL_BOUNCE_PLATFORM_PROPOSAL.md` — if customer-facing fork story updates

---

## References

- [WALL_BOUNCE_PLATFORM_PROPOSAL.md](../proposals/WALL_BOUNCE_PLATFORM_PROPOSAL.md)
- Gap IDs B1–B8: [WALL_BOUNCE_P5_ARCHITECTURE.md](./WALL_BOUNCE_P5_ARCHITECTURE.md)
