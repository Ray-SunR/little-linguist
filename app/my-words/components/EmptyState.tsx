import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Search } from "lucide-react";
import { LumoCharacter } from "@/components/ui/lumo-character";

interface EmptyStateProps {
    type: "empty" | "no-results";
    onReset?: () => void;
}

export function EmptyState({ type, onReset }: EmptyStateProps) {
    if (type === "no-results") {
        return (
            <div className="clay-card p-20 flex flex-col items-center justify-center text-center bg-white/40">
                <div className="w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                    <Search className="h-10 w-10 text-slate-200" />
                </div>
                <h3 className="text-3xl font-black text-ink font-fredoka mb-2">No words found</h3>
                <p className="text-lg text-ink-muted font-bold mb-8">Try searching for something else!</p>
                <button
                    onClick={onReset}
                    className="px-8 py-3 rounded-2xl bg-slate-100 text-slate-500 font-black font-fredoka uppercase text-sm hover:bg-slate-200 transition-colors"
                >
                    Reset Explore
                </button>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="clay-card p-16 flex flex-col items-center justify-center text-center min-h-[500px] relative overflow-hidden"
        >
            <div className="absolute inset-x-[-30px] inset-y-[-30px] bg-amber-400/10 blur-[80px] rounded-full animate-pulse-glow pointer-events-none" />

            <div className="relative mb-12 group cursor-pointer">
                <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-white to-amber-50 shadow-clay-amber flex items-center justify-center border-4 border-white transition-transform duration-500 group-hover:scale-110">
                    <LumoCharacter size="xl" />
                </div>
                <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-amber-100"
                >
                    <Sparkles className="h-6 w-6 text-amber-500" />
                </motion.div>
            </div>

            <h2 className="mb-4 text-4xl font-black text-ink font-fredoka uppercase tracking-tight">Your vault is empty</h2>
            <p className="text-xl text-ink-muted mb-10 max-w-md font-nunito font-medium">
                Explore magical stories and tap on starry words to build your treasure collection!
            </p>
            <Link href="/library">
                <motion.div
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-12 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl font-black font-fredoka uppercase tracking-wide shadow-clay-purple flex items-center gap-3"
                >
                    <Sparkles className="h-6 w-6" />
                    <span>Explore Magic Library</span>
                </motion.div>
            </Link>
        </motion.div>
    );
}
