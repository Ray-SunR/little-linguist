"use client";

import LumoLoader from "@/components/ui/lumo-loader";
import dynamic from "next/dynamic";

const LibraryContent = dynamic(() => import("./LibraryContent"), { 
    ssr: false,
    loading: () => <LumoLoader />
});

export default function LibraryPage() {
    return (
        <LibraryContent />
    );
}
