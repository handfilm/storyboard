/**
 * @file /src/features/production/ProductionSlidePanel.tsx
 * @description Module 10: PRODUCTION (Interactive Shoot Planner & Call Sheet)
 * Features:
 * - Tactical Header: [ DAY BLOCK 01 // PRINCIPAL PHOTOGRAPHY ] with call time & weather badges
 * - Scene & Shot Breakdown Matrix: 100 shots grouped into 3-Hour Lighting Setups (Block A, B, C)
 * - Dynamic Talent & Gear Tracker with interactive toggle pills
 * - 1-Click Action: [ 🖨 EXPORT OFFICIAL CALL SHEET (PDF) ]
 */

import React, { useState } from 'react';
import { 
  Clapperboard, 
  Clock, 
  Sun, 
  CloudSun, 
  Moon, 
  Printer, 
  CheckSquare, 
  Square, 
  Camera, 
  Layers, 
  Sparkles, 
  ChevronDown, 
  ChevronRight,
  MapPin,
  Users,
  ShieldAlert
} from 'lucide-react';
import { useStudioStore } from '../../core/store';
import { audioEngine } from '../../utils/audioEngine';

interface ProductionSlidePanelProps {
  onSelectFrame?: (index: number) => void;
  currentIndex?: number;
}

export const ProductionSlidePanel: React.FC<ProductionSlidePanelProps> = ({
  onSelectFrame,
  currentIndex = 0
}) => {
  const { project } = useStudioStore();

  // Call sheet state
  const [callTime, setCallTime] = useState('06:30 AM');
  const [selectedBlock, setSelectedBlock] = useState<'A' | 'B' | 'C' | 'ALL'>('A');

  // Gear & Crew Checklist pills
  const [gearChecklist, setGearChecklist] = useState<Record<string, boolean>>({
    'Arri Alexa LF Rigged': true,
    'Master Anamorphic Primes': true,
    'Sound Cart Sync (32-Bit Float)': false,
    'Smoke/Atmosphere Haze Ready': false,
    'Astera Titan Tubes (8-Bank)': true,
    'Teradek Bolt 4K Zero-Latency': true,
    'Dana Dolly 6ft Slider': false
  });

  const toggleGear = (item: string) => {
    setGearChecklist(prev => {
      const next = !prev[item];
      try {
        audioEngine.playShutterClick();
      } catch {}
      return { ...prev, [item]: next };
    });
  };

  const lightingBlocks = [
    {
      id: 'A' as const,
      name: 'BLOCK A (08:00 - 11:00)',
      range: 'Shots 001–025',
      startIndex: 0,
      endIndex: 24,
      setup: 'Morning Interior // Anamorphic 35mm',
      lighting: 'Tungsten 3200K window diffusion with negative fill',
      status: 'IN PROGRESS',
      icon: CloudSun,
      accent: '#F5A623'
    },
    {
      id: 'B' as const,
      name: 'BLOCK B (12:00 - 15:00)',
      range: 'Shots 026–060',
      startIndex: 25,
      endIndex: 59,
      setup: 'High Contrast Sunlight // Golden Flare',
      lighting: 'Direct 5600K key + 12x12 unbleached muslin bounce',
      status: 'SCHEDULED',
      icon: Sun,
      accent: '#00F0FF'
    },
    {
      id: 'C' as const,
      name: 'BLOCK C (16:00 - 19:00)',
      range: 'Shots 061–100',
      startIndex: 60,
      endIndex: 99,
      setup: 'Blue Hour // Neon Shadows',
      lighting: 'Cyan/Amber Astera tubes + wet asphalt ground reflections',
      status: 'SCHEDULED',
      icon: Moon,
      accent: '#FF3344'
    }
  ];

  // Printable Call Sheet Export
  const handleExportCallSheetPdf = () => {
    try {
      audioEngine.playShutterClick();
    } catch {}

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to view printable call sheet.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HOLLYWOOD CALL SHEET // ${project.title || 'HANDFILM PRODUCTION'}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: 'Courier New', Courier, monospace;
            background: #ffffff;
            color: #000000;
            margin: 0;
            padding: 20px;
            font-size: 11pt;
            line-height: 1.4;
          }
          .header-box {
            border: 2px solid #000;
            padding: 12px;
            text-align: center;
            margin-bottom: 16px;
          }
          .title { font-size: 18pt; font-weight: bold; letter-spacing: 2px; }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            border-top: 1px solid #000;
            margin-top: 10px;
            padding-top: 8px;
            font-size: 10pt;
          }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 10pt; }
          th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
          th { background: #eee; text-transform: uppercase; }
          .badge { display: inline-block; padding: 2px 6px; border: 1px solid #000; font-weight: bold; }
          .gear-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 10px; }
          .footer { margin-top: 24px; font-size: 9pt; border-top: 1px dashed #000; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="title">OFFICIAL CALL SHEET // DAY BLOCK 01</div>
          <div style="font-weight: bold; margin-top: 4px;">PROJECT: ${project.title || 'HANDFILM MASTER ANTHOLOGY 100'}</div>
          <div class="meta-grid">
            <div>DATE: ${new Date().toLocaleDateString()}</div>
            <div>CREW CALL: ${callTime}</div>
            <div>SHOOT DAY: 01 OF 04</div>
          </div>
          <div class="meta-grid">
            <div>WEATHER: 28°C CLEAR (84% HUMIDITY)</div>
            <div>GOLDEN HOUR: 17:15</div>
            <div>SUNSET: 17:42</div>
          </div>
          <div style="margin-top: 8px; font-size: 9.5pt;">
            LOCATION: Dhaka Old City Soundstage • Cyber Alley Unit 4 // EMERGENCY HOSPITAL: Dhaka Medical College Hospital (999)
          </div>
        </div>

        <h3 style="margin-bottom: 4px; text-transform: uppercase;">3-Hour Lighting & Shot Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Block</th>
              <th>Time Window</th>
              <th>Shot Range</th>
              <th>Optical Setup</th>
              <th>Lighting Design</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>BLOCK A</b></td>
              <td>08:00 - 11:00</td>
              <td>Shots 001–025</td>
              <td>Morning Interior / Anamorphic 35mm</td>
              <td>Tungsten 3200K window diffusion with negative fill</td>
            </tr>
            <tr>
              <td><b>BLOCK B</b></td>
              <td>12:00 - 15:00</td>
              <td>Shots 026–060</td>
              <td>High Contrast Sunlight / Golden Flare</td>
              <td>Direct 5600K key + 12x12 unbleached muslin bounce</td>
            </tr>
            <tr>
              <td><b>BLOCK C</b></td>
              <td>16:00 - 19:00</td>
              <td>Shots 061–100</td>
              <td>Blue Hour / Neon Shadows</td>
              <td>Cyan/Amber Astera tubes + wet asphalt reflections</td>
            </tr>
          </tbody>
        </table>

        <h3 style="margin-top: 20px; margin-bottom: 4px; text-transform: uppercase;">Talent & Camera Rig Status</h3>
        <div class="gear-list">
          ${Object.entries(gearChecklist).map(([item, checked]) => `
            <div>[${checked ? 'X' : ' '}] ${item}</div>
          `).join('')}
        </div>

        <div class="footer">
          NOTICE: All crew members must wear proper safety footwear and eye protection during pyro/haze setups. 
          Director: Rakib Himon • Generated via HANDFILM Creative Suite.
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* 1. Tactical Header */}
      <div className="bg-[#12131a] border border-[#F5A623]/40 rounded p-4 relative overflow-hidden shadow-[0_0_20px_rgba(245,166,35,0.15)]">
        <div className="absolute top-0 right-0 w-28 h-28 bg-[#F5A623]/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-2 text-[#F5A623] mb-1">
          <Clapperboard className="w-4 h-4 animate-pulse" />
          <span className="font-mono-tech text-[11px] font-bold tracking-widest uppercase">
            [ DAY BLOCK 01 // PRINCIPAL PHOTOGRAPHY ]
          </span>
        </div>
        
        <p className="text-xs text-zinc-400 font-mono-tech">
          Hollywood-format production scheduler & 100-shot day matrix
        </p>

        {/* Call Time & Weather Badges */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono-tech">
          <div className="bg-black/60 border border-[#F5A623]/30 px-2.5 py-1.5 rounded flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#F5A623]" /> CALL TIME:
            </span>
            <input 
              type="text" 
              value={callTime}
              onChange={(e) => setCallTime(e.target.value)}
              className="bg-transparent text-[#F5A623] font-bold text-right w-20 focus:outline-none focus:border-b border-[#F5A623]"
            />
          </div>

          <div className="bg-black/60 border border-cyan-500/30 px-2.5 py-1.5 rounded flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-1">
              <Sun className="w-3 h-3 text-cyan-400" /> WEATHER:
            </span>
            <span className="text-cyan-300 font-bold truncate">28°C CLEAR • 84% HUM</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-[9px] font-mono-tech text-zinc-400 px-1">
          <span>GOLDEN HOUR: <strong className="text-amber-300">17:15</strong></span>
          <span>SUNSET: <strong className="text-orange-400">17:42</strong></span>
          <span>STAGE: <strong className="text-white">CYBER ALLEY B</strong></span>
        </div>
      </div>

      {/* 2. Scene & Shot Breakdown Matrix (3-Hour Lighting Setups) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#F5A623]" />
            <h4 className="text-xs font-mono-tech font-bold uppercase tracking-wider text-white">
              3-Hour Lighting Setup Matrix (100 Shots)
            </h4>
          </div>
          <span className="text-[10px] font-mono-tech text-zinc-400">
            TOTAL: 100 SHOTS
          </span>
        </div>

        <div className="space-y-2.5">
          {lightingBlocks.map((block) => {
            const Icon = block.icon;
            const isSelected = selectedBlock === block.id;

            return (
              <div 
                key={block.id}
                onClick={() => setSelectedBlock(block.id)}
                className={`p-3 rounded border transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-[#181a24] border-[#F5A623] shadow-[0_0_15px_rgba(245,166,35,0.2)]' 
                    : 'bg-[#101117] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center text-black font-bold text-[11px]"
                      style={{ backgroundColor: block.accent }}
                    >
                      {block.id}
                    </div>
                    <div>
                      <div className="font-mono-tech text-[11px] font-bold text-white">
                        {block.name}
                      </div>
                      <div className="text-[9.5px] font-mono-tech text-zinc-400">
                        {block.range} • {block.setup}
                      </div>
                    </div>
                  </div>

                  <span 
                    className="text-[9px] font-mono-tech px-2 py-0.5 rounded font-bold uppercase"
                    style={{ 
                      backgroundColor: `${block.accent}20`,
                      color: block.accent,
                      border: `1px solid ${block.accent}50`
                    }}
                  >
                    {block.status}
                  </span>
                </div>

                {isSelected && (
                  <div className="mt-3 pt-2.5 border-t border-white/10 space-y-2 text-[10px] font-mono-tech animate-in fade-in duration-150">
                    <div className="text-zinc-300">
                      <strong className="text-zinc-500">LIGHTING PLAN:</strong> {block.lighting}
                    </div>
                    
                    {/* Quick Jump Buttons for shots in this block */}
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Quick Jump Playhead:</span>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectFrame) onSelectFrame(block.startIndex);
                          }}
                          className="px-2 py-0.5 rounded bg-white/10 hover:bg-[#F5A623] hover:text-black transition-colors"
                        >
                          Start #{String(block.startIndex + 1).padStart(3, '0')}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectFrame) onSelectFrame(block.endIndex);
                          }}
                          className="px-2 py-0.5 rounded bg-white/10 hover:bg-[#F5A623] hover:text-black transition-colors"
                        >
                          End #{String(block.endIndex + 1).padStart(3, '0')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Dynamic Talent & Gear Tracker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#F5A623]" />
            <h4 className="text-xs font-mono-tech font-bold uppercase tracking-wider text-white">
              Talent & Gear Tracker
            </h4>
          </div>
          <span className="text-[10px] font-mono-tech text-emerald-400">
            {Object.values(gearChecklist).filter(Boolean).length}/{Object.keys(gearChecklist).length} READY
          </span>
        </div>

        <div className="grid grid-cols-1 gap-1.5 font-mono-tech text-[11px]">
          {Object.entries(gearChecklist).map(([item, isChecked]) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleGear(item)}
              className={`w-full px-3 py-2 rounded text-left flex items-center justify-between transition-all cursor-pointer border ${
                isChecked
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-black/40 border-white/10 text-zinc-400 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {isChecked ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-500 shrink-0" />
                )}
                <span className="truncate">{item}</span>
              </div>
              <span className="text-[9px] uppercase font-bold tracking-wider shrink-0 ml-2">
                {isChecked ? '[✓] RIGGED' : '[ ] PENDING'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. 1-Click Action: Export Official Call Sheet */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleExportCallSheetPdf}
          className="w-full py-3 px-4 bg-gradient-to-r from-[#F5A623] to-[#e09612] hover:from-[#ffb43b] hover:to-[#f5a623] text-black font-mono-tech font-bold text-xs uppercase tracking-widest rounded shadow-[0_0_20px_rgba(245,166,35,0.35)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
        >
          <Printer className="w-4 h-4" />
          <span>[ 🖨 EXPORT OFFICIAL CALL SHEET (PDF) ]</span>
        </button>
        <p className="text-[9.5px] font-mono-tech text-zinc-500 text-center mt-2">
          Hollywood DGA standard printable day sheet formatted for A4/Letter
        </p>
      </div>
    </div>
  );
};
