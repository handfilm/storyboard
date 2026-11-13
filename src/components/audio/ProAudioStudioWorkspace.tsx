/**
 * @file /src/components/audio/ProAudioStudioWorkspace.tsx
 * @description Unified Pro Audio Studio Workspace (04 AUDIO STUDIO):
 * 1. Stereo Mid-Side Vocal Remover & Acapella Isolator
 * 2. Live Mic Voiceover Booth (3-2-1 Stage Countdown Sync, dB Meter, Voice EQ Curves, -12dB Auto-Duck)
 * 3. Gemini Neural Voiceover TTS & AI/Offline Foley Soundscape Generator
 * 4. 3-Bus Cinema Mixer (VO / MUSIC / SFX w/ Stereo Pan, 3-Band EQ, Mute/Solo, -0.5dB Limiter)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AudioWaveform,
  Check,
  Download,
  Mic,
  Music,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Sliders,
  Sparkles,
  Square,
  Volume2,
  Zap
} from 'lucide-react';
import { useStudioStore } from '../../core/store';
import { eventBus } from '../../core/eventBus';
import { getLicenseAuthHeaders, useLicenseStore } from '../../services/licenseService';
import { audioEngine } from '../../services/audioEngine';
import {
  multiTrackAudioBus,
  StemType,
  VoiceEqPreset
} from '../../services/multiTrackAudioBus';
import {
  FOLEY_PRESETS,
  FoleySynthRecipe,
  processAudioFileMidSide,
  synthesizeFoleyRecipeToWavBlob,
  VocalIsolationMode
} from '../../services/vocalRemoverAndFoleyService';

export type ProAudioTab = 'vocal-remover' | 'record-vo' | 'gemini-audio' | 'mixer';

export interface ProAudioStudioWorkspaceProps {
  activeShotIndex?: number;
  initialTab?: ProAudioTab;
  compact?: boolean;
}

export const ProAudioStudioWorkspace: React.FC<ProAudioStudioWorkspaceProps> = ({
  activeShotIndex: propShotIndex,
  initialTab = 'gemini-audio',
  compact = false
}) => {
  const storeShotIndex = useStudioStore((s) => s.activeShotIndex);
  const targetShotIndex = typeof propShotIndex === 'number' ? propShotIndex : storeShotIndex;
  const targetShot = useStudioStore((s) => s.project.shots?.[targetShotIndex]);
  const updateShot = useStudioStore((s) => s.updateShot);
  const isStagePlaying = useStudioStore((s) => s.isPlaying);
  const setStagePlaying = (playing: boolean) => {
    const cur = useStudioStore.getState();
    if (cur.isPlaying !== playing) cur.togglePlay();
  };

  const [activeTab, setActiveTab] = useState<ProAudioTab>(initialTab);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const flashNotice = (msg: string) => {
    setStatusNotice(msg);
    window.setTimeout(() => setStatusNotice((prev) => (prev === msg ? null : prev)), 2600);
  };

  // =========================================================================
  // TAB 1: VOCAL REMOVER (MID-SIDE DSP)
  // =========================================================================
  const [vrFile, setVrFile] = useState<File | null>(null);
  const [vrMode, setVrMode] = useState<VocalIsolationMode>('instrumental');
  const [vrSuppression, setVrSuppression] = useState<number>(88);
  const [vrBassRetain, setVrBassRetain] = useState<number>(85);
  const [vrProcessing, setVrProcessing] = useState<boolean>(false);
  const [vrResult, setVrResult] = useState<{
    wavUrl: string;
    wavBlob: Blob;
    durationSec: number;
  } | null>(null);

  const handleRunVocalRemover = async () => {
    if (!useLicenseStore.getState().requireProAccess('AI Vocal Remover & Gemini Voice Studio')) {
      return;
    }
    if (!vrFile) {
      flashNotice('Select an audio or video file first.');
      return;
    }
    setVrProcessing(true);
    try {
      if (vrResult?.wavUrl) {
        URL.revokeObjectURL(vrResult.wavUrl);
      }
      const res = await processAudioFileMidSide(vrFile, {
        mode: vrMode,
        suppressionPct: vrSuppression,
        bassRetainPct: vrBassRetain
      });
      setVrResult({
        wavUrl: res.wavUrl,
        wavBlob: res.wavBlob,
        durationSec: res.durationSec
      });
      flashNotice(
        `${vrMode === 'instrumental' ? 'Instrumental stem' : 'Acapella stem'} rendered (${res.durationSec.toFixed(1)}s)`
      );
    } catch (err: any) {
      flashNotice(err?.message || 'Failed to decode audio file.');
    } finally {
      setVrProcessing(false);
    }
  };

  // =========================================================================
  // TAB 2: RECORD VO (MIC CAPTURE + COUNTDOWN + EQ + DUCKING)
  // =========================================================================
  const [isRecordingVo, setIsRecordingVo] = useState(false);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);
  const [syncStageOnRec, setSyncStageOnRec] = useState(true);
  const [autoDuck12Db, setAutoDuck12Db] = useState(true);
  const [voiceEqPreset, setVoiceEqPreset] = useState<VoiceEqPreset>(() =>
    multiTrackAudioBus.getActiveVoiceEqPreset()
  );
  const [micPeakDb, setMicPeakDb] = useState<number>(-60);
  const [recordedVoUrl, setRecordedVoUrl] = useState<string>('');
  const [voError, setVoError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micMeterRafRef = useRef<number | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);

  const cleanupMicSession = () => {
    if (micMeterRafRef.current) {
      cancelAnimationFrame(micMeterRafRef.current);
      micMeterRafRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (micAudioCtxRef.current) {
      micAudioCtxRef.current.close().catch(() => {});
      micAudioCtxRef.current = null;
    }
    setMicPeakDb(-60);
  };

  useEffect(() => {
    return () => {
      cleanupMicSession();
    };
  }, []);

  const handleSelectVoiceEq = (preset: VoiceEqPreset) => {
    setVoiceEqPreset(preset);
    multiTrackAudioBus.applyVoiceEqPreset(preset);
    flashNotice(`Voice EQ preset: ${preset.toUpperCase()}`);
  };

  const handleToggleAutoDuck = () => {
    const next = !autoDuck12Db;
    setAutoDuck12Db(next);
    multiTrackAudioBus.setDuckingEnabled(next);
    multiTrackAudioBus.setDuckingDepthDb(next ? -12 : 0);
  };

  const startActualMicRecording = async () => {
    setVoError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoError('Microphone capture is unavailable in this browser context.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // Live Peak dB Meter
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const meterCtx = new AudioCtx();
        micAudioCtxRef.current = meterCtx;
        const src = meterCtx.createMediaStreamSource(stream);
        const analyser = meterCtx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const buf = new Float32Array(analyser.frequencyBinCount);
        const tickMeter = () => {
          analyser.getFloatTimeDomainData(buf);
          let peak = 0;
          for (let i = 0; i < buf.length; i++) {
            const a = Math.abs(buf[i]);
            if (a > peak) peak = a;
          }
          const db = peak <= 0.0005 ? -60 : Math.max(-60, Math.min(0, Math.round(20 * Math.log10(peak))));
          setMicPeakDb(db);
          micMeterRafRef.current = requestAnimationFrame(tickMeter);
        };
        micMeterRafRef.current = requestAnimationFrame(tickMeter);
      }

      const chunks: Blob[] = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVoUrl(url);
        cleanupMicSession();
        setIsRecordingVo(false);
        if (syncStageOnRec && isStagePlaying) {
          setStagePlaying(false);
        }
        flashNotice('Voiceover take captured cleanly.');
      };

      multiTrackAudioBus.applyVoiceEqPreset(voiceEqPreset);
      multiTrackAudioBus.setDuckingEnabled(autoDuck12Db);
      multiTrackAudioBus.setDuckingDepthDb(autoDuck12Db ? -12 : 0);

      mr.start(100);
      setIsRecordingVo(true);
      if (syncStageOnRec) {
        setStagePlaying(true);
      }
    } catch (err: any) {
      cleanupMicSession();
      setVoError(err?.message || 'Microphone permission denied.');
    }
  };

  const handleToggleRecordVo = () => {
    if (isRecordingVo && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      return;
    }
    if (countdownNum !== null) return;

    if (syncStageOnRec) {
      setCountdownNum(3);
      window.setTimeout(() => setCountdownNum(2), 700);
      window.setTimeout(() => setCountdownNum(1), 1400);
      window.setTimeout(() => {
        setCountdownNum(null);
        void startActualMicRecording();
      }, 2100);
    } else {
      void startActualMicRecording();
    }
  };

  // =========================================================================
  // TAB 3: GEMINI AUDIO STUDIO (TTS + AI FOLEY)
  // =========================================================================
  const [ttsText, setTtsText] = useState(
    'দৃষ্টির সীমানা পেরিয়ে, আলো আজ ভস্ম থেকে জন্ম নিচ্ছে।'
  );
  const [ttsVoice, setTtsVoice] = useState<'Kore' | 'Puck' | 'Fenrir' | 'Zephyr' | 'Aoede'>('Kore');
  const [ttsStyle, setTtsStyle] = useState<'cinema-narrator' | 'bangla-poetic' | 'hype-trailer' | 'whisper'>('cinema-narrator');
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string>('');
  const [ttsError, setTtsError] = useState<string | null>(null);

  const [foleyPrompt, setFoleyPrompt] = useState('Heavy anamorphic sub-bass boom with neon rain tail');
  const [isGeneratingFoley, setIsGeneratingFoley] = useState(false);
  const [foleyAudioUrl, setFoleyAudioUrl] = useState<string>('');
  const [activeFoleyName, setActiveFoleyName] = useState<string>('');

  const handleGenerateTts = async () => {
    if (!useLicenseStore.getState().requireProAccess('AI Vocal Remover & Gemini Voice Studio')) {
      return;
    }
    if (!ttsText.trim()) return;
    setIsGeneratingTts(true);
    setTtsError(null);
    try {
      const resp = await fetch('/api/ai/generate-audio', {
        method: 'POST',
        headers: getLicenseAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          mode: 'tts',
          text: ttsText.trim(),
          voiceName: ttsVoice,
          style: ttsStyle
        })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.success || !json?.audioDataUrl) {
        useLicenseStore.getState().handleApiLicenseError(resp.status, json, 'AI Vocal Remover & Gemini Voice Studio');
        throw new Error(json?.error || `TTS generation failed (${resp.status})`);
      }
      setTtsAudioUrl(json.audioDataUrl);
      flashNotice(`Gemini TTS ready (${ttsVoice})`);
    } catch (err: any) {
      setTtsError(err?.message || 'Gemini TTS failed.');
    } finally {
      setIsGeneratingTts(false);
    }
  };

  const applyFoleyRecipe = (recipe: FoleySynthRecipe) => {
    const blob = synthesizeFoleyRecipeToWavBlob(recipe, 48000);
    const url = URL.createObjectURL(blob);
    setFoleyAudioUrl((prev) => {
      if (prev.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(prev);
        } catch {}
      }
      return url;
    });
    setActiveFoleyName(recipe.name);
    flashNotice(`Foley synthesized: ${recipe.name}`);
  };

  const handleGenerateFoley = async () => {
    if (!useLicenseStore.getState().requireProAccess('AI Vocal Remover & Gemini Voice Studio')) {
      return;
    }
    if (!foleyPrompt.trim()) return;
    setIsGeneratingFoley(true);
    try {
      const resp = await fetch('/api/ai/generate-audio', {
        method: 'POST',
        headers: getLicenseAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ mode: 'foley', prompt: foleyPrompt.trim(), durationSec: 4.0 })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        useLicenseStore.getState().handleApiLicenseError(resp.status, json, 'AI Vocal Remover & Gemini Voice Studio');
      }
      if (json?.success && json?.recipe) {
        applyFoleyRecipe(json.recipe);
      } else {
        applyFoleyRecipe(FOLEY_PRESETS[0]);
      }
    } catch {
      applyFoleyRecipe(FOLEY_PRESETS[0]);
    } finally {
      setIsGeneratingFoley(false);
    }
  };

  // =========================================================================
  // TAB 4: 3-BUS MIXER + DRONE SYNTH
  // =========================================================================
  const [, setMixerTick] = useState(0);
  const [dronePlaying, setDronePlaying] = useState(false);
  const [telemetry, setTelemetry] = useState(() => multiTrackAudioBus.getTelemetry());

  useEffect(() => {
    if (activeTab !== 'mixer') return;
    const id = window.setInterval(() => {
      setTelemetry(multiTrackAudioBus.getTelemetry());
    }, 80);
    return () => window.clearInterval(id);
  }, [activeTab]);

  const bindAudioToTargetShot = (
    field: 'voAudioUrl' | 'sfxAudioUrl' | 'audioUrl',
    url: string,
    label: string
  ) => {
    if (!url) return;
    updateShot(targetShotIndex, {
      [field]: url,
      soundCue: `[${field === 'voAudioUrl' ? 'VO' : field === 'sfxAudioUrl' ? 'SFX' : 'MUSIC'} // SH${String(
        targetShotIndex + 1
      ).padStart(3, '0')}]: ${label}`
    } as any);
    eventBus.emit('shot:updated', {
      index: targetShotIndex,
      partial: { [field]: url }
    });
    flashNotice(`Bound ${label} to SH${String(targetShotIndex + 1).padStart(3, '0')}`);
  };

  const toggleDroneSynth = () => {
    audioEngine.init();
    if (dronePlaying) {
      audioEngine.pauseAudio();
      audioEngine.setMuted(true);
      setDronePlaying(false);
    } else {
      audioEngine.setMuted(false);
      audioEngine.playAudio();
      audioEngine.playFrameImpact(0.45);
      setDronePlaying(true);
    }
  };

  return (
    <div
      className={`flex flex-col text-white font-mono select-none ${
        compact ? 'gap-2.5' : 'p-4 gap-3.5'
      }`}
    >
      {/* Target Shot Header + Segmented Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5 bg-black/60 p-0.5 rounded-lg border border-white/10 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'gemini-audio', label: '✨ GEMINI AUDIO' },
              { id: 'record-vo', label: '🎤 RECORD VO' },
              { id: 'vocal-remover', label: '🎛 VOCAL REMOVER' },
              { id: 'mixer', label: '🎚 3-BUS MIXER' }
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid={`audio-tab-${t.id}`}
              onClick={() => setActiveTab(t.id)}
              className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                activeTab === t.id
                  ? 'bg-[#F59E0B] text-[#0B0B0D]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className="px-2 py-0.5 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] text-[9px] font-bold tabular-nums shrink-0">
          TARGET SH{String(targetShotIndex + 1).padStart(3, '0')}
        </span>
      </div>

      {statusNotice && (
        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 1: VOCAL REMOVER (MID-SIDE STEREO DSP)                         */}
      {/* ================================================================= */}
      {activeTab === 'vocal-remover' && (
        <div className="space-y-3 bg-[#0D0E12] border border-white/10 rounded-xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider flex items-center gap-1.5">
              <AudioWaveform className="w-3.5 h-3.5" />
              STEREO MID-SIDE VOCAL REMOVER
            </span>
            <span className="text-[8.5px] text-zinc-400 uppercase">WEB AUDIO DSP</span>
          </div>

          <label className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-dashed border-white/20 hover:border-[#F59E0B]/60 bg-black/50 cursor-pointer transition-colors">
            <span className="text-[10px] text-zinc-300 truncate">
              {vrFile ? `Loaded: ${vrFile.name}` : 'Select audio / video track to split vocals...'}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/10 text-[9px] font-bold text-white shrink-0">
              BROWSE
            </span>
            <input
              type="file"
              accept="audio/*,video/*"
              className="hidden"
              onChange={(e) => setVrFile(e.target.files?.[0] || null)}
            />
          </label>

          <div className="grid grid-cols-2 gap-1.5 bg-black/60 p-1 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => setVrMode('instrumental')}
              className={`py-1.5 rounded text-[9px] font-bold uppercase cursor-pointer whitespace-nowrap ${
                vrMode === 'instrumental'
                  ? 'bg-[#F59E0B] text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              INSTRUMENTAL / KARAOKE
            </button>
            <button
              type="button"
              onClick={() => setVrMode('acapella')}
              className={`py-1.5 rounded text-[9px] font-bold uppercase cursor-pointer whitespace-nowrap ${
                vrMode === 'acapella'
                  ? 'bg-[#F59E0B] text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ACAPELLA VOCAL ISOLATE
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[9px]">
            <div>
              <div className="flex justify-between text-zinc-400 mb-1 tabular-nums">
                <span>CENTER SUPPRESSION</span>
                <span className="text-[#FFE066] font-bold">{vrSuppression}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={vrSuppression}
                onChange={(e) => setVrSuppression(Number(e.target.value))}
                className="w-full accent-[#F59E0B] cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-zinc-400 mb-1 tabular-nums">
                <span>BASS RETAIN (&lt;180Hz)</span>
                <span className="text-[#FFE066] font-bold">{vrBassRetain}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={vrBassRetain}
                onChange={(e) => setVrBassRetain(Number(e.target.value))}
                className="w-full accent-[#F59E0B] cursor-pointer"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={!vrFile || vrProcessing}
            onClick={handleRunVocalRemover}
            className="w-full py-2 rounded-lg bg-[#F59E0B] hover:bg-amber-400 disabled:opacity-40 text-black font-black text-[10px] tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {vrProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>{vrProcessing ? 'PROCESSING MID-SIDE STEMS...' : 'EXTRACT STEM (WAV)'}</span>
          </button>

          {vrResult && (
            <div className="p-2.5 rounded-lg bg-black/70 border border-emerald-500/30 space-y-2">
              <audio src={vrResult.wavUrl} controls className="w-full h-8" />
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    bindAudioToTargetShot(
                      vrMode === 'instrumental' ? 'audioUrl' : 'voAudioUrl',
                      vrResult.wavUrl,
                      `${vrMode.toUpperCase()} STEM`
                    )
                  }
                  className="px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold uppercase cursor-pointer"
                >
                  ASSIGN TO SHOT
                </button>
                <a
                  href={vrResult.wavUrl}
                  download={`handfilm-${vrMode}-stem.wav`}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold uppercase flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>DOWNLOAD WAV</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: LIVE MIC RECORD VO + COUNTDOWN + EQ + AUTO-DUCK            */}
      {/* ================================================================= */}
      {activeTab === 'record-vo' && (
        <div className="space-y-3 bg-[#0D0E12] border border-white/10 rounded-xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" />
              DIRECTOR VOICEOVER BOOTH
            </span>
            <span className="text-[9px] tabular-nums text-zinc-400">
              MIC INPUT: <strong className="text-white">{micPeakDb} dBFS</strong>
            </span>
          </div>

          {/* Live Peak dB Meter */}
          <div className="h-2.5 w-full rounded bg-black/80 border border-white/10 overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${
                micPeakDb > -6 ? 'bg-red-500' : micPeakDb > -18 ? 'bg-[#F59E0B]' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(2, ((micPeakDb + 60) / 60) * 100)}%` }}
            />
          </div>

          {/* Voice EQ Curves */}
          <div className="space-y-1">
            <span className="text-[8.5px] text-zinc-400 uppercase block">VOICE EQ CURVE</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'podcast-crisp', label: 'PODCAST CRISP' },
                  { id: 'cinema-narrator', label: 'CINEMA NARRATOR' },
                  { id: 'radio-warm', label: 'RADIO WARM' }
                ] as const
              ).map((eq) => (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => handleSelectVoiceEq(eq.id)}
                  className={`py-1.5 px-1 rounded text-[8.5px] font-bold uppercase cursor-pointer border whitespace-nowrap truncate ${
                    voiceEqPreset === eq.id
                      ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                      : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {eq.label}
                </button>
              ))}
            </div>
          </div>

          {/* Countdown & -12dB Auto Duck Toggles */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSyncStageOnRec(!syncStageOnRec)}
              className={`p-2 rounded-lg border text-left text-[9px] font-bold cursor-pointer ${
                syncStageOnRec
                  ? 'bg-amber-500/15 border-[#F59E0B]/50 text-amber-300'
                  : 'bg-black/60 border-white/10 text-zinc-400'
              }`}
            >
              {syncStageOnRec ? '✓ 3-2-1 STAGE SYNC' : 'MANUAL RECORD'}
            </button>
            <button
              type="button"
              onClick={handleToggleAutoDuck}
              className={`p-2 rounded-lg border text-left text-[9px] font-bold cursor-pointer ${
                autoDuck12Db
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                  : 'bg-black/60 border-white/10 text-zinc-400'
              }`}
            >
              {autoDuck12Db ? '✓ -12DB AUTO-DUCK' : 'DUCKING OFF'}
            </button>
          </div>

          {voError && (
            <div className="px-2.5 py-1.5 rounded bg-red-500/15 border border-red-500/40 text-red-300 text-[9px]">
              {voError}
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleRecordVo}
            className={`w-full py-2.5 rounded-lg font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer transition-all ${
              isRecordingVo
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : countdownNum !== null
                ? 'bg-amber-500 text-black'
                : 'bg-[#E50914] hover:bg-red-500 text-white'
            }`}
          >
            {isRecordingVo ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>STOP VO RECORDING</span>
              </>
            ) : countdownNum !== null ? (
              <span>STARTING IN {countdownNum}...</span>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>RECORD VOICEOVER TAKE</span>
              </>
            )}
          </button>

          {(recordedVoUrl || targetShot?.voAudioUrl) && (
            <div className="p-2.5 rounded-lg bg-black/70 border border-white/10 space-y-2">
              <audio src={recordedVoUrl || targetShot?.voAudioUrl} controls className="w-full h-8" />
              {recordedVoUrl && (
                <button
                  type="button"
                  onClick={() => bindAudioToTargetShot('voAudioUrl', recordedVoUrl, 'LIVE MIC VO')}
                  className="w-full py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold uppercase cursor-pointer"
                >
                  ✓ BIND VO TO SH{String(targetShotIndex + 1).padStart(3, '0')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: GEMINI AUDIO STUDIO (TTS VOICEOVER + AI FOLEY DESIGN)      */}
      {/* ================================================================= */}
      {activeTab === 'gemini-audio' && (
        <div className="space-y-3">
          {/* Gemini Neural Voiceover (TTS) */}
          <div className="bg-[#0D0E12] border border-white/10 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                GEMINI NEURAL VOICEOVER (TTS)
              </span>
              <span className="text-[8.5px] text-zinc-400 uppercase">BANGLA & ENGLISH</span>
            </div>

            <textarea
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              rows={2}
              placeholder="Enter Bengali or English narration script..."
              className="w-full bg-black/70 border border-white/10 focus:border-[#F59E0B] rounded-lg p-2 text-xs text-white outline-none resize-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Gemini Voice"
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value as any)}
                className="bg-black/80 border border-white/10 rounded px-2 py-1 text-[9.5px] text-amber-300 outline-none"
              >
                <option value="Kore">Voice: Kore (Firm Cinema)</option>
                <option value="Puck">Voice: Puck (Upbeat Crisp)</option>
                <option value="Fenrir">Voice: Fenrir (Deep Trailer)</option>
                <option value="Zephyr">Voice: Zephyr (Bright Studio)</option>
                <option value="Aoede">Voice: Aoede (Warm Poetic)</option>
              </select>
              <select
                aria-label="Delivery Style"
                value={ttsStyle}
                onChange={(e) => setTtsStyle(e.target.value as any)}
                className="bg-black/80 border border-white/10 rounded px-2 py-1 text-[9.5px] text-zinc-200 outline-none"
              >
                <option value="cinema-narrator">Cinema Narrator</option>
                <option value="bangla-poetic">Bangla Poetic</option>
                <option value="hype-trailer">Trailer Impact</option>
                <option value="whisper">Intimate Whisper</option>
              </select>
            </div>

            {ttsError && (
              <div className="px-2.5 py-1.5 rounded bg-red-500/15 border border-red-500/40 text-red-300 text-[9px]">
                {ttsError}
              </div>
            )}

            <button
              type="button"
              disabled={isGeneratingTts || !ttsText.trim()}
              onClick={handleGenerateTts}
              className="w-full py-2 rounded-lg bg-[#E50914] hover:bg-red-500 disabled:opacity-40 text-white font-black text-[9.5px] tracking-widest uppercase flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isGeneratingTts ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{isGeneratingTts ? 'SYNTHESIZING VOICEOVER...' : 'GENERATE GEMINI VOICEOVER'}</span>
            </button>

            {ttsAudioUrl && (
              <div className="p-2 rounded-lg bg-black/70 border border-emerald-500/30 space-y-1.5">
                <audio src={ttsAudioUrl} controls className="w-full h-8" />
                <button
                  type="button"
                  onClick={() => bindAudioToTargetShot('voAudioUrl', ttsAudioUrl, `TTS (${ttsVoice})`)}
                  className="w-full py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold uppercase cursor-pointer"
                >
                  ✓ BIND TTS TO SHOT VO
                </button>
              </div>
            )}
          </div>

          {/* AI Foley & Built-In Soundscape Presets */}
          <div className="bg-[#0D0E12] border border-white/10 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#FFE066] uppercase tracking-wider flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5" />
                AI FOLEY &amp; SOUNDSCAPE ENGINE
              </span>
              <span className="text-[8.5px] text-zinc-400">48KHZ WAV</span>
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                value={foleyPrompt}
                onChange={(e) => setFoleyPrompt(e.target.value)}
                placeholder="Describe SFX: sub-bass drop, 35mm reel, storm rain..."
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded bg-black/70 border border-white/10 focus:border-[#F59E0B] text-[10.5px] text-white outline-none"
              />
              <button
                type="button"
                disabled={isGeneratingFoley || !foleyPrompt.trim()}
                onClick={handleGenerateFoley}
                className="px-3 py-1.5 rounded bg-[#F59E0B] hover:bg-amber-400 disabled:opacity-40 text-black font-black text-[9px] uppercase cursor-pointer shrink-0 whitespace-nowrap"
              >
                {isGeneratingFoley ? 'DESIGNING...' : 'GENERATE SFX'}
              </button>
            </div>

            <div className="flex flex-wrap gap-1">
              {FOLEY_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyFoleyRecipe(p)}
                  className="px-2 py-1 rounded bg-white/[0.04] hover:bg-[#F59E0B]/20 border border-white/10 hover:border-[#F59E0B]/50 text-[8.5px] text-zinc-300 hover:text-amber-300 cursor-pointer whitespace-nowrap"
                >
                  {p.name}
                </button>
              ))}
            </div>

            {foleyAudioUrl && (
              <div className="p-2 rounded-lg bg-black/70 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between text-[9px] text-amber-300 font-bold">
                  <span>{activeFoleyName}</span>
                </div>
                <audio src={foleyAudioUrl} controls className="w-full h-8" />
                <button
                  type="button"
                  onClick={() => bindAudioToTargetShot('sfxAudioUrl', foleyAudioUrl, activeFoleyName || 'AI FOLEY')}
                  className="w-full py-1 rounded bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 border border-[#F59E0B]/50 text-[#F59E0B] text-[9px] font-bold uppercase cursor-pointer"
                >
                  ✓ BIND SFX TO SHOT
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: 3-BUS CINEMA MIXER (VO / MUSIC / SFX + PAN + 3-BAND EQ)    */}
      {/* ================================================================= */}
      {activeTab === 'mixer' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(
              [
                { stem: 'voice', label: 'DIALOGUE / VO', color: '#F59E0B', pulse: () => multiTrackAudioBus.triggerVoiceTestPulse() },
                { stem: 'music', label: 'MUSIC / STEM', color: '#38BDF8', pulse: () => multiTrackAudioBus.triggerMusicBeatDrop() },
                { stem: 'sfx', label: 'SFX / FOLEY', color: '#10B981', pulse: () => multiTrackAudioBus.triggerSfxImpact() }
              ] as ReadonlyArray<{ stem: 'voice' | 'music' | 'sfx'; label: string; color: string; pulse: () => void }>
            ).map(({ stem, label, color, pulse }) => {
              const cfg = multiTrackAudioBus.getStemConfig(stem);
              const dbVal = multiTrackAudioBus.getStemDb(stem);
              const meter = telemetry[stem];

              return (
                <div
                  key={stem}
                  className="p-2.5 rounded-xl bg-[#0D0E12] border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black tracking-wider" style={{ color }}>
                      {label}
                    </span>
                    <button
                      type="button"
                      onClick={pulse}
                      className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[8px] text-zinc-300 cursor-pointer"
                    >
                      TEST
                    </button>
                  </div>

                  {/* VU Meter */}
                  <div className="h-1.5 w-full rounded bg-black/80 overflow-hidden">
                    <div
                      className="h-full transition-all duration-75"
                      style={{
                        width: `${Math.min(100, Math.round(meter.peak * 100))}%`,
                        backgroundColor: color
                      }}
                    />
                  </div>

                  {/* Fader + M/S */}
                  <div>
                    <div className="flex justify-between text-[8px] text-zinc-400 tabular-nums">
                      <span>GAIN</span>
                      <span className="text-white">{dbVal} dB</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.05}
                      value={cfg.volume}
                      onChange={(e) => {
                        multiTrackAudioBus.setStemVolume(stem as StemType, Number(e.target.value));
                        setMixerTick((n) => n + 1);
                      }}
                      className="w-full accent-[#F59E0B] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        multiTrackAudioBus.toggleMute(stem);
                        setMixerTick((n) => n + 1);
                      }}
                      className={`flex-1 py-0.5 rounded text-[8.5px] font-bold border cursor-pointer ${
                        cfg.isMuted
                          ? 'bg-red-600/30 border-red-500 text-red-300'
                          : 'bg-black/60 border-white/10 text-zinc-400'
                      }`}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        multiTrackAudioBus.toggleSolo(stem);
                        setMixerTick((n) => n + 1);
                      }}
                      className={`flex-1 py-0.5 rounded text-[8.5px] font-bold border cursor-pointer ${
                        cfg.isSoloed
                          ? 'bg-amber-500/30 border-amber-400 text-amber-300'
                          : 'bg-black/60 border-white/10 text-zinc-400'
                      }`}
                    >
                      S
                    </button>
                  </div>

                  {/* Stereo Pan */}
                  <div>
                    <div className="flex justify-between text-[8px] text-zinc-400 tabular-nums">
                      <span>PAN</span>
                      <span>
                        {cfg.pan === 0
                          ? 'C'
                          : cfg.pan < 0
                          ? `L${Math.round(Math.abs(cfg.pan) * 100)}`
                          : `R${Math.round(cfg.pan * 100)}`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.1}
                      value={cfg.pan}
                      onChange={(e) => {
                        multiTrackAudioBus.setStemPan(stem, Number(e.target.value));
                        setMixerTick((n) => n + 1);
                      }}
                      className="w-full accent-zinc-300 cursor-pointer"
                    />
                  </div>

                  {/* 3-Band EQ */}
                  <div className="space-y-1 pt-1 border-t border-white/10 text-[8px] text-zinc-400">
                    {(
                      [
                        { band: 'low', label: 'LOW', val: cfg.eqLowDb },
                        { band: 'mid', label: 'MID', val: cfg.eqMidDb },
                        { band: 'high', label: 'HIGH', val: cfg.eqHighDb }
                      ] as const
                    ).map((b) => (
                      <div key={b.band} className="flex items-center gap-1.5">
                        <span className="w-7 shrink-0">{b.label}</span>
                        <input
                          type="range"
                          min={-12}
                          max={12}
                          step={0.5}
                          value={b.val}
                          onChange={(e) => {
                            multiTrackAudioBus.setStemEq(stem, b.band, Number(e.target.value));
                            setMixerTick((n) => n + 1);
                          }}
                          className="flex-1 accent-[#F59E0B] cursor-pointer"
                        />
                        <span className="w-8 text-right tabular-nums text-zinc-300">
                          {b.val > 0 ? `+${b.val}` : b.val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Procedural Sub-Bass Drone & Master Limiter Bar */}
          <div className="p-2.5 rounded-xl bg-[#0D0E12] border border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[9px]">
              <Radio className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-zinc-300 font-bold uppercase">SUB-BASS DRONE (36-48Hz)</span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 tabular-nums">
                LIMITER -0.5dB
              </span>
            </div>
            <button
              type="button"
              onClick={toggleDroneSynth}
              className={`px-3 py-1 rounded text-[9px] font-bold uppercase flex items-center gap-1.5 cursor-pointer ${
                dronePlaying
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {dronePlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{dronePlaying ? 'PAUSE DRONE' : 'START DRONE'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
