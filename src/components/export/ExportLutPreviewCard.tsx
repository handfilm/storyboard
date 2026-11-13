import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Palette, Sparkles } from 'lucide-react';
import { AnthologyFrame, FrameAdjustments, LutPreset } from '../../types/anthology';
import { SlideDraft } from '../../types/project';
import { ShotMediaMap, resolveShotMediaEntry } from '../../services/handfilmMediaVault';
import { isVideoSourceUrl } from '../../services/thumbnailEngine';
import { formatLutPresetLabel, getLutFilterCSS } from '../../utils/engine';
import { ShotMediaThumbnail } from '../ShotMediaThumbnail';

export interface ExportLutPreviewCardProps {
  shotIndex: number;
  frame?: Partial<AnthologyFrame> | null;
  slide?: Partial<SlideDraft> | null;
  storeShot?: any;
  shotMediaMap?: ShotMediaMap;
  fallbackLut?: LutPreset | string;
  aspectRatio?: string;
  compact?: boolean;
  bypassLut?: boolean;
  onToggleBypassLut?: () => void;
  titleAlign?: 'LEFT' | 'MID' | 'RIGHT' | 'AUTO';
  className?: string;
}

export const ExportLutPreviewCard: React.FC<ExportLutPreviewCardProps> = ({
  shotIndex,
  frame,
  slide,
  storeShot,
  shotMediaMap,
  fallbackLut = 'cinematic',
  aspectRatio = '2.39:1',
  compact = false,
  bypassLut: controlledBypass,
  onToggleBypassLut,
  titleAlign = 'AUTO',
  className = ''
}) => {
  const [internalBypass, setInternalBypass] = useState(false);
  const isBypassed = typeof controlledBypass === 'boolean' ? controlledBypass : internalBypass;

  const handleToggleBypass = () => {
    if (onToggleBypassLut) {
      onToggleBypassLut();
    } else {
      setInternalBypass((v) => !v);
    }
  };

  const activeLut = useMemo<string>(() => {
    return (
      frame?.lutFilter ||
      (slide as any)?.lutFilter ||
      storeShot?.lutFilter ||
      fallbackLut ||
      'cinematic'
    );
  }, [frame?.lutFilter, slide, storeShot?.lutFilter, fallbackLut]);

  const adjustments = useMemo<Partial<FrameAdjustments> | undefined>(() => {
    return frame?.adjustments || (slide as any)?.adjustments || storeShot?.adjustments;
  }, [frame?.adjustments, slide, storeShot?.adjustments]);

  const lutCss = useMemo(() => {
    return isBypassed ? 'none' : getLutFilterCSS(activeLut, adjustments);
  }, [isBypassed, activeLut, adjustments]);

  const mediaEntry = useMemo(
    () => resolveShotMediaEntry(shotMediaMap, frame || storeShot, slide, shotIndex),
    [shotMediaMap, frame, storeShot, slide, shotIndex]
  );

  const rawMediaUrl =
    mediaEntry?.url ||
    (slide as any)?.remoteUrl ||
    frame?.videoSrc ||
    frame?.imageUrl ||
    storeShot?.videoSrc ||
    storeShot?.imageUrl ||
    '';

  const isVideo = mediaEntry
    ? mediaEntry.type === 'video'
    : isVideoSourceUrl(rawMediaUrl, {
        isVideo: Boolean(frame?.isVideo || (slide as any)?.isVideo || storeShot?.isVideo),
        name: rawMediaUrl
      });

  const shotNum = shotIndex + 1;
  const shotLabel = `SH${String(shotNum).padStart(3, '0')}`;
  const titleEn =
    (slide as any)?.titleEn || frame?.title || storeShot?.title || `Shot ${shotNum}`;
  const titleBn =
    (slide as any)?.titleBn || frame?.bengaliTitle || storeShot?.titleBn || '';
  const lensInfo =
    frame?.cameraSpec?.focalLength ||
    (frame as any)?.cameraSpecs?.focalLength ||
    storeShot?.cameraSpec?.focalLength ||
    '35mm';
  const apertureInfo =
    frame?.cameraSpec?.aperture ||
    (frame as any)?.cameraSpecs?.aperture ||
    storeShot?.cameraSpec?.aperture ||
    'T1.5';

  const lutDisplayName = formatLutPresetLabel(activeLut);

  return (
    <div
      data-testid="export-lut-preview-card"
      data-active-lut={activeLut}
      data-lut-bypassed={isBypassed ? 'true' : 'false'}
      className={`rounded-xl bg-[#08090e] border border-[#F5A623]/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
        compact ? 'p-2.5' : 'p-3'
      } ${className}`}
    >
      {/* Left: Framed Thumbnail Preview Window with Active LUT Applied */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`relative shrink-0 rounded-lg overflow-hidden border border-[#F5A623]/45 bg-black shadow-lg ${
            compact ? 'w-32 sm:w-36 aspect-video' : 'w-40 sm:w-44 aspect-video'
          }`}
        >
          <ShotMediaThumbnail
            shotIndex={shotIndex}
            shotId={frame?.id ?? (slide as any)?.id ?? storeShot?.id}
            mediaUrl={rawMediaUrl}
            thumbnailUrl={
              frame?.thumbnailUrl ||
              (frame as any)?.thumbnail ||
              (slide as any)?.thumbnailUrl ||
              storeShot?.thumbnailUrl
            }
            isVideo={isVideo}
            mimeType={mediaEntry?.mimeType}
            name={mediaEntry?.name}
            title={titleEn}
            bengaliTitle={titleBn}
            shotType={frame?.shotType || storeShot?.shotType}
            titleAlign={titleAlign}
            lutFilterCss={lutCss}
            compactProcedural
            alt={`${shotLabel} LUT Preview`}
          />

          {/* Top-left Shot Code Badge */}
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 border border-white/15 text-[8px] font-mono font-bold text-white z-[3]">
            {shotLabel}
          </div>

          {/* Bottom-right Active LUT Status Pill */}
          <div
            className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[7.5px] font-mono font-extrabold uppercase tracking-wider z-[3] border ${
              isBypassed
                ? 'bg-zinc-900/90 border-zinc-600 text-zinc-300'
                : 'bg-black/85 border-[#F5A623]/60 text-[#F5A623]'
            }`}
          >
            {isBypassed ? 'RAW UNGRADED' : lutDisplayName}
          </div>
        </div>

        {/* Center: Frame Look Metadata & Verification Readout */}
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold uppercase tracking-wider text-[#F5A623]">
              <Palette className="w-3 h-3 shrink-0" />
              <span>PRE-EXPORT LOOK PREVIEW</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-zinc-300">
              {aspectRatio}
            </span>
          </div>

          <div className="text-xs font-bold text-white truncate" title={titleEn}>
            {shotLabel} · {titleEn}
            {titleBn ? (
              <span className="font-bangla text-amber-200/80 font-medium ml-1.5">
                // {titleBn}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] font-mono text-zinc-400">
            <span className="text-zinc-200">
              LUT:{' '}
              <strong className={isBypassed ? 'text-zinc-400 line-through' : 'text-[#F5A623]'}>
                {lutDisplayName}
              </strong>
            </span>
            <span className="text-zinc-600">•</span>
            <span>
              {lensInfo} {apertureInfo}
            </span>
            {adjustments && (
              <>
                <span className="text-zinc-600">•</span>
                <span>
                  B:{adjustments.brightness ?? 100}% C:{adjustments.contrast ?? 100}% S:{adjustments.saturation ?? 100}%
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: A/B Compare Toggle */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleToggleBypass}
          data-testid="export-lut-compare-toggle"
          className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors ${
            isBypassed
              ? 'bg-zinc-900 border-zinc-600 text-zinc-200 hover:border-[#F5A623]/60'
              : 'bg-[#F5A623]/15 border-[#F5A623]/55 text-[#F5A623] hover:bg-[#F5A623]/25'
          }`}
          title="Toggle between the graded LUT look and raw ungraded frame"
        >
          {isBypassed ? (
            <>
              <EyeOff className="w-3 h-3" />
              <span>SHOW LUT</span>
            </>
          ) : (
            <>
              <Eye className="w-3 h-3" />
              <span>COMPARE RAW</span>
            </>
          )}
        </button>

        <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
          <span>{isBypassed ? 'Bypassing LUT filter' : 'LUT matched to export'}</span>
        </span>
      </div>
    </div>
  );
};

export default ExportLutPreviewCard;
