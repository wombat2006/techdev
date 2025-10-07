# LLM Providers Guide

This guide provides detailed information about LLM provider integration, CLI usage, and invocation patterns.

## Provider Overview

### Tier Structure

- **Tier 0**: Context7/Stash - Documentation reference (non-LLM)
- **Tier 1**: Claude Code - Routing & integration lead
- **Tier 1**: Gemini 2.5 Flash/Pro/DeepThink (CLI/API)
- **Tier 2**: GPT-5 (via codex MCP), Qwen3-Coder (OpenRouter)
- **Tier 3**: Claude Sonnet 4.5 (default aggregator)
- **Tier 4**: Claude Opus 4.1 (complex aggregator, emergency/security)

### Provider Configuration

Configuration is managed in `src/config/llm-providers.json`. Each provider has:
- `key`: Unique identifier
- `name`: Display name
- `model`: Model identifier
- `tier`: Priority tier (0-4)
- `capabilities`: Array of capabilities
- `invocationType`: How to invoke the provider

## Critical Provider Rules

### ❌ What NOT to Do

1. **NEVER use Anthropic API directly**
   - `ANTHROPIC_API_KEY` should only be used when `ANTHROPIC_API_ENABLED=true`
   - API is disabled by default for cost control
   - Use Codex MCP for Claude models when possible

2. **NEVER use OpenAI API directly**
   - `OPENAI_API_KEY` is not used in this codebase
   - Always use Codex CLI/MCP for GPT-5

3. **NEVER bypass the wall-bounce system**
   - All user queries must go through multi-LLM validation
   - Minimum 3 rounds, maximum 6 rounds

### ✅ Approved Invocation Methods

| Provider | Method | Example |
|----------|--------|---------|
| GPT-5 Codex | Codex CLI | `codex exec --model gpt-5-codex "prompt"` |
| Gemini | Google CLI | `gemini "prompt"` |
| Qwen3 | OpenRouter API | Via `src/services/openrouter-qwen3-provider.ts` |
| Claude | Codex MCP (preferred) | Via MCP integration |
| Claude | Anthropic API (fallback) | Only when `ANTHROPIC_API_ENABLED=true` |

## GPT-5 Codex via Codex CLI

### Basic Usage

```bash
# Non-interactive execution
codex exec --model gpt-5-codex "your prompt here"

# With config overrides
codex exec -c model="gpt-5-codex" -c 'approval_policy="never"' "prompt"
```

### Sandbox Modes

```bash
# Read-only (default) - Safest option
codex exec --model gpt-5-codex --sandbox read-only "analyze this code pattern"

# Workspace write - Allow file modifications
codex exec --model gpt-5-codex --sandbox workspace-write "refactor the utils module"

# Full access - DANGEROUS, use sparingly
codex exec --model gpt-5-codex --sandbox danger-full-access "deploy to production"
```

### GPT-5 Codex Prompting Best Practices

**Key Principle: "Less is More"**

GPT-5 Codex is purpose-built for coding tasks with built-in best practices. Follow these guidelines:

#### ✅ DO:
- **Be specific but concise**: "Refactor the authentication module to use async/await"
- **Provide clear boundaries**: "Fix the TypeScript errors in src/services/ without changing the API"
- **Allow creative freedom**: Let the model choose implementation details
- **Use minimal prompts**: The model has adaptive reasoning by default

#### ❌ DON'T:
- **Avoid verbose instructions**: No need for lengthy preambles
- **Don't over-steer**: The model has strong coding defaults
- **Skip redundant context**: It understands coding conventions
- **No explicit planning instructions**: Adaptive reasoning is built-in

#### Examples:

**❌ Overly Verbose (Avoid)**:
```bash
codex exec --model gpt-5-codex "I need you to carefully analyze the codebase and then create a comprehensive plan for refactoring the authentication system. Please make sure to follow all best practices and consider error handling, type safety, and performance. Start by reviewing the existing code..."
```

**✅ Concise & Effective (Preferred)**:
```bash
codex exec --model gpt-5-codex "Refactor auth system: async/await, strong types, error handling"
```

#### Special Capabilities:
- **Adaptive Reasoning**: Automatically adjusts complexity to task
- **Code Review Excellence**: Great for reviewing PRs and suggesting improvements
- **Interactive Sessions**: Optimized for back-and-forth collaboration
- **GitHub Integration**: Works seamlessly with git workflows

**Reference**: [OpenAI GPT-5 Codex Prompting Guide](https://cookbook.openai.com/examples/gpt-5-codex_prompting_guide)

### MCP Server Mode

```bash
# Start Codex as MCP server
codex mcp-server

# Check if running
ps aux | grep "codex mcp-server"

# MCP integration in code
# See: src/services/codex-mcp-wrapper.ts
```

### Session Management

```bash
# Sessions are managed in src/services/codex-session-manager.ts
# Redis keys: codex:session:{sessionId}
# Timeout: 30 minutes (configurable)
```

## Gemini via Google CLI

### Installation

```bash
# Install globally via npm
npm install -g @google/generative-ai-cli

# Verify installation
which gemini
gemini --version
```

### Basic Usage

```bash
# Simple prompt
gemini "your prompt here"

# With specific model
gemini --model gemini-2.5-pro "complex analysis task"
gemini --model gemini-2.5-flash "quick query"
gemini --model gemini-2.5-deep-think "mathematical reasoning"
```

### Model Selection

- **gemini-2.5-flash**: Fast, cost-efficient, high-volume tasks
- **gemini-2.5-pro**: Advanced reasoning, complex analysis
- **gemini-2.5-deep-think**: Enhanced reasoning with parallel thinking (192K output)

### API Integration

```typescript
// Direct API usage (when CLI is not suitable)
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

const result = await model.generateContent(prompt);
```

See: `docs/GEMINI_CLI_INTEGRATION_GUIDE.md` for detailed integration guide.

## Qwen3-Coder via OpenRouter

### Configuration

```bash
# Required environment variable
OPENROUTER_API_KEY=sk-or-xxx
```

### Model Details

- **Model**: qwen/qwen3-coder
- **Architecture**: 480B MoE (35B active parameters)
- **Context**: 262,144 tokens
- **Cost**: $0.22/M input, $0.95/M output
- **Specialization**: Coding, debugging, multi-file reasoning

### Usage

```typescript
// Via service wrapper
import { OpenRouterQwen3Provider } from './services/openrouter-qwen3-provider';

const provider = new OpenRouterQwen3Provider();
const response = await provider.generateResponse(prompt, {
  temperature: 0.7,
  maxTokens: 65536
});
```

### Best Practices

1. Use for coding tasks (50/50 split with GPT-5)
2. Ideal for multi-file code analysis
3. Good for debugging complex issues
4. Cost-effective for large context windows

See: `docs/QWEN3_INTEGRATION_REPORT.md` for detailed integration report.

## Claude via Anthropic API

### Safeguard Configuration

```bash
# Must be explicitly enabled
ANTHROPIC_API_ENABLED=true  # Default: false
ANTHROPIC_API_KEY=sk-ant-xxx
```

### Model Selection

```typescript
// Configuration in src/config/environment.ts
anthropic: {
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  apiEnabled: process.env.ANTHROPIC_API_ENABLED === 'true',
  defaultModel: 'claude-3-5-sonnet-20241022',
  maxTokens: 8192,
  temperature: 0.7,
}
```

### Usage Pattern

```typescript
// Check if API is enabled
if (!config.anthropic.apiEnabled) {
  throw new Error('Anthropic API is disabled. Use Codex MCP instead.');
}

// Use via SDK
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: config.anthropic.apiKey });
```

### When to Use Each Model

- **Sonnet 4.5**: Default aggregator for wall-bounce (Tier 3)
- **Opus 4.1**: Complex aggregator for high-complexity tasks (Tier 4)

Selection logic in `src/config/llm-providers.json`:
```json
"aggregatorSelection": {
  "defaultAggregator": "sonnet-4.5",
  "complexAggregator": "opus-4.1",
  "complexityThreshold": 2
}
```

## Provider Health Checks

### API Endpoint

```bash
# Check all provider health
curl http://localhost:8443/api/v1/llm-health | jq '.services'

# Response structure
{
  "services": {
    "gemini": { "status": "healthy", "latency": 234 },
    "gpt5": { "status": "healthy", "latency": 456 },
    "qwen3": { "status": "healthy", "latency": 345 },
    "claude": { "status": "degraded", "error": "API disabled" }
  }
}
```

### Implementation

See: `src/routes/it-unified.ts` for health check implementation.

## Provider Selection Logic

### Automatic Selection

The wall-bounce system automatically selects providers based on:

1. **Task Type**: Coding vs. analysis vs. reasoning
2. **Complexity**: Simple vs. complex queries
3. **Vendor Rotation**: Different vendor each round
4. **Availability**: Health status and quota

### Manual Override

```typescript
// Specify providers explicitly in wall-bounce request
{
  "query": "your question",
  "providers": ["gemini-2.5-pro", "gpt-5", "sonnet-4.5"]
}
```

## Cost Optimization

### Pricing Data

Maintained in `src/data/llm-pricing.json`:

```json
{
  "gemini-2.5-flash": { "input": 0.075, "output": 0.30 },
  "gemini-2.5-pro": { "input": 1.25, "output": 5.00 },
  "gpt-5": { "input": 2.50, "output": 10.00 },
  "qwen3-coder": { "input": 0.22, "output": 0.95 },
  "sonnet-4.5": { "input": 3.00, "output": 15.00 }
}
```

### Cost Tracking

```bash
# Check current costs
curl http://localhost:8443/api/v1/cost-summary | jq

# Monthly budget limit: $70 (configurable)
# Alert threshold: 80%
```

See: `src/services/wall-bounce-cost-tracker.ts` for implementation.

## Troubleshooting

### Codex Issues

```bash
# Check if Codex is running
ps aux | grep codex

# Test basic execution
codex exec --model gpt-5-codex "hello"

# Check MCP lock file
ls -la /tmp/mcp-*.lock
rm /tmp/mcp-codex.lock  # If stuck
```

### Gemini Issues

```bash
# Verify CLI installation
which gemini
gemini --version

# Test with simple query
gemini "hello"

# Check API key
echo $GOOGLE_API_KEY
```

### OpenRouter Issues

```bash
# Verify API key
echo $OPENROUTER_API_KEY

# Test API connectivity
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

### Anthropic API Issues

```bash
# Check if API is enabled
echo $ANTHROPIC_API_ENABLED  # Should be 'true'

# Verify API key
echo $ANTHROPIC_API_KEY

# Test API
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

## References

- [Codex MCP Integration](./CODEX_MCP_INTEGRATION.md)
- [Gemini CLI Integration Guide](./GEMINI_CLI_INTEGRATION_GUIDE.md)
- [Qwen3 Integration Report](./QWEN3_INTEGRATION_REPORT.md)
- [Wall-Bounce System](./WALL_BOUNCE_SYSTEM.md)
- [API Reference](./API_REFERENCE.md)
