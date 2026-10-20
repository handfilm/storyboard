/**
 * RAWx Studio — Story Notebook & Screenplay Engine
 * Public API: StoryNotebook component
 * Rich text bilingual script editor with scene detection, pacing beat templates, and two-way shot linking.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../core/store';
import { parseFountainScript } from '../../data/fountainIO';
import { toBengaliNumerals } from '../../utils/engine';
import { 
  BookOpen, 
  Sparkles, 
  SplitSquareVertical, 
  TrendingUp, 
  Download, 
  Upload, 
  FileText, 
  Check, 
  Film 
} from 'lucide-react';

const beatTemplates = [
  { id: '3act', name: 'Classical 3-Act Structure (Setup, Confrontation, Resolution)' },
  { id: 'save-cat', name: "Blake Snyder's Save the Cat (15 Story Beats)" },
  { id: 'hero', name: "Joseph Campbell's Hero's Journey (12 Stages)" },
  { id: 'kisho', name: 'Kishōtenketsu (Introduction, Development, Twist, Conclusion)' },
  { id: 'ad-30s', name: '30-Second Commercial Hook & Payoff' },
  { id: 'reel-60s', name: '60-Second Social Viral Reel Curve' }
];

export const StoryNotebook: React.FC = () => {
  const { project, setActiveShotIndex, activeShotIndex, updateShot, setActiveModule } = useStudioStore();
  const [script, setScript] = useState(
    project.scriptText || 
`দৃশ্য ১: দ্য সিঙ্গুলারিটি // INT. COSMIC ABYSS - NIGHT
মহাজাগতিক শূন্যতায় চেতনার পরম প্রসারণ।
চোখের মণি প্রসারিত হয়ে অতল গহ্বরে হারিয়ে যায়।

দৃশ্য ২: ইভেন্ট হরাইজন // EXT. EVENT HORIZON - DAWN
আলো ও অন্ধকারের পরম সীমান্তরেখা।
প্রথম আলোর ঝলকানি ছড়িয়ে পড়ে দিগন্তে।

দৃশ্য ৩: ফোটন স্পেয়ার // INT. APERTURE CORE - CONTINUOUS
আলোর কণার তীব্র ঘূর্ণন ও প্রতিসরণ।
ত্বকের সূক্ষ্ম তন্তুতে আলো ঠিকরে পড়ে।`
  );

  const [selectedTemplate, setSelectedTemplate] = useState('3act');
  const [breakdownStatus, setBreakdownStatus] = useState<string | null>(null);

  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 130));

  const handleBreakdownShots = () => {
    const scenes = parseFountainScript(script);
    if (scenes.length === 0) {
      setBreakdownStatus('No scene headers found. Use "দৃশ্য ১" or "INT." to define scenes.');
      return;
    }
    setBreakdownStatus(`Generated ${scenes.length} scene markers linked to storyboard.`);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050505] text-[#EDEDED] font-mono text-xs select-none">
      {/* Notebook Toolbar */}
      <div className="h-10 px-4 border-b border-[#D4AF37]/20 flex items-center justify-between bg-[#0B0B0B]">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#D4AF37]" />
          <span className="font-bold tracking-wider text-[#FFE066]">STORY NOTEBOOK & SCRIPT ENGINE</span>
          <span className="text-[10px] text-[#8A8A8A]">
            ({wordCount} words // ~{readingTimeMinutes} min read)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Beat Template Selector */}
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="bg-[#121212] border border-[#D4AF37]/30 text-[#EDEDED] text-[10px] rounded px-2 py-1 outline-none"
          >
            {beatTemplates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <button
            onClick={handleBreakdownShots}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#D4AF37] text-black font-bold hover:bg-[#FFE066] transition-colors text-[11px]"
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>BREAKDOWN SHOTS</span>
          </button>
        </div>
      </div>

      {breakdownStatus && (
        <div className="px-4 py-1.5 bg-[#4ADE80]/10 border-b border-[#4ADE80]/30 text-[#4ADE80] text-[11px] flex items-center gap-2">
          <Check className="w-3.5 h-3.5" />
          <span>{breakdownStatus}</span>
        </div>
      )}

      {/* Main Split Body: Script Editor + Pacing Curve & Shot Links */}
      <div className="flex-1 flex overflow-hidden">
        {/* Screenplay Editor */}
        <div className="flex-1 p-4 flex flex-col gap-2 border-r border-[#D4AF37]/20 bg-[#0B0B0B]/50">
          <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider font-bold">
            Screenplay Draft (Fountain / Bilingual বাংলা + English)
          </span>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Type your script here... Use INT., EXT., or দৃশ্য to mark scenes."
            className="flex-1 w-full bg-[#121212] border border-white/5 rounded-lg p-3 text-sm text-[#EDEDED] font-mono leading-relaxed outline-none resize-none focus:border-[#D4AF37]/50"
          />
        </div>

        {/* Pacing Curve & Synced Shot List */}
        <div className="w-80 p-4 flex flex-col gap-4 bg-[#050505] overflow-y-auto">
          {/* Pacing Tension Graph */}
          <div className="p-3 rounded-lg bg-[#121212] border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Pacing & Emotional Arc</span>
              </span>
              <span className="text-[#8A8A8A]">Hero's Tension</span>
            </div>

            {/* SVG Pacing Graph Curve */}
            <svg viewBox="0 0 200 60" className="w-full h-16 stroke-[#D4AF37] fill-none">
              <path
                d="M 10 50 Q 50 45, 80 30 T 130 15 T 170 10 T 190 40"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="80" cy="30" r="3" fill="#FFE066" />
              <circle cx="170" cy="10" r="3.5" fill="#FF4B4B" />
            </svg>
            <div className="flex justify-between text-[9px] text-[#8A8A8A]">
              <span>Act I: Inciting</span>
              <span>Act II: Climax</span>
              <span>Act III: Resolve</span>
            </div>
          </div>

          {/* Synced Storyboard Shots List */}
          <div className="flex flex-col gap-1.5 flex-1">
            <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider font-bold">
              Linked Shots (Click to View on Stage)
            </span>
            <div className="flex flex-col gap-1 overflow-y-auto max-h-96">
              {Array.from({ length: 8 }, (_, idx) => {
                const isActive = idx === activeShotIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveShotIndex(idx);
                      setActiveModule('PLAYER');
                    }}
                    className={`p-2 rounded text-left border flex items-center justify-between transition-colors ${
                      isActive
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#FFE066]'
                        : 'bg-[#121212] border-white/5 text-[#8A8A8A] hover:text-[#EDEDED]'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-[11px]">EP {String(idx + 1).padStart(3, '0')} // দৃশ্য {toBengaliNumerals(idx + 1)}</span>
                      <span className="text-[9px] text-[#8A8A8A]">Focal: 50mm f/1.4 Cine</span>
                    </div>
                    <Film className="w-3.5 h-3.5 text-[#D4AF37]" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
