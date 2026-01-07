"use client";

import LumoLoader from "@/components/ui/lumo-loader";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/auth/auth-provider";

const LibraryContent = dynamic(() => import("./LibraryContent"), { 
    ssr: false,
    loading: () => <LumoLoader />
});

export default function LibraryPage() {
    const { user, isLoading: authLoading } = useAuth();
    
    // While auth is booting, show the loader. 
    // This provides a cleaner gate for the internal LibraryContent to assume a stable identity.
    if (authLoading) return <LumoLoader />;
    
    return (
        <LibraryContent key={user?.id || "anonymous"} />
    );
}
