"use client";

import OnboardingWizard from '@/components/profile/OnboardingWizard';
import SkyBackground from '@/components/ui/SkyBackground';
import React, { useEffect } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from 'next/navigation';
import LumoLoader from '@/components/ui/lumo-loader';

export default function OnboardingPage() {
  const { user, profiles, isLoading } = useAuth();
  const router = useRouter();
  const [isFinishing, setIsFinishing] = React.useState(false);
  const isFinishingRef = React.useRef(false);

  const handleFinishing = (finishing: boolean) => {
    if (finishing) {
        isFinishingRef.current = true;
        setIsFinishing(true);
    }
  };

  useEffect(() => {
    const finishing = isFinishing || isFinishingRef.current;
    
    // If we are finishing (hyper-drive animation), do NOT redirect.
    // The OnboardingWizard will handle the final navigation.
    if (isLoading || finishing) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Redirect if a user with profiles lands here (manual navigation or back button)
    const profileCount = profiles?.length ?? 0;
    if (profileCount > 0) {
      router.replace('/dashboard');
    }
  }, [user, profiles, isLoading, router, isFinishing]);

  if (isLoading || !user || (profiles?.length ?? 0) > 0) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[--shell] relative overflow-hidden">
            <SkyBackground />
            <LumoLoader />
        </div>
    );
  }

  return (
    <div className="flex-1 bg-[--shell] font-sans selection:bg-accent selection:text-white flex flex-col min-h-0">
      <main className="flex-1 h-0 relative flex flex-col items-center justify-center pb-20 px-2 sm:px-4 overflow-hidden">

        {/* === Background Elements (Matching Story Maker Magic) === */}
        <SkyBackground />

        {/* === Content Container === */}
        <div className="z-50 w-full relative">
          {/* The Wizard Component */}
          <OnboardingWizard onFinishing={handleFinishing} />
        </div>
      </main>

    </div>
  );
}
