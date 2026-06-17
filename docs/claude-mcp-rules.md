# Claude Code — MCP Usage Rules

[← CLAUDE.md skeleton](../CLAUDE.md) · [MCP Services Architecture](./MCP_SERVICES.md)

**MCP usage rules** when Claude Code works in this repository. Implementation details: [MCP_SERVICES.md](./MCP_SERVICES.md).

---

## Integrated MCP Servers

| Server | Purpose |
|--------|---------|
| **Serena MCP** | Semantic code navigation and symbol-based editing (PRIMARY) |
| **Cipher MCP** | Long-term memory and knowledge management |
| **Codex MCP** | GPT-5 / GPT-5-Codex + approval workflows |
| **Context7 MCP** | Library documentation lookup |

---

## Rule 0: Code Navigation (Serena MCP) — PRIMARY

```
✅ ALWAYS use Serena MCP for all code operations
✅ Use Serena for:
   - Reading files (NOT Read tool)
   - Finding symbols/classes/methods
   - Searching code patterns
   - Symbol-based editing
   - Understanding code structure
```

```bash
# Find symbol
mcp__serena__find_symbol(name_path="WallBounceAnalyzer")

# Search pattern
mcp__serena__search_for_pattern(substring_pattern="executeWallBounce")

# Read file
mcp__serena__read_file(relative_path="src/services/wall-bounce-analyzer.ts")
```

---

## Rule 1: Memory Management (Cipher MCP)

```
✅ ALWAYS use Cipher MCP to store new information
✅ Call ask_cipher after:
   - Learning new patterns or solutions
   - Discovering codebase insights
   - Completing major tasks
   - Encountering errors and fixes
```

Example: store a Wall-Bounce optimization pattern — auto-trigger provider escalation when consensus < 0.6.

---

## Rule 2: Coding Consultation (Codex MCP)

```
✅ ALWAYS consult Codex before:
   - Writing new features
   - Refactoring existing code
   - Debugging complex issues
   - Architecture decisions
```

Example: design SSE streaming for Wall-Bounce to show real-time LLM output to users.

---

## Rule 3: SDK/Library Reference (Context7 MCP)

```
✅ ALWAYS check Context7 before:
   - Using new libraries or SDKs
   - Implementing API integrations
   - Following framework best practices
   - Verifying syntax and patterns
```

Example: latest Express.js SSE middleware patterns.

---

## Rule 4: Cursor MCP (TechSapo providers — Planned)

```
⛔ Do NOT register Cursor MCP until Phase 0 complete
✅ Phase 0 FIRST: WSL-native claude + codex + agy with auth
✅ THEN: register techsapo-codex / techsapo-claude in Cursor Settings → MCP
```

Phase 0 is **mandatory**: Cursor spawns MCP in WSL; Windows `/mnt/c/.../npm` CLIs fail.

→ [CURSOR_MCP_PLAN.md](./CURSOR_MCP_PLAN.md)  
→ [CURSOR_MCP_TODO.md](./CURSOR_MCP_TODO.md) (execution runbook)  
→ [DEVELOPMENT_GUIDE.md § WSL Native CLI](./DEVELOPMENT_GUIDE.md#wsl-native-cli-prerequisites-cursor-mcp-phase-0)

---

## Workflow Example

```typescript
// Step 1: Check documentation (Context7)
const expressDoc = await context7.getLibraryDocs('/expressjs/express', {
  topic: 'server-sent-events'
});

// Step 2: Consult Codex for implementation
const implementation = await codex({
  prompt: `Based on this Express SSE documentation: ${expressDoc}
           Implement real-time streaming for Wall-Bounce analysis`,
  model: 'gpt-5-codex'
});

// Step 3: Store solution (Cipher)
await cipher.askCipher({
  message: `Remember: SSE streaming for Wall-Bounce requires:
            1. Content-Type: text/event-stream
            2. res.flushHeaders() before streaming
            3. EventEmitter pattern for real-time events`
});
```

---

## MCP Protocol Files

| File | Role |
|------|------|
| `src/services/mcp-integration-service.ts` | Central orchestrator |
| `src/services/mcp-approval-manager.ts` | Risk-based approvals |
| `src/services/mcp-config-manager.ts` | Tool optimization |
| `src/services/codex-mcp-server.ts` | Codex integration |

See also: [mcp-integration-guide.md](./mcp-integration-guide.md) · [codex-mcp-implementation.md](./codex-mcp-implementation.md)
