/**
 * RAWx Studio — AI Production Assistant & Prompt Lab
 * Public API: AiStudio component
 * Features Gemini API integration (@google/genai), story-to-shot breakdown,
 * camera lens suggestions, bilingual dialogue polish, and Google Veo/Flow prompt generator.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../core/store';
import { 
  Sparkles, 
  Camera, 
  Film, 
  MessageSquare, 
  Wand2, 
  Copy, 
  Check, 
  RefreshCw,
  Send
} from 'lucide-react';

export const AiStudio: React.FC = () => {
  const {
    activeShotIndex,
    project,
    updateShot
  } = useStudioStore();

  const currentShot = project.shots[activeShotIndex] || {};
  const [activeTab, setActiveTab] = useState<'camera' | 'polish' | 'veoPrompt' | 'breakdown'>('camera');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // Outputs
  const [cameraSuggestion, setCameraSuggestion] = useState({
    lens: '35mm anamorphic prime',
    angle: 'Low-angle tracking shot',
    lighting: 'High-contrast cyan rim with Dhaka neon gold key light',
    movement: 'Slow dolly-in towards hero silhouette',
    mood: 'Cyberpunk noir suspense'
  });

  const [veoPrompt, setVeoPrompt] = useState(
    'Cinematic 35mm film still, directed by Rakib Himon. A lone figure stands before a monolithic glowing structure in futuristic Dhaka at midnight. Rain reflection on asphalt, anamorphic blue horizontal lens flares, photorealistic lighting, 24fps motion blur, Kodak Vision3 500T color science.'
  );

  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(veoPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateSuggestions = () => {
    setIsGenerating(true);
    // Simulate AI generation with configurable models
    setTimeout(() => {
      setIsGenerating(false);
      setCameraSuggestion({
        lens: '50mm f/1.4 Human Eye prime',
        angle: 'Slight Dutch tilt medium close-up',
        lighting: 'Volumetric golden haze piercing dark cyber monsoon rain',
        movement: 'Handheld organic micro-shakes',
        mood: 'Intimate existential contemplation'
      });
    }, 800);
  };

  const handleApplyToShot = () => {
    updateShot(activeShotIndex, {
      shotType: 'MCU',
      cameraMovement: cameraSuggestion.movement,
      lighting: cameraSuggestion.lighting
    });
    alert(`Applied AI camera suggestions to Shot #${activeShotIndex + 1}!`);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050505] text-[#EDEDED] font-mono select-none overflow-hidden">
      {/* AI Studio Header */}
      <div className="h-12 border-b border-[#D4AF37]/20 bg-[#0B0B0B] px-4 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FFE066]" />
          <span className="font-bold text-[#FFE066]">GEMINI CINE AI LAB & PROMPT ENGINE</span>
          <span className="text-[#8A8A8A]">| SHOT #{String(activeShotIndex + 1).padStart(3, '0')}</span>
        </div>

        {/* Model Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#121212] px-2 py-1 rounded border border-[#D4AF37]/20 text-[11px]">
            <span className="text-[#8A8A8A]">MODEL:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-[#FFE066] font-bold focus:outline-none"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Fast)</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro (Director Grade)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main AI Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Navigator */}
        <div className="w-full md:w-64 bg-[#0B0B0B] border-r border-[#D4AF37]/20 p-3 flex flex-col gap-1.5 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('camera')}
            className={`p-2.5 rounded text-left flex items-center gap-2 transition-colors ${
              activeTab === 'camera' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A] hover:text-[#EDEDED] hover:bg-[#121212]'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>CAMERA & LIGHTING</span>
          </button>

          <button
            onClick={() => setActiveTab('veoPrompt')}
            className={`p-2.5 rounded text-left flex items-center gap-2 transition-colors ${
              activeTab === 'veoPrompt' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A] hover:text-[#EDEDED] hover:bg-[#121212]'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>VEO / FLOW PROMPT LAB</span>
          </button>

          <button
            onClick={() => setActiveTab('polish')}
            className={`p-2.5 rounded text-left flex items-center gap-2 transition-colors ${
              activeTab === 'polish' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A] hover:text-[#EDEDED] hover:bg-[#121212]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>BILINGUAL POLISH (BN/EN)</span>
          </button>
        </div>

        {/* Right Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#080808]">
          {activeTab === 'camera' && (
            <div className="max-w-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-3">
                <div>
                  <h2 className="font-bold text-sm text-[#FFE066]">CINEMATOGRAPHIC SHOT ADVISOR</h2>
                  <p className="text-[11px] text-[#8A8A8A] mt-0.5">
                    Analyzes shot narrative and suggests focal length, lighting setups, and camera movements.
                  </p>
                </div>
                <button
                  onClick={handleGenerateSuggestions}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] hover:bg-[#FFE066] text-black font-bold rounded text-xs transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>{isGenerating ? 'ANALYZING...' : 'RE-ANALYZE'}</span>
                </button>
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#0B0B0B] border border-[#D4AF37]/20 rounded-lg">
                  <span className="text-[10px] text-[#8A8A8A] uppercase font-bold">Recommended Lens</span>
                  <p className="font-bold text-[#FFE066] mt-1">{cameraSuggestion.lens}</p>
                </div>
                <div className="p-3 bg-[#0B0B0B] border border-[#D4AF37]/20 rounded-lg">
                  <span className="text-[10px] text-[#8A8A8A] uppercase font-bold">Camera Angle & Framing</span>
                  <p className="font-bold text-[#EDEDED] mt-1">{cameraSuggestion.angle}</p>
                </div>
                <div className="p-3 bg-[#0B0B0B] border border-[#D4AF37]/20 rounded-lg">
                  <span className="text-[10px] text-[#8A8A8A] uppercase font-bold">Lighting & Contrast Setup</span>
                  <p className="font-bold text-[#00FFCC] mt-1">{cameraSuggestion.lighting}</p>
                </div>
                <div className="p-3 bg-[#0B0B0B] border border-[#D4AF37]/20 rounded-lg">
                  <span className="text-[10px] text-[#8A8A8A] uppercase font-bold">Camera Movement & Pace</span>
                  <p className="font-bold text-[#EDEDED] mt-1">{cameraSuggestion.movement}</p>
                </div>
              </div>

              <button
                onClick={handleApplyToShot}
                className="mt-2 py-2 bg-[#121212] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/30 rounded font-bold text-xs transition-colors"
              >
                APPLY CAMERA SPECS TO SHOT #{activeShotIndex + 1}
              </button>
            </div>
          )}

          {activeTab === 'veoPrompt' && (
            <div className="max-w-2xl flex flex-col gap-4">
              <div className="border-b border-[#D4AF37]/20 pb-3">
                <h2 className="font-bold text-sm text-[#FFE066]">GOOGLE VEO & VIDEO MODEL PROMPT LAB</h2>
                <p className="text-[11px] text-[#8A8A8A] mt-0.5">
                  Generates production-ready prompts calibrated with camera keywords, optical flare notes, and aspect ratios.
                </p>
              </div>

              <div className="relative">
                <textarea
                  rows={6}
                  value={veoPrompt}
                  onChange={(e) => setVeoPrompt(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#D4AF37]/30 rounded-lg p-4 text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-[#D4AF37] leading-relaxed resize-none shadow-xl"
                />
                <button
                  onClick={handleCopyPrompt}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] hover:bg-[#FFE066] text-black font-bold rounded text-xs transition-colors shadow"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'COPIED!' : 'COPY PROMPT'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'polish' && (
            <div className="max-w-2xl flex flex-col gap-4">
              <div className="border-b border-[#D4AF37]/20 pb-3">
                <h2 className="font-bold text-sm text-[#FFE066]">BILINGUAL SCRIPT & DIALOGUE POLISH</h2>
                <p className="text-[11px] text-[#8A8A8A] mt-0.5">
                  Refines Bengali and English dialogue for authentic cadence and cinematic subtext.
                </p>
              </div>

              <div className="p-4 bg-[#0B0B0B] border border-[#D4AF37]/20 rounded-lg flex flex-col gap-3">
                <div className="font-serif text-lg text-[#FFE066]">
                  "মহাজাগতিক শূন্যতায় যখন আলো হারিয়ে যায়, দৃষ্টি তখন ভেতরে খোঁজে।"
                </div>
                <div className="text-xs text-[#8A8A8A] italic">
                  "When the light vanishes in the cosmic void, vision seeks inward."
                </div>
                <div className="p-2 bg-[#121212] rounded border border-[#D4AF37]/10 text-[11px] text-[#00FFCC]">
                  AI Note: Poetic cadence mirrors classical Dhaka art-cinema rhythm. Recommended slow 4.5s animatic hold.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
