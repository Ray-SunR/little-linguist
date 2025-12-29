# Word Selection Feature - Implementation Plan

## Overview

This document outlines the implementation plan for adding interactive word inspection to the reader. Users can click any word to see a tooltip with kid-friendly definitions, pronunciation, examples, and TTS playback.

**Key Requirements:**
- Click any word to inspect it
- Show tooltip with definition, pronunciation, and examples
- "Listen" button to hear tooltip content via TTS
- Main narration pauses when tooltip audio plays
- Gemini API provides linguistic content
- Extensible architecture to support future backend migration

---

## Architecture Decisions

### Service Abstraction Pattern

To support future migration from direct Gemini API calls to a custom backend, we'll implement a service abstraction layer:

```
┌─────────────────────────────────────┐
│     use-word-inspector hook         │
│     (UI state management)           │
└──────────────┬──────────────────────┘
               │ uses
               ▼
┌─────────────────────────────────────┐
│   WordInsightService interface      │
│   (getInsight contract)             │
└──────────────┬──────────────────────┘
               │ implemented by
               ▼
    ┌──────────────────────┐
    │                      │
    ▼                      ▼
┌────────────┐      ┌──────────────┐
│  Gemini    │      │   Backend    │
│  Service   │      │   Service    │
│  (now)     │      │   (future)   │
└────────────┘      └──────────────┘
```

**Benefits:**
- Single environment variable toggle between implementations
- Type-safe interface ensures compatibility
- Zero refactoring when backend is ready
- Easy to test with mock implementations

### State Management

- **Session-scoped state**: No persistent storage
- **In-memory cache**: Map<string, WordInsight> for repeated lookups
- **Hook-based**: React hooks for component integration

### TTS Integration

- Reuse existing narration provider infrastructure
- Create lightweight adapter for tooltip-specific playback
- Pause main narration during tooltip audio (no auto-resume)

---

## Phase 1: Service Layer (Extensible Architecture)

**Goal:** Create abstraction layer that supports both direct Gemini API calls (now) and future backend API calls.

### 1.1 Install Dependencies

**File:** `package.json`

```bash
npm install @google/generative-ai
```

**Dependencies:**
- `@google/generative-ai`: Google's official Gemini SDK

### 1.2 Create Types & Interface

**File:** `lib/word-insight/types.ts`

```typescript
/**
 * Word insight data structure returned by all services
 */
export interface WordInsight {
  word: string;
  definition: string;
  pronunciation: string;
  examples: string[];
}

/**
 * Service interface for word insight providers
 * Implementations: GeminiWordInsightService, BackendWordInsightService
 */
export interface WordInsightService {
  /**
   * Fetch word insight for a given word
   * @param word - The word to look up (will be normalized)
   * @returns Promise resolving to WordInsight
   * @throws Error if service fails (should be caught and fallback used)
   */
  getInsight(word: string): Promise<WordInsight>;
}

/**
 * Fallback data when service fails
 */
export const FALLBACK_INSIGHT: WordInsight = {
  word: "unknown",
  definition: "Sorry, we couldn't find a definition for this word.",
  pronunciation: "",
  examples: []
};

/**
 * Normalize word for lookup and caching
 */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase().replace(/[.,!?;:'"]/g, "");
}
```

**Key Decisions:**
- Simple, focused interface with single method
- Fallback constant for error cases
- Utility function for word normalization

### 1.3 Create Gemini Service Implementation

**File:** `lib/word-insight/gemini-service.ts`

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { WordInsight, WordInsightService } from "./types";
import { FALLBACK_INSIGHT, normalizeWord } from "./types";

/**
 * Gemini-based word insight service (client-side)
 * Uses Google Generative AI SDK to fetch definitions directly
 */
export class GeminiWordInsightService implements WordInsightService {
  private genAI: GoogleGenerativeAI;
  private model;

  constructor() {
    // Now proxies through /api/word-insight for security
    const response = await fetch("/api/word-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: normalized })
    });
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            word: { type: "string" },
            definition: { type: "string" },
            pronunciation: { type: "string" },
            examples: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["word", "definition", "pronunciation", "examples"]
        }
      }
    });
  }

  async getInsight(word: string): Promise<WordInsight> {
    const normalized = normalizeWord(word);
    
    if (!normalized) {
      return { ...FALLBACK_INSIGHT, word };
    }

    // No longer checked on client
      return { ...FALLBACK_INSIGHT, word };
    }

    try {
      const prompt = `You are a helpful teacher for children ages 5-8. 
Provide a simple, kid-friendly definition for the word "${normalized}".

Include:
1. A simple, clear definition (one sentence, appropriate for young children)
2. Simple phonetic pronunciation (e.g., "cat" = "kat", "there" = "thair")
3. 1-2 example sentences that a young child would understand

Keep everything simple, fun, and age-appropriate.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      const data = JSON.parse(text) as WordInsight;
      
      // Validate response has required fields
      if (!data.word || !data.definition) {
        throw new Error("Invalid response from Gemini");
      }

      return {
        word: data.word,
        definition: data.definition,
        pronunciation: data.pronunciation || "",
        examples: Array.isArray(data.examples) ? data.examples.slice(0, 2) : []
      };

    } catch (error) {
      console.error("Gemini API error:", error);
      return { ...FALLBACK_INSIGHT, word };
    }
  }
}
```

**Key Features:**
- Direct Gemini API integration
- JSON schema for structured responses
- Kid-friendly prompt engineering
- Graceful fallback on errors
- Validates response structure

### 1.4 Create Backend Service Stub

**File:** `lib/word-insight/backend-service.ts`

```typescript
import type { WordInsight, WordInsightService } from "./types";
import { FALLBACK_INSIGHT, normalizeWord } from "./types";

/**
 * Backend API word insight service (future implementation)
 * Will call your custom backend API when available
 */
export class BackendWordInsightService implements WordInsightService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_WORD_INSIGHT_API_URL || "";
    
    if (!this.apiUrl) {
      console.warn("NEXT_PUBLIC_WORD_INSIGHT_API_URL not set. Backend service not configured.");
    }
  }

  async getInsight(word: string): Promise<WordInsight> {
    const normalized = normalizeWord(word);
    
    if (!normalized) {
      return { ...FALLBACK_INSIGHT, word };
    }

    if (!this.apiUrl) {
      console.error("Backend service not configured. Set NEXT_PUBLIC_WORD_INSIGHT_API_URL.");
      return { ...FALLBACK_INSIGHT, word };
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ word: normalized }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate response
      if (!data.word || !data.definition) {
        throw new Error("Invalid response from backend");
      }

      return {
        word: data.word,
        definition: data.definition,
        pronunciation: data.pronunciation || "",
        examples: Array.isArray(data.examples) ? data.examples : []
      };

    } catch (error) {
      console.error("Backend API error:", error);
      return { ...FALLBACK_INSIGHT, word };
    }
  }
}
```

**Key Features:**
- Ready for future backend integration
- Same interface as Gemini service
- Clear error messages when not configured
- Graceful fallbacks

### 1.5 Create Service Factory

**File:** `lib/word-insight/index.ts`

```typescript
import type { WordInsightService } from "./types";
import { GeminiWordInsightService } from "./gemini-service";
import { BackendWordInsightService } from "./backend-service";

// Re-export types for convenience
export type { WordInsight, WordInsightService } from "./types";
export { normalizeWord, FALLBACK_INSIGHT } from "./types";

/**
 * Factory function to get the appropriate word insight service
 * Toggle between implementations via environment variable
 * 
 * @returns WordInsightService instance (Gemini or Backend)
 */
export function getWordInsightService(): WordInsightService {
  const useBackend = process.env.NEXT_PUBLIC_USE_BACKEND_WORD_INSIGHT === "true";
  
  if (useBackend) {
    return new BackendWordInsightService();
  }
  
  return new GeminiWordInsightService();
}

// Singleton instance for reuse
let serviceInstance: WordInsightService | null = null;

/**
 * Get singleton service instance (creates on first call)
 */
export function getWordInsightServiceInstance(): WordInsightService {
  if (!serviceInstance) {
    serviceInstance = getWordInsightService();
  }
  return serviceInstance;
}
```

**Key Features:**
- Single import point for all consumers
- Environment-based service selection
- Singleton pattern for efficiency
- Re-exports types for convenience

**Environment Variables:**

Current setup:
```bash
GEMINI_API_KEY=your_gemini_key_here
```

Future setup (when backend is ready):
```bash
NEXT_PUBLIC_USE_BACKEND_WORD_INSIGHT=true
NEXT_PUBLIC_WORD_INSIGHT_API_URL=https://your-backend.com/api/word-insight
```

---

## Phase 2: Client State Management

**Goal:** Create React hook for managing word inspection state and UI interactions.

### 2.1 Create Word Inspector Hook

**File:** `hooks/use-word-inspector.ts`

```typescript
import { useState, useCallback, useRef } from "react";
import { getWordInsightServiceInstance, type WordInsight } from "../lib/word-insight";

export interface UseWordInspectorReturn {
  // State
  selectedWord: string | null;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  insight: WordInsight | null;
  
  // Actions
  openWord: (word: string) => Promise<void>;
  close: () => void;
  retry: () => Promise<void>;
}

/**
 * Hook for managing word inspection state
 * Handles API calls, caching, loading states, and errors
 */
export function useWordInspector(): UseWordInspectorReturn {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<WordInsight | null>(null);
  
  // In-memory cache for session
  const cacheRef = useRef<Map<string, WordInsight>>(new Map());
  const serviceRef = useRef(getWordInsightServiceInstance());

  const openWord = useCallback(async (word: string) => {
    const trimmedWord = word.trim();
    
    if (!trimmedWord) {
      return;
    }

    setSelectedWord(trimmedWord);
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
      if (!isOpen) {
        setSelectedWord(null);
        setInsight(null);
        setError(null);
      }
    }, 300);
  }, [isOpen]);

  const retry = useCallback(async () => {
    if (selectedWord) {
      // Clear cache for this word and retry
      cacheRef.current.delete(selectedWord.toLowerCase());
      await openWord(selectedWord);
    }
  }, [selectedWord, openWord]);

  return {
    selectedWord,
    isOpen,
    isLoading,
    error,
    insight,
    openWord,
    close,
    retry,
  };
}
```

**Key Features:**
- In-memory caching (session-scoped)
- Loading and error states
- Retry mechanism
- Smooth close with delayed cleanup
- Singleton service instance

### 2.2 Create Tooltip TTS Helper

**File:** `lib/tts/tooltip-tts.ts`

```typescript
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
  // For Web Speech, we can use the provider directly
  // For other providers, we need to prepare them with tooltip content
  
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
      bookId: "tooltip-temp",
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
 * Stop tooltip TTS playback
 */
export async function stopTooltipTTS(provider: NarrationProvider): Promise<void> {
  try {
    await provider.stop();
  } catch (error) {
    console.error("Failed to stop tooltip TTS:", error);
  }
}
```

**Key Features:**
- Reuses existing narration provider infrastructure
- Sequential playback of tooltip content
- Error handling
- Clean stop mechanism

---

## Phase 3: UI Components

**Goal:** Create tooltip component with responsive design and accessibility.

### 3.1 Create Tooltip Component

**File:** `components/reader/word-inspector-tooltip.tsx`

```typescript
"use client";

import { Volume2, X, RefreshCw } from "lucide-react";
import type { WordInsight } from "../../lib/word-insight";

type WordInspectorTooltipProps = {
  insight: WordInsight | null;
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  onClose: () => void;
  onListen: () => void;
  onRetry: () => void;
  isListening?: boolean;
};

export default function WordInspectorTooltip({
  insight,
  isLoading,
  error,
  isOpen,
  onClose,
  onListen,
  onRetry,
  isListening = false,
}: WordInspectorTooltipProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-[1.8rem] bg-white shadow-xl animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-ink/5 text-ink hover:bg-ink/10 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent/30 border-t-accent" />
              <p className="text-ink-muted">Looking up word...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-cta/10 p-4">
                <X className="h-8 w-8 text-cta" />
              </div>
              <p className="text-center text-ink-muted">{error}</p>
              <button
                onClick={onRetry}
                className="ghost-btn inline-flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          )}

          {/* Content */}
          {insight && !isLoading && !error && (
            <div className="space-y-6">
              {/* Word title */}
              <div className="text-center">
                <h2 className="text-4xl font-bold text-ink mb-2">
                  {insight.word}
                </h2>
                {insight.pronunciation && (
                  <p className="text-lg text-ink-muted italic">
                    {insight.pronunciation}
                  </p>
                )}
              </div>

              {/* Listen button */}
              <button
                onClick={onListen}
                disabled={isListening}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Volume2 className="h-5 w-5" />
                {isListening ? "Playing..." : "Listen"}
              </button>

              {/* Definition */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-accent">
                  Definition
                </h3>
                <p className="text-lg leading-relaxed text-ink">
                  {insight.definition}
                </p>
              </div>

              {/* Examples */}
              {insight.examples.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-accent">
                    Examples
                  </h3>
                  <div className="space-y-2">
                    {insight.examples.map((example, index) => (
                      <div
                        key={index}
                        className="rounded-2xl bg-accent-soft px-4 py-3 text-base text-ink"
                      >
                        {example}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Key Features:**
- Modal overlay with backdrop blur
- Loading, error, and content states
- Responsive design (mobile-friendly)
- Accessibility labels
- Smooth animations
- Matches existing design system

---

## Phase 4: Integration

**Goal:** Wire up all components in the reader interface.

### 4.1 Update BookText Component

**File:** `components/reader/book-text.tsx`

```typescript
"use client";

import type { WordToken } from "../../lib/tokenization";

type BookTextProps = {
  tokens: WordToken[];
  currentWordIndex: number | null;
  onWordClick?: (word: string) => void;
};

export default function BookText({ 
  tokens, 
  currentWordIndex,
  onWordClick 
}: BookTextProps) {
  if (tokens.length === 0) {
    return <p className="text-ink-muted">Pick a book to begin.</p>;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("Highlighting word index:", currentWordIndex, "token:", tokens[currentWordIndex ?? 0]?.text);
  }

  return (
    <div className="px-5 py-6 text-left text-xl font-semibold leading-relaxed text-ink md:text-2xl md:leading-relaxed">
      {tokens.map((token) => {
        const isActive = token.wordIndex === currentWordIndex;
        const wordText = token.text;
        
        return (
          <span
            key={token.wordIndex}
            className={`word-token${isActive ? " highlight-word" : ""}`}
          >
            {onWordClick ? (
              <button
                onClick={() => onWordClick(wordText)}
                className="word-button"
                type="button"
              >
                {wordText}
              </button>
            ) : (
              wordText
            )}
            {token.punctuation ?? ""}
            {" "}
          </span>
        );
      })}
    </div>
  );
}
```

**Changes:**
- Added optional `onWordClick` prop
- Wrapped word text in button when handler provided
- Pass clean word text (no punctuation)
- Preserve existing highlight functionality

### 4.2 Update ReaderShell Component

**File:** `components/reader/reader-shell.tsx`

Add imports and integrate word inspector:

```typescript
// Add imports
import { useWordInspector } from "../../hooks/use-word-inspector";
import { playTooltipTTS, stopTooltipTTS } from "../../lib/tts/tooltip-tts";
import WordInspectorTooltip from "./word-inspector-tooltip";

// Inside component, add word inspector hook
const wordInspector = useWordInspector();
const [isListening, setIsListening] = useState(false);

// Add word click handler
const handleWordClick = useCallback(async (word: string) => {
  // Pause main narration when inspecting word
  if (narration.state === "playing") {
    await narration.pause();
  }
  
  await wordInspector.openWord(word);
}, [narration, wordInspector]);

// Add listen handler for tooltip
const handleTooltipListen = useCallback(async () => {
  if (!wordInspector.insight || isListening) return;
  
  setIsListening(true);
  
  try {
    await playTooltipTTS(wordInspector.insight, provider);
  } catch (error) {
    console.error("Failed to play tooltip TTS:", error);
  } finally {
    setIsListening(false);
  }
}, [wordInspector.insight, isListening, provider]);

// Update BookText to pass handler
<BookText 
  tokens={tokens} 
  currentWordIndex={currentWordIndex}
  onWordClick={handleWordClick}
/>

// Add tooltip at end of component
<WordInspectorTooltip
  insight={wordInspector.insight}
  isLoading={wordInspector.isLoading}
  error={wordInspector.error}
  isOpen={wordInspector.isOpen}
  onClose={wordInspector.close}
  onListen={handleTooltipListen}
  onRetry={wordInspector.retry}
  isListening={isListening}
/>
```

**Key Features:**
- Pause main narration on word click
- Integrate word inspector hook
- Handle tooltip TTS playback
- Clean component wiring

---

## Phase 5: Styling & Polish

**Goal:** Add CSS for interactive words and animations.

### 5.1 Add CSS Styles

**File:** `styles/globals.css`

Add at the end:

```css
/* Word Inspector Styles */

/* Interactive word buttons */
.word-button {
  display: inline;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
  border-radius: 0.25rem;
  position: relative;
}

.word-button:hover {
  color: var(--accent);
  background-color: var(--accent-soft);
  padding: 0 0.25rem;
}

.word-button:active {
  transform: scale(0.98);
}

/* Don't show hover on highlighted words to avoid confusion */
.highlight-word .word-button:hover {
  color: inherit;
  background-color: transparent;
  padding: 0;
}

/* Tooltip animations */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}

/* Accessibility: Focus visible for keyboard navigation */
.word-button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 0.25rem;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .word-button {
    transition: none;
  }
  
  .animate-fade-in {
    animation: none;
  }
}
```

**Key Features:**
- Subtle hover effect on words
- Accessibility focus states
- Smooth animations
- Respects reduced motion preferences
- Avoids hover conflict with highlighted words

---

## Phase 6: Testing & Verification

**Goal:** Ensure feature works correctly across different scenarios.

### Manual Test Plan

**Setup:**
1. Set `GEMINI_API_KEY` in `.env.local`
2. Start dev server: `npm run dev`
3. Open Firefox with DevTools MCP

**Test Cases:**

#### TC1: Basic Word Click
- [ ] Navigate to reader page
- [ ] Select a book
- [ ] Click on any word
- [ ] Verify tooltip opens with loading state
- [ ] Verify tooltip shows definition, pronunciation, examples
- [ ] Verify "Listen" button is present

#### TC2: TTS Playback
- [ ] Click a word to open tooltip
- [ ] Click "Listen" button
- [ ] Verify main narration pauses
- [ ] Verify tooltip audio plays
- [ ] Verify "Listen" button shows "Playing..." during playback
- [ ] Verify main narration does NOT auto-resume after tooltip audio

#### TC3: Caching
- [ ] Click word "cat"
- [ ] Close tooltip
- [ ] Click word "cat" again
- [ ] Verify instant load (no loading state)

#### TC4: Different Words
- [ ] Click multiple different words
- [ ] Verify each shows appropriate content
- [ ] Verify cache works for repeated clicks

#### TC5: Error Handling
- [ ] Remove/invalidate API key
- [ ] Click a word
- [ ] Verify fallback message appears
- [ ] Verify "Try Again" button works

#### TC6: Mobile Responsiveness
- [ ] Resize browser to mobile width
- [ ] Click words
- [ ] Verify tooltip fits screen
- [ ] Verify touch interaction works
- [ ] Verify readable text sizes

#### TC7: Edge Cases
- [ ] Click punctuation-only (should not open tooltip)
- [ ] Click empty space (should not open tooltip)
- [ ] Click very long word
- [ ] Click word while another tooltip is open
- [ ] Click word during main narration playback

#### TC8: Accessibility
- [ ] Use keyboard to navigate to words (Tab)
- [ ] Press Enter/Space to activate word
- [ ] Verify focus visible indicators
- [ ] Close tooltip with Escape key
- [ ] Verify ARIA labels

#### TC9: Narration Provider Compatibility
Test with each provider:
- [ ] Web Speech API (default)
- [ ] Remote TTS (if configured)
- [ ] Polly (if configured)

Verify tooltip TTS works with each.

#### TC10: Performance
- [ ] Click 10+ different words rapidly
- [ ] Verify no memory leaks
- [ ] Verify cache doesn't grow unbounded
- [ ] Verify smooth animations

### Debug Logging

Add in components during development:

```typescript
if (process.env.NODE_ENV !== "production") {
  console.log("Word clicked:", word);
  console.log("Cache hit:", cacheRef.current.has(word));
  console.log("Insight loaded:", insight);
}
```

---

## Environment Configuration

### Current Setup (Gemini Direct)

`.env.local`:
```bash
# Gemini API Key (get from https://aistudio.google.com/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Force backend mode (default: false)
# NEXT_PUBLIC_USE_BACKEND_WORD_INSIGHT=false
```

### Future Setup (Your Backend)

When your backend is ready:

`.env.local`:
```bash
# Switch to backend mode
NEXT_PUBLIC_USE_BACKEND_WORD_INSIGHT=true

# Your backend API URL
NEXT_PUBLIC_WORD_INSIGHT_API_URL=https://your-api.com/word-insight
