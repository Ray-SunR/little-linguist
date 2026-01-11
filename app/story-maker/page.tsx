"use client";

import { useAuth } from "@/components/auth/auth-provider";
import StoryMakerClient from "@/components/story-maker/StoryMakerClient";
import type { UserProfile } from "@/lib/features/story";
import LumoLoader from "@/components/ui/lumo-loader";
import { Suspense } from "react";

import ChildProfileWizard from "@/components/profile/ChildProfileWizard";

export default function StoryMakerPage() {
    const { activeChild, isLoading, user } = useAuth();

    if (isLoading && !user) {
        return <LumoLoader />;
    }

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
                key={activeChild?.id || 'guest'}
                initialProfile={initialProfile}
            />
        </Suspense>
    );
}
