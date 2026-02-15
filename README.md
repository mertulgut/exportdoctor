# Export Doctor

A cross-platform desktop application that analyzes video export files against social media platform requirements. 100% local — your video files never leave your machine.

## Supported Platforms

| Platform | Strictness | Description |
|----------|-----------|-------------|
| Instagram Reels | Very Strict | "No transcode" target — exact specs required |
| TikTok | Moderate | Flexible codec/resolution requirements |
| YouTube Shorts | Moderate | Vertical 9:16, up to 60 seconds |
| YouTube | Flexible | Accepts most formats and codecs |
| Cinema / Netflix | Professional | Broadcast-grade delivery specs |

## Features

- **Drag & drop** or file picker to select video files
- **Instant analysis** via local ffprobe (no internet required)
- **All platforms at once** — see compliance for every platform in one view
- **Detailed compliance checks** with pass/fail for each parameter
- **Actionable recommendations** — what to change and how
- **Export reports** — Copy JSON, save as TXT or JSON file
- **Target specs** — see the ideal export settings for each platform

## Prerequisites

### Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Node.js
Node.js 18+ required. Install from [nodejs.org](https://nodejs.org/) or:
```bash
brew install node
```

### ffprobe
Export Doctor needs `ffprobe` to analyze video files. Options:

**Option A — System install (recommended):**
```bash
# macOS
brew install ffmpeg

# Windows (via Chocolatey)
choco install ffmpeg

# Windows (via Scoop)
scoop install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

**Option B — Bundled sidecar:**
1. Download ffprobe from [ffmpeg.org](https://ffmpeg.org/download.html)
2. Find your target triple: `rustc --print host-tuple`
3. Place the binary in `src-tauri/binaries/`:
   - macOS Apple Silicon: `ffprobe-aarch64-apple-darwin`
   - macOS Intel: `ffprobe-x86_64-apple-darwin`
   - Windows: `ffprobe-x86_64-pc-windows-msvc.exe`
   - Linux: `ffprobe-x86_64-unknown-linux-gnu`
4. Make it executable: `chmod +x src-tauri/binaries/ffprobe-*`

## Setup

```bash
# Clone or navigate to the project
cd export-doctor

# Install dependencies
npm install

# Development mode (hot reload)
npm run tauri dev

# Production build
npm run tauri build
```

## Build Output

After `npm run tauri build`:

| Platform | Output | Location |
|----------|--------|----------|
| macOS | `.dmg` installer | `src-tauri/target/release/bundle/dmg/` |
| macOS | `.app` bundle | `src-tauri/target/release/bundle/macos/` |
| Windows | `.msi` installer | `src-tauri/target/release/bundle/msi/` |
| Windows | `.exe` (NSIS) | `src-tauri/target/release/bundle/nsis/` |
| Linux | `.deb` package | `src-tauri/target/release/bundle/deb/` |
| Linux | `.AppImage` | `src-tauri/target/release/bundle/appimage/` |

> **Note:** Cross-compilation is not supported. Build on the target OS.

## Architecture

```
export-doctor/
├── src/                          # React frontend
│   ├── App.tsx                   # Main orchestrator
│   ├── App.css                   # Global styles + animations
│   ├── lib/
│   │   ├── types.ts              # Shared TypeScript types
│   │   └── rules/
│   │       ├── evaluate.ts       # Platform evaluators (5 platforms)
│   │       └── platformSpecs.ts  # Target export specs
│   └── components/
│       ├── FileDropZone.tsx      # Tauri native file picker + drag-drop
│       ├── PlatformCard.tsx      # Collapsible per-platform result
│       ├── ExportButtons.tsx     # Copy JSON / Save TXT / Save JSON
│       ├── MetadataGrid.tsx      # Technical metadata display
│       ├── ScoreGauge.tsx        # SVG circular score gauge
│       ├── ComplianceChecks.tsx  # Pass/fail check list
│       ├── Recommendations.tsx   # Fix suggestions
│       ├── PlatformSpecs.tsx     # Ideal export spec display
│       ├── AnalysisProgress.tsx  # Loading animation
│       └── FfprobeStatus.tsx     # ffprobe missing warning
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs              # Entry point
│   │   └── lib.rs               # Tauri commands (analyze_video, check_ffprobe)
│   ├── Cargo.toml               # Rust dependencies
│   ├── tauri.conf.json          # Tauri configuration
│   ├── capabilities/
│   │   └── default.json         # Security permissions
│   └── binaries/                # ffprobe sidecar binaries (optional)
└── package.json
```

### How It Works

1. User drops a video file or picks one via native dialog
2. The file path (string) is sent to the Rust backend via `invoke('analyze_video')`
3. Rust runs `ffprobe` (sidecar or system) on the file path — **no file copying or uploading**
4. ffprobe JSON output is parsed into `ExtendedMetadata` struct
5. Metadata is returned to the frontend
6. TypeScript evaluators run **all 5 platform checks** simultaneously (pure functions, instant)
7. Results displayed as collapsible platform cards with detailed compliance info

### Key Design Decisions

- **Evaluators stay in TypeScript** — they're pure functions with zero I/O, no need to rewrite in Rust
- **File path only** — the video file is never read into memory, only its path is passed to ffprobe
- **Sidecar + fallback** — tries bundled ffprobe first, falls back to system PATH
- **Multi-platform simultaneous** — all platforms analyzed at once (evaluators run in microseconds)

## Troubleshooting

### "ffprobe not found"
Install ffmpeg (`brew install ffmpeg`) or place the ffprobe binary in `src-tauri/binaries/` with the correct platform suffix.

### Rust compilation errors
Ensure Rust is up to date: `rustup update`

### Port 1420 in use
Kill the process using port 1420, or set a different port in `vite.config.ts`.

### Build fails on first run
First Rust compilation can take 2-5 minutes. Subsequent builds are much faster.

## Tech Stack

- **Tauri v2** — Rust-based desktop framework
- **React 19** — UI library
- **Vite** — Frontend bundler
- **Tailwind CSS v4** — Styling
- **TypeScript** — Type-safe frontend
- **Rust** — Backend (ffprobe execution, metadata extraction)
