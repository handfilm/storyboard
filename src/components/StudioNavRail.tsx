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
import { CinemaBadgeHeader, CinemaToolHUD } from './ui/CinemaToolHUD';
import { CinemaHudAccent } from '../constants/cinemaToolHudMap';

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
  shortLabel: string;
  hudTitle: string;
  en: string;
  bn: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string;
  shortcut?: string;
  accent?: CinemaHudAccent;
  isActive?: boolean;
  onSelect: () => void;
}

interface RailButtonConfig {
  key: RailButtonKey;
  label: string;
  hudId: string;
  accent: CinemaHudAccent;
  accentHex: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; strokeWidth?: number }>;
  activeModules: StudioModuleId[];
  onPrimaryClick: () => void;
  subTools: FlyoutSubTool[];
}

const ACCENT_TILE_CLASS: Record<CinemaHudAccent, string> = {
  amber: 'cinema-tile-amber',
  cyan: 'cinema-tile-cyan',
  crimson: 'cinema-tile-crimson',
  emerald: 'cinema-tile-emerald'
};

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
      hudId: 'rail-story',
      accent: 'amber',
      accentHex: '#F59E0B',
      icon: BookOpen,
      activeModules: ['STORY', 'PRODUCTION'],
      onPrimaryClick: () => onSelectModule('STORY'),
      subTools: [
        {
          id: 'story-panel',
          shortLabel: 'NOTEBOOK',
          hudTitle: 'STORY NOTEBOOK',
          en: 'Fountain screenplay editor, 3-Act beat matrix, and shot loglines.',
          bn: 'স্ক্রিপ্ট, শট লগলাইন ও সিন বিট লিখতে বা সাজাতে এই প্যানেল ওপেন করুন।',
          icon: BookOpen,
          badge: `${totalShots}`,
          accent: 'amber',
          isActive: activeModule === 'STORY',
          onSelect: () => onSelectModule('STORY')
        },
        {
          id: 'prod-planner',
          shortLabel: 'CALL SHEET',
          hudTitle: 'PRODUCTION CALL SHEET',
          en: 'Interactive shoot planner, talent schedule, and gear allocator.',
          bn: 'শুটিংয়ের শিডিউল, কাস্ট এবং ক্যামেরা গিয়ার লিস্ট সাজাতে এটি ব্যবহার করুন।',
          icon: Clapperboard,
          accent: 'amber',
          isActive: activeModule === 'PRODUCTION',
          onSelect: () => onSelectModule('PRODUCTION')
        }
      ]
    },
    {
      key: 'MEDIA',
      label: 'MEDIA',
      hudId: 'rail-media',
      accent: 'cyan',
      accentHex: '#06B6D4',
      icon: HardDrive,
      activeModules: ['MEDIA', 'R2_STORAGE'],
      onPrimaryClick: () => onSelectModule('MEDIA'),
      subTools: [
        {
          id: 'media-vault',
          shortLabel: 'MEDIA BIN',
          hudTitle: 'MEDIA ASSET VAULT',
          en: `Import and manage local 4K video clips & frames (${saveState.toUpperCase()}).`,
          bn: 'ডিভাইস থেকে ভিডিও বা ছবি আপলোড করে শটের সাথে যুক্ত করতে এটি চাপুন।',
          icon: HardDrive,
          badge: 'OPFS',
          accent: 'cyan',
          isActive: activeModule === 'MEDIA',
          onSelect: () => onSelectModule('MEDIA')
        },
        {
          id: 'r2-cloud',
          shortLabel: 'CLOUD R2',
          hudTitle: 'CLOUDFLARE R2 SYNC',
          en: 'Zero-config S3 byte-range cloud archive and project snapshot sync.',
          bn: 'ক্লাউডে প্রজেক্ট ব্যাকআপ বা স্ট্রিমিং সিঙ্ক করতে R2 প্যানেল ওপেন করুন।',
          icon: Cloud,
          accent: 'cyan',
          isActive: activeModule === 'R2_STORAGE',
          onSelect: () => onSelectModule('R2_STORAGE')
        },
        ...(onOpenVaultMode
          ? [
              {
                id: 'idb-projects',
                shortLabel: 'VAULT',
                hudTitle: 'PROJECT VAULT MANAGER',
                en: 'Switch between or clone IndexedDB anthology project vaults.',
                bn: 'নতুন প্রজেক্ট তৈরি করতে বা আগের সেভ করা ভল্টে ফিরতে এটি চাপুন।',
                icon: FolderOpen,
                badge: 'IDB',
                accent: 'amber' as CinemaHudAccent,
                onSelect: () => onOpenVaultMode()
              }
            ]
          : [])
      ]
    },
    {
      key: 'TEXT',
      label: 'TEXT',
      hudId: 'rail-text',
      accent: 'amber',
      accentHex: '#F59E0B',
      icon: Type,
      activeModules: ['TEXT'],
      onPrimaryClick: () => onSelectModule('TEXT'),
      subTools: [
        {
          id: 'text-drawer',
          shortLabel: 'TITLE FX',
          hudTitle: 'SUPER TITLE STUDIO',
          en: 'Per-shot Bangla & English kinetic title cards and 9-zone placement.',
          bn: 'শটের বাংলা ও ইংরেজি টাইটেল এবং পজিশন এডিট করতে টাইটেল স্টুডিও খুলুন।',
          icon: Type,
          accent: 'amber',
          isActive: activeModule === 'TEXT',
          onSelect: () => onSelectModule('TEXT')
        },
        {
          id: 'pro-ai-captions',
          shortLabel: 'AUTO CAP',
          hudTitle: 'AI BILINGUAL CAPTIONS',
          en: 'Auto Bangla & English karaoke captions, bounce, and kinetic bars.',
          bn: 'স্বয়ংক্রিয় বাংলা ও ইংরেজি ক্যাপশন ও কাইনেটিক এনিমেশন দিতে চাপুন।',
          icon: Sparkles,
          badge: 'PRO',
          accent: 'cyan',
          onSelect: () => eventBus.emit('studio:open_pro_suite', { tab: 'ai-captions' })
        },
        {
          id: 'toggle-titles',
          shortLabel: 'SHOW TEXT',
          hudTitle: 'TOGGLE STAGE TITLES',
          en: 'Show or hide live kinetic title overlays on the stage monitor.',
          bn: 'স্ক্রিনে টাইটেল ওভারলে চালু বা বন্ধ করতে এই বাটনে চাপুন।',
          icon: Eye,
          shortcut: 'T',
          accent: 'amber',
          onSelect: () => eventBus.emit('studio:toggle_titles')
        }
      ]
    },
    {
      key: 'AUDIO',
      label: 'AUDIO',
      hudId: 'rail-audio',
      accent: 'emerald',
      accentHex: '#10B981',
      icon: Volume2,
      activeModules: ['SOUND'],
      onPrimaryClick: () => onSelectModule('SOUND'),
      subTools: [
        {
          id: 'sound-studio',
          shortLabel: 'SOUND DSP',
          hudTitle: 'PRO AUDIO DSP STUDIO',
          en: '3-bus stem mixer, beat sync, and Web Audio foley synthesizer.',
          bn: 'ভয়েস, মিউজিক ও ফোলি সাউন্ড মিক্স করতে সাউন্ড স্টুডিও ওপেন করুন।',
          icon: Volume2,
          accent: 'emerald',
          isActive: activeModule === 'SOUND',
          onSelect: () => onSelectModule('SOUND')
        },
        ...(onOpenVideoScopes
          ? [
              {
                id: 'video-scopes',
                shortLabel: 'SCOPES',
                hudTitle: 'IRE & RGB SCOPES',
                en: 'Live waveform, RGB parade, and vectorscope broadcast monitor.',
                bn: 'রিয়েল-টাইম এক্সপোজার ও কালার ওয়েভফর্ম স্কোপ দেখতে এটি চাপুন।',
                icon: BarChart3,
                accent: 'emerald' as CinemaHudAccent,
                onSelect: () => onOpenVideoScopes()
              }
            ]
          : []),
        {
          id: 'spectral-analyzer',
          shortLabel: 'SPECTRUM',
          hudTitle: 'SPECTRAL VISUALIZER',
          en: 'Toggle live multi-band audio frequency HUD on the console.',
          bn: 'অডিওর ফ্রিকোয়েন্সি স্পেকট্রাম মিটার চালু বা বন্ধ করতে এটি চাপুন।',
          icon: Activity,
          accent: 'emerald',
          onSelect: () => eventBus.emit('cockpit:toggle_spectrum')
        },
        {
          id: 'modular-telemetry',
          shortLabel: 'RACK HUD',
          hudTitle: 'MODULAR TELEMETRY RACK',
          en: 'Toggle audio sync, voice cue, and 3D LUT telemetry rack.',
          bn: 'অডিও সিঙ্ক ও LUT টেলিমেট্রি র‍্যাক স্ক্রিনে দেখাতে চাপুন।',
          icon: SlidersHorizontal,
          accent: 'cyan',
          onSelect: () => eventBus.emit('cockpit:toggle_telemetry')
        }
      ]
    },
    {
      key: 'CUT',
      label: 'CUT',
      hudId: 'rail-cut',
      accent: 'crimson',
      accentHex: '#EF4444',
      icon: Scissors,
      activeModules: ['EDIT/CUT', 'BOARD', 'PLAYER'],
      onPrimaryClick: () => onSelectModule('EDIT/CUT'),
      subTools: [
        {
          id: 'cut-nle',
          shortLabel: 'CUT NLE',
          hudTitle: 'MULTI-TRACK CUT NLE',
          en: 'Sub-frame precision trimming, split, and magnetic ripple lanes.',
          bn: 'প্লেহেড যেখানে আছে সেখান থেকে ক্লিপ কাটতে বা ট্রিম করতে খুলুন।',
          icon: Scissors,
          badge: '24P',
          shortcut: 'S',
          accent: 'crimson',
          isActive: activeModule === 'EDIT/CUT',
          onSelect: () => onSelectModule('EDIT/CUT')
        },
        {
          id: 'board-grid',
          shortLabel: 'GRID',
          hudTitle: 'STORYBOARD GRID MATRIX',
          en: `Inspect all shots in contact sheet layout (Shot #${currentShotIndex + 1}).`,
          bn: 'সবগুলো শট একসাথে গ্রিড ভিউতে দেখতে ও রি-অর্ডার করতে চাপুন।',
          icon: LayoutGrid,
          shortcut: 'G',
          accent: 'amber',
          isActive: activeModule === 'BOARD',
          onSelect: () => onSelectModule('BOARD')
        },
        {
          id: 'pro-keyframes-speed',
          shortLabel: 'KEYFRAME',
          hudTitle: 'KEYFRAMES & SPEED RAMP',
          en: 'Cubic keyframes, velocity curves, and optical flow ramps.',
          bn: 'ক্লিপে কীফ্রেম ও স্মুথ স্পিড র‍্যাম্প বসাতে এটি ওপেন করুন।',
          icon: Zap,
          badge: 'PRO',
          accent: 'crimson',
          onSelect: () => eventBus.emit('studio:open_pro_suite', { tab: 'keyframes' })
        },
        {
          id: 'stage-player',
          shortLabel: 'STAGE',
          hudTitle: 'ANIMATIC STAGE DECK',
          en: 'Return to primary tactile stage preview monitor.',
          bn: 'মূল প্রিভিউ স্টেজ স্ক্রিনে ফিরে যেতে এটি চাপুন।',
          icon: PlaySquare,
          accent: 'amber',
          isActive: activeModule === 'PLAYER',
          onSelect: () => onSelectModule('PLAYER')
        },
        ...(onOpenMultiCam
          ? [
              {
                id: 'multicam-grid',
                shortLabel: 'MULTI-CAM',
                hudTitle: 'MULTI-CAM SWITCHER',
                en: 'Synchronized multi-angle live cutting desk.',
                bn: 'একসাথে একাধিক ক্যামেরা অ্যাঙ্গেল দেখে শট বদলাতে এটি চাপুন।',
                icon: Film,
                shortcut: 'SHIFT+M',
                accent: 'cyan' as CinemaHudAccent,
                onSelect: () => onOpenMultiCam()
              }
            ]
          : [])
      ]
    },
    {
      key: 'CROP',
      label: 'CROP',
      hudId: 'rail-crop',
      accent: 'cyan',
      accentHex: '#06B6D4',
      icon: Crop,
      activeModules: ['OPTICS'],
      onPrimaryClick: () => onSelectModule('OPTICS'),
      subTools: [
        {
          id: 'optics-drawer',
          shortLabel: 'REFRAME',
          hudTitle: 'OPTICS & SMART CROP',
          en: `${currentProfile.body} — aspect ratio, lens crop, and reframe inspector.`,
          bn: 'ভিডিওর আসপেক্ট রেশিও (৯:১৬ বা ২.৩৯:১) ও ফ্রেমিং ক্রপ ঠিক করতে চাপুন।',
          icon: Crop,
          accent: 'cyan',
          isActive: activeModule === 'OPTICS',
          onSelect: () => onSelectModule('OPTICS')
        },
        {
          id: 'toggle-guides',
          shortLabel: 'GUIDES',
          hudTitle: 'SAFE COMPOSITION GUIDES',
          en: 'Toggle rule-of-thirds grid and center crosshair.',
          bn: 'স্ক্রিনে রুল-অব-থার্ডস গ্রিড ও সেফ গাইড চালু বা বন্ধ করুন।',
          icon: Crosshair,
          shortcut: 'C',
          accent: 'cyan',
          onSelect: () => eventBus.emit('studio:toggle_guides')
        },
        {
          id: 'parallax-zoom',
          shortLabel: 'PARALLAX',
          hudTitle: 'MULTI-LAYER PARALLAX',
          en: 'Scale foreground subject vs. background plate independently.',
          bn: 'ফোরগ্রাউন্ড সাবজেক্ট ও ব্যাকগ্রাউন্ড আলাদা জুম করতে এটি চাপুন।',
          icon: ZoomIn,
          accent: 'cyan',
          onSelect: () => eventBus.emit('cockpit:toggle_zoom')
        }
      ]
    },
    {
      key: 'LIGHT',
      label: 'LIGHT',
      hudId: 'rail-light',
      accent: 'amber',
      accentHex: '#F59E0B',
      icon: Lightbulb,
      activeModules: [],
      onPrimaryClick: () => eventBus.emit('lighting:open'),
      subTools: [
        {
          id: 'light-rig-34',
          shortLabel: 'LIGHT RIG',
          hudTitle: '34-PRESET LIGHTING RIG',
          en: 'Interactive KEY/RIM/FILL orbs, cinema gels, and volumetric haze.',
          bn: 'স্ক্রিনের লাইট বল ড্র্যাগ করে বা ৩৪টি প্রিসেট থেকে সিনেমার আলো সেট করুন।',
          icon: Lightbulb,
          badge: '34',
          accent: 'amber',
          onSelect: () => eventBus.emit('lighting:open')
        },
        {
          id: 'light-optics-exposure',
          shortLabel: 'EXPOSURE',
          hudTitle: 'EXPOSURE & OPTICS',
          en: 'Tune lens aperture, exposure compensation, and camera body profile.',
          bn: 'এক্সপোজার, অ্যাপারচার ও ক্যামেরা প্রোফাইল ক্যালিব্রেট করতে এটি চাপুন।',
          icon: SlidersHorizontal,
          accent: 'cyan',
          isActive: activeModule === 'OPTICS',
          onSelect: () => onSelectModule('OPTICS')
        }
      ]
    },
    {
      key: 'FX',
      label: 'FX',
      hudId: 'rail-fx',
      accent: 'crimson',
      accentHex: '#EF4444',
      icon: Wand2,
      activeModules: ['LIQUIFY', 'LIBRARY', 'BLOOM', 'AI', 'REVIEW'],
      onPrimaryClick: () => onSelectModule('LIBRARY'),
      subTools: [
        {
          id: 'lut-library',
          shortLabel: 'LUT LAB',
          hudTitle: 'CINEMA LUT REGISTRY',
          en: 'Apply 15 Hollywood photochemical film emulations & color grades.',
          bn: '১৫টি হলিউড কালার গ্রেডিং LUT থেকে শটের কালার টোন বাছাই করুন।',
          icon: Library,
          accent: 'amber',
          isActive: activeModule === 'LIBRARY',
          onSelect: () => onSelectModule('LIBRARY')
        },
        {
          id: 'bloom-stage',
          shortLabel: 'HALATION',
          hudTitle: 'BLOOM & HALATION STAGE',
          en: 'Interactive optical 35mm halation glow and lens bloom canvas.',
          bn: 'শটের উজ্জ্বল অংশে ৩৫মিমি ফিল্মের মতো গ্লো ও ব্লুম ইফেক্ট দিন।',
          icon: Sparkles,
          accent: 'crimson',
          isActive: activeModule === 'BLOOM',
          onSelect: () => onSelectModule('BLOOM')
        },
        {
          id: 'liquify-warp',
          shortLabel: 'LIQUIFY',
          hudTitle: 'LIQUIFY & MESH WARP',
          en: 'Sculpt, push, twirl, and warp shot frames with live speed FX.',
          bn: 'ছবি বা ফ্রেমের অংশ ব্রাশ দিয়ে টুইস্ট বা ওয়ার্প করতে চাপুন।',
          icon: Wand2,
          shortcut: 'W',
          accent: 'crimson',
          isActive: activeModule === 'LIQUIFY',
          onSelect: () => onSelectModule('LIQUIFY')
        },
        {
          id: 'ai-director',
          shortLabel: 'AI PROMPT',
          hudTitle: 'AI DIRECTOR PROMPTS',
          en: 'Veo & Flow cinematography prompt builder and consistency matrix.',
          bn: 'সিনেমার শট ও স্টাইলের জন্য প্রফেশনাল এআই প্রম্পট তৈরি করুন।',
          icon: Sparkles,
          accent: 'cyan',
          isActive: activeModule === 'AI',
          onSelect: () => onSelectModule('AI')
        },
        {
          id: 'pro-fx-suite',
          shortLabel: 'PRO FX',
          hudTitle: 'PRO FX LAB',
          en: '3-wheel color grade, smart subject cutout, and velocity speed ramps.',
          bn: '৩-হুইল কালার, স্মার্ট কাটআউট এবং স্পিড র‍্যাম্প চালাতে ওপেন করুন।',
          icon: Zap,
          badge: 'PRO',
          accent: 'crimson',
          onSelect: () => eventBus.emit('studio:open_pro_suite', { tab: 'color-fx' })
        },
        {
          id: 'review-pins',
          shortLabel: 'MARKUP',
          hudTitle: 'FRAME MARKUP & REVIEW',
          en: 'Drop timestamped vector pins and director feedback notes.',
          bn: 'যেকোনো ফ্রেমে পিন ও ডিরেক্টর নোট যোগ করতে রিভিউ প্যানেল খুলুন।',
          icon: MessageSquare,
          accent: 'amber',
          isActive: activeModule === 'REVIEW',
          onSelect: () => onSelectModule('REVIEW')
        }
      ]
    },
    {
      key: 'BRIDGE',
      label: 'BRIDGE',
      hudId: 'rail-bridge',
      accent: 'emerald',
      accentHex: '#10B981',
      icon: Zap,
      activeModules: ['EXPORT'],
      onPrimaryClick: () => eventBus.emit('cockpit:action', { type: 'open_modal' }),
      subTools: [
        {
          id: 'screen-recorder-studio',
          shortLabel: 'RECORDER',
          hudTitle: '4K SCREEN RECORDER',
          en: '4K/60 capture deck with instant MP4 recording and shot injection.',
          bn: 'স্ক্রিন বা ক্যামেরা রেকর্ড করে সরাসরি টাইমলাইনে যোগ করতে চাপুন।',
          icon: Video,
          badge: 'REC',
          shortcut: 'ALT+R',
          accent: 'crimson',
          onSelect: () => {
            if (onOpenRecorder) onOpenRecorder();
            else eventBus.emit('recorder:open');
          }
        },
        {
          id: 'cockpit-hub',
          shortLabel: 'BRIDGE HUB',
          hudTitle: 'DIRECTOR INTERCHANGE HUB',
          en: 'Photoshop paint-over, Premiere XML, DaVinci, and CapCut packages.',
          bn: 'প্রিমিয়ার, ফটোশপ, ডাভিঞ্চি বা ক্যাপকাটে প্রজেক্ট পাঠাতে এটি খুলুন।',
          icon: Zap,
          badge: 'HUB',
          accent: 'emerald',
          onSelect: () => eventBus.emit('cockpit:action', { type: 'open_modal' })
        },
        {
          id: 'nle-xml',
          shortLabel: 'FCPXML',
          hudTitle: 'EXPORT FCPXML SEQUENCE',
          en: 'Download Premiere Pro / DaVinci Resolve v1.9 interchange XML.',
          bn: 'প্রিমিয়ার প্রো বা ডাভিঞ্চি রিজল্ভে খোলার জন্য XML ফাইল ডাউনলোড করুন।',
          icon: FileCode2,
          accent: 'cyan',
          onSelect: () => eventBus.emit('cockpit:action', { type: 'nle_xml' })
        },
        {
          id: 'capcut-pack',
          shortLabel: 'CAPCUT ZIP',
          hudTitle: 'CAPCUT QUICK-PACK',
          en: 'Build CapCut draft timeline JSON and director cue sheet package.',
          bn: 'ক্যাপকাট অ্যাপের জন্য রেডি ড্রাফট JSON প্যাক ডাউনলোড করতে চাপুন।',
          icon: Download,
          accent: 'emerald',
          onSelect: () => eventBus.emit('cockpit:action', { type: 'capcut_pack' })
        },
        {
          id: 'publish-export',
          shortLabel: '4K EXPORT',
          hudTitle: 'MASTER EXPORT STUDIO',
          en: 'Render burned-in MP4/WebM video, PDF lookbook, or RAWX archive.',
          bn: '৪কে ভিডিও রেন্ডার বা পিডিএফ লুকবুক আকারে ফাইনাল আউটপুট সেভ করুন।',
          icon: Film,
          shortcut: 'SHIFT+E',
          accent: 'emerald',
          isActive: activeModule === 'EXPORT',
          onSelect: () => onSelectModule('EXPORT')
        }
      ]
    },
    {
      key: 'SYSTEM',
      label: 'SYSTEM',
      hudId: 'rail-system',
      accent: 'cyan',
      accentHex: '#06B6D4',
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
                shortLabel: 'PREFS',
                hudTitle: 'STUDIO SETTINGS',
                en: 'Audio/video codecs, workspace theme, and storage quota gauges.',
                bn: 'কোডেক, থিম এবং স্টোরেজ সেটিংস পরিবর্তন করতে এটি ওপেন করুন।',
                icon: Settings,
                accent: 'cyan' as CinemaHudAccent,
                onSelect: () => onOpenSettingsModal()
              }
            ]
          : []),
        {
          id: 'settings-drawer',
          shortLabel: 'SYS DRAWER',
          hudTitle: 'SYSTEM TELEMETRY DRAWER',
          en: 'Inspect WebGL acceleration flags and browser storage quotas.',
          bn: 'হার্ডওয়্যার অ্যাক্সিলারেশন ও স্টোরেজ ডেটা পরীক্ষা করতে এটি খুলুন।',
          icon: SlidersHorizontal,
          accent: 'cyan',
          isActive: activeModule === 'SETTINGS',
          onSelect: () => onSelectModule('SETTINGS')
        },
        ...(onToggleProMode
          ? [
              {
                id: 'pro-mode',
                shortLabel: 'TELEMETRY',
                hudTitle: 'PRO TELEMETRY MODE',
                en: isProMode ? 'Disable focus peaking & HUD scopes.' : 'Enable Pro exposure & telemetry.',
                bn: 'স্ক্রিনে প্রো এক্সপোজার ও টেলিমেট্রি ওভারলে চালু বা বন্ধ করুন।',
                icon: Activity,
                badge: isProMode ? 'ON' : 'OFF',
                accent: 'emerald' as CinemaHudAccent,
                isActive: isProMode,
                onSelect: () => onToggleProMode()
              }
            ]
          : []),
        {
          id: 'toggle-collapse',
          shortLabel: isCollapsed ? 'EXPAND' : 'COMPACT',
          hudTitle: isCollapsed ? 'EXPAND LEFT RAIL' : 'COLLAPSE LEFT RAIL',
          en: isRailLocked ? 'Unlock rail first to resize.' : 'Switch compact or wide rail layout.',
          bn: 'বাম পাশের টুলবার ছোট বা বড় করতে এই বাটনে চাপুন।',
          icon: isCollapsed ? ChevronRight : ChevronLeft,
          accent: 'amber',
          onSelect: () => {
            if (!isRailLocked) onToggleCollapse();
          }
        },
        {
          id: 'lock-rail',
          shortLabel: isRailLocked ? 'UNLOCK' : 'LOCK RAIL',
          hudTitle: isRailLocked ? 'UNLOCK RAIL POSITION' : 'LOCK RAIL POSITION',
          en: isRailLocked ? 'Rail width is currently locked.' : 'Prevent accidental rail resize.',
          bn: 'টুলবারের সাইজ লক বা আনলক করতে এটি চাপুন।',
          icon: isRailLocked ? Unlock : Lock,
          badge: isRailLocked ? 'LOCK' : 'OPEN',
          accent: 'amber',
          isActive: isRailLocked,
          onSelect: () => setIsRailLocked((prev) => !prev)
        },
        ...(onOpenShortcuts
          ? [
              {
                id: 'keyboard-shortcuts',
                shortLabel: 'HOTKEYS',
                hudTitle: 'KEYBOARD SHORTCUTS',
                en: 'View J-K-L playback, razor split, and director hotkeys.',
                bn: 'কীবোর্ডের সব শর্টকাট বাটন তালিকা দেখতে এটি চাপুন।',
                icon: Keyboard,
                shortcut: '?',
                accent: 'cyan' as CinemaHudAccent,
                onSelect: () => onOpenShortcuts()
              }
            ]
          : []),
        ...(onOpenSelfTest
          ? [
              {
                id: 'self-test',
                shortLabel: 'SELF TEST',
                hudTitle: 'HARDWARE SELF-TEST',
                en: 'Benchmark WebGL, IndexedDB I/O, and video decoders.',
                bn: 'ব্রাউজারের রেন্ডারিং ও ডিকোডার পারফরম্যান্স টেস্ট করতে চাপুন।',
                icon: Activity,
                accent: 'emerald' as CinemaHudAccent,
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
          <span className="text-[9px] font-black tracking-wider uppercase text-zinc-400 tabular-nums">
            SH{String(currentShotIndex + 1).padStart(2, '0')}
          </span>
          <CinemaToolHUD
            title="MOBILE TOOL DOCK"
            en="Expand or collapse the bottom studio tool strip."
            bn="মোবাইলের নিচের টুলবারটি দেখাতে বা লুকাতে এই বাটনে চাপুন।"
            accent="amber"
            side="top"
          >
            <button
              type="button"
              onClick={() => setIsMobileDockCollapsed((v) => !v)}
              aria-label={isMobileDockCollapsed ? 'Expand Mobile Tool Dock' : 'Collapse Mobile Tool Dock'}
              className="cinema-tile cinema-tile-amber touch-manipulation px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase flex items-center gap-1 cursor-pointer"
            >
              {isMobileDockCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                  <span>TOOLS</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                  <span>HIDE</span>
                </>
              )}
            </button>
          </CinemaToolHUD>
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
                <CinemaToolHUD key={`mob-${btn.key}`} hudId={btn.hudId} side="top">
                  <button
                    type="button"
                    data-testid={`mobile-rail-btn-${btn.key.toLowerCase()}`}
                    data-active={isActive ? 'true' : 'false'}
                    onClick={() => btn.onPrimaryClick()}
                    className={`cinema-tile ${ACCENT_TILE_CLASS[btn.accent]} touch-manipulation shrink-0 min-w-[54px] min-h-[44px] px-2 py-1 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer`}
                  >
                    <Icon className="w-5 h-5 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                    <span className="text-[9px] font-black uppercase tracking-wider leading-none whitespace-nowrap">
                      {btn.label}
                    </span>
                  </button>
                </CinemaToolHUD>
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
          isCollapsed ? 'w-[58px]' : 'w-32'
        }`}
      >
        {/* Full-Height 10-Button Evenly Distributed Vertical Spine */}
        <nav
          aria-label="10 Studio Tools"
          className="flex-1 min-h-0 py-1 px-1 flex flex-col justify-between gap-1 overflow-hidden"
        >
          {railButtons.map((btn) => {
            const Icon = btn.icon;
            const isActive =
              btn.activeModules.includes(activeModule) ||
              (btn.key === 'SYSTEM' && isRailLocked) ||
              openFlyout?.key === btn.key;

            return (
              <CinemaToolHUD key={btn.key} hudId={btn.hudId} side="right" blockWrapper className="flex-1 min-h-0">
                <button
                  type="button"
                  data-testid={`rail-btn-${btn.key.toLowerCase()}`}
                  data-active={isActive ? 'true' : 'false'}
                  aria-label={btn.label}
                  onMouseEnter={(e) => openButtonFlyout(btn.key, e.currentTarget)}
                  onMouseLeave={scheduleFlyoutClose}
                  onClick={(e) => {
                    openButtonFlyout(btn.key, e.currentTarget);
                    btn.onPrimaryClick();
                  }}
                  className={`cinema-tile ${ACCENT_TILE_CLASS[btn.accent]} nle-editorial-btn group relative w-full h-full min-h-0 rounded-lg cursor-pointer select-none ${
                    isCollapsed
                      ? 'px-1 py-1 flex flex-col items-center justify-center gap-0.5'
                      : 'px-2.5 py-1 flex items-center justify-between gap-1.5'
                  }`}
                >
                  <div className={`flex items-center min-w-0 ${isCollapsed ? 'flex-col gap-0.5' : 'gap-2'}`}>
                    <Icon className="w-5 h-5 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                    <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider leading-none truncate">
                      {btn.label}
                    </span>
                  </div>
                  {!isCollapsed && (
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              </CinemaToolHUD>
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
            className="z-[9999] w-72 bg-[#0B0B0D]/96 border border-white/[0.08] shadow-[0_22px_54px_rgba(0,0,0,0.95)] rounded-xl backdrop-blur-2xl p-2.5 font-mono text-xs text-[#F4F4F5] space-y-2.5"
          >
            {/* Compact Badge Header (Icon + 1-2 word bold tag) */}
            <CinemaBadgeHeader
              icon={<activeFlyoutConfig.icon className="w-3.5 h-3.5" strokeWidth={2.3} />}
              label={activeFlyoutConfig.label}
              accent={activeFlyoutConfig.accent}
            />

            {/* Responsive 2-Col Icon + 1-2 Word Sub-Tool Tiles */}
            <div className="grid grid-cols-2 gap-1.5">
              {activeFlyoutConfig.subTools.map((sub) => {
                const SubIcon = sub.icon;
                const subAccent = sub.accent || activeFlyoutConfig.accent;
                return (
                  <CinemaToolHUD
                    key={sub.id}
                    title={sub.hudTitle}
                    en={sub.en}
                    bn={sub.bn}
                    shortcut={sub.shortcut}
                    accent={subAccent}
                    side="right"
                    blockWrapper
                  >
                    <button
                      type="button"
                      data-active={sub.isActive ? 'true' : 'false'}
                      onClick={() => {
                        sub.onSelect();
                        setOpenFlyout(null);
                      }}
                      className={`cinema-tile ${ACCENT_TILE_CLASS[subAccent]} relative w-full min-h-[58px] px-2 py-2 rounded-lg flex flex-col items-center justify-center gap-1.5 cursor-pointer select-none`}
                    >
                      {(sub.shortcut || sub.badge) && (
                        <span className="absolute top-1 right-1 px-1 py-0.5 rounded bg-black/75 border border-white/15 text-[8px] font-black tracking-wider uppercase leading-none text-amber-300 tabular-nums">
                          {sub.shortcut || sub.badge}
                        </span>
                      )}
                      <SubIcon className="w-5 h-5 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                      <span className="text-[10px] font-black tracking-wider uppercase leading-none text-center truncate max-w-full">
                        {sub.shortLabel}
                      </span>
                    </button>
                  </CinemaToolHUD>
                );
              })}
            </div>

            {/* Live Interactive Optical/Grading Sliders in FX Flyout */}
            {activeFlyoutConfig.key === 'FX' && onUpdateActiveAdjustments && (
              <div className="pt-2 border-t border-white/[0.07] space-y-2 px-1">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-amber-400">
                  <span className="tabular-nums">SH{String(currentShotIndex + 1).padStart(2, '0')} OPTICS</span>
                  <CinemaToolHUD
                    title="RESET OPTICS SHADERS"
                    en="Reset halation, grain, and vignette values to default levels."
                    bn="হ্যালিয়েশন, গ্রেইন ও ভিনিয়েট মান রিসেট করতে চাপুন।"
                    accent="amber"
                    side="right"
                  >
                    <button
                      type="button"
                      onClick={() => onUpdateActiveAdjustments({ bloom: 25, grain: 12, vignette: 18 })}
                      className="cinema-tile cinema-tile-amber px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      RESET
                    </button>
                  </CinemaToolHUD>
                </div>

                <label className="block space-y-0.5">
                  <div className="flex justify-between text-[9px] font-black tracking-wider text-zinc-300">
                    <span>HALATION</span>
                    <span className="text-amber-400 tabular-nums">{bloomVal}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={bloomVal}
                    onChange={(e) => onUpdateActiveAdjustments({ bloom: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </label>

                <label className="block space-y-0.5">
                  <div className="flex justify-between text-[9px] font-black tracking-wider text-zinc-300">
                    <span>35MM GRAIN</span>
                    <span className="text-amber-400 tabular-nums">{grainVal}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={grainVal}
                    onChange={(e) => onUpdateActiveAdjustments({ grain: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </label>

                <label className="block space-y-0.5">
                  <div className="flex justify-between text-[9px] font-black tracking-wider text-zinc-300">
                    <span>VIGNETTE</span>
                    <span className="text-amber-400 tabular-nums">{vignetteVal}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={vignetteVal}
                    onChange={(e) => onUpdateActiveAdjustments({ vignette: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </label>
              </div>
            )}

            {/* Inline Cine Rig Switcher inside CROP flyout */}
            {activeFlyoutConfig.key === 'CROP' && (
              <div className="pt-1.5 border-t border-white/[0.07] space-y-1.5">
                <div className="px-1 flex items-center justify-between text-[9px] text-cyan-300 font-black uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" strokeWidth={2.2} />
                    CINE RIG
                  </span>
                  <span className="text-zinc-400 tabular-nums">{currentProfile.shutter}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto no-scrollbar">
                  {CINE_PROFILES.map((prof) => {
                    const selected = prof.body === currentProfile.body;
                    return (
                      <CinemaToolHUD
                        key={prof.body}
                        title={prof.body}
                        en={`${prof.lens} // ${prof.sensor} // ${prof.shutter}`}
                        bn="এই ক্যামেরা বডি ও লেন্স প্রোফাইল শটে প্রয়োগ করতে ক্লিক করুন।"
                        accent="cyan"
                        side="right"
                        blockWrapper
                      >
                        <button
                          type="button"
                          data-active={selected ? 'true' : 'false'}
                          onClick={() => handleSelectCineProfile(prof)}
                          className="cinema-tile cinema-tile-cyan w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span className="text-[10px] font-black tracking-wider uppercase truncate">
                            {prof.body}
                          </span>
                          {selected && <Check className="w-3.5 h-3.5 text-cyan-300 shrink-0" />}
                        </button>
                      </CinemaToolHUD>
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

