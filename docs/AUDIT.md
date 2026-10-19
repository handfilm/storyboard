# RAWx Storyboard Engine — Technical Audit & System Map
**Version:** 5.0-alpha (Baseline Audit)  
**Date:** October 2026  
**Director / Creator:** Rakib Himon (`rakib.himon@gmail.com`)  
**Archival Node:** DHAKA_01  

---

## 1. Executive Summary & File Map

The application is a cinematic film anthology and storyboard studio engineered for high-impact visual storytelling. It provides a 100-frame macro-cinematography sequence with multi-layer optical emulation, anamorphic lens Depth of Field aperture simulation, bilingual Bengali + English typographic lockups, procedural sound synthesis, an HTML5 canvas Liquify & Mesh Warp editor, and an IndexedDB persistent vault.

### File Map

```text
/
├── index.html                   # High-performance cinematic stage engine (4,034 lines)
├── server.ts                    # Express + Vite dev server + Gemini AI endpoints (147 lines)
├── vite.config.ts               # Vite configuration with allowedHosts, HMR, and port 3000
├── tsconfig.json                # TypeScript ES2022 / React-JSX compiler options
├── package.json                 # Node.js dependencies, test, lint, and build scripts
├── metadata.json                # AI Studio application metadata and permissions
├── firebase-applet-config.json  # Firebase client credentials
├── firebase-blueprint.json      # Firestore data blueprint schema
├── firestore.rules              # Firestore security access control rules
├── CNAME                        # Domain: storyboard.handsandhead.com
├── .env.example                 # Environment variables specification
├── public/
│   ├── .nojekyll                # GitHub Pages bypass for Jekyll
│   ├── CNAME                    # Mirror custom domain
│   └── assets/README.md         # Permanent asset ingestion guidelines
├── src/
│   ├── main.tsx                 # React DOM mount entrypoint
│   ├── App.tsx                  # React master stage & controller
│   ├── index.css                # Global Tailwind CSS & cinema effects
│   ├── types/
│   │   └── anthology.ts         # TypeScript data structures (Frame, Project, Specs)
│   ├── data/
│   │   └── frames.ts            # 100 base episode themes, curated cinema presets
│   ├── utils/
│   │   ├── audioEngine.ts       # Web Audio synthesizer (drone & shutter)
│   │   ├── engine.ts            # Interval calculations, LUT filters, stats, CSV
│   │   ├── engine.test.ts       # Node:test unit tests for engine utilities
│   │   └── firebase.ts          # Firebase Auth, Firestore real-time sync & presence
│   └── components/
│       ├── OpticalFrame.tsx     # Single frame viewport with multi-layer optics
│       ├── ControlDock.tsx      # Bottom HUD transport and micro scrubber
│       ├── DirectorInspector.tsx# Sidebar drawer for optical grading & camera parameters
│       ├── GridView.tsx         # 100-frame contact sheet grid
│       └── PublishModal.tsx     # Git export, JSON, and Markdown generation suite
└── docs/
    ├── AUDIT.md                 # System architecture, schemas, and hotspots (this file)
    ├── ROADMAP.md               # Master 18-milestone roadmap
    └── PROGRESS.md              # Live milestone execution tracker
```

---

## 2. Architecture & State Management

### 2.1 Dual Layer Architecture
1. **Host Server (`server.ts`)**:
   - Node 22 + Express full-stack backend running on `0.0.0.0:3000`.
   - Mounts Vite middlewares in development mode; serves static `dist/` in production.
   - Provides `/api/health` server check, `/api/config` safe Firebase client bootstrap.
   - Provides server-side Gemini 3.8 Flash hooks:
     - `/api/tts`: SSML-compatible voiceover directive and pacing notes.
     - `/api/omni-video`: 10-second sequence video editing and motion vector decisions.

2. **Frontend Layer**:
   - Highly optimized, GPU-accelerated rendering utilizing hardware CSS transforms and WebGL/Canvas2D shaders.
   - Zero-dependency DOM core in `index.html` combined with modular React components in `src/`.
   - Procedural Web Audio engine producing 36Hz–43.65Hz sub-bass drones and mechanical shutter clicks without external audio files.

### 2.2 Global State Representation
- **Frame Media State**: Array of 100 media records `{ url, isVideo }`.
- **Pan Offsets**: Vertical alignment values `framePanOffsets[0..99]` (0% to 100%, 50% default).
- **Component Visibility Matrix**:
  - `titlesAll`, `titleBn`, `titleEn`, `caption`, `badge`, `tagline`
  - `hudData`, `reticles`, `guides`
  - `grain`, `vignette`, `bloom`, `lensBlur`
- **Optics State**: Active LUT filter (`cinematic`, `bleach`, `noir`, etc.), Active Lens (`50mm f/1.4`, `100mm f/2.8 Macro`, `Anamorphic 2x`, etc.), Fit Mode (`cover` / `contain`).

---

## 3. Persistence Schema

### 3.1 IndexedDB (`RAWxVault100_DB`, version 1)
- **Object Store `frames`** (Key: `id` numeric):
  ```typescript
  interface StoredFrame {
    id: number;           // 0 to 99
    panY: number;         // 0 to 100 (50 default)
    mediaData?: string;   // data URL or asset path
    isVideo?: boolean;    // boolean flag
    liquifyApplied?: boolean;
    updatedAt: number;    // epoch timestamp
  }
  ```
- **Object Store `settings`** (Key: `key` string, e.g., `'director_vault_config'`):
  ```typescript
  interface StoredSettings {
    key: string;
    lut: string;
    lens: string;
    aspect: string;
    pace: number;
    visibility: ComponentVisibility;
    fitMode: 'cover' | 'contain';
    updatedAt: number;
  }
  ```

### 3.2 LocalStorage Fallback
- Key `rawx_components_v1`: Stores serialized visibility preferences.

### 3.3 Firebase Firestore (Optional Real-time Layer)
- Collection `storyboards/main`: Shared project state, 100 frames, active filter/lens.
- Collection `presence/{userId}`: Active user presence, cursor frame index, last seen.
- Collection `users/{userId}`: Role-based permissions (Director / Crew).

---

## 4. Preserved Features Checklist

All of the following core capabilities must remain functional across all milestones:
1. **Stage View**: Default launch home with full-bleed media and gold reticles.
2. **Component Matrix**: 12/13 switchable elements with presets (Director, Clean, Subtitles, DP, Minimal).
3. **Interactive Vertical Pan (Y/P)**: Drag/touch vertical offset with 50% double-click reset.
4. **HTML5 Canvas Liquify Studio (W)**: Push, Bloat, Pinch, Restore, Brush radius/strength, Undo, Wireframe.
5. **Fit Mode Switcher**: Crop middle vs Contain all.
6. **Framing Guides (C)**: Rule of thirds grid and center crosshair.
7. **4K Still Capture**: Instant high-res PNG export with embedded Bengali/English title overlays.
8. **100-Frame Contact Sheet Grid (G)**: 100-card thumbnail navigator with quick jump.
9. **Export / Git Suite**: Project JSON downloader, README.md generator, Git commit guide.
10. **IndexedDB Vault**: Auto-saving with green "IDB SYNCED" indicator.
11. **Autoplay Loop & Pace Slider**: 0.25x to 3.0x speed scaling with dynamic video playback sync.
12. **Aspect Ratio**: 16:9, 2.39:1 Cinemascope, 4:3, 4:5, 1:1, 9:16.
13. **13 LUT Presets**: RAWx Cinema 35, Bleach Bypass, Technicolor, Neo-Noir, Cyberpunk, FLIR, etc.
14. **9 Lens Presets**: 14mm f/11 ultra-wide to 200mm f/2.8 super-tele and anamorphic flare.
15. **Procedural Web Audio**: Synthesized sub-drone and tactile shutter transients.
16. **Fullscreen & Zen Mode (Z)**: Ultra-clean distraction-free immersion.
17. **Prominent Bengali Title**: Pulsing gold typography and poetic Bengali narrative caption.
18. **HUD Corner Readouts**: Format RAW 14-BIT ARRI, Node DHAKA_01, Secure Archive, Focal/DOF telemetry.
19. **Credit Line**: "A RAWx Storyboard // Director: Rakib Himon".

---

## 5. Known Bugs & Performance Hotspots

1. **Dual Codebase Sync**: The repository previously had both a standalone `index.html` single-page implementation and an initial React scaffolding in `src/`. The application must consolidate into a coherent architecture where `index.html` and `src/` work seamlessly together without breaking any preserved visual features.
2. **Video Concurrency & Memory**: Having 100 video elements in the DOM can exhaust hardware decoding pipelines on mobile devices. The engine already smartly pauses inactive videos; this should be further reinforced with an LRU object-URL lifecycle.
3. **Canvas Liquify Memory**: High-resolution image manipulation on canvas requires large typed arrays (`Uint8ClampedArray`). The undo stack should be limited to 15 entries to prevent out-of-memory errors on mobile web.
4. **Iframe Sandbox Constraints**: `window.alert` and `window.confirm` are blocked in sandboxed preview environments. All modals must use custom in-app dialogs with safe fallbacks.
5. **Feature Flagging**: Expanding the engine into an editing suite requires isolated feature flags so unfinished experimental modules never degrade the rock-solid Stage experience.
