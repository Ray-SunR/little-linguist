"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { getChildren, type ChildProfile } from "@/app/actions/profiles";

interface AuthContextType {
  user: User | null;
  profiles: ChildProfile[];
  isLoading: boolean;
  refreshProfiles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchProfiles = async () => {
    const { data } = await getChildren();
    if (data) {
      setProfiles(data);
    }
  };

  useEffect(() => {
    // Check initial session
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await fetchProfiles();
      }
      setIsLoading(false);
    };

    checkUser();

    // Listen for auth changes
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
    <AuthContext.Provider value={{ user, profiles, isLoading, refreshProfiles }}>
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
