---
description: Build and commit changes with a generated message
---

This workflow defines the process for safely committing changes to the repository.

1. **Trigger Condition**: 
   - When the user asks to "commit changes", "save progress", or similar.

2. **Pre-commit Check**:
   - Run the build command to ensure no compilation errors.
   - Command: `npm run build`
   - **Action**: If the build fails, **ABORT** the commit and report errors to the user. Fix the errors before retrying.

3. **Generate Commit Message**:
   - Analyze the changes made since the last commit (using `git status` and `git diff --staged` or internal knowledge of recent edits).
   - Generate a concise, conventional commit message (e.g., `feat: ...`, `fix: ...`, `refactor: ...`).
   - Style Guide:
     - Imperative mood ("Add feature" not "Added feature").
     - First line < 50 chars.
     - Optional body for details.

4. **Execute Commit**:
   - Run: `git add .` (or specific files if requested).
   - Run: `git commit -m "[Generated Message]"`

5. **Completion**:
   - Notify the user of the successful commit and the message used.
