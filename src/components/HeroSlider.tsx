/**
 * @file /src/components/HeroSlider.tsx
 * @description Netflix-grade 10-Slide Cinema Hero Slider with Extra-Large Master CTA [ ⚡ TRY STUDIO ],
 * amber backlight, animated glass popovers, and compact secondary actions [ ⓘ INFO ] & [ ⤓ EXPORT ].
 */

import React, { useState, useEffect, useRef } from 'react';
import { AnthologyFrame } from '../types/anthology';
import { SLIDES_DATA } from './landing/LandingWalkthrough';
import { ComponentVisibility } from './ComponentsMatrixPopover';
import { useTitleContainerRepaint } from '../hooks/useTitleContainerRepaint';
import { 
  Zap, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Download,
  Film
} from 'lucide-react';

export interface HeroSliderProps {
  frames?: AnthologyFrame[];
  onLaunchStudio: () => void;
  onOpenExportXml?: () => void;
  onScrollToSpecs?: () => void;
  showTitles?: boolean;
  componentsVisibility?: ComponentVisibility;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  frames = [],
  onLaunchStudio,
  onOpenExportXml,
  onScrollToSpecs,
  showTitles = true,
  componentsVisibility
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [isTransitionActive, setIsTransitionActive] = useState(true);
  const [slideTransitionKey, setSlideTransitionKey] = useState(0);

  const heroTitleContainerRef = useRef<HTMLDivElement | null>(null);
  const heroCycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSlideTransition = (nextIndexOrFn: number | ((prev: number) => number)) => {
    if (transitionResetTimerRef.current) {
      clearTimeout(transitionResetTimerRef.current);
    }
    setIsTransitionActive(false);

    requestAnimationFrame(() => {
      setCurrentSlideIndex(nextIndexOrFn);
      setSlideTransitionKey((prev) => prev + 1);
      setIsTransitionActive(true);
    });
  };

  useEffect(() => {
    if (isHeroPaused) return;

    heroCycleTimerRef.current = setInterval(() => {
      triggerSlideTransition((prev) => (prev + 1) % SLIDES_DATA.length);
    }, 6000);

    return () => {
      if (heroCycleTimerRef.current) clearInterval(heroCycleTimerRef.current);
      if (transitionResetTimerRef.current) clearTimeout(transitionResetTimerRef.current);
    };
  }, [isHeroPaused, slideTransitionKey]);

  const activeSlide = SLIDES_DATA[currentSlideIndex] || SLIDES_DATA[0];
  const activeFrame = frames.length > 0 ? frames[currentSlideIndex % frames.length] : undefined;

  const isHeroTitleVisible = componentsVisibility !== undefined
    ? Boolean(
        showTitles &&
        componentsVisibility.titlesAll &&
        (componentsVisibility.titleBn !== false ||
          componentsVisibility.titleEn !== false ||
          componentsVisibility.tagline !== false)
      )
    : Boolean(showTitles);

  const repaintRevision = useTitleContainerRepaint({
    containerRef: heroTitleContainerRef,
    visibility: componentsVisibility,
    isVisible: isHeroTitleVisible,
    label: 'HeroSlider',
    activeKey: `${slideTransitionKey}-${currentSlideIndex}`
  });

  useEffect(() => {
    console.log('[HeroSlider] Re-rendering Home hero title elements:', {
      isHeroTitleVisible,
      showTitles,
      titlesAll: componentsVisibility?.titlesAll,
      slideIndex: currentSlideIndex,
      title: activeSlide.title,
      bengaliTitle: activeFrame?.bengaliTitle,
      repaintRevision
    });
  }, [
    isHeroTitleVisible,
    showTitles,
    componentsVisibility?.titlesAll,
    currentSlideIndex,
    activeSlide.title,
    activeFrame?.bengaliTitle,
    repaintRevision
  ]);

  const handlePrevSlide = () => {
    triggerSlideTransition((prev) => (prev - 1 + SLIDES_DATA.length) % SLIDES_DATA.length);
  };

  const handleNextSlide = () => {
    triggerSlideTransition((prev) => (prev + 1) % SLIDES_DATA.length);
  };

  const handleScrollInfo = () => {
    if (onScrollToSpecs) {
      onScrollToSpecs();
    } else {
      const el = document.getElementById('feature-matrix-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section 
      className="min-h-[60vh] lg:min-h-[72vh] flex flex-col justify-end relative overflow-hidden border-b border-[#232330]"
      onMouseEnter={() => setIsHeroPaused(true)}
      onMouseLeave={() => setIsHeroPaused(false)}
    >
      {/* Ambient Film Plate Preview for current slide - 2.39:1 Ultra-Widescreen Artwork Frame */}
      <div className="absolute inset-0 z-0 overflow-hidden flex items-center justify-center bg-black">
        {activeSlide.backgroundImage || frames[currentSlideIndex % frames.length]?.imageUrl ? (
          <img 
            key={`hero-plate-${slideTransitionKey}-${currentSlideIndex}`}
            src={activeSlide.backgroundImage || frames[currentSlideIndex % frames.length]?.imageUrl} 
            alt={activeSlide.imageAlt || activeSlide.title} 
            className={`w-full h-full object-cover object-center opacity-65 md:opacity-75 scale-100 transition-transform duration-1000 ease-out ${
              isTransitionActive ? 'animate-hero-plate' : 'opacity-0'
            }`}
          />
        ) : (
          <div 
            key={`hero-plate-fallback-${slideTransitionKey}-${currentSlideIndex}`}
            className={`w-full h-full bg-gradient-to-br from-[#12121c] via-[#0d0d12] to-black opacity-60 ${
              isTransitionActive ? 'animate-hero-plate' : 'opacity-0'
            }`} 
          />
        )}
      </div>

      {/* 3-Way Cinematic Vignette */}
      <div className="absolute inset-y-0 left-0 w-full md:w-3/4 bg-gradient-to-r from-[#070709] via-[#070709]/65 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#070709] via-[#070709]/50 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(229,9,20,0.16),transparent_70%)] pointer-events-none z-10" />
      <div className="absolute top-1/2 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#00f0ff]/15 via-[#E50914]/40 to-transparent pointer-events-none z-10 blur-[0.5px]" />

      {/* Hero Content Container */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 md:px-12 pb-12 pt-16">
        <div 
          key={`hero-content-${slideTransitionKey}-${currentSlideIndex}`}
          className={`max-w-2xl ${isTransitionActive ? 'animate-hero-fade' : 'opacity-0'}`}
        >
          {/* Dedicated Hero Title Container targeted via ref for forced repaint */}
          <div
            ref={heroTitleContainerRef}
            data-title-container="hero-slider"
            data-title-cluster="true"
            data-repaint-rev={repaintRevision}
            className={isHeroTitleVisible ? 'flex flex-col' : 'hidden opacity-0'}
            aria-hidden={!isHeroTitleVisible}
          >
            {isHeroTitleVisible && (
              <>
                {/* Eyebrow */}
                <div className="font-mono text-xs uppercase tracking-[0.3em] text-[#F5A623] mb-3 flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F5A623]/15 border border-[#F5A623]/40 font-bold">
                    {activeSlide.tag}
                  </span>
                  <span className="text-zinc-600 font-bold">•</span>
                  <span className="text-zinc-300 font-mono text-[11px] tracking-widest">
                    SLIDE {String(activeSlide.id).padStart(2, '0')} / 10
                  </span>
                  {(componentsVisibility?.titleBn ?? true) && activeFrame?.bengaliTitle && (
                    <>
                      <span className="text-zinc-600 font-bold">•</span>
                      <span className="font-bangla text-sm text-[#FFE066] font-bold tracking-normal glow-gold">
                        {activeFrame.bengaliTitle}
                      </span>
                    </>
                  )}
                </div>

                {/* Main Headline */}
                {(componentsVisibility?.titleEn ?? true) && (
                  <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight font-cinzel leading-none drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
                    {activeSlide.title}
                  </h1>
                )}

                {/* Subtitle */}
                {(componentsVisibility?.tagline ?? true) && (
                  <div className="mt-3 mb-4 text-lg md:text-xl font-semibold text-zinc-200 font-sans tracking-wide">
                    // <span className="bg-gradient-to-r from-[#FFF2B2] via-[#F5A623] to-[#E50914] bg-clip-text text-transparent font-medium">{activeSlide.subtitle}</span>
                  </div>
                )}

                {/* Description */}
                <p className="max-w-xl text-zinc-300 text-sm md:text-base leading-relaxed mb-6 font-sans line-clamp-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
                  {activeSlide.body}
                </p>
              </>
            )}
          </div>

          {/* Action CTA Buttons: Master [ ⚡ TRY STUDIO ] + Compact [ ⓘ INFO ] & [ ⤓ EXPORT ] */}
          <div className="gap-3 sm:gap-4 flex items-center flex-wrap">
            {/* Master CTA: Extra-large [ ⚡ TRY STUDIO ] button with amber backlight and glass popover */}
            <div className="relative group/cta">
              {/* Amber Backlight Halo */}
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-500 via-red-600 to-amber-500 opacity-70 blur-md group-hover/cta:opacity-100 transition-opacity duration-300" />
              
              <button
                type="button"
                onClick={onLaunchStudio}
                className="relative px-7 sm:px-8 py-4 rounded-full bg-gradient-to-r from-[#ff1e2b] via-[#E50914] to-[#cc000d] hover:from-[#ff3843] hover:to-[#e6000e] text-white font-mono font-black text-sm sm:text-base tracking-wider flex items-center gap-2.5 shadow-[0_0_28px_rgba(245,166,35,0.45)] hover:shadow-[0_0_38px_rgba(245,166,35,0.7)] transition-all cursor-pointer active:scale-95 border border-amber-400/60"
              >
                <Zap className="w-5 h-5 fill-amber-300 text-amber-300 animate-pulse" />
                <span>⚡ TRY STUDIO</span>
              </button>

              {/* Master CTA Hover Glass Popover Card */}
              <div className="absolute left-0 bottom-full mb-3 w-80 p-3.5 bg-[#0a0a14]/95 border border-[#d4af37]/50 rounded-[4px] shadow-[0_12px_36px_rgba(0,0,0,0.95)] backdrop-blur-2xl opacity-0 translate-y-1 pointer-events-none group-hover/cta:opacity-100 group-hover/cta:translate-y-0 transition-all duration-200 z-50 text-left">
                <div className="flex items-center gap-1.5 pb-1 mb-1.5 border-b border-white/10 text-[10px] font-mono font-bold text-[#fbbf24] uppercase">
                  <span>DIRECT TIMELINE INGESTION</span>
                </div>
                <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                  Jump directly into the timeline, ingest 4K footage locally, and assemble master sequences.
                </p>
                <div className="mt-2 flex items-center justify-between text-[8px] font-mono text-zinc-400">
                  <span>GPU ACCELERATED</span>
                  <span className="text-emerald-400 font-bold">24.0 FPS TIMELINE</span>
                </div>
              </div>
            </div>

            {/* Secondary Button 1: Compact [ ⓘ INFO ] with animated info popover */}
            <div className="relative group/info">
              <button
                type="button"
                onClick={handleScrollInfo}
                className="px-4 py-3 rounded-full bg-[#0E0E14] hover:bg-[#181824] border border-[#2B2B36] hover:border-[#fbbf24]/60 text-zinc-300 hover:text-white font-mono font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <Info className="w-3.5 h-3.5 text-[#F5A623]" />
                <span>ⓘ INFO</span>
              </button>

              {/* Animated Info Popover Card */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 w-64 p-3 bg-[#0a0a12]/95 border border-[#d4af37]/35 rounded-[3px] shadow-2xl backdrop-blur-xl opacity-0 translate-y-1 pointer-events-none group-hover/info:opacity-100 group-hover/info:translate-y-0 transition-all duration-200 z-50 text-left">
                <div className="text-[9.5px] font-mono font-bold text-[#fbbf24] mb-0.5">TECHNICAL SPECIFICATIONS</div>
                <div className="text-[10px] text-zinc-300 font-sans leading-tight">View 2.39:1 scope details, 288-frame rhythm, and multi-track audio architecture.</div>
              </div>
            </div>

            {/* Secondary Button 2: Compact [ ⤓ EXPORT ] with animated info popover */}
            <div className="relative group/export">
              <button
                type="button"
                onClick={onOpenExportXml}
                className="px-4 py-3 rounded-full bg-[#12121c] hover:bg-[#1c1c2a] border border-[#F5A623]/50 hover:border-[#F5A623] text-[#F5A623] hover:text-[#FFE066] font-mono font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                title="Export Storyboard Timelines"
              >
                <Download className="w-3.5 h-3.5" />
                <span>⤓ EXPORT</span>
              </button>

              {/* Animated Export Popover Card */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 w-64 p-3 bg-[#0a0a12]/95 border border-[#d4af37]/35 rounded-[3px] shadow-2xl backdrop-blur-xl opacity-0 translate-y-1 pointer-events-none group-hover/export:opacity-100 group-hover/export:translate-y-0 transition-all duration-200 z-50 text-left">
                <div className="text-[9.5px] font-mono font-bold text-[#fbbf24] mb-0.5">UNIFIED TIMELINE EXPORTER</div>
                <div className="text-[10px] text-zinc-300 font-sans leading-tight">One-click transfer to Premiere Pro XML, CapCut FCPXML, WebCodecs MP4 & RAWX.</div>
              </div>
            </div>
          </div>

          {/* 10-Slide Indicator Pill Dots & Shuttles */}
          <div className="flex items-center gap-4 pt-6">
            <div className="flex items-center gap-1.5">
              {SLIDES_DATA.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => {
                    if (idx !== currentSlideIndex) {
                      triggerSlideTransition(idx);
                    }
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentSlideIndex 
                      ? 'w-8 bg-[#E50914] shadow-[0_0_10px_rgba(229,9,20,0.8)]' 
                      : 'w-2 bg-white/20 hover:bg-white/50'
                  }`}
                  title={`Slide ${idx + 1}: ${slide.title} // ${slide.subtitle}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5 ml-2">
              <button
                onClick={handlePrevSlide}
                className="w-7 h-7 rounded-full bg-black/60 border border-white/15 hover:border-white/40 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Previous Slide"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNextSlide}
                className="w-7 h-7 rounded-full bg-black/60 border border-white/15 hover:border-white/40 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Next Slide"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
