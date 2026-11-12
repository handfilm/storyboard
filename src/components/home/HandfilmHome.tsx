/**
 * @file /src/components/home/HandfilmHome.tsx
 * @description Master 55" 4K OLED Cinematic Workstation & Netflix-Grade Flagship Home for HANDFILM.
 * 
 * Architectural Compliance:
 * 1. Clean Render Viewport: Raw 4K video plate + Creative Kinetic Bangla Typography ONLY.
 *    All metadata externalized to surrounding shelves; zero stamped artifacts on export.
 * 2. Minimalist 4K Top-Right Header (Icon-First Tiers, 40px-44px hit targets):
 *    - STUDIO (Hero crimson pill #e50914 with ⚡)
 *    - EXPORT (Amber glass pill #ffaa00 with ⭳)
 *    - RECORD (Glass pill with glowing crimson tally dot ●)
 *    - ZEN (Ocular frame glyph ⛶ / ⊙)
 *    - STATS (3-bar histogram 📊 toggling live engine telemetry)
 *    - OPTIONS DRAWER (··· dropdown housing MP4 4K, PREMIERE XML, CAPCUT/FCPXML)
 * 3. Next-Level Bottom Toolbar (Balanced 3-Section Flex Architecture):
 *    - Left Wing: 44px circular Play/Pause, Frame-steps (-1F/+1F), SMPTE timecode (00:10:19:11), Duration pill (12.0s)
 *    - Center Wing: Prominent [ SOLO | MASTER ] segmented pod (height 40px) with cyan/amber tally glow, Beat-Snap & Speed
 *    - Right Wing: Aspect ratio dropdown (2.39:1 / 16:9 / 9:16), Zoom readout (1.0x/1.5x/2.0x), Composition Grid, Titles On/Off
 * 4. Multi-Cam 9-Angle Grid Expansion:
 *    - 3x3 synchronized matrix (CAM 01 to CAM 09) with styled standby cards (CAM 0X // STANDBY) to prevent pipeline stall.
 * 5. Default Showcase Presets:
 *    - Launches with an active 6-shot timeline with distinct per-shot Bangla presets ("সূচনা", "সীমানা", "দৃষ্টি", etc.).
 *    - Shot 01 mounts immediately in crisp 4K containment with zero blank frames.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnthologyFrame, AspectRatio } from '../../types/anthology';
import { ComponentVisibility } from '../ComponentsMatrixPopover';
import { audioEngine } from '../../utils/audioEngine';
import { eventBus } from '../../core/eventBus';
import { 
  Play, 
  Pause,
  SkipBack,
  SkipForward,
  Zap, 
  Download,
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
  Volume2,
  VolumeX,
  Grid,
  Type,
  Maximize2,
  Minimize2,
  BarChart2,
  MoreHorizontal,
  Video,
  Radio,
  Music,
  Check,
  Camera,
  Compass,
  Eye,
  EyeOff,
  FolderPlus,
  Lightbulb,
  Pencil,
  ZoomIn,
  Upload
} from 'lucide-react';
import { ToolTooltip } from '../ui/ToolTooltip';
import { useStudioStore } from '../../core/store';
import { db } from '../../services/db';
import { MediaBinDrawer } from '../MediaBinDrawer';
import { serviceWorkerManager } from '../../services/serviceWorkerManager';
import { DirectorCockpitModal } from '../cockpit/DirectorCockpitModal';
import { CanvasLiquifyModal } from '../CanvasLiquifyModal';
import { CockpitShotBridge, CockpitDispatchTarget } from '../../types/cockpit';
import { 
  LIGHTING_PRESETS, 
  getLightingPresetById, 
  LightingPreset, 
  LightingCategory 
} from '../../data/lightingPresets';
import {
  dispatchToExternalApp,
  generateNLETimelineXML,
  buildCapCutQuickPackZip,
  captureCompositeCanvasPng,
  triggerBrowserDownload,
  freezeAllShotFrames,
  isTauriRuntime,
  registerTauriFrameWatcher
} from '../../utils/interchangeExport';

export interface HandfilmHomeProps {
  frames?: AnthologyFrame[];
  onEnterStudio: (shotIndex?: number) => void;
  onLaunchStudio?: () => void;
  onOpenExportXml: () => void;
  onOpenExportRange?: () => void;
  onOpenShortcuts?: () => void;
  showTitles?: boolean;
  componentsVisibility?: ComponentVisibility;
  onSoloMasterToggle?: (mode: 'SOLO' | 'MASTER') => void;
  onExport?: () => void;
  onRecordToggle?: () => void;
  onZenToggle?: () => void;
  onAspectChange?: (aspect: string) => void;
  onIngestMediaForFrame?: (index: number, file: File) => void;
  onUpdateFrame?: (frame: AnthologyFrame) => void;
  initialViewMode?: 'desktop' | 'mobile';
}

// Dynamic Title Personalities for Shot-Specific Typography & Aesthetics
export type TitlePersonality = 'AUTO' | 'DOPAMINE' | 'MINIMAL' | 'B2B' | 'KINETIC';

export function getShotTitlePersonality(shotIndex: number, override?: TitlePersonality): 'DOPAMINE' | 'MINIMAL' | 'B2B' | 'KINETIC' {
  if (override && override !== 'AUTO') {
    return override;
  }
  const cycle: ('DOPAMINE' | 'MINIMAL' | 'B2B' | 'KINETIC')[] = ['DOPAMINE', 'MINIMAL', 'B2B', 'KINETIC'];
  return cycle[shotIndex % 4];
}

// 12-Shot Master Showcase Configuration - Clean Production Slate (No Mockup Media)
export interface ShowcaseShot {
  id: number;
  shotNumber: string;
  titleEn: string;
  titleBn: string;
  tagline: string;
  directorNotes: string;
  lensSpec: string;
  durationSec: number;
  imageUrl: string;
  videoSrc?: string;
  blobUrl?: string;
  isVideo?: boolean;
  isPlaceholder?: boolean;
  fallbackGradient: string;
  lutFilter: string;
  aspectRatio: string;
  lightId?: string | null;
}

export const SHOWCASE_PRESETS: ShowcaseShot[] = [
  {
    id: 1,
    shotNumber: '01',
    titleEn: 'THE SINGULARITY // 24 FPS',
    titleBn: 'সূচনা',
    tagline: 'MACRO EYES // PUPILS DILATING INTO THE VOID',
    directorNotes: 'Extreme close-up macro on iris contraction under tungsten key light.',
    lensSpec: '35mm Anamorphic T1.4',
    durationSec: 12.0,
    imageUrl: '',
    videoSrc: '',
    blobUrl: '',
    isVideo: false,
    isPlaceholder: false,
    fallbackGradient: 'linear-gradient(135deg, #0a0a0a 0%, #121212 50%, #070709 100%)',
    lutFilter: 'RAWx Cinema 35',
    aspectRatio: '2.39:1'
  },
  {
    id: 2,
    shotNumber: '02',
    titleEn: 'EVENT HORIZON // 35MM RETRO FILM',
    titleBn: 'সীমানা',
    tagline: 'BOUNDARY DEFINITION // LIGHT BENDING AROUND PERIMETER',
    directorNotes: 'Anamorphic portrait under dramatic key light. Boundary definition between observer and subject.',
    lensSpec: '50mm Prime f/1.2',
    durationSec: 12.0,
    imageUrl: '',
    videoSrc: '',
    blobUrl: '',
    isVideo: false,
    isPlaceholder: false,
    fallbackGradient: 'linear-gradient(135deg, #0a0a0a 0%, #121212 50%, #070709 100%)',
    lutFilter: 'Golden Hour 2800K',
    aspectRatio: '2.39:1'
  },
  {
    id: 3,
    shotNumber: '03',
    titleEn: 'ENTERPRISE TELEMETRY // CORE NODE',
    titleBn: 'শিল্প ও প্রযুক্তি',
    tagline: 'COLD TELEMETRY // MACRO ARCHITECTURAL PLATE',
    directorNotes: 'Cold telemetry macro architectural plate with precision corneal reflection.',
    lensSpec: '100mm Macro Probe T2.8',
    durationSec: 12.0,
    imageUrl: '',
    videoSrc: '',
    blobUrl: '',
    isVideo: false,
    isPlaceholder: false,
    fallbackGradient: 'linear-gradient(135deg, #0a0a0a 0%, #121212 50%, #070709 100%)',
    lutFilter: 'Neo-Noir Chiaroscuro',
    aspectRatio: '2.39:1'
  },
  {
    id: 4,
    shotNumber: '04',
    titleEn: 'KINETIC TRANSIENT // FLUID PULSE',
    titleBn: 'সংঘাত',
    tagline: 'SPECULAR TRANSIENT BURST // VISCOUS SURFACE TENSION',
    directorNotes: 'High-contrast specular flash highlighting surface fluid viscosity at 120fps.',
    lensSpec: '28mm Anamorphic Master',
    durationSec: 12.0,
    imageUrl: '',
    videoSrc: '',
    blobUrl: '',
    isVideo: false,
    isPlaceholder: false,
    fallbackGradient: 'linear-gradient(135deg, #0a0a0a 0%, #121212 50%, #070709 100%)',
    lutFilter: 'Cyberpunk Neon',
    aspectRatio: '2.39:1'
  },
  {
    id: 5,
    shotNumber: '05',
    titleEn: 'PHOTON SPHERE // 4K EXPANSION',
    titleBn: 'আলো',
    tagline: 'GRAZING LIGHT ANGLE // SUB-SURFACE SCATTERING',
    directorNotes: 'Micro-fiber epidermal texture under continuous ring light at 440Hz resonance.',
    lensSpec: '85mm Cine Portrait T1.5',
    durationSec: 12.0,
    imageUrl: '',
    videoSrc: '',
    blobUrl: '',
    isVideo: false,
    isPlaceholder: false,
    fallbackGradient: 'linear-gradient(135deg, #0a0a0a 0%, #121212 50%, #070709 100%)',
    lutFilter: 'Tungsten 3200K',
    aspectRatio: '2.39:1'
  },
  {
    id: 6,
    shotNumber: '06',
    titleEn: 'THE APERTURE // ARCHIVAL SPEC',
    titleBn: 'উন্মোচন',
    tagline: 'RADIAL EXPANSION // SCATTERED STARLIGHT BLOOM',
    directorNotes: 'Soft center bloom expanding into shadows. Controlled mechanical aperture pull.',
    lensSpec: '18mm Ultra-Wide Cine',
    durationSec: 12.0,
    imageUrl: '',
    videoSrc: '',
    blobUrl: '',
    isVideo: false,
    isPlaceholder: false,
    fallbackGradient: 'linear-gradient(135deg, #0a0a0a 0%, #121212 50%, #070709 100%)',
    lutFilter: 'RAW Flat Log',
    aspectRatio: '2.39:1'
  },
  {
    id: 7,
    shotNumber: '07',
    titleEn: 'SYSTEM ARCHITECTURE // OPTICAL FEED',
    titleBn: 'গতিশীলতা',
    tagline: 'AXIAL CALIBRATION // PRECISION TRACKING MATRIX',
    directorNotes: 'High-speed automated camera tracking along longitudinal axis.',
    lensSpec: '40mm High-Speed T1.3',
    durationSec: 12.0,
    imageUrl: '',
    videoSrc: '',
    blobUrl: '',
    isVideo: false,
    isPlaceholder: false,
    fallbackGradient: 'linear-gradient(135deg, #0a0a0a 0%, #121212 50%, #070709 100%)',
    lutFilter: 'Matrix Emerald',
    aspectRatio: '2.39:1'
  },
  {
    id: 8,
    shotNumber: '08',
    titleEn: 'REVERBERATION // SPECTRAL DRIFT',
    titleBn: 'প্রতিধ্বনি',
    tagline: 'FREQUENCY MODULATION // DISSOLVING HARMONICS',
    directorNotes: 'Harmonic resonance audio synchronization with subtle color phasing.',
    lensSpec: '65mm Cine Anamorphic',
    durationSec: 12.0,
    imageUrl: '',
    videoSrc: '',
    blobUrl: '',
    isVideo: false,
    isPlaceholder: false,
    fallbackGradient: 'linear-gradient(135deg, #0a0a0a 0%, #121212 50%, #070709 100%)',
    lutFilter: 'Vintage 1970s',
    aspectRatio: '2.39:1'
  },
  {
    id: 9,
    shotNumber: '09',
    titleEn: 'HYPER DRIVE // HIGH HOOK PULSE',
    titleBn: 'স্পন্দন',
    tagline: 'VELOCITY SURGE // ANAMORPHIC HORIZON STREAK',
    directorNotes: 'Dynamic acceleration plate with anamorphic horizontal blue streak flaring.',
    lensSpec: '24mm Ultra Prime T1.9',
    durationSec: 12.0,
    imageUrl: '',
    videoSrc: '',
    blobUrl: '',
    isVideo: false,
    isPlaceholder: false,
    fallbackGradient: 'linear-gradient(135deg, #0a0a0a 0%, #121212 50%, #070709 100%)',
    lutFilter: 'Teal & Orange',
    aspectRatio: '2.39:1'
  },
  {
    id: 10,
    shotNumber: '10',
    titleEn: 'EQUILIBRIUM // SWISS GEOMETRY',
    titleBn: 'স্থিরতা',
    tagline: 'MINIMAL BALANCE // PURIFIED ARCHITECTURAL LINE',
    directorNotes: 'Precision geometric framing with stark architectural chiaroscuro.',
    lensSpec: '50mm Planar T1.4',
    durationSec: 12.0,
    imageUrl: '',
    videoSrc: '',
    blobUrl: '',
    isVideo: false,
    isPlaceholder: false,
    fallbackGradient: 'linear-gradient(135deg, #0a0a0a 0%, #121212 50%, #070709 100%)',
    lutFilter: 'Monochrome High-Contrast',
    aspectRatio: '2.39:1'
  },
  {
    id: 11,
    shotNumber: '11',
    titleEn: 'CYBERNETIC TELEMETRY // SEC 11',
    titleBn: 'ম্যাট্রিক্স',
    tagline: 'DATA STREAM CONVERGENCE // LOGIC INTERFACE',
    directorNotes: 'High-density telemetry HUD overlay on low-light micro-electronics.',
    lensSpec: '100mm Macro Cine T2.8',
    durationSec: 12.0,
    imageUrl: '',
    videoSrc: '',
    blobUrl: '',
    isVideo: false,
    isPlaceholder: false,
    fallbackGradient: 'linear-gradient(135deg, #0a0a0a 0%, #121212 50%, #070709 100%)',
    lutFilter: 'Neo-Noir Chiaroscuro',
    aspectRatio: '2.39:1'
  },
  {
    id: 12,
    shotNumber: '12',
    titleEn: 'COSMIC VOID // MASTER FINALE',
    titleBn: 'মহাজাগতিক',
    tagline: 'EXPANDING INFINITY // STELLAR DUST ABSORPTION',
    directorNotes: 'Deep space aesthetic with subtle starlight chromatic aberration.',
    lensSpec: '14mm Ultra-Wide Fisheye T2.8',
    durationSec: 12.0,
    imageUrl: '',
    videoSrc: '',
    blobUrl: '',
    isVideo: false,
    isPlaceholder: false,
    fallbackGradient: 'linear-gradient(135deg, #0a0a0a 0%, #121212 50%, #070709 100%)',
    lutFilter: 'Bleach Bypass 50%',
    aspectRatio: '2.39:1'
  },
  {
    id: 13,
    shotNumber: '13',
    titleEn: 'SYNAPTIC TRANSIENT // 120 FPS',
    titleBn: 'অনুভূতি',
    tagline: 'NEURAL CONVERGENCE // RAPID OCULAR STROBE',
    directorNotes: 'Micro-strobe key lighting illuminating ocular saccades at 120fps.',
    lensSpec: '50mm High-Speed Cine T1.3',
    durationSec: 12.0,
    imageUrl: '',
    videoSrc: '',
    blobUrl: '',
    isVideo: false,
    isPlaceholder: false,
    fallbackGradient: 'linear-gradient(135deg, #0a0a0a 0%, #121212 50%, #070709 100%)',
    lutFilter: 'Golden Hour 2800K',
    aspectRatio: '2.39:1'
  },
  {
    id: 14,
    shotNumber: '14',
    titleEn: 'GENESIS FINALE // 4K HORIZON',
    titleBn: 'পূর্ণতা',
    tagline: 'FINAL CREATION // LIGHT DISSOLVING INTO CHRONOS',
    directorNotes: 'Wide anamorphic horizon shot. Camera tracking into infinity horizon line.',
    lensSpec: '35mm Anamorphic Master T1.4',
    durationSec: 12.0,
    imageUrl: '',
    videoSrc: '',
    blobUrl: '',
    isVideo: false,
    isPlaceholder: false,
    fallbackGradient: 'linear-gradient(135deg, #0a0a0a 0%, #121212 50%, #070709 100%)',
    lutFilter: 'RAWx Cinema 35',
    aspectRatio: '2.39:1'
  }
];

export const REEL_TEMPLATE_DURATIONS: number[] = [
  2.2, 3.0, 3.5, 3.3, 2.8, 3.1, 2.5, 3.4, 2.2, 3.0, 2.7, 3.6, 2.4, 3.2
];

// 9-Angle Procedural Multi-Cam Configuration
const MULTICAM_9_ANGLES = [
  { id: 1, label: 'CAM 01', name: 'WIDE MASTER (35mm Cine T1.4)', active: true, standby: false },
  { id: 2, label: 'CAM 02', name: 'OVER-SHOULDER A (50mm Prime)', active: false, standby: false },
  { id: 3, label: 'CAM 03', name: 'OVER-SHOULDER B (85mm T1.5)', active: false, standby: false },
  { id: 4, label: 'CAM 04', name: 'LOW PROFILE HERO (24mm Ultra)', active: false, standby: false },
  { id: 5, label: 'CAM 05', name: 'OVERHEAD BIRD EYE (18mm)', active: false, standby: true },
  { id: 6, label: 'CAM 06', name: 'MACRO PROBE CORNEA (100mm)', active: false, standby: true },
  { id: 7, label: 'CAM 07', name: 'CRANE VISTA HIGH (35mm)', active: false, standby: true },
  { id: 8, label: 'CAM 08', name: 'TELEMETRY HUD FEED', active: false, standby: true },
  { id: 9, label: 'CAM 09', name: 'INFRARED THERMAL AUX', active: false, standby: true }
];

export const HOME_LUT_PRESETS = [
  { id: 'RAWx Cinema 35', label: 'Cinema 35' },
  { id: 'Golden Hour 2800K', label: 'Golden Hour' },
  { id: 'Neo-Noir Chiaroscuro', label: 'Neo-Noir' },
  { id: 'Matrix Emerald', label: 'Matrix' },
  { id: 'Vintage 1970s', label: 'Vintage' },
  { id: 'Cyberpunk Neon', label: 'Cyberpunk' },
  { id: 'Teal & Orange', label: 'Teal & Orange' },
  { id: 'Bleach Bypass 50%', label: 'Bleach Bypass' },
  { id: 'Infrared Aerochrome', label: 'Infrared' },
  { id: 'Kodachrome 64', label: 'Kodachrome' },
  { id: 'Monochrome High-Contrast', label: 'B&W Contrast' },
  { id: 'Tungsten 3200K', label: 'Cold Tungsten' },
  { id: 'RAW Flat Log', label: 'Raw Flat' }
];

export const getLutFilterCss = (lut: string): string => {
  switch (lut) {
    case 'RAWx Cinema 35':
      return 'contrast(1.18) saturate(1.1) brightness(0.96) sepia(0.08)';
    case 'Golden Hour 2800K':
      return 'sepia(0.28) saturate(1.3) hue-rotate(-12deg) contrast(1.1)';
    case 'Neo-Noir Chiaroscuro':
      return 'contrast(1.4) saturate(0.7) brightness(0.9)';
    case 'Matrix Emerald':
      return 'hue-rotate(65deg) saturate(1.2) contrast(1.15) brightness(0.95)';
    case 'Vintage 1970s':
      return 'sepia(0.35) contrast(0.95) saturate(1.1) brightness(0.98)';
    case 'Cyberpunk Neon':
      return 'contrast(1.25) saturate(1.5) hue-rotate(-20deg)';
    case 'Teal & Orange':
      return 'contrast(1.2) saturate(1.25) hue-rotate(-15deg)';
    case 'Bleach Bypass 50%':
      return 'contrast(1.35) saturate(0.5) brightness(1.05)';
    case 'Infrared Aerochrome':
      return 'hue-rotate(180deg) saturate(1.4) contrast(1.1)';
    case 'Kodachrome 64':
      return 'contrast(1.22) saturate(1.2) brightness(0.98)';
    case 'Monochrome High-Contrast':
      return 'grayscale(1) contrast(1.45) brightness(0.95)';
    case 'Tungsten 3200K':
      return 'hue-rotate(200deg) saturate(0.9) brightness(0.95)';
    case 'RAW Flat Log':
    default:
      return 'none';
  }
};

// ─────────────────────────────────────────────────────────────
// Offscreen Canvas Buffer Dynamic Title Typography Engine
// Pre-renders typography to an offscreen buffer to prevent DOM layout recalculations
// ─────────────────────────────────────────────────────────────
export const renderTitleTypographyToCanvas = (
  targetCanvas: HTMLCanvasElement,
  shot: ShowcaseShot,
  personality: 'DOPAMINE' | 'MINIMAL' | 'B2B' | 'KINETIC'
) => {
  const rect = targetCanvas.getBoundingClientRect();
  const width = Math.max(rect.width, targetCanvas.clientWidth || 1280);
  const height = Math.max(rect.height, targetCanvas.clientHeight || 536);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const targetPixelWidth = Math.round(width * dpr);
  const targetPixelHeight = Math.round(height * dpr);

  if (targetCanvas.width !== targetPixelWidth || targetCanvas.height !== targetPixelHeight) {
    targetCanvas.width = targetPixelWidth;
    targetCanvas.height = targetPixelHeight;
  }

  // Decoupled Offscreen Canvas Buffer
  let offscreen: HTMLCanvasElement | OffscreenCanvas;
  let offCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

  if (typeof OffscreenCanvas !== 'undefined') {
    offscreen = new OffscreenCanvas(targetPixelWidth, targetPixelHeight);
    offCtx = offscreen.getContext('2d');
  } else {
    offscreen = document.createElement('canvas');
    offscreen.width = targetPixelWidth;
    offscreen.height = targetPixelHeight;
    offCtx = offscreen.getContext('2d');
  }

  if (!offCtx) return;

  offCtx.scale(dpr, dpr);
  offCtx.clearRect(0, 0, width, height);

  const isVertical = height > width;
  const paddingX = isVertical ? Math.max(24, width * 0.08) : Math.max(28, width * 0.05);
  const paddingBottom = isVertical ? Math.max(160, height * 0.26) : Math.max(28, height * 0.08);
  const baseY = height - paddingBottom;

  const titleBn = shot.titleBn || 'শিরোনাম';
  const titleEn = shot.titleEn || 'SHOT TITLE';

  if (personality === 'DOPAMINE') {
    // 1. Cyber Tally Tag
    const badgeText = '[ DPM ULTRA // HIGH-ENERGY HOOK ]';
    offCtx.save();
    offCtx.font = '900 10.5px "JetBrains Mono", ui-monospace, monospace';
    const badgeMetrics = offCtx.measureText(badgeText);
    const badgeW = badgeMetrics.width + 24;
    const badgeH = 20;
    const badgeY = baseY - 84;

    offCtx.fillStyle = 'rgba(6, 22, 34, 0.88)';
    offCtx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
    offCtx.lineWidth = 1;
    offCtx.shadowColor = 'rgba(0, 240, 255, 0.5)';
    offCtx.shadowBlur = 12;

    offCtx.beginPath();
    if (typeof (offCtx as any).roundRect === 'function') {
      (offCtx as any).roundRect(paddingX, badgeY - 14, badgeW, badgeH, 4);
    } else {
      offCtx.rect(paddingX, badgeY - 14, badgeW, badgeH);
    }
    offCtx.fill();
    offCtx.stroke();

    // Pulse dot
    offCtx.shadowBlur = 0;
    offCtx.fillStyle = '#00F0FF';
    offCtx.beginPath();
    offCtx.arc(paddingX + 9, badgeY - 4, 3, 0, Math.PI * 2);
    offCtx.fill();

    offCtx.fillStyle = '#00F0FF';
    offCtx.fillText(badgeText, paddingX + 17, badgeY);
    offCtx.restore();

    // 2. High-Impact Bengali Headline with Dual Neon Glow & Gradient
    offCtx.save();
    const fontSizeBn = Math.min(64, Math.max(34, width * 0.046));
    offCtx.font = `800 ${fontSizeBn}px "Anek Bangla", "Noto Serif Bengali", sans-serif`;

    // Glow 1: Cyan bloom
    offCtx.shadowColor = 'rgba(0, 240, 255, 0.9)';
    offCtx.shadowBlur = 28;

    const grad = offCtx.createLinearGradient(paddingX, baseY - 50, paddingX, baseY - 10);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.35, '#FACC15');
    grad.addColorStop(0.8, '#00F0FF');
    grad.addColorStop(1, '#FF0055');
    offCtx.fillStyle = grad;

    offCtx.fillText(titleBn, paddingX, baseY - 20);

    // Glow 2: Magenta secondary strike
    offCtx.shadowColor = 'rgba(255, 0, 85, 0.55)';
    offCtx.shadowBlur = 40;
    offCtx.fillText(titleBn, paddingX, baseY - 20);
    offCtx.restore();

    // 3. Cinzel English Subtitle
    offCtx.save();
    const fontSizeEn = Math.min(18, Math.max(12, width * 0.015));
    offCtx.font = `700 ${fontSizeEn}px "Cinzel", Georgia, serif`;
    offCtx.fillStyle = '#00F0FF';
    offCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    offCtx.shadowBlur = 10;
    if ('letterSpacing' in offCtx) {
      (offCtx as any).letterSpacing = '3px';
    }
    offCtx.fillText(titleEn.toUpperCase(), paddingX, baseY + 6);
    offCtx.restore();

  } else if (personality === 'MINIMAL') {
    // 1. Swiss Editorial Subtitle & Razor Bar
    offCtx.save();
    const subText = `SWISS EDITORIAL // SHOT ${shot.shotNumber}`;
    offCtx.font = '600 10px "JetBrains Mono", ui-monospace, monospace';
    if ('letterSpacing' in offCtx) {
      (offCtx as any).letterSpacing = '2px';
    }
    offCtx.fillStyle = '#A1A1AA';
    offCtx.fillText(subText, paddingX + 14, baseY - 62);

    // Razor-thin vertical bar
    offCtx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    offCtx.fillRect(paddingX, baseY - 70, 2.5, 78);

    // White Bauhaus Bangla Headline
    const fontSizeBn = Math.min(60, Math.max(32, width * 0.042));
    offCtx.font = `700 ${fontSizeBn}px "Anek Bangla", "Noto Serif Bengali", sans-serif`;
    offCtx.fillStyle = '#FFFFFF';
    offCtx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    offCtx.shadowBlur = 6;
    offCtx.fillText(titleBn, paddingX + 14, baseY - 16);

    // Monospaced Secondary Subtitle
    const fontSizeEn = Math.min(13.5, Math.max(11, width * 0.012));
    offCtx.font = `500 ${fontSizeEn}px "JetBrains Mono", monospace`;
    if ('letterSpacing' in offCtx) {
      (offCtx as any).letterSpacing = '4px';
    }
    offCtx.fillStyle = '#D4D4D8';
    offCtx.fillText(titleEn.toUpperCase(), paddingX + 14, baseY + 8);
    offCtx.restore();

  } else if (personality === 'B2B') {
    // 1. Monospace Tactical Card
    offCtx.save();
    const fontSizeBn = Math.min(50, Math.max(26, width * 0.036));
    offCtx.font = `800 ${fontSizeBn}px "JetBrains Mono", "Anek Bangla", monospace`;
    const textWidth = Math.max(offCtx.measureText(titleBn).width, 320);

    const boxWidth = textWidth + 36;
    const boxHeight = 100;
    const boxY = baseY - boxHeight + 10;

    // Tactical Card Fill
    offCtx.fillStyle = 'rgba(7, 9, 14, 0.84)';
    offCtx.strokeStyle = '#F5A623';
    offCtx.lineWidth = 1.5;

    offCtx.beginPath();
    if (typeof (offCtx as any).roundRect === 'function') {
      (offCtx as any).roundRect(paddingX, boxY, boxWidth, boxHeight, [0, 8, 8, 0]);
    } else {
      offCtx.rect(paddingX, boxY, boxWidth, boxHeight);
    }
    offCtx.fill();

    // Corner bracket marks
    offCtx.fillStyle = '#F5A623';
    offCtx.fillRect(paddingX, boxY, 22, 2.5); // Top-left horizontal
    offCtx.fillRect(paddingX, boxY, 2.5, 22); // Top-left vertical

    // Telemetry indicator HUD line
    const telemText = `[ SEC: ${shot.shotNumber} // LATENCY: 0.12ms // BUFFER: LOCKED ]`;
    offCtx.font = '700 9.5px "JetBrains Mono", monospace';
    offCtx.fillStyle = '#F5A623';
    offCtx.fillText(telemText, paddingX + 16, boxY + 20);

    // Headline with Steel/Silver Gradient
    offCtx.font = `800 ${fontSizeBn}px "JetBrains Mono", "Anek Bangla", monospace`;
    const grad = offCtx.createLinearGradient(paddingX + 16, boxY + 28, paddingX + 16, boxY + 66);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.5, '#E2E8F0');
    grad.addColorStop(1, '#94A3B8');
    offCtx.fillStyle = grad;
    offCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    offCtx.shadowBlur = 6;
    offCtx.fillText(titleBn, paddingX + 16, boxY + 64);

    // English Telemetry Prompt
    offCtx.font = '700 11.5px "JetBrains Mono", monospace';
    offCtx.fillStyle = '#F5A623';
    if ('letterSpacing' in offCtx) {
      (offCtx as any).letterSpacing = '2px';
    }
    offCtx.fillText(`▶  ${titleEn.toUpperCase()}`, paddingX + 16, boxY + 88);
    offCtx.restore();

  } else {
    // 1. KINETIC CANVAS: Dual-Weight Metallic Gold Script
    offCtx.save();
    offCtx.font = 'italic 500 12px "Noto Serif Bengali", serif';
    offCtx.fillStyle = 'rgba(254, 240, 138, 0.85)';
    offCtx.fillText('Fluid Motion Canvas • Staggered Flow', paddingX, baseY - 62);

    // Gold Metallic Headline
    const fontSizeBn = Math.min(62, Math.max(32, width * 0.044));
    offCtx.font = `800 ${fontSizeBn}px "Anek Bangla", "Noto Serif Bengali", sans-serif`;
    const grad = offCtx.createLinearGradient(paddingX, baseY - 52, paddingX, baseY - 12);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.3, '#FFF2B2');
    grad.addColorStop(0.7, '#F5A623');
    grad.addColorStop(1, '#B45309');
    offCtx.fillStyle = grad;
    offCtx.shadowColor = 'rgba(245, 166, 35, 0.55)';
    offCtx.shadowBlur = 28;
    offCtx.fillText(titleBn, paddingX, baseY - 18);

    // Secondary italic English text
    offCtx.font = 'italic 600 16px "Cinzel", Georgia, serif';
    offCtx.fillStyle = '#E4E4E7';
    offCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    offCtx.shadowBlur = 10;
    offCtx.fillText(`//  ${titleEn}`, paddingX, baseY + 8);
    offCtx.restore();
  }

  // Blit the rasterized buffer onto the visible canvas in a single GPU operation
  const mainCtx = targetCanvas.getContext('2d', { alpha: true, desynchronized: true });
  if (mainCtx) {
    mainCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    mainCtx.drawImage(offscreen as any, 0, 0);
  }
};

export const HandfilmHome: React.FC<HandfilmHomeProps> = ({
  frames = [],
  onEnterStudio,
  onLaunchStudio,
  onOpenExportXml,
  onOpenExportRange,
  onOpenShortcuts,
  showTitles = true,
  componentsVisibility,
  onSoloMasterToggle,
  onExport,
  onRecordToggle,
  onZenToggle,
  onAspectChange,
  initialViewMode = 'desktop'
}) => {
  // ─────────────────────────────────────────────────────────────
  // 1. Dual-Mode Studio State & Workstation Core
  // ─────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(initialViewMode);
  const [showSafeAreas, setShowSafeAreas] = useState<boolean>(true);
  const [activeShotIndex, setActiveShotIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [soloMasterMode, setSoloMasterMode] = useState<'SOLO' | 'MASTER'>('MASTER');
  const [isSnapToBeat, setIsSnapToBeat] = useState<boolean>(true);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('2.39:1');
  const [stageZoomLevel, setStageZoomLevel] = useState<'1.0x' | '1.5x' | '2.0x'>('1.0x');
  const [showCompositionGrid, setShowCompositionGrid] = useState<boolean>(false);
  const [titlesLayerActive, setTitlesLayerActive] = useState<boolean>(showTitles);
  const [isReelTemplateActive, setIsReelTemplateActive] = useState<boolean>(false);
  const [isCockpitOpen, setIsCockpitOpen] = useState<boolean>(false);
  const [cockpitModalTab, setCockpitModalTab] = useState<'bridges' | 'watcher' | 'interchange'>('bridges');
  const [activeDispatchFlyoutIdx, setActiveDispatchFlyoutIdx] = useState<number | null>(null);
  const [dispatchHudAnchor, setDispatchHudAnchor] = useState<{ idx: number; left: number; top: number } | null>(null);

  // Dedicated Auto-Audio Routing State (The Music Floor)
  const [audioTrackInfo, setAudioTrackInfo] = useState<{
    name: string;
    duration: number;
    url: string;
    isMuted: boolean;
    volume: number;
  } | null>(null);

  // Fast Inline Trim / Slip Per Shot (14 Shots)
  const [trimPoints, setTrimPoints] = useState<Record<number, { in: number; out: number }>>(() => {
    const init: Record<number, { in: number; out: number }> = {};
    SHOWCASE_PRESETS.forEach((shot, i) => {
      init[i] = { in: 0, out: shot.durationSec };
    });
    return init;
  });

  // Custom title overrides & dynamic multi-style personality engine
  const [customTitles, setCustomTitles] = useState<Record<number, { titleEn: string; titleBn: string }>>({});
  const [customTitleStyles, setCustomTitleStyles] = useState<Record<number, TitlePersonality>>({});
  const [customLuts, setCustomLuts] = useState<Record<number, string>>({});
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [editingTitleEn, setEditingTitleEn] = useState<string>('');
  const [editingTitleBn, setEditingTitleBn] = useState<string>('');
  const [editingTitleStyle, setEditingTitleStyle] = useState<TitlePersonality>('AUTO');

  // Media Vault & Zero-Wait Ingestion State
  const [vaultAssets, setVaultAssets] = useState<Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    status: string;
    isVideo: boolean;
    thumbnailUrl?: string;
  }>>([]);
  const [customMedia, setCustomMedia] = useState<Record<number, {
    url: string;
    videoSrc?: string;
    blobUrl?: string;
    isVideo: boolean;
    name: string;
    thumbnailUrl?: string;
  }>>({});
  const [isVaultDrawerOpen, setIsVaultDrawerOpen] = useState<boolean>(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [isDraggingOverStage, setIsDraggingOverStage] = useState<boolean>(false);
  const [dragTargetShotIdx, setDragTargetShotIdx] = useState<number | null>(null);

  // 34-Preset Cinematic Lighting Engine State
  const [customLights, setCustomLights] = useState<Record<number, string | null>>({});
  const [isLightDrawerOpen, setIsLightDrawerOpen] = useState<boolean>(false);
  const [lightFilterTab, setLightFilterTab] = useState<'ALL' | 'ATMO' | 'GOBO' | 'TONE' | 'STUDIO'>('ALL');
  const [showLightToast, setShowLightToast] = useState<boolean>(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);

  // Header Interactive States & Non-Blocking Export
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isZenModeActive, setIsZenModeActive] = useState<boolean>(false);
  const [isStatsTelemetryOpen, setIsStatsTelemetryOpen] = useState<boolean>(false);
  const [isOptionsDrawerOpen, setIsOptionsDrawerOpen] = useState<boolean>(false);
  const [isMultiCamExpanded, setIsMultiCamExpanded] = useState<boolean>(false);
  const [activeCameraAngle, setActiveCameraAngle] = useState<number>(1);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const [exportState, setExportState] = useState<{
    isExporting: boolean;
    progress: number;
    statusText: string;
  }>({
    isExporting: false,
    progress: 0,
    statusText: ''
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Immortal Master Video Engine & Permanent DOM Element Refs
  // ─────────────────────────────────────────────────────────────
  const masterVideoRef = useRef<HTMLVideoElement | null>(null);
  const masterAudioRef = useRef<HTMLAudioElement | null>(null);
  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaSourceCacheRef = useRef<Map<string, string>>(new Map());
  const customMediaImagesRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const offscreenTitleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vaultFileInputRef = useRef<HTMLInputElement>(null);

  // Decoupled 60 FPS DOM Metric Direct Updaters
  const timecodeDisplayRef = useRef<HTMLSpanElement | null>(null);
  const mobileTimecodeRef = useRef<HTMLSpanElement | null>(null);
  const timelinePlayheadRef = useRef<HTMLDivElement | null>(null);
  const mobilePlayheadRef = useRef<HTMLDivElement | null>(null);
  const scrubberTrackRef = useRef<HTMLDivElement | null>(null);
  const durationDisplayRef = useRef<HTMLSpanElement | null>(null);
  const audioPlayheadRef = useRef<HTMLDivElement | null>(null);
  const currentFrameRef = useRef<number>(275);
  const isScrubbingRef = useRef<boolean>(false);
  const activeShotDurationRef = useRef<number>(12.0);

  // Hot Loop Synchronized State Mirrors (Zero React State Lag)
  const isPlayingRef = useRef<boolean>(false);
  const activeShotIndexRef = useRef<number>(0);
  const soloMasterModeRef = useRef<'SOLO' | 'MASTER'>('MASTER');
  const titlesLayerActiveRef = useRef<boolean>(showTitles);
  const showCompositionGridRef = useRef<boolean>(false);
  const playbackSpeedRef = useRef<number>(1.0);
  const currentLutsRef = useRef<Record<number, string>>({});
  const currentLightsRef = useRef<Record<number, string | null>>({});
  const customTitleStylesRef = useRef<Record<number, TitlePersonality>>({});
  const customTitlesRef = useRef<Record<number, { titleEn: string; titleBn: string }>>({});
  const trimPointsRef = useRef<Record<number, { in: number; out: number }>>(trimPoints);

  useEffect(() => { activeShotIndexRef.current = activeShotIndex; }, [activeShotIndex]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { soloMasterModeRef.current = soloMasterMode; }, [soloMasterMode]);
  useEffect(() => { titlesLayerActiveRef.current = titlesLayerActive; }, [titlesLayerActive]);
  useEffect(() => { showCompositionGridRef.current = showCompositionGrid; }, [showCompositionGrid]);
  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);
  useEffect(() => { currentLutsRef.current = customLuts; }, [customLuts]);
  useEffect(() => { currentLightsRef.current = customLights; }, [customLights]);
  useEffect(() => { customTitleStylesRef.current = customTitleStyles; }, [customTitleStyles]);
  useEffect(() => { customTitlesRef.current = customTitles; }, [customTitles]);
  useEffect(() => { trimPointsRef.current = trimPoints; }, [trimPoints]);

  // Active shot resolver: blends user frames if passed, otherwise loads curated showcase presets
  const activeShot: ShowcaseShot = useMemo(() => {
    const preset = SHOWCASE_PRESETS[activeShotIndex % SHOWCASE_PRESETS.length];
    const custom = customTitles[activeShotIndex];
    const lutOverride = customLuts[activeShotIndex];
    const lightOverride = customLights[activeShotIndex];
    const mediaOverride = customMedia[activeShotIndex];
    let base = preset;
    if (frames && frames.length > 0 && frames[activeShotIndex]) {
      const userFrame = frames[activeShotIndex];
      base = {
        ...preset,
        titleEn: userFrame.title || preset.titleEn,
        titleBn: userFrame.bengaliTitle || preset.titleBn,
        tagline: userFrame.tagline || preset.tagline,
        directorNotes: userFrame.directorNotes || preset.directorNotes,
        imageUrl: userFrame.imageUrl || preset.imageUrl,
        durationSec: userFrame.durationSec || userFrame.slideHoldSec || 12.0
      };
    }
    if (lutOverride) {
      base = { ...base, lutFilter: lutOverride };
    }
    if (lightOverride !== undefined) {
      base = { ...base, lightId: lightOverride };
    }
    if (mediaOverride) {
      base = {
        ...base,
        imageUrl: mediaOverride.url,
        videoSrc: mediaOverride.videoSrc || mediaOverride.url,
        blobUrl: mediaOverride.blobUrl || mediaOverride.url,
        isVideo: mediaOverride.isVideo
      };
    }
    if (custom) {
      return {
        ...base,
        titleEn: custom.titleEn || base.titleEn,
        titleBn: custom.titleBn || base.titleBn
      };
    }
    return base;
  }, [activeShotIndex, frames, customTitles, customLuts, customLights, customMedia]);

  useEffect(() => {
    activeShotDurationRef.current = activeShot.durationSec;
  }, [activeShot.durationSec]);

  const activeShotLightId = useMemo(() => {
    if (customLights[activeShotIndex] !== undefined) {
      return customLights[activeShotIndex];
    }
    return activeShot.lightId ?? null;
  }, [customLights, activeShotIndex, activeShot.lightId]);

  const filteredLightingPresets = useMemo(() => {
    if (lightFilterTab === 'ALL') return LIGHTING_PRESETS;
    if (lightFilterTab === 'ATMO') return LIGHTING_PRESETS.filter(p => p.category === 'ATMOSPHERE');
    if (lightFilterTab === 'GOBO') return LIGHTING_PRESETS.filter(p => p.category === 'OPTICAL');
    if (lightFilterTab === 'TONE') return LIGHTING_PRESETS.filter(p => p.category === 'EXPOSURE');
    if (lightFilterTab === 'STUDIO') return LIGHTING_PRESETS.filter(p => p.category === 'STUDIO');
    return LIGHTING_PRESETS;
  }, [lightFilterTab]);

  const handleSelectLightPreset = useCallback((presetId: string | null) => {
    if (!presetId) {
      setCustomLights(prev => ({ ...prev, [activeShotIndex]: null }));
      return;
    }
    setCustomLights(prev => {
      const nextVal = prev[activeShotIndex] === presetId ? null : presetId;
      return { ...prev, [activeShotIndex]: nextVal };
    });
    try { audioEngine.playShutterClick(); } catch {}
  }, [activeShotIndex]);

  const handleClearLight = useCallback(() => {
    setCustomLights(prev => ({ ...prev, [activeShotIndex]: null }));
    try { audioEngine.playShutterClick(); } catch {}
  }, [activeShotIndex]);

  const handleApplyLightToAllShots = useCallback((overrideLightId?: string | null | React.MouseEvent) => {
    const currentVal = (typeof overrideLightId === 'string' || overrideLightId === null)
      ? overrideLightId
      : activeShotLightId;
    const newLights: Record<number, string | null> = {};
    SHOWCASE_PRESETS.forEach((_, idx) => {
      newLights[idx] = currentVal;
    });
    setCustomLights(newLights);
    currentLightsRef.current = newLights;
    setShowLightToast(true);
    try { audioEngine.playShutterClick(); } catch {}
    setTimeout(() => setShowLightToast(false), 2500);
  }, [activeShotLightId]);

  const activeShotPersonality = useMemo<'DOPAMINE' | 'MINIMAL' | 'B2B' | 'KINETIC'>(() => {
    return getShotTitlePersonality(activeShotIndex, customTitleStyles[activeShotIndex]);
  }, [activeShotIndex, customTitleStyles]);

  const getMediaForShot = useCallback((idx: number) => {
    const custom = customMedia[idx];
    if (custom && custom.url) return custom;
    if (frames && frames[idx]) {
      const f = frames[idx];
      const src = (f as any).videoSrc || f.imageUrl;
      if (src) {
        return {
          url: src,
          videoSrc: src,
          blobUrl: src,
          isVideo: Boolean((f as any).videoSrc || /\.(mp4|webm|mov|mkv|ogg|m4v)($|\?)/i.test(src)),
          name: f.title || `Shot ${idx + 1}`
        };
      }
    }
    const preset = SHOWCASE_PRESETS[idx % SHOWCASE_PRESETS.length];
    if (preset && (preset.videoSrc || preset.imageUrl)) {
      return {
        url: preset.videoSrc || preset.imageUrl,
        videoSrc: preset.videoSrc || preset.imageUrl,
        blobUrl: preset.blobUrl || preset.imageUrl,
        isVideo: preset.isVideo || /\.(mp4|webm|mov|mkv|ogg|m4v)($|\?)/i.test(preset.imageUrl || ''),
        name: preset.titleEn
      };
    }
    return null;
  }, [customMedia, frames]);

  const getShotData = useCallback((idx: number): ShowcaseShot => {
    const preset = SHOWCASE_PRESETS[idx % SHOWCASE_PRESETS.length];
    const custom = customTitles[idx];
    const lutOverride = customLuts[idx];
    const lightOverride = customLights[idx];
    const media = getMediaForShot(idx);
    let s = preset;
    if (frames && frames[idx]) {
      const f = frames[idx];
      s = {
        ...s,
        titleEn: f.title || s.titleEn,
        titleBn: f.bengaliTitle || s.titleBn,
        tagline: f.tagline || s.tagline,
        directorNotes: f.directorNotes || s.directorNotes,
        imageUrl: f.imageUrl || s.imageUrl,
        durationSec: f.durationSec || 12.0
      };
    }
    if (lutOverride) s = { ...s, lutFilter: lutOverride };
    if (lightOverride !== undefined) s = { ...s, lightId: lightOverride };
    if (media) {
      s = { ...s, imageUrl: media.url, videoSrc: media.videoSrc, blobUrl: media.blobUrl, isVideo: media.isVideo };
    }
    if (custom) {
      s = { ...s, titleEn: custom.titleEn || s.titleEn, titleBn: custom.titleBn || s.titleBn };
    }
    return s;
  }, [customTitles, customLuts, customLights, getMediaForShot, frames]);

  const allCockpitShots = useMemo<CockpitShotBridge[]>(() => {
    return SHOWCASE_PRESETS.map((p, idx) => {
      const s = getShotData(idx);
      const personality = getShotTitlePersonality(idx, customTitleStyles[idx]);
      const trim = trimPoints[idx] || { in: 0, out: s.durationSec };
      const activeLightId = customLights[idx] !== undefined ? customLights[idx] : (s.lightId ?? null);
      const activeLightPreset = activeLightId ? getLightingPresetById(activeLightId) : undefined;
      return {
        shotId: `shot_${p.shotNumber}`,
        shotNumber: p.shotNumber,
        titleEn: s.titleEn,
        titleBn: s.titleBn,
        titleText: s.titleBn ? `${s.titleBn} // ${s.titleEn}` : s.titleEn,
        personality,
        titlePersonality: personality,
        inPoint: trim.in,
        outPoint: trim.out,
        durationSec: Math.max(0.1, trim.out - trim.in),
        mediaUrl: s.videoSrc || s.imageUrl,
        thumbnailUrl: s.imageUrl,
        lutFilter: s.lutFilter,
        lensSpec: s.lensSpec,
        directorNotes: s.directorNotes,
        lightId: activeLightId,
        lightName: activeLightPreset?.name
      };
    });
  }, [getShotData, customTitleStyles, trimPoints, customLights]);

  const currentCockpitShot = useMemo<CockpitShotBridge>(() => {
    return allCockpitShots[activeShotIndex] || allCockpitShots[0];
  }, [allCockpitShots, activeShotIndex]);

  // Broadcast live Cockpit manifest telemetry to StageHeader HUD
  useEffect(() => {
    const activeLightsCount = allCockpitShots.filter((s) => Boolean(s.lightId)).length;
    const totalDurationSec = allCockpitShots.reduce((acc, s) => acc + (s.durationSec || 0), 0);
    eventBus.emit('cockpit:stats', {
      totalShots: allCockpitShots.length,
      activeLightsCount,
      audioSynced: Boolean(audioTrackInfo),
      audioTrackName: audioTrackInfo?.name || null,
      totalDurationSec,
      isTauriActive: isTauriRuntime()
    });
  }, [allCockpitShots, audioTrackInfo]);

  // ─────────────────────────────────────────────────────────────
  // 3. Zero-Stall Shot Switching (Permanent Decoder Mutation)
  // ─────────────────────────────────────────────────────────────
  const switchShotMedia = useCallback((shotMediaUrl: string, targetTime: number = 0) => {
    const video = masterVideoRef.current;
    if (!video) return;
    if (!shotMediaUrl) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      return;
    }
    if (video.src !== shotMediaUrl) {
      video.src = shotMediaUrl;
      video.currentTime = targetTime;
      video.load();
    } else {
      video.currentTime = targetTime;
    }
    if (isPlayingRef.current) {
      video.play().catch(() => {});
    }
  }, []);

  const selectShot = useCallback((idx: number) => {
    setActiveShotIndex(idx);
    activeShotIndexRef.current = idx;
    const inPt = trimPointsRef.current[idx]?.in ?? 0;
    const media = getMediaForShot(idx);
    if (media && media.isVideo && media.url) {
      switchShotMedia(media.url, inPt);
    } else {
      if (masterVideoRef.current) {
        masterVideoRef.current.pause();
        masterVideoRef.current.removeAttribute('src');
        masterVideoRef.current.load();
      }
    }
    seekToFrame(Math.round(inPt * 24));
    try { audioEngine.playShutterClick(); } catch {}
  }, [getMediaForShot, switchShotMedia]);

  // Top 10 Shots for the Netflix poster row
  const top10Shots = useMemo(() => {
    if (frames && frames.length > 0) return frames.slice(0, 10);
    return Array.from({ length: 10 }, (_, i) => {
      const base = SHOWCASE_PRESETS[i % SHOWCASE_PRESETS.length];
      return {
        id: i,
        epNumber: `#${String(i + 1).padStart(3, '0')}`,
        title: base.titleEn,
        bengaliTitle: base.titleBn,
        tagline: base.tagline,
        directorNotes: base.directorNotes,
        soundCue: '36Hz Sub Bass Pulse',
        imageUrl: base.imageUrl,
        aspectRatio: '2.39:1',
        cameraSpec: {
          focalLength: base.lensSpec,
          aperture: 'f/1.4',
          shutter: '1/48s 180°',
          iso: 'ISO 400',
          sensor: 'Full Frame ARRI LF',
          format: '2.39:1 Scope'
        }
      } as unknown as AnthologyFrame;
    });
  }, [frames]);

  // ─────────────────────────────────────────────────────────────
  // 4. Decoupled DOM Playhead Updaters & SMPTE Timecode
  // ─────────────────────────────────────────────────────────────
  const formatSmpteTimecode = useCallback((frame: number, fps = 24): string => {
    const f = frame % fps;
    const totalSeconds = Math.floor(frame / fps);
    const s = totalSeconds % 60;
    const m = (Math.floor(totalSeconds / 60) + 10) % 60;
    const h = Math.floor(totalSeconds / 3600);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
  }, []);

  const updateDOMMetrics = useCallback((currentSec: number, inSec: number, outSec: number) => {
    const shotDuration = Math.max(0.1, outSec - inSec);
    const relSec = Math.max(0, Math.min(shotDuration, currentSec - inSec));
    const currentFrame = Math.round(relSec * 24);
    currentFrameRef.current = currentFrame;

    const tcText = formatSmpteTimecode(currentFrame);
    if (timecodeDisplayRef.current) {
      timecodeDisplayRef.current.textContent = tcText;
    }
    if (mobileTimecodeRef.current) {
      mobileTimecodeRef.current.textContent = `${tcText.substring(3)} / ${shotDuration.toFixed(1)}s`;
    }
    const pct = Math.min(100, Math.max(0, (relSec / shotDuration) * 100));
    if (timelinePlayheadRef.current) {
      timelinePlayheadRef.current.style.transform = `scaleX(${pct / 100})`;
    }
    if (mobilePlayheadRef.current) {
      mobilePlayheadRef.current.style.left = `${pct}%`;
    }
    if (durationDisplayRef.current) {
      durationDisplayRef.current.textContent = `${shotDuration.toFixed(1)}s`;
    }
    if (audioPlayheadRef.current && masterAudioRef.current && masterAudioRef.current.duration) {
      const audioPct = (masterAudioRef.current.currentTime / masterAudioRef.current.duration) * 100;
      audioPlayheadRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, audioPct / 100))})`;
    }
  }, [formatSmpteTimecode]);

  const seekToFrame = useCallback((targetFrame: number) => {
    const currentTrim = trimPointsRef.current[activeShotIndexRef.current] || { in: 0, out: 12.0 };
    const shotDuration = Math.max(0.1, currentTrim.out - currentTrim.in);
    const maxFrames = Math.max(1, Math.floor(shotDuration * 24));
    const clampedFrame = Math.max(0, Math.min(maxFrames - 1, targetFrame));
    currentFrameRef.current = clampedFrame;

    const timeSec = currentTrim.in + clampedFrame / 24;
    const video = masterVideoRef.current;
    if (video && video.src) {
      try {
        if (typeof (video as any).fastSeek === 'function') {
          (video as any).fastSeek(timeSec);
        } else {
          video.currentTime = timeSec;
        }
      } catch {
        video.currentTime = timeSec;
      }
    }
    const audio = masterAudioRef.current;
    if (audio && audio.src) {
      audio.currentTime = timeSec;
    }
    updateDOMMetrics(timeSec, currentTrim.in, currentTrim.out);
  }, [updateDOMMetrics]);

  const handleScrubPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isScrubbingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const calculateAndSeek = (clientX: number) => {
      const track = scrubberTrackRef.current || (e.currentTarget as HTMLDivElement);
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const currentTrim = trimPointsRef.current[activeShotIndexRef.current] || { in: 0, out: 12.0 };
      const shotDuration = Math.max(0.1, currentTrim.out - currentTrim.in);
      const targetTimeSec = currentTrim.in + ratio * shotDuration;

      const video = masterVideoRef.current;
      if (video && video.src) {
        try {
          if (typeof (video as any).fastSeek === 'function') {
            (video as any).fastSeek(targetTimeSec);
          } else {
            video.currentTime = targetTimeSec;
          }
        } catch {
          video.currentTime = targetTimeSec;
        }
      }
      const audio = masterAudioRef.current;
      if (audio && audio.src) {
        audio.currentTime = targetTimeSec;
      }
      updateDOMMetrics(targetTimeSec, currentTrim.in, currentTrim.out);
    };

    calculateAndSeek(e.clientX);

    const onPointerMove = (ev: PointerEvent) => {
      if (!isScrubbingRef.current) return;
      calculateAndSeek(ev.clientX);
    };

    const onPointerUp = (ev: PointerEvent) => {
      isScrubbingRef.current = false;
      try {
        (ev.target as HTMLElement)?.releasePointerCapture?.(ev.pointerId);
      } catch {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [updateDOMMetrics]);

  // ─────────────────────────────────────────────────────────────
  // 5. Canvas Compositor Math (Cover Crop, Grading, Reticle)
  // ─────────────────────────────────────────────────────────────
  const drawCover = useCallback((
    ctx: CanvasRenderingContext2D,
    img: HTMLVideoElement | HTMLImageElement,
    targetWidth: number,
    targetHeight: number
  ) => {
    const srcWidth = (img as HTMLVideoElement).videoWidth || (img as HTMLImageElement).naturalWidth || targetWidth;
    const srcHeight = (img as HTMLVideoElement).videoHeight || (img as HTMLImageElement).naturalHeight || targetHeight;
    if (!srcWidth || !srcHeight) {
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      return;
    }
    const targetAspect = targetWidth / targetHeight;
    const srcAspect = srcWidth / srcHeight;

    let sx = 0, sy = 0, sw = srcWidth, sh = srcHeight;
    if (srcAspect > targetAspect) {
      sw = srcHeight * targetAspect;
      sx = (srcWidth - sw) / 2;
    } else {
      sh = srcWidth / targetAspect;
      sy = (srcHeight - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
  }, []);

  const drawCleanSlateToCanvas = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    shot: ShowcaseShot
  ) => {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0c0d12');
    bgGrad.addColorStop(0.5, '#090a0e');
    bgGrad.addColorStop(1, '#070709');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#71717A';
    ctx.fillText(`┌ DCI 4K RAW // 2.39:1 SCOPE`, 28, 36);
    ctx.fillText(`CAM 01 // LOCKED ┐`, width - 180, 36);
    ctx.fillText(`└ 24.000 FPS // 180° SHUTTER`, 28, height - 28);
    ctx.fillText(`PRORES 4444 XQ READY ┘`, width - 200, height - 28);

    const cx = width / 2;
    const cy = height / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 54, 0, Math.PI * 2);
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.moveTo(cx - 70, cy); ctx.lineTo(cx + 70, cy);
    ctx.moveTo(cx, cy - 70); ctx.lineTo(cx, cy + 70);
    ctx.stroke();

    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#F5A623';
    ctx.textAlign = 'center';
    ctx.fillText(`SHOT ${shot.shotNumber} • CLEAN PRODUCTION SLATE`, cx, cy + 86);

    ctx.font = '800 16px "JetBrains Mono", monospace';
    ctx.fillStyle = '#E4E4E7';
    ctx.fillText(`DROP 4K MEDIA HERE`, cx, cy + 112);

    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#71717A';
    ctx.fillText(`Drop .MP4, .MOV, .PNG, or .JPG to assign directly to Shot ${shot.shotNumber}`, cx, cy + 132);
    ctx.textAlign = 'left';
  }, []);

  const drawGradeAndGrain = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    lut: string
  ) => {
    ctx.save();
    const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.28, width / 2, height / 2, width * 0.68);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    const seed = (Date.now() / 33) % 1000;
    for (let i = 0; i < 35; i++) {
      const gx = ((i * 123.456 + seed) % 1) * width;
      const gy = (((i + 5) * 789.012 + seed) % 1) * height;
      ctx.fillRect(gx, gy, 2, 2);
    }
    ctx.restore();
  }, []);

  const drawMobileSafeAreas = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;

    const topClearance = height * 0.15;
    ctx.beginPath();
    ctx.moveTo(16, topClearance);
    ctx.lineTo(width - 16, topClearance);
    ctx.stroke();

    const bottomClearance = height * 0.80;
    ctx.beginPath();
    ctx.moveTo(16, bottomClearance);
    ctx.lineTo(width - 16, bottomClearance);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('▲ REELS TOP CLEARANCE (15%)', 20, topClearance - 6);
    ctx.fillText('▼ CAPTIONS & AUDIO CLEARANCE (20%)', 20, bottomClearance + 14);
    ctx.restore();
  }, []);

  const drawGridLines = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 3, 0); ctx.lineTo(width / 3, height);
    ctx.moveTo((width * 2) / 3, 0); ctx.lineTo((width * 2) / 3, height);
    ctx.moveTo(0, height / 3); ctx.lineTo(width, height / 3);
    ctx.moveTo(0, (height * 2) / 3); ctx.lineTo(width, (height * 2) / 3);
    ctx.stroke();
    ctx.restore();
  }, []);

  const drawStageFrame = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    shotIdx: number
  ) => {
    const video = masterVideoRef.current;
    const shot = getShotData(shotIdx);
    const lut = currentLutsRef.current[shotIdx] || shot.lutFilter;
    const activeLightId = currentLightsRef.current[shotIdx] !== undefined 
      ? currentLightsRef.current[shotIdx] 
      : (shot.lightId ?? null);
    const lightPreset = getLightingPresetById(activeLightId);
    const baseLutFilter = getLutFilterCss(lut);
    const activeFilter = lightPreset 
      ? (baseLutFilter && baseLutFilter !== 'none' ? `${baseLutFilter} ${lightPreset.filter}` : lightPreset.filter)
      : baseLutFilter;

    // 1. TIER 1: Master Video / Media Plate
    if (video && video.src && video.readyState >= 2) {
      ctx.save();
      ctx.filter = activeFilter;
      drawCover(ctx, video, width, height);
      ctx.restore();
    } else if (customMediaImagesRef.current.has(shotIdx)) {
      const img = customMediaImagesRef.current.get(shotIdx)!;
      ctx.save();
      ctx.filter = activeFilter;
      drawCover(ctx, img, width, height);
      ctx.restore();
    } else {
      drawCleanSlateToCanvas(ctx, width, height, shot);
    }

    // 2. TIER 2: Active Filter / Grading Layer + Lighting Rig Overlay
    drawGradeAndGrain(ctx, width, height, lut);

    if (lightPreset) {
      ctx.save();
      ctx.globalCompositeOperation = lightPreset.blendMode;
      try {
        lightPreset.renderOverlay(ctx, width, height, performance.now());
      } catch (err) {
        // Safe fallback
      }
      ctx.restore();
    }

    // Reset filter and blend mode before painting Tier-3 Dynamic Titles so titles remain sharp and uncorrupted
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';

    // 3. TIER 3: Creative Kinetic Typography Overlay
    if (titlesLayerActiveRef.current && offscreenTitleCanvasRef.current) {
      ctx.drawImage(offscreenTitleCanvasRef.current, 0, 0, width, height);
    }

    if (viewMode === 'mobile' && showSafeAreas) {
      drawMobileSafeAreas(ctx, width, height);
    }

    if (showCompositionGridRef.current) {
      drawGridLines(ctx, width, height);
    }
  }, [getShotData, drawCover, drawCleanSlateToCanvas, drawGradeAndGrain, drawMobileSafeAreas, drawGridLines, viewMode, showSafeAreas]);

  // ─────────────────────────────────────────────────────────────
  // 6. Decoupled 60 FPS Hardware Ticker (Hardware rAF Loop)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let animId: number;
    let lastFrameTime = performance.now();
    let staticShotElapsed = 0;

    const renderLoop = (now: DOMHighResTimeStamp) => {
      const deltaSec = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      const video = masterVideoRef.current;
      const currentShotIdx = activeShotIndexRef.current;
      const currentTrim = trimPointsRef.current[currentShotIdx] || { in: 0, out: 12.0 };

      if (isPlayingRef.current) {
        let currentTimeSec = 0;
        let hasReachedOut = false;

        if (video && video.src && video.readyState >= 2) {
          currentTimeSec = video.currentTime;
          if (currentTimeSec >= currentTrim.out || video.ended) {
            hasReachedOut = true;
          }
        } else {
          staticShotElapsed += deltaSec * playbackSpeedRef.current;
          currentTimeSec = currentTrim.in + staticShotElapsed;
          if (currentTimeSec >= currentTrim.out) {
            hasReachedOut = true;
          }
        }

        updateDOMMetrics(currentTimeSec, currentTrim.in, currentTrim.out);

        if (hasReachedOut) {
          if (soloMasterModeRef.current === 'MASTER') {
            const nextIdx = (currentShotIdx + 1) % SHOWCASE_PRESETS.length;
            activeShotIndexRef.current = nextIdx;
            setActiveShotIndex(nextIdx);
            staticShotElapsed = 0;

            const nextTrim = trimPointsRef.current[nextIdx] || { in: 0, out: 12.0 };
            const nextMedia = getMediaForShot(nextIdx);
            const nextUrl = nextMedia?.url || '';

            switchShotMedia(nextUrl, nextTrim.in);
          } else {
            staticShotElapsed = 0;
            if (video && video.src) {
              video.currentTime = currentTrim.in;
            }
          }
        }

        const audio = masterAudioRef.current;
        if (audio && audio.src && audio.paused) {
          audio.play().catch(() => {});
        }
      } else {
        if (video && video.src && video.readyState >= 2) {
          updateDOMMetrics(video.currentTime, currentTrim.in, currentTrim.out);
        }
      }

      const canvas = stageCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        if (ctx) {
          drawStageFrame(ctx, canvas.width, canvas.height, currentShotIdx);
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [updateDOMMetrics, getMediaForShot, switchShotMedia, drawStageFrame]);

  // Stage Canvas Resolution Synchronizer
  useEffect(() => {
    const canvas = stageCanvasRef.current;
    if (!canvas) return;
    let targetWidth = 1920;
    let targetHeight = 803;
    if (viewMode === 'mobile') {
      targetWidth = 1080;
      targetHeight = 1920;
    } else if (selectedAspectRatio === '16:9') {
      targetWidth = 1920;
      targetHeight = 1080;
    } else if (selectedAspectRatio === '9:16') {
      targetWidth = 1080;
      targetHeight = 1920;
    } else if (selectedAspectRatio === '4:3') {
      targetWidth = 1440;
      targetHeight = 1080;
    } else if (selectedAspectRatio === '1:1') {
      targetWidth = 1080;
      targetHeight = 1080;
    }
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    if (!offscreenTitleCanvasRef.current) {
      offscreenTitleCanvasRef.current = document.createElement('canvas');
    }
    offscreenTitleCanvasRef.current.width = targetWidth;
    offscreenTitleCanvasRef.current.height = targetHeight;
    renderTitleTypographyToCanvas(offscreenTitleCanvasRef.current, activeShot, activeShotPersonality);
  }, [viewMode, selectedAspectRatio, activeShot, activeShotPersonality]);

  // ─────────────────────────────────────────────────────────────
  // 7. Action Handlers (Transport, Trim, Reel Template, Audio)
  // ─────────────────────────────────────────────────────────────
  const handleTogglePlay = useCallback(() => {
    setIsPlaying(prev => {
      const next = !prev;
      isPlayingRef.current = next;
      const video = masterVideoRef.current;
      const audio = masterAudioRef.current;

      if (next) {
        if (video && video.src) video.play().catch(() => {});
        if (audio && audio.src) audio.play().catch(() => {});
        try { audioEngine.playAudio(); } catch {}
      } else {
        if (video) video.pause();
        if (audio) audio.pause();
        try { audioEngine.pauseAudio(); } catch {}
      }
      return next;
    });
  }, []);

  const handleStepFrame = useCallback((forward: boolean) => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    const currentTrim = trimPointsRef.current[activeShotIndexRef.current] || { in: 0, out: 12.0 };
    const shotDuration = Math.max(0.1, currentTrim.out - currentTrim.in);
    const maxFrames = Math.max(1, Math.floor(shotDuration * 24));
    let nextFrame = currentFrameRef.current;
    if (forward) {
      nextFrame = (nextFrame + 1) % maxFrames;
    } else {
      nextFrame = nextFrame <= 0 ? maxFrames - 1 : nextFrame - 1;
    }
    seekToFrame(nextFrame);
    try { audioEngine.playShutterClick(); } catch {}
  }, [seekToFrame]);

  const handleSoloMasterToggle = useCallback((mode: 'SOLO' | 'MASTER') => {
    setSoloMasterMode(mode);
    soloMasterModeRef.current = mode;
    if (onSoloMasterToggle) onSoloMasterToggle(mode);
    try { audioEngine.playShutterClick(); } catch {}
  }, [onSoloMasterToggle]);

  const handleStudioLaunch = useCallback(() => {
    if (onLaunchStudio) {
      onLaunchStudio();
    } else {
      onEnterStudio(activeShotIndex);
    }
  }, [onLaunchStudio, onEnterStudio, activeShotIndex]);

  const handleExportClick = useCallback(() => {
    if (onExport) {
      onExport();
    } else if (onOpenExportRange) {
      onOpenExportRange();
    } else {
      onOpenExportXml();
    }
  }, [onExport, onOpenExportRange, onOpenExportXml]);

  const handleRecordToggle = useCallback(() => {
    setIsRecording(prev => !prev);
    if (onRecordToggle) onRecordToggle();
  }, [onRecordToggle]);

  const handleZenToggle = useCallback(() => {
    setIsZenModeActive(prev => !prev);
    if (onZenToggle) onZenToggle();
  }, [onZenToggle]);

  const handleAspectChange = useCallback((aspect: string) => {
    setSelectedAspectRatio(aspect);
    if (onAspectChange) onAspectChange(aspect);
  }, [onAspectChange]);

  const handleLutChange = useCallback((lut: string) => {
    setCustomLuts(prev => ({ ...prev, [activeShotIndex]: lut }));
  }, [activeShotIndex]);

  const handleCycleZoom = useCallback(() => {
    setStageZoomLevel(prev => {
      if (prev === '1.0x') return '1.5x';
      if (prev === '1.5x') return '2.0x';
      return '1.0x';
    });
  }, []);

  const handleToggleTitles = useCallback(() => {
    setTitlesLayerActive(prev => !prev);
  }, []);

  const handleOpenTitleEditor = useCallback(() => {
    setEditingTitleEn(activeShot.titleEn);
    setEditingTitleBn(activeShot.titleBn);
    setEditingTitleStyle(customTitleStyles[activeShotIndex] || 'AUTO');
    setIsEditingTitle(prev => !prev);
  }, [activeShot.titleEn, activeShot.titleBn, activeShotIndex, customTitleStyles]);

  const handleSaveCustomTitle = useCallback(() => {
    setCustomTitles(prev => ({
      ...prev,
      [activeShotIndex]: { titleEn: editingTitleEn, titleBn: editingTitleBn }
    }));
    setCustomTitleStyles(prev => ({
      ...prev,
      [activeShotIndex]: editingTitleStyle
    }));
    setIsEditingTitle(false);
  }, [activeShotIndex, editingTitleEn, editingTitleBn, editingTitleStyle]);

  const handleUpdateInPoint = useCallback((idx: number, inVal: number) => {
    const clampedIn = Math.max(0, inVal);
    setTrimPoints(prev => {
      const current = prev[idx] || { in: 0, out: SHOWCASE_PRESETS[idx]?.durationSec || 12.0 };
      const validOut = Math.max(clampedIn + 0.1, current.out);
      const updated = { ...prev, [idx]: { in: clampedIn, out: validOut } };
      trimPointsRef.current = updated;
      return updated;
    });
    if (activeShotIndexRef.current === idx) {
      const video = masterVideoRef.current;
      if (video && video.currentTime < clampedIn) {
        video.currentTime = clampedIn;
      }
    }
  }, []);

  const handleUpdateOutPoint = useCallback((idx: number, outVal: number) => {
    const clampedOut = Math.max(0.1, outVal);
    setTrimPoints(prev => {
      const current = prev[idx] || { in: 0, out: SHOWCASE_PRESETS[idx]?.durationSec || 12.0 };
      const validIn = Math.min(current.in, clampedOut - 0.1);
      const updated = { ...prev, [idx]: { in: Math.max(0, validIn), out: clampedOut } };
      trimPointsRef.current = updated;
      return updated;
    });
  }, []);

  const handleToggleReelTemplate = useCallback(() => {
    setIsReelTemplateActive(prev => {
      const next = !prev;
      if (next) {
        const personalityCycle: TitlePersonality[] = ['DOPAMINE', 'MINIMAL', 'B2B', 'KINETIC'];
        const newTrim: Record<number, { in: number; out: number }> = {};
        const newStyles: Record<number, TitlePersonality> = {};
        SHOWCASE_PRESETS.forEach((_, i) => {
          const d = REEL_TEMPLATE_DURATIONS[i % REEL_TEMPLATE_DURATIONS.length];
          newTrim[i] = { in: 0, out: d };
          newStyles[i] = personalityCycle[i % personalityCycle.length];
        });
        setTrimPoints(newTrim);
        trimPointsRef.current = newTrim;
        setCustomTitleStyles(newStyles);
        customTitleStylesRef.current = newStyles;
        setIngestStatus('[ QUICK REEL TEMPLATE ACTIVE // 14 SHOTS PACED ]');
        setTimeout(() => setIngestStatus(null), 3000);
      }
      return next;
    });
  }, []);

  const generateVideoThumbnailFast = useCallback((videoUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const vid = document.createElement('video');
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = 'metadata';
        vid.src = videoUrl;
        vid.currentTime = 0.2;
        const cleanup = () => {
          vid.onseeked = null;
          vid.onerror = null;
          vid.removeAttribute('src');
          vid.load();
        };
        vid.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 180;
            const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
            if (ctx) {
              ctx.drawImage(vid, 0, 0, 320, 180);
              const thumb = canvas.toDataURL('image/jpeg', 0.85);
              cleanup();
              resolve(thumb);
              return;
            }
          } catch {}
          cleanup();
          resolve(videoUrl);
        };
        vid.onerror = () => {
          cleanup();
          resolve(videoUrl);
        };
        setTimeout(() => {
          cleanup();
          resolve(videoUrl);
        }, 1200);
      } catch {
        resolve(videoUrl);
      }
    });
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 8. Bulk Drag & Drop Ingestion & Dedicated Audio Routing
  // ─────────────────────────────────────────────────────────────
  const handleIngestFiles = useCallback((files: FileList | File[], targetShotIndex?: number) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);

    // Audio interception: Never assign audio to shot card
    const audioFiles = fileList.filter(f => f.type.startsWith('audio/') || /\.(mp3|wav|aac|m4a|ogg|flac)$/i.test(f.name));
    const mediaFiles = fileList.filter(f => !f.type.startsWith('audio/') && !/\.(mp3|wav|aac|m4a|ogg|flac)$/i.test(f.name));

    if (audioFiles.length > 0) {
      const audioFile = audioFiles[0];
      const audioUrl = URL.createObjectURL(audioFile);
      mediaSourceCacheRef.current.set(`audio_${Date.now()}`, audioUrl);
      if (masterAudioRef.current) {
        masterAudioRef.current.src = audioUrl;
        masterAudioRef.current.load();
        if (isPlayingRef.current) {
          masterAudioRef.current.play().catch(() => {});
        }
      }
      setAudioTrackInfo({
        name: audioFile.name,
        duration: 0,
        url: audioUrl,
        isMuted: false,
        volume: 1.0
      });
      setIngestStatus(`[ AUDIO FLOOR ROUTED // ${audioFile.name.toUpperCase()} ]`);
      setTimeout(() => setIngestStatus(null), 4000);
    }

    if (mediaFiles.length === 0) return;

    // Immediate synchronous Object URLs in tight loop
    const newAssets = mediaFiles.map(file => {
      const url = URL.createObjectURL(file);
      const id = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      mediaSourceCacheRef.current.set(id, url);
      mediaSourceCacheRef.current.set(url, url);
      return {
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        url,
        status: 'READY',
        isVideo: file.type.startsWith('video') || /\.(mp4|webm|mov|mkv|ogg|m4v)$/i.test(file.name),
        fileRef: file,
        thumbnailUrl: undefined as string | undefined
      };
    });

    setVaultAssets(prev => [...newAssets, ...prev]);

    // Auto-Sequence: Auto-populate shots sequentially (Asset 0 to Shot 01, Asset 1 to Shot 02, etc.)
    const shouldAutoSequence = mediaFiles.length > 1 || isReelTemplateActive || targetShotIndex === undefined;

    if (shouldAutoSequence) {
      const updatedMedia: Record<number, any> = {};
      const updatedTrim: Record<number, { in: number; out: number }> = {};
      const updatedStyles: Record<number, TitlePersonality> = {};
      const personalityCycle: TitlePersonality[] = ['DOPAMINE', 'MINIMAL', 'B2B', 'KINETIC'];

      newAssets.slice(0, 14).forEach((asset, i) => {
        const slotDuration = isReelTemplateActive ? REEL_TEMPLATE_DURATIONS[i % REEL_TEMPLATE_DURATIONS.length] : 12.0;
        updatedMedia[i] = {
          url: asset.url,
          videoSrc: asset.url,
          blobUrl: asset.url,
          isVideo: asset.isVideo,
          name: asset.name,
          thumbnailUrl: asset.thumbnailUrl
        };
        updatedTrim[i] = { in: 0, out: slotDuration };
        if (isReelTemplateActive) {
          updatedStyles[i] = personalityCycle[i % personalityCycle.length];
        }

        if (!asset.isVideo) {
          const img = new Image();
          img.src = asset.url;
          customMediaImagesRef.current.set(i, img);
        }

        try {
          useStudioStore.getState().updateShot(i, {
            imageUrl: asset.url,
            videoSrc: asset.url,
            blobUrl: asset.url,
            isVideo: asset.isVideo,
            title: asset.name.replace(/\.[^/.]+$/, "")
          });
        } catch {}
      });

      setCustomMedia(prev => ({ ...prev, ...updatedMedia }));
      setTrimPoints(prev => {
        const merged = { ...prev, ...updatedTrim };
        trimPointsRef.current = merged;
        return merged;
      });
      if (isReelTemplateActive) {
        setCustomTitleStyles(prev => ({ ...prev, ...updatedStyles }));
        customTitleStylesRef.current = { ...customTitleStylesRef.current, ...updatedStyles };
      }

      const firstMedia = updatedMedia[activeShotIndexRef.current] || updatedMedia[0];
      if (firstMedia?.url) {
        switchShotMedia(firstMedia.url, updatedTrim[0]?.in ?? 0);
      }

      setIngestStatus(`[ INSTANT AUTO-SLOT // ${Math.min(newAssets.length, 14)} SHOTS POPULATED ]`);
    } else {
      const slotIdx = targetShotIndex !== undefined ? targetShotIndex : activeShotIndexRef.current;
      const primary = newAssets[0];
      setCustomMedia(prev => ({
        ...prev,
        [slotIdx]: {
          url: primary.url,
          videoSrc: primary.url,
          blobUrl: primary.url,
          isVideo: primary.isVideo,
          name: primary.name,
          thumbnailUrl: primary.thumbnailUrl
        }
      }));
      if (!primary.isVideo) {
        const img = new Image();
        img.src = primary.url;
        customMediaImagesRef.current.set(slotIdx, img);
      }
      if (slotIdx === activeShotIndexRef.current) {
        switchShotMedia(primary.url, trimPointsRef.current[slotIdx]?.in ?? 0);
      }
      setIngestStatus(`[ READY // SHOT ${SHOWCASE_PRESETS[slotIdx].shotNumber} POPULATED ]`);
    }

    setTimeout(() => setIngestStatus(null), 4000);

    // Defer thumbnail extraction to offscreen canvas using requestIdleCallback
    const extractThumbnailsInBackground = () => {
      newAssets.forEach((asset, idx) => {
        if (asset.isVideo) {
          generateVideoThumbnailFast(asset.url).then(thumb => {
            setCustomMedia(prev => {
              const current = prev[idx];
              if (current && current.url === asset.url) {
                return { ...prev, [idx]: { ...current, thumbnailUrl: thumb } };
              }
              return prev;
            });
          });
        }
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(extractThumbnailsInBackground, { timeout: 3000 });
    } else {
      setTimeout(extractThumbnailsInBackground, 100);
    }

    // Background Non-Blocking IndexedDB save
    const backgroundPersist = async () => {
      for (const asset of newAssets) {
        if (asset.fileRef) {
          try {
            await db.saveMediaToVault(asset.fileRef);
          } catch {}
        }
      }
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(backgroundPersist, { timeout: 5000 });
    } else {
      setTimeout(backgroundPersist, 200);
    }
  }, [isReelTemplateActive, switchShotMedia, generateVideoThumbnailFast]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleIngestFiles(e.target.files, activeShotIndex);
      e.target.value = '';
    }
  }, [handleIngestFiles, activeShotIndex]);

  const handleDrop = useCallback((e: React.DragEvent, targetShot?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverStage(false);
    setDragTargetShotIdx(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIngestFiles(e.dataTransfer.files, targetShot !== undefined ? targetShot : activeShotIndex);
    }
  }, [handleIngestFiles, activeShotIndex]);

  // Window-level drop listener for audio auto-routing
  useEffect(() => {
    const handleWindowDrop = (e: DragEvent) => {
      if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
      const files = Array.from(e.dataTransfer.files);
      const audioFiles = files.filter(f => f.type.startsWith('audio/') || /\.(mp3|wav|aac|m4a|ogg|flac)$/i.test(f.name));
      if (audioFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        handleIngestFiles(files);
      }
    };
    const handleWindowDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
    };
    window.addEventListener('drop', handleWindowDrop);
    window.addEventListener('dragover', handleWindowDragOver);
    return () => {
      window.removeEventListener('drop', handleWindowDrop);
      window.removeEventListener('dragover', handleWindowDragOver);
    };
  }, [handleIngestFiles]);

  // ─────────────────────────────────────────────────────────────
  // 8.B. The Director's Cockpit: External Pipeline Bridges & Hub
  // ─────────────────────────────────────────────────────────────
  const showCockpitStatus = useCallback((message: string) => {
    setIngestStatus(message);
    eventBus.emit('cockpit:feedback', message);
    setTimeout(() => setIngestStatus(null), 5000);
  }, []);

  const renderShotCompositeToDataUrl = useCallback((shotIdx: number): string | null => {
    if (shotIdx === activeShotIndexRef.current && stageCanvasRef.current) {
      const livePng = captureCompositeCanvasPng(stageCanvasRef.current);
      if (livePng) return livePng;
    }

    const baseWidth = stageCanvasRef.current?.width || (viewMode === 'mobile' ? 1080 : 1920);
    const baseHeight = stageCanvasRef.current?.height || (viewMode === 'mobile' ? 1920 : 803);

    const offscreen = document.createElement('canvas');
    offscreen.width = baseWidth;
    offscreen.height = baseHeight;
    const ctx = offscreen.getContext('2d', { alpha: false });
    if (!ctx) return null;

    const shot = getShotData(shotIdx);
    const lut = currentLutsRef.current[shotIdx] || shot.lutFilter;
    const activeLightId = currentLightsRef.current[shotIdx] !== undefined
      ? currentLightsRef.current[shotIdx]
      : (shot.lightId ?? null);
    const lightPreset = getLightingPresetById(activeLightId);
    const baseLutFilter = getLutFilterCss(lut);
    const activeFilter = lightPreset
      ? (baseLutFilter && baseLutFilter !== 'none' ? `${baseLutFilter} ${lightPreset.filter}` : lightPreset.filter)
      : baseLutFilter;

    if (customMediaImagesRef.current.has(shotIdx)) {
      const img = customMediaImagesRef.current.get(shotIdx)!;
      ctx.save();
      ctx.filter = activeFilter;
      drawCover(ctx, img, baseWidth, baseHeight);
      ctx.restore();
    } else if (shotIdx === activeShotIndexRef.current && masterVideoRef.current && masterVideoRef.current.readyState >= 2) {
      ctx.save();
      ctx.filter = activeFilter;
      drawCover(ctx, masterVideoRef.current, baseWidth, baseHeight);
      ctx.restore();
    } else {
      drawCleanSlateToCanvas(ctx, baseWidth, baseHeight, shot);
    }

    drawGradeAndGrain(ctx, baseWidth, baseHeight, lut);

    if (lightPreset) {
      ctx.save();
      ctx.globalCompositeOperation = lightPreset.blendMode;
      try {
        lightPreset.renderOverlay(ctx, baseWidth, baseHeight, performance.now());
      } catch {}
      ctx.restore();
    }

    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';

    if (titlesLayerActiveRef.current) {
      const titleCanvas = document.createElement('canvas');
      titleCanvas.width = baseWidth;
      titleCanvas.height = baseHeight;
      const personality = getShotTitlePersonality(shotIdx, customTitleStylesRef.current[shotIdx]);
      renderTitleTypographyToCanvas(titleCanvas, shot, personality);
      ctx.drawImage(titleCanvas, 0, 0, baseWidth, baseHeight);
    }

    return captureCompositeCanvasPng(offscreen);
  }, [viewMode, getShotData, drawCover, drawCleanSlateToCanvas, drawGradeAndGrain]);

  const handleDispatchToTool = useCallback(async (target: CockpitDispatchTarget, shotIdx?: number) => {
    const targetIndex = shotIdx !== undefined ? shotIdx : activeShotIndexRef.current;
    const targetShot = allCockpitShots[targetIndex] || currentCockpitShot;
    const base64Frame =
      target === 'photoshop' || target === 'illustrator'
        ? renderShotCompositeToDataUrl(targetIndex) ?? undefined
        : undefined;

    const result = await dispatchToExternalApp({
      appName: target,
      shot: targetShot,
      base64Frame,
      allShots: allCockpitShots,
      audioTrack: audioTrackInfo,
      canvas: stageCanvasRef.current,
      fps: 24,
      projectName: 'HANDFILM_SEQUENCE'
    });

    showCockpitStatus(result.message);
    setActiveDispatchFlyoutIdx(null);
    setDispatchHudAnchor(null);
    try { audioEngine.playShutterClick(); } catch {}
  }, [allCockpitShots, currentCockpitShot, audioTrackInfo, renderShotCompositeToDataUrl, showCockpitStatus]);

  const handleCaptureCurrentFrame = useCallback(async () => {
    const targetIdx = activeShotIndexRef.current;
    const targetShot = allCockpitShots[targetIdx] || currentCockpitShot;
    const base64Frame = renderShotCompositeToDataUrl(targetIdx);
    if (!base64Frame) {
      showCockpitStatus('[ CAPTURE FAILED ]: Stage buffer unavailable');
      return;
    }

    try {
      const result = await dispatchToExternalApp({
        appName: 'photoshop',
        shot: targetShot,
        base64Frame,
        allShots: allCockpitShots,
        audioTrack: audioTrackInfo,
        canvas: stageCanvasRef.current,
        fps: 24,
        projectName: 'HANDFILM_SEQUENCE'
      });
      showCockpitStatus(result.message);
      try { audioEngine.playShutterClick(); } catch {}
    } catch (err: any) {
      showCockpitStatus(`[ CAPTURE FAILED ]: ${err?.message || 'Error'}`);
    }
  }, [allCockpitShots, currentCockpitShot, audioTrackInfo, renderShotCompositeToDataUrl, showCockpitStatus]);

  const handleFreezeAllFrames = useCallback(async () => {
    try {
      const res = await freezeAllShotFrames(allCockpitShots, renderShotCompositeToDataUrl);
      showCockpitStatus(res.message);
      try { audioEngine.playShutterClick(); } catch {}
    } catch (err: any) {
      showCockpitStatus(`[ FREEZE ALL FAILED ]: ${err?.message || 'Error'}`);
    }
  }, [allCockpitShots, renderShotCompositeToDataUrl, showCockpitStatus]);

  const handleExportNleSequence = useCallback(() => {
    try {
      const xml = generateNLETimelineXML(allCockpitShots, audioTrackInfo, {
        fps: 24,
        projectName: 'HANDFILM_SEQUENCE'
      });
      triggerBrowserDownload(xml, `HANDFILM_TIMELINE_${Date.now()}.fcpxml`, 'application/xml');
      showCockpitStatus(
        isTauriRuntime()
          ? '[TAURI IPC] FCPXML v1.9 timeline exported with Light & Title markers'
          : '[SANDBOX MODE] FCPXML v1.9 exported — Tauri IPC ready for Premiere / Resolve'
      );
      try { audioEngine.playShutterClick(); } catch {}
    } catch (err: any) {
      showCockpitStatus(`[ XML ERROR ]: ${err?.message || 'Export failed'}`);
    }
  }, [allCockpitShots, audioTrackInfo, showCockpitStatus]);

  const handleExportCapCutBundle = useCallback(async () => {
    setIngestStatus('[ COMPILING CAPCUT QUICK-PACK BUNDLE... ]');
    try {
      const zipBlob = await buildCapCutQuickPackZip(
        allCockpitShots,
        audioTrackInfo,
        stageCanvasRef.current,
        { fps: 24, projectName: 'HANDFILM_REEL' }
      );
      triggerBrowserDownload(zipBlob, `HANDFILM_CapCut_Bundle_${Date.now()}.zip`, 'application/zip');
      showCockpitStatus(
        isTauriRuntime()
          ? '[TAURI IPC] CapCut Quick-Pack ZIP exported with Director Sheet'
          : '[SANDBOX MODE] CapCut Quick-Pack exported — Tauri IPC ready for Windows .exe'
      );
      try { audioEngine.playShutterClick(); } catch {}
    } catch (err: any) {
      showCockpitStatus(`[ PACK ERROR ]: ${err?.message || 'Bundle creation failed'}`);
    }
  }, [allCockpitShots, audioTrackInfo, showCockpitStatus]);

  const handleHotReloadShot = useCallback((shotIdx: number, newMediaUrl: string) => {
    customMediaImagesRef.current.delete(shotIdx);
    mediaSourceCacheRef.current.delete(newMediaUrl);

    const img = new Image();
    img.src = newMediaUrl;
    customMediaImagesRef.current.set(shotIdx, img);

    setCustomMedia(prev => ({
      ...prev,
      [shotIdx]: {
        url: newMediaUrl,
        videoSrc: newMediaUrl,
        blobUrl: newMediaUrl,
        isVideo: false,
        name: `shot_${String(shotIdx + 1).padStart(2, '0')}_master.png`
      }
    }));

    if (shotIdx === activeShotIndexRef.current) {
      switchShotMedia(newMediaUrl, trimPointsRef.current[shotIdx]?.in || 0);
    }

    showCockpitStatus(`[ HOT-RELOAD // SHOT ${String(shotIdx + 1).padStart(2, '0')} REPAINTED WITHOUT RESET ]`);
  }, [switchShotMedia, showCockpitStatus]);

  // Listen to StageHeader Cockpit HUD action triggers
  useEffect(() => {
    const unsubAction = eventBus.on<{ type?: string }>('cockpit:action', (payload) => {
      if (!payload?.type) return;
      if (payload.type === 'nle_xml') handleExportNleSequence();
      else if (payload.type === 'capcut_pack') handleExportCapCutBundle();
      else if (payload.type === 'freeze_all') handleFreezeAllFrames();
      else if (payload.type === 'open_modal') {
        setCockpitModalTab('interchange');
        setIsCockpitOpen(true);
      }
    });
    return () => unsubAction();
  }, [handleExportNleSequence, handleExportCapCutBundle, handleFreezeAllFrames]);

  // Register Tauri file-system hot-reload watcher for external Photoshop/Illustrator saves
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    registerTauriFrameWatcher((payload) => {
      const match = payload.filePath.match(/shot_(\d+)/i);
      const parsedNum = payload.shotNumber ?? (match ? parseInt(match[1], 10) : activeShotIndexRef.current + 1);
      const targetIdx = Math.max(0, Math.min(SHOWCASE_PRESETS.length - 1, parsedNum - 1));
      const convertFileSrc = (window as any).__TAURI__?.tauri?.convertFileSrc || (window as any).__TAURI__?.core?.convertFileSrc;
      const assetUrl = typeof convertFileSrc === 'function'
        ? `${convertFileSrc(payload.filePath)}?t=${Date.now()}`
        : payload.filePath;
      handleHotReloadShot(targetIdx, assetUrl);
    }).then((fn) => {
      unlistenFn = fn;
    });
    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [handleHotReloadShot]);

  // Close floating Dispatch HUD on outside click or window scroll
  useEffect(() => {
    if (!dispatchHudAnchor) return;
    const closeHud = () => {
      setDispatchHudAnchor(null);
      setActiveDispatchFlyoutIdx(null);
    };
    window.addEventListener('mousedown', closeHud);
    window.addEventListener('scroll', closeHud, true);
    return () => {
      window.removeEventListener('mousedown', closeHud);
      window.removeEventListener('scroll', closeHud, true);
    };
  }, [dispatchHudAnchor]);

  // ─────────────────────────────────────────────────────────────
  // 9. Ultra-Fast Keyboard Workflow (with 'M' Mode Toggle & Cockpit Accelerators)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Keyboard Accelerators: Module 5
      // Ctrl + Shift + P: Dispatches active shot to Photoshop
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handleDispatchToTool('photoshop');
        return;
      }

      // Ctrl + Shift + X: Instantly triggers the NLE XML export
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        handleExportNleSequence();
        return;
      }

      // Ctrl + Shift + C: Triggers CapCut quick-pack generation
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleExportCapCutBundle();
        return;
      }

      // Shift + S: Instant lossless PNG frame capture & dispatch
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleCaptureCurrentFrame();
        return;
      }

      // M: Instant Dual-Mode Toggle between Desktop 2.39:1 Cinema & Mobile 9:16 Reel
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setViewMode(prev => (prev === 'desktop' ? 'mobile' : 'desktop'));
        try { audioEngine.playShutterClick(); } catch {}
        return;
      }

      // Space: Instant zero-latency Play / Pause toggle
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleTogglePlay();
        return;
      }

      // J: Shuttle Rewind
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handleStepFrame(false);
        setPlaybackSpeed(prev => Math.max(0.5, prev > 1 ? prev - 0.5 : 0.5));
        return;
      }

      // K: Shuttle Pause
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setIsPlaying(false);
        isPlayingRef.current = false;
        try { masterVideoRef.current?.pause(); } catch {}
        try { masterAudioRef.current?.pause(); } catch {}
        try { audioEngine.pauseAudio(); } catch {}
        return;
      }

      // L: Shuttle Forward
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setIsPlaying(true);
        isPlayingRef.current = true;
        setPlaybackSpeed(prev => (prev >= 2.0 ? 1.0 : prev + 0.5));
        try { masterVideoRef.current?.play(); } catch {}
        try { masterAudioRef.current?.play(); } catch {}
        try { audioEngine.playAudio(); } catch {}
        return;
      }

      // Left Arrow: Step -1 Frame
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStepFrame(false);
        return;
      }

      // Right Arrow: Step +1 Frame
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleStepFrame(true);
        return;
      }

      // 1 through 9: Direct camera punch-in / active shot selection
      if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        e.preventDefault();
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= SHOWCASE_PRESETS.length) {
          selectShot(num - 1);
        }
        setActiveCameraAngle(num);
        try { audioEngine.playShutterClick(); } catch {}
        return;
      }

      // F: Toggle Fullscreen
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
        return;
      }

      // L: Toggle Lighting Rig Drawer
      if ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsLightDrawerOpen(prev => !prev);
        try { audioEngine.playShutterClick(); } catch {}
        return;
      }

      // W: Toggle 09 Photo Edit & Bulk Resizer Suite Modal
      if ((e.key === 'w' || e.key === 'W') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsPhotoModalOpen(prev => !prev);
        try { audioEngine.playShutterClick(); } catch {}
        return;
      }

      // Escape: Instantly close open modals & overlays
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsCockpitOpen(false);
        setIsLightDrawerOpen(false);
        setIsPhotoModalOpen(false);
        setActiveDispatchFlyoutIdx(null);
        setDispatchHudAnchor(null);
        setIsVaultDrawerOpen(false);
        setIsEditingTitle(false);
        setIsOptionsDrawerOpen(false);
        setIsStatsTelemetryOpen(false);
        setIsMultiCamExpanded(false);
        setOpenFaqIndex(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleStepFrame, selectShot, handleDispatchToTool, handleExportNleSequence, handleExportCapCutBundle, handleCaptureCurrentFrame]);

  // ─────────────────────────────────────────────────────────────
  // 9. Mandate 5: Non-Blocking Canvas Export & Recording Pipeline
  // ─────────────────────────────────────────────────────────────
  const handleQuickExportCurrentShot = useCallback(async () => {
    if (exportState.isExporting) return;
    setExportState({
      isExporting: true,
      progress: 0,
      statusText: '[ EXPORTING: 0% // INITIALIZING SCOPE RENDER ]'
    });

    try {
      const isVerticalExport = viewMode === 'mobile' || selectedAspectRatio === '9:16';
      const exportWidth = isVerticalExport ? 1080 : 1920;
      const exportHeight = isVerticalExport ? 1920 : 804;
      const totalFrames = Math.max(24, Math.floor(activeShot.durationSec * 24));
      const canvas = document.createElement('canvas');
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      if (!ctx) throw new Error('Could not get accelerated 2D canvas context');

      const stream = canvas.captureStream(24);
      const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const chunks: Blob[] = [];
      let recorder: MediaRecorder | null = null;
      if (typeof MediaRecorder !== 'undefined') {
        recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 18_000_000 // 18 Mbps high quality
        });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.start(100);
      }

      const video = masterVideoRef.current;
      const activeMedia = getMediaForShot(activeShotIndex);
      const isVideoMedia = Boolean(activeMedia?.isVideo && video?.src);
      const activeLightId = currentLightsRef.current[activeShotIndex] ?? activeShot.lightId;
      const lightPreset = getLightingPresetById(activeLightId);

      // Frame-by-frame asynchronous generation (yields to UI via rAF)
      for (let f = 0; f < totalFrames; f++) {
        await new Promise(r => requestAnimationFrame(r));

        if (lightPreset) {
          ctx.save();
          ctx.filter = lightPreset.filter;
        }

        if (isVideoMedia && video && video.readyState >= 2) {
          drawCover(ctx, video, canvas.width, canvas.height);
        } else if (customMediaImagesRef.current.has(activeShotIndex)) {
          const img = customMediaImagesRef.current.get(activeShotIndex)!;
          drawCover(ctx, img, canvas.width, canvas.height);
        } else {
          drawCleanSlateToCanvas(ctx, canvas.width, canvas.height, activeShot);
        }

        if (lightPreset) {
          ctx.restore();
          ctx.save();
          ctx.globalCompositeOperation = lightPreset.blendMode;
          try {
            lightPreset.renderOverlay(ctx, canvas.width, canvas.height, (f / 24) * 1000);
          } catch {}
          ctx.restore();
        }

        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';

        // Draw creative kinetic typography layer if active
        if (titlesLayerActive && offscreenTitleCanvasRef.current) {
          ctx.drawImage(offscreenTitleCanvasRef.current, 0, 0, canvas.width, canvas.height);
        }

        const pct = Math.round(((f + 1) / totalFrames) * 100);
        setExportState({
          isExporting: true,
          progress: pct,
          statusText: `[ EXPORTING: ${pct}% // FRAME ${f + 1}/${totalFrames} ]`
        });
      }

      if (recorder) {
        const stopPromise = new Promise<Blob>((resolve) => {
          recorder!.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
        });
        recorder.stop();
        const finalBlob = await stopPromise;

        const downloadUrl = URL.createObjectURL(finalBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = isVerticalExport
          ? `HANDFILM_SHOT_${activeShot.shotNumber}_REEL_9_16.webm`
          : `HANDFILM_SHOT_${activeShot.shotNumber}_2.39_SCOPE.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
      }

      try { audioEngine.playShutterClick(); } catch {}
    } catch (err) {
      console.error('[HandfilmHome] Quick Export Error:', err);
    } finally {
      setExportState({
        isExporting: false,
        progress: 100,
        statusText: '[ EXPORT COMPLETE // SAVED ]'
      });
      setTimeout(() => {
        setExportState({ isExporting: false, progress: 0, statusText: '' });
      }, 3500);
    }
  }, [exportState.isExporting, activeShot, titlesLayerActive, viewMode, selectedAspectRatio, getMediaForShot, activeShotIndex, drawCover, drawCleanSlateToCanvas]);

  // ─────────────────────────────────────────────────────────────
  // 5. Scroll smoothly to Specs / Matrix section
  // ─────────────────────────────────────────────────────────────
  const handleScrollToSpecs = () => {
    const el = document.getElementById('feature-matrix-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
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
    <div className={`flex-1 w-full h-full overflow-y-auto overflow-x-hidden bg-[#070709] text-white font-sans selection:bg-[#E50914] selection:text-white pb-16 ${isZenModeActive ? 'zen-distraction-free' : ''}`}>
      
      {/* ========================================================= */}
      {/* IMMORTAL HARDWARE PLAYBACK ENGINE (NEVER DESTROY DECODER) */}
      {/* Mounted permanently at root level; never unmounted or reloaded */}
      {/* ========================================================= */}
      <video
        ref={masterVideoRef}
        playsInline
        muted
        preload="auto"
        className="hidden"
        style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
      <audio
        ref={masterAudioRef}
        preload="auto"
        className="hidden"
        style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />

      {/* ========================================================= */}
      {/* LEFT TOOL RAIL (PINNED DOCK FOR STUDIO INSTRUMENTS)       */}
      {/* ========================================================= */}
      <aside 
        aria-label="Studio Instruments Rail"
        className="fixed left-0 top-20 bottom-0 w-12 z-40 bg-neutral-950/95 border-r border-neutral-800/80 flex flex-col items-center py-4 gap-3 backdrop-blur-md select-none hidden sm:flex"
      >
        {/* [ 💡 LIGHT ] Trigger Button on Left Tool Rail */}
        <button
          type="button"
          onClick={() => setIsLightDrawerOpen(prev => !prev)}
          className={`w-10 h-12 rounded-lg flex flex-col items-center justify-center font-mono transition-all cursor-pointer border group relative ${
            isLightDrawerOpen || activeShotLightId
              ? 'bg-neutral-900 border-amber-400 text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.45)]'
              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
          }`}
          title="Lighting Rig [34 Presets] (Hotkey: L)"
        >
          <span className="text-base leading-none">💡</span>
          <span className="text-[8.5px] font-bold tracking-tight mt-0.5">LIGHT</span>
          {activeShotLightId && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
          )}
        </button>

        {/* [ 🎨 PHOTO ] Suite Trigger Button (09 PHOTO EDIT & BULK RESIZER SUITE) */}
        <button
          type="button"
          onClick={() => setIsPhotoModalOpen(true)}
          className={`w-10 h-12 rounded-lg flex flex-col items-center justify-center font-mono transition-all cursor-pointer border group relative ${
            isPhotoModalOpen
              ? 'bg-neutral-900 border-[#fbbf24] text-[#fbbf24] shadow-[0_0_14px_rgba(251,191,36,0.45)]'
              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
          }`}
          title="09 Photo Edit & Bulk Resizer Suite (Hotkey: W)"
        >
          <span className="text-base leading-none">🎨</span>
          <span className="text-[8.5px] font-bold tracking-tight mt-0.5">PHOTO</span>
        </button>
      </aside>

      {/* ========================================================= */}
      {/* 34-PRESET CINEMATIC LIGHTING ENGINE DRAWER                */}
      {/* ========================================================= */}
      {isLightDrawerOpen && (
        <aside 
          aria-label="Lighting Rig Drawer"
          className="fixed inset-y-0 left-0 sm:left-12 top-20 bottom-0 z-50 w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 select-none"
        >
          {/* Top Bar: Title LIGHT RIG [34] + [ CLEAR ] button */}
          <div className="h-12 px-3 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between shrink-0 font-mono">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-amber-400 text-sm">💡</span>
              <span className="text-[11px] font-bold tracking-wider text-white truncate">
                LIGHT RIG [34]
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleClearLight}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-900 border border-neutral-800 hover:border-red-400 text-neutral-400 hover:text-red-300 transition-colors cursor-pointer"
                title="Clear active shot lighting (sets lightId = null)"
              >
                [ CLEAR ]
              </button>
              <button
                type="button"
                onClick={() => setIsLightDrawerOpen(false)}
                className="w-6 h-6 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-900 text-xs cursor-pointer"
                title="Close Drawer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filter Tabs: ALL, ATMO, GOBO, TONE, STUDIO */}
          <div className="p-2 border-b border-neutral-800/80 bg-neutral-950/80 flex items-center gap-1 overflow-x-auto shrink-0 scrollbar-none font-mono">
            {(['ALL', 'ATMO', 'GOBO', 'TONE', 'STUDIO'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setLightFilterTab(tab)}
                className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider transition-colors cursor-pointer shrink-0 ${
                  lightFilterTab === tab
                    ? 'bg-amber-400 text-black shadow-sm'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Preset List: Scrollable 2-column grid of compact mono buttons */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-neutral-800">
            <div className="grid grid-cols-2 gap-1.5">
              {filteredLightingPresets.map(preset => {
                const isActive = activeShotLightId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectLightPreset(preset.id)}
                    className={`p-1.5 rounded-lg border text-[11px] font-mono font-semibold text-left transition-all cursor-pointer flex flex-col justify-between min-h-[50px] ${
                      isActive
                        ? 'border-amber-400 text-amber-300 bg-neutral-900 shadow-[0_0_10px_rgba(251,191,36,0.25)]'
                        : 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 bg-neutral-950'
                    }`}
                    title={`${preset.name} (${preset.category})`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="truncate leading-tight text-[11px] font-mono">{preset.name}</span>
                      {isActive && <span className="text-[10px] text-amber-400 shrink-0">●</span>}
                    </div>
                    <span className="text-[8px] uppercase tracking-wider text-neutral-500 font-normal">
                      {preset.category === 'ATMOSPHERE' ? 'ATMO' : preset.category === 'OPTICAL' ? 'GOBO' : preset.category === 'EXPOSURE' ? 'TONE' : 'STUDIO'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sticky Bottom Footer: Prominent full-width button */}
          <div className="p-2.5 bg-neutral-950 border-t border-neutral-800 shrink-0">
            <button
              type="button"
              onClick={() => handleApplyLightToAllShots()}
              className="w-full py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-mono text-[11px] font-black tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(245,166,35,0.35)] transition-all"
              title="Apply current shot's lighting rig to all shots in timeline"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>[ ⚡ APPLY TO ALL SHOTS ]</span>
            </button>
          </div>
        </aside>
      )}

      {/* Floating Visual Confirmation Toast */}
      {showLightToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-black px-4 py-2 rounded-lg font-mono text-xs font-black tracking-wider shadow-[0_0_25px_rgba(251,191,36,0.7)] flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
          <Zap className="w-4 h-4 fill-black" />
          <span>APPLIED TO ALL SHOTS</span>
        </div>
      )}

      {viewMode === 'mobile' ? (
        /* ========================================================= */
        /* DEDICATED MOBILE REEL 9:16 STUDIO CONTAINER               */
        /* ========================================================= */
        <div className="w-full min-h-[calc(100vh-64px)] flex items-center justify-center p-1 sm:p-4">
          <div className="max-w-[440px] w-full h-[88vh] max-h-[860px] min-h-[580px] flex flex-col bg-[#050505] border border-neutral-800/60 shadow-2xl rounded-2xl overflow-hidden select-none">
            {/* SECTION A: TOP TELEMETRY STRIP (Height: 44px) */}
            <div className="h-11 px-3 border-b border-neutral-800/80 bg-neutral-950/90 flex items-center justify-between font-mono shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono tracking-widest text-amber-500/80 font-bold">
                  [ REEL_V1 // 9:16 ]
                </span>
                {isReelTemplateActive && (
                  <span className="text-[8.5px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                    15S REEL
                  </span>
                )}
              </div>
              <div className="text-xs font-mono font-bold text-white tabular-nums tracking-wider">
                <span ref={mobileTimecodeRef}>
                  00:00 / {activeShot.durationSec.toFixed(1)}s
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsLightDrawerOpen(prev => !prev)}
                  className={`text-[9.5px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                    activeShotLightId
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                  title="Lighting Rig [34 Presets] (Hotkey: L)"
                >
                  <span>💡</span>
                  <span>LIGHT</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCockpitModalTab('bridges');
                    setIsCockpitOpen(true);
                  }}
                  className="bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-[9.5px] text-amber-400 font-mono tracking-wider px-2 py-0.5 rounded cursor-pointer flex items-center gap-1 transition-colors"
                  title="Director's Cockpit Hub (Hotkeys: Ctrl+Shift+P / X / C)"
                >
                  <Sliders className="w-2.5 h-2.5" />
                  <span>COCKPIT</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSafeAreas(prev => !prev)}
                  className={`text-[9.5px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    showSafeAreas
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                  title="Toggle TikTok / Reels Safe-Area Guides"
                >
                  ⛶ SAFE
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('desktop');
                    try { audioEngine.playShutterClick(); } catch {}
                  }}
                  className="bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-[10px] text-neutral-300 font-mono tracking-wider px-2.5 py-1 rounded-full cursor-pointer flex items-center gap-1 transition-colors"
                  title="Switch to 2.39:1 Cinema Console (Hotkey: M)"
                >
                  <span>🖥️ CINEMA</span>
                </button>
              </div>
            </div>

            {/* SECTION B: DOMINANT 9:16 STAGE VIEWPORT (Height: ~58%) */}
            <div 
              className="w-full flex-1 flex items-center justify-center p-2 relative bg-black overflow-hidden"
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOverStage(true); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (!isDraggingOverStage) setIsDraggingOverStage(true); }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setIsDraggingOverStage(false);
              }}
              onDrop={(e) => handleDrop(e, activeShotIndex)}
            >
              <div className="aspect-[9/16] h-full max-h-full max-w-full border border-neutral-800 rounded-lg overflow-hidden relative shadow-inner flex items-center justify-center bg-black">
                {/* Active Canvas: renders 9:16 composite (Video + LUT/Grain + Typography + Safe Areas) */}
                <canvas
                  ref={stageCanvasRef}
                  className="w-full h-full object-cover"
                />

                {/* Drag & Drop Overlay */}
                {isDraggingOverStage && (
                  <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md border-2 border-dashed border-[#F5A623] flex flex-col items-center justify-center pointer-events-none p-4 text-center">
                    <HardDrive className="w-10 h-10 text-[#F5A623] animate-bounce mb-2" />
                    <span className="text-xs font-mono font-black text-[#F5A623] tracking-widest uppercase">
                      DROP MEDIA HERE
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 mt-1">
                      AUTO-ASSIGN TO SHOT {activeShot.shotNumber}
                    </span>
                  </div>
                )}

                {/* Top Shot Tag Pill in Viewport */}
                <div className="absolute top-2 left-2 z-20 pointer-events-none flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-black/75 border border-white/20 text-white font-mono text-[9px] font-bold">
                    SHOT {activeShot.shotNumber} / {SHOWCASE_PRESETS.length}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[8.5px] font-bold">
                    {activeShotPersonality}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION C: THUMB-ZONE CONTROL PANEL (Height: ~42%) */}
            <div className="border-t border-neutral-800/80 bg-[#08080c] flex flex-col shrink-0">
              {/* Audio Floor Strip if active */}
              {audioTrackInfo && (
                <div className="h-6 px-3 bg-cyan-950/40 border-b border-cyan-500/30 flex items-center justify-between text-[10px] font-mono text-cyan-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <Music className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">{audioTrackInfo.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (masterAudioRef.current) {
                        masterAudioRef.current.pause();
                        masterAudioRef.current.removeAttribute('src');
                      }
                      setAudioTrackInfo(null);
                    }}
                    className="text-zinc-500 hover:text-white ml-2 text-[9px]"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* SUB-BAR 1: Precision Scrubber & Beat Snap (Height: 36px) */}
              <div className="h-9 px-3 flex items-center gap-2 border-b border-neutral-800/50">
                <div 
                  ref={scrubberTrackRef}
                  onPointerDown={handleScrubPointerDown}
                  className="flex-1 h-3 bg-neutral-900 border border-neutral-700/80 rounded-full relative cursor-ew-resize overflow-hidden"
                >
                  <div 
                    ref={mobilePlayheadRef}
                    className="absolute top-0 bottom-0 w-2 -ml-1 bg-amber-400 rounded-full shadow-[0_0_8px_#fbbf24]"
                    style={{ left: '0%' }}
                  />
                  {/* Shot division tick marks */}
                  <div className="absolute inset-0 flex justify-between pointer-events-none opacity-30">
                    {SHOWCASE_PRESETS.map((_, i) => (
                      <div key={i} className="w-[1px] h-full bg-white/40" />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSnapToBeat(prev => !prev)}
                  className={`h-6 px-2 rounded font-mono text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                    isSnapToBeat
                      ? 'bg-cyan-950/80 border border-cyan-400 text-cyan-300'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                  title="Snap cuts to audio beats"
                >
                  <Music className="w-2.5 h-2.5 text-cyan-400" />
                  <span>SNAP</span>
                </button>
              </div>

              {/* SUB-BAR 2: Snap-Scroll 14-Shot Card Strip */}
              <div
                onWheel={(e) => {
                  if (e.deltaY !== 0) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
                className="px-3 py-1.5 flex items-center gap-2.5 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar"
              >
                {SHOWCASE_PRESETS.map((shot, idx) => {
                  const isActive = idx === activeShotIndex;
                  const shotMedia = customMedia[idx];
                  const displayImg = shotMedia?.thumbnailUrl || shotMedia?.url || shot.imageUrl;
                  const personality = getShotTitlePersonality(idx, customTitleStyles[idx]);
                  const trim = trimPoints[idx] || { in: 0, out: 12.0 };
                  const dur = Math.max(0.1, trim.out - trim.in);

                  return (
                    <div
                      key={shot.id}
                      data-shot-card="true"
                      onClick={() => {
                        selectShot(idx);
                        try { audioEngine.playShutterClick(); } catch {}
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDispatchHudAnchor({ idx, left: rect.left + rect.width / 2, top: rect.top });
                      }}
                      className={`group min-w-[112px] w-[112px] h-[64px] flex-shrink-0 relative rounded-lg overflow-hidden cursor-pointer snap-start transition-all duration-150 ${
                        isActive
                          ? 'border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] scale-[1.02] z-10'
                          : 'border border-neutral-800/90 opacity-80 hover:opacity-100 hover:border-neutral-600 bg-neutral-950'
                      }`}
                    >
                      {displayImg ? (
                        <div 
                          className="w-full h-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${displayImg})` }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-950 to-black flex items-center justify-center">
                          <span className="text-[8px] font-mono text-neutral-500">+ MEDIA</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

                      {/* Shot Tag & Style (spaced left of top-right ⚡ trigger) */}
                      <div className="absolute top-1 left-1 right-7 flex items-center justify-between text-[7.5px] font-mono pointer-events-none">
                        <span className={`px-1 rounded font-bold ${isActive ? 'bg-amber-400 text-black' : 'bg-black/70 text-white'}`}>
                          {shot.shotNumber}
                        </span>
                        <span className="px-1 rounded bg-black/60 text-zinc-400 font-bold">
                          {personality === 'DOPAMINE' ? 'DPM' : personality === 'MINIMAL' ? 'MIN' : personality === 'B2B' ? 'B2B' : 'KIN'}
                        </span>
                      </div>

                      {/* Top-Right Always-Subtle Corner Micro-Trigger (20px x 20px) */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          const cardEl = e.currentTarget.closest('[data-shot-card="true"]') as HTMLElement | null;
                          const rect = (cardEl || e.currentTarget).getBoundingClientRect();
                          setDispatchHudAnchor(prev =>
                            prev?.idx === idx ? null : { idx, left: rect.left + rect.width / 2, top: rect.top }
                          );
                        }}
                        className="opacity-85 hover:opacity-100 absolute top-1 right-1 z-30 bg-black/90 border border-amber-400/80 hover:bg-amber-400 hover:text-black text-amber-300 w-5 h-5 flex items-center justify-center rounded-sm text-[10px] leading-none cursor-pointer shadow transition-all"
                        aria-label={`Dispatch Shot ${shot.shotNumber} to External Pipeline`}
                      >
                        ⚡
                      </button>

                      {/* Duration Badge */}
                      <div className="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-[7.5px] font-mono text-amber-300 font-bold pointer-events-none">
                        {dur.toFixed(1)}s
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SUB-BAR 3: Rapid Action Hub (Height: 64px) */}
              <div className="h-16 px-3 flex items-center justify-between gap-2 border-t border-neutral-800/60">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStepFrame(false)}
                    className="h-8 px-2 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-[10px] font-mono font-bold cursor-pointer"
                    title="Step -1 Frame"
                  >
                    -1F
                  </button>

                  {/* Big Play / Pause */}
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-transform active:scale-90 cursor-pointer shadow-lg ${
                      isPlaying
                        ? 'bg-amber-500 text-black shadow-[0_0_16px_rgba(245,166,35,0.7)]'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_16px_rgba(220,38,38,0.7)]'
                    }`}
                    title="Play / Pause (Space)"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStepFrame(true)}
                    className="h-8 px-2 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-[10px] font-mono font-bold cursor-pointer"
                    title="Step +1 Frame"
                  >
                    +1F
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Quick Reel 15S Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleReelTemplate}
                    className={`h-8 px-2.5 rounded-lg border font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                      isReelTemplateActive
                        ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,166,35,0.5)]'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    title="Auto-slot 14 shots with 15-second TikTok/Reel timing"
                  >
                    <span>⚡ 15S</span>
                  </button>

                  {/* Media Ingest */}
                  <button
                    type="button"
                    onClick={() => vaultFileInputRef.current?.click()}
                    className="h-8 px-2.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-amber-400 text-amber-400 font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Ingest Media"
                  >
                    <HardDrive className="w-3 h-3" />
                    <span>+ MEDIA</span>
                  </button>

                  {/* Export 9:16 */}
                  <button
                    type="button"
                    onClick={handleQuickExportCurrentShot}
                    disabled={exportState.isExporting}
                    className={`h-8 px-2.5 rounded-lg font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                      exportState.isExporting
                        ? 'bg-amber-500/30 border border-amber-400 text-amber-300 animate-pulse'
                        : 'bg-amber-500 text-black hover:bg-amber-400 shadow-md active:scale-95'
                    }`}
                    title="Export 9:16 Vertical Video"
                  >
                    <Download className="w-3 h-3" />
                    <span>{exportState.isExporting ? `${exportState.progress}%` : 'EXPORT'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* FULL DESKTOP 2.39:1 WORKSTATION CONSOLE (PRESERVED)       */
        /* ========================================================= */
        <>
          {/* ========================================================= */}
          {/* ENGINE TELEMETRY OVERLAY (STATS BUTTON TOGGLE) */}
          {/* ========================================================= */}
          {isStatsTelemetryOpen && (
            <div className="w-full bg-[#0d0d14] border-b border-amber-500/30 px-6 py-3 font-mono text-xs flex flex-wrap items-center justify-between gap-4 text-zinc-300 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 uppercase">GPU VRAM:</span>
                  <span className="text-emerald-400 font-bold">1.84 GB / 8.00 GB (23%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 uppercase">DECODE FPS:</span>
                  <span className="text-[#F5A623] font-bold">24.000 FPS LOCKED (0 DROPPED)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 uppercase">PIPELINE:</span>
                  <span className="text-cyan-400 font-bold">W3C WEBCODECS HARDWARE MUXER</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStatsTelemetryOpen(false)}
                className="text-xs text-zinc-500 hover:text-white cursor-pointer"
              >
                ✕ CLOSE TELEMETRY
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 2: CLEAN RENDER VIEWPORT (ZERO LOSS ARCHITECTURE) */}
          {/* Strictly NO non-creative UI text or player controls inside canvas */}
          {/* Raw video plate + Creative Kinetic Bangla Typography ONLY */}
          {/* ========================================================= */}
          <section className="relative w-full max-w-7xl mx-auto px-2 md:px-4 pt-1 pb-1">
            
            {/* Externalized Top Telemetry Shelf (OUTSIDE the render viewport) */}
            <div className="flex items-center justify-between py-1 px-1 text-xs font-mono text-zinc-400 border-b border-white/10 mb-1">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.2 rounded bg-[#e50914]/20 border border-[#e50914]/50 text-[#e50914] font-black text-[9px] tracking-wider uppercase">
                  SHOT {activeShot.shotNumber} / {String(SHOWCASE_PRESETS.length).padStart(2, '0')}
                </span>
                <span className="text-white font-bold tracking-wider text-xs">
                  {activeShot.titleEn}
                </span>
                <span className="text-zinc-500 hidden sm:inline text-[10px]">
                  // {activeShot.lensSpec}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* 34-Preset Cinematic Lighting Rig Trigger [ 💡 LIGHTS ] Pill Button */}
                <button
                  type="button"
                  onClick={() => setIsLightDrawerOpen(prev => !prev)}
                  className={`border text-[11px] font-mono tracking-wider px-3 py-1 rounded-full cursor-pointer flex items-center gap-1.5 transition-all shadow-sm ${
                    isLightDrawerOpen || activeShotLightId
                      ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.5)] font-bold'
                      : 'bg-neutral-900 border-amber-400/50 text-amber-300 hover:bg-neutral-800 hover:border-amber-400'
                  }`}
                  title="34-Preset Cinematic Lighting Rig (Hotkey: L)"
                >
                  <span className="text-sm leading-none">💡</span>
                  <span className="font-extrabold tracking-wide">LIGHTS</span>
                  {activeShotLightId && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isLightDrawerOpen ? 'bg-black' : 'bg-amber-400'} animate-pulse`} />
                  )}
                </button>

                {/* Director's Cockpit Pipeline Hub Cluster */}
                <button
                  type="button"
                  onClick={() => {
                    setCockpitModalTab('bridges');
                    setIsCockpitOpen(true);
                  }}
                  className="bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-[11px] text-amber-300 hover:text-white font-mono tracking-wider px-2.5 py-1 rounded-full cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Open Director's Cockpit (Hotkeys: Ctrl+Shift+P / X / C)"
                >
                  <Sliders className="w-3 h-3 text-amber-400" />
                  <span>🛠️ COCKPIT</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportNleSequence}
                  className="bg-neutral-900 border border-neutral-700 hover:border-emerald-400 text-[11px] text-neutral-300 hover:text-white font-mono tracking-wider px-2.5 py-1 rounded-full cursor-pointer items-center gap-1.5 transition-colors shadow-sm hidden sm:flex"
                  title="Export Universal FCPXML v1.9 Sequence (Hotkey: Ctrl+Shift+X)"
                >
                  <Film className="w-3 h-3 text-emerald-400" />
                  <span>📤 NLE XML</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCapCutBundle}
                  className="bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-[11px] text-neutral-300 hover:text-white font-mono tracking-wider px-2.5 py-1 rounded-full cursor-pointer items-center gap-1.5 transition-colors shadow-sm hidden md:flex"
                  title="Export CapCut Quick-Pack ZIP with Manifest & Captions (Hotkey: Ctrl+Shift+C)"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>⚡ CC PACK</span>
                </button>

                {/* Quick Reel 15S Toggle */}
                <button
                  type="button"
                  onClick={handleToggleReelTemplate}
                  className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                    isReelTemplateActive
                      ? 'bg-amber-500 text-black border border-amber-400 shadow-[0_0_10px_rgba(245,166,35,0.6)]'
                      : 'bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-neutral-300'
                  }`}
                  title="Toggle 15s Quick Reel Template: 14 shots auto-timed to 15s total"
                >
                  <span>⚡ QUICK REEL 15S</span>
                  {isReelTemplateActive && <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />}
                </button>

                {/* Mode Switcher Pill */}
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('mobile');
                    try { audioEngine.playShutterClick(); } catch {}
                  }}
                  className="bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-xs text-neutral-300 font-mono tracking-wider px-3 py-1 rounded-full cursor-pointer flex items-center gap-1.5 transition-colors"
                  title="Switch to 9:16 Mobile Reel Studio (Hotkey: M)"
                >
                  <span>📱 REEL 9:16</span>
                </button>

                <span className="text-[#F5A623] font-bold text-[9px] tracking-widest uppercase hidden md:inline">
                  {activeShot.lutFilter}
                </span>
                {activeShotLightId && (
                  <>
                    <span className="text-zinc-600 hidden md:inline">|</span>
                    <span className="text-amber-400 font-bold text-[9px] tracking-widest uppercase hidden md:inline">
                      💡 {getLightingPresetById(activeShotLightId)?.name}
                    </span>
                  </>
                )}
                <span className="text-zinc-600 hidden md:inline">|</span>
                <span className="text-emerald-400 font-bold text-[9px] hidden sm:inline">
                  24.000 FPS RAW LOCKED
                </span>
              </div>
            </div>

            {/* Instant Zero-Wait Ingest Status HUD Banner */}
            {ingestStatus && (
              <div className="w-full bg-[#0a120e] border border-emerald-500/60 rounded-xl px-4 py-2 mb-3 flex items-center justify-between font-mono text-xs shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-400 font-black tracking-wider text-sm">{ingestStatus}</span>
                  <span className="text-zinc-400 text-[11px] hidden sm:inline">// ZERO-WAIT INGESTION ACTIVE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold">
                    AUTO-ASSIGNED TO SHOT {activeShot.shotNumber}
                  </span>
                </div>
              </div>
            )}

            {/* Mandate 5: Isolated Asynchronous Export Telemetry Banner */}
            {exportState.isExporting && (
              <div className="w-full bg-[#140e06] border border-amber-500/70 rounded-xl px-4 py-2 mb-3 flex items-center justify-between font-mono text-xs shadow-[0_0_25px_rgba(245,166,35,0.25)] animate-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-amber-400 font-black tracking-wider text-sm">{exportState.statusText}</span>
                  <span className="text-zinc-400 text-[11px] hidden sm:inline">// NON-BLOCKING CANVAS EXPORT ACTIVE</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 sm:w-32 h-2 bg-black/70 rounded-full border border-amber-500/40 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-[#F5A623] transition-all duration-100"
                      style={{ width: `${exportState.progress}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-amber-300 font-bold tabular-nums">
                    {exportState.progress}%
                  </span>
                </div>
              </div>
            )}

            {/* 2.39:1 / Aspect-Responsive Clean Render Viewport Canvas */}
            <div 
              className="relative w-full rounded-2xl overflow-hidden bg-black border border-[#232330] shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex items-center justify-center transition-all duration-300"
              style={{
                aspectRatio: selectedAspectRatio === '2.39:1' ? '2.39 / 1' : selectedAspectRatio === '16:9' ? '16 / 9' : selectedAspectRatio === '9:16' ? '9 / 16' : selectedAspectRatio === '4:3' ? '4 / 3' : '1 / 1',
                maxHeight: '74vh'
              }}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOverStage(true); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (!isDraggingOverStage) setIsDraggingOverStage(true); }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setIsDraggingOverStage(false);
              }}
              onDrop={(e) => handleDrop(e, activeShotIndex)}
            >
              {/* Viewport Drag & Drop Overlay */}
              {isDraggingOverStage && (
                <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md border-2 border-dashed border-[#F5A623] flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
                  <HardDrive className="w-12 h-12 text-[#F5A623] animate-bounce mb-2" />
                  <span className="text-base font-mono font-black text-[#F5A623] tracking-widest uppercase">
                    [ DROP 4K MEDIA HERE // AUTO-ASSIGN TO SHOT {activeShot.shotNumber} ]
                  </span>
                  <span className="text-xs font-mono text-zinc-400 mt-1">
                    ZERO-WAIT BLOB PIPELINE • .MP4, .MOV, .PNG, .JPG
                  </span>
                </div>
              )}

              {/* Zoom Transform Wrapper */}
              <div 
                className="w-full h-full relative flex items-center justify-center transition-transform duration-300 ease-out"
                style={{
                  transform: stageZoomLevel === '2.0x' ? 'scale(2.0)' : stageZoomLevel === '1.5x' ? 'scale(1.5)' : 'scale(1.0)',
                  willChange: 'transform'
                }}
              >
                {/* Hardware-Accelerated Decoupled Master Stage Canvas */}
                <canvas
                  ref={stageCanvasRef}
                  className="w-full h-full object-contain z-10"
                />
              </div>
            </div>

            {/* Externalized Bottom Information Shelf (OUTSIDE the render viewport) */}
            <div className="flex items-center justify-between py-2 px-1 text-xs font-mono text-zinc-400 border-t border-white/10 mt-3">
              <p className="text-zinc-400 truncate max-w-xl">
                <span className="text-zinc-600 font-bold uppercase">LOGLINE:</span> {activeShot.tagline}
              </p>
              <span className="text-zinc-500 text-[11px] font-mono shrink-0">
                {activeShot.directorNotes}
              </span>
            </div>
          </section>

      {/* ========================================================= */}
      {/* CONSOLIDATED MASTER BOTTOM CONTROLS & TIMELINE DOCK */}
      {/* Tier 1: 6-Shot Master Timeline Presets (Shot Cards Carousel) */}
      {/* Tier 2: Unified Single-Tier Horizontal Bar (Height: 40px-42px) */}
      {/* Anchored above taskbar with bottom: 8px; margin-bottom: env(safe-area-inset-bottom, 0px); */}
      {/* ========================================================= */}
      <section 
        className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-8 my-2 sticky z-30"
        style={{ bottom: '8px', marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Tier 1: 6-Shot Interactive Timeline Strip */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
              14-SHOT MASTER TIMELINE PRESETS
            </span>
            <button
              type="button"
              onClick={() => setIsMultiCamExpanded(prev => !prev)}
              className="text-[10px] sm:text-[11px] font-mono font-bold text-[#F5A623] hover:text-[#FFE066] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{isMultiCamExpanded ? 'HIDE 9-CAM MATRIX' : 'EXPAND 9-CAM MATRIX'}</span>
            </button>
          </div>

          <div
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            className="flex flex-nowrap items-center overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar gap-2.5 px-3 py-1.5"
          >
            {SHOWCASE_PRESETS.map((shot, idx) => {
              const isActive = idx === activeShotIndex;
              const isTargetDrag = dragTargetShotIdx === idx;
              const shotMedia = customMedia[idx];
              const displayImg = shotMedia?.thumbnailUrl || shotMedia?.url || shot.imageUrl;
              const isShotVid = shotMedia?.isVideo || /\.(mp4|webm|mov|m4v|mkv|ogg)$/i.test(displayImg);
              const hasCardMedia = Boolean(displayImg);
              const cardPersonality = getShotTitlePersonality(idx, customTitleStyles[idx]);
              const trim = trimPoints[idx] || {
                in: 0,
                out: isReelTemplateActive ? REEL_TEMPLATE_DURATIONS[idx % REEL_TEMPLATE_DURATIONS.length] : 12.0
              };
              const dur = Math.max(0.1, trim.out - trim.in);
              const activeLight = customLights[idx] ? getLightingPresetById(customLights[idx]) : null;

              return (
                <div
                  key={shot.id}
                  data-shot-card="true"
                  onClick={() => {
                    selectShot(idx);
                    try { audioEngine.playShutterClick(); } catch {}
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDispatchHudAnchor({ idx, left: rect.left + rect.width / 2, top: rect.top });
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (dragTargetShotIdx !== idx) setDragTargetShotIdx(idx);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setDragTargetShotIdx(null);
                  }}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={`min-w-[112px] w-[112px] h-[64px] flex-shrink-0 snap-start relative rounded-lg cursor-pointer transition-all duration-150 group flex flex-col ${
                    isTargetDrag
                      ? 'border-2 border-[#00F0FF] ring-2 ring-[#00F0FF]/50 shadow-[0_0_20px_rgba(0,240,255,0.5)] scale-[1.03] z-20'
                      : isActive
                      ? 'border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] scale-[1.02] z-10'
                      : 'border border-neutral-800/90 opacity-80 hover:opacity-100 hover:border-neutral-600 bg-[#0d0d14]'
                  }`}
                >
                  {/* Clipped frame preview surface so dispatch HUD is never clipped */}
                  <div className="absolute inset-0 rounded-[6px] overflow-hidden">
                    {hasCardMedia ? (
                      <div
                        className="w-full h-full bg-cover bg-center transition-transform duration-200 group-hover:scale-105"
                        style={{
                          backgroundImage: `url(${displayImg})`,
                          backgroundColor: '#070709'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#0e1017] via-[#090a0f] to-[#050507] flex items-center justify-center p-1 relative">
                        <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-wider text-center">
                          + MEDIA
                        </span>
                      </div>
                    )}

                    {/* Scrim overlay for crisp contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/55 pointer-events-none" />
                  </div>

                  {/* Top Shot Metadata: #01 + Active Light / Format Badge (spaced left of top-right ⚡ trigger) */}
                  <div className="relative z-10 pl-1.5 pr-7 pt-1 flex items-center justify-between text-[9px] font-mono pointer-events-none">
                    <span className={`px-1 py-0.5 rounded leading-none font-black tabular-nums ${isActive ? 'bg-amber-400 text-black' : 'bg-black/80 text-white'}`}>
                      #{shot.shotNumber}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {activeLight && (
                        <span
                          className="px-1 py-0.5 rounded leading-none bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[8px] font-bold"
                          title={activeLight.name}
                        >
                          💡
                        </span>
                      )}
                      {isShotVid ? (
                        <span className="px-1 py-0.5 rounded leading-none bg-cyan-950/85 border border-cyan-500/40 text-cyan-300 text-[8px] font-bold">
                          4K
                        </span>
                      ) : (
                        <span className="px-1 py-0.5 rounded leading-none bg-black/75 text-zinc-300 text-[8px] font-bold">
                          {cardPersonality === 'DOPAMINE' ? 'DPM' : cardPersonality === 'MINIMAL' ? 'MIN' : cardPersonality === 'B2B' ? 'B2B' : 'KIN'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Top-Right Always-Subtle Corner Micro-Trigger (20px x 20px) */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const cardEl = e.currentTarget.closest('[data-shot-card="true"]') as HTMLElement | null;
                      const rect = (cardEl || e.currentTarget).getBoundingClientRect();
                      setDispatchHudAnchor(prev =>
                        prev?.idx === idx ? null : { idx, left: rect.left + rect.width / 2, top: rect.top }
                      );
                    }}
                    className="opacity-85 hover:opacity-100 absolute top-1 right-1 z-30 bg-black/90 border border-amber-400/80 hover:bg-amber-400 hover:text-black text-amber-300 w-5 h-5 flex items-center justify-center rounded-sm text-[10px] leading-none cursor-pointer shadow transition-all"
                    aria-label={`Dispatch Shot ${shot.shotNumber} to External Pipeline`}
                  >
                    ⚡
                  </button>

                  {/* Bottom Shot Metadata: Title Badge + Duration */}
                  <div className="relative z-10 mt-auto px-1.5 pb-1 flex items-end justify-between gap-1 font-mono">
                    <span className="text-[9.5px] font-bold text-white font-bangla truncate leading-none pointer-events-none drop-shadow min-w-0 flex-1">
                      {customTitles[idx]?.titleBn || shot.titleBn}
                    </span>

                    <span className="px-1 py-0.5 rounded bg-black/85 border border-white/15 text-[8.5px] font-mono text-amber-300 font-bold leading-none tabular-nums pointer-events-none shrink-0">
                      {dur.toFixed(1)}s
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dedicated Compact Audio Waveform Strip (The Music Floor) */}
        {audioTrackInfo && (
          <div className="w-full bg-[#0a0f18] border border-cyan-500/40 rounded-lg px-2.5 py-1 mb-1.5 flex items-center justify-between text-xs font-mono shadow-md">
            <div className="flex items-center gap-2">
              <Music className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[10px] text-cyan-300 font-bold tracking-wider truncate max-w-[180px] sm:max-w-xs">
                ♫ {audioTrackInfo.name}
              </span>
              <span className="text-[9px] text-zinc-400">
                // {audioTrackInfo.duration.toFixed(1)}s AUTO-ROUTED
              </span>
            </div>
            <div className="flex-1 mx-4 h-3 bg-black/60 rounded border border-cyan-500/20 relative overflow-hidden flex items-center">
              <div className="w-full h-full flex items-center gap-0.5 px-1 opacity-50">
                {Array.from({ length: 48 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-cyan-400 rounded-sm"
                    style={{ height: `${20 + ((i * 17 + 23) % 70)}%` }}
                  />
                ))}
              </div>
              <div
                ref={audioPlayheadRef}
                className="absolute top-0 bottom-0 left-0 w-full bg-cyan-400/30 border-r-2 border-cyan-400 origin-left"
                style={{ transform: 'scaleX(0)' }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (masterAudioRef.current) {
                  masterAudioRef.current.pause();
                  masterAudioRef.current.removeAttribute('src');
                }
                setAudioTrackInfo(null);
              }}
              className="text-zinc-500 hover:text-white text-[9px] cursor-pointer"
              title="Clear audio track"
            >
              ✕
            </button>
          </div>
        )}

        {/* Mandate 1: Hardware-Accelerated Precision Scrub Bar (rAF Decoupled DOM Playhead) */}
        <div 
          ref={scrubberTrackRef}
          onPointerDown={handleScrubPointerDown}
          className="w-full h-2.5 bg-black/80 hover:h-3.5 rounded-full cursor-ew-resize transition-all duration-150 border border-white/15 overflow-hidden my-1.5 relative group shadow-inner select-none"
          title="Drag or click to scrub 4K playback (FastSeek)"
        >
          <div 
            ref={timelinePlayheadRef}
            className="h-full bg-gradient-to-r from-amber-500 via-[#F5A623] to-[#e50914] origin-left rounded-full transition-transform will-change-transform"
            style={{ transform: `scaleX(${275 / (activeShot.durationSec * 24)})` }}
          />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-between px-2 text-[8px] font-mono font-bold text-white/70 pointer-events-none transition-opacity">
            <span className="tracking-widest uppercase text-amber-400">◄ SCRUB 24FPS TIMELINE ►</span>
            <span className="text-[#00F0FF]">FASTSEEK READY</span>
          </div>
        </div>

        {/* Tier 2: Single Ultra-Thin Iconic Horizontal Bottom Dock */}
        <div className="w-full h-[46px] min-h-[46px] bg-[#0d0e15]/95 backdrop-blur-2xl border border-white/15 rounded-xl px-2.5 sm:px-3 shadow-[0_8px_32px_rgba(0,0,0,0.9)] flex flex-row items-center justify-between flex-nowrap gap-2 overflow-x-auto overflow-y-hidden no-scrollbar text-xs font-mono">
          
          {/* ======================================================= */}
          {/* 1. LEFT WING: TRANSPORT, FRAME STEPS, CAPTURE & TIMECODE */}
          {/* ======================================================= */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Circular Play/Pause Button */}
            <ToolTooltip
              title="PLAYBACK TRANSPORT"
              why="Plays or pauses real-time 24fps sequence preview"
              how="Click or press Spacebar to toggle playback"
            >
              <button
                type="button"
                onClick={handleTogglePlay}
                aria-label={isPlaying ? 'Pause Playback' : 'Play Sequence'}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md shrink-0 ${
                  isPlaying 
                    ? 'bg-gradient-to-r from-amber-500 to-[#F5A623] text-black ring-2 ring-amber-500/30 shadow-[0_0_16px_rgba(245,166,35,0.7)]' 
                    : 'bg-[#e50914] hover:bg-[#ff1e2b] text-white ring-2 ring-red-500/30 shadow-[0_0_16px_rgba(229,9,20,0.7)]'
                }`}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
            </ToolTooltip>

            {/* Frame-Step Icon Buttons (-1F / +1F) */}
            <div className="flex items-center gap-1 shrink-0">
              <ToolTooltip
                title="STEP BACK 1 FRAME"
                why="Nudges the playhead backward by one exact 24fps frame"
                how="Click or press Left Arrow to inspect motion cuts"
              >
                <button
                  type="button"
                  onClick={() => handleStepFrame(false)}
                  aria-label="Step -1 Frame"
                  className="p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
              </ToolTooltip>

              <ToolTooltip
                title="STEP FORWARD 1 FRAME"
                why="Advances the playhead forward by one exact 24fps frame"
                how="Click or press Right Arrow to land on exact beats"
              >
                <button
                  type="button"
                  onClick={() => handleStepFrame(true)}
                  aria-label="Step +1 Frame"
                  className="p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </ToolTooltip>
            </div>

            {/* Direct Instant Canvas Frame Freeze */}
            <ToolTooltip
              title="FRAME CAPTURE"
              why="Freezes and downloads the current 4K canvas frame as PNG"
              how="Click or press Ctrl+Shift+P for Photoshop paint-over"
            >
              <button
                type="button"
                onClick={handleCaptureCurrentFrame}
                aria-label="Capture Frame"
                className="p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-amber-400 hover:text-amber-300 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Camera className="w-4 h-4" />
              </button>
            </ToolTooltip>

            {/* Compact Monospace SMPTE Timecode Readout + Duration */}
            <ToolTooltip
              title="SMPTE TIMECODE"
              why="Shows frame-accurate sequence clock and active shot duration"
              how="Drag the scrub bar above to seek anywhere at 24fps"
            >
              <div className="flex items-center gap-1.5 h-8 bg-black/80 px-2.5 rounded border border-neutral-800 font-mono tabular-nums shrink-0">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span 
                  ref={timecodeDisplayRef}
                  className="text-[11px] font-black tracking-wider text-[#F5A623]"
                >
                  {formatSmpteTimecode(currentFrameRef.current)}
                </span>
                <span className="text-zinc-600 text-[10px]">/</span>
                <span className="text-zinc-300 font-bold text-[10px]">
                  {activeShot.durationSec.toFixed(1)}s
                </span>
              </div>
            </ToolTooltip>
          </div>

          {/* ======================================================= */}
          {/* 2. CENTER WING: [ SOLO | MASTER ], BEAT SNAP & SPEED */}
          {/* ======================================================= */}
          <div className="flex items-center gap-1.5 shrink-0 justify-center">
            {/* Prominent Dual-State Segmented [ SOLO | MASTER ] Hub */}
            <ToolTooltip
              title="SOLO / MASTER MODE"
              why="Switches between looping the active shot or playing the full cut"
              how="Select SOLO to grade one clip, or MASTER for full sequence"
            >
              <div className="flex items-center h-8 p-0.5 bg-black/85 rounded border border-neutral-800 shadow-inner shrink-0">
                <button
                  type="button"
                  onClick={() => handleSoloMasterToggle('SOLO')}
                  style={
                    soloMasterMode === 'SOLO'
                      ? {
                          border: '1.5px solid #00f0ff',
                          background: 'rgba(0, 240, 255, 0.18)',
                          color: '#00f0ff',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          boxShadow: '0 0 12px rgba(0, 240, 255, 0.4)'
                        }
                      : undefined
                  }
                  className={`h-6.5 px-2 rounded font-mono text-[10px] uppercase font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    soloMasterMode === 'SOLO' ? '' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${soloMasterMode === 'SOLO' ? 'bg-[#00f0ff] animate-ping' : 'bg-zinc-600'}`} />
                  <span>SOLO</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSoloMasterToggle('MASTER')}
                  style={
                    soloMasterMode === 'MASTER'
                      ? {
                          border: '1.5px solid #ffaa00',
                          background: 'rgba(255, 170, 0, 0.22)',
                          color: '#ffaa00',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          boxShadow: '0 0 12px rgba(255, 170, 0, 0.4)'
                        }
                      : undefined
                  }
                  className={`h-6.5 px-2 rounded font-mono text-[10px] uppercase font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    soloMasterMode === 'MASTER' ? '' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${soloMasterMode === 'MASTER' ? 'bg-[#ffaa00] animate-pulse' : 'bg-zinc-600'}`} />
                  <span>MASTER</span>
                </button>
              </div>
            </ToolTooltip>

            {/* Icon-First Beat Snap Toggle */}
            <ToolTooltip
              title="AUDIO BEAT SNAP"
              why="Locks cuts and trim transitions to detected music transients"
              how="Toggle on before scrubbing or editing shot timing"
            >
              <button
                type="button"
                onClick={() => setIsSnapToBeat(prev => !prev)}
                aria-label="Toggle Audio Beat Snap"
                aria-pressed={isSnapToBeat}
                className={`p-2 rounded border transition-all active:scale-95 cursor-pointer shrink-0 ${
                  isSnapToBeat
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/60 text-neutral-400 hover:text-cyan-300'
                }`}
              >
                <Music className="w-4 h-4" />
              </button>
            </ToolTooltip>

            {/* Compact Speed Slider with Numeric Readout */}
            <ToolTooltip
              title="PLAYBACK TEMPO"
              why="Scales real-time stage playback speed from 0.5x to 2.0x"
              how="Drag slider to slow down motion review or speed up passes"
            >
              <div className="hidden lg:flex items-center gap-1.5 h-8 bg-neutral-900/90 px-2 rounded border border-neutral-800 hover:border-amber-400/60 font-mono text-[10px] text-zinc-400 shrink-0 transition-colors">
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.25"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  aria-label="Playback Speed"
                  className="w-12 accent-[#F5A623] cursor-pointer h-1 bg-white/20 rounded shrink-0"
                />
                <span className="text-[#F5A623] font-bold tabular-nums text-[10px] w-8 text-right">
                  {playbackSpeed.toFixed(2)}x
                </span>
              </div>
            </ToolTooltip>
          </div>

          {/* ======================================================= */}
          {/* 3. RIGHT WING: ICON-FIRST OPTICS, TITLES, LIGHTS & TOOLS */}
          {/* ======================================================= */}
          <div className="flex items-center gap-1.5 shrink-0 justify-end">
            {/* Titles Toggle + Quick Title Edit Icon Buttons */}
            <div className="relative flex items-center gap-1 shrink-0">
              <ToolTooltip
                title="KINETIC TITLES"
                why="Shows or hides Bangla & English kinetic typography on stage"
                how="Click to toggle clean plates vs. subtitled preview"
              >
                <button
                  type="button"
                  onClick={handleToggleTitles}
                  aria-label="Toggle Kinetic Titles"
                  aria-pressed={titlesLayerActive}
                  className={`p-2 rounded border transition-all active:scale-95 cursor-pointer shrink-0 ${
                    titlesLayerActive
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                      : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/60 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Type className="w-4 h-4" />
                </button>
              </ToolTooltip>

              <ToolTooltip
                title="EDIT SHOT TITLE"
                why="Customizes active shot typography, style personality, and Bangla text"
                how="Click to open inline title editor and press Enter to save"
              >
                <button
                  type="button"
                  onClick={handleOpenTitleEditor}
                  aria-label="Edit Shot Title"
                  className={`p-2 rounded border transition-all active:scale-95 cursor-pointer shrink-0 ${
                    isEditingTitle
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-amber-300'
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </ToolTooltip>

              {/* Quick Title Edit Popover */}
              {isEditingTitle && (
                <div className="absolute right-0 bottom-full mb-2 w-80 bg-neutral-950/98 backdrop-blur-2xl border border-white/20 rounded-xl p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-xs font-mono space-y-2.5">
                  <div className="flex items-center justify-between text-zinc-400 border-b border-white/10 pb-1.5 text-[10px] uppercase font-bold tracking-wider">
                    <span>SHOT {activeShot.shotNumber} // TITLE & STYLE ENGINE</span>
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(false)}
                      className="text-zinc-500 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Personality / Style Selector */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[9.5px] text-zinc-400 uppercase font-bold">Style Personality</label>
                      <span className="text-[9px] text-amber-400 font-bold uppercase">
                        {editingTitleStyle === 'AUTO' ? `AUTO (${activeShotPersonality})` : editingTitleStyle}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {(['AUTO', 'DOPAMINE', 'MINIMAL', 'B2B', 'KINETIC'] as const).map((styleOpt) => (
                        <button
                          key={styleOpt}
                          type="button"
                          onClick={() => setEditingTitleStyle(styleOpt)}
                          className={`py-1 px-1 rounded text-[8.5px] font-bold font-mono text-center transition-all cursor-pointer ${
                            editingTitleStyle === styleOpt
                              ? 'bg-amber-500 text-black shadow-md'
                              : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {styleOpt === 'AUTO' ? 'Auto' : styleOpt === 'DOPAMINE' ? 'Dopamine' : styleOpt === 'MINIMAL' ? 'Minimal' : styleOpt === 'B2B' ? 'B2B' : 'Kinetic'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 uppercase">Bangla Typography</label>
                    <input
                      type="text"
                      value={editingTitleBn}
                      onChange={(e) => setEditingTitleBn(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCustomTitle();
                        if (e.key === 'Escape') setIsEditingTitle(false);
                      }}
                      placeholder="বাংলা শিরোনাম..."
                      className="w-full h-8 px-2.5 bg-black/80 border border-white/15 focus:border-cyan-400 rounded text-xs font-bangla text-white outline-none"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 uppercase">English Subtitle</label>
                    <input
                      type="text"
                      value={editingTitleEn}
                      onChange={(e) => setEditingTitleEn(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCustomTitle();
                        if (e.key === 'Escape') setIsEditingTitle(false);
                      }}
                      placeholder="English Title..."
                      className="w-full h-8 px-2.5 bg-black/80 border border-white/15 focus:border-amber-400 rounded text-xs text-white outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(false)}
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[11px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCustomTitle}
                      className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px]"
                    >
                      Save Titles
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Aspect Ratio Dropdown */}
            <ToolTooltip
              title="OPTICAL ASPECT RATIO"
              why="Reframes the stage between cinema scope, 16:9, and vertical reel"
              how="Select a matte preset to inspect crop framing live"
            >
              <select
                value={selectedAspectRatio}
                onChange={(e) => handleAspectChange(e.target.value)}
                aria-label="Aspect Ratio"
                className="h-8 px-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 focus:border-amber-400 text-white font-mono text-[10px] font-bold outline-none cursor-pointer transition-colors shrink-0"
              >
                <option value="2.39:1">2.39:1</option>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="4:3">4:3</option>
                <option value="1:1">1:1</option>
              </select>
            </ToolTooltip>

            {/* LUT Preset Dropdown */}
            <ToolTooltip
              title="COLOR GRADE LUT"
              why="Applies real-time cinematic film stock emulation to the active shot"
              how="Pick a LUT preset from the dropdown to preview instantly"
            >
              <select
                value={activeShot.lutFilter || 'RAWx Cinema 35'}
                onChange={(e) => handleLutChange(e.target.value)}
                aria-label="LUT Preset"
                className="h-8 px-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 focus:border-amber-400 text-amber-300 font-mono text-[10px] font-bold outline-none cursor-pointer transition-colors shrink-0 max-w-[104px] truncate"
              >
                {HOME_LUT_PRESETS.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#101014] text-white">
                    {p.label}
                  </option>
                ))}
              </select>
            </ToolTooltip>

            {/* Module 3: Freeze Master Frame ([ 📸 ]) placed in visible right-center cluster */}
            <ToolTooltip
              title="FREEZE MASTER FRAME"
              why="Exports current 3-tier composite frame as lossless PNG for Photoshop paint-over or thumbnailing."
              how="Click icon or press [Shift + S] to save & dispatch."
            >
              <button
                type="button"
                onClick={handleCaptureCurrentFrame}
                aria-label="Freeze Master Frame"
                className="text-amber-300 border border-amber-500/40 bg-neutral-900 hover:bg-amber-500/15 hover:border-amber-400 p-1.5 rounded transition-all active:scale-95 cursor-pointer shrink-0 flex items-center justify-center text-sm leading-none"
              >
                <span>📸</span>
              </button>
            </ToolTooltip>

            {/* Module 3: Ecosystem Bridge ([ 🚀 ]) placed in visible right-center cluster */}
            <ToolTooltip
              title="ECOSYSTEM BRIDGE"
              why="Hand off timeline cuts, audio sync & Bangla/English scripts to Premiere, Resolve, or CapCut."
              how="Click or press [Ctrl + Shift + X] for instant NLE XML."
            >
              <button
                type="button"
                onClick={() => {
                  setCockpitModalTab('interchange');
                  setIsCockpitOpen(true);
                }}
                aria-label="Open Ecosystem Bridge"
                className="text-amber-300 border border-amber-500/40 bg-neutral-900 hover:bg-amber-500/15 hover:border-amber-400 p-1.5 rounded transition-all active:scale-95 cursor-pointer shrink-0 flex items-center justify-center text-sm leading-none"
              >
                <span>🚀</span>
              </button>
            </ToolTooltip>

            {/* Lighting Rig Icon Button */}
            <ToolTooltip
              title="CINEMATIC LIGHTING RIG"
              why="Opens 34 studio key, rim, and practical color gel presets"
              how="Click or press L to light the active shot non-destructively"
            >
              <button
                type="button"
                onClick={() => setIsLightDrawerOpen(prev => !prev)}
                aria-label="Toggle Lighting Rig"
                className={`relative p-2 rounded border transition-all active:scale-95 cursor-pointer shrink-0 ${
                  isLightDrawerOpen || activeShotLightId
                    ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/60 text-amber-300 hover:text-amber-200'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                {activeShotLightId && (
                  <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${isLightDrawerOpen ? 'bg-black' : 'bg-amber-400'} animate-pulse`} />
                )}
              </button>
            </ToolTooltip>

            {/* Zoom Magnification Icon + Numeric Readout */}
            <ToolTooltip
              title="STAGE MAGNIFICATION"
              why="Cycles clean optical zoom between 1.0x, 1.5x, and 2.0x"
              how="Click to inspect fine grain, focus, and framing detail"
            >
              <button
                type="button"
                onClick={handleCycleZoom}
                aria-label="Cycle Viewport Zoom"
                className="p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-white font-mono text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <ZoomIn className="w-4 h-4 text-amber-400" />
                <span className="text-[#F5A623] tabular-nums">{stageZoomLevel}</span>
              </button>
            </ToolTooltip>

            {/* Rule of Thirds Grid Icon Button */}
            <ToolTooltip
              title="COMPOSITION GRID"
              why="Toggles rule-of-thirds and optical horizon guides over canvas"
              how="Click to check framing symmetry without baking into exports"
            >
              <button
                type="button"
                onClick={() => setShowCompositionGrid(prev => !prev)}
                aria-label="Toggle Composition Grid"
                aria-pressed={showCompositionGrid}
                className={`p-2 rounded border transition-all active:scale-95 cursor-pointer shrink-0 ${
                  showCompositionGrid
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/60 text-neutral-400 hover:text-white'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
            </ToolTooltip>

            {/* Non-Blocking 4K Render Trigger */}
            <ToolTooltip
              title="RENDER 4K MASTER"
              why="Encodes the active sequence via non-blocking WebCodecs muxing"
              how="Click to render and download a clean 4K video file"
            >
              <button
                type="button"
                onClick={handleQuickExportCurrentShot}
                disabled={exportState.isExporting}
                aria-label="Render 4K Video"
                className={`p-2 rounded border font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0 ${
                  exportState.isExporting
                    ? 'bg-amber-500/30 border-amber-400 text-amber-300 animate-pulse'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/60 text-[#F5A623] hover:text-[#FFE066]'
                }`}
              >
                <Download className="w-4 h-4" />
                {exportState.isExporting && <span className="tabular-nums">{exportState.progress}%</span>}
              </button>
            </ToolTooltip>

            {/* Ingest 4K Media Icon Button */}
            <ToolTooltip
              title="INGEST MEDIA"
              why="Imports .mp4, .mov, .png, or .jpg directly into the active slot"
              how="Click to choose a file or drag-and-drop onto any shot card"
            >
              <button
                type="button"
                onClick={() => vaultFileInputRef.current?.click()}
                aria-label="Ingest Media"
                className="p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-amber-400 hover:text-amber-300 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Upload className="w-4 h-4" />
              </button>
            </ToolTooltip>

            {/* Media Asset Vault Drawer Icon Button */}
            <ToolTooltip
              title="MEDIA VAULT"
              why="Opens your ingested clip library and saved 4K studio plates"
              how="Click to browse, preview, or assign assets to timeline slots"
            >
              <button
                type="button"
                onClick={() => setIsVaultDrawerOpen(prev => !prev)}
                aria-label="Open Media Asset Vault"
                className="relative p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-amber-300 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <FolderPlus className="w-4 h-4 text-[#F5A623]" />
                {vaultAssets.length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] flex items-center justify-center bg-[#F5A623] text-black text-[8px] font-black rounded-full leading-none">
                    {vaultAssets.length}
                  </span>
                )}
              </button>
            </ToolTooltip>

            {/* Zen Focus Mode Icon Button */}
            <ToolTooltip
              title="ZEN FOCUS MODE"
              why="Hides surrounding UI chrome for distraction-free screening"
              how="Click or press Z to toggle clean cinema viewport"
            >
              <button
                type="button"
                onClick={handleZenToggle}
                aria-label="Toggle Zen Focus Mode"
                aria-pressed={isZenModeActive}
                className={`p-2 rounded border transition-all active:scale-95 cursor-pointer shrink-0 ${
                  isZenModeActive
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.45)]'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/60 text-neutral-400 hover:text-cyan-300'
                }`}
              >
                {isZenModeActive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </ToolTooltip>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 5: MULTI-CAM 9-ANGLE GRID EXPANSION */}
      {/* 3x3 synchronized matrix (CAM 01 to CAM 09) with styled standby cards */}
      {/* ========================================================= */}
      {isMultiCamExpanded && (
        <section className="w-full max-w-7xl mx-auto px-4 md:px-8 my-6 animate-in fade-in duration-300">
          <div className="bg-[#0b0c12] border border-[#232330] rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
                <h3 className="font-mono font-extrabold text-sm tracking-wider text-white uppercase">
                  MULTI-CAM 9-ANGLE BROADCAST MATRIX (3x3)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                ACTIVE CUT: <strong className="text-cyan-400">CAM 0{activeCameraAngle}</strong> // 24FPS SYNC
              </span>
            </div>

            {/* 3x3 Grid: CAM 01 to CAM 09 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {MULTICAM_9_ANGLES.map((cam, idx) => {
                const isSelectedAngle = activeCameraAngle === cam.id;
                return (
                  <div
                    key={cam.id}
                    onClick={() => setActiveCameraAngle(cam.id)}
                    className={`relative rounded-xl overflow-hidden aspect-[16/9] flex flex-col justify-between p-3 cursor-pointer transition-all duration-300 ${
                      isSelectedAngle
                        ? 'border-2 border-[#00f0ff] bg-[#091522] shadow-[0_0_24px_rgba(0,240,255,0.4)] scale-101'
                        : 'border border-white/10 bg-[#0d0d16] hover:border-white/30'
                    }`}
                  >
                    {/* If Assigned Stream: Procedural Plate; If Unassigned: Styled Standby Card */}
                    {cam.standby ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07080c] border border-white/5 text-center p-3 select-none">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-2 text-zinc-500">
                          <Video className="w-5 h-5 opacity-40" />
                        </div>
                        <span className="text-xs font-mono font-bold text-white/60 tracking-wider">
                          {cam.label} // STANDBY
                        </span>
                        <span className="text-[9.5px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
                          AWAITING SDI FEED · 24FPS READY
                        </span>
                      </div>
                    ) : (
                      customMedia[idx]?.thumbnailUrl || customMedia[idx]?.url ? (
                        <div 
                          className="absolute inset-0 bg-cover bg-center opacity-60"
                          style={{
                            backgroundImage: `url(${customMedia[idx]?.thumbnailUrl || customMedia[idx]?.url})`
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0e0f15] via-[#090a0e] to-[#070709] flex flex-col items-center justify-center p-3 select-none opacity-80">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center mb-1 text-zinc-500">
                            <span className="text-xs font-mono font-bold text-zinc-400">+{cam.label}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                            CLEAN 4K SLATE
                          </span>
                        </div>
                      )
                    )}

                    {/* Top Tally Header */}
                    <div className="relative z-10 flex items-center justify-between text-xs font-mono">
                      <span className={`px-2 py-0.5 rounded font-black ${isSelectedAngle ? 'bg-[#00f0ff] text-black font-extrabold shadow-[0_0_10px_#00f0ff]' : 'bg-black/70 text-zinc-300'}`}>
                        {cam.label}
                      </span>
                      {isSelectedAngle ? (
                        <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[9px] animate-pulse">
                          ● ON AIR
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">
                          STANDBY
                        </span>
                      )}
                    </div>

                    {/* Bottom Specs */}
                    <div className="relative z-10 font-mono text-xs">
                      <div className="text-white font-bold truncate">
                        {cam.name}
                      </div>
                      <div className="text-[9px] text-zinc-400">
                        LATENCY: 0.0ms // LOCAL SILICON
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* SECTION 6: NETFLIX "TOP 10 MASTER SHOTS TODAY" */}
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

            <p className="text-white/40 text-xs tracking-wider font-mono">
              STRICT 12.0S (288 FRAMES @ 24FPS) • 2.39:1 OPTICAL SCOPE
            </p>
          </div>

          {/* 10 Vertical Posters with Large Outlined Rank Typography */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {top10Shots.map((frame, index) => {
              const rank = index + 1;
              return (
                <div
                  key={`top-shot-${index}-${frame?.id ?? 'none'}`}
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
                      <span className="text-white/40 text-xs tracking-wider font-mono uppercase">
                        {frame.cameraSpec?.focalLength || '35mm Cine'}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#F5A623] transition-colors truncate">
                      {frame.bengaliTitle || 'সূচনা'} // {frame.title}
                    </h3>
                    <p className="text-white/40 text-xs tracking-wider truncate font-mono">
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
      {/* SECTION 7: FEATURE MATRIX ("MORE REASONS TO CREATE ON HANDFILM") */}
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
      {/* SECTION 8: FREQUENTLY ASKED QUESTIONS & MINIMALIST FOOTER */}
      {/* ========================================================= */}
      <section id="director-faqs-section" className="w-full py-16 border-b border-[#232330] bg-[#070709]">
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

            <div className="font-mono text-white/40 text-xs tracking-wider">
              HANDFILM // 12.0S CINEMA PREVIS & NLE ENGINE • 55" 4K WORKSTATION
            </div>
          </div>
        </div>
      </footer>
      </>
      )}

      {/* Hidden File Input for Direct Media Ingest */}
      <input
        type="file"
        ref={vaultFileInputRef}
        multiple
        accept="video/*,image/*,audio/*,.mp4,.mov,.png,.jpg,.jpeg,.webm,.mkv,.mp3,.wav,.aac,.m4a,.ogg,.flac"
        onChange={handleFileInput}
        className="hidden"
        aria-hidden="true"
      />

      {/* Slide-Over High-Speed Media Asset Vault Drawer */}
      {isVaultDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#0c0d12]/98 backdrop-blur-2xl border-l border-white/15 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#0d0e15]">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#fbbf24]" />
              <span className="text-xs font-mono font-bold text-white tracking-wider">MEDIA ASSET VAULT</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24] font-bold rounded">
                ACTIVE TARGET: SHOT 0{activeShotIndex + 1}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsVaultDrawerOpen(false)}
              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-mono cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <MediaBinDrawer
              activeShotIndex={activeShotIndex}
              onAssignToShot={(_assetId, shotIndex, filename) => {
                const targetIdx = typeof shotIndex === 'number' ? shotIndex : activeShotIndex;
                const match = vaultAssets.find(v => v.name === filename);
                if (match) {
                  setCustomMedia(prev => ({
                    ...prev,
                    [targetIdx]: {
                      url: match.url,
                      videoSrc: match.url,
                      blobUrl: match.url,
                      isVideo: match.isVideo,
                      name: filename
                    }
                  }));
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Module 2: Floating Portal Directorial Dispatch HUD anchored cleanly above shot card */}
      {dispatchHudAnchor && typeof document !== 'undefined' && createPortal(
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: `${Math.min(window.innerWidth - 196, Math.max(12, dispatchHudAnchor.left - 88))}px`,
            top: `${Math.max(16, dispatchHudAnchor.top - 8)}px`,
            transform: 'translateY(-100%)',
            zIndex: 999
          }}
          className="z-[999] w-44 bg-[#08090f]/98 backdrop-blur-xl border border-amber-400/90 rounded-lg p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.95)] font-mono text-[10px] flex flex-col gap-1 animate-in fade-in zoom-in-95"
        >
          <div className="text-[8px] text-zinc-400 font-bold uppercase px-1 border-b border-white/10 pb-1 flex items-center justify-between">
            <span>DISPATCH #{String(dispatchHudAnchor.idx + 1).padStart(2, '0')}</span>
            <span className="text-amber-300">
              {(allCockpitShots[dispatchHudAnchor.idx]?.durationSec ?? 12.0).toFixed(1)}s
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleDispatchToTool('photoshop', dispatchHudAnchor.idx)}
            className="px-2 py-1.5 rounded bg-neutral-900 hover:bg-blue-600 hover:text-white text-blue-300 text-left font-bold flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>[ PS // PAINT-OVER ]</span>
            <Camera className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleDispatchToTool('premiere', dispatchHudAnchor.idx)}
            className="px-2 py-1.5 rounded bg-neutral-900 hover:bg-purple-600 hover:text-white text-purple-300 text-left font-bold flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>[ PR // SEND SEQUENCE ]</span>
            <Film className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleDispatchToTool('capcut', dispatchHudAnchor.idx)}
            className="px-2 py-1.5 rounded bg-neutral-900 hover:bg-amber-500 hover:text-black text-amber-300 text-left font-bold flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>[ CC // REEL BUNDLE ]</span>
            <Zap className="w-3 h-3" />
          </button>
        </div>,
        document.body
      )}

      {/* The Director's Cockpit — External Pipeline Bridges & Ecosystem Hub Modal */}
      <DirectorCockpitModal
        isOpen={isCockpitOpen}
        onClose={() => setIsCockpitOpen(false)}
        activeShot={currentCockpitShot}
        allShots={allCockpitShots}
        audioTrack={audioTrackInfo}
        stageCanvasRef={stageCanvasRef}
        onHotReloadShot={handleHotReloadShot}
        fps={24}
        initialTab={cockpitModalTab}
      />

      {/* 09 PHOTO EDIT & BULK RESIZER SUITE MODAL (WITH 💡 LIGHT RIG (34) TAB) */}
      <CanvasLiquifyModal
        isOpen={isPhotoModalOpen}
        frame={{
          id: activeShotIndex + 1,
          epNumber: String(activeShotIndex + 1).padStart(2, '0'),
          title: activeShot.titleEn || `Shot ${activeShotIndex + 1}`,
          bengaliTitle: activeShot.titleBn || 'সূচনা',
          tagline: activeShot.tagline || '',
          directorNotes: activeShot.directorNotes || '',
          cameraSpec: {
            focalLength: activeShot.lensSpec || '35mm',
            aperture: 'T1.5',
            shutter: '1/48s',
            iso: '800',
            sensor: 'Large Format 4K',
            format: 'RAW'
          },
          colorAccent: '#F5A623',
          hoverStyle: 1,
          soundCue: 'cinematic_sub_impact',
          lutFilter: 'cinematic',
          aspectRatio: (selectedAspectRatio as AspectRatio) || '2.39:1',
          adjustments: {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            bloom: 0,
            grain: 0,
            motionBlur: 0,
            vignette: 0
          },
          imageUrl: customMedia[activeShotIndex]?.url || activeShot.imageUrl || activeShot.videoSrc || 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1280&q=80',
          durationSec: activeShot.durationSec || 3,
          tags: ['handfilm', 'shot', activeShot.lensSpec || 'lens'],
          lightId: activeShotLightId,
        }}
        onClose={() => setIsPhotoModalOpen(false)}
        activeLightId={activeShotLightId}
        onApplyLightToShot={handleSelectLightPreset}
        onApplyLightToAll={handleApplyLightToAllShots}
        onApplyWarp={(warpedUrl) => {
          setCustomMedia(prev => ({
            ...prev,
            [activeShotIndex]: {
              url: warpedUrl,
              videoSrc: warpedUrl,
              blobUrl: warpedUrl,
              isVideo: false,
              name: `PhotoEdit_Shot_${activeShotIndex + 1}.jpg`
            }
          }));
        }}
      />
    </div>
  );
};
