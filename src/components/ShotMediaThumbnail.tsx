import React, { useEffect, useMemo, useState } from 'react';
import { Film } from 'lucide-react';
import {
  ensureVideoThumbnailUrl,
  getCachedThumbnailUrl,
  isSvgPlaceholderUrl,
  isVideoSourceUrl
} from '../services/thumbnailEngine';
import { eventBus } from '../core/eventBus';
import { getShotProceduralSpec } from '../data/proceduralCinemaEngine';
import { resolveEffectiveTitleAlign, TitleAlign } from '../core/store';

export interface ShotMediaThumbnailProps {
  shotIndex: number;
  shotId?: string | number | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  isVideo?: boolean;
  mimeType?: string | null;
  name?: string | null;
  title?: string | null;
  bengaliTitle?: string | null;
  shotType?: string | null;
  titleAlign?: TitleAlign;
  lutFilterCss?: string;
  className?: string;
  mediaClassName?: string;
  alt?: string;
  eagerVideoExtract?: boolean;
  virtualized?: boolean;
  showProceduralText?: boolean;
  compactProcedural?: boolean;
  disableLiveVideoElement?: boolean;
}

/**
 * Shared Shot Thumbnail Tile Renderer:
 * - Never shows a solid black `<video preload="metadata">` box or a broken `<img>` icon.
 * - Uses cached raster posters immediately; triggers deduplicated JPEG poster extraction for videos.
 * - While a video poster extracts, layers an `opacity-0` -> `opacity-100` painted video preview over
 *   the shot's procedural cinema palette gradient, transitioning to the crisp raster `<img>` once ready.
 */
export const ShotMediaThumbnail: React.FC<ShotMediaThumbnailProps> = ({
  shotIndex,
  shotId,
  mediaUrl,
  thumbnailUrl,
  isVideo,
  mimeType,
  name,
  title,
  bengaliTitle,
  shotType,
  titleAlign = 'AUTO',
  lutFilterCss,
  className = 'relative w-full h-full overflow-hidden',
  mediaClassName = 'w-full h-full object-cover',
  alt,
  eagerVideoExtract = true,
  virtualized = true,
  showProceduralText = true,
  compactProcedural = false,
  disableLiveVideoElement = true
}) => {
  const [thumbTick, setThumbTick] = useState(0);
  const [imgFailedUrl, setImgFailedUrl] = useState<string | null>(null);
  const liveVideoPainted = false;

  const safeMediaUrl = mediaUrl && !isSvgPlaceholderUrl(mediaUrl) ? mediaUrl : '';
  const isVideoMedia = useMemo(
    () =>
      isVideoSourceUrl(safeMediaUrl, {
        isVideo,
        mimeType,
        name
      }),
    [safeMediaUrl, isVideo, mimeType, name]
  );

  const cacheKeys = useMemo(() => {
    const keys: string[] = [];
    if (shotId !== undefined && shotId !== null && String(shotId).trim() !== '') {
      keys.push(String(shotId));
    }
    keys.push(`shot_${shotIndex}`);
    keys.push(String(shotIndex));
    if (safeMediaUrl) keys.push(safeMediaUrl);
    return keys;
  }, [shotId, shotIndex, safeMediaUrl]);

  useEffect(() => {
    const unsub = eventBus.on('thumbnails_updated', () => {
      setThumbTick((t) => t + 1);
    });
    return () => unsub();
  }, []);

  // Reset failure states whenever underlying media URL changes
  useEffect(() => {
    setImgFailedUrl(null);
  }, [safeMediaUrl, thumbnailUrl]);

  const rasterUrl = useMemo(() => {
    void thumbTick;
    const cached = getCachedThumbnailUrl(cacheKeys);
    if (cached && cached !== imgFailedUrl) return cached;

    if (
      thumbnailUrl &&
      !isSvgPlaceholderUrl(thumbnailUrl) &&
      !isVideoSourceUrl(thumbnailUrl) &&
      thumbnailUrl !== imgFailedUrl
    ) {
      return thumbnailUrl;
    }

    if (!isVideoMedia && safeMediaUrl && safeMediaUrl !== imgFailedUrl) {
      return safeMediaUrl;
    }

    return '';
  }, [cacheKeys, thumbTick, imgFailedUrl, thumbnailUrl, isVideoMedia, safeMediaUrl]);

  // Trigger deduplicated background JPEG poster extraction for video shots
  useEffect(() => {
    if (!virtualized || !eagerVideoExtract || !isVideoMedia || !safeMediaUrl || rasterUrl) {
      return;
    }
    let cancelled = false;
    void ensureVideoThumbnailUrl(cacheKeys, safeMediaUrl, 0.15).then((url) => {
      if (!cancelled && url) {
        setThumbTick((t) => t + 1);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [virtualized, eagerVideoExtract, isVideoMedia, safeMediaUrl, rasterUrl, cacheKeys]);

  const proc = useMemo(() => getShotProceduralSpec(shotIndex), [shotIndex]);
  const effAlign = useMemo(
    () => resolveEffectiveTitleAlign(titleAlign, shotIndex, shotType ?? undefined),
    [titleAlign, shotIndex, shotType]
  );

  const alignCls =
    effAlign === 'LEFT'
      ? 'items-start text-left pl-1.5 pr-3'
      : effAlign === 'RIGHT'
        ? 'items-end text-right pl-3 pr-1.5'
        : 'items-center text-center px-1.5';

  // Never spawn background <video> decoders inside thumbnail tiles; always use static <img> poster or procedural gradient.
  void disableLiveVideoElement;

  const filterStyle = lutFilterCss && lutFilterCss !== 'none' ? { filter: lutFilterCss } : undefined;

  return (
    <div
      className={className}
      data-testid={`shot-media-thumb-${shotIndex}`}
      style={{ background: proc.palette.thumbCssBackdrop }}
    >
      {/* Procedural cinema backdrop always underlies to eliminate black flashes */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: proc.palette.lightLeakCss }}
      />
      <div className="absolute inset-0 procedural-film-grain opacity-35 pointer-events-none" />

      {!rasterUrl && !liveVideoPainted && showProceduralText && (
        <div
          className={`relative z-[1] w-full h-full flex flex-col ${
            compactProcedural ? 'justify-end pb-1' : 'justify-center'
          } gap-0.5 pointer-events-none ${alignCls}`}
        >
          {compactProcedural ? (
            <>
              <span
                className={`font-bangla text-[7.5px] leading-none text-amber-100/95 truncate max-w-full drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] ${
                  proc.architecture.italicStyle ? 'italic' : ''
                } ${proc.architecture.index === 0 || proc.architecture.index === 8 ? 'font-black' : 'font-bold'}`}
              >
                {bengaliTitle || title || `Shot ${shotIndex + 1}`}
              </span>
              <span
                className="h-[1px] rounded-full opacity-90"
                style={{
                  width: proc.architecture.dividerKind === 'anamorphic-wide' ? '72%' : '36%',
                  backgroundColor: proc.palette.accentHex
                }}
              />
            </>
          ) : (
            <>
              {isVideoMedia && (
                <Film className="w-3.5 h-3.5 mb-0.5 text-amber-300/70" />
              )}
              <span className="font-bangla text-[9px] font-bold text-amber-200 leading-tight truncate max-w-full drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
                {bengaliTitle || proc.palette.name}
              </span>
              <span className="font-mono text-[7px] font-semibold tracking-[0.14em] text-zinc-200 uppercase truncate max-w-full">
                {title || `SHOT ${String(shotIndex + 1).padStart(3, '0')}`}
              </span>
              <span
                className="h-[1px] w-8 rounded-full opacity-90"
                style={{ backgroundColor: proc.palette.accentHex }}
              />
            </>
          )}
        </div>
      )}

      {/* Static <img> posters & procedural gradients only (zero background <video> decoders) */}

      {/* Authoritative raster thumbnail */}
      {virtualized && rasterUrl && (
        <img
          src={rasterUrl}
          alt={alt || title || `Shot ${shotIndex + 1}`}
          referrerPolicy="no-referrer"
          decoding="async"
          onError={() => setImgFailedUrl(rasterUrl)}
          style={filterStyle}
          className={`absolute inset-0 ${mediaClassName} transition-opacity duration-150`}
        />
      )}
    </div>
  );
};
