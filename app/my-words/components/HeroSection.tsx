import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LumoCharacter } from "@/components/ui/lumo-character";
import { Search } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";

interface HeroSectionProps {
    count: number;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
}

export function HeroSection({ count, searchQuery, setSearchQuery }: HeroSectionProps) {
    const [localQuery, setLocalQuery] = useState(searchQuery);
    const debouncedQuery = useDebounce(localQuery, 300);

    useEffect(() => {
        if (debouncedQuery !== searchQuery) {
            setSearchQuery(debouncedQuery);
        }
    }, [debouncedQuery, searchQuery, setSearchQuery]);

    return (
        <header className="mx-auto mb-12 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                {/* Title & Character Area */}
                <div className="flex items-center gap-6 relative">
                    <div className="relative shrink-0 z-10">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                        >
                            <LumoCharacter size="lg" className="w-24 h-24 md:w-28 md:h-28 drop-shadow-xl" />
                        </motion.div>

                        {/* Simplified Badge */}
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="absolute -top-2 -right-2 bg-gradient-to-tr from-amber-300 to-amber-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-lg border-2 border-white"
                        >
                            ✨
                        </motion.div>
                    </div>

                    <div>
                        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 font-fredoka tracking-tighter mb-1">
                            My Treasury
                        </h1>
                        <div className="flex items-center gap-2 text-slate-500 font-nunito font-bold text-lg">
                            <span className="flex items-center justify-center bg-amber-100 text-amber-600 rounded-full px-3 py-0.5 text-sm font-black shadow-sm">
                                {count} Words
                            </span>
                            <span>collected</span>
                        </div>
                    </div>
                </div>

                {/* Search Bar - Modern & Glassy */}
                <div className="w-full md:w-auto relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={localQuery}
                        onChange={(e) => setLocalQuery(e.target.value)}
                        placeholder="Search your magic words..."
                        className="w-full md:w-80 pl-11 pr-5 py-3.5 rounded-2xl bg-white/60 hover:bg-white/80 focus:bg-white border text-ink font-bold placeholder:text-slate-400 border-white/50 focus:border-indigo-200 outline-none shadow-sm focus:shadow-md transition-all backdrop-blur-xl"
                        aria-label="Search your collected words"
                    />
                </div>
            </div>
        </header>
    );
}
