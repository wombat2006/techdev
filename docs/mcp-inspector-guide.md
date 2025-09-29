# MCP Inspector Guide

> In-depth guide to using the MCP Inspector for testing and debugging Model Context Protocol servers

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is an interactive developer tool for testing and debugging MCP servers. While debugging can be done in various ways, the Inspector provides a comprehensive visual interface for testing all aspects of MCP server functionality. This document provides a detailed exploration of the Inspector's features and capabilities.

## Overview

The MCP Inspector is a powerful development tool that enables developers to:

* **Test MCP servers interactively** - Connect to and interact with servers in real-time
* **Debug server implementations** - Monitor messages, logs, and server responses
* **Validate server behavior** - Ensure tools, resources, and prompts work correctly
* **Prototype integrations** - Test server functionality before building client applications
* **Monitor protocol compliance** - Verify JSON-RPC 2.0 message handling

The Inspector provides a visual interface for all MCP primitives (tools, resources, prompts) and real-time monitoring of server communications.

## Getting Started

### Installation and Basic Usage

The Inspector runs directly through `npx` without requiring installation:

```bash
npx @modelcontextprotocol/inspector <command>
```

```bash
npx @modelcontextprotocol/inspector <command> <arg1> <arg2>
```

This approach ensures you always use the latest version and avoids local dependency management.

### Inspecting Servers from Package Repositories

#### NPM Packages

For servers distributed through NPM:

```bash
npx -y @modelcontextprotocol/inspector npx <package-name> <args>
```

**Examples**:
```bash
# Filesystem server
npx -y @modelcontextprotocol/inspector npx @modelcontextprotocol/server-filesystem /Users/username/Desktop

# GitHub server
npx -y @modelcontextprotocol/inspector npx @modelcontextprotocol/server-github

# SQLite server
npx -y @modelcontextprotocol/inspector npx @modelcontextprotocol/server-sqlite /path/to/database.db

# Brave Search server
npx -y @modelcontextprotocol/inspector npx @modelcontextprotocol/server-brave-search
```

#### PyPI Packages

For Python-based servers distributed through PyPI:

```bash
npx @modelcontextprotocol/inspector uvx <package-name> <args>
```

**Examples**:
```bash
# Git server
npx @modelcontextprotocol/inspector uvx mcp-server-git --repository ~/code/mcp/servers.git

# PostgreSQL server
npx @modelcontextprotocol/inspector uvx mcp-server-postgres --host localhost --database mydb

# AWS server
npx @modelcontextprotocol/inspector uvx mcp-server-aws --region us-east-1
```

### Inspecting Locally Developed Servers

#### TypeScript/Node.js Servers

For locally developed TypeScript or Node.js servers:

```bash
npx @modelcontextprotocol/inspector node path/to/server/index.js args...
```

**Examples**:
```bash
# Local weather server
npx @modelcontextprotocol/inspector node ./dist/weather-server.js --api-key YOUR_API_KEY

# Custom tool server
npx @modelcontextprotocol/inspector node ./build/custom-server.js --config ./config.json

# Development server with TypeScript
npx @modelcontextprotocol/inspector tsx ./src/server.ts --dev-mode
```

#### Python Servers

For Python servers using UV (recommended) or other Python package managers:

```bash
npx @modelcontextprotocol/inspector \
  uv \
  --directory path/to/server \
  run \
  package-name \
  args...
```

**Examples**:
```bash
# Local Python server with UV
npx @modelcontextprotocol/inspector \
  uv \
  --directory ./my-python-server \
  run \
  my-mcp-server \
  --config config.yaml

# Poetry-managed server
npx @modelcontextprotocol/inspector \
  poetry \
  --directory ./my-server \
  run \
  python \
  -m my_server \
  --port 8080

# Standard Python server
npx @modelcontextprotocol/inspector python ./src/server.py --debug
```

#### Alternative Installation Methods

For servers with specific requirements, always check the attached README for accurate instructions:

```bash
# Server with specific environment setup
CUSTOM_VAR=value npx @modelcontextprotocol/inspector node server.js

# Server requiring build step
cd my-server && npm run build && npx @modelcontextprotocol/inspector node dist/server.js

# Server with configuration file
npx @modelcontextprotocol/inspector node server.js --config ./config/production.json
```

## Inspector Interface Overview

The MCP Inspector provides a comprehensive web-based interface for server interaction and debugging.

### Server Connection Pane

The connection pane manages server connectivity and configuration:

**Transport Selection**:
* **STDIO Transport**: For local servers using standard input/output
* **HTTP Transport**: For remote servers using HTTP-based communication
* **WebSocket Transport**: For real-time bidirectional communication

**Command Configuration**:
* **Command Line Arguments**: Customize server startup parameters
* **Environment Variables**: Set required environment variables
* **Working Directory**: Specify the server's working directory
* **Timeout Settings**: Configure connection and operation timeouts

**Connection Status**:
* **Connection State**: Real-time display of connection status
* **Protocol Version**: Show negotiated MCP protocol version
* **Server Information**: Display server name, version, and capabilities
* **Error Reporting**: Detailed error messages for connection failures

### Resources Tab

The Resources tab provides comprehensive resource management and testing:

#### Resource Listing

```json
{
  "resources": [
    {
      "uri": "file:///project/README.md",
      "name": "Project README",
      "description": "Main project documentation",
      "mimeType": "text/markdown"
    },
    {
      "uri": "config://database",
      "name": "Database Configuration",
      "description": "Database connection settings",
      "mimeType": "application/json"
    }
  ]
}
```

#### Resource Features

**Metadata Display**:
* Resource URIs and names
* MIME types and descriptions
* Availability status
* Last modified timestamps

**Content Inspection**:
* Raw content viewing
* Formatted display for JSON, XML, and other structured data
* Syntax highlighting for code files
* Binary file type detection

**Subscription Testing**:
* Subscribe to resource change notifications
* Monitor resource updates in real-time
* Test subscription cancellation
* Verify notification delivery

**Interactive Testing**:
```bash
# Example resource operations in Inspector
GET resource://file:///project/config.json
SUBSCRIBE resource://database/schema
UNSUBSCRIBE resource://database/schema
```

### Prompts Tab

The Prompts tab enables comprehensive prompt template testing:

#### Prompt Discovery

**Available Prompts**:
```json
{
  "prompts": [
    {
      "name": "code_review",
      "title": "Code Review Assistant",
      "description": "Analyze code for best practices and potential issues",
      "arguments": [
        {
          "name": "language",
          "type": "string",
          "description": "Programming language",
          "required": true
        },
        {
          "name": "style",
          "type": "string",
          "description": "Review style",
          "enum": ["strict", "moderate", "lenient"],
          "default": "moderate"
        }
      ]
    }
  ]
}
```

#### Prompt Testing

**Argument Specification**:
* Interactive form generation from prompt schemas
* Type validation for arguments
* Default value population
* Required field validation

**Message Preview**:
* Generated system and user messages
* Context injection verification
* Template variable substitution
* Multi-turn conversation setup

**Execution Testing**:
```json
{
  "promptName": "code_review",
  "arguments": {
    "language": "typescript",
    "style": "strict"
  }
}
```

**Result Analysis**:
* Message structure validation
* Content formatting verification
* Context preservation testing
* Error handling validation

### Tools Tab

The Tools tab provides comprehensive tool testing and validation:

#### Tool Discovery

**Tool Listing**:
```json
{
  "tools": [
    {
      "name": "calculate",
      "title": "Calculator",
      "description": "Perform mathematical calculations",
      "inputSchema": {
        "type": "object",
        "properties": {
          "expression": {
            "type": "string",
            "description": "Mathematical expression to evaluate"
          },
          "precision": {
            "type": "number",
            "description": "Decimal precision",
            "default": 2
          }
        },
        "required": ["expression"]
      }
    }
  ]
}
```

#### Interactive Tool Testing

**Input Validation**:
* Schema-based form generation
* Real-time input validation
* Type checking and constraint enforcement
* Custom validation rules

**Execution Monitoring**:
* Tool call logging
* Execution time measurement
* Resource usage monitoring
* Error tracking and reporting

**Result Analysis**:
```json
{
  "toolName": "calculate",
  "arguments": {
    "expression": "2 + 3 * 4",
    "precision": 3
  },
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Result: 14.000"
      }
    ],
    "isError": false
  }
}
```

**Advanced Testing Scenarios**:
* Concurrent tool execution
* Error condition simulation
* Timeout testing
* Resource conflict detection

### Notifications Pane

The Notifications pane provides comprehensive monitoring and logging:

#### Server Logs

**Log Categories**:
* **INFO**: General operational information
* **DEBUG**: Detailed debugging information
* **WARN**: Warning messages and recoverable errors
* **ERROR**: Error conditions and failures

**Message Tracking**:
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "message": "Tool 'calculate' executed successfully",
  "context": {
    "toolName": "calculate",
    "executionTime": 45,
    "arguments": {...}
  }
}
```

#### Protocol Messages

**JSON-RPC Monitoring**:
* Request/response pairs
* Message validation
* Protocol compliance checking
* Timing analysis

**Notification Handling**:
* Resource change notifications
* Tool availability updates
* Server state changes
* Custom notifications

#### Filtering and Search

**Log Filtering**:
* Filter by log level
* Search by message content
* Filter by time range
* Filter by context information

**Export Capabilities**:
* Export logs to file
* Copy specific messages
* Generate debug reports
* Share filtered results

## Advanced Testing Scenarios

### Error Condition Testing

#### Invalid Input Testing

Test server robustness with invalid inputs:

```json
// Invalid tool call
{
  "toolName": "calculate",
  "arguments": {
    "expression": "invalid_expression",
    "precision": "not_a_number"
  }
}
```

#### Edge Case Validation

```json
// Empty or null inputs
{
  "toolName": "file_read",
  "arguments": {
    "path": "",
    "encoding": null
  }
}

// Boundary value testing
{
  "toolName": "process_data",
  "arguments": {
    "items": new Array(10000).fill("test"),
    "timeout": 0
  }
}
```

### Performance Testing

#### Load Testing

```javascript
// Concurrent tool execution testing
const promises = [];
for (let i = 0; i < 100; i++) {
  promises.push(callTool("calculate", {
    expression: `${i} + ${i + 1}`
  }));
}

await Promise.all(promises);
```

#### Memory and Resource Testing

Monitor server resource usage during:
* Large data processing operations
* Long-running tool executions
* Multiple concurrent connections
* Resource-intensive computations

### Integration Testing

#### Multi-Server Testing

Test complex scenarios involving multiple servers:

```bash
# Start multiple servers for integration testing
npx @modelcontextprotocol/inspector node server1.js &
npx @modelcontextprotocol/inspector node server2.js &
npx @modelcontextprotocol/inspector node coordinator.js
```

#### Client-Server Interaction Testing

Simulate real-world client behavior:
* Rapid successive tool calls
* Resource subscription management
* Connection recovery testing
* Protocol version negotiation

## Best Practices

### Development Workflow

#### 1. Initial Development

**Server Setup**:
```bash
# Start with basic server structure
npx @modelcontextprotocol/inspector node ./src/basic-server.js

# Verify basic connectivity
# Check capability negotiation
# Test initial tool/resource/prompt registration
```

**Basic Validation**:
* Confirm server starts without errors
* Verify protocol handshake completion
* Check tool/resource/prompt discovery
* Validate basic functionality

#### 2. Iterative Development

**Development Cycle**:
```bash
# 1. Make server changes
vim src/server.ts

# 2. Rebuild server
npm run build

# 3. Restart Inspector
npx @modelcontextprotocol/inspector node dist/server.js

# 4. Test affected features
# 5. Monitor logs and messages
```

**Change Validation**:
* Test modified functionality
* Verify backward compatibility
* Check error handling improvements
* Monitor performance impacts

#### 3. Comprehensive Testing

**Edge Case Testing**:
* Invalid input handling
* Missing required arguments
* Concurrent operation handling
* Resource exhaustion scenarios

**Error Handling Validation**:
```json
// Test various error conditions
{
  "scenarios": [
    "missing_required_parameters",
    "invalid_parameter_types",
    "network_timeouts",
    "resource_not_found",
    "permission_denied",
    "server_overload"
  ]
}
```

### Quality Assurance

#### Pre-deployment Checklist

**Functionality Testing**:
- [ ] All tools execute successfully
- [ ] Resources load correctly
- [ ] Prompts generate valid messages
- [ ] Error conditions handled gracefully
- [ ] Performance meets requirements

**Protocol Compliance**:
- [ ] JSON-RPC 2.0 message format compliance
- [ ] Proper capability negotiation
- [ ] Correct notification handling
- [ ] Valid schema adherence

**Security Validation**:
- [ ] Input sanitization working
- [ ] Access control functioning
- [ ] Resource boundaries enforced
- [ ] Error messages don't leak sensitive data

#### Documentation Validation

Use Inspector to verify documentation accuracy:
* Test all documented examples
* Verify parameter descriptions
* Confirm expected behavior
* Validate error scenarios

### Debugging Strategies

#### Common Issues and Solutions

**Connection Problems**:
```bash
# Debug connection issues
export MCP_DEBUG=1
npx @modelcontextprotocol/inspector node server.js --verbose

# Check for:
# - Port conflicts
# - Permission issues
# - Environment variable problems
# - Path resolution errors
```

**Tool Execution Failures**:
```json
{
  "common_issues": [
    "schema_validation_errors",
    "missing_dependencies",
    "timeout_configurations",
    "resource_access_permissions",
    "async_operation_handling"
  ]
}
```

**Performance Issues**:
* Monitor execution times in Inspector
* Check resource usage patterns
* Identify bottlenecks in tool execution
* Validate concurrent operation handling

#### Advanced Debugging

**Message Tracing**:
```javascript
// Enable detailed message logging
{
  "logging": {
    "level": "debug",
    "include_protocol_messages": true,
    "include_timing_info": true,
    "include_call_stacks": true
  }
}
```

**State Inspection**:
* Monitor server internal state
* Track resource usage over time
* Analyze message flow patterns
* Identify memory leaks or resource leaks

## Integration with Development Tools

### IDE Integration

#### VS Code Integration

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start MCP Inspector",
      "type": "shell",
      "command": "npx",
      "args": [
        "@modelcontextprotocol/inspector",
        "node",
        "${workspaceFolder}/dist/server.js"
      ],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      }
    }
  ]
}
```

#### Debugging Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug MCP Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/server.ts",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development",
        "MCP_DEBUG": "1"
      }
    }
  ]
}
```

### CI/CD Integration

#### Automated Testing

```yaml
# .github/workflows/mcp-test.yml
name: MCP Server Testing
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build server
        run: npm run build

      - name: Test with Inspector
        run: |
          npx @modelcontextprotocol/inspector node dist/server.js &
          INSPECTOR_PID=$!
          npm run test:integration
          kill $INSPECTOR_PID
```

#### Quality Gates

```bash
#!/bin/bash
# scripts/validate-mcp-server.sh

# Start server with Inspector
npx @modelcontextprotocol/inspector node dist/server.js --test-mode &
INSPECTOR_PID=$!

# Run validation tests
npm run test:tools
npm run test:resources
npm run test:prompts
npm run test:error-handling

# Cleanup
kill $INSPECTOR_PID

# Check results
if [ $? -eq 0 ]; then
  echo "MCP server validation passed"
  exit 0
else
  echo "MCP server validation failed"
  exit 1
fi
```

## Troubleshooting

### Common Issues

#### Inspector Won't Start

**Symptom**: Inspector fails to launch or connect to server

**Solutions**:
```bash
# Check Node.js version
node --version  # Should be 18+

# Clear npm cache
npm cache clean --force

# Try alternative installation
npm install -g @modelcontextprotocol/inspector
mcp-inspector node server.js

# Check for port conflicts
lsof -i :3000  # Default Inspector port
```

#### Server Connection Failures

**Symptom**: Inspector starts but can't connect to server

**Debugging Steps**:
```bash
# Enable verbose logging
DEBUG=* npx @modelcontextprotocol/inspector node server.js

# Check server output
node server.js 2>&1 | tee server.log

# Verify server responds to basic requests
curl -X POST http://localhost:3000/health
```

#### Tool Execution Timeouts

**Symptom**: Tools fail with timeout errors

**Solutions**:
```json
{
  "timeout_configuration": {
    "default_timeout": 30000,
    "tool_specific_timeouts": {
      "long_running_operation": 300000,
      "quick_calculation": 5000
    }
  }
}
```

### Performance Issues

#### Slow Tool Execution

**Diagnostic Approach**:
1. Monitor execution times in Inspector
2. Profile server performance
3. Check for blocking operations
4. Validate async/await usage

**Optimization Strategies**:
```javascript
// Optimize tool execution
export const optimizedTool = {
  name: "optimized_process",
  handler: async (params) => {
    // Use caching for expensive operations
    const cached = cache.get(params.key);
    if (cached) return cached;

    // Process in batches for large datasets
    const result = await processBatches(params.data, 100);

    // Cache results
    cache.set(params.key, result);
    return result;
  }
};
```

### Protocol Compliance Issues

#### Invalid Message Formats

**Common Problems**:
```json
{
  "protocol_violations": [
    "missing_jsonrpc_version",
    "invalid_method_names",
    "malformed_parameter_objects",
    "incorrect_error_formats",
    "missing_required_fields"
  ]
}
```

**Validation Tools**:
```bash
# Use Inspector's built-in protocol validator
npx @modelcontextprotocol/inspector node server.js --validate-protocol

# Check against MCP specification
npm run lint:mcp-compliance
```

## Next Steps

### Advanced Topics

**Custom Inspector Extensions**:
* Build custom Inspector plugins
* Add domain-specific testing tools
* Integrate with monitoring systems
* Create automated test suites

**Production Monitoring**:
* Implement server health checks
* Add performance metrics collection
* Set up alerting systems
* Create operational dashboards

### Additional Resources

**Documentation Links**:
* [MCP Inspector Repository](https://github.com/modelcontextprotocol/inspector) - Source code and contribution guidelines
* [MCP Specification](https://spec.modelcontextprotocol.io/) - Official protocol specification
* [Debugging Best Practices](./mcp-troubleshooting.md) - Comprehensive debugging strategies
* [Server Development Guide](./mcp-server-development.md) - Complete server building tutorial

**Community Resources**:
* MCP Discord Community
* Stack Overflow MCP tags
* GitHub Discussions
* Developer Forums

The MCP Inspector is an essential tool for MCP server development, providing comprehensive testing, debugging, and validation capabilities. Use it throughout your development lifecycle to ensure robust, reliable, and protocol-compliant server implementations.