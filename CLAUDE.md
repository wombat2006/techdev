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
```

## 🏗️ Architecture Overview

### Core Services
`src/`: index.ts (Express), wall-bounce-analyzer (standard/nextgen), wall-bounce-orchestrator, config/llm-providers.json

### LLM Provider Tiers
- **Tier 0**: Context7/Stash - Documentation reference (non-LLM)
- **Tier 1**: Claude Code + Gemini 2.5 Flash/Pro/DeepThink
- **Tier 2**: GPT-5 Codex (codex MCP) + Qwen3-Coder (OpenRouter)
- **Tier 3**: Claude Sonnet 4.5 (default aggregator)
- **Tier 4**: Claude Opus 4.1 (complex aggregator, emergency/security)

**→ See [LLM Providers Guide](./docs/LLM_PROVIDERS_GUIDE.md) for detailed provider rules and CLI usage**

### API Routes
`/api/v1/`: wall-bounce (standard/sse/serial), codex, gmail, rag, context7, it-unified

**→ See [API Reference](./docs/API_REFERENCE.md) for complete endpoint documentation**

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

```bash
# Development
npm install && cp .env.example .env  # Edit with API keys
npm run build && npm run dev

# Production
npm run build && sudo rsync -av dist/ /prod/techsapo/dist/
sudo systemctl restart techsapo
```

**→ See [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md) for full deployment details**

## 💡 Key Development Patterns

### Wall-Bounce Flow
1. User query → Claude Code → Route to Tier 1/2 LLM
2. Response → Different vendor for validation
3. Min 3 rounds, quality thresholds: confidence ≥0.7, consensus ≥0.6

**→ See [Wall-Bounce System](./docs/WALL_BOUNCE_SYSTEM.md) for details**

### Critical Patterns
- **Redis**: `JSON.stringify()`/`JSON.parse()` | **Environment**: `initializeEnvironment()`
- **Logging**: Winston logger, never `console.log` | **Testing**: 600000ms timeout
- **File limit**: ~500 lines/file | **Structure**: `src/{services,routes,config,utils,types}`

## 🔒 Security & Compliance

PII Protection, Audit Logging (v1/v2), Input Validation, AWS Secrets Manager

**→ See [Security Documentation](./docs/SECURITY.md)**

## 🎨 Special Features

- **SSE Streaming**: Real-time progress | **Serial Mode**: Sequential execution
- **Context7**: Documentation lookup | **Cost Tracking**: $70/month, 80% alerts
- **VM Monitoring**: LINE notifications (CPU/Memory/Disk >85%, Services)

**→ See [LINE Notification System](./docs/LINE_NOTIFICATION_SYSTEM.md) and [Operational Scripts](./docs/OPERATIONAL_SCRIPTS.md)**

## 🐛 Troubleshooting

Common issues: Health checks, Redis connectivity, MCP locks, Gemini/Codex CLI

**→ See [Troubleshooting Guide](./docs/TROUBLESHOOTING.md) for detailed solutions**

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
| **LINE Notifications** | [LINE_NOTIFICATION_SYSTEM.md](./docs/LINE_NOTIFICATION_SYSTEM.md) |
| **Operational Scripts** | [OPERATIONAL_SCRIPTS.md](./docs/OPERATIONAL_SCRIPTS.md) |

### Integration Guides
- [Gemini CLI Integration](./docs/GEMINI_CLI_INTEGRATION_GUIDE.md)
- [Codex MCP Integration](./docs/CODEX_MCP_INTEGRATION.md)
- [Qwen3 Integration Report](./docs/QWEN3_INTEGRATION_REPORT.md)

## 🧪 Testing Framework

- Jest with ts-jest, 600000ms timeout for wall-bounce tests
- Mocks: `ioredis-mock`, `nock` for HTTP

**→ See [Testing Guide](./docs/TESTING_GUIDE.md) for comprehensive testing strategy**

## 🔧 Operational Scripts

Key scripts in `/ai/prj/techdev/scripts/`:
- **Monitoring**: `vm-monitor.sh` (VM health with LINE notifications)
- **Deployment**: `deploy-to-prod.sh`, `install-renewal-cron.sh`, `emergency-rollback-*.sh`
- **Development**: `dev-watch.js`, `comprehensive-rag-test.sh`, `demo-sse-visualization.sh`
- **MCP Services**: `mcp-cipher.service`, `mcp-serena.service`, `ensure-single-mcp-instance.sh`
- **Documentation**: `generate-pdf*.js/sh`

**→ See [Operational Scripts Guide](./docs/OPERATIONAL_SCRIPTS.md) for detailed documentation**
