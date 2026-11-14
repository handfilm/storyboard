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
import { CinemaToolHUD, CinemaBadgeHeader } from '../../components/ui/CinemaToolHUD';

const LENS_OPTIONS = [
  { value: '18mm Ultra-Wide', short: '18MM WIDE' },
  { value: '35mm Master Prime', short: '35MM PRIME' },
  { value: '85mm Portrait Cine', short: '85MM CINE' },
  { value: '2.39:1 Anamorphic', short: '2.39 SCOPE' }
] as const;

const LIGHTING_OPTIONS = [
  { value: 'Chiaroscuro Low-Key', short: 'LOW KEY' },
  { value: 'Volumetric God Rays', short: 'GOD RAYS' },
  { value: 'Tungsten Warmth', short: 'TUNGSTEN' },
  { value: 'Cyberpunk Neon Rim', short: 'NEON RIM' }
] as const;

const MOTION_OPTIONS = [
  { value: 'Slow Push-In Dolly', short: 'DOLLY IN' },
  { value: 'Hypersonic Whip Pan', short: 'WHIP PAN' },
  { value: 'Orbital 360 Roll', short: 'ORBIT 360' },
  { value: 'Handheld Kinetic Shake', short: 'HANDHELD' }
] as const;

export const AIDirectorSlidePanel: React.FC = () => {
  const { project, activeShotIndex } = useStudioStore();

  const currentFrame = project.shots[activeShotIndex] || project.shots[0] || {
    epNumber: '001',
    title: 'THE SINGULARITY',
    tagline: '24.0 FPS UNCOMPRESSED MASTER',
    directorNotes: 'Woman looking into the void, cyan eye reflections'
  };

  const [modelTarget, setModelTarget] = useState<'veo' | 'flow' | 'midjourney' | 'flux'>('veo');
  const [lens, setLens] = useState<'18mm Ultra-Wide' | '35mm Master Prime' | '85mm Portrait Cine' | '2.39:1 Anamorphic'>('35mm Master Prime');
  const [lighting, setLighting] = useState<'Chiaroscuro Low-Key' | 'Volumetric God Rays' | 'Tungsten Warmth' | 'Cyberpunk Neon Rim'>('Volumetric God Rays');
  const [motion, setMotion] = useState<'Slow Push-In Dolly' | 'Hypersonic Whip Pan' | 'Orbital 360 Roll' | 'Handheld Kinetic Shake'>('Slow Push-In Dolly');
  const [filmStock] = useState('Kodak 5219 Vision3 stock');

  const [isCopied, setIsCopied] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchGenerated, setBatchGenerated] = useState<string[]>([]);
  const [batchGenerating, setBatchGenerating] = useState(false);

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
    <div className="space-y-4">
      <div className="space-y-3">
        <CinemaBadgeHeader
          icon={<Sparkles className="w-4 h-4" strokeWidth={2.2} />}
          label="AI DIRECTOR"
          accent="amber"
        />

        <div className="grid grid-cols-4 gap-1.5">
          {[
            { id: 'veo', label: 'VEO 2' },
            { id: 'flow', label: 'FLOW AI' },
            { id: 'midjourney', label: 'MIDJRN' },
            { id: 'flux', label: 'FLUX.1' }
          ].map((engine) => (
            <CinemaToolHUD
              key={engine.id}
              title={`PROMPT ENGINE: ${engine.label}`}
              en={`Format output cinema prompts specifically for ${engine.label}.`}
              bn={`${engine.label} মডেলের ফরম্যাটে প্রম্পট তৈরি করতে এটি সিলেক্ট করুন।`}
              accent="amber"
              blockWrapper
            >
              <button
                type="button"
                onClick={() => setModelTarget(engine.id as any)}
                data-active={modelTarget === engine.id ? 'true' : 'false'}
                className="cinema-tile cinema-tile-amber w-full min-h-[44px] py-2 px-1 rounded-md flex flex-col items-center justify-center gap-1 font-black tracking-wider text-[10px] uppercase cursor-pointer"
              >
                <Cpu className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                <span>{engine.label}</span>
              </button>
            </CinemaToolHUD>
          ))}
        </div>
      </div>

      {/* Camera Lens */}
      <div className="space-y-2">
        <CinemaBadgeHeader
          icon={<Camera className="w-3.5 h-3.5" strokeWidth={2.2} />}
          label="LENS"
          accent="amber"
        />
        <div className="grid grid-cols-2 gap-1.5">
          {LENS_OPTIONS.map((item) => (
            <CinemaToolHUD
              key={item.value}
              title={`OPTIC: ${item.value.toUpperCase()}`}
              en={`Inject ${item.value} optics and focal depth into prompt.`}
              bn={`প্রম্পটে ${item.value} ক্যামেরা লেন্স সেটিং যুক্ত করতে চাপুন।`}
              accent="amber"
              blockWrapper
            >
              <button
                type="button"
                onClick={() => setLens(item.value)}
                data-active={lens === item.value ? 'true' : 'false'}
                className="cinema-tile cinema-tile-amber w-full min-h-[44px] px-2.5 py-2 rounded-md flex items-center justify-center gap-1.5 font-black tracking-wider text-[10px] sm:text-[11px] uppercase cursor-pointer"
              >
                <Camera className="w-4 h-4 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                <span>{item.short}</span>
              </button>
            </CinemaToolHUD>
          ))}
        </div>
      </div>

      {/* Dynamic Lighting */}
      <div className="space-y-2">
        <CinemaBadgeHeader
          icon={<Sun className="w-3.5 h-3.5" strokeWidth={2.2} />}
          label="LIGHTING"
          accent="cyan"
        />
        <div className="grid grid-cols-2 gap-1.5">
          {LIGHTING_OPTIONS.map((item) => (
            <CinemaToolHUD
              key={item.value}
              title={`LIGHT: ${item.value.toUpperCase()}`}
              en={`Set cinematic lighting atmosphere to ${item.value}.`}
              bn={`সিনেমার আলোর ধরন ${item.value} করতে চাপুন।`}
              accent="cyan"
              blockWrapper
            >
              <button
                type="button"
                onClick={() => setLighting(item.value)}
                data-active={lighting === item.value ? 'true' : 'false'}
                className="cinema-tile cinema-tile-cyan w-full min-h-[44px] px-2.5 py-2 rounded-md flex items-center justify-center gap-1.5 font-black tracking-wider text-[10px] sm:text-[11px] uppercase cursor-pointer"
              >
                <Sun className="w-4 h-4 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                <span>{item.short}</span>
              </button>
            </CinemaToolHUD>
          ))}
        </div>
      </div>

      {/* Camera Motion */}
      <div className="space-y-2">
        <CinemaBadgeHeader
          icon={<Move className="w-3.5 h-3.5" strokeWidth={2.2} />}
          label="MOTION"
          accent="emerald"
        />
        <div className="grid grid-cols-2 gap-1.5">
          {MOTION_OPTIONS.map((item) => (
            <CinemaToolHUD
              key={item.value}
              title={`MOTION: ${item.value.toUpperCase()}`}
              en={`Apply ${item.value} camera trajectory to prompt.`}
              bn={`ক্যামেরার মুভমেন্ট ${item.value} সেট করতে চাপুন।`}
              accent="emerald"
              blockWrapper
            >
              <button
                type="button"
                onClick={() => setMotion(item.value)}
                data-active={motion === item.value ? 'true' : 'false'}
                className="cinema-tile cinema-tile-emerald w-full min-h-[44px] px-2.5 py-2 rounded-md flex items-center justify-center gap-1.5 font-black tracking-wider text-[10px] sm:text-[11px] uppercase cursor-pointer"
              >
                <Move className="w-4 h-4 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                <span>{item.short}</span>
              </button>
            </CinemaToolHUD>
          ))}
        </div>
      </div>

      {/* Live Prompt Terminal */}
      <div className="space-y-1.5">
        <CinemaBadgeHeader
          icon={<Terminal className="w-3.5 h-3.5" strokeWidth={2.2} />}
          label={`SHOT ${currentFrame.epNumber}`}
          accent="amber"
          rightSlot={
            <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">{modelTarget}</span>
          }
        />

        <div className="bg-[#050608] border border-[#26282E] rounded-md p-3 font-mono-tech text-[11px] leading-relaxed text-zinc-200 select-text">
          &quot;{masterPrompt}&quot;
        </div>
      </div>

      {/* 1-Click Actions */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <CinemaToolHUD
          title="COPY MASTER PROMPT"
          en="Copy the synthesized AI prompt string to your clipboard."
          bn="তৈরি হওয়া মাস্টার প্রম্পটটি ক্লিপবোর্ডে কপি করতে চাপুন।"
          accent="amber"
          blockWrapper
        >
          <button
            type="button"
            onClick={handleCopyPrompt}
            data-active={isCopied ? 'true' : 'false'}
            className="cinema-tile cinema-tile-amber w-full min-h-[48px] py-2.5 px-3 font-black text-[10px] sm:text-[11px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isCopied ? <Check className="w-5 h-5 cinema-tile-icon" strokeWidth={2.2} /> : <Copy className="w-5 h-5 cinema-tile-icon" strokeWidth={2.2} />}
            <span>{isCopied ? 'COPIED' : 'COPY PROMPT'}</span>
          </button>
        </CinemaToolHUD>

        <CinemaToolHUD
          title="BATCH 100 PROMPTS"
          en="Generate prompts for all 100 storyboard shots at once."
          bn="এক ক্লিকেই ১০০টি শটের জন্য আলাদা AI প্রম্পট তৈরি করুন।"
          accent="cyan"
          blockWrapper
        >
          <button
            type="button"
            onClick={handleBatchGenerate}
            className="cinema-tile cinema-tile-cyan w-full min-h-[48px] py-2.5 px-3 font-black text-[10px] sm:text-[11px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-5 h-5 cinema-tile-icon" strokeWidth={2.2} />
            <span>BATCH 100</span>
          </button>
        </CinemaToolHUD>
      </div>

      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0d12] border border-[#06B6D4]/50 rounded-lg max-w-2xl w-full p-5 space-y-4 shadow-[0_0_50px_rgba(0,240,255,0.25)] flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <CinemaBadgeHeader
                icon={<Zap className="w-4 h-4" strokeWidth={2.2} />}
                label={`BATCH 100 · ${modelTarget.toUpperCase()}`}
                accent="cyan"
              />
              <CinemaToolHUD
                title="CLOSE BATCH MATRIX"
                en="Close generated batch prompt window."
                bn="ব্যাচ প্রম্পট উইন্ডো বন্ধ করুন।"
                accent="crimson"
              >
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="cinema-tile cinema-tile-crimson px-3 py-1.5 min-h-[44px] rounded-md font-black tracking-wider text-[10px] uppercase cursor-pointer"
                >
                  CLOSE
                </button>
              </CinemaToolHUD>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 font-mono-tech text-[10.5px]">
              {batchGenerating ? (
                <div className="p-8 text-center text-cyan-300 font-black tracking-wider uppercase animate-pulse">
                  GENERATING 100...
                </div>
              ) : (
                batchGenerated.map((p, idx) => (
                  <div key={idx} className="p-2 rounded bg-black/50 border border-white/5 text-zinc-300">
                    {p}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <CinemaToolHUD
                title="DOWNLOAD TXT MATRIX"
                en="Save all 100 generated shot prompts as a .txt file."
                bn="১০০টি শটের প্রম্পট টেক্সট ফাইল (.TXT) হিসেবে ডাউনলোড করুন।"
                accent="cyan"
              >
                <button
                  type="button"
                  onClick={handleDownloadBatch}
                  className="cinema-tile cinema-tile-cyan px-4 py-2 min-h-[44px] font-black tracking-wider text-[11px] uppercase rounded-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                  <span>SAVE TXT</span>
                </button>
              </CinemaToolHUD>
              <CinemaToolHUD
                title="DONE"
                en="Close batch prompt matrix."
                bn="কাজ শেষে প্যানেল বন্ধ করতে DONE চাপুন।"
                accent="emerald"
              >
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="cinema-tile cinema-tile-emerald px-4 py-2 min-h-[44px] font-black tracking-wider text-[11px] uppercase rounded-md cursor-pointer"
                >
                  DONE
                </button>
              </CinemaToolHUD>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

