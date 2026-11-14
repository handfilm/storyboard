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
import { CinemaBadgeHeader, CinemaToolHUD } from '../ui/CinemaToolHUD';
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
              {
                id: 'ai-captions',
                label: 'AUTO CAP',
                icon: Sparkles,
                en: 'Generate bilingual captions, smart cutout, and script shots.',
                bn: 'অটো ক্যাপশন, ব্যাকগ্রাউন্ড রিমুভ ও স্ক্রিপ্ট শট বানাতে ব্যবহার করুন।',
                accent: 'amber'
              },
              {
                id: 'keyframes',
                label: 'KEYFRAME',
                icon: Diamond,
                en: 'Animate position, scale, rotation, opacity, and volume curves.',
                bn: 'ক্লিপের জুম, পজিশন, রোটেশন ও অপাসিটি অ্যানিমেট করতে চাপুন।',
                accent: 'cyan'
              },
              {
                id: 'speed-ramp',
                label: 'SPEED RAMP',
                icon: Gauge,
                en: 'Sculpt velocity speed-ramps and optical-flow slow motion.',
                bn: 'স্মুথ স্লো-মোশন ও ভেলোসিটি স্পিড কার্ভ সেট করতে চাপুন।',
                accent: 'amber'
              },
              {
                id: 'color-fx',
                label: 'COLOR 3D',
                icon: Palette,
                en: 'Adjust Lift/Gamma/Gain wheels, 35mm grain, halation & blur.',
                bn: 'কালার হুইল, ফিল্ম গ্রেইন ও হ্যালেশন গ্লো নিয়ন্ত্রণ করতে চাপুন।',
                accent: 'emerald'
              }
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <CinemaToolHUD
                key={t.id}
                title={t.label}
                en={t.en}
                bn={t.bn}
                accent={t.accent}
              >
                <button
                  type="button"
                  data-testid={`pro-suite-tab-${t.id}`}
                  data-active={activeTab === t.id ? 'true' : 'false'}
                  onClick={() => setActiveTab(t.id)}
                  className={`cinema-tile cinema-tile-${t.accent} px-2.5 min-h-[36px] rounded text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 whitespace-nowrap cursor-pointer touch-manipulation`}
                >
                  <Icon className="w-3.5 h-3.5 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                  <span>{t.label}</span>
                </button>
              </CinemaToolHUD>
            );
          })}
        </div>

        <span className="px-2 py-1 rounded bg-[#141417] border border-white/[0.1] text-[10px] font-black tracking-wider text-[#F59E0B] tabular-nums">
          SH{String(currentIndex + 1).padStart(2, '0')} · PRO
        </span>
      </div>

      {notice && (
        <div className="px-3 py-1.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* TAB 1: AUTO CAP, CUTOUT & AI SHOTS */}
      {activeTab === 'ai-captions' && (
        <div className="space-y-3.5">
          {/* AUTO CAP */}
          <div className="p-3 rounded-lg bg-[#141417] border border-white/[0.08] space-y-2.5">
            <CinemaBadgeHeader
              icon={<Captions className="w-3.5 h-3.5" strokeWidth={2.3} />}
              label="AUTO CAP"
              accent="amber"
              rightSlot={<span className="text-[9px] font-black text-zinc-400">BN + EN</span>}
            />

            <textarea
              value={captionScript}
              onChange={(e) => setCaptionScript(e.target.value)}
              rows={2}
              placeholder="Bangla / English..."
              className="w-full p-2 rounded bg-[#0B0B0D] border border-white/[0.12] text-xs text-white outline-none focus:border-[#F59E0B] resize-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Caption Language Mode"
                value={captionLangMode}
                onChange={(e) => setCaptionLangMode(e.target.value as any)}
                className="h-9 px-2 rounded bg-[#0B0B0D] border border-white/[0.12] text-[10px] font-black text-zinc-200 outline-none uppercase"
              >
                <option value="bilingual">BN + EN</option>
                <option value="en">EN ONLY</option>
                <option value="bn">BN ONLY</option>
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
                className="h-9 px-2 rounded bg-[#0B0B0D] border border-white/[0.12] text-[10px] font-black text-amber-300 outline-none uppercase"
              >
                <option value="karaoke">KARAOKE</option>
                <option value="bounce">BOUNCE</option>
                <option value="editorial">EDITORIAL</option>
                <option value="bilingual_dual">DUAL SCRIPT</option>
              </select>
            </div>

            <CinemaToolHUD hudId="auto-cap" blockWrapper>
              <button
                type="button"
                data-testid="generate-captions-btn"
                data-active="true"
                disabled={isGeneratingCaptions}
                onClick={handleGenerateCaptions}
                className="cinema-tile cinema-tile-amber w-full min-h-[44px] rounded-lg font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGeneratingCaptions ? <Loader2 className="w-4 h-4 cinema-tile-icon animate-spin" /> : <Captions className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />}
                <span>{isGeneratingCaptions ? 'BUILDING' : 'AUTO CAP'}</span>
              </button>
            </CinemaToolHUD>
          </div>

          {/* CUTOUT */}
          <div className="p-3 rounded-lg bg-[#141417] border border-white/[0.08] space-y-2.5">
            <CinemaBadgeHeader
              icon={<Scissors className="w-3.5 h-3.5" strokeWidth={2.3} />}
              label="CUTOUT"
              accent="cyan"
              rightSlot={
                <CinemaToolHUD
                  title="SMART CUTOUT"
                  en="Toggle AI background removal or chroma key matte."
                  bn="ব্যাকগ্রাউন্ড রিমুভ বা গ্রিন-স্ক্রিন কাটআউট চালু বা বন্ধ করতে চাপুন।"
                  accent="cyan"
                >
                  <button
                    type="button"
                    data-testid="toggle-smart-cutout-btn"
                    data-active={cutout.enabled ? 'true' : 'false'}
                    onClick={() => updateCutout({ enabled: !cutout.enabled })}
                    className="cinema-tile cinema-tile-cyan px-2.5 py-1 rounded text-[10px] font-black uppercase cursor-pointer"
                  >
                    {cutout.enabled ? 'ON' : 'OFF'}
                  </button>
                </CinemaToolHUD>
              }
            />

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'ai-subject', label: 'SUBJECT' },
                  { id: 'chroma-green', label: 'GREEN' },
                  { id: 'chroma-blue', label: 'BLUE' }
                ] as const
              ).map((m) => (
                <CinemaToolHUD
                  key={m.id}
                  title={`KEY ${m.label}`}
                  en={`Set smart matte keying mode to ${m.label}.`}
                  bn={`সাবজেক্ট বা ${m.label} ব্যাকগ্রাউন্ড আলাদা করতে চাপুন।`}
                  accent="cyan"
                  blockWrapper
                >
                  <button
                    type="button"
                    data-active={cutout.mode === m.id && cutout.enabled ? 'true' : 'false'}
                    onClick={() => updateCutout({ enabled: true, mode: m.id })}
                    className="cinema-tile cinema-tile-cyan w-full min-h-[38px] rounded text-[10px] font-black tracking-wider uppercase cursor-pointer"
                  >
                    {m.label}
                  </button>
                </CinemaToolHUD>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 text-[10px] font-bold">
              <div>
                <div className="flex justify-between text-zinc-400 mb-1 uppercase">
                  <span>TOLERANCE</span>
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
                <div className="flex justify-between text-zinc-400 mb-1 uppercase">
                  <span>FEATHER</span>
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

          {/* AI SHOTS + BEAT CUT */}
          <div className="p-3 rounded-lg bg-[#141417] border border-white/[0.08] space-y-2.5">
            <CinemaBadgeHeader
              icon={<Wand2 className="w-3.5 h-3.5" strokeWidth={2.3} />}
              label="AI SHOTS"
              accent="emerald"
            />

            <div className="flex gap-2">
              <input
                type="text"
                value={storyScript}
                onChange={(e) => setStoryScript(e.target.value)}
                placeholder="Scene outline..."
                className="flex-1 min-w-0 h-10 px-2.5 rounded bg-[#0B0B0D] border border-white/[0.12] text-xs text-white outline-none focus:border-emerald-400"
              />
              <CinemaToolHUD
                title="BUILD SHOTS"
                en="Generate 4 structured storyboard shots from text prompt."
                bn="স্ক্রিপ্ট লিখে চাপলে অটোমেটিক ৪টি শট তৈরি হয়ে যাবে।"
                accent="emerald"
              >
                <button
                  type="button"
                  disabled={isGeneratingStoryboard || !storyScript.trim()}
                  data-active={!isGeneratingStoryboard && Boolean(storyScript.trim()) ? 'true' : 'false'}
                  onClick={handleGenerateScriptStoryboard}
                  className="cinema-tile cinema-tile-emerald h-10 px-3 rounded font-black text-[10px] tracking-wider uppercase cursor-pointer shrink-0 disabled:opacity-40"
                >
                  {isGeneratingStoryboard ? 'BUILDING' : 'BUILD'}
                </button>
              </CinemaToolHUD>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-[10px] font-black text-zinc-300">
                <Activity className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>BPM</span>
                <input
                  type="number"
                  min={60}
                  max={200}
                  value={bpmInput}
                  onChange={(e) => setBpmInput(Number(e.target.value) || 120)}
                  className="w-16 h-8 px-2 rounded bg-[#0B0B0D] border border-white/[0.12] text-xs text-white tabular-nums"
                />
              </div>
              <CinemaToolHUD
                title="BEAT CUT"
                en="Inject rhythmic beat-sync cut markers into the shot timeline."
                bn="বিপিএম অনুযায়ী শট টাইমলাইনে অটো বিট-কাট মার্কার বসাতে চাপুন।"
                accent="amber"
              >
                <button
                  type="button"
                  data-testid="beat-sync-autocut-btn"
                  onClick={handleGenerateBeatMarkers}
                  className="cinema-tile cinema-tile-amber min-h-[38px] px-3 rounded font-black text-[10px] tracking-wider uppercase cursor-pointer"
                >
                  BEAT CUT ({currentFrame.beatMarkersSec?.length || 0})
                </button>
              </CinemaToolHUD>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KEYFRAME ANIMATION SYSTEM */}
      {activeTab === 'keyframes' && (
        <div className="p-3 rounded-lg bg-[#141417] border border-white/[0.08] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CinemaBadgeHeader
              icon={<Diamond className="w-3.5 h-3.5" strokeWidth={2.3} />}
              label={`KEYFRAME ${Math.round(normPlayhead * 100)}%`}
              accent="amber"
            />

            <div className="flex items-center gap-1.5">
              <CinemaToolHUD
                title="ADD KEYFRAME"
                en="Drop or update an animation keyframe at playhead position."
                bn="বর্তমান ফ্রেমে অ্যানিমেশন কীফ্রেম যোগ বা আপডেট করতে চাপুন।"
                accent="amber"
              >
                <button
                  type="button"
                  data-testid="add-keyframe-btn"
                  data-active="true"
                  onClick={() => addOrUpdateKeyframeAtPlayhead()}
                  className="cinema-tile cinema-tile-amber px-2.5 min-h-[36px] rounded text-[10px] font-black tracking-wider uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 cinema-tile-icon" />
                  <span>KEYFRAME</span>
                </button>
              </CinemaToolHUD>
              {selectedKfId && (
                <CinemaToolHUD
                  title="DELETE KEYFRAME"
                  en="Remove the selected keyframe diamond."
                  bn="সিলেক্ট করা কীফ্রেম মুছে ফেলতে চাপুন।"
                  accent="crimson"
                >
                  <button
                    type="button"
                    onClick={removeSelectedKeyframe}
                    className="cinema-tile cinema-tile-crimson p-2 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 cinema-tile-icon" />
                  </button>
                </CinemaToolHUD>
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
              <span className="text-[10px] font-black tracking-wider text-zinc-500 mx-auto uppercase">
                NO KEYFRAMES
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
              <CinemaToolHUD
                key={ease}
                title={`EASING: ${ease.toUpperCase()}`}
                en={`Use ${ease} motion interpolation curve between keyframes.`}
                bn={`কীফ্রেম অ্যানিমেশনের গতি ${ease} মোডে সেট করতে চাপুন।`}
                accent="amber"
                blockWrapper
              >
                <button
                  type="button"
                  data-active={kfEasing === ease ? 'true' : 'false'}
                  onClick={() => {
                    setKfEasing(ease);
                    if (keyframes.length > 0) addOrUpdateKeyframeAtPlayhead({ easing: ease });
                  }}
                  className="cinema-tile cinema-tile-amber w-full min-h-[34px] rounded text-[9px] font-black tracking-wider uppercase cursor-pointer"
                >
                  {ease === 'ease-in-out' ? 'EASE I/O' : ease}
                </button>
              </CinemaToolHUD>
            ))}
          </div>

          {/* Animated Property Sliders */}
          <div className="grid grid-cols-2 gap-3 text-[10px] font-bold">
            {(
              [
                { key: 'x', label: 'POS X', min: -40, max: 40, step: 1, val: activeInterp.x, unit: '%' },
                { key: 'y', label: 'POS Y', min: -40, max: 40, step: 1, val: activeInterp.y, unit: '%' },
                { key: 'scale', label: 'SCALE', min: 0.5, max: 2.5, step: 0.05, val: activeInterp.scale, unit: 'x' },
                { key: 'rotation', label: 'ROTATE', min: -180, max: 180, step: 1, val: activeInterp.rotation, unit: '°' },
                { key: 'opacity', label: 'OPACITY', min: 0, max: 1, step: 0.05, val: activeInterp.opacity, unit: '' },
                { key: 'volume', label: 'GAIN', min: 0, max: 2, step: 0.05, val: activeInterp.volume, unit: 'x' }
              ] as const
            ).map((ctrl) => (
              <div key={ctrl.key}>
                <div className="flex justify-between text-zinc-400 mb-0.5 uppercase">
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

      {/* TAB 3: SPEED RAMPING + OPTICAL FLOW */}
      {activeTab === 'speed-ramp' && (
        <div className="p-3 rounded-lg bg-[#141417] border border-white/[0.08] space-y-3">
          <CinemaBadgeHeader
            icon={<Gauge className="w-3.5 h-3.5" strokeWidth={2.3} />}
            label="SPEED RAMP"
            accent="amber"
            rightSlot={<span className="text-[10px] text-cyan-300 font-black">{activePreset}</span>}
          />

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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {SPEED_RAMP_PRESETS.map((p) => {
              const shortTag =
                p.id === 'NONE'
                  ? 'LINEAR'
                  : p.id === 'BULLET_TIME'
                    ? 'BULLET'
                    : p.id === 'WHIP_CUT'
                      ? 'WHIP CUT'
                      : p.id === 'HEARTBEAT_PULSE'
                        ? 'PULSE'
                        : p.shortLabel.toUpperCase();
              return (
                <CinemaToolHUD
                  key={p.id}
                  hudId={p.id === 'HERO_RAMP' ? 'hero-ramp' : undefined}
                  title={`${p.label.toUpperCase()} RAMP`}
                  en={`Apply ${p.label} speed curve (${p.curveSummary}).`}
                  bn={`ক্লিপে ${p.label} গতির স্মুথ স্পিড র‍্যাম্প প্রয়োগ করতে চাপুন।`}
                  accent="amber"
                  blockWrapper
                >
                  <button
                    type="button"
                    data-testid={`speed-ramp-${p.id}`}
                    data-active={activePreset === p.id ? 'true' : 'false'}
                    onClick={() => {
                      if (!guardPro('Speed Ramping & Optical Flow')) return;
                      onUpdateFrame({
                        ...currentFrame,
                        speedRampPreset: p.id,
                        speedRampKeyframes: undefined
                      });
                      flash(`Speed ramp preset: ${p.label}`);
                    }}
                    className="cinema-tile cinema-tile-amber w-full min-h-[44px] px-2 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer"
                  >
                    <Gauge className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                    <span className="text-[10px] font-black tracking-wider uppercase">{shortTag}</span>
                  </button>
                </CinemaToolHUD>
              );
            })}
          </div>

          {/* Optical Flow Frame Interpolation Toggle */}
          <div className="pt-2 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] text-zinc-300 font-black tracking-wider uppercase">
              OPTICAL FLOW
            </span>
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'NONE', label: 'OFF' },
                  { id: 'FRAME_BLEND', label: 'BLEND' },
                  { id: 'OPTICAL_FLOW', label: 'AI FLOW' }
                ] as const
              ).map((m) => (
                <CinemaToolHUD
                  key={m.id}
                  title={`SLOW-MO: ${m.label}`}
                  en={`Use ${m.label} frame synthesis for smooth slow motion.`}
                  bn={`স্লো-মোশন মসৃণ করতে ${m.label} মোড নির্বাচন করুন।`}
                  accent="cyan"
                >
                  <button
                    type="button"
                    data-testid={`optical-flow-${m.id}`}
                    data-active={activeOpticalFlow === m.id ? 'true' : 'false'}
                    onClick={() => {
                      if (!guardPro('Optical Flow Slow-Motion')) return;
                      onUpdateFrame({ ...currentFrame, opticalFlowMode: m.id });
                    }}
                    className="cinema-tile cinema-tile-cyan px-2.5 min-h-[34px] rounded text-[10px] font-black tracking-wider uppercase cursor-pointer"
                  >
                    {m.label}
                  </button>
                </CinemaToolHUD>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 3D COLOR & OPTICS */}
      {activeTab === 'color-fx' && (
        <div className="p-3 rounded-lg bg-[#141417] border border-white/[0.08] space-y-3">
          <CinemaBadgeHeader
            icon={<Palette className="w-3.5 h-3.5" strokeWidth={2.3} />}
            label="3D COLOR"
            accent="emerald"
            rightSlot={
              <CinemaToolHUD
                title="RESET WHEELS"
                en="Reset Lift, Gamma, Gain, grain, and optical blur."
                bn="সব কালার হুইল ও অপটিক্যাল ইফেক্ট রিসেট করতে চাপুন।"
                accent="amber"
              >
                <button
                  type="button"
                  onClick={() =>
                    onUpdateFrame({ ...currentFrame, colorWheels: { ...DEFAULT_COLOR_WHEELS } })
                  }
                  className="cinema-tile cinema-tile-amber px-2 py-1 rounded text-[9.5px] font-black uppercase flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 cinema-tile-icon" />
                  <span>RESET</span>
                </button>
              </CinemaToolHUD>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(['lift', 'gamma', 'gain'] as const).map((zone) => (
              <div key={zone} className="p-2.5 rounded bg-[#0B0B0D] border border-white/[0.08] space-y-2">
                <div className="text-[10px] font-black uppercase text-center text-zinc-200 tracking-wider">
                  {zone.toUpperCase()}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/[0.08] text-[10px] font-bold">
            {(
              [
                { key: 'grain', label: '35MM GRAIN', val: wheels.grain },
                { key: 'halation', label: 'HALATION', val: wheels.halation },
                { key: 'motionBlur3d', label: '3D BLUR', val: wheels.motionBlur3d }
              ] as const
            ).map((fx) => (
              <div key={fx.key}>
                <div className="flex justify-between text-zinc-400 mb-1 uppercase">
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
