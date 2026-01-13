import { AnimatePresence, motion } from "framer-motion";
import { type SavedWord } from "@/lib/features/word-insight/provider";
import { type INarrationProvider } from "@/lib/features/narration";
import { WordCard } from "./WordCard";

interface WordGridProps {
    groupedWords: Record<string, SavedWord[]>;
    sortedGroupKeys: string[];
    groupBy: string; // "none" | ...
    onRemove: (word: string, bookId?: string) => void;
    ttsProvider: INarrationProvider;
    isMuted: boolean;
}

export function WordGrid({ groupedWords, sortedGroupKeys, groupBy, onRemove, ttsProvider, isMuted }: WordGridProps) {
    return (
        <div className="space-y-16 pb-20">
            {sortedGroupKeys.map((groupName) => {
                const groupWords = groupedWords[groupName];

                return (
                    <div key={groupName} className="space-y-8">
                        {groupBy !== "none" && (
                            <div className="sticky top-0 z-30 bg-white/10 backdrop-blur-lg py-4 -mx-4 px-4 md:mx-0 md:px-0 md:static md:bg-transparent md:backdrop-filter-none">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-2xl font-black font-fredoka text-ink uppercase tracking-tight">
                                        {groupName}
                                    </h2>
                                    <div className="h-1 flex-1 bg-slate-100/50 rounded-full" />
                                    <span className="px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm shadow-sm text-slate-400 font-bold text-xs">
                                        {groupWords.length}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 
                           Note: For virtualization with React Window, we'd replace this grid with a FixedSizeGrid 
                           or dynamic equivalent. Currently employing CSS grid with AnimatePresence for < 50 items.
                        */}
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            <AnimatePresence mode="popLayout">
                                {groupWords.map((word, index) => (
                                    <motion.div
                                        key={`${word.word}-${word.bookId || 'none'}`}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 25,
                                        }}
                                        className="h-[22rem]" // Reduced fixed height
                                    >
                                        <WordCard
                                            word={word}
                                            index={index}
                                            onRemove={() => onRemove(word.word, word.bookId)}
                                            ttsProvider={ttsProvider}
                                            isMuted={isMuted}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
