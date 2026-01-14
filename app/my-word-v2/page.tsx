"use client";

import dynamic from "next/dynamic";
import { LumoCharacter } from "@/components/ui/lumo-character";

const MyWordV2Content = dynamic(() => import("./MyWordV2Content"), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen page-story-maker flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4">
                <LumoCharacter size="xl" />
                <p className="text-xl font-fredoka font-black text-purple-600 animate-pulse">Opening your new treasure chest...</p>
            </div>
        </div>
    )
});

export default function MyWordV2Page() {
    return <MyWordV2Content />;
}
