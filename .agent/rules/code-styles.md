---
trigger: always_on
---

# Core Development Rules

1. **Validation First**: 
   - Always validate changes using built-in mechanisms (e.g., TypeScript checks, linting, tests) before confirming a task.
   - Do not assume code works; verify it explicitly.

2. **No Hacks / Anti-Patterns**:
   - Avoid temporary fixes or "hacky" solutions.
   - If a proper fix requires more time or refactoring, prioritize the proper fix or at least document the debt clearly.

3. **Extensibility & Abstraction**:
   - Think long-term. Design for future changes.
   - Use abstractions (interfaces/adapters) instead of concrete implementations for services that might change (e.g., TTS providers, AI providers, Analytics).
   - Example: Instead of hardcoding `PollyTTS`, use `TTSProvider` interface so providers can be swapped easily.
