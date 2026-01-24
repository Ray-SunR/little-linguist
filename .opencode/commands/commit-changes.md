---
description: Build and commit changes with a generated message
---

Follow these steps to safely commit your progress:

1. **Safety Check**: Run all tests before committing.
   - Unit + integration: `npm run test`
   - Build before E2E: `npm run build`
   - Start production server (deterministic port + mocked AI): `MOCK_AI_SERVICES=true PORT=3001 npx dotenv-cli -e .env.development.local -- npm run start`
   - E2E (against the running server): `BASE_URL=http://localhost:3001 npm run test:e2e`
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
