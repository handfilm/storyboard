/**
 * RAWx Studio — Master Multi-View Board Studio
 * Public API: BoardStudio component
 * Supports 7 switchable storyboard views (Grid, Row Sheet, Filmstrip, Corkboard, Kanban, Timeline, Outline),
 * speed editing shortcuts (S split, M merge, Ctrl+D duplicate, Ctrl+Enter new shot), and bulk editing.
 */

import React, { useState, useMemo } from 'react';
import { useStudioStore, BoardSubView } from '../../core/store';
import { baseThemesData } from '../../data/frames';
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
  MoveVertical
} from 'lucide-react';

const sampleCinemaImages = [
  "https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1519638399535-1b036603ac77?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80"
];

export const BoardStudio: React.FC = () => {
  const {
    activeShotIndex,
    setActiveShotIndex,
    setActiveModule,
    boardView,
    setBoardView,
    project,
    updateShot,
    setShotPanY
  } = useStudioStore();

  const [cardSize, setCardSize] = useState<number>(220);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShots, setSelectedShots] = useState<number[]>([]);
  const [isBulkBarOpen, setIsBulkBarOpen] = useState(false);

  // Fallback to 100 shots if project.shots is empty
  const totalShots = Math.max(100, project.shots.length);
  const shotsList = useMemo(() => {
    return Array.from({ length: totalShots }).map((_, idx) => {
      const stored = project.shots[idx] || {};
      const theme = baseThemesData[idx % baseThemesData.length];
      return {
        id: idx,
        number: idx + 1,
        titleEn: stored.titleEn || theme.en,
        titleBn: stored.titleBn || theme.bn,
        caption: stored.caption || theme.caption,
        imageUrl: stored.imageUrl || sampleCinemaImages[idx % sampleCinemaImages.length],
        panY: stored.panY !== undefined ? stored.panY : 50,
        shotType: stored.shotType || (idx % 4 === 0 ? 'WIDE' : idx % 4 === 1 ? 'MCU' : idx % 4 === 2 ? 'CU' : 'POV'),
        duration: stored.duration || 2.5,
        status: stored.status || (idx % 3 === 0 ? 'Approved' : idx % 3 === 1 ? 'In Progress' : 'Draft')
      };
    });
  }, [project.shots, totalShots]);

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

  const toggleSelectShot = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleDuplicate = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = shotsList[idx];
    updateShot(idx + 1, {
      titleEn: `${target.titleEn} (COPY)`,
      titleBn: target.titleBn,
      imageUrl: target.imageUrl,
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

          <button
            onClick={() => setIsBulkBarOpen(!isBulkBarOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-colors ${
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

      {/* Bulk Action Bar (Expandable) */}
      {isBulkBarOpen && (
        <div className="h-10 bg-[#121212] border-b border-[#D4AF37]/30 px-4 flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="text-[#FFE066] hover:underline"
            >
              {selectedShots.length === filteredShots.length ? 'Deselect All' : 'Select All 100'}
            </button>
            <span className="text-[#8A8A8A]">|</span>
            <span className="text-[#8A8A8A]">{selectedShots.length} shots selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                selectedShots.forEach(idx => setShotPanY(idx, 50));
                setSelectedShots([]);
              }}
              className="px-2 py-0.5 bg-[#050505] border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded text-[11px]"
            >
              Center Pan (50%)
            </button>
            <button
              onClick={() => {
                selectedShots.forEach(idx => updateShot(idx, { status: 'Approved' }));
                setSelectedShots([]);
              }}
              className="px-2 py-0.5 bg-[#D4AF37] text-black font-bold rounded text-[11px]"
            >
              Mark Approved
            </button>
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
                  onClick={() => setActiveShotIndex(shot.id)}
                  className={`group relative bg-[#0B0B0B] border rounded overflow-hidden cursor-pointer transition-all ${
                    isActive
                      ? 'border-[#FFE066] ring-2 ring-[#FFE066]/30 shadow-lg'
                      : isSelected
                      ? 'border-[#D4AF37]'
                      : 'border-[#D4AF37]/20 hover:border-[#D4AF37]/60'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-2 border-b border-[#D4AF37]/10 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelectShot(shot.id, e as any)}
                        className="accent-[#D4AF37] rounded cursor-pointer"
                      />
                      <span className="font-bold text-[#FFE066]">
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
                  <div className="relative aspect-video bg-black overflow-hidden">
                    <img
                      src={shot.imageUrl}
                      alt={shot.titleEn}
                      className="w-full h-full object-cover transition-transform duration-150"
                      style={{
                        objectPosition: `center ${shot.panY}%`
                      }}
                      loading="lazy"
                    />

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
                className={`flex items-center gap-4 p-2 bg-[#0B0B0B] border rounded hover:border-[#D4AF37]/60 cursor-pointer ${
                  activeShotIndex === shot.id ? 'border-[#FFE066] bg-[#121212]' : 'border-[#D4AF37]/20'
                }`}
              >
                <div className="w-12 text-center font-bold text-[#FFE066] text-xs">
                  #{String(shot.number).padStart(3, '0')}
                </div>
                <div className="w-28 aspect-video bg-black rounded overflow-hidden shrink-0">
                  <img
                    src={shot.imageUrl}
                    alt={shot.titleEn}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `center ${shot.panY}%` }}
                  />
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

                    <div className="aspect-video bg-black">
                      <img
                        src={shot.imageUrl}
                        alt={shot.titleEn}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `center ${shot.panY}%` }}
                      />
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
                className="relative bg-[#121212] border border-[#D4AF37]/30 rounded-lg p-3 shadow-xl hover:-translate-y-1 transition-transform cursor-pointer"
              >
                {/* Pin Head */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#D4AF37] rounded-full shadow border border-black" />
                <div className="mt-1 flex items-center justify-between text-xs font-bold text-[#FFE066]">
                  <span>SCENE #{shot.number}</span>
                  <span className="text-[10px] text-[#8A8A8A]">{shot.status}</span>
                </div>
                <div className="aspect-video bg-black rounded overflow-hidden my-2 border border-[#D4AF37]/10">
                  <img
                    src={shot.imageUrl}
                    alt={shot.titleEn}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `center ${shot.panY}%` }}
                  />
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
                        className="p-2 bg-[#121212] border border-[#D4AF37]/20 rounded hover:border-[#D4AF37]/60 cursor-pointer flex gap-2"
                      >
                        <div className="w-16 aspect-video bg-black rounded overflow-hidden shrink-0">
                          <img
                            src={shot.imageUrl}
                            alt={shot.titleEn}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: `center ${shot.panY}%` }}
                          />
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
                    className="p-2 bg-[#121212] border border-[#D4AF37]/20 rounded hover:border-[#D4AF37] cursor-pointer text-center"
                  >
                    <div className="aspect-video bg-black rounded overflow-hidden mb-1">
                      <img src={shot.imageUrl} alt={shot.titleEn} className="w-full h-full object-cover" />
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
    </div>
  );
};
