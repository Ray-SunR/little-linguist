"use client";

import ChildProfileWizard from '@/components/profile/ChildProfileWizard';
import { motion } from 'framer-motion';

import { useAuth } from '@/components/auth/auth-provider';
import { useEffect } from 'react';

export default function OnboardingPage() {
  const { user, profiles } = useAuth();

  useEffect(() => {
    // Log if a user with profiles lands here (could be manual navigation or unwanted redirect)
    if (user && profiles.length > 0) {
      console.warn("[RAIDEN_DIAG][Onboarding] User landed on onboarding despite having profiles.", {
        userId: user.id,
        profileCount: profiles.length
      });
    }
  }, [user, profiles]);

  return (
    <div className="min-h-screen bg-[--shell] font-sans selection:bg-accent selection:text-white overflow-x-hidden flex flex-col">
      <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-6 relative py-8 md:py-12 lg:py-24">

        {/* === Background Elements (Matching Story Maker Magic) === */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient Blobs */}
          <div className="absolute -top-[10%] -left-[10%] w-[60vh] h-[60vh] bg-purple-400/10 rounded-full blur-[120px] animate-float" />
          <div className="absolute top-[30%] right-[-10%] w-[50vh] h-[50vh] bg-pink-500/5 rounded-full blur-[100px] animate-float" style={{ animationDelay: "-3s" }} />
          <div className="absolute bottom-[0%] left-[20%] w-[40vh] h-[40vh] bg-indigo-500/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: "-5s" }} />

          {/* Sunburst Effect */}
          <div className="absolute top-[-20%] right-[-20%] w-[120vw] h-[120vw] opacity-[0.07] animate-sunburst origin-center pointer-events-none z-0 mix-blend-soft-light">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="gradOnboard" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="0%" style={{ stopColor: "rgb(168, 85, 247)", stopOpacity: 0.5 }} />
                  <stop offset="100%" style={{ stopColor: "rgb(236, 72, 153)", stopOpacity: 0 }} />
                </radialGradient>
              </defs>
              {Array.from({ length: 18 }).map((_, i) => (
                <path key={i} d="M100 100 L115 0 L85 0 Z" fill="url(#gradOnboard)" transform={`rotate(${i * 20} 100 100)`} />
              ))}
            </svg>
          </div>

          {/* Noise Overlay */}
          <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay" />
        </div>

        {/* === Content Container === */}
        <div className="z-10 w-full relative">
          {/* The Wizard Component */}
          <ChildProfileWizard />
        </div>
      </main>

    </div>
  );
}
