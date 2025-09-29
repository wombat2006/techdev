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
npm run codex-mcp    # Start Codex MCP Server (OpenAI Codex integration)
npm run codex-mcp-stop    # Stop Codex MCP Server
npm run codex-mcp-restart # Restart Codex MCP Server
npm run codex-mcp-test    # Test Codex MCP setup without starting
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
- `src/services/codex-mcp-server.ts` - OpenAI Codex MCP integration
- `src/services/codex-mcp-integration.ts` - Codex Wall-Bounce adapter

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
  - **Tier 2**: OpenAI Codex via MCP Server (`codex-mcp-server.ts`) - GPT-5/GPT-5-Codex access
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

## Codex MCP Integration

### OpenAI Codex MCP Server
The project includes a comprehensive MCP (Model Context Protocol) server for OpenAI Codex integration:

**Core Components**:
- `src/services/codex-mcp-server.ts` - Full MCP server implementation
- `src/services/codex-mcp-integration.ts` - Wall-Bounce integration adapter
- `config/codex-mcp.toml` - TOML configuration file
- `scripts/start-codex-mcp.sh` - Startup and management script

**MCP Tools Available**:
- `codex` - Start new conversation with GPT-5/GPT-5-Codex
- `codex-reply` - Continue existing conversation
- `codex-session-info` - Get session information and statistics
- `codex-cleanup` - Cleanup expired sessions

**Execution Modes**:
- **Interactive**: Full TUI integration with session management
- **Non-interactive/CI**: Headless execution for automation (`--full-auto`)
- **MCP Protocol**: Standardized tool and resource access

**Configuration Requirements**:
- Codex CLI must be installed: `npm install -g @openai/codex` or `brew install codex`
- Authentication via ChatGPT account (recommended) or API key
- Redis required for session persistence and management
- Configuration file: `config/codex-mcp.toml`

**Wall-Bounce Integration**:
- Automatic integration with TechSapo Wall-Bounce Analysis System
- Multi-LLM coordination with quality thresholds
- Enterprise approval workflows with risk-based policies
- Cost tracking and performance metrics
- Session management with Redis persistence

**Security Features**:
- Risk-based approval workflows (low/medium/high/critical)
- Sandbox execution levels (read-only/isolated/full-access)
- Audit logging and compliance tracking
- Secure process management with timeout controls

## Context7 MCP Integration

### Library Documentation Services
The project integrates Context7 MCP for real-time library documentation access:

**Context7 Tools**:
- `resolve-library-id` - Convert package names to Context7-compatible library IDs
- `get-library-docs` - Fetch up-to-date documentation for libraries

**Usage Pattern**:
```typescript
// Always resolve library ID first unless user provides exact ID
const libraryId = await context7.resolveLibraryId('express');
const docs = await context7.getLibraryDocs(libraryId, { topic: 'middleware' });
```

**Integration Strategy**: Context7 provides the foundational documentation layer for Wall-Bounce analysis, ensuring responses are grounded in current, accurate library documentation.

## Comprehensive Documentation Library

The project maintains extensive documentation in `/docs/` including:

### Core Integration Guides
- `openai-agents-js-analysis.md` - OpenAI Agents framework integration patterns
- `openai-agents-js-streaming-mcp-analysis.md` - Streaming and MCP capabilities
- `gemini-api-migration-guide.md` - Gemini API modernization strategy
- `gemini-api-models-troubleshooting.md` - Model selection and error handling
- `claude-opus-sonnet-analysis.md` - Anthropic model optimization strategies
- `codex-mcp-implementation.md` - Complete Codex MCP server documentation

### MCP Protocol Documentation
- `mcp-prompts-specification.md` - MCP Prompts primitive specification
- `mcp-resources-specification.md` - MCP Resources primitive specification
- `mcp-integration-guide.md` - Comprehensive MCP integration patterns

### Architecture and Operations
- `WALL_BOUNCE_SYSTEM.md` - Wall-Bounce Analysis System design
- `MONITORING_OPERATIONS.md` - Production monitoring and alerting
- `TESTING_GUIDE.md` - Comprehensive testing strategy
- `DEPLOYMENT_GUIDE.md` - Production deployment procedures

## Enhanced Wall-Bounce Analysis Requirements

### Multi-Vendor LLM Routing Strategy
Based on `/ai/prj/CLAUDE.md` absolute principles:

1. **Mandatory Wall-Bounce**: Minimum 2+ LLM models required for any user query resolution
2. **Claude Code as Orchestrator**: Primary coordination responsibility with other LLMs as execution agents
3. **Minimum 3 Wall-Bounce Rounds**: Progressive analysis with vendor diversity requirements
4. **Vendor Rotation Requirement**: Second round must use different vendor from initial query
5. **Maximum 5 Wall-Bounce Rounds**: Upper limit to prevent excessive processing

### Provider Selection Strategy
For coding tasks, prioritize this routing hierarchy:
1. **GPT-5** (via Codex MCP) - Primary for technical analysis
2. **Qwen3 Coder** (if available) - Equal weight with GPT-5 for coding tasks
3. **Claude Sonnet 4** - Secondary analysis and synthesis
4. **Gemini 2.5 Pro** - Tertiary verification and consensus building

### Implementation Requirements
- All Wall-Bounce coordination must route through `wall-bounce-analyzer.ts`
- Provider responses require synthesis by Claude Code for final user presentation
- Insufficient user context triggers clarification requests before Wall-Bounce execution
- Integration with MCP approval workflows for risk-based execution control

## Recent Architectural Enhancements

### Advanced MCP Services Architecture
The system now includes sophisticated MCP service orchestration:

**Core MCP Services**:
- `codex-mcp-server.ts` - OpenAI Codex/GPT-5 integration with enterprise approval workflows
- `mcp-approval-manager.ts` - Risk-based approval system with automated policy enforcement
- `mcp-config-manager.ts` - Dynamic configuration and cost optimization
- `mcp-integration-service.ts` - Central MCP orchestration with security governance

**Enhanced Session Management**:
- Redis-based session persistence for MCP operations
- Session timeout controls and cleanup automation
- Multi-LLM session coordination with state management
- Audit logging for compliance and security tracking

### Production-Ready Monitoring Stack
- **Prometheus Integration**: Custom metrics for Wall-Bounce analysis quality
- **Grafana Dashboards**: Real-time monitoring of consensus scores and provider performance
- **AlertManager**: Automated alerts for quality threshold violations
- **Cost Tracking**: Real-time cost monitoring with $70/month budget management

## Critical Development Practices

### Test Coverage and Quality Assurance
- **Property-Based Testing**: Extensive use of `fast-check` for comprehensive edge case coverage
- **100% Coverage Target**: All new Wall-Bounce components require complete test coverage
- **Integration Testing**: Full MCP service stack testing with 5-minute Jest timeout
- **Security Testing**: ReDOS, injection prevention, and authorization testing

### Code Quality Standards
- **TypeScript Strict Mode Disabled**: Allows flexible development while maintaining type safety where needed
- **ES2022 Target**: Modern JavaScript features with Node.js 18+ compatibility
- **CommonJS Modules**: Ensures compatibility with existing Node.js ecosystem
- **Experimental Decorators**: Enabled for advanced metadata and dependency injection patterns

## Emergency Procedures and Rollback

### Emergency Scripts
- `./scripts/emergency-rollback-phase3.sh` - Emergency system rollback procedures
- `./scripts/monitor-srp-phase3.js` - Self-Reflection Prompting monitoring
- `./scripts/gradual-phase3-controller.js` - Controlled deployment management

### Monitoring and Health Checks
- Health endpoints at `/ping`, `/health`, `/api/v1/health`
- Prometheus metrics at `/metrics`
- Real-time Wall-Bounce quality monitoring
- Automated provider failover and escalation procedures

This codebase represents a production-ready, enterprise-grade AI orchestration platform with comprehensive Wall-Bounce analysis capabilities, advanced MCP integration, and robust monitoring infrastructure.