# Raiden ⚡️

AI-powered reading companion for kids.

## 🚀 Quick Start

1.  **Install dependencies**
    ```bash
    npm install
    ```

2.  **Setup Local Environment** (Zero-to-Hero)
    ```bash
    npm run supabase:setup
    ```
    *   This spins up local Supabase, syncs env vars, applies migrations, and seeds test data.
    *   **Optional**: Run `npm run supabase:setup -- --sync-data` to pull production data (requires `.env.local`).

3.  **Start Development Server**
    ```bash
    npm run dev
    ```

## 📚 Documentation

-   **[Development Guidelines](./AGENTS.md)**: For AI agents and contributors.
-   **[Full Documentation](./docs/README.md)**: Architecture, features, and infrastructure.
-   **[Local Development Guide](./docs/guides/local-development.md)**: Detailed setup options.

## 📱 Mobile

Sync changes to Capacitor (iOS/Android):
```bash
npm run mobile:sync
```
