/**
 * @file /src/components/modules/OmniAIForge.tsx
 * @description OMNI-AI FORGE — Enterprise SaaS AI Generation & API Aggregation Command Center.
 * Brutalist / glassmorphic aesthetic modal allowing directors to dispatch multi-modal prompts
 * to external neural engines (Gemini Pro Vision, Grok Imagine, Google Veo, Google Flow,
 * Higgsfield Seedance, Kling AI) and drop synthesized assets directly into the active timeline shot.
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  Sparkles, 
  Coins, 
  Check, 
  Cpu, 
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
  defaultPrompt: string;
  mockAssetUrl: string;
}

const MODELS: ModelMeta[] = [
  {
    id: 'Gemini Pro Vision',
    category: 'image',
    engineTag: 'MULTIMODAL 2.5',
    defaultPrompt: 'Cinematic 35mm anamorphic portrait of a visionary director in rain, deep rim light, ultra-detailed bokeh.',
    mockAssetUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'Grok Imagine',
    category: 'image',
    engineTag: 'RAW NEURAL DIFFUSION',
    defaultPrompt: 'Brutalist concrete architecture intersecting with neon hologram projections, ultra-wide 8K.',
    mockAssetUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'Google Veo',
    category: 'video',
    engineTag: 'CINEMA 1080P/60',
    defaultPrompt: 'Continuous dolly forward shot through a rain-drenched neon back-alley, 24fps motion blur, Arri Alexa.',
    mockAssetUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'Google Flow',
    category: 'video',
    engineTag: 'TEMPORAL CONSISTENCY',
    defaultPrompt: 'Drone sweep across high-altitude brutalist solar towers at golden hour, volumetric clouds.',
    mockAssetUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'Higgsfield Seedance',
    category: 'video',
    engineTag: 'PHYSICS FLUID ENGINE',
    defaultPrompt: 'High-fashion editorial split-screen, fabric billowing in hyper-slow motion, glossy studio strobe.',
    mockAssetUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'Kling AI',
    category: 'video',
    engineTag: 'KINETIC V2.0',
    defaultPrompt: 'Fin-tech banking app isometric cards floating in zero-gravity with liquid glass refractions.',
    mockAssetUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1200'
  }
];

export const OmniAIForge: React.FC<OmniAIForgeProps> = ({
  isOpen,
  onClose,
  activeShotIndex = 0,
  onGenerateAsset
}) => {
  const [selectedModel, setSelectedModel] = useState<AIModelType>('Gemini Pro Vision');
  const [prompt, setPrompt] = useState<string>(
    'Cinematic 35mm anamorphic portrait of a visionary director in rain, deep rim light, ultra-detailed bokeh.'
  );
  const [credits, setCredits] = useState<number>(12500);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Close on Escape key
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

  const handleSelectModel = (modelId: AIModelType) => {
    setSelectedModel(modelId);
    const meta = MODELS.find((m) => m.id === modelId);
    if (meta && (!prompt.trim() || MODELS.some((m) => m.defaultPrompt === prompt))) {
      setPrompt(meta.defaultPrompt);
    }
  };

  const handleGenerate = () => {
    if (isGenerating || credits < 25) return;

    setIsGenerating(true);
    setSuccessBanner(null);
    setGenerationStep(`Connecting to ${selectedModel} Gateway...`);

    setTimeout(() => {
      setGenerationStep('Synthesizing latent neural tensors...');
    }, 400);

    setTimeout(() => {
      setGenerationStep('Binding synthesized buffer to timeline...');
    }, 800);

    setTimeout(() => {
      // Deduct 25 credits
      setCredits((prev) => Math.max(0, prev - 25));
      setIsGenerating(false);
      setGenerationStep('');

      const assetUrl = currentMeta.mockAssetUrl;
      const targetShotNumber = activeShotIndex + 1;
      const shotLabel = `SH${String(targetShotNumber).padStart(3, '0')}`;

      // Update shot in Studio Store
      useStudioStore.getState().updateShot(activeShotIndex, {
        imageUrl: assetUrl,
        isVideo: isVideoEngine,
        directorNotes: `[AI FORGE: ${selectedModel}] ${prompt}`
      });

      // Broadcast asset assignment event
      eventBus.emit('asset_assigned_to_shot', {
        assetId: `ai-forge-${Date.now()}`,
        shotIndex: activeShotIndex,
        blobUrl: assetUrl,
        meta: {
          mimeType: isVideoEngine ? 'video/mp4' : 'image/jpeg',
          name: `${selectedModel.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.png`
        }
      });

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
      }, 3000);
    }, 1300);
  };

  return (
    <>
      {/* Backdrop overlay for safe click-away closing */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 1. Container: brutalist/glassmorphic command center */}
      <div 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#0A0C10]/95 backdrop-blur-3xl border border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.15)] rounded-2xl z-[9999] p-6 flex flex-col gap-4 font-mono select-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="omni-ai-forge-title"
      >
        {/* Subtle decorative glow accents */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* 2. Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          {/* Left: Title [ 🧠 OMNI-AI FORGE ] in uppercase, tracked mono font */}
          <div id="omni-ai-forge-title" className="text-sm font-bold tracking-widest text-white uppercase flex items-center gap-2">
            <span>[ 🧠 OMNI-AI FORGE ]</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Right: Enterprise Credits counter: [ 🪙 12,500 CREDITS ] (glowing amber text) */}
            <div className="text-xs font-bold tracking-wider text-amber-400 drop-shadow-[0_0_8px_rgba(245,166,35,0.7)] flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>[ 🪙 {credits.toLocaleString()} CREDITS ]</span>
            </div>

            {/* Close Button: [ X ] at the top right to safely unmount the modal */}
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 rounded text-xs font-mono font-bold tracking-wider text-white/50 hover:text-white border border-white/10 hover:border-white/30 hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              [ X ]
            </button>
          </div>
        </div>

        {/* 3. Model Selection Grid */}
        <div className="flex flex-col gap-2 shrink-0">
          <div className="text-[10px] font-bold tracking-widest text-white/60 uppercase flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-purple-400" />
              NEURAL ENGINES
            </span>
            <span className="text-[9px] text-zinc-500">
              TARGET SHOT: SH{String(activeShotIndex + 1).padStart(3, '0')}
            </span>
          </div>

          {/* Render selectable chips for: Gemini Pro Vision, Grok Imagine, Google Veo, Google Flow, Higgsfield Seedance, Kling AI */}
          <div className="grid grid-cols-3 gap-2">
            {MODELS.map((model) => {
              const isSelected = selectedModel === model.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => handleSelectModel(model.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono tracking-wide text-center transition-all cursor-pointer border ${
                    isSelected
                      ? 'border-purple-500 text-purple-400 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.2)] font-bold'
                      : 'border-white/10 text-white/50 bg-black/40 hover:border-white/20 hover:text-white/80'
                  }`}
                >
                  <div className="truncate font-semibold">{model.id}</div>
                  <div className="text-[8px] opacity-60 tracking-wider uppercase mt-0.5">{model.engineTag}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Prompt Area & Feedback */}
        <div className="flex-1 flex flex-col min-h-0 gap-1.5">
          <div className="flex items-center justify-between text-[10px] tracking-wider text-white/60">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              PROMPT DIRECTIVE
            </span>
            <span className="text-[9px] text-purple-300 font-semibold">{selectedModel}</span>
          </div>

          {/* Multi-line textarea (bg-black/50 border border-white/5 p-4 text-white/80) */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe visual atmosphere, subject, camera optics, motion vector..."
            rows={3}
            className="w-full flex-1 min-h-[90px] bg-black/50 border border-white/5 p-4 text-white/80 rounded-lg text-xs font-mono focus:outline-none focus:border-purple-500/40 resize-none transition-colors"
          />

          {/* Status/feedback indicator */}
          {generationStep && (
            <div className="flex items-center gap-2 text-[10px] text-cyan-300 font-bold tracking-wider py-1 px-2.5 rounded bg-cyan-950/40 border border-cyan-500/30 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
              <span>{generationStep}</span>
            </div>
          )}

          {successBanner && (
            <div className="flex items-center gap-2 text-[10px] text-emerald-300 font-bold tracking-wider py-1 px-2.5 rounded bg-emerald-950/40 border border-emerald-500/30">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>{successBanner}</span>
            </div>
          )}
        </div>

        {/* Brutalist Action Section */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10 shrink-0">
          {/* Brutalist Button: [ ⚡ GENERATE & DROP TO TIMELINE ] (Massive, full-width, solid purple on hover, sharp edges) */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || credits < 25}
            className={`w-full py-3 px-4 font-mono font-black text-xs sm:text-sm uppercase tracking-widest transition-all cursor-pointer rounded-none border flex items-center justify-center gap-2 active:scale-[0.99] ${
              isGenerating || !prompt.trim() || credits < 25
                ? 'bg-zinc-800 text-zinc-500 border-white/5 cursor-not-allowed'
                : 'bg-purple-950/70 hover:bg-purple-600 border-purple-500/50 hover:border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]'
            }`}
          >
            <Zap className="w-4 h-4 fill-current text-purple-300 group-hover:text-white" />
            <span>[ ⚡ GENERATE & DROP TO TIMELINE ]</span>
          </button>

          {/* Cost indicator text below it: (Estimated Cost: 25 Credits) */}
          <div className="text-center text-[10px] font-mono text-zinc-400 tracking-wider">
            (Estimated Cost: 25 Credits)
          </div>
        </div>
      </div>
    </>
  );
};
