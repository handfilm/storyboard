/**
 * @file /src/components/LeftRail.tsx
 * @description Futuristic Dual-Column Studio Navigation Rail (Inspired by Google Flow).
 * Provides quick 1-tap access to STORY, MEDIA, TITLES, SOUND, PLAYER, PRODUCTION,
 * REVIEW, LIBRARY, AI, BOARD, and CUT with glowing active indicator cards.
 */

import React from 'react';
import { 
  Home,
  LayoutGrid, 
  Image as ImageIcon, 
  User, 
  Clapperboard, 
  Upload, 
  Folder, 
  Sparkles, 
  Trash2, 
  Wand2, 
  Film, 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  Type, 
  Sliders, 
  Volume2, 
  PlaySquare, 
  ClipboardList, 
  PenTool, 
  Download, 
  Crop, 
  Settings,
  Scissors,
  Cloud
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

interface LeftRailProps {
  activeModule: StudioModuleId;
  onSelectModule: (module: StudioModuleId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isProMode: boolean;
}

export const LeftRail: React.FC<LeftRailProps> = ({
  activeModule,
  onSelectModule,
  isCollapsed,
  onToggleCollapse,
  isProMode
}) => {
  return (
    <aside className="h-full flex select-none z-30 shrink-0 bg-[#050508] border-r border-white/10 font-mono-tech">
      {/* Primary Slim Outer Strip */}
      <div className="w-12 sm:w-13 h-full bg-[#030305] border-r border-white/10 flex flex-col items-center justify-between py-2 shrink-0">
        <div className="flex flex-col items-center gap-1.5 overflow-y-auto no-scrollbar w-full px-1">
          {/* Top Primary Home / Stage Button */}
          <button
            onClick={() => onSelectModule('PLAYER')}
            className={`w-9 h-9 rounded-[4px] flex items-center justify-center cursor-pointer transition-all ${
              activeModule === 'PLAYER'
                ? 'bg-[#E5A919] text-black font-bold shadow-[0_0_12px_rgba(229,169,25,0.45)]'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            title="STAGE (HOME) — Return to Cinematic Viewport"
          >
            <Home className="w-4 h-4" />
          </button>

          {/* Bloom Interactive Canvas Sequencer */}
          <button
            onClick={() => onSelectModule('BLOOM')}
            className={`w-9 h-9 rounded-[4px] flex items-center justify-center cursor-pointer transition-all ${
              activeModule === 'BLOOM'
                ? 'bg-rose-500 text-black font-bold shadow-[0_0_12px_rgba(244,63,94,0.55)]'
                : 'text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/20'
            }`}
            title="BLOOM Interactive Canvas (Fluid Stage & Magnetic Snap Sequencer)"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Top Primary Categories */}
          <button
            onClick={() => onSelectModule('BOARD')}
            className={`w-9 h-9 rounded-[4px] flex items-center justify-center cursor-pointer transition-all ${
              activeModule === 'BOARD'
                ? 'bg-[#D4AF37]/20 border border-[#D4AF37] text-[#FFE066] shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Storyboard Engines (BOARD)"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectModule('MEDIA')}
            className={`w-9 h-9 rounded-[4px] flex items-center justify-center cursor-pointer transition-all ${
              activeModule === 'MEDIA'
                ? 'bg-[#D4AF37]/20 border border-[#D4AF37] text-[#FFE066] shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="4K Media Library & Ingestion (MEDIA)"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectModule('PRODUCTION')}
            className={`w-9 h-9 rounded-[4px] flex items-center justify-center cursor-pointer transition-all ${
              activeModule === 'PRODUCTION'
                ? 'bg-[#D4AF37]/20 border border-[#D4AF37] text-[#FFE066] shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Production Call Sheets & Clapper"
          >
            <Clapperboard className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectModule('MEDIA')}
            className="w-9 h-9 rounded-[4px] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
            title="Ingest Media Asset"
          >
            <Upload className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectModule('LIBRARY')}
            className={`w-9 h-9 rounded-[4px] flex items-center justify-center cursor-pointer transition-all ${
              activeModule === 'LIBRARY'
                ? 'bg-[#D4AF37]/20 border border-[#D4AF37] text-[#FFE066] shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Project Vault & Folders"
          >
            <Folder className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectModule('AI')}
            className={`w-9 h-9 rounded-[4px] flex items-center justify-center cursor-pointer transition-all ${
              activeModule === 'AI'
                ? 'bg-[#D4AF37]/20 border border-[#D4AF37] text-[#FFE066] shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Flow AI & Multimodal Director"
          >
            <Sparkles className="w-4 h-4 text-[#FFE066]" />
          </button>
        </div>

        {/* Bottom Apps & Logo */}
        <div className="flex flex-col items-center gap-2 pt-2 border-t border-white/10 w-full px-1">
          <div 
            className="w-7 h-7 rounded-[5px] bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center shadow-[0_0_10px_rgba(34,197,94,0.4)] cursor-pointer"
            title="RAWx Storyboard Studio"
          >
            <Film className="w-3.5 h-3.5 text-black font-black" />
          </div>

          <button
            onClick={() => onSelectModule('AI')}
            className="w-9 h-9 rounded-[4px] flex items-center justify-center text-white/50 hover:text-[#FFE066] hover:bg-white/5 cursor-pointer transition-colors"
            title="Creative Magic Prompt"
          >
            <Wand2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectModule('EDIT/CUT')}
            className={`w-9 h-9 rounded-[4px] flex items-center justify-center cursor-pointer transition-all ${
              activeModule === 'EDIT/CUT'
                ? 'bg-[#D4AF37]/20 border border-[#D4AF37] text-[#FFE066]'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="CapCut Multi-Track Video Editor"
          >
            <Film className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectModule('R2_STORAGE')}
            className={`w-9 h-9 rounded-[4px] flex items-center justify-center cursor-pointer transition-all ${
              activeModule === 'R2_STORAGE'
                ? 'bg-rose-950/60 border border-rose-500 text-rose-300'
                : 'text-white/50 hover:text-rose-400 hover:bg-white/5'
            }`}
            title="Cloudflare R2 Zero-Egress Storage & Automation Engine"
          >
            <Cloud className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Secondary Sub-Tools Strip (Matches Google Flow layout) */}
      {!isCollapsed && (
        <div className="w-12 sm:w-13 h-full bg-[#08080C]/90 flex flex-col justify-between py-2 border-r border-white/10">
          <div className="flex flex-col items-center gap-1 overflow-y-auto no-scrollbar w-full px-1">
            {/* Collapse toggle header with gold dot */}
            <button
              onClick={onToggleCollapse}
              className="w-9 h-6 flex items-center justify-center gap-1 text-white/40 hover:text-[#FFE066] cursor-pointer"
              title="Collapse Tools Rail"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5A919]" />
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Sub-tools list */}
            <button
              onClick={() => onSelectModule('STORY')}
              className={`w-9 h-9 rounded-[3px] flex items-center justify-center cursor-pointer transition-all ${
                activeModule === 'STORY'
                  ? 'bg-[#E5A919]/25 border border-[#E5A919] text-[#FFE066] shadow-[0_0_8px_rgba(229,169,25,0.4)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title="Story & Screenplay Notebook"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectModule('LIBRARY')}
              className={`w-9 h-9 rounded-[3px] flex items-center justify-center cursor-pointer transition-all ${
                activeModule === 'LIBRARY'
                  ? 'bg-[#E5A919]/25 border border-[#E5A919] text-[#FFE066]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title="Folder Vault & Presets"
            >
              <Folder className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectModule('BOARD')}
              className={`w-9 h-9 rounded-[3px] flex items-center justify-center cursor-pointer transition-all ${
                activeModule === 'BOARD'
                  ? 'border-2 border-[#E5A919] text-[#E5A919] bg-[#E5A919]/20 shadow-[0_0_12px_rgba(229,169,25,0.5)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title="100-Shot Storyboard Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectModule('TEXT')}
              className={`w-9 h-9 rounded-[3px] flex items-center justify-center cursor-pointer transition-all ${
                activeModule === 'TEXT'
                  ? 'bg-[#E5A919]/25 border border-[#E5A919] text-[#FFE066] shadow-[0_0_8px_rgba(229,169,25,0.4)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title="Super Titles & Kinetic Typography"
            >
              <Type className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectModule('OPTICS')}
              className={`w-9 h-9 rounded-[3px] flex items-center justify-center cursor-pointer transition-all ${
                activeModule === 'OPTICS'
                  ? 'bg-[#E5A919]/25 border border-[#E5A919] text-[#FFE066]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title="Optical Sliders & Lens Inspector"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectModule('SOUND')}
              className={`w-9 h-9 rounded-[3px] flex items-center justify-center cursor-pointer transition-all ${
                activeModule === 'SOUND'
                  ? 'bg-[#E5A919]/25 border border-[#E5A919] text-[#FFE066]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title="Web Audio Synthesizer & 43.6Hz Sub Drone"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectModule('PLAYER')}
              className={`w-9 h-9 rounded-[3px] flex items-center justify-center cursor-pointer transition-all ${
                activeModule === 'PLAYER'
                  ? 'bg-[#E5A919]/25 border border-[#E5A919] text-[#FFE066]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title="Animatic Player & Previs"
            >
              <PlaySquare className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectModule('PRODUCTION')}
              className={`w-9 h-9 rounded-[3px] flex items-center justify-center cursor-pointer transition-all ${
                activeModule === 'PRODUCTION'
                  ? 'bg-[#E5A919]/25 border border-[#E5A919] text-[#FFE066]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title="Screenplay Breakdown & Call Sheets"
            >
              <ClipboardList className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectModule('REVIEW')}
              className={`w-9 h-9 rounded-[3px] flex items-center justify-center cursor-pointer transition-all ${
                activeModule === 'REVIEW'
                  ? 'bg-[#E5A919]/25 border border-[#E5A919] text-[#FFE066]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title="Review & Annotations"
            >
              <PenTool className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectModule('EXPORT')}
              className="w-9 h-9 rounded-[3px] flex items-center justify-center text-white/60 hover:text-[#FFE066] hover:bg-white/5 cursor-pointer transition-colors"
              title="Export Hollywood Interchange (OTIO, EDL, Fountain, SRT, CSV)"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectModule('LIQUIFY')}
              className="w-9 h-9 rounded-[3px] flex items-center justify-center text-white/60 hover:text-[#FFE066] hover:bg-white/5 cursor-pointer transition-colors"
              title="Crop & Liquify Mesh Warp"
            >
              <Crop className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectModule('AI')}
              className="w-9 h-9 rounded-[3px] flex items-center justify-center text-[#FFE066]/80 hover:text-[#FFE066] hover:bg-white/5 cursor-pointer transition-colors"
              title="Gemini Flow AI Studio"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectModule('EDIT/CUT')}
              className="w-9 h-9 rounded-[3px] flex items-center justify-center text-white/60 hover:text-[#FFE066] hover:bg-white/5 cursor-pointer transition-colors"
              title="Multi-Track Sequence Editor"
            >
              <Scissors className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-1 border-t border-white/10 pt-2 px-1">
            <button
              onClick={() => onSelectModule('SETTINGS')}
              className="w-9 h-9 rounded-[3px] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
              title="Settings & Appearance"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
