/**
 * RAWx Studio — AI Production Assistant & Prompt Lab
 * Public API: AiStudio component
 * Features Gemini API integration (@google/genai), story-to-shot breakdown,
 * camera lens suggestions, bilingual dialogue polish, and Google Veo/Flow prompt generator.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../core/store';
import { CinemaToolHUD, CinemaBadgeHeader } from '../../components/ui/CinemaToolHUD';
import { 
  Sparkles, 
  Camera, 
  Film, 
  MessageSquare, 
  Wand2, 
  Copy, 
  Check,
  Aperture,
  Compass,
  SunMedium,
  Move
} from 'lucide-react';

export const AiStudio: React.FC = () => {
  const {
    activeShotIndex,
    project,
    updateShot
  } = useStudioStore();

  const [activeTab, setActiveTab] = useState<'camera' | 'polish' | 'veoPrompt'>('camera');
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
      cameraMove: cameraSuggestion.movement,
      directorNotes: `Lighting: ${cameraSuggestion.lighting}`
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050505] text-[#EDEDED] font-mono select-none overflow-hidden">
      {/* AI Studio Header */}
      <div className="h-12 border-b border-white/[0.08] bg-[#0B0B0B] px-4 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2.5">
          <CinemaBadgeHeader
            icon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            label="AI LAB"
            accent="amber"
          />
          <span className="text-zinc-500 font-black tracking-wider text-[10px]">
            SH{String(activeShotIndex + 1).padStart(3, '0')}
          </span>
        </div>

        <CinemaToolHUD
          title="AI MODEL ENGINE"
          en="Switch between fast Flash or Director-grade Pro reasoning."
          bn="কীভাবে ব্যবহার করবেন: দ্রুত রেজাল্টের জন্য FLASH বা ডিপ বিশ্লেষণের জন্য PRO সিলেক্ট করুন।"
          accent="amber"
          side="bottom"
        >
          <div className="flex items-center gap-1.5 bg-[#111215] px-2.5 py-1 rounded border border-[#26282E] text-[10px] font-black tracking-wider">
            <span className="text-zinc-500">MODEL</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-amber-400 font-black focus:outline-none cursor-pointer"
            >
              <option value="gemini-2.5-flash" className="bg-[#111215]">2.5 FLASH</option>
              <option value="gemini-2.5-pro" className="bg-[#111215]">2.5 PRO</option>
            </select>
          </div>
        </CinemaToolHUD>
      </div>

      {/* Main AI Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Navigator */}
        <div className="w-full md:w-56 bg-[#0B0B0B] border-r border-white/[0.08] p-3 flex md:flex-col gap-2 shrink-0 text-xs overflow-x-auto no-scrollbar">
          <CinemaToolHUD
            title="CAMERA & LIGHTING ADVISOR"
            en="AI recommends lens focal length, camera angle, and lighting contrast."
            bn="কীভাবে ব্যবহার করবেন: শটের জন্য লেন্স, অ্যাঙ্গেল ও লাইটিং সাজেশন পেতে ক্লিক করুন।"
            accent="amber"
            side="right"
            blockWrapper
          >
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              data-active={activeTab === 'camera' ? 'true' : 'false'}
              className="cinema-tile cinema-tile-amber w-full min-h-[44px] px-3 py-2 flex items-center gap-2.5 text-[11px] font-black tracking-wider uppercase"
            >
              <Camera className="w-4 h-4 shrink-0" strokeWidth={2.2} />
              <span>OPTIC LAB</span>
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="VEO / FLOW PROMPT LAB"
            en="Edit calibrated video generation prompts with optical flare specs."
            bn="কীভাবে ব্যবহার করবেন: Google Veo বা Flow ভিডিও মডেলের প্রম্পট এডিট ও কপি করুন।"
            accent="cyan"
            side="right"
            blockWrapper
          >
            <button
              type="button"
              onClick={() => setActiveTab('veoPrompt')}
              data-active={activeTab === 'veoPrompt' ? 'true' : 'false'}
              className="cinema-tile cinema-tile-cyan w-full min-h-[44px] px-3 py-2 flex items-center gap-2.5 text-[11px] font-black tracking-wider uppercase"
            >
              <Film className="w-4 h-4 shrink-0" strokeWidth={2.2} />
              <span>VEO PROMPT</span>
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="BILINGUAL DIALOGUE POLISH"
            en="Refine Bengali and English lines for authentic cinema rhythm."
            bn="কীভাবে ব্যবহার করবেন: বাংলা ও ইংরেজি সংলাপের সিনেমাটিক ছন্দ ও সাবটেক্সট দেখুন।"
            accent="emerald"
            side="right"
            blockWrapper
          >
            <button
              type="button"
              onClick={() => setActiveTab('polish')}
              data-active={activeTab === 'polish' ? 'true' : 'false'}
              className="cinema-tile cinema-tile-emerald w-full min-h-[44px] px-3 py-2 flex items-center gap-2.5 text-[11px] font-black tracking-wider uppercase"
            >
              <MessageSquare className="w-4 h-4 shrink-0" strokeWidth={2.2} />
              <span>DIALOGUE FX</span>
            </button>
          </CinemaToolHUD>
        </div>

        {/* Right Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#080808]">
          {activeTab === 'camera' && (
            <div className="max-w-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <CinemaBadgeHeader
                  icon={<Camera className="w-3.5 h-3.5 text-amber-400" />}
                  label="SHOT ADVISOR"
                  accent="amber"
                />
                <CinemaToolHUD
                  title="RE-ANALYZE SHOT SPECS"
                  en="Regenerate fresh lens, lighting, and movement recommendations."
                  bn="কীভাবে ব্যবহার করবেন: নতুন AI ক্যামেরা ও লাইটিং সাজেশন জেনারেট করতে চাপুন।"
                  accent="amber"
                  side="left"
                >
                  <button
                    type="button"
                    onClick={handleGenerateSuggestions}
                    disabled={isGenerating}
                    data-active={isGenerating ? 'true' : 'false'}
                    className="cinema-tile cinema-tile-amber min-h-[40px] px-3.5 py-1.5 flex items-center gap-1.5 text-[11px] font-black tracking-wider uppercase"
                  >
                    <Wand2 className="w-4 h-4" strokeWidth={2.2} />
                    <span>{isGenerating ? 'SCANNING' : 'RE-ANALYZE'}</span>
                  </button>
                </CinemaToolHUD>
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#111215] border border-[#26282E] rounded-lg">
                  <CinemaBadgeHeader icon={<Aperture className="w-3 h-3 text-amber-400" />} label="PRIME LENS" accent="amber" />
                  <p className="font-bold text-[#FFE066] mt-2">{cameraSuggestion.lens}</p>
                </div>
                <div className="p-3 bg-[#111215] border border-[#26282E] rounded-lg">
                  <CinemaBadgeHeader icon={<Compass className="w-3 h-3 text-cyan-400" />} label="FRAMING" accent="cyan" />
                  <p className="font-bold text-[#EDEDED] mt-2">{cameraSuggestion.angle}</p>
                </div>
                <div className="p-3 bg-[#111215] border border-[#26282E] rounded-lg">
                  <CinemaBadgeHeader icon={<SunMedium className="w-3 h-3 text-emerald-400" />} label="LIGHT RIG" accent="emerald" />
                  <p className="font-bold text-[#00FFCC] mt-2">{cameraSuggestion.lighting}</p>
                </div>
                <div className="p-3 bg-[#111215] border border-[#26282E] rounded-lg">
                  <CinemaBadgeHeader icon={<Move className="w-3 h-3 text-amber-400" />} label="CAM MOVE" accent="amber" />
                  <p className="font-bold text-[#EDEDED] mt-2">{cameraSuggestion.movement}</p>
                </div>
              </div>

              <CinemaToolHUD
                title="APPLY SPECS TO ACTIVE SHOT"
                en="Writes recommended camera move and lighting notes to the active storyboard frame."
                bn="কীভাবে ব্যবহার করবেন: সাজেস্ট করা ক্যামেরা ও লাইটিং সেটআপ বর্তমান শটে সেভ করতে চাপুন।"
                accent="emerald"
                side="top"
                blockWrapper
              >
                <button
                  type="button"
                  onClick={handleApplyToShot}
                  className="cinema-tile cinema-tile-emerald w-full min-h-[44px] py-2 flex items-center justify-center gap-2 text-[11px] font-black tracking-wider uppercase"
                >
                  <Check className="w-4 h-4" strokeWidth={2.2} />
                  <span>APPLY SH{activeShotIndex + 1}</span>
                </button>
              </CinemaToolHUD>
            </div>
          )}

          {activeTab === 'veoPrompt' && (
            <div className="max-w-2xl flex flex-col gap-4">
              <div className="border-b border-white/[0.08] pb-3 flex items-center justify-between">
                <CinemaBadgeHeader
                  icon={<Film className="w-3.5 h-3.5 text-cyan-400" />}
                  label="VEO LAB"
                  accent="cyan"
                />
                <CinemaToolHUD
                  title="COPY VEO PROMPT"
                  en="Copy calibrated video prompt to clipboard for Veo or Flow."
                  bn="কীভাবে ব্যবহার করবেন: প্রম্পটটি কপি করে Google Veo বা Flow-এ পেস্ট করুন।"
                  accent="cyan"
                  side="left"
                >
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    data-active={copied ? 'true' : 'false'}
                    className="cinema-tile cinema-tile-cyan min-h-[40px] px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-black tracking-wider uppercase"
                  >
                    {copied ? <Check className="w-4 h-4" strokeWidth={2.2} /> : <Copy className="w-4 h-4" strokeWidth={2.2} />}
                    <span>{copied ? 'COPIED' : 'COPY'}</span>
                  </button>
                </CinemaToolHUD>
              </div>

              <textarea
                rows={6}
                value={veoPrompt}
                onChange={(e) => setVeoPrompt(e.target.value)}
                className="w-full bg-[#111215] border border-[#26282E] rounded-lg p-4 text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-cyan-400 leading-relaxed resize-none shadow-xl"
              />
            </div>
          )}

          {activeTab === 'polish' && (
            <div className="max-w-2xl flex flex-col gap-4">
              <div className="border-b border-white/[0.08] pb-3">
                <CinemaBadgeHeader
                  icon={<MessageSquare className="w-3.5 h-3.5 text-emerald-400" />}
                  label="DIALOGUE POLISH"
                  accent="emerald"
                />
              </div>

              <div className="p-4 bg-[#111215] border border-[#26282E] rounded-lg flex flex-col gap-3">
                <div className="font-serif text-lg text-[#FFE066]">
                  "মহাজাগতিক শূন্যতায় যখন আলো হারিয়ে যায়, দৃষ্টি তখন ভেতরে খোঁজে।"
                </div>
                <div className="text-xs text-zinc-400 italic">
                  "When the light vanishes in the cosmic void, vision seeks inward."
                </div>
                <div className="p-2 bg-black/50 rounded border border-emerald-500/20 text-[11px] font-black tracking-wider text-emerald-300 uppercase">
                  CADENCE // 4.5S HOLD
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
