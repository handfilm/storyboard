# RAWx Storyboard Engine — System Roadmap (Milestones 0–17)
**Version:** 5.0  
**Status:** In Progress (Milestone 0 Completed)  
**Lead Engineer & Designer:** Assistant on behalf of Rakib Himon  

---

## Architectural Principles
1. **The Stage is Hero**: The cinematic Stage remains the primary default home on every launch.
2. **Never Break Working Code**: Existing frames, media, titles, IndexedDB records, and optical presets are preserved 100%.
3. **Module Isolation**: Every new capability lives in `/src/features/*`, `/src/services/*`, or `/src/ui/*`.
4. **Size Discipline**: Keep source files under ~400 lines through clean modular composition.
5. **No Dead Buttons**: Every feature registers in the Feature Registry and includes self-tests.
6. **Graceful Fallbacks**: When hardware or external APIs (WebCodecs, Gemini AI, Web Audio) are unavailable, the engine gracefully degrades to working browser fallbacks.

---

## Milestone Breakdown

### Milestone 0: Audit, Plan, Stability [CURRENT]
- [x] Comprehensive codebase audit (`/docs/AUDIT.md`).
- [x] Full architecture roadmap (`/docs/ROADMAP.md`).
- [x] Progress tracking checklist (`/docs/PROGRESS.md`).
- [x] Feature flags configuration (`/src/core/featureFlags.ts`).
- [x] Typecheck (`tsc --noEmit`), test runner, and zero build warnings verified.

### Milestone 1: Clean Layout, Design System, Registry, Self-Test
- Unified CSS Grid Shell with TopBar, Collapsible LeftRail, MainWorkspace, RightInspector, Resizable BottomDock.
- Three primary modes: STAGE | BOARD | CUT (defaulting always to STAGE).
- Responsive breakpoint preservation: 390px mobile, 1024px, 1280px, 1440px, 1920px, 2560px.
- Central Feature Registry with Command Palette (Ctrl+K), Shortcut Cheatsheet (Shift+/), and Diagnostic Self-Test.

### Milestone 2: Data, Saving, Safety
- Zod schema validation with automatic migrations across schema versions.
- Write-ahead autosave (every 3 seconds), named & automated snapshots with visual diff.
- Branching undo/redo tree, trash bin (30 days), and crash recovery.
- `.rawxvault` export/import archive format and manifest generator.

### Milestone 3: Story Notebook and Script Engine
- Rich text bilingual notebook (Bangla + English) with scene markers and Fountain parser.
- Two-way linking between script passages and storyboard frames.
- Beat templates (3-Act, Save the Cat, Kishōtenketsu, Documentary, Reel).
- Characters, locations, and props database with reference imagery.

### Milestone 4: Media Engine for 1000+ Files
- Ingest queue with Web Worker chunking and progress/cancel/retry.
- Virtualized media bin with thumbnail caching (320px/960px).
- Perceptual hash duplicate detection, aspect ratio categorization, and EXIF extraction.
- Intelligent auto-matching between story beats and uploaded assets.

### Milestone 5: Board Views and Speed Editing
- 7 Board view modes (Grid, Row Sheet, Filmstrip, Corkboard, Kanban, Timeline, Outline).
- Inline editable shot cards with keyboard-first navigation.
- Bulk editing toolbar, multi-card dragging, and project-wide Find & Replace with regex.
- Guaranteed 60fps virtualization for up to 1000 shots.

### Milestone 6: Super Title and Caption Editor
- Interactive on-stage typography transformation (drag, scale, rotate, snap to guides).
- Enhanced bilingual engine (Noto Serif Bengali, Hind Siliguri, Tiro Bangla).
- Style Studio with 30+ cinematic presets and animation templates (kinetic, typewriter, glitch).
- SRT/VTT caption import/export with character-per-second (CPS) pacing warnings.

### Milestone 7: Player, Animatic, Presentation, Vault Mode
- Multi-speed animatic player with Ken Burns paths and sound synchronization.
- Presentation modes: Pitch, Review, Live Table Read, Kiosk, and Zen.
- Dual-window synchronization via BroadcastChannel for external displays.
- Extended Vault 100 experience with Director's commentary and match-cut eye tracking.

### Milestone 8: CUT Video Editor — Part A: Core Multi-Track Timeline
- Third core workspace mode: CUT.
- Frame-accurate video playback via `requestVideoFrameCallback` / WebCodecs.
- Multi-track timeline (Video V1–V4, Audio A1–A4, Text T1–T2, Adjustment layers).
- Professional editing tools: Select (V), Razor (C), Split (S), Ripple Trim (B), Slip (Y), Slide (U).

### Milestone 9: CUT — Part B: Crop, Transform, Reframe, Keyframes
- Interactive on-monitor crop tool with thirds and safe-area overlays.
- Transform controls (position, scale, rotation, anchor, opacity).
- Curve-based keyframe graph editor with easing presets.
- Smart Reframe: 16:9 to 9:16/1:1 based on eye-line and saliency focal points.

### Milestone 10: CUT — Part C: Speed, Transitions, Effects, Compositing
- Dynamic speed ramping (10% to 1000%) with curve editor and frame blending.
- 15+ cinematic transition shaders (cut, dissolve, whip, glitch, film burn, luma wipe).
- Reorderable clip effects stack (grain, vignette, chromatic aberration, CRT/VHS, halation).
- Chroma key and luma key with live matte preview.

### Milestone 11: CUT — Part D: Audio and Smart Tools
- Track mixer with interactive VU meters, EQ, compressor, and limiter.
- Beat detection, tap-tempo, and auto-snap cuts to rhythm.
- Automatic scene detection via worker frame histogram analysis.
- Silence removal and speech-to-text automated caption generation.

### Milestone 12: CUT — Part E: Storyboard Sync and Render Queue
- Two-way live synchronization between Board shots and Timeline clips.
- "Build edit from storyboard" and "Update board from edit".
- Export queue with presets (YouTube 4K, Reels 9:16, Cinema 2.39:1, GIF, PNG sequence).
- High-performance MP4/WebM rendering via WebCodecs + mp4-muxer with MediaRecorder fallback.

### Milestone 13: Color and Scopes
- WebGL2 color grading pipeline extending the 13 LUT filters.
- Lift, gamma, gain, offset, curves, and HSL qualifiers.
- Real-time video scopes: Histogram, Waveform, Vectorscope, and RGB Parade.
- `.cube` LUT import and export.

### Milestone 14: Sound Designer
- Multi-channel audio mixer (Drone, Heartbeat, Texture, Impact, Music, Voice, Master).
- Procedural generative audio engine with customizable synth parameters.
- Built-in voiceover microphone recorder with punch-in countdown.

### Milestone 15: Camera, Previs, Production
- Camera sensor and lens simulator with hyperfocal and depth of field calculations.
- 2D overhead blocking designer for stage direction, actors, and lights.
- Three.js 3D previs stage with virtual camera matching lens focal length.
- Production paperwork: Scene breakdown sheets, call sheets, and budget estimator (BDT/USD/JPY/EUR).

### Milestone 16: Review, Collaboration, AI Layer 2.0
- Review portal with frame-pinned drawing annotations and threaded discussions.
- Branching project versions (Director's Cut, Client Cut, Social Teaser).
- Server-side Gemini AI Studio Assistant with diff preview and undoable actions.
- Multimodal prompt generation matrix for shot generation.

### Milestone 17: Interop, Plugins, Quality, Documentation
- Multi-layout printable PDF/HTML storyboard contact sheets.
- Extensible Plugin API (commands, panels, exporters, transitions).
- Vitest and Playwright end-to-end regression suites.
- Full architectural and user documentation.
