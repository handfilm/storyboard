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
import { CapCutProSuitePanel, ProSuiteTab, CapCutProSuitePanelProps } from './stage/CapCutProSuitePanel';
import { CinemaBadgeHeader, CinemaToolHUD } from './ui/CinemaToolHUD';
import { eventBus } from '../core/eventBus';
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
  Settings,
  Zap,
  LayoutGrid
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
  onApplyStoryboardShots?: CapCutProSuitePanelProps['onApplyStoryboardShots'];
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
  onOpenMultiCam,
  onApplyStoryboardShots
}) => {
  const [showProSuite, setShowProSuite] = React.useState(false);
  const [proSuiteTab, setProSuiteTab] = React.useState<ProSuiteTab>('ai-captions');

  React.useEffect(() => {
    const unsub = eventBus.on('studio:open_pro_suite', (payload?: { tab?: ProSuiteTab }) => {
      if (payload?.tab) setProSuiteTab(payload.tab);
      setShowProSuite(true);
    });
    return () => unsub();
  }, []);

  React.useEffect(() => {
    setShowProSuite(false);
  }, [activeModule]);

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
        return { title: 'CALL SHEET', icon: Clapperboard, accent: 'amber' as const };
      case 'REVIEW':
        return { title: 'MARKUP', icon: MessageSquare, accent: 'amber' as const };
      case 'AI':
        return { title: 'AI PROMPT', icon: Sparkles, accent: 'cyan' as const };
      case 'R2_STORAGE':
        return { title: 'CLOUD R2', icon: Cloud, accent: 'cyan' as const };
      case 'LIBRARY':
        return { title: 'LUT LAB', icon: Library, accent: 'amber' as const };
      case 'SETTINGS':
        return { title: 'SETTINGS', icon: Settings, accent: 'cyan' as const };
      case 'STORY':
        return { title: 'STORY', icon: BookOpen, accent: 'amber' as const };
      case 'MEDIA':
        return { title: 'MEDIA BIN', icon: ImageIcon, accent: 'cyan' as const };
      case 'TEXT':
        return { title: 'TITLE FX', icon: Type, accent: 'amber' as const };
      case 'SOUND':
        return { title: 'SOUND DSP', icon: Volume2, accent: 'emerald' as const };
      case 'PLAYER':
        return { title: 'PREVIS', icon: PlaySquare, accent: 'amber' as const };
      case 'LIQUIFY':
        return { title: 'LIQUIFY', icon: Wand2, accent: 'crimson' as const };
      default:
        return { title: 'OPTICS', icon: Sliders, accent: 'cyan' as const };
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
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0 gap-2">
          <CinemaBadgeHeader
            icon={<Icon className="w-4 h-4" strokeWidth={2.2} />}
            label={meta.title}
            accent={meta.accent}
          />

          <div className="flex items-center gap-1.5 shrink-0">
            <CinemaToolHUD
              title={showProSuite ? 'STANDARD VIEW' : 'PRO FX SUITE'}
              en="Switch between standard module view and CapCut Pro FX Suite."
              bn="প্রো ইফেক্টস (ক্যাপশন, কীফ্রেম, স্পিড র‍্যাম্প, কালার) চালু বা বন্ধ করতে চাপুন।"
              accent="cyan"
              side="bottom"
            >
              <button
                type="button"
                data-testid="drawer-toggle-pro-suite"
                data-active={showProSuite ? 'true' : 'false'}
                onClick={() => setShowProSuite((v) => !v)}
                className="cinema-tile cinema-tile-cyan px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1"
              >
                <Zap className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                <span>{showProSuite ? 'STANDARD' : 'PRO FX'}</span>
              </button>
            </CinemaToolHUD>
            <CinemaToolHUD
              title="CLOSE DRAWER"
              en="Close the active studio slide-over drawer."
              bn="এই ড্রয়ার প্যানেলটি বন্ধ করতে X চাপুন।"
              shortcut="ESC"
              accent="crimson"
              side="bottom"
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close drawer"
                className="cinema-tile cinema-tile-crimson p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
              </button>
            </CinemaToolHUD>
          </div>
        </div>

        {/* Slide-Over Body Container */}
        <div className="flex-1 space-y-6">
          {showProSuite ? (
            <CapCutProSuitePanel
              key={`pro-suite-${proSuiteTab}`}
              currentFrame={currentFrame}
              currentIndex={currentIndex}
              slideTimeSec={slideTimeSec}
              shotDurationSec={currentFrame.durationSec || 12}
              onUpdateFrame={onUpdateFrame}
              onApplyStoryboardShots={onApplyStoryboardShots}
              initialTab={proSuiteTab}
            />
          ) : (
            <>
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
            </>
          )}
        </div>
      </aside>
    );
  }

  // Fallback for modules 01-09
  return (
    <div className="w-[420px] sm:w-[480px] xl:w-[560px] h-full bg-[#0a0a10]/98 border-r border-[#272732] shadow-[0_0_50px_rgba(0,0,0,0.95)] flex flex-col z-30 shrink-0 select-none overflow-hidden backdrop-blur-2xl animate-in slide-in-from-left duration-200">
      {/* Drawer Header */}
      <div className="h-12 bg-[#0c0c10] border-b border-[#272732] px-3 flex items-center justify-between shrink-0 gap-2">
        <CinemaBadgeHeader
          icon={<Icon className="w-4 h-4" strokeWidth={2.2} />}
          label={meta.title}
          accent={meta.accent}
        />

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <CinemaToolHUD
            title={showProSuite ? 'MODULE VIEW' : 'PRO FX SUITE'}
            en="Switch between standard drawer tools and Pro FX Suite."
            bn="প্রো ইফেক্টস স্যুট (AI ক্যাপশন, কীফ্রেম, স্পিড র‍্যাম্প, কালার) চালু করতে চাপুন।"
            accent="cyan"
            side="bottom"
          >
            <button
              type="button"
              data-testid="drawer-toggle-pro-suite"
              data-active={showProSuite ? 'true' : 'false'}
              onClick={() => setShowProSuite((v) => !v)}
              className="cinema-tile cinema-tile-cyan px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
              <span>{showProSuite ? 'MODULE' : 'PRO FX'}</span>
            </button>
          </CinemaToolHUD>

          {activeModule === 'OPTICS' && onOpenMultiCam && (
            <CinemaToolHUD hudId="nav-multicam" side="bottom">
              <button
                type="button"
                onClick={onOpenMultiCam}
                className="cinema-tile cinema-tile-amber px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                <span className="hidden sm:inline">MULTI-CAM</span>
              </button>
            </CinemaToolHUD>
          )}

          {/* Close Button */}
          <CinemaToolHUD
            title="CLOSE PANEL"
            en="Close this studio tool drawer."
            bn="এই টুল প্যানেলটি বন্ধ করতে X বাটনে চাপুন।"
            shortcut="ESC"
            accent="crimson"
            side="bottom"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="cinema-tile cinema-tile-crimson p-1.5 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
            </button>
          </CinemaToolHUD>
        </div>
      </div>

      {/* Drawer Body Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative p-2">
        {showProSuite ? (
          <CapCutProSuitePanel
            key={`pro-suite-${proSuiteTab}`}
            currentFrame={currentFrame}
            currentIndex={currentIndex}
            slideTimeSec={slideTimeSec}
            shotDurationSec={currentFrame.durationSec || 12}
            onUpdateFrame={onUpdateFrame}
            onApplyStoryboardShots={onApplyStoryboardShots}
            initialTab={proSuiteTab}
          />
        ) : (
          <>
            {activeModule === 'STORY' && <StoryNotebook />}
            {activeModule === 'MEDIA' && (
              <MediaStudio activeShotIndex={currentIndex} currentFrame={currentFrame} />
            )}
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
          </>
        )}
      </div>
    </div>
  );
};
