import React, { useState } from 'react';
import { AnthologyFrame } from '../types/anthology';
import { 
  Search, 
  Sparkles, 
  Filter, 
  CheckCircle2, 
  Image as ImageIcon, 
  Camera, 
  Download, 
  GripVertical, 
  FileText, 
  MoveLeft, 
  MoveRight,
  ArrowUpDown,
  Printer,
  X,
  RefreshCw
} from 'lucide-react';
import { filterFrames } from '../utils/engine';
import { downloadStoryboardPdf, StoryboardPdfOptions } from '../utils/pdfExport';

interface GridViewProps {
  frames: AnthologyFrame[];
  currentFrameIndex: number;
  onSelectFrame: (index: number) => void;
  onPopulateSamplePack: () => void;
  onReorderFrames?: (newFrames: AnthologyFrame[]) => void;
  projectTitle?: string;
  directorName?: string;
  aspectRatio?: string;
}

export const GridView: React.FC<GridViewProps> = ({
  frames,
  currentFrameIndex,
  onSelectFrame,
  onPopulateSamplePack,
  onReorderFrames,
  projectTitle = 'Master Storyboard',
  directorName = 'Directorial Team',
  aspectRatio = '2.39:1'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();

  // Drag-and-drop state
  const [draggedFrameId, setDraggedFrameId] = useState<number | null>(null);
  const [dragOverFrameId, setDragOverFrameId] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before');
  const [reorderFeedback, setReorderFeedback] = useState<string | null>(null);

  // PDF Export state
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfStatusMessage, setPdfStatusMessage] = useState('');
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [pdfLayout, setPdfLayout] = useState<4 | 6>(6);
  const [pdfTheme, setPdfTheme] = useState<'print' | 'dark'>('print');

  const filtered = filterFrames(frames, searchQuery, selectedTag);

  // Extract top tags safely
  const allTags = Array.from(new Set((frames || []).flatMap(f => Array.isArray(f?.tags) ? f.tags : []))).slice(0, 10);
  const populatedCount = (frames || []).filter(f => Boolean(f?.imageUrl)).length;

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, frameId: number) => {
    setDraggedFrameId(frameId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(frameId));
  };

  const handleDragOver = (e: React.DragEvent, targetFrameId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedFrameId === null || draggedFrameId === targetFrameId) {
      setDragOverFrameId(null);
      return;
    }

    const targetRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - targetRect.left;
    const isAfter = mouseX > targetRect.width / 2;

    setDragOverFrameId(targetFrameId);
    setDropPosition(isAfter ? 'after' : 'before');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOverFrameId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetFrameId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedFrameId === null || draggedFrameId === targetFrameId) {
      setDraggedFrameId(null);
      setDragOverFrameId(null);
      return;
    }

    const fromIndex = frames.findIndex(f => f.id === draggedFrameId);
    let toIndex = frames.findIndex(f => f.id === targetFrameId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedFrameId(null);
      setDragOverFrameId(null);
      return;
    }

    if (dropPosition === 'after' && fromIndex < toIndex) {
      // position after target
    } else if (dropPosition === 'after' && fromIndex > toIndex) {
      toIndex += 1;
    }

    const newFrames = [...frames];
    const [movedFrame] = newFrames.splice(fromIndex, 1);
    newFrames.splice(toIndex, 0, movedFrame);

    const reindexedFrames = newFrames.map((f, idx) => ({
      ...f,
      epNumber: `#${String(idx + 1).padStart(3, '0')}`
    }));

    if (onReorderFrames) {
      onReorderFrames(reindexedFrames);
    }

    setReorderFeedback(`Resequenced SH${String(fromIndex + 1).padStart(3, '0')} → SH${String(toIndex + 1).padStart(3, '0')}`);
    setTimeout(() => setReorderFeedback(null), 3000);

    setDraggedFrameId(null);
    setDragOverFrameId(null);
  };

  const handleDragEnd = () => {
    setDraggedFrameId(null);
    setDragOverFrameId(null);
  };

  const handleNudge = (frameId: number, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onReorderFrames) return;

    const curIdx = frames.findIndex(f => f.id === frameId);
    if (curIdx === -1) return;

    const targetIdx = direction === 'left' ? curIdx - 1 : curIdx + 1;
    if (targetIdx < 0 || targetIdx >= frames.length) return;

    const newFrames = [...frames];
    const [moved] = newFrames.splice(curIdx, 1);
    newFrames.splice(targetIdx, 0, moved);

    const reindexed = newFrames.map((f, idx) => ({
      ...f,
      epNumber: `#${String(idx + 1).padStart(3, '0')}`
    }));

    onReorderFrames(reindexed);
    setReorderFeedback(`Moved SH${String(curIdx + 1).padStart(3, '0')} ${direction === 'left' ? '←' : '→'} SH${String(targetIdx + 1).padStart(3, '0')}`);
    setTimeout(() => setReorderFeedback(null), 3000);
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      setPdfProgress(5);
      setPdfStatusMessage('Compiling printable PDF storyboard...');

      const options: StoryboardPdfOptions = {
        projectTitle,
        directorName,
        aspectRatio,
        framesPerPage: pdfLayout,
        theme: pdfTheme,
        includeSpecs: true,
        includeAudio: true,
        onProgress: (p, msg) => {
          setPdfProgress(p);
          setPdfStatusMessage(msg);
        }
      };

      await downloadStoryboardPdf(frames, options);
      setShowPdfOptions(false);
      setIsExportingPdf(false);
    } catch (err: any) {
      console.error('[PDF Export Error]', err);
      setPdfStatusMessage(`Export failed: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setIsExportingPdf(false), 3000);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#070709] p-4 sm:p-8 overflow-y-auto z-40 select-none">
      {/* Header & Filter Bar */}
      <div className="max-w-7xl mx-auto w-full mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-cinzel text-xl sm:text-2xl font-bold tracking-widest text-white uppercase">
                100-Frame Master Contact Sheet
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono-tech text-amber-300">
                {populatedCount} / {frames.length || 100} ACTIVE
              </span>
              {reorderFeedback && (
                <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-[9.5px] font-mono text-emerald-300 animate-in fade-in">
                  ✓ {reorderFeedback}
                </span>
              )}
            </div>
            <p className="font-mono-tech text-xs text-white/50 tracking-wider mt-1">
              DIRECTORIAL ANTHOLOGY OVERVIEW • DRAG & DROP TO RESEQUENCE • JUMP TO ANY TIMELINE FRAME
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Populate Pack Button */}
            <button
              onClick={onPopulateSamplePack}
              className="px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-xs text-xs font-mono-tech tracking-wider text-amber-300 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Populate All Frames
            </button>

            {/* EXPORT TO PDF STORYBOARD BUTTON */}
            <div className="relative">
              <button
                onClick={() => setShowPdfOptions(prev => !prev)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500/25 to-amber-600/20 hover:from-amber-500/35 hover:to-amber-600/30 border border-amber-400/60 rounded-xs text-xs font-mono-tech tracking-wider text-amber-300 flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_12px_rgba(212,175,55,0.2)]"
                title="Export Storyboard as Printable Multi-Frame PDF"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold">EXPORT TO PDF</span>
              </button>

              {/* PDF Configuration Flyout */}
              {showPdfOptions && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#0e0f16] border border-amber-500/40 rounded-[2px] shadow-2xl p-3 z-50 text-[10px] font-mono space-y-2.5 backdrop-blur-xl animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-amber-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Printer className="w-3.5 h-3.5" />
                      PRINTABLE PDF STORYBOARD
                    </span>
                    <button onClick={() => setShowPdfOptions(false)} className="text-zinc-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Grid Layout choice */}
                  <div>
                    <label className="text-zinc-400 block mb-1">Layout Format</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setPdfLayout(6)}
                        className={`p-1.5 rounded-[2px] border text-center transition-colors cursor-pointer ${
                          pdfLayout === 6
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                            : 'bg-white/5 border-white/10 text-zinc-400'
                        }`}
                      >
                        6 Shots / Sheet (3x2)
                      </button>
                      <button
                        onClick={() => setPdfLayout(4)}
                        className={`p-1.5 rounded-[2px] border text-center transition-colors cursor-pointer ${
                          pdfLayout === 4
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                            : 'bg-white/5 border-white/10 text-zinc-400'
                        }`}
                      >
                        4 Shots / Sheet (2x2)
                      </button>
                    </div>
                  </div>

                  {/* Color Theme choice */}
                  <div>
                    <label className="text-zinc-400 block mb-1">Color Style</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setPdfTheme('print')}
                        className={`p-1.5 rounded-[2px] border text-center transition-colors cursor-pointer ${
                          pdfTheme === 'print'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                            : 'bg-white/5 border-white/10 text-zinc-400'
                        }`}
                      >
                        Print White Paper
                      </button>
                      <button
                        onClick={() => setPdfTheme('dark')}
                        className={`p-1.5 rounded-[2px] border text-center transition-colors cursor-pointer ${
                          pdfTheme === 'dark'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                            : 'bg-white/5 border-white/10 text-zinc-400'
                        }`}
                      >
                        Obsidian Cinema
                      </button>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    disabled={isExportingPdf}
                    onClick={handleExportPdf}
                    className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold tracking-wider rounded-[2px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>DOWNLOAD PDF STORYBOARD</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PDF Progress Banner */}
        {isExportingPdf && (
          <div className="mb-4 p-3 bg-amber-950/60 border border-amber-500/30 rounded flex items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
              <div className="text-xs">
                <span className="font-bold text-amber-300">{pdfStatusMessage}</span>
                <span className="text-zinc-400 ml-2">({pdfProgress}%)</span>
              </div>
            </div>
            <div className="w-48 h-1.5 bg-black/60 rounded-full overflow-hidden border border-amber-500/30">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-200"
                style={{ width: `${pdfProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Search & Tag Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Filter by title, Bengali keyword, focal length..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xs text-xs font-mono-tech text-white placeholder-white/40 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Quick Tag Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[9px] text-amber-400 font-mono flex items-center gap-1 mr-1">
              <ArrowUpDown className="w-3 h-3" />
              DRAG TO RESEQUENCE
            </span>
            <button
              onClick={() => setSelectedTag(undefined)}
              className={`px-2.5 py-1 rounded-xs text-[10px] font-mono-tech tracking-wider uppercase transition-colors cursor-pointer ${
                selectedTag === undefined
                  ? 'bg-amber-400 text-black font-semibold'
                  : 'bg-white/5 hover:bg-white/10 text-white/60 border border-white/10'
              }`}
            >
              All ({frames.length})
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? undefined : tag)}
                className={`px-2.5 py-1 rounded-xs text-[10px] font-mono-tech tracking-wider uppercase whitespace-nowrap transition-colors cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-amber-400 text-black font-semibold'
                    : 'bg-white/5 hover:bg-white/10 text-white/60 border border-white/10'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Frames with Full Drag & Drop Support */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pb-24">
        {filtered.map((frame, index) => {
          const isSelected = frame.id === currentFrameIndex;
          const hasImage = Boolean(frame.imageUrl);
          const isBeingDragged = draggedFrameId === frame.id;
          const isDropTarget = dragOverFrameId === frame.id;

          return (
            <div
              key={frame.id}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, frame.id)}
              onDragOver={(e) => handleDragOver(e, frame.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, frame.id)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectFrame(frame.id)}
              className={`group relative aspect-[16/10] bg-[#101014] border rounded-xs overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                isBeingDragged
                  ? 'opacity-30 scale-95 border-dashed border-amber-400'
                  : isDropTarget
                  ? dropPosition === 'before'
                    ? 'border-l-4 border-l-amber-400 border-amber-400/80 shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                    : 'border-r-4 border-r-amber-400 border-amber-400/80 shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                  : isSelected
                  ? 'border-amber-400 shadow-[0_0_15px_rgba(212,175,55,0.4)] ring-1 ring-amber-400'
                  : 'border-white/10 hover:border-amber-400/50'
              }`}
            >
              {/* Image thumbnail */}
              {hasImage ? (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${frame.imageUrl})` }}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center text-white/20 group-hover:text-white/40">
                  <ImageIcon className="w-5 h-5 mb-1 stroke-[1.5]" />
                  <span className="text-[9px] font-mono-tech uppercase">No Media</span>
                </div>
              )}

              {/* Gradient Dark Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              {/* Drag Handle & Shot Number */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                <div 
                  className="p-1 rounded-[1px] bg-black/80 hover:bg-amber-400 hover:text-black border border-white/20 text-zinc-300 cursor-grab active:cursor-grabbing transition-colors"
                  title="Drag to resequence"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="w-3 h-3" />
                </div>
                <span className="px-1.5 py-0.5 rounded-xs bg-black/70 backdrop-blur-md border border-white/15 text-[9px] font-mono-tech text-amber-400 font-bold">
                  {frame.epNumber || `#${String(index + 1).padStart(3, '0')}`}
                </span>
                {hasImage && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                )}
              </div>

              {/* Hover Nudge Controls & Specs */}
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleNudge(frame.id, 'left', e)}
                  className="p-1 bg-black/80 hover:bg-amber-400 hover:text-black rounded-[1px] border border-white/20 text-zinc-300 text-[8px] cursor-pointer"
                  title="Move left"
                >
                  <MoveLeft className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={(e) => handleNudge(frame.id, 'right', e)}
                  className="p-1 bg-black/80 hover:bg-amber-400 hover:text-black rounded-[1px] border border-white/20 text-zinc-300 text-[8px] cursor-pointer"
                  title="Move right"
                >
                  <MoveRight className="w-2.5 h-2.5" />
                </button>
                <span className="px-1.5 py-0.5 rounded-xs bg-black/80 backdrop-blur-md text-[8px] font-mono-tech text-white/60">
                  {frame.cameraSpec.aperture}
                </span>
              </div>

              {/* Titles in bottom */}
              <div className="absolute bottom-2 left-2 right-2 z-10">
                <div className="flex items-center gap-1.5">
                  <span className="font-bengali text-xs text-amber-300 font-medium">
                    {frame.bengaliTitle}
                  </span>
                </div>
                <h4 className="font-cinzel text-xs font-bold text-white tracking-wider truncate group-hover:text-amber-400 transition-colors uppercase">
                  {frame.title}
                </h4>
                <p className="font-mono-tech text-[8px] text-white/50 tracking-wider truncate">
                  {frame.cameraSpec.focalLength}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
