# Code Architecture and Structure

## High-Level Architecture

### Core Application Files
- **`src/server.ts`**: Main Express server with health checks and metrics
- **`src/wall-bounce-server.ts`**: Wall-bounce analysis server (port 4000)
- **`src/index.ts`**: Application entry point

### Primary Services (`src/services/`)
- **`wall-bounce-analyzer.ts`**: Multi-LLM orchestration engine - THE CORE SERVICE
- **`mcp-*.ts`**: Model Context Protocol service integrations
- **`googledrive-connector.ts`**: RAG system with Google Drive integration
- **`redis-service.ts`**: Redis caching and session management
- **`inference-service.ts`**: LLM provider abstraction layer

### API Layer (`src/routes/`)
- **REST endpoints**: `/api/v1/generate`, `/api/v1/analyze-logs`, `/api/v1/rag/search`
- **Health checks**: `/api/v1/health`
- **MCP endpoints**: Model Context Protocol communication

### Configuration (`src/config/`)
- **`environment.ts`**: Environment variable management and validation

### Critical LLM Provider Rules
1. **OpenAI**: MUST use Codex integration only (direct API forbidden)
2. **Anthropic**: Claude Code direct calls only (API usage absolutely prohibited)
3. **Google**: Gemini 2.5 Flash/Pro via official SDK
4. **Wall-Bounce**: Minimum 2 providers required for consensus

## Wall-Bounce Analysis Flow
1. User query received
2. Claude Code analyzes and routes to LLM provider
3. Response sent to different LLM provider for validation
4. Minimum 3 rounds of analysis (max 5)
5. Consensus scoring and quality thresholds (≥0.7 confidence, ≥0.6 consensus)
6. Final integrated response

## MCP Integration Architecture
- **Vault MCP**: AES-256-GCM encrypted environment variables
- **Context7 MCP**: Real-time library documentation
- **Stash MCP**: Semantic code search
- **OpenRouter MCP**: 200+ model gateway
- **Cipher MCP**: Advanced cryptography services
- **Monitoring MCP**: System metrics collection

## Testing Strategy
- **Property-based testing**: Using fast-check for systematic validation
- **Jest framework**: 5-minute timeout for complex operations
- **Coverage requirements**: Comprehensive test coverage expected
- **Integration tests**: Full MCP service testing