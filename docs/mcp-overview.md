# Model Context Protocol (MCP) Overview

## What is MCP?

Model Context Protocol (MCP) is a standardized protocol that enables AI applications to securely connect with external systems and data sources. It provides a unified interface for tools, resources, and prompts that can be used by Large Language Models (LLMs).

## Core Concepts

### Three Building Blocks

MCP operates through three fundamental components:

#### 1. **Tools** (Model-Controlled)
- Functions that LLMs can actively call
- Perform actions like API calls, file modifications, database operations
- Executed based on model decisions and user context
- Examples: `searchFlights()`, `sendEmail()`, `createFile()`

#### 2. **Resources** (Application-Controlled)
- Passive data sources providing read-only information
- Used for context and background information
- Examples: document contents, database schemas, API documentation
- Support both direct URIs and parameterized templates

#### 3. **Prompts** (User-Controlled)
- Pre-built instruction templates
- Structured workflows with defined parameters
- Examples: "Plan vacation", "Code review", "Summarize meeting"

## Transport Protocols

### STDIO Transport
- **Use Case**: Local development, Claude Code integration
- **Configuration**: Command-line interface with stdin/stdout
- **Security**: Process isolation, no network exposure

### HTTP Transport
- **Use Case**: Web applications, remote services
- **Configuration**: REST API endpoints
- **Security**: Authentication tokens, HTTPS encryption

### WebSocket Transport
- **Use Case**: Real-time applications, streaming data
- **Configuration**: Persistent connection
- **Security**: Token-based auth, message validation

## Security Model

### Permission Levels
- **Tool Execution**: User consent required for actions
- **Resource Access**: Application-controlled data exposure
- **Prompt Invocation**: Explicit user selection

### Safety Mechanisms
- Input validation and sanitization
- Approval workflows for sensitive operations
- Activity logging and audit trails
- Sandboxed execution environments

## Integration Patterns

### Client-Server Architecture
```
AI Application (Client) ←→ MCP Server (Provider)
```

### Multi-Server Orchestration
```
AI Application ←→ MCP Server A (Files)
              ←→ MCP Server B (Database)
              ←→ MCP Server C (APIs)
```

### Aggregator Pattern
```
AI Application ←→ MCP Aggregator ←→ Multiple MCP Servers
```

## Common Use Cases

### Development Tools
- **Code Analysis**: Serena MCP (26 tools for code editing)
- **Documentation**: Context7 (library documentation)
- **Version Control**: Git operations and repository management

### Data Integration
- **File Systems**: Local and cloud storage access
- **Databases**: Query execution and schema introspection
- **APIs**: External service integration

### Productivity
- **Calendar**: Schedule management and availability
- **Email**: Communication and notifications
- **Project Management**: Task tracking and collaboration

## Protocol Operations

### Tool Management
```javascript
// List available tools
tools/list → Array<ToolDefinition>

// Execute tool
tools/call(name, arguments) → ToolResult
```

### Resource Management
```javascript
// List resources
resources/list → Array<ResourceInfo>
resources/templates/list → Array<ResourceTemplate>

// Read resource
resources/read(uri) → ResourceContents
```

### Prompt Management
```javascript
// List prompts
prompts/list → Array<PromptInfo>

// Get prompt
prompts/get(name, arguments) → PromptDefinition
```

## Configuration Example

### Claude Code Configuration
```json
{
  "mcpServers": {
    "serena": {
      "command": "uv",
      "args": [
        "run", "--directory", "/path/to/serena-mcp",
        "serena", "start-mcp-server",
        "--transport", "stdio",
        "--project", "/path/to/project"
      ],
      "env": {
        "PYTHONPATH": "/path/to/serena-mcp"
      }
    }
  }
}
```

### HTTP Server Configuration
```javascript
const server = new MCPServer({
  name: "example-server",
  version: "1.0.0",
  transport: "http",
  port: 3000,
  capabilities: {
    tools: {},
    resources: {},
    prompts: {}
  }
});
```

## Benefits

### For Developers
- **Standardization**: Consistent interface across tools
- **Security**: Built-in permission and validation systems
- **Flexibility**: Support for multiple transport protocols
- **Composability**: Combine multiple servers seamlessly

### For Users
- **Discoverability**: Unified interface for all capabilities
- **Control**: Explicit approval for sensitive operations
- **Transparency**: Clear visibility into tool execution
- **Efficiency**: Streamlined workflows through prompts

## Getting Started

1. **Choose Transport**: STDIO for local, HTTP for remote
2. **Define Capabilities**: Tools, resources, or prompts
3. **Implement Handlers**: Business logic for each capability
4. **Configure Client**: Add server to application config
5. **Test Integration**: Verify functionality and security

## Next Steps

- [MCP Server Types and Capabilities](./mcp-server-types.md)
- [MCP Integration Guide](./mcp-integration-guide.md)
- [Troubleshooting and Best Practices](./mcp-troubleshooting.md)