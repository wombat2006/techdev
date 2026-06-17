# Cursor MCP Integration Plan

**Status**: PLANNING — Phase 0 prerequisite defined; Cursor MCP servers not registered yet  
**Owner**: TechSapo Development Team  
**Last updated**: 2026-06-17

Register TechSapo provider MCP servers in **Cursor IDE** so Agent tool calls can use **subscription quota** (`claude`, `codex`, `agy`) instead of Cursor-only models.

**Execution checklist:** [CURSOR_MCP_TODO.md](./CURSOR_MCP_TODO.md) (step-by-step; Track A → Gate → B → Gate → C)

Related: [MCP_SERVICES.md](./MCP_SERVICES.md) · [DEVELOPMENT_GUIDE.md § WSL Native CLI](./DEVELOPMENT_GUIDE.md#wsl-native-cli-prerequisites-cursor-mcp-phase-0) · [TECH_STACK_INFERENCE_PROFILES.md](./decisions/TECH_STACK_INFERENCE_PROFILES.md)

---

## Goal

| Objective | Detail |
|-----------|--------|
| **Subscription quota** | Route Cursor MCP invocations through peer provider CLIs (MAX, Codex, Antigravity) |
| **InferenceProfile** | Pass model, effort, CoT, temperature via MCP args (Phase 2+) |
| **Wall-Bounce alignment** | Same adapters as `wall-bounce-analyzer.ts` — no duplicate spawn logic |

**Out of scope (this plan):** Replacing Cursor Agent reasoning entirely; Tab completion; BYOK API keys in Cursor Settings.

---

## Phases

| Phase | Name | Status |
|-------|------|--------|
| **0** | **WSL native install + auth** | **Defined — MUST complete before Phase 1** |
| 1 | Cursor MCP server registration | Planned |
| 2 | InferenceProfile pass-through | Planned |
| 3 | Wall-Bounce ↔ Cursor unified config | Planned |

**Hard rule:** Do **not** register Cursor MCP servers until **Phase 0 verification** passes for all three peer CLIs.

---

## Phase 0: WSL Native Install + Authentication (Prerequisite)

### Why WSL-native?

On WSL2, **Windows-installed CLIs** (`/mnt/c/.../npm/claude`, `codex.cmd`, `.exe`) often **fail** with `Exec format error`. Cursor MCP servers spawn processes in the **WSL environment**; they require **Linux-native binaries on PATH**.

| CLI | Wrong (Windows via WSL) | Correct (WSL native) |
|-----|-------------------------|----------------------|
| Claude Code | `/mnt/c/.../npm/claude` → `.exe` | `~/.nvm/.../bin/claude` |
| Codex | `/mnt/c/.../npm/codex` | `npm install -g @openai/codex` in WSL |
| Antigravity | — | `~/.local/bin/agy` (already WSL) |

### 0.1 Claude Code (Anthropic MAX / OAuth)

```bash
# Install (WSL)
npm install -g @anthropic-ai/claude-code

# Auth — option A: symlink Windows OAuth (if MAX login done on Windows)
mkdir -p ~/.claude
ln -sf /mnt/c/Users/<YOU>/.claude/.credentials.json ~/.claude/.credentials.json

# Auth — option B: login inside WSL
claude login

# Prevent API-key billing override
unset ANTHROPIC_API_KEY
# Remove ANTHROPIC_API_KEY from ~/.bashrc if set

# Verify
which claude          # must be WSL path, not /mnt/c/...
claude --version
claude --print --model sonnet --effort low "Reply with only: ok"
```

**Acceptance:** `claude --print` succeeds without `ANTHROPIC_API_KEY`; binary is WSL-native.

### 0.2 Codex (OpenAI subscription)

```bash
# Install (WSL) — do NOT rely on Windows npm codex
npm install -g @openai/codex

# Auth
codex login

# Verify auth file exists (WSL home)
test -f ~/.codex/auth.json && echo "codex auth ok"

# Verify
which codex           # must be WSL path
codex --version
codex --print "Reply with only: ok"    # or project-equivalent non-interactive probe
```

**Acceptance:** `~/.codex/auth.json` under WSL home; `codex` runs without Windows interop errors.

**Note:** `config/codex-mcp.toml` currently references a Windows auth path — update to `~/.codex/auth.json` (WSL) during Phase 1.

### 0.3 Antigravity (`agy`)

```bash
# Already WSL-native if installed to ~/.local/bin
which agy
agy --version

# Auth (follow Antigravity docs)
agy auth login   # or equivalent for your install

# Verify
agy --print --model gemini-2.5-flash "Reply with only: ok"
```

**Acceptance:** `agy` on WSL PATH; auth valid for Google/Antigravity subscription.

### 0.4 Environment checklist

| Check | Command / condition |
|-------|---------------------|
| Node.js WSL | `node --version` (≥18) |
| PATH order | WSL `claude`/`codex` before any `/mnt/c/.../npm` |
| No API key override | `ANTHROPIC_API_KEY` unset for Claude OAuth |
| Project build | `cd ~/techdev && npm run build` |
| Peer CLIs verified | All three acceptance probes pass |

### 0.5 Phase 0 sign-off

Record in team notes or issue when complete:

```
[ ] claude  — WSL native + OAuth
[ ] codex   — WSL native + ~/.codex/auth.json
[ ] agy     — WSL native + auth
[ ] which claude/codex/agy — no /mnt/c/... npm shims
```

Only then proceed to **Phase 1**.

---

## Phase 1: Cursor MCP Registration (Planned)

Target MCP servers (stdio, run from repo root):

| Cursor MCP name | Command | Purpose |
|-----------------|---------|---------|
| `techsapo-codex` | `npm run codex-mcp` | OpenAI Codex subscription |
| `techsapo-claude` | `npm run claude-code-mcp` | Claude Code / MAX |
| `techsapo-*` (agy) | TBD — agy MCP wrapper or spawn adapter | Google Antigravity |

Example `~/.cursor/mcp.json` or **Cursor Settings → MCP** (exact path TBD in Phase 1):

```json
{
  "mcpServers": {
    "techsapo-codex": {
      "command": "npm",
      "args": ["run", "codex-mcp"],
      "cwd": "/home/<user>/techdev"
    },
    "techsapo-claude": {
      "command": "npm",
      "args": ["run", "claude-code-mcp"],
      "cwd": "/home/<user>/techdev"
    }
  }
}
```

**Phase 1 tasks:**

1. Confirm stdio MCP starts after Phase 0 (`npm run build && npm run codex-mcp-test`)
2. Document canonical Cursor config location for WSL + Cursor Desktop
3. Fix `config/codex-mcp.toml` auth path for WSL
4. Add agy MCP or document gap if no MCP wrapper exists yet

---

## Phase 2: InferenceProfile Pass-Through (Planned)

- MCP tool schemas accept `InferenceProfile` fields (model, effort, cot, temperature)
- Map to CLI flags per [TECH_STACK_INFERENCE_PROFILES.md](./decisions/TECH_STACK_INFERENCE_PROFILES.md)
- Presets: `fast` | `balanced` | `deep` | `critical`

---

## Phase 3: Unified Config (Planned)

- Single `config/inference-profiles.json` consumed by Wall-Bounce and Cursor MCP adapters
- Workspace template: [config/cursor-mcp.template.json](../config/cursor-mcp.template.json) — see [CURSOR_MCP_TODO.md § A-3](./CURSOR_MCP_TODO.md#a-3-unified-config-template)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Windows CLI on PATH | Phase 0 `which` checks; document PATH hygiene |
| Cursor Agent still uses Cursor quota for planning | Expected — MCP tools use subscription; see [DEVELOPMENT_GUIDE](./DEVELOPMENT_GUIDE.md) |
| Dual auth (Windows + WSL) drift | Prefer WSL `login` or documented symlink refresh |
| codex-mcp.toml Windows paths | Fix in Phase 1 |

---

## Related Documents

- [DEVELOPMENT_GUIDE.md § WSL Native CLI](./DEVELOPMENT_GUIDE.md#wsl-native-cli-prerequisites-cursor-mcp-phase-0)
- [CURSOR_MCP_TODO.md](./CURSOR_MCP_TODO.md) (Phased Execution Runbook)
- [codex-mcp-implementation.md](./codex-mcp-implementation.md)
- [CLAUDE_CODE_MCP_IMPLEMENTATION.md](./CLAUDE_CODE_MCP_IMPLEMENTATION.md)
- [TECH_STACK_WORKSPACE.md § TS-21](./TECH_STACK_WORKSPACE.md) (backlog)
