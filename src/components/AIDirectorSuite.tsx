/**
 * @file /src/components/AIDirectorSuite.tsx
 * @description AI Creative Director Suite with Gemini Cine Prompt Engine & Veo/Flow Prompt Generator.
 * Features:
 * 1. Multimodal Cine Prompt Generator (Lighting, Motion Vectors, Camera Rig, Kodachrome LUTs)
 * 2. Veo / Sora 12-Second Shot Prompt Formatter
 * 3. Visual Style Consistency Matrix (Consistency Seed, Color Palette, Dhaka Cyber Theme)
 * 4. 1-Click Copy & Timeline Injection
 */

import React, { useState } from 'react';
import { useStudioStore } from '../core/store';
import { 
  Sparkles, 
  Film, 
  Copy, 
  Check, 
  Camera, 
  Layers, 
  Sliders, 
  Wand2, 
  Zap, 
  RefreshCw 
} from 'lucide-react';

export const AIDirectorSuite: React.FC = () => {
  const { project, activeShotIndex, updateShot } = useStudioStore();
  const currentFrame = project.shots[activeShotIndex] || project.shots[0] || {
    epNumber: '001',
    title: 'THE SINGULARITY',
    tagline: '24.0 FPS UNCOMPRESSED MASTER',
    directorNotes: ''
  };

  const [aiModelTarget, setAiModelTarget] = useState<'veo' | 'midjourney' | 'sora' | 'flux'>('veo');
  const [lightingStyle, setLightingStyle] = useState('Volumetric tungsten neon with 2800K amber rim');
  const [cameraMotion, setCameraMotion] = useState('Slow hydraulic push-in with 1.2° Dutch roll');
  const [lensOptic, setLensOptic] = useState('35mm Master Prime T1.4 Anamorphic 2x');
  const [pacingMood, setPacingMood] = useState('High tension, ticking clock, psychological dread');

  const [generatedPrompt, setGeneratedPrompt] = useState<string>(() => 
    `RAW 14-Bit ARRI Alexa 35 cinema master still. Shot EP ${currentFrame.epNumber}: "${currentFrame.title}". ${currentFrame.tagline}. Anamorphic 2x flare, volumetric tungsten neon with 2800K amber rim, slow hydraulic push-in with 1.2° Dutch roll. 35mm Master Prime T1.4. Kodachrome 64 analog grain, Dhaka rain reflections on obsidian pavement. Cinematic 2.39:1 scope --ar 21:9 --style raw --v 6.1`
  );
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/story/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'expand_beat',
          prompt: `Generate an elite AI video generation prompt for ${aiModelTarget.toUpperCase()}.
Shot: EP ${currentFrame.epNumber} // ${currentFrame.title}
Theme: ${currentFrame.tagline}
Camera: ${lensOptic}
Lighting: ${lightingStyle}
Motion: ${cameraMotion}
Mood: ${pacingMood}`,
          stream: false
        })
      });
      const data = await response.json();
      if (data.text) {
        setGeneratedPrompt(data.text);
      }
    } catch {
      // Offline fallback
      setGeneratedPrompt(
        `RAW 14-Bit ARRI Alexa 35 cinema master. Shot EP ${currentFrame.epNumber}: "${currentFrame.title}". ${currentFrame.tagline}. ${lensOptic}. ${lightingStyle}. ${cameraMotion}. Pacing: ${pacingMood}. Directed by ${project.director}. --ar 2.39:1 --style raw`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleInjectToShot = () => {
    updateShot(activeShotIndex, {
      directorNotes: generatedPrompt
    });
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#07070A] text-[#EDEDED] font-mono-tech select-none overflow-hidden">
      {/* Header */}
      <div className="h-11 px-3 border-b border-[#272732] bg-[#0C0C12] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-[#fbbf24] shrink-0" />
          <span className="text-[11px] font-bold text-white tracking-widest uppercase truncate">
            12 AI CREATIVE DIRECTOR // CINE PROMPT MATRIX
          </span>
          <span className="text-[8.5px] text-zinc-400 font-mono hidden sm:inline">
            Active Shot: EP {currentFrame.epNumber}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-3 py-1 rounded-[1px] bg-[#fbbf24] hover:bg-[#f59e0b] disabled:opacity-50 text-black font-bold text-[10px] flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            <span>GENERATE PROMPT</span>
          </button>
        </div>
      </div>

      {/* Main Form & Matrix */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 max-w-4xl mx-auto w-full">
        {/* Model Target Switcher */}
        <div className="p-3 bg-[#0C0C14] border border-[#272732] rounded-[2px] space-y-2">
          <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
            AI GENERATOR TARGET ENGINE
          </span>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'veo', label: 'Google Veo (Video)' },
              { id: 'sora', label: 'OpenAI Sora (12s)' },
              { id: 'midjourney', label: 'Midjourney v6.1' },
              { id: 'flux', label: 'Black Forest Flux.1' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setAiModelTarget(m.id as any)}
                className={`py-2 px-2 text-center text-[9.5px] font-bold rounded-[1px] border cursor-pointer transition-colors ${
                  aiModelTarget === m.id
                    ? 'bg-[#fbbf24]/20 border-[#fbbf24] text-[#fbbf24]'
                    : 'bg-black/40 border-[#272732] text-zinc-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cinematography Directives */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-[#0C0C14] border border-[#272732] rounded-[2px] space-y-1.5">
            <span className="text-[9px] text-[#fbbf24] font-bold uppercase">Lighting & Volumetrics</span>
            <input
              type="text"
              value={lightingStyle}
              onChange={e => setLightingStyle(e.target.value)}
              className="w-full bg-black/60 border border-[#272732] px-2.5 py-1.5 rounded text-[10px] text-zinc-200 outline-none"
            />
          </div>

          <div className="p-3 bg-[#0C0C14] border border-[#272732] rounded-[2px] space-y-1.5">
            <span className="text-[9px] text-[#fbbf24] font-bold uppercase">Camera Motion Vector</span>
            <input
              type="text"
              value={cameraMotion}
              onChange={e => setCameraMotion(e.target.value)}
              className="w-full bg-black/60 border border-[#272732] px-2.5 py-1.5 rounded text-[10px] text-zinc-200 outline-none"
            />
          </div>

          <div className="p-3 bg-[#0C0C14] border border-[#272732] rounded-[2px] space-y-1.5">
            <span className="text-[9px] text-[#fbbf24] font-bold uppercase">Optics & Lens Factor</span>
            <input
              type="text"
              value={lensOptic}
              onChange={e => setLensOptic(e.target.value)}
              className="w-full bg-black/60 border border-[#272732] px-2.5 py-1.5 rounded text-[10px] text-zinc-200 outline-none"
            />
          </div>

          <div className="p-3 bg-[#0C0C14] border border-[#272732] rounded-[2px] space-y-1.5">
            <span className="text-[9px] text-[#fbbf24] font-bold uppercase">Pacing & Emotional Weight</span>
            <input
              type="text"
              value={pacingMood}
              onChange={e => setPacingMood(e.target.value)}
              className="w-full bg-black/60 border border-[#272732] px-2.5 py-1.5 rounded text-[10px] text-zinc-200 outline-none"
            />
          </div>
        </div>

        {/* Master Output Card */}
        <div className="p-3.5 bg-[#0C0C14] border border-[#fbbf24]/40 rounded-[2px] space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-[9.5px] border-b border-white/10 pb-2">
            <span className="text-[#fbbf24] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              CINEMATOGRAPHIC PROMPT SPECIFICATION
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-[9px] flex items-center gap-1 cursor-pointer border border-white/10"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{isCopied ? 'COPIED' : 'COPY'}</span>
              </button>
              <button
                onClick={handleInjectToShot}
                className="px-2.5 py-1 bg-[#fbbf24] text-black font-bold rounded text-[9px] cursor-pointer"
              >
                APPLY TO SHOT
              </button>
            </div>
          </div>

          <textarea
            rows={4}
            value={generatedPrompt}
            onChange={e => setGeneratedPrompt(e.target.value)}
            className="w-full bg-black/60 border border-[#272732] p-2.5 rounded text-xs text-zinc-200 font-mono leading-relaxed outline-none"
          />
        </div>
      </div>
    </div>
  );
};
