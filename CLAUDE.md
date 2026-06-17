# TechSapo - Claude Code Navigation Guide

**AI Orchestration Platform with Wall-Bounce Multi-LLM Analysis**

> **Skeleton only.** See linked docs for commands, MCP rules, and details. Do not bloat this file — accuracy degrades when it grows.

---

## Constitution

> **Supreme rules.** All analysis, design, and implementation decisions in this repository MUST follow these rules. **No exceptions.**

### Wall-Bounce Obligations

1. **Always use Wall-Bounce** — No single-LLM dependency or bypass
2. **Round count: 2 to 5** — Run **at least 2 rounds**, **at most 5 rounds** (single-round wall-bounce is forbidden)
3. **Quality thresholds** — confidence ≥ 0.7, consensus ≥ 0.6 (add rounds or escalate if not met)
4. **Implementation path** — Only via `src/services/wall-bounce-analyzer.ts`
5. **Output language** — Japanese for user-facing content

Details: [WALL_BOUNCE_SYSTEM.md](docs/WALL_BOUNCE_SYSTEM.md)

---

## Quick Navigation

| Task | Primary File | Documentation |
|------|--------------|---------------|
| Wall-Bounce Analysis | `src/services/wall-bounce-analyzer.ts` | [WALL_BOUNCE_SYSTEM.md](docs/WALL_BOUNCE_SYSTEM.md) |
| MCP Integration | `src/services/mcp-integration-service.ts` | [MCP_SERVICES.md](docs/MCP_SERVICES.md) |
| Cursor MCP (planned) | Phase 0: WSL CLI + auth first | [CURSOR_MCP_PLAN.md](docs/CURSOR_MCP_PLAN.md) |
| API Routes | `src/routes/wall-bounce-api.ts` | [API_REFERENCE.md](docs/API_REFERENCE.md) |
| Security & Auth | `src/middleware/` | [SECURITY.md](docs/SECURITY.md) |
| System Architecture | `src/index.ts` | [ARCHITECTURE.md](docs/ARCHITECTURE.md) |

---

## Mandatory Rules (Summary)

| Area | Requirement | Details |
|------|-------------|---------|
| **Wall-Bounce** | **Constitution**: 2–5 rounds required, 2+ LLMs, confidence ≥ 0.7, consensus ≥ 0.6, via `wall-bounce-analyzer.ts` only | [WALL_BOUNCE_SYSTEM.md](docs/WALL_BOUNCE_SYSTEM.md) |
| **Security** | CLI/SDK only (`agy` / `codex` / Anthropic SDK); no API keys in code or env | [SECURITY.md](docs/SECURITY.md) |
| **MCP work** | Follow Serena / Cipher / Codex / Context7 rules | [claude-mcp-rules.md](docs/claude-mcp-rules.md) |
| **Commit** | Include README and related docs in the same commit when changing behavior | [.cursor/rules/documentation-sync.mdc](.cursor/rules/documentation-sync.mdc) |
| **Doc language** | Logic and rule docs (CLAUDE.md, claude-*.md, WALL_BOUNCE_SYSTEM.md, etc.) in **English** | [documentation-sync.mdc](.cursor/rules/documentation-sync.mdc) |

### Provider Tiers (Summary)

```
Tier 1: Gemini 2.5 Pro     → Antigravity CLI (agy)
Tier 2: GPT-5 Codex        → MCP/CLI (codex)
Tier 3: Claude Sonnet 4    → Internal SDK
Tier 4: Claude Opus 4.1    → Aggregator (synthesis)
```

> **Implementation note:** Docs standard is `agy`. `wall-bounce-analyzer.ts` still spawns legacy `gemini` (migration pending) → [ANTIGRAVITY_CLI_MIGRATION.md](docs/ANTIGRAVITY_CLI_MIGRATION.md)

---

## Detail Documents

| Topic | Document |
|-------|----------|
| Commands (dev / test / MCP / monitoring / emergency) | [claude-commands.md](docs/claude-commands.md) |
| MCP usage rules for Claude Code | [claude-mcp-rules.md](docs/claude-mcp-rules.md) |
| Dev notes, common tasks, environment checks | [claude-development-notes.md](docs/claude-development-notes.md) |
| Project structure and tech stack | [ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Testing | [TESTING_GUIDE.md](docs/TESTING_GUIDE.md) |
| Tech stack refinement (prep) | [TECH_STACK_WORKSPACE.md](docs/TECH_STACK_WORKSPACE.md) |
| Operations and deployment | [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) · [MONITORING_OPERATIONS.md](docs/MONITORING_OPERATIONS.md) |
| Full documentation index | [DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md) |

---

## Tech Stack (Summary)

| Layer | Technology |
|-------|------------|
| Runtime | Node.js ≥18 |
| Language | TypeScript (ES2022) |
| Framework | Express.js |
| Cache | Redis |
| Testing | Jest + fast-check |
| Monitoring | Prometheus + Grafana |

---

**Production-ready AI orchestration platform with enterprise-grade monitoring, security, and multi-LLM coordination.**
