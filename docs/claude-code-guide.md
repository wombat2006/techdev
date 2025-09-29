# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build and Development
```bash
npm run build        # Build TypeScript to dist/
npm run dev          # Development with hot reload (ts-node-dev)
npm start            # Start production server
npm run lint         # ESLint on src/**/*.ts
```

### Testing
```bash
npm test             # Run all tests (Jest)
npm run test:coverage   # Run tests with coverage
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
npm run test:watch      # Watch mode for development
```

### MCP Services
```bash
npm run cipher-mcp   # Start Cipher MCP (memory/learning)
npm run cipher-api   # Start Cipher API mode on port 3002
```

### Monitoring Stack
```bash
./scripts/start-monitoring.sh  # Start full monitoring stack
```

## Project Architecture

This is TechSapo - an Infrastructure Support Tool with LLM Orchestrator that implements a **Wall-Bounce Analysis System** requiring multiple LLM coordination.

### Core Architecture Components

**Primary Application** (`src/index.ts`): Main TechSapo server with Express.js, security middleware, and API routing

**Wall-Bounce System**: Multi-LLM orchestration system located in:
- `src/services/wall-bounce-analyzer.ts` - Core analysis engine
- `src/services/mcp-*.ts` - MCP protocol services

**MCP Integration**: Model Context Protocol services providing standardized framework for LLM context and functionality. The system uses `@modelcontextprotocol/sdk` to create secure, standardized data exposure and tool orchestration with enterprise-grade governance.

**RAG System**: Google Drive integration via `src/services/googledrive-connector.ts` for document search and embedding

### Directory Structure
```
src/
├── config/           # Environment configuration & feature flags
├── controllers/      # Request handlers (HuggingFace, etc.)
├── middleware/       # Express middleware (auth, validation, error handling)
├── metrics/         # Prometheus metrics collection
├── routes/          # API route definitions
├── services/        # Core business logic
│   ├── wall-bounce-*.ts           # Multi-LLM orchestration system
│   ├── mcp-*.ts                   # MCP protocol services
│   ├── codex-*.ts                 # Codex integration services
│   ├── googledrive-connector.ts   # RAG system (if present)
│   └── __mocks__/                 # Test mocks
├── types/           # TypeScript type definitions
├── utils/           # Utility functions and logger
└── data/            # Static data and configuration
scripts/             # Build and deployment scripts
tests/               # Test suites (unit, integration)
docs/                # Project documentation
```

## Critical Project Rules

### Wall-Bounce Analysis Requirements
- **MANDATORY**: All analysis tasks MUST use 2+ LLM providers via Wall-Bounce system
- **Quality Thresholds**: Confidence ≥ 0.7, Consensus ≥ 0.6 or auto-escalation
- **Japanese Responses**: Primary language for user-facing content
- **Provider Architecture**:
  - **Tier 1**: Gemini 2.5 Pro (CLI required, no API key)
  - **Tier 2**: GPT-5 Codex + GPT-5 General (CLI required via Codex MCP)
  - **Tier 3**: Anthropic Sonnet 4 (internal calls only, no API)
  - **Tier 4**: Anthropic Opus 4.1 (internal calls only, aggregator role)
- **Execution Modes**:
  - `parallel`: Concurrent provider execution (default)
  - `sequential`: Wall-bounce chain with depth 3-5

### Task Types and MCP Integration
- **basic**: 2 providers minimum, auto-approval for low-risk operations
- **premium**: 4 providers with approval workflow integration
- **critical**: All available providers with manual approval requirements

### MCP Service Architecture
- **Approval Manager** (`mcp-approval-manager.ts`): Enterprise approval workflow with auto/manual approval logic
- **Config Manager** (`mcp-config-manager.ts`): Tool optimization and cost estimation
- **Integration Service** (`mcp-integration-service.ts`): Central orchestration with security governance
- **Wall-Bounce Adapter** (`wall-bounce-adapter.ts`): Integration between MCP and Wall-Bounce systems

### Environment & Configuration
- Node.js ≥18.0.0 required
- TypeScript configuration: ES2022 target, CommonJS modules
- Redis required for caching and session management
- CLI Requirements: `gemini` CLI must be installed for Gemini 2.5 Pro access
- MCP Dependencies: `@modelcontextprotocol/sdk` for protocol integration
- Security: All provider communications use secure spawn/CLI patterns
- Test environment: Jest with 5-minute timeout for integration tests

### Provider Security Restrictions
- **OpenAI/Google**: CLI access only (no direct API keys in environment)
- **Anthropic**: Internal SDK calls only (cost management via Claude Code)
- **Shell Security**: Sanitized input with secure spawn patterns to prevent injection
- **MCP Protocol**: Approval workflows prevent unauthorized tool execution

### API Endpoints Structure
- Main application runs on configured port (from environment, default 4000)
- HuggingFace endpoints: `/api/v1/huggingface/*`, `/api/huggingface/*`, and root level routes
- RAG endpoints: `/api/v1/rag/*`
- Webhook endpoints: `/api/v1/webhooks/*`, `/api/v1/webhook-setup/*`
- Health checks: `/ping`, `/health`, `/api/v1/health`
- Documentation: `/api/docs`
- Metrics: `/metrics` (Prometheus)

### Security & Dependencies
- Express.js with Helmet security middleware
- CORS configured for development and production
- Input validation and authentication middleware
- Comprehensive error handling with structured logging
- OpenAI API for GPT-5, Google APIs for Gemini and Drive, Anthropic SDK

### Testing Requirements
- 100% test coverage target
- Property-based testing with fast-check
- Comprehensive integration tests
- Mock services in `src/services/__mocks__/`

This codebase implements a production-ready AI orchestration platform with enterprise-grade monitoring, security, and multi-LLM coordination capabilities.

## GPT-5 Optimization Features

### Advanced GPT-5 Integration
- **Reasoning Effort Control**: Adaptive reasoning levels (minimal/medium/high) based on task complexity
- **Verbosity Management**: Dynamic output control for consistent response length
- **Meta-Prompting**: Self-optimizing prompt system using Claude Opus 4.1 for continuous improvement
- **Responses API**: Persistent reasoning across tool calls for enhanced coordination
- **Constraint-Driven Prompts**: Precise, unambiguous instructions following OpenAI cookbook best practices

### GPT-5 Parameter Mapping
- **Basic Tasks**: minimal reasoning, low verbosity for fast responses
- **Premium Tasks**: medium reasoning, medium verbosity for balanced analysis
- **Critical Tasks**: high reasoning, high verbosity for comprehensive evaluation

## Development Scripts & Utilities

### Key Scripts in `/scripts/`
```bash
./scripts/start-monitoring.sh              # Complete monitoring stack startup
./scripts/comprehensive-rag-test.sh        # Full RAG system testing
./scripts/production-monitoring.js         # Production health monitoring
./scripts/resync-drive-docs.ts            # Google Drive document synchronization
./scripts/validate-srp-integration.js     # SRP (Self-Reflection Prompting) validation
```

### PDF Generation
```bash
node scripts/generate-pdf.js              # Basic PDF generation
node scripts/generate-pdf-puppeteer.js    # Advanced PDF with Puppeteer
node scripts/modern-pdf-generator.js      # Modern PDF with styling
```

### Emergency & Monitoring Scripts
```bash
./scripts/emergency-rollback-phase3.sh    # Emergency system rollback
./scripts/monitor-srp-phase3.js          # SRP monitoring in Phase 3
./scripts/gradual-phase3-controller.js   # Gradual Phase 3 deployment
```

## Special TypeScript Configuration

### TypeScript Settings
- **Target**: ES2022 with CommonJS modules for Node.js compatibility
- **Strict Mode**: Disabled (`strict: false`) for flexible development
- **Source Maps**: Enabled for debugging
- **Experimental Decorators**: Enabled for advanced metadata features
- **5-minute Jest timeout**: Configured for long-running integration tests

### Key File Extensions & Patterns
- All source files in `src/` with `.ts` extension
- Test files: `**/*.test.ts` and `**/*.spec.ts`
- Mock services: `src/services/__mocks__/`
- Type definitions: `src/types/`

## Critical Development Notes

### Testing Strategy
- **Property-based testing** with `fast-check` for comprehensive coverage
- **100% coverage target** with exclusions for entry points and type definitions
- **Integration tests** require full Redis and external service mocking
- **Jest custom transformer** (jest.transformer.cjs) for TypeScript compilation

### Security & Environment
- **No direct API keys in code**: All provider access via CLI or internal SDK calls
- **Secure spawn patterns**: Shell injection prevention in all provider communications
- **Redis caching**: Required for session management and performance
- **MCP protocol**: All tool execution goes through approval workflows

### Wall-Bounce Analysis Requirements
When implementing or modifying Wall-Bounce features:
1. **Minimum 2 LLM providers** required for any analysis
2. **Quality thresholds**: Confidence ≥ 0.7, Consensus ≥ 0.6
3. **Japanese primary language** for user-facing responses
4. **Provider-specific guidance** defined in `wall-bounce-analyzer.ts:12-41`
5. **Aggregator instructions** for result synthesis in `wall-bounce-analyzer.ts:43-47`