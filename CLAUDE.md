# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 絶対的原則 (Absolute Principles)

### Wall-Bounce Mandatory
- **物事の解決には2以上のLLMモデルとの壁打ち必須** (Min 2 LLMs required)
- Min 3 rounds, max 6 rounds
- Different vendor each round (GPT-5 → Sonnet4 → Gemini-2.5Pro pattern)
- **Always use Cipher for long-term memory**

### Wall-Bounce Response Flow
1. Claude Code receives user query
2. Interpret intent and route to GPT-5/Qwen3 with added context
3. Take GPT-5 response → Route to different vendor (Sonnet4)
4. Take Sonnet4 response → Route to different vendor (Gemini-2.5Pro)
5. Synthesize all responses and provide comprehensive answer
6. Max 6 rounds, min 3 rounds

### Coding Tasks
- **GPT-5 Codex**: Priority for coding (via `codex exec --model gpt-5-codex`)
  - **Key Principle**: "Less is more" - Be specific but concise
  - No verbose instructions needed - built-in coding intelligence
  - See [GPT-5 Codex Best Practices](./docs/LLM_PROVIDERS_GUIDE.md#gpt-5-codex-prompting-best-practices)
- **Qwen3-Coder**: 50/50 split with GPT-5 Codex when available (OpenRouter API)
- Claude Code synthesizes best responses from both
- Ask for clarification when requirements are unclear

### Code Quality
- **Max ~500 lines per file** (Single Responsibility Principle)
- TypeScript: `strict: false`, `target: ES2022`, `module: commonjs`

## 🛠️ Essential Commands

```bash
# Development
npm run dev              # Hot reload (port 5000 dev, 4000 default)
npm run build           # Compile TypeScript → dist/
npm start               # Production (port 8443)

# Testing
npm test                           # All tests (10min timeout)
npm run test:unit                  # Unit tests only
npm run test:integration           # Integration tests only
npm test -- tests/path/to/file.ts  # Single test file

# Linting
npm run lint            # ESLint (ESLINT_USE_FLAT_CONFIG=false)

# MCP Services
npm run cipher-mcp      # Memory service (MCP mode)
npm run cipher-api      # Memory service (API mode, port 3002)
claude mcp list         # Check MCP status

# VM Monitoring (Infrastructure)
/ai/prj/techdev/scripts/vm-monitor.sh  # Manual run
sudo journalctl -u vm-monitor.timer    # Check scheduled runs (if using systemd)
curl -X POST https://line-notification.com/api/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"test","severity":"info","server":"techdev"}'  # Test LINE notifications
```

## 🏗️ Architecture Overview

### Core Services
- `src/index.ts` - TechSapoServer (Express main server)
- `src/services/wall-bounce-analyzer.ts` - Multi-LLM orchestrator (standard)
- `src/services/wall-bounce-analyzer-nextgen.ts` - NextGen analyzer (SSE)
- `src/services/wall-bounce-orchestrator.ts` - Orchestration layer
- `src/config/llm-providers.json` - LLM provider configuration

### LLM Provider Tiers
- **Tier 0**: Context7/Stash - Documentation reference (non-LLM)
- **Tier 1**: Claude Code + Gemini 2.5 Flash/Pro/DeepThink
- **Tier 2**: GPT-5 Codex (codex MCP) + Qwen3-Coder (OpenRouter)
- **Tier 3**: Claude Sonnet 4.5 (default aggregator)
- **Tier 4**: Claude Opus 4.1 (complex aggregator, emergency/security)

**→ See [LLM Providers Guide](./docs/LLM_PROVIDERS_GUIDE.md) for detailed provider rules and CLI usage**

### API Routes
```
/api/v1/
  ├── /wall-bounce         # Standard multi-LLM analysis
  ├── /wall-bounce-sse     # Server-Sent Events streaming
  ├── /wall-bounce-serial  # Sequential processing mode
  ├── /codex              # GPT-5 session management
  ├── /gmail              # Gmail OAuth & email
  ├── /rag                # Google Drive RAG search
  ├── /context7           # Documentation service
  └── /it-unified         # Unified IT support endpoint
```

## ⚡ Critical Rules

### LLM Provider Rules
- ❌ **NEVER** use Anthropic API directly (unless `ANTHROPIC_API_ENABLED=true`)
- ❌ **NEVER** use OpenAI API directly
- ✅ GPT-5 Codex: `codex exec --model gpt-5-codex "concise prompt"` (Be specific, not verbose)
- ✅ Gemini: `gemini "prompt"` or `gemini --model gemini-2.5-pro "prompt"`
- ✅ Qwen3: OpenRouter API (via `src/services/openrouter-qwen3-provider.ts`)

**→ See [LLM Providers Guide](./docs/LLM_PROVIDERS_GUIDE.md) for complete CLI usage and examples**

**💡 GPT-5 Codex Prompting**: Use minimal, focused prompts. The model has adaptive reasoning and built-in coding best practices. "Less is more" - See [Best Practices](./docs/LLM_PROVIDERS_GUIDE.md#gpt-5-codex-prompting-best-practices)

### Environment Setup
**Required variables:**
```bash
HUGGINGFACE_API_KEY=hf_xxx
OPENROUTER_API_KEY=sk-or-xxx
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=xxx
```

**→ See [Environment Setup Guide](./docs/ENVIRONMENT_SETUP.md) for:**
- Complete environment variable list
- AWS Secrets Manager configuration
- Development vs Production setup
- Port configuration
- systemd setup

## 🚀 Quick Start

### Development
```bash
cd /ai/prj/techdev
npm install
cp .env.example .env  # Edit with your API keys
npm run build
npm run dev
```

### Production
```bash
# Deploy to /prod/techsapo
npm run build
sudo rsync -av dist/ /prod/techsapo/dist/
sudo systemctl restart techsapo
sudo systemctl status techsapo

# VM Monitoring Setup (one-time)
sudo cp /ai/prj/techdev/scripts/vm-monitor.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/vm-monitor.sh
# Then setup systemd timer or cron (see DEPLOYMENT_GUIDE.md)
```

**→ See [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md) for production deployment details**

## 💡 Key Development Patterns

### Wall-Bounce Execution Flow
1. User query → Claude Code analyzes
2. Route to Tier 1/2 LLM (Gemini/GPT-5/Qwen3)
3. Response → Different vendor LLM for validation
4. Min 3 rounds, max 6 rounds
5. Quality thresholds: confidence ≥0.7, consensus ≥0.6
6. Claude Code synthesizes final response

**→ See [Wall-Bounce System](./docs/WALL_BOUNCE_SYSTEM.md) for detailed orchestration flow**

### Critical Patterns
- **Redis**: Always use `JSON.stringify()`/`JSON.parse()`
- **Environment**: Load via `initializeEnvironment()` from `src/config/environment.ts`
- **Logging**: Use Winston logger (`src/utils/logger.ts`), never `console.log`
- **Testing**: 600000ms timeout for wall-bounce integration tests
- **Build**: JSON configs copied to `dist/config/` automatically

### File Structure
```
src/
├── services/    # Core business logic (~500 lines max)
├── routes/      # API endpoint handlers
├── config/      # Configuration (JSON + TypeScript)
├── utils/       # Shared utilities
└── types/       # TypeScript type definitions

tests/
├── unit/        # Unit tests
├── integration/ # Integration tests
└── setup.ts     # Jest setup
```

## 🔒 Security & Compliance

- **PII Protection**: `src/services/pii-protection.ts`
- **Audit Logging**: `src/services/audit-logger.ts` (v1) and `audit-logger-v2.ts` (v2)
- **Input Validation**: `src/utils/security.ts`
- **Secrets**: AWS Secrets Manager for production

**→ See [Security Documentation](./docs/SECURITY.md)**

## 🎨 Special Features

- **SSE Streaming**: `/api/v1/wall-bounce-sse` - Real-time progress updates
- **Serial Mode**: `/api/v1/wall-bounce-serial` - Sequential LLM execution
- **Context7**: Documentation lookup with MCP integration
- **Cost Tracking**: Monthly budget $70, alerts at 80%
- **VM Monitoring**: Automated infrastructure monitoring with LINE notifications
  - Script: `/ai/prj/techdev/scripts/vm-monitor.sh`
  - Monitors: CPU (>80%), Memory (>85%), Disk (>85%), Services (nginx, techsapo)
  - Notifications: Push to LINE via `https://line-notification.com/api/notify`
  - **Critical Architecture**: line-notification.com is the ONLY server for LINE API (never changes)

## 🐛 Troubleshooting

Quick checks for common issues:

```bash
# Health checks
curl http://localhost:8443/health
curl http://localhost:8443/api/v1/llm-health | jq
curl http://localhost:8443/api/v1/mcp-health | jq

# Redis connectivity
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# MCP lock files
ls -la /tmp/mcp-*.lock
rm /tmp/mcp-*.lock  # If stuck

# Gemini CLI
which gemini
gemini "test"

# Codex CLI
codex exec --model gpt-5-codex "test"
```

**→ See [Troubleshooting Guide](./docs/TROUBLESHOOTING.md) for detailed solutions**

## 🔔 LINE Notification System

**Critical Infrastructure Decision**: `line-notification.com` is the **permanent, unchanging** server for all LINE API operations.

### Architecture
- **Server**: line-notification.com (54.65.178.168)
- **Service**: Node.js Express app on port 3000 (internal)
- **Public Access**: HTTPS on port 443 via Nginx reverse proxy
- **Webhook**: `https://line-notification.com/webhook/line`
- **Push API**: `https://line-notification.com/api/notify`

### LINE Push Message API
```bash
# Send notification from any VM
curl -X POST https://line-notification.com/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "CPU usage high",
    "severity": "warning",
    "server": "techdev",
    "details": "CPU: 85%\nMemory: 70%"
  }'
```

**Severity Levels**:
- `critical` 🚨 - Immediate attention required
- `error` ❌ - Error conditions
- `warning` ⚠️ - Warning conditions
- `info` ℹ️ - Informational messages
- `success` ✅ - Success confirmations

### Admin User ID
- **LINE User ID**: `Uab2a7efceaf0d9bb7b29c54c8664029b` (hardcoded in server)

### Service Management
```bash
# On line-notification.com
sudo systemctl status line-webhook
sudo systemctl restart line-webhook
sudo journalctl -u line-webhook -f

# Test webhook
curl http://127.0.0.1:3000/health  # Internal
curl https://line-notification.com/health  # External
```

## 📚 Complete Documentation

| Topic | Documentation |
|-------|---------------|
| **Architecture** | [ARCHITECTURE_OVERVIEW.md](./docs/ARCHITECTURE_OVERVIEW.md) |
| **API Reference** | [API_REFERENCE.md](./docs/API_REFERENCE.md) |
| **LLM Providers** | [LLM_PROVIDERS_GUIDE.md](./docs/LLM_PROVIDERS_GUIDE.md) |
| **Environment Setup** | [ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md) |
| **Wall-Bounce System** | [WALL_BOUNCE_SYSTEM.md](./docs/WALL_BOUNCE_SYSTEM.md) |
| **MCP Integration** | [MCP_INTEGRATION.md](./docs/MCP_INTEGRATION.md) |
| **Testing** | [TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) |
| **Deployment** | [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) |
| **Security** | [SECURITY.md](./docs/SECURITY.md) |
| **Troubleshooting** | [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) |
| **AWS Secrets** | [AWS_SECRETS_MANAGER_SETUP.md](./docs/AWS_SECRETS_MANAGER_SETUP.md) |
| **Audit Logging** | [AUDIT_LOGGING.md](./docs/AUDIT_LOGGING.md) |

### Integration Guides
- [Gemini CLI Integration](./docs/GEMINI_CLI_INTEGRATION_GUIDE.md)
- [Codex MCP Integration](./docs/CODEX_MCP_INTEGRATION.md)
- [Qwen3 Integration Report](./docs/QWEN3_INTEGRATION_REPORT.md)

## 🧪 Testing Framework

- **Framework**: Jest with ts-jest transformer
- **Timeout**: 600000ms (10 minutes) for wall-bounce tests
- **Mocks**: `ioredis-mock` for Redis, `nock` for HTTP
- **Setup**: `tests/setup.ts` runs before all tests
- **Coverage**: `src/**/*.ts` (excluding `*.d.ts` and `index.ts`)

**→ See [Testing Guide](./docs/TESTING_GUIDE.md) for comprehensive testing strategy**

## 🔧 Operational Scripts

Located in `/ai/prj/techdev/scripts/`:

### Monitoring & Maintenance
- **`vm-monitor.sh`**: Infrastructure monitoring (CPU, Memory, Disk, Services)
  - Sends LINE notifications to `https://line-notification.com/api/notify`
  - Severity levels: info, warning, critical
  - Thresholds: CPU/Memory/Disk 80%+ warning, 95%+ critical

### Deployment & Production
- **`deploy-to-prod.sh`**: Production deployment automation
- **`install-renewal-cron.sh`**: SSL certificate auto-renewal setup (90-day cycle)
- **`emergency-rollback-*.sh`**: Emergency rollback procedures

### Development & Testing
- **`dev-watch.js`**: Development file watcher with auto-reload
- **`comprehensive-rag-test.sh`**: RAG system integration testing
- **`demo-sse-visualization.sh`**: SSE streaming demo

### MCP Services
- **`mcp-cipher.service`**: Cipher MCP systemd service definition
- **`mcp-serena.service`**: Serena MCP systemd service definition
- **`ensure-single-mcp-instance.sh`**: Prevent duplicate MCP instances

### Documentation
- **`generate-pdf*.js/sh`**: Generate PDF documentation from markdown
