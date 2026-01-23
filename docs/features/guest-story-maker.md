# Guest Story Maker (Guest-to-User Conversion Flow)

## Overview
The **Guest Story Maker** is a strategic user acquisition feature designed to let unauthenticated visitors experience the core value of Raiden—personalized story creation—before committing to an account.

Instead of hitting a "Login Wall" immediately, guests can design their child's profile (Hero) and configure a story (topic, setting, magic words). The system saves this progress locally as a "draft." When the user clicks "Create Story," they are prompted to sign up. Upon successful authentication, the system automatically detects the draft, creates a child profile, and immediately triggers the story generation, delivering on the user's initial intent.

## User Flow

### 1. Guest Configuration (Unauthenticated)
*   **Entry Point:** User visits `/story-maker` without an active session.
*   **Wizard Steps:**
    *   **Hero Identity:** Name, Age, Gender.
    *   **Visuals:** Upload photo or select pre-defined avatar.
    *   **Interests:** Select from categories (Themes, Topics, Characters) or add custom ones.
    *   **Story Config:**
        *   **Topic:** Main subject (e.g., "Space Pirates").
        *   **Setting:** Location (e.g., "Mars").
        *   **Magic Words:** Select up to 5 vocabulary words to include.
*   **Conversion Trigger:**
    *   User clicks **"Create Story! ✨"**.
    *   System saves the **Draft** to local device storage.
    *   System redirects user to `/login` with a `returnTo` parameter.

### 2. Authentication & Handoff
*   **Sign Up/Login:** User authenticates via Supabase Auth.
*   **Redirection:** User is redirected back to `/story-maker?action=resume_story_maker`.

### 3. Fulfillment (Authenticated)
*   **Draft Detection:** Client detects `draft:guest` in local cache.
*   **Profile Creation:**
    *   System automatically creates a permanent **Child Profile** in the database using the draft data (Name, Age, Avatar, Interests).
    *   If avatar was uploaded, it is associated with this new profile.
*   **Auto-Generation:**
    *   System immediately triggers the story generation process using the draft's story configuration (Topic, Setting, Words).
    *   **Quota Check:** Verifies the new user's free tier limits (Story & Image credits).
*   **Result:** User lands on the **Reader** page (`/reader/[book_id]`) with their custom story ready.

## Technical Architecture

### Frontend Components
*   **`ChildProfileWizard` (`mode="story"`)**:
    *   Handles the multi-step form for guests.
    *   **Output:** Does *not* call API. Saves JSON object to `raidenCache`.
*   **`StoryMakerClient`**:
    *   Handles the `resume_story_maker` logic.
    *   **Migration Logic:** Reads `draft:guest`, validates user session, creates DB profile, triggers generation service.

### Data Persistence (`raidenCache`)
*   **Storage Mechanism:** IndexedDB (via `idb-keyval` wrapper) persists the draft across browser redirect/refresh.
*   **Key:** `draft:guest` (for unauthenticated state).
*   **Draft Schema:**
    ```typescript
    interface StoryDraft {
      profile: {
        name: string;
        age: number;
        gender: 'boy' | 'girl';
        avatarUrl?: string; // Blob URL (temporary) or Asset Path
        interests: string[];
        topic: string;
        setting: string;
      };
      selectedWords: string[];
      storyLengthMinutes: number; // Default: 5
      imageSceneCount: number;    // Default: 5
      isGuestFlow: boolean;
      resumeRequested: boolean;
    }
    ```

### Backend Actions
*   **`createChildProfile`**: Handles profile creation from client-side draft data.
*   **`storyService`**: Generates content based on parameters passed from the client.

## Constraints & Limitations
*   **Device Bound:** The draft is stored in the browser (IndexedDB). If the user switches devices during login (e.g., desktop to mobile), the draft is lost.
*   **Avatar Persistence:** Guest avatars uploaded to a temporary path must be claimed or moved to the user's storage bucket upon registration.
*   **Quotas:** The generated story consumes the user's initial free credits immediately.
