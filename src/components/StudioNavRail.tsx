/**
 * @file /src/components/StudioNavRail.tsx
 * @description 3D Brutalist-Neomorphic Master Navigation Rail for HANDFILM Creative Suite.
 * Features chiseled obsidian tiles with soft inset bevels, prominent semantic iconography,
 * minimalist low-text default appearance, and rich floating hover cards detailing every module.
 * 
 * 15-Module Core Sequence:
 * 01 PLAYER: Animatic transport engine, sub-frame scrubbing, J-K-L deck
 * 02 STORY: Screenplay writer, 3-Act Beat Matrix, AI Copilot, Shot Loglines
 * 03 MEDIA: Asset Vault, resilient IndexedDB persistence, bulk ingestion
 * 04 BOARD: Grid Storyboard View with 100-shot timeline overview
 * 05 CUT EDITOR: Multi-track CapCut-style NLE timeline (video, audio, subtitle lanes)
 * 06 TEXT: Bilingual Typography & Real-Time Glowing Subtitle Engine
 * 07 EDIT & CAM: Optical framing, transforms, crops, camera rig, LUT grading
 * 08 SOUND: DSP audio engine, waveforms, beat detection, master mix
 * 09 PHOTO EDIT: Advanced Photo Editor, Liquify Warp Suite, and Multi-Format Bulk Resizer
 * 10 PRODUCTION: Interactive Call Sheets, Day-Blocks, Shot Lists, Talent & Gear Allocator
 * 11 REVIEW: Timestamped frame markup, annotation pins, and review client export
 * 12 AI DIRECTOR: Gemini Cine Prompt Engine, Veo/Flow shot prompt generator, style consistency matrix
 * 13 CLOUD & R2: Cloudflare R2 backup, S3 byte-range streaming, instant archive sync
 * 14 LIBRARY: Cinematic LUT collections, typography presets, sound libraries
 * 15 SETTINGS: IndexedDB quota manager, hardware acceleration flags, keyboard shortcuts
 */

import React, { useState } from 'react';
import {
  PlaySquare,
  BookOpen,
  Image as ImageIcon,
  LayoutGrid,
  Scissors,
  Type,
  Crop,
  Volume2,
  Wand2,
  Clapperboard,
  MessageSquare,
  Sparkles,
  Cloud,
  Library,
  Settings,
  Camera,
  ChevronDown,
  Check,
  Activity,
  FolderOpen,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

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
  activeProfile?: CameraLensProfile;
  onSelectProfile?: (profile: CameraLensProfile) => void;
  totalShots?: number;
  currentShotIndex?: number;
  saveState?: string;
}

interface HoverCardData {
  num?: string;
  name: string;
  title: string;
  tag: string;
  desc: string;
  statusText: string;
  stats: { label: string; value: string }[];
  isActive?: boolean;
  actionText?: string;
  isDiagnostics?: boolean;
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
  activeProfile = CINE_PROFILES[0],
  onSelectProfile,
  totalShots = 100,
  currentShotIndex = 0,
  saveState = 'SAVED'
}) => {
  const [isProfilesOpen, setIsProfilesOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<CameraLensProfile>(activeProfile);
  const [hoveredData, setHoveredData] = useState<{
    data: HoverCardData;
    top: number;
    left: number;
  } | null>(null);

  const handleSelectCineProfile = (prof: CameraLensProfile) => {
    setCurrentProfile(prof);
    if (onSelectProfile) onSelectProfile(prof);
    setIsProfilesOpen(false);
  };

  const handleMouseEnterButton = (e: React.MouseEvent<HTMLElement>, data: HoverCardData) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cardEstimatedHeight = 250;
    const targetCenter = rect.top + rect.height / 2;
    const clampedTop = Math.max(
      cardEstimatedHeight / 2 + 12,
      Math.min(window.innerHeight - cardEstimatedHeight / 2 - 12, targetCenter)
    );
    setHoveredData({
      data,
      top: clampedTop,
      left: rect.right + 12
    });
  };

  const handleMouseLeaveButton = () => {
    setHoveredData(null);
  };

  // Format current shot timecode at 24fps assuming 12.0s per shot
  const shotTotalSeconds = currentShotIndex * 12;
  const hours = Math.floor(shotTotalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((shotTotalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (shotTotalSeconds % 60).toString().padStart(2, '0');
  const timecodeStr = `${hours}:${minutes}:${seconds}:00`;

  const totalRuntimeSec = totalShots * 12;
  const totalMin = Math.floor(totalRuntimeSec / 60);
  const totalSec = totalRuntimeSec % 60;
  const totalRuntimeStr = `${totalMin}m ${totalSec}s`;

  const navItems = [
    {
      num: '01',
      id: 'PLAYER' as StudioModuleId,
      name: 'PLAYER',
      title: 'ANIMATIC TRANSPORT ENGINE',
      tag: 'CORE TRANSPORT',
      icon: PlaySquare,
      desc: 'Sub-frame precision scrubbing, J-K-L playback deck, real-time audio sync.',
      statusText: 'TRANSPORT READY',
      stats: [
        { label: 'PLAYHEAD', value: `Shot #${currentShotIndex + 1} of ${totalShots}` },
        { label: 'TIMECODE', value: `${timecodeStr} (24 FPS)` },
        { label: 'RUNTIME', value: totalRuntimeStr },
        { label: 'DISC SHUTTER', value: currentProfile.shutter }
      ]
    },
    {
      num: '02',
      id: 'STORY' as StudioModuleId,
      name: 'STORY',
      title: 'SCREENPLAY & BEAT MATRIX',
      tag: 'NARRATIVE',
      icon: BookOpen,
      desc: 'Fountain screenplay editor, 3-Act narrative beat board, shot loglines.',
      statusText: 'NARRATIVE SYNCED',
      stats: [
        { label: 'BEAT MATRIX', value: '3 Acts // 12 Beats' },
        { label: 'SHOT SLUGS', value: `${totalShots} Synced Loglines` },
        { label: 'FORMAT', value: 'Hollywood Fountain' },
        { label: 'COPILOT', value: 'Story Doctor Active' }
      ]
    },
    {
      num: '03',
      id: 'MEDIA' as StudioModuleId,
      name: 'MEDIA',
      title: 'ASSET VAULT & INGESTION',
      tag: 'STORAGE & VAULT',
      icon: ImageIcon,
      desc: 'Resilient IndexedDB local storage, bulk drop-zone, EXIF metadata inspector.',
      statusText: 'VAULT SECURE',
      stats: [
        { label: 'IDB STORAGE', value: 'Persistent Local Vault' },
        { label: 'CACHED FRAMES', value: `${totalShots} Media Artifacts` },
        { label: 'INTEGRITY', value: 'Zero-Data-Loss IDB' },
        { label: 'SAVE STATUS', value: saveState.toUpperCase() }
      ]
    },
    {
      num: '04',
      id: 'BOARD' as StudioModuleId,
      name: 'BOARD',
      title: 'GRID STORYBOARD MATRIX',
      tag: 'TIMELINE MATRIX',
      icon: LayoutGrid,
      desc: 'Visual 100-shot sequence overview, scene reordering, aspect ratio grid.',
      statusText: '100 SHOTS LOADED',
      stats: [
        { label: 'LAYOUT', value: `10x10 Grid (${totalShots} Cells)` },
        { label: 'ACTIVE CELL', value: `Shot #${currentShotIndex + 1} Selected` },
        { label: 'ASPECTS', value: '16:9 // 2.39:1 Cine' },
        { label: 'REORDER', value: 'Drag-and-Drop Sequence' }
      ]
    },
    {
      num: '05',
      id: 'EDIT/CUT' as StudioModuleId,
      name: 'CUT EDITOR',
      title: 'MULTI-TRACK NLE TIMELINE',
      tag: 'NLE SUITE',
      icon: Scissors,
      desc: 'CapCut-style magnetic video cuts, audio wave lanes, frame-accurate trimming.',
      statusText: '3 LANES ACTIVE',
      stats: [
        { label: 'TRACKS', value: 'Video, Audio DSP, Subtitles' },
        { label: 'PRECISION', value: 'Sub-frame 1/24s Razor' },
        { label: 'EDL / OTIO', value: 'CMX 3600 & OTIO Ready' },
        { label: 'RIPPLE', value: 'Magnetic Ripple Enabled' }
      ]
    },
    {
      num: '06',
      id: 'TEXT' as StudioModuleId,
      name: 'TEXT',
      title: 'KINETIC HERO TYPOGRAPHY',
      tag: 'GRAPHICS',
      icon: Type,
      desc: 'Molten gold titles, bilingual Bangla-English engine, burn-in subtitle exporter.',
      statusText: 'BILINGUAL ACTIVE',
      stats: [
        { label: 'SCRIPTS', value: 'English + Bangla' },
        { label: 'SHADERS', value: 'Molten Gold Bloom' },
        { label: 'SUBTITLES', value: `${totalShots} Synced Title Cards` },
        { label: 'EXPORT', value: 'Burned-In & SRT / VTT' }
      ]
    },
    {
      num: '07',
      id: 'OPTICS' as StudioModuleId,
      name: 'EDIT & CAM',
      title: 'CINE FRAMING & OPTICS',
      tag: 'OPTICS & COLOR',
      icon: Crop,
      desc: 'Lens crop ratios, 3D pan & tilt alignment, 3D LUT grading emulation.',
      statusText: 'RIG CALIBRATED',
      stats: [
        { label: 'CAMERA BODY', value: currentProfile.body },
        { label: 'GLASS PROFILE', value: currentProfile.lens },
        { label: 'SENSOR GATE', value: currentProfile.sensor },
        { label: 'LUT SUITE', value: '15 Hollywood Emulations' }
      ]
    },
    {
      num: '08',
      id: 'SOUND' as StudioModuleId,
      name: 'SOUND',
      title: 'DSP AUDIO & SOUNDTRACK',
      tag: 'AUDIO DSP',
      icon: Volume2,
      desc: 'Multi-stem volume mixing, beat detection, waveform analysis, sonic cues.',
      statusText: 'DSP ONLINE',
      stats: [
        { label: 'SAMPLE RATE', value: '48.0 kHz 32-Bit DSP' },
        { label: 'STEMS', value: 'Dialogue, Score, SFX' },
        { label: 'DETECTION', value: 'Live Transient Beat Grid' },
        { label: 'LATENCY', value: '<2.1ms WebAudio Buffer' }
      ]
    },
    {
      num: '09',
      id: 'LIQUIFY' as StudioModuleId,
      name: 'PHOTO EDIT',
      title: 'PHOTO LIQUIFY & WARP',
      tag: 'WARP SUITE',
      icon: Wand2,
      desc: 'Interactive mesh deformation, push/pull canvas liquify, aspect resizer.',
      statusText: 'MESH READY',
      stats: [
        { label: 'MESH GRID', value: 'Elastic Spring-Mass' },
        { label: 'WARP TOOLS', value: 'Push, Twirl, Reconstruct' },
        { label: 'RESIZER', value: '16:9, 9:16, 1:1, 4:5' },
        { label: 'CANVAS DPI', value: 'Hardware WebGL 2.0' }
      ]
    },
    {
      num: '10',
      id: 'PRODUCTION' as StudioModuleId,
      name: 'PRODUCTION',
      title: 'CALL SHEETS & SCHEDULES',
      tag: 'LOGISTICS',
      icon: Clapperboard,
      desc: 'Shooting day-blocks, call sheets, gear check, cast and crew dispatcher.',
      statusText: 'CALL SHEET v1.4',
      stats: [
        { label: 'SCHEDULE', value: `4 Day-Blocks // ${totalShots} Setups` },
        { label: 'DEPARTMENTS', value: 'Camera, Sound, G&E, Art' },
        { label: 'CALL TIME', value: '06:00 AM // 12h Turnaround' },
        { label: 'DISPATCH', value: 'Hollywood Standard PDF' }
      ]
    },
    {
      num: '11',
      id: 'REVIEW' as StudioModuleId,
      name: 'REVIEW',
      title: 'FRAME MARKUP & CLIENT REVIEW',
      tag: 'COLLABORATION',
      icon: MessageSquare,
      desc: 'Interactive drawing pins, director notes, timestamped review export.',
      statusText: 'PIN ENGINE READY',
      stats: [
        { label: 'MARKUP', value: 'Vector Pins & Pen Overlays' },
        { label: 'TIMECODE', value: 'Frame-Accurate Comments' },
        { label: 'GATES', value: 'Director & Client Sign-Off' },
        { label: 'EXPORT', value: 'Timestamped Review Link' }
      ]
    },
    {
      num: '12',
      id: 'AI' as StudioModuleId,
      name: 'AI DIRECTOR',
      title: 'GEMINI CINE PROMPT STUDIO',
      tag: 'AI INTELLIGENCE',
      icon: Sparkles,
      desc: 'Veo and Flow cinematography prompt builder, lighting style consistency.',
      statusText: 'GEMINI 2.5 READY',
      stats: [
        { label: 'CINE MODEL', value: 'Veo 2 & Flow Formulations' },
        { label: 'LIGHTING LOCK', value: 'Consistent Style Matrix' },
        { label: 'OPTICAL CUES', value: 'Camera Angles & Lenses' },
        { label: 'SEED MATRIX', value: 'Deterministic Seed 42' }
      ]
    },
    {
      num: '13',
      id: 'R2_STORAGE' as StudioModuleId,
      name: 'CLOUD & R2',
      title: 'CLOUDFLARE R2 ARCHIVE',
      tag: 'CLOUD ARCHIVE',
      icon: Cloud,
      desc: 'S3 byte-range cloud replication, project backup snapshots, fast sync.',
      statusText: 'EDGE SYNC ACTIVE',
      stats: [
        { label: 'PROTOCOL', value: 'S3 Byte-Range Streaming' },
        { label: 'EDGE BACKBONE', value: 'Cloudflare Global Edge' },
        { label: 'MULTIPART', value: '5 MB Chunked Streaming' },
        { label: 'LATENCY', value: '<18ms Global Edge' }
      ]
    },
    {
      num: '14',
      id: 'LIBRARY' as StudioModuleId,
      name: 'LIBRARY',
      title: 'CINEMATIC PRESETS & LUTS',
      tag: 'PRESET REGISTRY',
      icon: Library,
      desc: 'Anamorphic flare profiles, typography styling presets, SFX library.',
      statusText: 'REGISTRY LOADED',
      stats: [
        { label: 'COLOR LUTS', value: '15 Master Film Emulations' },
        { label: 'TYPOGRAPHY', value: '8 Golden Title Templates' },
        { label: 'SFX STEMS', value: '24 Cinematic Audio Cuts' },
        { label: 'CINE RIGS', value: '5 Hollywood Camera Bodies' }
      ]
    },
    {
      num: '15',
      id: 'SETTINGS' as StudioModuleId,
      name: 'SETTINGS',
      title: 'SYSTEM PREFERENCES & QUOTA',
      tag: 'SYSTEM CONFIG',
      icon: Settings,
      desc: 'Hardware WebGL flags, IndexedDB storage gauges, keyboard shortcuts.',
      statusText: 'SYSTEM OPTIMAL',
      stats: [
        { label: 'GRAPHICS', value: 'WebGL 2.0 Accelerated' },
        { label: 'BUFFER', value: '120 FPS Pacing Engine' },
        { label: 'QUOTA', value: 'IndexedDB > 10 GB Safe' },
        { label: 'HOTKEYS', value: 'Full J-K-L + Cinema Map' }
      ]
    }
  ];

  return (
    <aside
      className={`h-full select-none z-30 shrink-0 bg-[#07070b]/98 border-r border-[#22222d] flex flex-col justify-between font-mono-tech transition-all duration-200 relative ${
        isCollapsed ? 'w-[72px]' : 'w-60 sm:w-64'
      }`}
    >
      {/* Top Section: Cine Profile Selector & Rail Toggle */}
      <div className="shrink-0 border-b border-[#1c1c28] bg-[#0a0a10] p-2 flex flex-col gap-2">
        {/* Rail Top Bar */}
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 min-w-0 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] shadow-[0_0_8px_#fbbf24]" />
              <span className="text-[10px] font-black text-zinc-200 uppercase tracking-widest truncate">
                HANDFILM
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`w-7 h-7 rounded-[4px] bg-[#14141e] hover:bg-[#1e1e2d] border border-white/10 hover:border-[#fbbf24] text-zinc-400 hover:text-[#fbbf24] flex items-center justify-center cursor-pointer transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_2px_4px_rgba(0,0,0,0.5)] active:scale-95 ${
              isCollapsed ? 'mx-auto' : ''
            }`}
            title={isCollapsed ? 'Expand Navigation Rail' : 'Collapse to Slim Minimalist Rail'}
            aria-label={isCollapsed ? 'Expand Navigation Rail' : 'Collapse Navigation Rail'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* 3D Neomorphic Camera & Lens Profile Tile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProfilesOpen((prev) => !prev)}
            onMouseEnter={(e) =>
              handleMouseEnterButton(e, {
                num: 'OPT',
                name: 'CINE PROFILE',
                title: currentProfile.body,
                tag: 'OPTICS RIG',
                desc: `${currentProfile.lens} paired with ${currentProfile.sensor} sensor gate. Shutter calibrated to ${currentProfile.shutter}.`,
                statusText: '24 FPS CINE',
                stats: [
                  { label: 'BODY', value: currentProfile.body },
                  { label: 'OPTICS', value: currentProfile.lens },
                  { label: 'SENSOR', value: currentProfile.sensor },
                  { label: 'DISC', value: currentProfile.shutter }
                ],
                actionText: 'CLICK TO SWITCH OPTICS'
              })
            }
            onMouseLeave={handleMouseLeaveButton}
            className={`w-full group rounded-[4px] cursor-pointer transition-all duration-150 active:translate-y-0.5 ${
              isCollapsed
                ? 'w-12 h-12 mx-auto flex items-center justify-center bg-gradient-to-b from-[#221c10] via-[#161208] to-[#0c0a05] border border-[#d4af37]/60 hover:border-[#fbbf24] shadow-[inset_0_1px_1px_rgba(251,191,36,0.25),_inset_0_-1px_2px_rgba(0,0,0,0.9),_0_2px_6px_rgba(0,0,0,0.7)]'
                : 'p-2 flex items-center justify-between bg-gradient-to-b from-[#1c1810] via-[#121008] to-[#0a0805] border border-[#d4af37]/50 hover:border-[#fbbf24] shadow-[inset_0_1px_1px_rgba(251,191,36,0.2),_0_2px_5px_rgba(0,0,0,0.6)]'
            }`}
            title={`CINE PROFILE: ${currentProfile.body} // ${currentProfile.lens}`}
            aria-label="Camera & Lens Cine Profiles"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-[3px] bg-[#fbbf24]/15 border border-[#fbbf24]/40 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                <Camera className="w-4 h-4 text-[#fbbf24] drop-shadow-[0_0_6px_rgba(245,166,35,0.7)]" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 text-left">
                  <div className="text-[9.5px] font-black text-[#fbbf24] tracking-wider truncate uppercase">
                    {currentProfile.body}
                  </div>
                  <div className="text-[8px] text-zinc-400 truncate">
                    {currentProfile.lens}
                  </div>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <ChevronDown className="w-3.5 h-3.5 text-[#fbbf24] shrink-0 ml-1 opacity-70 group-hover:opacity-100" />
            )}
          </button>

          {/* Camera Profiles Popover Menu */}
          {isProfilesOpen && (
            <div
              className="absolute left-[calc(100%+12px)] top-0 w-64 bg-[#0a0a14]/98 border border-[#d4af37]/60 rounded-[4px] shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(245,166,35,0.2)] p-1.5 z-50 text-[10px] space-y-1 backdrop-blur-2xl animate-in fade-in duration-150"
              onMouseLeave={() => setIsProfilesOpen(false)}
            >
              <div className="px-2 py-1 text-[8.5px] text-[#fbbf24] font-bold border-b border-[#272732] uppercase tracking-wider flex items-center justify-between">
                <span>SELECT CINE PROFILE</span>
                <span className="text-zinc-500">24 FPS CINE</span>
              </div>
              {CINE_PROFILES.map((prof, idx) => {
                const isSelected = prof.body === currentProfile.body;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectCineProfile(prof)}
                    className={`w-full px-2 py-1.5 rounded-[3px] text-left flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#d4af37]/25 text-[#fbbf24] font-bold border border-[#d4af37]/50 shadow-inner'
                        : 'text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold truncate">{prof.body}</div>
                      <div className="text-[8.5px] text-zinc-400 truncate">{prof.lens} • {prof.sensor}</div>
                    </div>
                    {isSelected && <Check className="w-3 h-3 text-[#fbbf24] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 15 Core Modules: 3D Brutalist-Neomorphic Obsidian Buttons */}
      <div 
        onScroll={() => setHoveredData(null)}
        className="flex-1 overflow-y-auto no-scrollbar py-2.5 px-2 flex flex-col items-center gap-2"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeModule === item.id || (item.id === 'EDIT/CUT' && activeModule === 'EDIT/CUT');

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectModule(item.id)}
              onMouseEnter={(e) =>
                handleMouseEnterButton(e, {
                  num: item.num,
                  name: item.name,
                  title: item.title,
                  tag: item.tag,
                  desc: item.desc,
                  statusText: item.statusText,
                  stats: item.stats,
                  isActive,
                  actionText: isActive ? 'CURRENTLY ACTIVE MODULE' : 'CLICK TO ACTIVATE'
                })
              }
              onMouseLeave={handleMouseLeaveButton}
              aria-label={`Module ${item.num}: ${item.name}`}
              className={`group relative rounded-[4px] cursor-pointer transition-all duration-150 select-none active:translate-y-0.5 ${
                isCollapsed
                  ? 'w-12 h-12 flex items-center justify-center'
                  : 'w-full px-3 py-2 flex items-center gap-3'
              } ${
                isActive
                  ? 'bg-gradient-to-b from-[#2a2214] via-[#1a150b] to-[#0f0c05] border border-[#d4af37] shadow-[inset_0_1.5px_2px_rgba(251,191,36,0.35),_inset_0_-1px_3px_rgba(0,0,0,0.95),_0_0_14px_rgba(245,166,35,0.35)]'
                  : 'bg-gradient-to-b from-[#1c1c28] via-[#13131d] to-[#0b0b12] border border-white/10 hover:border-[#d4af37]/70 hover:from-[#252538] hover:to-[#12121e] shadow-[inset_0_1px_1px_rgba(255,255,255,0.16),_inset_0_-1px_2px_rgba(0,0,0,0.9),_0_2px_5px_rgba(0,0,0,0.65)]'
              }`}
            >
              {/* Active Golden Edge Accent */}
              {isActive && (
                <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#fbbf24] rounded-r shadow-[0_0_8px_#fbbf24]" />
              )}

              {/* Module Icon - Prominent, exact symbol */}
              <Icon
                className={`w-5 h-5 sm:w-5.5 sm:h-5.5 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                  isActive
                    ? 'text-[#fbbf24] drop-shadow-[0_0_8px_rgba(245,166,35,0.85)]'
                    : 'text-zinc-400 group-hover:text-amber-300'
                }`}
              />

              {/* Subtle Corner Number in Slim Mode */}
              {isCollapsed && (
                <span
                  className={`absolute bottom-0.5 right-1 text-[7.5px] font-mono tracking-tighter select-none transition-colors ${
                    isActive
                      ? 'text-[#fbbf24] font-black'
                      : 'text-zinc-500/70 group-hover:text-amber-400/90'
                  }`}
                >
                  {item.num}
                </span>
              )}

              {/* Expanded Mode Details */}
              {!isCollapsed && (
                <div className="min-w-0 text-left flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold ${
                        isActive
                          ? 'bg-[#d4af37] text-black'
                          : 'bg-white/5 text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    >
                      {item.num}
                    </span>
                    <span
                      className={`text-[10px] font-black tracking-wider truncate uppercase ${
                        isActive ? 'text-[#fbbf24]' : 'text-zinc-200'
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>
                  <div className="text-[8px] text-zinc-500 truncate leading-tight group-hover:text-zinc-400 mt-0.5">
                    {item.desc}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Section: 3D Chiseled Buttons for VAULT, PRO MODE, and SELF-TEST */}
      <div className="shrink-0 border-t border-[#1c1c28] bg-[#0a0a10] p-2 flex flex-col items-center gap-2">
        {/* 1. VAULT MODE Button */}
        <button
          type="button"
          onClick={() => {
            if (onOpenVaultMode) onOpenVaultMode();
            else onSelectModule('MEDIA');
          }}
          onMouseEnter={(e) =>
            handleMouseEnterButton(e, {
              num: 'VLT',
              name: 'PROJECT VAULT',
              title: 'INDEXEDDB LOCAL STORAGE VAULT',
              tag: 'BROWSER VAULT',
              desc: 'Persistent client-side database, snapshot checkpoints, and multi-project catalog.',
              statusText: 'IDB SECURE',
              stats: [
                { label: 'DATABASE', value: 'handfilm_db / rawx_storage' },
                { label: 'ACTIVE SHOTS', value: `${totalShots} Frames Cached` },
                { label: 'PERSISTENCE', value: saveState.toUpperCase() },
                { label: 'FORMAT', value: 'JSON / OTIO / ZIP' }
              ],
              actionText: 'CLICK TO OPEN PROJECT VAULT'
            })
          }
          onMouseLeave={handleMouseLeaveButton}
          className={`group relative rounded-[4px] cursor-pointer transition-all duration-150 active:translate-y-0.5 ${
            isCollapsed
              ? 'w-12 h-11 flex items-center justify-center'
              : 'w-full px-3 py-2 flex items-center justify-between'
          } bg-gradient-to-b from-[#1b1b26] via-[#12121b] to-[#0a0a10] border border-white/10 hover:border-[#d4af37] text-zinc-300 hover:text-[#fbbf24] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),_inset_0_-1px_2px_rgba(0,0,0,0.85),_0_2px_5px_rgba(0,0,0,0.6)]`}
          title="VAULT MODE — Multi-Project Vault Manager & Local Storage Archive"
          aria-label="Vault Mode"
        >
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-[#fbbf24] group-hover:scale-110 transition-transform" />
            {!isCollapsed && (
              <span className="text-[10px] font-black tracking-wider uppercase text-zinc-200 group-hover:text-[#fbbf24]">
                VAULT MODE
              </span>
            )}
          </div>
          {!isCollapsed && (
            <span className="text-[7.5px] bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#fbbf24] px-1 py-0.2 rounded font-bold">
              IDB
            </span>
          )}
        </button>

        {/* 2. PRO MODE Switch */}
        <button
          type="button"
          onClick={onToggleProMode}
          onMouseEnter={(e) =>
            handleMouseEnterButton(e, {
              num: 'PRO',
              name: 'DIRECTOR TELEMETRY',
              title: 'PRO MONITORING & SCOPES',
              tag: 'STUDIO OVERLAY',
              desc: 'Live video waveform, vectorscope, 14-zone false-color exposure, and optical focus peaking.',
              statusText: isProMode ? 'PRO: ACTIVE' : 'PRO: STANDBY',
              stats: [
                { label: 'STATE', value: isProMode ? 'ACTIVE (HOTKEY P)' : 'STANDBY' },
                { label: 'VIDEO SCOPES', value: 'Luma Waveform + RGB' },
                { label: 'GUIDES', value: 'Rule of Thirds + 2.39:1' },
                { label: 'PEAKING', value: 'Edge Sharpness Assist' }
              ],
              actionText: isProMode ? 'CLICK TO DISABLE PRO MODE' : 'CLICK TO ENABLE PRO MODE'
            })
          }
          onMouseLeave={handleMouseLeaveButton}
          className={`group relative rounded-[4px] cursor-pointer transition-all duration-150 active:translate-y-0.5 ${
            isCollapsed
              ? 'w-12 h-11 flex items-center justify-center'
              : 'w-full px-3 py-2 flex items-center justify-between'
          } bg-gradient-to-b from-[#1b1b26] via-[#12121b] to-[#0a0a10] border ${
            isProMode ? 'border-[#fbbf24] shadow-[0_0_12px_rgba(251,191,36,0.25)]' : 'border-white/10'
          } hover:border-[#fbbf24] text-zinc-300 hover:text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),_inset_0_-1px_2px_rgba(0,0,0,0.85),_0_2px_5px_rgba(0,0,0,0.6)]`}
          title={`PRO MODE: ${isProMode ? 'ENABLED' : 'DISABLED'} — Toggle Director Telemetry`}
          aria-label="Toggle Pro Mode"
        >
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal
              className={`w-5 h-5 transition-colors group-hover:scale-110 ${
                isProMode ? 'text-[#fbbf24] drop-shadow-[0_0_6px_rgba(245,166,35,0.8)]' : 'text-zinc-400 group-hover:text-white'
              }`}
            />
            {!isCollapsed && (
              <span className="text-[10px] font-black tracking-wider uppercase text-zinc-200 group-hover:text-[#fbbf24]">
                PRO MODE
              </span>
            )}
          </div>

          {/* Status Indicator LED */}
          {isCollapsed ? (
            <span
              className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full transition-all ${
                isProMode ? 'bg-[#fbbf24] shadow-[0_0_8px_#fbbf24]' : 'bg-zinc-700'
              }`}
            />
          ) : (
            <div
              className={`w-7 h-3.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative ${
                isProMode ? 'bg-[#d4af37]' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full bg-black transition-transform duration-200 ease-in-out ${
                  isProMode ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </div>
          )}
        </button>

        {/* 3. SELF-TEST Diagnostics Button */}
        <button
          type="button"
          onClick={() => {
            if (onOpenSelfTest) onOpenSelfTest();
            else onSelectModule('SETTINGS');
          }}
          onMouseEnter={(e) =>
            handleMouseEnterButton(e, {
              num: 'TEST',
              name: 'HARDWARE BENCHMARK',
              title: 'STUDIO DIAGNOSTICS & SELF-TEST',
              tag: 'GPU / WEBGL',
              desc: 'Benchmark WebGL canvas throughput, frame pacing jitter, IndexedDB I/O latency, and audio decoders.',
              statusText: 'BENCHMARK READY',
              isDiagnostics: true,
              stats: [
                { label: 'TEST SUITE', value: '8 Sub-System Diagnostics' },
                { label: 'FRAME JITTER', value: '<0.4ms Target Precision' },
                { label: 'GPU BACKEND', value: 'Hardware Canvas 2D' },
                { label: 'MEMORY GAUGE', value: 'IndexedDB Quota Active' }
              ],
              actionText: 'CLICK TO RUN DIAGNOSTICS'
            })
          }
          onMouseLeave={handleMouseLeaveButton}
          className={`group relative rounded-[4px] cursor-pointer transition-all duration-150 active:translate-y-0.5 ${
            isCollapsed
              ? 'w-12 h-11 flex items-center justify-center'
              : 'w-full px-3 py-2 flex items-center justify-center gap-2'
          } bg-gradient-to-b from-[#241318] via-[#170a0e] to-[#0d0508] border border-rose-500/40 hover:border-rose-400 text-rose-300 shadow-[inset_0_1px_1px_rgba(244,63,94,0.25),_inset_0_-1px_2px_rgba(0,0,0,0.9),_0_2px_5px_rgba(0,0,0,0.7)]`}
          title="SELF-TEST — Run Studio Diagnostics Benchmark"
          aria-label="Diagnostics Self-Test"
        >
          <Activity className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
          {!isCollapsed && (
            <span className="text-[10px] font-black tracking-wider uppercase text-rose-300">
              SELF-TEST
            </span>
          )}
        </button>
      </div>

      {/* Dynamic Floating Hover Card - Rendered unclipped at viewport root */}
      {hoveredData && (
        <div
          style={{
            top: `${hoveredData.top}px`,
            left: `${hoveredData.left}px`,
            transform: 'translateY(-50%)'
          }}
          className={`fixed w-80 p-3.5 bg-[#0a0a14]/98 border ${
            hoveredData.data.isDiagnostics ? 'border-rose-500/70' : 'border-[#d4af37]/70'
          } rounded-[5px] shadow-[0_20px_50px_rgba(0,0,0,0.98),0_0_24px_${
            hoveredData.data.isDiagnostics ? 'rgba(244,63,94,0.22)' : 'rgba(245,166,35,0.22)'
          }] backdrop-blur-2xl pointer-events-none z-[9999] text-left font-mono select-none animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Connector Arrow */}
          <div
            className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#0a0a14] border-l border-b ${
              hoveredData.data.isDiagnostics ? 'border-rose-500/70' : 'border-[#d4af37]/70'
            } rotate-45`}
          />

          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[9.5px] font-bold uppercase">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  hoveredData.data.isDiagnostics
                    ? 'bg-rose-400 shadow-[0_0_8px_#f43f5e]'
                    : 'bg-[#fbbf24] shadow-[0_0_8px_#fbbf24]'
                }`}
              />
              <span className={hoveredData.data.isDiagnostics ? 'text-rose-400' : 'text-[#fbbf24]'}>
                {hoveredData.data.num ? `${hoveredData.data.num} // ` : ''}
                {hoveredData.data.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[7.5px] px-1.5 py-0.5 bg-white/5 border border-white/10 text-zinc-400 rounded tracking-wider">
                {hoveredData.data.tag}
              </span>
              {hoveredData.data.isActive ? (
                <span className="text-[7.5px] px-1.5 py-0.5 bg-[#fbbf24]/20 border border-[#fbbf24]/60 text-[#fbbf24] rounded font-black tracking-wider">
                  ACTIVE
                </span>
              ) : (
                <span
                  className={`text-[7.5px] px-1.5 py-0.5 rounded font-semibold tracking-wider ${
                    hoveredData.data.isDiagnostics
                      ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                      : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  {hoveredData.data.statusText}
                </span>
              )}
            </div>
          </div>

          {/* Module Title */}
          <div className="text-[11.5px] font-black text-white uppercase tracking-wider mb-1 drop-shadow-sm">
            {hoveredData.data.title}
          </div>

          {/* Description */}
          <p className="text-[9.5px] text-zinc-300 font-sans leading-relaxed mb-2.5">
            {hoveredData.data.desc}
          </p>

          {/* Dynamic Usage Statistics Box */}
          <div className="p-2 rounded-[3px] bg-black/60 border border-white/10 shadow-inner mb-2.5">
            <div className="flex items-center justify-between text-[7.5px] font-mono text-zinc-400 font-bold uppercase tracking-widest pb-1 mb-1.5 border-b border-white/5">
              <span className="flex items-center gap-1">
                <span
                  className={
                    hoveredData.data.isDiagnostics
                      ? 'text-rose-400 font-black'
                      : 'text-[#fbbf24] font-black'
                  }
                >
                  //
                </span>{' '}
                USAGE & ENGINE TELEMETRY
              </span>
              <span
                className={
                  hoveredData.data.isDiagnostics ? 'text-rose-400' : 'text-[#fbbf24]'
                }
              >
                {hoveredData.data.statusText}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[8.5px]">
              {hoveredData.data.stats.map((stat, i) => (
                <div key={i} className="flex flex-col min-w-0">
                  <span className="text-[7px] text-zinc-500 uppercase tracking-wider font-semibold truncate">
                    {stat.label}
                  </span>
                  <span className="text-zinc-200 font-mono font-bold truncate">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Bar */}
          <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[8px] text-zinc-400 font-mono">
            <span className="flex items-center gap-1 text-zinc-500">
              <span
                className={
                  hoveredData.data.isDiagnostics ? 'text-rose-400' : 'text-[#fbbf24]'
                }
              >
                ▶
              </span>{' '}
              {hoveredData.data.actionText || 'CLICK TO ACTIVATE'}
            </span>
            <span
              className={
                hoveredData.data.isDiagnostics
                  ? 'text-rose-400 font-bold tracking-wider'
                  : 'text-[#fbbf24] font-bold tracking-wider'
              }
            >
              HANDFILM SUITE
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
