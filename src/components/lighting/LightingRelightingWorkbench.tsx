/**
 * @file /src/components/lighting/LightingRelightingWorkbench.tsx
 * @description Window-fitted 34-Preset & Interactive 3D Relighting Workbench (`💡 LIGHT RIG (34)`).
 * Features:
 * - Left Dock (`360px`) with ALL | ATMO | GORO | TONE | STUDIO filter tabs,
 *   3-col scrollable visual swatch cards, and ALWAYS-VISIBLE pinned bottom footer buttons.
 * - Right Live `2.39:1` Stage Canvas with interactive Draggable KEY / RIM / FILL Light Orbs
 *   and 6 Pro Cinematography Relighting Sliders (Key Intensity, Color Temp K, Haze Bloom,
 *   Rim Catchlight, Vignette Falloff, Anamorphic Streak Angle).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, RotateCcw, Sun, Trash2, Zap } from 'lucide-react';
import {
  getLightingPresetById,
  LIGHTING_PRESETS,
  LightingCategory,
  LightingPreset
} from '../../data/lightingPresets';
import type { AnthologyFrame, ShotLightConfig } from '../../types/anthology';
import {
  buildPresetRelightDefaults,
  buildStageLightOverlayStyles,
  DEFAULT_SHOT_LIGHT_CONFIG,
  getPresetSwatchGradient,
  kelvinToRgb,
  normalizeShotLightConfig,
  renderShotLightConfigToCanvas
} from '../../services/lightingRelightingService';
import { renderProceduralBackdropToCanvas } from '../../data/proceduralCinemaEngine';
import { useLicenseStore } from '../../services/licenseService';
import { CinemaToolHUD, CinemaBadgeHeader } from '../ui/CinemaToolHUD';

export type LightingFilterTabId = 'ALL' | 'ATMO' | 'GORO' | 'TONE' | 'STUDIO';

export interface LightingRelightingWorkbenchProps {
  frame: AnthologyFrame;
  shotIndex: number;
  selectedLightId: string | null;
  initialLightConfig?: ShotLightConfig | null;
  onSelectLightId: (id: string | null) => void;
  onApplyToShot: (lightId: string | null, lightConfig: ShotLightConfig | null) => void;
  onApplyToAllShots: (lightId: string | null, lightConfig: ShotLightConfig | null) => void;
}

export const LightingRelightingWorkbench: React.FC<LightingRelightingWorkbenchProps> = ({
  frame,
  shotIndex,
  selectedLightId,
  initialLightConfig,
  onSelectLightId,
  onApplyToShot,
  onApplyToAllShots
}) => {
  const [filterTab, setFilterTab] = useState<LightingFilterTabId>('ALL');
  const [lightConfig, setLightConfig] = useState<ShotLightConfig>(() =>
    normalizeShotLightConfig(initialLightConfig)
  );
  const [draggingNode, setDraggingNode] = useState<'keyPos' | 'rimPos' | 'fillPos' | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setLightConfig(normalizeShotLightConfig(initialLightConfig));
  }, [initialLightConfig, frame?.id]);

  const filteredPresets = useMemo<ReadonlyArray<LightingPreset>>(() => {
    if (filterTab === 'ALL') return LIGHTING_PRESETS;
    const catMap: Record<Exclude<LightingFilterTabId, 'ALL'>, LightingCategory> = {
      ATMO: 'ATMOSPHERE',
      GORO: 'OPTICAL',
      TONE: 'EXPOSURE',
      STUDIO: 'STUDIO'
    };
    return LIGHTING_PRESETS.filter((p) => p.category === catMap[filterTab]);
  }, [filterTab]);

  const activePreset = selectedLightId ? getLightingPresetById(selectedLightId) : undefined;
  const overlayStyles = useMemo(() => buildStageLightOverlayStyles(lightConfig), [lightConfig]);
  const kelvinRgb = useMemo(() => kelvinToRgb(lightConfig.colorTempK), [lightConfig.colorTempK]);

  // Load shot frame image for canvas render
  useEffect(() => {
    let active = true;
    loadedImageRef.current = null;
    if (!frame?.imageUrl || frame.isVideo) return;

    const img = new Image();
    if (!frame.imageUrl.startsWith('blob:') && !frame.imageUrl.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (active) loadedImageRef.current = img;
    };
    img.src = frame.imageUrl;
    return () => {
      active = false;
    };
  }, [frame?.imageUrl, frame?.isVideo]);

  // Render live relit 2.39:1 canvas preview
  useEffect(() => {
    let rafId = 0;
    const renderPreview = (now: number) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          ctx.save();
          if (activePreset?.filter) {
            ctx.filter = activePreset.filter;
          }
          const img = loadedImageRef.current;
          if (img && img.naturalWidth > 0) {
            const ir = img.naturalWidth / img.naturalHeight;
            const cr = w / h;
            let dw = w;
            let dh = h;
            let dx = 0;
            let dy = 0;
            if (ir > cr) {
              dw = h * ir;
              dx = (w - dw) / 2;
            } else {
              dh = w / ir;
              dy = (h - dh) / 2;
            }
            ctx.drawImage(img, dx, dy, dw, dh);
          } else {
            renderProceduralBackdropToCanvas(ctx, w, h, shotIndex, 0);
          }
          ctx.restore();

          renderShotLightConfigToCanvas(ctx, w, h, lightConfig, activePreset || null, now);
        }
      }
      if (
        selectedLightId === 'passing' ||
        selectedLightId === 'strobe' ||
        selectedLightId === 'firelight'
      ) {
        rafId = requestAnimationFrame(renderPreview);
      }
    };

    rafId = requestAnimationFrame(renderPreview);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activePreset, selectedLightId, lightConfig, shotIndex, frame?.imageUrl]);

  const handleSelectPreset = (preset: LightingPreset) => {
    if (!useLicenseStore.getState().requireProAccess('34 Pro Light Rigs')) return;
    onSelectLightId(preset.id);
    setLightConfig(buildPresetRelightDefaults(preset));
  };

  const handleClearRig = () => {
    onSelectLightId(null);
    setLightConfig({ ...DEFAULT_SHOT_LIGHT_CONFIG });
  };

  const updateLightPosFromPointer = (
    clientX: number,
    clientY: number,
    nodeKey: 'keyPos' | 'rimPos' | 'fillPos'
  ) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const x = Math.max(2, Math.min(98, Math.round(((clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(2, Math.min(98, Math.round(((clientY - rect.top) / rect.height) * 100)));
    setLightConfig((prev) => ({
      ...prev,
      [nodeKey]: { x, y }
    }));
  };

  return (
    <div
      data-testid="lighting-relighting-workbench"
      className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-[#060608] font-mono select-none"
    >
      {/* LEFT CONTROL DOCK */}
      <aside className="w-full lg:w-[360px] shrink-0 h-[44%] lg:h-full flex flex-col bg-[#0B0B0D] border-b lg:border-b-0 lg:border-r border-white/[0.08] overflow-hidden">
        {/* Header + Filter Pills */}
        <div className="p-2.5 border-b border-white/[0.08] space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <CinemaBadgeHeader
              icon={Sun}
              label={`LIGHT RIG (${LIGHTING_PRESETS.length})`}
              accent="amber"
            />
            <div className="flex items-center gap-1 shrink-0">
              <CinemaToolHUD
                title="RESET 3-POINT ORBS"
                en="Resets Key, Rim, and Fill orb coordinates and sliders to neutral."
                bn="কীভাবে ব্যবহার করবেন: লাইটের পজিশন ও স্লাইডার রিসেট করতে RESET চাপুন।"
                accent="amber"
                side="bottom"
              >
                <button
                  type="button"
                  onClick={() => setLightConfig({ ...DEFAULT_SHOT_LIGHT_CONFIG })}
                  className="cinema-tile cinema-tile-amber px-2 py-1 rounded text-[9px] font-black tracking-wider uppercase flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>RESET</span>
                </button>
              </CinemaToolHUD>
              <CinemaToolHUD
                title="CLEAR LIGHT RIG"
                en="Removes active 34-preset atmospheric lighting from the shot."
                bn="কীভাবে ব্যবহার করবেন: শটের লাইটিং ইফেক্ট পুরোপুরি মুছে ফেলতে CLEAR চাপুন।"
                accent="crimson"
                side="bottom"
              >
                <button
                  type="button"
                  onClick={handleClearRig}
                  className="cinema-tile cinema-tile-crimson px-2 py-1 rounded text-[9px] font-black tracking-wider uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>CLEAR</span>
                </button>
              </CinemaToolHUD>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1 bg-black/60 p-1 rounded border border-white/10">
            {(['ALL', 'ATMO', 'GORO', 'TONE', 'STUDIO'] as const).map((tab) => (
              <CinemaToolHUD
                key={tab}
                title={`FILTER: ${tab}`}
                en={`Filters lighting presets by ${tab} category.`}
                bn="কীভাবে ব্যবহার করবেন: ক্যাটাগরি অনুযায়ী লাইটিং প্রিসেট ফিল্টার করতে ট্যাবে চাপুন।"
                accent="amber"
                side="bottom"
              >
                <button
                  type="button"
                  data-testid={`lighting-filter-${tab.toLowerCase()}`}
                  data-active={filterTab === tab ? 'true' : 'false'}
                  onClick={() => setFilterTab(tab)}
                  className="cinema-tile cinema-tile-amber w-full py-1 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer whitespace-nowrap"
                >
                  {tab}
                </button>
              </CinemaToolHUD>
            ))}
          </div>

          <div className="px-2 py-1 rounded bg-black/60 border border-white/10 flex items-center justify-between text-[9px]">
            <span className="text-zinc-400 font-black uppercase tracking-wider">ACTIVE</span>
            <span className="text-[#FFE066] font-black uppercase truncate max-w-[190px]">
              {activePreset ? activePreset.name : '3-POINT RIG'}
            </span>
          </div>
        </div>

        {/* Scrollable 3-Column Visual Gradient Preset Cards */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
          <div className="grid grid-cols-3 gap-1.5">
            {filteredPresets.map((preset, idx) => {
              const isSelected = selectedLightId === preset.id;
              return (
                <CinemaToolHUD
                  key={preset.id}
                  title={preset.name.toUpperCase()}
                  en={`${preset.category} lighting rig preset (#${String(idx + 1).padStart(2, '0')}).`}
                  bn="কীভাবে ব্যবহার করবেন: প্রিভিউ করতে এই লাইট কার্ডে ক্লিক করুন এবং নিচে APPLY চাপুন।"
                  accent="amber"
                  side="right"
                >
                  <button
                    type="button"
                    data-testid={`lighting-preset-${preset.id}`}
                    data-active={isSelected ? 'true' : 'false'}
                    onClick={() => handleSelectPreset(preset)}
                    className="cinema-tile cinema-tile-amber w-full rounded-md overflow-hidden text-left cursor-pointer flex flex-col"
                  >
                    <div
                      className="h-9 w-full relative flex items-start justify-between p-1"
                      style={{ background: getPresetSwatchGradient(preset) }}
                    >
                      <span className="text-[7.5px] font-bold px-1 rounded bg-black/65 text-zinc-200 tabular-nums">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                      )}
                    </div>
                    <div className="px-1.5 py-1 bg-[#0B0B0D] w-full">
                      <div
                        className={`text-[9px] font-black uppercase tracking-wider leading-tight truncate ${
                          isSelected ? 'text-[#FFE066]' : 'text-zinc-200'
                        }`}
                      >
                        {preset.name}
                      </div>
                    </div>
                  </button>
                </CinemaToolHUD>
              );
            })}
          </div>
        </div>

        {/* Pinned Always-Visible Bottom Footer */}
        <div className="shrink-0 p-3 border-t border-white/[0.08] bg-[#0B0B0D] grid grid-cols-2 gap-2">
          <CinemaToolHUD
            title="APPLY LIGHT TO SHOT"
            en="Commits selected lighting rig and 3D orb setup to current shot."
            bn="কীভাবে ব্যবহার করবেন: শুধু বর্তমান শটে আলো সেট করতে APPLY SHOT চাপুন।"
            accent="amber"
            side="top"
          >
            <button
              type="button"
              data-testid="apply-lighting-to-shot-btn"
              data-active="true"
              onClick={() => {
                if (!useLicenseStore.getState().requireProAccess('34 Pro Light Rigs')) return;
                onApplyToShot(selectedLightId, lightConfig);
              }}
              className="cinema-tile cinema-tile-amber w-full min-h-[44px] px-2 rounded font-black text-[10px] tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Check className="w-4 h-4" />
              <span>APPLY SHOT</span>
            </button>
          </CinemaToolHUD>
          <CinemaToolHUD
            title="APPLY LIGHT TO ALL SHOTS"
            en="Syncs this lighting rig across every shot in the sequence."
            bn="কীভাবে ব্যবহার করবেন: পুরো সিনেমার সব শটে একই আলো দিতে APPLY ALL চাপুন।"
            accent="cyan"
            side="top"
          >
            <button
              type="button"
              data-testid="apply-lighting-to-all-btn"
              onClick={() => {
                if (!useLicenseStore.getState().requireProAccess('34 Pro Light Rigs')) return;
                onApplyToAllShots(selectedLightId, lightConfig);
              }}
              className="cinema-tile cinema-tile-cyan w-full min-h-[44px] px-2 rounded font-black text-[10px] tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-4 h-4 text-[#F59E0B]" />
              <span>APPLY ALL</span>
            </button>
          </CinemaToolHUD>
        </div>
      </aside>

      {/* RIGHT LIVE 2.39:1 RELIGHTING STAGE + 6 PRO SLIDERS */}
      <section className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-[#050507]">
        {/* Interactive Stage Canvas w/ Draggable 3D Light Orbs */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div
            ref={stageRef}
            onPointerMove={(e) => {
              if (draggingNode) {
                updateLightPosFromPointer(e.clientX, e.clientY, draggingNode);
              }
            }}
            onPointerUp={() => setDraggingNode(null)}
            onPointerLeave={() => setDraggingNode(null)}
            className="relative w-full max-w-[780px] aspect-[2.39/1] max-h-full bg-black rounded-[2px] border border-[#F59E0B]/40 overflow-hidden shadow-2xl touch-none"
          >
            <canvas
              ref={canvasRef}
              width={956}
              height={400}
              className="w-full h-full block object-cover"
            />

            {/* Subtle Volumetric CSS Sheen Preview */}
            <div
              className="absolute inset-0 pointer-events-none mix-blend-screen"
              style={{ background: overlayStyles.hazeGradient }}
            />

            {/* Interactive Draggable Light Orbs: KEY / RIM / FILL */}
            {(
              [
                {
                  key: 'keyPos',
                  label: 'KEY',
                  pos: lightConfig.keyPos,
                  color: `rgb(${kelvinRgb.r}, ${kelvinRgb.g}, ${kelvinRgb.b})`
                },
                {
                  key: 'rimPos',
                  label: 'RIM',
                  pos: lightConfig.rimPos,
                  color: '#38BDF8'
                },
                {
                  key: 'fillPos',
                  label: 'FILL',
                  pos: lightConfig.fillPos,
                  color: '#FDE68A'
                }
              ] as const
            ).map((orb) => (
              <CinemaToolHUD
                key={orb.key}
                title={`${orb.label} LIGHT ORB`}
                en={`Drag to reposition ${orb.label} light source in 3D space.`}
                bn="কীভাবে ব্যবহার করবেন: স্ক্রিনের KEY, RIM ও FILL বলগুলো ড্র্যাগ করে সিনেমার আলো সেট করুন।"
                accent={orb.key === 'rimPos' ? 'cyan' : 'amber'}
                side="top"
              >
                <button
                  type="button"
                  data-testid={`light-orb-${orb.key}`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                    setDraggingNode(orb.key);
                  }}
                  onPointerMove={(e) => {
                    if (draggingNode === orb.key) {
                      updateLightPosFromPointer(e.clientX, e.clientY, orb.key);
                    }
                  }}
                  onPointerUp={() => setDraggingNode(null)}
                  style={{
                    left: `${orb.pos.x}%`,
                    top: `${orb.pos.y}%`,
                    borderColor: orb.color,
                    boxShadow: `0 0 14px ${orb.color}`
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-black/80 border-2 text-[8px] font-black text-white tracking-wider cursor-grab active:cursor-grabbing hover:scale-110 transition-transform tabular-nums"
                >
                  {orb.label} {orb.pos.x}%
                </button>
              </CinemaToolHUD>
            ))}

            <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/75 border border-white/10 text-[8px] font-black uppercase text-zinc-300 pointer-events-none tabular-nums">
              {lightConfig.colorTempK}K • {frame?.aspectRatio || '2.39:1'}
            </div>
          </div>
        </div>

        {/* Bottom 6-Slider Pro Cinematography Rack */}
        <div className="shrink-0 px-4 py-2.5 border-t border-white/[0.08] bg-[#0B0B0D] grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-[9px]">
          <CinemaToolHUD
            title="KEY LIGHT INTENSITY"
            en="Controls primary key light brightness on the subject."
            bn="কীভাবে ব্যবহার করবেন: স্লাইডার টেনে মূল আলোর তীব্রতা বাড়ান বা কমান।"
            accent="amber"
            side="top"
            blockWrapper
          >
            <div>
              <div className="flex justify-between font-black tracking-wider text-zinc-400 tabular-nums">
                <span>KEY LIGHT</span>
                <span className="text-[#FFE066]">{lightConfig.keyIntensity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={lightConfig.keyIntensity}
                onChange={(e) =>
                  setLightConfig((p) => ({ ...p, keyIntensity: Number(e.target.value) }))
                }
                className="w-full accent-[#F59E0B] cursor-pointer"
              />
            </div>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="KELVIN COLOR TEMP"
            en="Shifts key light warmth from 2400K tungsten to 7500K cool daylight."
            bn="কীভাবে ব্যবহার করবেন: উষ্ণ সোনালি বা শীতল নীল আলো পেতে স্লাইডার সরান।"
            accent="amber"
            side="top"
            blockWrapper
          >
            <div>
              <div className="flex justify-between font-black tracking-wider text-zinc-400 tabular-nums">
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: `rgb(${kelvinRgb.r},${kelvinRgb.g},${kelvinRgb.b})` }}
                  />
                  TEMP K
                </span>
                <span className="text-[#FFE066]">{lightConfig.colorTempK}K</span>
              </div>
              <input
                type="range"
                min={2400}
                max={7500}
                step={100}
                value={lightConfig.colorTempK}
                onChange={(e) =>
                  setLightConfig((p) => ({ ...p, colorTempK: Number(e.target.value) }))
                }
                className="w-full accent-[#F59E0B] cursor-pointer"
              />
            </div>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="VOLUMETRIC HAZE"
            en="Adds atmospheric fog bloom around light sources."
            bn="কীভাবে ব্যবহার করবেন: স্লাইডার বাড়িয়ে ফ্রেমে সিনেমার ধোঁয়া ও গ্লো যোগ করুন।"
            accent="amber"
            side="top"
            blockWrapper
          >
            <div>
              <div className="flex justify-between font-black tracking-wider text-zinc-400 tabular-nums">
                <span>HAZE</span>
                <span className="text-[#FFE066]">{lightConfig.hazeBloom}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={lightConfig.hazeBloom}
                onChange={(e) =>
                  setLightConfig((p) => ({ ...p, hazeBloom: Number(e.target.value) }))
                }
                className="w-full accent-[#F59E0B] cursor-pointer"
              />
            </div>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="RIM CATCHLIGHT"
            en="Boosts backlight edge separation along subject contours."
            bn="কীভাবে ব্যবহার করবেন: চরিত্রের চারপাশে শার্ফ রিম লাইট দিতে বাড়ান।"
            accent="cyan"
            side="top"
            blockWrapper
          >
            <div>
              <div className="flex justify-between font-black tracking-wider text-zinc-400 tabular-nums">
                <span>RIM LIGHT</span>
                <span className="text-[#38BDF8]">{lightConfig.rimCatchlight}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={lightConfig.rimCatchlight}
                onChange={(e) =>
                  setLightConfig((p) => ({ ...p, rimCatchlight: Number(e.target.value) }))
                }
                className="w-full accent-[#38BDF8] cursor-pointer"
              />
            </div>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="VIGNETTE FALLOFF"
            en="Darkens frame corners to draw focus into the illuminated center."
            bn="কীভাবে ব্যবহার করবেন: চারপাশ ডার্ক করে মাঝে ফোকাস আনতে ভিনিয়েট বাড়ান।"
            accent="amber"
            side="top"
            blockWrapper
          >
            <div>
              <div className="flex justify-between font-black tracking-wider text-zinc-400 tabular-nums">
                <span>VIGNETTE</span>
                <span className="text-zinc-200">{lightConfig.vignetteFalloff}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={lightConfig.vignetteFalloff}
                onChange={(e) =>
                  setLightConfig((p) => ({ ...p, vignetteFalloff: Number(e.target.value) }))
                }
                className="w-full accent-zinc-300 cursor-pointer"
              />
            </div>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="ANAMORPHIC STREAK ANGLE"
            en="Rotates horizontal optical lens flare streak angle (-45° to +45°)."
            bn="কীভাবে ব্যবহার করবেন: অ্যানামর্ফিক ফ্লেয়ার রেখার কোণ ঘোরাতে স্লাইডার সরান।"
            accent="amber"
            side="top"
            blockWrapper
          >
            <div>
              <div className="flex justify-between font-black tracking-wider text-zinc-400 tabular-nums">
                <span>STREAK</span>
                <span className="text-[#FFE066]">{lightConfig.streakAngle}°</span>
              </div>
              <input
                type="range"
                min={-45}
                max={45}
                value={lightConfig.streakAngle}
                onChange={(e) =>
                  setLightConfig((p) => ({ ...p, streakAngle: Number(e.target.value) }))
                }
                className="w-full accent-[#F59E0B] cursor-pointer"
              />
            </div>
          </CinemaToolHUD>
        </div>
      </section>
    </div>
  );
};
