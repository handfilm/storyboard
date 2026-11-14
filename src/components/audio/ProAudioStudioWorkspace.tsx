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
import { CinemaBadgeHeader, CinemaToolHUD } from '../ui/CinemaToolHUD';

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
      flashNotice('SELECT MEDIA');
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
        `${vrMode === 'instrumental' ? 'INSTRO STEM' : 'ACAPELLA STEM'} (${res.durationSec.toFixed(1)}s)`
      );
    } catch (err: any) {
      flashNotice(err?.message || 'DECODE FAILED');
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
    flashNotice(`EQ: ${preset.toUpperCase()}`);
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
      setVoError('MIC UNAVAILABLE');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

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
        flashNotice('VO CAPTURED');
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
      setVoError(err?.message || 'MIC DENIED');
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
  const [ttsEmotion, setTtsEmotion] = useState<'neutral' | 'dramatic' | 'warm' | 'intense' | 'whisper' | 'poetic'>('dramatic');
  const [ttsPitchSemitones, setTtsPitchSemitones] = useState<number>(0);
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string>('');
  const [ttsError, setTtsError] = useState<string | null>(null);

  const normalizeLufs14 = Boolean((targetShot as any)?.audioFx?.normalizeLufs14);
  const noiseReduction = Boolean((targetShot as any)?.audioFx?.noiseReduction);

  const toggleShotAudioFx = (key: 'normalizeLufs14' | 'noiseReduction') => {
    if (!useLicenseStore.getState().requireProAccess('Pro Audio DSP (-14 LUFS & Noise Reduction)')) {
      return;
    }
    const prevFx = (targetShot as any)?.audioFx || {
      normalizeLufs14: false,
      noiseReduction: false,
      pitchSemitones: ttsPitchSemitones,
      emotion: ttsEmotion
    };
    const nextVal = !prevFx[key];
    updateShot(targetShotIndex, {
      audioFx: { ...prevFx, [key]: nextVal }
    } as any);
    if (key === 'normalizeLufs14') {
      multiTrackAudioBus.setStemDb('voice', nextVal ? 2.5 : 0);
      multiTrackAudioBus.setStemDb('music', nextVal ? -3.0 : -6.0);
    } else {
      multiTrackAudioBus.setStemEq('voice', 'low', nextVal ? -6 : 0);
    }
    flashNotice(
      key === 'normalizeLufs14'
        ? `-14 LUFS ${nextVal ? 'ON' : 'OFF'}`
        : `DENOISE ${nextVal ? 'ON' : 'OFF'}`
    );
  };

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
          style: ttsStyle,
          emotion: ttsEmotion,
          pitchSemitones: ttsPitchSemitones
        })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.success || !json?.audioDataUrl) {
        useLicenseStore.getState().handleApiLicenseError(resp.status, json, 'AI Vocal Remover & Gemini Voice Studio');
        throw new Error(json?.error || `TTS FAILED (${resp.status})`);
      }
      setTtsAudioUrl(json.audioDataUrl);
      flashNotice(`TTS READY (${ttsVoice})`);
    } catch (err: any) {
      setTtsError(err?.message || 'TTS FAILED');
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
    flashNotice(`FOLEY: ${recipe.name}`);
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
    flashNotice(`BOUND SH${String(targetShotIndex + 1).padStart(3, '0')}`);
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

  const shotBadge = `SH${String(targetShotIndex + 1).padStart(3, '0')}`;

  return (
    <div
      className={`flex flex-col text-white font-mono select-none ${
        compact ? 'gap-2.5' : 'p-4 gap-3.5'
      }`}
    >
      {/* Header + 4-Tile Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
        <CinemaBadgeHeader
          icon={<Volume2 className="w-4 h-4 text-[#F59E0B]" />}
          label="AUDIO DECK"
          accent="amber"
          rightSlot={
            <span className="px-2 py-0.5 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] text-[9px] font-black tabular-nums">
              {shotBadge}
            </span>
          }
        />

        <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto">
          {(
            [
              {
                id: 'gemini-audio',
                label: 'GEMINI TTS',
                icon: Sparkles,
                accent: 'amber' as const,
                en: 'Synthesize neural voiceover & procedural 48kHz Foley SFX.',
                bn: 'স্ক্রিপ্ট লিখে AI ভয়েস ও সাউন্ড এফেক্ট তৈরি করে শটে বসান।'
              },
              {
                id: 'record-vo',
                label: 'RECORD VO',
                icon: Mic,
                accent: 'crimson' as const,
                en: 'Live mic voiceover booth with 3-2-1 sync & -12dB music duck.',
                bn: 'মাইক থেকে লাইভ ভয়েসওভার রেকর্ড করুন ও শটের সাথে সিঙ্ক করুন।'
              },
              {
                id: 'vocal-remover',
                label: 'STEM SPLIT',
                icon: AudioWaveform,
                accent: 'cyan' as const,
                en: 'Mid-Side DSP vocal remover & acapella stem separator.',
                bn: 'গান থেকে ভোকাল বা মিউজিক আলাদা করতে ফাইল বেছে EXTRACT চাপুন।'
              },
              {
                id: 'mixer',
                label: '3-BUS MIX',
                icon: Sliders,
                accent: 'emerald' as const,
                en: 'Master 3-bus console with stereo pan, 3-band EQ, & LUFS DSP.',
                bn: 'ভয়েস, মিউজিক ও SFX ট্র্যাকের ভলিউম ও ইকিউ ব্যালেন্স করুন।'
              }
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <CinemaToolHUD
                key={t.id}
                title={t.label}
                en={t.en}
                bn={t.bn}
                accent={t.accent}
                blockWrapper
              >
                <button
                  type="button"
                  data-testid={`audio-tab-${t.id}`}
                  data-active={active ? 'true' : 'false'}
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full min-h-[44px] px-2 py-1.5 rounded-lg cinema-tile cinema-tile-${t.accent} flex flex-col items-center justify-center gap-1 cursor-pointer`}
                >
                  <Icon className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                  <span className="font-black tracking-wider text-[9px] uppercase whitespace-nowrap">
                    {t.label}
                  </span>
                </button>
              </CinemaToolHUD>
            );
          })}
        </div>
      </div>

      {statusNotice && (
        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-black flex items-center gap-1.5 uppercase tracking-wider">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 1: STEM SPLIT (MID-SIDE STEREO DSP)                           */}
      {/* ================================================================= */}
      {activeTab === 'vocal-remover' && (
        <div className="space-y-3 bg-[#0D0E12] border border-white/10 rounded-xl p-3.5">
          <CinemaBadgeHeader
            icon={<AudioWaveform className="w-4 h-4 text-cyan-400" />}
            label="STEM SPLIT"
            accent="cyan"
            rightSlot={<span className="text-[9px] font-black text-zinc-400">MID-SIDE DSP</span>}
          />

          <div className="flex items-center gap-2">
            <CinemaToolHUD
              title="BROWSE TRACK"
              en="Pick an audio or video file to separate vocals & music."
              bn="কম্পিউটার বা ফোন থেকে অডিও/ভিডিও ফাইল আপলোড করুন।"
              accent="amber"
              blockWrapper
            >
              <label className="w-full min-h-[44px] flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-dashed border-white/20 hover:border-[#F59E0B]/60 bg-black/50 cursor-pointer transition-colors">
                <span className="text-[10px] font-bold text-zinc-300 truncate uppercase">
                  {vrFile ? vrFile.name : 'DROP TRACK'}
                </span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-[9px] font-black text-white shrink-0">
                  BROWSE
                </span>
                <input
                  type="file"
                  accept="audio/*,video/*"
                  className="hidden"
                  onChange={(e) => setVrFile(e.target.files?.[0] || null)}
                />
              </label>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="LOAD ACTIVE SHOT"
              en="Pull audio directly from the currently selected shot."
              bn="বর্তমান শটের অডিও সরাসরি স্টেম স্প্লিটারে লোড করতে চাপুন।"
              accent="cyan"
            >
              <button
                type="button"
                onClick={async () => {
                  const candidateUrl =
                    (targetShot as any)?.audioUrl ||
                    (targetShot as any)?.voAudioUrl ||
                    ((targetShot as any)?.isVideo ? targetShot?.imageUrl : '');
                  if (!candidateUrl) {
                    flashNotice('NO SHOT AUDIO');
                    return;
                  }
                  try {
                    const res = await fetch(candidateUrl);
                    const blob = await res.blob();
                    const file = new File([blob], `shot_${String(targetShotIndex + 1).padStart(3, '0')}_audio.webm`, {
                      type: blob.type || 'audio/webm'
                    });
                    setVrFile(file);
                    flashNotice('SHOT LOADED');
                  } catch {
                    flashNotice('BROWSE FILE');
                  }
                }}
                className="min-h-[44px] px-3 py-2 rounded-lg cinema-tile cinema-tile-cyan flex flex-col items-center justify-center gap-0.5 cursor-pointer shrink-0"
              >
                <AudioWaveform className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                <span className="font-black tracking-wider text-[9px] uppercase whitespace-nowrap">
                  SHOT AUDIO
                </span>
              </button>
            </CinemaToolHUD>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <CinemaToolHUD
              title="INSTRUMENTAL MODE"
              en="Remove center vocals and keep stereo music & backing instruments."
              bn="গান থেকে ভোকাল মুছে শুধু কারাওকে মিউজিক আলাদা করতে চাপুন।"
              accent="amber"
              blockWrapper
            >
              <button
                type="button"
                data-active={vrMode === 'instrumental' ? 'true' : 'false'}
                onClick={() => setVrMode('instrumental')}
                className="w-full min-h-[44px] py-2 rounded-lg cinema-tile cinema-tile-amber flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Music className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                <span className="font-black tracking-wider text-[10px] uppercase">INSTRO</span>
              </button>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="ACAPELLA MODE"
              en="Isolate center vocal track and suppress side stereo instruments."
              bn="মিউজিক বাদ দিয়ে শুধু কণ্ঠ বা ভোকাল আলাদা করতে চাপুন।"
              accent="cyan"
              blockWrapper
            >
              <button
                type="button"
                data-active={vrMode === 'acapella' ? 'true' : 'false'}
                onClick={() => setVrMode('acapella')}
                className="w-full min-h-[44px] py-2 rounded-lg cinema-tile cinema-tile-cyan flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Mic className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                <span className="font-black tracking-wider text-[10px] uppercase">ACAPELLA</span>
              </button>
            </CinemaToolHUD>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[9px]">
            <CinemaToolHUD
              title="CENTER SUPPRESS"
              en="Adjust Mid-Side phase cancellation depth for vocal suppression."
              bn="ভোকাল কতটুকু কাটবে বা রাখবে তা স্লাইডার দিয়ে সেট করুন।"
              accent="amber"
              blockWrapper
            >
              <div className="p-2 rounded-lg bg-black/50 border border-white/10">
                <div className="flex justify-between text-zinc-400 mb-1 tabular-nums font-black uppercase">
                  <span>SUPPRESS</span>
                  <span className="text-[#FFE066]">{vrSuppression}%</span>
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
            </CinemaToolHUD>

            <CinemaToolHUD
              title="BASS RETAIN"
              en="Preserve low-end sub frequencies below 180Hz during split."
              bn="ভোকাল কাটার সময় বেজ ও কিক ড্রাম ধরে রাখতে এটি বাড়ান।"
              accent="cyan"
              blockWrapper
            >
              <div className="p-2 rounded-lg bg-black/50 border border-white/10">
                <div className="flex justify-between text-zinc-400 mb-1 tabular-nums font-black uppercase">
                  <span>BASS &lt;180</span>
                  <span className="text-[#FFE066]">{vrBassRetain}%</span>
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
            </CinemaToolHUD>
          </div>

          <CinemaToolHUD
            title="EXTRACT WAV STEM"
            en="Run Web Audio DSP Mid-Side processor and render 16-bit WAV."
            bn="মিড-সাইড প্রসেসিং চালিয়ে আলাদা WAV স্টেম তৈরি করুন।"
            accent="amber"
            blockWrapper
          >
            <button
              type="button"
              disabled={!vrFile || vrProcessing}
              data-active="true"
              onClick={handleRunVocalRemover}
              className="w-full min-h-[44px] py-2 rounded-lg cinema-tile cinema-tile-amber disabled:opacity-40 font-black text-[10px] tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
            >
              {vrProcessing ? <RefreshCw className="w-4 h-4 animate-spin cinema-tile-icon" /> : <Zap className="w-4 h-4 cinema-tile-icon" />}
              <span>{vrProcessing ? 'SPLITTING...' : 'EXTRACT STEM'}</span>
            </button>
          </CinemaToolHUD>

          {vrResult && (
            <div className="p-2.5 rounded-lg bg-black/70 border border-emerald-500/30 space-y-2">
              <audio src={vrResult.wavUrl} controls className="w-full h-8" />
              <div className="grid grid-cols-2 gap-2">
                <CinemaToolHUD
                  title="BIND STEM TO SHOT"
                  en="Attach isolated stem directly to the active shot audio track."
                  bn="তৈরি করা স্টেমটি বর্তমান শটের অডিওতে যুক্ত করুন।"
                  accent="emerald"
                  blockWrapper
                >
                  <button
                    type="button"
                    onClick={() =>
                      bindAudioToTargetShot(
                        vrMode === 'instrumental' ? 'audioUrl' : 'voAudioUrl',
                        vrResult.wavUrl,
                        `${vrMode.toUpperCase()} STEM`
                      )
                    }
                    className="w-full min-h-[44px] px-2.5 py-1.5 rounded-lg cinema-tile cinema-tile-emerald text-[9px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 cinema-tile-icon" />
                    <span>BIND SHOT</span>
                  </button>
                </CinemaToolHUD>

                <CinemaToolHUD
                  title="DOWNLOAD WAV"
                  en="Save isolated stereo WAV stem locally."
                  bn="আলাদা করা অডিও ফাইল ডিভাইসে ডাউনলোড করুন।"
                  accent="amber"
                  blockWrapper
                >
                  <a
                    href={vrResult.wavUrl}
                    download={`handfilm-${vrMode}-stem.wav`}
                    className="w-full min-h-[44px] px-2.5 py-1.5 rounded-lg cinema-tile cinema-tile-amber text-[9px] font-black uppercase flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 cinema-tile-icon" />
                    <span>SAVE WAV</span>
                  </a>
                </CinemaToolHUD>
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
          <CinemaBadgeHeader
            icon={<Mic className="w-4 h-4 text-rose-400" />}
            label="VO BOOTH"
            accent="crimson"
            rightSlot={
              <span className="text-[9px] tabular-nums font-black text-[#FFE066]">
                {micPeakDb} dBFS
              </span>
            }
          />

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
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'podcast-crisp', label: 'PODCAST', en: 'Crisp podcast vocal curve with airy highs.', bn: 'স্পষ্ট ও ঝকঝকে পডকাস্ট কণ্ঠের জন্য চাপুন।' },
                { id: 'cinema-narrator', label: 'NARRATOR', en: 'Rich cinematic narrator presence EQ curve.', bn: 'গভীর সিনেমাটিক ন্যারেশন সাউন্ডের জন্য চাপুন।' },
                { id: 'radio-warm', label: 'RADIO WARM', en: 'Warm broadcast midrange EQ saturation.', bn: 'উষ্ণ রেডিও ব্রডকাস্ট টোনের জন্য চাপুন।' }
              ] as const
            ).map((eq) => (
              <CinemaToolHUD key={eq.id} title={`${eq.label} EQ`} en={eq.en} bn={eq.bn} accent="amber" blockWrapper>
                <button
                  type="button"
                  data-active={voiceEqPreset === eq.id ? 'true' : 'false'}
                  onClick={() => handleSelectVoiceEq(eq.id)}
                  className="w-full min-h-[44px] py-1.5 px-1.5 rounded-lg cinema-tile cinema-tile-amber flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                  <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
                    {eq.label}
                  </span>
                </button>
              </CinemaToolHUD>
            ))}
          </div>

          {/* Countdown & -12dB Auto Duck Toggles */}
          <div className="grid grid-cols-2 gap-2">
            <CinemaToolHUD
              title="3-2-1 STAGE SYNC"
              en="Play 3-second countdown and auto-start playback with mic."
              bn="৩-২-১ কাউন্টডাউন শেষে ভিডিও প্লে হয়ে ভয়েস রেকর্ড শুরু হবে।"
              accent="amber"
              blockWrapper
            >
              <button
                type="button"
                data-active={syncStageOnRec ? 'true' : 'false'}
                onClick={() => setSyncStageOnRec(!syncStageOnRec)}
                className="w-full min-h-[44px] p-2 rounded-lg cinema-tile cinema-tile-amber flex items-center justify-center gap-1.5 text-[9.5px] font-black uppercase cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 cinema-tile-icon" />
                <span>{syncStageOnRec ? '3-2-1 SYNC' : 'MANUAL'}</span>
              </button>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="-12DB AUTO-DUCK"
              en="Automatically lower music bus -12dB when voiceover speaks."
              bn="কথা বলার সময় ব্যাকগ্রাউন্ড মিউজিক অটোমেটিক ১২ ডিবি কমিয়ে দেয়।"
              accent="emerald"
              blockWrapper
            >
              <button
                type="button"
                data-active={autoDuck12Db ? 'true' : 'false'}
                onClick={handleToggleAutoDuck}
                className="w-full min-h-[44px] p-2 rounded-lg cinema-tile cinema-tile-emerald flex items-center justify-center gap-1.5 text-[9.5px] font-black uppercase cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 cinema-tile-icon" />
                <span>{autoDuck12Db ? '-12DB DUCK' : 'DUCK OFF'}</span>
              </button>
            </CinemaToolHUD>
          </div>

          {voError && (
            <div className="px-2.5 py-1.5 rounded bg-red-500/15 border border-red-500/40 text-red-300 text-[9px] font-bold uppercase">
              {voError}
            </div>
          )}

          <CinemaToolHUD
            title="RECORD VOICEOVER"
            en="Capture studio mic take directly onto the timeline booth."
            bn="লাইভ ভয়েসওভার রেকর্ড শুরু বা বন্ধ করতে চাপুন।"
            accent="crimson"
            blockWrapper
          >
            <button
              type="button"
              data-active={isRecordingVo || countdownNum !== null ? 'true' : 'false'}
              onClick={handleToggleRecordVo}
              className="w-full min-h-[44px] py-2.5 rounded-lg cinema-tile cinema-tile-crimson font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer"
            >
              {isRecordingVo ? (
                <>
                  <Square className="w-4 h-4 fill-current cinema-tile-icon" />
                  <span>STOP REC</span>
                </>
              ) : countdownNum !== null ? (
                <span>WAIT {countdownNum}...</span>
              ) : (
                <>
                  <Mic className="w-4 h-4 cinema-tile-icon" />
                  <span>RECORD VO</span>
                </>
              )}
            </button>
          </CinemaToolHUD>

          {(recordedVoUrl || targetShot?.voAudioUrl) && (
            <div className="p-2.5 rounded-lg bg-black/70 border border-white/10 space-y-2">
              <audio src={recordedVoUrl || targetShot?.voAudioUrl} controls className="w-full h-8" />
              {recordedVoUrl && (
                <CinemaToolHUD
                  title="BIND VO TAKE"
                  en="Assign captured microphone take to active shot voice track."
                  bn="রেকর্ড করা ভয়েসওভারটি বর্তমান শটে যুক্ত করতে চাপুন।"
                  accent="emerald"
                  blockWrapper
                >
                  <button
                    type="button"
                    onClick={() => bindAudioToTargetShot('voAudioUrl', recordedVoUrl, 'LIVE MIC VO')}
                    className="w-full min-h-[44px] py-1.5 rounded-lg cinema-tile cinema-tile-emerald text-[9.5px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 cinema-tile-icon" />
                    <span>BIND {shotBadge}</span>
                  </button>
                </CinemaToolHUD>
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
            <CinemaBadgeHeader
              icon={<Sparkles className="w-4 h-4 text-[#F59E0B]" />}
              label="GEMINI TTS"
              accent="amber"
              rightSlot={<span className="text-[9px] font-black text-zinc-400">BN · EN</span>}
            />

            <textarea
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              rows={2}
              placeholder="Script..."
              className="w-full bg-black/70 border border-white/10 focus:border-[#F59E0B] rounded-lg p-2 text-xs text-white outline-none resize-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Gemini Voice"
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value as any)}
                className="bg-black/80 border border-white/10 rounded px-2 py-1.5 text-[10px] font-bold text-amber-300 outline-none"
              >
                <option value="Kore">Kore · Firm</option>
                <option value="Puck">Puck · Crisp</option>
                <option value="Fenrir">Fenrir · Deep</option>
                <option value="Zephyr">Zephyr · Bright</option>
                <option value="Aoede">Aoede · Poetic</option>
              </select>
              <select
                aria-label="Delivery Style"
                value={ttsStyle}
                onChange={(e) => setTtsStyle(e.target.value as any)}
                className="bg-black/80 border border-white/10 rounded px-2 py-1.5 text-[10px] font-bold text-zinc-200 outline-none"
              >
                <option value="cinema-narrator">Narrator</option>
                <option value="bangla-poetic">Bangla Poetic</option>
                <option value="hype-trailer">Trailer</option>
                <option value="whisper">Whisper</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                aria-label="Vocal Emotion"
                data-testid="tts-emotion-select"
                value={ttsEmotion}
                onChange={(e) => setTtsEmotion(e.target.value as any)}
                className="bg-black/80 border border-white/10 rounded px-2 py-1.5 text-[10px] font-bold text-cyan-300 outline-none"
              >
                <option value="dramatic">Dramatic</option>
                <option value="neutral">Neutral</option>
                <option value="warm">Warm</option>
                <option value="intense">Intense</option>
                <option value="whisper">Whisper</option>
                <option value="poetic">Poetic</option>
              </select>

              <CinemaToolHUD
                title="VOCAL PITCH"
                en="Shift generated narration pitch from -12 to +12 semitones."
                bn="ভয়েসের টোন ভারী বা চিকন করতে সেমিটোন পিচ বদলান।"
                accent="amber"
                blockWrapper
              >
                <div className="flex items-center gap-2 bg-black/80 border border-white/10 rounded px-2 py-1.5">
                  <span className="text-[9px] font-black text-zinc-400 shrink-0">PITCH</span>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={1}
                    aria-label="Pitch Semitones"
                    value={ttsPitchSemitones}
                    onChange={(e) => setTtsPitchSemitones(Number(e.target.value))}
                    className="flex-1 accent-[#F59E0B] cursor-pointer"
                  />
                  <span className="text-[9px] text-amber-300 font-black tabular-nums w-8 text-right">
                    {ttsPitchSemitones > 0 ? `+${ttsPitchSemitones}` : ttsPitchSemitones}st
                  </span>
                </div>
              </CinemaToolHUD>
            </div>

            {ttsError && (
              <div className="px-2.5 py-1.5 rounded bg-red-500/15 border border-red-500/40 text-red-300 text-[9px] font-bold">
                {ttsError}
              </div>
            )}

            <CinemaToolHUD
              title="GENERATE VOICEOVER"
              en="Synthesize studio Bangla/English voiceover via Gemini Neural TTS."
              bn="লেখা থেকে সরাসরি AI ন্যারেশন ভয়েস তৈরি করতে চাপুন।"
              accent="crimson"
              blockWrapper
            >
              <button
                type="button"
                disabled={isGeneratingTts || !ttsText.trim()}
                data-active="true"
                onClick={handleGenerateTts}
                className="w-full min-h-[44px] py-2 rounded-lg cinema-tile cinema-tile-crimson disabled:opacity-40 font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGeneratingTts ? (
                  <RefreshCw className="w-4 h-4 animate-spin cinema-tile-icon" />
                ) : (
                  <Zap className="w-4 h-4 fill-current cinema-tile-icon" />
                )}
                <span>{isGeneratingTts ? 'SYNTHESIZING...' : 'GENERATE TTS'}</span>
              </button>
            </CinemaToolHUD>

            {ttsAudioUrl && (
              <div className="p-2 rounded-lg bg-black/70 border border-emerald-500/30 space-y-1.5">
                <audio
                  src={ttsAudioUrl}
                  controls
                  className="w-full h-8"
                  onPlay={(e) => {
                    e.currentTarget.playbackRate = Math.max(0.65, Math.min(1.5, Math.pow(2, ttsPitchSemitones / 12)));
                  }}
                />
                <CinemaToolHUD
                  title="BIND VOICEOVER"
                  en="Attach synthesized TTS clip onto active shot voiceover lane."
                  bn="তৈরি করা TTS ভয়েসটি বর্তমান শটের অডিও ট্র্যাকে বসান।"
                  accent="emerald"
                  blockWrapper
                >
                  <button
                    type="button"
                    onClick={() => bindAudioToTargetShot('voAudioUrl', ttsAudioUrl, `TTS (${ttsVoice} · ${ttsEmotion})`)}
                    className="w-full min-h-[44px] py-1.5 rounded-lg cinema-tile cinema-tile-emerald text-[9.5px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 cinema-tile-icon" />
                    <span>BIND VO</span>
                  </button>
                </CinemaToolHUD>
              </div>
            )}
          </div>

          {/* AI Foley & Built-In Soundscape Presets */}
          <div className="bg-[#0D0E12] border border-white/10 rounded-xl p-3 space-y-2.5">
            <CinemaBadgeHeader
              icon={<Music className="w-4 h-4 text-[#FFE066]" />}
              label="FOLEY SFX"
              accent="amber"
              rightSlot={<span className="text-[9px] font-black text-zinc-400">48KHZ WAV</span>}
            />

            <div className="flex gap-1.5">
              <input
                type="text"
                value={foleyPrompt}
                onChange={(e) => setFoleyPrompt(e.target.value)}
                placeholder="SFX prompt..."
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded bg-black/70 border border-white/10 focus:border-[#F59E0B] text-[10.5px] text-white outline-none"
              />
              <CinemaToolHUD
                title="AI FOLEY GENERATOR"
                en="Synthesize custom 48kHz sound effects from text description."
                bn="সাউন্ডের বর্ণনা লিখে কাস্টম SFX অডিও তৈরি করুন।"
                accent="amber"
              >
                <button
                  type="button"
                  disabled={isGeneratingFoley || !foleyPrompt.trim()}
                  data-active="true"
                  onClick={handleGenerateFoley}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg cinema-tile cinema-tile-amber disabled:opacity-40 font-black text-[9.5px] uppercase cursor-pointer shrink-0 whitespace-nowrap"
                >
                  {isGeneratingFoley ? 'DESIGNING...' : 'GEN SFX'}
                </button>
              </CinemaToolHUD>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {FOLEY_PRESETS.map((p) => (
                <CinemaToolHUD
                  key={p.id}
                  title={p.name.toUpperCase()}
                  en={`Synthesize ${p.name} 48kHz WAV foley preset immediately.`}
                  bn={`${p.name} সিনেমাটিক সাউন্ড এফেক্ট তৈরি করতে চাপুন।`}
                  accent="amber"
                  blockWrapper
                >
                  <button
                    type="button"
                    data-active={activeFoleyName === p.name ? 'true' : 'false'}
                    onClick={() => applyFoleyRecipe(p)}
                    className="w-full min-h-[44px] px-2 py-1.5 rounded-lg cinema-tile cinema-tile-amber text-[9px] font-black uppercase cursor-pointer truncate"
                  >
                    {p.name}
                  </button>
                </CinemaToolHUD>
              ))}
            </div>

            {foleyAudioUrl && (
              <div className="p-2 rounded-lg bg-black/70 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between text-[9px] text-amber-300 font-black uppercase">
                  <span>{activeFoleyName}</span>
                </div>
                <audio src={foleyAudioUrl} controls className="w-full h-8" />
                <CinemaToolHUD
                  title="BIND SFX"
                  en="Attach generated 48kHz Foley WAV to the active shot."
                  bn="তৈরি হওয়া সাউন্ড এফেক্ট বর্তমান শটে যুক্ত করতে চাপুন।"
                  accent="amber"
                  blockWrapper
                >
                  <button
                    type="button"
                    onClick={() => bindAudioToTargetShot('sfxAudioUrl', foleyAudioUrl, activeFoleyName || 'AI FOLEY')}
                    className="w-full min-h-[44px] py-1.5 rounded-lg cinema-tile cinema-tile-amber text-[9.5px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 cinema-tile-icon" />
                    <span>BIND SFX</span>
                  </button>
                </CinemaToolHUD>
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
                { stem: 'voice', label: 'VOICE', color: '#F59E0B', accent: 'amber' as const, pulse: () => multiTrackAudioBus.triggerVoiceTestPulse() },
                { stem: 'music', label: 'MUSIC', color: '#38BDF8', accent: 'cyan' as const, pulse: () => multiTrackAudioBus.triggerMusicBeatDrop() },
                { stem: 'sfx', label: 'SFX', color: '#10B981', accent: 'emerald' as const, pulse: () => multiTrackAudioBus.triggerSfxImpact() }
              ] as ReadonlyArray<{ stem: 'voice' | 'music' | 'sfx'; label: string; color: string; accent: 'amber' | 'cyan' | 'emerald'; pulse: () => void }>
            ).map(({ stem, label, color, accent, pulse }) => {
              const cfg = multiTrackAudioBus.getStemConfig(stem);
              const dbVal = multiTrackAudioBus.getStemDb(stem);
              const meter = telemetry[stem];

              return (
                <div
                  key={stem}
                  className="p-2.5 rounded-xl bg-[#0D0E12] border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-wider" style={{ color }}>
                      {label}
                    </span>
                    <CinemaToolHUD
                      title={`TEST ${label}`}
                      en={`Fire test pulse on ${label} bus stem.`}
                      bn={`${label} ট্র্যাকের সাউন্ড পরীক্ষা করতে চাপুন।`}
                      accent={accent}
                    >
                      <button
                        type="button"
                        onClick={pulse}
                        className="px-2 py-1 rounded cinema-tile cinema-tile-amber text-[8.5px] font-black uppercase cursor-pointer"
                      >
                        TEST
                      </button>
                    </CinemaToolHUD>
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
                    <div className="flex justify-between text-[8px] font-black text-zinc-400 tabular-nums">
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

                  <div className="grid grid-cols-2 gap-1.5">
                    <CinemaToolHUD title={`MUTE ${label}`} en={`Mute ${label} audio stem.`} bn={`${label} সাউন্ড মিউট করতে চাপুন।`} accent="crimson" blockWrapper>
                      <button
                        type="button"
                        data-active={cfg.isMuted ? 'true' : 'false'}
                        onClick={() => {
                          multiTrackAudioBus.toggleMute(stem);
                          setMixerTick((n) => n + 1);
                        }}
                        className="w-full py-1 rounded cinema-tile cinema-tile-crimson text-[9px] font-black cursor-pointer"
                      >
                        M
                      </button>
                    </CinemaToolHUD>
                    <CinemaToolHUD title={`SOLO ${label}`} en={`Solo ${label} audio stem.`} bn={`শুধু ${label} ট্র্যাক শুনতে চাপুন।`} accent="amber" blockWrapper>
                      <button
                        type="button"
                        data-active={cfg.isSoloed ? 'true' : 'false'}
                        onClick={() => {
                          multiTrackAudioBus.toggleSolo(stem);
                          setMixerTick((n) => n + 1);
                        }}
                        className="w-full py-1 rounded cinema-tile cinema-tile-amber text-[9px] font-black cursor-pointer"
                      >
                        S
                      </button>
                    </CinemaToolHUD>
                  </div>

                  {/* Stereo Pan */}
                  <div>
                    <div className="flex justify-between text-[8px] font-black text-zinc-400 tabular-nums">
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
                  <div className="space-y-1 pt-1 border-t border-white/10 text-[8px] font-black text-zinc-400">
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

          {/* -14 LUFS Loudness Normalization + Noise Reduction DSP Strip */}
          <div className="p-2.5 rounded-xl bg-[#0D0E12] border border-white/10 grid grid-cols-2 gap-2">
            <CinemaToolHUD
              title="-14 LUFS NORMALIZE"
              en="Lock broadcast -14 LUFS loudness balancing across VO & music."
              bn="ব্রডকাস্ট ও রিলসের জন্য অডিও লেভেল -১৪ LUFS-এ ব্যালেন্স করুন।"
              accent="cyan"
              blockWrapper
            >
              <button
                type="button"
                data-testid="toggle-lufs14-btn"
                data-active={normalizeLufs14 ? 'true' : 'false'}
                onClick={() => toggleShotAudioFx('normalizeLufs14')}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg cinema-tile cinema-tile-cyan text-[9.5px] font-black uppercase flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 cinema-tile-icon" />
                  <span>-14 LUFS</span>
                </span>
                <span className="text-[9px]">{normalizeLufs14 ? 'ON' : 'OFF'}</span>
              </button>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="NOISE REDUCTION"
              en="Apply low-cut & vocal denoise DSP filter on active voice lane."
              bn="ভয়েসের ব্যাকগ্রাউন্ড নয়েজ ও হিশ সাউন্ড কমাতে এটি চালু করুন।"
              accent="emerald"
              blockWrapper
            >
              <button
                type="button"
                data-testid="toggle-denoise-btn"
                data-active={noiseReduction ? 'true' : 'false'}
                onClick={() => toggleShotAudioFx('noiseReduction')}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg cinema-tile cinema-tile-emerald text-[9.5px] font-black uppercase flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <AudioWaveform className="w-3.5 h-3.5 cinema-tile-icon" />
                  <span>DENOISE</span>
                </span>
                <span className="text-[9px]">{noiseReduction ? 'ON' : 'OFF'}</span>
              </button>
            </CinemaToolHUD>
          </div>

          {/* Procedural Sub-Bass Drone & Master Limiter Bar */}
          <div className="p-2.5 rounded-xl bg-[#0D0E12] border border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[9px] font-black">
              <Radio className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-zinc-300 uppercase">SUB DRONE</span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 tabular-nums">
                -0.5dB
              </span>
            </div>
            <CinemaToolHUD
              title="SUB-BASS DRONE"
              en="Toggle generative 36–48Hz anamorphic cinema drone synthesizer."
              bn="সিনেমাটিক ৩৬–৪৮ হার্টজ সাব-বেজ ড্রোন চালু বা বন্ধ করুন।"
              accent="amber"
            >
              <button
                type="button"
                data-active={dronePlaying ? 'true' : 'false'}
                onClick={toggleDroneSynth}
                className="min-h-[44px] px-3 py-1.5 rounded-lg cinema-tile cinema-tile-amber text-[9.5px] font-black uppercase flex items-center gap-1.5 cursor-pointer"
              >
                {dronePlaying ? <Pause className="w-3.5 h-3.5 cinema-tile-icon" /> : <Play className="w-3.5 h-3.5 cinema-tile-icon" />}
                <span>{dronePlaying ? 'STOP DRONE' : 'PLAY DRONE'}</span>
              </button>
            </CinemaToolHUD>
          </div>
        </div>
      )}
    </div>
  );
};

