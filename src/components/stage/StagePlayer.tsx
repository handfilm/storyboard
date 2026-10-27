/**
 * @file /src/components/stage/StagePlayer.tsx
 * @description Master Stage Player Engine for HANDFILM Cinema Studio.
 * Drives playback clock and strictly feeds `currentTime` (in seconds) into
 * the KineticTributeSequence time-gated animation engine.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KineticTributeSequence, TributePhase } from './templates/KineticTributeSequence';
import { DopamineCompilationSequence } from './templates/DopamineCompilationSequence';
import { TributeProfile, DEFAULT_TRIBUTE_PROFILE } from '../../constants/tributeData';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2 } from 'lucide-react';

export interface DopaminePlayerConfig {
  hookText?: string;
  subText?: string;
  glitchIntensity?: number;
  strobeRate?: number;
  motionSpeed?: number;
  accentColor?: string;
}

export interface StagePlayerProps {
  initialTime?: number;
  durationSec?: number;
  isPlaying?: boolean;
  profile?: TributeProfile | string;
  engineMode?: 'tribute' | 'dopamine';
  dopamineConfig?: DopaminePlayerConfig;
  backgroundMediaUrl?: string;
  isVideoBackground?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onPhaseChange?: (phase: TributePhase) => void;
  onApplyProfileToFrame?: (profile: TributeProfile) => void;
  showControls?: boolean;
  autoLoop?: boolean;
  scale?: number;
  className?: string;
}

export const StagePlayer: React.FC<StagePlayerProps> = ({
  initialTime = 0,
  durationSec: durationSecProp,
  isPlaying: externalIsPlaying,
  profile = DEFAULT_TRIBUTE_PROFILE,
  engineMode = 'tribute',
  dopamineConfig,
  backgroundMediaUrl,
  isVideoBackground = false,
  onTimeUpdate,
  onPhaseChange,
  onApplyProfileToFrame,
  showControls = true,
  autoLoop = true,
  scale = 1.0,
  className = ''
}) => {
  const durationSec = Math.max(0.5, (typeof durationSecProp === 'number' && Number.isFinite(durationSecProp) ? durationSecProp : (engineMode === 'dopamine' ? 2.3 : 9.0)));
  // Master playback playhead time (in seconds)
  const [currentTime, setCurrentTime] = useState<number>(initialTime);
  const [isPlaying, setIsPlaying] = useState<boolean>(externalIsPlaying ?? true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [titlesVisible, setTitlesVisible] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sync external playing prop if controlled
  useEffect(() => {
    if (externalIsPlaying !== undefined) {
      setIsPlaying(externalIsPlaying);
    }
  }, [externalIsPlaying]);

  // Master clock: requestAnimationFrame continuous ticker
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      const deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      setCurrentTime((prev) => {
        let next = prev + deltaSec;
        if (next >= durationSec) {
          if (autoLoop) {
            next = 0;
          } else {
            setIsPlaying(false);
            next = durationSec;
          }
        }
        onTimeUpdate?.(next);
        return next;
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, durationSec, autoLoop, onTimeUpdate]);

  // Sync HTML5 video element if media is present
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentTime(0);
    onTimeUpdate?.(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [onTimeUpdate]);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    onTimeUpdate?.(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  }, [onTimeUpdate]);

  // Format MM:SS:FF
  const formatTimecode = (timeSec: number) => {
    const totalFrames = Math.floor(timeSec * 24);
    const frames = totalFrames % 24;
    const seconds = Math.floor(timeSec) % 60;
    const minutes = Math.floor(timeSec / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  return (
    <div className={`relative w-full h-full flex flex-col bg-black overflow-hidden select-none font-mono ${className}`}>
      {/* Background Media Layer (if provided) */}
      {backgroundMediaUrl && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {isVideoBackground ? (
            <video
              ref={videoRef}
              src={backgroundMediaUrl}
              crossOrigin="anonymous"
              muted={isMuted}
              loop={autoLoop}
              playsInline
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <img
              src={backgroundMediaUrl}
              crossOrigin="anonymous"
              alt="Cinema Background"
              className="w-full h-full object-cover opacity-50 filter brightness-75 contrast-110"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80" />
        </div>
      )}

      {/* Persistent Right-Edge Title FX Toggle */}
      <button
        type="button"
        onClick={() => setTitlesVisible(!titlesVisible)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 backdrop-blur-md border border-white/20 text-white text-xs px-3 px-3! py-1 py-1! rounded hover:bg-white/20 transition-all cursor-pointer"
      >
        {titlesVisible ? '[ T ] TITLE FX : ON' : '[ T ] TITLE FX : OFF'}
      </button>

      {/* Modular Cinema Typography Canvas: strictly receives currentTime */}
      <div className="relative z-10 flex-1 w-full h-full flex items-center justify-center">
        {titlesVisible && (
          engineMode === 'dopamine' ? (
            <DopamineCompilationSequence
              hookText={dopamineConfig?.hookText || 'PURE RHYTHM'}
              subText={dopamineConfig?.subText || 'Visual Physics at Work.'}
              glitchIntensity={dopamineConfig?.glitchIntensity ?? 80}
              strobeRate={dopamineConfig?.strobeRate ?? 60}
              motionSpeed={dopamineConfig?.motionSpeed ?? 1.5}
              accentColor={dopamineConfig?.accentColor || '#FF2B2B'}
              audioBeatSync={true}
              currentTime={currentTime}
              durationSec={durationSec}
              isPlaying={isPlaying}
              scale={scale}
            />
          ) : (
            <KineticTributeSequence
              profile={profile}
              currentTime={currentTime}
              durationSec={durationSec}
              isPlaying={isPlaying}
              scale={scale}
              showControls={false}
              onPhaseChange={onPhaseChange}
              onApplyProfileToFrame={onApplyProfileToFrame}
            />
          )
        )}
      </div>

      {/* StagePlayer Precision Transport Dock */}
      {showControls && (
        <div className="relative z-20 w-full px-4 py-2.5 bg-[#08090C]/90 border-t border-white/10 backdrop-blur-xl flex flex-col gap-2">
          {/* Timeline Scrubber */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-[#F5A623] tabular-nums tracking-wider w-16">
              {formatTimecode(currentTime)}
            </span>

            <input
              type="range"
              min={0}
              max={durationSec}
              step={0.0416} // 1 frame at 24fps
              value={currentTime}
              onChange={handleScrub}
              className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#F5A623]"
            />

            <span className="text-[11px] text-zinc-400 tabular-nums tracking-wider w-16 text-right">
              {formatTimecode(durationSec)}
            </span>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePlay}
                className="px-3 py-1.5 rounded bg-white/10 hover:bg-[#F5A623]/20 border border-white/10 hover:border-[#F5A623]/50 text-white hover:text-[#F5A623] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Reset to 00:00:00"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {backgroundMediaUrl && isVideoBackground && (
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
              <span>TIME-GATED CINEMA ENGINE // 24FPS SMPTE</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
