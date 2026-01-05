import type { INarrationProvider } from "../types";
import type { WordInsight } from "@/lib/features/word-insight";

/**
 * Play tooltip content using the provided narration provider
 * Plays sequentially: word → definition → examples
 */
export async function playTooltipTTS(
  insight: WordInsight,
  provider: INarrationProvider
): Promise<void> {
  const parts: string[] = [
    insight.word,
    insight.pronunciation ? `Pronounced: ${insight.pronunciation}` : "",
    insight.definition,
    ...insight.examples
  ].filter(Boolean);

  const fullText = parts.join(". ");

  await provider.prepare({
    contentId: "tooltip-temp",
    rawText: fullText,
    tokens: parts.map((text, index) => ({
      wordIndex: index,
      text
    })),
    speed: 1.0
  });

  await provider.play();
}

/**
 * Play just the word pronunciation
 */
export async function playWordOnly(
  word: string,
  provider: INarrationProvider
): Promise<void> {
  await provider.prepare({
    contentId: "word-only-temp",
    rawText: word,
    tokens: [{ wordIndex: 0, text: word }],
    speed: 1.0
  });
  await provider.play();
}

/**
 * Play a single example sentence
 */
export async function playSentence(
  sentence: string,
  provider: INarrationProvider
): Promise<void> {
  await provider.prepare({
    contentId: "sentence-temp",
    rawText: sentence,
    tokens: [{ wordIndex: 0, text: sentence }],
    speed: 1.0
  });
  await provider.play();
}

/**
 * Stop tooltip TTS playback
 */
export async function stopTooltipTTS(provider: INarrationProvider): Promise<void> {
  try {
    await provider.stop();
  } catch (error) {
    console.error("Failed to stop tooltip TTS:", error);
  }
}
