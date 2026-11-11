/**
 * @file /src/components/cockpit/DirectorCockpitModal.tsx
 * @description The Director's Cockpit — External Pipeline Bridges & Ecosystem Hub Modal.
 */

import React, { useState } from 'react';
import { 
  Sliders, 
  ExternalLink, 
  Film, 
  Camera, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  Music, 
  FileText, 
  X,
  Sparkles,
  Zap
} from 'lucide-react';
import { CockpitShotBridge, CockpitDispatchTarget } from '../../types/cockpit';
import { 
  isTauriEnvironment, 
  dispatchToExternalTool, 
  captureCurrentCanvasFrame, 
  generateCockpitFcpxml, 
  generateCmx3600Edl, 
  generateCapCutQuickPack, 
  triggerFileDownload 
} from '../../services/cockpitBridge';

interface DirectorCockpitModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeShot: CockpitShotBridge;
  allShots: CockpitShotBridge[];
  audioTrack: { name: string; duration: number; url?: string } | null;
  stageCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onHotReloadShot: (shotIndex: number, newMediaUrl: string) => void;
  fps?: number;
}

export const DirectorCockpitModal: React.FC<DirectorCockpitModalProps> = ({
  isOpen,
  onClose,
  activeShot,
  allShots,
  audioTrack,
  stageCanvasRef,
  onHotReloadShot,
  fps = 24
}) => {
  const [activeTab, setActiveTab] = useState<'bridges' | 'watcher' | 'interchange'>('bridges');
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [watchedFrames, setWatchedFrames] = useState<Record<string | number, { lastModified: number; path: string }>>({
    [activeShot.shotNumber]: {
      lastModified: Date.now(),
      path: `./frames/shot_${String(activeShot.shotNumber).padStart(2, '0')}_master.png`
    }
  });

  if (!isOpen) return null;

  const isTauri = isTauriEnvironment();

  // Handler for individual tool dispatch
  const handleDispatch = async (target: CockpitDispatchTarget) => {
    setIsProcessing(true);
    setDispatchStatus(`[ DISPATCHING TO ${target.toUpperCase()}... ]`);

    try {
      // 1. Freeze current canvas frame if available
      let framePath: string | undefined;
      if (stageCanvasRef.current) {
        const capture = await captureCurrentCanvasFrame(
          stageCanvasRef.current,
          activeShot.shotNumber,
          activeShot.titleEn
        );
        framePath = capture.filePath;
      }

      // 2. Dispatch via native Tauri IPC or browser pipeline
      const res = await dispatchToExternalTool(target, activeShot, framePath);
      setDispatchStatus(res.message);
      
      // Update watched frames list
      setWatchedFrames(prev => ({
        ...prev,
        [activeShot.shotNumber]: {
          lastModified: Date.now(),
          path: framePath || `./frames/shot_${String(activeShot.shotNumber).padStart(2, '0')}_master.png`
        }
      }));
    } catch (err: any) {
      setDispatchStatus(`[ ERROR ]: ${err?.message || 'Dispatch failed'}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setDispatchStatus(null), 5000);
    }
  };

  // Handler for Universal FCPXML Export
  const handleExportFcpxml = () => {
    setIsProcessing(true);
    try {
      const xml = generateCockpitFcpxml(allShots, audioTrack, fps, 'HANDFILM_DIRECTOR_SEQUENCE');
      triggerFileDownload(xml, `HANDFILM_TIMELINE_${Date.now()}.fcpxml`, 'application/xml');
      setDispatchStatus('[ FCPXML v1.9 EXPORTED // READY FOR PREMIERE & DAVINCI ]');
    } catch (err: any) {
      setDispatchStatus(`[ XML ERROR ]: ${err?.message}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setDispatchStatus(null), 4000);
    }
  };

  // Handler for Universal CMX 3600 EDL Export
  const handleExportEdl = () => {
    setIsProcessing(true);
    try {
      const edl = generateCmx3600Edl(allShots, audioTrack, fps, 'HANDFILM_DIRECTOR_SEQUENCE');
      triggerFileDownload(edl, `HANDFILM_TIMELINE_${Date.now()}.edl`, 'text/plain');
      setDispatchStatus('[ CMX 3600 EDL EXPORTED // HOLLYWOOD COMPATIBLE ]');
    } catch (err: any) {
      setDispatchStatus(`[ EDL ERROR ]: ${err?.message}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setDispatchStatus(null), 4000);
    }
  };

  // Handler for CapCut Quick-Pack Zip Bundle
  const handleExportCapCutPack = async () => {
    setIsProcessing(true);
    setDispatchStatus('[ COMPILING CAPCUT QUICK-PACK BUNDLE... ]');
    try {
      const zipBlob = await generateCapCutQuickPack(
        allShots,
        audioTrack,
        stageCanvasRef.current,
        'HANDFILM_REEL'
      );
      triggerFileDownload(zipBlob, `HANDFILM_CapCut_Bundle_${Date.now()}.zip`, 'application/zip');
      setDispatchStatus('[ CAPCUT QUICK-PACK EXPORTED // INGEST READY ]');
    } catch (err: any) {
      setDispatchStatus(`[ PACK ERROR ]: ${err?.message}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setDispatchStatus(null), 4000);
    }
  };

  // Handler for Live Frame Freeze
  const handleCaptureFrame = async () => {
    if (!stageCanvasRef.current) return;
    setIsProcessing(true);
    try {
      const capture = await captureCurrentCanvasFrame(
        stageCanvasRef.current,
        activeShot.shotNumber,
        activeShot.titleEn
      );
      setWatchedFrames(prev => ({
        ...prev,
        [activeShot.shotNumber]: {
          lastModified: Date.now(),
          path: capture.filePath
        }
      }));
      setDispatchStatus(`[ FRAME SAVED // ${capture.filePath} ]`);
    } catch (err: any) {
      setDispatchStatus(`[ CAPTURE FAILED ]: ${err?.message}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setDispatchStatus(null), 4000);
    }
  };

  // Hot-Reload Simulator: user drops or picks a revised image
  const handleSimulateAssetModification = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newUrl = URL.createObjectURL(file);
      const shotIdx = typeof activeShot.shotNumber === 'number' 
        ? activeShot.shotNumber - 1 
        : parseInt(String(activeShot.shotNumber), 10) - 1;
      onHotReloadShot(Number.isNaN(shotIdx) ? 0 : shotIdx, newUrl);
      setWatchedFrames(prev => ({
        ...prev,
        [activeShot.shotNumber]: {
          lastModified: Date.now(),
          path: file.name
        }
      }));
      setDispatchStatus(`[ HOT-RELOAD DETECTED // SHOT ${activeShot.shotNumber} REPAINTED ]`);
      setTimeout(() => setDispatchStatus(null), 4000);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#090a0f] border border-amber-500/40 rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col font-mono text-zinc-300">
        
        {/* Header Bar */}
        <div className="h-12 px-4 border-b border-white/10 bg-[#0d0e16] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]" />
            <h2 className="text-xs sm:text-sm font-black tracking-widest text-white uppercase">
              THE DIRECTOR'S COCKPIT // EXTERNAL PIPELINE BRIDGES
            </h2>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
              {isTauri ? 'TAURI NLE SILICON' : 'BROWSER VIRTUAL BRIDGE'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status / Telemetry Feedback Strip */}
        {dispatchStatus && (
          <div className="bg-[#12120b] border-b border-amber-500/50 px-4 py-2 text-xs flex items-center justify-between animate-in slide-in-from-top-1 text-amber-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-bold tracking-wider">{dispatchStatus}</span>
            </div>
            <span className="text-[10px] text-zinc-400">// PIPELINE DISPATCH ACTIVE</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-white/10 bg-black/60 px-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('bridges')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'bridges'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>EXTERNAL DISPATCH DOCK</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('interchange')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'interchange'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>NLE INTERCHANGE & CAPCUT</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('watcher')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'watcher'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>LIVE ASSET WATCHER</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh] space-y-5">
          
          {/* TAB 1: EXTERNAL APP DISPATCH */}
          {activeTab === 'bridges' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0d0e15] border border-white/10 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">ACTIVE TARGET SHOT</span>
                  <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                    <span className="px-1.5 py-0.2 rounded bg-amber-500 text-black font-black text-xs">
                      SHOT {activeShot.shotNumber}
                    </span>
                    <span>{activeShot.titleEn}</span>
                    <span className="text-zinc-500 text-xs font-bangla">// {activeShot.titleBn}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 uppercase">STYLE</span>
                  <div className="text-xs font-bold text-amber-400">{activeShot.personality}</div>
                </div>
              </div>

              {/* 3 Main Tactical External Bridges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Photoshop */}
                <div className="p-3.5 rounded-xl border border-sky-500/30 bg-[#09111c] hover:border-sky-400 transition-all flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40">
                        PHOTOSHOP
                      </span>
                      <span className="text-[9px] text-zinc-500">HOTKEY: Ctrl+Shift+P</span>
                    </div>
                    <h3 className="text-xs font-bold text-white tracking-wide">[ PS // PAINT-OVER ]</h3>
                    <p className="text-[10.5px] text-zinc-400 mt-1 leading-relaxed">
                      Freezes active frame buffer to <code className="text-sky-300">shot_{String(activeShot.shotNumber).padStart(2, '0')}_master.png</code> and launches Photoshop with exact 4K plate.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDispatch('photoshop')}
                    disabled={isProcessing}
                    className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-black text-xs tracking-wider flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>LAUNCH PHOTOSHOP</span>
                  </button>
                </div>

                {/* 2. Premiere Pro */}
                <div className="p-3.5 rounded-xl border border-purple-500/30 bg-[#120a1c] hover:border-purple-400 transition-all flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/40">
                        PREMIERE PRO
                      </span>
                      <span className="text-[9px] text-zinc-500">NLE SYNC</span>
                    </div>
                    <h3 className="text-xs font-bold text-white tracking-wide">[ PR // TIMELINE ]</h3>
                    <p className="text-[10.5px] text-zinc-400 mt-1 leading-relaxed">
                      Generates XML marker timeline and opens Adobe Premiere Pro with exact in/out cut boundaries.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDispatch('premiere')}
                    disabled={isProcessing}
                    className="w-full py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-black font-black text-xs tracking-wider flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>LAUNCH PREMIERE</span>
                  </button>
                </div>

                {/* 3. CapCut */}
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-[#140e06] hover:border-amber-400 transition-all flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        CAPCUT DESKTOP
                      </span>
                      <span className="text-[9px] text-zinc-500">REEL PACK</span>
                    </div>
                    <h3 className="text-xs font-bold text-white tracking-wide">[ CC // REEL PACK ]</h3>
                    <p className="text-[10.5px] text-zinc-400 mt-1 leading-relaxed">
                      Bundles pre-trimmed clip, audio cue markers, and kinetic caption manifest for immediate CapCut template drop.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDispatch('capcut')}
                    disabled={isProcessing}
                    className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs tracking-wider flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>DISPATCH CAPCUT</span>
                  </button>
                </div>
              </div>

              {/* Instant Frame Capture Button */}
              <div className="p-3 bg-neutral-900/80 border border-neutral-700 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Instant Frame Freeze to Disk</div>
                    <div className="text-[10px] text-zinc-400">Captures raw stage canvas at full raster scope to ./frames</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCaptureFrame}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>[ 📸 CAPTURE FRAME ]</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: NLE INTERCHANGE & CAPCUT QUICK-PACK */}
          {activeTab === 'interchange' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* FCPXML v1.9 Exporter */}
                <div className="p-4 rounded-xl border border-white/15 bg-[#0b0c12] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">UNIVERSAL FCPXML (v1.9)</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                      PREMIERE / DAVINCI
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Compiles the entire 14-shot sequence with exact in/out clip frames, master audio floor synchronized to 00:00:00, and dynamic title markers.
                  </p>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    Total Runtime: {allShots.reduce((a, s) => a + (s.outPoint - s.inPoint), 0).toFixed(1)}s • 24.0 FPS
                  </div>
                  <button
                    type="button"
                    onClick={handleExportFcpxml}
                    className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-white/20 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>EXPORT FCPXML SEQUENCE</span>
                  </button>
                </div>

                {/* CMX 3600 EDL Exporter */}
                <div className="p-4 rounded-xl border border-white/15 bg-[#0b0c12] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">CMX 3600 EDL</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                      HOLLYWOOD STANDARD
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Generates clean, battle-tested SMPTE CMX 3600 Edit Decision List for professional conform in DaVinci Resolve, Avid Media Composer, or Flame.
                  </p>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    14 Events • 00:00:00:00 Start Timecode
                  </div>
                  <button
                    type="button"
                    onClick={handleExportEdl}
                    className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-white/20 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>EXPORT CMX 3600 EDL</span>
                  </button>
                </div>
              </div>

              {/* CapCut Full Bundle Box */}
              <div className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-br from-[#120e06] via-[#090a0f] to-[#090a0f] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">CAPCUT QUICK-PACK BUNDLE (ZIP)</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black">
                    HOTKEY: Ctrl+Shift+C
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Creates a high-velocity ZIP bundle containing: numerically pre-sorted assets, background music bed, and a formatted <code className="text-amber-300">captions_and_beats.txt</code> manifest with exact Bangla/English kinetic text and beat markers.
                </p>
                <button
                  type="button"
                  onClick={handleExportCapCutPack}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>[ ⚡ EXPORT CAPCUT BUNDLE IN 3 SECONDS ]</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE ASSET WATCHER */}
          {activeTab === 'watcher' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-[#08120d] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <div>
                    <div className="text-xs font-bold text-white uppercase">Automated Asset Watcher Active</div>
                    <div className="text-[10px] text-emerald-300 font-mono">
                      Monitoring directory: <code className="bg-black/50 px-1 py-0.5 rounded">./frames/shot_*.png</code>
                    </div>
                  </div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                  LIVE SYNC
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-zinc-300 uppercase">Watched Shot Frames</div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {allShots.map((s) => {
                    const isWatched = Boolean(watchedFrames[s.shotNumber]);
                    return (
                      <div
                        key={s.shotNumber}
                        className="p-2 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 font-bold text-[10px]">
                            SH {s.shotNumber}
                          </span>
                          <span className="text-white font-medium">{s.titleEn}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-zinc-500">shot_{String(s.shotNumber).padStart(2, '0')}_master.png</span>
                          {isWatched ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>WATCHED</span>
                            </span>
                          ) : (
                            <span className="text-zinc-600">IDLE</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hot-Reload Asset Modification Simulation Drop / Input */}
              <div className="p-3.5 border border-dashed border-zinc-700 hover:border-amber-400 rounded-xl bg-black/40 text-center space-y-2 transition-colors">
                <div className="text-xs font-bold text-zinc-300">Test External Editor Paint-Over / Hot-Reload</div>
                <p className="text-[10.5px] text-zinc-500 max-w-md mx-auto">
                  Select or drop a modified PNG/plate to instantly invalidate Shot {activeShot.shotNumber}'s thumbnail cache and repaint the master stage canvas in real-time.
                </p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs cursor-pointer border border-white/20 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>HOT-RELOAD FRAME FILE</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleSimulateAssetModification}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Keyboard Accelerators Bar */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-500 font-mono">
            <span>SHORTCUTS:</span>
            <div className="flex items-center gap-3">
              <span><kbd className="px-1 py-0.5 rounded bg-white/10 text-zinc-300">Ctrl</kbd>+<kbd className="px-1 py-0.5 rounded bg-white/10 text-zinc-300">Shift</kbd>+<kbd className="px-1 py-0.5 rounded bg-white/10 text-zinc-300">P</kbd> Photoshop</span>
              <span><kbd className="px-1 py-0.5 rounded bg-white/10 text-zinc-300">Ctrl</kbd>+<kbd className="px-1 py-0.5 rounded bg-white/10 text-zinc-300">X</kbd> NLE XML</span>
              <span><kbd className="px-1 py-0.5 rounded bg-white/10 text-zinc-300">Ctrl</kbd>+<kbd className="px-1 py-0.5 rounded bg-white/10 text-zinc-300">C</kbd> CapCut Pack</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
