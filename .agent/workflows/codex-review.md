---
description: Automated Codex review for plans and code changes
---

This workflow defines the process for validating implementation plans and code changes with the Codex MCP server.

1. **Trigger Condition**: 
   - After creating/updating an `implementation_plan.md`.
   - After completing a significant code change or refactor.

2. **Prepare Context**:
   - For Plans: Read the content of `implementation_plan.md`.
   - For Code: Read the content of the modified/created files.

3. **Construct Prompt**:
   - **Plan Review**:
     ```text
     I have created an implementation plan for [Task Description]. Please review it for architecture flaws, missing edge cases, future maintainability, extendability and best practices.
     
     [Content of implementation_plan.md]
     ```
   - **Code Review**:
     ```text
     I have implemented [Feature/Refactor]. Please review the code for correctness, type safety, error handling, and security.
     
     [File Content 1]
     [File Content 2]
     ...
     ```

4. **Invoke Codex**:
   - Use the `mcp_codex_codex` tool.
   - Pass the constructed prompt.
   - Set `cd` to the project root.

5. **Process Feedback**:
   - **Critical Issues**: If Codex identifies bugs, security flaws, or major architectural issues, **YOU MUST FIX THEM** immediately.
   - **Suggestions**: Evaluate suggestions. If they improve code quality or safety, apply them.
   - **Verification**: If changes were made based on feedback, re-run relevant verification steps (e.g., TypeScript check, tests).

6. **Completion**:
   - Update the Task/Walkthrough to indicate validation is complete.
   - "Validated implementation with Codex and applied feedback."