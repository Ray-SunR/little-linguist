'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';


export function ChildGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profiles, status, profileError } = useAuth();

  useEffect(() => {
    // Proactively redirect if we detect an auth error, even if not in 'ready' state
    if (profileError === 'Not authenticated' && pathname !== '/login') {
      router.push('/login');
      return;
    }

    // Only proceed with onboarding check if we are strictly in 'ready' state and authenticated.
    if (status !== 'ready' || !user) return;

    // If already on onboarding, login, or story-maker (which handles its own profile creation), don't redirect.
    if (pathname.startsWith('/onboarding') || pathname === '/login' || pathname.startsWith('/story-maker')) {
      return;
    }

    // Never redirect for onboarding if there was a generic error fetching profiles.
    if (profileError) {
      console.warn('[ChildGate] Skipping onboarding check due to profile fetch error:', profileError);
      return;
    }

    if (profiles.length === 0) {
      console.warn('[ChildGate] Redirecting to onboarding! Profiles confirmed 0 in ready state.');
      router.push('/onboarding');
    }
  }, [pathname, router, user, profiles, status, profileError]);

  return null; // This component handles side effects only
}
