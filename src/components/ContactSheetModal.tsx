/**
 * @file /src/components/ContactSheetModal.tsx
 * @description Modal 1: 100-Frame Contact Sheet Grid & Storyboard Sequence Director.
 * Features:
 * - Fluid drag-and-drop reordering of storyboard frames with visual ghost & drop indicators
 * - One-click 'Export to PDF Storyboard' with camera specs, dual-language titles, and progress tracking
 * - 'Compare Mode' side-by-side & split wipe inspection for consistent color grading, framing, and eye-lines
 * - Multi-select frames for Batch Apply LUT filters and Batch Delete storyboard items
 * - Quick search and genre/lens tag filter pills
 * - Jump directly to any frame on the master cinematic stage
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AnthologyFrame, LutPreset } from '../types/anthology';
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
  RefreshCw,
  Columns2,
  SplitSquareVertical,
  CheckSquare,
  Square,
  Trash2,
  Palette,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  AlertTriangle,
  ArrowLeftRight,
  Grid
} from 'lucide-react';
import { filterFrames, getLutFilterCSS } from '../utils/engine';
import { downloadStoryboardPdf, StoryboardPdfOptions, exportFrameAsJpeg, exportFramesAsJpegZip } from '../utils/pdfExport';

const ALL_LUT_OPTIONS: { id: LutPreset; label: string; desc: string; color: string }[] = [
  { id: 'cinematic', label: 'RAWx Cinema 35', desc: 'Warm shadows, golden skin tones', color: '#D4AF37' },
  { id: 'golden', label: 'Golden Hour 2800K', desc: 'Amber flares & honey warmth', color: '#F59E0B' },
  { id: 'noir', label: 'Neo-Noir Monochrome', desc: 'Silvery highlights & crushed blacks', color: '#9CA3AF' },
  { id: 'bleach', label: 'Bleach Bypass', desc: 'High contrast silver retention', color: '#E5E7EB' },
  { id: 'technicolor', label: 'Vintage 3-Strip', desc: 'Saturated primaries & dye transfer', color: '#EF4444' },
  { id: 'tungsten', label: 'Tungsten 3200K', desc: 'Incandescent warmth & cool shadows', color: '#3B82F6' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon', desc: 'Cyan-magenta split toning', color: '#EC4899' },
  { id: 'matrix', label: 'Matrix Emerald', desc: 'Digital phosphor green tint', color: '#10B981' },
  { id: 'infrared', label: 'Infrared Vascular', desc: 'Thermal false-color contrast', color: '#DC2626' },
  { id: 'monolith', label: 'Monolith Slate', desc: 'High-grain cold desaturation', color: '#64748B' },
  { id: 'kodachrome', label: '1970s Kodachrome', desc: 'Classic vintage color emulsion', color: '#D97706' },
  { id: 'solaris', label: 'Solaris Inversion', desc: 'Partial solarization sheen', color: '#8B5CF6' },
  { id: 'raw', label: 'Flat Film Raw Log', desc: 'Neutral grading baseline', color: '#A1A1AA' },
];

interface ContactSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: AnthologyFrame[];
  currentIndex: number;
  onSelectFrame: (index: number) => void;
  onPopulateSamplePack: () => void;
  onReorderFrames: (newFrames: AnthologyFrame[]) => void;
  onUpdateFrame?: (frame: AnthologyFrame) => void;
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
  onUpdateFrame,
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

  // PDF & High-Res JPEG Export State
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfStatusMessage, setPdfStatusMessage] = useState('');
  const [pdfLayout, setPdfLayout] = useState<4 | 6>(6);
  const [pdfTheme, setPdfTheme] = useState<'print' | 'dark'>('print');
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [jpegTargetIndex, setJpegTargetIndex] = useState<number>(currentIndex || 0);
  const [jpegIncludeSlate, setJpegIncludeSlate] = useState<boolean>(true);
  const [exportingJpegId, setExportingJpegId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setJpegTargetIndex(Math.max(0, Math.min(frames.length - 1, currentIndex || 0)));
    }
  }, [isOpen, currentIndex, frames.length]);

  // Compare Mode State
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareSlotAId, setCompareSlotAId] = useState<number | null>(null);
  const [compareSlotBId, setCompareSlotBId] = useState<number | null>(null);
  const [compareViewType, setCompareViewType] = useState<'side-by-side' | 'wipe'>('side-by-side');
  const [compareWipePos, setCompareWipePos] = useState<number>(50); // 0 to 100%
  const [compareShowGuides, setCompareShowGuides] = useState<boolean>(true);

  // Multi-Select & Batch Actions State
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedFrameIds, setSelectedFrameIds] = useState<Set<number>>(new Set());
  const [isBatchLutMenuOpen, setIsBatchLutMenuOpen] = useState(false);
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState(false);

  // Initialize Compare Slots when entering compare mode
  useEffect(() => {
    if (isCompareMode) {
      if (compareSlotAId === null && frames.length > 0) {
        const cur = frames.find(f => f.id === currentIndex) || frames[0];
        setCompareSlotAId(cur.id);
      }
      if (compareSlotBId === null && frames.length > 1) {
        const next = frames.find(f => f.id !== currentIndex && f.id !== compareSlotAId) || frames[1];
        setCompareSlotBId(next.id);
      }
    }
  }, [isCompareMode, frames, currentIndex, compareSlotAId, compareSlotBId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showPdfOptions) {
          setShowPdfOptions(false);
        } else if (confirmDeleteBatch) {
          setConfirmDeleteBatch(false);
        } else if (isBatchLutMenuOpen) {
          setIsBatchLutMenuOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showPdfOptions, confirmDeleteBatch, isBatchLutMenuOpen, onClose]);

  // Tag extraction and populated count
  const allTags = useMemo(() => {
    return Array.from(new Set((frames || []).flatMap(f => Array.isArray(f?.tags) ? f.tags : []))).slice(0, 12);
  }, [frames]);
  
  const populatedCount = useMemo(() => {
    return (frames || []).filter(f => Boolean(f?.imageUrl)).length;
  }, [frames]);

  const filtered = useMemo(() => {
    return filterFrames(frames, searchQuery, selectedTag);
  }, [frames, searchQuery, selectedTag]);

  // Resolved frames for Compare Mode
  const frameA = useMemo(() => {
    return frames.find(f => f.id === compareSlotAId) || frames[0] || null;
  }, [frames, compareSlotAId]);

  const frameB = useMemo(() => {
    return frames.find(f => f.id === compareSlotBId) || frames[1] || frames[0] || null;
  }, [frames, compareSlotBId]);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, frameId: number) => {
    if (isMultiSelectMode || isCompareMode) return;
    setDraggedFrameId(frameId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(frameId));
  };

  const handleDragOver = (e: React.DragEvent, targetFrameId: number) => {
    if (isMultiSelectMode || isCompareMode) return;
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
    if (isMultiSelectMode || isCompareMode) return;
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

  // Multi-Select Handlers
  const toggleSelectFrame = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFrameIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedFrameIds(new Set(filtered.map(f => f.id)));
  };

  const clearSelection = () => {
    setSelectedFrameIds(new Set());
    setConfirmDeleteBatch(false);
    setIsBatchLutMenuOpen(false);
  };

  // Batch Apply LUT
  const handleBatchApplyLut = (lutId: LutPreset) => {
    if (selectedFrameIds.size === 0) return;

    const updated = frames.map(f => {
      if (selectedFrameIds.has(f.id)) {
        return { ...f, lutFilter: lutId };
      }
      return f;
    });

    onReorderFrames(updated);
    const lutItem = ALL_LUT_OPTIONS.find(l => l.id === lutId);
    setLastReorderMsg(`Applied ${lutItem?.label || lutId} to ${selectedFrameIds.size} frames`);
    setTimeout(() => setLastReorderMsg(null), 3500);
    setIsBatchLutMenuOpen(false);
  };

  // Batch Delete Storyboard Items
  const handleBatchDelete = () => {
    if (selectedFrameIds.size === 0) return;

    const remaining = frames.filter(f => !selectedFrameIds.has(f.id));
    if (remaining.length === 0) {
      setLastReorderMsg('Cannot delete all frames — storyboard must retain at least 1 frame');
      setTimeout(() => setLastReorderMsg(null), 3500);
      setConfirmDeleteBatch(false);
      return;
    }

    const reindexed = remaining.map((f, idx) => ({
      ...f,
      epNumber: `#${String(idx + 1).padStart(3, '0')}`
    }));

    onReorderFrames(reindexed);
    setLastReorderMsg(`Deleted ${selectedFrameIds.size} frames from storyboard`);
    setTimeout(() => setLastReorderMsg(null), 3500);
    clearSelection();
  };

  // Compare Mode: Slot Assignment
  const handleSelectSlotInCompare = (frameId: number, slot: 'A' | 'B') => {
    if (slot === 'A') setCompareSlotAId(frameId);
    else setCompareSlotBId(frameId);
  };

  // Compare Mode: Grade Sync
  const handleSyncLutAtoB = () => {
    if (!frameA || !frameB) return;
    const updated = frames.map(f => {
      if (f.id === frameB.id) {
        return { ...f, lutFilter: frameA.lutFilter, adjustments: { ...frameA.adjustments } };
      }
      return f;
    });
    onReorderFrames(updated);
    setLastReorderMsg(`Synced LUT (${frameA.lutFilter}) from SH${frameA.epNumber} → SH${frameB.epNumber}`);
    setTimeout(() => setLastReorderMsg(null), 3000);
  };

  const handleSyncLutBtoA = () => {
    if (!frameA || !frameB) return;
    const updated = frames.map(f => {
      if (f.id === frameA.id) {
        return { ...f, lutFilter: frameB.lutFilter, adjustments: { ...frameB.adjustments } };
      }
      return f;
    });
    onReorderFrames(updated);
    setLastReorderMsg(`Synced LUT (${frameB.lutFilter}) from SH${frameB.epNumber} → SH${frameA.epNumber}`);
    setTimeout(() => setLastReorderMsg(null), 3000);
  };

  const handleSwapSlots = () => {
    const tempA = compareSlotAId;
    setCompareSlotAId(compareSlotBId);
    setCompareSlotBId(tempA);
  };

  const handleSetFrameLutDirect = (frameId: number, lut: LutPreset) => {
    const updated = frames.map(f => {
      if (f.id === frameId) {
        return { ...f, lutFilter: lut };
      }
      return f;
    });
    onReorderFrames(updated);
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

  // Export Single Storyboard Frame as High-Resolution JPEG (1920x1080)
  const handleExportSingleJpeg = async (targetFrame?: AnthologyFrame, includeSlateOverride?: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const frameToExport = targetFrame || frames[jpegTargetIndex] || frames[currentIndex] || frames[0];
    if (!frameToExport) return;

    try {
      setExportingJpegId(frameToExport.id);
      const useSlate = includeSlateOverride ?? jpegIncludeSlate;
      await exportFrameAsJpeg(frameToExport, projectTitle, useSlate);
      const shotTag = frameToExport.epNumber || `SH${String((frames.indexOf(frameToExport) + 1) || 1).padStart(3, '0')}`;
      setLastReorderMsg(`Exported ${shotTag} High-Res JPEG (1920×1080)`);
      setTimeout(() => setLastReorderMsg(null), 3500);
    } catch (err: any) {
      console.error('[Hi-Res JPEG Export Error]', err);
      setLastReorderMsg(`JPEG export failed: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setLastReorderMsg(null), 3500);
    } finally {
      setExportingJpegId(null);
    }
  };

  // Batch Export Selected or Populated Frames as High-Resolution JPEGs (.zip)
  const handleExportBatchJpegs = async () => {
    const selectedList = selectedFrameIds.size > 0
      ? frames.filter(f => selectedFrameIds.has(f.id))
      : frames.filter(f => Boolean(f.imageUrl));
    const batchTargets = selectedList.length > 0 ? selectedList : frames.slice(0, 12);

    try {
      setIsExportingPdf(true);
      setPdfProgress(5);
      setPdfStatusMessage(`Rendering ${batchTargets.length} High-Res JPEGs (1920×1080)...`);
      await exportFramesAsJpegZip(batchTargets, projectTitle, (pct, msg) => {
        setPdfProgress(pct);
        setPdfStatusMessage(msg);
      });
      setShowPdfOptions(false);
      setIsExportingPdf(false);
      setLastReorderMsg(`Exported ${batchTargets.length} High-Res JPEGs (.zip)`);
      setTimeout(() => setLastReorderMsg(null), 3500);
    } catch (err: any) {
      console.error('[Batch JPEG Export Error]', err);
      setPdfStatusMessage(`JPEG ZIP failed: ${err?.message || 'Unknown error'}`);
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
        <div className="px-5 py-3 border-b border-white/10 bg-[#0B0C11] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
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
                VISUAL RESEQUENCING • DUAL-FRAME COLOR & FRAMING COMPARE • BATCH ACTIONS
              </p>
            </div>
          </div>

          {/* Header Action Badges & Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
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

            {/* COMPARE MODE TOGGLE */}
            <button
              onClick={() => {
                setIsCompareMode(prev => !prev);
                if (!isCompareMode) {
                  setIsMultiSelectMode(false);
                }
              }}
              className={`px-3 py-1 rounded-[2px] border text-[9.5px] font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                isCompareMode
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/15 hover:border-cyan-400/50'
              }`}
              title="Toggle Compare Mode: Side-by-side color grading and framing inspection"
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>COMPARE MODE</span>
            </button>

            {/* MULTI-SELECT MODE TOGGLE */}
            <button
              onClick={() => {
                setIsMultiSelectMode(prev => !prev);
                if (isMultiSelectMode) {
                  clearSelection();
                } else {
                  setIsCompareMode(false);
                }
              }}
              className={`px-3 py-1 rounded-[2px] border text-[9.5px] font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                isMultiSelectMode || selectedFrameIds.size > 0
                  ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(245,166,35,0.4)]'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/15 hover:border-amber-400/50'
              }`}
              title="Toggle Multi-Select: Batch Apply LUTs or Batch Delete"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>MULTI-SELECT {selectedFrameIds.size > 0 && `(${selectedFrameIds.size})`}</span>
            </button>

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

                  {/* PDF & High-Res JPEG Configuration Flyout */}
                  {showPdfOptions && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-[#0e0f16] border border-amber-500/40 rounded-[2px] shadow-2xl p-3.5 z-50 text-[10px] space-y-2.5 backdrop-blur-xl animate-in fade-in duration-150">
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-amber-400 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Printer className="w-3.5 h-3.5" />
                          EXPORT TO PDF STORYBOARD
                        </span>
                        <button onClick={() => setShowPdfOptions(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

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

                      <button
                        disabled={isExportingPdf}
                        onClick={handleExportPdf}
                        className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold tracking-wider rounded-[2px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>DOWNLOAD PDF STORYBOARD</span>
                      </button>

                      {/* HIGH-RESOLUTION INDIVIDUAL JPEG EXPORT SECTION */}
                      <div className="pt-2.5 mt-1 border-t border-white/15 space-y-2">
                        <div className="flex items-center justify-between text-cyan-300 font-bold text-[9.5px] uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-cyan-400" />
                            INDIVIDUAL HI-RES JPEG (1080P)
                          </span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/30 text-cyan-200">
                            1920×1080
                          </span>
                        </div>

                        <div>
                          <label className="text-zinc-400 block mb-1 text-[9px]">Target Storyboard Frame</label>
                          <select
                            value={jpegTargetIndex}
                            onChange={(e) => setJpegTargetIndex(Number(e.target.value))}
                            className="w-full bg-[#07080d] border border-white/15 focus:border-cyan-400 rounded-[2px] px-2 py-1.5 text-[9.5px] text-zinc-200 outline-none cursor-pointer"
                          >
                            {frames.map((f, idx) => (
                              <option key={f.id ?? idx} value={idx}>
                                {f.epNumber || `#${String(idx + 1).padStart(3, '0')}`} — {f.title || `Frame ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>

                        <label className="flex items-center justify-between text-[9.5px] text-zinc-300 cursor-pointer select-none">
                          <span>Burn-in Camera Slate & Bilingual Titles</span>
                          <input
                            type="checkbox"
                            checked={jpegIncludeSlate}
                            onChange={(e) => setJpegIncludeSlate(e.target.checked)}
                            className="accent-cyan-400 w-3.5 h-3.5 cursor-pointer"
                          />
                        </label>

                        <button
                          type="button"
                          disabled={isExportingPdf || exportingJpegId !== null}
                          onClick={() => handleExportSingleJpeg(frames[jpegTargetIndex], jpegIncludeSlate)}
                          className="w-full py-2 bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/60 text-cyan-200 hover:text-white font-bold tracking-wider rounded-[2px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-cyan-300" />
                          <span>
                            {exportingJpegId !== null ? 'RENDERING HI-RES JPEG...' : 'EXPORT INDIVIDUAL JPEG (.JPG)'}
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={isExportingPdf}
                          onClick={handleExportBatchJpegs}
                          className="w-full py-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-300 hover:text-amber-300 font-bold tracking-wider rounded-[2px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 text-[9px]"
                        >
                          <Download className="w-3 h-3 text-amber-400" />
                          <span>
                            {selectedFrameIds.size > 0
                              ? `EXPORT ${selectedFrameIds.size} SELECTED JPEGs (.ZIP)`
                              : 'BATCH EXPORT ALL HI-RES JPEGs (.ZIP)'}
                          </span>
                        </button>
                      </div>
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

        {/* BATCH ACTION BAR (VISIBLE WHEN MULTI-SELECT ACTIVE OR ITEMS CHECKED) */}
        {(isMultiSelectMode || selectedFrameIds.size > 0) && (
          <div className="px-5 py-2 bg-gradient-to-r from-[#17160c] via-[#1f1d10] to-[#12110c] border-b border-amber-500/40 flex items-center justify-between gap-3 shrink-0 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="px-2 py-0.5 rounded bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider">
                {selectedFrameIds.size} SELECTED
              </div>
              
              <button
                onClick={selectAllFiltered}
                className="text-[10px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
              >
                Select All ({filtered.length})
              </button>

              <button
                onClick={clearSelection}
                className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
              >
                Clear Selection
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Batch Apply LUT Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsBatchLutMenuOpen(prev => !prev)}
                  disabled={selectedFrameIds.size === 0}
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-[10px] font-bold rounded-[2px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span>BATCH APPLY LUT ▾</span>
                </button>

                {isBatchLutMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#0d0d14] border border-amber-500/50 rounded-[2px] shadow-2xl p-1.5 z-50 text-[10px] max-h-72 overflow-y-auto space-y-1">
                    <div className="px-2 py-1 text-[8.5px] font-bold text-amber-400 uppercase tracking-wider border-b border-white/10">
                      Apply Grade to {selectedFrameIds.size} Frames
                    </div>
                    {ALL_LUT_OPTIONS.map(lut => (
                      <button
                        key={lut.id}
                        onClick={() => handleBatchApplyLut(lut.id)}
                        className="w-full px-2 py-1.5 rounded-[2px] text-left hover:bg-white/10 flex items-center justify-between text-zinc-200 hover:text-amber-300 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full border border-white/20"
                            style={{ backgroundColor: lut.color }} 
                          />
                          <span className="font-bold">{lut.label}</span>
                        </div>
                        <span className="text-[8px] text-zinc-500 uppercase">{lut.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Batch Delete Button with confirmation */}
              {!confirmDeleteBatch ? (
                <button
                  onClick={() => setConfirmDeleteBatch(true)}
                  disabled={selectedFrameIds.size === 0}
                  className="px-3 py-1 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-[10px] font-bold rounded-[2px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>DELETE ({selectedFrameIds.size})</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/50 animate-in fade-in">
                  <span className="text-[9.5px] text-rose-300 font-bold">Confirm delete {selectedFrameIds.size}?</span>
                  <button
                    onClick={handleBatchDelete}
                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-bold rounded cursor-pointer"
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setConfirmDeleteBatch(false)}
                    className="px-2 py-0.5 bg-black/60 hover:bg-black text-zinc-400 text-[9px] rounded cursor-pointer"
                  >
                    NO
                  </button>
                </div>
              )}

              {/* Close Multi-select */}
              <button
                onClick={() => {
                  setIsMultiSelectMode(false);
                  clearSelection();
                }}
                className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white cursor-pointer ml-1"
                title="Exit Multi-select"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* COMPARE MODE VIEWPORT (EXPANDED DUAL-FRAME STAGE) */}
        {isCompareMode && (
          <div className="bg-[#090A10] border-b border-cyan-500/40 p-4 shrink-0 overflow-y-auto max-h-[46vh] animate-in fade-in duration-200">
            {/* Compare Bar Sub-header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold text-[9px] tracking-wider uppercase">
                  COLOR & FRAMING COMPARATOR
                </span>
                <span className="text-zinc-400 text-[10px]">
                  Inspecting Shot Consistency across cut transitions
                </span>
              </div>

              {/* View Type Controls & Guide Toggles */}
              <div className="flex items-center gap-2">
                {/* Framing guides toggle */}
                <button
                  onClick={() => setCompareShowGuides(g => !g)}
                  className={`px-2 py-1 rounded-[2px] border text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    compareShowGuides
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                      : 'bg-white/5 border-white/10 text-zinc-400'
                  }`}
                  title="Toggle Framing Crosshairs & Thirds Guides"
                >
                  <Grid className="w-3 h-3" />
                  <span>GRID GUIDES</span>
                </button>

                {/* View Mode Toggle: Side-by-Side vs Wipe */}
                <div className="flex items-center bg-black/60 p-0.5 rounded border border-white/10 text-[9px]">
                  <button
                    onClick={() => setCompareViewType('side-by-side')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      compareViewType === 'side-by-side' ? 'bg-cyan-500 text-black font-bold' : 'text-zinc-400'
                    }`}
                  >
                    Side-by-Side
                  </button>
                  <button
                    onClick={() => setCompareViewType('wipe')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      compareViewType === 'wipe' ? 'bg-cyan-500 text-black font-bold' : 'text-zinc-400'
                    }`}
                  >
                    Wipe Slider
                  </button>
                </div>

                {/* Match LUT Quick Actions */}
                <button
                  onClick={handleSyncLutAtoB}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-200 hover:text-cyan-300 text-[9px] rounded-[2px] cursor-pointer transition-colors"
                  title="Apply Frame A's LUT to Frame B"
                >
                  Sync Grade A → B
                </button>
                <button
                  onClick={handleSyncLutBtoA}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-200 hover:text-cyan-300 text-[9px] rounded-[2px] cursor-pointer transition-colors"
                  title="Apply Frame B's LUT to Frame A"
                >
                  Sync Grade B → A
                </button>
                <button
                  onClick={handleSwapSlots}
                  className="p-1 bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-300 hover:text-white rounded-[2px] cursor-pointer"
                  title="Swap Slot A and Slot B"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                </button>

                <button
                  onClick={() => setIsCompareMode(false)}
                  className="p-1 hover:bg-white/10 text-zinc-400 hover:text-white rounded cursor-pointer"
                  title="Close Compare Mode"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* DUAL VIEWPORT DISPLAY */}
            {compareViewType === 'side-by-side' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SLOT A (LEFT) */}
                {frameA && (
                  <div className="p-3 bg-[#0d0e16] border border-amber-500/40 rounded-[2px] space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black font-black text-[9px]">
                          SLOT A
                        </span>
                        <span className="font-bold text-amber-300">{frameA.epNumber}</span>
                        <span className="text-zinc-300 truncate max-w-[150px]">{frameA.title}</span>
                      </div>
                      {/* LUT Dropdown selector for Frame A */}
                      <select
                        value={frameA.lutFilter || 'cinematic'}
                        onChange={(e) => handleSetFrameLutDirect(frameA.id, e.target.value as LutPreset)}
                        className="bg-black/80 border border-amber-400/50 rounded px-1.5 py-0.5 text-[9px] text-amber-300 focus:outline-none cursor-pointer"
                      >
                        {ALL_LUT_OPTIONS.map(l => (
                          <option key={l.id} value={l.id}>{l.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Image Viewport with LUT styling */}
                    <div className="relative aspect-[2.39/1] bg-black rounded overflow-hidden border border-white/10">
                      {frameA.imageUrl ? (
                        <div 
                          className="w-full h-full bg-cover bg-center transition-all duration-300"
                          style={{ 
                            backgroundImage: `url(${frameA.imageUrl})`,
                            filter: getLutFilterCSS(frameA.lutFilter || 'cinematic', frameA.adjustments)
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                          RAW PLATE A
                        </div>
                      )}

                      {/* Optional Framing Guides */}
                      {compareShowGuides && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 border border-amber-400/20">
                            <div className="border-r border-b border-amber-400/20" />
                            <div className="border-r border-b border-amber-400/20" />
                            <div className="border-b border-amber-400/20" />
                            <div className="border-r border-b border-amber-400/20" />
                            <div className="border-r border-b border-amber-400/20" />
                            <div className="border-b border-amber-400/20" />
                          </div>
                          {/* Center Crosshair */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none">
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-amber-400/60" />
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-amber-400/60" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Telemetry info */}
                    <div className="grid grid-cols-2 gap-2 text-[8.5px] text-zinc-400 pt-1 font-mono">
                      <div>
                        LENS: <strong className="text-zinc-200">{frameA.cameraSpec?.focalLength || '35mm'}</strong>
                      </div>
                      <div>
                        APERTURE: <strong className="text-zinc-200">{frameA.cameraSpec?.aperture || 'f/1.4'}</strong>
                      </div>
                      <div>
                        SHUTTER: <strong className="text-zinc-200">{frameA.cameraSpec?.shutter || '1/48s'}</strong>
                      </div>
                      <div>
                        ISO: <strong className="text-zinc-200">{frameA.cameraSpec?.iso || '800'}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLOT B (RIGHT) */}
                {frameB && (
                  <div className="p-3 bg-[#0d0e16] border border-cyan-500/40 rounded-[2px] space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-black font-black text-[9px]">
                          SLOT B
                        </span>
                        <span className="font-bold text-cyan-300">{frameB.epNumber}</span>
                        <span className="text-zinc-300 truncate max-w-[150px]">{frameB.title}</span>
                      </div>
                      {/* LUT Dropdown selector for Frame B */}
                      <select
                        value={frameB.lutFilter || 'cinematic'}
                        onChange={(e) => handleSetFrameLutDirect(frameB.id, e.target.value as LutPreset)}
                        className="bg-black/80 border border-cyan-400/50 rounded px-1.5 py-0.5 text-[9px] text-cyan-300 focus:outline-none cursor-pointer"
                      >
                        {ALL_LUT_OPTIONS.map(l => (
                          <option key={l.id} value={l.id}>{l.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Image Viewport with LUT styling */}
                    <div className="relative aspect-[2.39/1] bg-black rounded overflow-hidden border border-white/10">
                      {frameB.imageUrl ? (
                        <div 
                          className="w-full h-full bg-cover bg-center transition-all duration-300"
                          style={{ 
                            backgroundImage: `url(${frameB.imageUrl})`,
                            filter: getLutFilterCSS(frameB.lutFilter || 'cinematic', frameB.adjustments)
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                          RAW PLATE B
                        </div>
                      )}

                      {/* Optional Framing Guides */}
                      {compareShowGuides && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 border border-cyan-400/20">
                            <div className="border-r border-b border-cyan-400/20" />
                            <div className="border-r border-b border-cyan-400/20" />
                            <div className="border-b border-cyan-400/20" />
                            <div className="border-r border-b border-cyan-400/20" />
                            <div className="border-r border-b border-cyan-400/20" />
                            <div className="border-b border-cyan-400/20" />
                          </div>
                          {/* Center Crosshair */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none">
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400/60" />
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400/60" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Telemetry info */}
                    <div className="grid grid-cols-2 gap-2 text-[8.5px] text-zinc-400 pt-1 font-mono">
                      <div>
                        LENS: <strong className="text-zinc-200">{frameB.cameraSpec?.focalLength || '35mm'}</strong>
                      </div>
                      <div>
                        APERTURE: <strong className="text-zinc-200">{frameB.cameraSpec?.aperture || 'f/1.4'}</strong>
                      </div>
                      <div>
                        SHUTTER: <strong className="text-zinc-200">{frameB.cameraSpec?.shutter || '1/48s'}</strong>
                      </div>
                      <div>
                        ISO: <strong className="text-zinc-200">{frameB.cameraSpec?.iso || '800'}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* WIPE OVERLAY MODE */
              <div className="flex flex-col items-center space-y-2">
                <div className="relative w-full max-w-4xl aspect-[2.39/1] bg-black rounded overflow-hidden border border-white/20 select-none">
                  {/* Base Layer: Frame A */}
                  {frameA?.imageUrl && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ 
                        backgroundImage: `url(${frameA.imageUrl})`,
                        filter: getLutFilterCSS(frameA.lutFilter || 'cinematic', frameA.adjustments)
                      }}
                    />
                  )}

                  {/* Top Layer: Frame B clipped at compareWipePos */}
                  {frameB?.imageUrl && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center overflow-hidden"
                      style={{ 
                        backgroundImage: `url(${frameB.imageUrl})`,
                        filter: getLutFilterCSS(frameB.lutFilter || 'cinematic', frameB.adjustments),
                        clipPath: `inset(0 0 0 ${compareWipePos}%)`
                      }}
                    />
                  )}

                  {/* Wipe Divider Line */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_8px_#06b6d4] z-20 pointer-events-none"
                    style={{ left: `${compareWipePos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-6 rounded bg-cyan-400 text-black flex items-center justify-center text-[8px] font-black shadow-lg">
                      ⇄
                    </div>
                  </div>

                  {/* Slot A & Slot B labels */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 rounded border border-amber-400 text-amber-300 text-[9px] font-bold z-10">
                    SLOT A: {frameA?.epNumber} ({frameA?.lutFilter || 'cinematic'})
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/80 rounded border border-cyan-400 text-cyan-300 text-[9px] font-bold z-10">
                    SLOT B: {frameB?.epNumber} ({frameB?.lutFilter || 'cinematic'})
                  </div>
                </div>

                {/* Wipe Slider Control */}
                <div className="w-full max-w-md flex items-center gap-3 text-[10px] text-zinc-400">
                  <span>Frame A ({100 - compareWipePos}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={compareWipePos}
                    onChange={(e) => setCompareWipePos(Number(e.target.value))}
                    className="flex-1 accent-cyan-400 cursor-pointer"
                  />
                  <span>Frame B ({compareWipePos}%)</span>
                </div>
              </div>
            )}
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
            {isCompareMode ? (
              <span className="text-[8.5px] text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1 mr-1">
                <Columns2 className="w-3 h-3" />
                CLICK ANY CARD TO ASSIGN TO COMPARE SLOTS
              </span>
            ) : isMultiSelectMode ? (
              <span className="text-[8.5px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1 mr-1">
                <CheckSquare className="w-3 h-3" />
                SELECT FRAMES FOR BATCH OPERATIONS
              </span>
            ) : (
              <span className="text-[8.5px] text-amber-400/80 font-bold uppercase tracking-wider flex items-center gap-1 mr-1">
                <ArrowUpDown className="w-3 h-3" />
                DRAG CARDS TO RESEQUENCE
              </span>
            )}

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

        {/* 100-FRAME INTERACTIVE GRID */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#050508] scrollbar-thin scrollbar-thumb-white/10">
          <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-8">
            {filtered.map((frame, index) => {
              const isSelected = frame.id === currentIndex;
              const hasImage = Boolean(frame.imageUrl);
              const isBeingDragged = draggedFrameId === frame.id;
              const isDropTarget = dragOverFrameId === frame.id;

              const isSlotA = isCompareMode && compareSlotAId === frame.id;
              const isSlotB = isCompareMode && compareSlotBId === frame.id;
              const isMultiChecked = selectedFrameIds.has(frame.id);

              return (
                <div
                  key={frame.id}
                  draggable={!isMultiSelectMode && !isCompareMode}
                  onDragStart={(e) => handleDragStart(e, frame.id)}
                  onDragOver={(e) => handleDragOver(e, frame.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, frame.id)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => {
                    if (isMultiSelectMode) {
                      toggleSelectFrame(frame.id, e);
                    } else if (isCompareMode) {
                      if (!isSlotA && !isSlotB) {
                        setCompareSlotBId(frame.id);
                      }
                    } else {
                      onSelectFrame(frame.id);
                      onClose();
                    }
                  }}
                  className={`group relative aspect-[16/10] bg-[#0E0F15] border rounded-[2px] overflow-hidden cursor-pointer transition-all duration-200 ${
                    isBeingDragged
                      ? 'opacity-30 scale-95 border-dashed border-amber-400 shadow-none'
                      : isDropTarget
                      ? dropPosition === 'before'
                        ? 'border-l-4 border-l-amber-400 border-amber-400/80 shadow-[0_0_15px_rgba(212,175,55,0.5)] scale-[1.02]'
                        : 'border-r-4 border-r-amber-400 border-amber-400/80 shadow-[0_0_15px_rgba(212,175,55,0.5)] scale-[1.02]'
                      : isSlotA
                      ? 'border-amber-400 ring-2 ring-amber-400 shadow-[0_0_20px_rgba(245,166,35,0.6)] scale-[1.02]'
                      : isSlotB
                      ? 'border-cyan-400 ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-[1.02]'
                      : isMultiChecked
                      ? 'border-amber-400 ring-2 ring-amber-400/80 bg-amber-500/10 scale-[1.01]'
                      : isSelected
                      ? 'border-amber-400 shadow-[0_0_16px_rgba(212,175,55,0.45)] ring-1 ring-amber-400'
                      : 'border-white/10 hover:border-amber-400/50 hover:scale-[1.02]'
                  }`}
                >
                  {/* Drop Guide Marker */}
                  {isDropTarget && (
                    <div 
                      className={`absolute top-0 bottom-0 w-1 bg-amber-400 z-30 shadow-[0_0_8px_#f59e0b] ${
                        dropPosition === 'before' ? 'left-0' : 'right-0'
                      }`} 
                    />
                  )}

                  {/* Thumbnail Image with Active LUT Filter CSS */}
                  {hasImage ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ 
                        backgroundImage: `url(${frame.imageUrl})`,
                        filter: getLutFilterCSS(frame.lutFilter || 'cinematic', frame.adjustments)
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center text-white/20 group-hover:text-white/40">
                      <ImageIcon className="w-5 h-5 mb-1 stroke-[1.5]" />
                      <span className="text-[8px] font-mono uppercase">RAW PLATE</span>
                    </div>
                  )}

                  {/* Gradient Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/20" />

                  {/* Drag Handle / Multi-Check on Top Left */}
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-20">
                    {isMultiSelectMode ? (
                      <button
                        onClick={(e) => toggleSelectFrame(frame.id, e)}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          isMultiChecked
                            ? 'bg-amber-400 text-black'
                            : 'bg-black/80 text-white/60 hover:text-white border border-white/20'
                        }`}
                      >
                        {isMultiChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      </button>
                    ) : !isCompareMode ? (
                      <div 
                        className="p-1 rounded-[1px] bg-black/80 hover:bg-amber-400 hover:text-black border border-white/20 text-zinc-300 cursor-grab active:cursor-grabbing transition-colors"
                        title="Drag to resequence frame"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-3 h-3" />
                      </div>
                    ) : null}

                    {/* Shot number badge */}
                    <span className="px-1.5 py-0.5 rounded-[1px] bg-black/85 backdrop-blur-md border border-white/20 text-[9px] font-bold text-amber-400">
                      {frame.epNumber || `#${String(index + 1).padStart(3, '0')}`}
                    </span>
                  </div>

                  {/* Top Right: Compare Slot Badges or Nudge Buttons */}
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-20">
                    {isCompareMode ? (
                      <div className="flex items-center gap-1">
                        {isSlotA && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black font-black text-[8px]">
                            SLOT A
                          </span>
                        )}
                        {isSlotB && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-black font-black text-[8px]">
                            SLOT B
                          </span>
                        )}
                        {!isSlotA && !isSlotB && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectSlotInCompare(frame.id, 'A');
                              }}
                              className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-400 hover:text-black border border-amber-400/50 text-amber-300 text-[8px] font-bold"
                            >
                              +A
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectSlotInCompare(frame.id, 'B');
                              }}
                              className="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-400 hover:text-black border border-cyan-400/50 text-cyan-300 text-[8px] font-bold"
                            >
                              +B
                            </button>
                          </div>
                        )}
                      </div>
                    ) : !isMultiSelectMode ? (
                      /* Hover Nudge & Individual Hi-Res JPEG Export Controls */
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleExportSingleJpeg(frame, true, e)}
                          className="px-1.5 py-0.5 bg-black/85 hover:bg-cyan-400 hover:text-black rounded-[1px] border border-cyan-400/50 text-cyan-300 text-[8px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors"
                          title="Export individual frame as High-Resolution JPEG (1920×1080)"
                        >
                          <Camera className="w-2.5 h-2.5" />
                          <span>JPG</span>
                        </button>
                        <button
                          onClick={(e) => handleNudge(frame.id, 'left', e)}
                          className="p-1 bg-black/80 hover:bg-amber-400 hover:text-black rounded-[1px] border border-white/20 text-zinc-300 text-[8px] cursor-pointer transition-colors"
                          title="Move frame left"
                        >
                          <MoveLeft className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => handleNudge(frame.id, 'right', e)}
                          className="p-1 bg-black/80 hover:bg-amber-400 hover:text-black rounded-[1px] border border-white/20 text-zinc-300 text-[8px] cursor-pointer transition-colors"
                          title="Move frame right"
                        >
                          <MoveRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      /* Multi-select check pill on hover */
                      <button
                        onClick={(e) => toggleSelectFrame(frame.id, e)}
                        className="p-1 rounded bg-black/80 hover:bg-amber-400 hover:text-black border border-white/20 text-zinc-300 text-[8px]"
                      >
                        {isMultiChecked ? 'Checked' : 'Select'}
                      </button>
                    )}
                  </div>

                  {/* Titles, LUT Badge & Specs at Bottom */}
                  <div className="absolute bottom-1.5 left-2 right-2 z-20">
                    <div className="flex items-center justify-between">
                      {frame.bengaliTitle && (
                        <span className="font-bengali text-[10px] text-amber-300 block truncate font-medium">
                          {frame.bengaliTitle}
                        </span>
                      )}
                      {frame.lutFilter && (
                        <span className="px-1 py-0.2 rounded bg-black/70 border border-white/10 text-[7.5px] text-amber-300/80 font-mono uppercase tracking-tight">
                          {frame.lutFilter}
                        </span>
                      )}
                    </div>
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
            {isCompareMode ? (
              <span className="text-cyan-300 font-bold">COMPARE MODE ACTIVE • SIDE-BY-SIDE COLOR & FRAMING</span>
            ) : isMultiSelectMode ? (
              <span className="text-amber-300 font-bold">MULTI-SELECT ACTIVE • {selectedFrameIds.size} CHECKED</span>
            ) : (
              <span className="text-amber-400">CLICK ANY CARD TO JUMP TO STAGE</span>
            )}
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
