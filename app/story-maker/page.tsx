import { cookies } from "next/headers";
import { getChildren } from "@/app/actions/profiles";
import StoryMakerClient from "@/components/story-maker/StoryMakerClient";
import type { UserProfile } from "@/lib/features/story";

export default async function StoryMakerPage() {
    const cookieStore = cookies();
    const activeChildId = cookieStore.get("activeChildId")?.value;
    
    // Default fallback profile
    let initialProfile: UserProfile = {
        name: "",
        age: 6,
        gender: "boy",
    };

    try {
        const { data: children } = await getChildren();
        
        if (children && children.length > 0) {
            // Find active child or default to first
            const activeChild = children.find(c => c.id === activeChildId) || children[0];
            
            if (activeChild) {
                initialProfile = {
                    name: activeChild.first_name,
                    age: activeChild.birth_year ? new Date().getFullYear() - activeChild.birth_year : 6,
                    // Basic gender mapping, defaulting if unknown
                    gender: activeChild.gender === "girl" ? "girl" : "boy",
                    avatarUrl: activeChild.avatar_asset_path
                };
            }
        }
    } catch (err) {
        console.error("Failed to fetch child profile for Story Maker:", err);
        // Fallback to empty profile is fine, user can fill it
    }

    return (
        <StoryMakerClient initialProfile={initialProfile} />
    );
}
