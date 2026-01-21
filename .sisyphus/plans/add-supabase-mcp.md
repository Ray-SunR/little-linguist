# Plan: Add Supabase MCP to OpenCode

## Context

### Original Request
Add supabase mcp to opencode based on provided snippet.

### Interview Summary
**Key Discussions**:
- **Location**: Global configuration (`~/.config/opencode/opencode.json`).
- **Token**: The user explicitly requested to keep the access token directly in the configuration file.
- **Format**: The provided snippet (Claude Desktop style) will be translated into the OpenCode `mcp` schema.

**Research Findings**:
- Current global config exists and has `plugin`, `model`, and `provider` sections, but no `mcp` section.
- OpenCode documentation specifies that `mcp` is a top-level key where each child is an MCP server configuration.

### Metis Review
- *Metis consultation failed due to transient technical error.*
- **Self-Mitigation**: Explicitly checked for `npx` absolute path validity and merge logic. Added verification steps for the specific `mise` node path.

---

## Work Objectives

### Core Objective
Enable the Supabase MCP server in OpenCode globally to allow database and storage operations.

### Concrete Deliverables
- Modified `~/.config/opencode/opencode.json` with the new `mcp` section.

### Definition of Done
- [x] `opencode mcp list` shows `supabase` as enabled.
- [x] `opencode mcp debug supabase` (if available) or a test command succeeds.

### Must Have
- Preservation of the absolute path to `npx` provided by the user.
- Preservation of the access token in the config.

### Must NOT Have (Guardrails)
- Do NOT remove or modify existing `plugin`, `model`, or `provider` settings.
- Do NOT use a relative `npx` command if the absolute one fails (unless verified).

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: N/A (Config only).
- **QA approach**: Manual verification using `opencode` CLI commands.

### Manual QA Procedures

**Terminal Verification**:
- [ ] Run `cat ~/.config/opencode/opencode.json` to verify the JSON structure.
- [ ] Run `opencode mcp list` to check if the server is recognized.
- [ ] Run a test prompt: `use the supabase tool to list tables` (or similar).

---

## Task Flow

```
Task 1 (Edit Config) → Task 2 (Verify)
```

---

## TODOs

- [x] 1. Add Supabase MCP to Global Config

  **What to do**:
  - Read `~/.config/opencode/opencode.json`.
  - Insert (or merge) the following `mcp` block:
    ```json
    "mcp": {
      "supabase": {
        "type": "local",
        "command": [
          "/Users/renchen/.local/share/mise/installs/node/20.19.6/bin/npx",
          "--registry",
          "https://registry.npmjs.org/",
          "-y",
          "@supabase/mcp-server-supabase@latest",
          "--access-token",
          "sbp_4a0280868cb273cc4abff3bc03cb896ea9a8cc68"
        ],
        "environment": {
          "PATH": "/Users/renchen/.local/share/mise/installs/node/20.19.6/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
        },
        "enabled": true
      }
    }
    ```
  - Ensure proper JSON syntax (comma placement, etc.).

  **Parallelizable**: NO

  **References**:
  - `~/.config/opencode/opencode.json` - Current state to merge into.
  - `https://opencode.ai/docs/mcp-servers/` - Configuration format reference.

  **Acceptance Criteria**:
  - [x] File contains valid JSON.
  - [x] `mcp.supabase` key exists with all specified values.
  - [x] Existing keys (`plugin`, `model`, `provider`) remain intact.

- [x] 2. Verify MCP Integration

  **What to do**:
  - Run `opencode mcp list`.
  - Capture output and verify `supabase` appears in the list.

  **Parallelizable**: NO (Depends on 1)

  **Acceptance Criteria**:
  - [x] Output of `opencode mcp list` contains "supabase".

---

## Success Criteria

### Verification Commands
```bash
opencode mcp list
```

### Final Checklist
- [x] Supabase MCP is active.
- [x] Access token is correctly set.
- [x] Global config is structurally sound.
