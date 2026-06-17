# Claude Code — Development Notes

[← CLAUDE.md skeleton](../CLAUDE.md) · [Development Guide](./DEVELOPMENT_GUIDE.md) · [Architecture](./ARCHITECTURE.md)

---

## Coding Practices

- **Never bypass Wall-Bounce** — All LLM calls via `wall-bounce-analyzer.ts`
- **No API keys** — CLI/SDK only (Antigravity `agy`, codex, Anthropic SDK)
- **Japanese responses** — Primary language for user-facing content
- **Test coverage** — 100% for Wall-Bounce components
- **Doc sync on commit** — README + related docs in same commit ([documentation-sync rule](../.cursor/rules/documentation-sync.mdc))
- **Logic docs in English** — CLAUDE.md, claude-*.md, WALL_BOUNCE_SYSTEM.md, and similar rule docs must be written in English

---

## Common Tasks

| Task | File Location | Entry Point |
|------|---------------|-------------|
| Add new LLM provider | `src/services/wall-bounce-analyzer.ts` | `initializeProviders()` |
| Modify quality threshold | `src/services/wall-bounce-analyzer.ts` | `executeWallBounce()` |
| Inference profile / CoT | `config/inference-profiles.json` (planned), provider adapters | [TECH_STACK_INFERENCE_PROFILES.md](./decisions/TECH_STACK_INFERENCE_PROFILES.md) |
| Cursor MCP registration | After Track A-0 in [CURSOR_MCP_TODO.md](./CURSOR_MCP_TODO.md) | [CURSOR_MCP_PLAN.md](./CURSOR_MCP_PLAN.md) |
| Add API endpoint | `src/routes/` | Create new route file |
| Update MCP approval | `src/services/mcp-approval-manager.ts` | `assessRisk()` |

---

## Project Structure

```
src/
├── index.ts                              # Main Express server
├── config/
│   ├── environment.ts                    # Environment config
│   └── feature-flags.ts                  # Feature toggles
├── routes/
│   ├── wall-bounce-api.ts               # Wall-Bounce SSE endpoint
│   ├── rag-endpoint.ts                  # RAG queries
│   └── webhook-endpoints.ts             # Google Drive webhooks
├── services/
│   ├── wall-bounce-analyzer.ts          # Wall-Bounce core
│   ├── mcp-integration-service.ts       # MCP orchestrator
│   ├── mcp-approval-manager.ts          # Approval workflows
│   ├── codex-mcp-server.ts              # GPT-5 Codex integration
│   ├── googledrive-connector.ts         # RAG system
│   └── __mocks__/                       # Test mocks
├── middleware/
│   ├── auth.ts                          # Authentication
│   ├── validation.ts                    # Input validation
│   └── error-handler.ts                 # Error handling
├── metrics/
│   └── prometheus-client.ts             # Metrics collection
└── utils/
    ├── logger.ts                        # Winston logging
    └── security.ts                      # Security utilities
```

Key directories: `scripts/` (build/deploy), `tests/` (Jest), `docs/`, `public/` (frontend UI)

Details: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## API Endpoints (Summary)

| Group | Endpoints |
|-------|-----------|
| Wall-Bounce | `POST /api/v1/wall-bounce/analyze` (SSE), `POST .../analyze-simple` (JSON) |
| RAG | `POST /api/v1/rag/query`, `POST /api/v1/rag/embed` |
| Health | `GET /health`, `GET /ping`, `GET /metrics` |

Details: [API_REFERENCE.md](./API_REFERENCE.md)

---

## Security Requirements (Summary)

| Area | Rule |
|------|------|
| LLM access | CLI spawn (`agy`, `codex`) + Internal SDK (Anthropic) only |
| Input | Sanitize via `utils/security.ts` |
| Spawn | Arguments array, no shell meta-characters |
| MCP | Risk-based workflows in `mcp-approval-manager.ts` |
| Infra | Redis required, HTTPS in production, systemd isolation |

Details: [SECURITY.md](./SECURITY.md)

---

## Wall-Bounce Execution Modes

- **`parallel`** — Concurrent execution (default)
- **`sequential`** — Chain depth 3–5

### Round Count (Constitution)

- **Minimum 2 rounds, maximum 5 rounds** — per [CLAUDE.md Constitution](../CLAUDE.md#constitution). Single-round wall-bounce is forbidden.

Entry: `WallBounceAnalyzer.executeWallBounce()` in `wall-bounce-analyzer.ts`

Details: [WALL_BOUNCE_SYSTEM.md](./WALL_BOUNCE_SYSTEM.md)

---

## Documentation Map

### Essential Reading
1. [ARCHITECTURE.md](./ARCHITECTURE.md)
2. [WALL_BOUNCE_SYSTEM.md](./WALL_BOUNCE_SYSTEM.md)
3. [SECURITY.md](./SECURITY.md)
4. [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)

### Integration Guides
- [codex-mcp-implementation.md](./codex-mcp-implementation.md)
- [mcp-integration-guide.md](./mcp-integration-guide.md)
- [ANTIGRAVITY_CLI_MIGRATION.md](./ANTIGRAVITY_CLI_MIGRATION.md)
- [decisions/TECH_STACK_LLM_PROVIDER_TRANSPORT.md](./decisions/TECH_STACK_LLM_PROVIDER_TRANSPORT.md) — stdio/MCP vs HTTP SSE
- [decisions/TECH_STACK_CORE_VS_ADDON_COUPLING.md](./decisions/TECH_STACK_CORE_VS_ADDON_COUPLING.md) — core vs add-on coupling
- [GEMINI_CLI_INTEGRATION_GUIDE.md](./GEMINI_CLI_INTEGRATION_GUIDE.md) (legacy reference)

### Operations
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- [MONITORING_OPERATIONS.md](./MONITORING_OPERATIONS.md)
- [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- [TECH_STACK_WORKSPACE.md](./TECH_STACK_WORKSPACE.md) — stack refinement prep
- [decisions/README.md](./decisions/README.md) — ADR index

Full index: [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
