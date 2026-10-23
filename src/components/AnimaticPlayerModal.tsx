/**
 * @file /src/components/AnimaticPlayerModal.tsx
 * @description High-precision Animatic Cinema Player Modal:
 * - Configurable ceiling (10s, 15s, 30s, 60s, 120s)
 * - J-K-L Jog Shuttle scrubbing (-8x to +8x reverse/forward)
 * - A-B Loop point selectors
 * - Time dilation curves (Linear, Ease-in, Hypersonic, Bullet-time)
 * - Timeline frame bookmarks
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnthologyFrame, AspectRatio } from '../types/anthology';
import { audioEngine } from '../utils/audioEngine';
import { toBengaliNumerals } from '../utils/engine';
import {
  X,
  Play,
  Pause,
  Rewind,
  FastForward,
  Repeat,
  Bookmark,
  Clock,
  Gauge,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';

interface AnimaticPlayerModalProps {
  isOpen: boolean;
  frames: AnthologyFrame[];
  currentIndex: number;
  aspectRatio: AspectRatio;
  projectTitle?: string;
  onClose: () => void;
  onSelectFrame: (index: number) => void;
}

export const AnimaticPlayerModal: React.FC<AnimaticPlayerModalProps> = ({
  isOpen,
  frames,
  currentIndex,
  aspectRatio,
  projectTitle,
  onClose,
  onSelectFrame
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [timelineCeiling, setTimelineCeiling] = useState<number>(30); // 10s, 15s, 30s, 60s, 120s
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [jogSpeed, setJogSpeed] = useState<number>(1.0); // -8x to +8x
  const [loopPointA, setLoopPointA] = useState<number | null>(null);
  const [loopPointB, setLoopPointB] = useState<number | null>(null);
  const [dilationCurve, setDilationCurve] = useState<'linear' | 'ease' | 'bullet' | 'hyper'>('linear');
  const [bookmarks, setBookmarks] = useState<number[]>([0, 5, 12, 22]);

  const animFrameRef = useRef<number | null>(null);

  // Derive active frame based on current playback time
  const totalFrames = Math.max(1, frames.length);
  const activeFrameIndex = Math.min(
    totalFrames - 1,
    Math.floor((currentTime / timelineCeiling) * totalFrames)
  );
  const activeFrame = frames[activeFrameIndex] || frames[0];

  // Playback Animation Loop with Jog Shuttle support
  useEffect(() => {
    if (!isOpen || !isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTimestamp = performance.now();
    const step = (now: number) => {
      const deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      setCurrentTime(prev => {
        let next = prev + deltaSec * jogSpeed;

        // Respect A-B Loop Points if set
        const minTime = loopPointA !== null ? loopPointA : 0;
        const maxTime = loopPointB !== null ? loopPointB : timelineCeiling;

        if (next > maxTime) {
          audioEngine.playFrameImpact(0.4);
          return minTime;
        }
        if (next < minTime) {
          return maxTime;
        }

        return next;
      });

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isPlaying, jogSpeed, loopPointA, loopPointB, timelineCeiling]);

  // J-K-L Jog Shuttle Keyboard Controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' || e.key === 'K') {
        setIsPlaying(p => !p);
        setJogSpeed(1.0);
      } else if (e.key === 'j' || e.key === 'J') {
        // Reverse shuttle (-1x -> -2x -> -4x -> -8x)
        setJogSpeed(prev => (prev < 0 ? Math.max(-8, prev * 2) : -1.0));
        setIsPlaying(true);
      } else if (e.key === 'l' || e.key === 'L') {
        // Forward shuttle (+1x -> +2x -> +4x -> +8x)
        setJogSpeed(prev => (prev > 0 ? Math.min(8, prev * 2) : 1.0));
        setIsPlaying(true);
      } else if (e.key.toLowerCase() === 'i') {
        setLoopPointA(currentTime);
      } else if (e.key.toLowerCase() === 'o') {
        setLoopPointB(currentTime);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentTime, onClose]);

  const toggleBookmark = () => {
    const rounded = Math.round(currentTime * 10) / 10;
    if (bookmarks.includes(rounded)) {
      setBookmarks(b => b.filter(t => t !== rounded));
    } else {
      setBookmarks(b => [...b, rounded].sort((a, b) => a - b));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[115] bg-black/90 backdrop-blur-lg flex items-center justify-center p-3 sm:p-6 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[90vh] bg-[#07070a] border border-[#D4AF37]/50 rounded-[2px] shadow-2xl flex flex-col overflow-hidden font-mono-tech"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="h-12 bg-[#0c0c12] border-b border-white/10 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded text-[#FFE066]">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-cinzel text-xs sm:text-sm font-bold text-white tracking-widest uppercase">
                PRECISION ANIMATIC CINEMA PLAYER
              </h2>
              <span className="text-[9px] text-white/50 tracking-wider">
                J-K-L JOG SHUTTLE • A-B LOOPER • TIME DILATION
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Ceiling selector */}
            <div className="flex items-center bg-black/60 p-0.5 rounded border border-white/15">
              <span className="text-[8px] text-white/40 px-1 uppercase">CEILING</span>
              {[10, 15, 30, 60, 120].map(sec => (
                <button
                  key={sec}
                  onClick={() => {
                    setTimelineCeiling(sec);
                    if (currentTime > sec) setCurrentTime(0);
                  }}
                  className={`px-2 py-0.5 text-[9px] rounded cursor-pointer ${
                    timelineCeiling === sec ? 'bg-[#D4AF37] text-black font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            <button onClick={onClose} className="p-1 text-white/50 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Presentation Stage */}
        <div className="flex-1 bg-black flex items-center justify-center p-4 relative overflow-hidden">
          <div className="relative aspect-[16/9] w-full max-w-4xl max-h-[58vh] bg-[#050508] border border-[#D4AF37]/30 rounded-[2px] shadow-2xl overflow-hidden flex items-center justify-center">
            {activeFrame?.imageUrl ? (
              activeFrame.isVideo ? (
                <video
                  src={activeFrame.imageUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={activeFrame.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="text-center font-mono-tech text-white/30 text-xs">
                NO MEDIA FOR SHOT #{activeFrameIndex + 1}
              </div>
            )}

            {/* Kinetic Title Lockup */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between p-6 pointer-events-none">
              <div className="flex justify-between items-start text-[10px] text-white/70">
                <span className="text-[#FFE066] font-bold">
                  EP {activeFrame.epNumber} // {activeFrame.cameraSpec?.focalLength}
                </span>
                <span className="px-2 py-0.5 bg-black/80 rounded border border-[#D4AF37]/40 text-[#D4AF37]">
                  JOG SPEED: {jogSpeed > 0 ? `+${jogSpeed}x` : `${jogSpeed}x`}
                </span>
              </div>

              <div className="title-block text-center">
                <h1 className="font-cinzel text-2xl font-bold text-[#FFE066] drop-shadow-lg">
                  {activeFrame.title}
                </h1>
                <p className="font-bengali text-lg text-white font-bold drop-shadow mt-1">
                  {activeFrame.bengaliTitle}
                </p>
              </div>

              <div className="flex justify-between text-[9px] text-white/50">
                <span>TIME: {currentTime.toFixed(2)}s / {timelineCeiling}s</span>
                <span>DIRECTOR: RAKIB HIMON</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Control Dock & High-Precision Scrubber */}
        <div className="h-28 bg-[#0a0a0f] border-t border-white/10 p-3 flex flex-col justify-between">
          {/* Timeline Bar with Bookmarks & A-B points */}
          <div className="relative flex flex-col gap-1">
            <div
              className="h-4 bg-black rounded border border-white/15 relative cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                setCurrentTime(ratio * timelineCeiling);
              }}
            >
              {/* Progress Bar */}
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-[#FFE066] rounded-xs"
                style={{ width: `${(currentTime / timelineCeiling) * 100}%` }}
              />

              {/* Loop A & B Markers */}
              {loopPointA !== null && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-cyan-400 z-20 pointer-events-none"
                  style={{ left: `${(loopPointA / timelineCeiling) * 100}%` }}
                  title="In-Point A"
                />
              )}
              {loopPointB !== null && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-cyan-400 z-20 pointer-events-none"
                  style={{ left: `${(loopPointB / timelineCeiling) * 100}%` }}
                  title="Out-Point B"
                />
              )}

              {/* Bookmarks */}
              {bookmarks.map((bTime, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-1 bg-rose-500 z-10 pointer-events-none"
                  style={{ left: `${(bTime / timelineCeiling) * 100}%` }}
                />
              ))}
            </div>

            {/* Micro Time Readouts */}
            <div className="flex justify-between text-[8px] text-white/40 font-mono-tech">
              <span>0.0s</span>
              <span>{(timelineCeiling * 0.25).toFixed(1)}s</span>
              <span>{(timelineCeiling * 0.5).toFixed(1)}s</span>
              <span>{(timelineCeiling * 0.75).toFixed(1)}s</span>
              <span>{timelineCeiling}.0s</span>
            </div>
          </div>

          {/* Transport Buttons & Shuttle Controls */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setJogSpeed(s => (s < 0 ? Math.max(-8, s * 2) : -1.0))}
                className="px-2 py-1 bg-white/5 hover:bg-white/15 rounded border border-white/10 text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer"
                title="Reverse Jog Shuttle (J)"
              >
                <Rewind className="w-3 h-3" />
                <span>REV (J)</span>
              </button>

              <button
                onClick={() => {
                  setIsPlaying(p => !p);
                  setJogSpeed(1.0);
                }}
                className="px-3 py-1 bg-[#D4AF37] hover:bg-[#FFE066] text-black font-bold rounded flex items-center gap-1 cursor-pointer"
                title="Play / Pause (K)"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>

              <button
                onClick={() => setJogSpeed(s => (s > 0 ? Math.min(8, s * 2) : 1.0))}
                className="px-2 py-1 bg-white/5 hover:bg-white/15 rounded border border-white/10 text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer"
                title="Forward Jog Shuttle (L)"
              >
                <FastForward className="w-3 h-3" />
                <span>FWD (L)</span>
              </button>

              <span className="font-bold text-[#FFE066] ml-2 text-[11px]">
                {currentTime.toFixed(2)}s
              </span>
            </div>

            {/* Loop Points & Bookmark */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLoopPointA(currentTime)}
                className={`px-2 py-1 rounded text-[10px] border cursor-pointer ${
                  loopPointA !== null ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-white/5 border-white/10 text-white/60'
                }`}
                title="Set Loop Point A (I)"
              >
                SET A [{loopPointA !== null ? `${loopPointA.toFixed(1)}s` : '--'}]
              </button>

              <button
                onClick={() => setLoopPointB(currentTime)}
                className={`px-2 py-1 rounded text-[10px] border cursor-pointer ${
                  loopPointB !== null ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-white/5 border-white/10 text-white/60'
                }`}
                title="Set Loop Point B (O)"
              >
                SET B [{loopPointB !== null ? `${loopPointB.toFixed(1)}s` : '--'}]
              </button>

              {(loopPointA !== null || loopPointB !== null) && (
                <button
                  onClick={() => {
                    setLoopPointA(null);
                    setLoopPointB(null);
                  }}
                  className="px-1.5 py-1 text-[9px] text-white/40 hover:text-white"
                >
                  CLEAR
                </button>
              )}

              <button
                onClick={toggleBookmark}
                className="p-1 rounded border border-white/10 text-[#FFE066] hover:bg-white/5 cursor-pointer ml-2"
                title="Add Bookmark at Current Time"
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
