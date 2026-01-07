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
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  const hydrateFromCache = () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { profiles: ChildProfile[]; cachedAt: number };
      if (!parsed || !Array.isArray(parsed.profiles)) return;
      const isFresh = Date.now() - (parsed.cachedAt || 0) < CACHE_TTL_MS;
      if (isFresh && parsed.profiles.length > 0) {
        setProfiles(parsed.profiles);
        const activeId = getCookie("activeChildId");
        const found = activeId ? parsed.profiles.find((c) => c.id === activeId) : null;
        setActiveChild(found ?? parsed.profiles[0]);
        setIsLoading(false);
      }
    } catch (err) {
      console.warn("[AuthProvider] Failed to hydrate profile cache:", err);
    }
  };

  const persistProfiles = (data: ChildProfile[]) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ profiles: data, cachedAt: Date.now() })
      );
    } catch (err) {
      console.warn("[AuthProvider] Failed to persist profile cache:", err);
    }
  };

  const fetchProfiles = async () => {
    const { data } = await getChildren();
    if (data) {
      setProfiles(data);
      persistProfiles(data);
      const activeId = getCookie("activeChildId");
      const found = activeId ? data.find((c) => c.id === activeId) : null;
      setActiveChild(found ?? (data[0] ?? null));
    }
  };

  useEffect(() => {
    hydrateFromCache();

    // Check initial session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const existingUser = session?.user ?? null;
      setUser(existingUser);
      if (existingUser) {
        await fetchProfiles();
      }
      setIsLoading(false);
    };

    checkUser();

    // Listen for auth changes and reuse session payload to avoid extra /user calls
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      if (newUser && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        await fetchProfiles();
      } else if (!newUser) {
        setProfiles([]);
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfiles = async () => {
    await fetchProfiles();
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
