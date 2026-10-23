/**
 * RAWx Studio — LeftRail Module Navigator
 * Public API: LeftRail component
 * Implements 15 studio modules with Simple/PRO filtering, workspace presets,
 * chiseled obsidian neomorphic styling, enlarged button hit-areas, inset bevels,
 * and dynamic floating hover cards revealing module metadata.
 */

import React from 'react';
import { useStudioStore, StudioModule, WorkspacePreset } from '../../core/store';
import { 
  BookOpen, 
  FolderKanban, 
  LayoutGrid, 
  Type, 
  Scissors, 
  Palette, 
  Volume2, 
  PlaySquare, 
  Box, 
  FileSpreadsheet, 
  MessageSquare, 
  Download, 
  Library, 
  Sparkles, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ModuleDef {
  id: StudioModule;
  label: string;
  num: string;
  title: string;
  desc: string;
  tag: string;
  statusText: string;
  stats: { label: string; value: string }[];
  icon: React.ComponentType<{ className?: string }>;
  proOnly?: boolean;
}

const modules: ModuleDef[] = [
  {
    id: 'PLAYER',
    label: 'STAGE',
    num: '01',
    title: 'ANIMATIC PLAYER & TRANSPORT',
    desc: 'Real-time playback engine, sub-frame scrubbing, J-K-L deck, audio synchronization.',
    tag: 'CORE',
    statusText: 'TRANSPORT READY',
    stats: [
      { label: 'PLAYHEAD', value: 'Shot #1 of 100 Frames' },
      { label: 'TIMECODE', value: '00:00:12:00 (24 FPS)' },
      { label: 'RUNTIME', value: '20m 00s Anthology' },
      { label: 'DISC SHUTTER', value: '180° Cine Disc' }
    ],
    icon: PlaySquare
  },
  {
    id: 'STORY',
    label: 'STORY',
    num: '02',
    title: 'SCREENPLAY & 3-ACT BEATS',
    desc: 'Fountain screenplay editor, three-act structure matrix, shot loglines.',
    tag: 'WRITING',
    statusText: 'NARRATIVE SYNCED',
    stats: [
      { label: 'BEAT MATRIX', value: '3 Acts // 12 Beats' },
      { label: 'SHOT SLUGS', value: '100 Synced Loglines' },
      { label: 'FORMAT', value: 'Hollywood Fountain' },
      { label: 'COPILOT', value: 'Story Doctor Active' }
    ],
    icon: BookOpen
  },
  {
    id: 'MEDIA',
    label: 'MEDIA',
    num: '03',
    title: 'ASSET VAULT & INGESTION',
    desc: 'IndexedDB persistent storage, drag-and-drop batch ingestion, EXIF inspector.',
    tag: 'STORAGE',
    statusText: 'VAULT SECURE',
    stats: [
      { label: 'IDB STORAGE', value: 'Persistent Local Vault' },
      { label: 'CACHED FRAMES', value: '100 Media Artifacts' },
      { label: 'INTEGRITY', value: 'Zero-Data-Loss IDB' },
      { label: 'SAVE STATUS', value: 'PERSISTENT' }
    ],
    icon: FolderKanban
  },
  {
    id: 'BOARD',
    label: 'BOARD',
    num: '04',
    title: 'GRID STORYBOARD MATRIX',
    desc: 'Visual 100-shot sequence overview, scene reordering, aspect ratio grid.',
    tag: 'TIMELINE',
    statusText: '100 SHOTS LOADED',
    stats: [
      { label: 'LAYOUT', value: '10x10 Grid (100 Cells)' },
      { label: 'ACTIVE CELL', value: 'Shot #1 Selected' },
      { label: 'ASPECTS', value: '16:9 // 2.39:1 Cine' },
      { label: 'REORDER', value: 'Drag-and-Drop Sequence' }
    ],
    icon: LayoutGrid
  },
  {
    id: 'TEXT',
    label: 'TEXT',
    num: '05',
    title: 'HERO KINETIC TYPOGRAPHY',
    desc: 'Molten gold titles, bilingual Bangla-English formatting, burn-in subtitle export.',
    tag: 'GRAPHICS',
    statusText: 'BILINGUAL ACTIVE',
    stats: [
      { label: 'SCRIPTS', value: 'English + Bangla' },
      { label: 'SHADERS', value: 'Molten Gold Bloom' },
      { label: 'SUBTITLES', value: '100 Synced Title Cards' },
      { label: 'EXPORT', value: 'Burned-In & SRT / VTT' }
    ],
    icon: Type
  },
  {
    id: 'EDIT',
    label: 'EDIT',
    num: '06',
    title: 'MULTI-TRACK NLE TIMELINE',
    desc: 'CapCut-style magnetic video timeline, audio wave lanes, frame-accurate trims.',
    tag: 'PRO NLE',
    statusText: '3 LANES ACTIVE',
    stats: [
      { label: 'TRACKS', value: 'Video, Audio DSP, Subtitles' },
      { label: 'PRECISION', value: 'Sub-frame 1/24s Razor' },
      { label: 'EDL / OTIO', value: 'CMX 3600 & OTIO Ready' },
      { label: 'RIPPLE', value: 'Magnetic Ripple Enabled' }
    ],
    icon: Scissors,
    proOnly: true
  },
  {
    id: 'COLOR',
    label: 'COLOR',
    num: '07',
    title: 'CINE FRAMING & 3D LUTS',
    desc: 'Optical camera framing, 3D LUT grading emulation, pan and tilt optical adjustments.',
    tag: 'OPTICS',
    statusText: 'RIG CALIBRATED',
    stats: [
      { label: 'CAMERA BODY', value: 'ARRI RAW 14-BIT' },
      { label: 'GLASS PROFILE', value: '35mm Master Prime f/1.4' },
      { label: 'SENSOR GATE', value: 'Full-Frame Cine' },
      { label: 'LUT SUITE', value: '15 Hollywood Emulations' }
    ],
    icon: Palette,
    proOnly: true
  },
  {
    id: 'SOUND',
    label: 'SOUND',
    num: '08',
    title: 'DSP AUDIO & MULTI-STEM',
    desc: 'Audio waveform analysis, beat detection, volume faders, master sonic cues.',
    tag: 'AUDIO',
    statusText: 'DSP ONLINE',
    stats: [
      { label: 'SAMPLE RATE', value: '48.0 kHz 32-Bit DSP' },
      { label: 'STEMS', value: 'Dialogue, Score, SFX' },
      { label: 'DETECTION', value: 'Live Transient Beat Grid' },
      { label: 'LATENCY', value: '<2.1ms WebAudio Buffer' }
    ],
    icon: Volume2,
    proOnly: true
  },
  {
    id: 'PREVIS',
    label: 'PREVIS',
    num: '09',
    title: '3D PREVIS & SPATIAL STAGE',
    desc: 'Spatial camera blocking, lens focal length simulation, Three.js set staging.',
    tag: '3D ENGINE',
    statusText: 'SPATIAL READY',
    stats: [
      { label: 'RENDERER', value: 'Three.js WebGL 2.0' },
      { label: 'BLOCKING', value: 'Director Dolly & Crane' },
      { label: 'LENS FOV', value: '35mm Cine Perspective' },
      { label: 'STAGING', value: 'Real-Time Spatial Depth' }
    ],
    icon: Box,
    proOnly: true
  },
  {
    id: 'PRODUCTION',
    label: 'PROD',
    num: '10',
    title: 'CALL SHEETS & SCHEDULES',
    desc: 'Shooting day-blocks, talent and crew calls, gear checklists, location notes.',
    tag: 'LOGISTICS',
    statusText: 'CALL SHEET v1.4',
    stats: [
      { label: 'SCHEDULE', value: '4 Day-Blocks // 100 Setups' },
      { label: 'DEPARTMENTS', value: 'Camera, Sound, G&E, Art' },
      { label: 'CALL TIME', value: '06:00 AM // 12h Turnaround' },
      { label: 'DISPATCH', value: 'Hollywood Standard PDF' }
    ],
    icon: FileSpreadsheet,
    proOnly: true
  },
  {
    id: 'REVIEW',
    label: 'REVIEW',
    num: '11',
    title: 'FRAME MARKUP & REVIEW',
    desc: 'Timestamped drawing pins, director notes, client approval export links.',
    tag: 'FEEDBACK',
    statusText: 'PIN ENGINE READY',
    stats: [
      { label: 'MARKUP', value: 'Vector Pins & Pen Overlays' },
      { label: 'TIMECODE', value: 'Frame-Accurate Comments' },
      { label: 'GATES', value: 'Director & Client Sign-Off' },
      { label: 'EXPORT', value: 'Timestamped Review Link' }
    ],
    icon: MessageSquare,
    proOnly: true
  },
  {
    id: 'EXPORT',
    label: 'EXPORT',
    num: '12',
    title: 'MASTER VIDEO RENDER',
    desc: 'WebCodecs hardware MP4 render, burned-in cinematic titles, Premiere XML.',
    tag: 'DELIVERY',
    statusText: 'RENDER READY',
    stats: [
      { label: 'ENCODER', value: 'WebCodecs HW Accelerated' },
      { label: 'FORMATS', value: 'MP4 / ProRes / XML' },
      { label: 'COLOR SPACE', value: 'Rec.709 100-Shot Master' },
      { label: 'AUDIO BITRATE', value: '320 kbps AAC Stereo' }
    ],
    icon: Download
  },
  {
    id: 'LIBRARY',
    label: 'LIBRARY',
    num: '13',
    title: 'CINEMATIC PRESETS & LUTS',
    desc: 'Anamorphic flare profiles, typography styling presets, SFX library.',
    tag: 'ASSETS',
    statusText: 'REGISTRY LOADED',
    stats: [
      { label: 'COLOR LUTS', value: '15 Master Film Emulations' },
      { label: 'TYPOGRAPHY', value: '8 Golden Title Templates' },
      { label: 'SFX STEMS', value: '24 Cinematic Audio Cuts' },
      { label: 'CINE RIGS', value: '5 Hollywood Camera Bodies' }
    ],
    icon: Library,
    proOnly: true
  },
  {
    id: 'AI',
    label: 'AI LAB',
    num: '14',
    title: 'GEMINI CINE PROMPT STUDIO',
    desc: 'Veo and Flow cinematography prompt builder, visual style consistency engine.',
    tag: 'INTELLIGENCE',
    statusText: 'GEMINI 2.5 READY',
    stats: [
      { label: 'CINE MODEL', value: 'Veo 2 & Flow Formulations' },
      { label: 'LIGHTING LOCK', value: 'Consistent Style Matrix' },
      { label: 'OPTICAL CUES', value: 'Camera Angles & Lenses' },
      { label: 'SEED MATRIX', value: 'Deterministic Seed 42' }
    ],
    icon: Sparkles,
    proOnly: true
  },
  {
    id: 'SETTINGS',
    label: 'SETTINGS',
    num: '15',
    title: 'SYSTEM PREFERENCES',
    desc: 'WebGL hardware acceleration, storage quotas, keyboard shortcuts manager.',
    tag: 'CONFIG',
    statusText: 'SYSTEM OPTIMAL',
    stats: [
      { label: 'GRAPHICS', value: 'WebGL 2.0 Accelerated' },
      { label: 'BUFFER', value: '120 FPS Pacing Engine' },
      { label: 'QUOTA', value: 'IndexedDB > 10 GB Safe' },
      { label: 'HOTKEYS', value: 'Full J-K-L + Cinema Map' }
    ],
    icon: Settings
  }
];

const presets: WorkspacePreset[] = [
  'Director',
  'Writer',
  'Storyboarder',
  'Editor',
  'Colorist',
  'Sound',
  'Producer',
  'Review',
  'Presenter',
  'Minimal'
];

export const LeftRail: React.FC = () => {
  const {
    activeModule,
    setActiveModule,
    isProMode,
    isLeftRailExpanded,
    toggleLeftRail,
    workspacePreset,
    setWorkspacePreset
  } = useStudioStore();

  const [hoveredData, setHoveredData] = React.useState<{
    data: {
      num: string;
      label: string;
      title: string;
      desc: string;
      tag: string;
      statusText: string;
      stats: { label: string; value: string }[];
      isActive: boolean;
      proOnly?: boolean;
    };
    top: number;
    left: number;
  } | null>(null);

  const handleMouseEnterButton = (
    e: React.MouseEvent<HTMLElement>,
    data: {
      num: string;
      label: string;
      title: string;
      desc: string;
      tag: string;
      statusText: string;
      stats: { label: string; value: string }[];
      isActive: boolean;
      proOnly?: boolean;
    }
  ) => {
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

  const filteredModules = modules.filter(m => isProMode || !m.proOnly);

  return (
    <aside 
      className={`h-full bg-[#07070b]/98 border-r border-[#1c1c28] flex flex-col justify-between transition-all duration-200 select-none z-30 font-mono-tech relative ${
        isLeftRailExpanded ? 'w-60 sm:w-64' : 'w-[72px]'
      }`}
    >
      {/* Top Header */}
      <div className="shrink-0 p-2 border-b border-[#1c1c28] bg-[#0a0a10] flex items-center justify-between">
        {isLeftRailExpanded && (
          <div className="flex items-center gap-1.5 min-w-0 pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] shadow-[0_0_8px_#fbbf24]" />
            <span className="text-[10px] font-black text-zinc-200 uppercase tracking-widest truncate">
              HANDFILM
            </span>
          </div>
        )}
        <button
          onClick={toggleLeftRail}
          className={`w-7 h-7 rounded-[4px] bg-[#14141e] hover:bg-[#1e1e2d] border border-white/10 hover:border-[#fbbf24] text-zinc-400 hover:text-[#fbbf24] flex items-center justify-center cursor-pointer transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_2px_4px_rgba(0,0,0,0.5)] active:scale-95 ${
            isLeftRailExpanded ? '' : 'mx-auto'
          }`}
          title={isLeftRailExpanded ? 'Collapse Navigation Rail' : 'Expand Navigation Rail'}
          aria-label={isLeftRailExpanded ? 'Collapse Navigation Rail' : 'Expand Navigation Rail'}
        >
          {isLeftRailExpanded ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Module Buttons: 3D Chiseled Obsidian Neomorphic Tiles with Inset Shadows */}
      <div 
        onScroll={() => setHoveredData(null)}
        className="flex-1 flex flex-col items-center gap-2 py-2.5 px-2 overflow-y-auto no-scrollbar"
      >
        {filteredModules.map((m) => {
          const Icon = m.icon;
          const isActive = activeModule === m.id;

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveModule(m.id)}
              onMouseEnter={(e) =>
                handleMouseEnterButton(e, {
                  num: m.num,
                  label: m.label,
                  title: m.title,
                  desc: m.desc,
                  tag: m.tag,
                  statusText: m.statusText,
                  stats: m.stats,
                  isActive,
                  proOnly: m.proOnly
                })
              }
              onMouseLeave={handleMouseLeaveButton}
              aria-label={`Module ${m.num}: ${m.label}`}
              className={`group relative rounded-[4px] cursor-pointer transition-all duration-150 select-none active:translate-y-0.5 ${
                isLeftRailExpanded
                  ? 'w-full px-3 py-2 flex items-center gap-3'
                  : 'w-12 h-12 flex items-center justify-center'
              } ${
                isActive
                  ? 'bg-gradient-to-b from-[#2a2214] via-[#1a150b] to-[#0f0c05] border border-[#d4af37] shadow-[inset_0_1.5px_3px_rgba(251,191,36,0.4),inset_0_-1px_3px_rgba(0,0,0,0.95),0_0_14px_rgba(245,166,35,0.35)]'
                  : 'bg-gradient-to-b from-[#1c1c28] via-[#13131d] to-[#0b0b12] border border-white/10 hover:border-[#d4af37]/70 hover:from-[#252538] hover:to-[#12121e] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.16),inset_0_-1.5px_3px_rgba(0,0,0,0.95),0_2px_5px_rgba(0,0,0,0.65)]'
              }`}
            >
              {/* Active Golden Edge Accent */}
              {isActive && (
                <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#fbbf24] rounded-r shadow-[0_0_8px_#fbbf24]" />
              )}

              {/* Prominent Module Icon */}
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                  isActive
                    ? 'text-[#fbbf24] drop-shadow-[0_0_8px_rgba(245,166,35,0.85)]'
                    : 'text-zinc-400 group-hover:text-amber-300'
                }`}
              />

              {/* Micro Corner Number in Slim Mode */}
              {!isLeftRailExpanded && (
                <span
                  className={`absolute bottom-0.5 right-1 text-[7.5px] font-mono tracking-tighter select-none transition-colors ${
                    isActive
                      ? 'text-[#fbbf24] font-black'
                      : 'text-zinc-500/70 group-hover:text-amber-400/90'
                  }`}
                >
                  {m.num}
                </span>
              )}

              {/* Expanded Mode Text */}
              {isLeftRailExpanded && (
                <div className="min-w-0 text-left flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold ${
                        isActive
                          ? 'bg-[#d4af37] text-black'
                          : 'bg-white/5 text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    >
                      {m.num}
                    </span>
                    <span
                      className={`text-[10px] font-black tracking-wider truncate uppercase ${
                        isActive ? 'text-[#fbbf24]' : 'text-zinc-200'
                      }`}
                    >
                      {m.label}
                    </span>
                  </div>
                  <div className="text-[8px] text-zinc-500 truncate leading-tight group-hover:text-zinc-400 mt-0.5">
                    {m.desc}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Presets & Controls: Chiseled Obsidian Finish */}
      <div className="shrink-0 p-2 border-t border-[#1c1c28] bg-[#0a0a10] flex flex-col gap-1.5">
        {isLeftRailExpanded && (
          <div className="flex flex-col gap-1 mb-1">
            <span className="text-[9px] font-mono text-[#fbbf24] font-bold uppercase tracking-wider">
              WORKSPACE PRESET
            </span>
            <select
              value={workspacePreset}
              onChange={(e) => setWorkspacePreset(e.target.value as WorkspacePreset)}
              className="bg-[#14141e] border border-white/15 text-zinc-200 text-[10px] font-mono rounded-[3px] px-2 py-1 outline-none hover:border-[#fbbf24] transition-colors"
            >
              {presets.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Dynamic Floating Hover Card - Rendered unclipped at viewport root */}
      {hoveredData && (
        <div
          style={{
            top: `${hoveredData.top}px`,
            left: `${hoveredData.left}px`,
            transform: 'translateY(-50%)'
          }}
          className="fixed w-80 p-3.5 bg-[#0a0a14]/98 border border-[#d4af37]/70 rounded-[5px] shadow-[0_20px_50px_rgba(0,0,0,0.98),0_0_24px_rgba(245,166,35,0.22)] backdrop-blur-2xl pointer-events-none z-[9999] text-left font-mono select-none animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Connector Arrow */}
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#0a0a14] border-l border-b border-[#d4af37]/70 rotate-45" />

          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[9.5px] font-bold uppercase">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#fbbf24] shadow-[0_0_8px_#fbbf24]" />
              <span className="text-[#fbbf24]">
                {hoveredData.data.num} // {hoveredData.data.label}
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
                <span className="text-[7.5px] px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded font-semibold tracking-wider">
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
                <span className="text-[#fbbf24] font-black">//</span> USAGE & ENGINE TELEMETRY
              </span>
              <span className="text-[#fbbf24]">{hoveredData.data.statusText}</span>
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
              <span className="text-[#fbbf24]">▶</span>{' '}
              {hoveredData.data.isActive ? 'CURRENTLY ACTIVE MODULE' : 'CLICK TO ACTIVATE'}
            </span>
            <span className="text-[#fbbf24] font-bold tracking-wider">
              {hoveredData.data.proOnly ? 'PRO SUITE' : 'HANDFILM STANDARD'}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
