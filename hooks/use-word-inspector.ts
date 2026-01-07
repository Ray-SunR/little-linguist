import { useState, useCallback, useRef, useMemo } from "react";
import { useWordList, type WordInsight, getWordInsightProvider } from "@/lib/features/word-insight";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { normalizeWord } from "@/lib/core/types/domain";
import { assetCache } from "@/lib/core/asset-cache";

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

  const serviceRef = useRef(getWordInsightProvider());
  const lastRequestWordRef = useRef<string | null>(null);

  const releaseInsightAssets = useCallback((ins: WordInsight | null) => {
    if (!ins) return;
    if (ins.audioPath) assetCache.releaseAsset(ins.audioPath);
    if (ins.wordAudioPath) assetCache.releaseAsset(ins.wordAudioPath);
    ins.exampleAudioPaths?.forEach(p => assetCache.releaseAsset(p));
  }, []);

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
    lastRequestWordRef.current = trimmedWord;

    const hydrateInsight = async (raw: WordInsight): Promise<WordInsight> => {
      try {
        const hDef = raw.audioPath ? await assetCache.getAsset(raw.audioPath, raw.audioUrl || "") : raw.audioUrl;
        const hWord = raw.wordAudioPath ? await assetCache.getAsset(raw.wordAudioPath, raw.wordAudioUrl || "") : raw.wordAudioUrl;
        const hEx = raw.exampleAudioPaths?.length && raw.exampleAudioUrls?.length
          ? await Promise.all(raw.exampleAudioUrls.map((url, i) =>
            raw.exampleAudioPaths![i] ? assetCache.getAsset(raw.exampleAudioPaths![i], url) : Promise.resolve(url)
          ))
          : raw.exampleAudioUrls;

        return {
          ...raw,
          audioUrl: hDef,
          wordAudioUrl: hWord,
          exampleAudioUrls: hEx
        };
      } catch (err) {
        console.warn("[WordInspector] Hydration failed, falling back to network URLs:", err);
        return raw;
      }
    };

    const normalized = normalizeWord(trimmedWord);

    // Check RaidenCache first
    const cached = await raidenCache.get<WordInsight>(CacheStore.WORD_INSIGHTS, normalized);
    if (cached) {
      const hydrated = await hydrateInsight(cached);
      if (lastRequestWordRef.current !== trimmedWord) {
        releaseInsightAssets(hydrated);
        return;
      }
      setInsight(prev => {
        releaseInsightAssets(prev);
        return hydrated;
      });
      setIsLoading(false);
      return;
    }

    // Fetch from service
    setIsLoading(true);

    try {
      const result = await serviceRef.current.getInsight(trimmedWord);

      // Hydrate BEFORE caching to IndexedDB if we want to store blobs? 
      // Actually, assetCache stores blobs in its own store. We store the result as-is.
      await raidenCache.put(CacheStore.WORD_INSIGHTS, result);

      const hydrated = await hydrateInsight(result);
      if (lastRequestWordRef.current !== trimmedWord) {
        releaseInsightAssets(hydrated);
        return;
      }
      setInsight(prev => {
        releaseInsightAssets(prev);
        return hydrated;
      });
      setError(null);
    } catch (err) {
      console.error("Failed to fetch word insight:", err);
      setError("Failed to load word information. Please try again.");
      setInsight(null);
    } finally {
      if (lastRequestWordRef.current === trimmedWord) {
        setIsLoading(false);
      }
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    lastRequestWordRef.current = null;
    // Keep insight data for smooth close animation
    setTimeout(() => {
      setSelectedWord(null);
      setSelectedWordIndex(null);
      setInsight(prev => {
        releaseInsightAssets(prev);
        return null;
      });
      setError(null);
      setPosition(null);
    }, 200);
  }, [releaseInsightAssets]);

  const retry = useCallback(async () => {
    if (selectedWord && position && selectedWordIndex !== null) {
      // Clear cache for this word and retry
      await raidenCache.delete(CacheStore.WORD_INSIGHTS, normalizeWord(selectedWord));
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

  return useMemo(() => ({
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
  }), [
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
  ]);
}
