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
  category: string;
  title: string;
  sub: string;
  url: string;
  images: string[];
  name: string;
  tagline: string;
  specs: string[];
  features: string[];
}

const CORE_ECOSYSTEM_PROJECTS = [
  { id: 'handfilm', category: 'CINEMA & AI', title: 'HANDFILM STUDIO', sub: 'B2B Video Engine', url: 'https://b2b.handsandhead.com', images: ['https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?q=80&w=800', 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=800', 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=800'] },
  { id: 'rawx', category: 'ATELIER', title: 'RAWx APPAREL', sub: 'Full-Grain Leather Jackets', url: 'https://handsandhead.com', images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800', 'https://images.unsplash.com/photo-1520975954732-57dd22299614?q=80&w=800', 'https://images.unsplash.com/photo-1559551409-dadc959f76b8?q=80&w=800'] },
  { id: 'arutemika', category: 'FOOTWEAR', title: 'ARUTEMIKA', sub: 'Goodyear Welted Boots', url: 'https://handsandhead.com', images: ['https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800'] },
  { id: 'bloom', category: 'ED-TECH', title: 'KHUKIR BAGAN (BLOOM)', sub: 'Bangla Smart TV App', url: 'https://play.google.com/store/apps', images: ['https://images.unsplash.com/photo-1512626120412-faf41adb4874?q=80&w=800', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800'] },
  { id: 'nexos', category: 'INFRASTRUCTURE', title: 'NexOS / B2B HUB', sub: 'React & Next.js Portals', url: 'https://account.handsandhead.com', images: ['https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800', 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?q=80&w=800'] }
];

export const ECOSYSTEM_PROJECTS: EcosystemProject[] = CORE_ECOSYSTEM_PROJECTS.map((item) => ({
  ...item,
  name: item.title,
  tagline: item.sub,
  specs: [item.category],
  features: [item.sub]
}));

const PROJECT_ACCENT_MAP: Record<string, string> = {
  handfilm: '#FF2B2B',
  rawx: '#F5A623',
  arutemika: '#A855F7',
  bloom: '#06B6D4',
  nexos: '#10B981'
};

interface ProductHoverCardProps {
  project: EcosystemProject;
  onSelect?: () => void;
}

const ProductHoverCard: React.FC<ProductHoverCardProps> = ({ project, onSelect }) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const accentColor = PROJECT_ACCENT_MAP[project.id] || '#F5A623';

  const domainHost = (() => {
    try {
      return new URL(project.url).hostname.replace(/^www\./, '');
    } catch {
      return project.url;
    }
  })();

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
      className="group relative rounded-2xl bg-[#0A0C10]/90 border border-white/10 hover:border-white/30 backdrop-blur-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between hover:shadow-[0_0_35px_rgba(255,255,255,0.06)] pointer-events-auto text-left"
      style={{
        boxShadow: isHovered ? `0 0 40px ${accentColor}25` : undefined
      }}
    >
      {/* Top Banner Tag / Category */}
      <div className="p-5 pb-3 flex items-center justify-between border-b border-white/5 z-10 bg-[#0A0C10]/60">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }}
          />
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-white/75">
            {project.category}
          </span>
        </div>

        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 hover:text-white group-hover:text-white transition-colors truncate max-w-[165px] no-underline pointer-events-auto"
          title={project.url}
        >
          {domainHost}
        </a>
      </div>

      {/* Cycling Visual Media Stage with Crossfade */}
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          if (onSelect) onSelect();
        }}
        className="relative block h-60 w-full overflow-hidden bg-gradient-to-br from-[#12151E] via-[#0B0D13] to-[#06070A] select-none no-underline cursor-pointer pointer-events-auto"
      >
        {project.images.map((img, idx) =>
          !failedImages[idx] ? (
            <img
              key={img}
              src={img}
              alt={`${project.title} preview ${idx + 1}`}
              referrerPolicy="no-referrer"
              onError={() => setFailedImages((prev) => ({ ...prev, [idx]: true }))}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 transform group-hover:scale-105 ${
                idx === imageIndex ? 'opacity-90' : 'opacity-0 pointer-events-none'
              }`}
            />
          ) : null
        )}

        {/* Ambient Vignette & Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C10] via-black/40 to-black/20 pointer-events-none" />

        {/* Dynamic Image Pips (Cycles on Hover) */}
        {project.images.length > 1 && (
          <div className="absolute bottom-3 left-4 flex items-center gap-1.5 z-20 pointer-events-none">
            {project.images.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === imageIndex
                    ? 'w-6 bg-white shadow-[0_0_8px_#ffffff]'
                    : 'w-1.5 bg-white/30'
                }`}
                style={{
                  backgroundColor: idx === imageIndex ? accentColor : undefined
                }}
              />
            ))}
            {isHovered && (
              <span className="ml-2 text-[8.5px] font-mono text-white/80 uppercase font-bold tracking-widest bg-black/60 px-1.5 py-0.5 rounded border border-white/20 tabular-nums">
                {imageIndex + 1}/{project.images.length}
              </span>
            )}
          </div>
        )}

        {/* Monolithic Title Overlay */}
        <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none">
          <h3
            className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-white drop-shadow-[0_2px_15px_rgba(0,0,0,0.9)]"
            style={{
              textShadow: isHovered ? `0 0 25px ${accentColor}80` : undefined
            }}
          >
            {project.title}
          </h3>
        </div>
      </a>

      {/* Subtitle & Launch Action */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4 pointer-events-auto">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-zinc-200 font-mono tracking-wide">
            {project.sub}
          </p>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors shrink-0" />
        </div>

        {/* Brutalist Launch CTA — Standard HTML Anchor Tag */}
        <div className="pt-3 border-t border-white/5 relative z-30 pointer-events-auto">
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (onSelect) {
                onSelect();
              }
            }}
            className="block w-full text-center py-2.5 px-4 py-2.5! px-4! font-mono font-bold text-xs uppercase tracking-widest transition-all rounded-lg border group-hover:bg-white group-hover:text-black group-hover:border-white bg-black/60 border-white/20 text-white whitespace-nowrap no-underline cursor-pointer pointer-events-auto"
            style={{
              borderColor: isHovered ? accentColor : undefined,
              boxShadow: isHovered ? `0 0 20px ${accentColor}30` : undefined
            }}
          >
            [ LAUNCH // ENTER ENGINE ]
          </a>
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
        className="fixed top-16 left-0 w-full h-[calc(100vh-4rem)] bg-[#050505]/98 backdrop-blur-3xl border-t border-white/10 z-[10000] overflow-y-auto p-8 md:p-12 flex flex-col gap-8 font-mono select-none"
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
