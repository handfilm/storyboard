/**
 * @file /src/components/StudioDrawer.tsx
 * @description Master Dockable Studio Drawer for HANDFILM Creative Suite.
 * Overhauls the bottom 6 studio modules (10 PRODUCTION, 11 REVIEW, 12 AI DIRECTOR, 13 CLOUD & R2, 14 LIBRARY, 15 SETTINGS)
 * with tactile cyberpunk glassmorphism and the required slide-over container:
 * w-[420px] md:w-[480px] bg-[#0c0d10]/95 backdrop-blur-2xl border-r border-[#F5A623]/30 p-5 flex flex-col h-full overflow-y-auto space-y-6 text-white
 */

import React from 'react';
import { StudioModuleId } from './StudioNavRail';
import { StoryNotebook } from '../features/story/StoryNotebook';
import { MediaStudio } from '../features/media/MediaStudio';
import { TextStudio } from '../features/text/TextStudio';
import { SoundStudio } from '../features/sound/SoundStudio';
import { PrevisStudio } from '../features/previs/PrevisStudio';
import { PhotoLiquifySuite } from './PhotoLiquifySuite';
import { DirectorInspector } from './DirectorInspector';
import { ProductionSlidePanel } from '../features/production/ProductionSlidePanel';
import { ReviewSlidePanel } from '../features/review/ReviewSlidePanel';
import { AIDirectorSlidePanel } from '../features/ai/AIDirectorSlidePanel';
import { CloudR2SlidePanel } from '../features/cloud/CloudR2SlidePanel';
import { LibrarySlidePanel } from '../features/library/LibrarySlidePanel';
import { SettingsSlidePanel } from '../features/settings/SettingsSlidePanel';
import { AnthologyFrame, AspectRatio, LutPreset } from '../types/anthology';
import { 
  X, 
  BookOpen, 
  Image as ImageIcon, 
  Type, 
  Volume2, 
  PlaySquare, 
  Clapperboard, 
  MessageSquare, 
  Library, 
  Sparkles, 
  Sliders, 
  Cloud, 
  Wand2,
  Settings
} from 'lucide-react';

interface StudioDrawerProps {
  isOpen: boolean;
  activeModule: StudioModuleId;
  currentFrame: AnthologyFrame;
  onUpdateFrame: (updated: AnthologyFrame) => void;
  onClose: () => void;
  onOpenAnimatic?: () => void;
  onOpenLiquify?: () => void;
  onSelectFrame?: (index: number) => void;
  onJumpToFrame?: (shotIndex: number, timeSec: number) => void;
  currentIndex?: number;
  slideTimeSec?: number;
  aspectRatio?: AspectRatio | string;
  onChangeAspectRatio?: (aspect: AspectRatio) => void;
  onPreviewLut?: (lut: LutPreset | null) => void;
  onOpenMultiCam?: () => void;
}

export const StudioDrawer: React.FC<StudioDrawerProps> = ({
  isOpen,
  activeModule,
  currentFrame,
  onUpdateFrame,
  onClose,
  onOpenAnimatic,
  onOpenLiquify,
  onSelectFrame,
  onJumpToFrame,
  currentIndex = 0,
  slideTimeSec = 0,
  aspectRatio = '2.39:1',
  onChangeAspectRatio,
  onPreviewLut,
  onOpenMultiCam
}) => {
  if (!isOpen) return null;

  const isBottomSix = [
    'PRODUCTION',
    'REVIEW',
    'AI',
    'R2_STORAGE',
    'LIBRARY',
    'SETTINGS'
  ].includes(activeModule);

  const getModuleMeta = () => {
    switch (activeModule) {
      case 'PRODUCTION':
        return {
          title: '10 PRODUCTION // SHOOT PLANNER',
          subtitle: 'Interactive Shoot Planner & Call Sheet',
          icon: Clapperboard,
          badge: 'DAY BOARD'
        };
      case 'REVIEW':
        return {
          title: '11 REVIEW // FRAME MARKUP',
          subtitle: 'Frame-Accurate Video Markup & Client Notes',
          icon: MessageSquare,
          badge: 'CLIENT ANNOTATION'
        };
      case 'AI':
        return {
          title: '12 AI DIRECTOR // PROMPT MATRIX',
          subtitle: 'Visual Cine Prompt Engine & Consistency Matrix',
          icon: Sparkles,
          badge: 'VEO / FLOW'
        };
      case 'R2_STORAGE':
        return {
          title: '13 CLOUD & R2 // VAULT SYNC',
          subtitle: 'Zero-Config Bucket Streaming & Vault Sync',
          icon: Cloud,
          badge: 'S3 ARCHIVE'
        };
      case 'LIBRARY':
        return {
          title: '14 LIBRARY // ASSETS & LOOKS',
          subtitle: 'Asset Presets, Sound FX & Typography',
          icon: Library,
          badge: 'PRESETS & SFX'
        };
      case 'SETTINGS':
        return {
          title: '15 SETTINGS // TELEMETRY',
          subtitle: 'Hardware Acceleration & Storage Quota',
          icon: Settings,
          badge: 'WEBCODECS'
        };
      case 'STORY':
        return {
          title: '02 STORY NOTEBOOK',
          subtitle: 'Scene Beats, Screenplay & AI Copilot',
          icon: BookOpen,
          badge: 'SCREENPLAY'
        };
      case 'MEDIA':
        return {
          title: '03 MEDIA ASSET VAULT',
          subtitle: '4K Footage, Presets & Ingestion',
          icon: ImageIcon,
          badge: 'INGEST'
        };
      case 'TEXT':
        return {
          title: '06 SUPER TITLE STUDIO',
          subtitle: 'Kinetic Typography & Glowing Subtitles',
          icon: Type,
          badge: 'TYPOGRAPHY'
        };
      case 'SOUND':
        return {
          title: '08 SOUND STUDIO & DSP',
          subtitle: '43.6Hz Sub Drone & Web Audio Synth',
          icon: Volume2,
          badge: 'DSP SYNTH'
        };
      case 'PLAYER':
        return {
          title: '01 ANIMATIC PREVIS PLAYER',
          subtitle: 'J-K-L Jog Shuttle & Loop Transport',
          icon: PlaySquare,
          badge: 'TRANSPORT'
        };
      case 'LIQUIFY':
        return {
          title: '09 PHOTO EDIT & BULK RESIZER',
          subtitle: 'Liquify Warp Suite & Batch Resizer',
          icon: Wand2,
          badge: 'PHOTO SUITE'
        };
      default:
        return {
          title: '07 EDIT & CAM',
          subtitle: '3D Virtual Rig & Optics Rack',
          icon: Sliders,
          badge: 'OPTICS'
        };
    }
  };

  const meta = getModuleMeta();
  const Icon = meta.icon;

  // Use the exact required container styling for modules 10-15
  if (isBottomSix) {
    return (
      <aside 
        aria-label="Studio Slide-Over Panel"
        className="w-[420px] md:w-[480px] bg-[#0c0d10]/95 backdrop-blur-2xl border-r border-[#F5A623]/30 p-5 flex flex-col h-full overflow-y-auto space-y-6 text-white shrink-0 z-40 select-none animate-in slide-in-from-left duration-200 custom-scrollbar shadow-[0_0_50px_rgba(0,0,0,0.9)]"
      >
        {/* Slide-Over Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F5A623]/20 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-[#F5A623]/15 border border-[#F5A623]/50 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(245,166,35,0.25)]">
              <Icon className="w-4 h-4 text-[#F5A623]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-mono-tech text-xs font-bold text-white tracking-wider truncate">
                  {meta.title}
                </h3>
              </div>
              <p className="text-[9px] text-zinc-400 font-mono-tech truncate mt-0.5">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[8px] px-1.5 py-0.5 bg-[#F5A623]/15 border border-[#F5A623]/40 text-[#F5A623] font-mono-tech rounded font-bold uppercase tracking-wider">
              {meta.badge}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition-colors border border-white/10"
              title="Close Slide-Over (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slide-Over Body Container */}
        <div className="flex-1 space-y-6">
          {activeModule === 'PRODUCTION' && (
            <ProductionSlidePanel
              onSelectFrame={onSelectFrame}
              currentIndex={currentIndex}
            />
          )}

          {activeModule === 'REVIEW' && (
            <ReviewSlidePanel
              onJumpToFrame={onJumpToFrame}
              activeShotIndex={currentIndex}
              slideTimeSec={slideTimeSec}
            />
          )}

          {activeModule === 'AI' && (
            <AIDirectorSlidePanel />
          )}

          {activeModule === 'R2_STORAGE' && (
            <CloudR2SlidePanel />
          )}

          {activeModule === 'LIBRARY' && (
            <LibrarySlidePanel
              currentFrame={currentFrame}
              onUpdateFrame={onUpdateFrame}
              onPreviewLut={onPreviewLut}
            />
          )}

          {activeModule === 'SETTINGS' && (
            <SettingsSlidePanel
              currentAspectRatio={aspectRatio}
              onChangeAspectRatio={onChangeAspectRatio}
            />
          )}
        </div>
      </aside>
    );
  }

  // Fallback for modules 01-09
  return (
    <div className="w-[420px] sm:w-[480px] xl:w-[560px] h-full bg-[#0a0a10]/98 border-r border-[#272732] shadow-[0_0_50px_rgba(0,0,0,0.95)] flex flex-col z-30 shrink-0 select-none overflow-hidden backdrop-blur-2xl animate-in slide-in-from-left duration-200">
      {/* Drawer Header */}
      <div className="h-12 bg-[#0c0c10] border-b border-[#272732] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-[2px] bg-[#d4af37]/15 border border-[#d4af37]/50 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-[#fbbf24]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-cinzel text-xs font-bold text-white tracking-[0.16em] truncate">
                {meta.title}
              </h3>
              <span className="text-[7.5px] px-1.5 py-0.2 bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#fbbf24] font-mono-tech rounded-[1px] shrink-0 font-bold">
                {meta.badge}
              </span>
            </div>
            <p className="text-[8.5px] text-zinc-400 font-mono-tech truncate">
              {meta.subtitle}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {activeModule === 'OPTICS' && onOpenMultiCam && (
            <button
              type="button"
              onClick={onOpenMultiCam}
              className="px-2 py-1 bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/35 hover:to-amber-600/35 border border-[#F5A623]/70 text-[#F5A623] hover:text-white font-mono text-[9px] font-bold rounded flex items-center gap-1 transition-all shadow-sm cursor-pointer active:scale-95"
              title="⊞ Multi-Cam Angle Grid (CapCut Mode) (Shift+M)"
            >
              <span>⊞</span>
              <span className="hidden sm:inline">Multi-Cam Grid</span>
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-[1px] bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition-colors border border-[#272732]"
            title="Close Panel (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Drawer Body Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {activeModule === 'STORY' && <StoryNotebook />}
        {activeModule === 'MEDIA' && <MediaStudio />}
        {activeModule === 'TEXT' && <TextStudio currentFrame={currentFrame} onUpdateFrame={onUpdateFrame} />}
        {activeModule === 'SOUND' && <SoundStudio />}
        {activeModule === 'PLAYER' && <PrevisStudio />}
        {activeModule === 'LIQUIFY' && (
          <PhotoLiquifySuite
            isOpen={true}
            frame={currentFrame}
            onClose={onClose}
            onApplyWarp={(warpedUrl) => onUpdateFrame({ ...currentFrame, imageUrl: warpedUrl })}
          />
        )}
        {activeModule !== 'STORY' && 
         activeModule !== 'MEDIA' && 
         activeModule !== 'TEXT' && 
         activeModule !== 'SOUND' && 
         activeModule !== 'PLAYER' && 
         activeModule !== 'LIQUIFY' && (
          <DirectorInspector
            frame={currentFrame}
            onUpdateFrame={onUpdateFrame}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};
