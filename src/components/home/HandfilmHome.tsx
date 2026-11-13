/**
 * @file /src/components/home/HandfilmHome.tsx
 * @description Sleek, balanced Brutalist flagship HOME showcase for HANDFILM STUDIO.
 * Preserves the asymmetric 62/38 Hero Stage + 10 permanent Bangla & English manifesto slides
 * and Workspace Deck above the fold, followed seamlessly by the restored 1–6 Title Cards,
 * bottom studio architecture overview text, and full Studio Footer & Copyright bar.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  FileCode2,
  Film,
  Keyboard,
  Layers,
  Monitor,
  Pause,
  Play,
  Sliders,
  Volume2,
  Zap,
} from 'lucide-react';
import { AnthologyFrame } from '../../types/anthology';
import { ComponentVisibility } from '../ComponentsMatrixPopover';
import { eventBus } from '../../core/eventBus';

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
  onIngestMediaForFrame?: (index: number, file: File) => void;
  onUpdateFrame?: (frame: AnthologyFrame) => void;
  initialViewMode?: 'desktop' | 'mobile';
}

export interface ManifestoSlide {
  id: string;
  number: string;
  banglaTitle: string;
  englishTagline: string;
  lensMeta: string;
  accentHex: string;
  secondaryHex: string;
}

export interface ShowcaseTitleCard {
  index: number;
  shotCode: string;
  number: string;
  banglaTitle: string;
  englishTitle: string;
  cadenceSubtitle: string;
  styleCategory: string;
  directorNotes: string;
  lensSpec: string;
  lutProfile: string;
  soundCue: string;
  aspectRatio: string;
  durationSec: number;
}

export const MANIFESTO_SLIDES: ManifestoSlide[] = [
  {
    id: 'slide-01',
    number: '01',
    banglaTitle: 'দৃষ্টির সীমানা',
    englishTagline: 'BEYOND THE FRAME // RAW 4K ANAMORPHIC ARCHITECTURE',
    lensMeta: '2.39:1 SCOPE · 35MM ANAMORPHIC',
    accentHex: '#F59E0B',
    secondaryHex: '#E50914',
  },
  {
    id: 'slide-02',
    number: '02',
    banglaTitle: 'সময়ের গতি',
    englishTagline: 'VELOCITY WITHOUT COMPROMISE // LIGHT-SPEED NLE ENGINE',
    lensMeta: '60 FPS · ZERO-COPY OPFS STREAM',
    accentHex: '#FBBF24',
    secondaryHex: '#EA580C',
  },
  {
    id: 'slide-03',
    number: '03',
    banglaTitle: 'আলোর কাব্য',
    englishTagline: 'SCULPTED IN TUNGSTEN & SHADOW // 35MM HALATION SCIENCE',
    lensMeta: '2800K KEY · 35MM HALATION LUT',
    accentHex: '#F59E0B',
    secondaryHex: '#DC2626',
  },
  {
    id: 'slide-04',
    number: '04',
    banglaTitle: 'নিখুঁত ছন্দ',
    englishTagline: 'FRAME-ACCURATE PRECISION // EVERY CUT IS A PULSE',
    lensMeta: '24.0 FPS · SMPTE SUB-FRAME LOCK',
    accentHex: '#F59E0B',
    secondaryHex: '#B91C1C',
  },
  {
    id: 'slide-05',
    number: '05',
    banglaTitle: 'কল্পনার যন্ত্র',
    englishTagline: 'WHERE AI MEETS AUTEUR CINEMA // ZERO LATENCY CREATION',
    lensMeta: 'NEURAL OPTICS · REAL-TIME GRADE',
    accentHex: '#FBBF24',
    secondaryHex: '#E50914',
  },
  {
    id: 'slide-06',
    number: '06',
    banglaTitle: 'বারো সেকেন্ডের ঝড়',
    englishTagline: '12S HYPER-REEL ENGINE // ENGINEERED FOR INSTANT IMPACT',
    lensMeta: '9:16 VERTICAL · 12.0S SEQUENCE',
    accentHex: '#F59E0B',
    secondaryHex: '#EF4444',
  },
  {
    id: 'slide-07',
    number: '07',
    banglaTitle: 'অদম্য শিল্প',
    englishTagline: 'BRUTALIST INDUSTRIAL AESTHETIC // BUILT FOR STORYTELLERS',
    lensMeta: 'OBSIDIAN #08080A · STEALTH UI',
    accentHex: '#F59E0B',
    secondaryHex: '#991B1B',
  },
  {
    id: 'slide-08',
    number: '08',
    banglaTitle: 'প্রতিটি ফ্রেমে প্রাণ',
    englishTagline: 'TRUE 16-BIT COLOR & MOTION // UNCOMPRESSED VISION',
    lensMeta: '16-BIT ARRI · RAW COLOR PIPELINE',
    accentHex: '#FBBF24',
    secondaryHex: '#E50914',
  },
  {
    id: 'slide-09',
    number: '09',
    banglaTitle: 'শব্দের প্রতিধ্বনি',
    englishTagline: 'SUB-HARMONIC AUDIO SYNC // FEEL THE TRANSIENT BEAT',
    lensMeta: '48KHZ DSP · TRANSIENT BEAT SNAP',
    accentHex: '#F59E0B',
    secondaryHex: '#DC2626',
  },
  {
    id: 'slide-10',
    number: '10',
    banglaTitle: 'নতুন যুগের সিনেমা',
    englishTagline: 'HANDFILM STUDIO // ARCHITECT THE FUTURE OF FILM',
    lensMeta: 'MASTER ENGINE · RAW. RAPID. CINEMA.',
    accentHex: '#F59E0B',
    secondaryHex: '#E50914',
  },
];

export const SHOWCASE_TITLE_CARDS: ShowcaseTitleCard[] = [
  {
    index: 0,
    shotCode: 'SH001',
    number: '01',
    banglaTitle: 'সূচনা',
    englishTitle: 'OPENING SEQUENCE // RAW 4K',
    cadenceSubtitle: 'অভ্যুদয় · High Cadence Urban',
    styleCategory: 'Anamorphic Genesis',
    directorNotes:
      'Razor-sharp 18mm ultra-wide push through tungsten haze, crisp transient shutter lock, and sub-harmonic pulse.',
    lensSpec: '35mm Anamorphic T1.4',
    lutProfile: 'Kodak Vision3 500T',
    soundCue: 'Sub-bass pulse 36Hz',
    aspectRatio: '2.39:1',
    durationSec: 12.0,
  },
  {
    index: 1,
    shotCode: 'SH002',
    number: '02',
    banglaTitle: 'সীমানা',
    englishTitle: 'EVENT HORIZON // 35MM FILM',
    cadenceSubtitle: 'প্রান্তরেখা · Fast Optical Clean',
    styleCategory: 'Optical Perimeter',
    directorNotes:
      'Boundary definition between observer and subject with molten amber rim light and rhythmic frame gating.',
    lensSpec: '50mm Prime f/1.2',
    lutProfile: 'Golden Hour 2800K',
    soundCue: 'Gravitational sweep',
    aspectRatio: '2.39:1',
    durationSec: 12.0,
  },
  {
    index: 2,
    shotCode: 'SH003',
    number: '03',
    banglaTitle: 'আলো',
    englishTitle: 'SOLAR CORONA // NOCTILUX',
    cadenceSubtitle: 'দীপ্তি · Executive & Sharp',
    styleCategory: 'Photon Field',
    directorNotes:
      'High-contrast specular highlight roll-off across brutalist steel textures with precision optical flare.',
    lensSpec: '100mm Macro Probe T2.8',
    lutProfile: 'Neo-Noir Chiaroscuro',
    soundCue: 'Resonant glass shimmer',
    aspectRatio: '2.39:1',
    durationSec: 12.0,
  },
  {
    index: 3,
    shotCode: 'SH004',
    number: '04',
    banglaTitle: 'সংঘাত',
    englishTitle: 'VELOCITY IMPACT // ZERO BLUR',
    cadenceSubtitle: 'কম্পন · Kinetic Cinema',
    styleCategory: 'Kinetic Tension',
    directorNotes:
      '1/1000s high-shutter kinetic freeze paired with rapid whip-pan transitions and low-end visceral punch.',
    lensSpec: '24mm Master Anamorphic',
    lutProfile: 'Bleach Bypass 35mm',
    soundCue: 'Low-end impact transient',
    aspectRatio: '2.39:1',
    durationSec: 12.0,
  },
  {
    index: 4,
    shotCode: 'SH005',
    number: '05',
    banglaTitle: 'দৃষ্টি',
    englishTitle: 'SILENT GAZE // CLOSER 85MM',
    cadenceSubtitle: 'অন্তর্দৃষ্টি · Hypnotic Focus',
    styleCategory: 'Macro Portrait',
    directorNotes:
      'Shallow f/1.2 depth-of-field isolation capturing subtle micro-expressions under warm studio key light.',
    lensSpec: '85mm Noctilux f/1.2',
    lutProfile: 'Fuji Eterna Warm',
    soundCue: 'Close-mic warm drone',
    aspectRatio: '2.39:1',
    durationSec: 12.0,
  },
  {
    index: 5,
    shotCode: 'SH006',
    number: '06',
    banglaTitle: 'উন্মোচন',
    englishTitle: 'END SEQUENCE // 4K BROADCAST',
    cadenceSubtitle: 'নির্বাণ · Ambient Outro',
    styleCategory: 'Floating Glass Outro',
    directorNotes:
      'Soft diffusion blur fade in a floating frosted glass capsule, gentle vertical drift, and sub-bass ducking synchronization.',
    lensSpec: '40mm Cooke Anamorphic',
    lutProfile: 'RAWx Clean Master',
    soundCue: 'Sub-bass ducking swell',
    aspectRatio: '2.39:1',
    durationSec: 12.0,
  },
];

interface BokehParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  hue: 'amber' | 'crimson' | 'warm';
  phase: number;
}

const SLIDE_INTERVAL_MS = 5500;

export const HandfilmHome: React.FC<HandfilmHomeProps> = ({
  frames = [],
  onEnterStudio,
  onLaunchStudio,
  onOpenExportXml,
  onOpenExportRange,
  onOpenShortcuts,
  onExport,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isAutoCycling, setIsAutoCycling] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [cycleSeed, setCycleSeed] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  const activeSlide = MANIFESTO_SLIDES[activeIndex] ?? MANIFESTO_SLIDES[0];

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReducedMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    if (!isAutoCycling || prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MANIFESTO_SLIDES.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isAutoCycling, prefersReducedMotion, cycleSeed]);

  const handleSelectSlide = useCallback((index: number) => {
    const normalized =
      ((index % MANIFESTO_SLIDES.length) + MANIFESTO_SLIDES.length) % MANIFESTO_SLIDES.length;
    setActiveIndex(normalized);
    setCycleSeed((s) => s + 1);
  }, []);

  const enterWorkspace = useCallback(() => {
    if (onLaunchStudio) {
      onLaunchStudio();
    } else {
      onEnterStudio(0);
    }
  }, [onEnterStudio, onLaunchStudio]);

  const openPanel = useCallback(
    (panel: 'TACTILE_STAGE' | 'SPLIT' | 'SEQUENCER' | 'MULTICAM') => {
      if (onLaunchStudio) {
        onLaunchStudio();
      } else {
        onEnterStudio(0);
      }
      eventBus.emit('studio:select_panel', { panel });
    },
    [onEnterStudio, onLaunchStudio]
  );

  const openCockpit = useCallback(() => {
    enterWorkspace();
    window.setTimeout(() => {
      eventBus.emit('cockpit:action', { type: 'open_modal' });
    }, 60);
  }, [enterWorkspace]);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, [prefersReducedMotion]);

  // 60fps generative optical bokeh + light-leak canvas backdrop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;

    const particles: BokehParticle[] = Array.from({ length: 24 }, (_, idx) => ({
      x: ((idx * 173) % 100) / 100,
      y: ((idx * 97) % 100) / 100,
      vx: (((idx % 5) - 2) * 0.00018) || 0.00012,
      vy: (((idx % 7) - 3) * 0.00014) || -0.00011,
      radius: 26 + (idx % 6) * 22,
      alpha: 0.06 + (idx % 4) * 0.035,
      hue: idx % 3 === 0 ? 'crimson' : idx % 3 === 1 ? 'amber' : 'warm',
      phase: idx * 0.7,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawFrame = (timeMs: number) => {
      if (width === 0 || height === 0) return;
      const t = timeMs * 0.001;

      ctx.clearRect(0, 0, width, height);

      const baseGrad = ctx.createLinearGradient(0, 0, width, height);
      baseGrad.addColorStop(0, '#070709');
      baseGrad.addColorStop(0.55, '#0C0B0F');
      baseGrad.addColorStop(1, '#08080A');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, width, height);

      const flareX1 = width * (0.24 + Math.sin(t * 0.28) * 0.07);
      const flareY1 = height * (0.36 + Math.cos(t * 0.22) * 0.06);
      const amberLeak = ctx.createRadialGradient(flareX1, flareY1, 10, flareX1, flareY1, width * 0.56);
      amberLeak.addColorStop(0, 'rgba(245, 158, 11, 0.24)');
      amberLeak.addColorStop(0.42, 'rgba(217, 119, 6, 0.09)');
      amberLeak.addColorStop(1, 'rgba(8, 8, 10, 0)');
      ctx.fillStyle = amberLeak;
      ctx.fillRect(0, 0, width, height);

      const flareX2 = width * (0.78 + Math.cos(t * 0.25) * 0.08);
      const flareY2 = height * (0.68 + Math.sin(t * 0.2) * 0.07);
      const crimsonLeak = ctx.createRadialGradient(flareX2, flareY2, 10, flareX2, flareY2, width * 0.52);
      crimsonLeak.addColorStop(0, 'rgba(229, 9, 20, 0.20)');
      crimsonLeak.addColorStop(0.45, 'rgba(185, 28, 28, 0.07)');
      crimsonLeak.addColorStop(1, 'rgba(8, 8, 10, 0)');
      ctx.fillStyle = crimsonLeak;
      ctx.fillRect(0, 0, width, height);

      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -0.1) p.x = 1.1;
          if (p.x > 1.1) p.x = -0.1;
          if (p.y < -0.1) p.y = 1.1;
          if (p.y > 1.1) p.y = -0.1;
        }
        const px = p.x * width;
        const py = p.y * height;
        const pulse = 0.8 + 0.2 * Math.sin(t * 0.9 + p.phase);
        const r = p.radius * pulse;
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        const color =
          p.hue === 'crimson'
            ? `rgba(229, 9, 20, ${p.alpha})`
            : p.hue === 'amber'
            ? `rgba(245, 158, 11, ${p.alpha})`
            : `rgba(251, 191, 36, ${p.alpha * 0.85})`;
        g.addColorStop(0, color);
        g.addColorStop(0.65, color);
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const streakY = height * (0.44 + Math.sin(t * 0.16) * 0.02);
      const streakGrad = ctx.createLinearGradient(0, streakY, width, streakY);
      streakGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
      streakGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.10)');
      streakGrad.addColorStop(0.65, 'rgba(229, 9, 20, 0.08)');
      streakGrad.addColorStop(1, 'rgba(229, 9, 20, 0)');
      ctx.fillStyle = streakGrad;
      ctx.fillRect(0, streakY - 1, width, 2);
    };

    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    if (prefersReducedMotion) {
      drawFrame(0);
    } else {
      const loop = (now: number) => {
        drawFrame(now);
        rafId = window.requestAnimationFrame(loop);
      };
      rafId = window.requestAnimationFrame(loop);
    }

    return () => {
      ro?.disconnect();
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion]);

  const deckCards = [
    {
      index: '01',
      title: 'STAGE',
      subtitle: '2.39:1 & 16:9 Cinema Monitor + Real-Time Canvas',
      icon: Monitor,
      accent: 'text-[#F59E0B]',
      onClick: () => openPanel('TACTILE_STAGE'),
    },
    {
      index: '02',
      title: '12s REELS',
      subtitle: '9:16 Vertical Split Sequencer & Hyper-Reel Engine',
      icon: Film,
      accent: 'text-[#F59E0B]',
      onClick: () => openPanel('SPLIT'),
    },
    {
      index: '03',
      title: 'SCRUB',
      subtitle: 'Sub-Frame Precision Scrubber & Keyframe Curves',
      icon: Sliders,
      accent: 'text-[#F59E0B]',
      onClick: () => openPanel('SEQUENCER'),
    },
    {
      index: '04',
      title: 'COCKPIT',
      subtitle: 'Premiere XML, CapCut Pack, Photoshop & Ai Bridge',
      icon: Cpu,
      accent: 'text-[#E50914]',
      onClick: openCockpit,
    },
  ];

  const loadedShotCount = frames.filter((f) =>
    Boolean(f.videoSrc || f.videoUrl || f.imageUrl || f.blobUrl)
  ).length;

  return (
    <main
      ref={scrollContainerRef}
      data-testid="handfilm-home-showcase"
      className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden bg-[#08080A] text-[#F4F4F5] select-none"
    >
      <div className="mx-auto w-full max-w-[1680px] flex flex-col gap-6 p-3 sm:p-4 lg:p-5">
        {/* SECTION 1: ABOVE-THE-FOLD 62/38 HERO SHOWCASE + 10-SLIDE SELECTOR BAR */}
        <section
          aria-label="Hero Showcase and Manifesto Slider"
          className="flex flex-col gap-2.5 lg:min-h-[calc(100vh-70px)]"
        >
          {/* Top 62 / 38 Brutalist Asymmetric Split */}
          <div className="flex-1 min-h-[400px] grid grid-cols-1 lg:grid-cols-[62fr_38fr] gap-3">
            {/* LEFT / CENTER HERO STAGE (62%) */}
            <section
              aria-label="Manifesto Hero Stage"
              className="relative min-h-[340px] lg:min-h-0 flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#0B0B0E] overflow-hidden p-5 sm:p-7"
            >
              <canvas
                ref={canvasRef}
                aria-hidden="true"
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none opacity-[0.045] mix-blend-overlay"
                style={{
                  backgroundImage:
                    'radial-gradient(rgba(255,255,255,0.6) 0.5px, transparent 0.5px)',
                  backgroundSize: '3px 3px',
                }}
              />

              <div
                aria-hidden="true"
                className="absolute inset-4 pointer-events-none border border-white/[0.04] rounded-lg"
              />

              {/* Top Bar: Clean Slide Telemetry + Cycle Controls */}
              <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.18em] uppercase text-[#A1A1AA] tabular-nums">
                  <span className="text-[#F59E0B] font-bold">
                    SLIDE {activeSlide.number} / 10
                  </span>
                  <span className="text-white/20">|</span>
                  <span className="text-[#D4D4D8]">{activeSlide.lensMeta}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectSlide(activeIndex - 1)}
                    aria-label="Previous manifesto slide"
                    className="w-7 h-7 rounded-md border border-white/[0.1] bg-black/50 hover:border-[#F59E0B]/60 hover:text-[#F59E0B] text-[#D4D4D8] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAutoCycling((prev) => !prev)}
                    aria-label={isAutoCycling ? 'Pause slide auto-cycle' : 'Play slide auto-cycle'}
                    className="h-7 px-2.5 rounded-md border border-white/[0.1] bg-black/50 hover:border-[#F59E0B]/60 text-[10px] font-mono tracking-[0.14em] uppercase text-[#E4E4E7] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isAutoCycling && !prefersReducedMotion ? (
                      <>
                        <Pause className="w-3 h-3 text-[#F59E0B]" />
                        <span>AUTO</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 text-[#F59E0B]" />
                        <span>PAUSED</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectSlide(activeIndex + 1)}
                    aria-label="Next manifesto slide"
                    className="w-7 h-7 rounded-md border border-white/[0.1] bg-black/50 hover:border-[#F59E0B]/60 hover:text-[#F59E0B] text-[#D4D4D8] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Center-Lower Editorial Manifesto Stack */}
              <div
                key={activeSlide.id}
                className="relative z-10 my-auto py-4 max-w-3xl flex flex-col items-start gap-3 animate-hero-fade"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-[2px] w-7 bg-[#F59E0B]" />
                  <span className="font-mono text-[10px] tracking-[0.26em] uppercase text-[#F59E0B] tabular-nums">
                    MANIFESTO #{activeSlide.number}
                  </span>
                </div>

                <h1
                  className="font-bangla font-black tracking-tight text-[#FAFAFA] leading-[1.08] break-words [text-wrap:balance]"
                  style={{
                    fontSize: 'clamp(2.15rem, 4vw, 3.85rem)',
                    textShadow: '0 8px 34px rgba(0,0,0,0.85)',
                  }}
                >
                  {activeSlide.banglaTitle}
                </h1>

                <div className="w-24 h-px bg-gradient-to-r from-[#F59E0B] via-[#E50914] to-transparent" />

                <p className="font-space-grotesk text-[12px] sm:text-[14px] font-semibold tracking-[0.2em] uppercase text-[#D4D4D8] leading-relaxed break-words">
                  {activeSlide.englishTagline}
                </p>
              </div>

              {/* Bottom Progress Indicators inside Hero Stage */}
              <div className="relative z-10 flex items-center justify-between gap-4 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5 flex-1">
                  {MANIFESTO_SLIDES.map((slide, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => handleSelectSlide(idx)}
                        aria-label={`Select slide ${slide.number}: ${slide.banglaTitle}`}
                        className={`h-1 rounded-full transition-all cursor-pointer ${
                          isActive
                            ? 'flex-[2.4] bg-[#F59E0B]'
                            : 'flex-1 bg-white/15 hover:bg-white/35'
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#71717A] tabular-nums shrink-0">
                  {frames.length > 0 ? `${frames.length} SHOTS READY` : 'STUDIO READY'}
                  {loadedShotCount > 0 ? ` · ${loadedShotCount} BOUND` : ''}
                </span>
              </div>
            </section>

            {/* RIGHT INTERACTIVE SHOWCASE DECK (38%) */}
            <aside
              aria-label="Studio Workspace Showcase Deck"
              className="min-h-0 flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#0B0B0E] p-4 sm:p-5 gap-3"
            >
              <div className="flex items-start justify-between gap-3 pb-2 border-b border-white/[0.07]">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-[#F59E0B]">
                    WORKSPACE DECK
                  </div>
                  <h2 className="font-space-grotesk text-[16px] font-bold tracking-tight text-[#F4F4F5] mt-0.5">
                    Direct Studio Modules
                  </h2>
                </div>
                <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#71717A] tabular-nums pt-1">
                  4 NODES
                </span>
              </div>

              <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 content-stretch">
                {deckCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.title}
                      type="button"
                      onClick={card.onClick}
                      className="group w-full text-left rounded-lg border border-white/[0.08] bg-[#101014] hover:bg-[#15151B] hover:border-[#F59E0B]/60 px-3.5 py-2 flex items-center justify-between gap-3 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-md border border-white/[0.08] bg-[#08080A] group-hover:border-[#F59E0B]/50 flex items-center justify-center shrink-0 transition-colors">
                          <Icon className={`w-4 h-4 ${card.accent}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-[#71717A] tabular-nums">
                              {card.index}
                            </span>
                            <span className="font-space-grotesk text-[13px] font-bold tracking-[0.08em] uppercase text-[#F4F4F5] group-hover:text-[#F59E0B] transition-colors">
                              {card.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#A1A1AA] truncate mt-0.5">
                            {card.subtitle}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#52525B] group-hover:text-[#F59E0B] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.07]">
                <button
                  type="button"
                  onClick={enterWorkspace}
                  className="w-full h-10 px-4 rounded-lg bg-[#F59E0B] hover:bg-[#FBBF24] text-[#08080A] font-space-grotesk font-extrabold text-[12px] tracking-[0.16em] uppercase flex items-center justify-between transition-colors shadow-[0_0_24px_rgba(245,158,11,0.22)] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 fill-current" />
                    <span>ENTER STUDIO WORKSPACE</span>
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onOpenExportXml}
                    className="h-8 px-2.5 rounded-md border border-white/[0.08] bg-[#101014] hover:border-white/25 text-[10px] font-mono tracking-[0.1em] uppercase text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileCode2 className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>PREMIERE XML</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenShortcuts?.()}
                    className="h-8 px-2.5 rounded-md border border-white/[0.08] bg-[#101014] hover:border-white/25 text-[10px] font-mono tracking-[0.1em] uppercase text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Keyboard className="w-3.5 h-3.5 text-[#A1A1AA]" />
                    <span>SHORTCUTS</span>
                  </button>
                </div>
              </div>
            </aside>
          </div>

          {/* Clean Bottom 10-Slide Selector Bar */}
          <nav
            aria-label="10 Manifesto Slides"
            className="shrink-0 grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 pb-1"
          >
            {MANIFESTO_SLIDES.map((slide, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => handleSelectSlide(idx)}
                  aria-pressed={isActive}
                  className={`group rounded-lg border px-2.5 py-1.5 text-left transition-all cursor-pointer flex flex-col justify-between gap-0.5 min-w-0 ${
                    isActive
                      ? 'border-[#F59E0B] bg-[#F59E0B]/[0.12] text-[#FAFAFA]'
                      : 'border-white/[0.07] bg-[#0D0D11] hover:border-white/20 hover:bg-[#131319] text-[#A1A1AA]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span
                      className={`font-mono text-[10px] font-bold tabular-nums ${
                        isActive ? 'text-[#F59E0B]' : 'text-[#71717A] group-hover:text-[#D4D4D8]'
                      }`}
                    >
                      #{slide.number}
                    </span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isActive ? 'bg-[#F59E0B]' : 'bg-white/10 group-hover:bg-white/25'
                      }`}
                    />
                  </div>
                  <span
                    className={`font-bangla text-[12px] font-bold truncate w-full ${
                      isActive ? 'text-[#FAFAFA]' : 'text-[#D4D4D8]'
                    }`}
                  >
                    {slide.banglaTitle}
                  </span>
                </button>
              );
            })}
          </nav>
        </section>

        {/* SECTION 2: RESTORED 1–6 TITLE CARDS (SHOTS 01–06 MASTER SEQUENCE) */}
        <section
          aria-label="Shots 01 to 06 Title Cards"
          className="flex flex-col gap-4 pt-4 border-t border-white/[0.08]"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-[#F59E0B]">
                MASTER ANTHOLOGY SEQUENCE · SHOTS 01–06
              </div>
              <h2 className="font-space-grotesk text-[22px] sm:text-[26px] font-bold tracking-tight text-[#F4F4F5] mt-1">
                1–6 Cinematic Title Cards
              </h2>
              <p className="text-[13px] text-[#A1A1AA] mt-1 max-w-2xl leading-relaxed">
                Select any opening sequence card to launch directly into that shot inside the
                Stage timeline with calibrated 24fps grading, dual-language Bangla/English title
                presets, and 12.0s optical timing.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onEnterStudio(0)}
              className="self-start sm:self-auto h-9 px-4 rounded-lg border border-white/[0.12] bg-[#101014] hover:border-[#F59E0B] hover:text-[#F59E0B] font-mono text-[11px] tracking-[0.14em] uppercase text-[#E4E4E7] flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>OPEN TIMELINE IN STUDIO</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {SHOWCASE_TITLE_CARDS.map((card) => {
              const boundFrame = frames[card.index];
              const previewThumb = boundFrame?.thumbnailUrl || boundFrame?.imageUrl || '';
              const resolvedBn = boundFrame?.bengaliTitle?.trim() || card.banglaTitle;
              const resolvedEn = boundFrame?.title?.trim() || card.englishTitle;
              const resolvedNotes = boundFrame?.directorNotes?.trim() || card.directorNotes;
              const resolvedAspect = boundFrame?.aspectRatio || card.aspectRatio;
              const resolvedDuration = boundFrame?.durationSec ?? card.durationSec;

              return (
                <button
                  key={card.shotCode}
                  type="button"
                  onClick={() => onEnterStudio(card.index)}
                  data-testid={`title-card-${card.number}`}
                  className="group text-left rounded-xl border border-white/[0.08] bg-[#0B0B0E] hover:bg-[#111116] hover:border-[#F59E0B]/60 overflow-hidden flex flex-col justify-between transition-all cursor-pointer"
                >
                  {/* Visual Plate Header */}
                  <div className="relative h-36 w-full overflow-hidden border-b border-white/[0.06] bg-gradient-to-br from-[#0F0E12] via-[#0A0A0D] to-[#17110B] p-4 flex flex-col justify-between">
                    {previewThumb ? (
                      <img
                        src={previewThumb}
                        alt={resolvedEn}
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover opacity-45 group-hover:opacity-60 group-hover:scale-[1.03] transition-all duration-300"
                      />
                    ) : null}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E] via-[#0B0B0E]/45 to-transparent"
                    />

                    {/* Top Clean Telemetry Line (No Pills) */}
                    <div className="relative z-10 flex items-center justify-between gap-2 font-mono text-[10px] tracking-[0.16em] uppercase text-[#A1A1AA] tabular-nums">
                      <span className="text-[#F59E0B] font-bold">
                        {card.shotCode} · #{card.number}
                      </span>
                      <span>
                        {resolvedAspect} · {Number(resolvedDuration).toFixed(1)}s
                      </span>
                    </div>

                    {/* Hero Bangla Title on Plate */}
                    <div className="relative z-10 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA]">
                          {card.styleCategory}
                        </div>
                        <h3 className="font-bangla text-[28px] font-black leading-[1.1] text-[#FAFAFA] group-hover:text-[#FBBF24] transition-colors truncate mt-0.5">
                          {resolvedBn}
                        </h3>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#71717A] group-hover:text-[#F59E0B] group-hover:translate-x-0.5 transition-all shrink-0 mb-1" />
                    </div>
                  </div>

                  {/* Card Body Text */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <div className="font-space-grotesk text-[13px] font-bold tracking-[0.08em] uppercase text-[#F4F4F5]">
                        {resolvedEn}
                      </div>
                      <div className="font-bangla text-[12px] text-[#F59E0B]/90 mt-1">
                        {card.cadenceSubtitle}
                      </div>
                      <p className="text-[12.5px] text-[#A1A1AA] leading-relaxed mt-2">
                        {resolvedNotes}
                      </p>
                    </div>

                    {/* Unboxed Bottom Technical Metadata */}
                    <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 font-mono text-[10px] text-[#71717A] tabular-nums">
                      <span className="truncate">
                        {card.lensSpec} · {card.lutProfile}
                      </span>
                      <span className="text-[#D4D4D8] group-hover:text-[#F59E0B] shrink-0 transition-colors">
                        {card.soundCue}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* SECTION 3: ALL EDITORIAL & ARCHITECTURE OVERVIEW TEXT */}
        <section
          aria-label="Handfilm Studio Architecture Overview"
          className="rounded-xl border border-white/[0.08] bg-[#0B0B0E] p-5 sm:p-7 flex flex-col gap-6"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/[0.07]">
            <div>
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-[#F59E0B]">
                STUDIO ARCHITECTURE · RAW. RAPID. CINEMA.
              </div>
              <h2 className="font-space-grotesk text-[20px] sm:text-[24px] font-bold tracking-tight text-[#F4F4F5] mt-1">
                Built for Autonomous Directors & Zero-Latency 4K Storytelling
              </h2>
            </div>
            <div className="font-mono text-[11px] text-[#71717A] tabular-nums shrink-0">
              24.0 FPS SMPTE · ZERO-CLOUD OPFS VAULT · 100 SHOTS
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <article className="flex flex-col gap-2">
              <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-[#F4F4F5]">
                <Layers className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>12.0s Sequence & Cinema Player</span>
              </div>
              <p className="text-[13px] text-[#A1A1AA] leading-relaxed">
                Audition up to 100 storyboard plates in synchronized 12.0-second animatic loops,
                then switch instantaneously into unconstrained long-form playback, multi-camera
                quad monitoring, and frame-accurate keyframe scrubbing.
              </p>
            </article>

            <article className="flex flex-col gap-2">
              <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-[#F4F4F5]">
                <Volume2 className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>Bilingual Kinetic Title Engine</span>
              </div>
              <p className="text-[13px] text-[#A1A1AA] leading-relaxed">
                Unified 15-preset typography engine built for native Bangla ligature shaping and
                wide-tracked English cinema headers, complete with per-shot alignment, halation
                glow, and synchronized Canvas 4K video compositing.
              </p>
            </article>

            <article className="flex flex-col gap-2">
              <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-[#F4F4F5]">
                <Download className="w-4 h-4 text-[#E50914] shrink-0" />
                <span>Direct NLE & App Interchange</span>
              </div>
              <p className="text-[13px] text-[#A1A1AA] leading-relaxed">
                Keep 100% of raw media inside browser-native IndexedDB and OPFS storage while
                exporting Final Cut Pro 7 XML for Premiere Pro, CapCut Quick-Packs, live edits to
                Photoshop/Illustrator, and hardware-accelerated MP4/WebM masters.
              </p>
            </article>
          </div>
        </section>

        {/* SECTION 4: BRUTALIST STUDIO FOOTER & COPYRIGHT INFORMATION */}
        <footer
          aria-label="Handfilm Studio Footer and Copyright"
          className="rounded-xl border border-white/[0.08] bg-[#060608] px-5 py-6 sm:px-7 sm:py-7 flex flex-col gap-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Brand Statement */}
            <div className="md:col-span-5 flex flex-col gap-2">
              <div className="flex items-baseline gap-2.5">
                <span className="font-space-grotesk text-[16px] font-black tracking-[0.14em] uppercase text-[#FAFAFA]">
                  HANDFILM <span className="text-[#E50914]">STUDIO</span>
                </span>
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#F59E0B]">
                  RAW. RAPID. CINEMA.
                </span>
              </div>
              <p className="text-[12.5px] text-[#A1A1AA] leading-relaxed max-w-md">
                Autonomous browser-native pre-visualization, 4K storyboard anthology engine,
                and real-time NLE interchange suite crafted for independent filmmakers and
                creative directors.
              </p>
            </div>

            {/* Workspaces Links */}
            <div className="md:col-span-3 flex flex-col gap-2">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#71717A]">
                WORKSPACES
              </div>
              <div className="flex flex-wrap md:flex-col items-start gap-x-4 gap-y-1.5 text-[12px] text-[#D4D4D8]">
                <button
                  type="button"
                  onClick={() => openPanel('TACTILE_STAGE')}
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer"
                >
                  Cinema Stage Monitor
                </button>
                <button
                  type="button"
                  onClick={() => openPanel('SPLIT')}
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer"
                >
                  12s Hyper-Reels Sequencer
                </button>
                <button
                  type="button"
                  onClick={() => openPanel('SEQUENCER')}
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer"
                >
                  Precision Scrub Timeline
                </button>
                <button
                  type="button"
                  onClick={() => openPanel('MULTICAM')}
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer"
                >
                  Multi-Cam Live Matrix
                </button>
              </div>
            </div>

            {/* Export & Pipeline Links */}
            <div className="md:col-span-4 flex flex-col gap-2">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#71717A]">
                EXPORT & INTERCHANGE
              </div>
              <div className="flex flex-wrap md:flex-col items-start gap-x-4 gap-y-1.5 text-[12px] text-[#D4D4D8]">
                <button
                  type="button"
                  onClick={() => (onOpenExportRange ? onOpenExportRange() : onExport?.())}
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer"
                >
                  4K MP4 / WebM Master Render
                </button>
                <button
                  type="button"
                  onClick={onOpenExportXml}
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer"
                >
                  Premiere Pro & FCP7 XML Export
                </button>
                <button
                  type="button"
                  onClick={openCockpit}
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer"
                >
                  Director Cockpit (Ps / Pr / Ai / CapCut)
                </button>
                <button
                  type="button"
                  onClick={() => onOpenShortcuts?.()}
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer"
                >
                  Keyboard Shortcuts Reference
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Row */}
          <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] font-mono text-[#71717A]">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-[#D4D4D8]">
                © 2026 HANDFILM STUDIO · HANDS &amp; HEAD CREATIVE GROUP. All Rights Reserved.
              </span>
              <span className="text-white/20">·</span>
              <span>Directed &amp; Engineered by Rakib Himon · DHAKA_01</span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={enterWorkspace}
                className="text-[#F59E0B] hover:text-[#FBBF24] uppercase tracking-[0.14em] transition-colors cursor-pointer"
              >
                Launch Studio
              </button>
              <span className="text-white/20">|</span>
              <button
                type="button"
                onClick={scrollToTop}
                className="text-[#A1A1AA] hover:text-[#F4F4F5] uppercase tracking-[0.14em] inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowUp className="w-3 h-3" />
                <span>Top</span>
              </button>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
};

export default HandfilmHome;
