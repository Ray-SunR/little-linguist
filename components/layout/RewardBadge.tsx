"use client";

import { motion, AnimatePresence } from "framer-motion";

interface RewardBadgeProps {
    activeReward: { xp_earned: number; streak_days?: number } | null;
}

export function RewardBadge({ activeReward }: RewardBadgeProps) {
    return (
        <AnimatePresence>
            {activeReward && activeReward.xp_earned > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.5 }}
                    animate={{ opacity: 1, y: -80, scale: 1.2 }}
                    exit={{ opacity: 0, y: -100, scale: 0.8 }}
                    className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-[100]"
                >
                    <div className="flex flex-col items-center">
                        <div className="bg-amber-400 text-ink font-fredoka font-black text-sm px-3 py-1.5 rounded-full shadow-clay-orange whitespace-nowrap border-2 border-white">
                            +{activeReward.xp_earned} Lumo Coins
                        </div>
                        {activeReward.streak_days && activeReward.streak_days > 0 && (
                            <div className="bg-orange-500 text-white font-fredoka font-black text-[10px] px-2 py-1 rounded-full shadow-sm mt-1.5 border border-white">
                                {activeReward.streak_days} DAY STREAK! 🔥
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
