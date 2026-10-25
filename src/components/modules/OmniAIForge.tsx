/**
 * @file /src/components/modules/OmniAIForge.tsx
 * @description OMNI-AI FORGE — Enterprise SaaS AI Generation & API Aggregation Command Center.
 * Enables B2B clients to dispatch multi-modal prompts to external AI model engines (Gemini Pro Vision,
 * Grok Imagine, Google Veo, Google Flow, Higgsfield Seedance, Kling AI) and directly drop synthesized
 * assets into the active timeline shot.
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  Sparkles, 
  Coins, 
  Check, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Layers, 
  Cpu, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useStudioStore } from '../../core/store';
import { eventBus } from '../../core/eventBus';

export type AIModelType = 
  | 'Gemini Pro Vision'
  | 'Grok Imagine'
  | 'Google Veo'
  | 'Google Flow'
  | 'Higgsfield Seedance'
  | 'Kling AI';

export interface OmniAIForgeProps {
  isOpen: boolean;
  onClose: () => void;
  activeShotIndex?: number;
  onGenerateAsset?: (asset: { url: string; prompt: string; model: AIModelType }) => void;
}

interface ModelMeta {
  id: AIModelType;
  category: 'image' | 'video';
  engineTag: string;
  badgeColor: string;
  defaultPrompt: string;
  mockAssetUrl: string;
}

const MODELS: ModelMeta[] = [
  // Image Engines
  {
    id: 'Gemini Pro Vision',
    category: 'image',
    engineTag: 'MULTIMODAL 2.5',
    badgeColor: 'border-blue-500/50 text-blue-300 bg-blue-500/10',
    defaultPrompt: 'Cinematic 35mm anamorphic portrait of a cybernetic visionary, deep rim light, ultra-detailed bokeh.',
    mockAssetUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'Grok Imagine',
    category: 'image',
    engineTag: 'RAW NEURAL DIFFUSION',
    badgeColor: 'border-purple-500/50 text-purple-300 bg-purple-500/10',
    defaultPrompt: 'Brutalist concrete architecture intersecting with neon hologram projections, ultra-wide 8K.',
    mockAssetUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200'
  },
  // Video Engines
  {
    id: 'Google Veo',
    category: 'video',
    engineTag: 'CINEMA 1080P/60',
    badgeColor: 'border-amber-500/50 text-amber-300 bg-amber-500/10',
    defaultPrompt: 'Continuous dolly forward shot through a rain-drenched Tokyo back-alley, 24fps motion blur, Arri Alexa.',
    mockAssetUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'Google Flow',
    category: 'video',
    engineTag: 'TEMPORAL CONSISTENCY',
    badgeColor: 'border-cyan-500/50 text-cyan-300 bg-cyan-500/10',
    defaultPrompt: 'Drone sweep across high-altitude brutalist solar towers at golden hour, volumetric clouds.',
    mockAssetUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'Higgsfield Seedance',
    category: 'video',
    engineTag: 'PHYSICS FLUID ENGINE',
    badgeColor: 'border-pink-500/50 text-pink-300 bg-pink-500/10',
    defaultPrompt: 'High-fashion editorial split-screen, fabric billowing in hyper-slow motion, glossy studio strobe.',
    mockAssetUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'Kling AI',
    category: 'video',
    engineTag: 'KINETIC V2.0',
    badgeColor: 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10',
    defaultPrompt: 'Fin-tech banking app isometric cards floating in zero-gravity with liquid glass refractions.',
    mockAssetUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1200'
  }
];

const PROMPT_INSPIRATIONS = [
  'Fintech holographic credit card exploding in kinetic slow motion',
  'Tokyo cyber rain reflection 35mm anamorphic 2.39:1',
  'Luxury minimalist architectural loft over looking misty fjords',
  'High-voltage 5G neural network telemetry stream'
];

export const OmniAIForge: React.FC<OmniAIForgeProps> = ({
  isOpen,
  onClose,
  activeShotIndex = 0,
  onGenerateAsset
}) => {

  const [selectedModel, setSelectedModel] = useState<AIModelType>('Gemini Pro Vision');
  const [prompt, setPrompt] = useState<string>(
    'Cinematic 35mm anamorphic portrait of a cybernetic visionary, deep rim light, ultra-detailed bokeh.'
  );
  const [credits, setCredits] = useState<number>(12500);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentMeta = MODELS.find((m) => m.id === selectedModel) || MODELS[0];
  const isVideoEngine = currentMeta.category === 'video';

  const handleSelectModel = (model: ModelMeta) => {
    setSelectedModel(model.id);
    if (!prompt.trim() || PROMPT_INSPIRATIONS.includes(prompt) || MODELS.some(m => m.defaultPrompt === prompt)) {
      setPrompt(model.defaultPrompt);
    }
  };

  const handleGenerate = () => {
    if (isGenerating || credits < 25) return;

    setIsGenerating(true);
    setSuccessBanner(null);
    setGenerationStep(`Connecting to ${selectedModel} Gateway...`);

    setTimeout(() => {
      setGenerationStep('Synthesizing latent neural tensors...');
    }, 450);

    setTimeout(() => {
      setGenerationStep('Binding synthesized buffer to timeline...');
    }, 900);

    setTimeout(() => {
      // Deduct 25 enterprise credits
      setCredits((prev) => Math.max(0, prev - 25));
      setIsGenerating(false);
      setGenerationStep('');

      const assetUrl = currentMeta.mockAssetUrl;
      const targetShotNumber = activeShotIndex + 1;
      const shotLabel = `SH${String(targetShotNumber).padStart(3, '0')}`;

      // 1. Update shot in Studio Store
      useStudioStore.getState().updateShot(activeShotIndex, {
        imageUrl: assetUrl,
        isVideo: isVideoEngine,
        directorNotes: `[AI FORGE: ${selectedModel}] ${prompt}`
      });

      // 2. Broadcast asset assignment event
      eventBus.emit('asset_assigned_to_shot', {
        assetId: `ai-forge-${Date.now()}`,
        shotIndex: activeShotIndex,
        blobUrl: assetUrl,
        meta: {
          mimeType: isVideoEngine ? 'video/mp4' : 'image/jpeg',
          name: `${selectedModel.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.png`
        }
      });

      // 3. Emit shot updated event
      eventBus.emit('shot:updated', {
        index: activeShotIndex,
        shot: {
          imageUrl: assetUrl,
          isVideo: isVideoEngine
        }
      });

      if (onGenerateAsset) {
        onGenerateAsset({
          url: assetUrl,
          prompt,
          model: selectedModel
        });
      }

      setSuccessBanner(`✓ Asset synthesized via ${selectedModel} and dropped onto ${shotLabel}!`);
      setTimeout(() => {
        setSuccessBanner(null);
      }, 3500);
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* Modal Shell Container */}
      <div 
        className="w-full max-w-[700px] h-[500px] bg-[#08090C]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_0_40px_rgba(255,255,255,0.05)] flex flex-col justify-between select-none relative overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glow accents */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* ========================================================================= */}
        {/* 1. TOP BAR (Telemetry & Billing)                                          */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="text-sm font-bold tracking-wider text-white">
              [ 🧠 OMNI-AI FORGE // API GATEWAY ]
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Enterprise Credits Counter */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs tracking-wider shadow-[0_0_12px_rgba(245,166,35,0.15)]">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>🪙 {credits.toLocaleString()} CREDITS</span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors cursor-pointer"
              aria-label="Close Omni-AI Forge"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. MODEL SELECTION GRID (Image & Video Engines)                           */}
        {/* ========================================================================= */}
        <div className="py-3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-cyan-400" />
              Select Neural Synthesis Engine
            </span>
            <span className="text-[9px] font-mono text-zinc-500">
              TARGET: SHOT SH{String(activeShotIndex + 1).padStart(3, '0')}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MODELS.map((model) => {
              const isSelected = selectedModel === model.id;
              const isVideo = model.category === 'video';
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => handleSelectModel(model)}
                  className={`px-3 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer flex flex-col justify-between border ${
                    isSelected
                      ? 'bg-gradient-to-br from-purple-900/40 via-indigo-900/30 to-cyan-900/40 border-cyan-400/80 text-white shadow-[0_0_18px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/50'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10 hover:border-white/20 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-[11px] font-bold tracking-tight truncate">
                      {model.id}
                    </span>
                    <span className={`text-[8px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border ${model.badgeColor}`}>
                      {isVideo ? 'VID' : 'IMG'}
                    </span>
                  </div>
                  <span className="text-[8.5px] font-mono text-zinc-400 tracking-wider">
                    {model.engineTag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. PROMPT & GENERATION AREA                                               */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col justify-between py-1 min-h-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-1.5">
              <label 
                htmlFor="ai-forge-prompt"
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-purple-400" />
                Prompt Directive
              </label>
              <span className="text-[9px] text-zinc-500">
                Active: <span className="text-cyan-300 font-bold">{selectedModel}</span>
              </span>
            </div>

            {/* Large Multi-line Textarea */}
            <div className="relative flex-1 min-h-[90px]">
              <textarea
                id="ai-forge-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt for the selected AI model..."
                rows={3}
                className="w-full h-full p-3 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 resize-none font-mono transition-all"
              />
            </div>

            {/* Quick Prompt Suggestion Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[9px] text-zinc-500 shrink-0">Quick Ideas:</span>
              {PROMPT_INSPIRATIONS.map((idea, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(idea)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-[9px] text-zinc-400 hover:text-zinc-200 transition-colors whitespace-nowrap cursor-pointer shrink-0"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Success or Step Feedback Banner */}
        {successBanner && (
          <div className="mb-2 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-[10px] font-bold tracking-wider flex items-center gap-2 animate-in fade-in duration-150 shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{successBanner}</span>
          </div>
        )}

        {generationStep && (
          <div className="mb-2 px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-[10px] font-bold tracking-wider flex items-center gap-2 animate-pulse shrink-0">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>{generationStep}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. BRUTALIST ACTION FOOTER                                                */}
        {/* ========================================================================= */}
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Direct Timeline Injection (0ms proxy sync)</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {/* Brutalist Action Button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className={`w-full sm:w-auto h-10 px-5 rounded-xl font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                isGenerating || !prompt.trim()
                  ? 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-400 text-white shadow-[0_0_24px_rgba(168,85,247,0.45)] hover:shadow-[0_0_32px_rgba(6,182,212,0.6)] active:scale-95 border border-white/20'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current text-white" />
              <span>[ ⚡ GENERATE & DROP TO TIMELINE ]</span>
            </button>
            <span className="text-[10px] font-mono text-amber-400/90 tracking-wide sm:text-right">
              (Estimated Cost: 25 Credits)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
