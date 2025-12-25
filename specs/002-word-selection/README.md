# Task Prompt: Word Inspection + Tooltip + TTS (Gemini)

You are a coding agent working in `/Users/renchen/Work/github/raiden` (Next.js App Router, React, Tailwind, shadcn/ui). Implement a feature that lets users click any word in the reader to inspect it. On click, show a tooltip/card with:
- the word (large title)
- pronunciation (simple phonetic)
- a short, kid-friendly definition
- 1–2 kid-friendly example sentences
- a “Listen” control (and/or per-line listen)

All tooltip text must be listenable via TTS. When a word is being pronounced, the main narration **must pause**. Use existing narration providers (Web Speech / Remote TTS / Polly). Use Gemini to fetch the definition/pronunciation/examples.

You MUST follow existing project constraints:
- Client is Next.js App Router, TypeScript, Tailwind, shadcn/ui, Lucide.
- In-browser, session-scoped state only (no new backend DB).
- Verification should be via Firefox DevTools MCP (per project notes).
- Add dev-only debug logging for speed/highlight flows if troubleshooting.
- Follow current styling patterns in `styles/globals.css`.

Reference implementation for Gemini style:
`/Users/renchen/Downloads/little-linguist(1)/services/geminiService.ts` (same model patterns + JSON schema).

## Deliverables
1. **Implementation plan** (clear steps with file paths).
2. **Code changes** to implement the feature.
3. **Brief manual test plan**.

---

## Suggested Implementation Plan (Detailed)

### 1) Gemini server route
- Add `app/api/word-insight/route.ts`.
- Accept POST `{ word: string }`.
- Validate input (trim, lowercase, strip punctuation).
- Use `@google/genai` to call Gemini with JSON schema.
- Response JSON:
  ```json
  { "word": "there", "definition": "A place that is not here.", "pronunciation": "thair", "examples": ["Look! The cat is over there."] }
  ```
- Fallback on error with safe defaults.
- Environment variable: `GEMINI_API_KEY` (or project standard).

### 2) Gemini helper service
- Add `lib/gemini/word-insight.ts` (server-only helper).
- Use the same approach as `geminiService.ts` example:
  - `GoogleGenAI`
  - `responseMimeType: "application/json"`
  - `responseSchema` with definition, pronunciation, examples
- Return typed result; catch errors and return fallback.

### 3) Word inspector hook (client)
- Add `hooks/use-word-inspector.ts`.
- State:
  - selected word, isOpen, isLoading, error
  - insight data: definition, pronunciation, examples
- Add simple in-memory cache keyed by normalized word.
- Provide handlers: `open(word)`, `close()`, `reload()`.

### 4) Tooltip UI component
- Add `components/reader/word-inspector-tooltip.tsx`.
- Use `components/ui/tooltip.tsx` or custom popover if richer layout is needed.
- Match design in screenshot: big word, listen button, definition line, example bubble, close icon.
- Keep the UI compact and mobile-friendly.

### 5) Make words selectable
- Update `components/reader/book-text.tsx`:
  - Render each token as a `button` or `span` with `role="button"`.
  - On click, call the word inspector hook.
  - Ensure punctuation is not in the word token for lookup.
  - Preserve `highlight-word` style.

### 6) TTS for tooltip text
- Reuse the existing narration provider selection logic (as in `ReaderShell`).
- Add a small client helper, e.g., `lib/tts/play-tooltip-tts.ts`:
  - For Web Speech: use `SpeechSynthesisUtterance` for each string.
  - For Remote/Polly: either reuse provider with a temporary input or add a minimal “speak text” function.
- Tooltip “Listen” should play:
  - word
  - pronunciation
  - definition
  - examples (in order)

### 7) Pause main narration when tooltip audio plays
- In `ReaderShell`, when a word is clicked and tooltip TTS starts, call `narration.pause()`.
- Do **not** auto-resume after tooltip; let user resume manually.

### 8) Styling
- Add CSS in `styles/globals.css` or Tailwind classes:
  - Tooltip card container
  - Word title text
  - Listen button style (pill)
  - Example bubble
  - Close button

### 9) Error handling + edge cases
- If Gemini fails, show fallback definition and a sample sentence.
- If word is empty or punctuation-only, ignore.
- Cache results per word to avoid repeated requests.

### 10) Manual Test Plan
- Open `/reader` and click different words.
- Verify tooltip opens with loaded content.
- Click “Listen”: main narration pauses, tooltip audio plays.
- Verify definitions/examples look correct and are readable on mobile.

---

## Notes / Constraints
- Do not add backend storage.
- Keep state in-memory and session-scoped.
- Use Gemini only via server route (do not expose API key in client).
- Keep existing narration providers (Web Speech, Remote TTS, Polly).

