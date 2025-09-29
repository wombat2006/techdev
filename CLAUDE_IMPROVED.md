# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 Core Principles

- **Japanese Response**: 基本的に日本語で応答
- **MCP Wall-Bounce**: Model Context Protocol経由での必須壁打ち分析
- **Quality Enhancement**: ユーザー入力を検証し、不足要素は追加ヒアリング
- **No Anthropic API**: Never use Anthropic API_KEY - use SDK instead for MAX x5 Plan cost avoidance

## 🛠️ Essential Commands

```bash
# Development
npm run dev              # Hot reload development with ts-node-dev
npm run build           # Build TypeScript to dist/
npm start               # Production server (requires build first)

# Testing
npm test                # All tests (Jest, 5min timeout)
npm run test:watch      # Watch mode testing
npm run test:coverage   # Coverage report with lcov/html
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
npm run lint            # ESLint check

# MCP Services
npm run cipher-mcp      # Cipher MCP memory service
npm run cipher-api      # Cipher API mode on port 3002
./scripts/start-monitoring.sh  # Full monitoring stack
```

## 🏗️ Core Architecture

### Entry Points
- **`src/server.ts`** - Main Express server (port 3000)
- **`src/wall-bounce-server.ts`** - Wall-bounce analysis server (port 4000)
- **`src/index.ts`** - Application bootstrap

### Primary Services
- **Wall-Bounce Analyzer** (`src/services/wall-bounce-analyzer.ts`) - Multi-LLM orchestration core
- **MCP Integration** (`src/services/mcp-*.ts`) - Model Context Protocol services
- **RAG System** (`src/services/googledrive-connector.ts`) - Google Drive knowledge retrieval
- **Redis Service** (`src/services/redis-service.ts`) - Caching and session management

### API Endpoints
- `POST /api/v1/generate` - Multi-LLM generation with wall-bounce
- `POST /api/v1/analyze-logs` - Log analysis with consensus
- `POST /api/v1/rag/search` - RAG search
- `GET /api/v1/health` - Service health check
- `GET /metrics` - Prometheus metrics

## ⚡ Critical Requirements

### LLM Provider Rules - 絶対的命令
- **OpenAI**: 必ずcodex経由で呼び出し（直接API使用禁止）
- **Anthropic**: Claude Code直接呼び出しのみ（API使用絶対禁止）
- **Google**: Gemini 2.5 Flash/Pro via official SDK
- **Wall-Bounce**: Minimum 2 providers, consensus required

### MCP Integration
- All services via Model Context Protocol v2025-03-26
- Context7 MCP mandatory for technical documentation
- Vault MCP for encrypted environment variables
- Quality thresholds: Confidence ≥ 0.7, Consensus ≥ 0.6

### Wall-Bounce Analysis Flow
1. Claude Code receives user query
2. Route to first LLM provider (prefer GPT-5 for coding tasks)
3. Validate with different provider (minimum 3 rounds, max 5)
4. Aggregate results with consensus scoring
5. Return integrated response with quality metrics

## 🧪 Testing Strategy

### Test Configuration
- **Framework**: Jest with 5-minute timeout
- **Coverage**: Comprehensive coverage expected
- **Property-based**: fast-check integration for systematic testing

### Key Test Commands
```bash
npm test                    # Full test suite
npm run test:coverage      # Generate coverage reports
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests including MCP services
```

### Task Completion Requirements
After ANY code changes, ALWAYS run in order:
1. `npm run lint` - Must pass without errors
2. `npm run build` - Verify TypeScript compilation
3. `npm test` - Full test suite must pass

## 🔒 Security & Environment

### Configuration
- **Environment config**: `src/config/environment.ts`
- **TypeScript**: ES2022, strict mode, CommonJS
- **Redis**: Required for caching and sessions
- **Vault MCP**: AES-256-GCM encrypted environment variables

### Security Rules
- Never commit API keys or secrets
- Use Vault MCP for sensitive configuration
- Implement proper input sanitization
- Validate all user inputs

## 📊 Monitoring & Operations

### Local Development
- **Application**: http://localhost:4000
- **Main server**: http://localhost:3000
- **Metrics**: http://localhost:4000/metrics

### Production Monitoring
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/techsapo2024!)
- **AlertManager**: http://localhost:9093

### Key Scripts
```bash
./scripts/start-monitoring.sh      # Full Prometheus/Grafana stack
./scripts/renew-certificates.sh    # SSL certificate renewal
./scripts/install-renewal-cron.sh  # Setup auto-renewal
```

## 📚 Documentation

Comprehensive documentation available in `/docs/`:
- [Development Guide](./docs/DEVELOPMENT_GUIDE.md) - Commands, architecture, testing
- [MCP Integration](./docs/MCP_INTEGRATION.md) - Model Context Protocol services
- [Wall-Bounce System](./docs/WALL_BOUNCE_SYSTEM.md) - Multi-LLM orchestration
- [OpenAI Node.js SDK](./docs/OPENAI_NODE_SDK.md) - OpenAI SDK fundamentals & best practices
- [Tiktoken Integration](./docs/TIKTOKEN_INTEGRATION.md) - Token counting & cost management
- [Monitoring Operations](./docs/MONITORING_OPERATIONS.md) - Prometheus/Grafana setup

## 🚨 Common Issues & Solutions

### Build Issues
- Ensure Node.js 18.0.0+ is installed
- Check TypeScript compilation: `npm run build`
- Verify all dependencies: `npm install`

### Test Failures
- Check Redis connection for integration tests
- Verify environment variables are set
- Run individual test suites to isolate issues

### MCP Service Issues
- Ensure Cipher MCP is running: `npm run cipher-mcp`
- Check service health endpoints
- Verify MCP protocol compliance

### Wall-Bounce Analysis Issues
- Validate API keys for all LLM providers
- Check consensus thresholds in configuration
- Monitor cost tracking and budget limits

## 💡 Development Tips

### Code Style
- Follow TypeScript strict mode
- Use ESLint configuration provided
- Implement comprehensive error handling
- Add Prometheus metrics for new features

### Performance
- Use Redis caching for frequently accessed data
- Implement proper async/await patterns
- Monitor memory usage and optimize
- Track performance with custom metrics

### Debugging
- Use Winston logging throughout
- Check application logs: `pm2 logs techsapo`
- Monitor system metrics in Grafana
- Use debug mode for detailed analysis