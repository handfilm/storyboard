/**
 * @file /src/components/stage/CapCutProSuitePanel.tsx
 * @description CapCut-Grade Pro Feature Suite Drawer:
 * 1. AI Video & Storyboard Engine: Auto Bilingual Captions (Bangla + English, bounce/karaoke/editorial),
 *    AI Smart Cutout / Chroma Removal, AI Script-to-Storyboard, & Beat-Sync Auto-Cut markers.
 * 2. Keyframe Animation System: Per-clip Position X/Y, Scale, Rotation, Opacity, Volume + Easing curves.
 * 3. Speed Ramping (Velocity Curves): Interactive SVG curve + Hero / Bullet / Montage + Optical Flow toggle.
 * 4. Cinema Color, Optical & Motion FX: Lift / Gamma / Gain wheels, Film Grain, Halation, 3D Motion Blur.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Diamond,
  Gauge,
  Palette,
  Scissors,
  Captions,
  Wand2,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Loader2,
  Activity
} from 'lucide-react';
import type {
  AnthologyFrame,
  CaptionStyle,
  ClipKeyframe,
  ClipKeyframeEasing,
  ColorWheelsConfig,
  OpticalFlowMode,
  SmartCutoutConfig,
  SpeedRampPreset
} from '../../types/anthology';
import { getLicenseAuthHeaders, useLicenseStore } from '../../services/licenseService';
import {
  DEFAULT_COLOR_WHEELS,
  DEFAULT_SMART_CUTOUT,
  detectAudioTransientBeatMarkers,
  interpolateClipKeyframes
} from '../../services/proSuiteEngine';
import {
  SPEED_RAMP_PRESETS,
  getSpeedRampFactorAtProgress
} from '../../utils/speedReelsEngine';

export type ProSuiteTab = 'ai-captions' | 'keyframes' | 'speed-ramp' | 'color-fx';

export interface CapCutProSuitePanelProps {
  currentFrame: AnthologyFrame;
  currentIndex: number;
  slideTimeSec: number;
  shotDurationSec: number;
  onUpdateFrame: (updated: AnthologyFrame) => void;
  onApplyStoryboardShots?: (shots: Array<{
    title: string;
    bengaliTitle: string;
    tagline: string;
    directorNotes: string;
    soundCue: string;
    durationSec: number;
  }>) => void;
  initialTab?: ProSuiteTab;
}

export const CapCutProSuitePanel: React.FC<CapCutProSuitePanelProps> = ({
  currentFrame,
  currentIndex,
  slideTimeSec,
  shotDurationSec,
  onUpdateFrame,
  onApplyStoryboardShots,
  initialTab = 'ai-captions'
}) => {
  const [activeTab, setActiveTab] = useState<ProSuiteTab>(initialTab);
  const [notice, setNotice] = useState<string | null>(null);

  // Tab 1: AI & Bilingual Captions
  const [captionScript, setCaptionScript] = useState(
    currentFrame.caption?.text || currentFrame.tagline || 'Rain washes neon across the midnight boulevard.'
  );
  const [captionLangMode, setCaptionLangMode] = useState<'bilingual' | 'en' | 'bn'>('bilingual');
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(
    currentFrame.caption?.style || 'karaoke'
  );
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);

  const [storyScript, setStoryScript] = useState('');
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [bpmInput, setBpmInput] = useState(124);

  // Tab 2: Keyframes
  const normPlayhead = Math.max(
    0,
    Math.min(1, shotDurationSec > 0 ? slideTimeSec / shotDurationSec : 0)
  );
  const keyframes = currentFrame.clipKeyframes || [];
  const activeInterp = interpolateClipKeyframes(keyframes, normPlayhead);

  const [kfEasing, setKfEasing] = useState<ClipKeyframeEasing>('ease-in-out');
  const [selectedKfId, setSelectedKfId] = useState<string | null>(null);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice((prev) => (prev === msg ? null : prev)), 2800);
  };

  const guardPro = (featureName: string): boolean => {
    return useLicenseStore.getState().requireProAccess(featureName);
  };

  const handleGenerateCaptions = async () => {
    if (!guardPro('Auto Bilingual Captions')) return;
    setIsGeneratingCaptions(true);
    try {
      const resp = await fetch('/api/ai/captions/generate', {
        method: 'POST',
        headers: getLicenseAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          scriptText: captionScript,
          durationSec: shotDurationSec || 6,
          languageMode: captionLangMode,
          style: captionStyle
        })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success) {
        useLicenseStore.getState().handleApiLicenseError(resp.status, data, 'Auto Bilingual Captions');
        throw new Error(data?.error || 'Caption generation failed');
      }
      const segments = Array.isArray(data.segments) ? data.segments : [];
      const combinedEn = segments.map((s: any) => s.english).filter(Boolean).join(' ') || captionScript;
      const combinedBn = segments.map((s: any) => s.bangla).filter(Boolean).join(' ');
      const timedWords = segments.flatMap((s: any) => (Array.isArray(s.words) ? s.words : []));

      onUpdateFrame({
        ...currentFrame,
        caption: {
          text: combinedEn,
          bengaliText: combinedBn || undefined,
          style: captionStyle,
          words: timedWords
        }
      });
      flash(`Generated ${segments.length} bilingual caption cues (${captionStyle.toUpperCase()})`);
    } catch (err: any) {
      flash(err?.message || 'Caption engine unavailable');
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  const handleGenerateScriptStoryboard = async () => {
    if (!guardPro('AI Script-to-Storyboard')) return;
    if (!storyScript.trim()) return;
    setIsGeneratingStoryboard(true);
    try {
      const resp = await fetch('/api/ai/script-to-storyboard', {
        method: 'POST',
        headers: getLicenseAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          script: storyScript.trim(),
          shotCount: 4,
          aspectRatio: currentFrame.aspectRatio || '16:9'
        })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success || !Array.isArray(data.shots)) {
        useLicenseStore.getState().handleApiLicenseError(resp.status, data, 'AI Script-to-Storyboard');
        throw new Error(data?.error || 'Script breakdown failed');
      }
      if (onApplyStoryboardShots) {
        onApplyStoryboardShots(data.shots);
      } else if (data.shots[0]) {
        const first = data.shots[0];
        onUpdateFrame({
          ...currentFrame,
          title: first.title || currentFrame.title,
          bengaliTitle: first.bengaliTitle || currentFrame.bengaliTitle,
          tagline: first.tagline || currentFrame.tagline,
          directorNotes: first.directorNotes || currentFrame.directorNotes,
          soundCue: first.soundCue || currentFrame.soundCue
        });
      }
      flash(`Generated ${data.shots.length} storyboard beats from script`);
    } catch (err: any) {
      flash(err?.message || 'Storyboard generator error');
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const handleGenerateBeatMarkers = () => {
    if (!guardPro('Beat-Sync Auto-Cut')) return;
    const markers = detectAudioTransientBeatMarkers(bpmInput, shotDurationSec || 6, 1);
    onUpdateFrame({
      ...currentFrame,
      beatSnapEnabled: true,
      beatMarkersSec: markers
    });
    flash(`Injected ${markers.length} beat-sync cut markers @ ${bpmInput} BPM`);
  };

  const cutout: SmartCutoutConfig = currentFrame.smartCutout || DEFAULT_SMART_CUTOUT;
  const updateCutout = (partial: Partial<SmartCutoutConfig>) => {
    if (!guardPro('AI Smart Cutout & Chroma Key')) return;
    onUpdateFrame({
      ...currentFrame,
      smartCutout: { ...cutout, ...partial }
    });
  };

  // Keyframe CRUD
  const addOrUpdateKeyframeAtPlayhead = (overridePartial?: Partial<ClipKeyframe>) => {
    if (!guardPro('Clip Keyframe Animation')) return;
    const existingIdx = keyframes.findIndex(
      (k) => k.id === selectedKfId || Math.abs(k.timeNorm - normPlayhead) < 0.04
    );
    const nextKf: ClipKeyframe = {
      id: existingIdx >= 0 ? keyframes[existingIdx].id : `kf_${Date.now()}`,
      timeNorm:
        existingIdx >= 0 && selectedKfId === keyframes[existingIdx].id
          ? keyframes[existingIdx].timeNorm
          : Number(normPlayhead.toFixed(3)),
      x: overridePartial?.x ?? activeInterp.x,
      y: overridePartial?.y ?? activeInterp.y,
      scale: overridePartial?.scale ?? activeInterp.scale,
      rotation: overridePartial?.rotation ?? activeInterp.rotation,
      opacity: overridePartial?.opacity ?? activeInterp.opacity,
      volume: overridePartial?.volume ?? activeInterp.volume,
      easing: overridePartial?.easing ?? kfEasing
    };
    const nextList =
      existingIdx >= 0
        ? keyframes.map((k, idx) => (idx === existingIdx ? nextKf : k))
        : [...keyframes, nextKf];
    nextList.sort((a, b) => a.timeNorm - b.timeNorm);
    setSelectedKfId(nextKf.id);
    onUpdateFrame({ ...currentFrame, clipKeyframes: nextList });
  };

  const removeSelectedKeyframe = () => {
    if (!selectedKfId) return;
    const next = keyframes.filter((k) => k.id !== selectedKfId);
    setSelectedKfId(null);
    onUpdateFrame({ ...currentFrame, clipKeyframes: next });
    flash('Keyframe removed');
  };

  // Color Wheels
  const wheels: ColorWheelsConfig = currentFrame.colorWheels || DEFAULT_COLOR_WHEELS;
  const updateWheelChannel = (
    zone: 'lift' | 'gamma' | 'gain',
    ch: 'r' | 'g' | 'b',
    value: number
  ) => {
    if (!guardPro('Lift/Gamma/Gain Color Wheels')) return;
    onUpdateFrame({
      ...currentFrame,
      colorWheels: {
        ...wheels,
        [zone]: { ...wheels[zone], [ch]: value }
      }
    });
  };

  const activePreset = (currentFrame.speedRampPreset || 'NONE') as SpeedRampPreset;
  const activeOpticalFlow = (currentFrame.opticalFlowMode || 'NONE') as OpticalFlowMode;

  return (
    <div className="bg-[#0B0B0D] text-white font-mono select-none p-3.5 space-y-3.5 border border-white/[0.1] rounded-md">
      {/* Header + 4-Tab Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-1 bg-[#141417] p-1 rounded border border-white/[0.08] overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'ai-captions', label: 'AI & Captions', icon: Sparkles },
              { id: 'keyframes', label: 'Keyframes', icon: Diamond },
              { id: 'speed-ramp', label: 'Speed & Flow', icon: Gauge },
              { id: 'color-fx', label: 'Color & 3D FX', icon: Palette }
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                data-testid={`pro-suite-tab-${t.id}`}
                onClick={() => setActiveTab(t.id)}
                className={`px-2.5 py-1.5 rounded-[3px] text-[10px] font-bold uppercase flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors touch-manipulation ${
                  activeTab === t.id
                    ? 'bg-[#F59E0B] text-[#0B0B0D]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <span className="px-2 py-1 rounded bg-[#141417] border border-white/[0.1] text-[10px] font-bold text-[#F59E0B] tabular-nums">
          SHOT {String(currentIndex + 1).padStart(2, '0')} · PRO SUITE
        </span>
      </div>

      {notice && (
        <div className="px-3 py-1.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* TAB 1: AI VIDEO, BILINGUAL CAPTIONS, SMART CUTOUT & BEAT SYNC */}
      {activeTab === 'ai-captions' && (
        <div className="space-y-3.5">
          {/* Auto Captions & Bilingual Subtitles */}
          <div className="p-3 rounded bg-[#141417] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#F59E0B] uppercase flex items-center gap-1.5">
                <Captions className="w-3.5 h-3.5" />
                <span>Auto Captions (Bangla + English)</span>
              </span>
              <span className="text-[9px] text-zinc-400">KINETIC BURN-IN</span>
            </div>

            <textarea
              value={captionScript}
              onChange={(e) => setCaptionScript(e.target.value)}
              rows={2}
              placeholder="Paste spoken dialogue or lyrics in Bangla or English..."
              className="w-full p-2 rounded bg-[#0B0B0D] border border-white/[0.12] text-xs text-white outline-none focus:border-[#F59E0B] resize-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Caption Language Mode"
                value={captionLangMode}
                onChange={(e) => setCaptionLangMode(e.target.value as any)}
                className="h-8 px-2 rounded bg-[#0B0B0D] border border-white/[0.12] text-[10px] text-zinc-200 outline-none"
              >
                <option value="bilingual">Bilingual (BN + EN)</option>
                <option value="en">English Only</option>
                <option value="bn">Bangla Only</option>
              </select>

              <select
                aria-label="Kinetic Preset"
                value={captionStyle}
                onChange={(e) => {
                  const next = e.target.value as CaptionStyle;
                  setCaptionStyle(next);
                  if (currentFrame.caption) {
                    onUpdateFrame({
                      ...currentFrame,
                      caption: { ...currentFrame.caption, style: next }
                    });
                  }
                }}
                className="h-8 px-2 rounded bg-[#0B0B0D] border border-white/[0.12] text-[10px] text-amber-300 outline-none"
              >
                <option value="karaoke">Preset: Karaoke Sweep</option>
                <option value="bounce">Preset: Bounce Pop</option>
                <option value="editorial">Preset: Editorial Mono</option>
                <option value="bilingual_dual">Preset: Bilingual Calligraphy</option>
              </select>
            </div>

            <button
              type="button"
              data-testid="generate-captions-btn"
              disabled={isGeneratingCaptions}
              onClick={handleGenerateCaptions}
              className="w-full h-9 rounded bg-[#F59E0B] hover:bg-amber-400 text-[#0B0B0D] font-space-grotesk font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isGeneratingCaptions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Captions className="w-3.5 h-3.5" />}
              <span>{isGeneratingCaptions ? 'Generating Subtitles...' : 'Generate Bilingual Captions'}</span>
            </button>
          </div>

          {/* AI Smart Cutout / Background Removal */}
          <div className="p-3 rounded bg-[#141417] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5" />
                <span>AI Smart Cutout / Background Removal</span>
              </span>
              <button
                type="button"
                data-testid="toggle-smart-cutout-btn"
                onClick={() => updateCutout({ enabled: !cutout.enabled })}
                className={`px-2.5 py-1 rounded text-[10px] font-black uppercase cursor-pointer ${
                  cutout.enabled ? 'bg-cyan-400 text-[#0B0B0D]' : 'bg-[#0B0B0D] text-zinc-400 border border-white/[0.12]'
                }`}
              >
                {cutout.enabled ? 'ENABLED' : 'OFF'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'ai-subject', label: 'AI Subject' },
                  { id: 'chroma-green', label: 'Chroma Green' },
                  { id: 'chroma-blue', label: 'Chroma Blue' }
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updateCutout({ enabled: true, mode: m.id })}
                  className={`py-1.5 rounded text-[9.5px] font-bold uppercase cursor-pointer border ${
                    cutout.mode === m.id && cutout.enabled
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-[#0B0B0D] border-white/[0.08] text-zinc-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div>
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>Tolerance</span>
                  <span className="text-white tabular-nums">{cutout.tolerance}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={110}
                  value={cutout.tolerance}
                  onChange={(e) => updateCutout({ tolerance: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>Edge Feather</span>
                  <span className="text-white tabular-nums">{cutout.feather}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={cutout.feather}
                  onChange={(e) => updateCutout({ feather: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Script-to-Storyboard + Beat-Sync Auto-Cut */}
          <div className="p-3 rounded bg-[#141417] border border-white/[0.08] space-y-2.5">
            <span className="text-[11px] font-bold text-emerald-300 uppercase flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5" />
              <span>AI Script-to-Storyboard &amp; Beat-Sync Auto-Cut</span>
            </span>

            <div className="flex gap-2">
              <input
                type="text"
                value={storyScript}
                onChange={(e) => setStoryScript(e.target.value)}
                placeholder="Paste scene outline to generate 4 storyboard shots..."
                className="flex-1 min-w-0 h-9 px-2.5 rounded bg-[#0B0B0D] border border-white/[0.12] text-xs text-white outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                disabled={isGeneratingStoryboard || !storyScript.trim()}
                onClick={handleGenerateScriptStoryboard}
                className="h-9 px-3 rounded bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-[#0B0B0D] font-space-grotesk font-black text-[10px] uppercase cursor-pointer shrink-0"
              >
                {isGeneratingStoryboard ? 'Building...' : 'Build Shots'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-[10px] text-zinc-300">
                <Activity className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>BPM:</span>
                <input
                  type="number"
                  min={60}
                  max={200}
                  value={bpmInput}
                  onChange={(e) => setBpmInput(Number(e.target.value) || 120)}
                  className="w-16 h-7 px-2 rounded bg-[#0B0B0D] border border-white/[0.12] text-xs text-white tabular-nums"
                />
              </div>
              <button
                type="button"
                data-testid="beat-sync-autocut-btn"
                onClick={handleGenerateBeatMarkers}
                className="h-8 px-3 rounded bg-white/[0.08] hover:bg-[#F59E0B] hover:text-[#0B0B0D] text-xs font-bold uppercase cursor-pointer transition-colors"
              >
                Beat-Sync Auto-Cut ({currentFrame.beatMarkersSec?.length || 0})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KEYFRAME ANIMATION SYSTEM */}
      {activeTab === 'keyframes' && (
        <div className="p-3 rounded bg-[#141417] border border-white/[0.08] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-[#F59E0B] uppercase flex items-center gap-1.5">
              <Diamond className="w-3.5 h-3.5" />
              <span>Clip Keyframe Timeline ({Math.round(normPlayhead * 100)}%)</span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="add-keyframe-btn"
                onClick={() => addOrUpdateKeyframeAtPlayhead()}
                className="px-2.5 py-1 rounded bg-[#F59E0B] hover:bg-amber-400 text-[#0B0B0D] text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Keyframe</span>
              </button>
              {selectedKfId && (
                <button
                  type="button"
                  onClick={removeSelectedKeyframe}
                  className="p-1 rounded bg-red-500/20 hover:bg-red-500/35 text-red-300 cursor-pointer"
                  title="Delete selected keyframe"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Diamond Timeline Strip */}
          <div className="relative h-8 rounded bg-[#0B0B0D] border border-white/[0.12] px-2 flex items-center">
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 pointer-events-none"
              style={{ left: `${normPlayhead * 100}%` }}
            />
            {keyframes.length === 0 && (
              <span className="text-[10px] text-zinc-500 mx-auto">
                Click "Add Keyframe" to animate Position, Scale, Rotation &amp; Opacity
              </span>
            )}
            {keyframes.map((kf) => (
              <button
                key={kf.id}
                type="button"
                onClick={() => setSelectedKfId(kf.id)}
                title={`@${Math.round(kf.timeNorm * 100)}% (${kf.easing})`}
                style={{ left: `${kf.timeNorm * 100}%` }}
                className={`absolute -translate-x-1/2 w-3.5 h-3.5 rotate-45 cursor-pointer transition-transform ${
                  selectedKfId === kf.id
                    ? 'bg-cyan-300 scale-125 ring-2 ring-cyan-400/50'
                    : 'bg-[#F59E0B] hover:scale-110'
                }`}
              />
            ))}
          </div>

          {/* Easing Curve Selector */}
          <div className="grid grid-cols-4 gap-1">
            {(['linear', 'ease-in', 'ease-out', 'ease-in-out'] as const).map((ease) => (
              <button
                key={ease}
                type="button"
                onClick={() => {
                  setKfEasing(ease);
                  if (keyframes.length > 0) addOrUpdateKeyframeAtPlayhead({ easing: ease });
                }}
                className={`py-1.5 rounded text-[9px] font-bold uppercase cursor-pointer border ${
                  kfEasing === ease
                    ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                    : 'bg-[#0B0B0D] border-white/[0.08] text-zinc-400'
                }`}
              >
                {ease}
              </button>
            ))}
          </div>

          {/* Animated Property Sliders */}
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            {(
              [
                { key: 'x', label: 'Position X', min: -40, max: 40, step: 1, val: activeInterp.x, unit: '%' },
                { key: 'y', label: 'Position Y', min: -40, max: 40, step: 1, val: activeInterp.y, unit: '%' },
                { key: 'scale', label: 'Scale', min: 0.5, max: 2.5, step: 0.05, val: activeInterp.scale, unit: 'x' },
                { key: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1, val: activeInterp.rotation, unit: '°' },
                { key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.05, val: activeInterp.opacity, unit: '' },
                { key: 'volume', label: 'Audio Gain', min: 0, max: 2, step: 0.05, val: activeInterp.volume, unit: 'x' }
              ] as const
            ).map((ctrl) => (
              <div key={ctrl.key}>
                <div className="flex justify-between text-zinc-400 mb-0.5">
                  <span>{ctrl.label}</span>
                  <span className="text-white tabular-nums">
                    {ctrl.step < 1 ? ctrl.val.toFixed(2) : Math.round(ctrl.val)}
                    {ctrl.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={ctrl.min}
                  max={ctrl.max}
                  step={ctrl.step}
                  value={ctrl.val}
                  onChange={(e) =>
                    addOrUpdateKeyframeAtPlayhead({ [ctrl.key]: Number(e.target.value) } as any)
                  }
                  className="w-full accent-[#F59E0B] cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SPEED RAMPING (VELOCITY CURVES) + OPTICAL FLOW */}
      {activeTab === 'speed-ramp' && (
        <div className="p-3 rounded bg-[#141417] border border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#F59E0B] uppercase flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" />
              <span>Velocity Speed Ramp Curves</span>
            </span>
            <span className="text-[10px] text-cyan-300 font-bold">{activePreset}</span>
          </div>

          {/* Live Velocity Curve SVG Graph */}
          <svg
            viewBox="0 0 240 76"
            className="w-full h-20 rounded bg-[#0B0B0D] border border-white/[0.1]"
            aria-label="Speed Ramp Velocity Curve"
          >
            <line x1="0" y1="52" x2="240" y2="52" stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
            <polyline
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.5"
              points={Array.from({ length: 25 }, (_, i) => {
                const u = i / 24;
                const rate = getSpeedRampFactorAtProgress(
                  activePreset,
                  u,
                  currentFrame.speedRampKeyframes
                );
                const x = u * 240;
                const y = 70 - Math.min(64, (rate / 3.5) * 64);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              }).join(' ')}
            />
          </svg>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {SPEED_RAMP_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                data-testid={`speed-ramp-${p.id}`}
                onClick={() => {
                  if (!guardPro('Speed Ramping & Optical Flow')) return;
                  onUpdateFrame({
                    ...currentFrame,
                    speedRampPreset: p.id,
                    speedRampKeyframes: undefined
                  });
                  flash(`Speed ramp preset: ${p.label}`);
                }}
                className={`p-2 rounded text-left border cursor-pointer transition-colors ${
                  activePreset === p.id
                    ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-white'
                    : 'bg-[#0B0B0D] border-white/[0.08] text-zinc-400 hover:text-white'
                }`}
              >
                <div className="text-[10px] font-black text-[#F59E0B]">{p.shortLabel}</div>
                <div className="text-[9px] truncate">{p.curveSummary}</div>
              </button>
            ))}
          </div>

          {/* Optical Flow Frame Interpolation Toggle */}
          <div className="pt-2 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] text-zinc-300 font-bold uppercase">
              Slow-Motion Optical Flow Synthesis
            </span>
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'NONE', label: 'Off' },
                  { id: 'FRAME_BLEND', label: 'Frame Blend' },
                  { id: 'OPTICAL_FLOW', label: 'Optical Flow' }
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  data-testid={`optical-flow-${m.id}`}
                  onClick={() => {
                    if (!guardPro('Optical Flow Slow-Motion')) return;
                    onUpdateFrame({ ...currentFrame, opticalFlowMode: m.id });
                  }}
                  className={`px-2.5 py-1 rounded text-[9.5px] font-bold uppercase cursor-pointer border ${
                    activeOpticalFlow === m.id
                      ? 'bg-cyan-400 border-cyan-300 text-[#0B0B0D]'
                      : 'bg-[#0B0B0D] border-white/[0.1] text-zinc-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LIFT / GAMMA / GAIN COLOR WHEELS + 3D MOTION BLUR & GRAIN */}
      {activeTab === 'color-fx' && (
        <div className="p-3 rounded bg-[#141417] border border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#F59E0B] uppercase flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span>3-Way Color Wheels (Lift / Gamma / Gain)</span>
            </span>
            <button
              type="button"
              onClick={() =>
                onUpdateFrame({ ...currentFrame, colorWheels: { ...DEFAULT_COLOR_WHEELS } })
              }
              className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[9.5px] text-zinc-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(['lift', 'gamma', 'gain'] as const).map((zone) => (
              <div key={zone} className="p-2.5 rounded bg-[#0B0B0D] border border-white/[0.08] space-y-2">
                <div className="text-[10px] font-black uppercase text-center text-zinc-200 tracking-wider">
                  {zone === 'lift' ? 'LIFT (SHADOWS)' : zone === 'gamma' ? 'GAMMA (MIDS)' : 'GAIN (HIGHLIGHTS)'}
                </div>
                {(['r', 'g', 'b'] as const).map((ch) => (
                  <div key={ch} className="flex items-center gap-1.5 text-[9.5px]">
                    <span
                      className={`w-3 font-black uppercase ${
                        ch === 'r' ? 'text-rose-400' : ch === 'g' ? 'text-emerald-400' : 'text-sky-400'
                      }`}
                    >
                      {ch}
                    </span>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      step={1}
                      value={wheels[zone][ch]}
                      onChange={(e) => updateWheelChannel(zone, ch, Number(e.target.value))}
                      className="flex-1 accent-[#F59E0B] cursor-pointer"
                    />
                    <span className="w-7 text-right tabular-nums text-zinc-300">{wheels[zone][ch]}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Film Grain, Halation & 3D Camera Motion Blur */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/[0.08] text-[10px]">
            {(
              [
                { key: 'grain', label: '35mm Film Grain', val: wheels.grain },
                { key: 'halation', label: 'Optical Halation', val: wheels.halation },
                { key: 'motionBlur3d', label: '3D Motion Blur', val: wheels.motionBlur3d }
              ] as const
            ).map((fx) => (
              <div key={fx.key}>
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>{fx.label}</span>
                  <span className="text-white tabular-nums">{fx.val}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={fx.val}
                  onChange={(e) => {
                    if (!guardPro('Cinema Color & 3D Optical FX')) return;
                    onUpdateFrame({
                      ...currentFrame,
                      colorWheels: { ...wheels, [fx.key]: Number(e.target.value) }
                    });
                  }}
                  className="w-full accent-[#F59E0B] cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
