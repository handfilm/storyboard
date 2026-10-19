/**
 * RAWx Studio — Master Cinema Optical Stage
 * Public API: CinemaStage component
 * Implements center-focus sharpness, peripheral motion blur, vertical panning, and HUD overlays.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useStudioStore } from '../../core/store';
import { baseThemesData } from '../../data/frames';
import { toBengaliNumerals } from '../../utils/engine';
import { Sliders, Crop, Volume2, Upload, MoveVertical } from 'lucide-react';

const sampleCinemaImages = [
  "https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1519638399535-1b036603ac77?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80"
];

const colorPalette = ["#ffffff", "#d4af37", "#ff4b4b", "#4b9eff", "#00ffcc", "#ff8c00", "#e0e0e0"];

export const CinemaStage: React.FC = () => {
  const {
    activeShotIndex,
    project,
    isPanToolActive,
    setShotPanY,
    isGuidesActive,
    visibility,
    aspectRatio,
    fitMode,
    activeLut,
    activeLens,
    updateShot
  } = useStudioStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [startPanY, setStartPanY] = useState(50);
  const [hudFeedback, setHudFeedback] = useState<number | null>(null);
  const hudTimerRef = useRef<any>(null);

  const currentShot = project.shots[activeShotIndex] || {};
  const currentTheme = baseThemesData[activeShotIndex % baseThemesData.length];
  const epNumStr = String(activeShotIndex + 1).padStart(3, '0');
  const bnEpNumStr = toBengaliNumerals(epNumStr);
  const titleColor = colorPalette[activeShotIndex % colorPalette.length];

  const panY = currentShot.panY !== undefined ? currentShot.panY : 50;
  const imageUrl = currentShot.imageUrl || sampleCinemaImages[activeShotIndex % sampleCinemaImages.length];
  const isVideo = currentShot.isVideo || false;

  // Drag interaction for Vertical Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPanToolActive) return;
    setIsDragging(true);
    setDragStartY(e.clientY);
    setStartPanY(panY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaY = e.clientY - dragStartY;
    // Drag down increases offset, drag up decreases
    const deltaPercent = (deltaY / 300) * 50;
    const newPan = Math.max(0, Math.min(100, Math.round(startPanY + deltaPercent)));
    setShotPanY(activeShotIndex, newPan);
    setHudFeedback(newPan);
    clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => setHudFeedback(null), 1200);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Aspect ratio frame dimensions
  const getAspectStyle = () => {
    switch (aspectRatio) {
      case '2.39:1': return { aspectRatio: '2.39 / 1', maxHeight: '82vh', maxWidth: '196vh' };
      case '16:9': return { aspectRatio: '16 / 9', maxHeight: '86vh', maxWidth: '153vh' };
      case '4:3': return { aspectRatio: '4 / 3', maxHeight: '88vh', maxWidth: '117vh' };
      case '4:5': return { aspectRatio: '4 / 5', maxHeight: '88vh', maxWidth: '70vh' };
      case '1:1': return { aspectRatio: '1 / 1', maxHeight: '82vh', maxWidth: '82vh' };
      case '9:16': return { aspectRatio: '9 / 16', maxHeight: '88vh', maxWidth: '49vh' };
      default: return { aspectRatio: '16 / 9', maxHeight: '86vh' };
    }
  };

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-[#030304] select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Floating HUD Pill for Pan Drag */}
      {hudFeedback !== null && (
        <div 
          id="pan-hud-pill"
          className="fixed top-12 left-1/2 -translate-x-1/2 bg-[#0B0B0B]/90 border border-[#D4AF37] px-3 py-1 rounded-full text-xs font-mono text-[#FFE066] shadow-2xl flex items-center gap-2 z-50 animate-fadeIn"
        >
          <MoveVertical className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>PAN Y: {hudFeedback}%</span>
          <div className="w-16 h-1 bg-[#121212] rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-[#D4AF37]" style={{ width: `${hudFeedback}%` }} />
          </div>
        </div>
      )}

      {/* Frame Container */}
      <div 
        style={getAspectStyle()}
        onMouseDown={handleMouseDown}
        className={`relative w-full shadow-2xl overflow-hidden border border-[#D4AF37]/20 rounded-xs group ${
          isPanToolActive ? 'cursor-ns-resize' : ''
        }`}
      >
        {/* Base Media Layer */}
        {isVideo ? (
          <video
            src={imageUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: `center ${panY}%` }}
          />
        ) : (
          <div 
            className="absolute inset-0 w-full h-full bg-cover transition-all"
            style={{
              backgroundImage: `url('${imageUrl}')`,
              backgroundPosition: `center ${panY}%`,
              backgroundSize: fitMode === 'contain' ? 'contain' : 'cover',
              backgroundRepeat: 'no-repeat'
            }}
          />
        )}

        {/* Optical Center Focus & Edge Blur Shader Vignette */}
        {visibility.vignette && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 50%, transparent 35%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.85) 100%)'
            }}
          />
        )}

        {/* 35mm Grain Overlay */}
        {visibility.grain && (
          <div 
            className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 0)',
              backgroundSize: '3px 3px'
            }}
          />
        )}

        {/* Director Framing Guides */}
        {(isGuidesActive || visibility.guides) && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Rule of Thirds */}
            <div className="absolute left-1/3 inset-y-0 w-px bg-[#D4AF37]/30" />
            <div className="absolute left-2/3 inset-y-0 w-px bg-[#D4AF37]/30" />
            <div className="absolute top-1/3 inset-x-0 h-px bg-[#D4AF37]/30" />
            <div className="absolute top-2/3 inset-x-0 h-px bg-[#D4AF37]/30" />
            {/* Center Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-[#FFE066]/60 rounded-full" />
          </div>
        )}

        {/* HUD Data Readouts */}
        {visibility.hudData && (
          <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none z-10 text-[9px] font-mono tracking-wider text-[#8A8A8A]">
            <div className="flex justify-between items-start">
              <div className="text-[#FFE066]">
                PLAYBACK // FILE_{epNumStr}<br />
                FORMAT: RAW 14-BIT ARRI
              </div>
              <div className="text-right">
                NODE: DHAKA_01<br />
                <span className="text-[#4ADE80] inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
                  SECURE ARCHIVE
                </span>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div>
                FOCAL: {activeLens}<br />
                DOF: 1.8cm // {currentTheme.tag || 'MACRO EYES'}
              </div>
              <div className="text-right">
                A <span style={{ color: titleColor }} className="font-bold">RAWx</span> STORYBOARD<br />
                DIRECTOR: RAKIB HIMON
              </div>
            </div>
          </div>
        )}

        {/* Bengali + English Cinema Title Lockup */}
        {visibility.titlesAll && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 text-center px-4">
            {/* Episode Badge */}
            {visibility.badge && (
              <div className="mb-2 px-2.5 py-0.5 rounded-xs bg-black/60 border border-[#D4AF37]/40 text-[10px] font-mono tracking-widest text-[#D4AF37] flex items-center gap-1.5">
                <span className="font-['Noto_Serif_Bengali']">পর্ব {bnEpNumStr}</span>
                <span className="text-white/40">//</span>
                <span>EP {epNumStr}</span>
              </div>
            )}

            {/* Glowing Main Bengali Title */}
            {visibility.titleBn && (
              <h1 
                className="text-4xl sm:text-6xl font-['Noto_Serif_Bengali'] font-bold drop-shadow-[0_0_20px_rgba(212,175,55,0.7)]"
                style={{ color: titleColor }}
              >
                {currentShot.bengaliTitle || currentTheme.sub}
              </h1>
            )}

            {/* English Cinematic Subtitle */}
            {visibility.titleEn && (
              <h2 className="text-lg sm:text-2xl font-['Cinzel'] tracking-[0.25em] font-bold text-[#EDEDED] mt-1 drop-shadow-md">
                {currentShot.title || currentTheme.title}
              </h2>
            )}

            {/* Bengali Poetic Caption */}
            {visibility.caption && (
              <p className="text-xs sm:text-sm font-['Noto_Serif_Bengali'] text-[#FFE066] mt-2 max-w-lg drop-shadow">
                {currentShot.bengaliDesc || 'মহাজাগতিক শূন্যতায় চেতনার পরম প্রসারণ'}
              </p>
            )}

            {/* Tagline Readout */}
            {visibility.tagline && (
              <p className="text-[10px] font-mono tracking-[0.2em] text-[#8A8A8A] mt-1 uppercase">
                {currentShot.tagline || currentTheme.tag}
              </p>
            )}

            {/* Sound Cue Pill */}
            <div className="mt-3 px-2 py-0.5 rounded-full bg-black/70 border border-white/10 text-[9px] font-mono text-[#8A8A8A] flex items-center gap-1">
              <Volume2 className="w-2.5 h-2.5 text-[#D4AF37]" />
              <span>{currentTheme.soundCue || 'Sub-bass pulse 36Hz'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
