# Connect to Local MCP Servers with Claude Desktop

> Learn how to extend Claude Desktop with local MCP servers to enable file system access and other powerful integrations

Model Context Protocol (MCP) servers extend AI applications' capabilities by providing secure, controlled access to local resources and tools. Many clients support MCP, enabling diverse integration possibilities across different platforms and applications.

This guide demonstrates how to connect to local MCP servers using Claude Desktop as an example, one of the many clients that support MCP. While we focus on Claude Desktop's implementation, the concepts apply broadly to other MCP-compatible clients. By the end of this tutorial, Claude will be able to interact with files on your computer, create new documents, organize folders, and search through your file system—all with your explicit permission for each action.

## Prerequisites

Before starting this tutorial, ensure you have the following installed on your system:

### Claude Desktop

Download and install [Claude Desktop](https://claude.ai/download) for your operating system. Claude Desktop is currently available for macOS and Windows. Linux support is coming soon.

If you already have Claude Desktop installed, verify you're running the latest version by clicking the Claude menu and selecting "Check for Updates..."

### Node.js

The Filesystem Server and many other MCP servers require Node.js to run. Verify your Node.js installation by opening a terminal or command prompt and running:

```bash
node --version
```

If Node.js is not installed, download it from [nodejs.org](https://nodejs.org/). We recommend the LTS (Long Term Support) version for stability.

## Understanding MCP Servers

MCP servers are programs that run on your computer and provide specific capabilities to Claude Desktop through a standardized protocol. Each server exposes tools that Claude can use to perform actions, with your approval. The Filesystem Server we'll install provides tools for:

* Reading file contents and directory structures
* Creating new files and directories
* Moving and renaming files
* Searching for files by name or content

All actions require your explicit approval before execution, ensuring you maintain full control over what Claude can access and modify.

## Installing the Filesystem Server

The process involves configuring Claude Desktop to automatically start the Filesystem Server whenever you launch the application. This configuration is done through a JSON file that tells Claude Desktop which servers to run and how to connect to them.

### Step 1: Open Claude Desktop Settings

Start by accessing the Claude Desktop settings. Click on the Claude menu in your system's menu bar (not the settings within the Claude window itself) and select "Settings..."

On macOS, this appears in the top menu bar. This opens the Claude Desktop configuration window, which is separate from your Claude account settings.

### Step 2: Access Developer Settings

In the Settings window, navigate to the "Developer" tab in the left sidebar. This section contains options for configuring MCP servers and other developer features.

Click the "Edit Config" button to open the configuration file. This action creates a new configuration file if one doesn't exist, or opens your existing configuration. The file is located at:

* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Step 3: Configure the Filesystem Server

Replace the contents of the configuration file with the following JSON structure. This configuration tells Claude Desktop to start the Filesystem Server with access to specific directories:

#### macOS Configuration
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Desktop",
        "/Users/username/Downloads"
      ]
    }
  }
}
```

#### Windows Configuration
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\username\\Desktop",
        "C:\\Users\\username\\Downloads"
      ]
    }
  }
}
```

Replace `username` with your actual computer username. The paths listed in the `args` array specify which directories the Filesystem Server can access. You can modify these paths or add additional directories as needed.

#### Understanding the Configuration

* `"filesystem"`: A friendly name for the server that appears in Claude Desktop
* `"command": "npx"`: Uses Node.js's npx tool to run the server
* `"-y"`: Automatically confirms the installation of the server package
* `"@modelcontextprotocol/server-filesystem"`: The package name of the Filesystem Server
* The remaining arguments: Directories the server is allowed to access

> **Security Consideration**: Only grant access to directories you're comfortable with Claude reading and modifying. The server runs with your user account permissions, so it can perform any file operations you can perform manually.

### Step 4: Restart Claude Desktop

After saving the configuration file, completely quit Claude Desktop and restart it. The application needs to restart to load the new configuration and start the MCP server.

Upon successful restart, you'll see an MCP server indicator in the bottom-right corner of the conversation input box. Click on this indicator to view the available tools provided by the Filesystem Server.

If the server indicator doesn't appear, refer to the [Troubleshooting](#troubleshooting) section for debugging steps.

## Using the Filesystem Server

With the Filesystem Server connected, Claude can now interact with your file system. Try these example requests to explore the capabilities:

### File Management Examples

* **"Can you write a poem and save it to my desktop?"** - Claude will compose a poem and create a new text file on your desktop
* **"What work-related files are in my downloads folder?"** - Claude will scan your downloads and identify work-related documents
* **"Please organize all images on my desktop into a new folder called 'Images'"** - Claude will create a folder and move image files into it

### How Approval Works

Before executing any file system operation, Claude will request your approval. This ensures you maintain control over all actions. Review each request carefully before approving. You can always deny a request if you're not comfortable with the proposed action.

## Multiple Server Configuration

You can configure multiple MCP servers in the same configuration file. Here's an example with both filesystem and weather servers:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Desktop",
        "/Users/username/Downloads"
      ]
    },
    "weather": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-weather"
      ],
      "env": {
        "WEATHER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Advanced Configuration Options

### Environment Variables

Some servers require environment variables for configuration:

```json
{
  "mcpServers": {
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

### Local Server Execution

Instead of using npx, you can run locally installed servers:

```json
{
  "mcpServers": {
    "custom-server": {
      "command": "node",
      "args": ["/path/to/your/server.js"],
      "cwd": "/path/to/server/directory"
    }
  }
}
```

### Python-based Servers

For Python-based MCP servers:

```json
{
  "mcpServers": {
    "python-server": {
      "command": "python",
      "args": ["-m", "your_mcp_server"],
      "env": {
        "PYTHONPATH": "/path/to/your/python/modules"
      }
    }
  }
}
```

## Troubleshooting

If you encounter issues setting up or using MCP servers, these solutions address common problems:

### Server not showing up in Claude / hammer icon missing

1. **Restart Claude Desktop completely** - Close the application entirely and reopen it
2. **Check your `claude_desktop_config.json` file syntax** - Ensure valid JSON formatting
3. **Verify file paths** - Make sure paths in the config are valid, absolute (not relative) paths
4. **Check logs** - Look at [logs](#getting-logs-from-claude-desktop) to see why the server is not connecting
5. **Test manual server execution** - Try running the server manually in your command line:

**macOS/Linux:**
```bash
npx -y @modelcontextprotocol/server-filesystem /Users/username/Desktop /Users/username/Downloads
```

**Windows:**
```powershell
npx -y @modelcontextprotocol/server-filesystem C:\Users\username\Desktop C:\Users\username\Downloads
```

### Getting logs from Claude Desktop

Claude Desktop logging related to MCP is written to log files in:

* **macOS**: `~/Library/Logs/Claude`
* **Windows**: `%APPDATA%\Claude\logs`

Important log files:
* `mcp.log` - Contains general logging about MCP connections and connection failures
* `mcp-server-SERVERNAME.log` - Contains error (stderr) logging from the named server

View recent logs and follow along with new ones:

**macOS/Linux:**
```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

**Windows:**
```powershell
type "%APPDATA%\Claude\logs\mcp*.log"
```

### Tool calls failing silently

If Claude attempts to use the tools but they fail:

1. Check Claude's logs for errors
2. Verify your server builds and runs without errors
3. Try restarting Claude Desktop
4. Ensure the server has proper permissions for the requested operations

### ENOENT error and `${APPDATA}` in paths on Windows

If your configured server fails to load, and you see within its logs an error referring to `${APPDATA}` within a path, you may need to add the expanded value of `%APPDATA%` to your `env` key in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "APPDATA": "C:\\Users\\user\\AppData\\Roaming\\",
        "BRAVE_API_KEY": "..."
      }
    }
  }
}
```

> **NPM should be installed globally**: The `npx` command may continue to fail if you have not installed NPM globally. If NPM is already installed globally, you will find `%APPDATA%\npm` exists on your system. If not, you can install NPM globally by running: `npm install -g npm`

### Configuration File Location Issues

If you can't find or access the configuration file:

**macOS:**
```bash
# Open the directory in Finder
open ~/Library/Application\ Support/Claude/

# Create the file if it doesn't exist
touch ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**
```powershell
# Open the directory in Explorer
explorer %APPDATA%\Claude

# Create the file if it doesn't exist
type nul > "%APPDATA%\Claude\claude_desktop_config.json"
```

### JSON Syntax Validation

Validate your configuration file syntax:

```bash
# Using jq (if installed)
jq '.' ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Using Python
python -m json.tool ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Permission Issues

If the server can't access specified directories:

1. **Verify directory existence** - Ensure all paths in your configuration actually exist
2. **Check permissions** - Make sure you have read/write access to the directories
3. **Use absolute paths** - Always use full paths, not relative ones
4. **Test access manually** - Try accessing the directories through your file manager

### Server Dependency Issues

If servers fail to install or run:

1. **Update Node.js** - Ensure you're running a recent LTS version
2. **Clear npm cache** - Run `npm cache clean --force`
3. **Check network connectivity** - Ensure you can download packages from npm
4. **Manual installation** - Try installing the server package globally: `npm install -g @modelcontextprotocol/server-filesystem`

## Security Considerations

### Directory Access Control

* **Principle of Least Privilege** - Only grant access to directories that are necessary for your use case
* **Avoid System Directories** - Don't include system folders like `/System`, `/Windows`, or `/Program Files`
* **Review Regularly** - Periodically review and update your directory access list

### Sensitive Data Protection

* **Exclude Sensitive Folders** - Don't include directories containing passwords, private keys, or personal documents
* **Environment Variables** - Store API keys and sensitive configuration in environment variables, not in the config file
* **Regular Audits** - Monitor the actions Claude performs through the approval dialogs

### Network Security

* **Local Servers Only** - This guide covers local servers; remote servers have additional security considerations
* **Firewall Configuration** - Ensure local MCP servers don't expose unnecessary network ports
* **Update Dependencies** - Keep MCP server packages updated to receive security patches

## Popular MCP Servers

Here are some commonly used MCP servers you can add to your configuration:

### Official Servers

**Filesystem Server** - File and directory operations:
```json
"filesystem": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"]
}
```

**GitHub Server** - Repository management:
```json
"github": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token"
  }
}
```

**SQLite Server** - Database operations:
```json
"sqlite": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sqlite", "/path/to/database.db"]
}
```

**Brave Search Server** - Web search capabilities:
```json
"brave-search": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": {
    "BRAVE_API_KEY": "your-api-key"
  }
}
```

### Community Servers

Check the [MCP servers repository](https://github.com/modelcontextprotocol/servers) for additional community-created servers.

## Performance Optimization

### Server Startup Time

* **Use Global Installation** - Install frequently used servers globally to reduce startup time
* **Minimize Directory Scope** - Limit filesystem access to only necessary directories
* **Server Pooling** - Consider running long-lived servers outside of Claude Desktop for better performance

### Resource Management

* **Monitor Resource Usage** - Keep an eye on memory and CPU usage of MCP servers
* **Optimize Server Count** - Don't run unnecessary servers simultaneously
* **Log Management** - Rotate or clean up log files periodically

## Next Steps

Now that you've successfully connected Claude Desktop to a local MCP server, explore these options to expand your setup:

### Explore Additional Servers
Browse the collection of official and community-created MCP servers for additional capabilities. The [MCP servers repository](https://github.com/modelcontextprotocol/servers) contains many useful servers for different purposes.

### Build Custom Servers
Create custom MCP servers tailored to your specific workflows and integrations. See our [MCP Integration Guide](./mcp-integration-guide.md) for development patterns and examples.

### Connect to Remote Servers
Learn how to connect Claude to remote MCP servers for cloud-based tools and services. Remote servers use different transport mechanisms and security considerations.

### Understand the Architecture
Dive deeper into how MCP works by reading our [MCP Architecture Overview](./mcp-architecture.md) and [MCP Overview](./mcp-overview.md) documentation.

### Advanced Configuration
Explore more complex setups including:
* Multiple server orchestration
* Custom transport protocols
* Advanced security configurations
* Performance monitoring and optimization

For additional help and troubleshooting, refer to our [MCP Troubleshooting Guide](./mcp-troubleshooting.md) which covers common issues and debugging techniques.