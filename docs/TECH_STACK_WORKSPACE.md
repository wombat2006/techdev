# Tech Stack Workspace

**Status**: PREPARATION — decisions not finalized  
**Owner**: TechSapo Development Team  
**Last updated**: 2026-06-17 (AWS peripheral direction added)

Working document for **tech stack refinement**. Fill in the **Target** and **Decision** columns as choices are made. Do not treat TBD rows as committed until recorded in `docs/decisions/`.

**Direction (accepted):** Peripheral / surrounding features → **AWS** (SES, S3, Secrets Manager, KMS). See [TECH_STACK_AWS_PERIPHERAL.md](./decisions/TECH_STACK_AWS_PERIPHERAL.md).

Related: [ARCHITECTURE.md](./ARCHITECTURE.md) · [decisions/README.md](./decisions/README.md) · [CLAUDE.md](../CLAUDE.md)

> **Note:** Customer proposal PPTX visual design is adjusted separately — out of scope here.

---

## How to Use This Workspace

1. Review **AS-IS inventory** (below) against `package.json` and runtime.
2. Pick an item from **Decision backlog** (priority order flexible).
3. Copy [decisions/_TEMPLATE_TECH_STACK.md](./decisions/_TEMPLATE_TECH_STACK.md) → `docs/decisions/TECH_STACK_<topic>.md`.
4. Set status to **Proposed** → **Accepted** when agreed.
5. Update **Target** column here, then sync [ARCHITECTURE.md](./ARCHITECTURE.md), README(s), and CLAUDE skeleton in the **same commit**.

Regenerate AS-IS snapshot (optional):

```bash
npm run audit:tech-stack
```

---

## AS-IS Inventory (2026-06-17)

### Runtime & build

| Component | AS-IS | Source |
|-----------|-------|--------|
| Node.js | ≥18.0.0 | `package.json` engines |
| TypeScript | ~5.3.3, ES2022, CommonJS | `tsconfig.json` |
| Build | `tsc` → `dist/` | `npm run build` |
| Dev | `ts-node-dev` | `npm run dev` |

### Application framework

| Component | AS-IS | Notes |
|-----------|-------|-------|
| HTTP | Express ^4.18 | `src/index.ts` |
| Security | Helmet, CORS | middleware |
| Logging | Winston ^3.11 | structured logs |
| Metrics | prom-client ^15 | `/metrics` |

### Data & cache

| Component | AS-IS | Notes |
|-----------|-------|-------|
| Redis | `redis` ^4.6 + `ioredis` ^5.3 + `@upstash/redis` ^1.35 | **multiple clients — consolidate?** |
| SQL | `mysql2` ^3.6, `sqlite3` ^5.1 | usage scope TBD |
| Vector / RAG | Google Drive + OpenAI embeddings | no dedicated vector DB yet |

### LLM & orchestration

| Component | AS-IS | Target (docs) |
|-----------|-------|---------------|
| Google Tier 1 | legacy `gemini` spawn | Antigravity CLI (`agy`) |
| OpenAI / Codex | `codex` CLI + MCP | unchanged |
| Anthropic | SDK (Sonnet / Opus) | no direct API keys |
| MCP SDK | `@modelcontextprotocol/sdk` ^1.18 | |
| Wall-Bounce | `wall-bounce-analyzer.ts` | 2–5 rounds (constitution) |

### LLM provider transport (same node)

| Layer | AS-IS | Target | ADR |
|-------|-------|--------|-----|
| User → API | HTTP SSE | HTTP SSE | [TECH_STACK_LLM_PROVIDER_TRANSPORT.md](./decisions/TECH_STACK_LLM_PROVIDER_TRANSPORT.md) |
| Orchestrator → agy / codex | stdio spawn | **stdio spawn** (same node) | same |
| Orchestrator → Claude Code | MCP stdio / SDK | **MCP stdio / SDK** (same node) | same |
| Inter-round / inter-LLM | In-process prompt text | **Batch prompt injection** (not LLM-to-LLM HTTP) | same |
| Provider Gateway (To-Be) | none | HTTP/SSE only if sidecar / multi-node (TS-08) | same |

**Rule:** Do not use HTTP streaming as the default transport between co-located providers. HTTP SSE is for **external clients** and optional future **Provider Gateway**.

### MCP & agent tooling

| Service | AS-IS | Entry |
|---------|-------|-------|
| Cipher | `@byterover/cipher` | `npm run cipher-mcp` |
| Codex MCP | custom server | `npm run codex-mcp` |
| Claude Code MCP | `@anthropic-ai/claude-agent-sdk` | `claude-code-mcp` script |
| Context7 | external MCP | Cursor / desktop config |
| Cursor MCP (TechSapo) | **not registered** | Full-Fork **`techdev-cursor`** → [FORK_CURSOR.md](./FORK_CURSOR.md); Phase 0 WSL CLI + unified MCP |

### Testing & quality

| Component | AS-IS | Notes |
|-----------|-------|-------|
| Test runner | Jest ^29 | 5 min integration timeout |
| Property tests | fast-check (referenced in docs) | verify in devDependencies |
| Lint | ESLint ^8 + @typescript-eslint ^6 | |
| Coverage target | 100% Wall-Bounce (policy) | |

### Observability & ops

| Component | AS-IS | Notes |
|-----------|-------|-------|
| Metrics | Prometheus scrape | `scripts/start-monitoring.sh` |
| Dashboards | Grafana (scripts) | |
| Production | systemd `techsapo` | see DEPLOYMENT_GUIDE |
| TLS | HTTPS :8443 | |

### AWS peripheral (direction — not yet in code)

| Capability | Target | AWS service | ADR |
|------------|--------|-------------|-----|
| Email | **AWS** | Amazon SES | [TECH_STACK_AWS_PERIPHERAL.md](./decisions/TECH_STACK_AWS_PERIPHERAL.md) |
| Object storage | **AWS** | Amazon S3 | same |
| App secrets (non-LLM) | **AWS** | Secrets Manager | same |
| Encryption keys | **AWS** | KMS | same |
| LLM credentials | CLI/SDK only | — (not Secrets Manager for inference keys) | [SECURITY.md](./SECURITY.md) |

Implementation: no `@aws-sdk/*` in `package.json` yet.

**Placeholders:** region `ap-northeast-1` · SES From `noreply@notify.techsapo.example` (virtual `.example` domain)

### Frontend & assets

| Component | AS-IS | Notes |
|-----------|-------|-------|
| UI | `public/` static assets | thinking-toggle UI |
| PPTX pipeline | Satori + Resvg + pptxgenjs | `scripts/pptx-gen/` — design tuned manually |

---

## Decision Backlog (TBD)

Priority is **not fixed** — reorder as needed during refinement.

| ID | Area | Question | AS-IS | Target | Decision doc |
|----|------|----------|-------|--------|--------------|
| TS-01 | Runtime | Pin Node LTS (18 vs 20 vs 22)? | ≥18 | TBD | — |
| TS-02 | TypeScript | Enable `strict` mode? | strict: false | TBD | — |
| TS-03 | Redis | Single client library + deployment model? | 3 libraries | TBD | — |
| TS-04 | SQL | MySQL vs SQLite roles? | both present | TBD | — |
| TS-05 | Vector DB | Pinecone / Weaviate / pgvector / other? | none | TBD | — |
| TS-06 | Google CLI | Antigravity (`agy`) migration cutover | legacy gemini | agy | [ANTIGRAVITY_CLI_MIGRATION.md](./ANTIGRAVITY_CLI_MIGRATION.md) |
| TS-07 | MCP inventory | Canonical MCP server list & versions | partial | TBD | — |
| TS-08 | Deployment | systemd vs container vs k8s vs AWS compute? | systemd | TBD | — |
| TS-09 | Secrets | Non-LLM secrets storage | env / ad hoc | **Secrets Manager + KMS** | [TECH_STACK_AWS_PERIPHERAL.md](./decisions/TECH_STACK_AWS_PERIPHERAL.md) |
| TS-10 | Monitoring | Prometheus/Grafana version pins & alerts | scripts | TBD | — |
| TS-11 | Frontend | SPA framework or stay static? | static `public/` | TBD | — |
| TS-12 | Constitution | Enforce 2–5 rounds in code | docs only | TBD | — |
| TS-13 | AWS peripheral | SES / S3 / Secrets / KMS baseline | none in code | **AWS** | [TECH_STACK_AWS_PERIPHERAL.md](./decisions/TECH_STACK_AWS_PERIPHERAL.md) |
| TS-14 | AWS account | Region, IAM roles, dev vs prod | TBD | **`ap-northeast-1` (Tokyo, placeholder)** | [TECH_STACK_AWS_PERIPHERAL.md](./decisions/TECH_STACK_AWS_PERIPHERAL.md) |
| TS-15 | SES | Domain, DKIM, bounce handling | none | **`notify.techsapo.example` (virtual From)** | [TECH_STACK_AWS_PERIPHERAL.md](./decisions/TECH_STACK_AWS_PERIPHERAL.md) |
| TS-16 | S3 | Bucket layout, lifecycle, SSE-KMS | none | Amazon S3 | — |
| TS-17 | LLM transport | HTTP streaming between co-located providers? | stdio/MCP + user SSE | **stdio/MCP default; HTTP SSE outer boundary only** | [TECH_STACK_LLM_PROVIDER_TRANSPORT.md](./decisions/TECH_STACK_LLM_PROVIDER_TRANSPORT.md) |
| TS-18 | Core vs add-on | Coupling strategy for fork / AWS / Grounding | partial / ad-hoc | **Loose add-ons; cohesive core + contracts** | [TECH_STACK_CORE_VS_ADDON_COUPLING.md](./decisions/TECH_STACK_CORE_VS_ADDON_COUPLING.md) |
| TS-19 | Morphological analysis | Japanese prompt parsing for PromptAnalyzer | regex-only (B5) | **MeCab-class parser, Phase 0** | [WALL_BOUNCE_P5_ARCHITECTURE.md §7](./decisions/WALL_BOUNCE_P5_ARCHITECTURE.md#7-形態素解析の位置づけ) |
| TS-20 | Inference profiles | Model, effort, CoT, temperature per task/provider | fragmented / hardcoded | **InferenceProfile + presets, Phase 0** | [TECH_STACK_INFERENCE_PROFILES.md](./decisions/TECH_STACK_INFERENCE_PROFILES.md) |
| TS-21 | Cursor MCP | Unified `techsapo-providers` in Cursor IDE | not registered | **Full-Fork `techdev-cursor`** → Phase 0 + unified MCP | [FORK_CURSOR.md](./FORK_CURSOR.md) · [CURSOR_MCP_PLAN.md](./CURSOR_MCP_PLAN.md) · [CURSOR_MCP_TODO.md](./CURSOR_MCP_TODO.md) |

---

## Sync Checklist (when a decision is accepted)

- [ ] ADR in `docs/decisions/TECH_STACK_*.md`
- [ ] Row updated in this workspace (Target + link)
- [ ] `docs/ARCHITECTURE.md` Technology Stack section
- [ ] `README.md` + `README_ja.md` prerequisites
- [ ] `CLAUDE.md` summary (if provider/runtime rule changes)
- [ ] `docs/claude-development-notes.md` if dev workflow changes
- [ ] Implementation ticket / phase mapping (P5+ if applicable)

---

## Out of Scope (this phase)

- Proposal PPTX pixel-level design (owner adjusts locally)
- Full implementation of backlog items (decision-first)
- Customer-facing Japanese proposal text (unless stack facts change)

---

## Appendix: Key Files

| Purpose | Path |
|---------|------|
| Dependencies | `package.json` |
| TS config | `tsconfig.json` |
| Feature flags | `src/config/feature-flags.ts` |
| Environment | `src/config/environment.ts` |
| Wall-Bounce providers | `src/services/wall-bounce-analyzer.ts` |
| MCP orchestration | `src/services/mcp-integration-service.ts` |
| Monitoring scripts | `scripts/start-monitoring.sh` |
