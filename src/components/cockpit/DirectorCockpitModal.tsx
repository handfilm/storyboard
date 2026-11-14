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
  captureCurrentCanvasFrame, 
  generateCockpitFcpxml, 
  generateCmx3600Edl, 
  generateCapCutQuickPack, 
  triggerFileDownload 
} from '../../services/cockpitBridge';
import { dispatchToExternalApp } from '../../utils/interchangeExport';
import { EditInAppStrip } from '../bridge/EditInAppStrip';
import { launchExternalEdit, ExternalEditApp } from '../../services/editInBridge';
import { CinemaToolHUD, CinemaBadgeHeader } from '../ui/CinemaToolHUD';

interface DirectorCockpitModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeShot: CockpitShotBridge;
  allShots: CockpitShotBridge[];
  audioTrack: { name: string; duration: number; url?: string } | null;
  stageCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onHotReloadShot: (shotIndex: number, newMediaUrl: string) => void;
  fps?: number;
  initialTab?: 'bridges' | 'watcher' | 'interchange';
}

export const DirectorCockpitModal: React.FC<DirectorCockpitModalProps> = ({
  isOpen,
  onClose,
  activeShot,
  allShots,
  audioTrack,
  stageCanvasRef,
  onHotReloadShot,
  fps = 24,
  initialTab = 'bridges'
}) => {
  const [activeTab, setActiveTab] = useState<'bridges' | 'watcher' | 'interchange'>(initialTab);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [watchedFrames, setWatchedFrames] = useState<Record<string | number, { lastModified: number; path: string }>>({
    [activeShot.shotNumber]: {
      lastModified: Date.now(),
      path: `./frames/shot_${String(activeShot.shotNumber).padStart(2, '0')}_master.png`
    }
  });

  if (!isOpen) return null;

  const isTauri = isTauriEnvironment();

  const activeShotIndex = Math.max(
    0,
    allShots.findIndex(
      (s) => s.shotId === activeShot.shotId || String(s.shotNumber) === String(activeShot.shotNumber)
    )
  );

  // Handler for individual tool dispatch (uses zero-prompt /api/edit-in bridge + live watcher)
  const handleDispatch = async (target: CockpitDispatchTarget) => {
    setIsProcessing(true);
    setDispatchStatus(`[ DISPATCHING TO ${target.toUpperCase()}... ]`);

    try {
      if (target === 'photoshop' || target === 'premiere' || target === 'illustrator' || target === 'capcut') {
        await launchExternalEdit({
          app: target as ExternalEditApp,
          shotIndex: activeShotIndex,
          frame: null
        });
        setDispatchStatus(`[ ${target.toUpperCase()} DISPATCHED · LIVE AUTO-SYNC ARMED ]`);
      } else {
        const res = await dispatchToExternalApp({
          appName: target,
          shot: activeShot,
          allShots,
          audioTrack,
          canvas: stageCanvasRef.current,
          fps: fps === 30 ? 30 : 24,
          projectName: 'HANDFILM_DIRECTOR_SEQUENCE'
        });
        setDispatchStatus(res.message);
      }

      setWatchedFrames(prev => ({
        ...prev,
        [activeShot.shotNumber]: {
          lastModified: Date.now(),
          path: `./.handfilm-scratch/shots/shot_${String(activeShotIndex + 1).padStart(2, '0')}`
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
            <CinemaBadgeHeader
              icon={<Zap className="w-4 h-4 text-amber-400" strokeWidth={2.2} />}
              label="COCKPIT BRIDGE"
              accent="amber"
            />
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black uppercase">
              {isTauri ? 'NATIVE' : 'VIRTUAL'}
            </span>
          </div>
          <CinemaToolHUD
            title="CLOSE COCKPIT"
            en="Close the Director Cockpit pipeline bridge modal."
            bn="কীভাবে ব্যবহার করবেন: ককপিট বন্ধ করতে ক্লিক করুন।"
            shortcut="ESC"
            accent="crimson"
            side="left"
          >
            <button
              type="button"
              onClick={onClose}
              className="cinema-tile cinema-tile-crimson min-h-[36px] px-2.5 flex items-center gap-1"
              aria-label="Close Cockpit"
            >
              <X className="w-4 h-4" strokeWidth={2.2} />
              <span className="font-black tracking-wider text-[10px] uppercase">CLOSE</span>
            </button>
          </CinemaToolHUD>
        </div>

        {/* Status / Telemetry Feedback Strip */}
        {dispatchStatus && (
          <div className="bg-[#12120b] border-b border-amber-500/50 px-4 py-2 text-xs flex items-center justify-between animate-in slide-in-from-top-1 text-amber-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-bold tracking-wider">{dispatchStatus}</span>
            </div>
            <span className="text-[10px] font-black text-amber-400 uppercase">ACTIVE</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-black/60 px-4 py-2">
          {[
            { id: 'bridges', label: 'DISPATCH', icon: Zap, accent: 'amber' as const, title: 'EXTERNAL APP DISPATCH', en: 'Send shot assets directly to Photoshop, Premiere, Illustrator, or CapCut.', bn: 'কীভাবে ব্যবহার করবেন: বাইরের অ্যাপে শট পাঠাতে ক্লিক করুন।' },
            { id: 'interchange', label: 'NLE PACKS', icon: Film, accent: 'cyan' as const, title: 'NLE INTERCHANGE & CAPCUT', en: 'Export FCPXML, CMX 3600 EDL, or CapCut ZIP quick-packs.', bn: 'কীভাবে ব্যবহার করবেন: টাইমলাইন প্যাক এক্সপোর্ট করতে ক্লিক করুন।' },
            { id: 'watcher', label: 'WATCHER', icon: RefreshCw, accent: 'emerald' as const, title: 'LIVE ASSET WATCHER', en: 'Monitor modified local shot plates and test hot-reloads.', bn: 'কীভাবে ব্যবহার করবেন: অটো-সিঙ্ক ও হট-রিলোড দেখতে ক্লিক করুন।' },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <CinemaToolHUD key={tab.id} title={tab.title} en={tab.en} bn={tab.bn} accent={tab.accent} side="bottom">
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  data-active={activeTab === tab.id ? 'true' : 'false'}
                  className={`cinema-tile cinema-tile-${tab.accent} min-h-[38px] px-3 py-1.5 flex items-center gap-1.5`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
                  <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">{tab.label}</span>
                </button>
              </CinemaToolHUD>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh] space-y-5">
          {/* TAB 1: EXTERNAL APP DISPATCH */}
          {activeTab === 'bridges' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0d0e15] border border-white/10 rounded-xl flex flex-wrap items-center justify-between gap-2.5">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-black font-black text-xs">
                    SHOT {activeShot.shotNumber}
                  </span>
                  <span>{activeShot.titleEn}</span>
                </div>
                <EditInAppStrip shotIndex={activeShotIndex} variant="drawer" />
              </div>

              {/* 4 Direct Zero-Prompt External App Bridges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { target: 'photoshop' as CockpitDispatchTarget, label: 'PHOTOSHOP', accent: 'cyan' as const, icon: Layers, title: 'OPEN IN PHOTOSHOP', en: 'Write scratch raster plate and launch Adobe Photoshop with live Ctrl+S auto-sync.', bn: 'কীভাবে ব্যবহার করবেন: ফটোশপে পেইন্ট-ওভার করতে ক্লিক করুন।', shortcut: 'Ctrl+Shift+P' },
                  { target: 'premiere' as CockpitDispatchTarget, label: 'PREMIERE PRO', accent: 'cyan' as const, icon: Film, title: 'OPEN IN PREMIERE PRO', en: 'Dispatch active shot directly to Adobe Premiere Pro with file-watcher sync.', bn: 'কীভাবে ব্যবহার করবেন: প্রিমিয়ার প্রোতে পাঠাতে ক্লিক করুন।' },
                  { target: 'illustrator' as CockpitDispatchTarget, label: 'ILLUSTRATOR', accent: 'amber' as const, icon: Sparkles, title: 'OPEN IN ILLUSTRATOR', en: 'Export frame plate for vector title design in Adobe Illustrator.', bn: 'কীভাবে ব্যবহার করবেন: ইলাস্ট্রেটরে টাইটেল বানাতে ক্লিক করুন।' },
                  { target: 'capcut' as CockpitDispatchTarget, label: 'CAPCUT', accent: 'emerald' as const, icon: Zap, title: 'OPEN IN CAPCUT', en: 'Send shot media directly to CapCut Desktop with auto save-watching.', bn: 'কীভাবে ব্যবহার করবেন: ক্যাপকাট ডেস্কটপে খুলতে ক্লিক করুন।' },
                ].map((app) => {
                  const Icon = app.icon;
                  return (
                    <CinemaToolHUD key={app.target} title={app.title} en={app.en} bn={app.bn} shortcut={app.shortcut} accent={app.accent} side="top" blockWrapper>
                      <button
                        type="button"
                        onClick={() => handleDispatch(app.target)}
                        disabled={isProcessing}
                        className={`cinema-tile cinema-tile-${app.accent} w-full min-h-[76px] p-3 flex flex-col items-center justify-center gap-2`}
                      >
                        <Icon className="w-6 h-6" strokeWidth={2.2} />
                        <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">{app.label}</span>
                      </button>
                    </CinemaToolHUD>
                  );
                })}
              </div>

              {/* Instant Frame Capture Button */}
              <CinemaToolHUD
                title="FREEZE STAGE FRAME"
                en="Capture raw stage canvas raster frame directly to ./frames disk folder."
                bn="কীভাবে ব্যবহার করবেন: বর্তমান ফ্রেম PNG হিসেবে সেভ করতে ক্লিক করুন।"
                shortcut="Shift+S"
                accent="amber"
                side="top"
                blockWrapper
              >
                <button
                  type="button"
                  onClick={handleCaptureFrame}
                  className="cinema-tile cinema-tile-amber w-full min-h-[48px] px-4 py-2.5 flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" strokeWidth={2.2} />
                  <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">CAPTURE FRAME</span>
                </button>
              </CinemaToolHUD>
            </div>
          )}

          {/* TAB 2: NLE INTERCHANGE & CAPCUT QUICK-PACK */}
          {activeTab === 'interchange' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CinemaToolHUD
                  title="EXPORT UNIVERSAL FCPXML"
                  en="Compile all shots, synced audio track, and timecode markers into FCPXML v1.9."
                  bn="কীভাবে ব্যবহার করবেন: Premiere বা DaVinci-র জন্য .fcpxml ডাউনলোড করতে চাপুন।"
                  shortcut="Ctrl+Shift+X"
                  accent="emerald"
                  side="top"
                  blockWrapper
                >
                  <button
                    type="button"
                    onClick={handleExportFcpxml}
                    className="cinema-tile cinema-tile-emerald w-full min-h-[64px] p-4 flex items-center justify-center gap-2.5"
                  >
                    <Download className="w-5 h-5" strokeWidth={2.2} />
                    <span className="font-black tracking-wider text-[11px] uppercase">EXPORT FCPXML</span>
                  </button>
                </CinemaToolHUD>

                <CinemaToolHUD
                  title="EXPORT CMX 3600 EDL"
                  en="Generate SMPTE CMX 3600 Edit Decision List for DaVinci Resolve, Avid, and Flame."
                  bn="কীভাবে ব্যবহার করবেন: .edl ফাইল ডাউনলোড করতে ক্লিক করুন।"
                  accent="cyan"
                  side="top"
                  blockWrapper
                >
                  <button
                    type="button"
                    onClick={handleExportEdl}
                    className="cinema-tile cinema-tile-cyan w-full min-h-[64px] p-4 flex items-center justify-center gap-2.5"
                  >
                    <FileText className="w-5 h-5" strokeWidth={2.2} />
                    <span className="font-black tracking-wider text-[11px] uppercase">EXPORT EDL</span>
                  </button>
                </CinemaToolHUD>
              </div>

              <CinemaToolHUD
                title="CAPCUT QUICK-PACK ZIP"
                en="Bundle manifest.json, director cue sheet, bilingual captions, and reference frames into a ZIP."
                bn="কীভাবে ব্যবহার করবেন: ৩ সেকেন্ডে ক্যাপকাট বান্ডেল জিপ ডাউনলোড করতে চাপুন।"
                shortcut="Ctrl+Shift+C"
                accent="amber"
                side="top"
                blockWrapper
              >
                <button
                  type="button"
                  onClick={handleExportCapCutPack}
                  className="cinema-tile cinema-tile-amber w-full min-h-[56px] py-3 px-4 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" strokeWidth={2.2} />
                  <span className="font-black tracking-wider text-[11px] uppercase">CAPCUT BUNDLE</span>
                </button>
              </CinemaToolHUD>
            </div>
          )}

          {/* TAB 3: LIVE ASSET WATCHER */}
          {activeTab === 'watcher' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl border border-emerald-500/40 bg-[#08120d] flex items-center justify-between">
                <CinemaBadgeHeader
                  icon={<RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" strokeWidth={2.2} />}
                  label="ASSET WATCHER"
                  accent="emerald"
                />
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-black uppercase">
                  LIVE SYNC
                </span>
              </div>

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
                      {isWatched ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-black text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>WATCHED</span>
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-[10px] font-bold">IDLE</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <CinemaToolHUD
                title="HOT-RELOAD SHOT PLATE"
                en={`Replace Shot ${activeShot.shotNumber} media file to simulate live disk paint-over reload.`}
                bn="কীভাবে ব্যবহার করবেন: নতুন ছবি বা ভিডিও ফাইল দিয়ে সরাসরি শট আপডেট করতে চাপুন।"
                accent="amber"
                side="top"
                blockWrapper
              >
                <label className="cinema-tile cinema-tile-amber w-full min-h-[48px] px-4 py-2.5 flex items-center justify-center gap-2 cursor-pointer">
                  <RefreshCw className="w-4 h-4" strokeWidth={2.2} />
                  <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">HOT-RELOAD FILE</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleSimulateAssetModification}
                    className="hidden"
                  />
                </label>
              </CinemaToolHUD>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
