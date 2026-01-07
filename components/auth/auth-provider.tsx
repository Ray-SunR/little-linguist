"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { getChildren, type ChildProfile } from "@/app/actions/profiles";
import { getCookie } from "cookies-next";

interface AuthContextType {
  user: User | null;
  profiles: ChildProfile[];
  activeChild: ChildProfile | null;
  isLoading: boolean;
  refreshProfiles: () => Promise<void>;
  setActiveChild: (child: ChildProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [activeChild, setActiveChild] = useState<ChildProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();
  const CACHE_KEY = "raiden:profiles:v1";

  const hydrateFromCache = async (uid?: string): Promise<ChildProfile[]> => {
    if (typeof window === "undefined") return [];
    try {
      const { raidenCache, CacheStore } = await import("@/lib/core/cache");
      // Keyed by uid to prevent cross-user leakage
      const key = uid || "global";
      const cached = await raidenCache.get<{ id: string; profiles: ChildProfile[]; cachedAt: number }>(
        CacheStore.PROFILES,
        key
      );

      if (cached?.profiles && Array.isArray(cached.profiles) && cached.profiles.length > 0) {
        setProfiles(cached.profiles);
        const activeId = getCookie("activeChildId");
        const found = activeId ? cached.profiles.find((c) => c.id === activeId) : null;
        setActiveChild(found ?? cached.profiles[0]);
        // Only set loading false if we have a key (meaning we are somewhat sure of the user)
        if (uid) setIsLoading(false);
        return cached.profiles;
      }
    } catch (err) {
      console.warn("[AuthProvider] Failed to hydrate profile cache:", err);
    }
    return [];
  };

  const persistProfiles = async (data: ChildProfile[], uid: string) => {
    if (typeof window === "undefined" || !uid) return;
    try {
      const { raidenCache, CacheStore } = await import("@/lib/core/cache");
      await raidenCache.put(CacheStore.PROFILES, {
        id: uid,
        profiles: data,
        cachedAt: Date.now(),
      });
      // Synchronous hint for next reload
      window.localStorage.setItem(`raiden:has_profiles_cache:${uid}`, "true");
    } catch (err) {
      console.warn("[AuthProvider] Failed to persist profile cache:", err);
    }
  };

  const fetchProfiles = async (uid: string) => {
    const { getChildren } = await import("@/app/actions/profiles");
    const { data } = await getChildren();
    if (data) {
      setProfiles(data);
      await persistProfiles(data, uid);
      const activeId = getCookie("activeChildId");
      const found = activeId ? data.find((c) => c.id === activeId) : null;
      setActiveChild(found ?? (data[0] ?? null));
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Check session first to avoid cross-user leakage during hydration
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        setUser(session?.user ?? null);

        // 2. Hydrate from scoped cache if we have a user
        if (uid) {
            await hydrateFromCache(uid);
            await fetchProfiles(uid);
        }
      } catch (err) {
        console.error("[AuthProvider] Init failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null;
      
      if (newUser && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        setUser(prev => prev?.id === newUser.id ? prev : newUser);
        await hydrateFromCache(newUser.id);
        await fetchProfiles(newUser.id);
      } else if (!newUser) {
        setUser(null);
        setProfiles([]);
        if (typeof window !== "undefined") {
            // Clear current user hint if any (though we usually key them now)
            Object.keys(window.localStorage).forEach(key => {
                if (key.startsWith('raiden:has_profiles_cache:')) {
                    window.localStorage.removeItem(key);
                }
            });
        }
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfiles = async () => {
    if (user?.id) await fetchProfiles(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profiles, activeChild, isLoading, refreshProfiles, setActiveChild }}>
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
