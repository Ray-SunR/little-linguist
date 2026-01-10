"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { getChildren, getUserProfile, updateLibrarySettings as apiUpdateLibrarySettings, type ChildProfile } from "@/app/actions/profiles";
import { getCookie, setCookie, deleteCookie } from "cookies-next";

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthContextType {
  user: User | null;
  profiles: ChildProfile[];
  activeChild: ChildProfile | null;
  isLoading: boolean;
  isStoryGenerating: boolean;
  setIsStoryGenerating: (val: boolean) => void;
  librarySettings: any;
  updateLibrarySettings: (settings: any) => Promise<{ success?: boolean; error?: string }>;
  refreshProfiles: (silent?: boolean) => Promise<void>;
  setActiveChild: (child: ChildProfile | null) => void;
  // Exposed for Server Component Hydration
  setProfiles: (profiles: ChildProfile[]) => void;
  setIsLoading: (isLoading: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [activeChild, setActiveChild] = useState<ChildProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStoryGenerating, setIsStoryGenerating] = useState(false);
  const [librarySettings, setLibrarySettings] = useState<any>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeFetchIdRef = useRef<number>(0);
  const userRef = useRef<User | null>(user);
  const eventRef = useRef<string>("INITIAL");
  const authListenerFiredRef = useRef<boolean>(false);

  // Keep userRef in sync for auth state comparisons
  useEffect(() => { userRef.current = user; }, [user]);

  const supabase = useMemo(() => createClient(), []);

  async function hydrateFromCache(uid?: string): Promise<ChildProfile[]> {
    if (typeof window === "undefined") return [];

    // Create a 2s ceiling for cache hydration to prevent stalling the whole auth flow
    const hydrationTimeout = new Promise<ChildProfile[]>((_, reject) =>
      setTimeout(() => reject(new Error("Hydration timeout")), 2000)
    );

    const hydrationTask = (async () => {
      try {
        const { raidenCache, CacheStore } = await import("@/lib/core/cache");

        // Post-await check: Ensure session hasn't changed or expired while importing
        const currentSession = await supabase.auth.getSession();
        const currentUid = currentSession.data.session?.user.id;
        if (uid && currentUid !== uid) {
          console.info("[RAIDEN_DIAG][Auth] Skipping hydrate: UID changed during async load.");
          return [];
        }

        const key = uid || "global";
        const cached = await raidenCache.get<{ id: string; profiles: ChildProfile[]; cachedAt: number }>(
          CacheStore.PROFILES,
          key
        );

        // Re-check after IDB read
        if (uid) {
          const finalSession = await supabase.auth.getSession();
          if (finalSession.data.session?.user.id !== uid) return [];
        }

        if (cached?.profiles && Array.isArray(cached.profiles) && cached.profiles.length > 0) {
          setProfiles(cached.profiles);
          const activeId = getCookie("activeChildId");
          const found = activeId ? cached.profiles.find((c) => c.id === activeId) : null;
          setActiveChild(found ?? cached.profiles[0]);
          if (uid) setIsLoading(false);
          return cached.profiles;
        }
      } catch (err) {
        console.warn("[RAIDEN_DIAG][Auth] Failed to hydrate profile cache:", err);
      }
      return [];
    })();

    try {
      return await Promise.race([hydrationTask, hydrationTimeout]);
    } catch (e) {
      console.warn("[RAIDEN_DIAG][Auth] Cache hydration ceiling reached (2s), skipping to network.");
      return [];
    }
  }

  async function persistProfiles(data: ChildProfile[], uid: string): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      const { raidenCache, CacheStore } = await import("@/lib/core/cache");
      await raidenCache.put(CacheStore.PROFILES, {
        id: uid,
        profiles: data,
        cachedAt: Date.now(),
      });
      window.localStorage.setItem(`raiden:has_profiles_cache:${uid}`, "true");
    } catch (err) {
      console.warn("[RAIDEN_DIAG][Auth] Failed to persist profile cache:", err);
    }
  }

  async function fetchProfiles(uid: string, silent = false, retryCount = 0): Promise<void> {
    const requestId = ++activeFetchIdRef.current;
    if (!silent && retryCount === 0) setIsLoading(true);

    console.info(`[RAIDEN_DIAG][Auth] fetchProfiles starting: req=${requestId} uid=${uid} silent=${silent} retry=${retryCount}`);

    try {
      const { getChildren } = await import("@/app/actions/profiles");
      const { data, error } = await getChildren();

      // Check if this is still the active request
      if (requestId !== activeFetchIdRef.current) {
        console.info(`[RAIDEN_DIAG][Auth] Skipping stale fetch result (req ${requestId} != active ${activeFetchIdRef.current})`);
        return;
      }

      // Handle transient auth errors from server actions immediately after login
      if (error === 'Not authenticated' && retryCount < 2) {
        console.warn(`[RAIDEN_DIAG][Auth] fetchProfiles (req ${requestId}): Not authenticated on server. Retrying in 500ms... (attempt ${retryCount + 1})`);
        await new Promise(r => setTimeout(r, 500));
        // Recurse: new call will increment activeFetchIdRef, so this call's 'finally' won't clear loading
        return fetchProfiles(uid, silent, retryCount + 1);
      }

      if (error) {
        console.error(`[RAIDEN_DIAG][Auth] getChildren error (req ${requestId}):`, error);
        // If we hit an error (and not retrying), we SHOULD eventually clear loading 
        // to avoid infinite spinner, but we won't update profiles.
      } else if (data) {
        setProfiles(data);
        await persistProfiles(data, uid);
        const activeId = getCookie("activeChildId");
        const found = activeId ? data.find((c) => c.id === activeId) : null;
        const finalActive = found ?? (data[0] ?? null);
        setActiveChild(finalActive);
        if (finalActive?.library_settings) {
          setLibrarySettings(finalActive.library_settings);
        }
      }
    } catch (err) {
      console.error(`[RAIDEN_DIAG][Auth] Unexpected fetchProfiles error (req ${requestId}):`, err);
    } finally {
      // Only clear loading if this is still the active request
      // If we recursed for a retry, the inner call became the active request.
      if (requestId === activeFetchIdRef.current) {
        setIsLoading(false);
        console.info(`[RAIDEN_DIAG][Auth] fetchProfiles finished, cleared loading for req ${requestId}`);
      }
    }
  }

  // Sync library settings when active child changes
  useEffect(() => {
    // Only set if different to avoid redundant renders
    const nextSettings = activeChild?.library_settings || {};
    setLibrarySettings((prev: any) => {
      if (JSON.stringify(prev) === JSON.stringify(nextSettings)) return prev;
      return nextSettings;
    });
  }, [activeChild?.id, activeChild?.library_settings]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      console.info("[RAIDEN_DIAG][Auth] User initialization starting...");

      // Cleanup any previous controller
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const timeoutId = setTimeout(() => {
        if (mounted && isLoading) {
          console.warn("[RAIDEN_DIAG][Auth] Safety timeout triggered: forcing isLoading = false after 20s");
          controller.abort('Timeout');
          setIsLoading(false);
        }
      }, 20000);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) console.warn("[RAIDEN_DIAG][Auth] getSession error:", sessionError);

        if (!mounted || controller.signal.aborted) return;

        // If the onAuthStateChange listener has already handled a session/user,
        // we skip the init fetch to avoid race condition double-calls.
        if (authListenerFiredRef.current && userRef.current) {
          console.info("[RAIDEN_DIAG][Auth] Init: auth listener already handled user, skipping init fetch.");
          return;
        }

        const uid = session?.user?.id;
        console.info("[RAIDEN_DIAG][Auth] Session resolved from getSession:", { uid });

        if (uid) {
          if (!userRef.current) {
            setUser(session?.user ?? null);
          }
          console.info("[RAIDEN_DIAG][Auth] Hydrating profiles for:", uid);
          await hydrateFromCache(uid); // Internal check for session consistency exists inside
          if (controller.signal.aborted) return;
          await fetchProfiles(uid, true);
        } else {
          console.info("[RAIDEN_DIAG][Auth] No session found, skipping profile hydration.");
          setIsLoading(false);
        }
      } catch (err) {
        if (err === 'Timeout' || (err instanceof Error && err.name === 'AbortError')) {
          console.warn("[RAIDEN_DIAG][Auth] Initialization aborted or timed out.");
        } else {
          console.error("[RAIDEN_DIAG][Auth] Init failed:", err);
        }
        if (mounted) setIsLoading(false);
      } finally {
        clearTimeout(timeoutId);
        if (mounted && isLoading && !controller.signal.aborted) {
          console.info("[RAIDEN_DIAG][Auth] Initialization finished (silent success or catch-all)");
          setIsLoading(false);
        }
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (!mounted) return;
      authListenerFiredRef.current = true;
      const newUser = session?.user ?? null;
      const prevUser = userRef.current;
      eventRef.current = event;

      console.info("[RAIDEN_DIAG][Auth] Auth state change:", { event, uid: newUser?.id });

      if (newUser && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        // Optimisation: If user ID hasn't changed, don't trigger full loading state
        // This often happens on tab focus / wake on mobile
        const isSameUser = prevUser?.id === newUser.id;

        if (!isSameUser || event === 'INITIAL_SESSION') {
          if (event === 'SIGNED_IN') setIsLoading(true);
          setUser(newUser);

          // Invalidate cache on explicit sign-in to ensure fresh data
          if (event === 'SIGNED_IN') {
            import("@/lib/core/cache").then(({ raidenCache, CacheStore }) => {
              raidenCache.delete(CacheStore.PROFILES, newUser.id).catch(() => { });
            }).catch(() => { });
          }

          await hydrateFromCache(newUser.id);
          await fetchProfiles(newUser.id, true);
        } else {
          // Even if same user, we might want to silently refresh profiles
          refreshProfiles(true);
        }
      } else if (!newUser) {
        setUser(null);
        setProfiles([]);
        setActiveChild(null);
        setLibrarySettings({});
        deleteCookie("activeChildId");

        // Clear Story Maker Globals and Drafts here
        const { clearStoryMakerGlobals } = await import("@/components/story-maker/StoryMakerClient");
        clearStoryMakerGlobals();

        // Clear cache in background
        import("@/lib/core/cache").then(async ({ raidenCache, CacheStore }) => {
          try {
            // Clear all user-specific drafts and guest drafts
            const keys = await raidenCache.getAllKeys(CacheStore.DRAFTS);
            for (const key of keys) {
              if (typeof key === 'string' && (key.startsWith('draft:') || key === 'current')) {
                await raidenCache.delete(CacheStore.DRAFTS, key);
              }
            }
            // Explicitly clear profile cache on logout
            const profileKeys = await raidenCache.getAllKeys(CacheStore.PROFILES);
            for (const pk of profileKeys) {
              if (typeof pk === 'string' || typeof pk === 'number') {
                await raidenCache.delete(CacheStore.PROFILES, pk);
              }
            }
          } catch (err) { }
        }).catch(() => { });

        if (typeof window !== "undefined") {
          Object.keys(window.localStorage).forEach(key => {
            if (key.startsWith('raiden:has_profiles_cache:')) {
              window.localStorage.removeItem(key);
            }
          });
        }
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function refreshProfiles(silent = false): Promise<void> {
    if (user?.id) {
      await fetchProfiles(user.id, silent);
    }
  }

  function handleSetActiveChild(child: ChildProfile | null): void {
    setActiveChild(child);
    if (child) {
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      setCookie('activeChildId', child.id, {
        expires,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profiles,
      activeChild,
      isLoading,
      isStoryGenerating,
      setIsStoryGenerating,
      librarySettings,
      updateLibrarySettings: async (settings: any) => {
        if (!activeChild?.id) return { error: "No active child" };

        const prevSettings = librarySettings;
        const prevProfiles = profiles;
        const prevActiveChild = activeChild;

        // Optimistic update
        setLibrarySettings(settings);
        setProfiles(prev => prev.map(p =>
          p.id === activeChild.id ? { ...p, library_settings: settings } : p
        ));
        if (activeChild) {
          setActiveChild({ ...activeChild, library_settings: settings });
        }

        if (user?.id) {
          const result = await apiUpdateLibrarySettings(activeChild.id, settings);
          if (result.error) {
            // Rollback on error
            setLibrarySettings(prevSettings);
            setProfiles(prevProfiles);
            setActiveChild(prevActiveChild);
            return { error: result.error };
          }
          return { success: true };
        }
        return { success: true };
      },
      refreshProfiles,
      setActiveChild: handleSetActiveChild,
      setProfiles,
      setIsLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
