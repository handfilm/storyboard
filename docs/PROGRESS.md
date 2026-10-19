# RAWx Storyboard Engine — Milestone Progress Tracker
**Lead Director & Creator:** Rakib Himon  
**Current Milestone:** Milestone 1 (Clean Layout, Design System, Registry, Self-Test) — COMPLETED  
**Active Work Branch:** `main`  

---

## Progress Checklist

### [x] MILESTONE 0 — AUDIT, PLAN, STABILITY
- [x] Codebase structure, data schemas, and runtime audit (`/docs/AUDIT.md`)
- [x] Comprehensive multi-milestone roadmap (`/docs/ROADMAP.md`)
- [x] Live progress checklist created (`/docs/PROGRESS.md`)
- [x] Typecheck (`tsc --noEmit`) passes with 0 errors
- [x] Unit test runner (`npm test`) configured and passes (6/6 tests passing)
- [x] Vite dev server verified clean on port 3000 (`/api/health` 200 OK)
- [x] Feature flags infrastructure initialized (`/src/core/featureFlags.ts`)
- [x] Baseline git repository initialized and clean

---

### [x] MILESTONE 1 — CLEAN LAYOUT, DESIGN SYSTEM, REGISTRY, SELF-TEST
- [x] CSS Grid shell: TopBar, LeftRail, MainWorkspace, RightInspector, Resizable BottomDock
- [x] Primary Workspace mode switcher: STAGE | BOARD | CUT (defaulting to STAGE on launch)
- [x] Verified non-overlapping layout at 1024, 1280, 1440, 1920, 2560px and 390px mobile
- [x] Virtualized auto-centering shot scrubber with "go to shot" input
- [x] Single overlay slot system preventing HUD telemetry collision
- [x] Design token system (black + gold palette, 8px grid, density settings, 5 themes)
- [x] Feature Registry with ID, commandId, shortcut, and diagnostics
- [x] Global Command Palette (Ctrl+K) and Shortcuts Cheat Sheet (Shift+/)
- [x] Self-Test Diagnostic panel with live health checks and Stress Test (1000 shots simulation)
- [x] Visual verification and screenshots saved in `/docs/screens/`

---

### [ ] MILESTONE 2 — DATA, SAVING, SAFETY
- [ ] Zod schema definitions with schemaVersion and automated migrations
- [ ] Write-ahead autosave (every 3 seconds and on key actions)
- [ ] Named and automated snapshots with visual diff and one-click restore
- [ ] Branching undo history with visual action tree
- [ ] Multi-project switcher, series/episode hierarchy, and 30-day trash bin
- [ ] Integrity check and database self-repair
- [ ] `.rawxvault` archive export/import with media manifest
- [ ] File System Access API optional auto-backup and reminder system

---

### [ ] MILESTONE 3 — STORY NOTEBOOK AND SCRIPT ENGINE
- [ ] Rich text bilingual notebook (Bangla + English) with scene markers and autosave
- [ ] Fountain script parser (Acts → Scenes → Shots with split/merge preview)
- [ ] Two-way linking between script text passages and storyboard shots
- [ ] Script ↔ Board split view
- [ ] Narrative beat templates (3-Act, Save the Cat, Kishōtenketsu, Documentary, Reel)
- [ ] Pacing rhythm graph
- [ ] Production entities database (Characters, Locations, Props with tags and image refs)

---

### [ ] MILESTONE 4 — MEDIA ENGINE FOR 1000+ FILES
- [ ] Multi-file and folder drag-and-drop ingest queue with progress/cancel/retry
- [ ] Web Worker chunked processing to guarantee 60fps main thread responsiveness
- [ ] Virtualized Media Bin with grid/list view and marquee multi-selection
- [ ] Automatic thumbnail generation (320px / 960px) with LRU memory cache
- [ ] Perceptual hash duplicate detection and EXIF extraction
- [ ] Intelligent story-to-media auto-matching (keywords + Gemini vision)
- [ ] Keyboard review queue (← reject, → accept, ↑ swap, ↓ skip)
- [ ] Take management (A/B/C) and used/unused asset filtering

---

### [ ] MILESTONE 5 — BOARD VIEWS AND SPEED EDITING
- [ ] 7 distinct board views toggled via keys 1–7 (Grid, Row sheet, Filmstrip, Corkboard, Kanban, Timeline, Outline)
- [ ] Comprehensive inline-editable shot cards (specs, movement, sound cues, Bengali title)
- [ ] Bulk editing toolbar with multi-select operations
- [ ] Quick-add bar (text lines, image clipboard, TSV/CSV import)
- [ ] Project-wide Find & Replace with regex and undo
- [ ] Virtualized rendering maintaining 60fps with 1000 shots

---

### [ ] MILESTONE 6 — SUPER TITLE AND CAPTION EDITOR
- [ ] Direct on-stage typography manipulation (click, drag, scale, rotate, snap to guides)
- [ ] Typographic layer hierarchy: Main Title, Subtitle, Lower-third, Dialogue, Chapter card, Watermark
- [ ] Enhanced Bengali script typography engine (Noto Serif Bengali, Hind Siliguri, Tiro Bangla)
- [ ] Style Studio with 30+ named presets and animation templates (kinetic, typewriter, glitch)
- [ ] SRT/VTT subtitle import and export with CPS timing validation
- [ ] Gemini writing assistant with diff preview (rewrite, translate BN↔EN↔JP, summarize)

---

### [ ] MILESTONE 7 — PLAYER, ANIMATIC, PRESENTATION, VAULT MODE
- [ ] Animatic playback engine with durations, Ken Burns motion paths, and audio sync
- [ ] Smart duration calculation (equalize, fit to soundtrack runtime)
- [ ] Specialized presentation modes: Pitch, Review, Live Table Read, Kiosk, Zen
- [ ] Dual-display synchronization via BroadcastChannel API
- [ ] Vault 100 Director's Mode: audio commentary, eye-line match cuts, Pulse Sync
- [ ] Hidden Frame 101 and directorial easter eggs

---

### [ ] MILESTONE 8 — CUT VIDEO EDITOR, PART A: CORE TIMELINE
- [ ] Third primary studio workspace: CUT (STAGE | BOARD | CUT)
- [ ] Source Monitor and Program Monitor with frame-accurate transport
- [ ] Multi-track timeline (V1–V4, A1–A4, T1–T2, ADJ, SUB, MARKERS)
- [ ] Editing toolset: Select (V), Razor (C), Split (S), Ripple Trim (B), Slip (Y), Slide (U)
- [ ] Timeline virtualization supporting 200+ clips with live audio waveforms

---

### [ ] MILESTONE 9 — CUT, PART B: CROP, TRANSFORM, REFRAME, KEYFRAMES
- [ ] Draggable crop tool on Program Monitor with aspect ratio presets
- [ ] Non-destructive transforms: Position, Scale, Rotation, Opacity
- [ ] Curve-based keyframe graph editor with easing lanes
- [ ] Smart Reframe: 16:9 → 9:16/1:1/4:5 utilizing eye-line focal coordinates
- [ ] Keyframeable alpha masking (rectangle, ellipse, polygon)

---

### [ ] MILESTONE 10 — CUT, PART C: SPEED, TRANSITIONS, EFFECTS, COMPOSITING
- [ ] Dynamic speed ramping (10%–1000%) with curve editor and frame blending
- [ ] 15+ WebGL2 transition shaders with customizable duration
- [ ] Clip effects stack (grain, vignette, chromatic aberration, CRT/VHS, halation, glow)
- [ ] Real-time chroma keying and luma keying with matte preview
- [ ] Picture-in-picture compositing presets and adjustment layers

---

### [ ] MILESTONE 11 — CUT, PART D: AUDIO AND SMART TOOLS
- [ ] Per-track mixer with live VU meters, EQ, compressor, and limiter
- [ ] Voiceover microphone recording with punch-in countdown
- [ ] Rhythm and beat detection with automatic snap-to-beat
- [ ] Automatic scene detection via worker frame histogram analysis
- [ ] Silence removal and AI auto-captioning generation

---

### [ ] MILESTONE 12 — CUT, PART E: STORYBOARD SYNC AND RENDER QUEUE
- [ ] Two-way live synchronization between Board shots and Timeline clips
- [ ] "Build edit from storyboard" and "Update board from edit"
- [ ] Multi-preset Render Queue (YouTube 4K/1080p, Reels 9:16, Cinema 2.39:1, GIF, PNG sequence)
- [ ] High-speed export using WebCodecs + mp4-muxer with MediaRecorder fallback
- [ ] Industry interchange export (EDL, OTIO, SRT/VTT, cut list CSV, Project ZIP)

---

### [ ] MILESTONE 13 — COLOR AND SCOPES
- [ ] WebGL2 color grading pipeline extending the 13 LUT filters
- [ ] Lift, Gamma, Gain, Offset, Tone Curves, and HSL Qualifier controls
- [ ] Real-time video scopes: Histogram, Waveform, Vectorscope, and RGB Parade
- [ ] 3D LUT (.cube) import and export

---

### [ ] MILESTONE 14 — SOUND DESIGNER
- [ ] 7-channel audio mixer (Drone, Heartbeat, Texture, Impact, Music, Voice, Master)
- [ ] Generative synthesizer with customizable sub-bass drone and rhythmic parameters
- [ ] Audio cue triggers mapped per shot and chapter

---

### [ ] MILESTONE 15 — CAMERA, PREVIS, PRODUCTION
- [ ] Sensor and lens simulator with depth of field and hyperfocal calculation
- [ ] 2D overhead blocking designer for stage direction and actor placement
- [ ] Three.js 3D previs stage with virtual focal length camera matching
- [ ] Production paperwork generation (Breakdown sheets, Call sheets, Day-out-of-days)

---

### [ ] MILESTONE 16 — REVIEW, COLLABORATION, AI LAYER 2.0
- [ ] Review portal with frame-accurate drawing annotations and threaded comments
- [ ] Branching cuts (Director's Cut, Client Cut, Social Cut) with shot cherry-picking
- [ ] Server-side Gemini AI assistant with command-level undo and tool-calling
- [ ] Prompt Lab for asset generation with prompt matrix exploration

---

### [ ] MILESTONE 17 — INTEROP, PLUGINS, QUALITY, DOCS
- [ ] Printable multi-shot PDF/HTML storyboard contact sheets
- [ ] Extensible Plugin Architecture (custom commands, panels, transitions)
- [ ] Vitest and Playwright automated end-to-end regression test suite
- [ ] Complete developer blueprints and user documentation
