"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { getChildren, type ChildProfile } from "@/app/actions/profiles";
import { getCookie, setCookie, deleteCookie } from "cookies-next";

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthContextType {
  user: User | null;
  profiles: ChildProfile[];
  activeChild: ChildProfile | null;
  isLoading: boolean;
  refreshProfiles: (silent?: boolean) => Promise<void>;
  setActiveChild: (child: ChildProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [activeChild, setActiveChild] = useState<ChildProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = useMemo(() => createClient(), []);

  async function hydrateFromCache(uid?: string): Promise<ChildProfile[]> {
    if (typeof window === "undefined") return [];
    try {
      const { raidenCache, CacheStore } = await import("@/lib/core/cache");
      
      // Post-await check: Ensure session hasn't changed or expired while importing
      const currentSession = await supabase.auth.getSession();
      const currentUid = currentSession.data.session?.user.id;
      if (uid && currentUid !== uid) {
        console.debug("[AuthProvider] Skipping hydrate: UID changed during async load.");
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
      console.warn("[AuthProvider] Failed to hydrate profile cache:", err);
    }
    return [];
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
      console.warn("[AuthProvider] Failed to persist profile cache:", err);
    }
  }

  async function fetchProfiles(uid: string, silent = false): Promise<void> {
    if (!silent) setIsLoading(true);
    try {
      const { getChildren } = await import("@/app/actions/profiles");
      const { data } = await getChildren();
      
      // session-security guard: verify the UID hasn't changed or isn't null 
      // (in case auth event happened while fetching)
      const currentSession = await supabase.auth.getSession();
      if (currentSession.data.session?.user.id !== uid) {
        console.debug("[AuthProvider] Skipping stale profile fetch result.");
        return;
      }

      if (data) {
        setProfiles(data);
        await persistProfiles(data, uid);
        const activeId = getCookie("activeChildId");
        const found = activeId ? data.find((c) => c.id === activeId) : null;
        setActiveChild(found ?? (data[0] ?? null));
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        const uid = session?.user?.id;
        setUser(session?.user ?? null);

        if (uid) {
            await hydrateFromCache(uid);
            await fetchProfiles(uid, true);
        } else {
            setIsLoading(false);
        }
      } catch (err) {
        console.error("[AuthProvider] Init failed:", err);
        if (mounted) setIsLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (!mounted) return;
      const newUser = session?.user ?? null;
      
      if (newUser && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        setUser(prev => prev?.id === newUser.id ? prev : newUser);
        await hydrateFromCache(newUser.id);
        await fetchProfiles(newUser.id, true);
      } else if (!newUser) {
        setUser(null);
        setProfiles([]);
        setActiveChild(null);
        deleteCookie("activeChildId");
        
        // Clear Story Maker Globals and Drafts here
        const { clearStoryMakerGlobals } = await import("@/components/story-maker/StoryMakerClient");
        clearStoryMakerGlobals();

        try {
            const { raidenCache, CacheStore } = await import("@/lib/core/cache");
            // Clear all user-specific drafts and guest drafts
            const keys = await raidenCache.getAllKeys(CacheStore.DRAFTS);
            for (const key of keys) {
                if (typeof key === 'string' && (key.startsWith('draft:') || key === 'current')) {
                    await raidenCache.delete(CacheStore.DRAFTS, key);
                }
            }
        } catch (err) {
            console.warn("[AuthProvider] Failed to clear drafts on logout:", err);
        }

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
    <AuthContext.Provider value={{ user, profiles, activeChild, isLoading, refreshProfiles, setActiveChild: handleSetActiveChild }}>
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
