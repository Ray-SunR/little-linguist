# 003 Book Image + Book Layout Proposal (Detailed)

Date: 2025-12-25  
Owner: Codex (with user approval)  
Status: Draft for review  

## Summary
Introduce a responsive “book-like” layout for the reader with two independent view controls (single/spread + paged/continuous), add image rendering at explicit word-index anchors without changing the plain-text book content or breaking narration/highlighting, and provide page navigation controls with keyboard support. All state remains session-scoped.

---

## Goals (Detailed)
1) **Book-like layout**
   - Paper surface, margins, subtle page edge shadow, and visible gutter for spreads.
   - Works across phone/tablet/desktop.

2) **Configurable view**
   - **View**: single page or two-page spread.
   - **Flow**: paged (fixed viewport + navigation) or continuous (scroll).

3) **Images at precise anchors**
   - Books remain **plain text**.
   - Images placed at **explicit `afterWordIndex`** positions.
   - Images are **visual only**, do not affect narration timing or highlight indices.
   - Captions always shown; alt text optional but supported.

4) **Existing narration + word highlight preserved**
   - Word tokens remain in DOM order; `token.wordIndex` remains stable.
   - Highlighting and word click continue to work exactly as before.

---

## Non-Goals
- No persistent storage for generated images (session-only).
- No EPUB/HTML ingestion or rich markup parsing.
- No optimization for very large books (virtualization, precomputed layout).

---

## Current Baseline (Code Reality)
- Reader entry: `app/reader/page.tsx` → `components/reader/reader-shell.tsx`.
- Text rendering: `components/reader/book-text.tsx`, tokenized by `lib/tokenization`.
- Word highlighting: `hooks/use-word-highlighter.ts` (uses `token.wordIndex`).
- `data/books.json` contains `{ id, title, text, audioUrl? }`.

---

## Proposed Data Model (Plain Text + Anchors)
Add `images` array to each book entry.

```json
{
  "id": "sunny-forest",
  "title": "Sunny and the Forest Friends",
  "text": "...",
  "images": [
    {
      "id": "sunny-forest-1",
      "afterWordIndex": 120,
      "src": "/images/sunny-forest/1.png",
      "caption": "Sunny and Lila by the creek",
      "alt": "Sunny the fox and Lila the bunny by the creek"
    }
  ]
}
```

**Rules & Validation**
- `afterWordIndex` refers to the **same wordIndex used by narration** (tokenization output).
- Multiple images can share the same `afterWordIndex` (render in listed order).
- Image insertion must not create additional tokens or alter wordIndex.
- If `afterWordIndex` is out of range, skip and log in dev.

---

## Layout Modes (Behavior Spec)

### 1) Continuous Flow
- A scrollable page container with “paper” styling.
- Content is one continuous flow; images render inline.
- Single/spread toggles adjust overall container width and gutter styling (visual, not functional).

### 2) Paged Flow (Responsive CSS Columns)
- Fixed-height viewport with CSS column flow:
  - **Single** → 1 column
  - **Spread** → 2 columns
- Navigation:
  - Buttons: Prev / Next
  - Keyboard: Left/Right arrows
  - Page indicator: `current / total`
- Page height determined by container size (responsive, not fixed px).
- Page count derived from scroll width / column width.

**Rationale**
- Keeps DOM order unchanged (tokens still inline). This ensures highlighting and narration remain intact.
- Avoids complex client-side pagination logic while still providing page navigation.

---

## Component Architecture

### New: `components/reader/book-layout.tsx`
Responsibilities:
- Apply page styling (paper, shadows, gutter).
- Render BookText content inside a **layout container**.
- Toggle between continuous/paged.
- Compute page counts and current page (paged mode only).
- Provide navigation controls and keyboard handling.

Inputs:
- `tokens: WordToken[]`
- `images?: BookImage[]`
- `currentWordIndex: number | null`
- `onWordClick?: (word: string) => void`
- `viewMode: 'single' | 'spread'`
- `flowMode: 'paged' | 'continuous'`

Outputs:
- JSX layout with layout-specific wrappers and controls.

### Updated: `components/reader/book-text.tsx`
Enhancements:
- Accept `images?: BookImage[]` and `onWordClick` (already supported) with a new `renderInlineImage` helper.
- Insert image blocks **after** matching `token.wordIndex`.

### Updated: `components/reader/reader-shell.tsx`
Changes:
- Add local state for `viewMode` and `flowMode`.
- Add layout controls UI near playback controls.
- Pass `images` and modes to `BookLayout` instead of `BookText` directly.

---

## Layout Controls (UI Spec)
Location: Under or next to playback controls.

Controls:
- **View**: `Single` | `Spread`
- **Flow**: `Paged` | `Continuous`

Behavior:
- Default to `single + paged`.
- Changes applied immediately without reloading.

---

## Paged Mode Implementation Details

### DOM Structure
```
<BookLayout>
  <div className="book-viewport">
    <div className="book-columns">
      <BookText />
    </div>
  </div>
  <div className="book-nav">prev / indicator / next</div>
</BookLayout>
```

### CSS Column Strategy
- `.book-columns`:
  - `column-count: 1 or 2`
  - `column-gap: var(--page-gap)`
  - `column-fill: auto`
  - `height: var(--page-height)`
- `.book-viewport`:
  - `overflow: hidden`
  - `height` responsive via `clamp()`

### Page Computation
- Use the scroll width of `.book-columns`:
  - `totalPages = Math.ceil(scrollWidth / viewportWidth)`
- `currentPage` based on `scrollLeft / viewportWidth`.

### Navigation
- `Prev`: `scrollLeft -= viewportWidth`
- `Next`: `scrollLeft += viewportWidth`
- Clamp to `[0, totalPages-1]`.
- Keyboard arrows only active when focus within the layout (or when a global flag enabled).

### Resize Handling
- Use a `ResizeObserver` on viewport to recompute:
  - `pageWidth`, `totalPages`, `currentPage`.
- Debounce recompute (e.g., 100ms).

---

## Image Rendering Strategy

### Placement
- For each token, check if `images` exist where `afterWordIndex === token.wordIndex`.
- Insert a **block-level** image element immediately after that token.

### DOM Placement
```
<span className="word-token">...token...</span>
<div className="book-image-block">
  <img className="book-image" ... />
  <figcaption className="book-caption">...</figcaption>
</div>
```

### Styling Requirements
- Images should never exceed page width.
- Use `max-width: 100%` and `height: auto`.
- Captions are centered, smaller text.
- In paged mode: set `break-inside: avoid` to prevent image splits across columns.

---

## Styling Specs (Concrete)
Add CSS variables for layout:
- `--page-max-width`
- `--page-height`
- `--page-padding`
- `--page-gap`
- `--paper-bg`
- `--paper-shadow`

Example targets:
- `--page-max-width: clamp(320px, 85vw, 900px)`
- `--page-height: clamp(420px, 70vh, 760px)`
- `--page-padding: clamp(16px, 3vw, 36px)`
- `--page-gap: clamp(16px, 4vw, 48px)`

Visual styling:
- Paper texture via subtle gradient + noise overlay (CSS).
- Gutter shadow for spread mode.
- Page edge shadow for both modes.

---

## Accessibility
- Images have `alt` text if provided; if not, empty alt.
- Captions are visible text (not read by narration).
- Keyboard navigation only when the layout is focused to avoid hijacking global arrows.

---

## Gemini Image Generation (Session Only)
- Integrate a helper to request image URLs.
- Follows the sample implementation:
  `/Users/renchen/Downloads/little-linguist(1)/services/geminiService.ts`
- Store generated image URLs in component state only; no file writes.
- Provide a small internal hook or helper to request a new image for a given caption.

**Note:** requires user approval to read that Gemini service file (outside repo).

---

## Detailed Implementation Plan (File-by-File)

### A) Data & Types
- `data/books.json`
  - Add `images` arrays with anchors.
- `components/reader/reader-shell.tsx`
  - Extend `Book` type to include `images?: BookImage[]`.
- Optional: `lib/types.ts` to centralize `BookImage` and `Book` types.

### B) Layout Controls
- Create `components/reader/layout-controls.tsx` or inline in `reader-shell.tsx`.
- Add state:
  - `const [viewMode, setViewMode] = useState<'single'|'spread'>('single')`
  - `const [flowMode, setFlowMode] = useState<'paged'|'continuous'>('paged')`

### C) BookLayout
- New `components/reader/book-layout.tsx`.
- Internal refs:
  - `viewportRef` for page width.
  - `columnsRef` for scrollWidth.
- Track `currentPage`, `totalPages`.
- Hook for `ResizeObserver`.
- Keyboard handler on container (use `onKeyDown` and `tabIndex=0`).

### D) BookText image insertion
- Modify mapping:
  - Build a lookup `imagesByIndex: Record<number, BookImage[]>`.
  - After each token render, insert matching images.

### E) Styles
- `styles/globals.css`:
  - `.book-surface`, `.book-viewport`, `.book-columns`.
  - `.book-image-block`, `.book-image`, `.book-caption`.
  - `.book-spread` variations with gutter shadows.

### F) Dev logging
- Dev-only logs for:
  - layout mode changes
  - images skipped due to index mismatch

---

## Testing / QA Checklist
Manual checks (Firefox per project guidance):
- Highlighting still follows narration in both paged + continuous.
- Clicking a word still opens tooltip.
- Paged mode: prev/next works; page indicator correct; keyboard arrows work.
- Spread mode: two columns flow; gutter shadow visible.
- Images anchor at correct indices and never split across columns.
- Responsive behavior at mobile widths (<= 390px), tablet (768px), desktop (>= 1024px).

---

## Risks & Mitigations
- **Column pagination precision**: relies on browser column layout; may vary by font. Mitigation: recompute after fonts load; keep tolerant.
- **Anchor drift if tokenization changes**: document in spec; add validation logging.
- **Images too tall**: add max-height (e.g., 45% of page height) + `object-fit: contain`.

---

## Acceptance Criteria (Detailed)
- User can switch `single/spread` and `paged/continuous` at runtime.
- Word highlighting and word-click remain unchanged.
- Images appear at explicit anchors with captions and alt text.
- Paged mode includes buttons, keyboard arrows, and page indicator.
- Layout is responsive across phone/tablet/desktop.
- No backend storage introduced; state is session-only.
