# Sign in with Apple Configuration Guide

Setting up Sign in with Apple requires configuration in both the Apple Developer Portal and the Supabase Dashboard.

## 1. Apple Developer Portal Setup

### A. Create an App ID
1. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list/bundleId).
2. Click the **+** (plus) button to create a new identifier.
3. Select **App IDs** and click **Continue**.
4. Select type **App** and click **Continue**.
5. Provide a **Description** and a unique **Bundle ID** (e.g., `com.yourdomain.app`).
6. Under **Capabilities**, check **Sign In with Apple**.
7. Click **Continue**, then **Register**.

### B. Create a Services ID
1. Go to the [Identifiers](https://developer.apple.com/account/resources/identifiers/list/serviceId) list again.
2. Click the **+** (plus) button.
3. Select **Services IDs** and click **Continue**.
4. Provide a **Description** and a unique **Identifier** (e.g., `com.yourdomain.app.service`).
5. Click **Continue**, then **Register**.
6. Find your new Services ID in the list and click on it.
7. Enable **Sign In with Apple**, then click **Configure**.
8. In the **Primary App ID** dropdown, select the App ID you created in step A.
9. Under **Web Domain**, enter your Supabase project domain: `<project-ref>.supabase.co`.
10. Under **Return URLs**, enter: `https://<project-ref>.supabase.co/auth/v1/callback`.
11. Click **Next**, then **Done**, then **Continue**, then **Save**.

### C. Create a Signing Key
1. Go to [Keys](https://developer.apple.com/account/resources/authkeys/list).
2. Click the **+** (plus) button.
3. Provide a **Key Name** (e.g., `Supabase Auth`).
4. Check **Sign In with Apple** and click **Configure**.
5. Select your **Primary App ID** and click **Save**.
6. Click **Continue**, then **Register**.
7. **Download** the `.p8` key file.
   > [!IMPORTANT]
   > You can only download this file once. Keep it safe.

## 2. Supabase Dashboard Setup

1. Go to your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Navigate to **Authentication** > **Providers**.
3. Find **Apple** in the list and enable it.
4. Fill in the following:
   - **Services ID (Client ID)**: The Identifier you created in step B (e.g., `com.yourdomain.app.service`).
   - **Team ID**: Your Apple Developer Team ID (found in the top right of the Apple Developer portal).
   - **Key ID**: The 10-character ID of the signing key you created in step C.
   - **Secret Key**: Copy the entire contents of the `.p8` file you downloaded.
5. Click **Save**.

## 3. Verify Frontend
Once the above steps are completed, you can test the "Sign in with Apple" button on your login page.
