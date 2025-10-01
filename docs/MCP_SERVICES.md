# MCP Services Architecture

## Overview

TechSapo integrates Model Context Protocol (MCP) for standardized LLM tool orchestration with enterprise-grade governance and security.

## MCP Protocol Fundamentals

**MCP (Model Context Protocol)**: Standardized protocol for LLM context management and tool execution.

**Key Benefits**:
- Standardized tool interfaces
- Built-in approval workflows
- Session persistence
- Audit logging
- Cost tracking

**SDK**: `@modelcontextprotocol/sdk`

## Integrated MCP Servers

### 1. Cipher MCP

**Purpose**: Long-term memory and knowledge management

**Location**: External MCP server (configured in Claude Desktop)

**Tools**:
- `ask_cipher` - Query knowledge base with context-aware responses

**Usage Pattern**:
```typescript
// NOT used for real-time LLM calls
// Used for: Knowledge retrieval, context building
const response = await cipherMCP.askCipher({
  message: "Retrieve documentation about Wall-Bounce system"
});
```

**Integration**: Background knowledge layer, not in critical path

### 2. Codex MCP

**Purpose**: GPT-5/GPT-5-Codex integration with approval workflows

**Location**: `src/services/codex-mcp-server.ts`

**Tools**:
- `codex` - Start new conversation with GPT-5/GPT-5-Codex
- `codex-reply` - Continue existing conversation
- `codex-session-info` - Get session statistics
- `codex-cleanup` - Cleanup expired sessions

**Configuration**: `config/codex-mcp.toml`

**Features**:
- Risk-based approval workflows
- Sandbox execution levels
- Session management (Redis)
- Cost tracking
- Audit logging

**Usage Pattern**:
```typescript
// Via MCP protocol
const result = await codexMCP.codex({
  prompt: "Analyze this code for performance issues",
  model: "gpt-5-codex",
  approvalPolicy: "on-request"
});

// Direct CLI (preferred in Wall-Bounce)
spawn('codex', [
  'exec',
  '--model', 'gpt-5-codex',
  '-c', 'approval_policy="never"',
  prompt
]);
```

### 3. Context7 MCP

**Purpose**: Real-time library documentation access

**Location**: External MCP server

**Tools**:
- `resolve-library-id` - Convert package name to Context7 ID
- `get-library-docs` - Fetch current documentation

**Usage Pattern**:
```typescript
// Resolve library ID
const libId = await context7.resolveLibraryId('express');
// Returns: '/expressjs/express'

// Get documentation
const docs = await context7.getLibraryDocs(libId, {
  topic: 'middleware',
  tokens: 5000
});
```

**Integration**: Documentation layer for Wall-Bounce technical analysis

## Core MCP Services (Internal)

### MCP Integration Service

**Location**: `src/services/mcp-integration-service.ts`

**Role**: Central orchestrator for all MCP operations

**Responsibilities**:
- Route requests to appropriate MCP servers
- Coordinate approval workflows
- Manage session state
- Aggregate metrics and costs

**Key Methods**:
```typescript
class MCPIntegrationService {
  // Execute tool with approval workflow
  async executeTool(
    serverName: string,
    toolName: string,
    params: any
  ): Promise<MCPToolResult>

  // Get available tools from server
  async listTools(serverName: string): Promise<Tool[]>

  // Session management
  async createSession(config: SessionConfig): Promise<string>
  async getSession(sessionId: string): Promise<Session>
  async cleanupSessions(): Promise<void>
}
```

### MCP Approval Manager

**Location**: `src/services/mcp-approval-manager.ts`

**Role**: Risk-based approval workflows

**Risk Levels**:
- **Low**: Auto-approve (read-only operations)
- **Medium**: Conditional approval (based on user role)
- **High**: Manual approval required
- **Critical**: Manual approval + audit trail

**Key Methods**:
```typescript
class MCPApprovalManager {
  // Assess risk level
  assessRisk(toolName: string, params: any): RiskLevel

  // Check if auto-approval allowed
  canAutoApprove(
    riskLevel: RiskLevel,
    user: User
  ): boolean

  // Request manual approval
  async requestApproval(
    toolName: string,
    params: any,
    justification: string
  ): Promise<ApprovalResult>

  // Audit logging
  logToolExecution(
    toolName: string,
    approved: boolean,
    result: any
  ): void
}
```

### MCP Config Manager

**Location**: `src/services/mcp-config-manager.ts`

**Role**: Tool optimization and cost estimation

**Features**:
- Tool parameter validation
- Cost estimation before execution
- Performance metrics tracking
- Configuration optimization

**Key Methods**:
```typescript
class MCPConfigManager {
  // Estimate cost before execution
  estimateCost(
    toolName: string,
    params: any
  ): CostEstimate

  // Optimize tool parameters
  optimizeParams(
    toolName: string,
    params: any
  ): OptimizedParams

  // Track usage metrics
  recordUsage(
    toolName: string,
    duration: number,
    cost: number
  ): void
}
```

## Wall-Bounce MCP Integration

### Wall-Bounce Adapter

**Location**: `src/services/wall-bounce-adapter.ts`

**Role**: Bridge between Wall-Bounce and MCP systems

**Integration Points**:
```typescript
class WallBounceAdapter {
  // Convert Wall-Bounce request to MCP call
  async adaptWallBounceToMCP(
    question: string,
    provider: string
  ): Promise<MCPRequest>

  // Convert MCP response to Wall-Bounce format
  adaptMCPToWallBounce(
    mcpResponse: MCPToolResult
  ): LLMResponse

  // Stream MCP events to Wall-Bounce SSE
  streamMCPToSSE(
    mcpStream: ReadableStream,
    sseWriter: (event: any) => void
  ): void
}
```

### Execution Flow

```
User Request
    ↓
Wall-Bounce Analyzer
    ↓
Wall-Bounce Adapter
    ↓
MCP Integration Service
    ↓
Approval Manager (risk assessment)
    ↓ [approved]
Config Manager (optimize params)
    ↓
Codex MCP Server
    ↓
spawn('codex', [...])
    ↓
GPT-5/GPT-5-Codex
    ↓
Response → Adapter → Wall-Bounce
```

## Session Management

### Redis-Based Persistence

**Schema**:
```typescript
interface MCPSession {
  sessionId: string;
  provider: string;
  createdAt: number;
  lastActivity: number;
  state: {
    conversationHistory: Message[];
    context: any;
    metadata: any;
  };
  stats: {
    totalCalls: number;
    totalTokens: number;
    totalCost: number;
  };
}
```

**Redis Keys**:
- `mcp:session:{sessionId}` - Session data
- `mcp:active` - Set of active session IDs
- `mcp:metrics:{provider}` - Provider-specific metrics

**Cleanup Policy**:
- Sessions expire after 1 hour of inactivity
- Cleanup runs every 15 minutes
- Persistent audit logs saved before deletion

### Session Lifecycle

```typescript
// Create session
const sessionId = await mcpService.createSession({
  provider: 'codex',
  model: 'gpt-5-codex',
  config: { approval_policy: 'on-request' }
});

// Use session
const response = await mcpService.executeTool('codex', 'codex', {
  sessionId,
  prompt: 'Analyze this code'
});

// Cleanup (automatic or manual)
await mcpService.cleanupSessions();
```

## Security & Governance

### Approval Workflows

**Automatic Approval** (Low Risk):
- Read-only tools
- Information retrieval
- No side effects

**Manual Approval** (High/Critical Risk):
- Write operations
- External API calls
- System commands

**Approval Process**:
1. Tool request received
2. Risk assessment
3. Check auto-approval eligibility
4. If manual: notify admin, await decision
5. If approved: execute with audit log
6. Return result

### Audit Logging

**Log Entry**:
```typescript
interface AuditLog {
  timestamp: number;
  toolName: string;
  provider: string;
  params: any; // sanitized
  riskLevel: RiskLevel;
  approvalMethod: 'auto' | 'manual';
  approved: boolean;
  userId: string;
  result: {
    success: boolean;
    duration: number;
    cost: number;
  };
}
```

**Storage**: Immutable audit log in Redis + file backup

## Cost Tracking

### Cost Components

**Per-Provider Costs**:
- Gemini 2.5 Pro: CLI (free tier limits)
- GPT-5 Codex: Token-based pricing
- Claude Sonnet 4: Internal (cost-managed)
- Claude Opus 4.1: Internal (cost-managed)

### Budget Management

**Monthly Budget**: $70/month

**Cost Allocation**:
```typescript
interface CostTracker {
  provider: string;
  period: 'daily' | 'weekly' | 'monthly';
  spent: number;
  limit: number;
  alerts: {
    threshold: number; // e.g., 0.8 = 80%
    triggered: boolean;
  };
}
```

**Alert Thresholds**:
- 80% of budget: Warning
- 90% of budget: Critical
- 100% of budget: Auto-disable non-critical calls

## Performance Monitoring

### Metrics Collection

**Prometheus Metrics**:
```typescript
// MCP tool execution duration
mcp_tool_duration_seconds{tool, provider, status}

// MCP tool execution count
mcp_tool_total{tool, provider, status}

// MCP cost tracking
mcp_cost_dollars{provider, period}

// Approval workflow metrics
mcp_approval_duration_seconds{risk_level}
mcp_approval_total{risk_level, decision}
```

### Grafana Dashboards

**MCP Service Dashboard**:
- Tool execution rate by provider
- Approval workflow performance
- Cost tracking vs budget
- Session lifecycle metrics
- Error rates and types

## Configuration Files

### Codex MCP Configuration

**Location**: `config/codex-mcp.toml`

```toml
[mcp]
server_name = "codex"
enabled = true

[codex]
cli_path = "codex"
default_model = "gpt-5-codex"
timeout_ms = 120000

[approval]
default_policy = "on-request"
auto_approve_read = true
require_audit = true

[session]
redis_url = "redis://localhost:6379"
ttl_seconds = 3600
cleanup_interval_ms = 900000

[cost]
monthly_budget_usd = 70
alert_threshold = 0.8
```

## Error Handling

### Common Errors

**MCP Server Unavailable**:
```typescript
try {
  const result = await mcpService.executeTool(...)
} catch (error) {
  if (error.code === 'MCP_SERVER_UNAVAILABLE') {
    // Fallback to direct CLI
    return await directCLICall(...)
  }
}
```

**Approval Timeout**:
```typescript
if (error.code === 'APPROVAL_TIMEOUT') {
  // Reject request, notify user
  return { error: 'Manual approval timed out' }
}
```

**Cost Limit Exceeded**:
```typescript
if (error.code === 'COST_LIMIT_EXCEEDED') {
  // Use free-tier provider instead
  return await fallbackToGemini(...)
}
```

## Testing MCP Services

### Unit Tests

```typescript
describe('MCPApprovalManager', () => {
  it('should auto-approve low-risk tools', async () => {
    const result = await approvalManager.canAutoApprove('low', user);
    expect(result).toBe(true);
  });

  it('should require manual approval for critical tools', async () => {
    const result = await approvalManager.canAutoApprove('critical', user);
    expect(result).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('Codex MCP Integration', () => {
  it('should execute tool via MCP', async () => {
    const result = await mcpService.executeTool('codex', 'codex', {
      prompt: 'test',
      model: 'gpt-5'
    });
    expect(result.success).toBe(true);
  });

  it('should track session state in Redis', async () => {
    const sessionId = await mcpService.createSession({...});
    const session = await mcpService.getSession(sessionId);
    expect(session.provider).toBe('codex');
  });
});
```

## Troubleshooting

### MCP Server Won't Start

```bash
# Check Codex CLI
which codex
codex --version

# Check Redis
redis-cli ping

# Check configuration
cat config/codex-mcp.toml

# Check logs
tail -f /var/techsapo/logs/mcp.log
```

### High Costs

```bash
# Check current spending
curl http://localhost:8443/metrics | grep mcp_cost

# Review audit logs
grep "COST_ALERT" /var/techsapo/logs/audit.log

# Adjust budget in config
vim config/codex-mcp.toml
```

## Related Documentation

- **ARCHITECTURE.md** - Overall system architecture
- **WALL_BOUNCE_SYSTEM.md** - Wall-Bounce integration
- **SECURITY.md** - MCP security model
- **codex-mcp-implementation.md** - Detailed Codex MCP setup
- **mcp-integration-guide.md** - MCP protocol patterns
