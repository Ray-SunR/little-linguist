"use client";

import { useAuth } from "@/components/auth/auth-provider";
import StoryMakerClient from "@/components/story-maker/StoryMakerClient";
import type { UserProfile } from "@/lib/features/story";
import LumoLoader from "@/components/ui/lumo-loader";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import ChildProfileWizard from "@/components/profile/ChildProfileWizard";

function StoryMakerPageContent() {
    const { activeChild, user, status, authResolved } = useAuth();
    const searchParams = useSearchParams();


    // Check if we are in a resume flow
    const action = searchParams.get("action");
    const isResuming = action === "resume_story_maker" || action === "generate";

    // Wait for auth to definitively resolve before rendering content
    if (!authResolved) {
        return <LumoLoader />;
    }

    // If we have a user and NOT in resume flow, wait for hydration to complete.
    // This ensures that the activeChild is populated so the profile form isn't empty.
    if (user && !isResuming && (status === 'loading' || status === 'hydrating')) {
        return <LumoLoader />;
    }

    // Auth resolved and no user: show guest wizard immediately
    if (!user) {
        return (
            <div className="flex-1 h-0 flex flex-col items-center justify-center pb-20 px-2 sm:px-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5 overflow-hidden min-h-0">
                <ChildProfileWizard mode="story" />
            </div>
        );
    }

    // Map active child to initial profile
    const initialProfile: UserProfile = activeChild ? {
        name: activeChild.first_name,
        age: activeChild.birth_year ? new Date().getFullYear() - activeChild.birth_year : 6,
        gender: activeChild.gender === "girl" ? "girl" : "boy",
        avatarUrl: activeChild.avatar_asset_path || undefined,
        avatarStoragePath: (activeChild.avatar_paths && activeChild.avatar_paths.length > 0) ? activeChild.avatar_paths[0] : undefined,
        updatedAt: activeChild.updated_at,
        id: activeChild.id
    } : {
        name: "",
        age: 6,
        gender: "boy",
    };

    return (
        <StoryMakerClient
            key={user.id}
            initialProfile={initialProfile}
        />
    );
}

export default function StoryMakerPage() {
    return (
        <Suspense fallback={<LumoLoader />}>
            <StoryMakerPageContent />
        </Suspense>
    );
}
