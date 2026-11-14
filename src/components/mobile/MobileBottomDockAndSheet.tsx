/**
 * @file /src/components/mobile/MobileBottomDockAndSheet.tsx
 * @description Single 56px CapCut-style horizontal scrollable Bottom Icon Dock (>=44px touch targets)
 * + Compact Slide-Up Contextual Sheet covering ONLY the lower 38% of the screen (leaving video preview unobstructed above it).
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  Scissors,
  Type,
  Music,
  Sun,
  Wand2,
  Flame,
  X,
  Check,
  ShieldCheck,
  Upload,
  Volume2,
  VolumeX,
  Zap,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import {
  AnthologyFrame,
  AspectRatio,
  LutPreset,
  SmartCropMode,
  SpeedRampPreset
} from '../../types/anthology';
import { SlideDraft, AspectRatioType } from '../../types/project';
import { PlaybackMode } from '../../types/editor';
import { useStudioStore } from '../../core/store';
import { TITLE_ZONE_9_MATRIX, resolveSpatialTitleChoreography } from '../../services/titleChoreographyEngine';
import { TitleDirectorRole, TitleZone9 } from '../../types/titlePreset';
import { LIGHTING_PRESETS } from '../../data/lightingPresets';
import {
  buildPresetRelightDefaults,
  normalizeShotLightConfig
} from '../../services/lightingRelightingService';
import {
  pack12sHyperReel,
  SMART_CROP_MODES,
  SPEED_RAMP_PRESETS
} from '../../utils/speedReelsEngine';
import { splitClipAtTime } from '../../utils/scrubNleMath';
import { getShotDurationSec, getShotTargetFps } from '../../types/storyboard';
import {
  FOLEY_PRESETS,
  processAudioFileMidSide,
  synthesizeFoleyRecipeToWavBlob
} from '../../services/vocalRemoverAndFoleyService';
import { DEFAULT_COLOR_WHEELS } from '../../services/proSuiteEngine';

export type MobileDockTabId = 'edit' | 'title' | 'audio' | 'light' | 'fx' | 'reels';

const DOCK_TABS: ReadonlyArray<{
  id: MobileDockTabId;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'edit', label: 'Edit', icon: Scissors },
  { id: 'title', label: 'Title FX', icon: Type },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'fx', label: 'FX', icon: Wand2 },
  { id: 'reels', label: 'Reels', icon: Flame }
];

const LUT_QUICK_LIST: ReadonlyArray<{ id: LutPreset; label: string }> = [
  { id: 'cinematic', label: 'Cinema 35' },
  { id: 'kodak_vision3', label: 'Kodak 500T' },
  { id: 'fuji_eterna', label: 'Fuji Eterna' },
  { id: 'golden', label: 'Golden' },
  { id: 'noir_35mm', label: 'Noir 35mm' },
  { id: 'bleach_bypass', label: 'Bleach' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'raw', label: 'RAW Clean' }
];

const LIGHT_QUICK_IDS = [
  'golden-hour',
  'rembrandt',
  'neon-light',
  'split-light',
  'moonlight',
  'butterfly',
  'high-key',
  'low-key'
] as const;

const DIRECTOR_ROLES: ReadonlyArray<{ id: TitleDirectorRole; label: string }> = [
  { id: 'imax-card', label: 'Hero' },
  { id: 'lower-3rd', label: 'Lower 3rd' },
  { id: 'subtitle', label: 'Subtitle' },
  { id: 'credit', label: 'Credits' }
];

const TITLE_SWATCHES: ReadonlyArray<{
  id: 'molten-gold' | 'titanium-silver' | 'neon-crimson' | 'pure-white' | 'amber';
  label: string;
  dot: string;
}> = [
  { id: 'molten-gold', label: 'Gold', dot: '#F59E0B' },
  { id: 'titanium-silver', label: 'Silver', dot: '#E4E4E7' },
  { id: 'neon-crimson', label: 'Crimson', dot: '#EF4444' },
  { id: 'pure-white', label: 'White', dot: '#FFFFFF' },
  { id: 'amber', label: 'Amber', dot: '#FBBF24' }
];

export interface MobileBottomDockAndSheetProps {
  activeTab: MobileDockTabId | null;
  onSelectTab: (tab: MobileDockTabId | null) => void;
  frames: AnthologyFrame[];
  currentIndex: number;
  currentFrame: AnthologyFrame;
  slideTimeSec: number;
  aspectRatio: AspectRatio | string;
  fitMode: 'cover' | 'contain' | 'fill';
  playbackMode: PlaybackMode;
  playbackSpeed: number;
  showTitles: boolean;
  isAudioMuted: boolean;
  audioVolume: number;
  detectedBpm: number;
  isSnapToBeat: boolean;
  onUpdateFrame: (updated: AnthologyFrame) => void;
  onCommitSlidesNle: (nextSlides: SlideDraft[], nextActiveIndex: number, nextLocalTimeSec: number) => void;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  onChangeFitMode: (mode: 'cover' | 'contain' | 'fill') => void;
  onSelectPlaybackMode: (mode: PlaybackMode) => void;
  onChangePlaybackSpeed: (speed: number) => void;
  onToggleTitles: () => void;
  onToggleAudio: () => void;
  onChangeVolume: (vol: number) => void;
  onToggleSnapToBeat: () => void;
  onLoadAudioFile: (file: File) => Promise<void> | void;
  onUploadMediaForActiveShot: () => void;
}

export const MobileBottomDockAndSheet: React.FC<MobileBottomDockAndSheetProps> = ({
  activeTab,
  onSelectTab,
  frames,
  currentIndex,
  currentFrame,
  slideTimeSec,
  aspectRatio,
  fitMode,
  playbackMode,
  playbackSpeed,
  showTitles,
  isAudioMuted,
  audioVolume,
  detectedBpm,
  isSnapToBeat,
  onUpdateFrame,
  onCommitSlidesNle,
  onChangeAspectRatio,
  onChangeFitMode,
  onSelectPlaybackMode,
  onChangePlaybackSpeed,
  onToggleTitles,
  onToggleAudio,
  onChangeVolume,
  onToggleSnapToBeat,
  onLoadAudioFile,
  onUploadMediaForActiveShot
}) => {
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const [loadedAudioFile, setLoadedAudioFile] = useState<File | null>(null);
  const [stemMode, setStemMode] = useState<'full' | 'instrumental' | 'acapella'>('full');
  const [isProcessingStem, setIsProcessingStem] = useState(false);
  const [sheetToast, setSheetToast] = useState<string | null>(null);

  const shotMediaMap = useStudioStore((s) => s.shotMediaMap);
  const storeShot = useStudioStore((s) => s.project.shots?.[currentIndex]);
  const titleZone = useStudioStore((s) => s.titleZone);
  const titleAlign = useStudioStore((s) => s.titleAlign);
  const setTitleZone = useStudioStore((s) => s.setTitleZone);
  const toggleTitleSafeGuard = useStudioStore((s) => s.toggleTitleSafeGuard);
  const applyDirectorTitleRole = useStudioStore((s) => s.applyDirectorTitleRole);
  const setTitleMaterialSwatch = useStudioStore((s) => s.setTitleMaterialSwatch);
  const updateShotTitleData = useStudioStore((s) => s.updateShotTitleData);
  const kineticOcclusion = useStudioStore((s) => s.kineticOcclusion);
  const setKineticOcclusionEnabled = useStudioStore((s) => s.setKineticOcclusionEnabled);

  const flashToast = (msg: string) => {
    setSheetToast(msg);
    window.setTimeout(() => setSheetToast((prev) => (prev === msg ? null : prev)), 2000);
  };

  // Build SlideDraft[] matching MainWorkspace for atomic NLE & Reels operations
  const slides: SlideDraft[] = useMemo(() => {
    return frames.map((f, i) => {
      const dur = getShotDurationSec(f, 12.0);
      const fps = getShotTargetFps(f, 24);
      return {
        id: `slide_${f.id ?? i}`,
        orderIndex: i,
        duration: dur,
        durationSec: dur,
        targetFps: fps,
        inPointMs: f.inPointMs,
        outPointMs: f.outPointMs,
        playbackSpeed: f.playbackSpeed,
        mediaVaultKey: f.mediaVaultKey ?? (f.id !== undefined ? String(f.id) : undefined),
        beatSnapEnabled: f.beatSnapEnabled,
        remoteUrl: f.imageUrl,
        titleBn: f.bengaliTitle,
        titleEn: f.title,
        tagline: f.tagline,
        directorNotes: f.directorNotes,
        soundCue: f.soundCue,
        aspectRatio: aspectRatio as AspectRatioType,
        colorAccent: f.colorAccent,
        lutFilter: f.lutFilter,
        isVideo: f.isVideo,
        panX: f.panX,
        panY: f.panY,
        reframeZoom: f.reframeZoom,
        smartCropMode: f.smartCropMode,
        speedRampPreset: f.speedRampPreset,
        speedRampKeyframes: f.speedRampKeyframes,
        opticalFlowMode: f.opticalFlowMode,
        flashCutEnabled: f.flashCutEnabled,
        flashCutIntervalSec: f.flashCutIntervalSec,
        beatDropEnabled: f.beatDropEnabled,
        cameraSpec: f.cameraSpec
      };
    });
  }, [frames, aspectRatio]);

  const handleSplitAtPlayhead = () => {
    const dur = getShotDurationSec(currentFrame, 12.0);
    const splitPoint = slideTimeSec > 0.25 && slideTimeSec < dur - 0.25 ? slideTimeSec : dur * 0.5;
    const res = splitClipAtTime(slides, currentIndex, splitPoint, true);
    if (res.changed) {
      onCommitSlidesNle(res.slides, res.activeIndex, res.localTimeSec);
      flashToast(`Split Shot #${currentIndex + 1} at ${splitPoint.toFixed(1)}s`);
    } else {
      flashToast('Clip too short to split');
    }
  };

  const handlePack12sReels = () => {
    const packed = pack12sHyperReel(slides, shotMediaMap);
    if (packed.slides.length > 0) {
      onCommitSlidesNle(packed.slides, 0, 0);
      onSelectPlaybackMode('sequence');
      flashToast(`12s Hyper-Reel Packed (${packed.selectedCount} cuts)`);
    }
  };

  const handlePickAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadedAudioFile(file);
    setStemMode('full');
    await onLoadAudioFile(file);
    flashToast(`Loaded ${file.name}`);
    e.target.value = '';
  };

  const handleStemProcess = async (mode: 'full' | 'instrumental' | 'acapella') => {
    if (!loadedAudioFile) {
      audioInputRef.current?.click();
      return;
    }
    setStemMode(mode);
    if (mode === 'full') {
      await onLoadAudioFile(loadedAudioFile);
      flashToast('Restored Full Mix');
      return;
    }
    setIsProcessingStem(true);
    try {
      const res = await processAudioFileMidSide(loadedAudioFile, {
        mode,
        suppressionPct: 88,
        bassRetainPct: 85
      });
      const stemFile = new File(
        [res.wavBlob],
        `${loadedAudioFile.name.replace(/\.[^.]+$/, '')}_${mode}.wav`,
        { type: 'audio/wav' }
      );
      await onLoadAudioFile(stemFile);
      URL.revokeObjectURL(res.wavUrl);
      flashToast(mode === 'instrumental' ? 'Vocals Removed (Instrumental)' : 'Vocals Isolated (Acapella)');
    } catch {
      flashToast('Stem processing unavailable');
    } finally {
      setIsProcessingStem(false);
    }
  };

  const handleGenerateFoley = async (recipeIdx: number) => {
    const recipe = FOLEY_PRESETS[recipeIdx];
    if (!recipe) return;
    const wavBlob = synthesizeFoleyRecipeToWavBlob(recipe);
    const foleyFile = new File([wavBlob], `${recipe.id || 'foley'}.wav`, { type: 'audio/wav' });
    setLoadedAudioFile(foleyFile);
    setStemMode('full');
    await onLoadAudioFile(foleyFile);
    flashToast(`Loaded ${recipe.name}`);
  };

  const choreography = resolveSpatialTitleChoreography({
    titleAlign,
    zone9: storeShot?.titleData?.zone9 ?? titleZone,
    layoutMode: storeShot?.titleStyleConfig?.layoutMode ?? 'center-hero',
    shotIndex: currentIndex,
    shotType: currentFrame?.shotType,
    panX: currentFrame?.panX,
    panY: currentFrame?.panY,
    smartCropMode: currentFrame?.smartCropMode,
    safeGuard: Boolean(storeShot?.titleData?.safeGuard ?? storeShot?.titleStyleConfig?.safeGuard)
  });

  const safeGuardOn = Boolean(storeShot?.titleData?.safeGuard ?? storeShot?.titleStyleConfig?.safeGuard);
  const currentRole = storeShot?.titleData?.directorRole ?? storeShot?.titleStyleConfig?.directorRole;
  const currentPresetId = storeShot?.activeTitlePreset ?? 'molten-gold';
  const currentBangla = storeShot?.titleData?.banglaTitle ?? currentFrame?.bengaliTitle ?? '';
  const currentEnglish = storeShot?.titleData?.englishSubtitle ?? currentFrame?.title ?? '';

  const lightConfig = normalizeShotLightConfig(currentFrame?.lightConfig);
  const wheels = currentFrame?.colorWheels || DEFAULT_COLOR_WHEELS;
  const adjustments = currentFrame?.adjustments || {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    bloom: 30,
    grain: 15,
    motionBlur: 0,
    vignette: 40
  };

  const activeTabMeta = DOCK_TABS.find((t) => t.id === activeTab);

  return (
    <>
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.aac,.ogg,.flac,.m4a"
        className="hidden"
        onChange={handlePickAudioFile}
      />

      {/* SINGLE HORIZONTAL SCROLLABLE BOTTOM ICON DOCK (56px height, >=44px touch targets) */}
      <nav
        data-testid="mobile-bottom-dock"
        aria-label="Mobile Editing Tools"
        className="h-[56px] shrink-0 w-full bg-[#0B0B0D] border-t border-white/[0.08] px-1.5 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar z-40"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {DOCK_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(isActive ? null : tab.id)}
              className={`min-w-[58px] flex-1 min-h-[44px] px-2 py-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40'
                  : 'text-[#A1A1AA] active:bg-white/[0.06] border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="font-mono text-[9.5px] font-bold tracking-tight whitespace-nowrap leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* COMPACT SLIDE-UP CONTEXTUAL SHEET (Lower 38% of screen, preview remains 100% visible above) */}
      {activeTab && (
        <div
          data-testid={`mobile-sheet-${activeTab}`}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="fixed inset-x-0 bottom-0 h-[38dvh] min-h-[245px] max-h-[42dvh] z-[90] md:hidden bg-[#0D0D11]/95 backdrop-blur-xl border-t border-white/[0.15] rounded-t-2xl shadow-[0_-16px_48px_rgba(0,0,0,0.85)] flex flex-col animate-mobile-sheet-up"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Sheet Header with Close & Done */}
          <div className="h-[44px] shrink-0 px-3 border-b border-white/[0.08] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-black text-[11px] uppercase tracking-[0.14em] text-[#F59E0B] whitespace-nowrap">
                {activeTabMeta?.label}
              </span>
              <span className="font-mono text-[9px] text-[#71717A] tabular-nums whitespace-nowrap">
                SH{String(currentIndex + 1).padStart(2, '0')}
              </span>
              {sheetToast && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[9px] truncate">
                  {sheetToast}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onSelectTab(null)}
                aria-label="Close Sheet"
                className="min-h-[34px] px-2.5 rounded-md bg-[#18181D] active:bg-[#24242C] border border-white/[0.08] text-[#A1A1AA] font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Close</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTab(null)}
                aria-label="Done"
                className="min-h-[34px] px-3 rounded-md bg-[#F59E0B] active:bg-[#D97706] text-[#0B0B0D] font-mono text-[10px] font-black flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3 stroke-[2.75]" />
                <span>Done</span>
              </button>
            </div>
          </div>

          {/* Sheet Scrollable Controls */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 space-y-3">
            {/* ==================== TAB 1: EDIT ==================== */}
            {activeTab === 'edit' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSplitAtPlayhead}
                    className="min-h-[44px] px-3 rounded-lg bg-[#17171C] active:bg-[#23232B] border border-white/[0.1] flex items-center justify-center gap-2 font-mono text-[11px] font-bold text-[#F4F4F5] cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Cut / Split</span>
                  </button>
                  <button
                    type="button"
                    onClick={onUploadMediaForActiveShot}
                    className="min-h-[44px] px-3 rounded-lg bg-[#17171C] active:bg-[#23232B] border border-white/[0.1] flex items-center justify-center gap-2 font-mono text-[11px] font-bold text-[#F4F4F5] cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Replace Media</span>
                  </button>
                </div>

                {/* Speed Ramp Presets */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9.5px] font-mono text-[#8E8E93]">
                    <span>SPEED RAMP CURVE</span>
                    <span className="text-[#F59E0B] font-bold">
                      {(currentFrame?.speedRampPreset || 'NONE').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {SPEED_RAMP_PRESETS.slice(0, 6).map((preset) => {
                      const active = (currentFrame?.speedRampPreset || 'NONE') === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            onUpdateFrame({
                              ...currentFrame,
                              speedRampPreset: preset.id as SpeedRampPreset
                            });
                            flashToast(`Ramp: ${preset.shortLabel}`);
                          }}
                          className={`min-h-[38px] px-2.5 rounded-md border font-mono text-[10px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D]'
                              : 'bg-[#15151A] border-white/[0.08] text-[#D4D4D8]'
                          }`}
                        >
                          {preset.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Smart Crop & Clip Speed */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-[9px] font-mono text-[#8E8E93]">SMART CROP</div>
                    <div className="grid grid-cols-2 gap-1">
                      {SMART_CROP_MODES.map((m) => {
                        const active = currentFrame?.smartCropMode === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() =>
                              onUpdateFrame({
                                ...currentFrame,
                                smartCropMode: m.id as SmartCropMode,
                                panX: m.panX,
                                panY: m.panY,
                                reframeZoom: m.zoom
                              })
                            }
                            className={`min-h-[34px] px-1.5 rounded border font-mono text-[9px] font-bold whitespace-nowrap cursor-pointer ${
                              active
                                ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                                : 'bg-[#15151A] border-white/[0.08] text-[#D4D4D8]'
                            }`}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[9px] font-mono text-[#8E8E93]">PLAYBACK SPEED</div>
                    <div className="grid grid-cols-2 gap-1">
                      {[0.5, 1.0, 1.5, 2.0].map((spd) => {
                        const active = Math.abs((playbackSpeed || 1) - spd) < 0.05;
                        return (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => onChangePlaybackSpeed(spd)}
                            className={`min-h-[34px] px-1.5 rounded border font-mono text-[9.5px] font-bold tabular-nums cursor-pointer ${
                              active
                                ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                                : 'bg-[#15151A] border-white/[0.08] text-[#D4D4D8]'
                            }`}
                          >
                            {spd.toFixed(1)}x
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Fit Mode */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-[#8E8E93] mr-1">FIT:</span>
                  {(['cover', 'contain'] as const).map((fm) => (
                    <button
                      key={fm}
                      type="button"
                      onClick={() => onChangeFitMode(fm)}
                      className={`min-h-[34px] px-3 rounded border font-mono text-[9.5px] font-bold uppercase cursor-pointer ${
                        fitMode === fm
                          ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                          : 'bg-[#15151A] border-white/[0.08] text-[#A1A1AA]'
                      }`}
                    >
                      {fm}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ==================== TAB 2: TITLE FX ==================== */}
            {activeTab === 'title' && (
              <div className="space-y-2.5">
                {/* Top Quick Toggles: Show Titles + Safe Guard + AUTO Position */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={onToggleTitles}
                    className={`min-h-[38px] px-2 rounded-md border font-mono text-[9.5px] font-bold cursor-pointer ${
                      showTitles
                        ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                        : 'bg-[#15151A] border-white/[0.08] text-[#8E8E93]'
                    }`}
                  >
                    TITLES {showTitles ? 'ON' : 'OFF'}
                  </button>

                  <button
                    type="button"
                    onClick={toggleTitleSafeGuard}
                    className={`min-h-[38px] px-2 rounded-md border font-mono text-[9.5px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                      safeGuardOn
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-[#15151A] border-white/[0.08] text-[#A1A1AA]'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>SAFE {safeGuardOn ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTitleZone('AUTO')}
                    className={`min-h-[38px] px-2 rounded-md border font-mono text-[9.5px] font-bold cursor-pointer ${
                      (storeShot?.titleData?.zone9 ?? titleZone) === 'AUTO'
                        ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D]'
                        : 'bg-[#15151A] border-white/[0.08] text-[#D4D4D8]'
                    }`}
                  >
                    AUTO ZONE
                  </button>
                </div>

                {/* Zero-Slider 3x3 Matrix + Role Presets side-by-side */}
                <div className="grid grid-cols-[126px_1fr] gap-2.5 items-start">
                  <div>
                    <div className="text-[8.5px] font-mono text-[#8E8E93] mb-1">3×3 SAFE MATRIX</div>
                    <div className="grid grid-cols-3 gap-1">
                      {TITLE_ZONE_9_MATRIX.map((cell) => {
                        const active = choreography.zone9 === cell.zone;
                        return (
                          <button
                            key={cell.zone}
                            type="button"
                            onClick={() => setTitleZone(cell.zone as TitleZone9)}
                            className={`h-[32px] rounded border font-mono text-[9px] font-black cursor-pointer transition-colors ${
                              active
                                ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D]'
                                : 'bg-[#15151A] border-white/[0.08] text-[#A1A1AA] active:bg-[#22222A]'
                            }`}
                          >
                            {cell.shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-[8.5px] font-mono text-[#8E8E93] mb-1">ROLE PRESETS</div>
                      <div className="grid grid-cols-2 gap-1">
                        {DIRECTOR_ROLES.map((r) => {
                          const active = currentRole === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => applyDirectorTitleRole(r.id)}
                              className={`min-h-[32px] px-2 rounded border font-mono text-[9.5px] font-bold cursor-pointer ${
                                active
                                  ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                                  : 'bg-[#15151A] border-white/[0.08] text-[#D4D4D8]'
                              }`}
                            >
                              {r.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {TITLE_SWATCHES.map((sw) => {
                        const active = currentPresetId === sw.id;
                        return (
                          <button
                            key={sw.id}
                            type="button"
                            onClick={() => setTitleMaterialSwatch(sw.id)}
                            aria-label={sw.label}
                            className={`min-h-[28px] px-2 rounded border font-mono text-[9px] font-bold flex items-center gap-1 cursor-pointer ${
                              active
                                ? 'border-[#F59E0B] bg-[#F59E0B]/15 text-[#F4F4F5]'
                                : 'border-white/[0.08] bg-[#15151A] text-[#A1A1AA]'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: sw.dot }}
                            />
                            <span>{sw.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Inline Bangla / English Title Text Inputs */}
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={currentBangla}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateShotTitleData(currentIndex, { banglaTitle: val });
                      onUpdateFrame({ ...currentFrame, bengaliTitle: val });
                    }}
                    placeholder="বাংলা শিরোনাম..."
                    className="min-h-[36px] px-2.5 rounded-md bg-[#15151A] border border-white/[0.1] focus:border-[#F59E0B] font-bangla text-[12px] text-[#F4F4F5] outline-none"
                  />
                  <input
                    type="text"
                    value={currentEnglish}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateShotTitleData(currentIndex, { englishSubtitle: val });
                      onUpdateFrame({ ...currentFrame, title: val });
                    }}
                    placeholder="English subtitle..."
                    className="min-h-[36px] px-2.5 rounded-md bg-[#15151A] border border-white/[0.1] focus:border-[#F59E0B] font-mono text-[11px] text-[#F4F4F5] outline-none"
                  />
                </div>
              </div>
            )}

            {/* ==================== TAB 3: AUDIO ==================== */}
            {activeTab === 'audio' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="min-h-[42px] px-3 rounded-lg bg-[#17171C] active:bg-[#22222A] border border-[#F59E0B]/40 flex items-center justify-center gap-1.5 font-mono text-[10.5px] font-bold text-[#F59E0B] cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {loadedAudioFile ? loadedAudioFile.name : 'Voiceover / Audio'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleSnapToBeat}
                    className={`min-h-[42px] px-3 rounded-lg border font-mono text-[10.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSnapToBeat
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-[#17171C] border-white/[0.08] text-[#D4D4D8]'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 shrink-0" />
                    <span>Beat Snap ({detectedBpm})</span>
                  </button>
                </div>

                {/* Volume & Mute Row */}
                <div className="flex items-center gap-2.5 bg-[#15151A] border border-white/[0.08] rounded-lg px-2.5 py-2">
                  <button
                    type="button"
                    onClick={onToggleAudio}
                    aria-label={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
                    className={`w-[38px] h-[34px] rounded flex items-center justify-center cursor-pointer shrink-0 ${
                      isAudioMuted
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                    }`}
                  >
                    {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round((isAudioMuted ? 0 : audioVolume) * 100)}
                    onChange={(e) => onChangeVolume(Number(e.target.value) / 100)}
                    aria-label="Audio Volume"
                    className="flex-1 accent-[#F59E0B] h-2 cursor-pointer"
                  />
                  <span className="font-mono text-[10px] font-bold text-[#F4F4F5] tabular-nums w-9 text-right">
                    {Math.round((isAudioMuted ? 0 : audioVolume) * 100)}%
                  </span>
                </div>

                {/* Stem Remover (Mid-Side DSP) */}
                <div className="space-y-1">
                  <div className="text-[8.5px] font-mono text-[#8E8E93] flex items-center justify-between">
                    <span>STEM REMOVER (MID-SIDE DSP)</span>
                    {isProcessingStem && <span className="text-[#F59E0B]">PROCESSING...</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'full', label: 'Full Mix' },
                        { id: 'instrumental', label: 'No Vocals' },
                        { id: 'acapella', label: 'Vocals Only' }
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        disabled={isProcessingStem}
                        onClick={() => handleStemProcess(s.id)}
                        className={`min-h-[34px] px-2 rounded border font-mono text-[9.5px] font-bold cursor-pointer ${
                          stemMode === s.id
                            ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                            : 'bg-[#15151A] border-white/[0.08] text-[#D4D4D8]'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Foley Synth */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[8.5px] font-mono text-[#8E8E93] shrink-0">FOLEY:</span>
                  {FOLEY_PRESETS.slice(0, 3).map((recipe, idx) => (
                    <button
                      key={recipe.id || idx}
                      type="button"
                      onClick={() => handleGenerateFoley(idx)}
                      className="min-h-[30px] px-2 rounded bg-[#15151A] border border-white/[0.08] text-[9px] font-mono text-[#D4D4D8] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      + {recipe.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ==================== TAB 4: LIGHT ==================== */}
            {activeTab === 'light' && (
              <div className="space-y-2.5">
                {/* Cinema LUTs */}
                <div className="space-y-1">
                  <div className="text-[8.5px] font-mono text-[#8E8E93]">CINEMA LUT</div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {LUT_QUICK_LIST.map((lut) => {
                      const active = (currentFrame?.lutFilter || 'cinematic') === lut.id;
                      return (
                        <button
                          key={lut.id}
                          type="button"
                          onClick={() => onUpdateFrame({ ...currentFrame, lutFilter: lut.id })}
                          className={`min-h-[34px] px-2.5 rounded-md border font-mono text-[9.5px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D]'
                              : 'bg-[#15151A] border-white/[0.08] text-[#D4D4D8]'
                          }`}
                        >
                          {lut.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Key / Rim / Fill Light Rigs */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[8.5px] font-mono text-[#8E8E93]">
                    <span>KEY / RIM / FILL RIG</span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateFrame({ ...currentFrame, lightId: undefined, lightConfig: undefined })
                      }
                      className="text-[#F59E0B] underline cursor-pointer"
                    >
                      Clear Rig
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {LIGHT_QUICK_IDS.map((id) => {
                      const preset = LIGHTING_PRESETS.find((p) => p.id === id);
                      if (!preset) return null;
                      const active = currentFrame?.lightId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            const cfg = buildPresetRelightDefaults(preset);
                            onUpdateFrame({
                              ...currentFrame,
                              lightId: preset.id,
                              lightConfig: cfg
                            });
                          }}
                          className={`min-h-[34px] px-1.5 rounded border font-mono text-[9px] font-bold truncate cursor-pointer ${
                            active
                              ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                              : 'bg-[#15151A] border-white/[0.08] text-[#D4D4D8]'
                          }`}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Key Intensity & Kelvin */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="bg-[#15151A] border border-white/[0.08] rounded-md px-2.5 py-1.5 space-y-1">
                    <div className="flex justify-between font-mono text-[9px] text-[#A1A1AA]">
                      <span>KEY INTENSITY</span>
                      <span className="text-[#F59E0B] tabular-nums">{lightConfig.keyIntensity}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={lightConfig.keyIntensity}
                      onChange={(e) =>
                        onUpdateFrame({
                          ...currentFrame,
                          lightConfig: {
                            ...lightConfig,
                            keyIntensity: Number(e.target.value)
                          }
                        })
                      }
                      className="w-full accent-[#F59E0B] h-1.5"
                    />
                  </label>

                  <label className="bg-[#15151A] border border-white/[0.08] rounded-md px-2.5 py-1.5 space-y-1">
                    <div className="flex justify-between font-mono text-[9px] text-[#A1A1AA]">
                      <span>TEMP (K)</span>
                      <span className="text-cyan-300 tabular-nums">{lightConfig.colorTempK}K</span>
                    </div>
                    <input
                      type="range"
                      min={2400}
                      max={7500}
                      step={100}
                      value={lightConfig.colorTempK}
                      onChange={(e) =>
                        onUpdateFrame({
                          ...currentFrame,
                          lightConfig: {
                            ...lightConfig,
                            colorTempK: Number(e.target.value)
                          }
                        })
                      }
                      className="w-full accent-cyan-400 h-1.5"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* ==================== TAB 5: FX ==================== */}
            {activeTab === 'fx' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <label className="bg-[#15151A] border border-white/[0.08] rounded-md px-2.5 py-1.5 space-y-1">
                    <div className="flex justify-between font-mono text-[9px] text-[#A1A1AA]">
                      <span>HALATION</span>
                      <span className="text-rose-400 tabular-nums">{wheels.halation}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={wheels.halation}
                      onChange={(e) =>
                        onUpdateFrame({
                          ...currentFrame,
                          colorWheels: { ...wheels, halation: Number(e.target.value) }
                        })
                      }
                      className="w-full accent-rose-500 h-1.5"
                    />
                  </label>

                  <label className="bg-[#15151A] border border-white/[0.08] rounded-md px-2.5 py-1.5 space-y-1">
                    <div className="flex justify-between font-mono text-[9px] text-[#A1A1AA]">
                      <span>FILM GRAIN</span>
                      <span className="text-[#F59E0B] tabular-nums">{adjustments.grain}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={adjustments.grain}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        onUpdateFrame({
                          ...currentFrame,
                          adjustments: { ...adjustments, grain: val },
                          colorWheels: { ...wheels, grain: val }
                        });
                      }}
                      className="w-full accent-[#F59E0B] h-1.5"
                    />
                  </label>

                  <label className="bg-[#15151A] border border-white/[0.08] rounded-md px-2.5 py-1.5 space-y-1">
                    <div className="flex justify-between font-mono text-[9px] text-[#A1A1AA]">
                      <span>BLOOM</span>
                      <span className="text-amber-300 tabular-nums">{adjustments.bloom}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={adjustments.bloom}
                      onChange={(e) =>
                        onUpdateFrame({
                          ...currentFrame,
                          adjustments: { ...adjustments, bloom: Number(e.target.value) }
                        })
                      }
                      className="w-full accent-amber-400 h-1.5"
                    />
                  </label>

                  <label className="bg-[#15151A] border border-white/[0.08] rounded-md px-2.5 py-1.5 space-y-1">
                    <div className="flex justify-between font-mono text-[9px] text-[#A1A1AA]">
                      <span>VIGNETTE</span>
                      <span className="text-[#D4D4D8] tabular-nums">{adjustments.vignette}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={adjustments.vignette}
                      onChange={(e) =>
                        onUpdateFrame({
                          ...currentFrame,
                          adjustments: { ...adjustments, vignette: Number(e.target.value) }
                        })
                      }
                      className="w-full accent-zinc-300 h-1.5"
                    />
                  </label>
                </div>

                {/* Transitions & Shader Toggles */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateFrame({
                        ...currentFrame,
                        flashCutEnabled: !currentFrame?.flashCutEnabled
                      })
                    }
                    className={`min-h-[36px] px-2 rounded border font-mono text-[9px] font-bold cursor-pointer ${
                      currentFrame?.flashCutEnabled
                        ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                        : 'bg-[#15151A] border-white/[0.08] text-[#A1A1AA]'
                    }`}
                  >
                    Flash-Cut
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateFrame({
                        ...currentFrame,
                        beatDropEnabled: !currentFrame?.beatDropEnabled
                      })
                    }
                    className={`min-h-[36px] px-2 rounded border font-mono text-[9px] font-bold cursor-pointer ${
                      currentFrame?.beatDropEnabled
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-[#15151A] border-white/[0.08] text-[#A1A1AA]'
                    }`}
                  >
                    Chromatic FX
                  </button>

                  <button
                    type="button"
                    onClick={() => setKineticOcclusionEnabled(!kineticOcclusion.enabled)}
                    className={`min-h-[36px] px-2 rounded border font-mono text-[9px] font-bold cursor-pointer ${
                      kineticOcclusion.enabled
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-[#15151A] border-white/[0.08] text-[#A1A1AA]'
                    }`}
                  >
                    Depth Punch
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateFrame({
                      ...currentFrame,
                      flashCutEnabled: false,
                      beatDropEnabled: false,
                      colorWheels: { ...DEFAULT_COLOR_WHEELS },
                      adjustments: {
                        ...adjustments,
                        bloom: 15,
                        grain: 8,
                        vignette: 20
                      }
                    })
                  }
                  className="w-full min-h-[34px] rounded border border-white/[0.08] bg-[#141418] text-[9.5px] font-mono text-[#A1A1AA] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Shot FX</span>
                </button>
              </div>
            )}

            {/* ==================== TAB 6: REELS ==================== */}
            {activeTab === 'reels' && (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handlePack12sReels}
                  className="w-full min-h-[44px] px-3 rounded-lg bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#0B0B0D] font-mono font-black text-[11px] tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>PACK 12s HYPER-REEL (288F)</span>
                </button>

                {/* Aspect Ratio Quick Switch */}
                <div className="grid grid-cols-3 gap-1.5">
                  {(['9:16', '2.39:1', '16:9'] as const).map((ratio) => {
                    const active = String(aspectRatio) === ratio;
                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => onChangeAspectRatio(ratio)}
                        className={`min-h-[36px] rounded border font-mono text-[10px] font-bold tabular-nums cursor-pointer ${
                          active
                            ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                            : 'bg-[#15151A] border-white/[0.08] text-[#D4D4D8]'
                        }`}
                      >
                        {ratio === '9:16' ? '9:16 REELS' : ratio}
                      </button>
                    );
                  })}
                </div>

                {/* Shot Duration & Playback Mode */}
                <div className="space-y-1">
                  <div className="text-[8.5px] font-mono text-[#8E8E93]">SHOT HOLD DURATION</div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {[1.0, 1.5, 2.0, 3.0, 6.0, 12.0].map((sec) => {
                      const active = Math.abs(getShotDurationSec(currentFrame, 12.0) - sec) < 0.1;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() =>
                            onUpdateFrame({
                              ...currentFrame,
                              slideHoldSec: sec,
                              durationSec: sec
                            })
                          }
                          className={`min-h-[34px] px-2.5 rounded border font-mono text-[10px] font-bold tabular-nums shrink-0 cursor-pointer ${
                            active
                              ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D]'
                              : 'bg-[#15151A] border-white/[0.08] text-[#D4D4D8]'
                          }`}
                        >
                          {sec}s
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectPlaybackMode('sequence')}
                    className={`min-h-[36px] rounded border font-mono text-[9.5px] font-bold cursor-pointer ${
                      playbackMode === 'sequence'
                        ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                        : 'bg-[#15151A] border-white/[0.08] text-[#A1A1AA]'
                    }`}
                  >
                    PLAY SEQUENCE
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectPlaybackMode('solo')}
                    className={`min-h-[36px] rounded border font-mono text-[9.5px] font-bold cursor-pointer ${
                      playbackMode === 'solo'
                        ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                        : 'bg-[#15151A] border-white/[0.08] text-[#A1A1AA]'
                    }`}
                  >
                    LOOP ACTIVE SHOT
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
