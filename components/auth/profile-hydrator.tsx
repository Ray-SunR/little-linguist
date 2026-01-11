"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { ChildProfile } from "@/app/actions/profiles";

interface ProfileHydratorProps {
    initialProfiles: ChildProfile[];
    userId: string;
    serverError?: boolean;
}

/**
 * Hydrates the AuthProvider with server-side fetched profiles.
 * This bridges the gap between Server Components and the Client-side AuthProvider,
 * ensuring profiles are available immediately without waiting for client-side fetch.
 */
export function ProfileHydrator({ initialProfiles, userId, serverError }: ProfileHydratorProps) {
    const { setProfiles, user, activeChild, setActiveChild, isLoading, setIsLoading } = useAuth();
    const hydratedRef = useRef(false);

    // Reset hydration state if userId changes
    useEffect(() => {
        hydratedRef.current = false;
    }, [userId]);

    useEffect(() => {
        // Safety check matching logic
        if (user?.id !== userId) return;

        // Only hydrate if we haven't done so yet for this user
        if (hydratedRef.current) return;

        // If server fetch failed, do not hydrate and DO NOT release loading lock.
        // Let the client-side retry logic in AuthProvider handle it.
        if (serverError) {
            console.warn("[RAIDEN_DIAG][Auth] Server component reported fetch error, deferring to client fetch.");
            return;
        }

        const hasProfiles = initialProfiles && initialProfiles.length > 0;

        if (hasProfiles) {
            console.info("[RAIDEN_DIAG][Auth] Hydrating profiles from Server Component", {
                count: initialProfiles.length,
                userId
            });

            setProfiles(initialProfiles);
        }

        // Crucial: Release the loading lock regardless of profile count
        // If 0 profiles, ChildGate handles the redirect logic.
        // We just need to stop the global loading spinner.
        if (isLoading) {
            console.info("[RAIDEN_DIAG][Auth] Clearing loading state from Server Component");
            setIsLoading(false);
        }

        hydratedRef.current = true;
    }, [initialProfiles, userId, user, setProfiles, activeChild, isLoading, setIsLoading, serverError]);

    return null;
}
