/**
 * RAWx Studio — Master Multi-View Board Studio
 * Public API: BoardStudio component
 * Supports 7 switchable storyboard views (Grid, Row Sheet, Filmstrip, Corkboard, Kanban, Timeline, Outline),
 * speed editing shortcuts (S split, M merge, Ctrl+D duplicate, Ctrl+Enter new shot), and bulk editing.
 */

import React, { useState, useMemo, useRef } from 'react';
import { useStudioStore, BoardSubView } from '../../core/store';
import { baseThemesData, localCinematicPlates } from '../../data/frames';
import { toBengaliNumerals } from '../../utils/engine';
import { 
  LayoutGrid, 
  AlignJustify, 
  Film, 
  Trello, 
  Columns3, 
  Clock, 
  ListTree, 
  Plus, 
  Copy, 
  Trash2, 
  Search, 
  Maximize2, 
  SlidersHorizontal,
  CheckSquare,
  Sparkles,
  MoveVertical,
  Video,
  Upload,
  AlertTriangle,
  X
} from 'lucide-react';

export const BoardStudio: React.FC = () => {
  const {
    activeShotIndex,
    setActiveShotIndex,
    setActiveModule,
    boardView,
    setBoardView,
    project,
    updateShot,
    setShotPanY,
    deleteShots
  } = useStudioStore();

  const [cardSize, setCardSize] = useState<number>(220);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShots, setSelectedShots] = useState<number[]>([]);
  const [isBulkBarOpen, setIsBulkBarOpen] = useState(false);
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState(false);
  const [boardNotice, setBoardNotice] = useState<string | null>(null);
  const anchorShotRef = useRef<number | null>(null);

  // Respect actual project.shots length when populated so deleted frames stay removed
  const totalShots = project.shots.length > 0 ? project.shots.length : 100;
  const shotsList = useMemo(() => {
    return Array.from({ length: totalShots }).map((_, idx) => {
      const stored = project.shots[idx] || {};
      const theme = baseThemesData[idx % baseThemesData.length];
      const imgUrl = stored.imageUrl || localCinematicPlates[idx % localCinematicPlates.length];
      const isVid = Boolean(
        stored.isVideo !== undefined
          ? stored.isVideo
          : (stored.imageUrl && (
              stored.imageUrl.startsWith('data:video') ||
              /\.(mp4|webm|mov|ogg|m4v|mkv)($|\?)/i.test(stored.imageUrl)
            ))
      );

      return {
        id: idx,
        number: idx + 1,
        titleEn: stored.title || theme.title,
        titleBn: stored.bengaliTitle || theme.sub,
        caption: stored.bengaliDesc || stored.tagline || theme.tag,
        imageUrl: imgUrl,
        isVideo: isVid,
        panY: stored.panY !== undefined ? stored.panY : 50,
        shotType: stored.shotType || (idx % 4 === 0 ? 'WIDE' : idx % 4 === 1 ? 'MCU' : idx % 4 === 2 ? 'CU' : 'POV'),
        duration: stored.durationSeconds || 2.5,
        status: stored.status || (idx % 3 === 0 ? 'approved' : idx % 3 === 1 ? 'in-progress' : 'planned')
      };
    });
  }, [project.shots, totalShots]);

  const handleShotDrop = (shotId: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg|m4v|mkv)$/i.test(file.name);
      const url = URL.createObjectURL(file);
      updateShot(shotId, { imageUrl: url, isVideo: isVid });
    }
  };

  const renderShotMedia = (shot: any, className: string = "w-full h-full object-cover", style?: React.CSSProperties) => {
    if (shot.isVideo) {
      return (
        <video
          key={shot.imageUrl}
          src={shot.imageUrl}
          muted
          playsInline
          loop
          preload="metadata"
          onMouseEnter={(e) => { e.currentTarget.play().catch(() => {}); }}
          onMouseLeave={(e) => { e.currentTarget.pause(); }}
          className={className}
          style={style}
        />
      );
    }
    return (
      <img
        src={shot.imageUrl}
        alt={shot.titleEn}
        className={className}
        style={style}
        loading="lazy"
      />
    );
  };

  const filteredShots = useMemo(() => {
    if (!searchQuery.trim()) return shotsList;
    const q = searchQuery.toLowerCase();
    return shotsList.filter(s => 
      s.titleEn.toLowerCase().includes(q) || 
      s.titleBn.toLowerCase().includes(q) ||
      s.caption.toLowerCase().includes(q) ||
      String(s.number).includes(q)
    );
  }, [shotsList, searchQuery]);

  const selectRangeToShot = (targetId: number, additive: boolean = false) => {
    const orderedIds = filteredShots.map(s => s.id);
    const anchor = anchorShotRef.current !== null && orderedIds.includes(anchorShotRef.current)
      ? anchorShotRef.current
      : orderedIds.includes(activeShotIndex)
      ? activeShotIndex
      : targetId;

    const startPos = orderedIds.indexOf(anchor);
    const endPos = orderedIds.indexOf(targetId);

    if (startPos === -1 || endPos === -1) {
      anchorShotRef.current = targetId;
      setSelectedShots([targetId]);
      return;
    }

    const low = Math.min(startPos, endPos);
    const high = Math.max(startPos, endPos);
    const rangeIds = orderedIds.slice(low, high + 1);

    setSelectedShots(prev => {
      if (additive) {
        return Array.from(new Set([...prev, ...rangeIds]));
      }
      return rangeIds;
    });
  };

  const toggleSelectShot = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey) {
      selectRangeToShot(idx, e.metaKey || e.ctrlKey);
      return;
    }
    anchorShotRef.current = idx;
    setSelectedShots(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const selectAll = () => {
    if (selectedShots.length === filteredShots.length) {
      setSelectedShots([]);
    } else {
      setSelectedShots(filteredShots.map(s => s.id));
    }
  };

  const handleConfirmPermanentDelete = () => {
    if (selectedShots.length === 0) return;
    if (selectedShots.length >= shotsList.length) {
      setBoardNotice('Cannot delete all frames — storyboard must retain at least 1 frame.');
      setTimeout(() => setBoardNotice(null), 3500);
      setConfirmDeleteBatch(false);
      return;
    }
    const count = selectedShots.length;
    deleteShots(selectedShots);
    setSelectedShots([]);
    setConfirmDeleteBatch(false);
    setBoardNotice(`Permanently deleted ${count} ${count === 1 ? 'frame' : 'frames'}`);
    setTimeout(() => setBoardNotice(null), 3500);
  };

  const handleDuplicate = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = shotsList[idx];
    updateShot(idx + 1, {
      title: `${target.titleEn} (COPY)`,
      bengaliTitle: target.titleBn,
      imageUrl: target.imageUrl,
      isVideo: target.isVideo,
      panY: target.panY
    });
  };

  const handleJumpToStage = (idx: number) => {
    setActiveShotIndex(idx);
    setActiveModule('PLAYER');
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050505] text-[#EDEDED] font-mono select-none overflow-hidden">
      {/* Board View Toolbar */}
      <div className="h-12 border-b border-[#D4AF37]/20 bg-[#0B0B0B] px-4 flex items-center justify-between gap-3 shrink-0">
        {/* Left: View Switcher (1-7) */}
        <div className="flex items-center gap-1 bg-[#121212] p-1 rounded border border-[#D4AF37]/20 text-xs">
          <button
            onClick={() => setBoardView('grid')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              boardView === 'grid' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A] hover:text-[#EDEDED]'
            }`}
            title="1: Grid View (100 Frames)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GRID</span>
          </button>
          <button
            onClick={() => setBoardView('row')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              boardView === 'row' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A] hover:text-[#EDEDED]'
            }`}
            title="2: Row Sheet View"
          >
            <AlignJustify className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ROW</span>
          </button>
          <button
            onClick={() => setBoardView('filmstrip')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              boardView === 'filmstrip' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A] hover:text-[#EDEDED]'
            }`}
            title="3: Continuous Filmstrip"
          >
            <Film className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">REEL</span>
          </button>
          <button
            onClick={() => setBoardView('corkboard')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              boardView === 'corkboard' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A] hover:text-[#EDEDED]'
            }`}
            title="4: Pin Corkboard"
          >
            <Trello className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PINS</span>
          </button>
          <button
            onClick={() => setBoardView('kanban')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              boardView === 'kanban' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A] hover:text-[#EDEDED]'
            }`}
            title="5: Production Kanban"
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">KANBAN</span>
          </button>
          <button
            onClick={() => setBoardView('timeline')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              boardView === 'timeline' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A] hover:text-[#EDEDED]'
            }`}
            title="6: Timeline Track"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">TRACK</span>
          </button>
          <button
            onClick={() => setBoardView('outline')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              boardView === 'outline' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A] hover:text-[#EDEDED]'
            }`}
            title="7: Script Outline"
          >
            <ListTree className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">TREE</span>
          </button>
        </div>

        {/* Center: Search & Filter */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shots (EN, দৃশ্য, #)..."
            className="w-full bg-[#121212] border border-[#D4AF37]/20 rounded pl-8 pr-3 py-1 text-xs text-[#EDEDED] focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        {/* Right: Card Zoom & Bulk Edit */}
        <div className="flex items-center gap-3 text-xs">
          {boardView === 'grid' && (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[#8A8A8A] text-[10px]">ZOOM</span>
              <input
                type="range"
                min="160"
                max="340"
                value={cardSize}
                onChange={(e) => setCardSize(Number(e.target.value))}
                className="w-20 accent-[#D4AF37]"
              />
            </div>
          )}

          {boardNotice && (
            <span className="hidden lg:inline-block px-2 py-0.5 px-2! py-0.5! rounded bg-emerald-950/90 border border-emerald-500/40 text-[10px] text-emerald-300 tabular-nums">
              {boardNotice}
            </span>
          )}

          {selectedShots.length > 0 && (
            <button
              onClick={() => setConfirmDeleteBatch(true)}
              data-testid="board-delete-selected-btn"
              className="flex items-center gap-1.5 px-3 py-1 px-3! py-1! rounded border border-rose-500/55 bg-rose-600/20 hover:bg-rose-600 hover:text-white text-rose-200 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
              title="Permanently delete selected frames"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedShots.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsBulkBarOpen(!isBulkBarOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 px-2.5! py-1! rounded border text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
              isBulkBarOpen || selectedShots.length > 0
                ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#FFE066]'
                : 'border-[#D4AF37]/20 text-[#8A8A8A] hover:text-[#EDEDED]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>BULK ({selectedShots.length})</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Bar (Expandable or Auto-Shown When Frames Selected) */}
      {(isBulkBarOpen || selectedShots.length > 0) && (
        <div className="h-10 bg-[#121212] border-b border-[#D4AF37]/30 px-4 px-4! flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="text-[#FFE066] hover:underline cursor-pointer tabular-nums"
            >
              {selectedShots.length === filteredShots.length ? 'Deselect All' : `Select All (${filteredShots.length})`}
            </button>
            {selectedShots.length > 0 && (
              <button
                onClick={() => setSelectedShots([])}
                className="text-[#8A8A8A] hover:text-white underline cursor-pointer"
              >
                Clear
              </button>
            )}
            <span className="text-[#8A8A8A]">·</span>
            <span className="text-[#8A8A8A] tabular-nums">{selectedShots.length} frames selected (Shift+Click for range)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                selectedShots.forEach(idx => setShotPanY(idx, 50));
                setSelectedShots([]);
              }}
              disabled={selectedShots.length === 0}
              className="px-2.5 py-1 px-2.5! py-1! bg-[#050505] border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded text-[11px] cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              Center Pan (50%)
            </button>
            <button
              onClick={() => {
                selectedShots.forEach(idx => updateShot(idx, { status: 'approved' }));
                setSelectedShots([]);
              }}
              disabled={selectedShots.length === 0}
              className="px-2.5 py-1 px-2.5! py-1! bg-[#D4AF37] text-black font-bold rounded text-[11px] cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              Mark Approved
            </button>
            {selectedShots.length > 0 && (
              <button
                onClick={() => setConfirmDeleteBatch(true)}
                className="px-3 py-1 px-3! py-1! bg-rose-600/25 hover:bg-rose-600 border border-rose-500/60 text-rose-200 hover:text-white font-bold rounded text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap tabular-nums"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Selected ({selectedShots.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Board Canvas */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* VIEW 1: GRID VIEW (100 Frames) */}
        {boardView === 'grid' && (
          <div 
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))`
            }}
          >
            {filteredShots.map((shot) => {
              const isSelected = selectedShots.includes(shot.id);
              const isActive = activeShotIndex === shot.id;

              return (
                <div
                  key={shot.id}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      selectRangeToShot(shot.id, e.metaKey || e.ctrlKey);
                      setActiveShotIndex(shot.id);
                      return;
                    }
                    if (e.metaKey || e.ctrlKey || isBulkBarOpen) {
                      toggleSelectShot(shot.id, e);
                      setActiveShotIndex(shot.id);
                      return;
                    }
                    anchorShotRef.current = shot.id;
                    setActiveShotIndex(shot.id);
                  }}
                  onDoubleClick={() => handleJumpToStage(shot.id)}
                  className={`group relative bg-[#0B0B0B] border rounded overflow-hidden cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#FFE066] ring-2 ring-[#FFE066]/60 bg-[#181408] shadow-lg'
                      : isActive
                      ? 'border-[#FFE066] ring-1 ring-[#FFE066]/30 shadow-lg'
                      : 'border-[#D4AF37]/20 hover:border-[#D4AF37]/60'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-2 border-b border-[#D4AF37]/10 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(e) => toggleSelectShot(shot.id, e)}
                        onChange={() => {}}
                        className="accent-[#D4AF37] rounded cursor-pointer"
                      />
                      <span className="font-bold text-[#FFE066] tabular-nums">
                        {String(shot.number).padStart(3, '0')}
                      </span>
                      <span className="text-[#8A8A8A] text-[10px]">
                        {toBengaliNumerals(String(shot.number).padStart(3, '0'))}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="px-1 py-0.2 bg-[#121212] border border-[#D4AF37]/20 rounded text-[9px] text-[#D4AF37]">
                        {shot.shotType}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJumpToStage(shot.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[#8A8A8A] hover:text-[#FFE066] transition-opacity"
                        title="Jump to Stage"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail with Pan Y Offset */}
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleShotDrop(shot.id, e)}
                    className="relative aspect-video bg-black overflow-hidden group/thumb"
                  >
                    {renderShotMedia(shot, "w-full h-full object-cover transition-transform duration-150", { objectPosition: `center ${shot.panY}%` })}

                    {/* Video Indicator */}
                    {shot.isVideo && (
                      <div className="absolute top-1 left-1 px-1 bg-black/85 rounded border border-[#D4AF37]/30 text-[8px] text-[#FFE066] flex items-center gap-0.5 z-10 pointer-events-none">
                        <Video className="w-2.5 h-2.5 text-[#D4AF37]" />
                        4K VIDEO
                      </div>
                    )}

                    {/* Quick Media Upload Button on Hover */}
                    <label 
                      onClick={(e) => e.stopPropagation()} 
                      className="absolute top-1 right-1 p-1 bg-black/85 hover:bg-black border border-white/20 text-white hover:text-[#FFE066] rounded cursor-pointer opacity-0 group-hover/thumb:opacity-100 transition-opacity z-20"
                      title="Upload 4K Video or Image to Shot"
                    >
                      <Upload className="w-2.5 h-2.5" />
                      <input 
                        type="file" 
                        accept="image/*,video/*,.mp4,.webm,.mov,.ogg,.m4v"
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg|m4v|mkv)$/i.test(file.name);
                            const url = URL.createObjectURL(file);
                            updateShot(shot.id, { imageUrl: url, isVideo: isVid });
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>

                    {/* Pan Y Indicator */}
                    <div className="absolute bottom-1 right-1 px-1 bg-black/80 rounded border border-[#D4AF37]/20 text-[9px] text-[#8A8A8A] flex items-center gap-0.5">
                      <MoveVertical className="w-2.5 h-2.5" />
                      <span>{shot.panY}%</span>
                    </div>
                  </div>

                  {/* Card Metadata Footer */}
                  <div className="p-2 flex flex-col gap-0.5 bg-[#080808]">
                    <div className="text-xs font-bold text-[#EDEDED] truncate font-sans">
                      {shot.titleEn}
                    </div>
                    <div className="text-[11px] text-[#FFE066] truncate font-serif">
                      {shot.titleBn}
                    </div>
                    <div className="text-[10px] text-[#8A8A8A] truncate mt-0.5">
                      {shot.caption}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: ROW SHEET VIEW */}
        {boardView === 'row' && (
          <div className="flex flex-col gap-2">
            {filteredShots.map((shot) => (
              <div
                key={shot.id}
                onClick={() => setActiveShotIndex(shot.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleShotDrop(shot.id, e)}
                className={`flex items-center gap-4 p-2 bg-[#0B0B0B] border rounded hover:border-[#D4AF37]/60 cursor-pointer ${
                  activeShotIndex === shot.id ? 'border-[#FFE066] bg-[#121212]' : 'border-[#D4AF37]/20'
                }`}
              >
                <div className="w-12 text-center font-bold text-[#FFE066] text-xs">
                  #{String(shot.number).padStart(3, '0')}
                </div>
                <div className="w-28 aspect-video bg-black rounded overflow-hidden shrink-0 relative">
                  {renderShotMedia(shot, "w-full h-full object-cover", { objectPosition: `center ${shot.panY}%` })}
                  {shot.isVideo && (
                    <div className="absolute bottom-0.5 right-0.5 px-1 bg-black/85 border border-[#D4AF37]/40 rounded text-[8px] text-[#FFE066] flex items-center gap-0.5">
                      <Video className="w-2 h-2 text-[#D4AF37]" />
                      VIDEO
                    </div>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="font-bold text-[#EDEDED]">{shot.titleEn}</div>
                    <div className="text-[#FFE066] font-serif text-[11px]">{shot.titleBn}</div>
                  </div>
                  <div className="text-[#8A8A8A] text-[11px] truncate">
                    {shot.caption}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[#8A8A8A]">
                    <span className="px-1.5 py-0.5 bg-[#121212] border border-[#D4AF37]/20 rounded text-[#D4AF37]">
                      {shot.shotType}
                    </span>
                    <span>PAN: {shot.panY}%</span>
                    <span>{shot.duration}s</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJumpToStage(shot.id);
                  }}
                  className="px-2 py-1 bg-[#121212] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/30 rounded text-[11px] transition-colors"
                >
                  STAGE
                </button>
              </div>
            ))}
          </div>
        )}

        {/* VIEW 3: FILMSTRIP REEL VIEW */}
        {boardView === 'filmstrip' && (
          <div className="flex flex-col gap-6 py-4">
            <div className="text-xs text-[#8A8A8A] flex items-center justify-between border-b border-[#D4AF37]/20 pb-2">
              <span>35MM ANTHOLOGY FILMSTRIP — 24FPS CINE REEL</span>
              <span>100 FRAMES PERSISTED</span>
            </div>
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <div className="inline-flex gap-4 p-4 bg-black border border-[#D4AF37]/40 rounded-xl relative">
                {filteredShots.map((shot) => (
                  <div
                    key={shot.id}
                    onClick={() => setActiveShotIndex(shot.id)}
                    className={`w-64 shrink-0 bg-[#0B0B0B] border rounded overflow-hidden cursor-pointer ${
                      activeShotIndex === shot.id ? 'border-[#FFE066] ring-2 ring-[#FFE066]/40' : 'border-[#D4AF37]/20'
                    }`}
                  >
                    {/* Sprocket Holes */}
                    <div className="h-4 bg-black flex items-center justify-around px-2 border-b border-[#D4AF37]/10">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="w-2.5 h-1.5 bg-[#121212] border border-[#D4AF37]/20 rounded-xs" />
                      ))}
                    </div>

                    <div className="aspect-video bg-black relative">
                      {renderShotMedia(shot, "w-full h-full object-cover", { objectPosition: `center ${shot.panY}%` })}
                      {shot.isVideo && (
                        <div className="absolute top-1 left-1 px-1 bg-black/85 rounded border border-[#D4AF37]/30 text-[8px] text-[#FFE066] flex items-center gap-0.5 z-10 pointer-events-none">
                          <Video className="w-2.5 h-2.5 text-[#D4AF37]" />
                          4K
                        </div>
                      )}
                    </div>

                    <div className="p-2 text-xs">
                      <div className="flex items-center justify-between text-[#FFE066] font-bold text-[10px]">
                        <span>FRAME {String(shot.number).padStart(3, '0')}</span>
                        <span>{shot.duration}s</span>
                      </div>
                      <div className="font-bold text-[#EDEDED] truncate mt-0.5">{shot.titleEn}</div>
                      <div className="text-[#8A8A8A] text-[10px] truncate">{shot.titleBn}</div>
                    </div>

                    <div className="h-4 bg-black flex items-center justify-around px-2 border-t border-[#D4AF37]/10">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="w-2.5 h-1.5 bg-[#121212] border border-[#D4AF37]/20 rounded-xs" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: CORKBOARD PINS VIEW */}
        {boardView === 'corkboard' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
            {filteredShots.map((shot) => (
              <div
                key={shot.id}
                onClick={() => setActiveShotIndex(shot.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleShotDrop(shot.id, e)}
                className="relative bg-[#121212] border border-[#D4AF37]/30 rounded-lg p-3 shadow-xl hover:-translate-y-1 transition-transform cursor-pointer"
              >
                {/* Pin Head */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#D4AF37] rounded-full shadow border border-black" />
                <div className="mt-1 flex items-center justify-between text-xs font-bold text-[#FFE066]">
                  <span>SCENE #{shot.number}</span>
                  <span className="text-[10px] text-[#8A8A8A]">{shot.status}</span>
                </div>
                <div className="aspect-video bg-black rounded overflow-hidden my-2 border border-[#D4AF37]/10 relative">
                  {renderShotMedia(shot, "w-full h-full object-cover", { objectPosition: `center ${shot.panY}%` })}
                  {shot.isVideo && (
                    <div className="absolute top-1 left-1 px-1 bg-black/85 rounded border border-[#D4AF37]/30 text-[8px] text-[#FFE066] flex items-center gap-0.5 z-10 pointer-events-none">
                      <Video className="w-2.5 h-2.5 text-[#D4AF37]" />
                      4K VIDEO
                    </div>
                  )}
                </div>
                <div className="font-bold text-xs text-[#EDEDED]">{shot.titleEn}</div>
                <div className="text-[11px] text-[#FFE066] font-serif">{shot.titleBn}</div>
                <p className="text-[10px] text-[#8A8A8A] mt-1 line-clamp-2">{shot.caption}</p>
              </div>
            ))}
          </div>
        )}

        {/* VIEW 5: KANBAN COLUMNS */}
        {boardView === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            {['Draft', 'In Progress', 'Approved'].map((status) => {
              const columnShots = filteredShots.filter(s => s.status === status);
              return (
                <div key={status} className="bg-[#0B0B0B] border border-[#D4AF37]/20 rounded-lg flex flex-col overflow-hidden">
                  <div className="p-3 bg-[#121212] border-b border-[#D4AF37]/20 flex items-center justify-between text-xs font-bold">
                    <span className="text-[#FFE066]">{status.toUpperCase()}</span>
                    <span className="px-1.5 py-0.5 bg-black rounded text-[10px] text-[#8A8A8A]">
                      {columnShots.length}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 custom-scrollbar">
                    {columnShots.map((shot) => (
                      <div
                        key={shot.id}
                        onClick={() => setActiveShotIndex(shot.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleShotDrop(shot.id, e)}
                        className="p-2 bg-[#121212] border border-[#D4AF37]/20 rounded hover:border-[#D4AF37]/60 cursor-pointer flex gap-2"
                      >
                        <div className="w-16 aspect-video bg-black rounded overflow-hidden shrink-0 relative">
                          {renderShotMedia(shot, "w-full h-full object-cover", { objectPosition: `center ${shot.panY}%` })}
                          {shot.isVideo && (
                            <div className="absolute bottom-0.5 right-0.5 px-0.5 bg-black/80 rounded text-[7px] text-[#FFE066]">
                              <Video className="w-2 h-2 text-[#D4AF37]" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="text-[11px] font-bold text-[#EDEDED] truncate">#{shot.number} {shot.titleEn}</div>
                          <div className="text-[10px] text-[#FFE066] truncate font-serif">{shot.titleBn}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 6 & 7: TIMELINE & OUTLINE FALLBACK VIEW */}
        {(boardView === 'timeline' || boardView === 'outline') && (
          <div className="flex flex-col gap-3">
            <div className="p-4 bg-[#0B0B0B] border border-[#D4AF37]/20 rounded-lg">
              <h3 className="text-xs font-bold text-[#FFE066] mb-2">
                {boardView === 'timeline' ? 'NLE STORYBOARD TIMELINE SEQUENCE' : 'SCRIPT STRUCTURE HIERARCHY'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {filteredShots.slice(0, 48).map((shot) => (
                  <div
                    key={shot.id}
                    onClick={() => setActiveShotIndex(shot.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleShotDrop(shot.id, e)}
                    className="p-2 bg-[#121212] border border-[#D4AF37]/20 rounded hover:border-[#D4AF37] cursor-pointer text-center"
                  >
                    <div className="aspect-video bg-black rounded overflow-hidden mb-1 relative">
                      {renderShotMedia(shot, "w-full h-full object-cover")}
                      {shot.isVideo && (
                        <div className="absolute top-0.5 left-0.5 px-0.5 bg-black/80 rounded text-[6px] text-[#FFE066]">
                          VID
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-[#FFE066]">#{shot.number}</div>
                    <div className="text-[9px] text-[#8A8A8A] truncate">{shot.titleEn}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Permanent Batch Deletion Confirmation Dialog */}
      {confirmDeleteBatch && selectedShots.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="board-delete-dialog-title"
          onClick={() => setConfirmDeleteBatch(false)}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 p-4!"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0C0D12] border border-rose-500/45 rounded-lg p-5 p-5! shadow-[0_24px_64px_rgba(0,0,0,0.95)] font-sans"
          >
            <div className="flex items-start justify-between gap-3 pb-3 pb-3! border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-md bg-rose-500/15 border border-rose-500/40 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-400" />
                </div>
                <div>
                  <h3 id="board-delete-dialog-title" className="text-sm font-bold text-white">
                    Permanently Delete Selected Frames?
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                    {selectedShots.length} {selectedShots.length === 1 ? 'frame' : 'frames'} selected
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmDeleteBatch(false)}
                className="p-1 p-1! text-zinc-400 hover:text-white rounded cursor-pointer"
                aria-label="Close confirmation dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed py-4 py-4!">
              This will permanently remove{' '}
              <span className="font-semibold text-white tabular-nums">
                {selectedShots.length} {selectedShots.length === 1 ? 'frame' : 'frames'}
              </span>{' '}
              from the storyboard and re-index the remaining sequence. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 pt-2! border-t border-white/10">
              <button
                onClick={() => setConfirmDeleteBatch(false)}
                className="px-4 py-2 px-4! py-2! rounded bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-medium text-zinc-200 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPermanentDelete}
                className="px-4 py-2 px-4! py-2! rounded bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer transition-colors tabular-nums"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Delete ({selectedShots.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
