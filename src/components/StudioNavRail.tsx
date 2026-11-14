/**
 * @file /src/components/StudioNavRail.tsx
 * @description 10-Button Full-Height Tactical Left Rail
 * for HANDFILM Creative Suite with Advanced Glassmorphic Brutalist Flyout Menus.
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
  HardDrive,
  Zap,
  Settings,
  Camera,
  Check,
  Activity,
  FolderOpen,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
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
  BarChart3,
  Video
} from 'lucide-react';
import { eventBus } from '../core/eventBus';
import { useStudioStore } from '../core/store';

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

export interface RailFrameAdjustments {
  bloom: number;
  grain: number;
  vignette: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  motionBlur?: number;
}

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
  onOpenRecorder?: () => void;
  activeFrameAdjustments?: RailFrameAdjustments;
  onUpdateActiveAdjustments?: (patch: Partial<RailFrameAdjustments>) => void;
  activeProfile?: CameraLensProfile;
  onSelectProfile?: (profile: CameraLensProfile) => void;
  totalShots?: number;
  currentShotIndex?: number;
  saveState?: string;
  isPlaying?: boolean;
}

type RailButtonKey =
  | 'STORY'
  | 'MEDIA'
  | 'TEXT'
  | 'AUDIO'
  | 'CUT'
  | 'CROP'
  | 'LIGHT'
  | 'FX'
  | 'BRIDGE'
  | 'SYSTEM';

interface FlyoutSubTool {
  id: string;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  shortcut?: string;
  isActive?: boolean;
  onSelect: () => void;
}

interface RailButtonConfig {
  key: RailButtonKey;
  label: string;
  title: string;
  why: string;
  accentHex: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
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
  onOpenRecorder,
  activeFrameAdjustments,
  onUpdateActiveAdjustments,
  activeProfile = CINE_PROFILES[0],
  onSelectProfile,
  totalShots = 100,
  currentShotIndex = 0,
  saveState = 'SAVED',
  isPlaying
}) => {
  const storeIsPlaying = useStudioStore((s) => s.isPlaying);
  const effectiveIsPlaying = typeof isPlaying === 'boolean' ? isPlaying : storeIsPlaying;
  const [currentProfile, setCurrentProfile] = useState<CameraLensProfile>(activeProfile);
  const [isRailLocked, setIsRailLocked] = useState(false);
  const [isMobileDockCollapsed, setIsMobileDockCollapsed] = useState(false);
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
    }, 180);
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
    const isNarrow = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isNarrow) {
      const clampedLeft = Math.max(8, Math.min(window.innerWidth - 296, rect.left));
      const flyoutTop = Math.max(52, rect.top - 320);
      setOpenFlyout({ key, top: flyoutTop, left: clampedLeft });
      return;
    }
    const maxTop = typeof window !== 'undefined' ? Math.max(52, window.innerHeight - 360) : rect.top;
    setOpenFlyout({
      key,
      top: Math.max(48, Math.min(maxTop, rect.top)),
      left: rect.right + 8
    });
  };

  const railButtons: RailButtonConfig[] = [
    {
      key: 'STORY',
      label: 'STORY',
      title: 'STORY NOTEBOOK & SCRIPT',
      why: 'Fountain screenplay editor, 3-Act beat matrix, and shot loglines',
      accentHex: '#F5A623',
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
      key: 'MEDIA',
      label: 'MEDIA',
      title: 'MEDIA ASSET VAULT & OPFS BROWSER',
      why: 'Full Media Asset Vault, OPFS Browser, and Cloudflare R2 edge sync',
      accentHex: '#38BDF8',
      icon: HardDrive,
      activeModules: ['MEDIA', 'R2_STORAGE'],
      onPrimaryClick: () => onSelectModule('MEDIA'),
      subTools: [
        {
          id: 'media-vault',
          label: 'Media Asset Vault & OPFS Browser',
          sub: `Ingest & manage frames (${saveState.toUpperCase()})`,
          icon: HardDrive,
          badge: 'OPFS',
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
      key: 'TEXT',
      label: 'TEXT',
      title: 'SUPER TITLE & SUBTITLE STUDIO',
      why: 'Per-shot kinetic Bangla & English titles, preset styles, SRT burn-in',
      accentHex: '#FF6B00',
      icon: Type,
      activeModules: ['TEXT'],
      onPrimaryClick: () => onSelectModule('TEXT'),
      subTools: [
        {
          id: 'text-drawer',
          label: 'Super Title & Subtitle Studio',
          sub: 'Per-shot Bangla + English kinetic title cards',
          icon: Type,
          isActive: activeModule === 'TEXT',
          onSelect: () => onSelectModule('TEXT')
        },
        {
          id: 'pro-ai-captions',
          label: 'AI Bilingual Captions (Pro)',
          sub: 'Auto Bangla+English karaoke, bounce & kinetic bars',
          icon: Sparkles,
          badge: 'PRO FX',
          onSelect: () => eventBus.emit('studio:open_pro_suite', { tab: 'ai-captions' })
        },
        {
          id: 'toggle-titles',
          label: 'Toggle Stage Titles Layer',
          sub: 'Show or hide live kinetic title overlays',
          icon: Eye,
          shortcut: 'T',
          onSelect: () => eventBus.emit('studio:toggle_titles')
        }
      ]
    },
    {
      key: 'AUDIO',
      label: 'AUDIO',
      title: 'WAVEFORM & SUB-HARMONIC AUDIO MIXER',
      why: '48kHz DSP mixer, waveform beat detection, scopes & telemetry',
      accentHex: '#10B981',
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
      key: 'CUT',
      label: 'CUT',
      title: 'PRECISION RAZOR & MULTI-CAM CUT',
      why: 'Multi-track NLE razor cuts, storyboard grid, and multi-cam desk',
      accentHex: '#E50914',
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
          shortcut: 'S',
          isActive: activeModule === 'EDIT/CUT',
          onSelect: () => onSelectModule('EDIT/CUT')
        },
        {
          id: 'board-grid',
          label: 'Storyboard Grid Matrix',
          sub: `100-shot contact layout (Shot #${currentShotIndex + 1})`,
          icon: LayoutGrid,
          shortcut: 'G',
          isActive: activeModule === 'BOARD',
          onSelect: () => onSelectModule('BOARD')
        },
        {
          id: 'pro-keyframes-speed',
          label: 'Keyframes & Speed Ramps (Pro)',
          sub: 'Cubic keyframes, velocity curves & optical flow',
          icon: Zap,
          badge: 'PRO FX',
          onSelect: () => eventBus.emit('studio:open_pro_suite', { tab: 'keyframes' })
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
                shortcut: 'SHIFT+M',
                onSelect: () => onOpenMultiCam()
              }
            ]
          : [])
      ]
    },
    {
      key: 'CROP',
      label: 'CROP',
      title: 'ASPECT RATIO & SMART REFRAME',
      why: 'Aspect ratios, safe composition guides, lens crop & cine body rig',
      accentHex: '#14B8A6',
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
          shortcut: 'C',
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
      key: 'LIGHT',
      label: 'LIGHT',
      title: 'TUNGSTEN, EXPOSURE & 34-PRESET LIGHTING RIG',
      why: '34-preset cinematic lighting rig, exposure, rim lights & volumetric haze',
      accentHex: '#FACC15',
      icon: Lightbulb,
      activeModules: [],
      onPrimaryClick: () => eventBus.emit('lighting:open'),
      subTools: [
        {
          id: 'light-rig-34',
          label: '34-Preset Lighting Rig',
          sub: 'Anamorphic flares, rim lights & volumetric haze',
          icon: Lightbulb,
          badge: '34 RIGS',
          onSelect: () => eventBus.emit('lighting:open')
        },
        {
          id: 'light-optics-exposure',
          label: 'Exposure & Lens Calibration',
          sub: 'Tune optical crop, aperture & camera exposure profile',
          icon: SlidersHorizontal,
          isActive: activeModule === 'OPTICS',
          onSelect: () => onSelectModule('OPTICS')
        }
      ]
    },
    {
      key: 'FX',
      label: 'FX',
      title: 'COLOR LUT, HALATION & OPTICAL FX',
      why: 'Color LUTs, halation/bloom, liquify mesh warp, AI prompts & frame markup',
      accentHex: '#A855F7',
      icon: Wand2,
      activeModules: ['LIQUIFY', 'LIBRARY', 'BLOOM', 'AI', 'REVIEW'],
      onPrimaryClick: () => onSelectModule('LIBRARY'),
      subTools: [
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
        },
        {
          id: 'liquify-warp',
          label: 'Liquify & Mesh Warp',
          sub: 'Push, twirl & optical speed FX sculptor',
          icon: Wand2,
          shortcut: 'W',
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
          id: 'pro-fx-suite',
          label: 'Pro FX Suite (Color / Speed / Cutout)',
          sub: '3-wheel color grade, smart cutout & speed ramps',
          icon: Zap,
          badge: 'PRO FX',
          onSelect: () => eventBus.emit('studio:open_pro_suite', { tab: 'color-fx' })
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
      key: 'BRIDGE',
      label: 'BRIDGE',
      title: 'CAPTURE & INTERCHANGE HUB',
      why: 'Screen Recorder Studio, Premiere/Resolve XML & CapCut Export',
      accentHex: '#FB7185',
      icon: Zap,
      activeModules: ['EXPORT'],
      onPrimaryClick: () => eventBus.emit('cockpit:action', { type: 'open_modal' }),
      subTools: [
        {
          id: 'screen-recorder-studio',
          label: 'Screen Recorder Studio',
          sub: '4K/60 capture deck + instant .MP4 / Shot inject',
          icon: Video,
          badge: 'REC',
          shortcut: 'ALT+R',
          onSelect: () => {
            if (onOpenRecorder) onOpenRecorder();
            else eventBus.emit('recorder:open');
          }
        },
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
          shortcut: 'SHIFT+E',
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
      accentHex: '#A3E635',
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
                shortcut: '?',
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

  const bloomVal = activeFrameAdjustments?.bloom ?? 20;
  const grainVal = activeFrameAdjustments?.grain ?? 10;
  const vignetteVal = activeFrameAdjustments?.vignette ?? 15;

  return (
    <>
      {/* MOBILE COLLAPSIBLE THUMB-FRIENDLY BOTTOM TOOL DOCK (< 768px) */}
      <div
        aria-label="Mobile Studio Tool Dock"
        className="md:hidden w-full shrink-0 bg-[#0B0B0D]/96 border-t border-white/[0.08] font-mono-tech select-none z-30"
      >
        <div className="flex items-center justify-between px-2 py-0.5 border-b border-white/[0.06]">
          <span className="text-[8.5px] font-bold tracking-[0.12em] uppercase text-[#8E8E93]">
            STUDIO TOOLS // SH{String(currentShotIndex + 1).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => setIsMobileDockCollapsed((v) => !v)}
            aria-label={isMobileDockCollapsed ? 'Expand Mobile Tool Dock' : 'Collapse Mobile Tool Dock'}
            className="touch-manipulation px-1.5 py-0.5 rounded bg-[#141417] border border-white/[0.08] text-[8.5px] font-bold text-[#F59E0B] flex items-center gap-1 cursor-pointer"
          >
            {isMobileDockCollapsed ? (
              <>
                <ChevronUp className="w-3 h-3" />
                <span>TOOLS</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>HIDE</span>
              </>
            )}
          </button>
        </div>

        {!isMobileDockCollapsed && (
          <nav
            aria-label="Mobile Horizontal Studio Tools"
            className="flex items-center gap-1.5 px-2 py-1.5 overflow-x-auto no-scrollbar touch-pan-x"
          >
            {railButtons.map((btn) => {
              const Icon = btn.icon;
              const isActive =
                btn.activeModules.includes(activeModule) ||
                (btn.key === 'SYSTEM' && isRailLocked) ||
                openFlyout?.key === btn.key;
              return (
                <button
                  key={`mob-${btn.key}`}
                  type="button"
                  data-testid={`mobile-rail-btn-${btn.key.toLowerCase()}`}
                  onClick={() => btn.onPrimaryClick()}
                  style={{
                    borderColor: isActive ? btn.accentHex : `${btn.accentHex}33`
                  }}
                  className={`touch-manipulation shrink-0 min-w-[52px] min-h-[42px] px-2 py-1 rounded border flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 transition-all ${
                    isActive ? 'bg-[#181820] text-white' : 'bg-[#121216] text-zinc-300'
                  }`}
                >
                  <Icon style={{ color: btn.accentHex }} className="w-4 h-4 shrink-0" />
                  <span className="text-[8px] font-black uppercase tracking-tight leading-none whitespace-nowrap">
                    {btn.label}
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* DESKTOP VERTICAL LEFT TOOL RAIL (>= 768px) */}
      <aside
        aria-label="Director Left Tool Rail"
        data-playing={effectiveIsPlaying ? 'true' : 'false'}
        className={`hidden md:flex nle-focus-bar h-full select-none z-30 shrink-0 bg-[#0B0B0D]/95 backdrop-blur-2xl border-r border-white/[0.07] flex-col font-mono-tech transition-all duration-200 relative ${
          isCollapsed ? 'w-[50px]' : 'w-48'
        }`}
      >
      {/* Full-Height 10-Button Evenly Distributed Vertical Spine */}
      <nav
        aria-label="10 Studio Tools"
        className="flex-1 min-h-0 py-1 px-1 flex flex-col justify-between gap-0.5 overflow-hidden"
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
              data-active={isActive ? 'true' : 'false'}
              aria-label={btn.title}
              style={{
                '--item-accent': btn.accentHex,
                borderColor: isActive ? btn.accentHex : `${btn.accentHex}33`,
                boxShadow: isActive
                  ? `0 0 12px ${btn.accentHex}40, inset 0 1px 0 rgba(255,255,255,0.12)`
                  : `0 0 6px ${btn.accentHex}14`
              } as React.CSSProperties}
              onMouseEnter={(e) => openButtonFlyout(btn.key, e.currentTarget)}
              onMouseLeave={scheduleFlyoutClose}
              onClick={(e) => {
                openButtonFlyout(btn.key, e.currentTarget);
                btn.onPrimaryClick();
              }}
              className={`nle-editorial-btn group relative flex-1 min-h-0 rounded cursor-pointer select-none active:scale-95 border ${
                isActive
                  ? 'bg-[#181820] text-[#F4F4F5]'
                  : 'bg-[#121216] hover:bg-[#191920] text-[#E4E4E7]'
              } ${
                isCollapsed
                  ? 'w-full px-0.5 py-0.5 flex flex-col items-center justify-center gap-0.5'
                  : 'w-full px-2 py-0.5 flex items-center gap-2'
              }`}
            >
              {/* Luminous Editorial Accent Indicator Bar */}
              <span
                style={{ backgroundColor: btn.accentHex }}
                className={`absolute left-0 top-1 bottom-1 w-[2.5px] rounded-r transition-opacity duration-200 ${
                  isActive
                    ? 'opacity-100'
                    : 'opacity-45 group-hover:opacity-100'
                }`}
              />

              <Icon
                style={{ color: btn.accentHex }}
                className="w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110"
              />

              {isCollapsed ? (
                <span
                  className={`text-[9px] leading-none font-black uppercase tracking-tight whitespace-nowrap transition-colors ${
                    isActive ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                  }`}
                >
                  {btn.label}
                </span>
              ) : (
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10.5px] font-black tracking-wider uppercase truncate transition-colors ${
                        isActive ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                      }`}
                    >
                      {btn.label}
                    </span>
                    <ChevronRight
                      style={{ color: isActive ? btn.accentHex : undefined }}
                      className="w-3 h-3 shrink-0 text-zinc-400 group-hover:text-white transition-colors"
                    />
                  </div>
                  <div className="text-[8px] text-zinc-400 truncate leading-tight">
                    {btn.why}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Portaled z-[9999] Monochrome Stealth Flyout Drawer */}
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
          className="z-[9999] w-72 bg-[#0B0B0D]/96 border border-white/[0.07] shadow-[0_22px_54px_rgba(0,0,0,0.95)] rounded-xl backdrop-blur-2xl p-2.5 font-mono text-xs text-[#F4F4F5] space-y-2"
        >
          {/* Flyout Header */}
          <div className="px-2 py-1 border-b border-white/[0.07] flex items-center justify-between gap-2">
            <span className="text-[10px] font-black tracking-widest uppercase text-[#F4F4F5] truncate">
              {activeFlyoutConfig.title}
            </span>
            <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-[#141417] border border-[#F59E0B]/40 text-[#F59E0B] shrink-0">
              {activeFlyoutConfig.label}
            </span>
          </div>

          <p className="px-2 text-[9.5px] text-[#8E8E93] leading-snug">
            {activeFlyoutConfig.why}
          </p>

          {/* Sub-tool Buttons with Keyboard Shortcut Badges */}
          <div className="space-y-1">
            {activeFlyoutConfig.subTools.map((sub) => {
              const SubIcon = sub.icon;
              const isRecBadge = sub.badge === 'REC';
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    sub.onSelect();
                    setOpenFlyout(null);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-left transition-colors cursor-pointer border group ${
                    sub.isActive
                      ? 'bg-[#F59E0B]/12 border-[#F59E0B]/60'
                      : 'bg-[#141417] border-white/[0.07] hover:bg-[#1B1B20] hover:border-white/[0.15]'
                  }`}
                >
                  <SubIcon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      sub.isActive ? 'text-[#F59E0B]' : 'text-[#8E8E93] group-hover:text-[#F4F4F5]'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10.5px] font-bold text-[#F4F4F5] truncate">{sub.label}</div>
                    <div className="text-[8.5px] text-[#8E8E93] truncate">{sub.sub}</div>
                  </div>
                  {(sub.shortcut || sub.badge) && (
                    <span
                      className={`text-[8.5px] font-black px-1.5 py-0.5 rounded bg-[#0B0B0D] border shrink-0 tabular-nums ${
                        isRecBadge
                          ? 'border-[#E50914]/55 text-[#E50914]'
                          : sub.isActive
                            ? 'border-[#F59E0B]/50 text-[#F59E0B]'
                            : 'border-white/[0.07] text-[#8E8E93]'
                      }`}
                    >
                      {sub.shortcut || sub.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Live Interactive Optical/Grading Sliders in FX Flyout */}
          {activeFlyoutConfig.key === 'FX' && onUpdateActiveAdjustments && (
            <div className="pt-2 border-t border-white/[0.07] space-y-2 px-1">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-[#F59E0B]">
                <span className="tabular-nums">LIVE SHOT SHADERS (SH{String(currentShotIndex + 1).padStart(2, '0')})</span>
                <button
                  type="button"
                  onClick={() => onUpdateActiveAdjustments({ bloom: 25, grain: 12, vignette: 18 })}
                  className="text-[#8E8E93] hover:text-[#F4F4F5] cursor-pointer"
                >
                  RESET
                </button>
              </div>

              <label className="block space-y-0.5">
                <div className="flex justify-between text-[9px] text-[#8E8E93]">
                  <span>HALATION / BLOOM</span>
                  <span className="font-bold text-[#F4F4F5] tabular-nums">{bloomVal}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={bloomVal}
                  onChange={(e) => onUpdateActiveAdjustments({ bloom: Number(e.target.value) })}
                  className="w-full accent-[#F59E0B] cursor-pointer"
                />
              </label>

              <label className="block space-y-0.5">
                <div className="flex justify-between text-[9px] text-[#8E8E93]">
                  <span>35MM FILM GRAIN</span>
                  <span className="font-bold text-[#F4F4F5] tabular-nums">{grainVal}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={grainVal}
                  onChange={(e) => onUpdateActiveAdjustments({ grain: Number(e.target.value) })}
                  className="w-full accent-[#F59E0B] cursor-pointer"
                />
              </label>

              <label className="block space-y-0.5">
                <div className="flex justify-between text-[9px] text-[#8E8E93]">
                  <span>OPTICAL VIGNETTE</span>
                  <span className="font-bold text-[#F4F4F5] tabular-nums">{vignetteVal}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={vignetteVal}
                  onChange={(e) => onUpdateActiveAdjustments({ vignette: Number(e.target.value) })}
                  className="w-full accent-[#F59E0B] cursor-pointer"
                />
              </label>
            </div>
          )}

          {/* Inline Cine Rig Switcher inside CROP flyout */}
          {activeFlyoutConfig.key === 'CROP' && (
            <div className="pt-1.5 border-t border-white/[0.07] space-y-1">
              <div className="px-2 flex items-center justify-between text-[8.5px] text-[#F59E0B] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  CINE BODY & LENS
                </span>
                <span className="text-[#8E8E93] tabular-nums">{currentProfile.shutter}</span>
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
                          ? 'bg-[#F59E0B]/15 text-[#F4F4F5] border border-[#F59E0B]/60'
                          : 'hover:bg-[#141417] text-[#8E8E93] hover:text-[#F4F4F5] border border-transparent'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[9.5px] font-bold text-[#F4F4F5] truncate">{prof.body}</div>
                        <div className="text-[8px] text-[#8E8E93] truncate">{prof.lens}</div>
                      </div>
                      {selected && <Check className="w-3 h-3 text-[#F59E0B] shrink-0" />}
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
    </>
  );
};
