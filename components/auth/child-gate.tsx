'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';


export function ChildGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profiles, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // If not logged in, we don't block
    if (!user) {
      return;
    }

    // If already on onboarding or login, don't redirect loop.
    // Also ignore story-maker as it handles its own profile creation logic (guest flow)
    if (pathname.startsWith('/onboarding') || pathname === '/login' || pathname.startsWith('/story-maker')) {
      return;
    }

    console.debug(`[ChildGate] Checking profiles for ${user.email}:`, {
        count: profiles.length,
        pathname,
        isLoading
    });

    if (profiles && profiles.length === 0) {
      // Small timeout to allow state to settle after navigation/refresh
      const timer = setTimeout(() => {
        if (profiles.length === 0) {
            console.warn('[ChildGate] Redirecting to onboarding because no profiles found.');
            router.push('/onboarding');
        }
      }, 500);
      return () => clearTimeout(timer);
    } 
  }, [pathname, router, user, profiles, isLoading]);

  return null; // This component handles side effects only
}
