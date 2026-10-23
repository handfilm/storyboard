/**
 * @file /src/features/review/ReviewSlidePanel.tsx
 * @description Module 11: REVIEW (Frame-Accurate Video Markup & Client Notes)
 * Features:
 * - Interactive Tools: Freehand Pen, Tactical Arrow, Bounding Box, Text Flag
 * - Color Palette: Neon Amber (#F5A623), Cyan Flare (#00F0FF), Hazard Red (#FF3344)
 * - Frame Pin List: clicking note jumps timeline playhead to that frame
 * - 1-Click Action: [ ⤓ EXPORT REVIEW MANIFEST (.JSON / .MD) ]
 */

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Edit3, 
  ArrowRight, 
  Square, 
  Flag, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Sparkles,
  FileText,
  FileCode
} from 'lucide-react';
import { 
  reviewStore, 
  MarkupTool, 
  MarkupColor, 
  ReviewAnnotation 
} from '../../services/reviewStore';
import { audioEngine } from '../../utils/audioEngine';

interface ReviewSlidePanelProps {
  onJumpToFrame?: (shotIndex: number, timeSec: number) => void;
  activeShotIndex?: number;
  slideTimeSec?: number;
}

export const ReviewSlidePanel: React.FC<ReviewSlidePanelProps> = ({
  onJumpToFrame,
  activeShotIndex = 0,
  slideTimeSec = 0
}) => {
  const [activeTool, setActiveTool] = useState<MarkupTool>(reviewStore.getActiveTool());
  const [activeColor, setActiveColor] = useState<MarkupColor>(reviewStore.getActiveColor());
  const [strokeWidth, setStrokeWidth] = useState<number>(reviewStore.getStrokeWidth());
  const [annotations, setAnnotations] = useState<ReviewAnnotation[]>(reviewStore.getAnnotations());
  const [exportFormat, setExportFormat] = useState<'md' | 'json'>('md');
  const [copiedNotification, setCopiedNotification] = useState(false);

  useEffect(() => {
    const unsub = reviewStore.subscribe(() => {
      setActiveTool(reviewStore.getActiveTool());
      setActiveColor(reviewStore.getActiveColor());
      setStrokeWidth(reviewStore.getStrokeWidth());
      setAnnotations(reviewStore.getAnnotations());
    });
    return unsub;
  }, []);

  const handleSelectTool = (tool: MarkupTool) => {
    reviewStore.setActiveTool(tool);
    try {
      audioEngine.playShutterClick();
    } catch {}
  };

  const handleSelectColor = (color: MarkupColor) => {
    reviewStore.setActiveColor(color);
    try {
      audioEngine.playShutterClick();
    } catch {}
  };

  const handleJumpToPin = (ann: ReviewAnnotation) => {
    try {
      audioEngine.playShutterClick();
    } catch {}
    if (onJumpToFrame) {
      onJumpToFrame(ann.shotIndex, ann.timeSec);
    }
  };

  const handleExportManifest = (format: 'md' | 'json') => {
    try {
      audioEngine.playShutterClick();
    } catch {}

    let content = '';
    let fileName = '';
    let mimeType = '';

    if (format === 'json') {
      content = reviewStore.exportManifestJson();
      fileName = `review_manifest_${Date.now()}.json`;
      mimeType = 'application/json';
    } else {
      content = reviewStore.exportManifestMarkdown();
      fileName = `review_manifest_${Date.now()}.md`;
      mimeType = 'text/markdown';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const tools: { id: MarkupTool; label: string; icon: any }[] = [
    { id: 'pen', label: '✏ Freehand Pen', icon: Edit3 },
    { id: 'arrow', label: '➔ Tactical Arrow', icon: ArrowRight },
    { id: 'box', label: '▢ Bounding Box', icon: Square },
    { id: 'text', label: '💬 Text Flag', icon: Flag }
  ];

  const colors: { code: MarkupColor; name: string }[] = [
    { code: '#F5A623', name: 'Neon Amber' },
    { code: '#00F0FF', name: 'Cyan Flare' },
    { code: '#FF3344', name: 'Hazard Red' }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#12131a] border border-[#F5A623]/40 rounded p-4 relative overflow-hidden shadow-[0_0_20px_rgba(245,166,35,0.15)]">
        <div className="flex items-center gap-2 text-[#F5A623] mb-1">
          <MessageSquare className="w-4 h-4 animate-pulse" />
          <span className="font-mono-tech text-[11px] font-bold tracking-widest uppercase">
            [ MODULE 11 // REVIEW & MARKUP ]
          </span>
        </div>
        <p className="text-xs text-zinc-400 font-mono-tech">
          Frame-accurate stage markup layer & client approval tracking
        </p>
        <div className="mt-2 text-[10px] font-mono-tech text-zinc-500">
          Click tools below, then draw directly on the cinema stage monitor.
        </div>
      </div>

      {/* 2. Interactive Markup Tools */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono-tech font-bold uppercase tracking-wider text-white">
            Markup Tools
          </h4>
          <span className="text-[10px] font-mono-tech text-zinc-400">
            ACTIVE: {activeTool.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {tools.map((t) => {
            const isSelected = activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTool(t.id)}
                className={`p-2.5 rounded font-mono-tech text-[11px] text-left transition-all cursor-pointer border flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#F5A623]/20 border-[#F5A623] text-[#F5A623] font-bold shadow-[0_0_12px_rgba(245,166,35,0.3)]'
                    : 'bg-[#101117] border-white/10 text-zinc-300 hover:border-white/20 hover:text-white'
                }`}
              >
                <t.icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Color Palette Selector */}
        <div className="pt-2">
          <div className="text-[10px] font-mono-tech text-zinc-400 mb-1.5 uppercase">
            Color Palette:
          </div>
          <div className="flex items-center gap-2">
            {colors.map((c) => {
              const isSelected = activeColor === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelectColor(c.code)}
                  className={`flex-1 py-1.5 px-2 rounded font-mono-tech text-[10px] flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    isSelected ? 'ring-2 ring-white/60 font-bold' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: `${c.code}20`,
                    borderColor: c.code,
                    color: c.code
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.code }} />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Frame Pin List (Clicking jumps to frame) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono-tech font-bold uppercase tracking-wider text-white">
            Frame Pin List ({annotations.length})
          </h4>
          <span className="text-[10px] font-mono-tech text-amber-400">
            {annotations.filter(a => !a.resolved).length} UNRESOLVED
          </span>
        </div>

        {annotations.length === 0 ? (
          <div className="p-4 bg-black/40 border border-white/10 rounded text-center text-xs font-mono-tech text-zinc-500">
            No notes on timeline yet. Draw on the stage monitor to drop pins.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar pr-1">
            {annotations.map((ann) => (
              <div
                key={ann.id}
                onClick={() => handleJumpToPin(ann)}
                className={`p-2.5 rounded border transition-all cursor-pointer text-[11px] font-mono-tech group ${
                  ann.resolved 
                    ? 'bg-[#0f1015]/60 border-white/5 opacity-70' 
                    : 'bg-[#12131c] border-white/10 hover:border-[#F5A623]/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ann.color }}
                    />
                    <strong className="text-white group-hover:text-[#F5A623] transition-colors">
                      Shot {String(ann.shotIndex + 1).padStart(3, '0')} @ F{String(ann.frameNumber).padStart(3, '0')}
                    </strong>
                    <span className="text-[9.5px] text-zinc-500">({ann.tool.toUpperCase()})</span>
                  </div>

                  <span className="text-[9px] text-zinc-500">{ann.timestamp}</span>
                </div>

                <p className="text-zinc-300 text-[10.5px] line-clamp-2 leading-relaxed">
                  "{ann.text || 'Visual mark'}"
                </p>

                <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9.5px]">
                  <span className="text-zinc-500 truncate max-w-[150px]">{ann.author}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        reviewStore.toggleResolved(ann.id);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[8.5px] border cursor-pointer ${
                        ann.resolved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-white/5 text-zinc-400 hover:text-white border-white/10'
                      }`}
                    >
                      {ann.resolved ? '✓ RESOLVED' : 'MARK DONE'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        reviewStore.deleteAnnotation(ann.id);
                      }}
                      className="text-zinc-500 hover:text-red-400 p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. 1-Click Action: Export Review Manifest */}
      <div className="pt-2 space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExportManifest('md')}
            className="flex-1 py-2.5 px-3 bg-gradient-to-r from-[#F5A623] to-[#e09612] hover:from-[#ffb43b] hover:to-[#f5a623] text-black font-mono-tech font-bold text-[11px] uppercase tracking-wider rounded shadow-[0_0_15px_rgba(245,166,35,0.3)] flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>[ ⤓ EXPORT MANIFEST (.MD) ]</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportManifest('json')}
            className="py-2.5 px-3 bg-[#181a24] hover:bg-[#222433] text-white border border-white/20 font-mono-tech font-bold text-[11px] uppercase tracking-wider rounded flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            title="Export as structured JSON manifest"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>.JSON</span>
          </button>
        </div>

        {copiedNotification && (
          <div className="text-[10px] font-mono-tech text-emerald-400 text-center animate-in fade-in">
            ✓ Manifest exported successfully!
          </div>
        )}
      </div>
    </div>
  );
};
