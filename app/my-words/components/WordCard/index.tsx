import { memo, useEffect } from "react";
import { cn } from "@/lib/core/utils/cn";
import { type SavedWord } from "@/lib/features/word-insight/provider";
import { type INarrationProvider } from "@/lib/features/narration";
import { WordCardFront } from "./WordCardFront";
import { WordCardBack } from "./WordCardBack";
import { useWordCardInteractions } from "./useWordCardInteractions";
import { useTutorial } from "@/components/tutorial/tutorial-context";

interface WordCardProps {
    word: SavedWord;
    index: number;
    onRemove: () => void;
    ttsProvider: INarrationProvider;
    isMuted: boolean;
    isFirstWord?: boolean;
}

const colorSets = [
    { bg: "bg-purple-500", shadow: "shadow-clay-purple", accent: "text-purple-500", light: "bg-purple-50" },
    { bg: "bg-blue-500", shadow: "shadow-clay-blue", accent: "text-blue-500", light: "bg-blue-50" },
    { bg: "bg-emerald-500", shadow: "shadow-clay-mint", accent: "text-emerald-500", light: "bg-emerald-50" },
    { bg: "bg-amber-500", shadow: "shadow-clay-amber", accent: "text-amber-500", light: "bg-amber-50" },
    { bg: "bg-rose-500", shadow: "shadow-clay-rose", accent: "text-rose-500", light: "bg-rose-50" },
];

export const WordCard = memo(function WordCard({ word, index, onRemove, ttsProvider, isMuted, isFirstWord }: WordCardProps) {
    const { isFlipped, isListening, handleFlip, handleListen } = useWordCardInteractions(word, ttsProvider, isMuted);
    const { completeStep } = useTutorial();
    const theme = colorSets[index % colorSets.length];

    const safeId = encodeURIComponent(word.word).replace(/%/g, '');
    const cardId = `word-card-${safeId}-${index}`;
    const backId = `word-card-back-${safeId}-${index}`;

    // Hook tutorial progression to flip
    useEffect(() => {
        if (isFlipped && isFirstWord) {
            completeStep('treasury-check', 2000);
        }
    }, [isFlipped, isFirstWord, completeStep]);

    return (
        <div
            id={isFirstWord ? "first-saved-word" : undefined}
            data-tour-target={isFirstWord ? "first-saved-word" : undefined}
            className="group relative h-[28rem] cursor-pointer perspective-1500"
            role="button"
            aria-expanded={isFlipped}
            aria-controls={backId}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFlip();
                }
            }}
        >
            <div
                className={cn(
                    "relative h-full w-full transition-all duration-700 preserve-3d shadow-xl rounded-[2.5rem] group-hover:[transform:rotateX(2deg)_rotateY(2deg)]",
                    isFlipped ? "[transform:rotateY(180deg)] group-hover:[transform:rotateY(182deg)_rotateX(2deg)]" : ""
                )}
            >
                {/* Front Face */}
                <div
                    className="absolute h-full w-full backface-hidden z-10"
                    style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
                    aria-hidden={isFlipped}
                >
                    <WordCardFront
                        word={word}
                        index={index}
                        isListening={isListening}
                        onFlip={handleFlip}
                        onListen={handleListen}
                        theme={theme}
                    />
                </div>

                {/* Back Face */}
                <div
                    id={backId}
                    className="absolute h-full w-full [transform:rotateY(180deg)] backface-hidden overflow-hidden rounded-[2.5rem] z-20"
                    style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
                    aria-hidden={!isFlipped}
                >
                    <WordCardBack
                        word={word}
                        onFlip={handleFlip}
                        onRemove={onRemove}
                        theme={theme}
                        ttsProvider={ttsProvider}
                    />
                </div>
            </div>
        </div>
    );
});
