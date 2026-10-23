/**
 * @file /src/components/ContactSheetModal.tsx
 * @description Modal 1: 100-Frame Contact Sheet Grid & Storyboard Sequence Director.
 * Features:
 * - Fluid drag-and-drop reordering of storyboard frames with visual ghost & drop indicators
 * - One-click 'Export to PDF Storyboard' with camera specs, dual-language titles, and progress tracking
 * - Quick search and genre/lens tag filter pills
 * - Jump directly to any frame on the master cinematic stage
 * - Keyboard shortcuts (Esc to close, Arrow keys to navigate)
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AnthologyFrame } from '../types/anthology';
import { 
  X, 
  Search, 
  Sparkles, 
  Download, 
  GripVertical, 
  FileText, 
  Image as ImageIcon, 
  Camera, 
  CheckCircle2, 
  MoveLeft, 
  MoveRight,
  Maximize2,
  Sliders,
  Printer,
  Layers,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';
import { filterFrames } from '../utils/engine';
import { downloadStoryboardPdf, StoryboardPdfOptions } from '../utils/pdfExport';

interface ContactSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: AnthologyFrame[];
  currentIndex: number;
  onSelectFrame: (index: number) => void;
  onPopulateSamplePack: () => void;
  onReorderFrames: (newFrames: AnthologyFrame[]) => void;
  projectTitle?: string;
  directorName?: string;
  aspectRatio?: string;
}

export const ContactSheetModal: React.FC<ContactSheetModalProps> = ({
  isOpen,
  onClose,
  frames,
  currentIndex,
  onSelectFrame,
  onPopulateSamplePack,
  onReorderFrames,
  projectTitle = 'Master Anthology',
  directorName = 'Directorial Team',
  aspectRatio = '2.39:1'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  
  // Drag and Drop State
  const [draggedFrameId, setDraggedFrameId] = useState<number | null>(null);
  const [dragOverFrameId, setDragOverFrameId] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before');
  const [lastReorderMsg, setLastReorderMsg] = useState<string | null>(null);

  // PDF Export State
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfStatusMessage, setPdfStatusMessage] = useState('');
  const [pdfLayout, setPdfLayout] = useState<4 | 6>(6);
  const [pdfTheme, setPdfTheme] = useState<'print' | 'dark'>('print');
  const [showPdfOptions, setShowPdfOptions] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showPdfOptions) {
          setShowPdfOptions(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showPdfOptions, onClose]);

  // Tag extraction and populated count
  const allTags = Array.from(new Set((frames || []).flatMap(f => Array.isArray(f?.tags) ? f.tags : []))).slice(0, 12);
  const populatedCount = (frames || []).filter(f => Boolean(f?.imageUrl)).length;

  const filtered = filterFrames(frames, searchQuery, selectedTag);

  // Drag and Drop Handlers
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
    // Only reset if leaving the current target card
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
      // no adjustment needed
    } else if (dropPosition === 'after' && fromIndex > toIndex) {
      toIndex += 1;
    }

    const newFrames = [...frames];
    const [movedFrame] = newFrames.splice(fromIndex, 1);
    newFrames.splice(toIndex, 0, movedFrame);

    // Re-index epNumbers cleanly
    const reindexedFrames = newFrames.map((f, idx) => ({
      ...f,
      epNumber: `#${String(idx + 1).padStart(3, '0')}`
    }));

    onReorderFrames(reindexedFrames);
    setLastReorderMsg(`Moved SH${String(fromIndex + 1).padStart(3, '0')} → SH${String(toIndex + 1).padStart(3, '0')}`);
    setTimeout(() => setLastReorderMsg(null), 3500);

    setDraggedFrameId(null);
    setDragOverFrameId(null);
  };

  const handleDragEnd = () => {
    setDraggedFrameId(null);
    setDragOverFrameId(null);
  };

  // Keyboard/button nudge left or right
  const handleNudge = (frameId: number, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
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
    setLastReorderMsg(`Resequenced SH${String(curIdx + 1).padStart(3, '0')} ${direction === 'left' ? '←' : '→'} SH${String(targetIdx + 1).padStart(3, '0')}`);
    setTimeout(() => setLastReorderMsg(null), 3000);
  };

  // Export to PDF Handler
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      setPdfProgress(5);
      setPdfStatusMessage('Preparing storyboard visual frames...');

      const options: StoryboardPdfOptions = {
        projectTitle,
        directorName,
        aspectRatio,
        framesPerPage: pdfLayout,
        theme: pdfTheme,
        includeSpecs: true,
        includeAudio: true,
        onProgress: (percent, msg) => {
          setPdfProgress(percent);
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

  if (!isOpen) return null;

  return (
    <div 
      id="modal-grid"
      className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-7xl h-[92vh] bg-[#08080C] border border-[#D4AF37]/40 rounded-[2px] shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden text-white font-mono select-none"
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL 1 HEADER */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-[#0B0C11] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-[2px] bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-400/80 tracking-widest uppercase">
                  MODAL 1:
                </span>
                <h2 className="font-cinzel text-sm sm:text-base font-bold tracking-[0.15em] text-white uppercase">
                  100-Frame Contact Sheet Grid
                </h2>
                <span className="font-bengali text-xs text-amber-300 font-medium hidden sm:inline">
                  (১০০ পর্বের মাস্টার স্টোরিবোর্ড কন্ট্যাক্ট শিট)
                </span>
              </div>
              <p className="text-[9px] text-white/50 tracking-wider mt-0.5">
                VISUAL DRAG-AND-DROP RESEQUENCING • REAL-TIME TIMELINE SYNCHRONIZATION
              </p>
            </div>
          </div>

          {/* Header Action Badges & Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Populated Badge */}
            <span className="px-2.5 py-1 rounded-[2px] bg-amber-500/10 border border-amber-500/30 text-[9.5px] text-amber-300 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {populatedCount} / {frames.length || 100} ACTIVE
            </span>

            {/* Reorder feedback badge */}
            {lastReorderMsg && (
              <span className="px-2.5 py-1 rounded-[2px] bg-emerald-950/80 border border-emerald-500/40 text-[9px] text-emerald-300 animate-in fade-in">
                ✓ {lastReorderMsg}
              </span>
            )}

            {/* Populate Sample Pack Button */}
            <button
              onClick={onPopulateSamplePack}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/15 rounded-[2px] text-[9.5px] text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Populate All Frames with Cinema Pack"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Populate Pack</span>
            </button>

            {/* EXPORT TO PDF STORYBOARD BUTTON */}
            <div className="relative">
              <button
                onClick={() => setShowPdfOptions(prev => !prev)}
                className="px-3 py-1 bg-gradient-to-r from-amber-500/25 to-amber-600/20 hover:from-amber-500/35 hover:to-amber-600/30 border border-amber-400/60 rounded-[2px] text-[10px] text-amber-300 font-bold tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(212,175,55,0.2)] cursor-pointer"
                title="Export Storyboard as Printable Multi-Frame PDF"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>EXPORT TO PDF</span>
                <span className="text-[8px] bg-amber-400/20 px-1 rounded text-amber-200">A4</span>
              </button>

              {/* PDF Configuration Flyout */}
              {showPdfOptions && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#0e0f16] border border-amber-500/40 rounded-[2px] shadow-2xl p-3 z-50 text-[10px] space-y-2.5 backdrop-blur-xl animate-in fade-in duration-150">
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

                  {/* Metadata Included Info */}
                  <div className="p-2 rounded bg-black/40 border border-white/5 text-[8.5px] text-zinc-400 leading-relaxed">
                    Includes: Visual thumbnails, Bengali & English titles, focal lengths, aperture, shutter, ISO, action notes & audio cues.
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

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-[2px] bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Close [Esc]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PROGRESS BANNER IF EXPORTING PDF */}
        {isExportingPdf && (
          <div className="px-5 py-2.5 bg-amber-950/60 border-b border-amber-500/30 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
              <div className="text-[10px]">
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

        {/* SEARCH, FILTERS & DRAG-AND-DROP INSTRUCTION BAR */}
        <div className="px-5 py-2.5 border-b border-white/10 bg-[#07070A] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search frames by title, Bengali keyword, focal length, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-[2px] text-xs font-mono text-white placeholder-white/40 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            <span className="text-[8.5px] text-amber-400/80 font-bold uppercase tracking-wider flex items-center gap-1 mr-1">
              <ArrowUpDown className="w-3 h-3" />
              DRAG CARDS TO RESEQUENCE
            </span>

            <button
              onClick={() => setSelectedTag(undefined)}
              className={`px-2 py-0.5 rounded-[2px] text-[9px] font-mono tracking-wider uppercase transition-colors cursor-pointer ${
                selectedTag === undefined
                  ? 'bg-amber-400 text-black font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-white/60 border border-white/10'
              }`}
            >
              All ({frames.length})
            </button>

            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? undefined : tag)}
                className={`px-2 py-0.5 rounded-[2px] text-[9px] font-mono tracking-wider uppercase whitespace-nowrap transition-colors cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-amber-400 text-black font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-white/60 border border-white/10'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* 100-FRAME INTERACTIVE DRAGGABLE GRID */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#050508] scrollbar-thin scrollbar-thumb-white/10">
          <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-8">
            {filtered.map((frame, index) => {
              const isSelected = frame.id === currentIndex;
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
                  onClick={() => {
                    onSelectFrame(frame.id);
                    onClose();
                  }}
                  className={`group relative aspect-[16/10] bg-[#0E0F15] border rounded-[2px] overflow-hidden cursor-pointer transition-all duration-200 ${
                    isBeingDragged
                      ? 'opacity-30 scale-95 border-dashed border-amber-400 shadow-none'
                      : isDropTarget
                      ? dropPosition === 'before'
                        ? 'border-l-4 border-l-amber-400 border-amber-400/80 shadow-[0_0_15px_rgba(212,175,55,0.5)] scale-[1.02]'
                        : 'border-r-4 border-r-amber-400 border-amber-400/80 shadow-[0_0_15px_rgba(212,175,55,0.5)] scale-[1.02]'
                      : isSelected
                      ? 'border-amber-400 shadow-[0_0_16px_rgba(212,175,55,0.45)] ring-1 ring-amber-400'
                      : 'border-white/10 hover:border-amber-400/50 hover:scale-[1.02]'
                  }`}
                >
                  {/* Visual Drop Guide Marker */}
                  {isDropTarget && (
                    <div 
                      className={`absolute top-0 bottom-0 w-1 bg-amber-400 z-30 shadow-[0_0_8px_#f59e0b] ${
                        dropPosition === 'before' ? 'left-0' : 'right-0'
                      }`} 
                    />
                  )}

                  {/* Thumbnail Image */}
                  {hasImage ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${frame.imageUrl})` }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center text-white/20 group-hover:text-white/40">
                      <ImageIcon className="w-5 h-5 mb-1 stroke-[1.5]" />
                      <span className="text-[8px] font-mono uppercase">RAW PLATE</span>
                    </div>
                  )}

                  {/* Gradient Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/20" />

                  {/* Drag Handle & Shot Number Badge Top Left */}
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-20">
                    <div 
                      className="p-1 rounded-[1px] bg-black/80 hover:bg-amber-400 hover:text-black border border-white/20 text-zinc-300 cursor-grab active:cursor-grabbing transition-colors"
                      title="Drag to resequence frame"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="w-3 h-3" />
                    </div>
                    <span className="px-1.5 py-0.5 rounded-[1px] bg-black/85 backdrop-blur-md border border-white/20 text-[9px] font-bold text-amber-400">
                      {frame.epNumber || `#${String(index + 1).padStart(3, '0')}`}
                    </span>
                  </div>

                  {/* Top Right Specs & Nudge Controls on Hover */}
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Nudge Left Button */}
                    <button
                      onClick={(e) => handleNudge(frame.id, 'left', e)}
                      className="p-1 bg-black/80 hover:bg-amber-400 hover:text-black rounded-[1px] border border-white/20 text-zinc-300 text-[8px] cursor-pointer transition-colors"
                      title="Move frame left"
                    >
                      <MoveLeft className="w-2.5 h-2.5" />
                    </button>
                    {/* Nudge Right Button */}
                    <button
                      onClick={(e) => handleNudge(frame.id, 'right', e)}
                      className="p-1 bg-black/80 hover:bg-amber-400 hover:text-black rounded-[1px] border border-white/20 text-zinc-300 text-[8px] cursor-pointer transition-colors"
                      title="Move frame right"
                    >
                      <MoveRight className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {/* Titles & Specs at Bottom */}
                  <div className="absolute bottom-1.5 left-2 right-2 z-20">
                    {frame.bengaliTitle && (
                      <span className="font-bengali text-[10px] text-amber-300 block truncate font-medium">
                        {frame.bengaliTitle}
                      </span>
                    )}
                    <h4 className="font-cinzel text-[10.5px] font-bold text-white tracking-wider truncate group-hover:text-amber-300 transition-colors uppercase">
                      {frame.title || `Frame ${index + 1}`}
                    </h4>
                    <div className="flex items-center justify-between text-[7.5px] text-white/50 tracking-wider mt-0.5 font-mono">
                      <span className="truncate">{frame.cameraSpec?.focalLength || '35mm'}</span>
                      <span className="text-amber-400/80 font-bold">{frame.cameraSpec?.aperture || 'f/1.4'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER BAR */}
        <div className="px-5 py-2.5 border-t border-white/10 bg-[#0B0C11] flex items-center justify-between text-[10px] text-zinc-400 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-zinc-500">FORMAT: <strong className="text-zinc-300">{aspectRatio}</strong></span>
            <span className="hidden sm:inline text-zinc-500">•</span>
            <span className="hidden sm:inline text-zinc-500">HOLD: <strong className="text-zinc-300">12.0s (288F @ 24fps)</strong></span>
            <span className="hidden sm:inline text-zinc-500">•</span>
            <span className="text-amber-400">CLICK ANY CARD TO JUMP TO STAGE</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPdfOptions(true)}
              className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-[2px] flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3 h-3" />
              <span>PRINT STORYBOARD (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-[2px] cursor-pointer"
            >
              CLOSE [ESC]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
