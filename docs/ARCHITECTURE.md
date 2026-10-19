# RAWx Storyboard Engine — System Architecture & Technical Blueprint
**Document Version:** 1.0.0 (Milestone 0 Master Blueprint)  
**Date:** October 2026  
**System Class:** Cinematic Film Anthology & Real-Time Storyboard Studio  
**Runtime:** Node.js 22 + React 19 + TypeScript + Vite + Express  
**Aesthetic Identity:** Black & Gold Cinema (`#050505` bg, `#0B0B0B` surface, `#D4AF37` gold, `#EDEDED` text)

---

## 1. Executive Summary & Design Constitution

RAWx Storyboard Engine is a high-performance visual storytelling environment combining real-time optical emulation, multi-track sequence editing, bilingual Bengali + English typographic lockups, procedural sound synthesis, and an IndexedDB persistent vault.

### 1.1 Aesthetic & Typographic Identity
The engine strictly enforces a high-end cinematic visual language:
- **Color Palette**:
  - Pure Carbon Background: `#050505`
  - Deep Obsidian Surface: `#0B0B0B` / `#08080A`
  - Signature Arri Gold: `#D4AF37` (with `#FFE066` highlight)
  - Editorial Cinema Silver/White: `#EDEDED` / `#FFFFFF`
  - Telemetry Emerald (Secure Vault): `#34D399` / `#10B981`
- **Typography Matrix**:
  - **Bengali Editorial**: *Noto Serif Bengali*, *Anek Bangla*, *Hind Siliguri*, *Tiro Bangla*
  - **Cinematic Headings**: *Cinzel* (wide-tracked serif capitals)
  - **Technical Telemetry**: *JetBrains Mono* (monospaced HUD readouts)

### 1.2 Core Architectural Principles
1. **Extension, Never a Rewrite**: All existing features (STAGE/BOARD/CUT, LeftRail 11 modules, Component matrix 12/13, Pan Y, Liquify mesh warp, Fit modes, Guides, Capture Still, 100-frame Grid, Export/Git, IDB SYNCED, Loop, Pace, Filter/Lens presets, HUD optics, Audio, Fullscreen, Zen, Self-Test, Simple/PRO mode, Cmd+K search) remain preserved, stabilized, and upgraded.
2. **Hero Stage Primacy**: The `STAGE` view is and always remains the default home launch screen.
3. **Data Preservation & Safety Net**: Existing IndexedDB databases are never wiped. Demo data is generated strictly if the database is completely empty. Schema updates are forward-compatible with versioned migrations and explicit instant safety backups (`exportFullIdbBackup()`).
4. **Zero-API-Key Exposure**: All LLM and Gemini API calls are strictly handled server-side via Node/Express proxy routes; no API keys exist in client bundles.

---

## 2. Component Hierarchy & Workspace Layout

The application uses a responsive CSS Grid shell designed to prevent overlapping or clipping at any viewport width from 1024px to 2560px (with primary verification at 1280px and 1920px):

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TopBar (Height: 40px)                                                                   │
│ [Branding // RAWx] [Project Title ✎] [IDB SYNCED] [BACKUP IDB] [Undo/Redo]             │
│ [STAGE | BOARD | CUT] [COMPONENTS 12/13] [Theme] [PRO] [⌘K Search] [Self-Test] [Export]│
├──────────────┬──────────────────────────────────────────────────────────┬──────────────┤
│ LeftRail     │ MainWorkspace                                            │ Director     │
│ (w-14 / w-11)│ ├── STAGE: OpticalFrame (Letterboxed Cinema Viewport)     │ Inspector    │
│ • BOARD      │ │   ├── Base Media Layer (object-fit, pan Y 0-100%)      │ (Right       │
│ • CUT EDIT   │ │   ├── Orton Bloom Highlight Screen Blend               │ Drawer)      │
│ • STORY      │ │   ├── Anamorphic Radial Lens Falloff                   │ • Optics     │
│ • MEDIA      │ │   ├── 35mm Film Grain + Vignette Shaders               │ • Script/BN  │
│ • TITLES     │ │   ├── Rule-of-Thirds Grid & Center Crosshair           │ • Camera HUD │
│ • SOUND      │ │   ├── Bilingual Typography Lockup (Bangla + Cinzel)    │ • Media Swap │
│ • PLAYER     │ │   └── 4-Corner Telemetry HUD (Format, Node, Lens, DP)  │              │
│ • LIBRARY    │ ├── BOARD: GridView (100-Shot Contact Sheet)             │              │
│ • AI STUDIO  │ └── CUT: Multi-Track Video Timeline Editor               │              │
│ • EXPORT     │                                                          │              │
│ • SETTINGS   │                                                          │              │
├──────────────┴──────────────────────────────────────────────────────────┴──────────────┤
│ ControlDock (Bottom Dock)                                                              │
│ ├── 100-Frame Micro Timeline Scrubber with direct "Go to shot" input                   │
│ └── Transport Dock: [Play/Loop] [Pace] [Pan Y] [Warp] [Ratio] [LUT] [Guides] [Cam]... │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Modal & Overlay Subsystems
- **ComponentsMatrixPopover (`ComponentsMatrixPopover.tsx`)**: Granular toggle system for 13 distinct visual layers with presets (Director, Clean, Subtitles, DP, Minimal).
- **CanvasLiquifyModal (`CanvasLiquifyModal.tsx`)**: HTML5 Canvas2D mesh warping engine (Push, Bloat, Pinch, Restore, Wireframe, Undo).
- **CommandPalette (`CommandPalette.tsx`)**: Fuzzy-search quick launcher driven by the central `FeatureRegistry`.
- **ShortcutsModal (`ShortcutsModal.tsx`)**: Visual reference for all hotkeys (J/L, Space, F, G, V, W, P/Y, C, S, M, H, E, Esc).
- **SelfTestModal (`SelfTestModal.tsx`)**: Live diagnostic health monitor, Layout Doctor, and 1000-shot stress benchmark.
- **ThemeSettingsModal (`ThemeSettingsModal.tsx`)**: Studio density and custom color token customizer.
- **PublishModal (`PublishModal.tsx`)**: Git command generator, project README generator, JSON/CSV dataset export, and Full Database Safety Backup.

---

## 3. Data Models & Project Schema

### 3.1 Core State Representation
```typescript
interface AnthologyProject {
  title: string;
  director: string;
  nodeLocation: string;
  aspectRatio: AspectRatio; // '2.39:1' | '16:9' | '4:3' | '1:1' | '9:16'
  frames: AnthologyFrame[]; // 100 shots (epNumber 001-100)
  createdAt: string;
  version: string;
}

interface AnthologyFrame {
  id: number;
  epNumber: string;         // '001' to '100'
  title: string;            // English Cinzel title
  bengaliTitle: string;     // Poetic Bengali title
  tagline: string;          // English curatorial descriptor
  directorNotes: string;
  soundCue: string;
  cameraSpec: CameraSpec;   // focalLength, aperture, shutter, iso, sensor, format
  imageUrl?: string;
  colorAccent: string;
  hoverStyle: number;
  lutFilter: LutPreset;     // 13 cinematic presets
  aspectRatio: AspectRatio;
  adjustments: OpticalAdjustments; // brightness, contrast, saturation, bloom, grain, motionBlur, vignette
  tags: string[];
}
```

### 3.2 Target Unified Schema: `rawx-project.v1` (Scheduled for M2)
In Milestone 2, the persistence layer transitions to a versioned project schema:
- Top-level schema version: `schemaVersion: "rawx-project.v1"`.
- Scenes collection and Shot nodes referencing centralized media assets by hash/ID.
- Automated forward migration keeping legacy records intact.

---

## 4. Persistence & Safety Architecture

### 4.1 Multi-Tier Storage Topology
1. **IndexedDB Vault (`RAWxVault100_DB`, version 1)**:
   - Store `frames`: Keyed by shot index (0..99), records vertical pan, custom images, liquify status.
   - Store `settings`: Global studio preferences (aspect, pace, lut, lens, component visibility).
2. **LocalStorage Configuration Layer**:
   - `rawx_components_v1`: 12/13 active component visibility state.
   - `rawx_flags_v1`: Studio feature flag toggles.
   - `rawx_theme_settings_v1`: Active studio palette and UI density.
3. **Safety Net Backup Exporter (`/src/utils/backup.ts`)**:
   - Dumps every IndexedDB database and all object stores into a standalone, portable `.json` snapshot before schema changes.
   - Can be triggered anytime via TopBar `BACKUP IDB` or Publish Modal.
4. **Firebase Firestore Sync (`/src/utils/firebase.ts`)**:
   - Optional collaborative sync layer for multi-seat studio reviews (`storyboards/main` and user presence).

---

## 5. Optical, Shader, and Audio Emulation Engines

### 5.1 Real-Time Optical Pipeline
Rendering uses composite CSS hardware transformations and canvas filter layers:
1. **Base Layer**: Dynamic positioning via `background-position: center ${panOffsetPercent}%` and active LUT matrix.
2. **Orton Bloom Filter**: Blended via `mix-blend-screen` with `maskImage: radial-gradient(circle, black, transparent)`.
3. **Anamorphic Radial Falloff**: High-radius Gaussian blur with inverse radial mask simulating anamorphic edge softness.
4. **Procedural 35mm Grain**: SVG fractal noise (`<feTurbulence type="fractalNoise">`) with `mix-blend-mode: overlay`.
5. **Cinema Vignette**: High-falloff radial darkening.

### 5.2 Procedural Web Audio Synthesizer
Zero-dependency analog sound synthesis:
- **Sub-Bass Drone**: 43.65Hz sawtooth oscillator coupled with a 65.71Hz sine harmonic (subtle 0.3Hz beating) routed into a 140Hz lowpass filter with Q=3.5.
- **Warm Analog Tape Hiss**: Procedurally synthesized pink-tinted noise buffer looped continuously.
- **Mechanical Shutter Click**: 800Hz-to-120Hz rapid pitch exponential decay transient triggering on frame advances.

---

## 6. Server & Gemini AI Proxy Layer

The full-stack Express server (`server.ts`) runs on `0.0.0.0:3000`:
- **Development**: Hosts Vite middleware (`createViteServer({ server: { middlewareMode: true } })`).
- **Production**: Serves compiled `dist/` with SPA fallback.
- **Proxy Endpoints**:
  - `POST /api/tts`: Gemini 3.8 Flash generating cinematic voiceover SSML directives and cadence.
  - `POST /api/omni-video`: Gemini 3.8 Flash calculating in/out edit points, color grades, and motion vectors for 10-second sequences.
  - `GET /api/config`: Safe client configuration injector.
  - `GET /api/health`: Server uptime check.

---

## 7. Audit Findings & Known Issues (M0 Baseline)

### 7.1 Current Build Status
- **TypeScript Compiler (`tsc --noEmit`)**: Passes with 0 errors.
- **Production Build (`vite build`)**: Compiles cleanly with output assets in `dist/`.
- **Automated Unit Tests (`npm test`)**: 12/12 test suites passing (interval scaling, LUT filters, search filters, stats, markdown generator, CSV export, feature flags, feature registry, stress benchmark, component visibility, theme manager, and safety net backup).
- **Server Health**: Verified running on `http://0.0.0.0:3000/api/health` (200 OK).

### 7.2 The 2 Console Errors Identified
1. **AudioContext Autoplay Warning / Error**:
   - *Cause*: `AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page.` In WebKit and Chromium browsers, constructing or resuming an `AudioContext` before the user interacts with the DOM triggers an unhandled browser warning/error.
   - *Status & Resolution*: Handled in M1 by ensuring `audioEngine.init()` only creates or resumes the `AudioContext` inside an explicit user interaction event handler (e.g. clicking the unmute button, pressing M, or starting playback).
2. **Firestore Unauthenticated Access / Network Exception**:
   - *Cause*: `src/utils/firebase.ts` initializes Firebase with Firestore database `ai-studio-rawxstoryboarden-3d03b1c6-ee31-4d49-8d70-ec3e556b8a08`. When running inside sandboxed preview iframes where external Firestore websockets or auth tokens are unauthenticated or restricted by security rules, unhandled network rejections or permission errors occur in the console.
   - *Status & Resolution*: Handled in M1 by adding graceful connection guards and error boundaries around Firebase client initialization so network restrictions fail silently without polluting the console.

### 7.3 Identified UI Glitches Scheduled for M1
- Mode tabs render without spacing as "STAGEBOARDCUT" in `TopBar.tsx`.
- Timecode formatting requires explicit `HH:MM:SS:FF` validation separate from aspect ratio chips.
- Frame scrubber chips 001-100 are cramped with 2px gap causing active chip border collision.
- Topbar navigation overflows below 1400px cutting off EXPORT / GIT.
- Pace text in bottom transport bar wraps into 3 lines.
