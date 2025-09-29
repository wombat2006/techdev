# OpenAI Codex MCP Server Implementation

## Overview

This document describes the comprehensive implementation of the OpenAI Codex MCP (Model Context Protocol) server for TechSapo's Wall-Bounce Analysis System. The implementation is based on the official OpenAI Codex documentation and provides enterprise-grade integration with advanced security, monitoring, and multi-LLM coordination capabilities.

## Architecture

### Core Components

```
src/services/
├── codex-mcp-server.ts           # Full MCP server implementation
├── codex-mcp-integration.ts      # Wall-Bounce integration adapter
├── codex-session-manager.ts      # Session management (existing)
├── mcp-approval-manager.ts       # Enterprise approval workflows
└── mcp-integration-service.ts    # MCP orchestration service

config/
└── codex-mcp.toml               # TOML configuration file

scripts/
└── start-codex-mcp.sh           # Startup and management script

tests/services/
└── codex-mcp-server.test.ts     # Comprehensive test suite
```

### Integration Points

- **Wall-Bounce System**: Multi-LLM coordination via `wall-bounce-analyzer.ts`
- **Redis Service**: Session persistence and caching
- **Prometheus Metrics**: Performance monitoring and cost tracking
- **Approval Workflows**: Enterprise security and governance
- **MCP Protocol**: Standardized tool and resource access

## Features

### MCP Tools

#### 1. `codex` Tool
Start a new Codex conversation with advanced GPT-5 capabilities.

**Parameters:**
- `prompt` (required): The coding task or question
- `model`: OpenAI model (`gpt-5`, `gpt-5-codex`, `o1`, `o1-mini`)
- `sandbox`: Execution level (`read-only`, `isolated`, `full-access`)
- `mode`: Execution mode (`interactive`, `non-interactive`, `ci`)
- `full_auto`: Enable autonomous execution for CI mode
- `reasoning_effort`: GPT-5 reasoning level (`minimal`, `medium`, `high`)
- `verbosity`: Response verbosity (`low`, `medium`, `high`)

**Example:**
```json
{
  "name": "codex",
  "arguments": {
    "prompt": "Write a Python function to calculate factorial with memoization",
    "model": "gpt-5-codex",
    "sandbox": "read-only",
    "mode": "interactive",
    "reasoning_effort": "medium",
    "verbosity": "medium"
  }
}
```

#### 2. `codex-reply` Tool
Continue an existing Codex conversation.

**Parameters:**
- `prompt` (required): Follow-up message or request
- `session_id` OR `conversation_id`: Session identifier to continue

**Example:**
```json
{
  "name": "codex-reply",
  "arguments": {
    "prompt": "Add unit tests for the factorial function",
    "session_id": "session-123"
  }
}
```

#### 3. `codex-session-info` Tool
Get information about Codex sessions.

**Parameters:**
- `session_id`: Specific session to query
- `list_active`: List all active sessions (boolean)

#### 4. `codex-cleanup` Tool
Cleanup expired Codex sessions.

**Parameters:**
- `force`: Force cleanup all sessions (boolean)

### MCP Prompts

#### 1. Code Review Assistant
```json
{
  "name": "code-review",
  "arguments": {
    "code": "def factorial(n): return 1 if n <= 1 else n * factorial(n-1)",
    "language": "python"
  }
}
```

#### 2. Debug Helper
```json
{
  "name": "debug-helper",
  "arguments": {
    "code": "broken_code_here",
    "error_message": "RecursionError: maximum recursion depth exceeded"
  }
}
```

#### 3. Code Refactoring Assistant
```json
{
  "name": "refactor-code",
  "arguments": {
    "code": "legacy_code_here",
    "goal": "performance optimization"
  }
}
```

### MCP Resources

#### 1. Active Sessions (`codex://sessions/active`)
JSON resource containing current session statistics.

#### 2. Current Configuration (`codex://config/current`)
JSON resource with current server configuration.

#### 3. Recent Logs (`codex://logs/recent`)
Plain text resource with recent execution logs.

#### 4. Performance Statistics (`codex://stats/performance`)
JSON resource with performance metrics and monitoring data.

## Configuration

### TOML Configuration File

Location: `config/codex-mcp.toml`

```toml
[server]
name = "codex-mcp-server"
version = "1.0.0"
description = "OpenAI Codex integration via Model Context Protocol"

[codex]
model = "gpt-5-codex"
sandbox = "read-only"
base_instructions = """
You are a helpful coding assistant powered by OpenAI Codex.
Focus on providing clear, well-documented, and secure code solutions.
"""
working_directory = "."

[mcp]
approval_policy = "risk-based"
max_concurrent_sessions = 10
session_timeout_ms = 300000
enable_wall_bounce = true
min_providers = 2
quality_threshold = 0.7

[logging]
rust_log_level = "info"
enable_tracing = true
log_directory = "~/.codex/log"

[security]
risk_assessment = true
audit_logging = true
sensitive_data_detection = true

[security.risk_levels]
"read-only" = "low"
"isolated" = "medium"
"full-access" = "high"

[security.approval_workflows]
auto_approve_read_only = true
auto_approve_isolated = false
auto_approve_full_access = false
require_manual_approval_for_ci = true
```

## Installation and Setup

### Prerequisites

1. **Install OpenAI Codex CLI:**
   ```bash
   npm install -g @openai/codex
   # OR
   brew install codex
   ```

2. **Authenticate Codex:**
   ```bash
   codex auth login
   # Select "Sign in with ChatGPT" (recommended)
   ```

3. **Redis Server:**
   ```bash
   # macOS
   brew services start redis

   # Ubuntu
   sudo systemctl start redis-server

   # Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

### Quick Start

```bash
# Build the project
npm run build

# Test Codex MCP setup
npm run codex-mcp-test

# Start Codex MCP Server
npm run codex-mcp

# Stop the server
npm run codex-mcp-stop

# Restart with new configuration
npm run codex-mcp-restart
```

### Advanced Configuration

```bash
# Start with custom config
./scripts/start-codex-mcp.sh -c /path/to/custom-config.toml

# Start with debug logging
./scripts/start-codex-mcp.sh -l debug

# Test setup only
./scripts/start-codex-mcp.sh -t
```

## Wall-Bounce Integration

### Multi-LLM Coordination

The Codex MCP server integrates seamlessly with TechSapo's Wall-Bounce Analysis System:

```typescript
// Example usage in Wall-Bounce context
const codexIntegration = getCodexMCPIntegration();

const result = await codexIntegration.executeCodexWithWallBounce({
  prompt: "Implement a secure authentication system",
  context: {
    task_type: 'premium',
    cost_tier: 'medium',
    user_id: 'developer-123'
  },
  options: {
    model: 'gpt-5-codex',
    sandbox: 'isolated',
    reasoning_effort: 'high',
    verbosity: 'high',
    enable_wall_bounce: true
  }
});
```

### Quality Thresholds

- **Confidence Threshold**: ≥ 0.7
- **Consensus Threshold**: ≥ 0.6
- **Auto-escalation**: When thresholds not met
- **Japanese Responses**: Primary language for user-facing content

### Provider Architecture

1. **Tier 1**: Gemini 2.5 Pro (CLI access)
2. **Tier 2**: OpenAI Codex via MCP Server (GPT-5/GPT-5-Codex)
3. **Tier 3**: Anthropic Sonnet 4 (internal calls)
4. **Tier 4**: Anthropic Opus 4.1 (aggregator role)

## Security Features

### Risk-Based Approval Workflows

```typescript
interface ApprovalRequest {
  tool_name: string;
  operation: string;
  arguments: any;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  requested_by: string;
  business_justification?: string;
}
```

**Risk Assessment Matrix:**
- **Critical**: `full-access` + `full_auto` + `ci` mode
- **High**: `full-access` sandbox
- **Medium**: `isolated` sandbox or `full_auto` or `ci` mode
- **Low**: `read-only` sandbox with interactive mode

### Sandbox Execution Levels

1. **Read-only**: Safe code analysis and suggestions
2. **Isolated**: Limited file system access for testing
3. **Full-access**: Complete system access (requires approval)

### Audit Logging

All operations are logged with:
- Session identifiers
- User attribution
- Cost tracking
- Performance metrics
- Security events

## Monitoring and Observability

### Prometheus Metrics

```
# Session statistics
codex_mcp_active_sessions_total
codex_mcp_session_duration_seconds
codex_mcp_session_success_rate

# Cost tracking
codex_mcp_cost_usd_total
codex_mcp_tokens_consumed_total

# Performance metrics
codex_mcp_response_time_seconds
codex_mcp_wall_bounce_coordination_time_seconds
```

### Health Checks

```bash
# Server health
curl http://localhost:4000/health

# MCP-specific health
curl http://localhost:4000/mcp/codex/health

# Session statistics
curl http://localhost:4000/mcp/codex/stats
```

### Log Analysis

```bash
# Codex CLI logs
tail -f ~/.codex/log/codex-tui.log

# MCP server logs
tail -f logs/codex-mcp-server.log

# Wall-Bounce coordination logs
grep "Wall-Bounce" logs/techsapo.log
```

## Development and Testing

### Running Tests

```bash
# Unit tests
npm run test:unit tests/services/codex-mcp-server.test.ts

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

### Development Mode

```bash
# Watch mode for development
npm run dev

# Restart MCP server during development
npm run codex-mcp-restart
```

### Mock Testing

The test suite includes comprehensive mocks for:
- Codex CLI execution
- Redis session management
- MCP protocol communication
- Wall-Bounce coordination
- Cost calculation

## Troubleshooting

### Common Issues

1. **Codex CLI Not Found**
   ```bash
   # Install Codex CLI
   npm install -g @openai/codex
   ```

2. **Authentication Failed**
   ```bash
   # Re-authenticate
   codex auth logout
   codex auth login
   ```

3. **Redis Connection Error**
   ```bash
   # Check Redis status
   redis-cli ping
   # Should return "PONG"
   ```

4. **Permission Denied**
   ```bash
   # Make scripts executable
   chmod +x scripts/start-codex-mcp.sh
   ```

### Debug Mode

```bash
# Enable debug logging
RUST_LOG=debug npm run codex-mcp

# Or use script flag
./scripts/start-codex-mcp.sh -l debug
```

### Configuration Validation

```bash
# Test configuration without starting
npm run codex-mcp-test

# Validate TOML syntax
python3 -c "import toml; toml.load('config/codex-mcp.toml')"
```

## Performance Optimization

### Session Management

- **Session Timeout**: 5 minutes (configurable)
- **Max Concurrent Sessions**: 10 (configurable)
- **Automatic Cleanup**: Expired sessions removed every 60 seconds
- **Redis Persistence**: Sessions survive server restarts

### Cost Optimization

- **Token Estimation**: Real-time cost calculation
- **Budget Monitoring**: Configurable monthly limits
- **Provider Selection**: Cost-based routing in Wall-Bounce mode
- **Caching**: Response caching for repeated queries

### Scaling Considerations

- **Horizontal Scaling**: Multiple MCP server instances
- **Load Balancing**: Session affinity for consistency
- **Resource Limits**: Configurable memory and CPU limits
- **Rate Limiting**: Per-user and per-session limits

## API Reference

### MCP Server Methods

```typescript
// Tool execution
POST /mcp/tools/call
{
  "method": "tools/call",
  "params": {
    "name": "codex",
    "arguments": { ... }
  }
}

// Prompt retrieval
POST /mcp/prompts/get
{
  "method": "prompts/get",
  "params": {
    "name": "code-review",
    "arguments": { ... }
  }
}

// Resource access
POST /mcp/resources/read
{
  "method": "resources/read",
  "params": {
    "uri": "codex://sessions/active"
  }
}
```

### Wall-Bounce Integration API

```typescript
interface CodexWallBounceRequest {
  prompt: string;
  context: {
    task_type: 'basic' | 'premium' | 'critical';
    cost_tier: 'low' | 'medium' | 'high';
    user_id?: string;
  };
  options?: {
    model?: string;
    sandbox?: string;
    reasoning_effort?: 'minimal' | 'medium' | 'high';
    verbosity?: 'low' | 'medium' | 'high';
    enable_wall_bounce?: boolean;
  };
}

interface CodexIntegrationResult {
  success: boolean;
  response?: string;
  session_id?: string;
  conversation_id?: string;
  wall_bounce_analysis?: {
    providers_used: string[];
    consensus_score: number;
    confidence_score: number;
  };
  cost_analysis: {
    estimated_cost: number;
    actual_cost: number;
    provider_breakdown: Record<string, number>;
  };
  performance_metrics: {
    total_time_ms: number;
    codex_time_ms: number;
    wall_bounce_time_ms?: number;
  };
}
```

## License and Compliance

This implementation follows:
- **Apache-2.0 License** (matching OpenAI Codex)
- **Zero Data Retention** policies
- **GDPR Compliance** for EU users
- **Enterprise Security** standards
- **Audit Trail** requirements

## Contributing

When contributing to the Codex MCP implementation:

1. **Follow existing patterns** in `codex-mcp-server.ts`
2. **Add comprehensive tests** for new features
3. **Update configuration** documentation
4. **Maintain security** standards
5. **Test Wall-Bounce integration** thoroughly

## References

- [OpenAI Codex Advanced Documentation](https://github.com/openai/codex/blob/main/docs/advanced.md)
- [OpenAI Codex README](https://github.com/openai/codex/blob/main/README.md)
- [Model Context Protocol Specification](../mcp-prompts-specification.md)
- [TechSapo Wall-Bounce Analysis System](../claude-code-guide.md)
- [MCP Resources Specification](../mcp-resources-specification.md)