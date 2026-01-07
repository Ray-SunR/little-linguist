"use client";

import dynamic from "next/dynamic";
import { LumoCharacter } from "@/components/ui/lumo-character";

const MyWordsContent = dynamic(() => import("./MyWordsContent"), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen page-story-maker flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4">
                <LumoCharacter size="xl" />
                <p className="text-xl font-fredoka font-black text-purple-600 animate-pulse">Opening your treasure chest...</p>
            </div>
        </div>
    )
});

export default function MyWordsPage() {
    return <MyWordsContent />;
}
