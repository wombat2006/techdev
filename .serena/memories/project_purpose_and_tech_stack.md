# Project Purpose and Tech Stack

## Project Purpose
TechSapo is an enhanced Model Context Protocol (MCP) orchestration platform with wall-bounce analysis system. It's an enterprise-grade IT infrastructure support tool that provides:

- **Multi-LLM orchestration** using "wall-bounce" analysis (minimum 2 LLM providers required for consensus)
- **MCP integration** for standardized communication with various AI services
- **RAG system** with Google Drive integration for knowledge retrieval
- **Environment variable encryption** using Vault MCP with AES-256-GCM
- **Comprehensive monitoring** with Prometheus/Grafana integration
- **Cost optimization** with $70/month budget tracking

## Core Tech Stack

### Runtime & Language
- **Node.js**: 18.0.0+
- **TypeScript**: ES2022, strict mode, CommonJS modules
- **Build**: tsc compiler with source maps

### Key Dependencies
- **Express.js**: Web server framework
- **OpenAI SDK**: GPT model integration (via Codex only)
- **Google Generative AI**: Gemini 2.5 Flash/Pro integration
- **Anthropic SDK**: Claude integration (direct SDK only, no API)
- **MCP SDK**: Model Context Protocol v2025-03-26
- **Redis**: Caching and session management (Upstash/ioredis)
- **Winston**: Logging framework
- **Prometheus Client**: Metrics collection

### Testing & Quality
- **Jest**: Testing framework with 5-minute timeout
- **Property-based testing**: fast-check integration
- **ESLint**: Code linting
- **Coverage**: lcov/html reports

### Infrastructure
- **Docker**: Full containerization support
- **PM2**: Process management
- **Nginx**: Reverse proxy and SSL termination
- **Prometheus/Grafana**: Monitoring stack