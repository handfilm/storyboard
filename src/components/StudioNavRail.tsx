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
  onSelectProfile
}) => {
  const [isProfilesOpen, setIsProfilesOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<CameraLensProfile>(activeProfile);

  const handleSelectCineProfile = (prof: CameraLensProfile) => {
    setCurrentProfile(prof);
    if (onSelectProfile) onSelectProfile(prof);
    setIsProfilesOpen(false);
  };

  const navItems = [
    {
      num: '01',
      id: 'PLAYER' as StudioModuleId,
      name: 'PLAYER',
      title: 'ANIMATIC TRANSPORT ENGINE',
      icon: PlaySquare,
      desc: 'Sub-frame precision scrubbing, J-K-L playback deck, real-time audio sync'
    },
    {
      num: '02',
      id: 'STORY' as StudioModuleId,
      name: 'STORY',
      title: 'SCREENPLAY & BEAT MATRIX',
      icon: BookOpen,
      desc: 'Fountain screenplay editor, 3-Act narrative beat board, shot loglines'
    },
    {
      num: '03',
      id: 'MEDIA' as StudioModuleId,
      name: 'MEDIA',
      title: 'ASSET VAULT & INGESTION',
      icon: ImageIcon,
      desc: 'Resilient IndexedDB local storage, bulk drop-zone, EXIF metadata inspector'
    },
    {
      num: '04',
      id: 'BOARD' as StudioModuleId,
      name: 'BOARD',
      title: 'GRID STORYBOARD MATRIX',
      icon: LayoutGrid,
      desc: 'Visual 100-shot overview, thumbnail re-arranger, shot status tracking'
    },
    {
      num: '05',
      id: 'EDIT/CUT' as StudioModuleId,
      name: 'CUT EDITOR',
      title: 'MULTI-TRACK NLE TIMELINE',
      icon: Scissors,
      desc: 'CapCut-style magnetic video cuts, audio wave lanes, frame-accurate trimming'
    },
    {
      num: '06',
      id: 'TEXT' as StudioModuleId,
      name: 'TEXT',
      title: 'KINETIC HERO TYPOGRAPHY',
      icon: Type,
      desc: 'Molten gold titles, bilingual Bangla-English engine, burn-in subtitle exporter'
    },
    {
      num: '07',
      id: 'OPTICS' as StudioModuleId,
      name: 'EDIT & CAM',
      title: 'CINE FRAMING & OPTICS',
      icon: Crop,
      desc: 'Lens crop ratios, 3D pan & tilt alignment, 3D LUT grading emulation'
    },
    {
      num: '08',
      id: 'SOUND' as StudioModuleId,
      name: 'SOUND',
      title: 'DSP AUDIO & SOUNDTRACK',
      icon: Volume2,
      desc: 'Multi-stem volume mixing, beat detection, waveform analysis, sonic cues'
    },
    {
      num: '09',
      id: 'LIQUIFY' as StudioModuleId,
      name: 'PHOTO EDIT',
      title: 'PHOTO LIQUIFY & WARP',
      icon: Wand2,
      desc: 'Interactive mesh deformation, push/pull canvas liquify, aspect resizer'
    },
    {
      num: '10',
      id: 'PRODUCTION' as StudioModuleId,
      name: 'PRODUCTION',
      title: 'CALL SHEETS & SCHEDULES',
      icon: Clapperboard,
      desc: 'Shooting day-blocks, call sheets, gear check, cast and crew dispatcher'
    },
    {
      num: '11',
      id: 'REVIEW' as StudioModuleId,
      name: 'REVIEW',
      title: 'FRAME MARKUP & CLIENT REVIEW',
      icon: MessageSquare,
      desc: 'Interactive drawing pins, director notes, timestamped review export'
    },
    {
      num: '12',
      id: 'AI' as StudioModuleId,
      name: 'AI DIRECTOR',
      title: 'GEMINI CINE PROMPT STUDIO',
      icon: Sparkles,
      desc: 'Veo and Flow cinematography prompt builder, lighting style consistency'
    },
    {
      num: '13',
      id: 'R2_STORAGE' as StudioModuleId,
      name: 'CLOUD & R2',
      title: 'CLOUDFLARE R2 ARCHIVE',
      icon: Cloud,
      desc: 'S3 byte-range cloud replication, project backup snapshots, fast sync'
    },
    {
      num: '14',
      id: 'LIBRARY' as StudioModuleId,
      name: 'LIBRARY',
      title: 'CINEMATIC PRESETS & LUTS',
      icon: Library,
      desc: 'Anamorphic flare profiles, typography styling presets, SFX library'
    },
    {
      num: '15',
      id: 'SETTINGS' as StudioModuleId,
      name: 'SETTINGS',
      title: 'SYSTEM PREFERENCES & QUOTA',
      icon: Settings,
      desc: 'Hardware WebGL flags, IndexedDB storage gauges, keyboard shortcuts'
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

            {/* Hover Card for Cine Profile in Slim Mode */}
            {isCollapsed && (
              <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 w-64 p-3 bg-[#0a0a14]/98 border border-[#d4af37]/60 rounded-[4px] shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(245,166,35,0.15)] backdrop-blur-2xl opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50 text-left font-mono">
                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#0a0a14] border-l border-b border-[#d4af37]/60 rotate-45" />
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[9px] text-[#fbbf24] font-bold uppercase">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] shadow-[0_0_6px_#fbbf24]" />
                    OPTICS // CINE PROFILE
                  </span>
                  <span className="text-[8px] text-zinc-500 font-mono">24 FPS</span>
                </div>
                <div className="text-[11px] font-black text-white uppercase tracking-wider mb-1">
                  {currentProfile.body}
                </div>
                <div className="text-[9.5px] text-zinc-300 font-sans leading-relaxed">
                  {currentProfile.lens} • {currentProfile.sensor}
                </div>
                <div className="mt-2 pt-1 border-t border-white/5 flex items-center justify-between text-[7.5px] text-zinc-500">
                  <span>CLICK TO SWITCH OPTICS</span>
                  <span className="text-[#fbbf24] font-bold">SHUTTER {currentProfile.shutter}</span>
                </div>
              </div>
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
      <div className="flex-1 overflow-y-auto no-scrollbar py-2.5 px-2 flex flex-col items-center gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeModule === item.id || (item.id === 'EDIT/CUT' && activeModule === 'EDIT/CUT');

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectModule(item.id)}
              aria-label={`Module ${item.num}: ${item.name}`}
              className={`group relative rounded-[4px] cursor-pointer transition-all duration-150 select-none active:translate-y-0.5 ${
                isCollapsed
                  ? 'w-12 h-12 flex items-center justify-center'
                  : 'w-full px-3 py-2 flex items-center gap-3'
              } ${
                isActive
                  ? 'bg-gradient-to-b from-[#2a2214] via-[#1a150b] to-[#0f0c05] border border-[#d4af37] shadow-[inset_0_1px_2px_rgba(251,191,36,0.35),_inset_0_-1px_3px_rgba(0,0,0,0.95),_0_0_14px_rgba(245,166,35,0.35)]'
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

              {/* Rich Floating Hover Card (Details revealed strictly on mouse-over) */}
              <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 w-64 p-3 bg-[#0a0a14]/98 border border-[#d4af37]/60 rounded-[4px] shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(245,166,35,0.18)] backdrop-blur-2xl opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50 text-left font-mono">
                {/* Connector arrow */}
                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#0a0a14] border-l border-b border-[#d4af37]/60 rotate-45" />

                {/* Card Header */}
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[9px] text-[#fbbf24] font-bold uppercase">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] shadow-[0_0_6px_#fbbf24]" />
                    {item.num} // {item.name}
                  </span>
                  {isActive ? (
                    <span className="text-[8px] px-1 py-0.2 bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/50 rounded font-bold">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-[8px] text-zinc-500 font-mono">MODULE</span>
                  )}
                </div>

                {/* Card Title & Description */}
                <div className="text-[11px] font-black text-white tracking-wider uppercase mb-1">
                  {item.title}
                </div>
                <p className="text-[9.5px] text-zinc-300 font-sans leading-relaxed">
                  {item.desc}
                </p>

                {/* Card Footer */}
                <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[7.5px] text-zinc-500">
                  <span>CLICK TO ACTIVATE</span>
                  <span className="text-[#fbbf24] font-bold">HANDFILM SUITE</span>
                </div>
              </div>
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

          {/* Hover Card for Vault Mode */}
          {isCollapsed && (
            <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 w-64 p-3 bg-[#0a0a14]/98 border border-[#d4af37]/60 rounded-[4px] shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(245,166,35,0.18)] backdrop-blur-2xl opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50 text-left font-mono">
              <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#0a0a14] border-l border-b border-[#d4af37]/60 rotate-45" />
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[9px] text-[#fbbf24] font-bold uppercase">
                <span>VAULT // PROJECT ARCHIVE</span>
                <span className="text-[8px] text-emerald-400 font-mono">IDB SAFE</span>
              </div>
              <div className="text-[11px] font-black text-white uppercase tracking-wider mb-1">
                PROJECT VAULT & MEDIA
              </div>
              <p className="text-[9.5px] text-zinc-300 font-sans leading-relaxed">
                IndexedDB persistent browser vault, snapshot checkpoints, and R2 cloud archive replication.
              </p>
              <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[7.5px] text-zinc-500">
                <span>CLICK TO MANAGE</span>
                <span className="text-[#fbbf24] font-bold">STORAGE MANAGER</span>
              </div>
            </div>
          )}
        </button>

        {/* 2. PRO MODE Switch */}
        <button
          type="button"
          onClick={onToggleProMode}
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

          {/* Hover Card for Pro Mode */}
          {isCollapsed && (
            <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 w-64 p-3 bg-[#0a0a14]/98 border border-[#d4af37]/60 rounded-[4px] shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(245,166,35,0.18)] backdrop-blur-2xl opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50 text-left font-mono">
              <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#0a0a14] border-l border-b border-[#d4af37]/60 rotate-45" />
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[9px] text-[#fbbf24] font-bold uppercase">
                <span>DIRECTOR OVERLAYS</span>
                <span className={isProMode ? 'text-[#fbbf24] font-bold' : 'text-zinc-500'}>
                  {isProMode ? 'STATUS: ON' : 'STATUS: OFF'}
                </span>
              </div>
              <div className="text-[11px] font-black text-white uppercase tracking-wider mb-1">
                PRO TELEMETRY & SCOPES
              </div>
              <p className="text-[9.5px] text-zinc-300 font-sans leading-relaxed">
                Toggle lens stress heatmaps, framing guides, live video scopes, and optical focus peaking.
              </p>
              <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[7.5px] text-zinc-500">
                <span>CLICK TO TOGGLE</span>
                <span className="text-[#fbbf24] font-bold">HOTKEY: P</span>
              </div>
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

          {/* Hover Card for Self-Test */}
          {isCollapsed && (
            <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 w-64 p-3 bg-[#0a0a14]/98 border border-rose-500/60 rounded-[4px] shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(244,63,94,0.18)] backdrop-blur-2xl opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50 text-left font-mono">
              <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#0a0a14] border-l border-b border-rose-500/60 rotate-45" />
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[9px] text-rose-400 font-bold uppercase">
                <span>DIAGNOSTICS // BENCHMARK</span>
                <span className="text-zinc-500">GPU TEST</span>
              </div>
              <div className="text-[11px] font-black text-white uppercase tracking-wider mb-1">
                HARDWARE ACCELERATION
              </div>
              <p className="text-[9.5px] text-zinc-300 font-sans leading-relaxed">
                Benchmark WebGL canvas throughput, frame pacing jitter, IndexedDB I/O latency, and audio decoders.
              </p>
              <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[7.5px] text-zinc-500">
                <span>CLICK TO RUN</span>
                <span className="text-rose-400 font-bold">SYSTEM CHECK</span>
              </div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
