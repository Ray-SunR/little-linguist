import { useState, useCallback, useRef } from "react";
import { useWordList, type WordInsight, getWordInsightProvider } from "@/lib/features/word-insight";

export interface TooltipPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UseWordInspectorReturn {
  // State
  selectedWord: string | null;
  selectedWordIndex: number | null;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  insight: WordInsight | null;
  position: TooltipPosition | null;

  // Actions
  openWord: (word: string, element: HTMLElement, wordIndex: number) => Promise<void>;
  close: () => void;
  retry: () => Promise<void>;
}

/**
 * Hook for managing word inspection state
 * Handles API calls, caching, loading states, and errors
 */
export function useWordInspector(): UseWordInspectorReturn {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<WordInsight | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  // In-memory cache for session
  const cacheRef = useRef<Map<string, WordInsight>>(new Map());
  const serviceRef = useRef(getWordInsightProvider());

  const openWord = useCallback(async (word: string, element: HTMLElement, wordIndex: number) => {
    const trimmedWord = word.trim();

    if (!trimmedWord) {
      return;
    }

    // Get element position
    const rect = element.getBoundingClientRect();
    setPosition({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    });

    setSelectedWord(trimmedWord);
    setSelectedWordIndex(wordIndex);
    setIsOpen(true);
    setError(null);

    // Check cache first
    const cached = cacheRef.current.get(trimmedWord.toLowerCase());
    if (cached) {
      setInsight(cached);
      setIsLoading(false);
      return;
    }

    // Fetch from service
    setIsLoading(true);

    try {
      const result = await serviceRef.current.getInsight(trimmedWord);

      // Cache successful result
      cacheRef.current.set(trimmedWord.toLowerCase(), result);

      setInsight(result);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch word insight:", err);
      setError("Failed to load word information. Please try again.");
      setInsight(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Keep insight data for smooth close animation
    setTimeout(() => {
      setSelectedWord(null);
      setSelectedWordIndex(null);
      setInsight(null);
      setError(null);
      setPosition(null);
    }, 200);
  }, []);

  const retry = useCallback(async () => {
    if (selectedWord && position && selectedWordIndex !== null) {
      // Clear cache for this word and retry
      cacheRef.current.delete(selectedWord.toLowerCase());
      // Need to recreate element for retry - use approximate position
      const fakeElement = document.elementFromPoint(
        position.x + position.width / 2,
        position.y + position.height / 2
      ) as HTMLElement;
      if (fakeElement) {
        await openWord(selectedWord, fakeElement, selectedWordIndex);
      }
    }
  }, [selectedWord, selectedWordIndex, position, openWord]);

  return {
    selectedWord,
    selectedWordIndex,
    isOpen,
    isLoading,
    error,
    insight,
    position,
    openWord,
    close,
    retry,
  };
}
