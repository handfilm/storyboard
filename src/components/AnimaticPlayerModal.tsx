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
  Gauge,
  RotateCcw
} from 'lucide-react';
import { CinemaToolHUD, CinemaBadgeHeader } from './ui/CinemaToolHUD';

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
  const [hoveredMarker, setHoveredMarker] = useState<{
    index: number;
    centerX: number;
    topY: number;
  } | null>(null);

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
        <div className="min-h-[56px] bg-[#111215] border-b border-[#26282E] px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <CinemaBadgeHeader
              icon={<Gauge className="w-4 h-4" strokeWidth={2.2} />}
              label="ANIMATIC"
              accent="amber"
            />
            {projectTitle && (
              <span className="hidden md:inline text-[10px] font-black tracking-wider uppercase text-zinc-400 truncate max-w-[180px]">
                {projectTitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[10, 15, 30, 60, 120].map(sec => (
              <CinemaToolHUD
                key={sec}
                title={`TIMELINE CEILING ${sec}S`}
                en={`Set animatic loop duration ceiling to ${sec} seconds.`}
                bn={`কীভাবে ব্যবহার করবেন: অ্যানিমেটিক প্রিভিউর মোট সময় ${sec} সেকেন্ড করতে চাপুন।`}
                accent="amber"
                side="bottom"
              >
                <button
                  type="button"
                  data-active={timelineCeiling === sec ? 'true' : 'false'}
                  onClick={() => {
                    setTimelineCeiling(sec);
                    if (currentTime > sec) setCurrentTime(0);
                  }}
                  className="cinema-tile cinema-tile-amber px-2.5 py-1.5 min-h-[36px] rounded-md font-black tracking-wider text-[10px] uppercase cursor-pointer"
                >
                  {sec}S
                </button>
              </CinemaToolHUD>
            ))}

            <CinemaToolHUD
              title="CLOSE PLAYER"
              en="Exit the precision animatic cinema player."
              bn="কীভাবে ব্যবহার করবেন: অ্যানিমেটিক প্লেয়ার বন্ধ করতে X বাটনে চাপুন।"
              shortcut="ESC"
              accent="crimson"
              side="bottom"
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="cinema-tile cinema-tile-crimson min-h-[36px] min-w-[36px] px-2.5 rounded-md flex items-center justify-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4 cinema-tile-icon" strokeWidth={2.3} />
                <span className="hidden sm:inline font-black tracking-wider text-[10px] uppercase">CLOSE</span>
              </button>
            </CinemaToolHUD>
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
        <div className="min-h-[136px] bg-[#0B0C10] border-t border-[#26282E] p-3 flex flex-col justify-between gap-2 relative">
          {/* Floating Thumbnail Preview Popup on Index Marker Hover */}
          {hoveredMarker && frames[hoveredMarker.index] && (() => {
            const previewFrame = frames[hoveredMarker.index];
            const shotNum = hoveredMarker.index + 1;
            const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
            const clampedLeft = Math.max(96, Math.min(viewportWidth - 96, hoveredMarker.centerX));
            const topY = Math.max(96, hoveredMarker.topY - 10);
            return (
              <div
                role="tooltip"
                data-testid="animatic-scrubber-hover-preview"
                style={{
                  position: 'fixed',
                  left: `${clampedLeft}px`,
                  top: `${topY}px`,
                  transform: 'translate(-50%, -100%)',
                  zIndex: 9999
                }}
                className="w-44 bg-[#090A10]/95 backdrop-blur-xl border border-[#D4AF37]/60 rounded-[4px] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.95)] pointer-events-none select-none transform-gpu animate-in fade-in duration-150"
              >
                <div className="relative w-full aspect-video rounded-[2px] overflow-hidden bg-black border border-white/10">
                  {previewFrame.imageUrl ? (
                    <img
                      src={previewFrame.imageUrl}
                      alt={previewFrame.title || `Frame ${shotNum}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] font-mono text-white/30">
                      NO MEDIA
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-between px-1.5 pb-0.5 font-mono text-[8px] tabular-nums">
                    <span className="font-bold text-[#FFE066]">
                      #{String(shotNum).padStart(3, '0')}
                    </span>
                    <span className="text-white/75">
                      {((hoveredMarker.index / totalFrames) * timelineCeiling).toFixed(1)}s
                    </span>
                  </div>
                </div>
                <div className="pt-1 px-0.5 text-[9.5px] font-semibold text-white truncate">
                  {previewFrame.title || `Frame ${shotNum}`}
                </div>
              </div>
            );
          })()}

          {/* Scrubber Index Markers + Timeline Bar */}
          <div
            onMouseLeave={() => setHoveredMarker(null)}
            className="relative flex flex-col gap-1"
          >
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {frames.map((f, idx) => {
                const isAct = idx === activeFrameIndex;
                return (
                  <button
                    key={`animatic-marker-${idx}-${f?.id ?? 'none'}`}
                    type="button"
                    data-active={isAct ? 'true' : 'false'}
                    onClick={() => {
                      const jumpSec = (idx / totalFrames) * timelineCeiling;
                      setCurrentTime(jumpSec);
                      onSelectFrame(idx);
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredMarker({
                        index: idx,
                        centerX: rect.left + rect.width / 2,
                        topY: rect.top
                      });
                    }}
                    onFocus={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredMarker({
                        index: idx,
                        centerX: rect.left + rect.width / 2,
                        topY: rect.top
                      });
                    }}
                    onBlur={() => setHoveredMarker(null)}
                    className="cinema-tile cinema-tile-amber shrink-0 px-2 py-1 rounded text-[9px] font-mono font-black tabular-nums cursor-pointer"
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </button>
                );
              })}
            </div>

            <div
              className="h-3.5 bg-black rounded border border-[#26282E] relative cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                setCurrentTime(ratio * timelineCeiling);
              }}
            >
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-[#FFE066] rounded-xs"
                style={{ width: `${(currentTime / timelineCeiling) * 100}%` }}
              />

              {loopPointA !== null && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-cyan-400 z-20 pointer-events-none"
                  style={{ left: `${(loopPointA / timelineCeiling) * 100}%` }}
                />
              )}
              {loopPointB !== null && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-cyan-400 z-20 pointer-events-none"
                  style={{ left: `${(loopPointB / timelineCeiling) * 100}%` }}
                />
              )}

              {bookmarks.map((bTime, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-1 bg-rose-500 z-10 pointer-events-none"
                  style={{ left: `${(bTime / timelineCeiling) * 100}%` }}
                />
              ))}
            </div>

            <div className="flex justify-between text-[8px] text-white/40 font-mono-tech tabular-nums">
              <span>0.0s</span>
              <span>{(timelineCeiling * 0.25).toFixed(1)}s</span>
              <span>{(timelineCeiling * 0.5).toFixed(1)}s</span>
              <span>{(timelineCeiling * 0.75).toFixed(1)}s</span>
              <span>{timelineCeiling}.0s</span>
            </div>
          </div>

          {/* Transport Buttons & Shuttle Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <CinemaToolHUD
                title="REVERSE JOG SHUTTLE"
                en="Step backward and accelerate reverse playback speed (-1x to -8x)."
                bn="কীভাবে ব্যবহার করবেন: ভিডিও উল্টো দিকে দ্রুত চালাতে REV বাটনে চাপুন।"
                shortcut="J"
                accent="cyan"
              >
                <button
                  type="button"
                  data-active={jogSpeed < 0 ? 'true' : 'false'}
                  onClick={() => setJogSpeed(s => (s < 0 ? Math.max(-8, s * 2) : -1.0))}
                  className="cinema-tile cinema-tile-cyan px-2.5 py-2 min-h-[44px] rounded-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Rewind className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                  <span className="font-black tracking-wider text-[10px] uppercase">REV</span>
                </button>
              </CinemaToolHUD>

              <CinemaToolHUD
                title={isPlaying ? 'PAUSE ANIMATIC' : 'PLAY ANIMATIC'}
                en="Toggle continuous animatic playback at 1.0x speed."
                bn="কীভাবে ব্যবহার করবেন: প্লে বা পজ করতে PLAY/PAUSE বাটনে চাপুন।"
                shortcut="K"
                accent="amber"
              >
                <button
                  type="button"
                  data-active={isPlaying ? 'true' : 'false'}
                  onClick={() => {
                    setIsPlaying(p => !p);
                    setJogSpeed(1.0);
                  }}
                  className="cinema-tile cinema-tile-amber px-3 py-2 min-h-[44px] rounded-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 cinema-tile-icon fill-current" strokeWidth={2.2} />
                  ) : (
                    <Play className="w-4 h-4 cinema-tile-icon fill-current" strokeWidth={2.2} />
                  )}
                  <span className="font-black tracking-wider text-[10px] uppercase">
                    {isPlaying ? 'PAUSE' : 'PLAY'}
                  </span>
                </button>
              </CinemaToolHUD>

              <CinemaToolHUD
                title="FORWARD JOG SHUTTLE"
                en="Accelerate forward playback shuttle (+1x to +8x)."
                bn="কীভাবে ব্যবহার করবেন: সামনে দ্রুত টেনে দেখতে FWD বাটনে একাধিকবার চাপুন।"
                shortcut="L"
                accent="cyan"
              >
                <button
                  type="button"
                  data-active={jogSpeed > 1 ? 'true' : 'false'}
                  onClick={() => setJogSpeed(s => (s > 0 ? Math.min(8, s * 2) : 1.0))}
                  className="cinema-tile cinema-tile-cyan px-2.5 py-2 min-h-[44px] rounded-md flex items-center gap-1.5 cursor-pointer"
                >
                  <FastForward className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                  <span className="font-black tracking-wider text-[10px] uppercase">FWD</span>
                </button>
              </CinemaToolHUD>

              <span className="font-black text-amber-300 ml-1 text-[11px] tabular-nums">
                {currentTime.toFixed(2)}s
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <CinemaToolHUD
                title="SET LOOP IN (A)"
                en="Mark loop start point A at current timecode."
                bn="কীভাবে ব্যবহার করবেন: লুপ শুরু করার পয়েন্ট সেট করতে LOOP A চাপুন।"
                shortcut="I"
                accent="cyan"
              >
                <button
                  type="button"
                  data-active={loopPointA !== null ? 'true' : 'false'}
                  onClick={() => setLoopPointA(currentTime)}
                  className="cinema-tile cinema-tile-cyan px-2.5 py-2 min-h-[44px] rounded-md flex items-center gap-1 cursor-pointer"
                >
                  <Repeat className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                  <span className="font-black tracking-wider text-[10px] uppercase">
                    IN {loopPointA !== null ? `${loopPointA.toFixed(1)}S` : 'A'}
                  </span>
                </button>
              </CinemaToolHUD>

              <CinemaToolHUD
                title="SET LOOP OUT (B)"
                en="Mark loop end point B at current timecode."
                bn="কীভাবে ব্যবহার করবেন: লুপ শেষ করার পয়েন্ট সেট করতে OUT B চাপুন।"
                shortcut="O"
                accent="cyan"
              >
                <button
                  type="button"
                  data-active={loopPointB !== null ? 'true' : 'false'}
                  onClick={() => setLoopPointB(currentTime)}
                  className="cinema-tile cinema-tile-cyan px-2.5 py-2 min-h-[44px] rounded-md flex items-center gap-1 cursor-pointer"
                >
                  <Repeat className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                  <span className="font-black tracking-wider text-[10px] uppercase">
                    OUT {loopPointB !== null ? `${loopPointB.toFixed(1)}S` : 'B'}
                  </span>
                </button>
              </CinemaToolHUD>

              {(loopPointA !== null || loopPointB !== null) && (
                <CinemaToolHUD
                  title="CLEAR LOOP"
                  en="Clear A-B loop points."
                  bn="কীভাবে ব্যবহার করবেন: সেট করা A-B লুপ মুছতে CLEAR চাপুন।"
                  accent="crimson"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setLoopPointA(null);
                      setLoopPointB(null);
                    }}
                    className="cinema-tile cinema-tile-crimson px-2.5 py-2 min-h-[44px] rounded-md flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                    <span className="font-black tracking-wider text-[10px] uppercase">CLEAR</span>
                  </button>
                </CinemaToolHUD>
              )}

              <CinemaToolHUD
                title="TOGGLE BOOKMARK"
                en="Pin or unpin a timeline cue bookmark at current frame."
                bn="কীভাবে ব্যবহার করবেন: বর্তমান ফ্রেমে বুকমার্ক পিন করতে MARK চাপুন।"
                accent="amber"
              >
                <button
                  type="button"
                  onClick={toggleBookmark}
                  className="cinema-tile cinema-tile-amber px-2.5 py-2 min-h-[44px] rounded-md flex items-center gap-1 cursor-pointer"
                >
                  <Bookmark className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                  <span className="font-black tracking-wider text-[10px] uppercase">MARK</span>
                </button>
              </CinemaToolHUD>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
