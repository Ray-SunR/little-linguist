# Quickstart: Playback Speed Control

## Prerequisites
- Node.js 20 LTS
- npm

## Run
```bash
npm install
npm run dev
```

## Verify speed control
1. Open the reader page on mobile-sized viewport.
2. Start playback and change speed between presets (0.75x, 1.0x, 1.25x, 1.5x).
3. Confirm audio rate changes within ~1s and highlighting stays in order with no jumps.
4. Pause, change speed, resume; confirm resumed playback uses the new speed.
5. Refresh page; confirm last speed in session is preselected; default is 1.0x when no prior choice.
6. Trigger a provider that cannot honor runtime speed (if available) and confirm it falls back to 1.0x with a gentle inline note.
7. Confirm loading/error states appear for speed changes and respect reduced-motion preferences.
