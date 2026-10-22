/**
 * @file /src/components/LeftRailNavigation.tsx
 * @description Master Unified Single Left Navigation Rail for RAWx Storyboard Studio.
 * Replaces the dual-column strips with a single scrollable, numbered sidebar.
 * Features:
 * - Top Selector: [ CAMERA & LENS PROFILES ] (Merged Body/Optics selector)
 * - 15 Numbered Modules:
 *   01. STORY: Screenplay editor, Scene Beats, Shot Logline, and "Apply to Slate" dialogue pusher
 *   02. MEDIA: Asset Vault with persistent bulk ingestion and proxy generation
 *   03. BOARD: Grid Storyboard View
 *   04. CUT EDITOR: Multi-track CapCut-style NLE timeline (video, audio, text lanes)
 *   05. TEXT: Bilingual Typography & Real-time Subtitle Inspector
 *   06. EDIT & CAM: Optical framing, transforms, crops, and aspect ratios
 *   07. SOUND: DSP audio engine, waveforms, and beat detection
 *   08. PLAYER: Animatic transport engine and sub-frame scrubbing
 *   09. PRODUCTION: Call sheets, 3-day blocks, and crew scheduling
 *   10. REVIEW: Timestamped annotation pins and feedback markers
 *   11. PHOTO & LIQUIFY: Warp brush suite (Push, Bloat, Pinch, Restore)
 *   12. AI DIRECTOR: Gemini Cine Prompt Engine, Veo/Flow Lab, and Bilingual Polish
 *   13. CLOUD & R2: Cloudflare R2 streaming, byte-range scrubbing, and webhook pipelines
 *   14. LIBRARY: Presets, Look LUTs, and typography styles
 *   15. SETTINGS: Dedicated modal managing IndexedDB storage quota, keyboard shortcuts, export defaults, theme, and self-test diagnostics
 * - Bottom Controls: VAULT MODE, PRO MODE switch, and [ SELF-TEST ]
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Image as ImageIcon,
  LayoutGrid,
  Scissors,
  Type,
  Crop,
  Volume2,
  PlaySquare,
  Clapperboard,
  MessageSquare,
  Wand2,
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
  ChevronRight,
  Shield,
  Layers
} from 'lucide-react';

export type StudioModuleId =
  | 'STORY'
  | 'MEDIA'
  | 'BOARD'
  | 'BLOOM'
  | 'TEXT'
  | 'EDIT/CUT'
  | 'SOUND'
  | 'PLAYER'
  | 'PRODUCTION'
  | 'REVIEW'
  | 'EXPORT'
  | 'LIBRARY'
  | 'AI'
  | 'SETTINGS'
  | 'OPTICS'
  | 'LIQUIFY'
  | 'R2_STORAGE';

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

interface LeftRailNavigationProps {
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

export const LeftRailNavigation: React.FC<LeftRailNavigationProps> = ({
  activeModule,
  onSelectModule,
  isCollapsed,
  onToggleCollapse,
  isProMode,
  onToggleProMode,
  onOpenVaultMode,
  onOpenSelfTest,
  onOpenSettingsModal,
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
      id: 'STORY' as StudioModuleId,
      name: 'STORY',
      icon: BookOpen,
      desc: 'Screenplay editor, Scene Beats, Shot Logline & "Apply to Slate"'
    },
    {
      num: '02',
      id: 'MEDIA' as StudioModuleId,
      name: 'MEDIA',
      icon: ImageIcon,
      desc: 'Asset Vault with persistent bulk ingestion and proxy generation'
    },
    {
      num: '03',
      id: 'BOARD' as StudioModuleId,
      name: 'BOARD',
      icon: LayoutGrid,
      desc: 'Grid Storyboard View with 100-shot timeline overview'
    },
    {
      num: '04',
      id: 'EDIT/CUT' as StudioModuleId,
      name: 'CUT EDITOR',
      icon: Scissors,
      desc: 'Multi-track CapCut-style NLE timeline (video, audio, text lanes)'
    },
    {
      num: '05',
      id: 'TEXT' as StudioModuleId,
      name: 'TEXT',
      icon: Type,
      desc: 'Bilingual Typography & Real-time Subtitle Inspector'
    },
    {
      num: '06',
      id: 'OPTICS' as StudioModuleId,
      name: 'EDIT & CAM',
      icon: Crop,
      desc: 'Optical framing, transforms, crops, and aspect ratios'
    },
    {
      num: '07',
      id: 'SOUND' as StudioModuleId,
      name: 'SOUND',
      icon: Volume2,
      desc: 'DSP audio engine, waveforms, and beat detection'
    },
    {
      num: '08',
      id: 'PLAYER' as StudioModuleId,
      name: 'PLAYER',
      icon: PlaySquare,
      desc: 'Animatic transport engine and sub-frame scrubbing'
    },
    {
      num: '09',
      id: 'PRODUCTION' as StudioModuleId,
      name: 'PRODUCTION',
      icon: Clapperboard,
      desc: 'Call sheets, 3-day blocks, and crew scheduling'
    },
    {
      num: '10',
      id: 'REVIEW' as StudioModuleId,
      name: 'REVIEW',
      icon: MessageSquare,
      desc: 'Timestamped annotation pins and feedback markers'
    },
    {
      num: '11',
      id: 'LIQUIFY' as StudioModuleId,
      name: 'PHOTO & LIQUIFY',
      icon: Wand2,
      desc: 'Warp brush suite (Push, Bloat, Pinch, Restore)'
    },
    {
      num: '12',
      id: 'AI' as StudioModuleId,
      name: 'AI DIRECTOR',
      icon: Sparkles,
      desc: 'Gemini Cine Prompt Engine, Veo/Flow Lab, and Bilingual Polish'
    },
    {
      num: '13',
      id: 'R2_STORAGE' as StudioModuleId,
      name: 'CLOUD & R2',
      icon: Cloud,
      desc: 'Cloudflare R2 streaming, byte-range scrubbing, and webhook pipelines'
    },
    {
      num: '14',
      id: 'LIBRARY' as StudioModuleId,
      name: 'LIBRARY',
      icon: Library,
      desc: 'Presets, Look LUTs, and typography styles'
    },
    {
      num: '15',
      id: 'SETTINGS' as StudioModuleId,
      name: 'SETTINGS',
      icon: Settings,
      desc: 'IndexedDB storage quota, keyboard shortcuts, export defaults, theme & diagnostics'
    }
  ];

  return (
    <aside
      className={`h-full select-none z-30 shrink-0 bg-[#09090D] border-r border-[#272732] flex flex-col justify-between font-mono-tech transition-all duration-200 relative ${
        isCollapsed ? 'w-16' : 'w-56 sm:w-64'
      }`}
    >
      {/* Top Header & Merged Camera & Lens Selector */}
      <div className="shrink-0 border-b border-[#272732] bg-[#0c0c12]">
        {/* Rail Header with Expand/Collapse toggle */}
        <div className="px-2.5 py-2 flex items-center justify-between border-b border-[#1f1f2a]">
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] shadow-[0_0_6px_#fbbf24]" />
              <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest truncate">
                RAWx NAV RAIL
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`p-1 rounded text-zinc-400 hover:text-[#fbbf24] hover:bg-white/5 cursor-pointer transition-colors ${
              isCollapsed ? 'mx-auto' : ''
            }`}
            title={isCollapsed ? 'Expand Navigation Rail' : 'Collapse Navigation Rail'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Top Selector: [ CAMERA & LENS PROFILES ] (Merged Body/Optics selector) */}
        <div className="p-1.5 relative">
          <button
            type="button"
            onClick={() => setIsProfilesOpen(prev => !prev)}
            className={`w-full rounded-[2px] bg-[#14141e] hover:bg-[#1a1a28] border border-[#d4af37]/40 hover:border-[#d4af37] text-left transition-colors cursor-pointer active:scale-[0.98] ${
              isCollapsed ? 'p-1.5 flex flex-col items-center text-center' : 'p-2 flex items-center justify-between'
            }`}
            title="[ CAMERA & LENS PROFILES ] — Select Cine Body & Lens Optics"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-[1px] bg-[#d4af37]/20 border border-[#d4af37]/60 flex items-center justify-center shrink-0">
                <Camera className="w-3.5 h-3.5 text-[#fbbf24]" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-[9.5px] font-bold text-[#fbbf24] tracking-wider truncate uppercase">
                    {currentProfile.body}
                  </div>
                  <div className="text-[8.5px] text-zinc-400 truncate">
                    {currentProfile.lens}
                  </div>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <ChevronDown className="w-3 h-3 text-[#d4af37] shrink-0 ml-1" />
            )}
          </button>

          {/* Camera Profiles Popover Menu */}
          {isProfilesOpen && (
            <div
              className={`absolute top-full mt-1 bg-[#0c0c14] border border-[#d4af37]/60 rounded shadow-2xl p-1 z-50 text-[10px] space-y-0.5 backdrop-blur-2xl animate-in fade-in duration-150 ${
                isCollapsed ? 'left-full ml-1 w-60' : 'left-1.5 right-1.5'
              }`}
              onMouseLeave={() => setIsProfilesOpen(false)}
            >
              <div className="px-2 py-1 text-[8.5px] text-[#fbbf24] font-bold border-b border-[#272732] uppercase tracking-wider flex items-center justify-between">
                <span>[ CAMERA & LENS PROFILES ]</span>
                <span className="text-zinc-500">24 FPS</span>
              </div>
              {CINE_PROFILES.map((prof, idx) => {
                const isSelected = prof.body === currentProfile.body;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectCineProfile(prof)}
                    className={`w-full px-2 py-1.5 rounded text-left flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#d4af37]/20 text-[#fbbf24] font-bold'
                        : 'text-zinc-300 hover:text-white hover:bg-white/5'
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

      {/* Core Numbered 15 Modules (Scrollable Single Rail) */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-2 px-1.5 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id || (item.id === 'EDIT/CUT' && activeModule === 'EDIT/CUT');

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === 'SETTINGS') {
                  if (onOpenSettingsModal) onOpenSettingsModal();
                  else onSelectModule('SETTINGS');
                } else {
                  onSelectModule(item.id);
                }
              }}
              className={`w-full rounded-[2px] cursor-pointer transition-all duration-150 ease-out active:scale-[0.98] relative group ${
                isCollapsed
                  ? 'h-10 flex items-center justify-center'
                  : 'px-2.5 py-1.5 flex items-center gap-2.5'
              } ${
                isActive
                  ? 'bg-[#d4af37]/15 border border-[#d4af37] text-white shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent'
              }`}
              title={`${item.num} ${item.name} — ${item.desc}`}
            >
              {/* Active Golden Left Indicator Pill */}
              {isActive && (
                <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#fbbf24] rounded-r shadow-[0_0_6px_#fbbf24]" />
              )}

              {/* Number Badge */}
              <span
                className={`text-[8.5px] font-bold font-mono px-1 py-0.2 rounded shrink-0 ${
                  isActive
                    ? 'bg-[#d4af37] text-black font-black'
                    : 'bg-white/5 text-zinc-400 group-hover:text-zinc-200'
                }`}
              >
                {item.num}
              </span>

              {/* Module Icon */}
              <Icon
                className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                  isActive ? 'text-[#fbbf24] scale-110' : 'text-zinc-400 group-hover:text-white'
                }`}
              />

              {/* Module Text & Description (Expanded only) */}
              {!isCollapsed && (
                <div className="min-w-0 text-left flex-1">
                  <div
                    className={`text-[10px] font-bold tracking-wider truncate ${
                      isActive ? 'text-[#fbbf24]' : 'text-zinc-300'
                    }`}
                  >
                    {item.name}
                  </div>
                  <div className="text-[7.5px] text-zinc-500 truncate leading-tight group-hover:text-zinc-400">
                    {item.desc}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Controls: VAULT MODE, PRO MODE switch, and [ SELF-TEST ] */}
      <div className="shrink-0 border-t border-[#272732] bg-[#0c0c12] p-2 space-y-1.5">
        {/* 1. VAULT MODE Button */}
        <button
          type="button"
          onClick={() => {
            if (onOpenVaultMode) onOpenVaultMode();
            else onSelectModule('LIBRARY');
          }}
          className={`w-full rounded-[2px] bg-[#12121a] hover:bg-[#181824] border border-[#272732] hover:border-[#d4af37] text-zinc-300 hover:text-[#fbbf24] cursor-pointer transition-all active:scale-[0.98] ${
            isCollapsed ? 'p-2 flex justify-center' : 'px-2.5 py-1.5 flex items-center justify-between'
          }`}
          title="VAULT MODE — Multi-Project Vault Manager & Archive"
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="w-3.5 h-3.5 text-[#fbbf24]" />
            {!isCollapsed && <span className="text-[10px] font-bold tracking-wider">VAULT MODE</span>}
          </div>
          {!isCollapsed && (
            <span className="text-[7.5px] bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#fbbf24] px-1 py-0.2 rounded font-bold">
              IDB
            </span>
          )}
        </button>

        {/* 2. PRO MODE Switch */}
        <div
          onClick={onToggleProMode}
          className={`w-full rounded-[2px] bg-[#12121a] border border-[#272732] hover:border-zinc-500 cursor-pointer transition-all ${
            isCollapsed ? 'p-2 flex justify-center' : 'px-2.5 py-1.5 flex items-center justify-between'
          }`}
          title="PRO MODE — Toggle Advanced Director Tools & Telemetry"
        >
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#fbbf24]" />
                <span className="text-[10px] font-bold text-zinc-300 tracking-wider">PRO MODE</span>
              </div>
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
            </>
          ) : (
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isProMode ? 'bg-[#d4af37] shadow-[0_0_8px_#fbbf24]' : 'bg-zinc-600'
              }`}
            />
          )}
        </div>

        {/* 3. [ SELF-TEST ] Button */}
        <button
          type="button"
          onClick={() => {
            if (onOpenSelfTest) onOpenSelfTest();
            else onSelectModule('SETTINGS');
          }}
          className={`w-full rounded-[2px] bg-[#16121a] hover:bg-[#201824] border border-rose-500/40 hover:border-rose-400 text-rose-300 font-bold cursor-pointer transition-all active:scale-[0.98] ${
            isCollapsed ? 'p-2 flex justify-center' : 'px-2.5 py-1.5 flex items-center justify-center gap-1.5'
          }`}
          title="[ SELF-TEST ] — Run Studio Diagnostics Benchmark"
        >
          <Activity className="w-3.5 h-3.5 text-rose-400" />
          {!isCollapsed && <span className="text-[10px] tracking-wider">[ SELF-TEST ]</span>}
        </button>
      </div>
    </aside>
  );
};
