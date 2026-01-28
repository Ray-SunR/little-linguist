# Raiden ⚡️

AI-powered reading companion for kids.

## 🚀 Quick Start

1.  **Install dependencies**
    ```bash
    npm install
    ```

2.  **Hydrate Environment (One-Shot Setup)**
    *   **Local**: `npm run supabase:setup` (Spins up Docker, applies migrations, seeds test data).
    *   **Beta**: `npm run supabase:setup:beta` (Hydrates the remote staging environment).
    
    *Both commands automatically sync AI keys from your `.env.local` — the **Unified Source of Truth**.*

3.  **Start Development Server**
    ```bash
    npm run dev
    ```

## 🌍 Environment Tiers

| Tier | Purpose | Database | AI Services |
| :--- | :--- | :--- | :--- |
| **Local** | Day-to-day development | Docker (Supabase CLI) | Real (via `.env.local`) |
| **Beta** | Integration testing & Staging | Remote Supabase (Beta) | Real (via `.env.local`) |
| **Prod** | Live application | Remote Supabase (Prod) | Real |

> [!TIP]
> Use `.env.local` to store all AI service keys (Claude, Gemini, Polly). Our setup scripts ensure these are propagated across environments safely.

## ⚠️ Production Safety

**CRITICAL**: The Production environment is strictly protected.
- **NEVER** run `db reset`, `db push`, or any destructive migration against the Production database.
- Database changes must be verified in **Local** and **Beta** before being promoted to Production.

## 📚 Documentation

-   **[Development Guidelines](./AGENTS.md)**: For AI agents and contributors.
-   **[Full Documentation](./docs/README.md)**: Architecture, features, and infrastructure.
-   **[Local Development Guide](./docs/guides/local-development.md)**: Detailed setup options.

## 📱 Mobile

Sync changes to Capacitor (iOS/Android):
```bash
npm run mobile:sync
```
