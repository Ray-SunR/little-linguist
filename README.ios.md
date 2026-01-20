# iOS Development & Testing Guide

This guide covers the workflow for developing and testing LumoMind on iOS using Capacitor.

## 🚀 Quick Start (Local Development)

To test the app on a physical device or simulator with hot-reload from your local machine:

1.  **Start the Next.js dev server**:
    ```bash
    npm run dev
    ```
2.  **Sync Capacitor (Automated)**:
    Simply run the following to auto-detect your local IP and sync:
    ```bash
    npm run mobile:dev
    ```
    *Note: If you need to force a specific IP, you can still use `CAPACITOR_SERVER_URL=http://x.x.x.x:3000 npx cap sync`.*
3.  **Open Xcode**:
    ```bash
    npm run mobile:open
    ```
4.  **Run in Xcode**: Select your device/simulator and press **Play**.

---

## 🔑 Authentication Setup (Supabase)

For Google Sign-In to work on iOS, you must configure the redirect URL:

1.  Go to **Supabase Dashboard** > **Authentication** > **URL Configuration**.
2.  Add the following to **Redirect URLs**:
    `com.lumomind.app://auth/callback`
3.  Ensure the `Site URL` is set to your production domain (e.g., `https://lumomind.vercel.app`).

---

## 🛠️ Commands Reference

| Command | Description |
| :--- | :--- |
| `npm run mobile:sync` | Syncs web assets and native plugins (Production URL). |
| `CAPACITOR_SERVER_URL=... npx cap sync` | Syncs with a specific development URL. |
| `npm run mobile:open` | Opens the iOS project in Xcode. |
| `npx cap sync ios` | Specific sync for iOS platform only. |

---

## 📱 Testing Tips

-   **In-App Browser**: The app uses an in-app browser for OAuth. It should animate upwards from the bottom.
-   **Simulator HTTP Support**: A custom `generateUUID()` utility is used to prevent crashes when running over non-secure HTTP in the simulator.
-   **Deep Linking**: If the app doesn't redirect back after login, double-check that the `com.lumomind.app` scheme is correctly set in `ios/App/App/Info.plist`.
