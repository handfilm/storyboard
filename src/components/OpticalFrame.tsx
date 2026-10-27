/**
 * @file /src/components/OpticalFrame.tsx
 * @description Master Optical Canvas Viewport for active cinematic shot.
 * Renders full-resolution media with anamorphic aspect ratio, LUT filters,
 * optical bloom flare, and reactive bilingual typography overlays.
 */

import React, { useRef } from 'react';
import { AnthologyFrame, AspectRatio } from '../types/anthology';
import { ComponentVisibility } from './ComponentsMatrixPopover';
import { getLutFilterCSS, calculateMultiLayerZoom } from '../utils/engine';
import { StageTextOverlay } from './StageTextOverlay';
import { useStudioStore } from '../core/store';
import { Upload, Film, Sliders, Maximize2 } from 'lucide-react';

export interface OpticalFrameProps {
  frame: AnthologyFrame;
  aspectRatio: AspectRatio | string;
  directorName?: string;
  nodeLocation?: string;
  showHud?: boolean;
  isAutoplay?: boolean;
  componentsVisibility?: ComponentVisibility;
  onUploadImage?: (file: File) => void;
  onOpenInspector?: () => void;
  onQuickSampleImage?: () => void;
  onToggleTitles?: () => void;
}

export const OpticalFrame: React.FC<OpticalFrameProps> = ({
  frame,
  aspectRatio = '2.39:1',
  directorName = 'Director',
  nodeLocation = 'DHAKA_01',
  showHud = true,
  isAutoplay = false,
  componentsVisibility,
  onUploadImage,
  onOpenInspector,
  onQuickSampleImage,
  onToggleTitles
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fgZoom = useStudioStore((s) => s.foregroundZoom);
  const bgZoom = useStudioStore((s) => s.backgroundZoom);
  const isVertigo = useStudioStore((s) => s.isVertigoLinked);
  const zoomTransforms = calculateMultiLayerZoom(bgZoom, fgZoom, isVertigo);

  const getAspectClass = (ar: string) => {
    switch (ar) {
      case '2.39:1':
        return 'aspect-[2.39/1]';
      case '16:9':
        return 'aspect-[16/9]';
      case '4:3':
        return 'aspect-[4/3]';
      case '1:1':
        return 'aspect-square';
      case '9:16':
        return 'aspect-[9/16]';
      default:
        return 'aspect-[2.39/1]';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0] && onUploadImage) {
      onUploadImage(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const filterStyle = getLutFilterCSS(frame?.lutFilter, frame?.adjustments);
  const combinedMediaFilter = zoomTransforms.bgDepthBlur !== 'none'
    ? `${filterStyle} ${zoomTransforms.bgDepthBlur}`
    : filterStyle;

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`relative w-full max-h-full max-w-6xl mx-auto ${getAspectClass(
        aspectRatio
      )} bg-[#050505] border border-[#272732] shadow-[0_20px_70px_rgba(0,0,0,0.95)] rounded-[2px] overflow-hidden flex items-center justify-center select-none group`}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0] && onUploadImage) {
            onUploadImage(e.target.files[0]);
          }
        }}
      />

      {/* Media Layer */}
      {frame?.imageUrl ? (
        <div
          className="w-full h-full flex items-center justify-center overflow-hidden transition-transform duration-200 ease-out origin-center"
          style={{ transform: zoomTransforms.bgTransform }}
        >
          {frame.isVideo ? (
            <video
              src={frame.imageUrl}
              crossOrigin="anonymous"
              autoPlay={isAutoplay}
              loop
              muted
              playsInline
              className="w-full h-full object-cover transition-transform duration-500 pointer-events-none"
              style={{ filter: combinedMediaFilter }}
            />
          ) : (
            <img
              src={frame.imageUrl}
              crossOrigin="anonymous"
              alt={frame.title}
              className="w-full h-full object-cover transition-transform duration-500 pointer-events-none"
              style={{ filter: combinedMediaFilter }}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-zinc-500 gap-3 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#d4af37]">
            <Film className="w-8 h-8 opacity-70" />
          </div>
          <div>
            <p className="font-cinzel text-sm text-zinc-300 font-bold tracking-wider">
              SHOT {frame?.epNumber || '001'} // EMPTY CANVASS
            </p>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono-tech">
              Drag & Drop 4K video or photo, or click upload
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 px-3.5 py-1.5 rounded-[2px] bg-[#d4af37]/20 hover:bg-[#d4af37]/35 border border-[#d4af37]/50 text-[#ffe066] text-xs font-mono-tech flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Select Media</span>
          </button>
        </div>
      )}

      {/* Reactive Bilingual Typography Overlay (Foreground Multi-Layer Zoom) */}
      {componentsVisibility?.titlesAll !== false && (
        <div
          className="absolute inset-0 pointer-events-none transition-transform duration-200 ease-out origin-center"
          style={{ transform: zoomTransforms.fgTransform, filter: zoomTransforms.fgShadow }}
        >
          <StageTextOverlay
            shotIndex={frame?.id ?? 0}
            banglaTitle={frame?.bengaliTitle}
            englishTitle={frame?.title}
            subtitle={frame?.tagline}
            directorNotes={frame?.directorNotes}
            cameraInfo={frame?.cameraSpec?.focalLength}
            isVisible={true}
            componentsVisibility={componentsVisibility}
          />
        </div>
      )}

      {/* Directorial HUD Overlay */}
      {showHud && (
        <div className="absolute top-3 inset-x-3 pointer-events-none flex items-center justify-between text-[10px] font-mono-tech text-white/70">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 border border-white/10 rounded-[1px]">
            <span className="text-[#d4af37] font-bold">EP {frame?.epNumber || '001'}</span>
            <span className="text-white/40">|</span>
            <span className="truncate max-w-[150px]">{frame?.title}</span>
          </div>

          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 border border-white/10 rounded-[1px]">
            <span>{frame?.cameraSpec?.focalLength || '35mm High-Speed'}</span>
            <span className="text-white/40">|</span>
            <span className="text-[#ffe066]">{frame?.cameraSpec?.aperture || 'f/1.4'}</span>
          </div>
        </div>
      )}

      {/* Quick Action Overlay Buttons on Hover */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 pointer-events-auto">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-[2px] bg-black/80 hover:bg-black text-white/80 hover:text-white border border-white/20 transition-all cursor-pointer"
          title="Upload or Change Shot Media"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>
        {onOpenInspector && (
          <button
            onClick={onOpenInspector}
            className="p-1.5 rounded-[2px] bg-black/80 hover:bg-black text-white/80 hover:text-[#ffe066] border border-white/20 transition-all cursor-pointer"
            title="Open Optics & Color Inspector"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
