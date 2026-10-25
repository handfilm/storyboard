/**
 * @file /src/components/modules/B2BCommandCenter.tsx
 * @description Master B2B Corporate Hub & Enterprise Command Center.
 * Brutalist / glassmorphic modal with robust flex positioning wrapper:
 * - Wrapper: `fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none`
 * - Modal Container: `relative w-[700px] h-[500px] bg-[#0A0C10]/95 backdrop-blur-3xl border border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.15)] rounded-2xl p-6 pointer-events-auto flex flex-col`
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  X, 
  Briefcase, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  TrendingUp, 
  Presentation,
  Award,
  Zap,
  Sparkles
} from 'lucide-react';
import { useStudioStore } from '../../core/store';
import { eventBus } from '../../core/eventBus';
import { CINEMATIC_TITLE_PRESETS } from '../../constants/titleTemplates';

export interface B2BCommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  activeShotIndex?: number;
}

interface CorporatePreset {
  id: string;
  title: string;
  category: string;
  tagline: string;
  specs: string;
  accent: string;
}

const CORPORATE_PRESETS: CorporatePreset[] = [
  {
    id: 'corp_pitch',
    title: 'SERIES B // VENTURE BRIEF',
    category: 'EXECUTIVE DECK',
    tagline: 'High-conviction metrics with clean Swiss typographic layout.',
    specs: '60FPS • DCI-P3 • MINIMALIST GLOW',
    accent: '#10B981'
  },
  {
    id: 'corp_keynote',
    title: 'KEYNOTE // PRODUCT ANNOUNCEMENT',
    category: 'STADIUM MOTION',
    tagline: 'Monumental hardware reveal with anamorphic widescreen framing.',
    specs: '2.39:1 • 4K PRO RES • TACTILE DEPTH',
    accent: '#3B82F6'
  },
  {
    id: 'corp_quarterly',
    title: 'ANNUAL // SHAREHOLDER REPORT',
    category: 'FINANCIAL DATA',
    tagline: 'Dynamic bar-chart transitions and synchronized cashflow overlays.',
    specs: 'SUB-FRAME CADENCE • COMPLIANT HDR',
    accent: '#F59E0B'
  },
  {
    id: 'corp_brand',
    title: 'BRAND MONOGRAPH // ATELIER',
    category: 'LUXURY EDITORIAL',
    tagline: 'Monochrome high-fashion title treatment for heritage brands.',
    specs: '35MM GRAIN • 24FPS CINEMA RAW',
    accent: '#EC4899'
  }
];

export const B2BCommandCenter: React.FC<B2BCommandCenterProps> = ({
  isOpen,
  onClose,
  activeShotIndex = 0
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('corp_pitch');
  const [appliedSuccess, setAppliedSuccess] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleApplyPreset = (preset: CorporatePreset) => {
    setSelectedPresetId(preset.id);
    
    // Update shot in Studio Store
    useStudioStore.getState().updateShot(activeShotIndex, {
      directorNotes: `[B2B HUB // ${preset.category}] ${preset.title} - ${preset.tagline}`,
      title: preset.title,
      tagline: preset.tagline
    });

    // Also open the text drawer filtered to corporate if desired
    eventBus.emit('drawer:open', { type: 'text', category: 'corporate' });

    setAppliedSuccess(`✓ Applied "${preset.title}" to Shot SH${String(activeShotIndex + 1).padStart(3, '0')}!`);
    setTimeout(() => {
      setAppliedSuccess(null);
    }, 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="b2b-hub-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Robust Flex Positioning Wrapper */}
          <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none p-4">
            <motion.div
              key="b2b-hub-container"
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 280,
                mass: 0.85
              }}
              className="relative w-[700px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-2rem)] bg-[#0A0C10]/95 backdrop-blur-3xl border border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.15)] rounded-2xl p-6 pointer-events-auto flex flex-col justify-between font-mono select-none overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="b2b-hub-title"
            >
              {/* Decorative Accent Glows */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* 1. Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                <div id="b2b-hub-title" className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold tracking-widest text-white uppercase">
                      [ 🏢 B2B COMMAND CENTER // ENTERPRISE HUB ]
                    </h2>
                    <p className="text-[9px] text-zinc-400 tracking-wider">
                      CORPORATE TITLE SUITES • EXECUTIVE MOTION PRESETS • BRAND DECKS
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>[ 💼 ENTERPRISE TIER ]</span>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-2 py-1 rounded text-xs font-mono font-bold tracking-wider text-white/50 hover:text-white border border-white/10 hover:border-white/30 hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    [ X ]
                  </button>
                </div>
              </div>

              {/* 2. Content: Corporate Title Suite Cards */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2 min-h-0">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                    EXECUTIVE TITLE SUITES ({CORPORATE_PRESETS.length})
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    TARGET: SH{String(activeShotIndex + 1).padStart(3, '0')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CORPORATE_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => setSelectedPresetId(preset.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)] ring-1 ring-emerald-400/40'
                            : 'bg-black/50 border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span 
                              className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                              style={{ color: preset.accent, backgroundColor: `${preset.accent}15` }}
                            >
                              {preset.category}
                            </span>
                            <span className="text-[8px] font-mono text-zinc-500">{preset.specs}</span>
                          </div>
                          <h3 className="text-xs font-bold text-white tracking-wide mb-1 truncate">
                            {preset.title}
                          </h3>
                          <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-2">
                            {preset.tagline}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyPreset(preset);
                            }}
                            className="px-2.5 py-1 rounded text-[9px] font-bold tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer bg-emerald-500/20 hover:bg-emerald-500 hover:text-black border border-emerald-500/40 text-emerald-300"
                          >
                            <Zap className="w-2.5 h-2.5" />
                            <span>Apply to Shot</span>
                          </button>

                          <span className="text-[8px] text-zinc-500 font-mono">1-CLICK B2B</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Feedback Banner */}
              {appliedSuccess && (
                <div className="py-1 px-3 mb-2 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 animate-pulse">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{appliedSuccess}</span>
                </div>
              )}

              {/* 4. Footer Brutalist Action */}
              <div className="pt-2 border-t border-white/10 shrink-0 flex items-center justify-between gap-3">
                <div className="text-[9.5px] text-zinc-400 font-mono">
                  Enterprise Corporate License: <strong className="text-emerald-400">UNLIMITED DIRECT ACCESS</strong>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const preset = CORPORATE_PRESETS.find(p => p.id === selectedPresetId) || CORPORATE_PRESETS[0];
                    handleApplyPreset(preset);
                  }}
                  className="py-2 px-5 font-mono font-black text-xs uppercase tracking-widest transition-all cursor-pointer rounded-none border border-emerald-500/50 bg-emerald-950/70 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center gap-2"
                >
                  <Briefcase className="w-3.5 h-3.5 text-emerald-300" />
                  <span>[ ⚡ DEPLOY SELECTED B2B SUITE ]</span>
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
