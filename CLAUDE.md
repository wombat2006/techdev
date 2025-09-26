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
npm test                # All tests (Jest, 120s timeout)
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

### Primary Services
- **Wall-Bounce Analyzer** (`src/services/wall-bounce-analyzer.ts`) - Multi-LLM orchestration
- **MCP Integration** (`src/services/mcp-*.ts`) - Model Context Protocol services
- **RAG System** (`src/services/googledrive-connector.ts`) - Google Drive knowledge retrieval

### API Endpoints
- `POST /api/v1/generate` - Multi-LLM generation with wall-bounce
- `POST /api/v1/analyze-logs` - Log analysis with consensus
- `POST /api/v1/rag/search` - RAG search
- `GET /api/v1/health` - Service health check

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

## 📚 Documentation

See detailed documentation in:
- [Development Guide](./docs/DEVELOPMENT_GUIDE.md) - Commands, architecture, testing
- [MCP Integration](./docs/MCP_INTEGRATION.md) - Model Context Protocol services
- [Wall-Bounce System](./docs/WALL_BOUNCE_SYSTEM.md) - Multi-LLM orchestration
- [OpenAI Node.js SDK](./docs/OPENAI_NODE_SDK.md) - OpenAI SDK fundamentals & best practices
- [Tiktoken Integration](./docs/TIKTOKEN_INTEGRATION.md) - Token counting & cost management
- [OpenAI Agents Basics](./docs/OPENAI_AGENTS_BASICS.md) - OpenAI Agents JS fundamentals
- [OpenAI Agents Integration](./docs/OPENAI_AGENTS_INTEGRATION.md) - Multi-agent workflows
- [OpenAI Cookbook Integration](./docs/OPENAI_COOKBOOK_INTEGRATION.md) - Advanced AI techniques
- [Monitoring Operations](./docs/MONITORING_OPERATIONS.md) - Prometheus/Grafana setup
- [API Reference](./docs/API_REFERENCE.md) - Endpoints and schemas
- [Testing Guide](./docs/TESTING_GUIDE.md) - Test strategy and implementation
- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md) - Production deployment

## 🔒 Security & Environment

- Environment config: `src/config/environment.ts`
- TypeScript: ES2022, strict mode, CommonJS
- Testing: Jest, 30s timeout, Node environment
- Redis required for caching and sessions