/**
 * @file /src/components/dashboard/ProjectStatsSidebar.tsx
 * @description Master Project Statistics & Sequence Analytics Dashboard Sidebar.
 * 
 * Capabilities:
 * - Calculates and visualizes real-time project statistics:
 *   1. Total Runtime (SMPTE HH:MM:SS:FF, exact seconds, and total discrete frames at locked 24fps).
 *   2. Shot Count (Total shots, populated vs empty, video vs still plates).
 *   3. Average Shot Duration (Mean hold duration with pacing rhythm cadence analysis).
 *   4. Distribution & Outliers (Shortest shot, longest shot, aspect ratio specs, master clock).
 * - Interactive Shot Sequence Navigator: Jump directly to any shot card across the timeline.
 * - Clean, production-grade sidebar adhering to the Universal Frontend Design Constitution (no static pills, clean typography).
 */

import React, { useMemo, useState } from 'react';
import { AnthologyFrame } from '../../types/anthology';
import {
  calculateMasterSequenceDuration,
  formatRuntimeTimecode,
  getShotDurationSec,
  getShotTargetFps
} from '../../types/storyboard';
import {
  Clock,
  Film,
  Timer,
  X,
  Layers,
  ChevronRight,
  TrendingUp,
  BarChart2,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  Activity,
  Maximize2,
  HardDrive
} from 'lucide-react';
import { MediaVaultD3Dashboard } from './MediaVaultD3Dashboard';

export interface ProjectStatsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  frames: AnthologyFrame[];
  currentIndex: number;
  onSelectFrame: (index: number) => void;
  aspectRatio?: string;
  projectTitle?: string;
  directorName?: string;
}

export const ProjectStatsSidebar: React.FC<ProjectStatsSidebarProps> = ({
  isOpen,
  onClose,
  frames,
  currentIndex,
  onSelectFrame,
  aspectRatio = '2.39:1',
  projectTitle = 'UNTITLED ANTHOLOGY',
  directorName = 'DIRECTOR'
}) => {
  const [activeTab, setActiveTab] = useState<'MEDIA_VAULT' | 'SEQUENCE'>('MEDIA_VAULT');
  // Real-Time Project Metrics Calculation
  const stats = useMemo(() => {
    const totalShots = frames && frames.length > 0 ? frames.length : 0;
    const totalRuntimeSec = calculateMasterSequenceDuration(frames, 12.0);
    const averageDurationSec = totalShots > 0 ? totalRuntimeSec / totalShots : 12.0;
    const totalFramesCount = Math.round(totalRuntimeSec * 24.0);

    let populatedCount = 0;
    let videoCount = 0;
    let shortest = { index: 0, duration: 1800.0, epNumber: '001', title: 'Shot 1' };
    let longest = { index: 0, duration: 0, epNumber: '001', title: 'Shot 1' };

    frames.forEach((f, idx) => {
      const dur = getShotDurationSec(f, 12.0);
      const isVideo = Boolean(
        f.isVideo ||
        f.imageUrl?.includes('video') ||
        f.imageUrl?.endsWith('.mp4') ||
        f.imageUrl?.endsWith('.webm')
      );
      if (f.imageUrl || isVideo) populatedCount++;
      if (isVideo) videoCount++;

      const shotNum = f.epNumber || String(idx + 1).padStart(3, '0');
      const title = f.title || `Shot ${idx + 1}`;

      if (dur < shortest.duration) {
        shortest = { index: idx, duration: dur, epNumber: shotNum, title };
      }
      if (dur > longest.duration) {
        longest = { index: idx, duration: dur, epNumber: shotNum, title };
      }
    });

    const stillCount = totalShots - videoCount;
    const completionPercent = totalShots > 0 ? Math.round((populatedCount / totalShots) * 100) : 0;

    // Pacing rhythm categorization based on average duration
    let pacingCadence = 'Cinematic Narrative';
    let pacingDescription = 'Balanced narrative pacing suitable for feature previz';
    if (averageDurationSec < 2.5) {
      pacingCadence = 'Staccato / Rap Rhythm';
      pacingDescription = 'Hyper-fast rhythmic cutting driven by 808 transients';
    } else if (averageDurationSec < 5.0) {
      pacingCadence = 'Commercial / Reel Cadence';
      pacingDescription = 'High-retention pace optimized for digital cinema reels';
    } else if (averageDurationSec > 15.0) {
      pacingCadence = 'Documentary Feature Hold';
      pacingDescription = 'Deliberate meditative holds with ambient sound immersion';
    }

    return {
      totalShots,
      totalRuntimeSec,
      averageDurationSec,
      totalFramesCount,
      populatedCount,
      videoCount,
      stillCount,
      completionPercent,
      shortest: shortest.duration === 1800.0 ? { ...shortest, duration: 12.0 } : shortest,
      longest: longest.duration === 0 ? { ...longest, duration: 12.0 } : longest,
      pacingCadence,
      pacingDescription,
      smpteTimecode: formatRuntimeTimecode(totalRuntimeSec, 24)
    };
  }, [frames]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex pointer-events-auto">
      {/* Backdrop for click outside */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Sidebar Container */}
      <aside
        style={{ backdropFilter: 'blur(20px)', background: 'rgba(10, 10, 10, 0.85)' }}
        className="relative w-full sm:w-[420px] h-full border-l border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col font-mono text-zinc-300 select-none z-10 animate-in slide-in-from-right duration-300 ease-out"
      >
        
        {/* Header */}
        <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F5A623]/10 border border-[#F5A623]/30 flex items-center justify-center text-[#F5A623]">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                <span>PROJECT DASHBOARD</span>
              </h2>
              <p className="text-[10px] text-zinc-500 truncate max-w-[220px]">
                {projectTitle} · {directorName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Close Dashboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: MEDIA VAULT (D3) vs SEQUENCE METRICS */}
        <div className="px-5 pt-3 pb-2 border-b border-white/10 bg-black/20 shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('MEDIA_VAULT')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
              activeTab === 'MEDIA_VAULT'
                ? 'bg-[#F5A623] text-black border-[#F5A623] shadow-[0_0_12px_rgba(245,166,35,0.3)]'
                : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>MEDIA VAULT (D3)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SEQUENCE')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
              activeTab === 'SEQUENCE'
                ? 'bg-[#F5A623] text-black border-[#F5A623] shadow-[0_0_12px_rgba(245,166,35,0.3)]'
                : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>SEQUENCE STATS</span>
          </button>
        </div>

        {/* Scrollable Dashboard Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          {activeTab === 'MEDIA_VAULT' ? (
            <MediaVaultD3Dashboard frames={frames} />
          ) : (
            <>
              {/* Top 3 Core Metrics Grid */}
              <div className="grid grid-cols-1 gap-3">
            
            {/* Metric 1: Total Runtime */}
            <div className="p-4 rounded-xl bg-[#12121A] border border-[#232332] relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-[#F5A623]" />
                  TOTAL RUNTIME
                </span>
                <span className="text-[10px] text-zinc-500">SMPTE 24FPS</span>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight tabular-nums flex items-baseline gap-2">
                <span className="text-[#FFE066]">{stats.smpteTimecode}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-400">
                <span>{stats.totalRuntimeSec.toFixed(1)}s cumulative</span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="text-zinc-500">{stats.totalFramesCount.toLocaleString()} frames</span>
              </div>
            </div>

            {/* Metric 2: Shot Count */}
            <div className="p-4 rounded-xl bg-[#12121A] border border-[#232332] relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                  <Film className="w-3.5 h-3.5 text-emerald-400" />
                  SHOT COUNT
                </span>
                <span className="text-[10px] text-emerald-400/80">
                  {stats.completionPercent}% READY
                </span>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight tabular-nums flex items-baseline gap-2">
                <span>{stats.totalShots}</span>
                <span className="text-xs font-normal text-zinc-500">active shots in reel</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1 text-emerald-300">
                  <Video className="w-3 h-3" />
                  {stats.videoCount} video clips
                </span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="flex items-center gap-1 text-zinc-400">
                  <ImageIcon className="w-3 h-3" />
                  {stats.stillCount} still plates
                </span>
              </div>
            </div>

            {/* Metric 3: Average Shot Duration */}
            <div className="p-4 rounded-xl bg-[#12121A] border border-[#232332] relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                  <Timer className="w-3.5 h-3.5 text-cyan-400" />
                  AVERAGE SHOT DURATION
                </span>
                <span className="text-[10px] text-cyan-400">PACING MEAN</span>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight tabular-nums flex items-baseline gap-2">
                <span className="text-cyan-300">{stats.averageDurationSec.toFixed(2)}s</span>
                <span className="text-xs font-normal text-zinc-500">per shot</span>
              </div>
              <div className="mt-1.5 text-[11px] text-zinc-400 flex items-center gap-1.5">
                <span className="text-zinc-300 font-medium">{stats.pacingCadence}</span>
              </div>
              <p className="mt-1 text-[10px] text-zinc-500 leading-relaxed">
                {stats.pacingDescription}
              </p>
            </div>

          </div>

          {/* Range & Pacing Outliers */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#F5A623]" />
              PACING RANGE & OUTLIERS
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              
              {/* Shortest Shot */}
              <button
                type="button"
                onClick={() => {
                  onSelectFrame(stats.shortest.index);
                  onClose();
                }}
                className="p-3 rounded-lg bg-[#14141E] border border-white/10 hover:border-[#F5A623]/60 text-left cursor-pointer transition-all hover:bg-[#181824] group/short"
              >
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Shortest Shot</div>
                <div className="text-sm font-bold text-white mt-0.5 group-hover/short:text-[#FFE066] transition-colors tabular-nums">
                  {stats.shortest.duration.toFixed(1)}s
                </div>
                <div className="text-[10px] text-zinc-400 truncate mt-0.5 flex items-center gap-1">
                  <span>SH{stats.shortest.epNumber}</span>
                  <ChevronRight className="w-2.5 h-2.5 text-zinc-500 group-hover/short:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* Longest Shot */}
              <button
                type="button"
                onClick={() => {
                  onSelectFrame(stats.longest.index);
                  onClose();
                }}
                className="p-3 rounded-lg bg-[#14141E] border border-white/10 hover:border-[#F5A623]/60 text-left cursor-pointer transition-all hover:bg-[#181824] group/long"
              >
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Longest Shot</div>
                <div className="text-sm font-bold text-white mt-0.5 group-hover/long:text-[#FFE066] transition-colors tabular-nums">
                  {stats.longest.duration.toFixed(1)}s
                </div>
                <div className="text-[10px] text-zinc-400 truncate mt-0.5 flex items-center gap-1">
                  <span>SH{stats.longest.epNumber}</span>
                  <ChevronRight className="w-2.5 h-2.5 text-zinc-500 group-hover/long:translate-x-0.5 transition-transform" />
                </div>
              </button>

            </div>
          </div>

          {/* Master Timeline Specs */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#F5A623]" />
              MASTER TIMELINE SPECIFICATIONS
            </h3>

            <div className="p-3.5 rounded-xl bg-[#12121A] border border-[#232332] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Aspect Ratio Framing</span>
                <span className="text-white font-medium">{aspectRatio} Scope</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Cinema Visual Clock</span>
                <span className="text-emerald-300 font-medium">24.000 fps Locked Base</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Audio DSP Master Rate</span>
                <span className="text-cyan-300 font-medium">48,000 Hz / 32-bit Float</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Active Shot Index</span>
                <span className="text-[#FFE066] font-bold">
                  #{String(currentIndex + 1).padStart(3, '0')} of {stats.totalShots}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Shot Sequence Navigator */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#F5A623]" />
                SHOT SEQUENCE BREAKDOWN
              </h3>
              <span className="text-[10px] text-zinc-500">
                {stats.totalShots} CARDS
              </span>
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {frames.map((frame, idx) => {
                const dur = getShotDurationSec(frame, 12.0);
                const isActive = idx === currentIndex;
                const isVideo = Boolean(frame.isVideo || frame.imageUrl?.includes('video'));
                const relativeWidth = stats.longest.duration > 0
                  ? Math.max(8, Math.min(100, (dur / stats.longest.duration) * 100))
                  : 50;

                return (
                  <button
                    key={frame.id || idx}
                    type="button"
                    onClick={() => {
                      onSelectFrame(idx);
                      onClose();
                    }}
                    className={`w-full p-2 rounded-lg text-left text-xs flex items-center justify-between gap-3 cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-[#1C1C28] border-[#F5A623] text-white shadow-sm'
                        : 'bg-[#101016] hover:bg-[#161622] border-white/5 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-bold tabular-nums ${isActive ? 'text-[#F5A623]' : 'text-zinc-500'}`}>
                        SH{frame.epNumber || String(idx + 1).padStart(3, '0')}
                      </span>
                      {isVideo ? (
                        <Video className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <ImageIcon className="w-3 h-3 text-zinc-500 shrink-0" />
                      )}
                      <span className="truncate text-[11px] font-medium">
                        {frame.title || `Shot ${idx + 1}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-12 h-1.5 bg-black/60 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className={`h-full rounded-full ${isActive ? 'bg-[#F5A623]' : 'bg-zinc-600'}`}
                          style={{ width: `${relativeWidth}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold tabular-nums text-zinc-400">
                        {dur.toFixed(1)}s
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#20202C] bg-[#0E0E15] flex items-center justify-between shrink-0">
          <div className="text-[10px] text-zinc-500">
            <span>Locked 24.000fps Engine</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#F5A623] hover:bg-[#D97706] text-black font-bold text-xs rounded-lg cursor-pointer transition-all active:scale-95"
          >
            Done
          </button>
        </div>

      </aside>
    </div>
  );
};
