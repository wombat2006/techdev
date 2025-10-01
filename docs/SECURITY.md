# TechSapo Security Guidelines

## Overview

TechSapo implements defense-in-depth security across all layers, with special emphasis on secure LLM provider integration and input validation.

## Security Principles

1. **No API Keys in Code** - All LLM access via CLI or internal SDK
2. **Input Validation** - All user input sanitized before processing
3. **Least Privilege** - Service runs with minimal required permissions
4. **Audit Logging** - All MCP tool executions logged
5. **Secure Defaults** - Fail-safe configuration

## LLM Provider Security

### Allowed Access Patterns

#### ✅ Gemini 2.5 Pro
```typescript
// Correct: CLI spawn with sanitized input
const { spawn } = require('child_process');
const sanitizedPrompt = prompt.replace(/[`$\\]/g, '\\$&');
spawn('gemini', ['-p', sanitizedPrompt, '--model', 'gemini-2.5-pro']);
```

#### ✅ GPT-5 Codex
```typescript
// Correct: Codex CLI via secure spawn
spawn('codex', [
  'exec',
  '--model', 'gpt-5-codex',
  '-c', 'approval_policy="never"',
  fullPrompt
]);
```

#### ✅ Claude Sonnet/Opus
```typescript
// Correct: Internal SDK (no API keys exposed)
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic(); // Uses internal credentials
```

### Forbidden Patterns

#### ❌ Direct API Keys
```typescript
// FORBIDDEN: Never use API keys directly
const apiKey = process.env.OPENAI_API_KEY; // ❌
const apiKey = 'sk-proj-...'; // ❌
```

#### ❌ Unsafe Shell Execution
```typescript
// FORBIDDEN: Shell injection vulnerability
exec(`gemini -p "${userInput}"`); // ❌
```

## Input Sanitization

### User Input Processing

**Location**: `src/utils/security.ts`

```typescript
// Example: Sanitize before CLI spawn
export function sanitizeForCLI(input: string): string {
  // Remove shell meta-characters
  return input.replace(/[`$\\;|&<>]/g, '\\$&');
}

// Example: Sanitize for JSON
export function sanitizeJSON(input: any): any {
  // Deep sanitization of objects
  if (typeof input === 'string') {
    return input.replace(/[<>]/g, '');
  }
  // ... handle objects/arrays
}
```

### Validation Middleware

**Location**: `src/middleware/validation.ts`

```typescript
export const validateWallBounceRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { question, taskType } = req.body;

  // Length validation
  if (!question || question.length > 10000) {
    return res.status(400).json({ error: 'Invalid question length' });
  }

  // Type validation
  if (taskType && !['basic', 'premium', 'critical'].includes(taskType)) {
    return res.status(400).json({ error: 'Invalid task type' });
  }

  next();
};
```

## Secure Process Spawning

### Best Practices

```typescript
// ✅ GOOD: Arguments array, timeout, error handling
const child = spawn('gemini', args, {
  timeout: 120000,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env }
});

child.on('error', (error) => {
  logger.error('Spawn error', { error });
  reject(error);
});

child.on('close', (code) => {
  if (code === 0) {
    resolve({ stdout, stderr });
  } else {
    reject(new Error(`Exit code: ${code}`));
  }
});
```

### Timeout Controls

```typescript
// Configuration in feature-flags.ts
export const config = {
  wallBounce: {
    enableTimeout: true,
    timeoutMs: 120000, // 2 minutes
  }
};
```

## MCP Approval Workflows

### Risk Assessment

**Location**: `src/services/mcp-approval-manager.ts`

```typescript
assessRisk(toolName: string, params: any): RiskLevel {
  // Low risk: read-only operations
  if (toolName.includes('read') || toolName.includes('get')) {
    return 'low';
  }

  // High risk: write/delete operations
  if (toolName.includes('write') || toolName.includes('delete')) {
    return 'high';
  }

  // Critical risk: system operations
  if (toolName.includes('exec') || toolName.includes('shell')) {
    return 'critical';
  }

  return 'medium';
}
```

### Approval Policies

| Risk Level | Auto-Approve | Manual Review | Audit Log |
|------------|--------------|---------------|-----------|
| Low | ✅ Yes | ❌ No | Standard |
| Medium | ⚠️ Conditional | ⚠️ Sometimes | Enhanced |
| High | ❌ No | ✅ Yes | Full |
| Critical | ❌ No | ✅ Yes | Immutable |

## Network Security

### HTTPS Configuration

**Production**: TLS certificates mandatory

```nginx
# Nginx configuration
server {
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/certs/techsapo.crt;
    ssl_certificate_key /etc/ssl/private/techsapo.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### CORS Policy

**Location**: `src/index.ts`

```typescript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://techsapo.com' 
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Security Headers

**Helmet Configuration**:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}));
```

## Authentication & Authorization

### Session Management

**Redis-based sessions**:

```typescript
// Session config
const sessionConfig = {
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 3600000 // 1 hour
  }
};
```

### MCP Tool Authorization

```typescript
// Check if user has permission for tool
export function authorizeToolExecution(
  user: User,
  toolName: string
): boolean {
  const requiredRole = toolPermissions[toolName];
  return user.roles.includes(requiredRole);
}
```

## Data Protection

### Sensitive Data Handling

```typescript
// ❌ NEVER log sensitive data
logger.info('User request', { 
  userId: user.id,
  // ❌ password: user.password,
  // ❌ apiKey: user.apiKey
});

// ✅ ALWAYS redact sensitive fields
logger.info('User request', {
  userId: user.id,
  email: redactEmail(user.email)
});
```

### Redis Security

```bash
# Redis configuration
requirepass <strong-password>
bind 127.0.0.1
protected-mode yes
maxmemory 256mb
maxmemory-policy allkeys-lru
```

## Systemd Service Isolation

### Service Configuration

**Location**: `/etc/systemd/system/techsapo.service`

```ini
[Service]
Type=simple
User=wombat
Group=wombat
WorkingDirectory=/prod/techsapo

# Security restrictions
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/techsapo
PrivateTmp=true

# Capabilities for HTTPS
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
```

### File Permissions

```bash
# Production files owned by service user
chown -R wombat:wombat /prod/techsapo
chmod 750 /prod/techsapo
chmod 640 /prod/techsapo/.env
```

## Audit Logging

### MCP Tool Execution

```typescript
// Log all MCP tool calls
logger.audit('MCP tool execution', {
  toolName,
  params: sanitizeParams(params),
  userId,
  timestamp: Date.now(),
  riskLevel,
  approved: true
});
```

### Wall-Bounce Analysis

```typescript
// Log Wall-Bounce requests
logger.info('Wall-Bounce analysis', {
  questionPreview: question.substring(0, 100),
  providers: providerList,
  consensus: result.consensus,
  duration: endTime - startTime
});
```

## Security Testing

### Required Tests

```typescript
describe('Security', () => {
  it('should sanitize shell meta-characters', () => {
    const input = "'; rm -rf /";
    const sanitized = sanitizeForCLI(input);
    expect(sanitized).not.toContain(';');
  });

  it('should reject oversized input', () => {
    const largeInput = 'x'.repeat(100000);
    expect(() => validateInput(largeInput)).toThrow();
  });

  it('should prevent ReDOS attacks', () => {
    const maliciousRegex = /(a+)+$/;
    const input = 'a'.repeat(50) + 'b';
    // Should timeout quickly, not hang
  });
});
```

## Incident Response

### Security Incident Procedure

1. **Detect**: Monitor logs for suspicious activity
2. **Isolate**: Stop affected service immediately
3. **Investigate**: Analyze audit logs and metrics
4. **Remediate**: Apply patches and configuration changes
5. **Document**: Update security documentation

### Emergency Contacts

```bash
# Stop service immediately
sudo systemctl stop techsapo

# Check for suspicious activity
journalctl -u techsapo -p err -n 100

# Review audit logs
tail -f /var/techsapo/logs/audit.log
```

## Compliance & Best Practices

### OWASP Top 10 Coverage

- ✅ **A01: Broken Access Control** - MCP approval workflows
- ✅ **A02: Cryptographic Failures** - TLS only, no plaintext secrets
- ✅ **A03: Injection** - Input sanitization, secure spawn
- ✅ **A04: Insecure Design** - Security by default
- ✅ **A05: Security Misconfiguration** - Hardened service config
- ✅ **A06: Vulnerable Components** - Regular dependency updates
- ✅ **A07: Auth Failures** - Session management, Redis
- ✅ **A08: Data Integrity** - Audit logging
- ✅ **A09: Logging Failures** - Comprehensive Winston logging
- ✅ **A10: SSRF** - Validation of external URLs

## Related Documentation

- **ARCHITECTURE.md** - System architecture
- **DEVELOPMENT_GUIDE.md** - Secure coding practices
- **MCP_SERVICES.md** - MCP security model
- **DEPLOYMENT_GUIDE.md** - Production security checklist
