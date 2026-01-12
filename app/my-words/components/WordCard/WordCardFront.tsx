import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { cn } from "@/lib/core/utils/cn";
import { type SavedWord } from "@/lib/features/word-insight/provider";

interface WordCardFrontProps {
    word: SavedWord;
    index: number;
    isListening: boolean;
    onFlip: () => void;
    onListen: (e: React.MouseEvent) => void;
    theme: { bg: string; shadow: string; accent: string; light: string };
}

export function WordCardFront({ word, index, isListening, onFlip, onListen, theme }: WordCardFrontProps) {
    return (
        <div className="relative h-full w-full bg-white rounded-[2.5rem] border-4 border-white shadow-clay flex flex-col items-center justify-between p-6 md:p-8 overflow-hidden">
            {word.nextReviewAt && new Date(word.nextReviewAt) <= new Date() && (
                <div className="absolute top-6 left-6 px-4 py-1.5 rounded-full bg-amber-400 text-white font-black font-fredoka text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-clay-amber z-10 animate-bounce-subtle">
                    <span>✨</span>
                    Ready to Play
                </div>
            )}

            <div className="flex flex-col items-center gap-4 md:gap-6 mt-6 md:mt-10 w-full flex-1 justify-center">
                <motion.button
                    onClick={onListen}
                    disabled={isListening}
                    animate={isListening ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                    transition={{ duration: 0.5, repeat: isListening ? Infinity : 0 }}
                    className={cn(
                        "w-20 h-20 rounded-3xl flex items-center justify-center border-4 border-white shadow-clay transition-all hover:scale-105 active:scale-95 z-20",
                        theme.bg
                    )}
                    aria-label={`Listen to pronunciation for ${word.word}`}
                >
                    <Volume2 className="h-10 w-10 text-white fill-current" />
                </motion.button>

                <div className="text-center w-full">
                    <h3 className={cn("text-3xl md:text-4xl lg:text-5xl font-black font-fredoka uppercase tracking-tight mb-2 drop-shadow-sm truncate px-2", theme.accent)}>
                        {word.word}
                    </h3>
                    <button
                        onClick={(e) => { e.stopPropagation(); onFlip(); }}
                        className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-slate-50 text-slate-400 font-black font-fredoka text-[10px] uppercase tracking-widest border border-slate-100 hover:bg-slate-100 transition-colors"
                        aria-label={`Reveal details for ${word.word}`}
                    >
                        Tap to see secret ✨
                    </button>
                </div>
            </div>

            {/* Decorative bottom element */}
            <div className="w-full flex justify-center mt-auto opacity-30">
                <div className={cn("w-16 h-1 rounded-full", theme.bg)} />
            </div>
        </div>
    );
}
