/**
 * @file /src/components/home/HandfilmHome.tsx
 * @description Single-screen 100vh Showcase HOME view for HANDFILM STUDIO:
 * Wider ~73% Hero Manifesto Slider (10 permanent Bangla/English slides with 60fps
 * generative cinema bokeh + anamorphic light leaks), compact colorful & animated
 * ~27% Right Workspace Deck (01 STAGE, 02 12S REELS, 03 SCRUB, 04 COCKPIT),
 * and compact 10-slide bottom selector strip. Zero vertical scrolling.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileCode2,
  Keyboard,
  Pause,
  Play,
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
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  warm: boolean;
}

export const HandfilmHome: React.FC<HandfilmHomeProps> = ({
  onEnterStudio,
  onLaunchStudio,
  onOpenExportXml,
  onOpenShortcuts,
}) => {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<BokehParticle[]>([]);

  const currentSlide = MANIFESTO_SLIDES[activeSlideIndex] || MANIFESTO_SLIDES[0];

  const handlePrevSlide = useCallback(() => {
    setActiveSlideIndex((prev) => (prev - 1 + MANIFESTO_SLIDES.length) % MANIFESTO_SLIDES.length);
  }, []);

  const handleNextSlide = useCallback(() => {
    setActiveSlideIndex((prev) => (prev + 1) % MANIFESTO_SLIDES.length);
  }, []);

  // Auto-cycle 10 Manifesto Slides cleanly
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % MANIFESTO_SLIDES.length);
    }, 4600);
    return () => window.clearInterval(timer);
  }, [isAutoPlaying]);

  // 60fps Generative Cinema Bokeh + Anamorphic Light Leaks inside Hero Slider
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: 28 }, (_, i) => ({
        x: ((i * 73) % 100) / 100,
        y: ((i * 41) % 100) / 100,
        r: 18 + (i % 6) * 16,
        vx: ((i % 2 === 0 ? 1 : -1) * (0.00018 + (i % 5) * 0.00006)),
        vy: ((i % 3 === 0 ? -1 : 1) * (0.00012 + (i % 4) * 0.00005)),
        alpha: 0.06 + (i % 5) * 0.032,
        warm: i % 3 !== 0,
      }));
    }

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let phase = 0;

    const renderFrame = () => {
      const parent = canvas.parentElement;
      const w = parent ? parent.clientWidth : 960;
      const h = parent ? parent.clientHeight : 540;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Deep Obsidian Velvet Base
      const baseGrad = ctx.createRadialGradient(w * 0.42, h * 0.48, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
      baseGrad.addColorStop(0, '#19140E');
      baseGrad.addColorStop(0.55, '#0D0C10');
      baseGrad.addColorStop(1, '#070709');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, w, h);

      // Anamorphic Flare Sweep
      const sweepX = w * (0.5 + 0.24 * Math.sin(phase * 0.45));
      const flareGrad = ctx.createLinearGradient(0, h * 0.48, w, h * 0.52);
      flareGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
      flareGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.08)');
      flareGrad.addColorStop(0.5, 'rgba(255, 232, 160, 0.16)');
      flareGrad.addColorStop(0.65, 'rgba(229, 9, 20, 0.09)');
      flareGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = flareGrad;
      ctx.fillRect(0, h * 0.44, w, h * 0.12);

      // Optical Aperture Glow centered behind Title
      const glow = ctx.createRadialGradient(sweepX, h * 0.5, 4, sweepX, h * 0.5, Math.max(w, h) * 0.42);
      glow.addColorStop(0, 'rgba(245, 158, 11, 0.16)');
      glow.addColorStop(0.5, 'rgba(229, 9, 20, 0.06)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Floating Bokeh Circles
      for (const p of particlesRef.current) {
        if (!reducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -0.05) p.x = 1.05;
          if (p.x > 1.05) p.x = -0.05;
          if (p.y < -0.05) p.y = 1.05;
          if (p.y > 1.05) p.y = -0.05;
        }
        const px = p.x * w;
        const py = p.y * h;
        const bGrad = ctx.createRadialGradient(px, py, 0, px, py, p.r);
        if (p.warm) {
          bGrad.addColorStop(0, `rgba(251, 191, 36, ${p.alpha})`);
          bGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        } else {
          bGrad.addColorStop(0, `rgba(229, 9, 20, ${p.alpha * 0.78})`);
          bGrad.addColorStop(1, 'rgba(229, 9, 20, 0)');
        }
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      phase += 0.016;
      if (!reducedMotion) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [activeSlideIndex]);

  const enterStudioPrimary = () => {
    if (onLaunchStudio) onLaunchStudio();
    else onEnterStudio(0);
  };

  const openPanelInStudio = (panel: 'TACTILE_STAGE' | 'SPLIT' | 'SEQUENCER' | 'MULTICAM') => {
    eventBus.emit('workspace:select_panel', { panel });
    if (onLaunchStudio) onLaunchStudio();
    else onEnterStudio(0);
  };

  return (
    <section
      data-testid="handfilm-home-viewport"
      className="w-full h-[calc(100vh-38px)] max-h-[calc(100vh-38px)] overflow-hidden bg-[#08080A] text-[#F4F4F5] flex flex-col justify-between p-2.5 sm:p-3 gap-2 select-none"
    >
      {/* UPPER ASYMMETRIC SHOWCASE GRID: ~73% Wider Hero Manifesto Slider + ~27% Compact Animated Deck */}
      <div className="flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-[73fr_27fr] gap-2.5 overflow-hidden">
        {/* LEFT (~73%): WIDER ANAMORPHIC MANIFESTO SLIDER */}
        <div className="relative h-full min-h-0 w-full rounded-[6px] border border-white/[0.08] bg-[#0B0B0E] overflow-hidden flex flex-col justify-between p-5 sm:p-7 shadow-[0_24px_60px_rgba(0,0,0,0.85)]">
          {/* 60fps Generative Cinema Bokeh Canvas */}
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 w-full h-full"
          />

          {/* Subtle Cinema Gate Letterbox Vignette */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 border border-[#F59E0B]/15 rounded-[6px]"
          />

          {/* Top Bar: Slide Stamp + Lens Spec + Controls */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-[3px] bg-[#F59E0B]/15 border border-[#F59E0B]/40 font-mono text-[10px] font-bold tracking-[0.14em] text-[#FBBF24] tabular-nums">
                MANIFESTO {currentSlide.number} / 10
              </span>
              <span className="hidden sm:inline-block font-mono text-[10px] tracking-[0.14em] uppercase text-zinc-400 truncate">
                {currentSlide.lensMeta}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsAutoPlaying((p) => !p)}
                aria-label={isAutoPlaying ? 'Pause Manifesto Slider' : 'Play Manifesto Slider'}
                className="h-7 px-2.5 rounded-[4px] border border-white/10 bg-[#121216]/90 hover:border-[#F59E0B]/50 hover:text-[#FBBF24] text-zinc-300 font-mono text-[10px] uppercase tracking-[0.1em] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {isAutoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isAutoPlaying ? 'AUTO' : 'HOLD'}</span>
              </button>
              <button
                type="button"
                onClick={handlePrevSlide}
                aria-label="Previous Manifesto Slide"
                className="w-7 h-7 rounded-[4px] border border-white/10 bg-[#121216]/90 hover:border-[#F59E0B]/50 hover:text-[#FBBF24] text-zinc-300 flex items-center justify-center cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextSlide}
                aria-label="Next Manifesto Slide"
                className="w-7 h-7 rounded-[4px] border border-white/10 bg-[#121216]/90 hover:border-[#F59E0B]/50 hover:text-[#FBBF24] text-zinc-300 flex items-center justify-center cursor-pointer transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Center Monumental Bilingual Display Headline */}
          <div className="relative z-10 my-auto py-2 flex flex-col items-start justify-center max-w-4xl">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-[1px] w-7 bg-[#F59E0B]" />
              <span className="font-mono text-[10px] font-semibold tracking-[0.22em] uppercase text-[#F59E0B]">
                HANDFILM // RAW. RAPID. CINEMA.
              </span>
            </div>

            <h1
              key={currentSlide.id}
              className="font-bangla font-black leading-[1.08] tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-[#FFF3C4] via-[#FBBF24] to-[#D97706] drop-shadow-[0_0_28px_rgba(245,158,11,0.32)] animate-hero-entrance"
              style={{ fontSize: 'clamp(2.25rem, 5.1vw, 4.65rem)' }}
            >
              {currentSlide.banglaTitle}
            </h1>

            <p className="mt-3 font-mono text-xs sm:text-sm md:text-base font-bold tracking-[0.2em] uppercase text-zinc-100/95 max-w-3xl">
              {currentSlide.englishTagline}
            </p>
          </div>

          {/* Bottom Micro Progress Hairline & Launch Prompt */}
          <div className="relative z-10 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-3">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] uppercase text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]" />
              <span>LOCAL-FIRST NLE ENGINE · 2.39:1 ANAMORPHIC GATE</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 w-40">
              {MANIFESTO_SLIDES.map((s, idx) => (
                <span
                  key={s.id}
                  className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                    idx === activeSlideIndex ? 'bg-[#F59E0B]' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT (~27%): COMPACT, COLORFUL & ANIMATED WORKSPACE DECK */}
        <aside className="h-full min-h-0 w-full flex flex-col justify-between gap-2 overflow-hidden">
          {/* Deck Cards Container */}
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5">
            {/* 01 STAGE — Molten Amber/Gold (#F59E0B) */}
            <button
              type="button"
              onClick={() => openPanelInStudio('TACTILE_STAGE')}
              className="group relative flex-1 min-h-0 w-full rounded-[6px] border border-[#F59E0B]/30 hover:border-[#F59E0B] bg-[#121216] px-3 py-2 flex items-center justify-between gap-2.5 text-left overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-[0_6px_22px_rgba(245,158,11,0.08)] hover:shadow-[0_10px_28px_rgba(245,158,11,0.22)]"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{ background: 'radial-gradient(circle at 92% 50%, rgba(245,158,11,0.18), transparent 62%)' }}
              />
              <span
                aria-hidden="true"
                className="deck-card-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#F59E0B]/20 to-transparent"
              />
              <div className="relative z-10 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-[#F59E0B]">
                  <span className="tabular-nums">01</span>
                  <span className="text-zinc-500">//</span>
                  <span>2.39:1 ANAMORPHIC</span>
                </div>
                <div className="mt-0.5 text-sm font-black tracking-wide text-[#F4F4F5] group-hover:text-[#FBBF24] transition-colors">
                  STAGE
                </div>
                <div className="font-mono text-[9.5px] text-zinc-400 truncate">
                  Master Scope Monitor &amp; Title HUD
                </div>
              </div>

              {/* Animated Optical Lens Aperture SVG */}
              <div className="relative z-10 w-11 h-11 shrink-0 rounded-[5px] bg-[#09090C] border border-[#F59E0B]/35 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-8 h-8 animate-deck-aperture" aria-hidden="true">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeOpacity="0.45" strokeWidth="1.2" />
                  <circle cx="18" cy="18" r="9" fill="none" stroke="#FBBF24" strokeWidth="1.4" strokeDasharray="4 3" />
                  <rect x="6" y="13.5" width="24" height="9" rx="1" fill="none" stroke="#F59E0B" strokeWidth="1.2" />
                  <circle cx="18" cy="18" r="2.2" fill="#FBBF24" />
                </svg>
              </div>
            </button>

            {/* 02 12S REELS — Crimson/Magenta (#F43F5E) */}
            <button
              type="button"
              onClick={() => openPanelInStudio('SPLIT')}
              className="group relative flex-1 min-h-0 w-full rounded-[6px] border border-[#F43F5E]/30 hover:border-[#F43F5E] bg-[#121216] px-3 py-2 flex items-center justify-between gap-2.5 text-left overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-[0_6px_22px_rgba(244,63,94,0.08)] hover:shadow-[0_10px_28px_rgba(244,63,94,0.22)]"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{ background: 'radial-gradient(circle at 92% 50%, rgba(244,63,94,0.18), transparent 62%)' }}
              />
              <span
                aria-hidden="true"
                className="deck-card-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#F43F5E]/20 to-transparent"
              />
              <div className="relative z-10 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-[#F43F5E]">
                  <span className="tabular-nums">02</span>
                  <span className="text-zinc-500">//</span>
                  <span>9:16 HYPER CADENCE</span>
                </div>
                <div className="mt-0.5 text-sm font-black tracking-wide text-[#F4F4F5] group-hover:text-[#FB7185] transition-colors">
                  12S REELS
                </div>
                <div className="font-mono text-[9.5px] text-zinc-400 truncate">
                  Vertical Beat-Synced Reel Deck
                </div>
              </div>

              {/* Animated Vertical 9:16 Frame + Live Equalizer Bars */}
              <div className="relative z-10 w-11 h-11 shrink-0 rounded-[5px] bg-[#09090C] border border-[#F43F5E]/35 flex items-center justify-center gap-1 px-1.5">
                <div className="w-3.5 h-6 rounded-[2px] border border-[#F43F5E] bg-[#F43F5E]/15 shrink-0" />
                <div className="flex items-end gap-[2px] h-6">
                  <span className="w-[2.5px] h-5 rounded-full bg-[#F43F5E] animate-deck-eq-bar" />
                  <span className="w-[2.5px] h-6 rounded-full bg-[#FB7185] animate-deck-eq-bar" style={{ animationDelay: '180ms' }} />
                  <span className="w-[2.5px] h-4 rounded-full bg-[#F43F5E] animate-deck-eq-bar" style={{ animationDelay: '360ms' }} />
                </div>
              </div>
            </button>

            {/* 03 SCRUB — Electric Cyan (#06B6D4) */}
            <button
              type="button"
              onClick={() => openPanelInStudio('SEQUENCER')}
              className="group relative flex-1 min-h-0 w-full rounded-[6px] border border-[#06B6D4]/30 hover:border-[#06B6D4] bg-[#121216] px-3 py-2 flex items-center justify-between gap-2.5 text-left overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-[0_6px_22px_rgba(6,182,212,0.08)] hover:shadow-[0_10px_28px_rgba(6,182,212,0.22)]"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{ background: 'radial-gradient(circle at 92% 50%, rgba(6,182,212,0.18), transparent 62%)' }}
              />
              <span
                aria-hidden="true"
                className="deck-card-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#06B6D4]/20 to-transparent"
              />
              <div className="relative z-10 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-[#06B6D4]">
                  <span className="tabular-nums">03</span>
                  <span className="text-zinc-500">//</span>
                  <span>SUB-FRAME RAZOR</span>
                </div>
                <div className="mt-0.5 text-sm font-black tracking-wide text-[#F4F4F5] group-hover:text-[#22D3EE] transition-colors">
                  SCRUB
                </div>
                <div className="font-mono text-[9.5px] text-zinc-400 truncate">
                  Precision Timeline &amp; Slip Editor
                </div>
              </div>

              {/* Animated Waveform & Sweeping Playhead SVG */}
              <div className="relative z-10 w-11 h-11 shrink-0 rounded-[5px] bg-[#09090C] border border-[#06B6D4]/35 flex items-center justify-center overflow-hidden">
                <svg viewBox="0 0 36 36" className="w-8 h-8" aria-hidden="true">
                  <path
                    d="M3 18 L7 13 L11 23 L15 9 L19 26 L23 12 L27 21 L33 18"
                    fill="none"
                    stroke="#06B6D4"
                    strokeOpacity="0.55"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <g className="animate-deck-playhead">
                    <line x1="14" y1="5" x2="14" y2="31" stroke="#22D3EE" strokeWidth="1.8" />
                    <polygon points="11.5,5 16.5,5 14,8.5" fill="#22D3EE" />
                  </g>
                </svg>
              </div>
            </button>

            {/* 04 COCKPIT — Neon Violet (#A855F7) */}
            <button
              type="button"
              onClick={() => openPanelInStudio('MULTICAM')}
              className="group relative flex-1 min-h-0 w-full rounded-[6px] border border-[#A855F7]/30 hover:border-[#A855F7] bg-[#121216] px-3 py-2 flex items-center justify-between gap-2.5 text-left overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-[0_6px_22px_rgba(168,85,247,0.08)] hover:shadow-[0_10px_28px_rgba(168,85,247,0.22)]"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{ background: 'radial-gradient(circle at 92% 50%, rgba(168,85,247,0.18), transparent 62%)' }}
              />
              <span
                aria-hidden="true"
                className="deck-card-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#A855F7]/20 to-transparent"
              />
              <div className="relative z-10 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-[#A855F7]">
                  <span className="tabular-nums">04</span>
                  <span className="text-zinc-500">//</span>
                  <span>MULTI-APP SYNC</span>
                </div>
                <div className="mt-0.5 text-sm font-black tracking-wide text-[#F4F4F5] group-hover:text-[#C084FC] transition-colors">
                  COCKPIT
                </div>
                <div className="font-mono text-[9.5px] text-zinc-400 truncate">
                  Ps / Pr / Ai / CapCut Live Bridge
                </div>
              </div>

              {/* Animated Multi-App Sync Node Matrix */}
              <div className="relative z-10 w-11 h-11 shrink-0 rounded-[5px] bg-[#09090C] border border-[#A855F7]/35 grid grid-cols-2 gap-1 p-1.5">
                <span className="rounded-[2px] bg-[#001E36] border border-[#31A8FF]/70 flex items-center justify-center font-mono text-[7px] font-bold text-[#31A8FF] animate-deck-node">
                  Ps
                </span>
                <span className="rounded-[2px] bg-[#00005B] border border-[#9999FF]/70 flex items-center justify-center font-mono text-[7px] font-bold text-[#9999FF] animate-deck-node" style={{ animationDelay: '250ms' }}>
                  Pr
                </span>
                <span className="rounded-[2px] bg-[#330000] border border-[#FF9A00]/70 flex items-center justify-center font-mono text-[7px] font-bold text-[#FF9A00] animate-deck-node" style={{ animationDelay: '500ms' }}>
                  Ai
                </span>
                <span className="rounded-[2px] bg-[#18181D] border border-white/60 flex items-center justify-center font-mono text-[6.5px] font-bold text-white animate-deck-node" style={{ animationDelay: '750ms' }}>
                  CC
                </span>
              </div>
            </button>
          </div>

          {/* Primary Molten-Gold CTA + Compact Utility Bar */}
          <div className="shrink-0 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={enterStudioPrimary}
              className="w-full h-10 rounded-[6px] bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#F59E0B] hover:brightness-110 active:scale-[0.99] text-[#08080A] font-mono text-xs font-black tracking-[0.14em] uppercase flex items-center justify-center gap-2 shadow-[0_0_26px_rgba(245,158,11,0.45)] cursor-pointer transition-all"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>ENTER STUDIO WORKSPACE</span>
            </button>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={onOpenExportXml}
                className="h-7 rounded-[4px] border border-white/10 bg-[#121216] hover:border-[#F59E0B]/50 hover:text-[#FBBF24] text-zinc-300 font-mono text-[9.5px] font-semibold tracking-[0.1em] uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <FileCode2 className="w-3 h-3" />
                <span>PREMIERE XML</span>
              </button>
              <button
                type="button"
                onClick={onOpenShortcuts}
                className="h-7 rounded-[4px] border border-white/10 bg-[#121216] hover:border-[#F59E0B]/50 hover:text-[#FBBF24] text-zinc-300 font-mono text-[9.5px] font-semibold tracking-[0.1em] uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Keyboard className="w-3 h-3" />
                <span>SHORTCUTS</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* BOTTOM 10-SLIDE SELECTOR STRIP */}
      <nav
        aria-label="Manifesto Slide Selector"
        className="shrink-0 w-full grid grid-cols-5 lg:grid-cols-10 gap-1.5"
      >
        {MANIFESTO_SLIDES.map((slide, idx) => {
          const isActive = idx === activeSlideIndex;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveSlideIndex(idx)}
              className={`h-11 px-2 rounded-[4px] border flex flex-col justify-center items-start text-left cursor-pointer transition-all duration-150 overflow-hidden ${
                isActive
                  ? 'bg-[#191610] border-[#F59E0B] shadow-[0_0_14px_rgba(245,158,11,0.22)]'
                  : 'bg-[#111115] border-white/[0.07] hover:border-white/25 hover:bg-[#16161C]'
              }`}
            >
              <div className="w-full flex items-center justify-between gap-1 font-mono text-[9px] tabular-nums">
                <span className={isActive ? 'font-bold text-[#F59E0B]' : 'text-zinc-500'}>
                  #{slide.number}
                </span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />}
              </div>
              <div
                className={`w-full font-bangla text-[11px] font-bold truncate ${
                  isActive ? 'text-[#FFF3C4]' : 'text-zinc-300'
                }`}
              >
                {slide.banglaTitle}
              </div>
            </button>
          );
        })}
      </nav>
    </section>
  );
};

export default HandfilmHome;
