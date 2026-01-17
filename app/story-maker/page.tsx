"use client";

import { useAuth } from "@/components/auth/auth-provider";
import StoryMakerClient from "@/components/story-maker/StoryMakerClient";
import type { UserProfile } from "@/lib/features/story";
import LumoLoader from "@/components/ui/lumo-loader";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import ChildProfileWizard from "@/components/profile/ChildProfileWizard";

export default function StoryMakerPage() {
    const { activeChild, isLoading, user, status } = useAuth();
    const [isInitialWait, setIsInitialWait] = useState(true);
    const searchParams = useSearchParams();
    const action = searchParams.get('action');
    const isResuming = action === 'resume_story_maker' || action === 'generate';

    useEffect(() => {
        // Give a short window for initial hydration and auth listener to catch up
        const timer = setTimeout(() => setIsInitialWait(false), 500);
        return () => clearTimeout(timer);
    }, []);

    // Comprehensive loading state
    // When resuming, we MUST stay in loading state until we are certain about the user status
    if (status === 'loading' || status === 'hydrating' || (isResuming && status !== 'ready' && status !== 'error')) {
        return <LumoLoader />;
    }

    // After hydration, if we are resuming and still no user, we might want to wait a split second 
    // for the auth listener to fire if getSession missed it.
    if (!user && isResuming && isInitialWait) {
        return <LumoLoader />;
    }

    // After all checks, if still no user, show guest wizard
    if (!user) {
        return (
            <div className="min-h-screen py-20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                <ChildProfileWizard mode="story" />
            </div>
        );
    }

    // Map active child to initial profile
    const initialProfile: UserProfile = activeChild ? {
        name: activeChild.first_name,
        age: activeChild.birth_year ? new Date().getFullYear() - activeChild.birth_year : 6,
        gender: activeChild.gender === "girl" ? "girl" : "boy",
        avatarUrl: (activeChild.avatar_paths && activeChild.avatar_paths.length > 0) ? activeChild.avatar_paths[0] : undefined,
        avatarStoragePath: (activeChild.avatar_paths && activeChild.avatar_paths.length > 0) ? activeChild.avatar_paths[0] : undefined,
        id: activeChild.id
    } : {
        name: "",
        age: 6,
        gender: "boy",
    };

    return (
        <Suspense fallback={<LumoLoader />}>
            <StoryMakerClient
                key={user.id}
                initialProfile={initialProfile}
            />
        </Suspense>
    );
}
