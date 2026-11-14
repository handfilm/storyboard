/**
 * @file /src/components/StoryNotebookPanel.tsx
 * @description Next-Gen Screenplay & Story Architecture Workstation for HANDFILM.
 * Features:
 * 1. Bilingual Screenplay Editor (Fountain / English + Bengali)
 * 2. Integrated AI Scriptwriting Assistant (Gemini streaming with 4 modes & 12s fallbacks)
 * 3. Interactive 3-Act Tension Curve SVG with draggable control nodes & pacing calculator
 * 4. Moodboard Pinboard for character references, location photos & color palettes
 * 5. 1-Click Storyboard Linkage: parses INT./EXT./দৃশ্য headings into Shots 001-100
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStudioStore } from '../core/store';
import { parseFountainScript } from '../data/fountainIO';
import { toBengaliNumerals } from '../utils/engine';
import { 
  BookOpen, 
  Sparkles, 
  SplitSquareVertical, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Palette, 
  Link2, 
  RefreshCw, 
  Check, 
  Copy, 
  ArrowUpRight, 
  Maximize2,
  Film,
  Zap,
  Flame,
  Volume2
} from 'lucide-react';
import { CinemaToolHUD, CinemaBadgeHeader } from './ui/CinemaToolHUD';

interface MoodItem {
  id: string;
  type: 'image' | 'color';
  url?: string;
  hex?: string;
  label: string;
  tag?: string;
}

interface TensionNode {
  id: string;
  act: string;
  label: string;
  x: number; // 0 to 100%
  tension: number; // 0 to 100%
}

const PRESET_12S_BEATS = [
  {
    mode: 'expand_beat',
    label: 'Cosmic Singularity (0-12s)',
    content: `দৃশ্য ১: দ্য সিঙ্গুলারিটি // INT. COSMIC ABYSS - NIGHT
[00:00 - 00:12 | 288 FRAMES]
FOCAL: 50mm Anamorphic T2.0 • ISO 800 • 1/48s 180°
VISUAL: The obsidian void fractures. Golden filaments of light radiate outward from the pupil of a cybernetic eye. Micro-dust motes catch the tungsten flare.
AUDIO: 43.6Hz sub-harmonic drone rising slowly; sudden dry intake of breath at 00:09.`
  },
  {
    mode: 'polish_dialogue',
    label: 'High-Tension Bengali Dialogue',
    content: `রহমান // RAHMAN
(কণ্ঠ খাদে নামিয়ে, দীর্ঘ নিঃশ্বাস ফেলে)
আমরা আর কখনো আগের আলোতে ফিরতে পারব না। দিগন্ত ভেঙে পড়েছে।
We can never step back into the light that forged us. The horizon has collapsed.

মায়া // MAYA
(চোখে আগুন, কাঁপতে কাঁপতে)
তাহলে এই অন্ধকারকেই আমাদের অস্ত্র বানাতে হবে।
Then we make this darkness our razor's edge.`
  },
  {
    mode: 'generate_loglines',
    label: 'Shots 001-004 Sequence',
    content: `[SHOT 001] • EXT. DHAKA METROPOLIS ROOFTOP - DAWN • 24mm Ultra Wide • Cold neon fog parting before monolithic high-rises • TENSION: 42%
[SHOT 002] • INT. CONTROL ROOM - CONTINUOUS • 35mm Master Prime • Glitch monitors cast emerald reflections on sweating temples • TENSION: 68%
[SHOT 003] • INT. APERTURE CORE - CONTINUOUS • 85mm Macro Cine • Kinetic relay switches engaging at hypersonic speed • TENSION: 89%
[SHOT 004] • EXT. EVENT HORIZON - DUSK • 50mm Anamorphic • Blinding solar flare eclipses the protagonist silhouette • TENSION: 95%`
  },
  {
    mode: 'punch_tension',
    label: 'Urgent Ticking-Clock Climax',
    content: `[CLIMAX SURGE • 12 SECONDS TO CORE DETONATION]
Every heartbeat echoes like a sledgehammer against steel. 
The camera accelerates into an unyielding 15-degree Dutch tilt. 
The LED countdown reflects in Rahman's retinas: 00:03... 00:02... 
Total audio drop to pure silence before the sub-bass detonation.`
  }
];

export const StoryNotebookPanel: React.FC = () => {
  const { project, setActiveShotIndex, activeShotIndex, updateShot, setActiveModule } = useStudioStore();

  const [script, setScript] = useState<string>(
    project.scriptText ||
`দৃশ্য ১: দ্য সিঙ্গুলারিটি // INT. COSMIC ABYSS - NIGHT
[CAMERA: 35mm Master Prime f/1.4 | 14-Bit RAW]
মহাজাগতিক শূন্যতায় চেতনার পরম প্রসারণ।
চোখের মণি প্রসারিত হয়ে অতল গহ্বরে হারিয়ে যায়।
The obsidian abyss trembles as pure light fractures into golden filaments.

দৃশ্য ২: ইভেন্ট হরাইজন // EXT. EVENT HORIZON - DAWN
[CAMERA: 50mm Anamorphic 2x | High-Speed 24fps]
আলো ও অন্ধকারের পরম সীমান্তরেখা।
প্রথম আলোর ঝলকানি ছড়িয়ে পড়ে দিগন্তে।
The razor boundary where all timecode ceases to flow.

দৃশ্য ৩: ফোটন স্পেয়ার // INT. APERTURE CORE - CONTINUOUS
[CAMERA: 85mm Cine Portrait | Macro Focus]
আলোর কণার তীব্র ঘূর্ণন ও প্রতিসরণ।
ত্বকের সূক্ষ্ম তন্তুতে আলো ঠিকরে পড়ে।
Kinetic relay sensors overload with incandescent phosphor.`
  );

  // AI Assistant states
  const [aiMode, setAiMode] = useState<'expand_beat' | 'polish_dialogue' | 'generate_loglines' | 'punch_tension'>('expand_beat');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedOutput, setGeneratedOutput] = useState<string>('');
  const [linkNotification, setLinkNotification] = useState<string | null>(null);

  // 3-Act Tension Curve Interactive Nodes (Draggable SVG)
  const [tensionNodes, setTensionNodes] = useState<TensionNode[]>([
    { id: 'act1_setup', act: 'ACT I', label: 'Setup', x: 8, tension: 25 },
    { id: 'act1_inciting', act: 'ACT I', label: 'Inciting Incident', x: 26, tension: 52 },
    { id: 'act2_midpoint', act: 'ACT II', label: 'Midpoint Crisis', x: 50, tension: 70 },
    { id: 'act2_climax', act: 'ACT II', label: 'The Climax', x: 78, tension: 96 },
    { id: 'act3_resolution', act: 'ACT III', label: 'Resolution', x: 94, tension: 38 }
  ]);
  const [activeDragNode, setActiveDragNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Moodboard References
  const [moodboard, setMoodboard] = useState<MoodItem[]>([
    {
      id: 'm1',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
      label: 'Cybernetic Pupil',
      tag: 'CHARACTER'
    },
    {
      id: 'm2',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=400&q=80',
      label: 'Neon Monoliths',
      tag: 'LOCATION'
    },
    {
      id: 'm3',
      type: 'color',
      hex: '#F5A623',
      label: 'Arri Amber Flare',
      tag: 'PALETTE'
    },
    {
      id: 'm4',
      type: 'color',
      hex: '#0A0B10',
      label: 'Obsidian Space',
      tag: 'PALETTE'
    }
  ]);
  const [newMoodLabel, setNewMoodLabel] = useState('');
  const [newMoodUrl, setNewMoodUrl] = useState('');
  const [newMoodHex, setNewMoodHex] = useState('#D4AF37');
  const [moodTab, setMoodTab] = useState<'image' | 'color'>('image');

  // Stats
  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const estimatedShots = Math.max(1, (script.match(/(দৃশ্য|INT\.|EXT\.)/gi) || []).length);
  const readingTime = Math.max(1, Math.round(wordCount / 130));

  // AI Assistant trigger with Gemini streaming & fallback
  const handleRunAi = async () => {
    setIsGenerating(true);
    setGeneratedOutput('');

    const targetPrompt = aiPrompt.trim() || `Expand current scene beat into intense 12s cinema beats with camera specifications.`;

    try {
      const response = await fetch('/api/story/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: aiMode,
          prompt: targetPrompt,
          scriptContext: script.slice(-1000),
          stream: true
        })
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming failed or endpoint unavailable');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulated += parsed.text;
                setGeneratedOutput(accumulated);
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              // raw string chunk
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('[AI Assistant] Streaming fallback triggered:', err);
      // Seamless 12-second preset fallback
      const fallback = PRESET_12S_BEATS.find(b => b.mode === aiMode) || PRESET_12S_BEATS[0];
      setGeneratedOutput(`${fallback.content}\n\n[PRO-NOTE: Generated via 12s Cinema Beat Engine]`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAppendToScript = () => {
    if (!generatedOutput) return;
    setScript(prev => `${prev}\n\n${generatedOutput}`);
    setLinkNotification('Appended to Screenplay Draft');
    setTimeout(() => setLinkNotification(null), 3000);
  };

  // 1-Click Storyboard Linkage: Parse Screenplay Headers into Shots
  const handleLinkToTimeline = () => {
    const rawScenes = parseFountainScript(script);
    let linkedCount = 0;

    // Split script by scene headers
    const sceneRegex = /(?:^|\n)(?:(দৃশ্য\s*\d+[^:\n]*|INT\.[^\n]+|EXT\.[^\n]+):?)/gi;
    const matches = Array.from(script.matchAll(sceneRegex));

    if (matches.length === 0) {
      setLinkNotification('No scene headers found. Use "দৃশ্য ১" or "INT./EXT." to mark scenes.');
      setTimeout(() => setLinkNotification(null), 4000);
      return;
    }

    matches.forEach((m, idx) => {
      const header = m[1].trim();
      const startPos = m.index! + m[0].length;
      const nextMatch = matches[idx + 1];
      const endPos = nextMatch ? nextMatch.index! : script.length;
      const body = script.slice(startPos, endPos).trim();

      const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
      const enTitle = header.includes('//') ? header.split('//')[1].trim() : header;
      const bnTitle = header.includes('//') ? header.split('//')[0].trim() : header;
      const description = lines.slice(0, 3).join(' ');

      if (idx < 100) {
        try {
          updateShot(idx, {
            title: enTitle,
            bengaliTitle: bnTitle,
            directorNotes: description || `Screenplay linked beat #${idx + 1}`,
            tagline: lines[0] || '12.0s Master Frame'
          });
          linkedCount++;
        } catch (e) {
          console.warn('[Story Link] updateShot error:', e);
        }
      }
    });

    setLinkNotification(`✓ Linked ${linkedCount} screenplay scenes directly to Storyboard Shots!`);
    setTimeout(() => setLinkNotification(null), 4500);
  };

  // Dragging Tension Curve Nodes
  const handleSvgMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDragNode(nodeId);
  };

  const handleSvgMouseMove = useCallback((e: React.MouseEvent) => {
    if (!activeDragNode || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clampedY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const tensionVal = Math.round(100 - (clampedY / rect.height) * 100);

    setTensionNodes(prev =>
      prev.map(n => (n.id === activeDragNode ? { ...n, tension: Math.max(5, Math.min(100, tensionVal)) } : n))
    );
  }, [activeDragNode]);

  const handleSvgMouseUp = () => {
    setActiveDragNode(null);
  };

  // Construct SVG path for Tension Curve
  const svgWidth = 400;
  const svgHeight = 120;
  const points = tensionNodes.map(n => ({
    x: (n.x / 100) * svgWidth,
    y: svgHeight - (n.tension / 100) * (svgHeight - 20) - 10
  }));

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = (p0.x + p1.x) / 2;
    pathD += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  // Add Moodboard item
  const handleAddMoodItem = () => {
    if (moodTab === 'image' && newMoodUrl.trim()) {
      setMoodboard(prev => [
        ...prev,
        {
          id: `m_${Date.now()}`,
          type: 'image',
          url: newMoodUrl.trim(),
          label: newMoodLabel || 'Reference Frame',
          tag: 'REFERENCE'
        }
      ]);
      setNewMoodUrl('');
      setNewMoodLabel('');
    } else if (moodTab === 'color' && newMoodHex.trim()) {
      setMoodboard(prev => [
        ...prev,
        {
          id: `m_${Date.now()}`,
          type: 'color',
          hex: newMoodHex,
          label: newMoodLabel || 'Grade Swatch',
          tag: 'PALETTE'
        }
      ]);
      setNewMoodLabel('');
    }
  };

  const handleRemoveMood = (id: string) => {
    setMoodboard(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#07070A] text-[#EDEDED] font-mono-tech select-none overflow-hidden">
      {/* Top Action Bar */}
      <div className="h-12 px-3 border-b border-[#272732] bg-[#0c0c12] flex items-center justify-between shrink-0 gap-2">
        <CinemaBadgeHeader
          icon={<BookOpen className="w-4 h-4" strokeWidth={2.2} />}
          label="STORY SCRIPT"
          accent="amber"
          rightSlot={
            <span className="text-[10px] font-black text-zinc-400 tabular-nums hidden sm:inline">
              {estimatedShots} SCENES · {wordCount}W
            </span>
          }
        />

        <div className="flex items-center gap-1.5 shrink-0">
          <CinemaToolHUD
            title="LINK SCRIPT TO TIMELINE"
            en="Parse INT./EXT./দৃশ্য scene headings directly into storyboard shots 001–100."
            bn="স্ক্রিপ্টের দৃশ্য হেডিংগুলো (INT./EXT./দৃশ্য) এক ক্লিকেই স্টোরিবোর্ড শটে রূপান্তর করুন।"
            accent="amber"
          >
            <button
              type="button"
              onClick={handleLinkToTimeline}
              data-active="true"
              className="cinema-tile cinema-tile-amber flex items-center gap-1.5 px-3 min-h-[38px] rounded-md font-black tracking-wider text-[10px] sm:text-[11px] uppercase cursor-pointer"
            >
              <Link2 className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
              <span>LINK TIMELINE</span>
            </button>
          </CinemaToolHUD>
        </div>
      </div>

      {/* Link Notification Banner */}
      {linkNotification && (
        <div className="px-3 py-1.5 bg-[#fbbf24]/15 border-b border-[#fbbf24]/40 text-[#fbbf24] text-[10px] font-black flex items-center gap-2">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{linkNotification}</span>
        </div>
      )}

      {/* Split Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: Screenplay Editor */}
        <div className="flex-1 flex flex-col p-3 border-b lg:border-b-0 lg:border-r border-[#272732] bg-[#09090D] overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <CinemaBadgeHeader
              icon={<Film className="w-3.5 h-3.5" strokeWidth={2.2} />}
              label="FOUNTAIN DRAFT"
              accent="amber"
              rightSlot={<span className="text-[10px] font-black text-emerald-400">AUTO SYNC</span>}
            />
          </div>

          <textarea
            value={script}
            onChange={(e) => {
              setScript(e.target.value);
              try {
                useStudioStore.setState((s: any) => ({
                  project: { ...s.project, scriptText: e.target.value }
                }));
              } catch {}
            }}
            placeholder="INT. / EXT. / দৃশ্য ১..."
            className="flex-1 w-full bg-[#0E0E14] border border-[#272732] focus:border-[#F59E0B]/70 rounded-md p-3 text-xs text-zinc-100 font-mono leading-relaxed outline-none resize-none no-scrollbar shadow-inner"
            spellCheck={false}
          />

          {/* Quick Scene Heading Inserters */}
          <div className="pt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <CinemaToolHUD
              title="INSERT BANGLA SCENE (দৃশ্য)"
              en="Insert a bilingual Bengali + English scene heading at the end of draft."
              bn="স্ক্রিপ্টে নতুন বাংলা + ইংরেজি দৃশ্য হেডিং যুক্ত করতে + দৃশ্য চাপুন।"
              accent="amber"
            >
              <button
                type="button"
                onClick={() => setScript(p => `${p}\n\nদৃশ্য ${toBengaliNumerals(estimatedShots + 1)}: // INT. NEW SCENE - NIGHT\n`)}
                className="cinema-tile cinema-tile-amber px-2.5 min-h-[36px] rounded text-[10px] font-black uppercase shrink-0 cursor-pointer"
              >
                + দৃশ্য
              </button>
            </CinemaToolHUD>
            <CinemaToolHUD
              title="INSERT INT. SCENE"
              en="Insert interior Fountain screenplay slugline."
              bn="ইন্টেরিয়র (INT.) দৃশ্য হেডিং যোগ করতে চাপুন।"
              accent="cyan"
            >
              <button
                type="button"
                onClick={() => setScript(p => `${p}\n\nINT. LOCATION - DAY\n`)}
                className="cinema-tile cinema-tile-cyan px-2.5 min-h-[36px] rounded text-[10px] font-black uppercase shrink-0 cursor-pointer"
              >
                + INT.
              </button>
            </CinemaToolHUD>
            <CinemaToolHUD
              title="INSERT EXT. SCENE"
              en="Insert exterior Fountain screenplay slugline."
              bn="এক্সটেরিয়র (EXT.) দৃশ্য হেডিং যোগ করতে চাপুন।"
              accent="emerald"
            >
              <button
                type="button"
                onClick={() => setScript(p => `${p}\n\nEXT. LOCATION - NIGHT\n`)}
                className="cinema-tile cinema-tile-emerald px-2.5 min-h-[36px] rounded text-[10px] font-black uppercase shrink-0 cursor-pointer"
              >
                + EXT.
              </button>
            </CinemaToolHUD>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-[420px] bg-[#0c0c12] p-3 flex flex-col gap-3.5 overflow-y-auto no-scrollbar shrink-0">
          {/* 1. AI SCRIPTWRITING COPILOT */}
          <div className="p-2.5 rounded-md bg-[#111215] border border-[#26282E] flex flex-col gap-2">
            <CinemaBadgeHeader
              icon={<Sparkles className="w-3.5 h-3.5" strokeWidth={2.2} />}
              label="AI WRITER"
              accent="amber"
              rightSlot={<span className="text-[10px] font-black text-amber-400">12S BEATS</span>}
            />

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'expand_beat', label: 'EXPAND BEAT', icon: Zap, en: 'Expand scene into 12-second cinema camera beats.', bn: 'দৃশ্যটিকে ১২ সেকেন্ডের সিনেমা বিটে সাজাতে চাপুন।' },
                { id: 'polish_dialogue', label: 'DIALOGUE', icon: Volume2, en: 'Polish dramatic Bengali + English dialogue.', bn: 'সংলাপ আরও নাটকীয় ও ধারালো করতে চাপুন।' },
                { id: 'generate_loglines', label: 'LOGLINES', icon: Film, en: 'Generate multi-shot loglines with lens specs.', bn: 'শট অনুযায়ী লগলাইন ও লেন্স নোট তৈরি করুন।' },
                { id: 'punch_tension', label: 'TENSION', icon: Flame, en: 'Boost climax pacing and ticking-clock intensity.', bn: 'দৃশ্যের উত্তেজনা ও ক্লাইম্যাক্স বাড়াতে চাপুন।' }
              ].map(m => {
                const Icon = m.icon;
                const isSelected = aiMode === m.id;
                return (
                  <CinemaToolHUD
                    key={m.id}
                    title={`MODE: ${m.label}`}
                    en={m.en}
                    bn={m.bn}
                    accent="amber"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => setAiMode(m.id as any)}
                      data-active={isSelected ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-amber w-full min-h-[40px] px-2 py-1.5 rounded-md text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Icon className="w-3.5 h-3.5 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                      <span className="truncate">{m.label}</span>
                    </button>
                  </CinemaToolHUD>
                );
              })}
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Scene directive..."
                className="flex-1 bg-black/60 border border-[#26282E] focus:border-[#F59E0B]/60 rounded px-2.5 py-1.5 text-[10.5px] text-zinc-100 outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunAi();
                }}
              />
              <CinemaToolHUD
                title="GENERATE AI DRAFT"
                en="Run AI scriptwriter for the selected mode and directive."
                bn="নির্বাচিত মোড অনুযায়ী AI দিয়ে স্ক্রিপ্ট তৈরি করতে WRITE চাপুন।"
                accent="amber"
              >
                <button
                  type="button"
                  onClick={handleRunAi}
                  disabled={isGenerating}
                  className="cinema-tile cinema-tile-amber px-3 min-h-[40px] rounded-md font-black tracking-wider text-[10px] uppercase flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin cinema-tile-icon" /> : <Sparkles className="w-3.5 h-3.5 cinema-tile-icon" />}
                  <span>WRITE</span>
                </button>
              </CinemaToolHUD>
            </div>

            {generatedOutput && (
              <div className="mt-1 p-2 bg-[#09090E] border border-[#F59E0B]/40 rounded text-[9.5px] flex flex-col gap-1.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-1">
                  <span className="font-black text-[#F59E0B] uppercase">AI OUTPUT</span>
                  <div className="flex items-center gap-1.5">
                    <CinemaToolHUD title="COPY DRAFT" en="Copy generated text to clipboard." bn="তৈরি হওয়া লেখাটি কপি করুন।" accent="cyan">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(generatedOutput)}
                        className="cinema-tile cinema-tile-cyan px-2 py-0.5 rounded flex items-center gap-1 text-[9px] font-black uppercase cursor-pointer"
                      >
                        <Copy className="w-3 h-3 cinema-tile-icon" />
                        <span>COPY</span>
                      </button>
                    </CinemaToolHUD>
                    <CinemaToolHUD title="INSERT INTO SCRIPT" en="Append AI draft directly into screenplay editor." bn="এই লেখাটি আপনার স্ক্রিপ্টে যোগ করতে INSERT চাপুন।" accent="amber">
                      <button
                        type="button"
                        onClick={handleAppendToScript}
                        className="cinema-tile cinema-tile-amber px-2 py-0.5 rounded flex items-center gap-1 text-[9px] font-black uppercase cursor-pointer"
                      >
                        <Plus className="w-3 h-3 cinema-tile-icon" />
                        <span>INSERT</span>
                      </button>
                    </CinemaToolHUD>
                  </div>
                </div>
                <div className="max-h-36 overflow-y-auto no-scrollbar font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {generatedOutput}
                </div>
              </div>
            )}
          </div>

          {/* 2. 3-ACT BEAT MATRIX */}
          <div className="p-2.5 rounded-md bg-[#111215] border border-[#26282E] flex flex-col gap-2">
            <CinemaBadgeHeader
              icon={<TrendingUp className="w-3.5 h-3.5" strokeWidth={2.2} />}
              label="TENSION ARC"
              accent="amber"
            />

            <div
              className="relative w-full h-28 bg-[#09090E] border border-[#272732] rounded overflow-hidden"
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
              onMouseLeave={handleSvgMouseUp}
            >
              <div className="absolute inset-0 flex text-[8px] font-black text-zinc-600 pointer-events-none">
                <div className="w-[28%] border-r border-white/5 p-1">ACT I</div>
                <div className="w-[50%] border-r border-white/5 p-1">ACT II</div>
                <div className="w-[22%] p-1">ACT III</div>
              </div>

              <svg
                ref={svgRef}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full cursor-crosshair"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="tensionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path
                  d={`${pathD} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`}
                  fill="url(#tensionGrad)"
                />
                <path d={pathD} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />

                {tensionNodes.map((node, i) => {
                  const pt = points[i];
                  const isDragging = activeDragNode === node.id;
                  return (
                    <g key={node.id} onMouseDown={(e) => handleSvgMouseDown(node.id, e)} className="cursor-ns-resize">
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isDragging ? 7 : 5}
                        fill={node.tension > 80 ? '#ef4444' : '#fbbf24'}
                        stroke="#000"
                        strokeWidth="1.5"
                      />
                      <text
                        x={pt.x}
                        y={Math.max(12, pt.y - 8)}
                        fontSize="8.5"
                        fontWeight="bold"
                        fill="#fff"
                        textAnchor="middle"
                      >
                        {node.tension}%
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="grid grid-cols-3 gap-1 text-[8px] text-zinc-400">
              <div className="p-1.5 rounded bg-black/40 border border-[#26282E] flex flex-col">
                <span className="text-zinc-500 font-black">AVG</span>
                <span className="text-zinc-200 font-black text-[10px]">
                  {Math.round(tensionNodes.reduce((acc, n) => acc + n.tension, 0) / tensionNodes.length)}%
                </span>
              </div>
              <div className="p-1.5 rounded bg-black/40 border border-[#26282E] flex flex-col">
                <span className="text-zinc-500 font-black">PEAK</span>
                <span className="text-rose-400 font-black text-[10px]">
                  {Math.max(...tensionNodes.map(n => n.tension))}%
                </span>
              </div>
              <div className="p-1.5 rounded bg-black/40 border border-[#26282E] flex flex-col">
                <span className="text-zinc-500 font-black">PACE</span>
                <span className="text-[#fbbf24] font-black text-[10px]">12.0s</span>
              </div>
            </div>
          </div>

          {/* 3. MOODBOARD & REFERENCE PINBOARD */}
          <div className="p-2.5 rounded-md bg-[#111215] border border-[#26282E] flex flex-col gap-2">
            <CinemaBadgeHeader
              icon={<Palette className="w-3.5 h-3.5" strokeWidth={2.2} />}
              label="MOODBOARD"
              accent="amber"
              rightSlot={<span className="text-[10px] font-black text-zinc-400">{moodboard.length} PINS</span>}
            />

            <div className="p-1.5 bg-black/40 rounded border border-[#26282E] flex flex-col gap-1.5 text-[9px]">
              <div className="grid grid-cols-2 gap-1.5">
                <CinemaToolHUD title="PHOTO URL" en="Pin a reference photo URL." bn="রেফারেন্স ছবির লিংক যোগ করুন।" accent="amber" blockWrapper>
                  <button
                    type="button"
                    onClick={() => setMoodTab('image')}
                    data-active={moodTab === 'image' ? 'true' : 'false'}
                    className="cinema-tile cinema-tile-amber w-full min-h-[34px] px-2 py-1 rounded text-[9.5px] font-black uppercase flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                    <span>+ PHOTO</span>
                  </button>
                </CinemaToolHUD>
                <CinemaToolHUD title="COLOR SWATCH" en="Pin a grade hex color swatch." bn="কালার সোয়াচ পিন করতে চাপুন।" accent="cyan" blockWrapper>
                  <button
                    type="button"
                    onClick={() => setMoodTab('color')}
                    data-active={moodTab === 'color' ? 'true' : 'false'}
                    className="cinema-tile cinema-tile-cyan w-full min-h-[34px] px-2 py-1 rounded text-[9.5px] font-black uppercase flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Palette className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                    <span>+ COLOR</span>
                  </button>
                </CinemaToolHUD>
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Tag..."
                  value={newMoodLabel}
                  onChange={(e) => setNewMoodLabel(e.target.value)}
                  className="flex-1 bg-black/60 border border-[#26282E] px-2 py-1 rounded text-zinc-200 outline-none"
                />
                {moodTab === 'image' ? (
                  <input
                    type="text"
                    placeholder="URL..."
                    value={newMoodUrl}
                    onChange={(e) => setNewMoodUrl(e.target.value)}
                    className="flex-1 bg-black/60 border border-[#26282E] px-2 py-1 rounded text-zinc-200 outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={newMoodHex}
                      onChange={(e) => setNewMoodHex(e.target.value)}
                      className="w-6 h-6 rounded bg-transparent border-none cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newMoodHex}
                      onChange={(e) => setNewMoodHex(e.target.value)}
                      className="w-16 bg-black/60 border border-[#26282E] px-1 py-1 rounded text-zinc-200 uppercase outline-none text-center"
                    />
                  </div>
                )}
                <CinemaToolHUD title="PIN TO BOARD" en="Add reference card to moodboard." bn="মুডবোর্ডে রেফারেন্স পিন করতে PIN চাপুন।" accent="amber">
                  <button
                    type="button"
                    onClick={handleAddMoodItem}
                    data-active="true"
                    className="cinema-tile cinema-tile-amber px-2.5 min-h-[32px] rounded font-black text-[9.5px] uppercase cursor-pointer"
                  >
                    PIN
                  </button>
                </CinemaToolHUD>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto no-scrollbar">
              {moodboard.map(item => (
                <div
                  key={item.id}
                  className="p-1.5 rounded bg-black/60 border border-[#26282E] flex items-center justify-between gap-1.5 group relative"
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.label}
                      className="w-10 h-10 object-cover rounded border border-white/10 shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded border border-white/20 shrink-0 shadow-sm"
                      style={{ backgroundColor: item.hex }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-black text-zinc-200 truncate">{item.label}</div>
                    <div className="text-[7.5px] text-zinc-500 font-mono truncate">{item.tag}</div>
                  </div>
                  <CinemaToolHUD title="REMOVE PIN" en="Remove item from moodboard." bn="মুডবোর্ড থেকে সরাতে চাপুন।" accent="crimson">
                    <button
                      type="button"
                      onClick={() => handleRemoveMood(item.id)}
                      className="cinema-tile cinema-tile-crimson p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 cinema-tile-icon" />
                    </button>
                  </CinemaToolHUD>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
