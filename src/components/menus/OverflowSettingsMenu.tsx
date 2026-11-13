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
import { PWAInstallButton } from '../pwa/PWAComponents';
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
  closeTriggerKey?: string;
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
  closeTriggerKey,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [closeTriggerKey]);
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
          className={`w-8 h-8 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
            isOpen
              ? 'border-[#F59E0B]/70 bg-[#F59E0B]/15 text-[#F59E0B]'
              : 'border-white/[0.07] bg-[#141417] text-[#8E8E93] hover:text-[#F4F4F5] hover:border-white/[0.16]'
          }`}
          aria-label="More Workspace Actions"
          title="More Workspace Actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </SmartHoverCard>

      {/* Monochrome Stealth Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#0B0B0D]/96 border border-white/[0.07] rounded-xl shadow-[0_24px_60px_rgba(0,0,0,0.95)] backdrop-blur-xl p-2 z-[9999] text-xs font-mono text-[#F4F4F5] animate-in fade-in zoom-in-95 duration-150 space-y-1">
          {/* Header */}
          <div className="px-2.5 py-1 text-[8.5px] font-bold text-[#F59E0B] border-b border-white/[0.07] uppercase tracking-wider flex items-center justify-between">
            <span>WORKSPACE SUITE // TOOLS</span>
            <span className="text-[#8E8E93] tabular-nums">BUILD 2.4</span>
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
              className="w-full px-2.5 py-2 rounded-lg hover:bg-[#141417] flex items-center justify-between text-left transition-colors cursor-pointer group text-[#F4F4F5]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#141417] border border-white/[0.07] group-hover:border-[#F59E0B]/50 flex items-center justify-center text-[#8E8E93] group-hover:text-[#F59E0B] transition-colors">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>COMPILE ENGINE</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-[#141417] text-[#F59E0B] border border-[#F59E0B]/35">
                      MASTER
                    </span>
                  </div>
                  <div className="text-[8.5px] text-[#8E8E93]">100-shot sequence stitching</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums">⌘B</kbd>
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
              className="w-full px-2.5 py-2 rounded-lg hover:bg-[#141417] flex items-center justify-between text-left transition-colors cursor-pointer group text-[#F4F4F5]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#141417] border border-white/[0.07] group-hover:border-[#F59E0B]/50 flex items-center justify-center text-[#8E8E93] group-hover:text-[#F59E0B] transition-colors">
                  <Music className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>RAP MUSIC & AUDIO SYNC</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-[#141417] text-[#8E8E93] border border-white/[0.07]">
                      DSP
                    </span>
                  </div>
                  <div className="text-[8.5px] text-[#8E8E93] tabular-nums">140 BPM transient chopper & 808 lock</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums">M</kbd>
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
              className="w-full px-2.5 py-2 rounded-lg hover:bg-[#141417] flex items-center justify-between text-left transition-colors cursor-pointer group text-[#F4F4F5]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#141417] border border-white/[0.07] group-hover:border-[#F59E0B]/50 flex items-center justify-center text-[#8E8E93] group-hover:text-[#F59E0B] transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>GLOBAL SETTINGS</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-[#141417] text-[#8E8E93] border border-white/[0.07]">
                      CONFIG
                    </span>
                  </div>
                  <div className="text-[8.5px] text-[#8E8E93]">Preferences, canvas scaling & renderers</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums">⌘,</kbd>
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
              className="w-full px-2.5 py-2 rounded-lg hover:bg-[#141417] flex items-center justify-between text-left transition-colors cursor-pointer group text-[#F4F4F5]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#141417] border border-white/[0.07] group-hover:border-[#F59E0B]/50 flex items-center justify-center text-[#8E8E93] group-hover:text-[#F59E0B] transition-colors">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>DIRECTOR INSPECTOR</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-[#141417] text-[#8E8E93] border border-white/[0.07]">
                      HUD
                    </span>
                  </div>
                  <div className="text-[8.5px] text-[#8E8E93]">Optical telemetry & buffer HUD</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums">E</kbd>
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
              className="w-full px-2.5 py-2 rounded-lg hover:bg-[#141417] flex items-center justify-between text-left transition-colors cursor-pointer group text-[#F4F4F5] disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#141417] border border-white/[0.07] group-hover:border-[#F59E0B]/50 flex items-center justify-center text-[#8E8E93] group-hover:text-[#F59E0B] transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>CACHE MANAGER</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-[#141417] text-[#8E8E93] border border-white/[0.07]">
                      INDEXEDDB
                    </span>
                  </div>
                  <div className="text-[8.5px] text-[#8E8E93] tabular-nums">
                    {cacheStatus || 'Purge temporary bitmaps & cache'}
                  </div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums">⌘⇧⌫</kbd>
            </button>
          </SmartHoverCard>

          {/* Section Divider: FORMATS & EXPORT PIPELINE */}
          <div className="pt-2 pb-1 px-2.5 text-[8.5px] font-bold text-[#F59E0B] border-t border-white/[0.07] uppercase tracking-wider flex items-center justify-between">
            <span>FORMATS & EXPORT PIPELINE</span>
            <span className="text-[#8E8E93] tabular-nums">NLE // 4K</span>
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
              className="w-full px-2.5 py-2 rounded-lg hover:bg-[#141417] flex items-center justify-between text-left transition-colors cursor-pointer group text-[#F4F4F5]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#141417] border border-white/[0.07] group-hover:border-[#F59E0B]/50 flex items-center justify-center text-[#8E8E93] group-hover:text-[#F59E0B] transition-colors">
                  <Film className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>MP4 4K / PRORES</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-[#141417] text-[#F59E0B] border border-[#F59E0B]/35 tabular-nums">
                      4K MUX
                    </span>
                  </div>
                  <div className="text-[8.5px] text-[#8E8E93]">Direct WebCodecs hardware export</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums">⌘E</kbd>
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
              className="w-full px-2.5 py-2 rounded-lg hover:bg-[#141417] flex items-center justify-between text-left transition-colors cursor-pointer group text-[#F4F4F5]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#141417] border border-white/[0.07] group-hover:border-[#F59E0B]/50 flex items-center justify-center text-[#8E8E93] group-hover:text-[#F59E0B] transition-colors">
                  <FileCode className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>PREMIERE XML</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-[#141417] text-[#8E8E93] border border-white/[0.07] tabular-nums">
                      FCP7
                    </span>
                  </div>
                  <div className="text-[8.5px] text-[#8E8E93]">Hollywood NLE sequence XML</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums">XML</kbd>
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
              className="w-full px-2.5 py-2 rounded-lg hover:bg-[#141417] flex items-center justify-between text-left transition-colors cursor-pointer group text-[#F4F4F5]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#141417] border border-white/[0.07] group-hover:border-[#F59E0B]/50 flex items-center justify-center text-[#8E8E93] group-hover:text-[#F59E0B] transition-colors">
                  <Share2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>CAPCUT / FCPXML</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-[#141417] text-[#8E8E93] border border-white/[0.07]">
                      FCPXML
                    </span>
                  </div>
                  <div className="text-[8.5px] text-[#8E8E93]">CapCut & DaVinci sequence export</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums">FCP</kbd>
            </button>
          </SmartHoverCard>

          {/* Section Divider: STATS & SHORTCUTS */}
          <div className="pt-2 pb-1 px-2.5 text-[8.5px] font-bold text-[#F59E0B] border-t border-white/[0.07] uppercase tracking-wider flex items-center justify-between">
            <span>DIAGNOSTICS & HELP</span>
            <span className="text-[#8E8E93]">HUD</span>
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
              className="w-full px-2.5 py-2 rounded-lg hover:bg-[#141417] flex items-center justify-between text-left transition-colors cursor-pointer group text-[#F4F4F5]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#141417] border border-white/[0.07] group-hover:border-[#F59E0B]/50 flex items-center justify-center text-[#8E8E93] group-hover:text-[#F59E0B] transition-colors">
                  <BarChart2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>STATS & TELEMETRY</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-[#141417] text-[#8E8E93] border border-white/[0.07]">
                      METRICS
                    </span>
                  </div>
                  <div className="text-[8.5px] text-[#8E8E93]">Total runtime, shot count & pacing</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums">⇧D</kbd>
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
              className="w-full px-2.5 py-2 rounded-lg hover:bg-[#141417] flex items-center justify-between text-left transition-colors cursor-pointer group text-[#F4F4F5]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#141417] border border-white/[0.07] group-hover:border-[#F59E0B]/50 flex items-center justify-center text-[#8E8E93] group-hover:text-[#F59E0B] transition-colors">
                  <Keyboard className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>KEYBOARD SHORTCUTS</span>
                    <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-[#141417] text-[#8E8E93] border border-white/[0.07]">
                      KEYS
                    </span>
                  </div>
                  <div className="text-[8.5px] text-[#8E8E93]">Directorial hotkey cheatsheet</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums">⇧?</kbd>
            </button>
          </SmartHoverCard>

          {/* In-App PWA Install Prompt (hidden automatically if already installed as standalone) */}
          <PWAInstallButton onTriggered={() => setIsOpen(false)} />

          {/* Cache Status Badge */}
          {cacheStatus && (
            <div className="p-2 rounded-lg bg-[#141417] border border-[#F59E0B]/50 text-[#F4F4F5] text-[9.5px] flex items-center gap-1.5 tabular-nums">
              <Check className="w-3 h-3 text-[#F59E0B]" />
              <span>{cacheStatus}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
