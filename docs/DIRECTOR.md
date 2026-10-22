# RAWx Storyboard Engine — Director Pre-Production Master Blueprint
**Document:** `/docs/DIRECTOR.md`  
**Milestone:** D0 — Baseline Audit & System Blueprint  
**Status:** D0 COMPLETED  
**Lead Director & Architect:** RAWx Cinema Engineering  

---

## 1. Vision & Core Philosophy

The **RAWx Storyboard Engine** is built from the ground up as a production-grade pre-production workspace for independent and cinematic film directors. It bridges the gap between literary screenplay conception and physical set execution through:
1. **Dual Playback Engines**: A tactile cinematic stage slider with slide hold pacing alongside an uncompromising, full-screen Cinema Player with true media duration, timecode, autohiding HUD, and Document Picture-in-Picture.
2. **Script to Shot List**: Non-destructive Fountain ingestion with bilingual Bengali + English rendering, scene segmentation, and live two-way script-to-shot change tracking.
3. **Deep Director Metadata**: Standardized film coverage telemetry (shot sizes, angles, camera moves, optical mm, aperture, lighting, VFX flags, character bindings).
4. **Non-Destructive Annotation & Blocking**: Vector markup layers directly on frames with stylus pressure support, plus 2D overhead camera blocking with real lens FOV cones.
5. **Sound & Animatic**: Multi-channel audio mixer with waveforms, tap-tempo beat timing, and director scratch voiceover.
6. **Industry Deliverables**: Clean CMX3600 EDL, OpenTimelineIO (OTIO), Final Cut Pro XML, and printable PDF storyboard contact sheets.
7. **Offline-First Resilience**: Full IndexedDB vault persistence, self-contained single-file portable review packages, and zero secrets in client distribution.

---

## 2. Visual & Brand Identity Standards (Immutable)

To preserve the tactile cinema heritage of RAWx, the following constraints are strictly enforced:
- **Base Palette**:
  - Background: `#050505` (Deep Cinematic Obsidian)
  - Surface: `#0B0B0B` (Graphite Matte)
  - Accent / Reticle Gold: `#D4AF37` (Warm 24K Vintage Gold)
  - Primary Text: `#EDEDED` (Neutral 92% Silver)
  - *Prohibited*: `#fbbf24`, `#050508`, or arbitrary neon colors outside telemetry statuses.
- **Typography**:
  - Bengali: `Noto Serif Bengali`, `Noto Sans Bengali`, `Hind Siliguri`, `Tiro Bangla`.
  - English: Existing wide-tracked serif and monospace (`JetBrains Mono`).
- **Layout Presence**:
  - The cinematic **STAGE** remains the permanent launch home.
  - Three top-level modes: `STAGE` | `BOARD` | `CUT`.
  - Non-destructive evolution: No features or controls are removed except the deliberate elimination of `-1F/+1F` buttons from the primary stage transport bar (available as a toggled Components option with `,` and `.` keyboard shortcuts).
  - Simple Mode gracefully collapses advanced optical telemetry for distraction-free directing.

---

## 3. Milestone Audit (D0 to D11)

| Milestone | Title | Status | Existing Capabilities & Assets | Missing Deliverables / Next Steps |
|---|---|---|---|---|
| **D0** | **AUDIT & SAFETY** | **IMPLEMENTED** | Full audit completed, zero client API keys verified, tests (27/27) pass, `DIRECTOR.md` published. | Awaiting user "continue" to proceed to D1. |
| **D1** | **DUAL PLAYBACK ENGINES** | **PARTIAL** | Stage transport, `TactileStage.tsx`, `OpticalMonitor.tsx`, `NetflixCinemaPlayer.tsx` prototype, timecode calculator. | Fullscreen via player container, 2.5s HUD autohide, Document PiP + standard PiP honesty warning, clean click (<5px) detection vs Pan Y, remove -1F/+1F from main transport bar, Components toggle for frame-step, unified Key Scope Manager. |
| **D2** | **SCRIPT TO SHOTS** | **PARTIAL** | `src/data/fountainIO.ts` with scene heading, dialogue, action, and Bengali scene marker parsing; unit tests passing. | Story tool import modal with diff summary preview, creating draft shots as new non-destructive items, two-way line linking, "script changed" badges. |
| **D3** | **DIRECTOR SHOT FIELDS** | **PARTIAL** | `src/types/projectSchema.ts` shot properties, `DirectorInspector.tsx` optical controls. | Dedicated "DIRECTOR" drawer section with all 14 coverage fields (size, angle, move, mm, T-stop, rig, chars, loc, INT/EXT, day/night, VFX, notes, status, hold), board sort/filter, bulk edit, export mapping. |
| **D4** | **ANNOTATION LAYER** | **MISSING** | Raster liquify modal (`CanvasLiquifyModal.tsx`), bloom shaders. | Vector drawing canvas per shot (pen, arrow, rectangle, ellipse, text, motion arrow, eraser, gold/white/red, stylus pressure, undo/redo, cinema overlay toggle). |
| **D5** | **CAMERA & BLOCKING DIAGRAM** | **MISSING** | 3D previs prototype (`src/features/previs/PrevisStudio.tsx`). | 2D top-down overhead blocking per scene with camera FOV cone based on focal length and sensor format, actors, props, lights, path vectors, PNG/SVG/PDF export. |
| **D6** | **ANIMATIC WITH AUDIO** | **PARTIAL** | `AnimaticPlayerModal.tsx`, `WaveformCanvas.tsx`, `audioEngine.ts`, DSP synthesizer. | Microphone scratch VO with permission fallback, tap-tempo beat syncing, real duration animatic calculation with scene runtime breakdown, autoplay block notification. |
| **D7** | **DOCUMENT OUTPUTS** | **PARTIAL** | CSV shot list exporter (`exportToCSVShotList` in `src/data/hollywoodExporters.ts`). | Multi-frame PDF storyboard generator (2/4/6 frames/page), embedded Bengali font, black-on-white print mode vs gold cinema mode, schedule one-liner. |
| **D8** | **EDITING HANDOFF** | **PARTIAL** | CMX3600 EDL, OTIO JSON, FCPXML, and SRT exporters in `src/data/hollywoodExporters.ts` and `src/services/exportXml.ts`. | Validation warnings for unmapped timeline assets, unified editing handoff modal with export integrity check. |
| **D9** | **SHARE AND REVIEW** | **PARTIAL** | JSON project vault export, safety-net backup downloader, `ReviewStudio.tsx` scaffold. | Self-contained single-file portable offline HTML review player, timecode-pinned reviewer comments exportable to JSON, optional Firebase live share toggle (default OFF). |
| **D10** | **TABLET, MOBILE, OFFLINE (PWA)** | **PARTIAL** | IndexedDB storage vault, quota usage monitor, storage persistence request (`src/core/storage.ts`). | Service worker caching, Web App Manifest, tablet swipe/pinch navigation on Stage, browser capability fallback matrix in Self-Test. |
| **D11** | **SECURITY, BACKUP, DEPLOY** | **PARTIAL** | Verified zero client API keys in bundle, server-side Gemini proxy in `server.ts`, `.env.example` created, `.github/workflows/deploy.yml`. | Automatic periodic backup reminder (JSON/ZIP every N edits), one-click restore, `/docs/DEPLOY.md` production guide, automated CI smoke test suite. |

---

## 4. Security, Secrets & Client Bundle Audit

A rigorous audit of source code and compiled static production artifacts was performed:
1. **Client Bundle Scan (`dist/assets/*.js`)**:
   - Grep for `AIzaSy*`, Google API keys, and sensitive tokens returned **zero matches**.
   - Client bundle is completely free of hardcoded API keys.
2. **Server-Side Proxy Architecture (`server.ts`)**:
   - All Gemini AI capabilities (`/api/tts`, `/api/omni-video`) are executed exclusively on the server using `process.env.GEMINI_API_KEY`.
   - Client-side code (`src/utils/flowAi.ts`) contains safe fallbacks when operating in standalone mode.
3. **Environment Specifications (`/.env.example`)**:
   - `FIREBASE_API_KEY=`
   - `VITE_GOOGLE_CLIENT_ID=`
   - `GEMINI_API_KEY=`
   - No credentials or secrets are checked into git or hardcoded into the source tree.

---

## 5. Build, Lint & Test Health Report

- **Build (`npm run build`)**:  
  Compiled with Vite in `1.16s`. Production bundle generated in `dist/` and mirrored to `assets/` and `docs/` for multiple target deployment strategies.
- **Lint / Typecheck (`npm run lint` -> `tsc --noEmit`)**:  
  Completed with **0 errors, 0 warnings**.
- **Unit Test Suite (`npm test`)**:  
  All **27 test suites passed** with zero failures:
  - Timecode calculation (HH:MM:SS:FF)
  - Color LUT filters & CSS transformations
  - Project schema v1 validation and safe migrations
  - Safety Net IndexedDB backup generation
  - Fountain screenplay parsing (bilingual Bengali + English)
  - Hollywood industry exporters (EDL, OTIO, CSV)
  - AES-GCM project vault encryption/decryption roundtrip
  - 1000-shot stress benchmark under memory budget
  - State corruption resilience and safe default restoration

---

## 6. Next Step: Execution Plan for Milestone D1

Upon the director's command (`continue`), the engine will begin **D1 (DUAL PLAYBACK ENGINES)**:
1. **Stage Slider Refinement**:
   - Implement shot "Slide Hold" timing (default 12.0s, project-level, overridable per shot in drawer).
   - Seamless media looping within slide hold; subclip In-Out range enforcement.
   - Clean removal of `-1F/+1F` buttons from the main transport strip with new Components menu toggle option "Frame-step buttons" (default OFF) and preserved `,` / `.` keyboard stepping.
   - Stage click handler: Open Cinema Player ONLY on clean click (<5px pointer displacement, no drag, no active tool like Pan Y or Liquify).
2. **Dedicated Fullscreen Cinema Player**:
   - Container-level fullscreen preserving titles, LUT, grain, and vignette.
   - Real media duration, SMPTE timecode readout, and remaining time calculation.
   - Autohiding HUD (fades after 2.5s of playback, stays open when paused or focused).
   - Standard PiP warning message alongside Document Picture-in-Picture where supported.
3. **Unified Key Scope Manager**:
   - Layer-prioritized keyboard routing (Stage vs Cinema vs Trimmer) with input/dialog suppression and `?` cheat sheet overlay.
4. **Automated Verification**:
   - Integration tests, Self-Test diagnostic addition, and `/docs/PROGRESS.md` update.
