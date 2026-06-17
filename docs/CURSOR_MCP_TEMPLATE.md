# Cursor MCP Config Template (Unified)

**Target repo:** `techdev-cursor` fork (not upstream `techdev`).  
**Server:** `techsapo-providers` — use **`node` directly**; do **not** use `npm run codex-mcp` (daemonizes, breaks stdio).

Copy into **Cursor Settings → MCP** or project MCP config. Replace `<USER>` with your WSL username.

```json
{
  "mcpServers": {
    "techsapo-providers": {
      "command": "node",
      "args": ["dist/services/techsapo-providers-mcp-server.js"],
      "cwd": "/home/<USER>/techdev-cursor"
    }
  }
}
```

**Prerequisites:** [CURSOR_MCP_TODO Track A-0](./CURSOR_MCP_TODO.md#a-0-wsl-native-install--authentication) · [FORK_CURSOR.md](./FORK_CURSOR.md)

**Legacy:** [config/cursor-mcp.template.json](../config/cursor-mcp.template.json) in upstream may still show dual-server until fork updates it.
