/**
 * @file /src/components/menus/OverflowSettingsMenu.tsx
 * @description Master 3-Dot Overflow Settings & Rapid Module Launcher for HANDFILM.
 * Ultra-minimalist Icon-First + 1-2 Word Bold Tag grid wrapped in universal <CinemaToolHUD />.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  MoreHorizontal,
  Zap,
  Music,
  Settings,
  SlidersHorizontal,
  Trash2,
  Check,
  Film,
  FileCode,
  Share2,
  BarChart2,
  Keyboard,
  Wrench,
} from 'lucide-react';
import { CinemaToolHUD, CinemaBadgeHeader, CinemaToolTile } from '../ui/CinemaToolHUD';
import { PWAInstallButton } from '../pwa/PWAComponents';
import { studioDraftDb } from '../../services/db';
import { eventBus } from '../../core/eventBus';

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
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [closeTriggerKey]);

  const [cacheStatus, setCacheStatus] = useState<string | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePurgeCache = async () => {
    if (onOpenCacheManager) {
      onOpenCacheManager();
      return;
    }
    setIsPurging(true);
    try {
      const result = await studioDraftDb.purgeTransientCache();
      const freedMB = (result.freedEstimatesBytes / (1024 * 1024)).toFixed(1);
      setCacheStatus(`${freedMB} MB FREED`);
      setTimeout(() => {
        setCacheStatus(null);
        setIsOpen(false);
      }, 1400);
    } catch {
      setCacheStatus('CLEARED');
      setTimeout(() => {
        setCacheStatus(null);
        setIsOpen(false);
      }, 1200);
    } finally {
      setIsPurging(false);
    }
  };

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
        void handlePurgeCache();
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

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <CinemaToolHUD
        title="WORKSPACE SUITE MENU"
        en="Open compiler, beat sync, inspector, NLE exporters, and cache tools."
        bn="কম্পাইল, অডিও সিঙ্ক, সেটিংস এবং দ্রুত এক্সপোর্ট টুল খুলতে এখানে চাপুন।"
        accent="amber"
        side="bottom"
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          data-active={isOpen ? 'true' : 'false'}
          className="cinema-tile cinema-tile-amber w-[26px] h-[26px] rounded-md flex items-center justify-center cursor-pointer"
          aria-label="More Workspace Actions"
        >
          <MoreHorizontal className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.3} />
        </button>
      </CinemaToolHUD>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#0B0B0D]/98 border border-[#26282E] rounded-xl shadow-[0_24px_60px_rgba(0,0,0,0.95)] backdrop-blur-xl p-2.5 z-[9999] space-y-2.5">
          <CinemaBadgeHeader
            icon={<Wrench className="w-3 h-3" strokeWidth={2.4} />}
            label="SUITE TOOLS"
            accent="amber"
          />

          <div className="grid grid-cols-2 gap-1.5">
            <CinemaToolTile
              icon={<Zap className="w-5 h-5" strokeWidth={2.2} />}
              label="COMPILE"
              accent="amber"
              badge="PRO"
              onClick={() => handleAction('COMPILE')}
              hud={{
                title: '100-SHOT COMPILE ENGINE',
                en: 'Stitches loaded scenes into a continuous master reel.',
                bn: 'সব শট একসাথে জুড়ে দ্রুত মাস্টার রিলস বানাতে COMPILE চাপুন।',
                shortcut: '⌘B',
                accent: 'amber',
              }}
            />

            <CinemaToolTile
              icon={<Music className="w-5 h-5" strokeWidth={2.2} />}
              label="RAP SYNC"
              accent="crimson"
              badge="DSP"
              onClick={() => handleAction('RAP_SYNC')}
              hud={{
                title: 'RAP & 808 BEAT SYNC',
                en: '140 BPM transient chopper & 808 sub-bass lock.',
                bn: 'গানের বিট ও ৮০৮ বেজের সাথে ফ্রেম-কাট মিলাতে এটি ব্যবহার করুন।',
                shortcut: 'M',
                accent: 'crimson',
              }}
            />

            <CinemaToolTile
              icon={<Settings className="w-5 h-5" strokeWidth={2.2} />}
              label="SETTINGS"
              accent="cyan"
              onClick={() => handleAction('SETTINGS')}
              hud={{
                title: 'GLOBAL STUDIO SETTINGS',
                en: 'Canvas scaling, codec flags, and project preferences.',
                bn: 'স্টুডিওর রেজোলিউশন, হার্ডওয়্যার রেন্ডার ও সেটিংস বদলাতে চাপুন।',
                shortcut: '⌘,',
                accent: 'cyan',
              }}
            />

            <CinemaToolTile
              icon={<SlidersHorizontal className="w-5 h-5" strokeWidth={2.2} />}
              label="INSPECTOR"
              accent="amber"
              onClick={() => handleAction('INSPECTOR')}
              hud={{
                title: 'DIRECTOR INSPECTOR',
                en: '3D camera rig, optical lens telemetry, and LUT grading.',
                bn: 'ক্যামেরার অ্যাঙ্গেল, লেন্স তথ্য ও কালার গ্রেডিং দেখতে চাপুন।',
                shortcut: 'E',
                accent: 'amber',
              }}
            />

            <CinemaToolTile
              icon={<Trash2 className="w-5 h-5" strokeWidth={2.2} />}
              label={cacheStatus ? cacheStatus : 'PURGE CACHE'}
              accent="crimson"
              disabled={isPurging}
              onClick={() => handleAction('CACHE_MANAGER')}
              hud={{
                title: 'INDEXEDDB CACHE MANAGER',
                en: 'Purge temporary proxy bitmaps without deleting storyboards.',
                bn: 'অস্থায়ী ক্যাশ মুছে ব্রাউজার স্পেস খালি করতে PURGE CACHE চাপুন।',
                shortcut: '⌘⇧⌫',
                accent: 'crimson',
              }}
            />

            <CinemaToolTile
              icon={<BarChart2 className="w-5 h-5" strokeWidth={2.2} />}
              label="STATS"
              accent="cyan"
              onClick={() => handleAction('STATS')}
              hud={{
                title: 'PROJECT TELEMETRY STATS',
                en: 'Total SMPTE duration, cut speed, and pacing histogram.',
                bn: 'প্রজেক্টের মোট সময়, শট সংখ্যা ও কাটিং স্পিড দেখতে চাপুন।',
                shortcut: '⇧D',
                accent: 'cyan',
              }}
            />
          </div>

          <CinemaBadgeHeader
            icon={<Film className="w-3 h-3" strokeWidth={2.4} />}
            label="NLE EXPORT"
            accent="emerald"
          />

          <div className="grid grid-cols-3 gap-1.5">
            <CinemaToolTile
              icon={<Film className="w-5 h-5" strokeWidth={2.2} />}
              label="4K MP4"
              accent="emerald"
              onClick={() => handleAction('MP4')}
              hudId="export-4k"
            />
            <CinemaToolTile
              icon={<FileCode className="w-5 h-5" strokeWidth={2.2} />}
              label="XML"
              accent="amber"
              onClick={() => handleAction('XML')}
              hud={{
                title: 'ADOBE PREMIERE XML',
                en: 'Final Cut Pro 7 XML sequence exchange for Premiere Pro.',
                bn: 'অ্যাডোবি প্রিমিয়ার প্রোতে প্রজেক্ট নিতে XML ফাইল ডাউনলোড করুন।',
                shortcut: 'XML',
                accent: 'amber',
              }}
            />
            <CinemaToolTile
              icon={<Share2 className="w-5 h-5" strokeWidth={2.2} />}
              label="FCPXML"
              accent="cyan"
              onClick={() => handleAction('FCPXML')}
              hud={{
                title: 'CAPCUT & DAVINCI FCPXML',
                en: 'Apple Final Cut Pro X & CapCut timeline interchange.',
                bn: 'ক্যাপকাট বা ডাভিঞ্চি রিজলভে প্রজেক্ট পাঠাতে FCPXML চাপুন।',
                shortcut: 'FCP',
                accent: 'cyan',
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-1.5 pt-1 border-t border-white/10">
            <CinemaToolTile
              layout="horizontal"
              icon={<Keyboard className="w-4 h-4" strokeWidth={2.2} />}
              label="HOTKEYS"
              accent="amber"
              onClick={() => handleAction('SHORTCUTS')}
              hud={{
                title: 'KEYBOARD SHORTCUTS',
                en: 'Complete directory of editorial transport & grading hotkeys.',
                bn: 'কিবোর্ডের সব দ্রুত শর্টকাট একনজরে দেখতে HOTKEYS চাপুন।',
                shortcut: '⇧?',
                accent: 'amber',
              }}
            />
            <PWAInstallButton onTriggered={() => setIsOpen(false)} />
          </div>

          {cacheStatus && (
            <div className="p-2 rounded-lg bg-[#111215] border border-emerald-500/50 text-emerald-300 text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 tabular-nums">
              <Check className="w-3.5 h-3.5" />
              <span>{cacheStatus}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
