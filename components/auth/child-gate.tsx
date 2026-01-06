'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getChildren } from '@/app/actions/profiles';


export function ChildGate() {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkChildren = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // If not logged in, we don't block (landing page, login etc handled by middleware or page logic)
      if (!user) {
          setChecked(true);
          return;
      }

      // If already on onboarding, don't redirect loop
      if (pathname.startsWith('/onboarding') || pathname === '/login') {
          setChecked(true);
          return;
      }

      // Fetch children
      // We use the server action which calls DB. 
      // Optimization: Could cache this in a context or SWR, but for now this is safe.
      const { data: children, error } = await getChildren();

      if (children && children.length === 0) {
        // No children found -> redirect to onboarding
        router.push('/onboarding');
      } 
      
      setChecked(true);
    };

    checkChildren();
  }, [pathname, router]);

  return null; // This component handles side effects only
}
