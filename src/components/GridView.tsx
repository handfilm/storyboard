import React, { useState, useMemo, useRef } from 'react';
import { AnthologyFrame, LutPreset } from '../types/anthology';
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
  RefreshCw,
  Columns2,
  SplitSquareVertical,
  CheckSquare,
  Square,
  Trash2,
  Palette,
  Grid,
  AlertTriangle,
  Upload
} from 'lucide-react';
import { filterFrames, getLutFilterCSS } from '../utils/engine';
import { downloadStoryboardPdf, StoryboardPdfOptions } from '../utils/pdfExport';
import { handleFileUpload } from '../services/mediaIngestService';
import { isSvgPlaceholderUrl, isVideoSourceUrl, thumbnailMemoryCache } from '../services/thumbnailEngine';
import { useStudioStore } from '../core/store';
import { getShotMediaKey, resolveShotMediaEntry, saveShotMediaBlob } from '../services/handfilmMediaVault';
import { ShotMediaThumbnail } from './ShotMediaThumbnail';
import { CinemaBadgeHeader, CinemaToolHUD } from './ui/CinemaToolHUD';

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

interface GridViewProps {
  frames: AnthologyFrame[];
  currentFrameIndex: number;
  onSelectFrame: (index: number) => void;
  onPopulateSamplePack: () => void;
  onReorderFrames?: (newFrames: AnthologyFrame[]) => void;
  onUpdateFrame?: (frame: AnthologyFrame) => void;
  onUploadMediaForIndex?: (index: number, file: File) => void;
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
  onUpdateFrame,
  onUploadMediaForIndex,
  projectTitle = 'Master Storyboard',
  directorName = 'Directorial Team',
  aspectRatio = '2.39:1'
}) => {
  const shotMediaMap = useStudioStore((s) => s.shotMediaMap);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();

  // Drag-and-drop state
  const [draggedFrameId, setDraggedFrameId] = useState<number | null>(null);
  const [dragOverFrameId, setDragOverFrameId] = useState<number | null>(null);
  const [fileDropTargetId, setFileDropTargetId] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before');
  const [reorderFeedback, setReorderFeedback] = useState<string | null>(null);

  // PDF Export state
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfStatusMessage, setPdfStatusMessage] = useState('');
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [pdfLayout, setPdfLayout] = useState<4 | 6>(6);
  const [pdfTheme, setPdfTheme] = useState<'print' | 'dark'>('print');

  // Compare Mode State
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareSlotAId, setCompareSlotAId] = useState<number | null>(null);
  const [compareSlotBId, setCompareSlotBId] = useState<number | null>(null);
  const [compareViewType, setCompareViewType] = useState<'side-by-side' | 'wipe'>('side-by-side');
  const [compareWipePos, setCompareWipePos] = useState<number>(50);
  const [compareShowGuides, setCompareShowGuides] = useState<boolean>(true);

  // Multi-Select & Batch Actions State
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedFrameIds, setSelectedFrameIds] = useState<Set<number>>(new Set());
  const [isBatchLutMenuOpen, setIsBatchLutMenuOpen] = useState(false);
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState(false);
  const anchorFrameIdRef = useRef<number | null>(null);

  // Initialize Compare Slots
  const frameA = useMemo(() => {
    return frames.find(f => f.id === compareSlotAId) || frames[0] || null;
  }, [frames, compareSlotAId]);

  const frameB = useMemo(() => {
    return frames.find(f => f.id === compareSlotBId) || frames[1] || frames[0] || null;
  }, [frames, compareSlotBId]);

  const filtered = useMemo(() => {
    return filterFrames(frames, searchQuery, selectedTag);
  }, [frames, searchQuery, selectedTag]);

  const allTags = useMemo(() => {
    return Array.from(new Set((frames || []).flatMap(f => Array.isArray(f?.tags) ? f.tags : []))).slice(0, 10);
  }, [frames]);

  const populatedCount = useMemo(() => {
    return (frames || []).filter(f => Boolean(f?.imageUrl)).length;
  }, [frames]);

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, frameId: number) => {
    if (isMultiSelectMode || isCompareMode) return;
    setDraggedFrameId(frameId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(frameId));
  };

  const handleDragOver = (e: React.DragEvent, targetFrameId: number) => {
    if (isMultiSelectMode || isCompareMode) return;

    // Detect desktop file drag
    const isFileDrag = Boolean(e.dataTransfer.types && (e.dataTransfer.types.includes('Files') || Array.from(e.dataTransfer.types).includes('Files')));
    if (isFileDrag) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      if (fileDropTargetId !== targetFrameId) {
        setFileDropTargetId(targetFrameId);
      }
      return;
    }

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
      setFileDropTargetId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetFrameId: number) => {
    if (isMultiSelectMode || isCompareMode) return;
    e.preventDefault();
    e.stopPropagation();

    // 1. Process Desktop File Drag and Drop onto Grid Card
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFileDropTargetId(null);
      setDraggedFrameId(null);
      setDragOverFrameId(null);

      const targetIdx = frames.findIndex(f => f.id === targetFrameId);
      if (targetIdx !== -1) {
        const droppedFile = e.dataTransfer.files[0];
        const targetFrame = frames[targetIdx];
        const shotKey = getShotMediaKey(targetFrame, targetIdx);
        setReorderFeedback(`Importing ${droppedFile.name} to SH${String(targetIdx + 1).padStart(3, '0')}...`);
        try {
          if (onUploadMediaForIndex) {
            await Promise.resolve(onUploadMediaForIndex(targetIdx, droppedFile));
          } else {
            const entry = await saveShotMediaBlob(shotKey, droppedFile, droppedFile.name);
            useStudioStore.getState().setShotMediaEntry(shotKey, entry);
            if (targetFrame && onUpdateFrame) {
              onUpdateFrame({
                ...targetFrame,
                imageUrl: entry.url,
                thumbnailUrl: entry.type === 'image' ? entry.url : targetFrame.thumbnailUrl,
                isVideo: entry.type === 'video'
              });
            }
          }
          setReorderFeedback(`✓ Media assigned to SH${String(targetIdx + 1).padStart(3, '0')}`);
          setTimeout(() => setReorderFeedback(null), 3500);
        } catch (err) {
          console.warn('[GridView] Media drag-and-drop error:', err);
          setReorderFeedback('Failed to ingest dropped file');
          setTimeout(() => setReorderFeedback(null), 3000);
        }
      }
      return;
    }

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
      // after target
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
    setFileDropTargetId(null);
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

  // Multi-Select & Shift+Click Range Handlers
  const selectRangeToFrame = (targetId: number, additive: boolean = false) => {
    const orderedIds = filtered.map(f => f.id);
    const activeFrameId = frames[currentFrameIndex]?.id;
    const anchorId =
      anchorFrameIdRef.current !== null && orderedIds.includes(anchorFrameIdRef.current)
        ? anchorFrameIdRef.current
        : activeFrameId !== undefined && orderedIds.includes(activeFrameId)
        ? activeFrameId
        : targetId;

    const startIdx = orderedIds.indexOf(anchorId);
    const endIdx = orderedIds.indexOf(targetId);

    if (startIdx === -1 || endIdx === -1) {
      anchorFrameIdRef.current = targetId;
      setSelectedFrameIds(new Set([targetId]));
      return;
    }

    const low = Math.min(startIdx, endIdx);
    const high = Math.max(startIdx, endIdx);
    const rangeIds = orderedIds.slice(low, high + 1);

    setSelectedFrameIds(prev => {
      const next = additive ? new Set(prev) : new Set<number>();
      rangeIds.forEach(id => next.add(id));
      return next;
    });
  };

  const toggleSelectFrame = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (e?.shiftKey) {
      selectRangeToFrame(id, e.metaKey || e.ctrlKey);
      return;
    }
    anchorFrameIdRef.current = id;
    setSelectedFrameIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  const handleBatchApplyLut = (lutId: LutPreset) => {
    if (selectedFrameIds.size === 0 || !onReorderFrames) return;

    const updated = frames.map(f => {
      if (selectedFrameIds.has(f.id)) {
        return { ...f, lutFilter: lutId };
      }
      return f;
    });

    onReorderFrames(updated);
    const lutItem = ALL_LUT_OPTIONS.find(l => l.id === lutId);
    setReorderFeedback(`Applied ${lutItem?.label || lutId} to ${selectedFrameIds.size} frames`);
    setTimeout(() => setReorderFeedback(null), 3000);
    setIsBatchLutMenuOpen(false);
  };

  const handleBatchDelete = () => {
    if (selectedFrameIds.size === 0 || !onReorderFrames) return;

    const remaining = frames.filter(f => !selectedFrameIds.has(f.id));
    if (remaining.length === 0) {
      setReorderFeedback('Cannot delete all frames — storyboard must retain at least 1 frame.');
      setTimeout(() => setReorderFeedback(null), 3500);
      setConfirmDeleteBatch(false);
      return;
    }

    const deletedCount = selectedFrameIds.size;
    const reindexed = remaining.map((f, idx) => ({
      ...f,
      epNumber: `#${String(idx + 1).padStart(3, '0')}`
    }));

    onReorderFrames(reindexed);
    setReorderFeedback(`Permanently deleted ${deletedCount} ${deletedCount === 1 ? 'frame' : 'frames'}`);
    setTimeout(() => setReorderFeedback(null), 3000);
    clearSelection();
  };

  // Compare Mode Helpers
  const handleSyncLutAtoB = () => {
    if (!frameA || !frameB || !onReorderFrames) return;
    const updated = frames.map(f => {
      if (f.id === frameB.id) {
        return { ...f, lutFilter: frameA.lutFilter, adjustments: { ...frameA.adjustments } };
      }
      return f;
    });
    onReorderFrames(updated);
    setReorderFeedback(`Synced LUT from SH${frameA.epNumber} → SH${frameB.epNumber}`);
    setTimeout(() => setReorderFeedback(null), 3000);
  };

  const handleSyncLutBtoA = () => {
    if (!frameA || !frameB || !onReorderFrames) return;
    const updated = frames.map(f => {
      if (f.id === frameA.id) {
        return { ...f, lutFilter: frameB.lutFilter, adjustments: { ...frameB.adjustments } };
      }
      return f;
    });
    onReorderFrames(updated);
    setReorderFeedback(`Synced LUT from SH${frameB.epNumber} → SH${frameA.epNumber}`);
    setTimeout(() => setReorderFeedback(null), 3000);
  };

  const handleSetFrameLutDirect = (frameId: number, lut: LutPreset) => {
    if (!onReorderFrames) return;
    const updated = frames.map(f => {
      if (f.id === frameId) {
        return { ...f, lutFilter: lut };
      }
      return f;
    });
    onReorderFrames(updated);
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <CinemaBadgeHeader
            icon={<Grid className="w-4 h-4 text-[#F59E0B]" />}
            label="CONTACT SHEET"
            accent="amber"
            rightSlot={
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] font-black text-amber-300 tabular-nums">
                  {populatedCount}/{frames.length || 100}
                </span>
                {reorderFeedback && (
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-[9.5px] font-black text-emerald-300">
                    ✓ {reorderFeedback}
                  </span>
                )}
              </div>
            }
          />

          <div className="flex items-center gap-2 flex-wrap">
            <CinemaToolHUD
              title="COMPARE SHOTS"
              en="Open side-by-side & wipe LUT comparator for any two frames."
              bn="পাশাপাশি দুটি শটের কালার গ্রেড ও ফ্রেমিং তুলনা করুন।"
              accent="cyan"
            >
              <button
                data-active={isCompareMode ? 'true' : 'false'}
                onClick={() => {
                  setIsCompareMode(prev => !prev);
                  if (!isCompareMode) setIsMultiSelectMode(false);
                }}
                className="min-h-[44px] px-3 py-1.5 rounded-lg cinema-tile cinema-tile-cyan text-[10px] font-black tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <SplitSquareVertical className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                <span>COMPARE</span>
              </button>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="MULTI-SELECT"
              en="Select multiple frames for batch LUT grading or deletion."
              bn="একাধিক শট বেছে নিয়ে একসাথে কালার বা ডিলিট করুন।"
              accent="amber"
            >
              <button
                data-active={isMultiSelectMode || selectedFrameIds.size > 0 ? 'true' : 'false'}
                onClick={() => {
                  setIsMultiSelectMode(prev => !prev);
                  if (isMultiSelectMode) clearSelection();
                  else setIsCompareMode(false);
                }}
                className="min-h-[44px] px-3 py-1.5 rounded-lg cinema-tile cinema-tile-amber text-[10px] font-black tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <CheckSquare className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                <span>SELECT {selectedFrameIds.size > 0 && `(${selectedFrameIds.size})`}</span>
              </button>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="POPULATE PACK"
              en="Fill empty storyboard slots with curated sample cinema frames."
              bn="ফাঁকা স্টোরিবোর্ড ফ্রেমগুলোতে ডেমো স্যাম্পল শট ভরুন।"
              accent="amber"
            >
              <button
                onClick={onPopulateSamplePack}
                className="min-h-[44px] px-3 py-1.5 rounded-lg cinema-tile cinema-tile-amber text-[10px] font-black tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                <span>POPULATE</span>
              </button>
            </CinemaToolHUD>

            <div className="relative">
              <CinemaToolHUD
                title="PDF STORYBOARD"
                en="Generate printable multi-frame PDF contact sheet."
                bn="সব শটের প্রিন্টযোগ্য PDF স্টোরিবোর্ড তৈরি করুন।"
                accent="amber"
              >
                <button
                  data-active={showPdfOptions ? 'true' : 'false'}
                  onClick={() => setShowPdfOptions(prev => !prev)}
                  className="min-h-[44px] px-3.5 py-1.5 rounded-lg cinema-tile cinema-tile-amber text-[10px] font-black tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                  <span>PDF EXPORT</span>
                </button>
              </CinemaToolHUD>

              {showPdfOptions && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#0e0f16] border border-amber-500/40 rounded-lg shadow-2xl p-3 z-50 text-[10px] font-mono space-y-2.5 backdrop-blur-xl animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <CinemaBadgeHeader icon={<Printer className="w-3.5 h-3.5 text-amber-400" />} label="PDF SHEET" accent="amber" />
                    <button onClick={() => setShowPdfOptions(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <CinemaToolHUD title="6-UP GRID" en="Six storyboard shots per A4 page." bn="প্রতি পাতায় ৬টি শট রাখতে চাপুন।" accent="amber" blockWrapper>
                      <button
                        onClick={() => setPdfLayout(6)}
                        data-active={pdfLayout === 6 ? 'true' : 'false'}
                        className="w-full py-2 rounded cinema-tile cinema-tile-amber text-[9.5px] font-black cursor-pointer"
                      >
                        3×2 GRID
                      </button>
                    </CinemaToolHUD>
                    <CinemaToolHUD title="4-UP GRID" en="Four storyboard shots per A4 page." bn="প্রতি পাতায় ৪টি শট রাখতে চাপুন।" accent="amber" blockWrapper>
                      <button
                        onClick={() => setPdfLayout(4)}
                        data-active={pdfLayout === 4 ? 'true' : 'false'}
                        className="w-full py-2 rounded cinema-tile cinema-tile-amber text-[9.5px] font-black cursor-pointer"
                      >
                        2×2 GRID
                      </button>
                    </CinemaToolHUD>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <CinemaToolHUD title="LIGHT PRINT" en="Ink-saving light paper PDF theme." bn="সাদা কাগজে প্রিন্টের জন্য থিম।" accent="amber" blockWrapper>
                      <button
                        onClick={() => setPdfTheme('print')}
                        data-active={pdfTheme === 'print' ? 'true' : 'false'}
                        className="w-full py-2 rounded cinema-tile cinema-tile-amber text-[9.5px] font-black cursor-pointer"
                      >
                        PRINT
                      </button>
                    </CinemaToolHUD>
                    <CinemaToolHUD title="DARK OLED" en="Obsidian cinema presentation PDF theme." bn="অন্ধকার সিনেমা প্রেজেন্টেশন থিম।" accent="amber" blockWrapper>
                      <button
                        onClick={() => setPdfTheme('dark')}
                        data-active={pdfTheme === 'dark' ? 'true' : 'false'}
                        className="w-full py-2 rounded cinema-tile cinema-tile-amber text-[9.5px] font-black cursor-pointer"
                      >
                        OBSIDIAN
                      </button>
                    </CinemaToolHUD>
                  </div>

                  <CinemaToolHUD title="DOWNLOAD PDF" en="Render and download multi-page PDF." bn="PDF স্টোরিবোর্ড ডাউনলোড করতে চাপুন।" accent="amber" blockWrapper>
                    <button
                      disabled={isExportingPdf}
                      data-active="true"
                      onClick={handleExportPdf}
                      className="w-full min-h-[44px] py-2 rounded-lg cinema-tile cinema-tile-amber font-black tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 cinema-tile-icon" />
                      <span>SAVE PDF</span>
                    </button>
                  </CinemaToolHUD>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BATCH ACTION BAR (WHEN ITEMS SELECTED) */}
        {(isMultiSelectMode || selectedFrameIds.size > 0) && (
          <div className="mb-4 p-2.5 bg-gradient-to-r from-[#17160c] via-[#1f1d10] to-[#12110c] border border-amber-500/40 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-400 text-black font-black text-[10px]">
                {selectedFrameIds.size} PICKED
              </span>
              <CinemaToolHUD title="SELECT ALL" en="Select all visible frames in sheet." bn="সব শট একসাথে সিলেক্ট করুন।" accent="amber">
                <button onClick={selectAllFiltered} className="px-2.5 py-1 rounded cinema-tile cinema-tile-amber text-[10px] font-black cursor-pointer">
                  ALL ({filtered.length})
                </button>
              </CinemaToolHUD>
              <CinemaToolHUD title="CLEAR" en="Clear multi-frame selection." bn="সিলেকশন বাতিল করুন।" accent="amber">
                <button onClick={clearSelection} className="px-2.5 py-1 rounded cinema-tile cinema-tile-amber text-[10px] font-black cursor-pointer">
                  CLEAR
                </button>
              </CinemaToolHUD>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <CinemaToolHUD title="BATCH LUT" en="Apply one cinema LUT across all picked frames." bn="সিলেক্ট করা সব শটে একসাথে LUT কালার দিন।" accent="amber">
                  <button
                    onClick={() => setIsBatchLutMenuOpen(prev => !prev)}
                    disabled={selectedFrameIds.size === 0}
                    data-active={isBatchLutMenuOpen ? 'true' : 'false'}
                    className="min-h-[44px] px-3 py-1.5 rounded-lg cinema-tile cinema-tile-amber text-[10px] font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Palette className="w-3.5 h-3.5 cinema-tile-icon" />
                    <span>BATCH LUT</span>
                  </button>
                </CinemaToolHUD>

                {isBatchLutMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-60 bg-[#0d0d14] border border-amber-500/50 rounded-lg shadow-2xl p-1.5 z-50 text-[10px] max-h-72 overflow-y-auto space-y-1">
                    {ALL_LUT_OPTIONS.map(lut => (
                      <CinemaToolHUD key={lut.id} title={lut.label.toUpperCase()} en={lut.desc} bn={`${lut.label} কালার লুট সব সিলেক্ট করা শটে দিন।`} accent="amber" blockWrapper>
                        <button
                          onClick={() => handleBatchApplyLut(lut.id)}
                          className="w-full px-2 py-1.5 rounded cinema-tile cinema-tile-amber text-left flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: lut.color }} />
                            <span className="font-black uppercase">{lut.id}</span>
                          </div>
                        </button>
                      </CinemaToolHUD>
                    ))}
                  </div>
                )}
              </div>

              <CinemaToolHUD title="DELETE PICKED" en="Permanently remove all selected storyboard frames." bn="সিলেক্ট করা শটগুলো স্থায়ীভাবে ডিলিট করুন।" accent="crimson">
                <button
                  onClick={() => setConfirmDeleteBatch(true)}
                  disabled={selectedFrameIds.size === 0}
                  data-testid="grid-view-delete-selected-btn"
                  className="min-h-[44px] px-3.5 py-1.5 rounded-lg cinema-tile cinema-tile-crimson text-[10px] font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-40 tabular-nums"
                >
                  <Trash2 className="w-3.5 h-3.5 cinema-tile-icon" />
                  <span>DELETE ({selectedFrameIds.size})</span>
                </button>
              </CinemaToolHUD>
            </div>
          </div>
        )}

        {/* COMPARE MODE VIEWPORT */}
        {isCompareMode && (
          <div className="mb-6 p-4 bg-[#090A10] border border-cyan-500/40 rounded-lg space-y-3 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10 text-xs">
              <CinemaBadgeHeader
                icon={<SplitSquareVertical className="w-4 h-4 text-cyan-400" />}
                label="COMPARE"
                accent="cyan"
              />

              <div className="flex items-center gap-1.5 flex-wrap">
                <CinemaToolHUD title="GRID GUIDES" en="Toggle 3x3 framing guides in compare frames." bn="ফ্রেমিং গ্রিড গাইড দেখান বা লুকান।" accent="amber">
                  <button
                    data-active={compareShowGuides ? 'true' : 'false'}
                    onClick={() => setCompareShowGuides(g => !g)}
                    className="px-2.5 py-1 rounded cinema-tile cinema-tile-amber text-[9px] font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Grid className="w-3 h-3 cinema-tile-icon" />
                    <span>GUIDES</span>
                  </button>
                </CinemaToolHUD>

                <CinemaToolHUD title="SIDE BY SIDE" en="Inspect Slot A and Slot B side-by-side." bn="দুটি শট পাশাপাশি রেখে তুলনা করুন।" accent="cyan">
                  <button
                    data-active={compareViewType === 'side-by-side' ? 'true' : 'false'}
                    onClick={() => setCompareViewType('side-by-side')}
                    className="px-2.5 py-1 rounded cinema-tile cinema-tile-cyan text-[9px] font-black cursor-pointer"
                  >
                    SPLIT
                  </button>
                </CinemaToolHUD>
                <CinemaToolHUD title="WIPE SLIDER" en="Compare Slot A and Slot B with interactive split wipe." bn="স্লাইডার টেনে আগে ও পরের পার্থক্য দেখুন।" accent="cyan">
                  <button
                    data-active={compareViewType === 'wipe' ? 'true' : 'false'}
                    onClick={() => setCompareViewType('wipe')}
                    className="px-2.5 py-1 rounded cinema-tile cinema-tile-cyan text-[9px] font-black cursor-pointer"
                  >
                    WIPE
                  </button>
                </CinemaToolHUD>

                <CinemaToolHUD title="SYNC A → B" en="Copy LUT & grade settings from A to B." bn="A শটের কালার B শটে কপি করুন।" accent="amber">
                  <button onClick={handleSyncLutAtoB} className="px-2.5 py-1 rounded cinema-tile cinema-tile-amber text-[9px] font-black cursor-pointer">
                    A → B
                  </button>
                </CinemaToolHUD>
                <CinemaToolHUD title="SYNC B → A" en="Copy LUT & grade settings from B to A." bn="B শটের কালার A শটে কপি করুন।" accent="amber">
                  <button onClick={handleSyncLutBtoA} className="px-2.5 py-1 rounded cinema-tile cinema-tile-amber text-[9px] font-black cursor-pointer">
                    B → A
                  </button>
                </CinemaToolHUD>
                <CinemaToolHUD title="CLOSE COMPARE" en="Exit side-by-side comparison mode." bn="তুলনা মোড বন্ধ করুন।" accent="crimson">
                  <button onClick={() => setIsCompareMode(false)} className="p-1.5 rounded cinema-tile cinema-tile-crimson cursor-pointer">
                    <X className="w-3.5 h-3.5 cinema-tile-icon" />
                  </button>
                </CinemaToolHUD>
              </div>
            </div>

            {compareViewType === 'side-by-side' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {frameA && (
                  <div className="p-3 bg-[#0d0e16] border border-amber-500/40 rounded space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black font-black text-[9px]">SLOT A</span>
                        <span className="font-bold text-amber-300">{frameA.epNumber}</span>
                        <span className="text-zinc-300 truncate max-w-[150px]">{frameA.title}</span>
                      </div>
                      <select
                        value={frameA.lutFilter || 'cinematic'}
                        onChange={(e) => handleSetFrameLutDirect(frameA.id, e.target.value as LutPreset)}
                        className="bg-black border border-amber-400/50 rounded px-1.5 py-0.5 text-[9px] text-amber-300"
                      >
                        {ALL_LUT_OPTIONS.map(l => (
                          <option key={l.id} value={l.id}>{l.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="relative aspect-[2.39/1] bg-black rounded overflow-hidden border border-white/10">
                      {frameA.imageUrl && (
                        <div 
                          className="w-full h-full bg-cover bg-center"
                          style={{ 
                            backgroundImage: `url(${frameA.imageUrl})`,
                            filter: getLutFilterCSS(frameA.lutFilter || 'cinematic', frameA.adjustments)
                          }}
                        />
                      )}
                      {compareShowGuides && (
                        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-amber-400/20">
                          <div className="border-r border-b border-amber-400/20" />
                          <div className="border-r border-b border-amber-400/20" />
                          <div className="border-b border-amber-400/20" />
                          <div className="border-r border-b border-amber-400/20" />
                          <div className="border-r border-b border-amber-400/20" />
                          <div className="border-b border-amber-400/20" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {frameB && (
                  <div className="p-3 bg-[#0d0e16] border border-cyan-500/40 rounded space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-black font-black text-[9px]">SLOT B</span>
                        <span className="font-bold text-cyan-300">{frameB.epNumber}</span>
                        <span className="text-zinc-300 truncate max-w-[150px]">{frameB.title}</span>
                      </div>
                      <select
                        value={frameB.lutFilter || 'cinematic'}
                        onChange={(e) => handleSetFrameLutDirect(frameB.id, e.target.value as LutPreset)}
                        className="bg-black border border-cyan-400/50 rounded px-1.5 py-0.5 text-[9px] text-cyan-300"
                      >
                        {ALL_LUT_OPTIONS.map(l => (
                          <option key={l.id} value={l.id}>{l.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="relative aspect-[2.39/1] bg-black rounded overflow-hidden border border-white/10">
                      {frameB.imageUrl && (
                        <div 
                          className="w-full h-full bg-cover bg-center"
                          style={{ 
                            backgroundImage: `url(${frameB.imageUrl})`,
                            filter: getLutFilterCSS(frameB.lutFilter || 'cinematic', frameB.adjustments)
                          }}
                        />
                      )}
                      {compareShowGuides && (
                        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-cyan-400/20">
                          <div className="border-r border-b border-cyan-400/20" />
                          <div className="border-r border-b border-cyan-400/20" />
                          <div className="border-b border-cyan-400/20" />
                          <div className="border-r border-b border-cyan-400/20" />
                          <div className="border-r border-b border-cyan-400/20" />
                          <div className="border-b border-cyan-400/20" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="relative w-full max-w-4xl aspect-[2.39/1] bg-black rounded overflow-hidden border border-white/20 select-none">
                  {frameA?.imageUrl && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ 
                        backgroundImage: `url(${frameA.imageUrl})`,
                        filter: getLutFilterCSS(frameA.lutFilter || 'cinematic', frameA.adjustments)
                      }}
                    />
                  )}
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
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_8px_#06b6d4] z-20 pointer-events-none"
                    style={{ left: `${compareWipePos}%` }}
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 rounded border border-amber-400 text-amber-300 text-[9px] font-bold z-10">
                    SLOT A: {frameA?.epNumber}
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/80 rounded border border-cyan-400 text-cyan-300 text-[9px] font-bold z-10">
                    SLOT B: {frameB?.epNumber}
                  </div>
                </div>

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
            {isCompareMode ? (
              <span className="text-[9px] text-cyan-400 font-mono flex items-center gap-1 mr-1">
                <Columns2 className="w-3 h-3" />
                SELECT SLOTS A & B
              </span>
            ) : isMultiSelectMode ? (
              <span className="text-[9px] text-amber-400 font-mono flex items-center gap-1 mr-1">
                <CheckSquare className="w-3 h-3" />
                CHECK FRAMES FOR BATCH
              </span>
            ) : (
              <span className="text-[9px] text-amber-400 font-mono flex items-center gap-1 mr-1">
                <ArrowUpDown className="w-3 h-3" />
                DRAG TO RESEQUENCE
              </span>
            )}
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

      {/* Grid of Frames with Compare & Multi-Select Support */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pb-24">
        {filtered.map((frame, index) => {
          const isSelected = frame.id === currentFrameIndex;
          const actualIdx = frames.findIndex(f => f.id === frame.id);
          const resolvedIdx = actualIdx !== -1 ? actualIdx : index;
          const vaultEntry = resolveShotMediaEntry(shotMediaMap, frame, undefined, resolvedIdx);
          const cardImgUrl = vaultEntry?.url || frame.imageUrl || '';
          const isVideoMedia = vaultEntry
            ? vaultEntry.type === 'video'
            : isVideoSourceUrl(cardImgUrl, { isVideo: frame.isVideo });
          const cleanThumb =
            frame.thumbnailUrl && !isSvgPlaceholderUrl(frame.thumbnailUrl)
              ? frame.thumbnailUrl
              : frame.thumbnail && !isSvgPlaceholderUrl(frame.thumbnail)
                ? frame.thumbnail
                : '';
          const hasImage = Boolean(cardImgUrl || cleanThumb || isVideoMedia);
          const isBeingDragged = draggedFrameId === frame.id;
          const isDropTarget = dragOverFrameId === frame.id;

          const isSlotA = isCompareMode && compareSlotAId === frame.id;
          const isSlotB = isCompareMode && compareSlotBId === frame.id;
          const isMultiChecked = selectedFrameIds.has(frame.id);

          return (
            <div
              key={`grid-frame-${index}-${frame?.id ?? 'none'}`}
              data-shot-id={getShotMediaKey(frame, resolvedIdx)}
              data-shot-drop-index={resolvedIdx}
              draggable={!isMultiSelectMode && !isCompareMode}
              onDragStart={(e) => handleDragStart(e, frame.id)}
              onDragOver={(e) => handleDragOver(e, frame.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, frame.id)}
              onDragEnd={handleDragEnd}
              onClick={(e) => {
                if (isCompareMode) {
                  if (!isSlotA && !isSlotB) {
                    setCompareSlotBId(frame.id);
                  }
                  return;
                }
                if (e.shiftKey) {
                  selectRangeToFrame(frame.id, e.metaKey || e.ctrlKey);
                  return;
                }
                if (isMultiSelectMode || e.metaKey || e.ctrlKey) {
                  toggleSelectFrame(frame.id, e);
                  return;
                }
                anchorFrameIdRef.current = frame.id;
                const targetIdx = frames.findIndex(f => f.id === frame.id);
                onSelectFrame(targetIdx !== -1 ? targetIdx : index);
              }}
              className={`group relative aspect-[16/10] bg-[#101014] border rounded-xs overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                fileDropTargetId === frame.id
                  ? 'border-amber-400 ring-4 ring-amber-400/50 shadow-[0_0_25px_rgba(245,166,35,0.7)] scale-[1.03] z-40'
                  : isBeingDragged
                  ? 'opacity-30 scale-95 border-dashed border-amber-400'
                  : isDropTarget
                  ? dropPosition === 'before'
                    ? 'border-l-4 border-l-amber-400 border-amber-400/80 shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                    : 'border-r-4 border-r-amber-400 border-amber-400/80 shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                  : isSlotA
                  ? 'border-amber-400 ring-2 ring-amber-400 shadow-[0_0_20px_rgba(245,166,35,0.6)] scale-[1.02]'
                  : isSlotB
                  ? 'border-cyan-400 ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-[1.02]'
                  : isMultiChecked
                  ? 'border-amber-400 ring-2 ring-amber-400/80 bg-amber-500/10 scale-[1.01]'
                  : isSelected
                  ? 'border-amber-400 shadow-[0_0_15px_rgba(212,175,55,0.4)] ring-1 ring-amber-400'
                  : 'border-white/10 hover:border-amber-400/50'
              }`}
            >
              {/* Desktop File Drop Visual Target Overlay */}
              {fileDropTargetId === frame.id && (
                <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-sm border-2 border-dashed border-amber-400 flex flex-col items-center justify-center p-2 text-center pointer-events-none animate-in fade-in duration-100">
                  <Upload className="w-6 h-6 text-amber-400 animate-bounce mb-1" />
                  <span className="text-[10px] font-mono font-bold text-amber-300 tracking-wider">
                    DROP TO IMPORT MEDIA
                  </span>
                  <span className="text-[8px] font-mono text-zinc-300 mt-0.5 uppercase">
                    Assigns to {frame.epNumber || `SH${String(index + 1).padStart(3, '0')}`}
                  </span>
                </div>
              )}
              {/* Image/Video thumbnail with active LUT */}
              {hasImage ? (
                <ShotMediaThumbnail
                  shotIndex={resolvedIdx}
                  shotId={frame.id}
                  mediaUrl={cardImgUrl}
                  thumbnailUrl={cleanThumb}
                  isVideo={isVideoMedia}
                  mimeType={vaultEntry?.mimeType}
                  name={vaultEntry?.name}
                  title={frame.title}
                  bengaliTitle={frame.bengaliTitle}
                  shotType={frame.shotType}
                  lutFilterCss={getLutFilterCSS(frame.lutFilter || 'cinematic', frame.adjustments)}
                  className="absolute inset-0 w-full h-full overflow-hidden"
                  mediaClassName="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  alt={frame.title || `Shot ${resolvedIdx + 1}`}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center text-white/20 group-hover:text-white/40">
                  <ImageIcon className="w-5 h-5 mb-1 stroke-[1.5]" />
                  <span className="text-[9px] font-mono-tech uppercase">No Media</span>
                </div>
              )}

              {/* Gradient Dark Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              {/* Drag Handle / Checkbox & Shot Number */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                {isMultiSelectMode ? (
                  <button
                    onClick={(e) => toggleSelectFrame(frame.id, e)}
                    className={`p-1 rounded cursor-pointer ${isMultiChecked ? 'bg-amber-400 text-black' : 'bg-black/80 text-white/60 border border-white/20'}`}
                  >
                    {isMultiChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  </button>
                ) : !isCompareMode ? (
                  <div 
                    className="p-1 rounded-[1px] bg-black/80 hover:bg-amber-400 hover:text-black border border-white/20 text-zinc-300 cursor-grab active:cursor-grabbing transition-colors"
                    title="Drag to resequence"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="w-3 h-3" />
                  </div>
                ) : null}

                <span className="px-1.5 py-0.5 rounded-xs bg-black/70 backdrop-blur-md border border-white/15 text-[9px] font-mono-tech text-amber-400 font-bold">
                  {frame.epNumber || `#${String(index + 1).padStart(3, '0')}`}
                </span>
                {hasImage && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                )}
              </div>

              {/* Top Right: Compare Slot badges or Nudge controls */}
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                {isCompareMode ? (
                  <div className="flex items-center gap-1">
                    {isSlotA && <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black font-black text-[8px]">SLOT A</span>}
                    {isSlotB && <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-black font-black text-[8px]">SLOT B</span>}
                    {!isSlotA && !isSlotB && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompareSlotAId(frame.id);
                          }}
                          className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-400 hover:text-black border border-amber-400/50 text-amber-300 text-[8px] font-bold"
                        >
                          +A
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompareSlotBId(frame.id);
                          }}
                          className="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-400 hover:text-black border border-cyan-400/50 text-cyan-300 text-[8px] font-bold"
                        >
                          +B
                        </button>
                      </div>
                    )}
                  </div>
                ) : !isMultiSelectMode ? (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      {frame.cameraSpec?.aperture}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={(e) => toggleSelectFrame(frame.id, e)}
                    className="p-1 rounded bg-black/80 hover:bg-amber-400 hover:text-black border border-white/20 text-zinc-300 text-[8px]"
                  >
                    {isMultiChecked ? 'Checked' : 'Select'}
                  </button>
                )}
              </div>

              {/* Titles in bottom */}
              <div className="absolute bottom-2 left-2 right-2 z-10">
                <div className="flex items-center justify-between">
                  <span className="font-bengali text-xs text-amber-300 font-medium">
                    {frame.bengaliTitle}
                  </span>
                  {frame.lutFilter && (
                    <span className="px-1 py-0.2 rounded bg-black/70 border border-white/10 text-[7.5px] text-amber-300/80 font-mono uppercase">
                      {frame.lutFilter}
                    </span>
                  )}
                </div>
                <h4 className="font-cinzel text-xs font-bold text-white tracking-wider truncate group-hover:text-amber-400 transition-colors uppercase">
                  {frame.title}
                </h4>
                <p className="font-mono-tech text-[8px] text-white/50 tracking-wider truncate">
                  {frame.cameraSpec?.focalLength}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog Modal for Permanent Frame Deletion */}
      {confirmDeleteBatch && selectedFrameIds.size > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="grid-delete-dialog-title"
          onClick={() => setConfirmDeleteBatch(false)}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 p-4!"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0C0D12] border border-rose-500/45 rounded-lg p-5 p-5! shadow-[0_24px_64px_rgba(0,0,0,0.95)]"
          >
            <div className="flex items-start justify-between gap-3 pb-3 pb-3! border-b border-white/10">
              <CinemaBadgeHeader
                icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
                label={`DELETE (${selectedFrameIds.size})?`}
                accent="crimson"
              />
              <button
                onClick={() => setConfirmDeleteBatch(false)}
                className="p-1.5 rounded cinema-tile cinema-tile-amber cursor-pointer"
                aria-label="Close confirmation dialog"
              >
                <X className="w-4 h-4 cinema-tile-icon" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4">
              <button
                onClick={() => setConfirmDeleteBatch(false)}
                className="min-h-[44px] px-4 py-2 rounded-lg cinema-tile cinema-tile-amber text-[10px] font-black cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleBatchDelete}
                data-active="true"
                className="min-h-[44px] px-4 py-2 rounded-lg cinema-tile cinema-tile-crimson text-[10px] font-black flex items-center gap-1.5 cursor-pointer tabular-nums"
              >
                <Trash2 className="w-3.5 h-3.5 cinema-tile-icon" />
                <span>DELETE ({selectedFrameIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
