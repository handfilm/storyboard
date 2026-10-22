# RAWx Storyboard Engine — Master Progress Tracker
**Project:** RAWx Storyboard Engine  
**Aesthetic:** Black & Gold Cinema (`#050505` bg, `#0B0B0B` surface, `#D4AF37` gold, `#EDEDED` text)  
**Current Protocol:** Director Pre-Production Roadmap (D0 – D11)  
**Current Milestone:** D0 (AUDIT & REPO VERIFICATION) — COMPLETED  
**Git Tag:** `d0`  

---

## Director Pre-Production Roadmap (D0 – D11)

### [x] D0 — AUDIT & REPO VERIFICATION
- **Status:** COMPLETED
- **Git Tag:** `d0`
- **Audit Findings**:
  - [x] Read `PROGRESS.md`, codebase structure, and confirmed no prior `implementation_plan.md` existed.
  - [x] Full build status: `npm run build` succeeds (1.16s), `tsc --noEmit` 0 errors.
  - [x] Test suite: 27/27 unit tests pass across all suites (`npm test`).
  - [x] Security audit: Zero API keys present in client bundle or source trees. Server-side proxy active in `server.ts`.
  - [x] Master director blueprint compiled and saved at `/docs/DIRECTOR.md`.
  - [x] Status of milestones D1–D11 evaluated and documented in IMPLEMENTED / PARTIAL / MISSING matrix.

### [ ] D1 — DUAL PLAYBACK ENGINES (STAGE SLIDER & CINEMA PLAYER)
- **Status:** PENDING (Next up on "continue")
- **Target Git Tag:** `d1`

### [ ] D2 — SCRIPT TO SHOTS (FOUNTAIN IMPORT & CHANGE TRACKING)
- **Status:** PENDING
- **Target Git Tag:** `d2`

### [ ] D3 — DIRECTOR SHOT FIELDS (14 COVERAGE ATTRIBUTES)
- **Status:** PENDING
- **Target Git Tag:** `d3`

### [ ] D4 — ANNOTATION LAYER (VECTOR DRAWING & STYLUS)
- **Status:** PENDING
- **Target Git Tag:** `d4`

### [ ] D5 — CAMERA AND BLOCKING DIAGRAM (2D OVERHEAD & FOV CONE)
- **Status:** PENDING
- **Target Git Tag:** `d5`

### [ ] D6 — ANIMATIC WITH AUDIO (SCRATCH VO & TAP TIMING)
- **Status:** PENDING
- **Target Git Tag:** `d6`

### [ ] D7 — DOCUMENT OUTPUTS (PDF STORYBOARDS & PRINT STYLES)
- **Status:** PENDING
- **Target Git Tag:** `d7`

### [ ] D8 — EDITING HANDOFF (EDL, OTIO, FCPXML & INTEGRITY CHECK)
- **Status:** PENDING
- **Target Git Tag:** `d8`

### [ ] D9 — SHARE AND REVIEW (OFFLINE HTML BUNDLE & COMMENTS)
- **Status:** PENDING
- **Target Git Tag:** `d9`

### [ ] D10 — TABLET, MOBILE, OFFLINE (PWA & DEVICE LIMITS)
- **Status:** PENDING
- **Target Git Tag:** `d10`

### [ ] D11 — SECURITY, BACKUP, DEPLOY (CI SMOKE & PRODUCTION GUIDE)
- **Status:** PENDING
- **Target Git Tag:** `d11`

---

## Milestone Execution Checklist (M0 – M14)

### [x] M0 — AUDIT + SAFETY NET
- **Status:** COMPLETED
- **Git Tag:** `m0`
- **Deliverables**:
  - [x] Full codebase audit and file mapping (`/docs/AUDIT.md`)
  - [x] System Architecture & Technical Blueprint (`/docs/ARCHITECTURE.md`)
  - [x] Live Progress Tracker for M0–M14 (`/docs/PROGRESS.md`)
  - [x] Full build status reported (`tsc --noEmit` 0 errors, `vite build` clean, 12/12 unit tests passing)
  - [x] Both browser console errors identified, diagnosed, and documented
  - [x] Safety Net: "Export full backup" button added in TopBar and PublishModal (`exportFullIdbBackup()`), downloading all IndexedDB databases and local storage as a single portable JSON file
  - [x] Git repository initialized, baseline committed, and tagged `m0`

---

### [x] M1 — BUG FIXES (KNOWN, VISIBLE)
- **Status:** COMPLETED
- **Git Tag:** `m1`
- **Deliverables**:
  - [x] Mode tabs spacing: Spaced `gap-1.5 p-1` container in `TopBar.tsx` with distinct active states, completely eliminating glued "STAGEBOARDCUT"
  - [x] Timecode display: SMPTE format `HH:MM:SS:FF` (`src/utils/timecode.ts`, 24fps default, configurable) with dedicated unit tests, completely isolated from aspect ratio chips
  - [x] Frame chips 001–100: Enforced 6px gaps (`gap-[6px]`), locked active chip to `scale-100` with ring highlight to never overlap neighbours, smooth horizontal scrolling with centering on active frame
  - [x] TopBar responsive layout: Secondary controls collapse into a clean "More" dropdown below 1400px; EXPORT / GIT button protected from clipping; full project title shown on hover tooltip
  - [x] Pace slider label: Wrapped in `whitespace-nowrap shrink-0 flex-nowrap` to guarantee single-line display across all viewports
  - [x] Console errors resolved: AudioContext creation/resumption guarded behind user gesture; Firestore client wrapped in try-catch with graceful offline fallback
  - [x] Self-Test panel updated with M1 diagnostic checks (green status)
  - [x] Build and test verified (13/13 tests pass, 0 compile errors)

---

### [x] M2 — PERSISTENCE CORE (SAVE AND STORE)
- **Status:** COMPLETED
- **Git Tag:** `m2`
- **Deliverables**:
  - [x] Single versioned project schema: `rawx-project.v1` (`src/types/projectSchema.ts`) covering meta, scenes, shots (id, number, titles bn/en, subtitle, sound cue, HUD fields, duration, transition, move, lens, filter, panY, mediaId), media references, settings, and timeline
  - [x] IndexedDB layer (`src/core/storage.ts`) with forward-compatible migrations (`RAWxVault100_DB v2`), preserving legacy stores, with debounced autosave (800ms)
  - [x] Visible save states: `SAVING...` (amber pulse), `SAVED` (emerald pulse), `SAVE ERROR` (red alert) in TopBar and responsive More menu
  - [x] Transactional writes, load-time corruption detection, and automatic fallback recovery from snapshots
  - [x] Persistent storage request (`navigator.storage.persist`), real-time storage quota usage monitor, and 80% capacity warning banner
  - [x] Crash recovery system: clean exit heartbeat tracker offering one-click "Restore last session" on abnormal browser termination (`src/components/CrashRecoveryBanner.tsx`)
  - [x] Multi-project manager modal (`src/components/ProjectManagerModal.tsx`): create, switch, rename, duplicate, and delete projects with a 10-second undo window
  - [x] Self-Test panel updated with M2 diagnostic checks (6 new tests, green status)
  - [x] Unit tests verified (14/14 tests pass, 0 compile errors)

---

### [ ] M3 — UNDO/REDO + SNAPSHOTS
- **Status:** PENDING
- **Target Git Tag:** `m3`
- **Scope**:
  - [ ] Command-based undo/redo (Ctrl+Z / Ctrl+Shift+Z) covering shot edits, titles, reorder, media, pan, filters
  - [ ] 200-step history persisted across browser reload
  - [ ] Named and automated snapshots (every 10 minutes while editing, keep last 20)
  - [ ] Snapshot comparison summary and non-destructive restore as a new branch

---

### [ ] M4 — MEDIA INGEST (1000+ FILES)
- **Status:** PENDING
- **Target Git Tag:** `m4`
- **Scope**:
  - [ ] Batch media import (images, video, audio) via button, drag-and-drop, and folder picker
  - [ ] Web Worker batch processing to prevent UI freezing; progress bar, cancel, error reporting
  - [ ] IndexedDB / OPFS blob storage with automatic thumbnail generation and perceptual hash deduplication
  - [ ] Natural filename auto-matching to shots; extra assets to Media Bin
  - [ ] Drag-and-drop asset reassignment onto frame chips without overwriting manual assignments
  - [ ] Media library panel with search, filter, grid/list modes, and usage warnings

---

### [ ] M5 — HERO STAGE UPGRADE
- **Status:** PENDING
- **Target Git Tag:** `m5`
- **Scope**:
  - [ ] Full-bleed active media (`object-fit: cover`) with procedural film grain fallback placeholder
  - [ ] Signature gold frame: 1px gold at 60% opacity inset 24px with 3px L-shaped corner brackets
  - [ ] Rule-of-thirds dashed gold guide grid (25% opacity) with persistent toggle (key G, default ON)
  - [ ] Readability enhancements: soft vignette + bottom gradient
  - [ ] Centered title stack: small gold "EP 001 // Bangla", wide-tracked serif English title, subtitle, sound-cue pill
  - [ ] Interactive vertical pan: drag vertically with `PAN Y: 50% RESET` badge
  - [ ] 4-corner HUD telemetry (Format, Node/Status, Lens/DOF, Credit/Director)

---

### [ ] M6 — STAGE ANIMATION
- **Status:** PENDING
- **Target Git Tag:** `m6`
- **Scope**:
  - [ ] Ken Burns motion (100% -> 112% drift) driven by shot Move directives (PAN, PUSH-IN, PULL-OUT, TILT)
  - [ ] Staggered title reveals under 1.2s: Bangla gold glow fade-up, English tracking-in, subtitle/pill delay 150ms
  - [ ] Transition support: DISSOLVE crossfade (default 400ms), CUT instant, WIPE gold line
  - [ ] Ambient FX: subtle film grain, corner bracket pulse on shot change, subtle gold scanning line
  - [ ] Animation toggle & Reduce Motion option respecting `prefers-reduced-motion`
  - [ ] Maintain 30fps+ with 100 shots; auto-pause on hidden tab; loop and pace sync

---

### [ ] M7 — SHOT, TITLE AND CAPTION EDITOR
- **Status:** PENDING
- **Target Git Tag:** `m7`
- **Scope**:
  - [ ] In-place shot field editor drawer with live Stage preview (titles, subtitle, cue, HUD, duration, lens, filter)
  - [ ] Bilingual typography engine with proper Bengali shaping and font picker (Noto Serif, Hind Siliguri, Tiro)
  - [ ] Title styles and templates; SRT subtitle import/export
  - [ ] Bulk editing for multi-shot selections, drag reordering, duplicate, delete with undo

---

### [ ] M8 — IMPORT / EXPORT / GIT
- **Status:** PENDING
- **Target Git Tag:** `m8`
- **Scope**:
  - [ ] `rawx-project.v1` JSON export/import with validation, diff preview, and import as new project
  - [ ] ZIP export containing media assets; File System Access API integration with download fallback
  - [ ] Production exports: PNG poster, PDF contact sheet, CSV, OTIO, EDL
  - [ ] Real WebM video render via MediaRecorder with MP4 fallback message
  - [ ] Export/Git suite generating clean commit-ready structure and README without secrets

---

### [ ] M9 — CUT EDITOR CORE
- **Status:** PENDING
- **Target Git Tag:** `m9`
- **Scope**:
  - [ ] Multi-track timeline (V1, V2, A1, A2) with zoom, snapping, and frame-accurate playhead
  - [ ] Editing tools: Split at playhead (S), Trim, Ripple Delete, clip dragging
  - [ ] Clip thumbnails and Program Monitor preview synced to playhead
  - [ ] Auto-population of timeline from Storyboard; autosaved and undoable

---

### [ ] M10 — CUT TOOLS
- **Status:** PENDING
- **Target Git Tag:** `m10`
- **Scope**:
  - [ ] Crop/Transform/Reframe tool (16:9, 9:16, 1:1, 2.39:1) with keyframes
  - [ ] Speed ramps (0.1x to 8x)
  - [ ] Transitions (cut, dissolve, wipe, match-cut)
  - [ ] Per-clip color/effects stack and Bengali title overlays

---

### [ ] M11 — AUDIO + SMART TOOLS
- **Status:** PENDING
- **Target Git Tag:** `m11`
- **Scope**:
  - [ ] Multi-track audio mixer with waveforms, volume, fade in/out, mute/solo
  - [ ] Scene detection and silence detection with honest browser fallbacks
  - [ ] Voiceover and automated SRT captions

---

### [ ] M12 — TWO-WAY SYNC
- **Status:** PENDING
- **Target Git Tag:** `m12`
- **Scope**:
  - [ ] Bidirectional live sync between Storyboard cards and Timeline clips
  - [ ] Duration, reorder, and deletion updates reflected seamlessly in both views
  - [ ] Conflict-safe transactional undo/redo

---

### [ ] M13 — QUALITY ASSURANCE & POLISH
- **Status:** PENDING
- **Target Git Tag:** `m13`
- **Scope**:
  - [ ] Self-Test panel with green/amber/red status indicators for every feature
  - [ ] Layout Doctor checking 1280px and 1920px viewports for clipping and collision
  - [ ] Automated Playwright smoke tests for core workflows
  - [ ] Accessibility audit: focus rings, keyboard navigation, aria-labels
  - [ ] Virtualization performance pass: 60fps scrolling across 1000 items, lazy thumbnails
  - [ ] Bilingual English / Bengali UI language toggle

---

### [ ] M14 — SECURITY + DEPLOYMENT
- **Status:** PENDING
- **Target Git Tag:** `m14`
- **Scope**:
  - [ ] Audit bundle to verify zero client-side API keys or secrets
  - [ ] Server-side proxy for all Gemini calls with keys stored in environment secrets
  - [ ] `.env.example` and `.gitignore` auditing
  - [ ] GitHub Actions CI workflow (install, typecheck, lint, test, build)
  - [ ] Complete production deployment guide in `/docs/DEPLOY.md`
