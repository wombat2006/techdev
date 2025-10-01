# TechSapo System Architecture

## Overview

TechSapo is a production-ready AI orchestration platform implementing a **Wall-Bounce Analysis System** that coordinates multiple LLM providers for high-quality technical analysis.

## Core Components

### 1. Primary Application (`src/index.ts`)

Express.js-based HTTPS server with:
- Security middleware (Helmet, CORS)
- API routing and request handling
- Health check endpoints
- Prometheus metrics integration

**Port**: 8443 (HTTPS) or configured via environment
**Protocol**: HTTPS with TLS certificates

### 2. Wall-Bounce Analysis System

Multi-LLM orchestration engine ensuring quality through provider diversity.

**Core File**: `src/services/wall-bounce-analyzer.ts`

**Key Components**:
- Provider registry and management
- Parallel/sequential execution modes
- Consensus calculation and quality thresholds
- Real-time SSE streaming for UI updates

**Provider Tiers**:
1. **Gemini 2.5 Pro** - CLI integration, no API keys
2. **GPT-5 Codex** - MCP/CLI integration via Codex MCP Server
3. **Claude Sonnet 4** - Internal SDK, cost-managed
4. **Claude Opus 4.1** - Aggregator role, synthesis

**Execution Modes**:
- `parallel`: Concurrent provider execution (default)
- `sequential`: Wall-bounce chain with configurable depth (3-5)

### 3. MCP Services Architecture

Model Context Protocol integration for standardized LLM interactions.

**Core MCP Services**:
- `mcp-integration-service.ts` - Central orchestration
- `mcp-approval-manager.ts` - Risk-based approval workflows
- `mcp-config-manager.ts` - Tool optimization and cost estimation
- `codex-mcp-server.ts` - GPT-5/Codex integration
- `wall-bounce-adapter.ts` - MCP ↔ Wall-Bounce bridge

**MCP Protocol**: Uses `@modelcontextprotocol/sdk` for standardized tool/resource access

### 4. RAG System

Google Drive integration for document retrieval and embedding.

**Core File**: `src/services/googledrive-connector.ts`

**Features**:
- Document search and indexing
- Embedding generation
- Vector mapping for semantic search
- Webhook support for real-time updates

## Directory Structure

```
src/
├── config/              # Environment & feature flags
├── controllers/         # Request handlers
├── middleware/          # Express middleware
│   ├── auth             # Authentication
│   ├── validation       # Input validation
│   └── error-handler    # Centralized error handling
├── metrics/             # Prometheus metrics
├── routes/              # API route definitions
│   ├── wall-bounce-api.ts    # Wall-Bounce SSE endpoint
│   ├── huggingface-routes.ts # HuggingFace integration
│   ├── rag-endpoint.ts       # RAG queries
│   └── webhook-endpoints.ts  # Webhook handlers
├── services/            # Core business logic
│   ├── wall-bounce-*.ts      # Wall-Bounce system
│   ├── mcp-*.ts              # MCP services
│   ├── codex-*.ts            # Codex integration
│   ├── googledrive-*.ts      # RAG/Drive services
│   └── __mocks__/            # Test mocks
├── types/               # TypeScript definitions
├── utils/               # Utilities and logger
└── data/                # Static data

scripts/                 # Build & deployment scripts
tests/                   # Test suites
docs/                    # Documentation
public/                  # Frontend assets
```

## Data Flow

### Wall-Bounce Analysis Request Flow

```
User Request (UI)
    ↓
POST /api/v1/wall-bounce/analyze (SSE)
    ↓
WallBounceAnalyzer.executeWallBounce()
    ↓
Parallel/Sequential Provider Invocation
    ├─→ invokeGemini() [CLI spawn]
    ├─→ invokeGPT5() [Codex MCP/CLI spawn]
    └─→ invokeClaude() [Internal SDK]
    ↓
Real-time SSE Events:
    - provider:start
    - provider:streaming (stdout chunks)
    - provider:complete
    - consensus updates
    ↓
Aggregation (Claude Opus 4.1)
    ↓
Final Response + Consensus Score
    ↓
SSE Complete Event
```

### MCP Integration Flow

```
Wall-Bounce Request
    ↓
MCP Integration Service
    ↓
Approval Manager (risk assessment)
    ↓ [approved]
Config Manager (tool optimization)
    ↓
Codex MCP Server
    ↓
spawn('codex', [...args])
    ↓
GPT-5/GPT-5-Codex Response
    ↓
Session Management (Redis)
    ↓
Response to Wall-Bounce
```

## Technology Stack

### Runtime & Language
- **Node.js**: ≥18.0.0
- **TypeScript**: ES2022 target, CommonJS modules
- **Build**: `tsc` with source maps

### Framework & Libraries
- **Express.js**: HTTP server with middleware
- **Helmet**: Security headers
- **CORS**: Cross-origin configuration
- **Prometheus**: Metrics collection
- **Winston**: Structured logging

### Data Layer
- **Redis**: Session management, caching
- **Vector Storage**: For RAG embeddings (future)

### LLM Integration
- **CLI Tools**: `gemini`, `codex` command-line interfaces
- **SDK**: Anthropic SDK for internal calls
- **MCP**: `@modelcontextprotocol/sdk`

### Testing
- **Jest**: Test runner with 5-minute timeout
- **fast-check**: Property-based testing
- **Coverage**: 100% target for Wall-Bounce components

### Monitoring
- **Prometheus**: Metrics scraping
- **Grafana**: Dashboards and visualization
- **AlertManager**: Threshold-based alerts

## Security Architecture

### Authentication & Authorization
- Input validation middleware
- Request sanitization
- MCP approval workflows for tool execution

### LLM Provider Security
- **No API keys in code**: CLI/SDK patterns only
- **Secure spawn**: Sanitized arguments, timeout controls
- **Shell injection prevention**: No shell meta-characters in user input

### Network Security
- HTTPS only (TLS certificates required)
- CORS configured per environment
- Helmet security headers

## Scalability Considerations

### Current Design
- Single Node.js process
- Redis for state management
- Nginx reverse proxy for SSL termination

### Future Scaling Options
- Horizontal scaling with load balancer
- Redis clustering for distributed sessions
- MCP service separation into microservices
- Vector database for RAG (Pinecone/Weaviate)

## Configuration Management

### Environment Variables
- `NODE_ENV`: production/development
- `PORT`: Application port (default 4000)
- `REDIS_URL`: Redis connection string
- Provider-specific config via MCP TOML files

### Feature Flags
Located in `src/config/feature-flags.ts`:
- Wall-Bounce timeout controls
- Provider enable/disable
- MCP approval policies

## API Endpoints

### Wall-Bounce
- `POST /api/v1/wall-bounce/analyze` - SSE streaming endpoint
- `POST /api/v1/wall-bounce/analyze-simple` - Simple JSON response

### RAG
- `POST /api/v1/rag/query` - Document search
- `POST /api/v1/rag/embed` - Embedding generation

### Health & Monitoring
- `GET /health` - Health check
- `GET /ping` - Liveness probe
- `GET /metrics` - Prometheus metrics

### Webhooks
- `POST /api/v1/webhooks/*` - Google Drive webhooks
- `POST /api/v1/webhook-setup/*` - Webhook configuration

## Related Documentation

- **WALL_BOUNCE_SYSTEM.md** - Wall-Bounce implementation details
- **MCP_SERVICES.md** - MCP service architecture
- **DEVELOPMENT_GUIDE.md** - Development workflows
- **SECURITY.md** - Security guidelines
- **DEPLOYMENT_GUIDE.md** - Production deployment
