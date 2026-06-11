# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server (hot reload)
npm run build      # TypeScript check + Vite production build
npm run test       # Vitest (once)
npm run test:watch # Vitest watch
npm run coverage   # Coverage report (thresholds enforced on src/core/**)
npm run lint       # ESLint
npx vitest run src/core/spin-engine.test.ts   # Run single test file
```

## Architecture

WHIRL is a single-page PWA — a spin-the-wheel decision game with no backend. All data is local (`localStorage` via Zustand `persist`).

### `src/core/` — Pure logic (zero DOM, 100% unit-tested)
- **`spin-engine.ts`** — FSM (`idle → accelerating → cruising → decelerating → landed → celebrating → idle`), physics easing curves (`easeInQuad`, `easeOutQuart`), and `planSpin()` which implements *result-first* design: the winner is picked by weight immediately on spin start, then the total rotation angle is back-calculated so the animation lands exactly on the winner. `frameAt(plan, tMs)` gives the wheel angle at any elapsed time.
- **`probability.ts`** — `mulberry32` seeded PRNG + `pickWeightedIndex`. Inject `rng` from `mulberry32(seed)` for reproducible results in tests.
- **`share-codec.ts`** — `encodeShare/decodeShare`: compact tuple JSON → lz-string → Base64URL hash. Versioned (`v:1`) with strict validation on decode.
- **`palette.ts`** — `generatePalette(n)`: HSL color wheel with alternating lightness so adjacent sectors always contrast. `readableTextColor(hex)` uses WCAG luminance to pick black or white label text.

### `src/stores/` — Zustand state
- **`wheelStore`** — all wheel configs (multiple wheels), CRUD for sectors, `getActiveWheel()` helper. Persisted.
- **`sessionStore`** — ephemeral spin state: current `SpinState`, `currentAngle`, `pendingResult`. Not persisted.
- **`historyStore`** — spin records (max 500). Persisted.
- **`prefsStore`** — theme, font, language, volumes, reducedMotion. Persisted. Theme is applied via `data-theme` attribute on `<html>`.

### `src/components/`
- **`wheel/WheelSvg.tsx`** — SVG wheel. Sectors are `<path>` elements computed from polar coordinates. Text is `rotate()`-transformed along the sector midpoint radius. `rotation` prop drives `transform: rotate()` directly (no React re-render during animation — the rAF loop calls `setAngle` in `sessionStore`).
- **`wheel/WheelContainer.tsx`** — orchestrates the spin rAF loop. Calls `planSpin()` once on spin start, then drives `frameAt()` each frame. Handles all FSM transitions, tick sounds, pointer kicks, confetti trigger, and the result modal.
- **`effects/CanvasLayer.tsx`** — fixed full-screen canvas with its own rAF loop (independent of React). Renders: background floating particles (speed scales with spin phase), confetti burst on `celebrating`, and pointer trail. Respects `reducedMotion` by rendering `null`.
- **`editor/`** — `EditorPanel` (title input, template loader, sector list with `SectorRow`, exclude-mode toggle). `TEMPLATES.ts` has 8 preset wheel configs.
- **`settings/`** — `SettingsPanel` (theme/language/font/volume chips/sliders), `SharePanel` (build URL from `encodeShare`, copy/Web Share API), `HistoryPanel` (distribution bar chart + recent records list).

### `src/audio/audioEngine.ts`
Singleton `AudioEngine` backed by Web Audio API. Two gain nodes: `bgmGain` / `sfxGain` for independent volume. All sounds are synthesized (no audio files). BGM is a looping pentatonic arpeggio. Call `audioEngine.unlock()` on first user gesture to resume `AudioContext`.

### Theming
CSS Variables in `src/themes/themes.css` under `[data-theme="neon|candy|dark|minimal"]`. Theme changes only swap the attribute — no React re-render. Font switching writes directly to the `--font-body` CSS variable.

### i18n
`src/i18n/index.ts` lazy-loads locale JSONs via dynamic import. Three locales: `en-US`, `zh-CN`, `ja-JP`. Call `changeLanguage(lang)` to switch at runtime — adds the resource bundle if not already loaded.

## Key constraints
- **TypeScript strict** with `noUncheckedIndexedAccess` — array accesses like `arr[i]` are typed `T | undefined`.
- No `any`. ESLint enforces this.
- `src/core/` must stay DOM-free and ≥100% line/statement/function coverage (branch threshold 98% to accommodate one structurally-unreachable guard).
- The spin animation must never use CSS `transition` — `WheelContainer` drives angle via rAF + `setAngle` so the physics curve is fully controlled.
- All effects must check `prefers-reduced-motion` (via `usePrefsStore().reducedMotion` which merges the OS setting with a manual override).
