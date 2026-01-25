---
description: Build and commit changes with a generated message
---

Follow these steps to safely commit your progress:

1. **Safety Check**: Run the automated full testing script.
   - Run: `npm run test:full`
   - You can use `./scripts/full-test.sh --skip-build` or pass arguments via npm: `npm run test:full -- --skip-build` to skip the production build if it was recently run and you haven't touched server-side code.
   - If the command fails, stop and report the errors.
   - Logs for the background server are available at `/tmp/raiden-server-*.log`.
2. **Current Context**:
   - Status: !`git status`
   - Staged changes: !`git diff --cached`
   - Unstaged changes: !`git diff`
3. **Action**:
   - If no changes are currently staged (and `git status` shows modifications), stage the appropriate files using `git add .`.
   - If no changes exist at all, notify the user and stop.
   - Generate a concise, conventional commit message (e.g., feat:, fix:, refactor:).
   - Execute the commit: `git commit -m "<message>"`.
