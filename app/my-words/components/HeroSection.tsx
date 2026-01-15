import { motion } from "framer-motion";
import { Search, Sparkles, Image as ImageIcon } from "lucide-react";

interface UsageStatus {
    current: number;
    limit: number;
    isLimitReached: boolean;
}

interface HeroSectionProps {
    count: number;
    usage?: Record<string, UsageStatus>;
}

export function HeroSection({ count, usage }: HeroSectionProps) {

    return (
        <header className="mx-auto mb-8 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 font-fredoka tracking-tighter mb-1">
                        My Treasury
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 text-slate-500 font-nunito font-bold text-lg">
                        <span className="flex items-center justify-center bg-amber-100 text-amber-600 rounded-full px-3 py-0.5 text-sm font-black shadow-sm">
                            {count} Words
                        </span>
                        <span className="text-slate-400">collected</span>
                        
                        {usage && (
                            <div className="flex items-center gap-4 ml-2 md:border-l-2 md:border-slate-100 md:pl-6">
                                {/* Magic Credits */}
                                {usage.magic_sentence && (
                                    <div className="flex items-center gap-3 min-w-[100px]">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center shadow-clay-sm shrink-0 border border-purple-100">
                                            <Sparkles className="w-4 h-4 text-purple-600 drop-shadow-sm" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5 gap-2">
                                                <span className="text-[10px] font-black text-purple-600 uppercase tracking-tighter font-fredoka">Magic</span>
                                                <span className="text-[10px] font-black text-ink-muted/60 font-nunito whitespace-nowrap">
                                                    {Math.max(0, usage.magic_sentence.limit - usage.magic_sentence.current)}
                                                </span>
                                            </div>
                                            <div className="w-16 h-1.5 bg-purple-100/30 rounded-full overflow-hidden p-0.5 shadow-inner">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(1 - usage.magic_sentence.current / usage.magic_sentence.limit) * 100}%` }}
                                                    transition={{ type: "spring", damping: 15, stiffness: 100 }}
                                                    className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full shadow-md"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Image Credits */}
                                {usage.image_generation && (
                                    <div className="flex items-center gap-3 min-w-[100px]">
                                        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shadow-clay-sm shrink-0 border border-amber-100">
                                            <ImageIcon className="w-4 h-4 text-amber-500 drop-shadow-sm" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5 gap-2">
                                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter font-fredoka">Images</span>
                                                <span className="text-[10px] font-black text-ink-muted/60 font-nunito whitespace-nowrap">
                                                    {Math.max(0, usage.image_generation.limit - usage.image_generation.current)}
                                                </span>
                                            </div>
                                            <div className="w-16 h-1.5 bg-amber-100/30 rounded-full overflow-hidden p-0.5 shadow-inner">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(1 - usage.image_generation.current / usage.image_generation.limit) * 100}%` }}
                                                    transition={{ type: "spring", damping: 15, stiffness: 100 }}
                                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full shadow-md"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
