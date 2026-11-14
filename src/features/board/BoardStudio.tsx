/**
 * RAWx Studio — Master Multi-View Board Studio
 * Public API: BoardStudio component
 * Supports 7 switchable storyboard views (Grid, Row Sheet, Filmstrip, Corkboard, Kanban, Timeline, Outline),
 * speed editing shortcuts (S split, M merge, Ctrl+D duplicate, Ctrl+Enter new shot), and bulk editing.
 */

import React, { useState, useMemo, useRef } from 'react';
import { useStudioStore, BoardSubView } from '../../core/store';
import { baseThemesData } from '../../data/frames';
import { getShotProceduralSpec } from '../../data/proceduralCinemaEngine';
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
import { CinemaToolHUD, CinemaBadgeHeader } from '../../components/ui/CinemaToolHUD';

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
      const imgUrl = stored.imageUrl || '';
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
    if (!shot.imageUrl) {
      const proc = getShotProceduralSpec(shot.id ?? 0);
      return (
        <div
          className={`relative overflow-hidden flex flex-col items-center justify-center p-2 ${className}`}
          style={{ ...style, background: proc.palette.thumbCssBackdrop }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: proc.palette.lightLeakCss }}
          />
          <div className="relative z-10 text-center flex flex-col items-center gap-0.5 pointer-events-none">
            <span className="font-bangla text-xs font-bold text-amber-200/95 drop-shadow truncate max-w-full">
              {shot.titleBn}
            </span>
            <span className="font-mono text-[8px] tracking-widest text-zinc-200/80 uppercase truncate max-w-full">
              {shot.titleEn}
            </span>
          </div>
        </div>
      );
    }
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
      <div className="h-14 border-b border-[#D4AF37]/20 bg-[#0B0B0B] px-4 flex items-center justify-between gap-2 shrink-0 overflow-x-auto no-scrollbar">
        {/* Left: View Switcher (1-7) */}
        <div className="flex items-center gap-1 text-xs shrink-0">
          {([
            { id: 'grid', label: 'GRID', icon: LayoutGrid, en: '100-frame visual storyboard grid view', bn: 'কীভাবে ব্যবহার করবেন: সব শট গ্রিড আকারে দেখতে চাপুন।' },
            { id: 'row', label: 'ROW', icon: AlignJustify, en: 'Compact horizontal shot list rows', bn: 'কীভাবে ব্যবহার করবেন: শটগুলো রো লিস্ট আকারে দেখতে চাপুন।' },
            { id: 'filmstrip', label: 'REEL', icon: Film, en: 'Continuous 35mm filmstrip reel', bn: 'কীভাবে ব্যবহার করবেন: ৩৫মিমি ফিল্মস্ট্রিপ রিল ভিউ দেখতে চাপুন।' },
            { id: 'corkboard', label: 'PINS', icon: Trello, en: 'Pinned storyboard scene cards', bn: 'কীভাবে ব্যবহার করবেন: কর্কবোর্ড পিন কার্ড ভিউ দেখতে চাপুন।' },
            { id: 'kanban', label: 'KANBAN', icon: Columns3, en: 'Production status Kanban columns', bn: 'কীভাবে ব্যবহার করবেন: ড্রাফট ও অ্যাপ্রুভড কলাম দেখতে চাপুন।' },
            { id: 'timeline', label: 'TRACK', icon: Clock, en: 'Horizontal storyboard sequence track', bn: 'কীভাবে ব্যবহার করবেন: সিকোয়েন্স ট্র্যাক ভিউ দেখতে চাপুন।' },
            { id: 'outline', label: 'TREE', icon: ListTree, en: 'Script structure hierarchy outline', bn: 'কীভাবে ব্যবহার করবেন: স্ক্রিপ্ট আউটলাইন ট্রি দেখতে চাপুন।' }
          ] as const).map(v => {
            const VIcon = v.icon;
            const active = boardView === v.id;
            return (
              <CinemaToolHUD key={v.id} title={`${v.label} VIEW`} en={v.en} bn={v.bn} accent="amber">
                <button
                  onClick={() => setBoardView(v.id)}
                  data-active={active ? 'true' : 'false'}
                  className="cinema-tile cinema-tile-amber flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] cursor-pointer"
                >
                  <VIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
                  <span className="hidden sm:inline font-black tracking-wider text-[10px] sm:text-[11px] uppercase">{v.label}</span>
                </button>
              </CinemaToolHUD>
            );
          })}
        </div>

        {/* Center: Search & Filter */}
        <div className="relative flex-1 max-w-xs min-w-[120px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-[#121212] border border-[#D4AF37]/20 rounded pl-8 pr-3 py-1.5 text-xs text-[#EDEDED] focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        {/* Right: Card Zoom & Bulk Edit */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          {boardView === 'grid' && (
            <CinemaToolHUD
              title="CARD ZOOM"
              en="Resize storyboard grid thumbnails"
              bn="কীভাবে ব্যবহার করবেন: স্লাইডার টেনে শট কার্ডের সাইজ ছোট বা বড় করুন।"
              accent="amber"
            >
              <div className="hidden md:flex items-center gap-2">
                <span className="text-[#8A8A8A] text-[10px] font-black tracking-wider uppercase">ZOOM</span>
                <input
                  type="range"
                  min="160"
                  max="340"
                  value={cardSize}
                  onChange={(e) => setCardSize(Number(e.target.value))}
                  className="w-20 accent-[#D4AF37] cursor-pointer"
                />
              </div>
            </CinemaToolHUD>
          )}

          {boardNotice && (
            <span className="hidden lg:inline-block px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/40 text-[10px] font-black uppercase text-emerald-300 tabular-nums">
              {boardNotice}
            </span>
          )}

          {selectedShots.length > 0 && (
            <CinemaToolHUD
              title="DELETE SELECTED"
              en="Permanently remove all selected storyboard frames"
              bn="কীভাবে ব্যবহার করবেন: সিলেক্ট করা ফ্রেমগুলো চিরতরে মুছতে চাপুন।"
              accent="crimson"
            >
              <button
                onClick={() => setConfirmDeleteBatch(true)}
                data-testid="board-delete-selected-btn"
                className="cinema-tile cinema-tile-crimson flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                <span className="font-black tracking-wider text-[10px] uppercase">DELETE ({selectedShots.length})</span>
              </button>
            </CinemaToolHUD>
          )}

          <CinemaToolHUD
            title="BULK SELECT"
            en="Toggle multi-shot selection toolbar (Shift+Click for range)"
            bn="কীভাবে ব্যবহার করবেন: একসাথে একাধিক শট সিলেক্ট করে এডিট করতে চাপুন।"
            accent="amber"
          >
            <button
              onClick={() => setIsBulkBarOpen(!isBulkBarOpen)}
              data-active={isBulkBarOpen || selectedShots.length > 0 ? 'true' : 'false'}
              className="cinema-tile cinema-tile-amber flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
            >
              <CheckSquare className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span className="font-black tracking-wider text-[10px] uppercase">BULK ({selectedShots.length})</span>
            </button>
          </CinemaToolHUD>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {(isBulkBarOpen || selectedShots.length > 0) && (
        <div className="min-h-[44px] bg-[#121212] border-b border-[#D4AF37]/30 px-4 py-1.5 flex items-center justify-between text-xs animate-in fade-in duration-150 gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <CinemaToolHUD
              title="SELECT ALL"
              en="Select or deselect all filtered storyboard frames"
              bn="কীভাবে ব্যবহার করবেন: সব ফ্রেম একসাথে সিলেক্ট বা আনসিলেক্ট করতে চাপুন।"
              accent="amber"
            >
              <button
                onClick={selectAll}
                className="cinema-tile cinema-tile-amber px-2.5 py-1 font-black tracking-wider text-[10px] uppercase cursor-pointer tabular-nums"
              >
                {selectedShots.length === filteredShots.length ? 'NONE' : `ALL (${filteredShots.length})`}
              </button>
            </CinemaToolHUD>
            {selectedShots.length > 0 && (
              <CinemaToolHUD
                title="CLEAR SELECTION"
                en="Clear current frame selection"
                bn="কীভাবে ব্যবহার করবেন: সিলেকশন খালি করতে চাপুন।"
                accent="cyan"
              >
                <button
                  onClick={() => setSelectedShots([])}
                  className="cinema-tile cinema-tile-cyan px-2.5 py-1 font-black tracking-wider text-[10px] uppercase cursor-pointer"
                >
                  CLEAR
                </button>
              </CinemaToolHUD>
            )}
            <span className="text-[#8A8A8A] font-black tracking-wider text-[10px] uppercase tabular-nums">{selectedShots.length} SELECTED</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CinemaToolHUD
              title="CENTER PAN"
              en="Reset vertical framing Pan Y to 50% on selected shots"
              bn="কীভাবে ব্যবহার করবেন: সিলেক্ট করা শটগুলোর ফ্রেমিং মাঝে (৫০%) আনতে চাপুন।"
              accent="cyan"
            >
              <button
                onClick={() => {
                  selectedShots.forEach(idx => setShotPanY(idx, 50));
                  setSelectedShots([]);
                }}
                disabled={selectedShots.length === 0}
                className="cinema-tile cinema-tile-cyan px-2.5 py-1 font-black tracking-wider text-[10px] uppercase cursor-pointer disabled:opacity-40 whitespace-nowrap"
              >
                CENTER PAN
              </button>
            </CinemaToolHUD>
            <CinemaToolHUD
              title="APPROVE SHOTS"
              en="Mark all selected frames as Approved"
              bn="কীভাবে ব্যবহার করবেন: সিলেক্ট করা শটগুলো অ্যাপ্রুভ করতে চাপুন।"
              accent="emerald"
            >
              <button
                onClick={() => {
                  selectedShots.forEach(idx => updateShot(idx, { status: 'approved' }));
                  setSelectedShots([]);
                }}
                disabled={selectedShots.length === 0}
                className="cinema-tile cinema-tile-emerald px-2.5 py-1 font-black tracking-wider text-[10px] uppercase cursor-pointer disabled:opacity-40 whitespace-nowrap"
              >
                APPROVE
              </button>
            </CinemaToolHUD>
            {selectedShots.length > 0 && (
              <CinemaToolHUD
                title="DELETE SELECTED"
                en="Open permanent deletion confirmation dialog"
                bn="কীভাবে ব্যবহার করবেন: সিলেক্ট করা শটগুলো মুছে ফেলতে চাপুন।"
                accent="crimson"
              >
                <button
                  onClick={() => setConfirmDeleteBatch(true)}
                  className="cinema-tile cinema-tile-crimson px-3 py-1 font-black tracking-wider text-[10px] uppercase flex items-center gap-1.5 cursor-pointer whitespace-nowrap tabular-nums"
                >
                  <Trash2 className="w-3 h-3" strokeWidth={2.2} />
                  <span>DELETE ({selectedShots.length})</span>
                </button>
              </CinemaToolHUD>
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
                      <CinemaToolHUD
                        title="OPEN STAGE"
                        en="Jump directly to Stage Monitor with this shot active"
                        bn="কীভাবে ব্যবহার করবেন: এই শট স্টেজে ওপেন করতে চাপুন।"
                        accent="amber"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJumpToStage(shot.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-[#8A8A8A] hover:text-[#FFE066] transition-opacity cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                      </CinemaToolHUD>
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
                    <CinemaToolHUD
                      title="UPLOAD SHOT MEDIA"
                      en="Replace this shot plate with a 4K video or image"
                      bn="কীভাবে ব্যবহার করবেন: এই শটে নতুন ভিডিও বা ছবি আপলোড করতে চাপুন।"
                      accent="cyan"
                    >
                      <label 
                        onClick={(e) => e.stopPropagation()} 
                        className="absolute top-1 right-1 p-1 bg-black/85 hover:bg-black border border-white/20 text-white hover:text-[#FFE066] rounded cursor-pointer opacity-0 group-hover/thumb:opacity-100 transition-opacity z-20"
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
                    </CinemaToolHUD>

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
                <CinemaToolHUD
                  title="OPEN STAGE"
                  en="Open this shot in the cinema monitor"
                  bn="কীভাবে ব্যবহার করবেন: স্টেজ মনিটরে শটটি চালু করতে চাপুন।"
                  accent="amber"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJumpToStage(shot.id);
                    }}
                    className="cinema-tile cinema-tile-amber px-2.5 py-1.5 font-black tracking-wider text-[10px] uppercase cursor-pointer"
                  >
                    STAGE
                  </button>
                </CinemaToolHUD>
              </div>
            ))}
          </div>
        )}

        {/* VIEW 3: FILMSTRIP REEL VIEW */}
        {boardView === 'filmstrip' && (
          <div className="flex flex-col gap-6 py-4">
            <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2">
              <CinemaBadgeHeader icon={<Film className="w-3.5 h-3.5" />} label="FILMSTRIP" accent="amber" />
              <span className="text-[10px] font-black tracking-wider text-[#8A8A8A] uppercase">100 FRAMES</span>
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
              <div className="mb-3">
                <CinemaBadgeHeader
                  icon={boardView === 'timeline' ? <Clock className="w-3.5 h-3.5" /> : <ListTree className="w-3.5 h-3.5" />}
                  label={boardView === 'timeline' ? 'TRACK VIEW' : 'OUTLINE'}
                  accent="amber"
                />
              </div>
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
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0C0D12] border border-rose-500/45 rounded-lg p-5 shadow-[0_24px_64px_rgba(0,0,0,0.95)] font-sans flex flex-col gap-4"
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-md bg-rose-500/15 border border-rose-500/40 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-400" />
                </div>
                <div>
                  <h3 id="board-delete-dialog-title" className="text-xs font-black tracking-wider uppercase text-white">
                    DELETE {selectedShots.length} FRAMES
                  </h3>
                </div>
              </div>
              <CinemaToolHUD
                title="CLOSE DIALOG"
                en="Cancel permanent deletion and close modal"
                bn="কীভাবে ব্যবহার করবেন: বাতিল করে বের হতে চাপুন।"
                accent="amber"
              >
                <button
                  onClick={() => setConfirmDeleteBatch(false)}
                  className="cinema-tile cinema-tile-amber p-1.5 cursor-pointer"
                  aria-label="Close confirmation dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </CinemaToolHUD>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <CinemaToolHUD
                title="CANCEL"
                en="Keep all selected storyboard frames"
                bn="কীভাবে ব্যবহার করবেন: ডিলিট বাতিল করতে চাপুন।"
                accent="cyan"
              >
                <button
                  onClick={() => setConfirmDeleteBatch(false)}
                  className="cinema-tile cinema-tile-cyan px-4 py-2 min-h-[40px] font-black tracking-wider text-[10px] uppercase cursor-pointer"
                >
                  CANCEL
                </button>
              </CinemaToolHUD>
              <CinemaToolHUD
                title="CONFIRM DELETE"
                en="Permanently remove selected frames and re-index storyboard"
                bn="কীভাবে ব্যবহার করবেন: নিশ্চিতভাবে ফ্রেমগুলো ডিলিট করতে চাপুন।"
                accent="crimson"
              >
                <button
                  onClick={handleConfirmPermanentDelete}
                  className="cinema-tile cinema-tile-crimson px-4 py-2 min-h-[40px] font-black tracking-wider text-[10px] uppercase flex items-center gap-1.5 cursor-pointer tabular-nums"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                  <span>CONFIRM ({selectedShots.length})</span>
                </button>
              </CinemaToolHUD>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
