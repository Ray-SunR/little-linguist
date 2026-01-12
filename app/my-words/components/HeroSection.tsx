import { motion } from "framer-motion";
import { LumoCharacter } from "@/components/ui/lumo-character";
import { Search } from "lucide-react";

interface HeroSectionProps {
    count: number;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
}

export function HeroSection({ count, searchQuery, setSearchQuery }: HeroSectionProps) {
    return (
        <header className="mx-auto mb-10 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 mb-8">
                <div className="flex items-start gap-4 md:gap-6">
                    <div className="relative group shrink-0">
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                        >
                            <LumoCharacter size="lg" className="md:w-32 md:h-32 drop-shadow-2xl" />
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, x: 20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            className="absolute -top-10 left-32 bg-white px-6 py-4 rounded-[2rem] shadow-clay border-4 border-white whitespace-nowrap hidden lg:block z-20"
                            aria-hidden="true"
                        >
                            <span className="text-lg font-fredoka font-black text-purple-600 block leading-tight">Look at all these</span>
                            <span className="text-2xl font-black text-amber-500 font-fredoka uppercase">Magic Words! ✨</span>
                            <div className="absolute left-[-16px] top-6 w-8 h-8 bg-white border-l-4 border-t-4 border-white rotate-[-45deg]" />
                        </motion.div>
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black text-ink font-fredoka uppercase tracking-tight leading-none mb-2">
                            My Treasury
                        </h1>
                        <p className="text-xl text-ink-muted font-bold font-nunito flex items-center gap-2" role="status" aria-live="polite">
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                            {count} sparkles collected so far!
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group w-full md:w-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-accent transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search word..."
                            className="pl-12 pr-6 py-4 rounded-3xl bg-white/80 backdrop-blur-md border-4 border-white shadow-clay-inset text-ink font-bold placeholder:text-slate-200 outline-none focus:border-accent/30 focus:bg-white transition-all w-full md:w-72"
                            aria-label="Search your collected words"
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}
