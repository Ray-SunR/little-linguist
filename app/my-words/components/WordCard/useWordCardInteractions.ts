import { useState, useCallback, useRef, useEffect } from "react";
import { type SavedWord } from "@/lib/features/word-insight/provider";
import { RemoteTtsNarrationProvider } from "@/lib/features/narration/implementations/remote-tts-provider";
import { playWordOnly, type INarrationProvider } from "@/lib/features/narration";

export function useWordCardInteractions(word: SavedWord, ttsProvider: INarrationProvider, isMuted: boolean) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const audioProviderRef = useRef<RemoteTtsNarrationProvider | null>(null);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioProviderRef.current) {
                // Assuming provider might have a stop method, or just let garbage collection handle it 
                // but explicitly clearing the ref is good practice.
                audioProviderRef.current = null;
            }
        };
    }, []);

    const handleFlip = useCallback(() => {
        setIsFlipped(prev => !prev);
    }, []);

    const handleListen = useCallback(async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (isListening) return;
        if (isMuted) return;

        setIsListening(true);
        try {
            if (word.wordAudioUrl) {
                // Reuse existing provider if URL hasn't changed, or create new one
                if (!audioProviderRef.current) {
                    audioProviderRef.current = new RemoteTtsNarrationProvider(word.wordAudioUrl);
                }

                await audioProviderRef.current.prepare({
                    contentId: `word-only-${word.word}`,
                    rawText: word.word,
                    tokens: [{ wordIndex: 0, text: word.word }],
                });
                await audioProviderRef.current.play();
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
