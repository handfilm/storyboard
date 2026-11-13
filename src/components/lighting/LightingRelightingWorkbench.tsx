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
            <div className="flex items-center gap-1.5 min-w-0">
              <Sun className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
              <span className="text-[10px] font-black tracking-wider text-white uppercase truncate">
                LIGHT RIG ({LIGHTING_PRESETS.length})
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setLightConfig({ ...DEFAULT_SHOT_LIGHT_CONFIG })}
                className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-[8.5px] uppercase flex items-center gap-1 cursor-pointer"
                title="Reset 3D light nodes & sliders"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>RESET</span>
              </button>
              <button
                type="button"
                onClick={handleClearRig}
                className="px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[8.5px] uppercase flex items-center gap-1 cursor-pointer"
                title="Clear active lighting rig"
              >
                <Trash2 className="w-2.5 h-2.5" />
                <span>CLEAR</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1 bg-black/60 p-0.5 rounded border border-white/10">
            {(['ALL', 'ATMO', 'GORO', 'TONE', 'STUDIO'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                data-testid={`lighting-filter-${tab.toLowerCase()}`}
                onClick={() => setFilterTab(tab)}
                className={`py-1 rounded text-[8.5px] font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap transition-colors ${
                  filterTab === tab
                    ? 'bg-[#F59E0B] text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="px-2 py-1 rounded bg-black/60 border border-white/10 flex items-center justify-between text-[8.5px]">
            <span className="text-zinc-400 uppercase">ACTIVE RIG</span>
            <span className="text-[#FFE066] font-bold truncate max-w-[190px]">
              {activePreset ? activePreset.name : 'CUSTOM 3-POINT RIG'}
            </span>
          </div>
        </div>

        {/* Scrollable 3-Column Visual Gradient Preset Cards */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
          <div className="grid grid-cols-3 gap-1.5">
            {filteredPresets.map((preset, idx) => {
              const isSelected = selectedLightId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`lighting-preset-${preset.id}`}
                  onClick={() => handleSelectPreset(preset)}
                  className={`group rounded-md border overflow-hidden text-left cursor-pointer transition-all flex flex-col ${
                    isSelected
                      ? 'border-[#F59E0B] bg-[#F59E0B]/10 ring-1 ring-[#F59E0B]/50'
                      : 'border-white/10 bg-black/50 hover:border-white/30'
                  }`}
                  title={preset.name}
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
                  <div className="px-1.5 py-1 bg-[#0B0B0D]">
                    <div
                      className={`text-[8px] font-bold leading-tight truncate ${
                        isSelected ? 'text-[#FFE066]' : 'text-zinc-300 group-hover:text-white'
                      }`}
                    >
                      {preset.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pinned Always-Visible Bottom Footer */}
        <div className="shrink-0 p-3 border-t border-white/[0.08] bg-[#0B0B0D] flex flex-col gap-1.5">
          <button
            type="button"
            data-testid="apply-lighting-to-shot-btn"
            onClick={() => onApplyToShot(selectedLightId, lightConfig)}
            className="w-full py-2 rounded bg-[#F59E0B] hover:bg-amber-400 active:scale-[0.99] text-black font-black text-[10px] tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
          >
            <Check className="w-3.5 h-3.5" />
            <span>✓ APPLY TO SHOT</span>
          </button>
          <button
            type="button"
            data-testid="apply-lighting-to-all-btn"
            onClick={() => onApplyToAllShots(selectedLightId, lightConfig)}
            className="w-full py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-[#F59E0B]/50 text-amber-300 font-bold text-[9.5px] tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>⚡ APPLY TO ALL SHOTS</span>
          </button>
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
              <button
                key={orb.key}
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
                title={`Drag ${orb.label} light position`}
              >
                {orb.label} {orb.pos.x}%
              </button>
            ))}

            <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/75 border border-white/10 text-[8px] text-zinc-300 pointer-events-none tabular-nums">
              DRAG KEY / RIM / FILL ORBS • {lightConfig.colorTempK}K • {frame?.aspectRatio || '2.39:1'}
            </div>
          </div>
        </div>

        {/* Bottom 6-Slider Pro Cinematography Rack */}
        <div className="shrink-0 px-4 py-2.5 border-t border-white/[0.08] bg-[#0B0B0D] grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-[9px]">
          <div>
            <div className="flex justify-between text-zinc-400 tabular-nums">
              <span>KEY INTENSITY</span>
              <span className="text-[#FFE066] font-bold">{lightConfig.keyIntensity}%</span>
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

          <div>
            <div className="flex justify-between text-zinc-400 tabular-nums">
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: `rgb(${kelvinRgb.r},${kelvinRgb.g},${kelvinRgb.b})` }}
                />
                COLOR TEMP
              </span>
              <span className="text-[#FFE066] font-bold">{lightConfig.colorTempK}K</span>
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

          <div>
            <div className="flex justify-between text-zinc-400 tabular-nums">
              <span>VOLUMETRIC HAZE</span>
              <span className="text-[#FFE066] font-bold">{lightConfig.hazeBloom}%</span>
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

          <div>
            <div className="flex justify-between text-zinc-400 tabular-nums">
              <span>RIM CATCHLIGHT</span>
              <span className="text-[#38BDF8] font-bold">{lightConfig.rimCatchlight}%</span>
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

          <div>
            <div className="flex justify-between text-zinc-400 tabular-nums">
              <span>VIGNETTE FALLOFF</span>
              <span className="text-zinc-200 font-bold">{lightConfig.vignetteFalloff}%</span>
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

          <div>
            <div className="flex justify-between text-zinc-400 tabular-nums">
              <span>STREAK ANGLE</span>
              <span className="text-[#FFE066] font-bold">{lightConfig.streakAngle}°</span>
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
        </div>
      </section>
    </div>
  );
};
