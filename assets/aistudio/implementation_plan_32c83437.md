# Dual Video Playback Engines: 12s Stage Slider & Dynamic Netflix-Style Cinema Player

A specialized overhaul focusing on two dedicated video playback experiences: a fixed 12.0s looping Stage Slider with slide navigation hotkeys, paired with a dynamic-duration Netflix-grade Fullscreen Cinema Player featuring autohiding interactive HUD controls, state-of-the-art playback tooling, and toggleable cinematic title overlays.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following key decisions were confirmed through Phase 1 clarification:
> - **Cinema Player Trigger**: Opening the individual dynamic player is triggered directly by clicking the central cinema stage viewport or clicking the dedicated fullscreen expand button.
> - **Title & Effects Behavior**: In fullscreen cinema mode, cinematic titles animate in gracefully at launch, and can be toggled on/off at will via a dedicated Title/CC HUD button on the control bar.
> - **Main Transport Navigation**: The frame-by-frame `-1F` and `+1F` stepping buttons are removed from the main stage transport strip to clean up visual clutter, and Left/Right arrow keys are mapped to navigate previous/next slides. Spacebar toggles Play/Pause.

---

## 1. Overview & Core Concept

### What It Delivers
1. **Tactile Stage Slider Engine (12s Looped Presentation)**:
   - Plays each shot/slide in a precise 12.0-second loop regardless of the uploaded video's native duration. If a video is shorter or longer, it seamlessly loops or holds within the 12.0s timing window.
   - Primary navigation via keyboard shortcuts: `Space` for Play/Pause, `ArrowLeft` for previous slide, and `ArrowRight` for next slide.
   - Streamlined transport pill bar: removes the `-1F` and `+1F` frame nudge buttons while preserving Loop, Variable Speed, Audio Mute, Scrubber, and Mode toggles.

2. **Netflix-Style Individual Dynamic Player (Long-Form Cinema Mode)**:
   - Supports arbitrary media duration: from a few seconds to hours of 4K footage. Dynamically reads the HTML5 video's native duration and reflects real timecodes (`HH:MM:SS`).
   - Implements full screen immersion with an autohiding HUD: moves mouse to reveal controls; fades out completely after 2.5 seconds of inactivity and hides the cursor.
   - Retains all visual effects, LUT color grading profiles, film grain, bloom, and cinematic titles (Bengali + English).
   - Best-in-class online player features: custom timeline scrubber with buffer progress indicator, 10s skip backward/forward, volume slider with memory and mute toggle, playback speed menu (0.5x – 2.0x), aspect ratio switcher, Picture-in-Picture, and native fullscreen toggle.

3. **Stage Visual Cleanliness**:
   - Decouples default backdrop artwork from baked-in UI screenshots to ensure pristine title typography without double-printing or ghost text.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MAIN TACTILE STAGE                              │
│                                                                        │
│  [Play / Pause: Space]      [Prev / Next Slide: Left / Right Arrow]    │
│  [12.000s Slide Loop]       [Bottom 100-Shot Sequence Runner]          │
│                                                                        │
│        Click Stage Viewport OR Fullscreen Button (⛶)                   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│            NETFLIX-STYLE FULLSCREEN DYNAMIC CINEMA PLAYER              │
│                                                                        │
│  • Fullscreen darkroom viewport (Esc / F to toggle)                    │
│  • Media duration dynamically loaded (Minutes / Hours)                 │
│  • Autohiding Control HUD (Fades out after 2.5s mouse inactivity)      │
│  • Real-time CSS LUT filter + Bloom + Grain + Vignette intact          │
│  • Animated Titles with [CC / TITLES] toggle button                    │
│  • Top Bar: Back to Stage, Shot #, Shot Title, Aspect, Close           │
│  • Bottom Dock: Play/Pause, -10s, +10s, Scrubber, Volume, Speed, PiP   │
└────────────────────────────────────────────────────────────────────────┘
```

### Visual Identity & Theme
- **Theme**: Obsidian Minimalist Cinema (`#050508` deep dark canvas, `#0c0c12` glassmorphic HUD plates, warm gold `#fbbf24` / `#d4af37` active accents).
- **Typography**: 
  - Monospace timecode & telemetry (`JetBrains Mono`, `tabular-nums`).
  - Bengali Display (`Anek Bangla` bold metallic gradient).
  - English Cinematic Titles (`Cinzel` serif uppercase with wide letter tracking).
- **Control Dock Motion**: Smooth opacity and translate transitions (`transition-all duration-300 ease-out`). When inactive, the cursor is set to `cursor: none` and all HUD elements fade to `opacity: 0`.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Stage Slider vs. Individual Player Separation
- **Chosen Approach**: Two purpose-built components. The main stage maintains the rapid-storyboard 12.0s timing rule with the bottom sequence runner, while the individual player runs as an immersive modal/fullscreen component reading real media duration.
- **Why**: An animatic storyboard workflow requires a consistent beat (12s per beat) across 100 shots. However, when inspecting raw director dailies or finished clips that might be 45 minutes or 2 hours long, the user requires an unconstrained media scrubber with Netflix-grade controls.
- **Alternatives Considered**: Modifying the main stage to stretch to arbitrary media durations would break the 12s storyboard sequence runner rhythm and timecode sync.

### Decision 2: Keyboard Shortcut Normalization
- **Chosen Approach**:
  - `Space`: Master Play/Pause toggle across both the main stage and the cinema player.
  - `ArrowLeft` / `ArrowRight` on Main Stage: Navigates previous and next shots.
  - `ArrowLeft` / `ArrowRight` in Netflix Cinema Player: Skips -10s and +10s within the media file.
- **Why**: Follows universal web standards (YouTube, Netflix) and user expectation while keeping input elements protected from key interception.

### Decision 3: Autohiding HUD Engine
- **Chosen Approach**: A high-efficiency `onMouseMove` timer that sets `isHudVisible = true`, clears any existing timer, and schedules an auto-hide after 2500ms when video is playing. When paused, the HUD stays visible so the user can inspect timecode and settings without moving the mouse.

---

## 4. Technical Architecture & Data Strategy

### System Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                                App.tsx                                 │
│  - Global Keyboard Controller (Space, Left/Right Arrows)              │
│  - Active Slide Index & 12s Slide Loop Sequencer                      │
│  - Fullscreen Cinema Modal Open/Close State                           │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│             TactileStage             │  │      NetflixCinemaPlayer     │
│  - 12.0s Looped Video / Plate        │  │  (Dynamic Media Duration)    │
│  - Streamlined TactileTransport      │  │  - Native video duration     │
│    (No -1F / +1F buttons)            │  │  - Autohiding HUD (2.5s)     │
│  - Click stage -> Open Cinema Player │  │  - Buffer & Scrub track      │
│  - 100-Shot Sequence Runner          │  │  - 10s Skips, Speed, Volume  │
│  - Clean typography & LUT filters    │  │  - Toggleable Titles & LUT   │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

### Component & State Mapping

1. **`TactileTransport.tsx`**:
   - Remove `-1F` and `+1F` step buttons from the control deck.
   - Retain Play/Pause, Loop toggle, Animatic/Solo scrub mode, Speed selector, Mute, and Scrubber track.
2. **`App.tsx`**:
   - Update `handleKeyDown`:
     - `ArrowLeft`: Navigate to previous slide (`prevFrame()`).
     - `ArrowRight`: Navigate to next slide (`nextFrame()`).
     - `Space`: Toggle play/pause (`setIsPlaying(p => !p)`).
   - Wire stage click and fullscreen trigger to open the Netflix Cinema Player.
3. **`NetflixCinemaPlayer.tsx` (New Dedicated Engine)**:
   - Dynamic duration from `<video>` element (`onLoadedMetadata`).
   - Autohide HUD timer with mousemove listener, hides cursor when idle.
   - Dynamic timecode formatting (`HH:MM:SS` and negative remaining time).
   - Fullscreen API binding (`requestFullscreen`, `exitFullscreen`).
   - Title overlay layer with intro fade and toggle button in HUD.
   - CSS LUT filter + adjustments pipeline (brightness, contrast, bloom, grain).

---

## Verification Plan

- [ ] Verify that `Space` toggles play/pause on the main stage.
- [ ] Verify that `ArrowLeft` and `ArrowRight` navigate to the previous and next slide on the main stage.
- [ ] Verify that `-1F` and `+1F` buttons are completely removed from the main transport bar.
- [ ] Verify clicking the cinema stage or expand button opens the Netflix-style player.
- [ ] Verify the Netflix-style player loads real video duration (minutes/hours) and scrubs accurately.
- [ ] Verify HUD auto-hides after 2.5s of mouse inactivity and reappears on mouse move.
- [ ] Verify Titles and LUT effects render cleanly in fullscreen with the toggle button working.
- [ ] Run `compile_applet` and ensure clean compilation with zero TypeScript errors.
