---
description: Build and commit changes with a generated message
---

Follow these steps to safely commit your progress:

1. **Safety Check**: Run all tests before committing.
   - Unit + integration: `npm run test`
   - Build before E2E: `npx dotenv-cli -e .env.development.local -- npm run build`
   - Start production server:
     1. Find a free port: `FREE_PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("", 0)); print(s.getsockname()[1]); s.close()')`
     2. Start server in background with logs: `MOCK_AI_SERVICES=true PORT=$FREE_PORT npx dotenv-cli -e .env.development.local -- npm run start > /tmp/raiden-server-$FREE_PORT.log 2>&1 &`
     3. Save the PID: `SERVER_PID=$!`
     4. Wait for the server to be ready on `http://localhost:$FREE_PORT`.
     5. Report the log file path: `/tmp/raiden-server-$FREE_PORT.log`
   - E2E (against the running server): `BASE_URL=http://localhost:$FREE_PORT npm run test:e2e`
   - Cleanup: Kill the server process using `kill $SERVER_PID` or `lsof -ti:$FREE_PORT | xargs kill -9`.
   - If any command fails, stop and report the errors.
2. **Current Context**:
   - Status: !`git status`
   - Staged changes: !`git diff --cached`
   - Unstaged changes: !`git diff`
3. **Action**:
   - If no changes are currently staged (and `git status` shows modifications), stage the appropriate files using `git add .`.
   - If no changes exist at all, notify the user and stop.
   - Generate a concise, conventional commit message (e.g., feat:, fix:, refactor:).
   - Execute the commit: `git commit -m "<message>"`.
