# Architecture Decision Records (ADR)

Index of design decisions for TechSapo. Logic/rule ADRs are written in **English**; customer-facing proposals may remain in Japanese.

---

## Active Records

| ID | Document | Status | Topic |
|----|----------|--------|-------|
| P5 | [WALL_BOUNCE_P5_ARCHITECTURE.md](./WALL_BOUNCE_P5_ARCHITECTURE.md) | Accepted | P5+ roadmap, Orchestrator, Grounding |
| TS-13 | [TECH_STACK_AWS_PERIPHERAL.md](./TECH_STACK_AWS_PERIPHERAL.md) | **Accepted (direction)** | AWS for SES, S3, Secrets Manager, KMS |
| TS-17 | [TECH_STACK_LLM_PROVIDER_TRANSPORT.md](./TECH_STACK_LLM_PROVIDER_TRANSPORT.md) | **Accepted** | stdio/MCP same-node; HTTP SSE at API boundary |
| TS-18 | [TECH_STACK_CORE_VS_ADDON_COUPLING.md](./TECH_STACK_CORE_VS_ADDON_COUPLING.md) | **Accepted (direction)** | Loose add-ons; cohesive Wall-Bounce core |
| TS-19 | [WALL_BOUNCE_P5_ARCHITECTURE.md §7](./WALL_BOUNCE_P5_ARCHITECTURE.md#7-形態素解析の位置づけ) | **Accepted (direction)** | Morphological analysis for PromptAnalyzer (Phase 0) |
| TS-20 | [TECH_STACK_INFERENCE_PROFILES.md](./TECH_STACK_INFERENCE_PROFILES.md) | **Accepted (direction)** | InferenceProfile: model, effort, CoT, temperature |
| — | [TECH_STACK_WORKSPACE.md](../TECH_STACK_WORKSPACE.md) | **Preparation** | Tech stack refinement workspace |
| — | [_TEMPLATE_TECH_STACK.md](./_TEMPLATE_TECH_STACK.md) | Template | New stack decision template |

## Planned (backlog)

Tech stack decisions will be added as `TECH_STACK_<topic>.md` when accepted. See workspace backlog TS-01 … TS-20.

---

## Adding a Decision

1. Copy `_TEMPLATE_TECH_STACK.md` → `TECH_STACK_<topic>.md`
2. Fill sections; set status to **Accepted** when agreed
3. Update this index and [TECH_STACK_WORKSPACE.md](../TECH_STACK_WORKSPACE.md)
4. Sync ARCHITECTURE + README + CLAUDE in same commit ([documentation-sync](../../.cursor/rules/documentation-sync.mdc))

---

## Related

- [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md)
- [CLAUDE.md](../../CLAUDE.md)
