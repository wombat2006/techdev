# TechSapo - Claude Code Navigation Guide

**AI Orchestration Platform with Wall-Bounce Multi-LLM Analysis**

---

## 🚀 Quick Navigation

| Task | Primary File | Documentation |
|------|--------------|---------------|
| Wall-Bounce Analysis | `src/services/wall-bounce-analyzer.ts` | `docs/WALL_BOUNCE_SYSTEM.md` |
| MCP Integration | `src/services/mcp-integration-service.ts` | `docs/MCP_SERVICES.md` |
| API Routes | `src/routes/wall-bounce-api.ts` | `docs/API_REFERENCE.md` |
| Security & Auth | `src/middleware/` | `docs/SECURITY.md` |
| System Architecture | `src/index.ts` | `docs/ARCHITECTURE.md` |

---

## 📋 Essential Commands

### Development Workflow
```bash
npm install          # Install dependencies
npm run build        # Build TypeScript → dist/
npm run dev          # Hot reload development
npm test             # Run all tests
npm run lint         # Code quality check
```

### MCP Services
```bash
npm run cipher-mcp   # Long-term memory MCP
npm run codex-mcp    # GPT-5/Codex MCP integration
```

### Monitoring & Operations
```bash
./scripts/start-monitoring.sh     # Prometheus + Grafana stack
sudo systemctl status techsapo    # Production service status
```

---

## ⚠️ MANDATORY: Wall-Bounce Rules

**All analysis MUST use Wall-Bounce system - never bypass for direct LLM calls**

### Core Requirements
1. **Minimum 2 LLM providers** required for any analysis
2. **Quality Thresholds**: 
   - Confidence ≥ 0.7
   - Consensus ≥ 0.6
3. **Response Language**: Japanese for user-facing content
4. **Execution**: Via `src/services/wall-bounce-analyzer.ts` only

### Provider Architecture
```
Tier 1: Gemini 2.5 Pro     → Antigravity CLI only (agy command)
Tier 2: GPT-5 Codex        → MCP/CLI (codex command)
Tier 3: Claude Sonnet 4      → Internal SDK
Tier 4: Claude Opus 4.1      → Aggregator (synthesis)
```

> **実装注記**: ドキュメント標準は Antigravity CLI（`agy`）。`wall-bounce-analyzer.ts` の spawn 先は legacy `gemini` のまま（移行予定）。→ [ANTIGRAVITY_CLI_MIGRATION.md](docs/ANTIGRAVITY_CLI_MIGRATION.md)

**Implementation**: `WallBounceAnalyzer.executeWallBounce()`
- `parallel` mode: Concurrent execution (default)
- `sequential` mode: Chain depth 3-5

📖 **Complete specification**: `docs/WALL_BOUNCE_SYSTEM.md`

---

## 🔒 Security Requirements

### LLM Provider Access
- ✅ **Allowed**: CLI spawn (agy/Antigravity, codex), Internal SDK (Anthropic)
- ❌ **Forbidden**: Direct API keys in code, environment variables

### Code Security
- **Input Sanitization**: All user input via `utils/security.ts`
- **Secure Spawn**: Arguments array, no shell meta-characters
- **MCP Approval**: Risk-based workflows in `mcp-approval-manager.ts`

### Infrastructure
- **Redis Required**: Session management, caching
- **HTTPS Only**: TLS certificates mandatory in production
- **Environment Isolation**: Systemd service with restricted permissions

📖 **Security guidelines**: `docs/SECURITY.md`

---

## 📁 Project Structure

### Core Source Files
```
src/
├── index.ts                              # Main Express server
├── config/
│   ├── environment.ts                    # Environment config
│   └── feature-flags.ts                  # Feature toggles
├── routes/
│   ├── wall-bounce-api.ts               # Wall-Bounce SSE endpoint ⭐
│   ├── rag-endpoint.ts                  # RAG queries
│   └── webhook-endpoints.ts             # Google Drive webhooks
├── services/
│   ├── wall-bounce-analyzer.ts          # Wall-Bounce core ⭐⭐⭐
│   ├── mcp-integration-service.ts       # MCP orchestrator ⭐
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

### Key Directories
- `scripts/` - Build, deployment, monitoring scripts
- `tests/` - Jest test suites (unit + integration)
- `docs/` - Comprehensive documentation
- `public/` - Frontend assets (thinking-toggle UI)

📖 **Architecture details**: `docs/ARCHITECTURE.md`

---

## 🔌 API Endpoints

### Wall-Bounce Analysis
```
POST /api/v1/wall-bounce/analyze        # SSE streaming (real-time)
POST /api/v1/wall-bounce/analyze-simple # JSON response (legacy)
```

### RAG System
```
POST /api/v1/rag/query                  # Document search
POST /api/v1/rag/embed                  # Generate embeddings
```

### Health & Monitoring
```
GET /health                             # Health check
GET /ping                               # Liveness probe
GET /metrics                            # Prometheus metrics
```

📖 **API reference**: `docs/API_REFERENCE.md`

---

## 🧪 Testing Strategy

### Test Organization
```bash
npm test                  # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm run test:coverage     # Coverage report (target: 100%)
npm run test:watch        # Watch mode
```

### Testing Requirements
- **Property-based**: Use `fast-check` for edge cases
- **Wall-Bounce**: 100% coverage mandatory for new components
- **Integration**: 5-minute timeout (long-running LLM calls)
- **Mocks**: Located in `src/services/__mocks__/`

📖 **Testing guide**: `docs/TESTING_GUIDE.md`

---

## 📚 Documentation Structure

### Essential Reading (Start Here)
1. **ARCHITECTURE.md** - System design and components
2. **WALL_BOUNCE_SYSTEM.md** - Wall-Bounce implementation
3. **SECURITY.md** - Security patterns and requirements
4. **DEVELOPMENT_GUIDE.md** - Development workflows

### Integration Guides
- `codex-mcp-implementation.md` - Codex MCP server setup
- `mcp-integration-guide.md` - MCP protocol patterns  
- `ANTIGRAVITY_CLI_MIGRATION.md` - Antigravity CLI（Tier 1 Google）移行方針
- `gemini-api-migration-guide.md` - Gemini API / Antigravity 関連（参照）
- `MCP_SERVICES.md` - MCP service architecture

### Operations & Deployment
- `DEPLOYMENT_GUIDE.md` - Production deployment steps
- `MONITORING_OPERATIONS.md` - Prometheus/Grafana monitoring
- `TESTING_GUIDE.md` - Comprehensive testing strategy

📖 **Full index**: `docs/DOCUMENTATION_INDEX.md`

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Node.js ≥18.0.0 | JavaScript execution |
| **Language** | TypeScript (ES2022) | Type-safe development |
| **Framework** | Express.js | HTTP server |
| **Database** | Redis | Session & cache |
| **Testing** | Jest + fast-check | Unit & property tests |
| **Monitoring** | Prometheus + Grafana | Metrics & dashboards |
| **Security** | Helmet + CORS | HTTP security |
| **Logging** | Winston | Structured logs |

---

## 🎯 MCP Services

### Integrated MCP Servers
1. **Serena MCP** - Semantic code navigation and symbol-based editing (ALWAYS USE)
2. **Cipher MCP** - Long-term memory and knowledge management
3. **Codex MCP** - GPT-5/GPT-5-Codex with approval workflows  
4. **Context7 MCP** - Real-time library documentation

### ⚡ MANDATORY: MCP Usage Rules

**Claude Code MUST follow these rules when working on this project:**

#### 0. 🔍 Code Navigation (Serena MCP) - PRIMARY TOOL
```
✅ ALWAYS use Serena MCP for all code operations
✅ Use Serena for:
   - Reading files (NOT Read tool)
   - Finding symbols/classes/methods
   - Searching code patterns
   - Symbol-based editing
   - Understanding code structure

Example:
# Find symbol
mcp__serena__find_symbol(name_path="WallBounceAnalyzer")

# Search pattern
mcp__serena__search_for_pattern(substring_pattern="executeWallBounce")

# Read file
mcp__serena__read_file(relative_path="src/services/wall-bounce-analyzer.ts")
```

#### 1. 🧠 Memory Management (Cipher MCP)
```
✅ ALWAYS use Cipher MCP to store new information
✅ Call ask_cipher after:
   - Learning new patterns or solutions
   - Discovering codebase insights
   - Completing major tasks
   - Encountering errors and fixes

Example:
"Store this Wall-Bounce optimization pattern in memory:
 When consensus < 0.6, automatically trigger provider escalation"
```

#### 2. 💻 Coding Consultation (Codex MCP)
```
✅ ALWAYS consult Codex before:
   - Writing new features
   - Refactoring existing code
   - Debugging complex issues
   - Architecture decisions

Example:
"Codex: Design a streaming SSE implementation for Wall-Bounce 
 that shows real-time LLM output to users"
```

#### 3. 📚 SDK/Library Reference (Context7 MCP)
```
✅ ALWAYS check Context7 before:
   - Using new libraries or SDKs
   - Implementing API integrations
   - Following framework best practices
   - Verifying syntax and patterns

Example:
"Context7: Get latest Express.js middleware patterns for SSE streaming"
```

### MCP Workflow Example

```typescript
// Step 1: Check documentation (Context7)
const expressDoc = await context7.getLibraryDocs('/expressjs/express', {
  topic: 'server-sent-events'
});

// Step 2: Consult Codex for implementation
const implementation = await codex({
  prompt: `Based on this Express SSE documentation: ${expressDoc}
           Implement real-time streaming for Wall-Bounce analysis`,
  model: 'gpt-5-codex'
});

// Step 3: Store solution (Cipher)
await cipher.askCipher({
  message: `Remember: SSE streaming for Wall-Bounce requires:
            1. Content-Type: text/event-stream
            2. res.flushHeaders() before streaming
            3. EventEmitter pattern for real-time events`
});
```

### MCP Protocol Files
- `src/services/mcp-integration-service.ts` - Central orchestrator
- `src/services/mcp-approval-manager.ts` - Risk-based approvals
- `src/services/mcp-config-manager.ts` - Tool optimization
- `src/services/codex-mcp-server.ts` - Codex integration

📖 **MCP details**: `docs/MCP_SERVICES.md`

---

## ⚡ Critical Development Notes

### Coding Practices
- **Never bypass Wall-Bounce** - All LLM calls via `wall-bounce-analyzer.ts`
- **No API keys** - CLI/SDK only (Antigravity `agy`, codex, Anthropic SDK)
- **Japanese responses** - Primary language for user-facing content
- **Test coverage** - 100% for Wall-Bounce components

### Common Tasks
| Task | File Location | Line Reference |
|------|---------------|----------------|
| Add new LLM provider | `src/services/wall-bounce-analyzer.ts` | `initializeProviders()` |
| Modify quality threshold | `src/services/wall-bounce-analyzer.ts` | `executeWallBounce()` |
| Add API endpoint | `src/routes/` | Create new route file |
| Update MCP approval | `src/services/mcp-approval-manager.ts` | `assessRisk()` |

### Environment Setup
```bash
# Required CLI tools
which agy             # Antigravity CLI (required)
which codex           # Codex CLI (required for GPT-5)

# Required services  
redis-cli ping        # Redis must be running

# Production service
sudo systemctl status techsapo
```

---

## 🚨 Emergency Procedures

### Rollback Scripts
```bash
./scripts/emergency-rollback-phase3.sh    # Emergency rollback
./scripts/monitor-srp-phase3.js          # SRP monitoring
```

### Health Checks
```bash
curl https://localhost:8443/health       # Application health
curl https://localhost:8443/metrics      # Prometheus metrics
```

📖 **Emergency procedures**: `docs/EMERGENCY_PROCEDURES.md`

---

**Production-ready AI orchestration platform with enterprise-grade monitoring, security, and multi-LLM coordination.**