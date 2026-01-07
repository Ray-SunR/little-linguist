"use client";

import { useAuth } from "@/components/auth/auth-provider";
import StoryMakerClient from "@/components/story-maker/StoryMakerClient";
import type { UserProfile } from "@/lib/features/story";
import LumoLoader from "@/components/ui/lumo-loader";

export default function StoryMakerPage() {
    const { activeChild, isLoading } = useAuth();
    
    if (isLoading) {
        return <LumoLoader />;
    }

    // Map active child to initial profile
    const initialProfile: UserProfile = activeChild ? {
        name: activeChild.first_name,
        age: activeChild.birth_year ? new Date().getFullYear() - activeChild.birth_year : 6,
        gender: activeChild.gender === "girl" ? "girl" : "boy",
        avatarUrl: activeChild.avatar_asset_path
    } : {
        name: "",
        age: 6,
        gender: "boy",
    };

    return (
        <StoryMakerClient initialProfile={initialProfile} />
    );
}
