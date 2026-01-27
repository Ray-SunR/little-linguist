---
description: Build and commit changes with a generated message
---

Follow these steps to safely commit your progress:

1. **Safety Check**: Run the automated full testing script.
   - Run: `npm run test:full`
   - You can use `./scripts/full-test.sh --skip-build` or pass arguments via npm: `npm run test:full -- --skip-build` to skip the production build ONLY if you have successfully built the project in this session, the `.next` directory exists, and you haven't touched server-side code. If in doubt, DO NOT skip the build.
   - **Verification Required**: You MUST wait for the script to finish and then:
     - Check the last 50 lines of output for the final test summary (ensure "0 failed").
     - Search the FULL output (especially if truncated) for "FAIL" or "Error".
     - Inspect background server logs at `/tmp/raiden-server-*.log` for runtime exceptions.
   - If any errors are found, stop and report them. Do NOT proceed to commit.
2. **Current Context**:
   - Status: !`git status`
   - Staged changes: !`git diff --cached`
   - Unstaged changes: !`git diff`
3. **Action**:
   - If no changes are currently staged (and `git status` shows modifications), stage the appropriate files using `git add .`.
   - If no changes exist at all, notify the user and stop.
   - Generate a concise, conventional commit message (e.g., feat:, fix:, refactor:).
   - Execute the commit: `git commit -m "<message>"`.
