# Contracts: Playback Speed Control

This feature is frontend-only. Speed selection and persistence are handled in-browser; no new backend endpoints are required. Narration providers are invoked as follows:

- **Web Speech**: runtime `speechSynthesis` rate changes.
- **Remote/Polly providers**: prefer runtime playback-rate change on existing audio; re-synthesize only if provider cannot honor rate changes.

If a backend contract is added later (e.g., to cache pre-rendered speeds), update this folder with an OpenAPI file.
