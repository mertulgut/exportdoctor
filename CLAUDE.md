# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Export Doctor is a Tauri v2 desktop app that analyzes video files against social media/broadcast platform specs using ffprobe. 100% local — video files never leave the machine, only the file path is passed to ffprobe.

## Commands

```bash
npm install              # Install frontend dependencies
npm run tauri dev        # Dev mode with hot reload (starts Vite + Rust backend)
npm run tauri build      # Production build → .dmg/.app in src-tauri/target/release/bundle/
npm run build            # Frontend-only build (tsc + vite)
npm run dev              # Frontend-only dev server (no Tauri backend)
```

Rust backend builds automatically via Tauri. First Rust compile takes 2-5 minutes; subsequent builds are incremental.

## Architecture

**Two-layer app: Rust backend + React frontend, connected via Tauri IPC (`invoke`).**

### Rust Backend (`src-tauri/src/`)
- `lib.rs` — All Tauri commands: `analyze_video`, `check_ffprobe`, plus license commands. Runs ffprobe (sidecar → direct binary → system PATH fallback chain), parses JSON output into `ExtendedMetadata` struct.
- `license.rs` — License management commands (get_license_status, validate_license_online, start_checkout, activate_license, open_manage_portal, deactivate_license). Uses `tauri-plugin-store` for persistence.
- `main.rs` — Entry point, calls `export_doctor_lib::run()`.

### React Frontend (`src/`)
- `App.tsx` — Main orchestrator. Manages 4-phase flow: upload → pick (preset selection) → loading → results. Holds the `EVALUATORS` registry mapping platform IDs to evaluator functions.
- `src/lib/rules/evaluate.ts` — **Core business logic.** Pure TypeScript functions that evaluate video metadata against platform specs. 10 evaluators: IG Reels, IG Post, IG Story, TikTok, YouTube, YouTube Shorts, Cinema/Netflix, MXF PAL, MXF NTSC, DCP. Each returns `PerfectResult` with `verdict` ("PERFECT"/"FLAWED") and detailed `checks` array.
- `src/lib/rules/platformSpecs.ts` — Target export spec data for each platform.
- `src/lib/license.ts` — `useLicense()` hook for subscription state management via Tauri IPC.
- `src/lib/types.ts` — Shared TypeScript types (`FieldCheck`, `PerfectResult`, `ExtendedMetadata`).

### License Worker (`license-worker/`)
- Cloudflare Worker handling Stripe subscription: `/checkout`, `/validate`, `/webhook`, `/manage`.
- Uses Cloudflare KV (`LICENSES`) for license storage.
- Deploy with Wrangler: `cd license-worker && npx wrangler deploy`.

### Key Data Flow
1. User drops/picks video file → path string sent to Rust via `invoke('analyze_video')`
2. Rust runs ffprobe on the path, parses output → returns `ExtendedMetadata` to frontend
3. Frontend runs selected evaluators (pure functions, instant) → displays results as platform cards

### Important Patterns
- `ExtendedMetadata` is defined in both Rust (`lib.rs`, `#[serde(rename_all = "camelCase")]`) and TypeScript (`evaluate.ts`). Keep them in sync.
- ffprobe resolution: sidecar binary (`src-tauri/binaries/ffprobe-{target-triple}`) → direct binary next to exe → system PATH.
- `tauri.conf.json` has `"externalBin": ["ffprobe"]` for sidecar bundling.
- Evaluators use `normalizeCodec()` and `normalizeContainer()` helpers for consistent string matching.
- Tailwind CSS v4 with `@tailwindcss/vite` plugin. Path aliases via `@/` → `./src/`.

## Tech Stack
- **Tauri v2** (Rust backend), **React 19**, **Vite**, **Tailwind CSS v4**, **TypeScript**
- Tauri plugins: shell, dialog, clipboard-manager, fs, updater, process, store, opener
- Auto-updater configured with GitHub releases endpoint
