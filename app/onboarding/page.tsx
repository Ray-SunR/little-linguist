"use client";

import OnboardingWizard from '@/components/profile/OnboardingWizard';
import SkyBackground from '@/components/ui/SkyBackground';
// import { motion } from 'framer-motion'; // Removed unused import

import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LumoLoader from '@/components/ui/lumo-loader';

export default function OnboardingPage() {
  const { user, profiles, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Redirect if a user with profiles lands here (manual navigation or back button)
    // Guard against profiles being undefined, though auth provider typically initializes it
    const profileCount = profiles?.length ?? 0;
    if (profileCount > 0) {
      router.replace('/dashboard');
    }
  }, [user, profiles, isLoading, router]);

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
        <div className="z-10 w-full relative">
          {/* The Wizard Component */}
          <OnboardingWizard />
        </div>
      </main>

    </div>
  );
}
