---
description: Build and commit changes with a generated message
---

This workflow defines the process for safely committing changes to the repository.

1. **Trigger Condition**: 
   - When the user asks to "commit changes", "save progress", or similar.

// turbo-all

1. **Pre-commit Build**:
   - Run the build command to ensure no compilation errors.
   - Command: `npm run build`

2. **Check for Staged Changes**:
   - Check for existing staged changes: `git diff --cached --quiet`
   - If there are staged changes (exit code 1), skip to step 4 and only commit the staged files.

3. **Stage Changes**:
   - If no changes are staged, stage everything: `git add .`

4. **Generate Commit Message**:
   - Analyze the currently staged changes and generate a concise, conventional message.

5. **Execute Commit**:
   - Run: `git commit -m "[Generated Message]"`

6. **Completion**:
   - Notify the user of the successful commit.
