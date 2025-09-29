# Build an MCP Server

> Get started building your own server to use in Claude for Desktop and other clients.

This tutorial walks through building a weather MCP server that exposes two tools: `get_alerts` and `get_forecast`. We'll then connect the server to Claude for Desktop to demonstrate real-world usage.

## What We'll Build

We'll create a weather server that provides:
- Weather alerts for US states
- Weather forecasts for specific coordinates
- Integration with the National Weather Service API
- Full MCP protocol compliance

## Core MCP Concepts

MCP servers can provide three main types of capabilities:

1. **Resources**: File-like data that can be read by clients (like API responses or file contents)
2. **Tools**: Functions that can be called by the LLM (with user approval)
3. **Prompts**: Pre-written templates that help users accomplish specific tasks

This tutorial focuses primarily on tools.

## Prerequisites

### Knowledge Requirements
- Programming experience in Python, TypeScript/Node.js, Java, Kotlin, or C#
- Basic understanding of LLMs like Claude
- Familiarity with REST APIs and JSON

### System Requirements
Choose your preferred language:
- **Python**: Python 3.10+ and MCP SDK 1.2.0+
- **Node.js**: Node.js 16+ and TypeScript
- **Java**: Java 17+ and Spring Boot 3.3.x+
- **Kotlin**: Java 17+ and Gradle
- **C#**: .NET 8 SDK or higher

## Important: Logging in MCP Servers

**Critical for STDIO-based servers**: Never write to standard output (stdout):
- ❌ `print()` statements in Python
- ❌ `console.log()` in JavaScript
- ❌ `fmt.Println()` in Go
- ❌ Similar stdout functions in other languages

Writing to stdout corrupts JSON-RPC messages and breaks your server.

**Best Practices**:
- Use logging libraries that write to stderr or files
- For HTTP-based servers, standard output logging is acceptable

## Python Implementation

### Environment Setup

```bash
# Install uv package manager
curl -LsSf https://astral.sh/uv/install.sh | sh  # macOS/Linux
# powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"  # Windows

# Create project
uv init weather
cd weather

# Set up virtual environment
uv venv
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate     # Windows

# Install dependencies
uv add "mcp[cli]" httpx

# Create server file
touch weather.py
```

### Server Implementation

```python
from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("weather")

# Constants
NWS_API_BASE = "https://api.weather.gov"
USER_AGENT = "weather-app/1.0"

async def make_nws_request(url: str) -> dict[str, Any] | None:
    """Make a request to the NWS API with proper error handling."""
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/geo+json"
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None

def format_alert(feature: dict) -> str:
    """Format an alert feature into a readable string."""
    props = feature["properties"]
    return f"""
Event: {props.get('event', 'Unknown')}
Area: {props.get('areaDesc', 'Unknown')}
Severity: {props.get('severity', 'Unknown')}
Description: {props.get('description', 'No description available')}
Instructions: {props.get('instruction', 'No specific instructions provided')}
"""

@mcp.tool()
async def get_alerts(state: str) -> str:
    """Get weather alerts for a US state.

    Args:
        state: Two-letter US state code (e.g. CA, NY)
    """
    url = f"{NWS_API_BASE}/alerts/active/area/{state}"
    data = await make_nws_request(url)

    if not data or "features" not in data:
        return "Unable to fetch alerts or no alerts found."

    if not data["features"]:
        return "No active alerts for this state."

    alerts = [format_alert(feature) for feature in data["features"]]
    return "\n---\n".join(alerts)

@mcp.tool()
async def get_forecast(latitude: float, longitude: float) -> str:
    """Get weather forecast for a location.

    Args:
        latitude: Latitude of the location
        longitude: Longitude of the location
    """
    # First get the forecast grid endpoint
    points_url = f"{NWS_API_BASE}/points/{latitude},{longitude}"
    points_data = await make_nws_request(points_url)

    if not points_data:
        return "Unable to fetch forecast data for this location."

    # Get the forecast URL from the points response
    forecast_url = points_data["properties"]["forecast"]
    forecast_data = await make_nws_request(forecast_url)

    if not forecast_data:
        return "Unable to fetch detailed forecast."

    # Format the periods into a readable forecast
    periods = forecast_data["properties"]["periods"]
    forecasts = []
    for period in periods[:5]:  # Only show next 5 periods
        forecast = f"""
{period['name']}:
Temperature: {period['temperature']}°{period['temperatureUnit']}
Wind: {period['windSpeed']} {period['windDirection']}
Forecast: {period['detailedForecast']}
"""
        forecasts.append(forecast)

    return "\n---\n".join(forecasts)

if __name__ == "__main__":
    # Initialize and run the server
    mcp.run(transport='stdio')
```

### Run the Server
```bash
uv run weather.py
```

## TypeScript/Node.js Implementation

### Environment Setup

```bash
# Create project
mkdir weather && cd weather
npm init -y

# Install dependencies
npm install @modelcontextprotocol/sdk zod@3
npm install -D @types/node typescript

# Create source directory
mkdir src
touch src/index.ts
```

### Package Configuration

Update `package.json`:
```json
{
  "type": "module",
  "bin": {
    "weather": "./build/index.js"
  },
  "scripts": {
    "build": "tsc && chmod 755 build/index.js"
  },
  "files": ["build"]
}
```

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Server Implementation

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

// Create server instance
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Helper function for making NWS API requests
async function makeNWSRequest<T>(url: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making NWS request:", error);
    return null;
  }
}

// Type definitions
interface AlertFeature {
  properties: {
    event?: string;
    areaDesc?: string;
    severity?: string;
    status?: string;
    headline?: string;
    description?: string;
    instruction?: string;
  };
}

interface ForecastPeriod {
  name?: string;
  temperature?: number;
  temperatureUnit?: string;
  windSpeed?: string;
  windDirection?: string;
  detailedForecast?: string;
}

interface AlertsResponse {
  features: AlertFeature[];
}

interface PointsResponse {
  properties: {
    forecast?: string;
  };
}

interface ForecastResponse {
  properties: {
    periods: ForecastPeriod[];
  };
}

// Register weather tools
server.addTool({
  name: "get_alerts",
  description: "Get weather alerts for a US state",
  inputSchema: {
    type: "object",
    properties: {
      state: {
        type: "string",
        description: "Two-letter US state code (e.g. CA, NY)"
      }
    },
    required: ["state"]
  }
}, async (request) => {
  const { state } = request.params.arguments as { state: string };
  const stateCode = state.toUpperCase();
  const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
  const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

  if (!alertsData) {
    return {
      content: [{ type: "text", text: "Failed to retrieve alerts data" }],
    };
  }

  const features = alertsData.features || [];
  if (features.length === 0) {
    return {
      content: [{ type: "text", text: `No active alerts for ${stateCode}` }],
    };
  }

  const alerts = features.map(feature => {
    const props = feature.properties;
    return `Event: ${props.event || 'Unknown'}
Area: ${props.areaDesc || 'Unknown'}
Severity: ${props.severity || 'Unknown'}
Description: ${props.description || 'No description available'}
Instructions: ${props.instruction || 'No specific instructions provided'}`;
  });

  return {
    content: [{ type: "text", text: alerts.join("\n---\n") }],
  };
});

server.addTool({
  name: "get_forecast",
  description: "Get weather forecast for a location",
  inputSchema: {
    type: "object",
    properties: {
      latitude: {
        type: "number",
        description: "Latitude of the location"
      },
      longitude: {
        type: "number",
        description: "Longitude of the location"
      }
    },
    required: ["latitude", "longitude"]
  }
}, async (request) => {
  const { latitude, longitude } = request.params.arguments as { latitude: number; longitude: number };

  // Get grid point data
  const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

  if (!pointsData) {
    return {
      content: [{ type: "text", text: `Unable to fetch forecast data for this location.` }],
    };
  }

  // Get the forecast URL from the points response
  const forecastUrl = pointsData.properties?.forecast;
  if (!forecastUrl) {
    return {
      content: [{ type: "text", text: "Failed to get forecast URL from grid point data" }],
    };
  }

  // Get forecast data
  const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
  if (!forecastData) {
    return {
      content: [{ type: "text", text: "Failed to retrieve detailed forecast" }],
    };
  }

  // Format the periods into a readable forecast
  const periods = forecastData.properties?.periods || [];
  if (periods.length === 0) {
    return {
      content: [{ type: "text", text: "No forecast periods available" }],
    };
  }

  const forecasts = periods.slice(0, 5).map(period =>
    `${period.name || 'Unknown'}:
Temperature: ${period.temperature || 'Unknown'}°${period.temperatureUnit || 'F'}
Wind: ${period.windSpeed || 'Unknown'} ${period.windDirection || ''}
Forecast: ${period.detailedForecast || 'No forecast available'}`
  );

  return {
    content: [{ type: "text", text: forecasts.join("\n---\n") }],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
```

### Build and Run
```bash
npm run build
node build/index.js
```

## Java Implementation (Spring Boot)

### Environment Setup

Use [Spring Initializer](https://start.spring.io/) to bootstrap the project with these dependencies:

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-mcp-server</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework</groupId>
        <artifactId>spring-web</artifactId>
    </dependency>
</dependencies>
```

Configure `application.properties`:
```properties
spring.main.bannerMode=off
logging.pattern.console=
```

### Server Implementation

```java
@Service
public class WeatherService {
    private final RestClient restClient;

    public WeatherService() {
        this.restClient = RestClient.builder()
            .baseUrl("https://api.weather.gov")
            .defaultHeader("Accept", "application/geo+json")
            .defaultHeader("User-Agent", "weather-app/1.0")
            .build();
    }

    @Tool(description = "Get weather alerts for a US state")
    public String getAlerts(
        @ToolParam(description = "Two-letter US state code (e.g. CA, NY)") String state
    ) {
        // Implementation details for fetching and formatting alerts
        // Returns formatted alert information
    }

    @Tool(description = "Get weather forecast for a specific latitude/longitude")
    public String getWeatherForecastByLocation(
        double latitude,   // Latitude coordinate
        double longitude   // Longitude coordinate
    ) {
        // Implementation details for fetching and formatting forecast
        // Returns detailed forecast including temperature, wind, and conditions
    }
}

@SpringBootApplication
public class McpServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(McpServerApplication.class, args);
    }

    @Bean
    public ToolCallbackProvider weatherTools(WeatherService weatherService) {
        return MethodToolCallbackProvider.builder().toolObjects(weatherService).build();
    }
}
```

### Build and Run
```bash
./mvnw clean install
java -jar target/weather-server-0.0.1-SNAPSHOT.jar
```

## Kotlin Implementation

### Environment Setup

```bash
mkdir weather && cd weather
gradle init  # Select Application, Kotlin, Java 17

# Add to build.gradle.kts
val mcpVersion = "0.4.0"
val slf4jVersion = "2.0.9"
val ktorVersion = "3.1.1"

dependencies {
    implementation("io.modelcontextprotocol:kotlin-sdk:$mcpVersion")
    implementation("org.slf4j:slf4j-nop:$slf4jVersion")
    implementation("io.ktor:ktor-client-content-negotiation:$ktorVersion")
    implementation("io.ktor:ktor-serialization-kotlinx-json:$ktorVersion")
}

plugins {
    kotlin("plugin.serialization") version "kotlin_version"
    id("com.github.johnrengelman.shadow") version "8.1.1"
}
```

### Server Implementation

```kotlin
fun `run mcp server`() {
    val server = Server(
        Implementation(
            name = "weather",
            version = "1.0.0"
        ),
        ServerOptions(
            capabilities = ServerCapabilities(tools = ServerCapabilities.Tools(listChanged = true))
        )
    )

    val transport = StdioServerTransport(
        System.`in`.asInput(),
        System.out.asSink().buffered()
    )

    runBlocking {
        server.connect(transport)
        val done = Job()
        server.onClose { done.complete() }
        done.join()
    }
}

// Extension functions for HTTP client
suspend fun HttpClient.getForecast(latitude: Double, longitude: Double): List<String> {
    val points = this.get("/points/$latitude,$longitude").body<Points>()
    val forecast = this.get(points.properties.forecast).body<Forecast>()
    return forecast.properties.periods.map { period ->
        """
        ${period.name}:
        Temperature: ${period.temperature} ${period.temperatureUnit}
        Wind: ${period.windSpeed} ${period.windDirection}
        Forecast: ${period.detailedForecast}
        """.trimIndent()
    }
}

suspend fun HttpClient.getAlerts(state: String): List<String> {
    val alerts = this.get("/alerts/active/area/$state").body<Alert>()
    return alerts.features.map { feature ->
        """
        Event: ${feature.properties.event}
        Area: ${feature.properties.areaDesc}
        Severity: ${feature.properties.severity}
        Description: ${feature.properties.description}
        Instruction: ${feature.properties.instruction}
        """.trimIndent()
    }
}

fun main() = `run mcp server`()
```

### Build and Run
```bash
./gradlew build
java -jar build/libs/weather-all.jar
```

## C# Implementation

### Environment Setup

```bash
mkdir weather && cd weather
dotnet new console

# Add packages
dotnet add package ModelContextProtocol --prerelease
dotnet add package Microsoft.Extensions.Hosting
```

### Server Implementation

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ModelContextProtocol;
using System.Net.Http.Headers;

var builder = Host.CreateEmptyApplicationBuilder(settings: null);

builder.Services.AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly();

builder.Services.AddSingleton(_ =>
{
    var client = new HttpClient() { BaseAddress = new Uri("https://api.weather.gov") };
    client.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("weather-tool", "1.0"));
    return client;
});

var app = builder.Build();
await app.RunAsync();

// WeatherTools class
[McpServerToolType]
public static class WeatherTools
{
    [McpServerTool, Description("Get weather alerts for a US state.")]
    public static async Task<string> GetAlerts(
        HttpClient client,
        [Description("The US state to get alerts for.")] string state)
    {
        // Implementation for fetching and formatting alerts
    }

    [McpServerTool, Description("Get weather forecast for a location.")]
    public static async Task<string> GetForecast(
        HttpClient client,
        [Description("Latitude of the location.")] double latitude,
        [Description("Longitude of the location.")] double longitude)
    {
        // Implementation for fetching and formatting forecast
    }
}
```

### Build and Run
```bash
dotnet run
```

## Testing with Claude for Desktop

### Configuration

1. **Install Claude for Desktop**: Download from [claude.ai/download](https://claude.ai/download)
2. **Open Configuration File**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Server Configuration Examples

**Python Server**:
```json
{
  "mcpServers": {
    "weather": {
      "command": "uv",
      "args": [
        "--directory",
        "/ABSOLUTE/PATH/TO/weather",
        "run",
        "weather.py"
      ]
    }
  }
}
```

**Node.js Server**:
```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/weather/build/index.js"]
    }
  }
}
```

**Java Server**:
```json
{
  "mcpServers": {
    "weather": {
      "command": "java",
      "args": [
        "-jar",
        "/ABSOLUTE/PATH/TO/weather-server.jar"
      ]
    }
  }
}
```

**C# Server**:
```json
{
  "mcpServers": {
    "weather": {
      "command": "dotnet",
      "args": [
        "run",
        "--project",
        "/ABSOLUTE/PATH/TO/PROJECT",
        "--no-build"
      ]
    }
  }
}
```

### Testing Commands

After restarting Claude for Desktop, test with:
- "What's the weather in Sacramento?"
- "What are the active weather alerts in Texas?"

Look for the MCP indicator icon in the bottom-right of the conversation input.

## What Happens Under the Hood

1. **User Query**: Client sends question to Claude
2. **Tool Selection**: Claude analyzes available tools and selects appropriate ones
3. **Tool Execution**: Client executes tools through MCP server
4. **Result Processing**: Results sent back to Claude
5. **Response Generation**: Claude formulates natural language response
6. **Display**: Response shown to user

## Advanced Configuration

### Multiple Server Configuration

```json
{
  "mcpServers": {
    "weather": {
      "command": "uv",
      "args": ["--directory", "/path/to/weather", "run", "weather.py"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/username/Desktop"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token-here"
      }
    }
  }
}
```

### Environment Variables

```json
{
  "mcpServers": {
    "weather": {
      "command": "python",
      "args": ["/path/to/weather_server.py"],
      "env": {
        "WEATHER_API_KEY": "your-api-key",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Custom Working Directory

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["server.js"],
      "cwd": "/path/to/server/directory"
    }
  }
}
```

## Troubleshooting

### Common Issues

**Server Not Showing Up**:
1. Check `claude_desktop_config.json` syntax with JSON validator
2. Verify absolute paths (not relative)
3. Restart Claude for Desktop completely
4. Check Claude's logs: `~/Library/Logs/Claude/mcp*.log`

**Tool Calls Failing**:
1. Verify server builds without errors
2. Check for stdout logging (should use stderr)
3. Test server manually: `python weather.py` or `node build/index.js`
4. Review error logs in Claude's log directory

**Configuration File Issues**:
```bash
# macOS: Open config directory
open ~/Library/Application\ Support/Claude/

# Create config file if missing
touch ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Validate JSON syntax
python -m json.tool ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Permission Issues**:
- Ensure you have read/write access to specified directories
- Use absolute paths only
- Test directory access manually through file manager

### Debug Commands

**Test Manual Server Execution**:
```bash
# Python
uv run weather.py

# Node.js
node build/index.js

# Java
java -jar weather-server.jar

# C#
dotnet run
```

**Check Claude Logs**:
```bash
# Follow logs in real-time (macOS)
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log

# Windows
type "%APPDATA%\Claude\logs\mcp*.log"
```

### Network and API Issues

**NWS API Errors**:
- Verify coordinates are within US boundaries
- Check for rate limiting (add delays between requests)
- Ensure proper User-Agent header is set
- Test API endpoints manually with curl

**HTTP Client Issues**:
- Verify network connectivity
- Check firewall settings
- Ensure proper SSL/TLS configuration
- Test with different timeout values

## Best Practices

### Security
- **Input Validation**: Always validate tool parameters
- **Error Handling**: Implement comprehensive error handling
- **Rate Limiting**: Respect API rate limits
- **Authentication**: Secure API keys and tokens
- **Permissions**: Follow principle of least privilege

### Performance
- **Async Operations**: Use async/await for I/O operations
- **Connection Pooling**: Reuse HTTP connections
- **Caching**: Cache API responses when appropriate
- **Timeout Handling**: Set reasonable timeouts for external calls

### Development
- **Type Safety**: Use strong typing where available
- **Error Messages**: Provide clear, actionable error messages
- **Documentation**: Document tool parameters and expected behavior
- **Testing**: Write unit tests for tool logic
- **Logging**: Use proper logging for debugging (stderr only for STDIO)

### Tool Design
- **Clear Descriptions**: Write descriptive tool names and descriptions
- **Parameter Validation**: Validate all input parameters
- **Response Formatting**: Return well-formatted, readable responses
- **Error Recovery**: Handle API failures gracefully
- **User Experience**: Design tools for natural language interaction

## Next Steps

### Expand Your Server
- Add more tools for different APIs
- Implement resources for static data
- Create prompts for common tasks
- Add configuration management

### Advanced Features
- **Resource Templates**: Dynamic resource generation
- **Progress Tracking**: Long-running operation support
- **State Management**: Maintain server state across calls
- **Custom Notifications**: Real-time updates to clients

### Integration Patterns
- **Multiple APIs**: Combine data from various sources
- **Workflow Automation**: Chain multiple tool calls
- **Data Transformation**: Convert between formats
- **Authentication Flows**: Handle OAuth and API keys

### Production Deployment
- **Error Monitoring**: Implement comprehensive logging
- **Health Checks**: Add health check endpoints
- **Configuration Management**: Environment-based configuration
- **Scaling**: Handle multiple concurrent connections
- **Security Hardening**: Implement security best practices

This tutorial provides the foundation for building robust MCP servers. The weather server example demonstrates core concepts that apply to any domain-specific integration you want to create.