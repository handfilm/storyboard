/**
 * @file /src/components/StudioNavRail.tsx
 * @description 10-Button Tactical Left Rail ("10 BUTTONS, 100 SHOTS") for HANDFILM Creative Suite.
 * Structures all studio capabilities into 10 cleanly spaced dedicated vertical buttons
 * (`STORY`, `CUT`, `CROP`, `TEXT`, `LIGHT`, `FX`, `AUDIO`, `CLOUD`, `BRIDGE`, `SYSTEM`)
 * with crisp icons + 8px uppercase micro-labels and portaled z-[9999] floating sub-tool flyouts.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Scissors,
  Crop,
  Type,
  Lightbulb,
  Wand2,
  Volume2,
  Cloud,
  Zap,
  Settings,
  Camera,
  Check,
  Activity,
  FolderOpen,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  PlaySquare,
  Sparkles,
  MessageSquare,
  Library,
  Clapperboard,
  Crosshair,
  ZoomIn,
  Eye,
  Lock,
  Unlock,
  Keyboard,
  Film,
  FileCode2,
  Download,
  BarChart3
} from 'lucide-react';
import { eventBus } from '../core/eventBus';

export type StudioModuleId =
  | 'PLAYER'
  | 'STORY'
  | 'MEDIA'
  | 'BOARD'
  | 'EDIT/CUT'
  | 'TEXT'
  | 'OPTICS'
  | 'SOUND'
  | 'LIQUIFY'
  | 'PRODUCTION'
  | 'REVIEW'
  | 'AI'
  | 'R2_STORAGE'
  | 'LIBRARY'
  | 'SETTINGS'
  | 'BLOOM'
  | 'EXPORT';

export interface CameraLensProfile {
  body: string;
  lens: string;
  sensor: string;
  shutter: string;
}

export const CINE_PROFILES: CameraLensProfile[] = [
  { body: 'ARRI RAW 14-BIT', lens: '35mm Master Prime f/1.4', sensor: 'Full-Frame Cine', shutter: '1/48s 180°' },
  { body: 'ARRI ALEXA 35', lens: '50mm Anamorphic 2x T2.0', sensor: 'Super 35 4.6K', shutter: '1/48s 180°' },
  { body: 'RED V-RAPTOR 8K', lens: '85mm Cine Portrait T1.3', sensor: '8K VistaVision', shutter: '1/48s 180°' },
  { body: 'SONY VENICE 2', lens: '24mm Ultra Wide Cine f/1.8', sensor: '8.6K Full-Frame', shutter: '1/48s 180°' },
  { body: 'PANAVISION DXL2', lens: '75mm Primo 70 T2.0', sensor: 'Large Format 8K', shutter: '1/48s 180°' }
];

export interface StudioNavRailProps {
  activeModule: StudioModuleId;
  onSelectModule: (module: StudioModuleId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isProMode: boolean;
  onToggleProMode?: () => void;
  onOpenVaultMode?: () => void;
  onOpenSelfTest?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenMultiCam?: () => void;
  onOpenVideoScopes?: () => void;
  onOpenShortcuts?: () => void;
  activeProfile?: CameraLensProfile;
  onSelectProfile?: (profile: CameraLensProfile) => void;
  totalShots?: number;
  currentShotIndex?: number;
  saveState?: string;
}

type RailButtonKey =
  | 'STORY'
  | 'CUT'
  | 'CROP'
  | 'TEXT'
  | 'LIGHT'
  | 'FX'
  | 'AUDIO'
  | 'CLOUD'
  | 'BRIDGE'
  | 'SYSTEM';

interface FlyoutSubTool {
  id: string;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isActive?: boolean;
  onSelect: () => void;
}

interface RailButtonConfig {
  key: RailButtonKey;
  label: string;
  title: string;
  why: string;
  icon: React.ComponentType<{ className?: string }>;
  activeModules: StudioModuleId[];
  onPrimaryClick: () => void;
  subTools: FlyoutSubTool[];
}

export const StudioNavRail: React.FC<StudioNavRailProps> = ({
  activeModule,
  onSelectModule,
  isCollapsed,
  onToggleCollapse,
  isProMode,
  onToggleProMode,
  onOpenVaultMode,
  onOpenSelfTest,
  onOpenSettingsModal,
  onOpenMultiCam,
  onOpenVideoScopes,
  onOpenShortcuts,
  activeProfile = CINE_PROFILES[0],
  onSelectProfile,
  totalShots = 100,
  currentShotIndex = 0,
  saveState = 'SAVED'
}) => {
  const [currentProfile, setCurrentProfile] = useState<CameraLensProfile>(activeProfile);
  const [isRailLocked, setIsRailLocked] = useState(false);
  const [openFlyout, setOpenFlyout] = useState<{
    key: RailButtonKey;
    top: number;
    left: number;
  } | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const flyoutRef = useRef<HTMLDivElement | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleFlyoutClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpenFlyout(null);
    }, 150);
  }, [clearCloseTimer]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (flyoutRef.current && !flyoutRef.current.contains(target)) {
        setOpenFlyout(null);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  const handleSelectCineProfile = (prof: CameraLensProfile) => {
    setCurrentProfile(prof);
    if (onSelectProfile) onSelectProfile(prof);
  };

  const openButtonFlyout = (key: RailButtonKey, targetEl: HTMLElement) => {
    clearCloseTimer();
    const rect = targetEl.getBoundingClientRect();
    const maxTop = typeof window !== 'undefined' ? window.innerHeight - 310 : rect.top;
    setOpenFlyout({
      key,
      top: Math.max(52, Math.min(maxTop, rect.top)),
      left: rect.right + 8
    });
  };

  const railButtons: RailButtonConfig[] = [
    {
      key: 'STORY',
      label: 'STORY',
      title: 'STORY NOTEBOOK & SCRIPT',
      why: 'Fountain screenplay editor, 3-Act beat matrix, and shot loglines',
      icon: BookOpen,
      activeModules: ['STORY', 'PRODUCTION'],
      onPrimaryClick: () => onSelectModule('STORY'),
      subTools: [
        {
          id: 'story-panel',
          label: 'Story Notebook',
          sub: 'Screenplay, scene loglines & Story Doctor',
          icon: BookOpen,
          badge: `${totalShots} SHOTS`,
          isActive: activeModule === 'STORY',
          onSelect: () => onSelectModule('STORY')
        },
        {
          id: 'prod-planner',
          label: 'Production Call Sheet',
          sub: 'Day-blocks, talent & gear allocator',
          icon: Clapperboard,
          isActive: activeModule === 'PRODUCTION',
          onSelect: () => onSelectModule('PRODUCTION')
        }
      ]
    },
    {
      key: 'CUT',
      label: 'CUT',
      title: 'TIMELINE CUT & MULTI-CAM',
      why: 'Multi-track NLE razor cuts, storyboard grid, and multi-cam desk',
      icon: Scissors,
      activeModules: ['EDIT/CUT', 'BOARD', 'PLAYER'],
      onPrimaryClick: () => onSelectModule('EDIT/CUT'),
      subTools: [
        {
          id: 'cut-nle',
          label: 'Multi-Track Cut NLE',
          sub: 'Sub-frame trimming & magnetic ripple lanes',
          icon: Scissors,
          badge: '24 FPS',
          isActive: activeModule === 'EDIT/CUT',
          onSelect: () => onSelectModule('EDIT/CUT')
        },
        {
          id: 'board-grid',
          label: 'Storyboard Grid Matrix',
          sub: `100-shot contact layout (Shot #${currentShotIndex + 1})`,
          icon: LayoutGrid,
          isActive: activeModule === 'BOARD',
          onSelect: () => onSelectModule('BOARD')
        },
        {
          id: 'stage-player',
          label: 'Animatic Stage Deck',
          sub: 'Return to primary tactile stage monitor',
          icon: PlaySquare,
          isActive: activeModule === 'PLAYER',
          onSelect: () => onSelectModule('PLAYER')
        },
        ...(onOpenMultiCam
          ? [
              {
                id: 'multicam-grid',
                label: 'Multi-Cam Switcher',
                sub: 'Synchronized multi-angle cutting desk',
                icon: Film,
                badge: 'SHIFT+M',
                onSelect: () => onOpenMultiCam()
              }
            ]
          : [])
      ]
    },
    {
      key: 'CROP',
      label: 'CROP',
      title: 'FRAMING, OPTICS & CAMERA RIG',
      why: 'Aspect ratios, safe composition guides, lens crop & cine body rig',
      icon: Crop,
      activeModules: ['OPTICS'],
      onPrimaryClick: () => onSelectModule('OPTICS'),
      subTools: [
        {
          id: 'optics-drawer',
          label: 'Optics & Crop Inspector',
          sub: `${currentProfile.body} // ${currentProfile.lens}`,
          icon: Crop,
          isActive: activeModule === 'OPTICS',
          onSelect: () => onSelectModule('OPTICS')
        },
        {
          id: 'toggle-guides',
          label: 'Safe Composition Guides',
          sub: 'Toggle rule-of-thirds & center crosshair',
          icon: Crosshair,
          badge: 'C',
          onSelect: () => eventBus.emit('studio:toggle_guides')
        },
        {
          id: 'parallax-zoom',
          label: 'Multi-Layer Parallax Zoom',
          sub: 'Scale foreground subject vs. background plate',
          icon: ZoomIn,
          onSelect: () => eventBus.emit('cockpit:toggle_zoom')
        }
      ]
    },
    {
      key: 'TEXT',
      label: 'TEXT',
      title: 'BILINGUAL TYPOGRAPHY',
      why: 'Kinetic Bangla & English titles, molten gold shaders, SRT burn-in',
      icon: Type,
      activeModules: ['TEXT'],
      onPrimaryClick: () => onSelectModule('TEXT'),
      subTools: [
        {
          id: 'text-drawer',
          label: 'Text & Title Drawer',
          sub: 'Bangla + English kinetic title cards',
          icon: Type,
          isActive: activeModule === 'TEXT',
          onSelect: () => onSelectModule('TEXT')
        },
        {
          id: 'toggle-titles',
          label: 'Toggle Stage Titles Layer',
          sub: 'Show or hide live kinetic title overlays',
          icon: Eye,
          onSelect: () => eventBus.emit('studio:toggle_titles')
        }
      ]
    },
    {
      key: 'LIGHT',
      label: 'LIGHT',
      title: '34-PRESET LIGHTING RIG & LUTS',
      why: 'Volumetric 34-preset cinema lighting rig, Hollywood LUTs, and bloom',
      icon: Lightbulb,
      activeModules: ['LIBRARY', 'BLOOM'],
      onPrimaryClick: () => onSelectModule('LIQUIFY'),
      subTools: [
        {
          id: 'light-rig-34',
          label: '34-Preset Lighting Rig',
          sub: 'Anamorphic flares, rim lights & volumetric haze',
          icon: Lightbulb,
          badge: '34 RIGS',
          onSelect: () => onSelectModule('LIQUIFY')
        },
        {
          id: 'lut-library',
          label: 'Cinema LUT Registry',
          sub: '15 Hollywood color film emulations',
          icon: Library,
          isActive: activeModule === 'LIBRARY',
          onSelect: () => onSelectModule('LIBRARY')
        },
        {
          id: 'bloom-stage',
          label: 'Bloom Interactive Stage',
          sub: 'Live optical halation & lens bloom canvas',
          icon: Sparkles,
          isActive: activeModule === 'BLOOM',
          onSelect: () => onSelectModule('BLOOM')
        }
      ]
    },
    {
      key: 'FX',
      label: 'FX',
      title: 'OPTICAL FX, WARP & AI STUDIO',
      why: 'Mesh liquify warp, AI cine prompts, and timestamped frame markup',
      icon: Wand2,
      activeModules: ['LIQUIFY', 'AI', 'REVIEW'],
      onPrimaryClick: () => onSelectModule('LIQUIFY'),
      subTools: [
        {
          id: 'liquify-warp',
          label: 'Liquify & Mesh Warp',
          sub: 'Push, twirl & optical speed FX sculptor',
          icon: Wand2,
          badge: 'W',
          isActive: activeModule === 'LIQUIFY',
          onSelect: () => onSelectModule('LIQUIFY')
        },
        {
          id: 'ai-director',
          label: 'AI Director Prompts',
          sub: 'Veo / Flow cinematography formulation matrix',
          icon: Sparkles,
          isActive: activeModule === 'AI',
          onSelect: () => onSelectModule('AI')
        },
        {
          id: 'review-pins',
          label: 'Frame Markup & Review',
          sub: 'Vector pins & timestamped director notes',
          icon: MessageSquare,
          isActive: activeModule === 'REVIEW',
          onSelect: () => onSelectModule('REVIEW')
        }
      ]
    },
    {
      key: 'AUDIO',
      label: 'AUDIO',
      title: 'MASTER AUDIO, VU & SCOPES',
      why: '48kHz DSP mixer, waveform beat detection, scopes & telemetry',
      icon: Volume2,
      activeModules: ['SOUND'],
      onPrimaryClick: () => onSelectModule('SOUND'),
      subTools: [
        {
          id: 'sound-studio',
          label: 'Sound DSP Studio',
          sub: 'Master stems, beat sync & audio track cueing',
          icon: Volume2,
          isActive: activeModule === 'SOUND',
          onSelect: () => onSelectModule('SOUND')
        },
        ...(onOpenVideoScopes
          ? [
              {
                id: 'video-scopes',
                label: 'IRE & RGB Scopes',
                sub: 'Waveform, RGB parade & vectorscope monitor',
                icon: BarChart3,
                onSelect: () => onOpenVideoScopes()
              }
            ]
          : []),
        {
          id: 'spectral-analyzer',
          label: 'Spectral Energy Visualizer',
          sub: 'Toggle live multi-band frequency HUD',
          icon: Activity,
          onSelect: () => eventBus.emit('cockpit:toggle_spectrum')
        },
        {
          id: 'modular-telemetry',
          label: 'Modular Telemetry Rack',
          sub: 'Audio sync, voice cue & 3D LUT rack',
          icon: SlidersHorizontal,
          onSelect: () => eventBus.emit('cockpit:toggle_telemetry')
        }
      ]
    },
    {
      key: 'CLOUD',
      label: 'CLOUD',
      title: 'MEDIA VAULT & R2 CLOUD ARCHIVE',
      why: 'Resilient IndexedDB vault, Cloudflare R2 edge sync, project snapshots',
      icon: Cloud,
      activeModules: ['MEDIA', 'R2_STORAGE'],
      onPrimaryClick: () => onSelectModule('MEDIA'),
      subTools: [
        {
          id: 'media-vault',
          label: 'Media Asset Vault',
          sub: `Ingest & manage frames (${saveState.toUpperCase()})`,
          icon: FolderOpen,
          isActive: activeModule === 'MEDIA',
          onSelect: () => onSelectModule('MEDIA')
        },
        {
          id: 'r2-cloud',
          label: 'Cloudflare R2 Edge Sync',
          sub: 'S3 byte-range cloud archive & snapshots',
          icon: Cloud,
          isActive: activeModule === 'R2_STORAGE',
          onSelect: () => onSelectModule('R2_STORAGE')
        },
        ...(onOpenVaultMode
          ? [
              {
                id: 'idb-projects',
                label: 'Project Vault Manager',
                sub: 'Switch or clone local IDB anthology vaults',
                icon: FolderOpen,
                badge: 'IDB',
                onSelect: () => onOpenVaultMode()
              }
            ]
          : [])
      ]
    },
    {
      key: 'BRIDGE',
      label: 'BRIDGE',
      title: 'ECOSYSTEM INTERCHANGE HUB',
      why: 'Dispatch frames & sequences to Photoshop, Premiere Pro, Resolve & CapCut',
      icon: Zap,
      activeModules: ['EXPORT'],
      onPrimaryClick: () => eventBus.emit('cockpit:action', { type: 'open_modal' }),
      subTools: [
        {
          id: 'cockpit-hub',
          label: "Director's Cockpit Hub",
          sub: 'PS paint-over, PR/Resolve XML & CapCut pack',
          icon: Zap,
          badge: 'HUB',
          onSelect: () => eventBus.emit('cockpit:action', { type: 'open_modal' })
        },
        {
          id: 'nle-xml',
          label: 'Export FCPXML Sequence',
          sub: 'Premiere Pro / DaVinci Resolve v1.9 XML',
          icon: FileCode2,
          onSelect: () => eventBus.emit('cockpit:action', { type: 'nle_xml' })
        },
        {
          id: 'capcut-pack',
          label: 'Build CapCut Quick-Pack',
          sub: 'Draft timeline JSON + director cue sheet ZIP',
          icon: Download,
          onSelect: () => eventBus.emit('cockpit:action', { type: 'capcut_pack' })
        },
        {
          id: 'publish-export',
          label: 'Master Export Studio',
          sub: 'MP4 burn-in, PDF lookbook & RAWX archive',
          icon: Film,
          isActive: activeModule === 'EXPORT',
          onSelect: () => onSelectModule('EXPORT')
        }
      ]
    },
    {
      key: 'SYSTEM',
      label: 'SYSTEM',
      title: 'SETTINGS, SHORTCUTS & RAIL LOCK',
      why: 'Studio preferences, keyboard shortcuts, telemetry mode & rail lock',
      icon: Settings,
      activeModules: ['SETTINGS'],
      onPrimaryClick: () => {
        if (onOpenSettingsModal) onOpenSettingsModal();
        else onSelectModule('SETTINGS');
      },
      subTools: [
        ...(onOpenSettingsModal
          ? [
              {
                id: 'studio-settings',
                label: 'Studio Settings',
                sub: 'Audio/video codecs, workspace & quota gauges',
                icon: Settings,
                onSelect: () => onOpenSettingsModal()
              }
            ]
          : []),
        {
          id: 'settings-drawer',
          label: 'System Config Drawer',
          sub: 'Hardware WebGL flags & storage inspection',
          icon: SlidersHorizontal,
          isActive: activeModule === 'SETTINGS',
          onSelect: () => onSelectModule('SETTINGS')
        },
        ...(onToggleProMode
          ? [
              {
                id: 'pro-mode',
                label: 'Pro Telemetry Mode',
                sub: isProMode ? 'Disable focus peaking & HUD scopes' : 'Enable Pro exposure & telemetry',
                icon: Activity,
                badge: isProMode ? 'ON' : 'OFF',
                isActive: isProMode,
                onSelect: () => onToggleProMode()
              }
            ]
          : []),
        {
          id: 'toggle-collapse',
          label: isCollapsed ? 'Expand Left Rail' : 'Collapse Left Rail',
          sub: isRailLocked ? 'Unlock rail first to resize' : 'Switch compact / wide rail labels',
          icon: isCollapsed ? ChevronRight : ChevronLeft,
          onSelect: () => {
            if (!isRailLocked) onToggleCollapse();
          }
        },
        {
          id: 'lock-rail',
          label: isRailLocked ? 'Unlock Rail Position' : 'Lock Rail Position',
          sub: isRailLocked ? 'Rail layout is locked' : 'Prevent accidental rail resize',
          icon: isRailLocked ? Unlock : Lock,
          badge: isRailLocked ? 'LOCKED' : 'OPEN',
          isActive: isRailLocked,
          onSelect: () => setIsRailLocked((prev) => !prev)
        },
        ...(onOpenShortcuts
          ? [
              {
                id: 'keyboard-shortcuts',
                label: 'Keyboard Shortcuts',
                sub: 'J-K-L playback, razor & director hotkeys',
                icon: Keyboard,
                badge: '?',
                onSelect: () => onOpenShortcuts()
              }
            ]
          : []),
        ...(onOpenSelfTest
          ? [
              {
                id: 'self-test',
                label: 'Hardware Self-Test',
                sub: 'Benchmark WebGL, IndexedDB I/O & decoders',
                icon: Activity,
                onSelect: () => onOpenSelfTest()
              }
            ]
          : [])
      ]
    }
  ];

  const activeFlyoutConfig = openFlyout
    ? railButtons.find((b) => b.key === openFlyout.key) ?? null
    : null;

  return (
    <aside
      aria-label="Director Left Tool Rail"
      className={`h-full pb-[128px] select-none z-30 shrink-0 bg-black/92 backdrop-blur-2xl border-r border-white/10 flex flex-col font-mono-tech transition-all duration-200 relative ${
        isCollapsed ? 'w-[60px]' : 'w-56'
      }`}
    >
      {/* Clean 10-Button Vertical Spine — fits cleanly above timeline at 100% zoom */}
      <nav
        aria-label="10 Studio Tools"
        className="flex-1 min-h-0 overflow-y-auto no-scrollbar max-h-[calc(100vh-140px)] py-2 px-1.5 flex flex-col items-center gap-1.5"
      >
        {railButtons.map((btn) => {
          const Icon = btn.icon;
          const isActive =
            btn.activeModules.includes(activeModule) ||
            (btn.key === 'SYSTEM' && isRailLocked) ||
            openFlyout?.key === btn.key;

          return (
            <button
              key={btn.key}
              type="button"
              data-testid={`rail-btn-${btn.key.toLowerCase()}`}
              aria-label={btn.title}
              onMouseEnter={(e) => openButtonFlyout(btn.key, e.currentTarget)}
              onMouseLeave={scheduleFlyoutClose}
              onClick={(e) => {
                openButtonFlyout(btn.key, e.currentTarget);
                btn.onPrimaryClick();
              }}
              className={`group relative rounded-[5px] cursor-pointer transition-all duration-150 select-none active:scale-95 shrink-0 ${
                isCollapsed
                  ? 'w-11 py-1.5 px-1 flex flex-col items-center justify-center gap-1'
                  : 'w-full px-2.5 py-2 flex items-center gap-2.5'
              } ${
                isActive
                  ? 'bg-gradient-to-b from-[#2a2214] via-[#1a150b] to-[#0f0c05] border border-amber-400/90 shadow-[inset_0_1px_1.5px_rgba(251,191,36,0.35),_0_0_10px_rgba(245,166,35,0.22)]'
                  : 'bg-gradient-to-b from-[#181822] via-[#12121b] to-[#0b0b12] border border-white/10 hover:border-amber-400/70 hover:from-[#222232] hover:to-[#13131f]'
              }`}
            >
              {isActive && (
                <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-400 rounded-r shadow-[0_0_8px_#fbbf24]" />
              )}

              <Icon
                className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                  isActive ? 'text-amber-300' : 'text-zinc-300 group-hover:text-amber-300'
                }`}
              />

              {isCollapsed ? (
                <span
                  className={`text-[8px] leading-none font-bold uppercase tracking-tight whitespace-nowrap ${
                    isActive ? 'text-amber-300' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                >
                  {btn.label}
                </span>
              ) : (
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] font-black tracking-wider uppercase truncate ${
                        isActive ? 'text-amber-300' : 'text-zinc-200'
                      }`}
                    >
                      {btn.label}
                    </span>
                    <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-amber-300 shrink-0" />
                  </div>
                  <div className="text-[8px] text-zinc-500 truncate leading-tight mt-0.5">
                    {btn.why}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Portaled z-[9999] Floating Flyout Menu */}
      {openFlyout && activeFlyoutConfig && typeof document !== 'undefined' && createPortal(
        <div
          ref={flyoutRef}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleFlyoutClose}
          style={{
            position: 'fixed',
            top: `${openFlyout.top}px`,
            left: `${openFlyout.left}px`,
            zIndex: 9999
          }}
          className="z-[9999] w-64 bg-[#08090f]/98 border border-amber-500/60 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.95)] backdrop-blur-xl p-2 font-mono text-xs text-zinc-200 space-y-1.5"
        >
          {/* Flyout Header */}
          <div className="px-2 py-1 border-b border-white/10 flex items-center justify-between gap-2">
            <span className="text-[9px] font-black tracking-widest uppercase text-amber-300 truncate">
              {activeFlyoutConfig.title}
            </span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-400/30 shrink-0">
              {activeFlyoutConfig.label}
            </span>
          </div>

          <p className="px-2 text-[9px] text-zinc-400 leading-snug">
            {activeFlyoutConfig.why}
          </p>

          {/* Sub-tool Buttons */}
          <div className="space-y-1 pt-0.5">
            {activeFlyoutConfig.subTools.map((sub) => {
              const SubIcon = sub.icon;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    sub.onSelect();
                    setOpenFlyout(null);
                  }}
                  className={`w-full px-2 py-1.5 rounded flex items-center gap-2 text-left transition-colors cursor-pointer border ${
                    sub.isActive
                      ? 'bg-amber-500/15 border-amber-400/60 text-amber-200'
                      : 'bg-neutral-900/90 hover:bg-neutral-800 border-white/10 hover:border-amber-400/50 text-zinc-200'
                  }`}
                >
                  <SubIcon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      sub.isActive ? 'text-amber-300' : 'text-zinc-400'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold truncate">{sub.label}</div>
                    <div className="text-[8.5px] text-zinc-400 truncate">{sub.sub}</div>
                  </div>
                  {sub.badge && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-black/70 border border-white/15 text-amber-300 shrink-0">
                      {sub.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Inline Cine Rig Switcher inside CROP flyout */}
          {activeFlyoutConfig.key === 'CROP' && (
            <div className="pt-1.5 border-t border-white/10 space-y-1">
              <div className="px-2 flex items-center justify-between text-[8.5px] text-amber-300 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  CINE BODY & LENS
                </span>
                <span className="text-zinc-500">{currentProfile.shutter}</span>
              </div>
              <div className="space-y-0.5 max-h-36 overflow-y-auto no-scrollbar">
                {CINE_PROFILES.map((prof) => {
                  const selected = prof.body === currentProfile.body;
                  return (
                    <button
                      key={prof.body}
                      type="button"
                      onClick={() => handleSelectCineProfile(prof)}
                      className={`w-full px-2 py-1 rounded text-left flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        selected
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                          : 'hover:bg-white/5 text-zinc-300 border border-transparent'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[9.5px] font-bold truncate">{prof.body}</div>
                        <div className="text-[8px] text-zinc-400 truncate">{prof.lens}</div>
                      </div>
                      {selected && <Check className="w-3 h-3 text-amber-300 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </aside>
  );
};
