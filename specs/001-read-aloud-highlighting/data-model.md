# Data Model: Core Reader MVP

## Entities

### Book

- **Fields**:
  - `id`: unique identifier (string)
  - `title`: display title (string)
  - `text`: full story text (string)
- **Relationships**:
  - Has many Word Tokens derived at runtime
- **Validation rules**:
  - `text` must be non-empty and include at least 200 words for MVP validation

### Word Token

- **Fields**:
  - `wordIndex`: sequential index for spoken words (number)
  - `text`: word text without trailing punctuation (string)
  - `punctuation`: trailing punctuation, if any (string | null)
- **Relationships**:
  - Belongs to a Book

### Word Timing

- **Fields**:
  - `wordIndex`: word index (number)
  - `startMs`: start time in milliseconds (number)
  - `endMs`: end time in milliseconds (number)
- **Relationships**:
  - References Word Token by `wordIndex`

### Narration Result

- **Fields**:
  - `provider`: provider type identifier (string)
  - `audioUrl`: audio source URL (string | null)
  - `wordTimings`: list of Word Timing entries (array | null)
  - `meta`: provider metadata (object | null)
- **Relationships**:
  - References Book content and Word Tokens by alignment

### Playback State

- **States**: IDLE, PLAYING, PAUSED, STOPPED
- **Transitions**:
  - IDLE → PLAYING: Read Story
  - PLAYING → PAUSED: Pause
  - PAUSED → PLAYING: Resume
  - PLAYING/PAUSED → STOPPED: Stop or error
  - PLAYING → STOPPED: narration ended

## Derived Data

- `tokens`: array of Word Tokens computed from Book text
- `currentWordIndex`: active word index derived from timing and playback time
