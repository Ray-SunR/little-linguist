# Work Plan: Mock AI Services for Story Maker

## Context

### Original Request
Mock AI usages (Story, Image, Polly) if `MOCK_AI_SERVICES=true` to save costs, using Sun Wukong fixture as mock data.

### Interview Summary
**Key Decisions**:
- **Refactor Depth**: Full refactor of `app/api/story/route.ts`, `PollyNarrationService`, and `BedrockEmbeddingService` into a Provider/Factory pattern.
- **Fixture Scaling**: If requested story length exceeds the fixture's 2 sections, cycle/repeat the fixture sections.
- **Mock Scope**: Includes Story Generation (Gemini), Image Generation, Narration (Polly), and Embeddings (Bedrock).
- **Flag**: Use `MOCK_AI_SERVICES=true` as the master override.

**Research Findings**:
- `ImageGenerationFactory` already supports a mock provider.
- `app/api/story/route.ts` directly instantiates multiple AI services, which needs cleanup.
- `sunwukong-prek-1` fixture provides a good baseline but only has 2 sections.

### Metis Review
**Identified Gaps** (addressed):
- **Speech Mark Sync**: Mock narration must provide valid JSON speech marks to prevent Reader UI crashes.
- **Total Mock Mode**: `MOCK_AI_SERVICES` will override specific provider flags to ensure no accidental costs.
- **Unification**: Consolidation of Story + Embedding into the existing `AIProvider` factory.

---

## Work Objectives

### Core Objective
Implement a unified "Mock Mode" for all AI-powered features in the Story Maker flow to enable cost-free development and E2E testing.

### Concrete Deliverables
- `lib/core/integrations/ai/mock-provider.ts`: Combined Story + Embedding mock.
- `lib/features/narration/types.ts`: Formal interface for narration.
- `lib/features/narration/factory.ts`: Selection logic for narration providers.
- `lib/features/narration/implementations/mock-provider.ts`: Mock audio + speech marks.
- Refactored `app/api/story/route.ts` using unified factories.

### Definition of Done
- [ ] `MOCK_AI_SERVICES=true` triggers all mocks.
- [ ] Story generation returns cycled Sun Wukong content with the user's hero name.
- [ ] Reader page plays mock audio and highlights words correctly.
- [ ] E2E test `Full Guest to Story Workflow` passes with mocking enabled.

---

## Verification & Safety Strategy (MANDATORY)

### Refactoring Guarantee
To ensure the refactor (moving from direct instantiation to Factory/Provider) does not break existing functionality, I will follow these steps:
1. **Baseline E2E**: Run the current E2E test to establish a "Green" state.
2. **Exhaustive Usage Search**: Use `ast_grep_search` to find all hidden usages of `GoogleGenAI`, `PollyClient`, and `BedrockRuntimeClient` to ensure they are all wrapped in providers.
3. **Provider Symmetry**: Ensure that the `Real` providers implemented in the factory pass identical parameters to the underlying SDKs as the current hardcoded logic.
4. **Dual-Run Verification**: The final validation requires passing the E2E test in two modes:
   - **Mode A (Default)**: Factories should return real providers. (Verified via local dev or checking that `MOCK_AI_SERVICES=false` doesn't trigger mock logs).
   - **Mode B (Mock)**: Factories should return mock providers. (Verified via `MOCK_AI_SERVICES=true`).

### Test Decision
- **Infrastructure exists**: YES
- **User wants tests**: Exhaustive E2E + Refactor Verification
- **QA approach**: Playwright E2E

### Manual Execution Verification (The "Green" Path)
- **1. Pre-Refactor Verification**:
  - Run: `BASE_URL=http://localhost:3001 npx playwright test e2e/guest-story-maker.spec.ts`
  - Expected: PASS (using real services or existing integration test setup).
- **2. Post-Refactor Mock Verification**:
  - Run: `MOCK_AI_SERVICES=true BASE_URL=http://localhost:3001 npx playwright test e2e/guest-story-maker.spec.ts`
  - Expected: PASS. Content should match fixture data (Sun Wukong content).
- **3. Narration Highlight Verification**:
  - Open reader for a mocked story.
  - Verify: "Leo" is highlighted as the audio (mock) plays.

---

## Task Flow
1. Define Interfaces & Factories → 2. Implement Mock Providers → 3. Refactor API Route → 4. Verify E2E

---

## TODOs

- [ ] 0. Authenticated Story Maker E2E Test
  **What to do**:
  - Create a new test file or add to existing: `e2e/authenticated-story-maker.spec.ts`.
  - Flow:
    1. Sign up / Login with a test email.
    2. Navigate to `/story-maker`.
    3. Complete the story wizard for a logged-in user.
    4. Verify generation starts and redirects to reader.
  - This establishes the baseline for the non-guest flow.

- [ ] 1. Abstractions & Factories
  **What to do**:
  - Define `INarrationService` interface in `lib/features/narration/types.ts`.
  - Refactor `PollyNarrationService` to implement `INarrationService`.
  - Create `NarrationFactory` in `lib/features/narration/factory.ts` with `MOCK_AI_SERVICES` check.
  - Ensure `getAIProvider()` in `lib/core/integrations/ai/factory.ts` respects `MOCK_AI_SERVICES`.

  **Pattern References**:
  - `lib/features/image-generation/factory.ts` - Provider selection pattern.

- [ ] 2. Implement Mock Providers
  **What to do**:
  - Create `lib/core/integrations/ai/mock-provider.ts`:
    - `generateStory`: Loads `tests/fixtures/library/sunwukong/sunwukong-prek-1/metadata.json`, replaces "Sun Wukong" with `profile.name`, cycles sections to match `storyLengthMinutes`.
    - `generateEmbedding`: Returns deterministic mock vector.
  - Create `lib/features/narration/implementations/mock-narration-provider.ts`:
    - Returns a small valid base64 MP3 buffer.
    - Returns mock speech marks matching the input text tokens.

- [ ] 3. Refactor `app/api/story/route.ts`
  **What to do**:
  - Remove direct `GoogleGenAI` instantiation.
  - Remove direct `PollyNarrationService` instantiation.
  - Remove direct `BedrockEmbeddingService` instantiation.
  - Inject providers using `getAIProvider()`, `NarrationFactory.getProvider()`, and `ImageGenerationFactory.getProvider()`.
  - Ensure all factories are aware of `MOCK_AI_SERVICES`.

- [ ] 4. E2E Verification
  **What to do**:
  - Run the full Guest Story Maker E2E test with `MOCK_AI_SERVICES=true`.
  - Ensure it reaches the reader page and content is correct.
  - Verify no external API calls are made (check logs/env).

---

## Success Criteria

### Verification Commands
```bash
MOCK_AI_SERVICES=true BASE_URL=http://localhost:3001 npx playwright test e2e/guest-story-maker.spec.ts
```

### Final Checklist
- [ ] `MOCK_AI_SERVICES` master toggle works.
- [ ] Fixture scaling (cycling) works for 5+ minute stories.
- [ ] Embedding/Narration are mocked correctly.
- [ ] E2E test passes.
