import { useState, useCallback } from "react";
import { type SavedWord } from "@/lib/features/word-insight/provider";
import { RemoteTtsNarrationProvider } from "@/lib/features/narration/implementations/remote-tts-provider";
import { playWordOnly, type INarrationProvider } from "@/lib/features/narration";

export function useWordCardInteractions(word: SavedWord, ttsProvider: INarrationProvider, isMuted: boolean) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isListening, setIsListening] = useState(false);

    const handleFlip = useCallback(() => {
        setIsFlipped(prev => !prev);
    }, []);

    const handleListen = useCallback(async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (isListening) return;

        // Check mute state from viewModel if we had access, but for now we pass isMuted prop
        if (isMuted) return;

        setIsListening(true);
        try {
            if (word.wordAudioUrl) {
                const provider = new RemoteTtsNarrationProvider(word.wordAudioUrl);
                await provider.prepare({
                    contentId: `word-only-${word.word}`,
                    rawText: word.word,
                    tokens: [{ wordIndex: 0, text: word.word }],
                });
                await provider.play();
            } else {
                await playWordOnly(word.word, ttsProvider);
            }
        } catch (err) {
            console.error("Failed to play word narration:", err);
        } finally {
            setIsListening(false);
        }
    }, [isListening, word, ttsProvider, isMuted]);

    return {
        isFlipped,
        isListening,
        handleFlip,
        handleListen
    };
}
