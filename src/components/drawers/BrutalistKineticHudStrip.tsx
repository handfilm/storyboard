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
import { CinemaBadgeHeader, CinemaToolHUD } from '../ui/CinemaToolHUD';

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
    kineticOcclusion.layerMode === 'BEHIND_SUBJECT' ? 'BEHIND' : 'FRONT';

  return (
    <div
      className={`group/hud relative bg-[#07080C] hover:bg-[#0B0D14] focus-within:bg-[#0B0D14] border border-[#26282E] hover:border-amber-500/50 focus-within:border-amber-500/50 rounded-lg font-mono text-[10px] text-[#E5E7EB] tabular-nums select-none transition-all duration-200 ${
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
        <CinemaBadgeHeader
          icon={<Layers className="w-3.5 h-3.5" strokeWidth={2.2} />}
          label="3D OCCLUSION"
          accent="amber"
        />

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden sm:inline text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
            {layerShortLabel} · {kineticOcclusion.audioPunchMode} · {presetShortLabel}
          </span>
          <CinemaToolHUD
            title="3D DEPTH COMPOSITOR"
            en="Toggles the 3-layer offscreen depth occlusion title compositor."
            bn="সাবজেক্টের পেছনে বা সামনে ৩ডি টাইটেল রেন্ডার চালু বা বন্ধ করতে চাপুন।"
            accent="amber"
          >
            <button
              type="button"
              onClick={() => setKineticOcclusionEnabled(!kineticOcclusion.enabled)}
              data-active={kineticOcclusion.enabled ? 'true' : 'false'}
              className="cinema-tile cinema-tile-amber px-2 py-0.5 rounded-[4px] text-[9px] font-black tracking-wider uppercase cursor-pointer"
            >
              {kineticOcclusion.enabled ? 'ACTIVE' : 'BYPASS'}
            </button>
          </CinemaToolHUD>
        </div>
      </div>

      {/* Core Control Matrix */}
      <div className="pt-2 flex flex-col gap-1.5">
        {/* 1. LAYER */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#111215]/70 border border-[#26282E] px-2 py-1 rounded-md">
          <span className="text-[9px] font-black tracking-wider text-zinc-400 uppercase flex items-center gap-1">
            <Layers className="w-3 h-3 text-amber-400" strokeWidth={2.2} />
            <span>LAYER</span>
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <CinemaToolHUD
              title="BEHIND SUBJECT LAYER"
              en="Renders kinetic typography occluded behind detected foreground subject."
              bn="টাইটেলকে মানুষ বা মূল সাবজেক্টের পেছনে রাখতে BEHIND চাপুন।"
              accent="amber"
            >
              <button
                type="button"
                onClick={() => handleSelectLayer('BEHIND_SUBJECT')}
                data-active={kineticOcclusion.layerMode === 'BEHIND_SUBJECT' ? 'true' : 'false'}
                className="cinema-tile cinema-tile-amber px-2 py-0.5 rounded-[4px] text-[9px] font-black tracking-wider uppercase cursor-pointer"
              >
                BEHIND
              </button>
            </CinemaToolHUD>
            <CinemaToolHUD
              title="FOREGROUND LAYER"
              en="Places kinetic titles cleanly on top of the video frame."
              bn="টাইটেলকে ভিডিওর একদম ওপরে স্পষ্টভাবে দেখাতে FRONT চাপুন।"
              accent="amber"
            >
              <button
                type="button"
                onClick={() => handleSelectLayer('FOREGROUND')}
                data-active={kineticOcclusion.layerMode === 'FOREGROUND' ? 'true' : 'false'}
                className="cinema-tile cinema-tile-amber px-2 py-0.5 rounded-[4px] text-[9px] font-black tracking-wider uppercase cursor-pointer"
              >
                FRONT
              </button>
            </CinemaToolHUD>
          </div>
        </div>

        {/* 2. AUDIO PUNCH */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#111215]/70 border border-[#26282E] px-2 py-1 rounded-md">
          <span className="text-[9px] font-black tracking-wider text-zinc-400 uppercase flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" strokeWidth={2.2} />
            <span>PUNCH</span>
          </span>
          <div className="flex items-center gap-1 ml-auto">
            {(['KICK', 'VOCAL', 'OFF'] as const).map((mode) => {
              const isSelected = kineticOcclusion.audioPunchMode === mode;
              return (
                <CinemaToolHUD
                  key={mode}
                  title={`AUDIO PUNCH: ${mode}`}
                  en={
                    mode === 'KICK'
                      ? 'Reacts title scale & pulse to <120Hz kick & 808 bass transients.'
                      : mode === 'VOCAL'
                        ? 'Reacts word pop intensity to 1kHz–5kHz vocal/snare hits.'
                        : 'Disables real-time audio transient scaling on titles.'
                  }
                  bn={
                    mode === 'KICK'
                      ? 'ড্রাম বা বেইজ বিটের তালে টাইটেল জাম্প করাতে KICK চাপুন।'
                      : mode === 'VOCAL'
                        ? 'কথা বা ভোকালের তালে শব্দগুলো পপ করাতে VOCAL বাছুন।'
                        : 'অডিও বিট অ্যানিমেশন বন্ধ রাখতে OFF চাপুন।'
                  }
                  accent="emerald"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectPunch(mode)}
                    data-active={isSelected ? 'true' : 'false'}
                    className="cinema-tile cinema-tile-emerald px-2 py-0.5 rounded-[4px] text-[9px] font-black tracking-wider uppercase cursor-pointer"
                  >
                    {mode}
                  </button>
                </CinemaToolHUD>
              );
            })}
          </div>
        </div>

        {/* 3. PRESET */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#111215]/70 border border-[#26282E] px-2 py-1 rounded-md">
          <span className="text-[9px] font-black tracking-wider text-zinc-400 uppercase flex items-center gap-1">
            <Type className="w-3 h-3 text-cyan-400" strokeWidth={2.2} />
            <span>PRESET</span>
          </span>
          <div className="flex items-center gap-1 ml-auto">
            {(
              [
                { id: 'CHOPPER_RAP_PUNCH', label: 'RAP CHOPPER', en: 'Single-word snap pop with fast tracking impulse.', bn: 'র‍্যাপ গানের তালে প্রতিটি শব্দ আলাদাভাবে পপ করাতে চাপুন।' },
                { id: 'COMMERCIAL_TITAN_DROP', label: 'AD TITAN', en: 'High-impact commercial typography slam with glow pass.', bn: 'বিজ্ঞাপনের মতো শক্তিশালী টাইটেল ড্রপ ব্যবহার করতে চাপুন।' },
                { id: 'MINIMAL', label: 'MINIMAL', en: 'Clean understated console typography profile.', bn: 'সাধারণ ও পরিচ্ছন্ন টাইটেল ডিজাইনের জন্য MINIMAL চাপুন।' }
              ] as const
            ).map((opt) => {
              const isSelected = kineticOcclusion.preset === opt.id;
              return (
                <CinemaToolHUD
                  key={opt.id}
                  title={opt.label}
                  en={opt.en}
                  bn={opt.bn}
                  accent="cyan"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectPreset(opt.id)}
                    data-active={isSelected ? 'true' : 'false'}
                    className="cinema-tile cinema-tile-cyan px-2 py-0.5 rounded-[4px] text-[9px] font-black tracking-wider uppercase cursor-pointer"
                  >
                    {opt.label}
                  </button>
                </CinemaToolHUD>
              );
            })}
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
          {/* IMPACT Slider */}
          <div className="flex items-center gap-2.5">
            <label
              htmlFor={compact ? 'kinetic-impact-compact' : 'kinetic-impact-drawer'}
              className="text-[9px] font-black tracking-wider text-amber-400 uppercase shrink-0"
            >
              IMPACT · {kineticOcclusion.impact.toFixed(2)}
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
          </div>

          {/* Client-Side AudioBufferSourceNode Ingest & Transient Audition Triggers */}
          <div className="flex items-center justify-between gap-1.5">
            <CinemaToolHUD
              title="LOAD AUDIO BUFFER"
              en="Decodes a local audio file via Web Audio API for beat transient sync."
              bn="ফোন বা পিসি থেকে অডিও ফাইল লোড করে বিট ডিটেক্ট করতে চাপুন।"
              accent="emerald"
            >
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="cinema-tile cinema-tile-emerald px-2 py-1 rounded-[4px] text-[9px] font-black tracking-wider uppercase flex items-center gap-1 cursor-pointer truncate"
              >
                <Upload className="w-3 h-3 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                <span className="truncate">
                  {loadedAudioLabel ? loadedAudioLabel : 'AUDIO'}
                </span>
              </button>
            </CinemaToolHUD>

            <div className="flex items-center gap-1 shrink-0">
              <CinemaToolHUD
                title="808 KICK IMPULSE"
                en="Triggers a manual <120Hz 808 kick transient test pulse."
                bn="টাইটেলে ৮০৮ বেইজ জাম্প টেস্ট করতে চাপুন।"
                accent="amber"
              >
                <button
                  type="button"
                  onClick={() => transientPunchEngine.emitKickPunch(0.95)}
                  className="cinema-tile cinema-tile-amber px-2 py-1 rounded-[4px] text-[9px] font-black tracking-wider uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Zap className="w-3 h-3 cinema-tile-icon" strokeWidth={2.2} />
                  <span>808 HIT</span>
                </button>
              </CinemaToolHUD>
              <CinemaToolHUD
                title="VOCAL POP IMPULSE"
                en="Triggers a 1kHz–5kHz vocal word-pop transient test pulse."
                bn="ভোকালের তালে শব্দ পপ ইফেক্ট টেস্ট করতে চাপুন।"
                accent="amber"
              >
                <button
                  type="button"
                  onClick={() => transientPunchEngine.emitVocalHit(0.95)}
                  className="cinema-tile cinema-tile-amber px-2 py-1 rounded-[4px] text-[9px] font-black tracking-wider uppercase cursor-pointer"
                >
                  <span>VOCAL POP</span>
                </button>
              </CinemaToolHUD>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
