/**
 * @file /src/features/ai/AIDirectorSlidePanel.tsx
 * @description Module 12: AI DIRECTOR (Visual Cine Prompt Engine & Consistency Matrix)
 * Features:
 * - Engine architecture for Veo, Flow, Midjourney, and Flux
 * - Parameter Stepper Rack:
 *   - Camera Lens: [ 18mm Ultra-Wide ], [ 35mm Master Prime ], [ 85mm Portrait Cine ], [ 2.39:1 Anamorphic ]
 *   - Dynamic Lighting: [ Chiaroscuro Low-Key ], [ Volumetric God Rays ], [ Tungsten Warmth ], [ Cyberpunk Neon Rim ]
 *   - Camera Motion: [ Slow Push-In Dolly ], [ Hypersonic Whip Pan ], [ Orbital 360 Roll ], [ Handheld Kinetic Shake ]
 * - Live Prompt Terminal auto-generating production-ready prompts from shot metadata
 * - 1-Click Actions: [ 📋 COPY MASTER PROMPT ] & [ ⚡ BATCH GENERATE BEAT PROMPTS (1-100) ]
 */

import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Zap, 
  Terminal, 
  Layers, 
  Camera, 
  Sun, 
  Move, 
  Cpu, 
  Download,
  CheckCircle2,
  List
} from 'lucide-react';
import { useStudioStore } from '../../core/store';
import { audioEngine } from '../../utils/audioEngine';

export const AIDirectorSlidePanel: React.FC = () => {
  const { project, activeShotIndex } = useStudioStore();

  const currentFrame = project.shots[activeShotIndex] || project.shots[0] || {
    epNumber: '001',
    title: 'THE SINGULARITY',
    tagline: '24.0 FPS UNCOMPRESSED MASTER',
    directorNotes: 'Woman looking into the void, cyan eye reflections'
  };

  // Model Target
  const [modelTarget, setModelTarget] = useState<'veo' | 'flow' | 'midjourney' | 'flux'>('veo');

  // Stepper Rack Parameters
  const [lens, setLens] = useState<'18mm Ultra-Wide' | '35mm Master Prime' | '85mm Portrait Cine' | '2.39:1 Anamorphic'>('35mm Master Prime');
  const [lighting, setLighting] = useState<'Chiaroscuro Low-Key' | 'Volumetric God Rays' | 'Tungsten Warmth' | 'Cyberpunk Neon Rim'>('Volumetric God Rays');
  const [motion, setMotion] = useState<'Slow Push-In Dolly' | 'Hypersonic Whip Pan' | 'Orbital 360 Roll' | 'Handheld Kinetic Shake'>('Slow Push-In Dolly');
  const [filmStock, setFilmStock] = useState('Kodak 5219 Vision3 stock');

  const [isCopied, setIsCopied] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchGenerated, setBatchGenerated] = useState<string[]>([]);
  const [batchGenerating, setBatchGenerating] = useState(false);

  // Auto-generate live prompt
  const masterPrompt = useMemo(() => {
    const sceneSubject = currentFrame.directorNotes || currentFrame.tagline || 'cinematic protagonist looking into atmospheric abyss';
    const shotLabel = `Shot ${currentFrame.epNumber}: "${currentFrame.title}"`;

    if (modelTarget === 'midjourney') {
      return `Cinematic 35mm anamorphic still, 2.39:1 aspect ratio, ${sceneSubject}, ${lens}, ${lighting.toLowerCase()}, ${motion.toLowerCase()}, subtle 35mm film grain, ${filmStock}, atmospheric haze, photorealistic hyper-detail --ar 2.39:1 --style raw --v 6.1`;
    } else if (modelTarget === 'veo') {
      return `Google Veo 2 Cinema Master: 12.0s duration. 2.39:1 widescreen scope. ${shotLabel}. ${sceneSubject}. Camera rig: ${lens} on Arri Alexa LF. Dynamic lighting: ${lighting}. Camera motion vector: ${motion}. Photochemical texture: ${filmStock}. 24fps motion cadence, ultra high-fidelity dynamic range.`;
    } else if (modelTarget === 'flux') {
      return `FLUX.1-pro cinema shot: ${sceneSubject}, framed with ${lens}, ${lighting}, ${motion}, raw film texture, 2.39:1 aspect ratio, anamorphic bokeh, rich shadow roll-off, Kodak color science, 8k resolution.`;
    } else {
      return `Flow AI Temporal Vector: ${shotLabel} // ${sceneSubject} // Optic: ${lens} // Illuminance: ${lighting} // Vector: ${motion} // Stock: ${filmStock} // Aspect: 2.39:1 Scope.`;
    }
  }, [modelTarget, lens, lighting, motion, filmStock, currentFrame]);

  const handleCopyPrompt = () => {
    try {
      audioEngine.playShutterClick();
    } catch {}
    navigator.clipboard.writeText(masterPrompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleBatchGenerate = () => {
    try {
      audioEngine.playShutterClick();
    } catch {}
    setBatchGenerating(true);
    setShowBatchModal(true);

    setTimeout(() => {
      const generated = Array.from({ length: 100 }).map((_, i) => {
        const ep = String(i + 1).padStart(3, '0');
        const l = ['18mm Ultra-Wide', '35mm Master Prime', '85mm Portrait Cine', '2.39:1 Anamorphic'][i % 4];
        const lt = ['Chiaroscuro Low-Key', 'Volumetric God Rays', 'Tungsten Warmth', 'Cyberpunk Neon Rim'][(i + 1) % 4];
        const m = ['Slow Push-In Dolly', 'Hypersonic Whip Pan', 'Orbital 360 Roll', 'Handheld Kinetic Shake'][(i + 2) % 4];
        return `SHOT ${ep} [${modelTarget.toUpperCase()}]: Cinematic 2.39:1 still, scene beat ${i + 1}, ${l}, ${lt}, ${m}, ${filmStock} --ar 2.39:1`;
      });
      setBatchGenerated(generated);
      setBatchGenerating(false);
    }, 600);
  };

  const handleDownloadBatch = () => {
    const content = batchGenerated.join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `handfilm_100_prompts_${modelTarget}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#12131a] border border-[#F5A623]/40 rounded p-4 relative overflow-hidden shadow-[0_0_20px_rgba(245,166,35,0.15)]">
        <div className="flex items-center gap-2 text-[#F5A623] mb-1">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="font-mono-tech text-[11px] font-bold tracking-widest uppercase">
            [ MODULE 12 // AI CINE DIRECTOR ]
          </span>
        </div>
        <p className="text-xs text-zinc-400 font-mono-tech">
          Veo 2, Flow AI, Midjourney & Flux prompt engine with style consistency
        </p>

        {/* Target Engine Selector */}
        <div className="mt-3 grid grid-cols-4 gap-1.5 font-mono-tech text-[10px]">
          {[
            { id: 'veo', label: 'VEO 2' },
            { id: 'flow', label: 'FLOW AI' },
            { id: 'midjourney', label: 'MIDJOURNEY' },
            { id: 'flux', label: 'FLUX.1' }
          ].map((engine) => (
            <button
              key={engine.id}
              type="button"
              onClick={() => setModelTarget(engine.id as any)}
              className={`py-1 px-1.5 rounded text-center transition-all cursor-pointer border ${
                modelTarget === engine.id
                  ? 'bg-[#F5A623] text-black font-bold border-[#F5A623] shadow-[0_0_8px_rgba(245,166,35,0.4)]'
                  : 'bg-black/50 text-zinc-400 border-white/10 hover:text-white'
              }`}
            >
              {engine.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Parameter Stepper Rack */}
      <div className="space-y-4">
        {/* A. Camera Lens */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono-tech text-white mb-2 font-bold">
            <Camera className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>CAMERA LENS:</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 font-mono-tech text-[10.5px]">
            {(['18mm Ultra-Wide', '35mm Master Prime', '85mm Portrait Cine', '2.39:1 Anamorphic'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLens(l)}
                className={`p-2 rounded text-left transition-all border cursor-pointer ${
                  lens === l
                    ? 'bg-[#F5A623]/20 border-[#F5A623] text-[#F5A623] font-bold'
                    : 'bg-[#101117] border-white/10 text-zinc-300 hover:border-white/20'
                }`}
              >
                [ {l} ]
              </button>
            ))}
          </div>
        </div>

        {/* B. Dynamic Lighting */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono-tech text-white mb-2 font-bold">
            <Sun className="w-3.5 h-3.5 text-cyan-400" />
            <span>DYNAMIC LIGHTING:</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 font-mono-tech text-[10.5px]">
            {(['Chiaroscuro Low-Key', 'Volumetric God Rays', 'Tungsten Warmth', 'Cyberpunk Neon Rim'] as const).map((lt) => (
              <button
                key={lt}
                type="button"
                onClick={() => setLighting(lt)}
                className={`p-2 rounded text-left transition-all border cursor-pointer ${
                  lighting === lt
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                    : 'bg-[#101117] border-white/10 text-zinc-300 hover:border-white/20'
                }`}
              >
                [ {lt} ]
              </button>
            ))}
          </div>
        </div>

        {/* C. Camera Motion */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono-tech text-white mb-2 font-bold">
            <Move className="w-3.5 h-3.5 text-emerald-400" />
            <span>CAMERA MOTION:</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 font-mono-tech text-[10.5px]">
            {(['Slow Push-In Dolly', 'Hypersonic Whip Pan', 'Orbital 360 Roll', 'Handheld Kinetic Shake'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotion(m)}
                className={`p-2 rounded text-left transition-all border cursor-pointer ${
                  motion === m
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                    : 'bg-[#101117] border-white/10 text-zinc-300 hover:border-white/20'
                }`}
              >
                [ {m} ]
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Live Prompt Terminal */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono-tech">
          <div className="flex items-center gap-1.5 text-[#F5A623] font-bold">
            <Terminal className="w-3.5 h-3.5" />
            <span>LIVE PROMPT TERMINAL // SHOT {currentFrame.epNumber}</span>
          </div>
          <span className="text-[9.5px] text-zinc-500 uppercase">{modelTarget} READY</span>
        </div>

        <div className="bg-[#050608] border border-[#F5A623]/30 rounded p-3 font-mono-tech text-[11px] leading-relaxed text-zinc-200 relative group shadow-inner">
          <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10">
            AUTO-SYNC
          </div>
          <p className="select-text pr-16 text-zinc-300">
            "{masterPrompt}"
          </p>
        </div>
      </div>

      {/* 4. 1-Click Actions */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={handleCopyPrompt}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-[#F5A623] to-[#e09612] hover:from-[#ffb43b] hover:to-[#f5a623] text-black font-mono-tech font-bold text-xs uppercase tracking-wider rounded shadow-[0_0_15px_rgba(245,166,35,0.3)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
        >
          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{isCopied ? 'COPIED TO CLIPBOARD!' : '[ 📋 COPY MASTER PROMPT ]'}</span>
        </button>

        <button
          type="button"
          onClick={handleBatchGenerate}
          className="w-full py-2.5 px-4 bg-[#141520] hover:bg-[#1c1e2e] text-[#00F0FF] border border-[#00F0FF]/40 font-mono-tech font-bold text-xs uppercase tracking-wider rounded flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
        >
          <Zap className="w-4 h-4 text-[#00F0FF]" />
          <span>[ ⚡ BATCH GENERATE BEAT PROMPTS (1-100) ]</span>
        </button>
      </div>

      {/* Batch Prompt Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0d12] border border-[#00F0FF]/50 rounded-lg max-w-2xl w-full p-5 space-y-4 shadow-[0_0_50px_rgba(0,240,255,0.25)] flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#00F0FF]">
                <Zap className="w-5 h-5" />
                <h3 className="font-mono-tech font-bold text-sm tracking-widest uppercase">
                  BATCH PROMPT MATRIX // 100 SHOTS ({modelTarget.toUpperCase()})
                </h3>
              </div>
              <button 
                onClick={() => setShowBatchModal(false)}
                className="text-zinc-400 hover:text-white font-mono-tech text-xs"
              >
                [ ESC / CLOSE ]
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 font-mono-tech text-[10.5px]">
              {batchGenerating ? (
                <div className="p-8 text-center text-[#00F0FF] animate-pulse">
                  GENERATING 100 BEAT PROMPTS WITH CAMERA VECTORS...
                </div>
              ) : (
                batchGenerated.map((p, idx) => (
                  <div key={idx} className="p-2 rounded bg-black/50 border border-white/5 text-zinc-300">
                    {p}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-zinc-500 font-mono-tech text-xs">
                Generated 100 production-ready prompts
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadBatch}
                  className="px-4 py-2 bg-[#00F0FF] text-black font-mono-tech font-bold text-xs rounded hover:bg-[#66f5ff] flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .TXT</span>
                </button>
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 bg-white/10 text-white font-mono-tech text-xs rounded hover:bg-white/20"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
