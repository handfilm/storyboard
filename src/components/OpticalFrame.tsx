import React, { useState, useRef, useEffect } from 'react';
import { AnthologyFrame, AspectRatio } from '../types/anthology';
import { getLutFilterCSS } from '../utils/engine';
import { Upload, Image as ImageIcon, Sliders, Sparkles, Eye, Volume2 } from 'lucide-react';

interface OpticalFrameProps {
  frame: AnthologyFrame;
  aspectRatio: AspectRatio;
  directorName: string;
  nodeLocation: string;
  showHud: boolean;
  isAutoplay: boolean;
  onUploadImage: (file: File) => void;
  onOpenInspector: () => void;
  onQuickSampleImage: () => void;
}

export const OpticalFrame: React.FC<OpticalFrameProps> = ({
  frame,
  aspectRatio,
  directorName,
  nodeLocation,
  showHud,
  isAutoplay,
  onUploadImage,
  onOpenInspector,
  onQuickSampleImage
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filterCSS = getLutFilterCSS(frame.lutFilter, frame.adjustments);
  const hasPhoto = Boolean(frame.imageUrl);

  // Subtle interactive 3D perspective tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onUploadImage(file);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0]);
    }
  };

  // Aspect ratio container classes
  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case '2.39:1':
        return 'w-full h-full max-h-[82vh] max-w-[196vh] aspect-[2.39/1]';
      case '16:9':
        return 'w-full h-full max-h-[88vh] max-w-[156vh] aspect-[16/9]';
      case '4:3':
        return 'w-full h-full max-h-[92vh] max-w-[122vh] aspect-[4/3]';
      case '1:1':
        return 'w-full h-full max-h-[85vh] max-w-[85vh] aspect-square';
      case '9:16':
        return 'w-full h-full max-h-[92vh] max-w-[52vh] aspect-[9/16]';
      default:
        return 'w-full h-full';
    }
  };

  // Hover styles 0, 1, 2
  const hoverClasses = [
    'group/frame hover:scale-[1.008]',
    'group/frame hover:-translate-y-0.5',
    'group/frame hover:brightness-105'
  ][frame.hoverStyle];

  return (
    <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Matte black cinema background container with letterboxing */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        style={{
          transform: `perspective(1000px) rotateX(${-mousePos.y * 0.4}deg) rotateY(${mousePos.x * 0.4}deg)`,
          transition: 'transform 0.4s var(--ease-hypersonic)'
        }}
        className={`relative ${getAspectRatioClasses()} bg-[#080808] border border-white/10 rounded-sm shadow-2xl overflow-hidden ${hoverClasses}`}
      >
        {/* Layer 1: Base Sharp Cinematic Image with Ken Burns drift */}
        {hasPhoto ? (
          <div
            className={`absolute -inset-[8%] bg-cover bg-center transition-transform duration-700 ease-out z-[1] ${
              isAutoplay ? 'scale-105 transition-transform duration-[6000ms]' : 'scale-100'
            }`}
            style={{
              backgroundImage: `url(${frame.imageUrl})`,
              filter: filterCSS,
              transform: `translate(${mousePos.x * 0.6}px, ${mousePos.y * 0.6}px)`
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c0d12] via-[#08080a] to-[#040405] z-[1] flex items-center justify-center">
            {/* Ambient geometric grid */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
          </div>
        )}

        {/* Layer 2: Soft Skin Center Focus Bloom */}
        {hasPhoto && (
          <div
            className="absolute -inset-[6%] bg-cover bg-center mix-blend-screen pointer-events-none z-[2] transition-opacity duration-700"
            style={{
              backgroundImage: `url(${frame.imageUrl})`,
              filter: `blur(${Math.max(6, frame.adjustments.bloom * 0.2)}px) brightness(1.2) contrast(1.1)`,
              opacity: (frame.adjustments.bloom / 100) * 0.7,
              maskImage: 'radial-gradient(circle at center, black 15%, transparent 65%)',
              WebkitMaskImage: 'radial-gradient(circle at center, black 15%, transparent 65%)'
            }}
          />
        )}

        {/* Layer 3: Radial Anamorphic Lens Blur & Falloff */}
        {hasPhoto && (
          <div
            className="absolute -inset-[6%] bg-cover bg-center pointer-events-none z-[3] transition-opacity duration-700"
            style={{
              backgroundImage: `url(${frame.imageUrl})`,
              filter: 'blur(12px) brightness(0.8)',
              opacity: 0.95,
              maskImage: 'radial-gradient(circle at center, transparent 35%, black 85%)',
              WebkitMaskImage: 'radial-gradient(circle at center, transparent 35%, black 85%)'
            }}
          />
        )}

        {/* Layer 4: Edge Hypersonic Motion Blur */}
        {hasPhoto && (
          <div
            className="absolute -inset-[10%] bg-cover bg-center pointer-events-none z-[4] transition-all duration-700"
            style={{
              backgroundImage: `url(${frame.imageUrl})`,
              filter: `blur(${Math.max(8, frame.adjustments.motionBlur * 0.2)}px)`,
              transform: 'scaleX(1.12) scaleY(1.02)',
              opacity: (frame.adjustments.motionBlur / 100) * 0.85,
              maskImage: 'linear-gradient(to right, black 0%, transparent 16%, transparent 84%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 16%, transparent 84%, black 100%)'
            }}
          />
        )}

        {/* Layer 5: Procedural Film Grain & Dynamic Vignette */}
        <div
          className="absolute inset-0 film-grain z-[10] pointer-events-none"
          style={{ opacity: frame.adjustments.grain / 100 }}
        />
        <div
          className="absolute inset-0 pointer-events-none z-[11]"
          style={{
            background: `radial-gradient(circle at center, transparent ${100 - frame.adjustments.vignette}%, rgba(0,0,0,${frame.adjustments.vignette / 100 * 0.85}) 100%)`
          }}
        />

        {/* Layer 6: Drop Zone & Photo Selection Prompt */}
        {!hasPhoto && (
          <div
            className={`absolute inset-0 z-[25] flex flex-col items-center justify-center gap-4 transition-all duration-300 ${
              isDragOver ? 'bg-amber-500/10 scale-102 border-2 border-amber-400' : 'bg-transparent'
            }`}
          >
            <div className="w-16 h-16 rounded-full border border-white/20 bg-black/60 flex items-center justify-center text-white/50 backdrop-blur-md shadow-lg group-hover/frame:border-amber-400 group-hover/frame:text-amber-400 transition-colors">
              <Upload className="w-7 h-7 stroke-[1.5]" />
            </div>
            <div className="text-center px-4">
              <p className="font-mono-tech text-xs tracking-[0.3em] text-white/70 uppercase mb-1">
                [ DROP PHOTO {frame.epNumber} // OR CLICK TO LOAD ]
              </p>
              <p className="text-[10px] text-white/40 tracking-wider">
                SUPPORTS RAW, JPG, PNG, WEBP • DRAG & DROP ANYWHERE
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xs text-[11px] font-mono-tech tracking-wider text-white flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                Upload File
              </button>
              <button
                onClick={onQuickSampleImage}
                className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xs text-[11px] font-mono-tech tracking-wider text-amber-300 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Load Cinema Preset
              </button>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          accept="image/*"
          className="hidden"
        />

        {/* Layer 7: Cinematic Title & Bengali Calligraphy Overlay */}
        <div className="absolute inset-0 z-[30] pointer-events-none flex flex-col items-center justify-center text-center p-6 sm:p-12">
          <div className="max-w-4xl transition-transform duration-500 transform group-hover/frame:-translate-y-1">
            {/* Bengali Subtitle / Act identification */}
            <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
              <span className="font-mono-tech text-[10px] sm:text-xs tracking-[0.35em] text-amber-400/90 font-medium uppercase drop-shadow-md">
                EP {frame.epNumber} //
              </span>
              <span className="font-bengali text-sm sm:text-lg tracking-widest text-amber-300 drop-shadow-lg font-semibold">
                {frame.bengaliTitle}
              </span>
            </div>

            {/* Epic Cinzel Main Title */}
            <h1
              className="font-cinzel text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-[0.18em] uppercase transition-all duration-500 leading-tight"
              style={{
                color: frame.colorAccent,
                textShadow: `0 8px 30px rgba(0,0,0,0.95), 0 2px 10px ${frame.colorAccent}40`
              }}
            >
              {frame.title}
            </h1>

            {/* Curatorial Tagline */}
            <p className="font-mono-tech text-[10px] sm:text-xs md:text-sm tracking-[0.25em] text-white/75 mt-2 sm:mt-4 max-w-2xl mx-auto drop-shadow-md uppercase">
              {frame.tagline}
            </p>

            {/* Directorial Sound Cue notification if present */}
            {frame.soundCue && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-mono-tech text-white/50 tracking-wider">
                <Volume2 className="w-2.5 h-2.5 text-amber-400" />
                <span>{frame.soundCue}</span>
              </div>
            )}
          </div>
        </div>

        {/* Layer 8: Responsive HUD Telemetry Framing */}
        {showHud && (
          <div className="absolute inset-4 sm:inset-6 md:inset-8 border border-white/15 pointer-events-none z-[35] transition-all duration-300">
            {/* HUD Corner Accents */}
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-400" />
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-400" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-400" />

            {/* Top Left: File & Bitrate */}
            <div className="absolute top-2.5 left-2.5 font-mono-tech text-[9px] sm:text-[10px] tracking-[0.2em] text-white/60 leading-relaxed uppercase">
              <div>PLAYBACK // FILE_{frame.epNumber}</div>
              <div className="text-white/40">FORMAT: {frame.cameraSpec.format}</div>
            </div>

            {/* Top Right: Node Archive */}
            <div className="absolute top-2.5 right-2.5 font-mono-tech text-[9px] sm:text-[10px] tracking-[0.2em] text-white/60 text-right leading-relaxed uppercase">
              <div>NODE: {nodeLocation}</div>
              <div className="text-emerald-400/80 flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SECURE ARCHIVE
              </div>
            </div>

            {/* Bottom Left: Camera Optics Spec */}
            <div className="absolute bottom-2 left-2 sm:bottom-2.5 sm:left-2.5 font-mono-tech text-[7px] sm:text-[10px] tracking-[0.1em] sm:tracking-[0.2em] text-white/60 leading-tight sm:leading-relaxed uppercase max-w-[48%]">
              <div className="truncate">FOCAL: {frame.cameraSpec.focalLength}</div>
              <div className="text-white/40 truncate">SHUTTER: {frame.cameraSpec.aperture} {frame.cameraSpec.iso}</div>
            </div>

            {/* Bottom Right: Production Credits */}
            <div className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 font-mono-tech text-[7px] sm:text-[10px] tracking-[0.1em] sm:tracking-[0.2em] text-white/60 text-right leading-tight sm:leading-relaxed uppercase max-w-[48%]">
              <div className="truncate">
                A <span style={{ color: frame.colorAccent }} className="font-bold">RAWx</span> PRODUCTION
              </div>
              <div className="text-white/40 truncate">DIR: {directorName}</div>
            </div>
          </div>
        )}

        {/* Quick Edit Trigger on Frame Hover */}
        {hasPhoto && (
          <div className="absolute top-4 right-4 z-[40] flex items-center gap-2 opacity-0 group-hover/frame:opacity-100 transition-opacity">
            <button
              onClick={onOpenInspector}
              className="p-2 rounded-xs bg-black/75 hover:bg-black border border-white/20 text-white/80 hover:text-amber-400 backdrop-blur-md cursor-pointer transition-colors shadow-lg"
              title="Open Director Inspector & Adjustments"
              aria-label="Open Frame Inspector"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xs bg-black/75 hover:bg-black border border-white/20 text-white/80 hover:text-amber-400 backdrop-blur-md cursor-pointer transition-colors shadow-lg"
              title="Replace Frame Photo"
              aria-label="Replace Photo"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
