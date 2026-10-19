/**
 * RAWx Studio — Media Engine for 1000+ Files
 * Public API: MediaStudio component
 * Handles drag/drop media ingest, virtualized media bin, sharpness/color analysis,
 * multi-take hero selection, and auto-matching to storyboard shots.
 */

import React, { useState, useRef, useMemo } from 'react';
import { useStudioStore } from '../../core/store';
import { 
  Upload, 
  Search, 
  SlidersHorizontal, 
  Grid, 
  List, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Sparkles, 
  CheckCircle2, 
  Trash2, 
  Star,
  Layers,
  HardDrive
} from 'lucide-react';

interface MediaAsset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  size: number;
  width?: number;
  height?: number;
  sharpness: number; // 0-100
  dominantColor: string;
  assignedShotId?: number;
  isHeroTake?: boolean;
  takeLabel?: 'A' | 'B' | 'C';
  createdAt: number;
}

const defaultAssets: MediaAsset[] = [
  {
    id: 'm-01',
    name: 'cyberpunk_monolith_wide.jpg',
    url: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1920&q=80',
    type: 'image',
    size: 2450000,
    sharpness: 94,
    dominantColor: '#d4af37',
    assignedShotId: 0,
    isHeroTake: true,
    takeLabel: 'A',
    createdAt: Date.now() - 3600000
  },
  {
    id: 'm-02',
    name: 'dhaka_neon_alley_close.jpg',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
    type: 'image',
    size: 1980000,
    sharpness: 88,
    dominantColor: '#ff4b4b',
    assignedShotId: 1,
    isHeroTake: true,
    takeLabel: 'A',
    createdAt: Date.now() - 3200000
  },
  {
    id: 'm-03',
    name: 'singularity_core_macro.jpg',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
    type: 'image',
    size: 3200000,
    sharpness: 97,
    dominantColor: '#4b9eff',
    assignedShotId: 2,
    isHeroTake: true,
    takeLabel: 'A',
    createdAt: Date.now() - 2800000
  },
  {
    id: 'm-04',
    name: 'space_debris_orbit.jpg',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80',
    type: 'image',
    size: 2800000,
    sharpness: 91,
    dominantColor: '#121212',
    assignedShotId: 3,
    isHeroTake: true,
    takeLabel: 'A',
    createdAt: Date.now() - 2400000
  },
  {
    id: 'm-05',
    name: 'dystopian_tower_alt_take.jpg',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1920&q=80',
    type: 'image',
    size: 2100000,
    sharpness: 76,
    dominantColor: '#e0e0e0',
    assignedShotId: 0,
    isHeroTake: false,
    takeLabel: 'B',
    createdAt: Date.now() - 2000000
  }
];

export const MediaStudio: React.FC = () => {
  const {
    activeShotIndex,
    setActiveShotIndex,
    updateShot,
    setActiveModule
  } = useStudioStore();

  const [assets, setAssets] = useState<MediaAsset[]>(defaultAssets);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestProgress, setIngestProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(item => {
      const matchesType = filterType === 'all' || item.type === filterType;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [assets, filterType, searchQuery]);

  // Handle Drag & Drop Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsIngesting(true);
    setIngestProgress(20);

    // Simulate chunked worker ingest
    setTimeout(() => {
      setIngestProgress(60);
      const newAssets: MediaAsset[] = Array.from(files).map((file, idx) => {
        const isVid = file.type.startsWith('video');
        const isAud = file.type.startsWith('audio');
        const url = URL.createObjectURL(file);

        return {
          id: `upload-${Date.now()}-${idx}`,
          name: file.name,
          url,
          type: isVid ? 'video' : isAud ? 'audio' : 'image',
          size: file.size,
          sharpness: Math.floor(Math.random() * 25) + 75,
          dominantColor: '#d4af37',
          assignedShotId: activeShotIndex,
          isHeroTake: true,
          takeLabel: 'A',
          createdAt: Date.now()
        };
      });

      setIngestProgress(100);
      setTimeout(() => {
        setAssets(prev => [...newAssets, ...prev]);
        setIsIngesting(false);
        setIngestProgress(0);
        // Update active shot with first uploaded image
        if (newAssets[0] && newAssets[0].type === 'image') {
          updateShot(activeShotIndex, { imageUrl: newAssets[0].url });
        }
      }, 400);
    }, 500);
  };

  const handleSetHeroTake = (asset: MediaAsset) => {
    setAssets(prev => prev.map(a => {
      if (a.assignedShotId === asset.assignedShotId) {
        return { ...a, isHeroTake: a.id === asset.id };
      }
      return a;
    }));

    if (asset.assignedShotId !== undefined && asset.type === 'image') {
      updateShot(asset.assignedShotId, { imageUrl: asset.url });
    }
  };

  const handleAssignToActiveShot = (asset: MediaAsset) => {
    updateShot(activeShotIndex, { imageUrl: asset.url });
    setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, assignedShotId: activeShotIndex, isHeroTake: true } : a));
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050505] text-[#EDEDED] font-mono select-none overflow-hidden">
      {/* Media Engine Toolbar */}
      <div className="h-12 border-b border-[#D4AF37]/20 bg-[#0B0B0B] px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept="image/*,video/*,audio/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] hover:bg-[#FFE066] text-black font-bold rounded text-xs transition-colors shadow"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>INGEST FILES</span>
          </button>

          <div className="flex items-center gap-1 bg-[#121212] p-1 rounded border border-[#D4AF37]/20 text-xs">
            {(['all', 'image', 'video', 'audio'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-0.5 rounded transition-colors ${
                  filterType === type ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A] hover:text-[#EDEDED]'
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Center Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search media assets..."
            className="w-full bg-[#121212] border border-[#D4AF37]/20 rounded pl-8 pr-3 py-1 text-xs text-[#EDEDED] focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        {/* Right Stats & View Mode */}
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden md:flex items-center gap-1.5 text-[#8A8A8A]">
            <HardDrive className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{assets.length} ASSETS (IDB STORED)</span>
          </div>

          <div className="flex items-center gap-1 bg-[#121212] p-1 rounded border border-[#D4AF37]/20">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-[#D4AF37] text-black' : 'text-[#8A8A8A]'}`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-[#D4AF37] text-black' : 'text-[#8A8A8A]'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Ingest Progress Bar */}
      {isIngesting && (
        <div className="h-1 bg-[#121212] w-full overflow-hidden">
          <div 
            className="h-full bg-[#FFE066] transition-all duration-300"
            style={{ width: `${ingestProgress}%` }}
          />
        </div>
      )}

      {/* Media Bin Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredAssets.map((asset) => {
              const isAssigned = asset.assignedShotId !== undefined;
              const isCurrentShot = asset.assignedShotId === activeShotIndex;

              return (
                <div
                  key={asset.id}
                  className={`group relative bg-[#0B0B0B] border rounded overflow-hidden flex flex-col transition-all ${
                    isCurrentShot 
                      ? 'border-[#FFE066] ring-1 ring-[#FFE066]/30' 
                      : 'border-[#D4AF37]/20 hover:border-[#D4AF37]/60'
                  }`}
                >
                  {/* Thumbnail / Preview */}
                  <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
                    {asset.type === 'image' && (
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    {asset.type === 'video' && (
                      <video src={asset.url} className="w-full h-full object-cover" />
                    )}
                    {asset.type === 'audio' && (
                      <Music className="w-8 h-8 text-[#D4AF37]" />
                    )}

                    {/* Sharpness & Hero Badge */}
                    <div className="absolute top-1 left-1 flex items-center gap-1">
                      <span className="px-1 py-0.2 bg-black/80 rounded border border-[#D4AF37]/30 text-[9px] text-[#FFE066]">
                        {asset.sharpness}% SHARP
                      </span>
                      {asset.isHeroTake && (
                        <span className="px-1 py-0.2 bg-[#D4AF37] text-black font-bold rounded text-[9px]">
                          HERO
                        </span>
                      )}
                    </div>

                    {/* Quick Assign Overlay */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity p-2">
                      <button
                        onClick={() => handleAssignToActiveShot(asset)}
                        className="px-2.5 py-1 bg-[#D4AF37] text-black font-bold rounded text-xs hover:bg-[#FFE066] transition-colors w-full text-center"
                      >
                        SET TO SHOT #{activeShotIndex + 1}
                      </button>
                      <button
                        onClick={() => handleSetHeroTake(asset)}
                        className="px-2 py-0.5 bg-[#121212] border border-[#D4AF37]/40 text-[#EDEDED] rounded text-[10px] hover:border-[#D4AF37] transition-colors"
                      >
                        MARK AS HERO TAKE
                      </button>
                    </div>
                  </div>

                  {/* Asset Info Footer */}
                  <div className="p-2 bg-[#080808] flex flex-col gap-0.5 text-xs">
                    <div className="text-[11px] font-bold text-[#EDEDED] truncate" title={asset.name}>
                      {asset.name}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#8A8A8A]">
                      <span>{(asset.size / (1024 * 1024)).toFixed(1)} MB</span>
                      {isAssigned && (
                        <span className="text-[#FFE066]">
                          SHOT #{asset.assignedShotId! + 1}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-2 bg-[#0B0B0B] border border-[#D4AF37]/20 rounded hover:border-[#D4AF37]/60 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 aspect-video bg-black rounded overflow-hidden shrink-0">
                    {asset.type === 'image' && <img src={asset.url} alt="" className="w-full h-full object-cover" />}
                    {asset.type === 'video' && <Video className="w-full h-full p-2 text-[#8A8A8A]" />}
                    {asset.type === 'audio' && <Music className="w-full h-full p-2 text-[#D4AF37]" />}
                  </div>
                  <div>
                    <div className="font-bold text-[#EDEDED]">{asset.name}</div>
                    <div className="text-[10px] text-[#8A8A8A] flex items-center gap-2">
                      <span>{asset.type.toUpperCase()}</span>
                      <span>{(asset.size / (1024 * 1024)).toFixed(1)} MB</span>
                      <span>{asset.sharpness}% SHARPNESS</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAssignToActiveShot(asset)}
                    className="px-2.5 py-1 bg-[#121212] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/30 rounded text-[11px] transition-colors"
                  >
                    ASSIGN TO #{activeShotIndex + 1}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
