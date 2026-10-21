/**
 * @file /src/components/ExportTimelineModal.tsx
 * @description Professional NLE Timeline Export Suite for RAWx Storyboard Studio.
 * Formats:
 * 1. Premiere / CapCut XML (Final Cut Pro 7 XML / xmeml v5 standard)
 * 2. FCPXML (v1.10) for DaVinci Resolve & Final Cut Pro X
 * 
 * Aesthetic: Cinematic Darkroom & Hollywood Director Chassis
 * Runs 100% locally in browser via client-side Blob download.
 */

import React, { useState, useMemo } from 'react';
import { AnthologyProject } from '../types/anthology';
import { 
  generatePremiereCapCutXml, 
  generateFcpXml, 
  downloadXmlBlob, 
  copyXmlToClipboard,
  NleExportOptions 
} from '../services/exportXml';
import { audioEngine } from '../services/audioEngine';
import { SLIDE_DURATION_SEC } from '../types/editor';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Film, 
  Clapperboard, 
  Music, 
  Sliders, 
  CheckCircle2, 
  Layers, 
  Clock, 
  Eye, 
  Sparkles,
  ExternalLink,
  Code
} from 'lucide-react';

interface ExportTimelineModalProps {
  project: AnthologyProject;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportTimelineModal: React.FC<ExportTimelineModalProps> = ({
  project,
  isOpen,
  onClose
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'premiere_capcut' | 'fcpxml'>('premiere_capcut');
  const [fps, setFps] = useState<number>(24);
  const [aspect, setAspect] = useState<'2.39:1' | '16:9' | '9:16' | '1:1'>('2.39:1');
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);
  const [includeMarkers, setIncludeMarkers] = useState<boolean>(true);
  const [useSnapToBeat, setUseSnapToBeat] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showXmlPreview, setShowXmlPreview] = useState<boolean>(false);

  if (!isOpen) return null;

  // Resolution mapping
  const resolution = useMemo(() => {
    switch (aspect) {
      case '2.39:1': return { width: 3840, height: 1608, name: '2.39:1 Cinemascope' };
      case '16:9': return { width: 3840, height: 2160, name: '16:9 UHD 4K' };
      case '9:16': return { width: 2160, height: 3840, name: '9:16 Vertical TikTok' };
      case '1:1': return { width: 2160, height: 2160, name: '1:1 Square' };
      default: return { width: 3840, height: 1608, name: '2.39:1 Cinemascope' };
    }
  }, [aspect]);

  // Beat-quantized durations if enabled
  const customDurations = useMemo(() => {
    if (!useSnapToBeat) return undefined;
    return audioEngine.calculateAutoCutDurations(project.frames.length, SLIDE_DURATION_SEC);
  }, [useSnapToBeat, project.frames.length]);

  const exportOptions: NleExportOptions = {
    fps,
    width: resolution.width,
    height: resolution.height,
    aspectRatioName: aspect,
    includeAudio,
    includeMarkers,
    customDurations,
    projectTitle: project.title,
    directorName: project.director
  };

  const xmlContent = useMemo(() => {
    if (selectedFormat === 'premiere_capcut') {
      return generatePremiereCapCutXml(project, exportOptions);
    } else {
      return generateFcpXml(project, exportOptions);
    }
  }, [selectedFormat, project, exportOptions]);

  const totalShots = project.frames.length;
  const totalDurationSec = customDurations 
    ? customDurations.reduce((a, b) => a + b, 0)
    : totalShots * SLIDE_DURATION_SEC;
  const totalFrames = Math.round(totalDurationSec * fps);

  const formatTimecode = (sec: number) => {
    const totalF = Math.round(sec * fps);
    const ff = String(totalF % fps).padStart(2, '0');
    const ss = String(Math.floor(sec) % 60).padStart(2, '0');
    const mm = String(Math.floor(sec / 60) % 60).padStart(2, '0');
    const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
    return `${hh}:${mm}:${ss}:${ff}`;
  };

  const filename = useMemo(() => {
    const safeTitle = (project.title || 'RAWx_Master').replace(/[^a-zA-Z0-9_-]/g, '_');
    if (selectedFormat === 'premiere_capcut') {
      return `${safeTitle}_CapCut_Premiere.xml`;
    } else {
      return `${safeTitle}_DaVinci_FCP.fcpxml`;
    }
  }, [project.title, selectedFormat]);

  const handleDownload = () => {
    downloadXmlBlob(xmlContent, filename);
  };

  const handleCopy = async () => {
    const success = await copyXmlToClipboard(xmlContent);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#0a0a10] border border-[#272732] rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden font-mono text-zinc-300">
        
        {/* Header Strip */}
        <div className="h-14 px-5 bg-[#0c0c10] border-b border-[#272732] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4af37]/30 to-[#eab308]/10 border border-[#d4af37]/50 flex items-center justify-center text-[#fbbf24] shadow-[0_0_15px_rgba(234,179,8,0.25)]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-cinzel text-sm sm:text-base font-bold text-white tracking-[0.15em] uppercase">
                  NLE Timeline Export Suite
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#181824] border border-[#272732] text-[9px] font-bold text-[#eab308]">
                  v5 / v1.10
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">
                Direct export to Adobe Premiere Pro, CapCut Desktop, DaVinci Resolve & Final Cut Pro
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#101018] hover:bg-[#181824] text-zinc-400 hover:text-white border border-[#272732] cursor-pointer transition-colors"
            title="Close Exporter (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Format Selection Cards */}
          <div>
            <label className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">
              1. Select Target NLE Standard Format
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {/* Option A: Premiere / CapCut XML */}
              <div
                onClick={() => setSelectedFormat('premiere_capcut')}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 ease-out flex flex-col justify-between ${
                  selectedFormat === 'premiere_capcut'
                    ? 'bg-gradient-to-b from-[#14141e] to-[#0c0c14] border-[#d4af37] shadow-[0_0_20px_rgba(234,179,8,0.25)] ring-1 ring-[#eab308]'
                    : 'bg-[#070709] border-[#272732] hover:border-[#d4af37]/50 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#eab308]/15 border border-[#eab308]/40 text-[#fbbf24] text-[9.5px] font-bold">
                      <Clapperboard className="w-3 h-3 text-[#eab308]" />
                      CAPCUT & PREMIERE
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500">FCP7 XML / xmeml</span>
                  </div>

                  <h3 className="font-cinzel text-sm font-bold text-white tracking-wider mb-1">
                    Premiere / CapCut XML (.xml)
                  </h3>
                  <p className="text-[10.5px] text-zinc-400 leading-relaxed mb-3">
                    Standard Final Cut Pro 7 XML specification. Imports seamlessly into <strong className="text-zinc-200">CapCut Desktop</strong> (File &gt; Import &gt; XML) and <strong className="text-zinc-200">Adobe Premiere Pro</strong> with full clip hierarchy, timecodes, and labels.
                  </p>
                </div>

                <div className="pt-2 border-t border-[#272732]/60 flex items-center justify-between text-[9.5px] text-zinc-500">
                  <span>Compatibility: CapCut Desktop, Premiere Pro, Avid</span>
                  <span className="text-[#fbbf24] font-bold">Standard NLE</span>
                </div>
              </div>

              {/* Option B: FCPXML (v1.10) */}
              <div
                onClick={() => setSelectedFormat('fcpxml')}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 ease-out flex flex-col justify-between ${
                  selectedFormat === 'fcpxml'
                    ? 'bg-gradient-to-b from-[#14141e] to-[#0c0c14] border-[#d4af37] shadow-[0_0_20px_rgba(234,179,8,0.25)] ring-1 ring-[#eab308]'
                    : 'bg-[#070709] border-[#272732] hover:border-[#d4af37]/50 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#06b6d4]/15 border border-[#06b6d4]/40 text-[#06b6d4] text-[9.5px] font-bold">
                      <Film className="w-3 h-3 text-[#06b6d4]" />
                      DAVINCI & FINAL CUT PRO
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500">FCPXML v1.10</span>
                  </div>

                  <h3 className="font-cinzel text-sm font-bold text-white tracking-wider mb-1">
                    DaVinci Resolve / FCPX (.fcpxml)
                  </h3>
                  <p className="text-[10.5px] text-zinc-400 leading-relaxed mb-3">
                    Modern Apple FCPXML interchange for <strong className="text-zinc-200">DaVinci Resolve</strong> (File &gt; Import &gt; Timeline &gt; FCPXML) and <strong className="text-zinc-200">Final Cut Pro X</strong> with exact rational fractions, color markers, and spine tags.
                  </p>
                </div>

                <div className="pt-2 border-t border-[#272732]/60 flex items-center justify-between text-[9.5px] text-zinc-500">
                  <span>Compatibility: DaVinci Resolve 18+, Final Cut Pro X</span>
                  <span className="text-[#06b6d4] font-bold">Color Suite</span>
                </div>
              </div>

            </div>
          </div>

          {/* Sequence Telemetry Strip */}
          <div className="p-3.5 bg-[#070709] border border-[#272732] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase block font-bold">Shots</span>
                <span className="text-sm font-bold text-white tabular-nums">{totalShots} Frames</span>
              </div>
              <div className="h-6 w-px bg-[#272732]" />
              <div>
                <span className="text-[9px] text-zinc-500 uppercase block font-bold">Total Duration</span>
                <span className="text-sm font-bold text-[#fbbf24] tabular-nums">{formatTimecode(totalDurationSec)}</span>
              </div>
              <div className="h-6 w-px bg-[#272732]" />
              <div>
                <span className="text-[9px] text-zinc-500 uppercase block font-bold">Timebase / Frames</span>
                <span className="text-sm font-bold text-white tabular-nums">{totalFrames.toLocaleString()} @ {fps}fps</span>
              </div>
              <div className="h-6 w-px bg-[#272732]" />
              <div>
                <span className="text-[9px] text-zinc-500 uppercase block font-bold">Canvas Output</span>
                <span className="text-sm font-bold text-zinc-300">{resolution.width} × {resolution.height}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#101018] border border-[#272732] text-[10px] text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>100% IN-BROWSER OFFLINE GENERATION</span>
            </div>
          </div>

          {/* Configuration Grid */}
          <div>
            <label className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">
              2. Timeline Parameters & Pacing Settings
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* FPS Selector */}
              <div className="p-3 bg-[#070709] border border-[#272732] rounded-xl">
                <span className="text-[9.5px] text-zinc-400 font-bold block mb-1">FRAME RATE (FPS)</span>
                <select
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-full bg-[#0a0a10] border border-[#272732] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#d4af37]"
                >
                  <option value={24}>24.00 fps (Cinema Master)</option>
                  <option value={23.976}>23.976 fps (NTSC Film)</option>
                  <option value={25}>25.00 fps (PAL / Europe)</option>
                  <option value={29.97}>29.97 fps (NTSC Broadcast)</option>
                  <option value={60}>60.00 fps (High Motion)</option>
                </select>
              </div>

              {/* Aspect Ratio Selector */}
              <div className="p-3 bg-[#070709] border border-[#272732] rounded-xl">
                <span className="text-[9.5px] text-zinc-400 font-bold block mb-1">ASPECT / RESOLUTION</span>
                <select
                  value={aspect}
                  onChange={(e) => setAspect(e.target.value as any)}
                  className="w-full bg-[#0a0a10] border border-[#272732] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#d4af37]"
                >
                  <option value="2.39:1">2.39:1 Cinemascope (3840×1608)</option>
                  <option value="16:9">16:9 UHD 4K (3840×2160)</option>
                  <option value="9:16">9:16 Vertical TikTok (2160×3840)</option>
                  <option value="1:1">1:1 Square (2160×2160)</option>
                </select>
              </div>

              {/* Audio & Markers Toggles */}
              <div className="p-3 bg-[#070709] border border-[#272732] rounded-xl flex flex-col justify-between">
                <span className="text-[9.5px] text-zinc-400 font-bold block mb-1">TIMELINE TRACKS</span>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-[10.5px] cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={includeAudio}
                      onChange={(e) => setIncludeAudio(e.target.checked)}
                      className="accent-[#eab308] rounded"
                    />
                    <span>Include Audio Track</span>
                  </label>
                  <label className="flex items-center gap-2 text-[10.5px] cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={includeMarkers}
                      onChange={(e) => setIncludeMarkers(e.target.checked)}
                      className="accent-[#eab308] rounded"
                    />
                    <span>Include Chapter Markers</span>
                  </label>
                </div>
              </div>

              {/* Snap to Beat Toggle */}
              <div className="p-3 bg-[#070709] border border-[#272732] rounded-xl flex flex-col justify-between">
                <span className="text-[9.5px] text-zinc-400 font-bold block mb-1">RHYTHMIC QUANTIZATION</span>
                <button
                  type="button"
                  onClick={() => setUseSnapToBeat(prev => !prev)}
                  className={`w-full py-1.5 px-2 rounded-lg border text-[10.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    useSnapToBeat
                      ? 'bg-[#181824] border-[#d4af37] text-[#fbbf24] shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                      : 'bg-[#0a0a10] border-[#272732] text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Music className={`w-3 h-3 ${useSnapToBeat ? 'text-[#eab308]' : 'text-zinc-600'}`} />
                  <span>{useSnapToBeat ? 'SNAP TO BEAT: ON' : 'SNAP TO BEAT: OFF'}</span>
                </button>
                <span className="text-[8.5px] text-zinc-500 mt-1">
                  {useSnapToBeat ? 'Quantized cuts to musical transients' : 'Fixed 12.0s duration per shot'}
                </span>
              </div>

            </div>
          </div>

          {/* XML Code Preview Toggle & Container */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <button
                type="button"
                onClick={() => setShowXmlPreview(p => !p)}
                className="flex items-center gap-1.5 text-[10.5px] text-zinc-400 hover:text-[#fbbf24] cursor-pointer transition-colors"
              >
                <Code className="w-3.5 h-3.5" />
                <span>{showXmlPreview ? 'Hide Raw XML Code' : 'Preview Generated XML Code'}</span>
              </button>

              <span className="text-[9.5px] text-zinc-500 font-mono">
                {filename} ({Math.round(xmlContent.length / 1024)} KB)
              </span>
            </div>

            {showXmlPreview && (
              <div className="relative max-h-56 overflow-y-auto p-3 bg-black/90 border border-[#272732] rounded-xl text-[10px] font-mono leading-relaxed text-zinc-400">
                <pre className="whitespace-pre-wrap">{xmlContent.slice(0, 3000)}</pre>
                {xmlContent.length > 3000 && (
                  <div className="sticky bottom-0 left-0 right-0 py-1 bg-gradient-to-t from-black to-transparent text-center text-[9px] text-zinc-500">
                    ... + {xmlContent.length - 3000} more characters truncated for preview
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="h-16 px-5 bg-[#0c0c10] border-t border-[#272732] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[10.5px] text-zinc-400">
            <span className="text-zinc-500">Target File:</span>
            <span className="text-[#fbbf24] font-bold">{filename}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy to Clipboard */}
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-[#101018] hover:bg-[#181824] border border-[#272732] text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors active:scale-[0.98]"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy XML</span>
                </>
              )}
            </button>

            {/* Main Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#eab308] to-[#fbbf24] hover:brightness-110 text-black font-black text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4 fill-current" />
              <span>Download {selectedFormat === 'premiere_capcut' ? 'Premiere / CapCut XML' : 'FCPXML'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
