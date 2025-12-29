import type { NarrationProvider } from "../narration/narration-provider";
import type { WordInsight } from "../word-insight";

/**
 * Play tooltip content using the provided narration provider
 * Plays sequentially: word → definition → examples
 */
export async function playTooltipTTS(
  insight: WordInsight,
  provider: NarrationProvider
): Promise<void> {
  // Build the text to be spoken
  const parts: string[] = [
    insight.word,
    insight.pronunciation ? `Pronounced: ${insight.pronunciation}` : "",
    insight.definition,
    ...insight.examples
  ].filter(Boolean);

  const fullText = parts.join(". ");

  try {
    // Prepare provider with tooltip content
    await provider.prepare({
      contentId: "tooltip-temp",
      rawText: fullText,
      tokens: parts.map((text, index) => ({
        wordIndex: index,
        text: text
      })),
      speed: 1.0
    });

    // Play the prepared audio
    await provider.play();
  } catch (error) {
    console.error("Failed to play tooltip TTS:", error);
    throw error;
  }
}

/**
 * Play just the word pronunciation
 */
export async function playWordOnly(
  word: string,
  provider: NarrationProvider
): Promise<void> {
  try {
    await provider.prepare({
      contentId: "word-only-temp",
      rawText: word,
      tokens: [{ wordIndex: 0, text: word }],
      speed: 1.0
    });
    await provider.play();
  } catch (error) {
    console.error("Failed to play word TTS:", error);
    throw error;
  }
}

/**
 * Play a single example sentence
 */
export async function playSentence(
  sentence: string,
  provider: NarrationProvider
): Promise<void> {
  try {
    await provider.prepare({
      contentId: "sentence-temp",
      rawText: sentence,
      tokens: [{ wordIndex: 0, text: sentence }],
      speed: 1.0
    });
    await provider.play();
  } catch (error) {
    console.error("Failed to play sentence TTS:", error);
    throw error;
  }
}

/**
 * Stop tooltip TTS playback
 */
export async function stopTooltipTTS(provider: NarrationProvider): Promise<void> {
  try {
    await provider.stop();
  } catch (error) {
    console.error("Failed to stop tooltip TTS:", error);
  }
}
