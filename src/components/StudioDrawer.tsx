/**
 * @file /src/components/StudioDrawer.tsx
 * @description Master Dockable Studio Drawer for HANDFILM Creative Suite.
 * Opens functional feature panels in Stage mode (Story, Media, Titles, Sound, Player,
 * Library, AI Director, Production, Review, Optics, Cloud & R2, Photo Edit) alongside the Cinema Monitor.
 */

import React from 'react';
import { StudioModuleId } from './StudioNavRail';
import { StoryNotebook } from '../features/story/StoryNotebook';
import { MediaStudio } from '../features/media/MediaStudio';
import { TextStudio } from '../features/text/TextStudio';
import { SoundStudio } from '../features/sound/SoundStudio';
import { PrevisStudio } from '../features/previs/PrevisStudio';
import { ProductionSuite } from './ProductionSuite';
import { ReviewPanel } from './ReviewPanel';
import { LibraryStudio } from '../features/library/LibraryStudio';
import { AIDirectorSuite } from './AIDirectorSuite';
import { CloudR2Sync } from './CloudR2Sync';
import { PhotoLiquifySuite } from './PhotoLiquifySuite';
import { DirectorInspector } from './DirectorInspector';
import { AnthologyFrame } from '../types/anthology';
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
  Wand2
} from 'lucide-react';

interface StudioDrawerProps {
  isOpen: boolean;
  activeModule: StudioModuleId;
  currentFrame: AnthologyFrame;
  onUpdateFrame: (updated: AnthologyFrame) => void;
  onClose: () => void;
  onOpenAnimatic?: () => void;
  onOpenLiquify?: () => void;
}

export const StudioDrawer: React.FC<StudioDrawerProps> = ({
  isOpen,
  activeModule,
  currentFrame,
  onUpdateFrame,
  onClose,
  onOpenAnimatic,
  onOpenLiquify
}) => {
  if (!isOpen) return null;

  const getModuleMeta = () => {
    switch (activeModule) {
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
      case 'PRODUCTION':
        return {
          title: '10 PRODUCTION & CALL SHEETS',
          subtitle: 'Day Schedules & Line-Item Budget',
          icon: Clapperboard,
          badge: 'HOLLYWOOD'
        };
      case 'REVIEW':
        return {
          title: '11 REVIEW & ANNOTATIONS',
          subtitle: 'Director Notes & Client Approvals',
          icon: MessageSquare,
          badge: 'COLLAB'
        };
      case 'AI':
        return {
          title: '12 AI CREATIVE DIRECTOR',
          subtitle: 'Gemini Cine & Veo Prompt Generator',
          icon: Sparkles,
          badge: 'FLOW AI'
        };
      case 'R2_STORAGE':
        return {
          title: '13 CLOUD & R2 ARCHIVE',
          subtitle: 'Cloudflare R2 & Byte-Range Streaming',
          icon: Cloud,
          badge: 'CLOUD R2'
        };
      case 'LIBRARY':
        return {
          title: '14 LOOK & LUT LIBRARY',
          subtitle: '3D Color Presets & Optics Catalog',
          icon: Library,
          badge: 'PRESETS'
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

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-[1px] bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition-colors border border-[#272732]"
          title="Close Panel (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
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
        {activeModule === 'PRODUCTION' && <ProductionSuite />}
        {activeModule === 'REVIEW' && <ReviewPanel />}
        {activeModule === 'AI' && <AIDirectorSuite />}
        {activeModule === 'R2_STORAGE' && <CloudR2Sync />}
        {activeModule === 'LIBRARY' && <LibraryStudio />}
        {activeModule !== 'STORY' && 
         activeModule !== 'MEDIA' && 
         activeModule !== 'TEXT' && 
         activeModule !== 'SOUND' && 
         activeModule !== 'PLAYER' && 
         activeModule !== 'LIQUIFY' &&
         activeModule !== 'PRODUCTION' && 
         activeModule !== 'REVIEW' && 
         activeModule !== 'AI' &&
         activeModule !== 'R2_STORAGE' &&
         activeModule !== 'LIBRARY' && (
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
