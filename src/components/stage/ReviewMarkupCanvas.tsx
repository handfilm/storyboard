/**
 * @file /src/components/stage/ReviewMarkupCanvas.tsx
 * @description Direct visual annotation overlay on the active frame monitor for Module 11 (REVIEW).
 * Supports Freehand Pen, Tactical Arrow, Bounding Box, and Text Flag with glow styling.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  reviewStore, 
  MarkupTool, 
  MarkupColor, 
  ReviewAnnotation, 
  ReviewPoint 
} from '../../services/reviewStore';
import { MessageSquare, ArrowRight, Square, Edit3, Check, Trash2, X } from 'lucide-react';

interface ReviewMarkupCanvasProps {
  shotIndex: number;
  slideTimeSec: number;
  onJumpToFrame?: (shotIndex: number, timeSec: number) => void;
}

export const ReviewMarkupCanvas: React.FC<ReviewMarkupCanvasProps> = ({
  shotIndex,
  slideTimeSec,
  onJumpToFrame
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<MarkupTool>(reviewStore.getActiveTool());
  const [activeColor, setActiveColor] = useState<MarkupColor>(reviewStore.getActiveColor());
  const [strokeWidth, setStrokeWidth] = useState<number>(reviewStore.getStrokeWidth());
  const [annotations, setAnnotations] = useState<ReviewAnnotation[]>(reviewStore.getAnnotations(shotIndex));

  // In-progress drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<ReviewPoint[]>([]);
  const [startPoint, setStartPoint] = useState<ReviewPoint | null>(null);
  const [currentEndPoint, setCurrentEndPoint] = useState<ReviewPoint | null>(null);

  // Text Flag Creation Modal
  const [pendingTextPoint, setPendingTextPoint] = useState<ReviewPoint | null>(null);
  const [flagTextInput, setFlagTextInput] = useState('');

  // Selected Pin for popover
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = reviewStore.subscribe(() => {
      setActiveTool(reviewStore.getActiveTool());
      setActiveColor(reviewStore.getActiveColor());
      setStrokeWidth(reviewStore.getStrokeWidth());
      setAnnotations(reviewStore.getAnnotations(shotIndex));
    });
    return unsub;
  }, [shotIndex]);

  // Convert mouse/touch event to percentage coords
  const getCoords = (e: React.MouseEvent<HTMLDivElement>): ReviewPoint | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // If clicking on text popover or button, ignore
    if ((e.target as HTMLElement).closest('.interactive-control')) return;

    const coords = getCoords(e);
    if (!coords) return;

    if (activeTool === 'text') {
      setPendingTextPoint(coords);
      setFlagTextInput('');
      return;
    }

    setIsDrawing(true);
    setStartPoint(coords);
    setCurrentEndPoint(coords);
    if (activeTool === 'pen') {
      setCurrentPoints([coords]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    const coords = getCoords(e);
    if (!coords) return;

    setCurrentEndPoint(coords);
    if (activeTool === 'pen') {
      setCurrentPoints(prev => [...prev, coords]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const frameNumber = Math.max(1, Math.min(288, Math.round(slideTimeSec * 24)));

    if (activeTool === 'pen' && currentPoints.length > 2) {
      reviewStore.addAnnotation({
        shotIndex,
        frameNumber,
        timeSec: slideTimeSec,
        tool: 'pen',
        color: activeColor,
        points: currentPoints,
        text: `Freehand markup on Shot ${String(shotIndex + 1).padStart(3, '0')}`,
        author: 'Director Review'
      });
    } else if (activeTool === 'arrow' && startPoint && currentEndPoint) {
      reviewStore.addAnnotation({
        shotIndex,
        frameNumber,
        timeSec: slideTimeSec,
        tool: 'arrow',
        color: activeColor,
        startX: startPoint.x,
        startY: startPoint.y,
        endX: currentEndPoint.x,
        endY: currentEndPoint.y,
        text: `Tactile pointer at (${Math.round(currentEndPoint.x)}%, ${Math.round(currentEndPoint.y)}%)`,
        author: 'Lead Reviewer'
      });
    } else if (activeTool === 'box' && startPoint && currentEndPoint) {
      reviewStore.addAnnotation({
        shotIndex,
        frameNumber,
        timeSec: slideTimeSec,
        tool: 'box',
        color: activeColor,
        startX: Math.min(startPoint.x, currentEndPoint.x),
        startY: Math.min(startPoint.y, currentEndPoint.y),
        endX: Math.max(startPoint.x, currentEndPoint.x),
        endY: Math.max(startPoint.y, currentEndPoint.y),
        text: `Region boundary for optical grading`,
        author: 'Colorist'
      });
    }

    setCurrentPoints([]);
    setStartPoint(null);
    setCurrentEndPoint(null);
  };

  const handleConfirmTextFlag = () => {
    if (!pendingTextPoint || !flagTextInput.trim()) {
      setPendingTextPoint(null);
      return;
    }
    const frameNumber = Math.max(1, Math.min(288, Math.round(slideTimeSec * 24)));
    reviewStore.addAnnotation({
      shotIndex,
      frameNumber,
      timeSec: slideTimeSec,
      tool: 'text',
      color: activeColor,
      startX: pendingTextPoint.x,
      startY: pendingTextPoint.y,
      text: flagTextInput.trim(),
      author: 'Director (Rakib Himon)'
    });
    setPendingTextPoint(null);
    setFlagTextInput('');
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="absolute inset-0 z-30 cursor-crosshair select-none overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Top Banner indicating review mode */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#0c0d10]/90 backdrop-blur-md border border-[#F5A623]/60 rounded-full flex items-center gap-2 pointer-events-none shadow-[0_0_15px_rgba(245,166,35,0.3)]">
        <span className="w-2 h-2 rounded-full bg-[#F5A623] animate-pulse" />
        <span className="text-[10px] font-mono-tech uppercase font-bold text-[#F5A623] tracking-widest">
          REVIEW MARKUP ACTIVE // TOOL: {activeTool.toUpperCase()} // COLOR: {activeColor}
        </span>
      </div>

      {/* SVG Vector Drawing Layer */}
      <svg className="w-full h-full pointer-events-none absolute inset-0">
        <defs>
          <marker
            id="arrowhead-amber"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#F5A623" />
          </marker>
          <marker
            id="arrowhead-cyan"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#00F0FF" />
          </marker>
          <marker
            id="arrowhead-red"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#FF3344" />
          </marker>
        </defs>

        {/* Existing Annotations for this shot */}
        {annotations.map((ann) => {
          const markerId = ann.color === '#00F0FF' ? 'url(#arrowhead-cyan)' : ann.color === '#FF3344' ? 'url(#arrowhead-red)' : 'url(#arrowhead-amber)';

          if (ann.tool === 'pen' && ann.points && ann.points.length > 1) {
            const pathData = ann.points.reduce((acc, pt, i) => {
              return `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x}% ${pt.y}%`;
            }, '');
            return (
              <path
                key={ann.id}
                d={pathData}
                fill="none"
                stroke={ann.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all opacity-90"
                style={{ filter: `drop-shadow(0 0 6px ${ann.color})` }}
              />
            );
          }

          if (ann.tool === 'arrow' && ann.startX !== undefined && ann.startY !== undefined && ann.endX !== undefined && ann.endY !== undefined) {
            return (
              <line
                key={ann.id}
                x1={`${ann.startX}%`}
                y1={`${ann.startY}%`}
                x2={`${ann.endX}%`}
                y2={`${ann.endY}%`}
                stroke={ann.color}
                strokeWidth={strokeWidth}
                markerEnd={markerId}
                style={{ filter: `drop-shadow(0 0 6px ${ann.color})` }}
              />
            );
          }

          if (ann.tool === 'box' && ann.startX !== undefined && ann.startY !== undefined && ann.endX !== undefined && ann.endY !== undefined) {
            const width = Math.abs(ann.endX - ann.startX);
            const height = Math.abs(ann.endY - ann.startY);
            return (
              <g key={ann.id}>
                <rect
                  x={`${ann.startX}%`}
                  y={`${ann.startY}%`}
                  width={`${width}%`}
                  height={`${height}%`}
                  fill={ann.color + '15'}
                  stroke={ann.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray="4 3"
                  style={{ filter: `drop-shadow(0 0 6px ${ann.color})` }}
                />
                {/* Tactical Corner Crosshairs */}
                <line x1={`${ann.startX - 1}%`} y1={`${ann.startY}%`} x2={`${ann.startX + 2}%`} y2={`${ann.startY}%`} stroke={ann.color} strokeWidth={2} />
                <line x1={`${ann.startX}%`} y1={`${ann.startY - 1}%`} x2={`${ann.startX}%`} y2={`${ann.startY + 2}%`} stroke={ann.color} strokeWidth={2} />
              </g>
            );
          }

          return null;
        })}

        {/* Real-time In-progress Vector Shape */}
        {isDrawing && activeTool === 'pen' && currentPoints.length > 1 && (
          <path
            d={currentPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x}% ${pt.y}%`, '')}
            fill="none"
            stroke={activeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 8px ${activeColor})` }}
          />
        )}

        {isDrawing && activeTool === 'arrow' && startPoint && currentEndPoint && (
          <line
            x1={`${startPoint.x}%`}
            y1={`${startPoint.y}%`}
            x2={`${currentEndPoint.x}%`}
            y2={`${currentEndPoint.y}%`}
            stroke={activeColor}
            strokeWidth={strokeWidth}
            markerEnd={activeColor === '#00F0FF' ? 'url(#arrowhead-cyan)' : activeColor === '#FF3344' ? 'url(#arrowhead-red)' : 'url(#arrowhead-amber)'}
            style={{ filter: `drop-shadow(0 0 8px ${activeColor})` }}
          />
        )}

        {isDrawing && activeTool === 'box' && startPoint && currentEndPoint && (
          <rect
            x={`${Math.min(startPoint.x, currentEndPoint.x)}%`}
            y={`${Math.min(startPoint.y, currentEndPoint.y)}%`}
            width={`${Math.abs(currentEndPoint.x - startPoint.x)}%`}
            height={`${Math.abs(currentEndPoint.y - startPoint.y)}%`}
            fill={activeColor + '20'}
            stroke={activeColor}
            strokeWidth={strokeWidth}
            strokeDasharray="4 3"
            style={{ filter: `drop-shadow(0 0 8px ${activeColor})` }}
          />
        )}
      </svg>

      {/* HTML Interactive Pin Overlays for Text Flags and Markers */}
      {annotations.map((ann) => {
        const posX = ann.startX !== undefined ? ann.startX : ann.points?.[0]?.x || 50;
        const posY = ann.startY !== undefined ? ann.startY : ann.points?.[0]?.y || 50;
        const isSelected = selectedPinId === ann.id;

        return (
          <div
            key={ann.id}
            style={{ left: `${posX}%`, top: `${posY}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 interactive-control z-40 pointer-events-auto cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPinId(isSelected ? null : ann.id);
              if (onJumpToFrame) {
                onJumpToFrame(ann.shotIndex, ann.timeSec);
              }
            }}
          >
            {/* Tactical Flag Pin Marker */}
            <div 
              className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono-tech text-[10px] font-bold shadow-lg transition-transform group-hover:scale-125 ${
                ann.resolved ? 'bg-zinc-900 border-zinc-600 text-zinc-400' : 'bg-black/90'
              }`}
              style={{
                borderColor: ann.resolved ? '#52525b' : ann.color,
                color: ann.resolved ? '#a1a1aa' : ann.color,
                boxShadow: ann.resolved ? 'none' : `0 0 10px ${ann.color}`
              }}
            >
              F{ann.frameNumber}
            </div>

            {/* Hover Tooltip or Selected Popover */}
            {(isSelected || false) && (
              <div 
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-[#0c0d10]/95 backdrop-blur-xl border border-[#F5A623]/50 p-2.5 rounded shadow-2xl z-50 text-white animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1.5 text-[9px] font-mono-tech">
                  <span className="text-[#F5A623] font-bold">SHOT {String(ann.shotIndex + 1).padStart(3, '0')} // F{ann.frameNumber}</span>
                  <span className="text-zinc-400">{ann.timestamp}</span>
                </div>
                <p className="text-xs text-zinc-200 leading-snug">{ann.text || 'No note text'}</p>
                <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px]">
                  <span className="text-zinc-400 font-mono-tech truncate max-w-[120px]">{ann.author}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => reviewStore.toggleResolved(ann.id)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono-tech border cursor-pointer ${
                        ann.resolved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {ann.resolved ? 'RESOLVED' : 'RESOLVE'}
                    </button>
                    <button
                      onClick={() => reviewStore.deleteAnnotation(ann.id)}
                      className="p-1 text-zinc-400 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Text Flag Input Modal (Appears when clicking with Text Tool) */}
      {pendingTextPoint && (
        <div
          style={{ left: `${pendingTextPoint.x}%`, top: `${pendingTextPoint.y}%` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-50 bg-[#0c0d10]/98 backdrop-blur-2xl border border-[#F5A623] p-3 rounded shadow-[0_0_30px_rgba(245,166,35,0.4)] w-72 interactive-control"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between text-[10px] font-mono-tech text-[#F5A623] mb-2 font-bold uppercase">
            <span>ADD REVIEW FLAG @ F{Math.round(slideTimeSec * 24)}</span>
            <button onClick={() => setPendingTextPoint(null)} className="text-zinc-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            autoFocus
            rows={3}
            value={flagTextInput}
            onChange={(e) => setFlagTextInput(e.target.value)}
            placeholder="e.g. Increase rim light bloom, shadow fill too cold..."
            className="w-full bg-black/60 border border-white/20 rounded p-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#F5A623] resize-none font-mono-tech"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleConfirmTextFlag();
              }
            }}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setPendingTextPoint(null)}
              className="px-2.5 py-1 text-[10px] font-mono-tech text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmTextFlag}
              className="px-3 py-1 bg-[#F5A623] hover:bg-[#e09612] text-black font-mono-tech font-bold text-[10px] rounded flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>Drop Flag</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
