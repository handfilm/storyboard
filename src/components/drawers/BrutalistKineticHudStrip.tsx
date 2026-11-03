/**
 * @file /src/components/drawers/BrutalistKineticHudStrip.tsx
 * @description Minimalist Brutalist Dark Console Control Strip for the Autonomous
 * Kinetic Typography & 3D Depth Occlusion Engine.
 *
 * Exposes:
 * - [ LAYER: BEHIND SUBJECT / FOREGROUND ]
 * - [ AUDIO PUNCH: KICK / VOCAL / OFF ]
 * - [ PRESET: RAP CHOPPER / AD TITAN / MINIMAL ]
 * - [ IMPACT : 0.0 to 2.0 ] physics normalization slider + client-side audio buffer ingest
 */

import React, { useRef, useState } from 'react';
import { Layers, Activity, Type, Upload, Zap } from 'lucide-react';
import { useStudioStore } from '../../core/store';
import { DepthLayerMode } from '../../services/depthOcclusionService';
import { AudioPunchMode, transientPunchEngine } from '../../services/transientPunchEngine';
import { AutonomousKineticPreset } from '../../services/kineticTypographyStyles';

export interface BrutalistKineticHudStripProps {
  compact?: boolean;
  className?: string;
}

export const BrutalistKineticHudStrip: React.FC<BrutalistKineticHudStripProps> = ({
  compact = false,
  className = ''
}) => {
  const kineticOcclusion = useStudioStore((s) => s.kineticOcclusion);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const isAudioMuted = useStudioStore((s) => s.isAudioMuted);
  const setKineticOcclusionEnabled = useStudioStore((s) => s.setKineticOcclusionEnabled);
  const setDepthLayerMode = useStudioStore((s) => s.setDepthLayerMode);
  const setAudioPunchMode = useStudioStore((s) => s.setAudioPunchMode);
  const setAutonomousKineticPreset = useStudioStore((s) => s.setAutonomousKineticPreset);
  const setKineticImpact = useStudioStore((s) => s.setKineticImpact);

  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const [loadedAudioLabel, setLoadedAudioLabel] = useState<string | null>(null);

  const handleSelectLayer = (mode: DepthLayerMode) => {
    if (!kineticOcclusion.enabled) {
      setKineticOcclusionEnabled(true);
    }
    setDepthLayerMode(mode);
  };

  const handleSelectPunch = (mode: AudioPunchMode) => {
    if (!kineticOcclusion.enabled) {
      setKineticOcclusionEnabled(true);
    }
    setAudioPunchMode(mode);
    if (mode === 'KICK') {
      transientPunchEngine.emitKickPunch(0.9);
    } else if (mode === 'VOCAL') {
      transientPunchEngine.emitVocalHit(0.92);
    }
  };

  const handleSelectPreset = (preset: AutonomousKineticPreset) => {
    if (!kineticOcclusion.enabled) {
      setKineticOcclusionEnabled(true);
    }
    setAutonomousKineticPreset(preset);
    if (preset === 'CHOPPER_RAP_PUNCH') {
      transientPunchEngine.emitVocalHit(0.92);
    } else if (preset === 'COMMERCIAL_TITAN_DROP') {
      transientPunchEngine.emitKickPunch(0.8);
    }
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await transientPunchEngine.loadTimelineAudio(file, {
        autoStart: isPlaying && kineticOcclusion.audioPunchMode !== 'OFF',
        muted: isAudioMuted
      });
      setLoadedAudioLabel(file.name.slice(0, 18));
    } catch {
      setLoadedAudioLabel(null);
    }
  };

  const presetShortLabel =
    kineticOcclusion.preset === 'CHOPPER_RAP_PUNCH'
      ? 'RAP CHOPPER'
      : kineticOcclusion.preset === 'COMMERCIAL_TITAN_DROP'
      ? 'AD TITAN'
      : 'MINIMAL';

  const layerShortLabel =
    kineticOcclusion.layerMode === 'BEHIND_SUBJECT' ? 'BEHIND SUBJECT' : 'FOREGROUND';

  return (
    <div
      className={`group/hud relative bg-[#07080C] hover:bg-[#0B0D14] focus-within:bg-[#0B0D14] border border-[#272732] hover:border-[#F5A623]/60 focus-within:border-[#F5A623]/60 rounded-[2px] font-mono text-[10px] text-[#EDEDED] tabular-nums select-none transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        compact ? 'p-2' : 'p-3'
      } ${className}`}
    >
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioFileUpload}
        className="hidden"
      />

      {/* Top Brutalist Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers className="w-3 h-3 text-[#F5A623] shrink-0" />
          <span className="font-bold tracking-widest uppercase text-[#F5A623] truncate">
            [ 3D OCCLUSION // KINETIC ENGINE ]
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden sm:inline text-[9px] text-zinc-500 group-hover/hud:text-zinc-300 transition-colors duration-150">
            {layerShortLabel} / {kineticOcclusion.audioPunchMode} / {presetShortLabel}
          </span>
          <button
            type="button"
            onClick={() => setKineticOcclusionEnabled(!kineticOcclusion.enabled)}
            className={`px-1.5 py-0.5 rounded-[2px] border text-[9px] font-bold tracking-wider uppercase cursor-pointer transition-colors duration-150 ${
              kineticOcclusion.enabled
                ? 'bg-[#F5A623] text-black border-[#F5A623]'
                : 'bg-black text-zinc-400 border-[#272732] hover:text-white hover:border-zinc-500'
            }`}
            title="Toggle Autonomous 3-Layer Offscreen Canvas Occlusion Compositor"
          >
            {kineticOcclusion.enabled ? 'ACTIVE' : 'BYPASS'}
          </button>
        </div>
      </div>

      {/* Core Brutalist Control Matrix */}
      <div className="pt-2 flex flex-col gap-1.5">
        {/* 1. [ LAYER: BEHIND SUBJECT / FOREGROUND ] */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 bg-black/50 border border-white/5 group-hover/hud:border-white/10 px-2 py-1 rounded-[2px] transition-colors duration-150">
          <span className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-1">
            <span>[ LAYER:</span>
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => handleSelectLayer('BEHIND_SUBJECT')}
              className={`px-2 py-0.5 rounded-[2px] border text-[9px] font-bold tracking-wider uppercase cursor-pointer transition-all duration-150 ${
                kineticOcclusion.layerMode === 'BEHIND_SUBJECT'
                  ? 'bg-[#F5A623] text-black border-[#F5A623]'
                  : 'bg-[#0D0F16] text-zinc-400 border-[#272732] hover:text-white hover:border-zinc-500'
              }`}
            >
              BEHIND SUBJECT
            </button>
            <span className="text-zinc-600">/</span>
            <button
              type="button"
              onClick={() => handleSelectLayer('FOREGROUND')}
              className={`px-2 py-0.5 rounded-[2px] border text-[9px] font-bold tracking-wider uppercase cursor-pointer transition-all duration-150 ${
                kineticOcclusion.layerMode === 'FOREGROUND'
                  ? 'bg-[#EDEDED] text-[#07080C] border-[#EDEDED]'
                  : 'bg-[#0D0F16] text-zinc-400 border-[#272732] hover:text-white hover:border-zinc-500'
              }`}
            >
              FOREGROUND
            </button>
            <span className="text-[9px] font-bold text-zinc-400">]</span>
          </div>
        </div>

        {/* 2. [ AUDIO PUNCH: KICK / VOCAL / OFF ] */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 bg-black/50 border border-white/5 group-hover/hud:border-white/10 px-2 py-1 rounded-[2px] transition-colors duration-150">
          <span className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-1">
            <Activity className="w-2.5 h-2.5 text-[#F5A623]" />
            <span>[ AUDIO PUNCH:</span>
          </span>
          <div className="flex items-center gap-1 ml-auto">
            {(['KICK', 'VOCAL', 'OFF'] as const).map((mode, idx) => {
              const isSelected = kineticOcclusion.audioPunchMode === mode;
              return (
                <React.Fragment key={mode}>
                  {idx > 0 && <span className="text-zinc-600">/</span>}
                  <button
                    type="button"
                    onClick={() => handleSelectPunch(mode)}
                    className={`px-2 py-0.5 rounded-[2px] border text-[9px] font-bold tracking-wider uppercase cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? mode === 'OFF'
                          ? 'bg-zinc-300 text-black border-zinc-300'
                          : 'bg-[#F5A623] text-black border-[#F5A623]'
                        : 'bg-[#0D0F16] text-zinc-400 border-[#272732] hover:text-white hover:border-zinc-500'
                    }`}
                  >
                    {mode}
                  </button>
                </React.Fragment>
              );
            })}
            <span className="text-[9px] font-bold text-zinc-400">]</span>
          </div>
        </div>

        {/* 3. [ PRESET: RAP CHOPPER / AD TITAN / MINIMAL ] */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 bg-black/50 border border-white/5 group-hover/hud:border-white/10 px-2 py-1 rounded-[2px] transition-colors duration-150">
          <span className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-1">
            <Type className="w-2.5 h-2.5 text-[#F5A623]" />
            <span>[ PRESET:</span>
          </span>
          <div className="flex items-center gap-1 ml-auto">
            {(
              [
                { id: 'CHOPPER_RAP_PUNCH', label: 'RAP CHOPPER' },
                { id: 'COMMERCIAL_TITAN_DROP', label: 'AD TITAN' },
                { id: 'MINIMAL', label: 'MINIMAL' }
              ] as const
            ).map((opt, idx) => {
              const isSelected = kineticOcclusion.preset === opt.id;
              return (
                <React.Fragment key={opt.id}>
                  {idx > 0 && <span className="text-zinc-600">/</span>}
                  <button
                    type="button"
                    onClick={() => handleSelectPreset(opt.id)}
                    className={`px-2 py-0.5 rounded-[2px] border text-[9px] font-bold tracking-wider uppercase cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-[#F5A623] text-black border-[#F5A623]'
                        : 'bg-[#0D0F16] text-zinc-400 border-[#272732] hover:text-white hover:border-zinc-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                </React.Fragment>
              );
            })}
            <span className="text-[9px] font-bold text-zinc-400">]</span>
          </div>
        </div>
      </div>

      {/* Hover-Triggered Physics Impact Normalization & Audio Buffer Strip */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          compact
            ? 'max-h-0 opacity-0 group-hover/hud:max-h-28 group-hover/hud:opacity-100 group-hover/hud:mt-2 group-focus-within/hud:max-h-28 group-focus-within/hud:opacity-100 group-focus-within/hud:mt-2'
            : 'max-h-28 opacity-85 group-hover/hud:opacity-100 mt-2'
        }`}
      >
        <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
          {/* [ IMPACT : 0.0 to 2.0 ] Slider */}
          <div className="flex items-center gap-2.5">
            <label
              htmlFor={compact ? 'kinetic-impact-compact' : 'kinetic-impact-drawer'}
              className="text-[9px] font-bold tracking-widest text-[#F5A623] uppercase shrink-0"
            >
              [ IMPACT : {kineticOcclusion.impact.toFixed(2)} ]
            </label>
            <input
              id={compact ? 'kinetic-impact-compact' : 'kinetic-impact-drawer'}
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={kineticOcclusion.impact}
              onChange={(e) => setKineticImpact(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-800 accent-[#F5A623] cursor-pointer rounded-[1px]"
            />
            <span className="text-[8.5px] text-zinc-500 shrink-0">0.0–2.0</span>
          </div>

          {/* Client-Side AudioBufferSourceNode Ingest & Transient Audition Triggers */}
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              className="px-2 py-0.5 rounded-[2px] bg-[#0D0F16] hover:bg-white/10 border border-[#272732] hover:border-[#F5A623]/50 text-[8.5px] text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors duration-150 truncate"
              title="Decode local audio file into client-side Web Audio API AudioBufferSourceNode"
            >
              <Upload className="w-2.5 h-2.5 text-[#F5A623] shrink-0" />
              <span className="truncate">
                {loadedAudioLabel ? `BUFFER: ${loadedAudioLabel}` : '[ LOAD AUDIO BUFFER ]'}
              </span>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => transientPunchEngine.emitKickPunch(0.95)}
                className="px-1.5 py-0.5 rounded-[2px] bg-[#0D0F16] hover:bg-[#F5A623]/20 border border-[#272732] hover:border-[#F5A623]/60 text-[8.5px] text-zinc-400 hover:text-[#F5A623] flex items-center gap-1 cursor-pointer transition-colors duration-150"
                title="Trigger <120Hz 808/Kick transient impulse"
              >
                <Zap className="w-2.5 h-2.5" />
                <span>808 HIT</span>
              </button>
              <button
                type="button"
                onClick={() => transientPunchEngine.emitVocalHit(0.95)}
                className="px-1.5 py-0.5 rounded-[2px] bg-[#0D0F16] hover:bg-[#F5A623]/20 border border-[#272732] hover:border-[#F5A623]/60 text-[8.5px] text-zinc-400 hover:text-[#F5A623] cursor-pointer transition-colors duration-150"
                title="Trigger 1kHz–5kHz Vocal/Snare word pop transient"
              >
                <span>VOCAL POP</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
