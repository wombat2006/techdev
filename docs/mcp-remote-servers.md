# Connect to Remote MCP Servers

> Learn how to connect Claude to remote MCP servers and extend its capabilities with internet-hosted tools and data sources

Remote MCP servers extend AI applications' capabilities beyond your local environment, providing access to internet-hosted tools, services, and data sources. By connecting to remote MCP servers, you transform AI assistants from helpful tools into informed teammates capable of handling complex, multi-step projects with real-time access to external resources.

Many clients now support remote MCP servers, enabling a wide range of integration possibilities. This guide demonstrates how to connect to remote MCP servers using [Claude](https://claude.ai/) as an example, one of the many clients that support MCP. While we focus on Claude's implementation through Custom Connectors, the concepts apply broadly to other MCP-compatible clients.

## Understanding Remote MCP Servers

Remote MCP servers function similarly to local MCP servers but are hosted on the internet rather than your local machine. They expose tools, prompts, and resources that Claude can use to perform tasks on your behalf. These servers can integrate with various services such as project management tools, documentation systems, code repositories, and any other API-enabled service.

The key advantage of remote MCP servers is their accessibility. Unlike local servers that require installation and configuration on each device, remote servers are available from any MCP client with an internet connection. This makes them ideal for web-based AI applications, integrations that emphasize ease-of-use and services that require server-side processing or authentication.

## What are Custom Connectors?

Custom Connectors serve as the bridge between Claude and remote MCP servers. They allow you to connect Claude directly to the tools and data sources that matter most to your workflows, enabling Claude to operate within your favorite software and draw insights from the complete context of your external tools.

With Custom Connectors, you can:

* Connect Claude to existing remote MCP servers provided by third-party developers
* Build your own remote MCP servers to connect with any tool

## Connecting to a Remote MCP Server

The process of connecting Claude to a remote MCP server involves adding a Custom Connector through the Claude interface. This establishes a secure connection between Claude and your chosen remote server.

### Step 1: Navigate to Connector Settings

Open Claude in your browser and navigate to the settings page. You can access this by clicking on your profile icon and selecting "Settings" from the dropdown menu. Once in settings, locate and click on the "Connectors" section in the sidebar.

This will display your currently configured connectors and provide options to add new ones.

### Step 2: Add a Custom Connector

In the Connectors section, scroll to the bottom where you'll find the "Add custom connector" button. Click this button to begin the connection process.

A dialog will appear prompting you to enter the remote MCP server URL. This URL should be provided by the server developer or administrator. Enter the complete URL, ensuring it includes the proper protocol (https://) and any necessary path components.

After entering the URL, click "Add" to proceed with the connection.

### Step 3: Complete Authentication

Most remote MCP servers require authentication to ensure secure access to their resources. The authentication process varies depending on the server implementation but commonly involves OAuth, API keys, or username/password combinations.

Follow the authentication prompts provided by the server. This may redirect you to a third-party authentication provider or display a form within Claude. Once authentication is complete, Claude will establish a secure connection to the remote server.

### Step 4: Access Resources and Prompts

After successful connection, the remote server's resources and prompts become available in your Claude conversations. You can access these by clicking the paperclip icon in the message input area, which opens the attachment menu.

The menu displays all available resources and prompts from your connected servers. Select the items you want to include in your conversation. These resources provide Claude with context and information from your external tools.

### Step 5: Configure Tool Permissions

Remote MCP servers often expose multiple tools with varying capabilities. You can control which tools Claude is allowed to use by configuring permissions in the connector settings. This ensures Claude only performs actions you've explicitly authorized.

Navigate back to the Connectors settings and click on your connected server. Here you can enable or disable specific tools, set usage limits, and configure other security parameters according to your needs.

## Transport Protocols for Remote Servers

Remote MCP servers use different transport protocols compared to local servers:

### Streamable HTTP Transport

Remote MCP servers typically use Streamable HTTP transport, which provides:

* **HTTP POST Requests**: Standard HTTP communication for tool calls and resource access
* **Server-Sent Events (SSE)**: Real-time updates and streaming responses
* **Authentication Integration**: Built-in support for various authentication mechanisms
* **Network Optimization**: Efficient handling of network latency and connection issues

Example of a remote server configuration:
```json
{
  "transport": "streamable-http",
  "endpoint": "https://api.example.com/mcp",
  "authentication": {
    "type": "oauth2",
    "authorization_url": "https://api.example.com/oauth/authorize",
    "token_url": "https://api.example.com/oauth/token"
  }
}
```

### Security Considerations

Remote MCP servers implement additional security measures:

* **HTTPS Encryption**: All communication encrypted in transit
* **Authentication Tokens**: Secure token-based authentication
* **Rate Limiting**: Protection against abuse and overuse
* **CORS Policies**: Controlled cross-origin resource sharing
* **Audit Logging**: Comprehensive logging of all interactions

## Deployment Models

### Third-Party Hosted Servers

Many organizations provide hosted MCP servers as services:

* **SaaS Integrations**: Pre-built integrations with popular services
* **Enterprise Solutions**: Custom servers for organizational needs
* **Community Servers**: Open-source servers hosted by the community

### Self-Hosted Remote Servers

You can deploy your own remote MCP servers:

* **Cloud Platforms**: Deploy on AWS, GCP, Azure, or other cloud providers
* **Container Orchestration**: Use Docker and Kubernetes for scalable deployment
* **API Gateway Integration**: Integrate with existing API infrastructure
* **Custom Domains**: Use your own domain and SSL certificates

## Popular Remote MCP Servers

### Development and Code Management

**GitHub Integration**:
```
Endpoint: https://github-mcp.example.com
Features: Repository management, issue tracking, pull requests
Authentication: GitHub OAuth
```

**GitLab Integration**:
```
Endpoint: https://gitlab-mcp.example.com
Features: Project management, CI/CD pipeline integration
Authentication: GitLab Personal Access Token
```

### Project Management

**Jira Integration**:
```
Endpoint: https://jira-mcp.example.com
Features: Issue management, project tracking, reporting
Authentication: Atlassian OAuth
```

**Asana Integration**:
```
Endpoint: https://asana-mcp.example.com
Features: Task management, team collaboration, project timelines
Authentication: Asana Personal Access Token
```

### Communication and Collaboration

**Slack Integration**:
```
Endpoint: https://slack-mcp.example.com
Features: Channel messaging, user management, workflow automation
Authentication: Slack OAuth
```

**Microsoft Teams Integration**:
```
Endpoint: https://teams-mcp.example.com
Features: Chat integration, calendar access, file sharing
Authentication: Microsoft OAuth
```

## Best Practices for Using Remote MCP Servers

### Security Considerations

* **Verify Server Authenticity**: Always verify the authenticity of remote MCP servers before connecting
* **Trust Only Reliable Sources**: Only connect to servers from trusted sources
* **Review Permissions**: Carefully review the permissions requested during authentication
* **Sensitive Data Protection**: Be cautious about granting access to sensitive data or systems
* **Regular Security Reviews**: Periodically review connected servers and their permissions

### Managing Multiple Connectors

* **Organize by Purpose**: Group connectors by project or functional area
* **Clear Naming Conventions**: Use descriptive names for easy identification
* **Regular Cleanup**: Remove unused connectors to maintain security and clarity
* **Documentation**: Maintain documentation of what each connector provides
* **Access Control**: Limit connector access to necessary team members only

### Performance Optimization

* **Selective Resource Loading**: Only load resources you need for specific conversations
* **Batch Operations**: Group related operations when possible
* **Connection Monitoring**: Monitor connection health and performance
* **Caching Strategy**: Leverage caching for frequently accessed resources
* **Error Handling**: Implement robust error handling for network issues

## Troubleshooting Remote Connections

### Common Connection Issues

**Authentication Failures**:
```
Error: "Authentication failed"
Solution: Verify credentials and token validity
Check: OAuth scopes and permissions
```

**Network Connectivity**:
```
Error: "Connection timeout"
Solution: Check network connectivity and firewall settings
Verify: Server endpoint URL and availability
```

**SSL Certificate Issues**:
```
Error: "SSL certificate verification failed"
Solution: Ensure server uses valid SSL certificates
Check: Certificate chain and expiration dates
```

### Debugging Remote Servers

**Enable Debug Logging**:
```javascript
// Example debug configuration
{
  "logging": {
    "level": "debug",
    "remote_requests": true,
    "response_timing": true
  }
}
```

**Network Monitoring**:
```bash
# Monitor network requests
curl -v https://api.example.com/mcp/health

# Check DNS resolution
nslookup api.example.com

# Test connectivity
ping api.example.com
```

**Server Health Checks**:
```json
{
  "method": "GET",
  "url": "https://api.example.com/mcp/health",
  "expected_status": 200,
  "expected_response": {
    "status": "healthy",
    "version": "1.0.0"
  }
}
```

## Building Custom Remote MCP Servers

### Server Architecture

```python
# Example Flask-based MCP server
from flask import Flask, request, jsonify
from mcp import Server

app = Flask(__name__)
mcp_server = Server("custom-remote-server")

@app.route('/mcp', methods=['POST'])
def handle_mcp_request():
    data = request.get_json()
    response = mcp_server.handle_request(data)
    return jsonify(response)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, ssl_context='adhoc')
```

### Authentication Implementation

```python
# OAuth 2.0 authentication example
from authlib.integrations.flask_oauth2 import ResourceProtector
from authlib.oauth2 import OAuth2Error

require_oauth = ResourceProtector()

@app.route('/mcp', methods=['POST'])
@require_oauth('mcp:access')
def handle_authenticated_request():
    # Process authenticated MCP request
    pass
```

### Deployment Configuration

```yaml
# Docker deployment example
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: custom-mcp:latest
        ports:
        - containerPort: 8000
        env:
        - name: MCP_SERVER_MODE
          value: "remote"
        - name: SSL_CERT_PATH
          value: "/certs/tls.crt"
```

## Integration with CI/CD Pipelines

### Automated Testing

```yaml
# GitHub Actions example
name: Test MCP Server Integration
on: [push, pull_request]

jobs:
  test-mcp-integration:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Start MCP Server
      run: docker-compose up -d mcp-server
    - name: Test Remote Connection
      run: |
        python test_remote_mcp.py
        curl -f http://localhost:8000/health
```

### Deployment Automation

```bash
#!/bin/bash
# Deployment script for remote MCP server

# Build and push Docker image
docker build -t mcp-server:$VERSION .
docker push registry.example.com/mcp-server:$VERSION

# Deploy to Kubernetes
kubectl set image deployment/mcp-server mcp-server=registry.example.com/mcp-server:$VERSION
kubectl rollout status deployment/mcp-server

# Verify deployment
kubectl get pods -l app=mcp-server
curl -f https://mcp.example.com/health
```

## Monitoring and Observability

### Metrics Collection

```python
# Prometheus metrics example
from prometheus_client import Counter, Histogram, generate_latest

REQUEST_COUNT = Counter('mcp_requests_total', 'Total MCP requests')
REQUEST_DURATION = Histogram('mcp_request_duration_seconds', 'Request duration')

@app.route('/metrics')
def metrics():
    return generate_latest()

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    REQUEST_COUNT.inc()
    REQUEST_DURATION.observe(time.time() - request.start_time)
    return response
```

### Logging Strategy

```python
import logging
import json

# Structured logging
logger = logging.getLogger('mcp-server')
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

def log_mcp_request(method, params, response_time):
    logger.info(json.dumps({
        'event': 'mcp_request',
        'method': method,
        'params': params,
        'response_time_ms': response_time * 1000
    }))
```

## Next Steps

Now that you understand remote MCP servers, consider these next steps:

### Explore Advanced Features
* **Streaming Responses**: Implement real-time data streaming
* **Batch Operations**: Optimize performance with batch processing
* **Custom Authentication**: Implement organization-specific auth mechanisms
* **Advanced Security**: Add rate limiting, request validation, and audit logging

### Build Custom Integrations
* **API Wrapper Servers**: Create MCP servers for existing APIs
* **Database Connectors**: Build servers for direct database access
* **Workflow Automation**: Integrate with business process automation tools
* **Custom Dashboards**: Create servers that provide business intelligence data

### Community Contribution
* **Open Source Servers**: Contribute to the MCP server ecosystem
* **Documentation**: Help improve server documentation and examples
* **Best Practices**: Share deployment and security best practices
* **Testing Frameworks**: Develop testing tools for MCP server validation

Remote MCP servers represent a powerful paradigm for extending AI capabilities. By understanding their architecture, security considerations, and best practices, you can build robust integrations that enhance productivity and enable new workflows.