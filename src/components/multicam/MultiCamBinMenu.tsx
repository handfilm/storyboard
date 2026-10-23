/**
 * @file /src/components/multicam/MultiCamBinMenu.tsx
 * @description Multi-Camera Grouping Configuration & Audio Synchronization Modal.
 * 
 * Capabilities:
 * 1. Angle Reordering & Labeling: Rename angles ("CAM 01 Wide", "CAM 02 Close-up"), rearrange angle order.
 * 2. Master Audio Designation: Pick the authoritative studio audio reference angle.
 * 3. 1-Click Audio Waveform Correlation: Analyzes audio buffers via multiCamSyncEngine with live progress.
 * 4. Micro-Waveform Visualization: Visual representation of sound energy peaks with sub-frame timecode offsets.
 * 5. Manual Microsecond Sliders: Fine-tune offset (±5000ms) with millisecond accuracy.
 * 6. Target Aspect Ratio: 9:16 Shorts (default), 16:9 Widescreen, 1:1 Square.
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Video, 
  Volume2, 
  Sparkles, 
  Sliders, 
  Clock, 
  Check, 
  ArrowUpDown, 
  AlertCircle,
  Play,
  RotateCcw,
  CheckCircle2,
  Radio
} from 'lucide-react';
import { VaultMediaItem, db } from '../../services/db';
import { MultiCamAngle, MultiCamGroup } from '../../types/multicam';
import { multiCamSyncEngine, SyncAnalysisResult } from '../../services/multiCamSyncEngine';

interface MultiCamBinMenuProps {
  isOpen: boolean;
  selectedItems: VaultMediaItem[];
  onClose: () => void;
  onCreateGroup: (group: MultiCamGroup) => void;
}

export const MultiCamBinMenu: React.FC<MultiCamBinMenuProps> = ({
  isOpen,
  selectedItems,
  onClose,
  onCreateGroup
}) => {
  const [groupName, setGroupName] = useState('Shorts Multi-Cam Session');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [angles, setAngles] = useState<MultiCamAngle[]>([]);
  const [masterAudioIdx, setMasterAudioIdx] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [syncResults, setSyncResults] = useState<Record<string, SyncAnalysisResult>>({});
  const [previewAngleId, setPreviewAngleId] = useState<string | null>(null);

  // Initialize angles whenever selected items change
  useEffect(() => {
    if (!isOpen || selectedItems.length === 0) return;

    const initialAngles: MultiCamAngle[] = selectedItems.map((item, index) => {
      const activeUrl = db.getActiveMediaUrl(item.id, item.blob);
      return {
        id: `angle-${item.id}-${Date.now()}-${index}`,
        mediaId: item.id,
        label: `CAM 0${index + 1}`,
        name: item.name,
        blobUrl: activeUrl,
        aspectRatio: item.resolution?.includes('x') ? 16 / 9 : (item.resolution === '4K' ? 16 / 9 : 16 / 9),
        syncOffsetMs: 0,
        volume: 1.0,
        isMuted: false
      };
    });

    setAngles(initialAngles);
    setMasterAudioIdx(0);
    setSyncResults({});
    setGroupName(`Multi-Cam ${selectedItems.length} Angles`);
  }, [isOpen, selectedItems]);

  if (!isOpen) return null;

  // Maximum duration across all selected clips
  const maxDurationSec = Math.max(
    ...selectedItems.map(it => it.duration || 15),
    12
  );

  // Reorder angles
  const moveAngle = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= angles.length) return;
    const next = [...angles];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    setAngles(next);
    if (masterAudioIdx === index) {
      setMasterAudioIdx(target);
    } else if (masterAudioIdx === target) {
      setMasterAudioIdx(index);
    }
  };

  // Run automatic audio waveform correlation
  const handleRunAutoSync = async () => {
    if (angles.length < 2) return;
    setIsAnalyzing(true);
    setSyncStatus('Extracting & correlating audio channels across angles...');

    try {
      const { updatedAngles, results } = await multiCamSyncEngine.autoSyncAngles(
        angles,
        masterAudioIdx,
        (_idx, _total, status) => setSyncStatus(status)
      );

      setAngles(updatedAngles);
      const resultMap: Record<string, SyncAnalysisResult> = {};
      results.forEach(r => {
        resultMap[r.angleId] = r;
      });
      setSyncResults(resultMap);
      setSyncStatus('Auto-sync complete! Offsets aligned with master audio track.');
    } catch (err) {
      console.warn('[MultiCamBinMenu] Auto-sync failed:', err);
      setSyncStatus('Auto-sync could not correlate audio. You can adjust offsets manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Commit and create group
  const handleCommitGroup = () => {
    if (angles.length === 0) return;

    const group: MultiCamGroup = {
      id: `group-multicam-${Date.now()}`,
      name: groupName.trim() || 'Multi-Cam Clip',
      angles: angles,
      duration: maxDurationSec,
      durationMs: Math.round(maxDurationSec * 1000),
      masterAudioAngleIndex: masterAudioIdx,
      activeAngleIndex: 0,
      cutEvents: [
        { id: `cut-0`, timeMs: 0, angleIndex: 0 }
      ],
      aspectRatio: aspectRatio,
      createdAt: new Date().toISOString()
    };

    onCreateGroup(group);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0C0D12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#08090C]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#F5A623]">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Create Multi-Camera Group</h2>
              <p className="text-xs text-neutral-400">
                {angles.length} camera angles selected · Align audio tracks & launch live switcher
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Options Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="w-full px-3 py-2 bg-[#12131A] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/60"
                placeholder="e.g. Podcast Interview Ep. 4"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Primary Output Format
              </label>
              <div className="flex items-center gap-2 p-1 bg-[#12131A] border border-white/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                    aspectRatio === '9:16'
                      ? 'bg-amber-500 text-black font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  9:16 Shorts (Vertical)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                    aspectRatio === '16:9'
                      ? 'bg-amber-500 text-black font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  16:9 Widescreen
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('1:1')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                    aspectRatio === '1:1'
                      ? 'bg-amber-500 text-black font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  1:1 Square
                </button>
              </div>
            </div>
          </div>

          {/* Auto-Sync Action Bar */}
          <div className="p-4 bg-[#12131A] border border-white/10 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-[#F5A623]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-white">Automated Audio Waveform Alignment</div>
                <div className="text-[11px] text-neutral-400">
                  Correlates ambient acoustic peaks to automatically align all cameras to CAM 0{masterAudioIdx + 1}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isAnalyzing}
              onClick={handleRunAutoSync}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Analyzing Waveforms...' : '⚡ Auto-Sync via Audio Waveforms'}
            </button>
          </div>

          {syncStatus && (
            <div className="px-3.5 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{syncStatus}</span>
            </div>
          )}

          {/* Angles Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
              <span>CAMERA ANGLES ({angles.length})</span>
              <span>MASTER AUDIO & OFFSET CALIBRATION</span>
            </div>

            {angles.map((angle, idx) => {
              const item = selectedItems.find(it => it.id === angle.mediaId);
              const result = syncResults[angle.id];
              const isMaster = masterAudioIdx === idx;

              return (
                <div
                  key={angle.id}
                  className={`p-3.5 bg-[#0F1017] border rounded-xl transition-all ${
                    isMaster 
                      ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,166,35,0.06)]' 
                      : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {/* Left: Thumbnail & Angle Info */}
                    <div className="flex items-center gap-3 min-w-[240px]">
                      {/* Move controls */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveAngle(idx, 'up')}
                          className="w-5 h-4 flex items-center justify-center text-neutral-500 hover:text-white disabled:opacity-20 text-[10px]"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === angles.length - 1}
                          onClick={() => moveAngle(idx, 'down')}
                          className="w-5 h-4 flex items-center justify-center text-neutral-500 hover:text-white disabled:opacity-20 text-[10px]"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Video Thumbnail */}
                      <div className="relative w-16 h-11 bg-neutral-900 rounded-lg overflow-hidden border border-white/10 shrink-0">
                        {item?.thumbnailUrl ? (
                          <img 
                            src={item.thumbnailUrl} 
                            alt={angle.label} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-600">
                            <Video className="w-4 h-4" />
                          </div>
                        )}
                        <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-black/80 rounded text-[9px] font-mono text-neutral-300">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Angle Labels */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={angle.label}
                            onChange={e => {
                              const updated = [...angles];
                              updated[idx].label = e.target.value;
                              setAngles(updated);
                            }}
                            className="bg-transparent text-sm font-semibold text-white hover:bg-white/5 px-1 py-0.5 rounded focus:outline-none focus:bg-[#1A1B24] border-b border-transparent focus:border-amber-500/50 w-24"
                          />
                          {isMaster && (
                            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                              MASTER AUDIO
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-400 truncate max-w-[200px]" title={angle.name}>
                          {angle.name || `Clip ${idx + 1}`}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Waveform Bar Indicator */}
                    <div className="flex-1 w-full md:w-auto px-2">
                      <div className="h-6 w-full bg-[#08090C] rounded-md flex items-center gap-[1px] px-1 overflow-hidden border border-white/5">
                        {(result?.waveformPeaks || new Array(40).fill(0.15)).slice(0, 40).map((peak, pIdx) => (
                          <div
                            key={pIdx}
                            className={`w-full rounded-sm transition-all ${
                              isMaster ? 'bg-amber-500/80' : 'bg-neutral-600'
                            }`}
                            style={{ height: `${Math.max(10, Math.min(100, peak * 100))}%` }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Right: Master Audio Selector & Offset Slider */}
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Master Audio Radio */}
                      <button
                        type="button"
                        onClick={() => setMasterAudioIdx(idx)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                          isMaster
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                            : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white'
                        }`}
                        title="Designate as master audio soundtrack"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium">{isMaster ? 'Elected Mic' : 'Set Mic'}</span>
                      </button>

                      {/* Offset fine-tuner */}
                      <div className="flex items-center gap-2">
                        <div className="text-[11px] font-mono text-neutral-400 w-16 text-right tabular-nums">
                          {angle.syncOffsetMs > 0 ? `+${angle.syncOffsetMs}` : angle.syncOffsetMs} ms
                        </div>
                        <input
                          type="range"
                          min={-5000}
                          max={5000}
                          step={10}
                          value={angle.syncOffsetMs}
                          onChange={e => {
                            const updated = [...angles];
                            updated[idx].syncOffsetMs = parseInt(e.target.value, 10);
                            setAngles(updated);
                          }}
                          className="w-24 accent-amber-500 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...angles];
                            updated[idx].syncOffsetMs = 0;
                            setAngles(updated);
                          }}
                          className="text-[10px] text-neutral-500 hover:text-neutral-300 p-1"
                          title="Reset offset to 0"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#08090C] flex items-center justify-between">
          <div className="text-xs text-neutral-400">
            Playback duration: <span className="font-mono text-white tabular-nums">{maxDurationSec.toFixed(1)}s</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommitGroup}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Launch Multi-Cam Studio ({angles.length} Cameras)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
