/**
 * @file /src/components/menus/MegaEcosystemLauncher.tsx
 * @description Master [ THE HIMON ECOSYSTEM // 6-MONTH SPRINT ] Full-Width Dopamine Dashboard.
 * 
 * Features:
 * - Container: `fixed top-12 left-0 w-full h-[calc(100vh-3rem)] bg-[#050505]/98 backdrop-blur-3xl border-t border-white/10 z-[10000] overflow-y-auto p-12`
 * - Massive brutalist header with sprint telemetry and quick exit.
 * - Super Product Hover Cards for 5 foundational projects:
 *   1. HANDFILM (Cinema NLE & WebCodecs Sequencer)
 *   2. RAWX (Previs & Storyboard Engine)
 *   3. ARUTEMIKA (Spatial Kinetic Generative Art)
 *   4. BLOOM (Neural Audio & Rhythmic Waveform Synthesizer)
 *   5. NEXOS (Enterprise Media Orchestration & Cloudless Ingest)
 * - Autonomous multi-image cycling on card hover with indicator pips.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ExternalLink, 
  Sparkles, 
  Zap, 
  Layers, 
  Film, 
  Music, 
  Cpu, 
  Radio, 
  CheckCircle2, 
  ArrowUpRight,
  Shield,
  Activity,
  Code
} from 'lucide-react';

export interface MegaEcosystemLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject?: (projectId: string) => void;
}

export interface EcosystemProject {
  id: string;
  name: string;
  tagline: string;
  category: string;
  sprintPhase: string;
  accentColor: string;
  status: 'PRODUCTION' | 'BETA SPRINT' | 'ATELIER';
  specs: string[];
  features: string[];
  images: string[];
  targetUrl: string;
}

export const ECOSYSTEM_PROJECTS: EcosystemProject[] = [
  {
    id: 'handfilm',
    name: 'HANDFILM',
    tagline: 'Zero-Cloud NLE & Rapid Editorial Sequencer',
    category: 'CINEMA NLE // WEBCODECS',
    sprintPhase: 'MONTH 01-02 // CORE ENGINE',
    accentColor: '#FF2B2B',
    status: 'PRODUCTION',
    specs: ['WebCodecs 4K/60fps', 'IndexedDB Vault', 'SMPTE 24fps Timecode', 'Tactile Multi-Cam'],
    features: [
      'Zero-cloud local hardware proxy pipeline',
      'Kinetic typography & Dopamine rhythmic compilations',
      'Dual-panel 9:16 reels runner and 2.39:1 scope'
    ],
    images: [
      'https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?q=80&w=800',
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=800',
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=800'
    ],
    targetUrl: '#'
  },
  {
    id: 'rawx',
    name: 'RAWX',
    tagline: 'Extreme Precision Previs & Storyboard Engine',
    category: 'STORY ENGINE // PREVIS',
    sprintPhase: 'MONTH 02-03 // VISUAL PIPELINE',
    accentColor: '#F5A623',
    status: 'PRODUCTION',
    specs: ['Dynamic Dual-Stream', 'Bangla + EN Typo', '14-Bit ARRI LUTs', 'Sub-Frame Scrub'],
    features: [
      'Ultra-fast storyboarding with 100-card multi-cadence timeline',
      'Automated shot classification and shot-list EDL export',
      'Hardware-accelerated color grading trays and optical scopes'
    ],
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800',
      'https://images.unsplash.com/photo-1520975954732-57dd22299614?q=80&w=800',
      'https://images.unsplash.com/photo-1559551409-dadc959f76b8?q=80&w=800'
    ],
    targetUrl: 'https://rawx.handsandhead.com'
  },
  {
    id: 'arutemika',
    name: 'ARUTEMIKA',
    tagline: 'Spatial Kinetic Generative Art & Vector Synthesis',
    category: 'GENERATIVE // 3D CANVAS',
    sprintPhase: 'MONTH 03-04 // SPATIAL MATRIX',
    accentColor: '#A855F7',
    status: 'BETA SPRINT',
    specs: ['WebGL 2.0 Shaders', 'Vector Math Accelerator', '60FPS Real-Time', 'Export to SVG/GLTF'],
    features: [
      'Parametric generative spline engines for title backdrops',
      'Interactive particle fields reactive to live microphone DSP',
      'Spatial glassmorphic HUD overlays for cinematic productions'
    ],
    images: [
      'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800'
    ],
    targetUrl: 'https://arutemika.handsandhead.com'
  },
  {
    id: 'bloom',
    name: 'BLOOM',
    tagline: 'Neural Audio & Rhythmic Waveform Synthesizer',
    category: 'NEURAL DSP // AUDIO SYNC',
    sprintPhase: 'MONTH 04-05 // SOUND ARCHITECTURE',
    accentColor: '#06B6D4',
    status: 'PRODUCTION',
    specs: ['Beat-Snap Transient Sync', 'Sub-Bass Synthesizer', 'WebAudio DSP Bus', 'Zero Latency'],
    features: [
      'Automated transient alignment for aggressive music cuts',
      'Multi-track rap audio synchronizer with live BPM detector',
      'Harmonic excitation and mastering limiter filters'
    ],
    images: [
      'https://images.unsplash.com/photo-1512626120412-faf41adb4874?q=80&w=800',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800'
    ],
    targetUrl: 'https://bloom.handsandhead.com'
  },
  {
    id: 'nexos',
    name: 'NEXOS',
    tagline: 'Enterprise Media Orchestration & Cloudless Ingest',
    category: 'ENTERPRISE // PIPELINE',
    sprintPhase: 'MONTH 05-06 // ECOSYSTEM INTEGRATION',
    accentColor: '#10B981',
    status: 'PRODUCTION',
    specs: ['Cryptographic Hash Log', 'R2 Cloudless Sync', 'IndexedDB Vault Sync', 'REST API Proxy'],
    features: [
      'Zero-cloud enterprise media gateway for studio distributed teams',
      'Automatic media deduplication and checksum validation',
      'Direct synchronization to Cloudflare R2 object storage vaults'
    ],
    images: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800',
      'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?q=80&w=800'
    ],
    targetUrl: 'https://nexos.handsandhead.com'
  }
];

interface ProductHoverCardProps {
  project: EcosystemProject;
  onSelect?: () => void;
}

const ProductHoverCard: React.FC<ProductHoverCardProps> = ({ project, onSelect }) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isHovered && project.images.length > 1) {
      intervalRef.current = setInterval(() => {
        setImageIndex((prev) => (prev + 1) % project.images.length);
      }, 900);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setImageIndex(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isHovered, project.images.length]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative rounded-2xl bg-[#0A0C10]/90 border border-white/10 hover:border-white/30 backdrop-blur-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between hover:shadow-[0_0_35px_rgba(255,255,255,0.06)] cursor-pointer"
      style={{
        boxShadow: isHovered ? `0 0 40px ${project.accentColor}25` : undefined
      }}
      onClick={onSelect}
    >
      {/* Top Banner Tag / Category */}
      <div className="p-5 pb-3 flex items-center justify-between border-b border-white/5 z-10 bg-[#0A0C10]/60">
        <div className="flex items-center gap-2">
          <span 
            className="w-2.5 h-2.5 rounded-full animate-pulse" 
            style={{ backgroundColor: project.accentColor, boxShadow: `0 0 10px ${project.accentColor}` }}
          />
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-white/70">
            {project.category}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
            {project.sprintPhase}
          </span>
          <span 
            className="text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase"
            style={{ color: project.accentColor, backgroundColor: `${project.accentColor}15` }}
          >
            {project.status}
          </span>
        </div>
      </div>

      {/* Cycling Visual Media Stage with Crossfade */}
      <div className="relative h-56 w-full overflow-hidden bg-black select-none">
        {project.images.map((img, idx) => (
          <img
            key={img}
            src={img}
            alt={`${project.name} preview ${idx + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 transform group-hover:scale-105 transition-transform duration-700 ease-out ${
              idx === imageIndex ? 'opacity-90' : 'opacity-0 pointer-events-none'
            }`}
          />
        ))}

        {/* Ambient Vignette & Color Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C10] via-black/30 to-transparent pointer-events-none" />

        {/* Dynamic Image Pips (Cycles on Hover) */}
        {project.images.length > 1 && (
          <div className="absolute bottom-3 left-4 flex items-center gap-1.5 z-20">
            {project.images.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === imageIndex
                    ? 'w-6 bg-white shadow-[0_0_8px_#ffffff]'
                    : 'w-1.5 bg-white/30'
                }`}
                style={{
                  backgroundColor: idx === imageIndex ? project.accentColor : undefined
                }}
              />
            ))}
            {isHovered && (
              <span className="ml-2 text-[8.5px] font-mono text-white/80 uppercase font-bold tracking-widest bg-black/60 px-1.5 py-0.2 rounded border border-white/20">
                AUTO-SCRUB {imageIndex + 1}/{project.images.length}
              </span>
            )}
          </div>
        )}

        {/* Monolithic Name Overlay */}
        <div className="absolute top-4 left-4 z-20">
          <h3 
            className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-white drop-shadow-[0_2px_15px_rgba(0,0,0,0.9)]"
            style={{
              textShadow: isHovered ? `0 0 25px ${project.accentColor}80` : undefined
            }}
          >
            {project.name}
          </h3>
        </div>
      </div>

      {/* Project Description & Feature Matrix */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <p className="text-sm font-semibold text-zinc-200 font-mono tracking-wide mb-3">
            {project.tagline}
          </p>

          <ul className="space-y-1.5">
            {project.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-[11px] font-mono text-zinc-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tech Specs Chips */}
        <div className="pt-3 border-t border-white/5">
          <div className="flex flex-wrap gap-1.5 mb-4">
            {project.specs.map((spec, idx) => (
              <span
                key={idx}
                className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300"
              >
                {spec}
              </span>
            ))}
          </div>

          {/* Brutalist Launch Button */}
          <button
            type="button"
            className="w-full py-2.5 px-4 font-mono font-bold text-xs uppercase tracking-widest transition-all cursor-pointer rounded-lg border flex items-center justify-center gap-2 group-hover:bg-white group-hover:text-black group-hover:border-white bg-black/60 border-white/20 text-white"
            style={{
              borderColor: isHovered ? project.accentColor : undefined,
              boxShadow: isHovered ? `0 0 20px ${project.accentColor}30` : undefined
            }}
          >
            <span>[ LAUNCH // ENTER ENGINE ↗ ]</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const MegaEcosystemLauncher: React.FC<MegaEcosystemLauncherProps> = ({
  isOpen,
  onClose,
  onSelectProject
}) => {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="mega-ecosystem-launcher"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed top-12 left-0 w-full h-[calc(100vh-3rem)] bg-[#050505]/98 backdrop-blur-3xl border-t border-white/10 z-[10000] overflow-y-auto p-8 md:p-12 flex flex-col gap-8 font-mono select-none"
      >
        {/* Subtle Ambient Background Flare */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Dashboard Top Header Bar */}
        <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
              <span className="text-[11px] font-mono font-bold tracking-[0.3em] uppercase text-red-400">
                OMNIVERSE ARCHITECTURE // HIGH-VELOCITY RUNNER
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white font-sans">
              [ THE HIMON ECOSYSTEM // 6-MONTH SPRINT ]
            </h1>

            <p className="text-xs sm:text-sm font-mono text-zinc-400 mt-2 max-w-3xl leading-relaxed">
              5 interconnected zero-cloud cinema, audio, previs, and generative platforms built for continuous hardware acceleration and high-cadence production workflows.
            </p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-center">
            {/* Telemetry pill */}
            <div className="hidden sm:flex flex-col text-right font-mono text-[10px] text-zinc-400 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-white font-bold tracking-wider">5 SUITES DEPLOYED</span>
              <span className="text-emerald-400 font-semibold">100% HARDWARE ACCELERATED</span>
            </div>

            {/* Brutalist Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/50 text-white font-mono font-bold text-xs tracking-widest transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              aria-label="Close Ecosystem Dashboard"
            >
              <span>[ ESC / CLOSE ]</span>
              <X className="w-4 h-4 text-zinc-300" />
            </button>
          </div>
        </div>

        {/* Ecosystem Grid: 5 Super Product Hover Cards */}
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {ECOSYSTEM_PROJECTS.map((proj) => (
              <ProductHoverCard
                key={proj.id}
                project={proj}
                onSelect={() => {
                  if (onSelectProject) {
                    onSelectProject(proj.id);
                  }
                  if (proj.targetUrl && proj.targetUrl !== '#') {
                    window.open(proj.targetUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Global Footer Architectural Telemetry */}
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-zinc-500 gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span>ALL NODES OPERATIONAL • ZERO EXTERNAL CLOUD TELEMETRY • LOCAL INDEXEDDB MEDIA VAULT</span>
          </div>

          <div className="tracking-wider">
            HANDS & HEAD ARCHITECTURE // 2026 ROADMAP
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
