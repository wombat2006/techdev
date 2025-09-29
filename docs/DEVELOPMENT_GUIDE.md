# TechSapo Development Guide

## 🛠️ Development Commands

### Build and Development
```bash
npm run dev          # Development with hot reload
npm run build        # Build TypeScript to JavaScript
npm start            # Start production server
./scripts/start-monitoring.sh  # Start with full monitoring stack
```

### Testing
```bash
npm test             # Run all tests
npm run test:coverage  # Run tests with coverage
npm run test:unit    # Unit tests only
npm run test:integration  # Integration tests only
npm run test:watch   # Watch mode for development
```

### Code Quality
```bash
npm run lint         # Lint TypeScript files (ESLint on src/**/*.ts)
```

### MCP Services
```bash
npm run cipher-mcp   # Start Cipher MCP (memory/learning)
npm run cipher-api   # Start Cipher API mode
```

## 🏗️ Architecture Details

### Server Structure
- **Primary Server** (`src/index.ts`): Main TechSapo application with full middleware stack
- **Wall-Bounce Server** (`src/server.ts`): Specialized server for real-time analysis and metrics
- **Dual Server Design**: Two distinct Express applications with different purposes

### Key Services

#### Wall-Bounce Analyzer (`src/services/wall-bounce-analyzer.ts`)
- **Multi-LLM Orchestration**: Coordinates multiple AI providers for consensus
- **Quality Assurance**: Confidence scoring and consensus validation
- **Provider Support**: OpenAI GPT-5, Google Gemini, OpenRouter (NO Anthropic API_KEY)
- **Task Types**: basic, premium, critical with different provider configurations
- **Agent Framework**: Optional integration with `@openai/agents` for multi-agent workflows

#### MCP Integration Services
- **MCPConfigManager** (`src/services/mcp-config-manager.ts`): Cost optimization and tool selection
- **MCPApprovalManager** (`src/services/mcp-approval-manager.ts`): Multi-layer approval workflows
- **MCPIntegrationService** (`src/services/mcp-integration-service.ts`): Unified MCP execution orchestration

#### RAG System (`src/services/googledrive-connector.ts`)
- **Google Drive Integration**: Automated document indexing and search
- **Embedding Service**: Text embeddings for semantic search
- **Vector Storage**: OpenAI vector stores for RAG operations

## 📊 API Endpoints

### Core Application (port from config)
- `POST /api/v1/generate` - Multi-LLM text generation with wall-bounce
- `POST /api/v1/analyze-logs` - Log analysis with multi-LLM consensus
- `GET /api/v1/health` - Health check with Redis/session status
- `POST /api/v1/rag/search` - RAG search against Google Drive documents

### Monitoring & Metrics
- `GET /api/v1/metrics/stream` - Server-Sent Events real-time metrics
- `GET /metrics` - Prometheus metrics endpoint
- Grafana Dashboard: `http://localhost:3000` (admin/techsapo2024!)

## 🔧 Configuration

### Environment Variables
Key variables defined in `src/config/environment.ts`:
- **OpenAI**: API key for GPT-5 ONLY (GPT-4/GPT-4o prohibited per project rules)
- **Google**: Gemini API and Google Drive OAuth credentials
- **Anthropic**: Use SDK only, NO API_KEY for MAX x5 Plan cost avoidance
- **Redis**: Connection settings for caching
- **MCP Settings**: Budget tiers, security levels, tool configurations

### TypeScript Configuration
- **Target**: ES2022 with CommonJS modules
- **Output**: `./dist/` directory
- **Source Maps**: Enabled for debugging
- **Strict Mode**: Full TypeScript strictness enabled

### Testing Setup
- **Framework**: Jest with ts-jest transformer
- **Environment**: Node.js test environment
- **Coverage**: Collected from `src/**/*.ts` (excluding .d.ts and index.ts)
- **Timeout**: 30 seconds for long-running integration tests
- **Setup**: `tests/setup.ts` for test configuration

## 🎯 Development Guidelines

### MCP Wall-Bounce Requirements
- **Mandatory Multi-LLM**: All analysis must use 2+ LLM providers via Wall-Bounce
- **Quality Thresholds**: Confidence ≥ 0.7, Consensus ≥ 0.6 or auto-escalation
- **Japanese Responses**: Primary language for user-facing content
- **Context7 Integration**: Use Context7 MCP for technical documentation references

### Code Patterns
- **Error Handling**: Comprehensive try-catch with structured logging (`src/utils/logger.ts`)
- **Redis Integration**: All caching through `src/services/redis-service.ts`
- **Session Management**: User session tracking via `src/services/session-manager.ts`
- **Security**: Input validation, authentication middleware, CORS configuration

### Service Dependencies
- **Node.js**: ≥18.0.0 required
- **Redis**: Required for caching and session management
- **Database**: MySQL2 for audit logs and monitoring data
- **Monitoring**: Prometheus + Grafana stack in Docker containers

## 📁 Project Structure

```
src/
├── config/           # Environment and configuration
├── controllers/      # Request handlers
├── middleware/       # Express middleware (auth, validation, error handling)
├── metrics/         # Prometheus metrics collection
├── routes/          # API route definitions
├── services/        # Core business logic
│   ├── wall-bounce-analyzer.ts    # Multi-LLM orchestration
│   ├── mcp-*.ts                   # MCP protocol services
│   ├── googledrive-connector.ts   # RAG system
│   └── __mocks__/                 # Test mocks
├── types/           # TypeScript type definitions
├── utils/           # Utility functions and helpers
└── data/            # Static data and configuration

docker/              # Container configurations
scripts/            # Deployment and utility scripts
tests/              # Test files (unit and integration)
public/             # Static web assets for monitoring UI
```

## 💡 Key Implementation Notes

### Wall-Bounce Analysis Pattern
All user queries must flow through the wall-bounce system:
1. Query reception (Claude Code as orchestrator)
2. Multi-LLM provider selection based on task complexity
3. Parallel analysis execution with different providers
4. Consensus validation and quality scoring
5. Integrated response with confidence metrics

### MCP Service Integration
- Services communicate via Model Context Protocol v2025-03-26
- Automatic tool selection based on task type and budget constraints
- Multi-layer approval workflows for sensitive operations
- Real-time cost tracking and budget management

### Performance Considerations
- Redis caching for frequent operations
- Concurrent processing of LLM requests
- Server-Sent Events for real-time monitoring
- Prometheus metrics with automatic alerting