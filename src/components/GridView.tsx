import React, { useState } from 'react';
import { AnthologyFrame } from '../types/anthology';
import { Search, Sparkles, Filter, CheckCircle2, Image as ImageIcon, Camera } from 'lucide-react';
import { filterFrames } from '../utils/engine';

interface GridViewProps {
  frames: AnthologyFrame[];
  currentFrameIndex: number;
  onSelectFrame: (index: number) => void;
  onPopulateSamplePack: () => void;
}

export const GridView: React.FC<GridViewProps> = ({
  frames,
  currentFrameIndex,
  onSelectFrame,
  onPopulateSamplePack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();

  const filtered = filterFrames(frames, searchQuery, selectedTag);

  // Extract top tags safely
  const allTags = Array.from(new Set((frames || []).flatMap(f => Array.isArray(f?.tags) ? f.tags : []))).slice(0, 10);
  const populatedCount = (frames || []).filter(f => Boolean(f?.imageUrl)).length;

  return (
    <div className="w-full h-full flex flex-col bg-[#070709] p-4 sm:p-8 overflow-y-auto z-40">
      {/* Header & Filter Bar */}
      <div className="max-w-7xl mx-auto w-full mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-cinzel text-xl sm:text-2xl font-bold tracking-widest text-white uppercase">
                100-Frame Master Contact Sheet
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono-tech text-amber-300">
                {populatedCount} / 100 ACTIVE
              </span>
            </div>
            <p className="font-mono-tech text-xs text-white/50 tracking-wider mt-1">
              DIRECTORIAL ANTHOLOGY OVERVIEW • JUMP TO ANY TIMELINE FRAME
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onPopulateSamplePack}
              className="px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-xs text-xs font-mono-tech tracking-wider text-amber-300 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Populate All Frames
            </button>
          </div>
        </div>

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
            <button
              onClick={() => setSelectedTag(undefined)}
              className={`px-2.5 py-1 rounded-xs text-[10px] font-mono-tech tracking-wider uppercase transition-colors cursor-pointer ${
                selectedTag === undefined
                  ? 'bg-amber-400 text-black font-semibold'
                  : 'bg-white/5 hover:bg-white/10 text-white/60 border border-white/10'
              }`}
            >
              All (100)
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

      {/* Grid of 100 Frames */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pb-24">
        {filtered.map(frame => {
          const isSelected = frame.id === currentFrameIndex;
          const hasImage = Boolean(frame.imageUrl);

          return (
            <div
              key={frame.id}
              onClick={() => onSelectFrame(frame.id)}
              className={`group relative aspect-[16/10] bg-[#101014] border rounded-xs overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                isSelected
                  ? 'border-amber-400 shadow-[0_0_15px_rgba(212,175,55,0.4)] ring-1 ring-amber-400'
                  : 'border-white/10 hover:border-white/30'
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

              {/* Status Indicator */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                <span className="px-1.5 py-0.5 rounded-xs bg-black/70 backdrop-blur-md border border-white/15 text-[9px] font-mono-tech text-amber-400 font-bold">
                  {frame.epNumber}
                </span>
                {hasImage && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                )}
              </div>

              {/* Camera Spec tag */}
              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
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
