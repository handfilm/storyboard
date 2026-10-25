/**
 * @file /src/components/modules/OmniAIForge.tsx
 * @description OMNI-AI FORGE — Enterprise SaaS AI Generation & API Aggregation Command Center.
 * Brutalist / glassmorphic aesthetic modal allowing directors to dispatch multi-modal prompts
 * to external neural engines (Gemini Pro Vision, Grok Imagine, Google Veo, Google Flow,
 * Higgsfield Seedance, Kling AI) and drop synthesized assets directly into the active timeline shot.
 * 
 * Upgrades:
 * - Subtle Framer Motion entry/exit spring animation.
 * - Preset Category section for cinematic prompt styles (Anamorphic, Cyberpunk, Brutalist, Fashion, Action).
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Zap, 
  Sparkles, 
  Coins, 
  Check, 
  Cpu, 
  RefreshCw,
  Film,
  Layers,
  Flame,
  Radio
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

export type PromptCategoryType = 'all' | 'anamorphic' | 'cyberpunk' | 'brutalist' | 'fashion' | 'action';

interface PromptStylePreset {
  id: string;
  category: PromptCategoryType;
  label: string;
  prompt: string;
}

const PROMPT_CATEGORIES: { id: PromptCategoryType; label: string }[] = [
  { id: 'all', label: 'ALL STYLES' },
  { id: 'anamorphic', label: '🎥 35MM ANAMORPHIC' },
  { id: 'cyberpunk', label: '⚡ CYBER NEON' },
  { id: 'brutalist', label: '🏛 BRUTALIST' },
  { id: 'fashion', label: '✨ EDITORIAL' },
  { id: 'action', label: '🌪 ACTION VELOCITY' }
];

const PROMPT_STYLE_PRESETS: PromptStylePreset[] = [
  {
    id: 'ana_1',
    category: 'anamorphic',
    label: 'Tokyo Midnight Rain',
    prompt: 'Cinematic 35mm anamorphic portrait of a cybernetic visionary in rain, deep rim light, ultra-detailed bokeh, 2.39:1 scope.'
  },
  {
    id: 'ana_2',
    category: 'anamorphic',
    label: 'Golden Hour Dust',
    prompt: 'Panavision C-Series anamorphic close-up, warm golden-hour rim lighting, organic dust particles, shallow depth of field.'
  },
  {
    id: 'cyber_1',
    category: 'cyberpunk',
    label: 'Neon Obsidian Tarmac',
    prompt: 'Neon cyber reflection on wet obsidian tarmac, high-voltage holographic circuitry, volumetric cyan and magenta haze.'
  },
  {
    id: 'cyber_2',
    category: 'cyberpunk',
    label: 'Hologram Projection',
    prompt: 'Futuristic floating holographic UI flickering in atmospheric midnight haze, photorealistic hyper-detail.'
  },
  {
    id: 'brutal_1',
    category: 'brutalist',
    label: 'Concrete Megastructure',
    prompt: 'Monolithic concrete brutalist architecture towering into mist, harsh geometric shadows, 8k architectural scan.'
  },
  {
    id: 'fashion_1',
    category: 'fashion',
    label: 'Billowing Silk Slow-Mo',
    prompt: 'High-fashion editorial split-screen, crimson silk billowing in 120fps hyper-slow motion, hard studio strobe lighting.'
  },
  {
    id: 'action_1',
    category: 'action',
    label: 'Hypersonic Whip Pan',
    prompt: 'Aggressive 24fps kinetic camera dolly through high-speed tunnel, directional optical streaks, visceral forward velocity.'
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
  const [selectedPromptCategory, setSelectedPromptCategory] = useState<PromptCategoryType>('all');
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

  const currentMeta = MODELS.find((m) => m.id === selectedModel) || MODELS[0];
  const isVideoEngine = currentMeta.category === 'video';

  const handleSelectModel = (modelId: AIModelType) => {
    setSelectedModel(modelId);
    const meta = MODELS.find((m) => m.id === modelId);
    if (meta && (!prompt.trim() || MODELS.some((m) => m.defaultPrompt === prompt))) {
      setPrompt(meta.defaultPrompt);
    }
  };

  const filteredPromptStyles = selectedPromptCategory === 'all'
    ? PROMPT_STYLE_PRESETS
    : PROMPT_STYLE_PRESETS.filter((p) => p.category === selectedPromptCategory);

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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle Framer Motion Backdrop overlay */}
          <motion.div 
            key="omni-ai-forge-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* 1. Container: brutalist/glassmorphic command center with Framer Motion entry */}
          <motion.div 
            key="omni-ai-forge-modal"
            initial={{ opacity: 0, scale: 0.95, y: '-48%', x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: '-48%', x: '-50%' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-1/2 left-1/2 w-[700px] max-w-[calc(100vw-2rem)] h-[530px] max-h-[calc(100vh-2rem)] bg-[#0A0C10]/95 backdrop-blur-3xl border border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.15)] rounded-2xl z-[9999] p-6 flex flex-col gap-3 font-mono select-none"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="omni-ai-forge-title"
          >
            {/* Subtle decorative glow accents */}
            <div className="absolute -top-20 -left-20 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* 2. Top Bar */}
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10 shrink-0">
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
            <div className="flex flex-col gap-1.5 shrink-0">
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wide text-center transition-all cursor-pointer border ${
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

            {/* Preset Category Section for Cinematic Prompt Styles */}
            <div className="flex flex-col gap-1.5 shrink-0 pt-1">
              <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-white/60 uppercase">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-cyan-400" />
                  PRESET CATEGORIES // PROMPT STYLES
                </span>
                <span className="text-[9px] text-zinc-500">1-CLICK PROMPT INJECT</span>
              </div>

              {/* Category selector chips */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                {PROMPT_CATEGORIES.map((cat) => {
                  const isActive = selectedPromptCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedPromptCategory(cat.id)}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                          : 'border-white/5 bg-white/[0.02] text-zinc-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Prompt Style Quick Injection Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {filteredPromptStyles.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setPrompt(style.prompt)}
                    className="px-2 py-1 rounded bg-black/60 hover:bg-purple-950/40 border border-white/10 hover:border-purple-400/60 text-[9px] font-mono text-zinc-300 hover:text-purple-200 transition-all whitespace-nowrap cursor-pointer shrink-0"
                    title={style.prompt}
                  >
                    + {style.label}
                  </button>
                ))}
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
                rows={2}
                className="w-full flex-1 min-h-[75px] bg-black/50 border border-white/5 p-3 text-white/80 rounded-lg text-xs font-mono focus:outline-none focus:border-purple-500/40 resize-none transition-colors"
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
            <div className="flex flex-col gap-1 pt-1.5 border-t border-white/10 shrink-0">
              {/* Brutalist Button: [ ⚡ GENERATE & DROP TO TIMELINE ] */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim() || credits < 25}
                className={`w-full py-2.5 px-4 font-mono font-black text-xs sm:text-sm uppercase tracking-widest transition-all cursor-pointer rounded-none border flex items-center justify-center gap-2 active:scale-[0.99] ${
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
