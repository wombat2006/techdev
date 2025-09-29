# MCP Integration Guide

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **Python**: Version 3.8+ (for Python-based servers)
- **uv**: Python package manager (for Serena and similar servers)
- **NPM/NPX**: For JavaScript-based servers

### Development Environment
```bash
# Install MCP SDK
npm install @modelcontextprotocol/sdk

# For Python servers
pip install mcp

# For UV-based servers
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## Configuration Patterns

### Claude Code Integration

#### Basic Configuration Structure
```json
{
  "mcpServers": {
    "server-name": {
      "command": "executable",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}
```

#### Common Server Configurations

**Serena (Code Analysis)**
```json
{
  "serena": {
    "command": "uv",
    "args": [
      "run",
      "--directory", "/path/to/serena-mcp",
      "serena",
      "start-mcp-server",
      "--transport", "stdio",
      "--project", "/path/to/project"
    ],
    "env": {
      "PYTHONPATH": "/path/to/serena-mcp"
    }
  }
}
```

**Context7 (Documentation)**
```json
{
  "context7": {
    "command": "npx",
    "args": ["@upstash/context7-mcp"],
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

**GitHub Integration**
```json
{
  "github": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
    }
  }
}
```

### HTTP Server Integration

#### Server Setup
```javascript
import { MCPServer } from '@modelcontextprotocol/sdk/server/http.js';
import express from 'express';

const app = express();
const server = new MCPServer({
  name: "my-mcp-server",
  version: "1.0.0"
});

// Tool registration
server.tool("example_tool", "Example tool description", {
  type: "object",
  properties: {
    query: { type: "string", description: "Query parameter" }
  },
  required: ["query"]
}, async (args) => {
  return {
    content: [
      { type: "text", text: `Result for: ${args.query}` }
    ]
  };
});

app.use('/mcp', server.router);
app.listen(3000);
```

#### Client Configuration
```json
{
  "http-server": {
    "command": "curl",
    "args": [
      "-X", "POST",
      "http://localhost:3000/mcp",
      "-H", "Content-Type: application/json"
    ]
  }
}
```

### WebSocket Integration

#### Server Implementation
```javascript
import { MCPServer } from '@modelcontextprotocol/sdk/server/websocket.js';

const server = new MCPServer({
  name: "websocket-server",
  version: "1.0.0",
  transport: "websocket",
  port: 8080
});

server.start();
```

#### Client Configuration
```json
{
  "websocket-server": {
    "command": "websocat",
    "args": ["ws://localhost:8080"]
  }
}
```

## Development Workflow

### Creating a Custom MCP Server

#### 1. Project Setup
```bash
mkdir my-mcp-server
cd my-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk
```

#### 2. Basic Server Implementation
```javascript
// src/server.js
import { MCPServer } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new MCPServer({
  name: "my-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {},
    resources: {},
    prompts: {}
  }
});

// Tool implementation
server.tool("hello_world", "Says hello", {
  type: "object",
  properties: {
    name: { type: "string", description: "Name to greet" }
  }
}, async (args) => {
  return {
    content: [
      { type: "text", text: `Hello, ${args.name || 'World'}!` }
    ]
  };
});

// Resource implementation
server.resource(
  "example://info",
  "Application information",
  "application/json",
  async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            name: "My MCP Server",
            version: "1.0.0",
            status: "running"
          }, null, 2)
        }
      ]
    };
  }
);

// Prompt implementation
server.prompt("greet_user", "Greet a user", [
  { name: "username", type: "string", required: true }
], async (args) => {
  return {
    description: `Greeting prompt for ${args.username}`,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please greet ${args.username} in a friendly manner.`
        }
      }
    ]
  };
});

server.run();
```

#### 3. Package Configuration
```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "my-mcp-server": "./src/server.js"
  },
  "scripts": {
    "start": "node src/server.js"
  }
}
```

#### 4. Installation & Testing
```bash
# Local installation
npm link

# Test the server
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | my-mcp-server
```

### Advanced Patterns

#### Resource Templates
```javascript
// Dynamic resource with parameters
server.resourceTemplate(
  "files://path/{filename}",
  "File contents",
  "text/plain",
  async (uri) => {
    const filename = uri.split('/').pop();
    const content = await fs.readFile(filename, 'utf8');
    return {
      content: [{ type: "text", text: content }]
    };
  }
);
```

#### Error Handling
```javascript
server.tool("risky_operation", "Operation that might fail", {
  type: "object",
  properties: {
    input: { type: "string" }
  }
}, async (args) => {
  try {
    const result = await performRiskyOperation(args.input);
    return {
      content: [{ type: "text", text: result }]
    };
  } catch (error) {
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

#### State Management
```javascript
class StatefulMCPServer {
  constructor() {
    this.state = new Map();
    this.server = new MCPServer({
      name: "stateful-server",
      version: "1.0.0"
    });

    this.setupTools();
  }

  setupTools() {
    this.server.tool("set_value", "Set a state value", {
      type: "object",
      properties: {
        key: { type: "string" },
        value: { type: "string" }
      }
    }, async (args) => {
      this.state.set(args.key, args.value);
      return {
        content: [{ type: "text", text: `Set ${args.key} = ${args.value}` }]
      };
    });

    this.server.tool("get_value", "Get a state value", {
      type: "object",
      properties: {
        key: { type: "string" }
      }
    }, async (args) => {
      const value = this.state.get(args.key);
      return {
        content: [{ type: "text", text: value || "Not found" }]
      };
    });
  }
}
```

## Testing & Debugging

### Unit Testing
```javascript
// test/server.test.js
import { MCPServer } from '@modelcontextprotocol/sdk/server/stdio.js';
import { jest } from '@jest/globals';

describe('MCP Server', () => {
  let server;

  beforeEach(() => {
    server = new MCPServer({ name: "test", version: "1.0.0" });
  });

  test('tool execution', async () => {
    server.tool("test_tool", "Test tool", {}, async (args) => {
      return { content: [{ type: "text", text: "success" }] };
    });

    const result = await server.callTool("test_tool", {});
    expect(result.content[0].text).toBe("success");
  });
});
```

### Integration Testing
```bash
# Test server connectivity
echo '{"jsonrpc": "2.0", "id": 1, "method": "ping"}' | my-mcp-server

# Test tool listing
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | my-mcp-server

# Test tool execution
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "hello_world", "arguments": {"name": "Test"}}}' | my-mcp-server
```

### Debugging Techniques

#### Logging
```javascript
import { createLogger } from '@modelcontextprotocol/sdk/logging.js';

const logger = createLogger("my-server");

server.tool("debug_tool", "Tool with logging", {}, async (args) => {
  logger.info("Tool called with args:", args);
  try {
    const result = await processArgs(args);
    logger.info("Tool succeeded:", result);
    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    logger.error("Tool failed:", error);
    throw error;
  }
});
```

#### Development Mode
```javascript
const server = new MCPServer({
  name: "dev-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {},
    resources: {},
    prompts: {}
  },
  debug: process.env.NODE_ENV === 'development'
});
```

## Deployment Strategies

### Local Development
```bash
# Development with hot reload
nodemon src/server.js

# Debug mode
NODE_ENV=development DEBUG=mcp:* node src/server.js
```

### Production Deployment

#### Docker Container
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
EXPOSE 3000

CMD ["node", "src/server.js"]
```

#### Process Management
```bash
# Using PM2
pm2 start src/server.js --name mcp-server

# Using systemd
sudo systemctl enable mcp-server
sudo systemctl start mcp-server
```

#### Health Monitoring
```javascript
server.tool("health_check", "Server health status", {}, async () => {
  const status = {
    status: "healthy",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };

  return {
    content: [{ type: "text", text: JSON.stringify(status, null, 2) }]
  };
});
```

## Security Considerations

### Authentication
```javascript
// Token-based authentication
server.middleware((req, res, next) => {
  const token = req.headers['authorization'];
  if (!validateToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### Input Validation
```javascript
import Joi from 'joi';

const schema = Joi.object({
  query: Joi.string().min(1).max(1000).required(),
  options: Joi.object().optional()
});

server.tool("validated_tool", "Tool with validation", {}, async (args) => {
  const { error, value } = schema.validate(args);
  if (error) {
    throw new Error(`Validation error: ${error.message}`);
  }

  return processValidatedArgs(value);
});
```

### Sandboxing
```javascript
import { spawn } from 'child_process';

server.tool("safe_execution", "Execute in sandbox", {
  type: "object",
  properties: {
    command: { type: "string" }
  }
}, async (args) => {
  return new Promise((resolve, reject) => {
    const child = spawn('sandbox-runner', [args.command], {
      timeout: 5000,
      stdio: 'pipe'
    });

    let output = '';
    child.stdout.on('data', (data) => output += data);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ content: [{ type: "text", text: output }] });
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
});
```

## Performance Optimization

### Caching
```javascript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

server.tool("cached_operation", "Operation with caching", {}, async (args) => {
  const cacheKey = JSON.stringify(args);
  let result = cache.get(cacheKey);

  if (!result) {
    result = await expensiveOperation(args);
    cache.set(cacheKey, result);
  }

  return { content: [{ type: "text", text: result }] };
});
```

### Connection Pooling
```javascript
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000
});

server.tool("db_query", "Database query", {}, async (args) => {
  const client = await pool.connect();
  try {
    const result = await client.query(args.sql, args.params);
    return { content: [{ type: "text", text: JSON.stringify(result.rows) }] };
  } finally {
    client.release();
  }
});
```

### Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/mcp', limiter);
```

## Migration & Upgrading

### Version Compatibility
```javascript
const server = new MCPServer({
  name: "versioned-server",
  version: "2.0.0",
  protocolVersion: "2024-11-05"
});

// Backward compatibility
server.tool("legacy_tool", "Deprecated tool", {}, async (args) => {
  console.warn("legacy_tool is deprecated, use new_tool instead");
  return await newToolImplementation(args);
});
```

### Schema Evolution
```javascript
// Support multiple schema versions
const schemas = {
  v1: { type: "string" },
  v2: {
    type: "object",
    properties: {
      query: { type: "string" },
      version: { type: "string", default: "v2" }
    }
  }
};

server.tool("flexible_tool", "Tool with schema evolution", schemas.v2, async (args) => {
  // Handle both v1 (string) and v2 (object) inputs
  const query = typeof args === 'string' ? args : args.query;
  return processQuery(query);
});
```