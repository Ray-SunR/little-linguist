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

    // If already on onboarding, don't redirect loop
    if (pathname.startsWith('/onboarding') || pathname === '/login') {
      return;
    }

    if (profiles && profiles.length === 0) {
      // No children found -> redirect to onboarding
      router.push('/onboarding');
    } 
  }, [pathname, router, user, profiles, isLoading]);

  return null; // This component handles side effects only
}
