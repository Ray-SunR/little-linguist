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

2. **Stage Changes**:
   - Run: `git add .`

3. **Generate Commit Message**:
   - Analyze the changes and generate a concise, conventional message.

4. **Execute Commit**:
   - Run: `git commit -m "[Generated Message]"`

5. **Completion**:
   - Notify the user of the successful commit.
