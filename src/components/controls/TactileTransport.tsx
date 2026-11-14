/**
 * @file /src/components/controls/TactileTransport.tsx
 * @description Master Tactical Pill Transport Dock ("Google Flow" Aesthetic) for Optical Cinema Monitor.
 * Features tactile HUD controls, precision frame stepping, mode switching, and smooth timeline scrubber.
 */

import React, { useEffect, useRef } from 'react';
import { PlaybackMode } from '../../types/editor';
import { clampShotDuration, formatDurationPillValue } from '../../types/storyboard';
import { playbackClock } from '../../utils/playbackClock';
import { CadenceSelectorPill } from './CadenceSelectorPill';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Camera,
  Trash2,
  Maximize2,
  Minimize2,
  Repeat
} from 'lucide-react';
import { CinemaToolHUD } from '../ui/CinemaToolHUD';

export interface TactileTransportProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackMode: PlaybackMode;
  onSelectPlaybackMode: (mode: PlaybackMode) => void;
  isLooping?: boolean;
  onToggleLoop?: () => void;
  onStepFrame?: (fwd: boolean) => void;
  playbackSpeed?: number;
  onChangePlaybackSpeed?: (speed: number) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  slideTimeSec?: number;
  slideDurationSec?: number;
  targetFps?: number;
  onChangeSlideDuration?: (durationSec: number) => void;
  onChangeTargetFps?: (fps: number) => void;
  onApplyDurationToAll?: (durationSec: number) => void;
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  currentIndex?: number;
  totalSlides?: number;
  onScrubSlideTime?: (timeSec: number) => void;
  onScrubGlobalTime?: (globalTimeSec: number) => void;
  aspectRatio?: string;
  onChangeAspectRatio?: (ratio: any) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onCaptureStill?: () => void;
  onPurgeMedia?: () => void;
  hasMedia?: boolean;
  className?: string;
}

export const TactileTransport: React.FC<TactileTransportProps> = ({
  isPlaying,
  onTogglePlay,
  playbackMode,
  onSelectPlaybackMode,
  isLooping = false,
  onToggleLoop,
  onStepFrame,
  isMuted = true,
  onToggleMute,
  slideTimeSec = 0,
  slideDurationSec = 12.0,
  targetFps = 24,
  onChangeSlideDuration,
  onChangeTargetFps,
  onApplyDurationToAll,
  isSnapToBeat = false,
  onToggleSnapToBeat,
  onScrubSlideTime,
  isFullscreen = false,
  onToggleFullscreen,
  onCaptureStill,
  onPurgeMedia,
  hasMedia = false,
  className = ''
}) => {
  const effectiveDuration = clampShotDuration(slideDurationSec);
  const safeFps = targetFps === 60 ? 60 : 24;
  const timeLabelDomRef = useRef<HTMLSpanElement | null>(null);
  const rangeDomRef = useRef<HTMLInputElement | null>(null);
  const durationRef = useRef(effectiveDuration);
  durationRef.current = effectiveDuration;

  useEffect(() => {
    return playbackClock.subscribe((snap) => {
      const dur = snap.durationSec > 0 ? snap.durationSec : durationRef.current;
      const clamped = Math.min(dur, Math.max(0, snap.timeSec));
      if (timeLabelDomRef.current) {
        timeLabelDomRef.current.textContent = `${clamped.toFixed(2)}s`;
      }
      if (rangeDomRef.current) {
        rangeDomRef.current.value = String(clamped);
      }
    });
  }, []);

  useEffect(() => {
    const clamped = Math.min(effectiveDuration, Math.max(0, slideTimeSec));
    if (timeLabelDomRef.current) {
      timeLabelDomRef.current.textContent = `${clamped.toFixed(2)}s`;
    }
    if (rangeDomRef.current) {
      rangeDomRef.current.value = String(clamped);
    }
  }, [slideTimeSec, effectiveDuration]);

  return (
    <div className={`w-full bg-[#0B0B0D]/95 backdrop-blur-xl border border-white/[0.07] rounded-[3px] p-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tech select-none shadow-[0_10px_30px_rgba(0,0,0,0.8)] ${className}`}>
      {/* Left: Transport buttons & Quick Cadence Selector */}
      <div className="flex items-center gap-1.5 shrink-0">
        <CinemaToolHUD
          title="PREV FRAME"
          en={`Steps playhead back by 1 frame (1/${safeFps}s).`}
          bn="১ ফ্রেম পেছনে সরাতে এটি চাপুন।"
          accent="cyan"
        >
          <button
            type="button"
            onClick={() => onStepFrame?.(false)}
            className="cinema-tile cinema-tile-cyan p-1.5 rounded-md cursor-pointer"
            aria-label="Previous Frame"
          >
            <SkipBack className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
          </button>
        </CinemaToolHUD>

        <CinemaToolHUD
          title={isPlaying ? 'PAUSE CLIP' : 'PLAY CLIP'}
          en="Starts or pauses real-time stage playback."
          bn="ভিডিও বা সিন প্লে এবং পজ করতে চাপুন।"
          shortcut="Space"
          accent="amber"
        >
          <button
            type="button"
            onClick={onTogglePlay}
            data-active={isPlaying ? 'true' : 'false'}
            className="cinema-tile cinema-tile-amber px-3 py-1.5 rounded-md font-black flex items-center gap-1.5 tracking-wider cursor-pointer text-[10px] sm:text-[11px]"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 cinema-tile-icon fill-current" strokeWidth={2.2} />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 cinema-tile-icon fill-current ml-0.5" strokeWidth={2.2} />
                <span>PLAY</span>
              </>
            )}
          </button>
        </CinemaToolHUD>

        <CinemaToolHUD
          title="NEXT FRAME"
          en={`Advances playhead forward by 1 frame (1/${safeFps}s).`}
          bn="১ ফ্রেম সামনে এগোতে এটি চাপুন।"
          accent="cyan"
        >
          <button
            type="button"
            onClick={() => onStepFrame?.(true)}
            className="cinema-tile cinema-tile-cyan p-1.5 rounded-md cursor-pointer"
            aria-label="Next Frame"
          >
            <SkipForward className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
          </button>
        </CinemaToolHUD>

        {onToggleLoop && (
          <CinemaToolHUD
            title="SHOT LOOP"
            en="Continuously loops playback within the active shot."
            bn="বর্তমান শটটি বারবার লুপ করে দেখতে চালু করুন।"
            accent="amber"
          >
            <button
              type="button"
              onClick={onToggleLoop}
              data-active={isLooping ? 'true' : 'false'}
              className="cinema-tile cinema-tile-amber p-1.5 rounded-md cursor-pointer"
              aria-label="Toggle Loop"
            >
              <Repeat className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
            </button>
          </CinemaToolHUD>
        )}

        {onChangeSlideDuration && (
          <CadenceSelectorPill
            durationSec={effectiveDuration}
            targetFps={safeFps}
            onChangeDuration={onChangeSlideDuration}
            onChangeTargetFps={onChangeTargetFps}
            onApplyDurationToAll={onApplyDurationToAll}
            isSnapToBeat={isSnapToBeat}
            onToggleSnapToBeat={onToggleSnapToBeat}
            compact
          />
        )}
      </div>

      {/* Center: Slide timeline scrubber */}
      <div className="flex-1 min-w-[200px] flex items-center gap-2 px-2 tabular-nums">
        <span ref={timeLabelDomRef} className="text-[9px] text-[#F59E0B] font-semibold w-12 text-right tabular-nums">
          {slideTimeSec.toFixed(2)}s
        </span>
        <input
          ref={rangeDomRef}
          type="range"
          min="0"
          max={effectiveDuration}
          step={1 / safeFps}
          defaultValue={Math.min(effectiveDuration, slideTimeSec)}
          onChange={(e) => onScrubSlideTime?.(Number(e.target.value))}
          className="flex-1 accent-[#F59E0B] cursor-pointer h-1.5 bg-white/15 rounded"
        />
        <span className="text-[9px] text-[#8E8E93] min-w-[36px] tabular-nums">
          {formatDurationPillValue(effectiveDuration)}
        </span>
      </div>

      {/* Right: Mode & Extras */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Playback Mode (Solo vs Sequence) */}
        <div className="flex items-center bg-[#141417] border border-white/[0.07] rounded-md p-0.5 gap-0.5">
          <CinemaToolHUD
            title="SEQUENCE MODE"
            en="Plays continuously through every shot in the timeline."
            bn="সবগুলো শট একটার পর একটা ধারাবাহিকভাবে চালাতে SEQ চাপুন।"
            accent="emerald"
          >
            <button
              type="button"
              onClick={() => onSelectPlaybackMode('sequence')}
              data-active={playbackMode === 'sequence' ? 'true' : 'false'}
              className="cinema-tile cinema-tile-emerald px-2 py-0.5 text-[9px] font-black tracking-wider rounded-[3px] cursor-pointer"
            >
              SEQ
            </button>
          </CinemaToolHUD>
          <CinemaToolHUD
            title="SOLO SHOT"
            en="Locks playback to repeat only the active shot."
            bn="শুধুমাত্র বর্তমান শটটি আলাদাভাবে বারবার দেখতে SOLO চাপুন।"
            accent="amber"
          >
            <button
              type="button"
              onClick={() => onSelectPlaybackMode('solo')}
              data-active={playbackMode === 'solo' ? 'true' : 'false'}
              className="cinema-tile cinema-tile-amber px-2 py-0.5 text-[9px] font-black tracking-wider rounded-[3px] cursor-pointer"
            >
              SOLO
            </button>
          </CinemaToolHUD>
        </div>

        {onToggleMute && (
          <CinemaToolHUD
            title={isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}
            en="Toggles monitor audio output on or off."
            bn="সাউন্ড চালু বা মিউট করতে স্পিকার আইকনে চাপুন।"
            shortcut="M"
            accent="emerald"
          >
            <button
              type="button"
              onClick={onToggleMute}
              data-active={!isMuted ? 'true' : 'false'}
              className="cinema-tile cinema-tile-emerald p-1.5 rounded-md cursor-pointer"
              aria-label="Toggle Mute"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} /> : <Volume2 className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />}
            </button>
          </CinemaToolHUD>
        )}

        {onCaptureStill && (
          <CinemaToolHUD
            title="CAPTURE PNG"
            en="Saves the active frame as a high-resolution PNG still."
            bn="বর্তমান ফ্রেমটি হাই-রেজোলিউশন ছবি হিসেবে সেভ করতে চাপুন।"
            accent="cyan"
          >
            <button
              type="button"
              onClick={onCaptureStill}
              className="cinema-tile cinema-tile-cyan p-1.5 rounded-md cursor-pointer"
              aria-label="Capture Still"
            >
              <Camera className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
            </button>
          </CinemaToolHUD>
        )}

        {hasMedia && onPurgeMedia && (
          <CinemaToolHUD
            title="PURGE MEDIA"
            en="Clears uploaded media from the active shot slot."
            bn="এই শট থেকে আপলোড করা ভিডিও বা ছবি সরাতে চাপুন।"
            accent="crimson"
          >
            <button
              type="button"
              onClick={onPurgeMedia}
              className="cinema-tile cinema-tile-crimson p-1.5 rounded-md cursor-pointer"
              aria-label="Purge Media"
            >
              <Trash2 className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
            </button>
          </CinemaToolHUD>
        )}

        {onToggleFullscreen && (
          <CinemaToolHUD
            title="FULLSCREEN"
            en="Expands the stage monitor across your full screen."
            bn="স্টেজ প্রিভিউ বড় করে ফুলস্ক্রিনে দেখতে চাপুন।"
            shortcut="F"
            accent="amber"
          >
            <button
              type="button"
              onClick={onToggleFullscreen}
              data-active={isFullscreen ? 'true' : 'false'}
              className="cinema-tile cinema-tile-amber p-1.5 rounded-md cursor-pointer"
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} /> : <Maximize2 className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />}
            </button>
          </CinemaToolHUD>
        )}
      </div>
    </div>
  );
};
