"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { getChildren, updateLibrarySettings as apiUpdateLibrarySettings, type ChildProfile } from "@/app/actions/profiles";
import { getCookie, setCookie, deleteCookie } from "cookies-next";
import { usePathname } from "next/navigation";

const DEBUG = process.env.NODE_ENV === "development";
const Log = {
  info: (msg: string, ...args: any[]) => DEBUG && console.info(`[RAIDEN_DIAG][Auth] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => DEBUG && console.warn(`[RAIDEN_DIAG][Auth] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[RAIDEN_DIAG][Auth] ${msg}`, ...args),
};

export type AuthStatus = 'loading' | 'hydrating' | 'ready' | 'error';

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthContextType {
  user: User | null;
  profiles: ChildProfile[];
  activeChild: ChildProfile | null;
  status: AuthStatus;
  isLoading: boolean;
  isStoryGenerating: boolean;
  setIsStoryGenerating: (val: boolean) => void;
  librarySettings: any;
  updateLibrarySettings: (settings: any) => Promise<{ success?: boolean; error?: string }>;
  refreshProfiles: (silent?: boolean) => Promise<void>;
  setActiveChild: (child: ChildProfile | null) => void;
  // Exposed for Server Component Hydration
  setProfiles: (profiles: ChildProfile[]) => void;
  setStatus: (status: AuthStatus) => void;
  profileError: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const profilesRef = useRef<ChildProfile[]>(profiles);
  const [activeChild, setInternalActiveChild] = useState<ChildProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [isStoryGenerating, setIsStoryGenerating] = useState(false);
  const [librarySettings, setLibrarySettings] = useState<any>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeFetchIdRef = useRef<number>(0);
  const isLoggingOutRef = useRef(false);
  const userRef = useRef<User | null>(user);
  const eventRef = useRef<string>("INITIAL");
  const [profileError, setProfileError] = useState<string | null>(null);
  const authListenerFiredRef = useRef<boolean>(false);

  const pathname = usePathname();

  // Keep refs in sync
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { profilesRef.current = profiles; }, [profiles]);
  const statusRef = useRef<AuthStatus>(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  // Keep pathname in ref to avoid re-triggering fetchProfiles on route change if we don't want to
  // But actually, fetchProfiles USES pathname to redirect.
  // If we want fetchProfiles to be stable, we can use a ref for pathname.
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  const supabase = useMemo(() => createClient(), []);

  const hydrateFromCache = useCallback(async (uid?: string): Promise<ChildProfile[]> => {
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
          handleSetActiveChild(found ?? cached.profiles[0]);
          if (uid) setStatus('ready');
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
  }, [supabase]);

  const persistProfiles = useCallback(async (data: ChildProfile[], uid: string): Promise<void> => {
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
  }, []);

  const logout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    Log.info("Logout initiated...");

    // Immediate in-memory cleanup to avoid stale UI flashes
    setUser(null);
    setProfiles([]);
    handleSetActiveChild(null);
    setStatus('loading');

    try {
      await supabase.auth.signOut();
    } catch (err) {
      Log.error("Sign out error:", err);
    } finally {
      // Comprehensive local cleanup
      if (typeof window !== "undefined") {
        try {
          Object.keys(window.localStorage).forEach(key => {
            if (key.includes('raiden:') || key.includes('sb-')) {
              window.localStorage.removeItem(key);
            }
          });
          // Clear common cookies
          document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
          });
          // Clear specific cookies managed by cookies-next if possible
          deleteCookie('activeChildId', { path: '/' });
        } catch (cleanupErr) {
          Log.warn("Manual cleanup had issues:", cleanupErr);
        }
        // Force a clean state via reload
        window.location.href = "/login";
      }
    }
  }, [supabase]);

  const fetchProfiles = useCallback(async (uid: string, silent = false, retryCount = 0): Promise<void> => {
    const requestId = ++activeFetchIdRef.current;
    if (!silent && retryCount === 0) setStatus('loading');
    setProfileError(null);

    Log.info(`fetchProfiles starting: req=${requestId} uid=${uid} silent=${silent} retry=${retryCount}`);

    try {
      const { data, error } = await getChildren();

      if (requestId !== activeFetchIdRef.current) {
        Log.info(`Skipping stale fetch result (req ${requestId} != active ${activeFetchIdRef.current})`);
        return;
      }

      if (error === 'Not authenticated') {
        if (retryCount < 2) {
          Log.warn(`fetchProfiles (req ${requestId}): Not authenticated on server. Retrying in 500ms... (attempt ${retryCount + 1})`);
          await new Promise(r => setTimeout(r, 500));
          return fetchProfiles(uid, silent, retryCount + 1);
        } else {
          Log.error(`fetchProfiles (req ${requestId}): Persistent 'Not authenticated' error. Redirecting to login.`);
          await logout();
          return;
        }
      }

      if (error) {
        Log.error(`getChildren error (req ${requestId}):`, error);
        setProfileError(typeof error === 'string' ? error : 'Fetch failed');
        setStatus('error');
      } else if (data) {
        const prevCount = profilesRef.current.length;
        const newCount = data.length;

        if (prevCount === 0 && newCount > 0) {
          Log.warn(`False Negative detected: Server had 0 profiles (or pre-hydrated with 0), but Client found ${newCount}. requestId=${requestId}`);
        } else {
          Log.info(`Profile fetch summary: client=${newCount} (prev=${prevCount}) requestId=${requestId}`);
        }

        setProfiles(data);
        await persistProfiles(data, uid);
        const activeId = getCookie("activeChildId");
        const found = activeId ? data.find((c) => c.id === activeId) : null;
        const finalActive = found ?? (data[0] ?? null);
        handleSetActiveChild(finalActive);
        if (finalActive?.library_settings) {
          setLibrarySettings(finalActive.library_settings);
        }
      }
    } catch (err) {
      Log.error(`Unexpected fetchProfiles error (req ${requestId}):`, err);
      setProfileError('Unexpected error');
      setStatus('error');
    } finally {
      if (requestId === activeFetchIdRef.current && !isLoggingOutRef.current) {
        setStatus('ready');
        Log.info(`fetchProfiles finished, cleared loading for req ${requestId}`);
      }
    }
  }, [persistProfiles, logout]);

  const refreshProfiles = useCallback(async (silent = false): Promise<void> => {
    if (userRef.current?.id) {
      await fetchProfiles(userRef.current.id, silent);
    }
  }, [fetchProfiles]);

  // Navigation-based session synchronization
  // This helps catch session changes made on the server (e.g. via server actions)
  // that the client-side Supabase listener might not have noticed yet.
  useEffect(() => {
    async function syncSession() {
      if (isLoggingOutRef.current) return;

      const { data: { session } } = await supabase.auth.getSession();
      const currentUid = session?.user?.id;

      if (currentUid !== userRef.current?.id) {
        Log.info("Navigation detected session change. Syncing state...", { old: userRef.current?.id, new: currentUid });
        setUser(session?.user ?? null);
        if (currentUid) {
          setStatus('hydrating');
          await hydrateFromCache(currentUid);
          await fetchProfiles(currentUid, true);
        } else {
          setProfiles([]);
          handleSetActiveChild(null);
          setStatus('ready');
        }
      }
    }

    syncSession();
  }, [pathname, supabase, fetchProfiles, hydrateFromCache]);

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
      if (isLoggingOutRef.current) return;
      console.info("[RAIDEN_DIAG][Auth] User initialization starting...");

      // Cleanup any previous controller
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const timeoutId = setTimeout(() => {
        if (mounted && statusRef.current === 'loading') {
          Log.warn("Safety timeout triggered: forcing status = error after 20s");
          controller.abort('Timeout');
          setStatus('error');
        }
      }, 20000);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) Log.warn("getSession error:", sessionError);

        if (!mounted || controller.signal.aborted) return;

        // If the onAuthStateChange listener has already handled a session/user,
        // we skip the init fetch to avoid race condition double-calls.
        if (authListenerFiredRef.current && userRef.current) {
          Log.info("Init: auth listener already handled user, skipping init fetch.");
          return;
        }

        const uid = session?.user?.id;
        Log.info("Session resolved from getSession:", { uid });

        if (uid) {
          if (!userRef.current) {
            setUser(session?.user ?? null);
          }
          Log.info("Hydrating profiles for:", uid);
          setStatus('hydrating');
          await hydrateFromCache(uid); // Internal check for session consistency exists inside
          if (controller.signal.aborted) return;
          await fetchProfiles(uid, true);
        } else {
          Log.info("No session found, skipping profile hydration.");
          setStatus('ready');
        }
      } catch (err) {
        if (err === 'Timeout' || (err instanceof Error && err.name === 'AbortError')) {
          Log.warn("Initialization aborted or timed out.");
        } else {
          Log.error("Init failed:", err);
        }
        if (mounted) setStatus('error');
      } finally {
        clearTimeout(timeoutId);
        if (mounted && statusRef.current === 'loading' && !controller.signal.aborted && !isLoggingOutRef.current) {
          Log.info("Initialization finished (silent success or catch-all)");
          setStatus('ready');
        }
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (!mounted || isLoggingOutRef.current) return;
      authListenerFiredRef.current = true;
      const newUser = session?.user ?? null;
      const prevUser = userRef.current;
      eventRef.current = event;

      Log.info("Auth state change:", { event, uid: newUser?.id });

      if (newUser && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        // Optimisation: If user ID hasn't changed, don't trigger full loading state
        // This often happens on tab focus / wake on mobile
        const isSameUser = prevUser?.id === newUser.id;

        if (!isSameUser || event === 'INITIAL_SESSION') {
          if (event === 'SIGNED_IN') setStatus('loading');
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
        handleSetActiveChild(null);
        setLibrarySettings({});

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
        setStatus('ready');
      }
    });

    return () => {
      mounted = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      subscription.unsubscribe();
    };
  }, [supabase, hydrateFromCache, fetchProfiles, refreshProfiles]);

  function handleSetActiveChild(child: ChildProfile | null): void {
    setInternalActiveChild(child);
    if (child) {
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      setCookie('activeChildId', child.id, {
        expires,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
    } else {
      deleteCookie('activeChildId');
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profiles,
      activeChild,
      status,
      isLoading: status === 'loading' || status === 'hydrating',
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
          handleSetActiveChild({ ...activeChild, library_settings: settings });
        }

        if (user?.id) {
          const result = await apiUpdateLibrarySettings(activeChild.id, settings);
          if (result.error) {
            // Rollback on error
            setLibrarySettings(prevSettings);
            setProfiles(prevProfiles);
            handleSetActiveChild(prevActiveChild);
            return { error: result.error };
          }
          return { success: true };
        }
        return { success: true };
      },
      refreshProfiles,
      setActiveChild: handleSetActiveChild,
      setProfiles,
      setStatus,
      profileError,
      logout
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
