# Multi-Camera Live Switching & Precision Shorts Engine

Enterprise-grade in-browser multi-camera ingestion, automatic audio waveform synchronization, real-time live angle punch-in switching, and precision 9:16 Shorts export within the HANDFILM studio suite.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The core operational modes were selected during Phase 1 clarification:
> - **Angle Synchronization**: Automatic audio waveform cross-correlation via the Web Audio API with visual sub-frame manual offset fine-tuning.
> - **Live Switching Workflow**: Real-time punch-in switching during continuous playback using keyboard triggers (`1`–`9`), recording instant cut events with full undo/redo history.
> - **Default Monitor Layout**: Vertical 9:16 Shorts quad-split grid with bright broadcast tally borders and angle identification tags.

- **Confirmed Decision 1**: Multi-selection of 2–16 clips in Media Vault (`Shift+Click`, `Cmd/Ctrl+Click`) launches the Multi-Cam Grouping Modal with instant audio waveform sync analysis.
- **Confirmed Decision 2**: Live punch-in switching streams audio from an elected "Master Audio Track" while dynamically switching the active video source at playhead time without video glitches or audio dropouts.
- **Confirmed Decision 3**: Export pipeline composites cut events via WebCodecs / Canvas and muxes into an enterprise-ready 9:16 Short (1080x1920 @ 60fps).

---

### 1. Overview & Core Concept

- **What It Does**: Autonomous creators can ingest multiple camera angles of the same scene, interview, music performance, or podcast, synchronize them via audio waveform correlation, monitor all angles simultaneously in a synchronized 9:16 quad-split grid, and cut between cameras in real-time by pressing number keys (`1` through `9`) as the timeline plays.
- **Target Audience / Persona**: Solo creators, mobile filmmakers, video editors, and short-form storytellers producing vertical Shorts, TikToks, and Reels from multi-angle setups.
- **Key Value**: Replaces tedious manual multi-track cutting with dynamic, live broadcast-style switching inside the browser with zero external software requirements.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Vault Ingestion & Grouping*: In `MediaBinDrawer`, creator holds `Shift` or `Cmd/Ctrl` to select 2 to 16 ingested clips. An amber-accented action bar appears displaying `[ 🎥 Create Multi-Camera Clip (N Selected) ]`.
  2. *Sync & Configuration Matrix*: The Multi-Cam Grouping modal (`MultiCamBinMenu`) opens, displaying angle cards, duration mismatches, audio waveform peaks, and one-click `[ Auto-Sync via Audio Waveform ]` with fine microsecond sliders.
  3. *Live Switching Stage*: Creator opens the `MultiCamGridMonitor`, presenting a 2x2 or 3x3 quad-split monitor in 9:16 aspect ratio. The active camera has a glowing amber broadcast tally border (`border-2 border-amber-500 shadow-[0_0_15px_rgba(245,166,35,0.4)]`).
  4. *Punch-in Switching*: Pressing spacebar plays all angles in lockstep. Pressing keys `1`–`9` immediately commits a cut event at the current playhead time, switching the program preview instantly.
  5. *Timeline Representation*: In `CutStudio`, a specialized `MultiCamTimelineTrack` displays colored angle segments with split indicators, allowing drag-scrubbing, segment trimming, and angle re-assignment.
  6. *Export & Commit*: The composite short is rendered through the WebCodecs pipeline into the project's media vault.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Dark cinematic broadcast console matching the obsidian and golden amber HANDFILM palette.
  - *Color Distribution*: 60% obsidian canvas (`#08090C`, `#0C0D12`), 30% structural panels with subtle hairline dividers (`border-white/10`), 10% golden amber accents (`#F5A623`) for active tallies and primary actions.
  - *Typography*: Clean sans headers (`Plus Jakarta Sans`), high-density body prose (`Public Sans`), and monospace tabular numerals (`font-mono tabular-nums`) for timecodes and frame counts.
  - *Zero-Pill Restraint*: Camera tags (`CAM 01`, `CAM 02`) rendered with crisp typographic dividers and unboxed timecodes.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Audio Waveform Correlation Engine**:
  - *Chosen Approach*: Extract low-sample audio data using offline `AudioContext`, compute normalized cross-correlation across 100ms sliding windows, and derive peak alignment offsets (`syncOffsetMs`).
  - *Why*: Eliminates the need for external timecode hardware or manual clapping alignment while remaining 100% client-side and privacy-preserving.
  - *Alternatives Considered*: Manual-only offset was rejected as too tedious for 4+ cameras; relying on recording start time is unreliable across varied devices.

- **Decision 2: Master Audio Track Election with Continuous Playback**:
  - *Chosen Approach*: Creator designates one angle as the master audio feed (or a dedicated studio mic track). During live switching, the video switches while master audio remains uninterrupted.
  - *Why*: Switching audio tracks on video cuts produces jarring audio transients, clicks, and phase shifts. A continuous master audio track ensures professional broadcast continuity.

- **Decision 3: Real-Time Virtual Switching Matrix with Non-Destructive Cut List**:
  - *Chosen Approach*: Maintain an ordered sequence of cut points: `{ timeMs: number, angleIndex: number }[]`. Angle switching updates the matrix without modifying original media blobs.
  - *Why*: Provides non-destructive editing, instant undo (`Cmd+Z`), and re-cutting without duplicate file copies or RAM bloat.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HANDFILM STUDIO APP                             │
│                                                                        │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │    MediaBinDrawer     │             │    MultiCamBinMenu Modal   │  │
│  │  Multi-Select (2-16)  │────────────▶│  Angle Labels & Sync HUD   │  │
│  │  [Create Multi-Cam]   │             │  Audio Cross-Correlation   │  │
│  └───────────────────────┘             └─────────────┬──────────────┘  │
│                                                      │                 │
│                                                      ▼                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    multiCamSyncEngine.ts                         │  │
│  │  - Web Audio API OfflineContext (Peak Cross-Correlation)         │  │
│  │  - Sync Offset Calculation (syncOffsetMs per angle)              │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    MultiCamGridMonitor                           │  │
│  │  - Vertical 9:16 Quad-Split Screen Grid (2x2 / 3x3)              │  │
│  │  - Hardware Synchronized Video Decoders / HTML5 Elements         │  │
│  │  - Active Broadcast Tally Border (Amber Glow)                    │  │
│  │  - Keyboard Switch Listener (Keys 1–9) with Undo/Redo            │  │
│  └──────────────────┬───────────────────────────────┬───────────────┘  │
│                     │                               │                  │
│                     ▼                               ▼                  │
│  ┌──────────────────────────────────────┐  ┌────────────────────────┐  │
│  │       MultiCamTimelineTrack          │  │ multiCamRenderPipeline │  │
│  │  - Angle Segment Visualization       │  │ - 9:16 Shorts Renderer │  │
│  │  - Interactive Cut Points & Trim     │  │ - WebCodecs / Canvas   │  │
│  │  - Drag Scrubbing & Timecode Flags   │  │ - IndexedDB Vault Save │  │
│  └──────────────────────────────────────┘  └────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Core Data Entities

```typescript
export interface MultiCamAngle {
  id: string;
  mediaId: string;
  label: string; // e.g. "CAM 01", "CAM 02", "CAM 03"
  blobUrl: string;
  aspectRatio: number;
  syncOffsetMs: number; // Audio/timecode waveform offset
  volume?: number;
  isMuted?: boolean;
}

export interface MultiCamCutEvent {
  id: string;
  timeMs: number;
  angleIndex: number;
}

export interface MultiCamGroup {
  id: string;
  name: string;
  angles: MultiCamAngle[];
  durationMs: number;
  masterAudioAngleIndex: number;
  activeAngleIndex: number;
  cutEvents: MultiCamCutEvent[];
  aspectRatio: '9:16' | '16:9' | '1:1';
}
```

#### Interactive State & Lifecycle Flow
- **Multi-Selection**: `MediaBinDrawer` tracks `selectedMediaIds: Set<string>`. When count >= 2, the contextual bottom bar enables `[ 🎥 Create Multi-Camera Clip ]`.
- **Sync Correlation**: `multiCamSyncEngine` decodes audio channels into `Float32Array`, runs sliding-window cross-correlation against the reference angle (Angle 0), and computes offsets in milliseconds.
- **Playback Synchronization**: The master playhead drives slave video elements using `requestAnimationFrame`, accounting for `syncOffsetMs` and maintaining sub-frame alignment.
- **Key Switching**: Keystrokes (`1`–`9`) append `{ id, timeMs, angleIndex }` cut events and switch the program tally immediately. Undo (`Cmd+Z`) pops the last cut.
- **Render Output**: `multiCamRenderPipeline` steps through cut intervals, draws the active angle's frame to an offscreen `OffscreenCanvas` (1080x1920), captures the master audio stream, and produces an enterprise-ready MP4/WebM file saved directly to IndexedDB.
