/**
 * @file /src/features/review/ReviewSlidePanel.tsx
 * @description Module 11: REVIEW (Frame-Accurate Video Markup & Client Notes)
 * Features:
 * - Interactive Tools: Freehand Pen, Tactical Arrow, Bounding Box, Text Flag
 * - Color Palette: Neon Amber (#F5A623), Cyan Flare (#00F0FF), Hazard Red (#FF3344)
 * - Frame Pin List: clicking note jumps timeline playhead to that frame
 * - 1-Click Action: [ ⤓ EXPORT REVIEW MANIFEST (.JSON / .MD) ]
 */

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Edit3, 
  ArrowRight, 
  Square, 
  Flag, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Sparkles,
  FileText,
  FileCode
} from 'lucide-react';
import { 
  reviewStore, 
  MarkupTool, 
  MarkupColor, 
  ReviewAnnotation 
} from '../../services/reviewStore';
import { audioEngine } from '../../utils/audioEngine';
import { CinemaToolHUD, CinemaBadgeHeader } from '../../components/ui/CinemaToolHUD';

interface ReviewSlidePanelProps {
  onJumpToFrame?: (shotIndex: number, timeSec: number) => void;
  activeShotIndex?: number;
  slideTimeSec?: number;
}

export const ReviewSlidePanel: React.FC<ReviewSlidePanelProps> = ({
  onJumpToFrame,
  activeShotIndex = 0,
  slideTimeSec = 0
}) => {
  const [activeTool, setActiveTool] = useState<MarkupTool>(reviewStore.getActiveTool());
  const [activeColor, setActiveColor] = useState<MarkupColor>(reviewStore.getActiveColor());
  const [strokeWidth, setStrokeWidth] = useState<number>(reviewStore.getStrokeWidth());
  const [annotations, setAnnotations] = useState<ReviewAnnotation[]>(reviewStore.getAnnotations());
  const [exportFormat, setExportFormat] = useState<'md' | 'json'>('md');
  const [copiedNotification, setCopiedNotification] = useState(false);

  useEffect(() => {
    const unsub = reviewStore.subscribe(() => {
      setActiveTool(reviewStore.getActiveTool());
      setActiveColor(reviewStore.getActiveColor());
      setStrokeWidth(reviewStore.getStrokeWidth());
      setAnnotations(reviewStore.getAnnotations());
    });
    return unsub;
  }, []);

  const handleSelectTool = (tool: MarkupTool) => {
    reviewStore.setActiveTool(tool);
    try {
      audioEngine.playShutterClick();
    } catch {}
  };

  const handleSelectColor = (color: MarkupColor) => {
    reviewStore.setActiveColor(color);
    try {
      audioEngine.playShutterClick();
    } catch {}
  };

  const handleJumpToPin = (ann: ReviewAnnotation) => {
    try {
      audioEngine.playShutterClick();
    } catch {}
    if (onJumpToFrame) {
      onJumpToFrame(ann.shotIndex, ann.timeSec);
    }
  };

  const handleExportManifest = (format: 'md' | 'json') => {
    try {
      audioEngine.playShutterClick();
    } catch {}

    let content = '';
    let fileName = '';
    let mimeType = '';

    if (format === 'json') {
      content = reviewStore.exportManifestJson();
      fileName = `review_manifest_${Date.now()}.json`;
      mimeType = 'application/json';
    } else {
      content = reviewStore.exportManifestMarkdown();
      fileName = `review_manifest_${Date.now()}.md`;
      mimeType = 'text/markdown';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const tools: { id: MarkupTool; label: string; icon: any; en: string; bn: string }[] = [
    { id: 'pen', label: 'DRAW PEN', icon: Edit3, en: 'Draw freehand notes directly on stage monitor.', bn: 'স্টেজের ওপর ফ্রিহ্যান্ড মার্ক বা দাগ দিতে DRAW PEN চাপুন।' },
    { id: 'arrow', label: 'ARROW', icon: ArrowRight, en: 'Point directional review arrows at any frame detail.', bn: 'যেকোনো অংশ দেখাতে তীর চিহ্ন (Arrow) আঁকুন।' },
    { id: 'box', label: 'BOX MARK', icon: Square, en: 'Draw bounding boxes around elements needing edits.', bn: 'নির্দিষ্ট অংশ বক্স দিয়ে হাইলাইট করতে BOX MARK চাপুন।' },
    { id: 'text', label: 'TEXT PIN', icon: Flag, en: 'Drop text flag comments pinned to current frame.', bn: 'ফ্রেমের ওপর টেক্সট নোট পিন করতে TEXT PIN ব্যবহার করুন।' }
  ];

  const colors: { code: MarkupColor; name: string }[] = [
    { code: '#F5A623', name: 'AMBER' },
    { code: '#00F0FF', name: 'CYAN' },
    { code: '#FF3344', name: 'RED' }
  ];

  return (
    <div className="space-y-4">
      <CinemaBadgeHeader
        icon={<MessageSquare className="w-4 h-4" strokeWidth={2.2} />}
        label="REVIEW MARKUP"
        accent="amber"
        rightSlot={
          <span className="text-[10px] font-black text-amber-400 uppercase">{activeTool}</span>
        }
      />

      {/* Markup Tools */}
      <div className="grid grid-cols-2 gap-1.5">
        {tools.map((t) => {
          const isSelected = activeTool === t.id;
          return (
            <CinemaToolHUD
              key={t.id}
              title={`MARKUP: ${t.label}`}
              en={t.en}
              bn={t.bn}
              accent="amber"
              blockWrapper
            >
              <button
                type="button"
                onClick={() => handleSelectTool(t.id)}
                data-active={isSelected ? 'true' : 'false'}
                className="cinema-tile cinema-tile-amber w-full min-h-[48px] px-2.5 py-2 rounded-lg flex items-center justify-center gap-1.5 font-black tracking-wider text-[10px] sm:text-[11px] uppercase cursor-pointer"
              >
                <t.icon className="w-4 h-4 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                <span>{t.label}</span>
              </button>
            </CinemaToolHUD>
          );
        })}
      </div>

      {/* Color Palette */}
      <div className="grid grid-cols-3 gap-1.5">
        {colors.map((c) => {
          const isSelected = activeColor === c.code;
          const accent = c.code === '#00F0FF' ? 'cyan' : c.code === '#FF3344' ? 'crimson' : 'amber';
          return (
            <CinemaToolHUD
              key={c.code}
              title={`INK COLOR: ${c.name}`}
              en={`Set markup ink brush color to ${c.name}.`}
              bn={`মার্কআপ আঁকার রঙ ${c.name} করতে চাপুন।`}
              accent={accent}
              blockWrapper
            >
              <button
                type="button"
                onClick={() => handleSelectColor(c.code)}
                data-active={isSelected ? 'true' : 'false'}
                className={`cinema-tile cinema-tile-${accent} w-full min-h-[44px] px-2 rounded-md flex items-center justify-center gap-1.5 font-black tracking-wider text-[10px] uppercase cursor-pointer`}
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.code }} />
                <span>{c.name}</span>
              </button>
            </CinemaToolHUD>
          );
        })}
      </div>

      {/* Frame Pin List */}
      <div className="space-y-2">
        <CinemaBadgeHeader
          icon={<Clock className="w-3.5 h-3.5" strokeWidth={2.2} />}
          label={`PINS (${annotations.length})`}
          accent="cyan"
          rightSlot={
            <span className="text-[10px] font-black text-amber-400">
              {annotations.filter((a) => !a.resolved).length} OPEN
            </span>
          }
        />

        {annotations.length === 0 ? (
          <div className="p-3 bg-[#111215] border border-[#26282E] rounded-md text-center text-[10px] font-black tracking-wider uppercase text-zinc-500">
            NO PINS YET
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-1">
            {annotations.map((ann) => (
              <div
                key={ann.id}
                onClick={() => handleJumpToPin(ann)}
                className={`p-2.5 rounded-md border transition-all cursor-pointer text-[11px] font-mono-tech ${
                  ann.resolved
                    ? 'bg-[#0f1015]/60 border-white/5 opacity-70'
                    : 'bg-[#111215] border-[#26282E] hover:border-[#F59E0B]/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ann.color }} />
                    <strong className="text-white">
                      SH{String(ann.shotIndex + 1).padStart(3, '0')} · F{String(ann.frameNumber).padStart(3, '0')}
                    </strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CinemaToolHUD
                      title={ann.resolved ? 'REOPEN MARKUP PIN' : 'RESOLVE MARKUP PIN'}
                      en="Toggle resolved approval status on this review pin."
                      bn="এই রিভিউ নোটটির কাজ সম্পন্ন হলে DONE চাপুন।"
                      accent="emerald"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          reviewStore.toggleResolved(ann.id);
                        }}
                        data-active={ann.resolved ? 'true' : 'false'}
                        className="cinema-tile cinema-tile-emerald px-2 py-0.5 rounded text-[9px] font-black uppercase cursor-pointer"
                      >
                        {ann.resolved ? 'DONE' : 'RESOLVE'}
                      </button>
                    </CinemaToolHUD>
                    <CinemaToolHUD
                      title="DELETE MARKUP PIN"
                      en="Remove this markup annotation from the timeline."
                      bn="এই রিভিউ নোটটি মুছে ফেলতে ট্র্যাশ আইকনে চাপুন।"
                      accent="crimson"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          reviewStore.deleteAnnotation(ann.id);
                        }}
                        className="cinema-tile cinema-tile-crimson p-1 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                      </button>
                    </CinemaToolHUD>
                  </div>
                </div>
                {ann.text && (
                  <p className="text-zinc-300 text-[10.5px] line-clamp-2">&quot;{ann.text}&quot;</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Actions */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <CinemaToolHUD
          title="EXPORT MARKDOWN MANIFEST"
          en="Download all review pin timestamps and notes as Markdown (.MD)."
          bn="সব রিভিউ নোট ও টাইমকোড Markdown (.MD) ফাইল হিসেবে ডাউনলোড করুন।"
          accent="amber"
          blockWrapper
        >
          <button
            type="button"
            onClick={() => handleExportManifest('md')}
            className="cinema-tile cinema-tile-amber w-full min-h-[44px] py-2 px-3 font-black text-[10px] sm:text-[11px] uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
            <span>EXPORT .MD</span>
          </button>
        </CinemaToolHUD>

        <CinemaToolHUD
          title="EXPORT JSON MANIFEST"
          en="Download structured JSON review manifest for pipeline tools."
          bn="স্ট্রাকচার্ড JSON ম্যানিফেস্ট ফাইল ডাউনলোড করুন।"
          accent="cyan"
          blockWrapper
        >
          <button
            type="button"
            onClick={() => handleExportManifest('json')}
            className="cinema-tile cinema-tile-cyan w-full min-h-[44px] py-2 px-3 font-black text-[10px] sm:text-[11px] uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileCode className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
            <span>EXPORT .JSON</span>
          </button>
        </CinemaToolHUD>
      </div>

      {copiedNotification && (
        <div className="text-[10px] font-black uppercase text-emerald-400 text-center">
          MANIFEST EXPORTED
        </div>
      )}
    </div>
  );
};
