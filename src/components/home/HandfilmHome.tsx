/**
 * @file /src/components/home/HandfilmHome.tsx
 * @description Sleek, balanced Brutalist flagship HOME showcase for HANDFILM STUDIO.
 * Features an asymmetric 62/38 split with a 60fps generative optical cinema backdrop
 * cycling across 10 permanent Bangla & English manifesto slides, a 4-module interactive
 * studio showcase deck, and a clean 10-slide bottom selector bar.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FileCode2,
  Film,
  Keyboard,
  Monitor,
  Pause,
  Play,
  Sliders,
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
  onOpenShortcuts,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isAutoCycling, setIsAutoCycling] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [cycleSeed, setCycleSeed] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    const normalized = ((index % MANIFESTO_SLIDES.length) + MANIFESTO_SLIDES.length) % MANIFESTO_SLIDES.length;
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
    (panel: 'TACTILE_STAGE' | 'SPLIT' | 'SEQUENCER') => {
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

      // Deep obsidian base vignette
      const baseGrad = ctx.createLinearGradient(0, 0, width, height);
      baseGrad.addColorStop(0, '#070709');
      baseGrad.addColorStop(0.55, '#0C0B0F');
      baseGrad.addColorStop(1, '#08080A');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, width, height);

      // Slow optical molten-amber & crimson flares
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

      // Subtle drifting anamorphic bokeh discs
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

      // Subtle horizontal anamorphic streak across the optical axis
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

  const loadedShotCount = frames.filter((f) => Boolean(f.videoSrc || f.videoUrl || f.imageUrl || f.blobUrl)).length;

  return (
    <main
      data-testid="handfilm-home-showcase"
      className="flex-1 min-h-0 w-full flex flex-col justify-between bg-[#08080A] text-[#F4F4F5] overflow-y-auto lg:overflow-hidden p-3 sm:p-4 gap-3 select-none"
    >
      {/* Top 62 / 38 Brutalist Asymmetric Split */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[62fr_38fr] gap-3">
        {/* LEFT / CENTER HERO STAGE (62%) */}
        <section
          aria-label="Manifesto Hero Stage"
          className="relative min-h-[340px] lg:min-h-0 flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#0B0B0E] overflow-hidden p-5 sm:p-7"
        >
          {/* 60fps Generative Cinema Canvas Backdrop */}
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Subtle 35mm Optical Grain Texture */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none opacity-[0.045] mix-blend-overlay"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.6) 0.5px, transparent 0.5px)',
              backgroundSize: '3px 3px',
            }}
          />

          {/* Subtle Optical Aperture Reticle Hairlines */}
          <div
            aria-hidden="true"
            className="absolute inset-4 pointer-events-none border border-white/[0.04] rounded-lg"
          />

          {/* Top Bar: Clean Slide Telemetry + Cycle Controls (zero collisions) */}
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
                fontSize: 'clamp(2.25rem, 4.2vw, 4.1rem)',
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
          {/* Deck Header */}
          <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-white/[0.07]">
            <div>
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-[#F59E0B]">
                WORKSPACE DECK
              </div>
              <h2 className="font-space-grotesk text-[17px] font-bold tracking-tight text-[#F4F4F5] mt-0.5">
                Direct Studio Modules
              </h2>
            </div>
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#71717A] tabular-nums pt-1">
              4 NODES
            </span>
          </div>

          {/* 4 High-Contrast Brutalist Module Cards */}
          <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 content-stretch">
            {deckCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.title}
                  type="button"
                  onClick={card.onClick}
                  className="group w-full text-left rounded-lg border border-white/[0.08] bg-[#101014] hover:bg-[#15151B] hover:border-[#F59E0B]/60 px-3.5 py-2.5 flex items-center justify-between gap-3 transition-all cursor-pointer"
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

          {/* Primary Molten-Gold Enter CTA + Quick Utility Strip */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={enterWorkspace}
              className="w-full h-11 px-4 rounded-lg bg-[#F59E0B] hover:bg-[#FBBF24] text-[#08080A] font-space-grotesk font-extrabold text-[12px] tracking-[0.16em] uppercase flex items-center justify-between transition-colors shadow-[0_0_24px_rgba(245,158,11,0.22)] cursor-pointer"
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
        className="shrink-0 grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5"
      >
        {MANIFESTO_SLIDES.map((slide, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => handleSelectSlide(idx)}
              aria-pressed={isActive}
              className={`group rounded-lg border px-2.5 py-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1 min-w-0 ${
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
    </main>
  );
};

export default HandfilmHome;
