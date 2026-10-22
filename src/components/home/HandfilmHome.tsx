/**
 * @file /src/components/home/HandfilmHome.tsx
 * @description Netflix-grade Home View for HANDFILM with 10-slide Cinema Hero Runner,
 * Top 10 Master Shots row with large outlined rank typography, Feature Matrix,
 * and Filmmaker FAQ & Minimalist Footer.
 */

import React, { useState, useEffect, useRef } from 'react';
import { AnthologyFrame } from '../../types/anthology';
import { SLIDES_DATA } from '../landing/LandingWalkthrough';
import { 
  Play, 
  ChevronLeft, 
  ChevronRight, 
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
  Zap,
  Volume2
} from 'lucide-react';

interface HandfilmHomeProps {
  frames: AnthologyFrame[];
  onEnterStudio: (shotIndex?: number) => void;
  onLaunchStudio?: () => void;
  onOpenExportXml: () => void;
  onOpenExportRange?: () => void;
  onOpenShortcuts?: () => void;
}

export const HandfilmHome: React.FC<HandfilmHomeProps> = ({
  frames,
  onEnterStudio,
  onLaunchStudio,
  onOpenExportXml,
  onOpenExportRange,
  onOpenShortcuts
}) => {
  // Hero Carousel State & Custom Transition Timer
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [isTransitionActive, setIsTransitionActive] = useState(true);
  const [slideTransitionKey, setSlideTransitionKey] = useState(0);

  const heroCycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Top 10 Shots
  const top10Shots = frames.slice(0, 10);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Custom trigger for slide transition to re-arm animate-hero-fade & animate-hero-plate
  const triggerSlideTransition = (nextIndexOrFn: number | ((prev: number) => number)) => {
    if (transitionResetTimerRef.current) {
      clearTimeout(transitionResetTimerRef.current);
    }
    // Momentarily toggle off animation to ensure fresh CSS animation cycle upon slide change
    setIsTransitionActive(false);

    // Re-mount / trigger CSS keyframe fade classes on next animation frame
    requestAnimationFrame(() => {
      setCurrentSlideIndex(nextIndexOrFn);
      setSlideTransitionKey((prev) => prev + 1);
      setIsTransitionActive(true);
    });
  };

  // Custom transition timer: specifically at the 6-second mark (6000ms), advance slide and trigger CSS fade classes
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

  const activeSlide = SLIDES_DATA[currentSlideIndex];

  // Jump to next or previous slide using custom transition trigger
  const handlePrevSlide = () => {
    triggerSlideTransition((prev) => (prev - 1 + SLIDES_DATA.length) % SLIDES_DATA.length);
  };

  const handleNextSlide = () => {
    triggerSlideTransition((prev) => (prev + 1) % SLIDES_DATA.length);
  };

  // Launch Studio Action
  const handleLaunchStudio = () => {
    if (onLaunchStudio) {
      onLaunchStudio();
    } else {
      onEnterStudio(0);
    }
  };

  // Scroll smoothly to Specs / Matrix section
  const handleScrollToSpecs = () => {
    const el = document.getElementById('feature-matrix-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
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
    <div className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden bg-[#070709] text-white font-sans selection:bg-[#E50914] selection:text-white pb-24">
      {/* ========================================================= */}
      {/* MODULE 1: 10-SLIDE CINEMA HERO RUNNER (2.39:1 OPTICAL CONTAINER) */}
      {/* ========================================================= */}
      <section 
        className="min-h-[60vh] lg:min-h-[70vh] flex flex-col justify-end relative overflow-hidden border-b border-[#232330]"
        onMouseEnter={() => setIsHeroPaused(true)}
        onMouseLeave={() => setIsHeroPaused(false)}
      >
        {/* Ambient Film Plate Preview for current slide */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {frames[currentSlideIndex % frames.length]?.imageUrl ? (
            <img 
              key={`hero-plate-${slideTransitionKey}-${currentSlideIndex}`}
              src={frames[currentSlideIndex % frames.length]?.imageUrl} 
              alt={activeSlide.title} 
              className={`w-full h-full object-cover object-center opacity-35 scale-105 filter blur-xs ${
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
        {/* 1. Left Gradient Scrim for crisp text legibility */}
        <div className="absolute inset-y-0 left-0 w-full md:w-3/4 bg-gradient-to-r from-[#070709] via-[#070709]/60 to-transparent z-10 pointer-events-none" />

        {/* 2. Bottom Gradient Scrim for seamless transition into Top 10 */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#070709] via-[#070709]/40 to-transparent z-10 pointer-events-none" />

        {/* 3. Soft Dark Radial Glow & Subtle Anamorphic Flare */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(229,9,20,0.14),transparent_70%)] pointer-events-none z-10" />
        <div className="absolute top-1/2 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#00f0ff]/15 via-[#E50914]/40 to-transparent pointer-events-none z-10 blur-[0.5px]" />

        {/* Master Balanced Responsive Container aligning with grid below */}
        <div className="relative z-20 w-full max-w-7xl mx-auto px-6 md:px-12 pb-12 pt-16">
          <div 
            key={`hero-content-${slideTransitionKey}-${currentSlideIndex}`}
            className={`max-w-2xl ${isTransitionActive ? 'animate-hero-fade' : 'opacity-0'}`}
          >
            {/* Eyebrow: font-mono text-xs uppercase tracking-[0.3em] text-[#F5A623] mb-3 flex items-center gap-2 */}
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-[#F5A623] mb-3 flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#F5A623]/15 border border-[#F5A623]/40 font-bold">
                {activeSlide.tag}
              </span>
              <span className="text-zinc-600 font-bold">•</span>
              <span className="text-zinc-400 font-mono text-[11px] tracking-widest">
                SLIDE {String(activeSlide.id).padStart(2, '0')} / 10
              </span>
            </div>

            {/* Main Headline: drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] */}
            <h1 className="text-4xl md:text-6xl font-black text-zinc-100 tracking-tight font-cinzel leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
              {activeSlide.title}
            </h1>

            {/* Subtitle: mt-3 mb-4 text-lg md:text-xl font-semibold text-zinc-200 */}
            <div className="mt-3 mb-4 text-lg md:text-xl font-semibold text-zinc-200 font-sans tracking-wide">
              // <span className="bg-gradient-to-r from-[#FFF2B2] via-[#F5A623] to-[#E50914] bg-clip-text text-transparent font-medium">{activeSlide.subtitle}</span>
            </div>

            {/* Description: max-w-xl text-zinc-400 text-sm md:text-base leading-relaxed mb-6 */}
            <p className="max-w-xl text-zinc-400 text-sm md:text-base leading-relaxed mb-6 font-sans line-clamp-2">
              {activeSlide.body}
            </p>

            {/* Action CTA Buttons: gap-4 flex items-center flex-wrap */}
            <div className="gap-4 flex items-center flex-wrap">
              <button
                onClick={handleLaunchStudio}
                className="px-7 py-3.5 rounded-full bg-[#E50914] hover:bg-[#ff1e2b] text-white font-bold text-sm sm:text-base flex items-center gap-3 shadow-[0_0_25px_rgba(229,9,20,0.6)] hover:shadow-[0_0_35px_rgba(229,9,20,0.85)] transition-all cursor-pointer active:scale-95 group"
              >
                <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                <span className="tracking-wide">LAUNCH DIRECTOR'S STUDIO</span>
              </button>

              <button
                onClick={handleScrollToSpecs}
                className="px-6 py-3.5 rounded-full bg-[#0E0E12] hover:bg-[#181822] border border-[#2B2B36] hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <Info className="w-4 h-4 text-[#F5A623]" />
                <span>MORE INFO</span>
              </button>

              <button
                onClick={onOpenExportXml}
                className="px-5 sm:px-6 py-3.5 rounded-full bg-[#121218] hover:bg-[#1b1b24] border border-[#F5A623]/40 hover:border-[#F5A623] text-[#F5A623] font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                title="Export Full Storyboard XML"
              >
                <Film className="w-4 h-4" />
                <span>EXPORT XML</span>
              </button>
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

      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* MODULE 2: NETFLIX "TOP 10 MASTER SHOTS TODAY" */}
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

            <p className="text-xs font-mono text-zinc-400">
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
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                      {frame.cameraSpec?.focalLength || '35mm Cine'}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#F5A623] transition-colors truncate">
                    {frame.bengaliTitle || 'সূচনা'} // {frame.title}
                  </h3>
                  <p className="text-[10px] text-zinc-400 truncate font-mono">
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
      {/* MODULE 3: FEATURE MATRIX ("MORE REASONS TO CREATE ON HANDFILM") */}
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
      {/* MODULE 4: FREQUENTLY ASKED QUESTIONS & MINIMALIST FOOTER */}
      {/* ========================================================= */}
      <section className="w-full py-16 border-b border-[#232330] bg-[#070709]">
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

            <div className="font-mono text-[11px] text-zinc-600">
              HANDFILM // 12.0S CINEMA PREVIS & NLE ENGINE
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
