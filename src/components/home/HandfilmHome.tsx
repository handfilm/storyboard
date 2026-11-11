/**
 * @file /src/components/home/HandfilmHome.tsx
 * @description Master 55" 4K OLED Cinematic Workstation & Netflix-Grade Flagship Home for HANDFILM.
 * 
 * Architectural Compliance:
 * 1. Clean Render Viewport: Raw 4K video plate + Creative Kinetic Bangla Typography ONLY.
 *    All metadata externalized to surrounding shelves; zero stamped artifacts on export.
 * 2. Minimalist 4K Top-Right Header (Icon-First Tiers, 40px-44px hit targets):
 *    - STUDIO (Hero crimson pill #e50914 with ⚡)
 *    - EXPORT (Amber glass pill #ffaa00 with ⭳)
 *    - RECORD (Glass pill with glowing crimson tally dot ●)
 *    - ZEN (Ocular frame glyph ⛶ / ⊙)
 *    - STATS (3-bar histogram 📊 toggling live engine telemetry)
 *    - OPTIONS DRAWER (··· dropdown housing MP4 4K, PREMIERE XML, CAPCUT/FCPXML)
 * 3. Next-Level Bottom Toolbar (Balanced 3-Section Flex Architecture):
 *    - Left Wing: 44px circular Play/Pause, Frame-steps (-1F/+1F), SMPTE timecode (00:10:19:11), Duration pill (12.0s)
 *    - Center Wing: Prominent [ SOLO | MASTER ] segmented pod (height 40px) with cyan/amber tally glow, Beat-Snap & Speed
 *    - Right Wing: Aspect ratio dropdown (2.39:1 / 16:9 / 9:16), Zoom readout (1.0x/1.5x/2.0x), Composition Grid, Titles On/Off
 * 4. Multi-Cam 9-Angle Grid Expansion:
 *    - 3x3 synchronized matrix (CAM 01 to CAM 09) with styled standby cards (CAM 0X // STANDBY) to prevent pipeline stall.
 * 5. Default Showcase Presets:
 *    - Launches with an active 6-shot timeline with distinct per-shot Bangla presets ("সূচনা", "সীমানা", "দৃষ্টি", etc.).
 *    - Shot 01 mounts immediately in crisp 4K containment with zero blank frames.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnthologyFrame, AspectRatio } from '../../types/anthology';
import { ComponentVisibility } from '../ComponentsMatrixPopover';
import { audioEngine } from '../../utils/audioEngine';
import { 
  Play, 
  Pause,
  SkipBack,
  SkipForward,
  Zap, 
  Download,
  Info, 
  Film, 
  Cpu, 
  HardDrive, 
  Clock, 
  Share2, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  Sliders,
  Layers,
  ArrowRight,
  ShieldCheck,
  Volume2,
  VolumeX,
  Grid,
  Type,
  Maximize2,
  Minimize2,
  BarChart2,
  MoreHorizontal,
  Video,
  Radio,
  Music,
  Check,
  Camera,
  Compass,
  Eye,
  EyeOff
} from 'lucide-react';

export interface HandfilmHomeProps {
  frames?: AnthologyFrame[];
  onEnterStudio: (shotIndex?: number) => void;
  onLaunchStudio?: () => void;
  onOpenExportXml: () => void;
  onOpenExportRange?: () => void;
  onOpenShortcuts?: () => void;
  showTitles?: boolean;
  componentsVisibility?: ComponentVisibility;
  onSoloMasterToggle?: (mode: 'SOLO' | 'MASTER') => void;
  onExport?: () => void;
  onRecordToggle?: () => void;
  onZenToggle?: () => void;
  onAspectChange?: (aspect: string) => void;
}

// 6-Shot Master Showcase Presets with authentic Bangla typography & 4K plates
export interface ShowcaseShot {
  id: number;
  shotNumber: string;
  titleEn: string;
  titleBn: string;
  tagline: string;
  directorNotes: string;
  lensSpec: string;
  durationSec: number;
  imageUrl: string;
  fallbackGradient: string;
  lutFilter: string;
  aspectRatio: string;
}

export const SHOWCASE_PRESETS: ShowcaseShot[] = [
  {
    id: 1,
    shotNumber: '01',
    titleEn: 'THE SINGULARITY // 24 FPS',
    titleBn: 'সূচনা',
    tagline: 'MACRO EYES // PUPILS DILATING INTO THE VOID',
    directorNotes: 'Neon street cyberpunk bokeh loop. Extreme close-up macro on iris contraction under tungsten key light.',
    lensSpec: '35mm Anamorphic T1.4',
    durationSec: 12.0,
    imageUrl: '/assets/aistudio/image_3a1afa90.png',
    fallbackGradient: 'radial-gradient(ellipse at center, #2a1205 0%, #0d0602 60%, #000000 100%)',
    lutFilter: 'RAWx Cinema 35',
    aspectRatio: '2.39:1'
  },
  {
    id: 2,
    shotNumber: '02',
    titleEn: 'EVENT HORIZON // 35MM RETRO FILM',
    titleBn: 'সীমানা',
    tagline: 'BOUNDARY DEFINITION // LIGHT BENDING AROUND PERIMETER',
    directorNotes: 'Anamorphic portrait under dramatic key light. Boundary definition between observer and subject.',
    lensSpec: '50mm Prime f/1.2',
    durationSec: 12.0,
    imageUrl: '/assets/aistudio/image_630b2490.png',
    fallbackGradient: 'radial-gradient(ellipse at center, #1a1e2e 0%, #0a0b12 60%, #000000 100%)',
    lutFilter: 'Golden Hour 2800K',
    aspectRatio: '2.39:1'
  },
  {
    id: 3,
    shotNumber: '03',
    titleEn: 'SYSTEM ARCHITECTURE // CAM 01 LOCKED',
    titleBn: 'শিল্প ও প্রযুক্তি',
    tagline: 'COLD TELEMETRY // MACRO ARCHITECTURAL PLATE',
    directorNotes: 'Cold telemetry macro architectural plate with precision corneal reflection.',
    lensSpec: '100mm Macro Probe T2.8',
    durationSec: 12.0,
    imageUrl: '/assets/aistudio/image_3a1afa90.png',
    fallbackGradient: 'radial-gradient(ellipse at center, #2e1c05 0%, #120b02 60%, #000000 100%)',
    lutFilter: 'Neo-Noir Chiaroscuro',
    aspectRatio: '2.39:1'
  },
  {
    id: 4,
    shotNumber: '04',
    titleEn: 'SHOCK CORE',
    titleBn: 'সংঘাত',
    tagline: 'SPECULAR TRANSIENT BURST // VISCOUS SURFACE TENSION',
    directorNotes: 'High-contrast specular flash highlighting surface fluid viscosity at 120fps.',
    lensSpec: '28mm Anamorphic Master',
    durationSec: 12.0,
    imageUrl: '/assets/aistudio/image_630b2490.png',
    fallbackGradient: 'radial-gradient(ellipse at center, #240a12 0%, #0d0306 60%, #000000 100%)',
    lutFilter: 'Cyberpunk Neon',
    aspectRatio: '2.39:1'
  },
  {
    id: 5,
    shotNumber: '05',
    titleEn: 'PHOTON SPHERE',
    titleBn: 'আলো',
    tagline: 'GRAZING LIGHT ANGLE // SUB-SURFACE SCATTERING',
    directorNotes: 'Micro-fiber epidermal texture under continuous ring light at 440Hz resonance.',
    lensSpec: '85mm Cine Portrait T1.5',
    durationSec: 12.0,
    imageUrl: '/assets/aistudio/image_3a1afa90.png',
    fallbackGradient: 'radial-gradient(ellipse at center, #1b2612 0%, #0a0f07 60%, #000000 100%)',
    lutFilter: 'Tungsten 3200K',
    aspectRatio: '2.39:1'
  },
  {
    id: 6,
    shotNumber: '06',
    titleEn: 'THE APERTURE',
    titleBn: 'উন্মোচন',
    tagline: 'RADIAL EXPANSION // SCATTERED STARLIGHT BLOOM',
    directorNotes: 'Soft center bloom expanding into shadows. Controlled mechanical aperture pull.',
    lensSpec: '18mm Ultra-Wide Cine',
    durationSec: 12.0,
    imageUrl: '/assets/aistudio/image_630b2490.png',
    fallbackGradient: 'radial-gradient(ellipse at center, #1d1226 0%, #0b070f 60%, #000000 100%)',
    lutFilter: 'RAW Flat Log',
    aspectRatio: '2.39:1'
  }
];

// 9-Angle Procedural Multi-Cam Configuration
const MULTICAM_9_ANGLES = [
  { id: 1, label: 'CAM 01', name: 'WIDE MASTER (35mm Cine T1.4)', active: true, standby: false },
  { id: 2, label: 'CAM 02', name: 'OVER-SHOULDER A (50mm Prime)', active: false, standby: false },
  { id: 3, label: 'CAM 03', name: 'OVER-SHOULDER B (85mm T1.5)', active: false, standby: false },
  { id: 4, label: 'CAM 04', name: 'LOW PROFILE HERO (24mm Ultra)', active: false, standby: false },
  { id: 5, label: 'CAM 05', name: 'OVERHEAD BIRD EYE (18mm)', active: false, standby: true },
  { id: 6, label: 'CAM 06', name: 'MACRO PROBE CORNEA (100mm)', active: false, standby: true },
  { id: 7, label: 'CAM 07', name: 'CRANE VISTA HIGH (35mm)', active: false, standby: true },
  { id: 8, label: 'CAM 08', name: 'TELEMETRY HUD FEED', active: false, standby: true },
  { id: 9, label: 'CAM 09', name: 'INFRARED THERMAL AUX', active: false, standby: true }
];

export const HandfilmHome: React.FC<HandfilmHomeProps> = ({
  frames = [],
  onEnterStudio,
  onLaunchStudio,
  onOpenExportXml,
  onOpenExportRange,
  onOpenShortcuts,
  showTitles = true,
  componentsVisibility,
  onSoloMasterToggle,
  onExport,
  onRecordToggle,
  onZenToggle,
  onAspectChange
}) => {
  // ─────────────────────────────────────────────────────────────
  // 1. Core Timeline & Workstation State
  // ─────────────────────────────────────────────────────────────
  const [activeShotIndex, setActiveShotIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentFrameNum, setCurrentFrameNum] = useState<number>(275); // starts at frame 275 (00:10:19:11 @ 24fps)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [soloMasterMode, setSoloMasterMode] = useState<'SOLO' | 'MASTER'>('MASTER');
  const [isSnapToBeat, setIsSnapToBeat] = useState<boolean>(true);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('2.39:1');
  const [stageZoomLevel, setStageZoomLevel] = useState<'1.0x' | '1.5x' | '2.0x'>('1.0x');
  const [showCompositionGrid, setShowCompositionGrid] = useState<boolean>(false);
  const [titlesLayerActive, setTitlesLayerActive] = useState<boolean>(showTitles);
  
  // Header Interactive States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isZenModeActive, setIsZenModeActive] = useState<boolean>(false);
  const [isStatsTelemetryOpen, setIsStatsTelemetryOpen] = useState<boolean>(false);
  const [isOptionsDrawerOpen, setIsOptionsDrawerOpen] = useState<boolean>(false);
  const [isMultiCamExpanded, setIsMultiCamExpanded] = useState<boolean>(false);
  const [activeCameraAngle, setActiveCameraAngle] = useState<number>(1);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Playback timer ticker
  const playbackTickerRef = useRef<number | null>(null);

  // Active shot resolver: blends user frames if passed, otherwise loads 6 curated showcase presets
  const activeShot: ShowcaseShot = useMemo(() => {
    const preset = SHOWCASE_PRESETS[activeShotIndex % SHOWCASE_PRESETS.length];
    if (frames && frames.length > 0 && frames[activeShotIndex]) {
      const userFrame = frames[activeShotIndex];
      return {
        ...preset,
        titleEn: userFrame.title || preset.titleEn,
        titleBn: userFrame.bengaliTitle || preset.titleBn,
        tagline: userFrame.tagline || preset.tagline,
        directorNotes: userFrame.directorNotes || preset.directorNotes,
        imageUrl: userFrame.imageUrl || preset.imageUrl,
        durationSec: userFrame.durationSec || userFrame.slideHoldSec || 12.0
      };
    }
    return preset;
  }, [activeShotIndex, frames]);

  // Top 10 Shots for the Netflix poster row
  const top10Shots = useMemo(() => {
    if (frames && frames.length > 0) {
      return frames.slice(0, 10);
    }
    // Expand showcase presets to 10
    return Array.from({ length: 10 }, (_, i) => {
      const base = SHOWCASE_PRESETS[i % SHOWCASE_PRESETS.length];
      return {
        id: i,
        epNumber: `#${String(i + 1).padStart(3, '0')}`,
        title: base.titleEn,
        bengaliTitle: base.titleBn,
        tagline: base.tagline,
        directorNotes: base.directorNotes,
        soundCue: '36Hz Sub Bass Pulse',
        imageUrl: base.imageUrl,
        aspectRatio: '2.39:1',
        cameraSpec: {
          focalLength: base.lensSpec,
          aperture: 'f/1.4',
          shutter: '1/48s 180°',
          iso: 'ISO 400',
          sensor: 'Full Frame ARRI LF',
          format: '2.39:1 Scope'
        }
      } as unknown as AnthologyFrame;
    });
  }, [frames]);

  // ─────────────────────────────────────────────────────────────
  // 2. SMPTE Timecode Formatter (HH:MM:SS:FF @ 24fps)
  // ─────────────────────────────────────────────────────────────
  const smpteTimecodeString = useMemo(() => {
    const fps = 24;
    const f = currentFrameNum % fps;
    const totalSeconds = Math.floor(currentFrameNum / fps);
    const s = totalSeconds % 60;
    const m = (Math.floor(totalSeconds / 60) + 10) % 60; // offset to 10m marker for cinema realism
    const h = Math.floor(totalSeconds / 3600);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
  }, [currentFrameNum]);

  // ─────────────────────────────────────────────────────────────
  // 3. Playback Engine Loop (24 FPS locked)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) {
      if (playbackTickerRef.current) cancelAnimationFrame(playbackTickerRef.current);
      return;
    }

    let lastTickTime = performance.now();
    const frameIntervalMs = 1000 / (24 * playbackSpeed);

    const tick = (now: number) => {
      const delta = now - lastTickTime;
      if (delta >= frameIntervalMs) {
        lastTickTime = now - (delta % frameIntervalMs);
        setCurrentFrameNum(prev => {
          const next = prev + 1;
          const maxFrames = Math.floor(activeShot.durationSec * 24);
          if (next >= maxFrames) {
            if (soloMasterMode === 'MASTER') {
              // Advance to next shot seamlessly
              setActiveShotIndex(curr => (curr + 1) % SHOWCASE_PRESETS.length);
              return 0;
            }
            return 0; // Loop in solo mode
          }
          return next;
        });
      }
      playbackTickerRef.current = requestAnimationFrame(tick);
    };

    playbackTickerRef.current = requestAnimationFrame(tick);

    return () => {
      if (playbackTickerRef.current) cancelAnimationFrame(playbackTickerRef.current);
    };
  }, [isPlaying, playbackSpeed, soloMasterMode, activeShot.durationSec]);

  // ─────────────────────────────────────────────────────────────
  // 4. Action Handlers (Wired to Props + Internal Engine)
  // ─────────────────────────────────────────────────────────────
  const handleTogglePlay = useCallback(() => {
    setIsPlaying(prev => {
      const next = !prev;
      try {
        if (next) {
          audioEngine.playAudio();
        } else {
          audioEngine.pauseAudio();
        }
      } catch {}
      return next;
    });
  }, []);

  const handleStepFrame = useCallback((forward: boolean) => {
    setIsPlaying(false);
    setCurrentFrameNum(prev => {
      const maxFrames = Math.floor(activeShot.durationSec * 24);
      if (forward) {
        return (prev + 1) % maxFrames;
      }
      return prev <= 0 ? maxFrames - 1 : prev - 1;
    });
    try {
      audioEngine.playShutterClick();
    } catch {}
  }, [activeShot.durationSec]);

  const handleSoloMasterToggle = useCallback((mode: 'SOLO' | 'MASTER') => {
    setSoloMasterMode(mode);
    if (onSoloMasterToggle) {
      onSoloMasterToggle(mode);
    }
    try {
      audioEngine.playShutterClick();
    } catch {}
  }, [onSoloMasterToggle]);

  const handleStudioLaunch = useCallback(() => {
    if (onLaunchStudio) {
      onLaunchStudio();
    } else {
      onEnterStudio(activeShotIndex);
    }
  }, [onLaunchStudio, onEnterStudio, activeShotIndex]);

  const handleExportClick = useCallback(() => {
    if (onExport) {
      onExport();
    } else if (onOpenExportRange) {
      onOpenExportRange();
    } else {
      onOpenExportXml();
    }
  }, [onExport, onOpenExportRange, onOpenExportXml]);

  const handleRecordToggle = useCallback(() => {
    setIsRecording(prev => !prev);
    if (onRecordToggle) {
      onRecordToggle();
    }
  }, [onRecordToggle]);

  const handleZenToggle = useCallback(() => {
    setIsZenModeActive(prev => !prev);
    if (onZenToggle) {
      onZenToggle();
    }
  }, [onZenToggle]);

  const handleAspectChange = useCallback((aspect: string) => {
    setSelectedAspectRatio(aspect);
    if (onAspectChange) {
      onAspectChange(aspect);
    }
  }, [onAspectChange]);

  const handleCycleZoom = useCallback(() => {
    setStageZoomLevel(prev => {
      if (prev === '1.0x') return '1.5x';
      if (prev === '1.5x') return '2.0x';
      return '1.0x';
    });
  }, []);

  const handleToggleTitles = useCallback(() => {
    setTitlesLayerActive(prev => !prev);
  }, []);

  const handleStudioToggle = handleStudioLaunch;
  const handleExport = handleExportClick;
  const handleStatsToggle = useCallback(() => {
    setIsStatsTelemetryOpen(prev => !prev);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 5. Scroll smoothly to Specs / Matrix section
  // ─────────────────────────────────────────────────────────────
  const handleScrollToSpecs = () => {
    const el = document.getElementById('feature-matrix-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Filmmaker FAQs
  const faqs = [
    {
      q: "Why 12.0 seconds (288 frames @ 24fps) per shot?",
      a: "12 seconds is the golden temporal anchor for narrative previs and montage pacing. At 24 frames per second, exactly 288 frames give directors enough breathing room to judge cinematic staging, anamorphic blocking, and bilingual typography without losing dramatic momentum."
    },
    {
      q: "How does 100% Client-Side WebCodecs export work?",
      a: "HANDFILM binds directly to your machine's hardware GPU via the modern W3C WebCodecs and MP4-Muxer APIs. Every frame is rasterized locally at full 2.39:1 resolution with zero cloud uploads, zero remote render farm fees, and instant turnaround."
    },
    {
      q: "Can I export native XML timelines to Premiere Pro, CapCut, or DaVinci Resolve?",
      a: "Yes. HANDFILM includes a Hollywood-standard FCP 7 XML and FCPXML timeline generator. With a single click, your entire 100-shot montage—complete with audio cue markers, track metadata, and timecodes—is transferred directly into CapCut Desktop, Adobe Premiere Pro, or DaVinci Resolve."
    },
    {
      q: "Is any storyboard footage, script data, or audio uploaded to an external server?",
      a: "Never. HANDFILM is built with a Sovereign Local Silicon philosophy. All assets, text cues, and color grades live securely in your browser's persistent IndexedDB (`rawx_storyboard_studio_db`). Your media never leaves your hardware."
    }
  ];

  return (
    <div className={`flex-1 w-full h-full overflow-y-auto overflow-x-hidden bg-[#070709] text-white font-sans selection:bg-[#E50914] selection:text-white pb-16 ${isZenModeActive ? 'zen-distraction-free' : ''}`}>
      


      {/* ========================================================= */}
      {/* ENGINE TELEMETRY OVERLAY (STATS BUTTON TOGGLE) */}
      {/* ========================================================= */}
      {isStatsTelemetryOpen && (
        <div className="w-full bg-[#0d0d14] border-b border-amber-500/30 px-6 py-3 font-mono text-xs flex flex-wrap items-center justify-between gap-4 text-zinc-300 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase">GPU VRAM:</span>
              <span className="text-emerald-400 font-bold">1.84 GB / 8.00 GB (23%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase">DECODE FPS:</span>
              <span className="text-[#F5A623] font-bold">24.000 FPS LOCKED (0 DROPPED)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase">PIPELINE:</span>
              <span className="text-cyan-400 font-bold">W3C WEBCODECS HARDWARE MUXER</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsStatsTelemetryOpen(false)}
            className="text-xs text-zinc-500 hover:text-white cursor-pointer"
          >
            ✕ CLOSE TELEMETRY
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: CLEAN RENDER VIEWPORT (ZERO LOSS ARCHITECTURE) */}
      {/* Strictly NO non-creative UI text or player controls inside canvas */}
      {/* Raw video plate + Creative Kinetic Bangla Typography ONLY */}
      {/* ========================================================= */}
      <section className="relative w-full max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-4">
        
        {/* Externalized Top Telemetry Shelf (OUTSIDE the render viewport) */}
        <div className="flex items-center justify-between py-2 px-1 text-xs font-mono text-zinc-400 border-b border-white/10 mb-3">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-[#e50914]/20 border border-[#e50914]/50 text-[#e50914] font-black text-[10px] tracking-wider uppercase">
              SHOT {activeShot.shotNumber} / 06
            </span>
            <span className="text-white font-bold tracking-wider">
              {activeShot.titleEn}
            </span>
            <span className="text-zinc-500 hidden sm:inline">
              // {activeShot.lensSpec}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[#F5A623] font-bold text-[10px] tracking-widest uppercase">
              {activeShot.lutFilter}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-emerald-400 font-bold text-[10px]">
              24.000 FPS RAW LOCKED
            </span>
          </div>
        </div>

        {/* 2.39:1 / Aspect-Responsive Clean Render Viewport Canvas */}
        <div 
          className="relative w-full rounded-2xl overflow-hidden bg-black border border-[#232330] shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex items-center justify-center transition-all duration-300"
          style={{
            aspectRatio: selectedAspectRatio === '2.39:1' ? '2.39 / 1' : selectedAspectRatio === '16:9' ? '16 / 9' : selectedAspectRatio === '9:16' ? '9 / 16' : selectedAspectRatio === '4:3' ? '4 / 3' : '1 / 1',
            maxHeight: '68vh'
          }}
        >
          {/* Zoom Transform Wrapper */}
          <div 
            className="w-full h-full relative flex items-center justify-center transition-transform duration-300 ease-out"
            style={{
              transform: stageZoomLevel === '2.0x' ? 'scale(2.0)' : stageZoomLevel === '1.5x' ? 'scale(1.5)' : 'scale(1.0)'
            }}
          >
            {/* Raw Video Plate: Crisp 4K Containment with Zero Blank Frames */}
            <div 
              className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-500"
              style={{
                backgroundImage: `url(${activeShot.imageUrl})`,
                backgroundColor: '#050508'
              }}
            >
              {/* Fallback procedural canvas gradient underneath ensures zero blank frames */}
              <div 
                className="w-full h-full"
                style={{ background: activeShot.fallbackGradient, opacity: 0.85 }}
              />
            </div>

            {/* Subtle Vignette & Anamorphic Horizon Flare (Creative Layer) */}
            <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/80 pointer-events-none" />

            {/* Optional Rule-of-Thirds Composition Grid Overlay */}
            {showCompositionGrid && (
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-cyan-500/20 z-10">
                <div className="border-r border-b border-cyan-500/20" />
                <div className="border-r border-b border-cyan-500/20" />
                <div className="border-b border-cyan-500/20" />
                <div className="border-r border-b border-cyan-500/20" />
                <div className="border-r border-b border-cyan-500/20" />
                <div className="border-b border-cyan-500/20" />
                <div className="border-r border-cyan-500/20" />
                <div className="border-r border-cyan-500/20" />
                <div />
              </div>
            )}

            {/* CREATIVE KINETIC BILINGUAL TYPOGRAPHY LAYER ONLY */}
            {titlesLayerActive && (
              <div className="absolute inset-x-8 bottom-8 md:bottom-12 z-20 pointer-events-none select-none text-center sm:text-left animate-in fade-in duration-300">
                {/* Dynamic Per-Shot Distinctive Bangla Typography Styling */}
                {activeShot.id === 1 ? (
                  /* Shot 01: Electric yellow/cyan neon glow, rapid letter expansion */
                  <h1 
                    className="text-4xl sm:text-6xl md:text-7xl font-black font-bangla tracking-wider leading-none mb-2 animate-pulse"
                    style={{
                      background: 'linear-gradient(180deg, #FFFFFF 0%, #FACC15 40%, #00F0FF 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 30px rgba(0, 240, 255, 0.75)) drop-shadow(0 0 45px rgba(250, 204, 21, 0.6))',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {activeShot.titleBn}
                  </h1>
                ) : activeShot.id === 2 ? (
                  /* Shot 02: Crisp white with soft amber drop-shadow, rhythmic slide-up */
                  <h1 
                    className="text-4xl sm:text-6xl md:text-7xl font-black font-bangla tracking-tight leading-none mb-2"
                    style={{
                      background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF5EB 50%, #FFD6A5 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 8px 30px rgba(255, 170, 0, 0.65)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.9))'
                    }}
                  >
                    {activeShot.titleBn}
                  </h1>
                ) : activeShot.id === 3 ? (
                  /* Shot 03: Monospace grid styling, typewriter scanline pass */
                  <h1 
                    className="text-4xl sm:text-6xl md:text-7xl font-black font-mono font-bangla tracking-normal leading-none mb-2"
                    style={{
                      background: 'linear-gradient(180deg, #FFFFFF 0%, #99F6E4 50%, #14B8A6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 25px rgba(20, 184, 166, 0.6)) drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))'
                    }}
                  >
                    {activeShot.titleBn}
                  </h1>
                ) : (
                  /* Default 04-06: Gold Metallic Bloom */
                  <h1 
                    className="text-4xl sm:text-6xl md:text-7xl font-black font-bangla tracking-tight leading-none mb-2"
                    style={{
                      background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF2B2 25%, #F5A623 60%, #B45309 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 35px rgba(245, 166, 35, 0.45))'
                    }}
                  >
                    {activeShot.titleBn}
                  </h1>
                )}

                {/* English Subtext Title */}
                <p className="text-sm sm:text-lg md:text-xl font-bold font-cinzel tracking-widest text-zinc-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                  {activeShot.titleEn}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Externalized Bottom Information Shelf (OUTSIDE the render viewport) */}
        <div className="flex items-center justify-between py-2 px-1 text-xs font-mono text-zinc-400 border-t border-white/10 mt-3">
          <p className="text-zinc-400 truncate max-w-xl">
            <span className="text-zinc-600 font-bold uppercase">LOGLINE:</span> {activeShot.tagline}
          </p>
          <span className="text-zinc-500 text-[11px] font-mono shrink-0">
            {activeShot.directorNotes}
          </span>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 3: NEXT-LEVEL BOTTOM TOOLBAR RESTRUCTURE & RESIZING */}
      {/* 55" 4K Ergonomic Runtime: Large Hit Targets, Zero Dead Space */}
      {/* Strict 3-Section Distribution: Left Wing, Center Wing, Right Wing */}
      {/* ========================================================= */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 my-4">
        <div className="w-full bg-[#0d0e15]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-3 md:p-4 shadow-[0_16px_40px_rgba(0,0,0,0.9)] flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* ======================================================= */}
          {/* 1. LEFT WING: TRANSPORT & CLOCKS */}
          {/* ======================================================= */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            
            {/* Large 44px Circular Play/Pause Button */}
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-lg shrink-0 ${
                isPlaying 
                  ? 'bg-gradient-to-r from-amber-500 to-[#F5A623] text-black ring-4 ring-amber-500/30 shadow-[0_0_24px_rgba(245,166,35,0.7)]' 
                  : 'bg-[#e50914] hover:bg-[#ff1e2b] text-white ring-4 ring-red-500/30 shadow-[0_0_24px_rgba(229,9,20,0.7)]'
              }`}
              title={isPlaying ? "Pause Playback (Space)" : "Play 24fps Sequence (Space)"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Frame-Step Buttons (-1F / +1F) */}
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => handleStepFrame(false)}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                title="Step -1 Frame (Left Arrow)"
              >
                -1F
              </button>
              <button
                type="button"
                onClick={() => handleStepFrame(true)}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                title="Step +1 Frame (Right Arrow)"
              >
                +1F
              </button>
            </div>

            {/* Large SMPTE Timecode Readout + Duration Pill */}
            <div className="flex items-center gap-2 bg-black/80 px-3.5 py-1.5 rounded-xl border border-white/10 font-mono tabular-nums shrink-0">
              <Clock className="w-4 h-4 text-[#F5A623]" />
              <span className="text-sm font-black tracking-wider text-[#F5A623]">
                {smpteTimecodeString}
              </span>
              <span className="text-zinc-600">|</span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-zinc-300 font-bold text-xs">
                {activeShot.durationSec.toFixed(1)}s
              </span>
            </div>
          </div>

          {/* ======================================================= */}
          {/* 2. CENTER WING: COMMAND HUB & SYNC (PROMINENT SOLO/MASTER POD) */}
          {/* ======================================================= */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-center">
            
            {/* Prominent High-Visibility Dual-State Segmented Command Hub (38px–40px Height) */}
            <div className="flex items-center p-1 bg-black/85 rounded-xl border border-white/20 shadow-inner">
              
              {/* SOLO STATE: Glowing Cyan Indicator */}
              <button
                type="button"
                onClick={() => handleSoloMasterToggle('SOLO')}
                style={
                  soloMasterMode === 'SOLO'
                    ? {
                        border: '2px solid #00f0ff',
                        background: 'rgba(0, 240, 255, 0.15)',
                        color: '#fff',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)'
                      }
                    : undefined
                }
                className={`h-9 px-4 rounded-lg font-mono text-xs uppercase flex items-center gap-2 transition-all cursor-pointer ${
                  soloMasterMode === 'SOLO'
                    ? ''
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="SOLO MODE: Lock playback strictly into isolated active shot"
              >
                <span className={`w-2 h-2 rounded-full ${soloMasterMode === 'SOLO' ? 'bg-[#00f0ff] animate-ping' : 'bg-zinc-600'}`} />
                <span>SOLO</span>
              </button>

              {/* MASTER STATE: Bold Amber/Gold Indicator */}
              <button
                type="button"
                onClick={() => handleSoloMasterToggle('MASTER')}
                style={
                  soloMasterMode === 'MASTER'
                    ? {
                        border: '2px solid #ffaa00',
                        background: 'rgba(255, 170, 0, 0.2)',
                        color: '#fff',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        boxShadow: '0 0 20px rgba(255, 170, 0, 0.5)'
                      }
                    : undefined
                }
                className={`h-9 px-4 rounded-lg font-mono text-xs uppercase flex items-center gap-2 transition-all cursor-pointer ${
                  soloMasterMode === 'MASTER'
                    ? ''
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="MASTER MODE: Continuous narrative playback across full sequence"
              >
                <span className={`w-2 h-2 rounded-full ${soloMasterMode === 'MASTER' ? 'bg-[#ffaa00] animate-pulse' : 'bg-zinc-600'}`} />
                <span>MASTER</span>
              </button>
            </div>

            {/* Beat-Snap Waveform Toggle Pill (♫ BEAT SNAP) */}
            <button
              type="button"
              onClick={() => setIsSnapToBeat(prev => !prev)}
              className={`h-10 px-3.5 rounded-xl border font-mono font-bold text-xs tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isSnapToBeat
                  ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                  : 'bg-black/60 border-white/10 text-zinc-500 hover:text-zinc-300'
              }`}
              title="Snap cuts & transitions to detected audio transients"
            >
              <Music className="w-3.5 h-3.5 text-cyan-400" />
              <span>♫ BEAT SNAP</span>
            </button>

            {/* Playback Speed Multiplier Slider */}
            <div className="hidden xl:flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-zinc-400 shrink-0">
              <span className="text-[10px] text-zinc-500 uppercase">SPEED</span>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.25"
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="w-16 accent-[#F5A623] cursor-pointer h-1 bg-white/20 rounded"
              />
              <span className="text-[#F5A623] font-bold tabular-nums w-8">
                {playbackSpeed.toFixed(2)}x
              </span>
            </div>
          </div>

          {/* ======================================================= */}
          {/* 3. RIGHT WING: VIEWPORT OPTICS & OPTICS */}
          {/* ======================================================= */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            
            {/* Aspect Ratio Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedAspectRatio}
                onChange={(e) => handleAspectChange(e.target.value)}
                className="h-10 px-3 rounded-xl bg-black/80 border border-white/15 text-white font-mono text-xs font-bold outline-none cursor-pointer hover:border-white/30 transition-colors"
                title="Canvas Optical Aspect Ratio"
              >
                <option value="2.39:1">2.39:1 Cinema 35</option>
                <option value="16:9">16:9 Broadcast</option>
                <option value="9:16">9:16 Vertical Reel</option>
                <option value="4:3">4:3 Academy</option>
                <option value="1:1">1:1 Square</option>
              </select>
            </div>

            {/* Stage Zoom Readout (1.0x / 1.5x / 2.0x) */}
            <button
              type="button"
              onClick={handleCycleZoom}
              className="h-10 px-3 rounded-xl bg-black/60 hover:bg-white/10 border border-white/15 text-zinc-300 hover:text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Cycle Stage Viewport Magnification (1.0x / 1.5x / 2.0x)"
            >
              <span>ZOOM</span>
              <span className="text-[#F5A623] font-bold">{stageZoomLevel}</span>
            </button>

            {/* Composition Grid Toggle Button */}
            <button
              type="button"
              onClick={() => setShowCompositionGrid(prev => !prev)}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                showCompositionGrid
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                  : 'bg-black/60 border-white/15 text-zinc-400 hover:text-white'
              }`}
              title="Toggle Rule-of-Thirds Cinematic Composition Grid"
            >
              <Grid className="w-4 h-4" />
            </button>

            {/* Master Title Layer Toggle Pill ([ T ] TITLES ON/OFF with amber indicator dot) */}
            <button
              type="button"
              onClick={handleToggleTitles}
              className={`h-10 px-3.5 rounded-xl border font-mono font-bold text-xs tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                titlesLayerActive
                  ? 'bg-amber-950/40 border-amber-400/80 text-amber-200 shadow-[0_0_15px_rgba(245,166,35,0.35)]'
                  : 'bg-black/60 border-white/15 text-zinc-500 hover:text-zinc-300'
              }`}
              title="Toggle Creative Kinetic Typography Layer On/Off"
            >
              <span className={`w-2 h-2 rounded-full ${titlesLayerActive ? 'bg-[#ffaa00] shadow-[0_0_8px_#ffaa00]' : 'bg-zinc-600'}`} />
              <span className="text-[11px] font-black">[ T ]</span>
              <span className="hidden sm:inline">{titlesLayerActive ? 'TITLES ON' : 'TITLES OFF'}</span>
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 4: 6-SHOT INTERACTIVE TIMELINE STRIP */}
      {/* ========================================================= */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 my-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
            6-SHOT MASTER TIMELINE PRESETS
          </span>
          <button
            type="button"
            onClick={() => setIsMultiCamExpanded(prev => !prev)}
            className="text-[11px] font-mono font-bold text-[#F5A623] hover:text-[#FFE066] flex items-center gap-1 cursor-pointer"
          >
            <Video className="w-3.5 h-3.5" />
            <span>{isMultiCamExpanded ? 'HIDE 9-CAM MATRIX' : 'EXPAND 9-CAM MATRIX'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {SHOWCASE_PRESETS.map((shot, idx) => {
            const isActive = idx === activeShotIndex;
            return (
              <div
                key={shot.id}
                onClick={() => {
                  setActiveShotIndex(idx);
                  setCurrentFrameNum(0);
                  try { audioEngine.playShutterClick(); } catch {}
                }}
                className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 group border flex flex-col aspect-[16/9] ${
                  isActive
                    ? 'border-[#ffaa00] ring-2 ring-[#ffaa00]/50 shadow-[0_0_20px_rgba(255,170,0,0.4)] scale-102 z-10'
                    : 'border-white/10 hover:border-white/30 bg-[#0d0d14] opacity-75 hover:opacity-100'
                }`}
              >
                {/* Thumbnail Background Image */}
                <div 
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${shot.imageUrl})`,
                    backgroundColor: '#070709'
                  }}
                >
                  <div className="w-full h-full" style={{ background: shot.fallbackGradient, opacity: 0.8 }} />
                </div>

                {/* Scrim overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                {/* Top Shot Tag */}
                <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between text-[9px] font-mono">
                  <span className={`px-1.5 py-0.5 rounded font-black ${isActive ? 'bg-[#ffaa00] text-black' : 'bg-black/80 text-white'}`}>
                    SH {shot.shotNumber}
                  </span>
                  <span className="text-zinc-300 bg-black/60 px-1 py-0.5 rounded">
                    {shot.durationSec.toFixed(1)}s
                  </span>
                </div>

                {/* Bottom Title Slate */}
                <div className="absolute bottom-1.5 left-1.5 right-1.5 font-mono">
                  <div className="text-xs font-bold text-white font-bangla truncate">
                    {shot.titleBn}
                  </div>
                  <div className="text-[9px] text-zinc-400 truncate">
                    {shot.titleEn}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 5: MULTI-CAM 9-ANGLE GRID EXPANSION */}
      {/* 3x3 synchronized matrix (CAM 01 to CAM 09) with styled standby cards */}
      {/* ========================================================= */}
      {isMultiCamExpanded && (
        <section className="w-full max-w-7xl mx-auto px-4 md:px-8 my-6 animate-in fade-in duration-300">
          <div className="bg-[#0b0c12] border border-[#232330] rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
                <h3 className="font-mono font-extrabold text-sm tracking-wider text-white uppercase">
                  MULTI-CAM 9-ANGLE BROADCAST MATRIX (3x3)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                ACTIVE CUT: <strong className="text-cyan-400">CAM 0{activeCameraAngle}</strong> // 24FPS SYNC
              </span>
            </div>

            {/* 3x3 Grid: CAM 01 to CAM 09 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {MULTICAM_9_ANGLES.map((cam, idx) => {
                const isSelectedAngle = activeCameraAngle === cam.id;
                return (
                  <div
                    key={cam.id}
                    onClick={() => setActiveCameraAngle(cam.id)}
                    className={`relative rounded-xl overflow-hidden aspect-[16/9] flex flex-col justify-between p-3 cursor-pointer transition-all duration-300 ${
                      isSelectedAngle
                        ? 'border-2 border-[#00f0ff] bg-[#091522] shadow-[0_0_24px_rgba(0,240,255,0.4)] scale-101'
                        : 'border border-white/10 bg-[#0d0d16] hover:border-white/30'
                    }`}
                  >
                    {/* If Assigned Stream: Procedural Plate; If Unassigned: Styled Standby Card */}
                    {cam.standby ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07080c] border border-white/5 text-center p-3 select-none">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-2 text-zinc-500">
                          <Video className="w-5 h-5 opacity-40" />
                        </div>
                        <span className="text-xs font-mono font-bold text-white/60 tracking-wider">
                          {cam.label} // STANDBY
                        </span>
                        <span className="text-[9.5px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
                          AWAITING SDI FEED · 24FPS READY
                        </span>
                      </div>
                    ) : (
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-40"
                        style={{
                          backgroundImage: `url(${SHOWCASE_PRESETS[idx % SHOWCASE_PRESETS.length].imageUrl})`
                        }}
                      />
                    )}

                    {/* Top Tally Header */}
                    <div className="relative z-10 flex items-center justify-between text-xs font-mono">
                      <span className={`px-2 py-0.5 rounded font-black ${isSelectedAngle ? 'bg-[#00f0ff] text-black font-extrabold shadow-[0_0_10px_#00f0ff]' : 'bg-black/70 text-zinc-300'}`}>
                        {cam.label}
                      </span>
                      {isSelectedAngle ? (
                        <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[9px] animate-pulse">
                          ● ON AIR
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">
                          STANDBY
                        </span>
                      )}
                    </div>

                    {/* Bottom Specs */}
                    <div className="relative z-10 font-mono text-xs">
                      <div className="text-white font-bold truncate">
                        {cam.name}
                      </div>
                      <div className="text-[9px] text-zinc-400">
                        LATENCY: 0.0ms // LOCAL SILICON
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* SECTION 6: NETFLIX "TOP 10 MASTER SHOTS TODAY" */}
      {/* ========================================================= */}
      <section id="top-10-reels-section" className="relative w-full py-12 md:py-16 border-b border-[#232330]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E50914] animate-pulse" />
                <span className="text-[#E50914] text-xs font-mono font-bold tracking-widest uppercase">
                  DIRECTOR CUTS & MASTER REEL
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-cinzel">
                Top 10 Master Shots Today
              </h2>
            </div>

            <p className="text-white/40 text-xs tracking-wider font-mono">
              STRICT 12.0S (288 FRAMES @ 24FPS) • 2.39:1 OPTICAL SCOPE
            </p>
          </div>

          {/* 10 Vertical Posters with Large Outlined Rank Typography */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {top10Shots.map((frame, index) => {
              const rank = index + 1;
              return (
                <div
                  key={frame.id ?? index}
                  onClick={() => onEnterStudio(index)}
                  className="group relative bg-[#101016] border border-[#232330] hover:border-[#E50914] rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_12px_30px_rgba(229,9,20,0.3)] flex flex-col aspect-[2/3]"
                >
                  {/* Poster Media Image Plate */}
                  <div className="relative flex-1 bg-black overflow-hidden">
                    {frame.imageUrl ? (
                      <img
                        src={frame.imageUrl}
                        alt={frame.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#161622] via-[#0e0e14] to-black text-zinc-600">
                        <Film className="w-8 h-8 mb-2 group-hover:text-[#E50914] transition-colors" />
                        <span className="text-[10px] font-mono tracking-widest uppercase">SHOT {String(rank).padStart(3, '0')}</span>
                      </div>
                    )}

                    {/* Gradient Scrim */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-75 transition-opacity" />

                    {/* Play Action Hover Indicator */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <div className="w-12 h-12 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.8)] transform scale-75 group-hover:scale-100 transition-transform">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 text-[9px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-black/80 text-[#F5A623] font-bold border border-[#F5A623]/30">
                        12.0s
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#E50914]/90 text-white font-bold">
                        4K RAW
                      </span>
                    </div>

                    {/* Massive Outlined Rank Typography (#1 to #10) */}
                    <div 
                      className="absolute -bottom-3 left-1 z-10 select-none pointer-events-none text-7xl sm:text-8xl font-black font-cinzel leading-none tracking-tighter"
                      style={{
                        WebkitTextStroke: '2px #E50914',
                        color: 'transparent',
                        textShadow: '0 0 15px rgba(229,9,20,0.5)'
                      }}
                    >
                      {rank}
                    </div>
                  </div>

                  {/* Bottom Shot Information Slate */}
                  <div className="relative p-3 bg-[#0d0d14] border-t border-[#232330] z-20 space-y-1">
                    <div className="text-right">
                      <span className="text-white/40 text-xs tracking-wider font-mono uppercase">
                        {frame.cameraSpec?.focalLength || '35mm Cine'}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#F5A623] transition-colors truncate">
                      {frame.bengaliTitle || 'সূচনা'} // {frame.title}
                    </h3>
                    <p className="text-white/40 text-xs tracking-wider truncate font-mono">
                      {frame.tagline || '12.0s Narrative Arc Frame'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 7: FEATURE MATRIX ("MORE REASONS TO CREATE ON HANDFILM") */}
      {/* ========================================================= */}
      <section id="feature-matrix-section" className="w-full py-16 border-b border-[#232330] bg-[#07070A]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="max-w-4xl mx-auto text-center mb-12 space-y-3">
            <span className="px-3 py-1 rounded-full bg-[#F5A623]/15 border border-[#F5A623]/40 text-[#F5A623] text-xs font-mono font-bold uppercase tracking-wider">
              HIGH-THROUGHPUT ENGINE SPECIFICATIONS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-cinzel">
              More Reasons to Create on HANDFILM
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto">
              Engineered exclusively for autonomous directors, previz supervisors, and high-fashion cinematographers who require zero-cloud latency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-[#0f0f16] border border-[#232332] hover:border-[#E50914]/60 transition-all duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-[#E50914]/15 border border-[#E50914]/40 flex items-center justify-center text-[#E50914] group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#E50914] font-bold uppercase tracking-wider">SILICON CORE</span>
                <h3 className="text-lg font-bold text-white">Browser-Native Silicon</h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Leverages W3C WebCodecs and client GPU hardware acceleration to composite and render 2.39:1 widescreen video without cloud render bills.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-[#0f0f16] border border-[#232332] hover:border-[#F5A623]/60 transition-all duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-[#F5A623]/15 border border-[#F5A623]/40 flex items-center justify-center text-[#F5A623] group-hover:scale-110 transition-transform">
                <HardDrive className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#F5A623] font-bold uppercase tracking-wider">LOCAL DATA SOVEREIGNTY</span>
                <h3 className="text-lg font-bold text-white">100% Offline IndexedDB</h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Every shot draft, typography layer, and camera telemetry parameter persists in sovereign browser storage. Zero corporate telemetry or tracking.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-[#0f0f16] border border-[#232332] hover:border-[#E50914]/60 transition-all duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-[#E50914]/15 border border-[#E50914]/40 flex items-center justify-center text-[#E50914] group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#E50914] font-bold uppercase tracking-wider">TEMPORAL PRECISION</span>
                <h3 className="text-lg font-bold text-white">Sub-Frame Precision</h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Strict 24fps frame stepping with professional J-K-L deck shuttling, audio transient beat sync, and sub-frame accurate timecodes.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-[#0f0f16] border border-[#232332] hover:border-[#F5A623]/60 transition-all duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-[#F5A623]/15 border border-[#F5A623]/40 flex items-center justify-center text-[#F5A623] group-hover:scale-110 transition-transform">
                <Share2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#F5A623] font-bold uppercase tracking-wider">NLE PIPELINE</span>
                <h3 className="text-lg font-bold text-white">Instant NLE Portability</h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Direct FCP 7 XML and FCPXML exports formatted for immediate drag-and-drop into CapCut Desktop, Adobe Premiere Pro, and DaVinci Resolve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 8: FREQUENTLY ASKED QUESTIONS & MINIMALIST FOOTER */}
      {/* ========================================================= */}
      <section id="director-faqs-section" className="w-full py-16 border-b border-[#232330] bg-[#070709]">
        <div className="max-w-4xl mx-auto px-6 md:px-12 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-cinzel">
              Frequently Asked Questions
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm">
              Answers for autonomous directors, cinematographers, and post-production leads.
            </p>
          </div>

          {/* Accordions */}
          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="border border-[#232330] rounded-xl bg-[#0d0d12] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left text-sm sm:text-base font-semibold text-zinc-100 hover:text-white cursor-pointer select-none"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#E50914] shrink-0 ml-3" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0 ml-3" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-[#1a1a24]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Enter Studio Bottom CTA Banner */}
          <div className="pt-8 text-center">
            <button
              onClick={() => onEnterStudio(0)}
              className="px-8 py-4 rounded-full bg-[#E50914] hover:bg-[#ff1e2b] text-white font-bold text-base inline-flex items-center gap-3 shadow-[0_0_30px_rgba(229,9,20,0.6)] hover:shadow-[0_0_40px_rgba(229,9,20,0.85)] transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>OPEN HANDFILM PRO STUDIO NOW</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column Minimalist Footer */}
      <footer className="w-full mt-12 pt-12 pb-16 border-t border-[#1e1e28] text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-3">
              <span className="font-bold text-white text-sm font-cinzel">HANDFILM</span>
              <ul className="space-y-2">
                <li><button onClick={() => onEnterStudio(0)} className="hover:text-zinc-300">Launch Previs Studio</button></li>
                <li><button onClick={onOpenExportXml} className="hover:text-zinc-300">NLE XML Suite</button></li>
                <li><button onClick={onOpenExportRange} className="hover:text-zinc-300">MP4 WebCodecs Muxer</button></li>
                {onOpenShortcuts && (
                  <li>
                    <button 
                      onClick={onOpenShortcuts} 
                      className="hover:text-[#F5A623] text-left transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="text-[10px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">?</span>
                      <span>Keyboard Shortcuts</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-3">
              <span className="font-bold text-white text-sm font-cinzel">PIPELINE</span>
              <ul className="space-y-2">
                <li><span className="text-zinc-400">CapCut Desktop XML</span></li>
                <li><span className="text-zinc-400">Adobe Premiere Pro FCP7</span></li>
                <li><span className="text-zinc-400">DaVinci Resolve Timeline</span></li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="font-bold text-white text-sm font-cinzel">OPTICAL SCOPE</span>
              <ul className="space-y-2">
                <li><span className="text-zinc-400">2.39:1 Cinema Letterbox</span></li>
                <li><span className="text-zinc-400">Bangla Gold Metallic Bloom</span></li>
                <li><span className="text-zinc-400">DSP Audio Beat Snap</span></li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="font-bold text-white text-sm font-cinzel">SOVEREIGN CORE</span>
              <ul className="space-y-2">
                <li><span className="text-zinc-400">100% Client-Side Silicon</span></li>
                <li><span className="text-zinc-400">Zero Cloud Uploads</span></li>
                <li><span className="text-zinc-400">Hardware GPU Accelerated</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[#181822] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[#E50914] font-bold font-cinzel tracking-wider text-sm">HANDFILM</span>
              <span>—</span>
              <span className="text-zinc-400 font-medium">Built for the cut. Not the queue.</span>
            </div>

            <div className="font-mono text-white/40 text-xs tracking-wider">
              HANDFILM // 12.0S CINEMA PREVIS & NLE ENGINE • 55" 4K WORKSTATION
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
