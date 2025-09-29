# MCP TypeScript SDK Guide

> Complete guide to building Model Context Protocol servers and clients using the official TypeScript SDK

The MCP TypeScript SDK provides a robust, type-safe framework for building Model Context Protocol servers and clients. This guide covers everything from basic setup to advanced implementation patterns, enabling you to create powerful integrations that extend AI applications with custom tools, resources, and prompts.

## Overview

The Model Context Protocol (MCP) TypeScript SDK enables developers to build standardized servers that expose context and functionality to Large Language Models (LLMs). The SDK provides a structured approach to creating servers with resources, tools, and prompts while maintaining type safety and protocol compliance.

### Key Features

* **Type Safety**: Full TypeScript support with Zod schema validation
* **Flexible Architecture**: Support for resources, tools, and prompts
* **Multiple Transports**: STDIO, HTTP, and WebSocket connectivity
* **Context Awareness**: Dynamic parameter completion and intelligent suggestions
* **Async Operations**: Full support for asynchronous resource and tool handlers
* **Protocol Compliance**: Automatic JSON-RPC 2.0 message handling

## Installation and Setup

### Prerequisites

- Node.js v18.x or higher
- TypeScript 4.5 or higher (recommended)
- Basic understanding of async/await patterns

### Installation

Install the MCP TypeScript SDK using npm:

```bash
npm install @modelcontextprotocol/sdk
```

For TypeScript projects, ensure you have TypeScript installed:

```bash
npm install -D typescript @types/node
```

### Basic Server Setup

Create a basic MCP server with the following structure:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk';
import { z } from 'zod';

// Create server instance
const server = new McpServer({
  name: "my-app-server",
  version: "1.0.0"
});

// Start the server
async function main() {
  const transport = /* configure transport */;
  await server.connect(transport);
  console.log('MCP Server running');
}

main().catch(console.error);
```

## Core Concepts

### 1. Resources

Resources provide data to LLM applications without significant computation. They function similarly to REST GET endpoints and can be static or dynamically generated.

#### Static Resources

```typescript
// Register a simple text resource
server.registerResource("company-info", {
  title: "Company Information",
  description: "Basic information about our company",
  mimeType: "text/plain"
}, async () => ({
  content: [{
    type: "text",
    text: "TechCorp - Leading provider of innovative solutions since 2020"
  }]
}));

// Register a JSON resource
server.registerResource("api-schema", {
  title: "API Schema",
  description: "OpenAPI schema for our REST API",
  mimeType: "application/json"
}, async () => ({
  content: [{
    type: "text",
    text: JSON.stringify({
      openapi: "3.0.0",
      info: { title: "API", version: "1.0.0" },
      paths: {}
    })
  }]
}));
```

#### Dynamic Resources with Parameters

```typescript
// Resource with parameter validation
server.registerResource("user-profile", {
  title: "User Profile",
  description: "Retrieve user profile information",
  inputSchema: z.object({
    userId: z.string().min(1),
    includePrivate: z.boolean().optional()
  })
}, async ({ userId, includePrivate = false }) => {
  const user = await getUserById(userId);
  const profile = includePrivate ? user : sanitizeUser(user);

  return {
    content: [{
      type: "text",
      text: JSON.stringify(profile, null, 2)
    }]
  };
});
```

#### Context-Aware Parameter Completion

```typescript
// Resource with intelligent parameter suggestions
server.registerResource("file-content", {
  title: "File Content",
  description: "Read file contents from project directory",
  inputSchema: z.object({
    path: z.string(),
    encoding: z.enum(["utf8", "base64"]).default("utf8")
  })
}, async ({ path, encoding }) => {
  // Implementation
}, {
  // Provide context-aware completions
  parameterCompletion: async (paramName, currentValue) => {
    if (paramName === "path") {
      const files = await listProjectFiles(currentValue);
      return files.map(file => ({
        value: file.path,
        label: file.name,
        description: file.type
      }));
    }
    return [];
  }
});
```

### 2. Tools

Tools perform actions and computations, potentially with side effects. They enable LLM applications to execute operations and retrieve results.

#### Basic Tool Implementation

```typescript
// Simple calculation tool
server.registerTool("calculator", {
  title: "Calculator",
  description: "Perform mathematical calculations",
  inputSchema: z.object({
    expression: z.string().min(1),
    precision: z.number().int().min(0).max(10).default(2)
  })
}, async ({ expression, precision }) => {
  try {
    // Safe evaluation (implement proper expression parser)
    const result = evaluateExpression(expression);
    return {
      content: [{
        type: "text",
        text: `Result: ${result.toFixed(precision)}`
      }]
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

#### Advanced Tool with External API Integration

```typescript
// Weather tool with external API
server.registerTool("get-weather", {
  title: "Weather Information",
  description: "Get current weather for a location",
  inputSchema: z.object({
    location: z.string().min(1),
    units: z.enum(["metric", "imperial", "kelvin"]).default("metric"),
    includeHourly: z.boolean().default(false)
  })
}, async ({ location, units, includeHourly }) => {
  try {
    const weatherData = await fetchWeatherData(location, units);

    let content = [`Current weather in ${location}:`];
    content.push(`Temperature: ${weatherData.temperature}°${getUnitSymbol(units)}`);
    content.push(`Conditions: ${weatherData.description}`);
    content.push(`Humidity: ${weatherData.humidity}%`);

    if (includeHourly && weatherData.hourly) {
      content.push('\nHourly Forecast:');
      weatherData.hourly.slice(0, 12).forEach(hour => {
        content.push(`${hour.time}: ${hour.temp}° - ${hour.conditions}`);
      });
    }

    return {
      content: [{
        type: "text",
        text: content.join('\n')
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Unable to fetch weather data: ${error.message}`
      }],
      isError: true
    };
  }
});
```

#### Tool with Resource Links

```typescript
// File management tool that returns resource references
server.registerTool("create-document", {
  title: "Create Document",
  description: "Create a new document and return a reference",
  inputSchema: z.object({
    filename: z.string(),
    content: z.string(),
    format: z.enum(["markdown", "text", "json"]).default("text")
  })
}, async ({ filename, content, format }) => {
  const filePath = await createDocument(filename, content, format);
  const fileId = generateFileId(filePath);

  return {
    content: [{
      type: "text",
      text: `Document created successfully: ${filename}`
    }],
    meta: {
      resources: [{
        uri: `file:///${filePath}`,
        name: filename,
        description: `${format} document`
      }]
    }
  };
});
```

### 3. Prompts

Prompts provide reusable interaction templates that define message structures for LLM interactions.

#### Basic Prompt Template

```typescript
// Code review prompt
server.registerPrompt("code-review", {
  title: "Code Review Assistant",
  description: "Analyze code for best practices and potential issues",
  arguments: z.object({
    language: z.string(),
    style: z.enum(["strict", "moderate", "lenient"]).default("moderate"),
    focus: z.array(z.enum(["security", "performance", "readability", "maintainability"]))
  })
}, async ({ language, style, focus }) => {
  const instructions = [
    `Review the following ${language} code with ${style} standards.`,
    `Focus areas: ${focus.join(', ')}.`,
    "",
    "Provide specific feedback on:",
    "1. Code structure and organization",
    "2. Potential bugs or issues",
    "3. Best practice adherence",
    "4. Suggestions for improvement"
  ];

  return {
    messages: [{
      role: "system",
      content: {
        type: "text",
        text: instructions.join('\n')
      }
    }, {
      role: "user",
      content: {
        type: "text",
        text: "Please paste the code you'd like me to review."
      }
    }]
  };
});
```

#### Dynamic Prompt with Context

```typescript
// Project-aware documentation prompt
server.registerPrompt("document-feature", {
  title: "Feature Documentation Generator",
  description: "Generate documentation for a specific feature",
  arguments: z.object({
    featureName: z.string(),
    includeExamples: z.boolean().default(true),
    audience: z.enum(["developer", "user", "admin"]).default("user")
  })
}, async ({ featureName, includeExamples, audience }) => {
  const projectContext = await getProjectContext();
  const featureInfo = await getFeatureInfo(featureName);

  const systemPrompt = `
You are a technical writer creating ${audience}-focused documentation.

Project Context:
- Name: ${projectContext.name}
- Framework: ${projectContext.framework}
- Version: ${projectContext.version}

Feature Information:
- Name: ${featureInfo.name}
- Type: ${featureInfo.type}
- Dependencies: ${featureInfo.dependencies.join(', ')}

Create comprehensive documentation that includes:
1. Feature overview and purpose
2. Prerequisites and setup
3. Usage instructions
${includeExamples ? '4. Code examples and demonstrations' : ''}
5. Troubleshooting common issues

Write for ${audience} audience level.`;

  return {
    messages: [{
      role: "system",
      content: { type: "text", text: systemPrompt }
    }, {
      role: "user",
      content: {
        type: "text",
        text: `Please generate documentation for the ${featureName} feature.`
      }
    }]
  };
});
```

## Transport Configuration

### STDIO Transport

STDIO transport is ideal for local development and command-line integration:

```typescript
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Server configuration for STDIO
async function createStdioServer() {
  const server = new McpServer({
    name: "stdio-server",
    version: "1.0.0"
  });

  // Register resources, tools, prompts...

  // Connect using STDIO
  const transport = new StdioClientTransport({
    command: "node",
    args: ["server.js"]
  });

  await server.connect(transport);
  return server;
}
```

### HTTP Transport

HTTP transport enables remote server deployment:

```typescript
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';

// HTTP server with Server-Sent Events
async function createHttpServer() {
  const app = express();
  const server = new McpServer({
    name: "http-server",
    version: "1.0.0"
  });

  // Register resources, tools, prompts...

  // Configure SSE transport
  const transport = new SSEServerTransport("/message", app);
  await server.connect(transport);

  app.listen(3000, () => {
    console.log('MCP Server running on http://localhost:3000');
  });

  return server;
}
```

### WebSocket Transport

For real-time bidirectional communication:

```typescript
import { WebSocketTransport } from '@modelcontextprotocol/sdk/transport/websocket.js';
import WebSocket from 'ws';

// WebSocket server setup
async function createWebSocketServer() {
  const wss = new WebSocket.Server({ port: 8080 });

  wss.on('connection', async (ws) => {
    const transport = new WebSocketTransport(ws);
    const server = new McpServer({
      name: "websocket-server",
      version: "1.0.0"
    });

    // Register resources, tools, prompts...

    await server.connect(transport);
  });
}
```

## Advanced Patterns

### Error Handling and Validation

```typescript
// Robust error handling
server.registerTool("process-data", {
  title: "Data Processor",
  description: "Process and validate data",
  inputSchema: z.object({
    data: z.array(z.object({
      id: z.string(),
      value: z.number()
    })),
    operation: z.enum(["sum", "average", "max", "min"])
  })
}, async ({ data, operation }) => {
  try {
    // Input validation
    if (data.length === 0) {
      throw new Error("Data array cannot be empty");
    }

    // Data processing
    const values = data.map(item => item.value);
    let result: number;

    switch (operation) {
      case "sum":
        result = values.reduce((a, b) => a + b, 0);
        break;
      case "average":
        result = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case "max":
        result = Math.max(...values);
        break;
      case "min":
        result = Math.min(...values);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return {
      content: [{
        type: "text",
        text: `${operation.toUpperCase()}: ${result}`
      }],
      meta: {
        processed: data.length,
        operation,
        result
      }
    };

  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Processing failed: ${error.message}`
      }],
      isError: true
    };
  }
});
```

### State Management and Caching

```typescript
// Server with state management
class StatefulMcpServer {
  private cache = new Map<string, any>();
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: "stateful-server",
      version: "1.0.0"
    });

    this.setupTools();
  }

  private setupTools() {
    // Cache management tool
    this.server.registerTool("cache-set", {
      title: "Set Cache Value",
      description: "Store a value in server cache",
      inputSchema: z.object({
        key: z.string(),
        value: z.any(),
        ttl: z.number().optional()
      })
    }, async ({ key, value, ttl }) => {
      this.cache.set(key, { value, expires: ttl ? Date.now() + ttl * 1000 : null });

      return {
        content: [{
          type: "text",
          text: `Cached value for key: ${key}`
        }]
      };
    });

    // Cache retrieval tool
    this.server.registerTool("cache-get", {
      title: "Get Cache Value",
      description: "Retrieve a value from server cache",
      inputSchema: z.object({
        key: z.string()
      })
    }, async ({ key }) => {
      const cached = this.cache.get(key);

      if (!cached) {
        return {
          content: [{
            type: "text",
            text: `No value found for key: ${key}`
          }],
          isError: true
        };
      }

      // Check expiration
      if (cached.expires && Date.now() > cached.expires) {
        this.cache.delete(key);
        return {
          content: [{
            type: "text",
            text: `Value for key ${key} has expired`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(cached.value, null, 2)
        }]
      };
    });
  }
}
```

### Middleware and Interceptors

```typescript
// Server with middleware support
class MiddlewareMcpServer {
  private server: McpServer;
  private middleware: Array<(context: any, next: () => Promise<any>) => Promise<any>> = [];

  constructor() {
    this.server = new McpServer({
      name: "middleware-server",
      version: "1.0.0"
    });
  }

  // Add middleware
  use(middleware: (context: any, next: () => Promise<any>) => Promise<any>) {
    this.middleware.push(middleware);
  }

  // Wrapped tool registration with middleware
  registerToolWithMiddleware(name: string, definition: any, handler: any) {
    const wrappedHandler = async (params: any) => {
      let index = 0;
      const context = { toolName: name, params, startTime: Date.now() };

      const next = async (): Promise<any> => {
        if (index < this.middleware.length) {
          return await this.middleware[index++](context, next);
        }
        return await handler(params);
      };

      return await next();
    };

    this.server.registerTool(name, definition, wrappedHandler);
  }
}

// Usage with middleware
const server = new MiddlewareMcpServer();

// Logging middleware
server.use(async (context, next) => {
  console.log(`[${new Date().toISOString()}] Tool called: ${context.toolName}`);
  const result = await next();
  const duration = Date.now() - context.startTime;
  console.log(`[${new Date().toISOString()}] Tool completed: ${context.toolName} (${duration}ms)`);
  return result;
});

// Authentication middleware
server.use(async (context, next) => {
  if (context.params.authToken) {
    const isValid = await validateAuthToken(context.params.authToken);
    if (!isValid) {
      throw new Error("Invalid authentication token");
    }
  }
  return await next();
});
```

## Testing Strategies

### Unit Testing Tools

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk';

describe('MCP Server Tests', () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({
      name: "test-server",
      version: "1.0.0"
    });
  });

  describe('Calculator Tool', () => {
    beforeEach(() => {
      server.registerTool("calculator", {
        title: "Calculator",
        inputSchema: z.object({
          expression: z.string()
        })
      }, async ({ expression }) => {
        const result = eval(expression); // Simplified for testing
        return {
          content: [{ type: "text", text: String(result) }]
        };
      });
    });

    it('should perform basic addition', async () => {
      const result = await server.callTool("calculator", { expression: "2 + 3" });
      expect(result.content[0].text).toBe("5");
    });

    it('should handle invalid expressions', async () => {
      const result = await server.callTool("calculator", { expression: "invalid" });
      expect(result.isError).toBe(true);
    });
  });

  describe('Resource Tests', () => {
    beforeEach(() => {
      server.registerResource("test-data", {
        title: "Test Data",
        inputSchema: z.object({
          format: z.enum(["json", "text"])
        })
      }, async ({ format }) => {
        const data = { message: "test" };
        return {
          content: [{
            type: "text",
            text: format === "json" ? JSON.stringify(data) : data.message
          }]
        };
      });
    });

    it('should return JSON format', async () => {
      const result = await server.getResource("test-data", { format: "json" });
      expect(JSON.parse(result.content[0].text)).toEqual({ message: "test" });
    });
  });
});
```

### Integration Testing

```typescript
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

describe('Integration Tests', () => {
  it('should connect and execute tools via STDIO', async () => {
    const serverProcess = spawn('node', ['dist/server.js']);
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/server.js']
    });

    try {
      // Test connection
      await transport.connect();

      // Test tool execution
      const result = await transport.request({
        method: 'tools/call',
        params: {
          name: 'calculator',
          arguments: { expression: '10 * 5' }
        }
      });

      expect(result.content[0].text).toBe('50');
    } finally {
      serverProcess.kill();
      await transport.close();
    }
  });
});
```

## Performance Optimization

### Caching and Memoization

```typescript
// Cache decorator for expensive operations
function cached(ttl: number = 60000) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const cache = new Map();
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const key = JSON.stringify(args);
      const cached = cache.get(key);

      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.value;
      }

      const result = await originalMethod.apply(this, args);
      cache.set(key, { value: result, timestamp: Date.now() });

      return result;
    };
  };
}

// Usage in server class
class OptimizedMcpServer {
  constructor() {
    this.server = new McpServer({
      name: "optimized-server",
      version: "1.0.0"
    });
    this.setupTools();
  }

  @cached(30000) // Cache for 30 seconds
  private async fetchExpensiveData(query: string) {
    // Expensive operation
    return await performComplexCalculation(query);
  }
}
```

### Streaming and Batching

```typescript
// Streaming response for large datasets
server.registerTool("process-large-dataset", {
  title: "Process Large Dataset",
  inputSchema: z.object({
    dataSource: z.string(),
    batchSize: z.number().default(100)
  })
}, async ({ dataSource, batchSize }) => {
  const totalRecords = await getDatasetSize(dataSource);
  const batches = Math.ceil(totalRecords / batchSize);

  let processedCount = 0;
  const results: string[] = [];

  for (let i = 0; i < batches; i++) {
    const batch = await fetchDataBatch(dataSource, i * batchSize, batchSize);
    const processed = await processBatch(batch);

    processedCount += batch.length;
    results.push(`Batch ${i + 1}: ${processed.summary}`);

    // Report progress
    console.log(`Progress: ${processedCount}/${totalRecords} (${((processedCount/totalRecords) * 100).toFixed(1)}%)`);
  }

  return {
    content: [{
      type: "text",
      text: `Processed ${processedCount} records in ${batches} batches:\n${results.join('\n')}`
    }],
    meta: {
      totalRecords,
      batchesProcessed: batches,
      performance: {
        recordsPerSecond: processedCount / (Date.now() - startTime) * 1000
      }
    }
  };
});
```

## Deployment Strategies

### Docker Deployment

```dockerfile
# Dockerfile for MCP server
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/
COPY config/ ./config/

# Create non-root user
RUN addgroup -g 1001 -S mcpserver && \
    adduser -S mcpserver -u 1001

USER mcpserver

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    volumes:
      - ./config:/app/config:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Production Configuration

```typescript
// Production server setup
import { McpServer } from '@modelcontextprotocol/sdk';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

class ProductionMcpServer {
  private app: express.Application;
  private server: McpServer;

  constructor() {
    this.app = express();
    this.server = new McpServer({
      name: "production-server",
      version: process.env.APP_VERSION || "1.0.0"
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupMcpServer();
  }

  private setupMiddleware() {
    // Security middleware
    this.app.use(helmet());

    // Rate limiting
    this.app.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      // Implement metrics collection
      res.json(this.getMetrics());
    });
  }

  private getMetrics() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
  }

  public async start(port: number = 3000) {
    await this.server.connect(/* transport configuration */);

    this.app.listen(port, () => {
      console.log(`Production MCP server running on port ${port}`);
    });
  }
}

// Start production server
if (require.main === module) {
  const server = new ProductionMcpServer();
  server.start(parseInt(process.env.PORT || '3000'))
    .catch(console.error);
}
```

## Best Practices

### Security Considerations

1. **Input Validation**: Always validate inputs using Zod schemas
2. **Error Handling**: Never expose internal errors to clients
3. **Rate Limiting**: Implement appropriate rate limiting for tools
4. **Authentication**: Secure tools that perform sensitive operations
5. **Logging**: Log all important operations for audit trails

### Performance Guidelines

1. **Caching**: Cache expensive operations when appropriate
2. **Batching**: Process large datasets in batches
3. **Async Operations**: Use async/await for I/O operations
4. **Resource Cleanup**: Properly clean up resources and connections
5. **Monitoring**: Implement health checks and metrics

### Development Workflow

1. **Type Safety**: Leverage TypeScript for better development experience
2. **Testing**: Write comprehensive unit and integration tests
3. **Documentation**: Document all tools, resources, and prompts
4. **Version Management**: Use semantic versioning for server versions
5. **Configuration**: Use environment-based configuration management

This comprehensive guide provides the foundation for building robust, production-ready MCP servers using the TypeScript SDK. The examples demonstrate real-world patterns and best practices for creating powerful integrations that extend AI applications with custom functionality.