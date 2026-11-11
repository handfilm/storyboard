/**
 * @file /src/components/audio/StudioMasteringDrawer.tsx
 * @description Studio Audio Mastering & Multi-Track Waveform Bus Console Drawer.
 * Features:
 * - 4-Channel Precision VU Meter Ladders (Voice, Music, SFX, Master) with peak hold
 * - Discrete Stem Gain Faders (-60dB to +6dB) with Solo (S) & Mute (M)
 * - Broadcast LUFS Metering (-14 LUFS target, Momentary, Short-Term, True Peak dBTP)
 * - Speech Clarity EQ Boost (+2.5dB @ 3.2kHz) Toggle
 * - Auto-Ducking (-4dB when voice active) Toggle
 * - Master Brickwall Limiter (-0.5dB Ceiling)
 * - Mastering Presets (RAP DROPS, CINEMATIC DOCU, COMMERCIAL LOUD, FLAT BYPASS)
 * - Audition Sound Generators (Vocal Cadence, 808 Drop, Cinematic Impact)
 */

import React, { useState, useEffect, useRef } from 'react';
import { multiTrackAudioBus, StemType, MultiTrackBusTelemetry } from '../../services/multiTrackAudioBus';
import { audioMasteringEngine, MASTERING_PRESETS, MasteringPresetId, LufsAnalysis } from '../../services/audioMasteringEngine';
import {
  X,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  ShieldAlert,
  Mic,
  Music,
  Zap,
  Play,
  RotateCcw,
  Activity,
  Radio
} from 'lucide-react';

interface StudioMasteringDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudioMasteringDrawer: React.FC<StudioMasteringDrawerProps> = ({
  isOpen,
  onClose
}) => {
  const [activePreset, setActivePreset] = useState<MasteringPresetId>('CINEMATIC_DOCU');
  const [clarityEnabled, setClarityEnabled] = useState(true);
  const [duckingEnabled, setDuckingEnabled] = useState(true);
  const [limiterEnabled, setLimiterEnabled] = useState(true);

  // Stems dB levels
  const [voiceDb, setVoiceDb] = useState(0);
  const [musicDb, setMusicDb] = useState(-1.5);
  const [sfxDb, setSfxDb] = useState(-1.0);
  const [masterDb, setMasterDb] = useState(0);

  // Mute / Solo states
  const [mutes, setMutes] = useState<Record<StemType, boolean>>({
    voice: false,
    music: false,
    sfx: false,
    master: false
  });
  const [solos, setSolos] = useState<Record<StemType, boolean>>({
    voice: false,
    music: false,
    sfx: false,
    master: false
  });

  // Telemetry state
  const [telemetry, setTelemetry] = useState<MultiTrackBusTelemetry>({
    voice: { rms: 0, peak: 0, db: -60, isClipping: false },
    music: { rms: 0, peak: 0, db: -60, isClipping: false },
    sfx: { rms: 0, peak: 0, db: -60, isClipping: false },
    master: { rms: 0, peak: 0, db: -60, isClipping: false },
    isDuckingActive: false,
    duckingDb: 0
  });

  const [lufs, setLufs] = useState<LufsAnalysis>({
    momentaryLufs: -60,
    shortTermLufs: -60,
    integratedLufs: -14.0,
    truePeakDb: -60,
    targetDeltaDb: 0,
    status: 'OPTIMAL'
  });

  // RAF polling loop for VU meters
  useEffect(() => {
    if (!isOpen) return;

    // Ensure audio bus is initialized
    multiTrackAudioBus.init();

    let animId: number;
    const poll = () => {
      const telem = multiTrackAudioBus.getTelemetry();
      setTelemetry(telem);

      const lufsAnalysis = audioMasteringEngine.computeLufsTelemetry(
        telem.master.rms,
        telem.master.peak
      );
      setLufs(lufsAnalysis);

      animId = requestAnimationFrame(poll);
    };

    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [isOpen]);

  // Sync state on preset selection
  const handleSelectPreset = (presetId: MasteringPresetId) => {
    setActivePreset(presetId);
    audioMasteringEngine.applyPreset(presetId);

    const preset = MASTERING_PRESETS[presetId];
    setClarityEnabled(preset.clarityDb > 0);
    setDuckingEnabled(Math.abs(preset.duckingDb) > 0);
    setVoiceDb(multiTrackAudioBus.getStemDb('voice'));
    setMusicDb(multiTrackAudioBus.getStemDb('music'));
    setSfxDb(multiTrackAudioBus.getStemDb('sfx'));
    setMasterDb(multiTrackAudioBus.getStemDb('master'));
  };

  const handleToggleClarity = () => {
    const next = !clarityEnabled;
    setClarityEnabled(next);
    multiTrackAudioBus.setClarityEnabled(next);
  };

  const handleToggleDucking = () => {
    const next = !duckingEnabled;
    setDuckingEnabled(next);
    multiTrackAudioBus.setDuckingEnabled(next);
  };

  const handleToggleLimiter = () => {
    const next = !limiterEnabled;
    setLimiterEnabled(next);
    multiTrackAudioBus.setLimiterEnabled(next);
  };

  const handleGainChange = (stem: StemType, db: number) => {
    multiTrackAudioBus.setStemDb(stem, db);
    if (stem === 'voice') setVoiceDb(db);
    else if (stem === 'music') setMusicDb(db);
    else if (stem === 'sfx') setSfxDb(db);
    else if (stem === 'master') setMasterDb(db);
  };

  const handleToggleMute = (stem: StemType) => {
    const next = multiTrackAudioBus.toggleMute(stem);
    setMutes(prev => ({ ...prev, [stem]: next }));
  };

  const handleToggleSolo = (stem: StemType) => {
    const next = multiTrackAudioBus.toggleSolo(stem);
    setSolos(prev => ({ ...prev, [stem]: next }));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#0A0B10]/95 backdrop-blur-2xl border-l border-[#F5A623]/30 shadow-2xl flex flex-col font-mono text-xs text-white overflow-hidden animate-in slide-in-from-right duration-200"
    >
      {/* Top Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[2px] bg-[#F5A623]/20 border border-[#F5A623]/50 flex items-center justify-center text-[#F5A623]">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wider text-white">STUDIO AUDIO MASTERING</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-[2px] bg-[#F5A623]/20 border border-[#F5A623]/40 text-[#FFE066] font-bold">
                EBU R128
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">3-Tier Discrete Bus • Limiter (-0.5dB) • ITU-R BS.1770 LUFS</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-[2px] hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Close Mastering Console"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {/* Section 1: Mastering Presets */}
        <div className="p-3 bg-white/5 border border-white/10 rounded-[2px] space-y-2">
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span className="font-bold uppercase tracking-wider text-white/80">Mastering Presets</span>
            <span className="text-[#F5A623]">{MASTERING_PRESETS[activePreset].name}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(MASTERING_PRESETS) as MasteringPresetId[]).map((pid) => {
              const p = MASTERING_PRESETS[pid];
              const isSelected = activePreset === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => handleSelectPreset(pid)}
                  className={`p-2 rounded-[2px] text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-[#F5A623]/20 border-[#F5A623] text-[#FFE066] shadow-[0_0_12px_rgba(245,166,35,0.25)]'
                      : 'bg-black/40 border-white/10 hover:border-white/25 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10.5px] truncate">{p.name.split('//')[0]}</span>
                    <span className="text-[9px] font-bold opacity-80">{p.targetLufs} LUFS</span>
                  </div>
                  <span className="text-[8.5px] text-zinc-400 truncate">{p.tagline}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Broadcast LUFS Metering Bar */}
        <div className="p-3.5 bg-black/60 border border-white/15 rounded-[2px] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#F5A623]" />
              <span className="font-bold text-[11px] text-white">BROADCAST LOUDNESS RADAR</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-[2px] ${
                lufs.status === 'CLIPPING'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
                  : lufs.status === 'TOO_HOT'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
              }`}>
                {lufs.status}
              </span>
              <button
                type="button"
                onClick={() => audioMasteringEngine.resetLufsAccumulator()}
                className="text-zinc-500 hover:text-zinc-300 p-0.5"
                title="Reset Integrated LUFS Calculation"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 bg-white/5 border border-white/10 rounded-[2px]">
              <span className="text-[8.5px] text-zinc-400 block">MOMENTARY</span>
              <span className="text-xs font-bold text-white tabular-nums">{lufs.momentaryLufs.toFixed(1)}</span>
              <span className="text-[8px] text-zinc-500 block">LUFS</span>
            </div>
            <div className="p-2 bg-white/5 border border-white/10 rounded-[2px]">
              <span className="text-[8.5px] text-zinc-400 block">SHORT-TERM</span>
              <span className="text-xs font-bold text-white tabular-nums">{lufs.shortTermLufs.toFixed(1)}</span>
              <span className="text-[8px] text-zinc-500 block">LUFS (3s)</span>
            </div>
            <div className="p-2 bg-[#F5A623]/10 border border-[#F5A623]/40 rounded-[2px]">
              <span className="text-[8.5px] text-[#FFE066] block font-bold">INTEGRATED</span>
              <span className="text-sm font-bold text-[#FFE066] tabular-nums">{lufs.integratedLufs.toFixed(1)}</span>
              <span className="text-[8px] text-zinc-400 block">TARGET -14</span>
            </div>
            <div className={`p-2 border rounded-[2px] ${
              lufs.truePeakDb >= -0.3
                ? 'bg-rose-950/40 border-rose-500 text-rose-300'
                : 'bg-white/5 border-white/10 text-white'
            }`}>
              <span className="text-[8.5px] text-zinc-400 block">TRUE PEAK</span>
              <span className="text-xs font-bold tabular-nums">{lufs.truePeakDb.toFixed(1)}</span>
              <span className="text-[8px] text-zinc-500 block">dBTP</span>
            </div>
          </div>
        </div>

        {/* Section 3: Hardware DSP Processing Switches */}
        <div className="grid grid-cols-3 gap-2">
          {/* Voice Clarity EQ */}
          <button
            type="button"
            onClick={handleToggleClarity}
            className={`p-2.5 rounded-[2px] border text-left flex flex-col gap-1 transition-all cursor-pointer ${
              clarityEnabled
                ? 'bg-[#F5A623]/20 border-[#F5A623] text-[#FFE066]'
                : 'bg-black/40 border-white/10 text-zinc-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <Mic className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold">{clarityEnabled ? 'ON' : 'OFF'}</span>
            </div>
            <span className="font-bold text-[10px]">VOICE CLARITY</span>
            <span className="text-[8.5px] opacity-80">+2.5dB @ 3.2kHz</span>
          </button>

          {/* Auto-Ducking */}
          <button
            type="button"
            onClick={handleToggleDucking}
            className={`p-2.5 rounded-[2px] border text-left flex flex-col gap-1 transition-all cursor-pointer ${
              duckingEnabled
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-black/40 border-white/10 text-zinc-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <Music className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold">{duckingEnabled ? (telemetry.isDuckingActive ? 'DUCKING' : 'READY') : 'OFF'}</span>
            </div>
            <span className="font-bold text-[10px]">AUTO-DUCKING</span>
            <span className="text-[8.5px] opacity-80">-4.0dB dip on voice</span>
          </button>

          {/* Master Limiter */}
          <button
            type="button"
            onClick={handleToggleLimiter}
            className={`p-2.5 rounded-[2px] border text-left flex flex-col gap-1 transition-all cursor-pointer ${
              limiterEnabled
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                : 'bg-black/40 border-white/10 text-zinc-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold">{limiterEnabled ? 'PROTECTED' : 'BYPASS'}</span>
            </div>
            <span className="font-bold text-[10px]">PEAK LIMITER</span>
            <span className="text-[8.5px] opacity-80">-0.5dB Ceiling</span>
          </button>
        </div>

        {/* Section 4: 4-Channel Mixing Console (Faders & Dual Stereo VU Ladders) */}
        <div className="p-3.5 bg-black/60 border border-white/15 rounded-[2px] space-y-3">
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span className="font-bold text-white uppercase tracking-wider">3-Tier Mixing Bus Strips</span>
            <span>0dB UNITY = 100%</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {/* CHANNEL 1: VOICE */}
            <ChannelStrip
              label="VOICE"
              subLabel="Rap / Dialogue"
              color="#F5A623"
              db={voiceDb}
              levels={telemetry.voice}
              isMuted={mutes.voice}
              isSoloed={solos.voice}
              onDbChange={(db) => handleGainChange('voice', db)}
              onToggleMute={() => handleToggleMute('voice')}
              onToggleSolo={() => handleToggleSolo('voice')}
            />

            {/* CHANNEL 2: MUSIC */}
            <ChannelStrip
              label="MUSIC"
              subLabel="Beat / Drone"
              color="#38BDF8"
              db={musicDb}
              levels={telemetry.music}
              isMuted={mutes.music}
              isSoloed={solos.music}
              onDbChange={(db) => handleGainChange('music', db)}
              onToggleMute={() => handleToggleMute('music')}
              onToggleSolo={() => handleToggleSolo('music')}
            />

            {/* CHANNEL 3: SFX */}
            <ChannelStrip
              label="SFX"
              subLabel="Hits / Risers"
              color="#FB923C"
              db={sfxDb}
              levels={telemetry.sfx}
              isMuted={mutes.sfx}
              isSoloed={solos.sfx}
              onDbChange={(db) => handleGainChange('sfx', db)}
              onToggleMute={() => handleToggleMute('sfx')}
              onToggleSolo={() => handleToggleSolo('sfx')}
            />

            {/* CHANNEL 4: MASTER */}
            <ChannelStrip
              label="MASTER"
              subLabel="Limit: -0.5dB"
              color="#10B981"
              db={masterDb}
              levels={telemetry.master}
              isMuted={mutes.master}
              isSoloed={solos.master}
              onDbChange={(db) => handleGainChange('master', db)}
              onToggleMute={() => handleToggleMute('master')}
              onToggleSolo={() => handleToggleSolo('master')}
              isMaster={true}
            />
          </div>
        </div>

        {/* Section 5: Real-Time Audio Audition / Sound Generators */}
        <div className="p-3 bg-white/5 border border-white/10 rounded-[2px] space-y-2">
          <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
            Stem Audition Pulse Generators
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => multiTrackAudioBus.triggerVoiceTestPulse()}
              className="px-2 py-1.5 rounded-[2px] bg-black/60 hover:bg-[#F5A623]/25 border border-[#F5A623]/40 text-[#FFE066] text-[9.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Mic className="w-3 h-3" />
              <span>Voice Pulse</span>
            </button>
            <button
              type="button"
              onClick={() => multiTrackAudioBus.triggerMusicBeatDrop()}
              className="px-2 py-1.5 rounded-[2px] bg-black/60 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 text-[9.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Music className="w-3 h-3" />
              <span>808 Drop</span>
            </button>
            <button
              type="button"
              onClick={() => multiTrackAudioBus.triggerSfxImpact()}
              className="px-2 py-1.5 rounded-[2px] bg-black/60 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 text-[9.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Zap className="w-3 h-3" />
              <span>Cinema Hit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Channel Strip with LED VU Meter and Gain Fader
interface ChannelStripProps {
  label: string;
  subLabel: string;
  color: string;
  db: number;
  levels: { rms: number; peak: number; db: number; isClipping: boolean };
  isMuted: boolean;
  isSoloed: boolean;
  onDbChange: (db: number) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  isMaster?: boolean;
}

const ChannelStrip: React.FC<ChannelStripProps> = ({
  label,
  subLabel,
  color,
  db,
  levels,
  isMuted,
  isSoloed,
  onDbChange,
  onToggleMute,
  onToggleSolo,
  isMaster = false
}) => {
  // Map dB (-60 to +6) to 0-100% height
  const meterHeightPercent = Math.max(0, Math.min(100, ((levels.db + 60) / 66) * 100));

  return (
    <div className="flex flex-col items-center bg-[#0C0D12] border border-white/10 rounded-[2px] p-2 gap-2 select-none">
      {/* Strip Label */}
      <div className="text-center w-full">
        <span className="font-bold text-[10px] block truncate" style={{ color }}>{label}</span>
        <span className="text-[7.5px] text-zinc-500 block truncate">{subLabel}</span>
      </div>

      {/* Mute & Solo Buttons */}
      {!isMaster ? (
        <div className="flex items-center gap-1 w-full justify-center">
          <button
            type="button"
            onClick={onToggleMute}
            className={`w-5 h-5 rounded-[2px] font-bold text-[9px] flex items-center justify-center transition-colors cursor-pointer ${
              isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20 text-zinc-400'
            }`}
            title="Mute Channel"
          >
            M
          </button>
          <button
            type="button"
            onClick={onToggleSolo}
            className={`w-5 h-5 rounded-[2px] font-bold text-[9px] flex items-center justify-center transition-colors cursor-pointer ${
              isSoloed ? 'bg-amber-400 text-black' : 'bg-white/10 hover:bg-white/20 text-zinc-400'
            }`}
            title="Solo Channel"
          >
            S
          </button>
        </div>
      ) : (
        <div className="h-5 flex items-center justify-center text-[8px] text-emerald-400 font-bold">
          [ MASTER ]
        </div>
      )}

      {/* Vertical Meter & Slider Pair */}
      <div className="flex items-center justify-center gap-2 h-36 my-1">
        {/* LED VU Meter Column */}
        <div className="w-3.5 h-full bg-black/90 rounded-[2px] border border-white/15 overflow-hidden flex flex-col-reverse relative p-0.5">
          <div
            className={`w-full transition-all duration-75 rounded-[1px] ${
              levels.isClipping
                ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                : levels.db > -3
                ? 'bg-amber-400'
                : 'bg-emerald-500'
            }`}
            style={{ height: `${meterHeightPercent}%` }}
          />
          {/* Peak Clip Indicator at Top */}
          {levels.isClipping && (
            <div className="absolute top-0 inset-x-0 h-1.5 bg-rose-500 animate-ping" />
          )}
        </div>

        {/* Vertical Gain Slider */}
        <input
          type="range"
          min="-60"
          max="6"
          step="0.5"
          value={db}
          onChange={(e) => onDbChange(parseFloat(e.target.value))}
          className="h-full w-4 appearance-none bg-[#1A1B24] rounded cursor-pointer accent-[#F5A623] [writing-mode:vertical-lr] [direction:rtl]"
          aria-label={`${label} Gain`}
        />
      </div>

      {/* Numeric dB Readout */}
      <div className="text-center w-full bg-white/5 py-0.5 rounded-[2px] border border-white/10">
        <span className="text-[9.5px] font-bold tabular-nums" style={{ color: db > 0 ? '#FFE066' : 'white' }}>
          {db <= -60 ? '-INF' : `${db > 0 ? '+' : ''}${db.toFixed(1)}`}
        </span>
        <span className="text-[7.5px] text-zinc-500 block">dB</span>
      </div>
    </div>
  );
};
