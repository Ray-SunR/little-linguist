import { createClient } from "@/lib/supabase/server";
import { getChildren, ChildProfile } from "@/app/actions/profiles";
import { ProfileHydrator } from "@/components/auth/profile-hydrator";
import { Suspense } from "react";
import LumoLoader from "@/components/ui/lumo-loader";
import dynamic from "next/dynamic";

const LibraryContent = dynamic(() => import("./LibraryContent"), {
    ssr: false,
    loading: () => <LumoLoader />
});

export default async function LibraryPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Server-Side Fetch
    // If not authenticated, the client components (ChildGate) will handle the redirect, 
    // or we could redirect here. But sticking to existing flow, we just pass what we find.
    let initialProfiles: ChildProfile[] = [];
    if (user) {
        const { data, error } = await getChildren();
        if (error) {
            console.error("[RAIDEN_DIAG][Library] Server-side profile fetch failed:", error);
        }
        if (!error && data) {
            initialProfiles = data;
        }
    }

    return (
        <main className="w-full h-full">
            {/* 2. Hydrate Client State Immediately */}
            {user && (
                <ProfileHydrator
                    initialProfiles={initialProfiles}
                    userId={user.id}
                />
            )}

            {/* 3. Render Content */}
            <Suspense fallback={<LumoLoader />}>
                <LibraryContent serverProfiles={initialProfiles} />
            </Suspense>
        </main>
    );
}
