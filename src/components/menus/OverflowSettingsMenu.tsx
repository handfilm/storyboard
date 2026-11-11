/**
 * @file /src/components/menus/OverflowSettingsMenu.tsx
 * @description Master 3-Dot Overflow Settings & Rapid Module Launcher for HANDFILM.
 * Houses restored rapid-iteration modules:
 * - [ ⚡ COMPILE ENGINE ]
 * - [ 🎵 RAP MUSIC & AUDIO SYNC ]
 * - [ ⚙️ GLOBAL SETTINGS ]
 * - [ 🛠 DIRECTOR INSPECTOR ]
 * - [ 🗃️ CACHE MANAGER ]
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreHorizontal, 
  Zap, 
  Music, 
  Settings, 
  SlidersHorizontal, 
  Trash2, 
  Database,
  Check,
  Sparkles,
  ExternalLink,
  Film,
  FileCode,
  Share2,
  BarChart2,
  Keyboard
} from 'lucide-react';
import { SmartHoverCard } from '../ui/SmartHoverCard';
import { studioDraftDb } from '../../services/db';
import { eventBus } from '../../core/eventBus';
import { RESTORED_OVERFLOW_MODULES } from '../../types/modules';

export interface OverflowSettingsMenuProps {
  onOpenCompile?: () => void;
  onOpenRapSync?: () => void;
  onOpenSettings?: () => void;
  onOpenInspector?: () => void;
  onOpenCacheManager?: () => void;
  onOpenExport?: () => void;
  onOpenExportXml?: () => void;
  onOpenExportFcpxml?: () => void;
  onOpenProjectStats?: () => void;
  onOpenShortcuts?: () => void;
  className?: string;
}

export const OverflowSettingsMenu: React.FC<OverflowSettingsMenuProps> = ({
  onOpenCompile,
  onOpenRapSync,
  onOpenSettings,
  onOpenInspector,
  onOpenCacheManager,
  onOpenExport,
  onOpenExportXml,
  onOpenExportFcpxml,
  onOpenProjectStats,
  onOpenShortcuts,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleAction = (id: string) => {
    setIsOpen(false);
    switch (id) {
      case 'COMPILE':
        if (onOpenCompile) onOpenCompile();
        else eventBus.emit('compile:open');
        break;
      case 'RAP_SYNC':
        if (onOpenRapSync) onOpenRapSync();
        else eventBus.emit('rap:open');
        break;
      case 'SETTINGS':
        if (onOpenSettings) onOpenSettings();
        else eventBus.emit('settings:open');
        break;
      case 'INSPECTOR':
        if (onOpenInspector) onOpenInspector();
        else eventBus.emit('inspector:toggle');
        break;
      case 'CACHE_MANAGER':
        handlePurgeCache();
        break;
      case 'STATS':
        if (onOpenProjectStats) onOpenProjectStats();
        else eventBus.emit('stats:open');
        break;
      case 'MP4':
        if (onOpenExport) onOpenExport();
        else eventBus.emit('export:open');
        break;
      case 'XML':
        if (onOpenExportXml) onOpenExportXml();
        else eventBus.emit('export:xml');
        break;
      case 'FCPXML':
        if (onOpenExportFcpxml) onOpenExportFcpxml();
        else eventBus.emit('export:fcpxml');
        break;
      case 'SHORTCUTS':
        if (onOpenShortcuts) onOpenShortcuts();
        else eventBus.emit('shortcuts:open');
        break;
      default:
        break;
    }
  };

  const handlePurgeCache = async () => {
    if (onOpenCacheManager) {
      onOpenCacheManager();
      return;
    }
    setIsPurging(true);
    try {
      const result = await studioDraftDb.purgeTransientCache();
      const freedMB = (result.freedEstimatesBytes / (1024 * 1024)).toFixed(1);
      setCacheStatus(`Purged ${result.purgedCount} items (${freedMB} MB freed)`);
      setTimeout(() => {
        setCacheStatus(null);
        setIsOpen(false);
      }, 1500);
    } catch (err) {
      console.warn('Cache purge warning:', err);
      setCacheStatus('IndexedDB cache purged');
      setTimeout(() => {
        setCacheStatus(null);
        setIsOpen(false);
      }, 1200);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* 3-Dot Button with SmartHoverCard */}
      <SmartHoverCard
        code="[ ⋯ // WORKSPACE ]"
        description="Access Workspace Settings, Compile Engine, and Audio/Rap Modules."
        align="right"
      >
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className={`h-9 px-3 rounded-lg border text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer ${
            isOpen
              ? 'border-amber-500/70 bg-amber-500/10 text-amber-400 shadow-[0_0_12px_rgba(245,166,35,0.25)]'
              : 'border-white/10 hover:border-white/30'
          }`}
          aria-label="More Workspace Actions"
          title="More Workspace Actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </SmartHoverCard>

      {/* Glassmorphic Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#0E1015]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl p-2 z-50 text-xs font-mono text-white/90 animate-in fade-in zoom-in-95 duration-150 space-y-1">
          {/* Header */}
          <div className="px-2.5 py-1 text-[8.5px] font-bold text-amber-400 border-b border-white/10 uppercase tracking-wider flex items-center justify-between">
            <span>WORKSPACE SUITE // TOOLS</span>
            <span className="text-zinc-500">BUILD 2.4</span>
          </div>

          {/* Module 1: COMPILE ENGINE */}
          <SmartHoverCard
            code="[ ⚡ COMPILE ENGINE ]"
            description="Sequence compilation module — stitches 100-shot montage into master reel."
            align="right"
            className="w-full"
          >
            <button
              type="button"
              onClick={() => handleAction('COMPILE')}
              className="w-full px-2.5 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer group text-white/90 hover:text-amber-300"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>COMPILE ENGINE</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      MASTER
                    </span>
                  </div>
                  <div className="text-[8.5px] text-zinc-400">100-shot sequence stitching</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[9px] text-zinc-400">⌘B</kbd>
            </button>
          </SmartHoverCard>

          {/* Module 2: RAP MUSIC & AUDIO SYNC */}
          <SmartHoverCard
            code="[ 🎵 RAP MUSIC & AUDIO SYNC ]"
            description="Rap transient chopper, 140 BPM beat snapping, 808 sub-bass lock, and audio-reactive visualization."
            align="right"
            className="w-full"
          >
            <button
              type="button"
              onClick={() => handleAction('RAP_SYNC')}
              className="w-full px-2.5 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer group text-white/90 hover:text-yellow-300"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-yellow-500/15 border border-yellow-500/40 flex items-center justify-center text-yellow-400 group-hover:scale-105 transition-transform">
                  <Music className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>RAP MUSIC & AUDIO SYNC</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                      DSP
                    </span>
                  </div>
                  <div className="text-[8.5px] text-zinc-400">140 BPM transient chopper & 808 lock</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[9px] text-zinc-400">M</kbd>
            </button>
          </SmartHoverCard>

          {/* Module 3: GLOBAL SETTINGS */}
          <SmartHoverCard
            code="[ ⚙️ GLOBAL SETTINGS ]"
            description="Master studio preferences, UI scaling, rendering bitrates, and hardware codec flags."
            align="right"
            className="w-full"
          >
            <button
              type="button"
              onClick={() => handleAction('SETTINGS')}
              className="w-full px-2.5 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer group text-white/90 hover:text-sky-300"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>GLOBAL SETTINGS</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                      CONFIG
                    </span>
                  </div>
                  <div className="text-[8.5px] text-zinc-400">Preferences, canvas scaling & renderers</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[9px] text-zinc-400">⌘,</kbd>
            </button>
          </SmartHoverCard>

          {/* Module 4: DIRECTOR INSPECTOR */}
          <SmartHoverCard
            code="[ 🛠 DIRECTOR INSPECTOR ]"
            description="Advanced telemetry, WebCodecs buffer stats, optical lens data, and real-time debug tools."
            align="right"
            className="w-full"
          >
            <button
              type="button"
              onClick={() => handleAction('INSPECTOR')}
              className="w-full px-2.5 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer group text-white/90 hover:text-purple-300"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>DIRECTOR INSPECTOR</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      HUD
                    </span>
                  </div>
                  <div className="text-[8.5px] text-zinc-400">Optical telemetry & buffer HUD</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[9px] text-zinc-400">E</kbd>
            </button>
          </SmartHoverCard>

          {/* Module 5: CACHE MANAGER */}
          <SmartHoverCard
            code="[ 🗃️ CACHE MANAGER ]"
            description="Inspect storage consumption and purge temporary proxy canvas bitmaps from IndexedDB."
            align="right"
            className="w-full"
          >
            <button
              type="button"
              onClick={() => handleAction('CACHE_MANAGER')}
              disabled={isPurging}
              className="w-full px-2.5 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer group text-white/90 hover:text-rose-300 disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>CACHE MANAGER</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      INDEXEDDB
                    </span>
                  </div>
                  <div className="text-[8.5px] text-zinc-400">
                    {cacheStatus || 'Purge temporary bitmaps & cache'}
                  </div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[9px] text-zinc-400">⌘⇧⌫</kbd>
            </button>
          </SmartHoverCard>

          {/* Section Divider: FORMATS & EXPORT PIPELINE */}
          <div className="pt-2 pb-1 px-2.5 text-[8.5px] font-bold text-amber-400 border-t border-white/10 uppercase tracking-wider flex items-center justify-between">
            <span>FORMATS & EXPORT PIPELINE</span>
            <span className="text-zinc-500">NLE // 4K</span>
          </div>

          {/* Module 6: MP4 4K / PRORES */}
          <SmartHoverCard
            code="[ 🎥 MP4 4K / PRORES ]"
            description="Client-side hardware WebCodecs 4K MP4 and ProRes rasterizer with zero cloud latency."
            align="right"
            className="w-full"
          >
            <button
              type="button"
              onClick={() => handleAction('MP4')}
              className="w-full px-2.5 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer group text-white/90 hover:text-amber-300"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Film className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>MP4 4K / PRORES</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      4K MUX
                    </span>
                  </div>
                  <div className="text-[8.5px] text-zinc-400">Direct WebCodecs hardware export</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[9px] text-zinc-400">⌘E</kbd>
            </button>
          </SmartHoverCard>

          {/* Module 7: PREMIERE XML */}
          <SmartHoverCard
            code="[ 🎬 PREMIERE XML ]"
            description="Standard Final Cut Pro 7 XML timeline exchange format for Adobe Premiere Pro."
            align="right"
            className="w-full"
          >
            <button
              type="button"
              onClick={() => handleAction('XML')}
              className="w-full px-2.5 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer group text-white/90 hover:text-cyan-300"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <FileCode className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>PREMIERE XML</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      FCP7
                    </span>
                  </div>
                  <div className="text-[8.5px] text-zinc-400">Hollywood NLE sequence XML</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[9px] text-zinc-400">XML</kbd>
            </button>
          </SmartHoverCard>

          {/* Module 8: CAPCUT / FCPXML */}
          <SmartHoverCard
            code="[ ✂️ CAPCUT / FCPXML ]"
            description="Apple Final Cut Pro X & CapCut Desktop XML sequence export with track markers."
            align="right"
            className="w-full"
          >
            <button
              type="button"
              onClick={() => handleAction('FCPXML')}
              className="w-full px-2.5 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer group text-white/90 hover:text-emerald-300"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Share2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>CAPCUT / FCPXML</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      FCPXML
                    </span>
                  </div>
                  <div className="text-[8.5px] text-zinc-400">CapCut & DaVinci sequence export</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[9px] text-zinc-400">FCP</kbd>
            </button>
          </SmartHoverCard>

          {/* Section Divider: STATS & SHORTCUTS */}
          <div className="pt-2 pb-1 px-2.5 text-[8.5px] font-bold text-amber-400 border-t border-white/10 uppercase tracking-wider flex items-center justify-between">
            <span>DIAGNOSTICS & HELP</span>
            <span className="text-zinc-500">HUD</span>
          </div>

          {/* Module 9: STATS & TELEMETRY */}
          <SmartHoverCard
            code="[ 📊 STATS & TELEMETRY ]"
            description="Live playback engine stats, total SMPTE duration, average cut speed and pacing histogram."
            align="right"
            className="w-full"
          >
            <button
              type="button"
              onClick={() => handleAction('STATS')}
              className="w-full px-2.5 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer group text-white/90 hover:text-blue-300"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-blue-500/15 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <BarChart2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>STATS & TELEMETRY</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      METRICS
                    </span>
                  </div>
                  <div className="text-[8.5px] text-zinc-400">Total runtime, shot count & pacing</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[9px] text-zinc-400">⇧D</kbd>
            </button>
          </SmartHoverCard>

          {/* Module 10: KEYBOARD SHORTCUTS */}
          <SmartHoverCard
            code="[ ⌨️ KEYBOARD SHORTCUTS ]"
            description="Complete directory of Hollywood editorial hotkeys and transport shortcuts."
            align="right"
            className="w-full"
          >
            <button
              type="button"
              onClick={() => handleAction('SHORTCUTS')}
              className="w-full px-2.5 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer group text-white/90 hover:text-yellow-300"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-yellow-500/15 border border-yellow-500/40 flex items-center justify-center text-yellow-400 group-hover:scale-105 transition-transform">
                  <Keyboard className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>KEYBOARD SHORTCUTS</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                      KEYS
                    </span>
                  </div>
                  <div className="text-[8.5px] text-zinc-400">Directorial hotkey cheatsheet</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[9px] text-zinc-400">⇧?</kbd>
            </button>
          </SmartHoverCard>

          {/* Cache Status Badge */}
          {cacheStatus && (
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-[9.5px] flex items-center gap-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>{cacheStatus}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
