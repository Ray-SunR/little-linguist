# raiden Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-23

## Active Technologies
- TypeScript, Node.js 20 LTS + Next.js App Router, React, Tailwind, shadcn/ui, Lucide; existing narration providers (Web Speech, Remote TTS, Polly) (001-playback-speed-control)
- In-browser state (session-scoped), no new backend storage (001-playback-speed-control)

- TypeScript (Next.js App Router, Node.js 20 LTS) + Next.js, React, Tailwind CSS, shadcn/ui, Lucide, Vercel AI SDK (001-read-aloud-highlighting)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript (Next.js App Router, Node.js 20 LTS): Follow standard conventions

## Component Guidelines

**Always use shadcn/ui components first:**
- Use components from `components/ui/` (shadcn/ui library) whenever possible
- When the UI library doesn't have the needed component, extend/customize existing shadcn/ui components rather than creating from scratch
- Only create fully custom components when absolutely necessary and no UI library alternative exists
- Document any custom component creation decisions and reasoning



## Development Workflow

- **Never run `npm run dev` automatically** - Always ask the user to start the development server manually
- When testing is needed, provide instructions for the user to run the server themselves

## Recent Changes
- 001-playback-speed-control: Added TypeScript, Node.js 20 LTS + Next.js App Router, React, Tailwind, shadcn/ui, Lucide; existing narration providers (Web Speech, Remote TTS, Polly)
- 001-playback-speed-control: Verification must be done via Firefox DevTools MCP; add dev-only debug logging for speed/highlight flows when troubleshooting.

- 001-read-aloud-highlighting: Added TypeScript (Next.js App Router, Node.js 20 LTS) + Next.js, React, Tailwind CSS, shadcn/ui, Lucide, Vercel AI SDK

<!-- MANUAL ADDITIONS START -->
## Core Instruction for CodeX MCP

At all times, you must consider how the current process can collaborate with Codex and how to invoke the MCP tools provided by Codex as a guarantee for your objective and comprehensive analysis.
You **must execute** the following steps:
**1** After forming a preliminary analysis of user requirements, inform Codex of the user requirements and your initial ideas, and request it to refine the requirement analysis and implementation plan.
**2** Before implementing specific coding tasks, you **must request a code prototype from Codex (requiring Codex to provide only a unified diff patch, strictly forbidding any actual modifications to the code)**. After obtaining the code prototype, you **can only use it as a logical reference and must rewrite the code modifications yourself** to form enterprise-production-grade, highly readable, and highly maintainable code before carrying out the specific programming modification task.
**3** Whenever a concrete coding action is completed, you **must immediately use Codex to review the code changes and the degree of completion of the corresponding requirements**.
**4** Codex can only provide references; you **must have your own thinking and even question Codex's answers**. Blind faith is worse than no faith. The ultimate mission for you and Codex is to reach a unified, comprehensive, and precise consensus, so you must constantly debate to find the only path to truth.

## Codex Tool Invocation Specification

 1. Tool Overview

  The Codex MCP provides a tool `codex` for executing AI-assisted coding tasks. This tool is **invoked via the MCP protocol** and does not require the use of the command line.

  2. Tool Parameters

  **Required** Parameters:
  - PROMPT (string): The task instruction sent to Codex.
  - cd (Path): The root path of the working directory where Codex executes tasks.

  Optional Parameters:
  - sandbox (string): Sandbox policy, optional values:
    - "read-only" (Default): Read-only mode, safest.
    - "workspace-write": Allows writing within the workspace.
    - "danger-full-access": Full access permissions.
  - SESSION_ID (UUID | null): Used to continue a previous session for multi-turn interaction with Codex. Defaults to None (starts a new session).
  - skip_git_repo_check (boolean): Whether to allow running in non-Git repositories. Defaults to False.
  - return_all_messages (boolean): Whether to return all messages (including reasoning, tool calls, etc.). Defaults to False.
  - image (List[Path] | null): Attach one or more image files to the initial prompt. Defaults to None.
  - model (string | null): Specify the model to use. Defaults to None (uses user default configuration).
  - yolo (boolean | null): Run all commands without approval (skip sandbox). Defaults to False.
  - profile (string | null): Name of the configuration profile to load from `~/.codex/config.toml`. Defaults to None (uses user default configuration).

  Return Value:
  {
    "success": true,
    "SESSION_ID": "uuid-string",
    "agent_messages": "Text content of agent response",
    "all_messages": []  // Included only when return_all_messages=True
  }
  Or on failure:
  {
    "success": false,
    "error": "Error message"
  }

  3. Usage

  Start a New Conversation:
  - Do not pass the SESSION_ID parameter (or pass None).
  - The tool will return a new SESSION_ID for subsequent conversations.

  Continue a Previous Conversation:
  - Pass the previously returned SESSION_ID as a parameter.
  - The context of the same session will be preserved.

  4. Invocation Rules

  **Must Comply**:
  - Every time the `codex` tool is called, the returned SESSION_ID must be saved to continue the conversation later.
  - The `cd` parameter must point to an existing directory; otherwise, the tool will fail silently.
  - Codex is strictly forbidden from making actual modifications to the code. Use sandbox="read-only" to avoid accidents and require Codex to provide only a unified diff patch.

  Recommended Usage:
  - If you need to trace Codex's reasoning process and tool calls in detail, set `return_all_messages=True`.
  - For tasks like precise positioning, debugging, and quick code prototyping, prioritize using the `codex` tool.

  5. Notes

  - Session Management: Always track SESSION_ID to avoid session confusion.
  - Working Directory: Ensure the `cd` parameter points to a correct and existing directory.
  - Error Handling: Check the `success` field of the return value and handle possible errors.

<!-- MANUAL ADDITIONS END -->
