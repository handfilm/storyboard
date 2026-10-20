/**
 * @file /src/components/StudioDrawer.tsx
 * @description Futuristic Dockable Studio Drawer for RAWx Storyboard Studio.
 * Opens functional feature panels in Stage mode (Story, Media, Titles, Sound, Player,
 * Library, AI, Production, Review, Optics) alongside the Cinema Monitor.
 */

import React from 'react';
import { StudioModuleId } from './LeftRail';
import { StoryNotebook } from '../features/story/StoryNotebook';
import { MediaStudio } from '../features/media/MediaStudio';
import { TextStudio } from '../features/text/TextStudio';
import { SoundStudio } from '../features/sound/SoundStudio';
import { PrevisStudio } from '../features/previs/PrevisStudio';
import { ProductionStudio } from '../features/production/ProductionStudio';
import { ReviewStudio } from '../features/review/ReviewStudio';
import { LibraryStudio } from '../features/library/LibraryStudio';
import { AiStudio } from '../features/ai/AiStudio';
import { DirectorInspector } from './DirectorInspector';
import { AnthologyFrame } from '../types/anthology';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  BookOpen, 
  Image as ImageIcon, 
  Type, 
  Volume2, 
  PlaySquare, 
  Clapperboard, 
  MessageSquare, 
  Library, 
  Sparkles, 
  Sliders 
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
          title: 'STORY NOTEBOOK',
          subtitle: 'Scene Beats, Screenplay & Dialogue',
          icon: BookOpen,
          badge: 'SCREENPLAY'
        };
      case 'MEDIA':
        return {
          title: 'MEDIA ASSET VAULT',
          subtitle: '4K Footage, Presets & Ingestion',
          icon: ImageIcon,
          badge: 'INGEST'
        };
      case 'TEXT':
        return {
          title: 'SUPER TITLE STUDIO',
          subtitle: 'Kinetic Typography & Super Animations',
          icon: Type,
          badge: 'TYPOGRAPHY'
        };
      case 'SOUND':
        return {
          title: 'SOUND STUDIO & DSP',
          subtitle: '43.6Hz Sub Drone & Web Audio Synth',
          icon: Volume2,
          badge: 'DSP SYNTH'
        };
      case 'PLAYER':
        return {
          title: 'ANIMATIC PREVIS PLAYER',
          subtitle: 'J-K-L Jog Shuttle & Loop Transport',
          icon: PlaySquare,
          badge: 'TRANSPORT'
        };
      case 'PRODUCTION':
        return {
          title: 'PRODUCTION & CALL SHEETS',
          subtitle: 'Day Schedules & Line-Item Budget',
          icon: Clapperboard,
          badge: 'HOLLYWOOD'
        };
      case 'REVIEW':
        return {
          title: 'REVIEW & ANNOTATIONS',
          subtitle: 'Director Notes & Client Approvals',
          icon: MessageSquare,
          badge: 'COLLAB'
        };
      case 'LIBRARY':
        return {
          title: 'LOOK & LUT LIBRARY',
          subtitle: '3D Color Presets & Optics Catalog',
          icon: Library,
          badge: 'PRESETS'
        };
      case 'AI':
        return {
          title: 'AI CREATIVE DIRECTOR',
          subtitle: 'Multimodal Gemini & Flow Assistant',
          icon: Sparkles,
          badge: 'FLOW AI'
        };
      default:
        return {
          title: 'DIRECTOR INSPECTOR',
          subtitle: 'Optical Lens & Post FX Telemetry',
          icon: Sliders,
          badge: 'OPTICS'
        };
    }
  };

  const meta = getModuleMeta();
  const Icon = meta.icon;

  return (
    <div className="w-[380px] sm:w-[440px] xl:w-[480px] h-full bg-[#08080C]/98 border-r border-[#D4AF37]/30 shadow-2xl flex flex-col z-30 shrink-0 select-none overflow-hidden backdrop-blur-2xl animate-in slide-in-from-left duration-200">
      {/* Drawer Header */}
      <div className="h-12 bg-[#0C0C12] border-b border-white/10 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-[2px] bg-[#D4AF37]/15 border border-[#D4AF37]/50 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-[#FFE066]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-cinzel text-xs font-bold text-white tracking-wider truncate">
                {meta.title}
              </h3>
              <span className="text-[7.5px] px-1 py-0.2 bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#FFE066] font-mono-tech rounded-[1px] shrink-0 font-semibold">
                {meta.badge}
              </span>
            </div>
            <p className="text-[8.5px] text-white/50 font-mono-tech truncate">
              {meta.subtitle}
            </p>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-[1px] bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-pointer transition-colors border border-white/10"
          title="Close Panel (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Drawer Body Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {activeModule === 'STORY' && <StoryNotebook />}
        {activeModule === 'MEDIA' && <MediaStudio />}
        {activeModule === 'TEXT' && <TextStudio />}
        {activeModule === 'SOUND' && <SoundStudio />}
        {activeModule === 'PLAYER' && <PrevisStudio />}
        {activeModule === 'PRODUCTION' && <ProductionStudio />}
        {activeModule === 'REVIEW' && <ReviewStudio />}
        {activeModule === 'LIBRARY' && <LibraryStudio />}
        {activeModule === 'AI' && <AiStudio />}
        {activeModule !== 'STORY' && 
         activeModule !== 'MEDIA' && 
         activeModule !== 'TEXT' && 
         activeModule !== 'SOUND' && 
         activeModule !== 'PLAYER' && 
         activeModule !== 'PRODUCTION' && 
         activeModule !== 'REVIEW' && 
         activeModule !== 'LIBRARY' && 
         activeModule !== 'AI' && (
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
