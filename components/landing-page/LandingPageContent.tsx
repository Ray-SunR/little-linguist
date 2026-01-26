"use client";

import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useLandingPageViewModel } from "./useLandingPageViewModel";
import { BackgroundEffects } from "./BackgroundEffects";
import { HeroSection } from "./HeroSection";
import { RecommendationsSection } from "./RecommendationsSection";
import { FeatureDeepDive } from "./FeatureDeepDive";
import { HowItWorks } from "./HowItWorks";
import { BottomCTA } from "./BottomCTA";
import { LandingPageFooter } from "./LandingPageFooter";
import { ScrollProgressBar } from "@/components/landing-page/ScrollProgressBar";

// Dynamic Imports for Below-the-Fold components
const SocialProof = dynamic(() => import("@/components/landing-page/SocialProof"), { ssr: true });
const ReaderDemo = dynamic(() => import("@/components/landing-page/demos").then(mod => mod.ReaderDemo), { ssr: false });
const StoryDemo = dynamic(() => import("@/components/landing-page/demos").then(mod => mod.StoryDemo), { ssr: false });
const StickyTrialCTA = dynamic(() => import("@/components/landing-page/StickyTrialCTA").then(mod => mod.StickyTrialCTA), { ssr: false });

export default function LandingPageContent() {
    const viewModel = useLandingPageViewModel();
    const {
        isInteracting,
        messageList,
        messageIndex,
        handleLumoClick,
        isNative,
        hasMounted,
        particles,
        searchQuery,
        setSearchQuery,
        selectedInterest,
        setSelectedInterest,
        isLoading,
        books,
        hasSearched
    } = viewModel;

    return (
        <main className={cn(
            "min-h-screen page-story-maker overflow-x-hidden bg-[--shell] transition-opacity duration-500",
            !hasMounted ? "opacity-0" : "opacity-100"
        )}>
            {!isNative && hasMounted && <ScrollProgressBar />}

            <div className="relative">
                <BackgroundEffects particles={particles} />
                <HeroSection
                    isInteracting={isInteracting}
                    messageList={messageList}
                    messageIndex={messageIndex}
                    handleLumoClick={handleLumoClick}
                    isNative={isNative}
                />

                {!isNative && (
                    <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
                        <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block h-[60px] md:h-[100px] w-[calc(100%+1.3px)] fill-white/40">
                            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
                        </svg>
                    </div>
                )}
            </div>

            {!isNative && (
                <>
                    <SocialProof />
                    <ReaderDemo />
                    <RecommendationsSection
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        selectedInterest={selectedInterest}
                        setSelectedInterest={setSelectedInterest}
                        isLoading={isLoading}
                        books={books}
                        hasSearched={hasSearched}
                    />
                    <FeatureDeepDive />
                    <StoryDemo />
                    <HowItWorks />
                    <BottomCTA />
                    <LandingPageFooter />
                    <StickyTrialCTA />
                </>
            )}
        </main>
    );
}
