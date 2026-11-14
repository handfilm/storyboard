/**
 * @file /src/components/home/HandfilmHome.tsx
 * @description Master Brutalist & Cinematic Showcase HOME Page for HANDFILM STUDIO.
 * Combines the asymmetric 62/38 Hero Stage (10 permanent Bangla/English manifesto slides +
 * Workspace Deck + 10-slide selector bar) with the full Top 10 Master Shots grid (1–10 giant
 * outlined crimson numbers matching the cinema card deck), High-Throughput Engine Specifications
 * ("More Reasons to Create on HANDFILM"), Interactive FAQs accordion, and 4-column Studio Footer
 * with full copyright & studio metadata.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Cpu,
  FileCode2,
  Film,
  HardDrive,
  Keyboard,
  Monitor,
  Pause,
  Play,
  Share2,
  Sliders,
  Zap,
} from 'lucide-react';
import { AnthologyFrame } from '../../types/anthology';
import { ComponentVisibility } from '../ComponentsMatrixPopover';
import { eventBus } from '../../core/eventBus';
import { CinemaBadgeHeader, CinemaToolHUD } from '../ui/CinemaToolHUD';

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

export interface MasterShotCardDefault {
  index: number;
  banglaTitle: string;
  englishTitle: string;
  tagline: string;
  focalLength: string;
  durationSec: number;
  aspectRatio: string;
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

const MASTER_SHOT_DEFAULTS: MasterShotCardDefault[] = [
  {
    index: 0,
    banglaTitle: 'সূচনা',
    englishTitle: 'OPENING SEQUENCE // RAW 4K',
    tagline: 'Split-second optical impact.',
    focalLength: '18MM CINEMA ULTRA-WIDE',
    durationSec: 12.0,
    aspectRatio: '2.39:1',
  },
  {
    index: 1,
    banglaTitle: 'সীমানা',
    englishTitle: 'EVENT HORIZON // 35MM FILM',
    tagline: 'A continuous loop of perfection.',
    focalLength: '28MM ANAMORPHIC PRIME',
    durationSec: 12.0,
    aspectRatio: '2.39:1',
  },
  {
    index: 2,
    banglaTitle: 'আলো',
    englishTitle: 'SOLAR CORONA // NOCTILUX',
    tagline: 'Zero latency kinetic displacement.',
    focalLength: '35MM HIGH-SPEED MASTER',
    durationSec: 12.0,
    aspectRatio: '2.39:1',
  },
  {
    index: 3,
    banglaTitle: 'সংঘাত',
    englishTitle: 'VELOCITY IMPACT // ZERO BLUR',
    tagline: 'Every detail amplified.',
    focalLength: '50MM F/1.2 NOCTILUX',
    durationSec: 12.0,
    aspectRatio: '2.39:1',
  },
  {
    index: 4,
    banglaTitle: 'দৃষ্টি',
    englishTitle: 'SILENT GAZE // CLOSER 85MM',
    tagline: 'Every detail amplified.',
    focalLength: '85MM F/1.4 PORTRAIT',
    durationSec: 12.0,
    aspectRatio: '2.39:1',
  },
  {
    index: 5,
    banglaTitle: 'উন্মোচন',
    englishTitle: 'END SEQUENCE // 4K BROADCAST',
    tagline: 'Visual Physics at Work.',
    focalLength: '100MM F/2.8 MACRO PROBE',
    durationSec: 12.0,
    aspectRatio: '2.39:1',
  },
  {
    index: 6,
    banglaTitle: 'অন্ধকার',
    englishTitle: 'SHADOW ARCHITECTURE // NOIR',
    tagline: 'Split-second optical impact.',
    focalLength: '135MM F/2.0 TELEPHOTO',
    durationSec: 12.0,
    aspectRatio: '2.39:1',
  },
  {
    index: 7,
    banglaTitle: 'মিশ্রণ',
    englishTitle: 'SPECTRAL DRIFT // ANAMORPHIC',
    tagline: 'Split-second optical impact.',
    focalLength: '18MM CINEMA ULTRA-WIDE',
    durationSec: 12.0,
    aspectRatio: '2.39:1',
  },
  {
    index: 8,
    banglaTitle: 'গতি',
    englishTitle: 'HYPER CADENCE // RAWX CUT',
    tagline: 'Zero latency kinetic displacement.',
    focalLength: '28MM ANAMORPHIC PRIME',
    durationSec: 12.0,
    aspectRatio: '2.39:1',
  },
  {
    index: 9,
    banglaTitle: 'গ্রহণ',
    englishTitle: 'MASTER ARCHIVE // SOVEREIGN',
    tagline: 'Visual Physics at Work.',
    focalLength: '35MM HIGH-SPEED MASTER',
    durationSec: 12.0,
    aspectRatio: '2.39:1',
  },
];

const DIRECTOR_FAQS = [
  {
    q: 'Why 12.0 seconds (288 frames @ 24fps) per shot?',
    a: '12 seconds is the golden temporal anchor for narrative previs and montage pacing. At 24 frames per second, exactly 288 frames give directors enough breathing room to judge cinematic staging, anamorphic blocking, and bilingual typography without losing dramatic momentum.',
  },
  {
    q: 'How does 100% Client-Side WebCodecs export work?',
    a: 'HANDFILM binds directly to your hardware GPU via the modern W3C WebCodecs and MP4-Muxer APIs. Every frame is rasterized locally at full 2.39:1 resolution with zero cloud uploads, zero remote render farm fees, and instant turnaround.',
  },
  {
    q: 'Can I export native XML timelines to Premiere Pro, CapCut, or DaVinci Resolve?',
    a: 'Yes. HANDFILM includes a Hollywood-standard FCP 7 XML and FCPXML timeline generator. With a single click, your entire 100-shot montage—complete with audio cue markers, track metadata, and timecodes—is transferred directly into CapCut Desktop, Adobe Premiere Pro, or DaVinci Resolve.',
  },
  {
    q: 'Is any storyboard footage, script data, or audio uploaded to an external server?',
    a: 'Never. HANDFILM is built with a Sovereign Local Silicon philosophy. All assets, text cues, and color grades live securely in your browser persistent IndexedDB & OPFS storage. Your media never leaves your hardware.',
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
  onIngestMediaForFrame,
  onExport,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isAutoCycling, setIsAutoCycling] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [cycleSeed, setCycleSeed] = useState<number>(0);
  const [dragHoverIndex, setDragHoverIndex] = useState<number | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
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
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
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
      vx: ((idx % 5) - 2) * 0.00018 || 0.00012,
      vy: ((idx % 7) - 3) * 0.00014 || -0.00011,
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
      const amberLeak = ctx.createRadialGradient(
        flareX1,
        flareY1,
        10,
        flareX1,
        flareY1,
        width * 0.56
      );
      amberLeak.addColorStop(0, 'rgba(245, 158, 11, 0.24)');
      amberLeak.addColorStop(0.42, 'rgba(217, 119, 6, 0.09)');
      amberLeak.addColorStop(1, 'rgba(8, 8, 10, 0)');
      ctx.fillStyle = amberLeak;
      ctx.fillRect(0, 0, width, height);

      const flareX2 = width * (0.78 + Math.cos(t * 0.25) * 0.08);
      const flareY2 = height * (0.68 + Math.sin(t * 0.2) * 0.07);
      const crimsonLeak = ctx.createRadialGradient(
        flareX2,
        flareY2,
        10,
        flareX2,
        flareY2,
        width * 0.52
      );
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
      {/* SECTION 1: ABOVE-THE-FOLD 62/38 HERO SHOWCASE + 10-SLIDE SELECTOR BAR */}
      <div className="mx-auto w-full max-w-[1680px] flex flex-col gap-3 p-3 sm:p-4 lg:p-5">
        <section
          aria-label="Hero Showcase and Manifesto Slider"
          className="flex flex-col gap-2.5 lg:min-h-[calc(100vh-76px)]"
        >
          <div className="flex-1 min-h-[390px] grid grid-cols-1 lg:grid-cols-[62fr_38fr] gap-3">
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

              {/* Top Slide Telemetry + Controls */}
              <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.18em] uppercase text-[#A1A1AA] tabular-nums">
                  <span className="text-[#F59E0B] font-bold">
                    SLIDE {activeSlide.number} / 10
                  </span>
                  <span className="text-white/20">|</span>
                  <span className="text-[#D4D4D8]">{activeSlide.lensMeta}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <CinemaToolHUD title="PREV SLIDE" en="Previous manifesto slide." bn="আগের ম্যানিফেস্টো স্লাইডে যেতে চাপুন।" accent="amber" side="bottom">
                    <button
                      type="button"
                      onClick={() => handleSelectSlide(activeIndex - 1)}
                      aria-label="Previous manifesto slide"
                      className="cinema-tile cinema-tile-amber w-7 h-7 rounded-md flex items-center justify-center cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 cinema-tile-icon" />
                    </button>
                  </CinemaToolHUD>
                  <CinemaToolHUD title="AUTO CYCLE" en="Toggle automatic slide cycling." bn="স্লাইড অটো পরিবর্তন চালু বা বন্ধ করুন।" accent="amber" side="bottom">
                    <button
                      type="button"
                      onClick={() => setIsAutoCycling((prev) => !prev)}
                      aria-label={isAutoCycling ? 'Pause slide auto-cycle' : 'Play slide auto-cycle'}
                      data-active={isAutoCycling && !prefersReducedMotion ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-amber h-7 px-2.5 rounded-md text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      {isAutoCycling && !prefersReducedMotion ? (
                        <>
                          <Pause className="w-3 h-3 cinema-tile-icon" />
                          <span>AUTO</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 cinema-tile-icon" />
                          <span>PAUSED</span>
                        </>
                      )}
                    </button>
                  </CinemaToolHUD>
                  <CinemaToolHUD title="NEXT SLIDE" en="Next manifesto slide." bn="পরের ম্যানিফেস্টো স্লাইডে যেতে চাপুন।" accent="amber" side="bottom">
                    <button
                      type="button"
                      onClick={() => handleSelectSlide(activeIndex + 1)}
                      aria-label="Next manifesto slide"
                      className="cinema-tile cinema-tile-amber w-7 h-7 rounded-md flex items-center justify-center cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5 cinema-tile-icon" />
                    </button>
                  </CinemaToolHUD>
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
              <CinemaBadgeHeader
                icon={<Monitor className="w-4 h-4" strokeWidth={2.2} />}
                label="STUDIO DECK"
                accent="amber"
                rightSlot={<span className="font-mono text-[10px] font-black uppercase text-zinc-500">4 NODES</span>}
              />

              <div className="flex-1 min-h-0 grid grid-cols-2 lg:grid-cols-1 gap-2 content-stretch">
                {deckCards.map((card) => {
                  const Icon = card.icon;
                  const accent = card.title === 'COCKPIT' ? 'crimson' : card.title === 'SCRUB' ? 'cyan' : 'amber';
                  return (
                    <CinemaToolHUD
                      key={card.title}
                      title={card.title}
                      en={card.subtitle}
                      bn={`${card.title} ওয়ার্কস্পেস সরাসরি চালু করতে এখানে চাপুন।`}
                      accent={accent}
                      side="left"
                      blockWrapper
                    >
                      <button
                        type="button"
                        onClick={card.onClick}
                        className={`cinema-tile cinema-tile-${accent} group w-full min-h-[52px] rounded-lg px-3.5 py-2 flex items-center justify-between gap-3 cursor-pointer`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="w-5 h-5 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                          <span className="text-[12px] font-black tracking-wider uppercase truncate">
                            {card.title}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    </CinemaToolHUD>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.07]">
                <CinemaToolHUD hudId="nav-stage" side="left" blockWrapper>
                  <button
                    type="button"
                    onClick={enterWorkspace}
                    data-active="true"
                    className="cinema-tile cinema-tile-amber w-full min-h-[44px] px-4 rounded-lg font-black text-[11px] tracking-[0.14em] uppercase flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4 cinema-tile-icon" />
                      <span>ENTER STUDIO</span>
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </CinemaToolHUD>

                <div className="grid grid-cols-2 gap-2">
                  <CinemaToolHUD title="PREMIERE XML" en="Open FCP7 XML & CapCut export dialog." bn="প্রিমিয়ার ও ক্যাপকাট XML এক্সপোর্ট ওপেন করতে চাপুন।" accent="cyan" side="top" blockWrapper>
                    <button
                      type="button"
                      onClick={onOpenExportXml}
                      className="cinema-tile cinema-tile-cyan w-full min-h-[44px] px-2.5 rounded-md text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileCode2 className="w-4 h-4 cinema-tile-icon" />
                      <span>PREMIERE XML</span>
                    </button>
                  </CinemaToolHUD>
                  <CinemaToolHUD title="SHORTCUTS" en="Inspect studio keyboard shortcuts." bn="স্টুডিওর সব কি-বোর্ড শর্টকাট একনজরে দেখতে চাপুন।" accent="emerald" side="top" blockWrapper>
                    <button
                      type="button"
                      onClick={() => onOpenShortcuts?.()}
                      className="cinema-tile cinema-tile-emerald w-full min-h-[44px] px-2.5 rounded-md text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Keyboard className="w-4 h-4 cinema-tile-icon" />
                      <span>SHORTCUTS</span>
                    </button>
                  </CinemaToolHUD>
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
      </div>

      {/* SECTION 2: RESTORED TOP 10 MASTER SHOTS GRID (CARDS 1–5 + 6–10) */}
      <section
        id="top-10-reels-section"
        aria-label="Top 10 Master Shots Today"
        className="relative w-full py-10 md:py-14 border-t border-b border-[#232330] bg-[#070709]"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="text-[#E50914] text-xs font-mono font-bold tracking-widest uppercase mb-1.5">
                DIRECTOR CUTS &amp; MASTER REEL
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-cinzel">
                Top 10 Master Shots Today
              </h2>
            </div>
            <p className="text-white/45 text-xs tracking-wider font-mono tabular-nums">
              STRICT 12.0S (288 FRAMES @ 24FPS) • 2.39:1 OPTICAL SCOPE
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
            {MASTER_SHOT_DEFAULTS.map((preset, idx) => {
              const rank = idx + 1;
              const shot = frames[idx];
              const mediaUrl = shot?.videoSrc || shot?.videoUrl || shot?.imageUrl || shot?.thumbnailUrl || shot?.blobUrl || '';
              const isVideoMedia = Boolean(
                shot?.isVideo || shot?.videoSrc || shot?.videoUrl || /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl)
              );
              const bnTitle = shot?.bengaliTitle?.trim() || preset.banglaTitle;
              const enTitle = shot?.title?.trim() || preset.englishTitle;
              const shotTagline = shot?.tagline?.trim() || preset.tagline;
              const lensLabel = shot?.cameraSpec?.focalLength || preset.focalLength;
              const durationLabel = `${(shot?.durationSec ?? preset.durationSec).toFixed(1)}s`;
              const isDragging = dragHoverIndex === idx;

              return (
                <button
                  key={`top-shot-${rank}`}
                  type="button"
                  data-testid={`master-shot-card-${rank}`}
                  onClick={() => onEnterStudio(idx)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (dragHoverIndex !== idx) setDragHoverIndex(idx);
                  }}
                  onDragLeave={() => {
                    setDragHoverIndex((prev) => (prev === idx ? null : prev));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragHoverIndex(null);
                    const file = e.dataTransfer?.files?.[0];
                    if (file && onIngestMediaForFrame) {
                      onIngestMediaForFrame(idx, file);
                    }
                  }}
                  className={`group relative bg-[#101016] rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_12px_30px_rgba(229,9,20,0.3)] flex flex-col text-left aspect-[2/3] border ${
                    isDragging
                      ? 'border-2 border-dashed border-amber-400 ring-2 ring-amber-400/50'
                      : 'border-[#232330] hover:border-[#E50914]'
                  }`}
                >
                  {/* Visual Media Plate + Outlined Rank Number */}
                  <div className="relative flex-1 w-full bg-black overflow-hidden">
                    {mediaUrl ? (
                      isVideoMedia ? (
                        <video
                          src={mediaUrl}
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={mediaUrl}
                          alt={enTitle}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#161622] via-[#0e0e14] to-black text-zinc-600">
                        <Film className="w-8 h-8 mb-2 group-hover:text-[#E50914] transition-colors" />
                        <span className="text-[10px] font-mono tracking-widest uppercase tabular-nums">
                          SHOT {String(rank).padStart(3, '0')}
                        </span>
                      </div>
                    )}

                    {/* Contrast Scrim */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-75 transition-opacity"
                    />

                    {/* Hover Play Button */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.8)] transform scale-75 group-hover:scale-100 transition-transform">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Top Corner Telemetry Stamps (Matching Screenshot) */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 text-[9px] font-mono tabular-nums">
                      <span className="px-2 py-0.5 rounded bg-black/80 text-[#F5A623] font-bold border border-[#F5A623]/30">
                        {durationLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#E50914]/90 text-white font-bold">
                        4K RAW
                      </span>
                    </div>

                    {/* Giant Red Outlined Rank Number 1–10 */}
                    <div
                      aria-hidden="true"
                      className="absolute -bottom-3 left-1 z-10 select-none pointer-events-none text-7xl sm:text-8xl font-black font-cinzel leading-none tracking-tighter tabular-nums"
                      style={{
                        WebkitTextStroke: '2px #E50914',
                        color: 'transparent',
                        textShadow: '0 0 15px rgba(229,9,20,0.5)',
                      }}
                    >
                      {rank}
                    </div>
                  </div>

                  {/* Card Lower Metadata */}
                  <div className="relative w-full p-3 bg-[#0d0d14] border-t border-[#232330] z-20 space-y-1">
                    <div className="text-right">
                      <span className="text-white/45 text-[10px] tracking-wider font-mono uppercase truncate block">
                        {lensLabel}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#F5A623] transition-colors truncate font-bangla">
                      {bnTitle} // {enTitle}
                    </h3>
                    <p className="text-white/45 text-[11px] tracking-wider truncate font-mono">
                      {shotTagline}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3: ENGINE DECK */}
      <section
        id="feature-matrix-section"
        aria-label="Engine Modules"
        className="w-full py-10 md:py-12 border-b border-[#232330] bg-[#07070A]"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-10 space-y-6">
          <CinemaBadgeHeader
            icon={<Cpu className="w-4 h-4" strokeWidth={2.2} />}
            label="ENGINE SPECS"
            accent="amber"
            rightSlot={<span className="text-[10px] font-black uppercase text-zinc-500">4 CORES</span>}
          />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Cpu, tag: 'WEBCODECS GPU', accent: 'crimson' as const, en: 'Hardware-accelerated 2.39:1 browser video encoding with zero cloud bills.', bn: 'ব্রাউজারের GPU ব্যবহার করে কোনো ক্লাউড সার্ভার ছাড়াই 4K ভিডিও রেন্ডার করুন।' },
              { icon: HardDrive, tag: 'LOCAL VAULT', accent: 'amber' as const, en: '100% offline IndexedDB & OPFS storage. Media never leaves your device.', bn: 'সব ভিডিও, ছবি ও প্রজেক্ট আপনার নিজের ডিভাইসে নিরাপদে সংরক্ষিত থাকে।' },
              { icon: Clock, tag: '24FPS LOCK', accent: 'cyan' as const, en: 'Strict 24fps stepping, J-K-L shuttle, and audio beat transient snap.', bn: '২৪ FPS নির্ভুল টাইমকোড ও মিউজিক বিটের সাথে অটো কাট সিঙ্ক করুন।' },
              { icon: Share2, tag: 'NLE BRIDGE', accent: 'emerald' as const, en: 'Instant Premiere Pro XML, CapCut Draft, and DaVinci FCPXML export.', bn: 'এক ক্লিকেই প্রিমিয়ার, ক্যাপকাট ও ডাভিঞ্চি রিজলভের জন্য টাইমলাইন নিন।' },
            ].map((spec) => {
              const SpecIcon = spec.icon;
              return (
                <CinemaToolHUD key={spec.tag} title={spec.tag} en={spec.en} bn={spec.bn} accent={spec.accent} side="top" blockWrapper>
                  <button
                    type="button"
                    onClick={() => onEnterStudio(0)}
                    className={`cinema-tile cinema-tile-${spec.accent} w-full min-h-[84px] p-4 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer`}
                  >
                    <SpecIcon className="w-6 h-6 cinema-tile-icon" strokeWidth={2.2} />
                    <span className="text-[11px] font-black tracking-wider uppercase">{spec.tag}</span>
                  </button>
                </CinemaToolHUD>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4: QUICK LAUNCH CTA */}
      <section
        id="director-faqs-section"
        aria-label="Quick Guide"
        className="w-full py-10 md:py-12 border-b border-[#232330] bg-[#070709]"
      >
        <div className="max-w-4xl mx-auto px-5 md:px-10 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DIRECTOR_FAQS.map((item, idx) => {
              const shortLabels = ['12S TIMING', 'WEBCODECS', 'XML BRIDGE', 'OFFLINE VAULT'];
              const bnFaq = [
                '১২ সেকেন্ডের শট প্রতিটি দৃশ্যের সঠিক টেম্পো ও টাইপোগ্রাফি বিচার করার আদর্শ সময়।',
                'WebCodecs API সরাসরি আপনার ডিভাইসের GPU দিয়ে রেন্ডার করে।',
                'এক ক্লিকেই প্রিমিয়ার, ক্যাপকাট ও ডাভিঞ্চিতে XML এক্সপোর্ট করা যায়।',
                'কোনো মিডিয়া সার্ভারে আপলোড হয় না; সব লোকাল ব্রাউজারেই থাকে।'
              ];
              return (
                <CinemaToolHUD
                  key={item.q}
                  title={shortLabels[idx] || 'FAQ'}
                  en={item.a}
                  bn={bnFaq[idx] || 'বিস্তারিত জানতে হোভার করুন।'}
                  accent="cyan"
                  side="top"
                  blockWrapper
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                    data-active={openFaqIndex === idx ? 'true' : 'false'}
                    className="cinema-tile cinema-tile-cyan w-full min-h-[48px] px-3 py-2 rounded-lg text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{shortLabels[idx] || `FAQ ${idx + 1}`}</span>
                  </button>
                </CinemaToolHUD>
              );
            })}
          </div>

          <div className="text-center">
            <CinemaToolHUD hudId="nav-stage" side="top">
              <button
                type="button"
                onClick={() => onEnterStudio(0)}
                data-active="true"
                className="cinema-tile cinema-tile-crimson min-h-[48px] px-8 py-3 rounded-full font-black text-xs sm:text-sm tracking-wider uppercase inline-flex items-center gap-2.5 cursor-pointer"
              >
                <Play className="w-4 h-4 cinema-tile-icon" />
                <span>OPEN STUDIO</span>
              </button>
            </CinemaToolHUD>
          </div>
        </div>
      </section>

      {/* SECTION 5: 4-COLUMN STUDIO FOOTER & COPYRIGHT INFORMATION */}
      <footer
        aria-label="Handfilm Studio Footer and Copyright"
        className="w-full pt-12 pb-14 bg-[#060608] text-xs text-zinc-500"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="space-y-3">
              <span className="font-bold text-white text-sm font-cinzel block">HANDFILM</span>
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => onEnterStudio(0)}
                    className="hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    Launch Previs Studio
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenExportXml}
                    className="hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    NLE XML Suite
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => (onOpenExportRange ? onOpenExportRange() : onExport?.())}
                    className="hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    MP4 WebCodecs Muxer
                  </button>
                </li>
                {onOpenShortcuts && (
                  <li>
                    <button
                      type="button"
                      onClick={onOpenShortcuts}
                      className="hover:text-[#F5A623] text-left transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="text-[10px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                        ?
                      </span>
                      <span>Keyboard Shortcuts</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-3">
              <span className="font-bold text-white text-sm font-cinzel block">PIPELINE</span>
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={onOpenExportXml}
                    className="text-zinc-400 hover:text-[#F5A623] transition-colors cursor-pointer"
                  >
                    CapCut Desktop XML
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenExportXml}
                    className="text-zinc-400 hover:text-[#F5A623] transition-colors cursor-pointer"
                  >
                    Adobe Premiere Pro FCP7
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={openCockpit}
                    className="text-zinc-400 hover:text-[#F5A623] transition-colors cursor-pointer"
                  >
                    DaVinci Resolve Timeline
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="font-bold text-white text-sm font-cinzel block">OPTICAL SCOPE</span>
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => openPanel('TACTILE_STAGE')}
                    className="text-zinc-400 hover:text-[#F5A623] transition-colors cursor-pointer"
                  >
                    2.39:1 Cinema Letterbox
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openPanel('SPLIT')}
                    className="text-zinc-400 hover:text-[#F5A623] transition-colors cursor-pointer"
                  >
                    Bangla Gold Metallic Bloom
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openPanel('SEQUENCER')}
                    className="text-zinc-400 hover:text-[#F5A623] transition-colors cursor-pointer"
                  >
                    DSP Audio Beat Snap
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="font-bold text-white text-sm font-cinzel block">SOVEREIGN CORE</span>
              <ul className="space-y-2 text-zinc-400">
                <li>100% Client-Side Silicon</li>
                <li>Zero Cloud Uploads</li>
                <li>Hardware GPU Accelerated</li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[#181822] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-[#E50914] font-bold font-cinzel tracking-wider text-sm">
                HANDFILM
              </span>
              <span>—</span>
              <span className="text-zinc-300 font-medium">Built for the cut. Not the queue.</span>
              <span className="text-white/20">·</span>
              <span className="text-zinc-400">
                © 2026 HANDFILM STUDIO · HANDS &amp; HEAD CREATIVE GROUP. All Rights Reserved.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono text-white/45 text-[11px] tracking-wider">
              <span>HANDFILM // 12.0S CINEMA PREVIS &amp; NLE ENGINE • Directed by Rakib Himon</span>
              <button
                type="button"
                onClick={scrollToTop}
                className="text-zinc-300 hover:text-[#F5A623] inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowUp className="w-3 h-3" />
                <span>TOP</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default HandfilmHome;
