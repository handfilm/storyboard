/**
 * @file /src/components/modules/ModularTelemetryRack.tsx
 * @description Master Brutalist Hardware Telemetry Rack for Handfilm Studio.
 * 
 * Houses the 3 Advanced Browser-Native Pipelines:
 * 1. [ AUDIO SYNC ]: Real-time beat detector, multi-band frequency scopes, sensitivity & visual links.
 * 2. [ VOICE & SUB ]: Zero-cloud mic capture, in-browser Bengali/English speech recognition, kinetic caption sync.
 * 3. [ GRADE & LUT ]: Hardware WebGL2 3D LUT engine, .cube parser drag-drop, procedural film grain & grading sliders.
 * 
 * Aesthetic: Dark brutalist hardware console styling with high-density monospace telemetry.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Activity,
  Mic,
  MicOff,
  Sliders,
  Sparkles,
  Layers,
  Zap,
  Volume2,
  Upload,
  RefreshCw,
  Eye,
  EyeOff,
  Film,
  Type,
  ChevronDown,
  ChevronUp,
  X,
  Play,
  Square,
  Check,
  Disc,
  Radio,
  SlidersHorizontal,
  Flame
} from 'lucide-react';
import { useStudioReactivePipelines } from '../../hooks/useStudioReactivePipelines';
import { AnthologyFrame, CaptionStyle } from '../../types/anthology';
import { BuiltinLutId } from '../../services/colorGradingEngine';

export interface ModularTelemetryRackProps {
  currentFrame?: AnthologyFrame;
  slideTimeSec?: number;
  durationSec?: number;
  onUpdateFrame?: (updated: AnthologyFrame) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  className?: string;
}

type ActiveRackTab = 'AUDIO' | 'VOICE' | 'GRADE';

const BUILTIN_LUTS: { id: BuiltinLutId; label: string; code: string; color: string }[] = [
  { id: 'kodak_2383', label: 'Kodak 2383 Print', code: 'KODAK 2383', color: '#f5a623' },
  { id: 'teal_orange', label: 'Teal & Orange', code: 'BLOCKBUSTER', color: '#2dd4bf' },
  { id: 'fuji_eterna', label: 'Fuji Eterna 500T', code: 'ETERNA 500', color: '#34d399' },
  { id: 'bleach_bypass', label: 'Bleach Bypass', code: 'BLEACH 5285', color: '#fb7185' },
  { id: 'dhaka_gold', label: 'Dhaka Gold Vintage', code: 'DHAKA 1971', color: '#fbbf24' },
  { id: 'mono_tri_x', label: 'Mono Tri-X 400', code: 'TRI-X 400', color: '#e2e8f0' }
];

export const ModularTelemetryRack: React.FC<ModularTelemetryRackProps> = ({
  currentFrame,
  slideTimeSec = 0,
  durationSec = 5.0,
  onUpdateFrame,
  isOpen = true,
  onToggleOpen,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<ActiveRackTab>('AUDIO');
  const [selectedCaptionStyle, setSelectedCaptionStyle] = useState<CaptionStyle>('rap_pop');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lutDropActive, setLutDropActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    energy,
    beat,
    visualTransforms,
    audioConfig,
    updateAudioConfig,
    voiceState,
    startVoiceRecording,
    stopVoiceRecording,
    setVoiceLanguage,
    createKineticCaption,
    colorParams,
    updateColorParams,
    loadCustomLutFile
  } = useStudioReactivePipelines();

  // Voiceover record toggle
  const handleToggleRecord = useCallback(async () => {
    if (voiceState.isRecording) {
      try {
        const shotIdx = currentFrame?.id ? currentFrame.id - 1 : 0;
        const clip = await stopVoiceRecording(shotIdx, slideTimeSec);

        // Auto-assign to current frame if requested
        if (onUpdateFrame && currentFrame && clip.transcript) {
          const caption = createKineticCaption(
            clip.transcript,
            durationSec,
            selectedCaptionStyle,
            clip.language === 'bn-BD' ? clip.transcript : undefined
          );
          onUpdateFrame({
            ...currentFrame,
            caption
          });
        }
      } catch (err) {
        console.warn('[TelemetryRack] Stop recording error:', err);
      }
    } else {
      try {
        const shotIdx = currentFrame?.id ? currentFrame.id - 1 : 0;
        await startVoiceRecording(shotIdx, slideTimeSec);
      } catch (err) {
        console.warn('[TelemetryRack] Start recording error:', err);
      }
    }
  }, [voiceState.isRecording, currentFrame, slideTimeSec, durationSec, selectedCaptionStyle, stopVoiceRecording, onUpdateFrame, createKineticCaption, startVoiceRecording]);

  // Sync transcription to frame caption
  const handleSyncToFrame = useCallback(() => {
    if (!currentFrame || !onUpdateFrame) return;
    const textToSync = voiceState.currentTranscript || currentFrame.tagline || currentFrame.title;
    if (!textToSync) return;

    const caption = createKineticCaption(
      textToSync,
      durationSec,
      selectedCaptionStyle,
      voiceState.activeLanguage === 'bn-BD' ? textToSync : undefined
    );

    onUpdateFrame({
      ...currentFrame,
      caption
    });
  }, [currentFrame, onUpdateFrame, voiceState.currentTranscript, voiceState.activeLanguage, durationSec, selectedCaptionStyle, createKineticCaption]);

  // Handle .cube file drop
  const handleDropCube = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setLutDropActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.cube')) {
        await loadCustomLutFile(file);
      }
    }
  }, [loadCustomLutFile]);

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await loadCustomLutFile(file);
    }
  }, [loadCustomLutFile]);

  if (!isOpen) return null;

  return (
    <div
      className={`bg-[#08080E]/95 border border-[#1f1f2e] text-zinc-300 font-mono shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-all duration-200 select-none ${className}`}
    >
      {/* Brutalist Hardware Header / Tab Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f1f2e] bg-[#0c0c16]">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-2 pr-3 border-r border-zinc-800">
            <Activity className="w-3.5 h-3.5 text-[#f5a623]" />
            <span className="text-[11px] font-bold tracking-widest text-zinc-100 uppercase">
              MODULAR TELEMETRY RACK
            </span>
            <span className="text-[9px] text-[#2dd4bf] bg-[#2dd4bf]/10 px-1.5 py-0.5 rounded font-mono">
              LOCAL SILICON
            </span>
          </div>

          {/* Module Selector Tabs */}
          <div className="flex items-center gap-1 pl-2">
            <button
              onClick={() => setActiveTab('AUDIO')}
              className={`px-2.5 py-1 text-[10px] font-bold tracking-wider rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'AUDIO'
                  ? 'bg-[#f5a623]/20 text-[#f5a623] border border-[#f5a623]/40'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>[AUDIO SYNC]</span>
              {beat && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623] animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('VOICE')}
              className={`px-2.5 py-1 text-[10px] font-bold tracking-wider rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'VOICE'
                  ? 'bg-[#fb7185]/20 text-[#fb7185] border border-[#fb7185]/40'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Mic className="w-3 h-3" />
              <span>[VOICE & SUB]</span>
              {voiceState.isRecording && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#fb7185] animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('GRADE')}
              className={`px-2.5 py-1 text-[10px] font-bold tracking-wider rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'GRADE'
                  ? 'bg-[#2dd4bf]/20 text-[#2dd4bf] border border-[#2dd4bf]/40'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>[GRADE & LUT]</span>
              {!colorParams.bypass && (
                <span className="text-[9px] text-[#2dd4bf]">3D</span>
              )}
            </button>
          </div>
        </div>

        {/* Controls: Collapse & Close */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded"
            title={isCollapsed ? 'Expand Rack' : 'Collapse Rack'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {onToggleOpen && (
            <button
              onClick={onToggleOpen}
              className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded"
              title="Close Rack"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {!isCollapsed && (
        <div className="p-3">
          {/* TAB 1: AUDIO-REACTIVE KINETIC SYNC */}
          {activeTab === 'AUDIO' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Column 1: Multi-Band Audio Energy Scopes */}
              <div className="p-2.5 bg-black/40 border border-zinc-800/80 rounded space-y-2">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-wider">
                  <span>SPECTRAL ENERGY BANDS</span>
                  <span className="text-[#f5a623] font-bold">
                    {beat ? `HIT // ${beat.type.toUpperCase()}` : 'MONITORING'}
                  </span>
                </div>

                {/* Energy Spectrum Visualizer */}
                <div className="space-y-1.5 pt-1">
                  <div>
                    <div className="flex justify-between text-[9px] text-zinc-400 mb-0.5">
                      <span>BASS (20-250Hz)</span>
                      <span className="text-[#f5a623]">{Math.round(energy.bass * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#f5a623] to-[#fb7185] transition-all duration-75"
                        style={{ width: `${Math.min(100, energy.bass * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[9px] text-zinc-400 mb-0.5">
                      <span>MID (250-2500Hz)</span>
                      <span className="text-[#2dd4bf]">{Math.round(energy.mid * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2dd4bf] transition-all duration-75"
                        style={{ width: `${Math.min(100, energy.mid * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[9px] text-zinc-400 mb-0.5">
                      <span>TREBLE (2.5k-16kHz)</span>
                      <span className="text-zinc-300">{Math.round(energy.treble * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-400 transition-all duration-75"
                        style={{ width: `${Math.min(100, energy.treble * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* RMS Level */}
                <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[9px] text-zinc-400">
                  <span>RMS AMPLITUDE</span>
                  <span className="font-bold text-zinc-200">{(energy.rms * 100).toFixed(1)} dBFS</span>
                </div>
              </div>

              {/* Column 2: Beat Sensitivity & Threshold Dispatcher */}
              <div className="p-2.5 bg-black/40 border border-zinc-800/80 rounded space-y-2.5">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-wider">
                  <span>BEAT SENSITIVITY</span>
                  <span className="text-[#f5a623] font-bold">
                    {Math.round(audioConfig.sensitivity * 100)}%
                  </span>
                </div>

                <div className="space-y-1">
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={audioConfig.sensitivity}
                    onChange={(e) => updateAudioConfig({ sensitivity: parseFloat(e.target.value) })}
                    className="w-full accent-[#f5a623] bg-zinc-800 cursor-pointer h-1 rounded"
                  />
                  <div className="flex justify-between text-[8px] text-zinc-500">
                    <span>10% (HEAVY ONLY)</span>
                    <span>50%</span>
                    <span>90% (RAPID HITS)</span>
                  </div>
                </div>

                {/* Live Beat Pulse Indicator */}
                <div className="p-2 bg-zinc-950/80 border border-zinc-800 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full border transition-all duration-100 ${
                        beat
                          ? 'bg-[#f5a623] border-[#f5a623] shadow-[0_0_12px_#f5a623]'
                          : 'bg-zinc-800 border-zinc-700'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-300">
                      {beat ? `TRANSIENT TRIGGERED [${beat.type.toUpperCase()}]` : 'IDLE WAIT FOR BEAT'}
                    </span>
                  </div>
                  <span className="text-[9px] text-zinc-500">24FPS LOCKED</span>
                </div>
              </div>

              {/* Column 3: Canvas Visual Link Toggles */}
              <div className="p-2.5 bg-black/40 border border-zinc-800/80 rounded space-y-2">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                  CANVAS VISUAL BINDINGS
                </div>

                <div className="space-y-1.5">
                  <button
                    onClick={() => updateAudioConfig({ scalePulseEnabled: !audioConfig.scalePulseEnabled })}
                    className={`w-full px-2.5 py-1.5 text-[10px] font-bold rounded flex items-center justify-between border transition-all ${
                      audioConfig.scalePulseEnabled
                        ? 'bg-[#f5a623]/15 border-[#f5a623]/50 text-[#f5a623]'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span>[ SCALE PULSE ]</span>
                    <span className="text-[9px] font-normal">
                      {audioConfig.scalePulseEnabled ? `ACTIVE (${visualTransforms.scale.toFixed(2)}x)` : 'OFF'}
                    </span>
                  </button>

                  <button
                    onClick={() => updateAudioConfig({ chromaticSpikesEnabled: !audioConfig.chromaticSpikesEnabled })}
                    className={`w-full px-2.5 py-1.5 text-[10px] font-bold rounded flex items-center justify-between border transition-all ${
                      audioConfig.chromaticSpikesEnabled
                        ? 'bg-[#2dd4bf]/15 border-[#2dd4bf]/50 text-[#2dd4bf]'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span>[ CHROMATIC SPIKE ]</span>
                    <span className="text-[9px] font-normal">
                      {audioConfig.chromaticSpikesEnabled ? `ACTIVE (${visualTransforms.chromaticOffsetPx.toFixed(1)}px)` : 'OFF'}
                    </span>
                  </button>

                  <button
                    onClick={() => updateAudioConfig({ cameraShakeEnabled: !audioConfig.cameraShakeEnabled })}
                    className={`w-full px-2.5 py-1.5 text-[10px] font-bold rounded flex items-center justify-between border transition-all ${
                      audioConfig.cameraShakeEnabled
                        ? 'bg-[#fb7185]/15 border-[#fb7185]/50 text-[#fb7185]'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span>[ CAMERA SHAKE ]</span>
                    <span className="text-[9px] font-normal">
                      {audioConfig.cameraShakeEnabled ? `ACTIVE (${visualTransforms.shakeX.toFixed(1)}px)` : 'OFF'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ZERO-CLOUD VOICEOVER & SUBTITLE ENGINE */}
          {activeTab === 'VOICE' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Column 1: One-Tap Mic Recording Node */}
              <div className="p-2.5 bg-black/40 border border-zinc-800/80 rounded space-y-2.5">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-wider">
                  <span>LOCAL MIC CAPTURE</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setVoiceLanguage('bn-BD')}
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                        voiceState.activeLanguage === 'bn-BD'
                          ? 'bg-[#2dd4bf] text-black'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      বাংলা
                    </button>
                    <button
                      onClick={() => setVoiceLanguage('en-US')}
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                        voiceState.activeLanguage === 'en-US'
                          ? 'bg-[#2dd4bf] text-black'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                {/* Big Tactile Hardware Record Button */}
                <button
                  onClick={handleToggleRecord}
                  className={`w-full py-3 px-3 rounded flex items-center justify-center gap-2 font-bold text-xs tracking-wider border transition-all ${
                    voiceState.isRecording
                      ? 'bg-red-600 text-white border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse'
                      : 'bg-zinc-900 text-zinc-200 border-zinc-700 hover:border-red-500/80 hover:bg-zinc-800'
                  }`}
                >
                  {voiceState.isRecording ? (
                    <>
                      <Square className="w-4 h-4 fill-white" />
                      <span>STOP & INJECT TAKE ({voiceState.recordingDurationSec.toFixed(1)}s)</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-red-500" />
                      <span>RECORD VOICEOVER TAKE</span>
                    </>
                  )}
                </button>

                {/* Mic VU Meter Bar */}
                <div>
                  <div className="flex justify-between text-[8px] text-zinc-500 mb-0.5">
                    <span>MIC INPUT VU</span>
                    <span>{Math.round(voiceState.micLevel * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-75 ${
                        voiceState.micLevel > 0.8
                          ? 'bg-red-500'
                          : voiceState.micLevel > 0.4
                          ? 'bg-[#f5a623]'
                          : 'bg-[#2dd4bf]'
                      }`}
                      style={{ width: `${Math.min(100, voiceState.micLevel * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="text-[9px] text-zinc-500 flex items-center justify-between">
                  <span>ZERO-CLOUD LOCAL SILICON</span>
                  <span className="text-emerald-400">NO EXTERNAL DATA LEAK</span>
                </div>
              </div>

              {/* Column 2: In-Browser Live Transcription Display */}
              <div className="p-2.5 bg-black/40 border border-zinc-800/80 rounded space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-wider mb-1.5">
                    <span>LIVE IN-BROWSER TRANSCRIPT</span>
                    {voiceState.isTranscribing && (
                      <span className="text-[9px] text-[#2dd4bf] animate-pulse">LISTENING...</span>
                    )}
                  </div>

                  <div className="p-2 bg-zinc-950/80 border border-zinc-800 rounded min-h-[70px] max-h-[85px] overflow-y-auto text-[11px] font-sans text-zinc-200 leading-relaxed">
                    {voiceState.currentTranscript || voiceState.interimTranscript ? (
                      <div>
                        <span>{voiceState.currentTranscript}</span>{' '}
                        <span className="text-[#2dd4bf] italic">{voiceState.interimTranscript}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-600 italic">
                        {voiceState.activeLanguage === 'bn-BD'
                          ? 'মাইকে কথা বলুন — সরাসরি বাংলায় সাবটাইটেল তৈরি হবে...'
                          : 'Speak into microphone — speech transcribes locally into subtitles...'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Slicing & Style Selector */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800/80">
                  <span className="text-[9px] text-zinc-500 uppercase">STYLE:</span>
                  {(['rap_pop', 'bilingual_dual', 'cinematic_minimal'] as CaptionStyle[]).map(style => (
                    <button
                      key={style}
                      onClick={() => setSelectedCaptionStyle(style)}
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                        selectedCaptionStyle === style
                          ? 'bg-[#f5a623] text-black'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {style === 'rap_pop' ? 'RAP POP' : style === 'bilingual_dual' ? 'DUAL' : 'MINIMAL'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column 3: Direct-to-Kinetic Track Sync Button */}
              <div className="p-2.5 bg-black/40 border border-zinc-800/80 rounded space-y-2 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1.5">
                    KINETIC SUBTITLE TRACK
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    Slices voice transcript into phonetic word chips synced to audio cadence with molten-gold highlights.
                  </p>
                </div>

                <button
                  onClick={handleSyncToFrame}
                  disabled={!voiceState.currentTranscript && !currentFrame?.tagline}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-[#f5a623] to-[#d4af37] text-black font-bold text-xs tracking-wider rounded hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-black" />
                  <span>SYNC TO KINETIC TRACK</span>
                </button>

                <div className="text-[9px] text-zinc-500 text-center">
                  TARGET SHOT: {currentFrame ? `${currentFrame.epNumber} (${durationSec}s)` : '#001'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HARDWARE-ACCELERATED LUT & COLOR ENGINE */}
          {activeTab === 'GRADE' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Column 1: Built-In Master LUT Switcher & Bypass */}
              <div className="p-2.5 bg-black/40 border border-zinc-800/80 rounded space-y-2">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-wider">
                  <span>3D LUT PRESETS</span>
                  <button
                    onClick={() => updateColorParams({ bypass: !colorParams.bypass })}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded flex items-center gap-1 border ${
                      colorParams.bypass
                        ? 'bg-red-500/20 text-red-400 border-red-500/50'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                    }`}
                  >
                    {colorParams.bypass ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                    <span>{colorParams.bypass ? 'BYPASS ON' : 'GRADE ACTIVE'}</span>
                  </button>
                </div>

                {/* LUT Preset Matrix */}
                <div className="grid grid-cols-2 gap-1.5">
                  {BUILTIN_LUTS.map(lut => (
                    <button
                      key={lut.id}
                      onClick={() => updateColorParams({ activeLut: lut.id, bypass: false })}
                      className={`px-2 py-1.5 text-[9.5px] font-bold rounded text-left border transition-all truncate flex items-center justify-between ${
                        colorParams.activeLut === lut.id && !colorParams.bypass
                          ? 'bg-[#2dd4bf]/20 border-[#2dd4bf] text-white shadow-[0_0_8px_rgba(45,212,191,0.25)]'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <span className="truncate">{lut.code}</span>
                      <span
                        className="w-2 h-2 rounded-full shrink-0 ml-1"
                        style={{ backgroundColor: lut.color }}
                      />
                    </button>
                  ))}
                </div>

                {/* LUT Mix Slider */}
                <div className="pt-1 border-t border-zinc-800">
                  <div className="flex justify-between text-[8px] text-zinc-400 mb-0.5">
                    <span>LUT INTENSITY</span>
                    <span>{Math.round(colorParams.lutMix * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={colorParams.lutMix}
                    onChange={(e) => updateColorParams({ lutMix: parseFloat(e.target.value) })}
                    className="w-full accent-[#2dd4bf] bg-zinc-800 cursor-pointer h-1 rounded"
                  />
                </div>
              </div>

              {/* Column 2: Drag & Drop .cube File Parser */}
              <div
                onDragOver={(e) => { e.preventDefault(); setLutDropActive(true); }}
                onDragLeave={() => setLutDropActive(false)}
                onDrop={handleDropCube}
                className={`p-2.5 bg-black/40 border rounded flex flex-col justify-between transition-colors ${
                  lutDropActive
                    ? 'border-[#2dd4bf] bg-[#2dd4bf]/10'
                    : 'border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-wider mb-1.5">
                    <span>CUSTOM .CUBE 3D LUT</span>
                    <Upload className="w-3 h-3 text-[#2dd4bf]" />
                  </div>

                  <p className="text-[10px] text-zinc-400 leading-normal mb-2">
                    Drag and drop any DaVinci Resolve or Adobe standard .cube file. Parsed directly into GPU 3D texture.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".cube"
                  className="hidden"
                  onChange={handleFileInputChange}
                />

                <div className="space-y-1.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 px-2 bg-zinc-900 border border-zinc-700 text-zinc-200 hover:text-white hover:border-[#2dd4bf] rounded text-[10px] font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Upload className="w-3 h-3 text-[#2dd4bf]" />
                    <span>LOAD .CUBE FILE</span>
                  </button>

                  {colorParams.customLutName && (
                    <div className="text-[9px] text-[#2dd4bf] truncate text-center font-bold">
                      ACTIVE: {colorParams.customLutName}
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: Manual Parametric Hardware Grading Sliders */}
              <div className="p-2.5 bg-black/40 border border-zinc-800/80 rounded space-y-2">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-wider">
                  <span>HARDWARE SHADER CONTROLS</span>
                  <button
                    onClick={() => updateColorParams({
                      exposure: 0.0,
                      contrast: 1.0,
                      temperature: 0.0,
                      filmGrain: 0.15,
                      halation: 0.20
                    })}
                    className="text-[9px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>RESET</span>
                  </button>
                </div>

                <div className="space-y-1.5 pt-0.5">
                  {/* Exposure Slider */}
                  <div>
                    <div className="flex justify-between text-[8px] text-zinc-400 mb-0.5">
                      <span>EXPOSURE</span>
                      <span>{colorParams.exposure > 0 ? `+${colorParams.exposure.toFixed(1)}` : colorParams.exposure.toFixed(1)} EV</span>
                    </div>
                    <input
                      type="range"
                      min="-2.0"
                      max="2.0"
                      step="0.1"
                      value={colorParams.exposure}
                      onChange={(e) => updateColorParams({ exposure: parseFloat(e.target.value) })}
                      className="w-full accent-[#f5a623] bg-zinc-800 cursor-pointer h-1 rounded"
                    />
                  </div>

                  {/* Contrast S-Curve Slider */}
                  <div>
                    <div className="flex justify-between text-[8px] text-zinc-400 mb-0.5">
                      <span>CONTRAST S-CURVE</span>
                      <span>{(colorParams.contrast * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={colorParams.contrast}
                      onChange={(e) => updateColorParams({ contrast: parseFloat(e.target.value) })}
                      className="w-full accent-[#2dd4bf] bg-zinc-800 cursor-pointer h-1 rounded"
                    />
                  </div>

                  {/* Film Grain Intensity Slider */}
                  <div>
                    <div className="flex justify-between text-[8px] text-zinc-400 mb-0.5">
                      <span>35MM FILM GRAIN (PROCEDURAL)</span>
                      <span>{Math.round(colorParams.filmGrain * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={colorParams.filmGrain}
                      onChange={(e) => updateColorParams({ filmGrain: parseFloat(e.target.value) })}
                      className="w-full accent-zinc-300 bg-zinc-800 cursor-pointer h-1 rounded"
                    />
                  </div>

                  {/* Halation / Bloom Slider */}
                  <div>
                    <div className="flex justify-between text-[8px] text-zinc-400 mb-0.5">
                      <span>OPTICAL HALATION / GLOW</span>
                      <span>{Math.round(colorParams.halation * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={colorParams.halation}
                      onChange={(e) => updateColorParams({ halation: parseFloat(e.target.value) })}
                      className="w-full accent-[#fb7185] bg-zinc-800 cursor-pointer h-1 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
