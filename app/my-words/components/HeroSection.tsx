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

    const getRemainingCredits = (status: UsageStatus) => Math.max(0, status.limit - status.current);
    const getProgressPercentage = (status: UsageStatus) => status.limit > 0 ? (1 - status.current / status.limit) * 100 : 0;

    return (
        <header className="w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="font-fredoka text-3xl md:text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-violet-600" />
                        My Treasury
                    </h1>
                    <p className="text-slate-500 font-medium font-nunito max-w-2xl leading-relaxed flex items-center gap-2">
                        Your collection of magical words and phrases you&apos;ve discovered.
                        <span className="inline-flex items-center justify-center bg-amber-100 text-amber-600 rounded-full px-3 py-0.5 text-xs font-black shadow-sm">
                            {count} {count === 1 ? 'Word' : 'Words'}
                        </span>
                    </p>
                </div>

                {usage && (
                    <div className="flex items-center gap-4 bg-white/40 backdrop-blur-md p-3 rounded-2xl border border-white/60 shadow-clay-sm">
                        {/* Magic Credits */}
                        {usage.magic_sentence && (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center shadow-clay-sm shrink-0 border border-purple-100">
                                    <Sparkles className="w-4 h-4 text-purple-600 drop-shadow-sm" />
                                </div>
                                <div className="flex flex-col min-w-[60px]">
                                    <div className="flex justify-between items-baseline mb-0.5 gap-2">
                                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-tighter font-fredoka">Magic</span>
                                        <span className="text-[10px] font-black text-slate-500 font-nunito">
                                            {getRemainingCredits(usage.magic_sentence)}
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-purple-100/30 rounded-full overflow-hidden p-0.5 shadow-inner">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${getProgressPercentage(usage.magic_sentence)}%` }}
                                            transition={{ type: "spring", damping: 15, stiffness: 100 }}
                                            className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Image Credits */}
                        {usage.image_generation && (
                            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shadow-clay-sm shrink-0 border border-amber-100">
                                    <ImageIcon className="w-4 h-4 text-amber-500 drop-shadow-sm" />
                                </div>
                                <div className="flex flex-col min-w-[60px]">
                                    <div className="flex justify-between items-baseline mb-0.5 gap-2">
                                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter font-fredoka">Images</span>
                                        <span className="text-[10px] font-black text-slate-500 font-nunito">
                                            {getRemainingCredits(usage.image_generation)}
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-amber-100/30 rounded-full overflow-hidden p-0.5 shadow-inner">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${getProgressPercentage(usage.image_generation)}%` }}
                                            transition={{ type: "spring", damping: 15, stiffness: 100 }}
                                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
