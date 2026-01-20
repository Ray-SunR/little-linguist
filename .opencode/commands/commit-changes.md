---
description: Build and commit changes with a generated message
---

Follow these steps to safely commit your progress:

1. **Safety Check**: Run `npm run build` and `npm run lint`. If either fails, stop and report the errors.
2. **Current Context**:
   - Status: !`git status`
   - Staged changes: !`git diff --cached`
   - Unstaged changes: !`git diff`
3. **Action**:
   - If no changes are currently staged (and `git status` shows modifications), stage the appropriate files using `git add .`.
   - If no changes exist at all, notify the user and stop.
   - Generate a concise, conventional commit message (e.g., feat:, fix:, refactor:).
   - Execute the commit: `git commit -m "<message>"`.
