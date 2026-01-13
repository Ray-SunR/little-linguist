import { motion } from "framer-motion";
import { Volume2, Sparkles } from "lucide-react";
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
        <div
            onClick={onFlip}
            className="relative h-full w-full bg-white rounded-[2rem] shadow-xl border border-white/50 flex flex-col items-center justify-between p-6 overflow-hidden hover:shadow-2xl transition-shadow"
        >
            {/* Background Decor */}
            <div className={cn("absolute inset-0 opacity-10 blur-3xl", theme.bg)} />

            {/* Top Bar */}
            <div className="w-full flex justify-between items-start z-10 relative">
                {word.nextReviewAt && new Date(word.nextReviewAt) <= new Date() ? (
                    <div className="px-3 py-1 rounded-full bg-amber-100 text-amber-600 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Ready</span>
                    </div>
                ) : <div />}

                <motion.button
                    onClick={(e) => { e.stopPropagation(); onListen(e); }}
                    disabled={isListening}
                    whileTap={{ scale: 0.9 }}
                    animate={isListening ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                    className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm text-white",
                        theme.bg
                    )}
                    aria-label={`Listen to pronunciation for ${word.word}`}
                >
                    <Volume2 className="h-5 w-5 fill-current" />
                </motion.button>
            </div>

            {/* Main Word - Centered */}
            <div className="flex-1 flex flex-col items-center justify-center w-full z-10 relative -mt-4">
                <h3 className={cn("text-3xl md:text-4xl font-black font-fredoka uppercase tracking-tight text-center break-words w-full px-2 drop-shadow-sm", theme.accent)}>
                    {word.word}
                </h3>
            </div>

            {/* Bottom Action */}
            <div className="text-center z-10 relative w-full">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest group-hover:text-slate-400 transition-colors">
                    Tap to reveal
                </span>
                <div className={cn("mt-2 h-1.5 w-12 mx-auto rounded-full opacity-20", theme.bg)} />
            </div>
        </div>
    );
}
