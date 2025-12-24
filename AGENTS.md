# raiden Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-23

## Active Technologies
- TypeScript, Node.js 20 LTS + Next.js App Router, React, Tailwind, shadcn/ui, Lucide; existing narration providers (Web Speech, Remote TTS, Polly) (001-playback-speed-control)
- In-browser state (session-scoped), no new backend storage (001-playback-speed-control)

- TypeScript (Next.js App Router, Node.js 20 LTS) + Next.js, React, Tailwind CSS, shadcn/ui, Lucide, Vercel AI SDK (001-read-aloud-highlighting)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript (Next.js App Router, Node.js 20 LTS): Follow standard conventions

## Recent Changes
- 001-playback-speed-control: Added TypeScript, Node.js 20 LTS + Next.js App Router, React, Tailwind, shadcn/ui, Lucide; existing narration providers (Web Speech, Remote TTS, Polly)
- 001-playback-speed-control: Verification must be done via Firefox DevTools MCP; add dev-only debug logging for speed/highlight flows when troubleshooting.

- 001-read-aloud-highlighting: Added TypeScript (Next.js App Router, Node.js 20 LTS) + Next.js, React, Tailwind CSS, shadcn/ui, Lucide, Vercel AI SDK

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
