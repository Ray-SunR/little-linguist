# AI Services Integration 🤖

Raiden integrates several AI providers to create an immersive, personalized reading experience.

## 🎙️ AWS Polly (Text-to-Speech)

Polly is used for generating high-quality narration.

-   **Engines**: Supports `neural` and `generative` (Long-form) voices.
-   **Speech Marks**: Raiden requests `word` speech marks. These character-offset timestamps are aligned to canonical `absIndex` values using the `SpeechMarkAligner`.
-   **SSML**: The `NarrativeDirector` wraps text in SSML tags (`<break>`, `<prosody>`) to add emotional depth and pacing.

## 🧠 AWS Bedrock & Claude

Claude (3.5 Sonnet / 4.5) is the primary "creative" engine.

### Use Cases:
1.  **Story Generation**: Creates structured JSON for personalized stories, ensuring safe and engaging content.
2.  **Narrative Direction**: Analyzes story text to insert appropriate SSML tags for the Polly engine.
3.  **Image Prompting**: Generates descriptive prompts for scene illustrations, maintaining character consistency via "Visual Identity" anchors.

## 🖼️ Google Gemini (Vertex AI)

Gemini Flash Image and Pro models provide utility and visual features.

### Use Cases:
1.  **Image Generation**: Generates scene illustrations and book covers based on Claude's prompts.
2.  **Word Insights**: Provides definitions, pronunciations, and "Magic Sentences" (contextual examples) for vocabulary building.
3.  **Semantic Embeddings**: (via Bedrock or Gemini) Generates vectors for books to power the "More Like This" recommendation engine.

---

## 🛡️ Content Safety & Sanitization

All AI interactions go through a sanitization layer:
-   **Prompt Cleaning**: Removes trademarked characters or sensitive terms.
-   **Response Validation**: Ensures AI-generated JSON matches the project's strict TypeScript interfaces before database insertion.
-   **Error Handling**: If an AI service fails, the system falls back to cached data or simplified logic to prevent app crashes.
