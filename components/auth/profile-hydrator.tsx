"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { ChildProfile } from "@/app/actions/profiles";

interface ProfileHydratorProps {
    initialProfiles: ChildProfile[];
    userId: string;
}

/**
 * Hydrates the AuthProvider with server-side fetched profiles.
 * This bridges the gap between Server Components and the Client-side AuthProvider,
 * ensuring profiles are available immediately without waiting for client-side fetch.
 */
export function ProfileHydrator({ initialProfiles, userId }: ProfileHydratorProps) {
    const { setProfiles, user, activeChild, setActiveChild, isLoading, setIsLoading } = useAuth();
    const hydratedRef = useRef(false);

    useEffect(() => {
        // Only hydrate if we have explicit profiles and haven't done so yet for this user
        if (hydratedRef.current || !initialProfiles || initialProfiles.length === 0) return;

        // Safety check matching logic
        if (user?.id !== userId) return;

        console.info("[RAIDEN_DIAG][Auth] Hydrating profiles from Server Component", {
            count: initialProfiles.length,
            userId
        });

        setProfiles(initialProfiles);

        // Auto-select first child if none is active (matching local storage logic implicitly)
        if (!activeChild) {
            // We don't want to override cookie-based selection if it exists, 
            // but we can at least provide a valid profile set so ChildGate doesn't block.
            // The AuthProvider's own logic might double-check cookies, but setting state here is safe.
            // Helper: we leave activeChild alone unless we want to force default.
        }

        // Crucial: Release the loading lock since we have Data
        if (isLoading) {
            setIsLoading(false);
        }

        hydratedRef.current = true;
    }, [initialProfiles, userId, user, setProfiles, activeChild, isLoading, setIsLoading]);

    return null;
}
