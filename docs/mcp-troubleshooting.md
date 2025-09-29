# MCP Troubleshooting and Best Practices

## Common Issues and Solutions

### Connection Problems

#### "Address already in use" Error
**Problem**: Port already occupied by another process
```bash
Error: listen EADDRINUSE: address already in use :::24282
```

**Solution**:
```bash
# Find process using the port
netstat -tulpn | grep :24282
lsof -i :24282

# Kill the process
kill -9 <PID>

# Or use a different port
uv run serena start-mcp-server --port 24283
```

#### Transport Protocol Mismatch
**Problem**: Client expects STDIO but server uses HTTP
```bash
Error: Expected stdio transport but got HTTP
```

**Solution**: Ensure transport protocols match
```json
// For Claude Code - use stdio
{
  "serena": {
    "command": "uv",
    "args": [
      "run", "serena", "start-mcp-server",
      "--transport", "stdio"  // Not http
    ]
  }
}
```

#### Permission Denied Errors
**Problem**: Insufficient permissions for file access
```bash
Error: EACCES: permission denied, open '/path/to/file'
```

**Solution**:
```bash
# Check file permissions
ls -la /path/to/file

# Fix permissions
chmod 644 /path/to/file
chown user:group /path/to/file

# Or run with appropriate user
sudo -u correctuser command
```

### Configuration Issues

#### Invalid JSON Configuration
**Problem**: Malformed configuration file
```bash
Error: Unexpected token } in JSON at position 123
```

**Solution**: Validate JSON syntax
```bash
# Validate JSON
jq '.' /home/wombat/.config/claude/claude_desktop_config.json

# Common issues:
# - Missing commas
# - Trailing commas
# - Unescaped quotes
# - Wrong brackets
```

#### Environment Variable Problems
**Problem**: Required environment variables not set
```bash
Error: PYTHONPATH not found
```

**Solution**: Set environment variables properly
```json
{
  "serena": {
    "env": {
      "PYTHONPATH": "/full/path/to/serena-mcp",
      "UV_PROJECT_DIR": "/full/path/to/project"
    }
  }
}
```

#### Path Resolution Issues
**Problem**: Relative paths not resolving correctly
```bash
Error: No such file or directory: './serena-mcp'
```

**Solution**: Use absolute paths
```json
{
  "command": "uv",
  "args": [
    "run",
    "--directory", "/ai/prj/techdev/serena-mcp",  // Absolute path
    "serena", "start-mcp-server"
  ]
}
```

### Runtime Errors

#### Tool Execution Failures
**Problem**: Tools fail during execution
```bash
Error: Tool 'analyze_code' failed with status 1
```

**Diagnosis**:
```bash
# Check tool directly
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "analyze_code", "arguments": {}}}' | serena-server

# Check logs
tail -f /var/log/mcp-server.log

# Enable debug mode
DEBUG=mcp:* node server.js
```

**Solutions**:
- Validate input parameters
- Check tool dependencies
- Verify file permissions
- Handle exceptions properly

#### Memory and Performance Issues
**Problem**: Server becomes unresponsive or crashes
```bash
Error: JavaScript heap out of memory
```

**Solutions**:
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 server.js

# Monitor resource usage
top -p $(pgrep -f mcp-server)

# Implement resource limits
ulimit -v 2097152  # 2GB virtual memory limit
```

#### Timeout Errors
**Problem**: Operations taking too long
```bash
Error: Request timeout after 30000ms
```

**Solutions**:
```javascript
// Increase timeout in client
const client = new MCPClient({ timeout: 60000 });

// Implement proper timeouts in server
server.tool("long_operation", "Long running operation", {}, async (args) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Operation timeout')), 30000)
  );

  const operation = performLongOperation(args);
  return Promise.race([operation, timeout]);
});
```

## Debugging Strategies

### Enable Comprehensive Logging

#### Server-Side Logging
```javascript
import { createLogger } from '@modelcontextprotocol/sdk/logging.js';

const logger = createLogger("mcp-server", {
  level: process.env.LOG_LEVEL || 'info',
  format: 'json',
  transports: [
    new winston.transports.File({ filename: 'mcp-server.log' }),
    new winston.transports.Console()
  ]
});

// Log all tool calls
server.tool("debug_tool", "Tool with debugging", {}, async (args) => {
  logger.info("Tool called", { tool: "debug_tool", args });

  try {
    const result = await processArgs(args);
    logger.info("Tool succeeded", { tool: "debug_tool", result });
    return result;
  } catch (error) {
    logger.error("Tool failed", { tool: "debug_tool", error: error.message, stack: error.stack });
    throw error;
  }
});
```

#### Client-Side Debugging
```bash
# Enable debug output
export DEBUG=mcp:*

# Verbose logging for Claude Code
echo '{"debug": true}' > ~/.config/claude/debug.json
```

### Network Debugging

#### HTTP Server Debugging
```bash
# Test HTTP endpoints directly
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'

# Monitor network traffic
tcpdump -i lo port 3000

# Use netcat for raw connections
echo '{"jsonrpc": "2.0", "id": 1, "method": "ping"}' | nc localhost 3000
```

#### WebSocket Debugging
```bash
# Test WebSocket connections
websocat ws://localhost:8080

# Monitor WebSocket traffic
wscat -c ws://localhost:8080
```

### Process Debugging

#### Monitor Server Processes
```bash
# List MCP server processes
ps aux | grep mcp-server

# Monitor file descriptors
lsof -p $(pgrep mcp-server)

# Check system limits
ulimit -a

# Monitor system calls
strace -p $(pgrep mcp-server)
```

#### Memory Profiling
```javascript
// Node.js memory profiling
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const usage = process.memoryUsage();
    console.log('Memory usage:', {
      rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB'
    });
  }, 10000);
}
```

## Best Practices

### Development Best Practices

#### Error Handling
```javascript
// Comprehensive error handling
server.tool("robust_tool", "Tool with proper error handling", {
  type: "object",
  properties: {
    input: { type: "string" }
  },
  required: ["input"]
}, async (args) => {
  try {
    // Validate input
    if (!args.input || args.input.trim().length === 0) {
      throw new Error("Input cannot be empty");
    }

    // Sanitize input
    const sanitizedInput = sanitizeInput(args.input);

    // Process with timeout
    const result = await Promise.race([
      processInput(sanitizedInput),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Operation timeout")), 30000)
      )
    ]);

    // Validate output
    if (!result) {
      throw new Error("No result generated");
    }

    return {
      content: [{ type: "text", text: result }]
    };

  } catch (error) {
    logger.error("Tool execution failed", {
      tool: "robust_tool",
      args,
      error: error.message,
      stack: error.stack
    });

    // Return user-friendly error
    return {
      content: [{
        type: "text",
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});
```

#### Input Validation and Sanitization
```javascript
import Joi from 'joi';
import DOMPurify from 'isomorphic-dompurify';

const validateAndSanitize = (schema, args) => {
  // Validate structure
  const { error, value } = schema.validate(args);
  if (error) {
    throw new Error(`Validation error: ${error.message}`);
  }

  // Sanitize string inputs
  const sanitized = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === 'string') {
      sanitized[key] = DOMPurify.sanitize(val);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
};
```

#### Resource Management
```javascript
class ResourceManager {
  constructor() {
    this.connections = new Map();
    this.cleanup = this.cleanup.bind(this);

    // Register cleanup handlers
    process.on('SIGINT', this.cleanup);
    process.on('SIGTERM', this.cleanup);
    process.on('uncaughtException', this.cleanup);
  }

  async getConnection(id) {
    if (!this.connections.has(id)) {
      const connection = await createConnection(id);
      this.connections.set(id, connection);
    }
    return this.connections.get(id);
  }

  async cleanup() {
    console.log('Cleaning up resources...');
    for (const [id, connection] of this.connections) {
      try {
        await connection.close();
        console.log(`Closed connection ${id}`);
      } catch (error) {
        console.error(`Error closing connection ${id}:`, error);
      }
    }
    this.connections.clear();
    process.exit(0);
  }
}
```

### Production Best Practices

#### Health Checks
```javascript
server.tool("health", "Health check endpoint", {}, async () => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version,
    dependencies: await checkDependencies()
  };

  return {
    content: [{ type: "text", text: JSON.stringify(health, null, 2) }]
  };
});

async function checkDependencies() {
  const checks = [];

  // Database connectivity
  try {
    await db.query('SELECT 1');
    checks.push({ name: 'database', status: 'healthy' });
  } catch (error) {
    checks.push({ name: 'database', status: 'unhealthy', error: error.message });
  }

  // External API connectivity
  try {
    await fetch('https://api.example.com/health', { timeout: 5000 });
    checks.push({ name: 'external_api', status: 'healthy' });
  } catch (error) {
    checks.push({ name: 'external_api', status: 'unhealthy', error: error.message });
  }

  return checks;
}
```

#### Monitoring and Metrics
```javascript
import prometheus from 'prom-client';

// Create metrics
const toolCallCounter = new prometheus.Counter({
  name: 'mcp_tool_calls_total',
  help: 'Total number of tool calls',
  labelNames: ['tool_name', 'status']
});

const toolCallDuration = new prometheus.Histogram({
  name: 'mcp_tool_call_duration_seconds',
  help: 'Duration of tool calls',
  labelNames: ['tool_name']
});

// Instrument tools
const instrumentTool = (originalTool) => {
  return async (args) => {
    const timer = toolCallDuration.startTimer({ tool_name: originalTool.name });

    try {
      const result = await originalTool.handler(args);
      toolCallCounter.inc({ tool_name: originalTool.name, status: 'success' });
      return result;
    } catch (error) {
      toolCallCounter.inc({ tool_name: originalTool.name, status: 'error' });
      throw error;
    } finally {
      timer();
    }
  };
};

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

#### Security Hardening
```javascript
// Rate limiting per tool
const toolRateLimits = new Map();

const rateLimitTool = (toolName, maxCalls, windowMs) => {
  return (originalHandler) => {
    return async (args) => {
      const now = Date.now();
      const windowStart = now - windowMs;

      if (!toolRateLimits.has(toolName)) {
        toolRateLimits.set(toolName, []);
      }

      const calls = toolRateLimits.get(toolName);
      const recentCalls = calls.filter(time => time > windowStart);

      if (recentCalls.length >= maxCalls) {
        throw new Error(`Rate limit exceeded for tool ${toolName}`);
      }

      calls.push(now);
      toolRateLimits.set(toolName, recentCalls.concat(now));

      return await originalHandler(args);
    };
  };
};

// Apply rate limiting
server.tool("limited_tool", "Rate limited tool", {},
  rateLimitTool("limited_tool", 10, 60000)( // 10 calls per minute
    async (args) => {
      return await processArgs(args);
    }
  )
);
```

### Testing Best Practices

#### Unit Testing
```javascript
// test/server.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { MCPServer } from '@modelcontextprotocol/sdk/server/stdio.js';

describe('MCP Server Tools', () => {
  let server;

  beforeEach(() => {
    server = new MCPServer({ name: "test", version: "1.0.0" });
    setupTestTools(server);
  });

  afterEach(async () => {
    await server.close();
  });

  test('should handle valid input', async () => {
    const result = await server.callTool("test_tool", { input: "valid" });
    expect(result.content[0].text).toContain("valid");
  });

  test('should reject invalid input', async () => {
    await expect(
      server.callTool("test_tool", { input: "" })
    ).rejects.toThrow('Input cannot be empty');
  });

  test('should handle timeout', async () => {
    await expect(
      server.callTool("slow_tool", {}, { timeout: 1000 })
    ).rejects.toThrow('timeout');
  });
});
```

#### Integration Testing
```javascript
// test/integration.test.js
import { spawn } from 'child_process';
import { WebSocket } from 'ws';

describe('MCP Server Integration', () => {
  let serverProcess;

  beforeAll((done) => {
    serverProcess = spawn('node', ['src/server.js'], {
      env: { ...process.env, PORT: '3001' }
    });

    // Wait for server to start
    setTimeout(done, 2000);
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  test('should respond to HTTP requests', async () => {
    const response = await fetch('http://localhost:3001/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.result).toBeDefined();
  });
});
```

#### Load Testing
```javascript
// test/load.test.js
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

if (isMainThread) {
  describe('Load Testing', () => {
    test('should handle concurrent requests', async () => {
      const workers = [];
      const numWorkers = 10;
      const requestsPerWorker = 100;

      for (let i = 0; i < numWorkers; i++) {
        workers.push(new Worker(__filename, {
          workerData: { requestsPerWorker }
        }));
      }

      const results = await Promise.all(
        workers.map(worker => new Promise((resolve) => {
          worker.on('message', resolve);
        }))
      );

      const totalRequests = results.reduce((sum, result) => sum + result.completed, 0);
      const avgResponseTime = results.reduce((sum, result) => sum + result.avgTime, 0) / results.length;

      expect(totalRequests).toBe(numWorkers * requestsPerWorker);
      expect(avgResponseTime).toBeLessThan(1000); // Less than 1 second average
    });
  });
} else {
  // Worker thread code
  (async () => {
    const { requestsPerWorker } = workerData;
    const times = [];

    for (let i = 0; i < requestsPerWorker; i++) {
      const start = Date.now();

      try {
        await fetch('http://localhost:3001/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: i,
            method: 'tools/call',
            params: { name: 'test_tool', arguments: {} }
          })
        });

        times.push(Date.now() - start);
      } catch (error) {
        console.error('Request failed:', error);
      }
    }

    parentPort.postMessage({
      completed: times.length,
      avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    });
  })();
}
```

## Maintenance and Operations

### Log Management
```bash
# Rotate logs
logrotate -f /etc/logrotate.d/mcp-server

# Monitor logs in real-time
tail -f /var/log/mcp-server.log | jq '.'

# Search logs
grep "ERROR" /var/log/mcp-server.log | tail -10
```

### Backup and Recovery
```bash
# Backup configuration
cp ~/.config/claude/claude_desktop_config.json ~/.config/claude/claude_desktop_config.json.backup

# Backup server state
tar -czf mcp-server-backup-$(date +%Y%m%d).tar.gz /path/to/server

# Restore configuration
cp ~/.config/claude/claude_desktop_config.json.backup ~/.config/claude/claude_desktop_config.json
```

### Performance Monitoring
```bash
# Monitor resource usage
watch -n 1 'ps aux | grep mcp-server'

# Network monitoring
netstat -tulpn | grep mcp

# Disk usage
du -sh /path/to/mcp-server/logs
```

### Automated Maintenance
```bash
#!/bin/bash
# maintenance.sh

# Cleanup old logs
find /var/log/mcp-server* -mtime +30 -delete

# Restart if memory usage too high
MEMORY_USAGE=$(ps -o pid,rss -p $(pgrep mcp-server) | awk 'NR==2{print $2}')
if [ "$MEMORY_USAGE" -gt 1048576 ]; then  # 1GB in KB
    echo "Memory usage high, restarting server"
    systemctl restart mcp-server
fi

# Health check
curl -f http://localhost:3000/health || systemctl restart mcp-server
```