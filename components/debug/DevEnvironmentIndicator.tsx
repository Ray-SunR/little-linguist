import { headers } from "next/headers";

export function DevEnvironmentIndicator() {
    // Strictly only show in development
    if (process.env.NODE_ENV !== "development") {
        return null;
    }

    const isMockAI = process.env.MOCK_AI_SERVICES === "true";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const isLocalDB = supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1");

    return (
        <div className="fixed bottom-2 right-2 z-50 flex flex-col gap-1 text-[10px] font-mono pointer-events-none opacity-80 hover:opacity-100 transition-opacity">
            {/* DB Indicator */}
            <div
                className={`px-2 py-1 rounded-full shadow-sm border flex items-center gap-1.5 ${isLocalDB
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-amber-100 text-amber-800 border-amber-200"
                    }`}
            >
                <div
                    className={`w-2 h-2 rounded-full ${isLocalDB ? "bg-green-500" : "bg-amber-500 animate-pulse"
                        }`}
                />
                <span>{isLocalDB ? "Local DB" : "Remote DB"}</span>
            </div>

            {/* AI Indicator */}
            <div
                className={`px-2 py-1 rounded-full shadow-sm border flex items-center gap-1.5 ${!isMockAI
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-purple-100 text-purple-800 border-purple-200"
                    }`}
            >
                <div
                    className={`w-2 h-2 rounded-full ${!isMockAI ? "bg-green-500" : "bg-purple-500"
                        }`}
                />
                <span>{!isMockAI ? "Real AI" : "Mock AI"}</span>
            </div>
        </div>
    );
}
