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
import { CinemaToolHUD, CinemaBadgeHeader } from '../../components/ui/CinemaToolHUD';

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
    <div className="space-y-4">
      <div className="space-y-2.5">
        <CinemaBadgeHeader
          icon={<Clapperboard className="w-4 h-4" strokeWidth={2.2} />}
          label="CALL SHEET"
          accent="amber"
          rightSlot={<span className="text-[10px] font-black text-amber-400">DAY 01</span>}
        />

        {/* Call Time & Weather Badges */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono-tech">
          <div className="bg-[#111215] border border-[#26282E] px-2.5 py-2 rounded-md flex items-center justify-between">
            <span className="text-zinc-400 font-black flex items-center gap-1 uppercase">
              <Clock className="w-3.5 h-3.5 text-[#F59E0B]" /> CALL
            </span>
            <input
              type="text"
              value={callTime}
              onChange={(e) => setCallTime(e.target.value)}
              className="bg-transparent text-[#F59E0B] font-black text-right w-20 focus:outline-none"
            />
          </div>

          <div className="bg-[#111215] border border-[#26282E] px-2.5 py-2 rounded-md flex items-center justify-between">
            <span className="text-zinc-400 font-black flex items-center gap-1 uppercase">
              <Sun className="w-3.5 h-3.5 text-cyan-400" /> SKY
            </span>
            <span className="text-cyan-300 font-black">28°C CLEAR</span>
          </div>
        </div>
      </div>

      {/* Lighting Blocks */}
      <div className="space-y-2">
        <CinemaBadgeHeader
          icon={<Layers className="w-3.5 h-3.5" strokeWidth={2.2} />}
          label="SHOOT BLOCKS"
          accent="amber"
          rightSlot={<span className="text-[10px] font-black text-zinc-400">100 SHOTS</span>}
        />

        <div className="grid grid-cols-3 gap-1.5">
          {lightingBlocks.map((block) => {
            const Icon = block.icon;
            const isSelected = selectedBlock === block.id;
            return (
              <CinemaToolHUD
                key={block.id}
                title={`${block.name} · ${block.range}`}
                en={`${block.setup} — ${block.lighting}`}
                bn={`${block.range}-এর লাইটিং প্ল্যান দেখতে এবং জাম্প করতে ক্লিক করুন।`}
                accent={block.id === 'B' ? 'cyan' : block.id === 'C' ? 'crimson' : 'amber'}
                blockWrapper
              >
                <button
                  type="button"
                  onClick={() => setSelectedBlock(block.id)}
                  data-active={isSelected ? 'true' : 'false'}
                  className={`cinema-tile ${block.id === 'B' ? 'cinema-tile-cyan' : block.id === 'C' ? 'cinema-tile-crimson' : 'cinema-tile-amber'} w-full min-h-[56px] p-2 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer`}
                >
                  <Icon className="w-5 h-5 cinema-tile-icon" strokeWidth={2.2} />
                  <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">
                    BLOCK {block.id}
                  </span>
                </button>
              </CinemaToolHUD>
            );
          })}
        </div>

        {(() => {
          const activeBlock = lightingBlocks.find((b) => b.id === selectedBlock);
          if (!activeBlock) return null;
          return (
            <div className="p-2.5 rounded-md bg-[#111215] border border-[#26282E] flex items-center justify-between gap-2">
              <span className="text-[10px] font-black tracking-wider uppercase text-zinc-300 truncate">
                {activeBlock.range}
              </span>
              <div className="flex gap-1.5 shrink-0">
                <CinemaToolHUD
                  title={`JUMP START #${String(activeBlock.startIndex + 1).padStart(3, '0')}`}
                  en={`Move playhead to the start of Block ${activeBlock.id}.`}
                  bn={`ব্লক ${activeBlock.id}-এর প্রথম শটে জাম্প করুন।`}
                  accent="amber"
                >
                  <button
                    type="button"
                    onClick={() => onSelectFrame?.(activeBlock.startIndex)}
                    className="cinema-tile cinema-tile-amber px-2.5 min-h-[36px] rounded text-[10px] font-black uppercase cursor-pointer"
                  >
                    START #{String(activeBlock.startIndex + 1).padStart(2, '0')}
                  </button>
                </CinemaToolHUD>
                <CinemaToolHUD
                  title={`JUMP END #${String(activeBlock.endIndex + 1).padStart(3, '0')}`}
                  en={`Move playhead to the final shot of Block ${activeBlock.id}.`}
                  bn={`ব্লক ${activeBlock.id}-এর শেষ শটে জাম্প করুন।`}
                  accent="cyan"
                >
                  <button
                    type="button"
                    onClick={() => onSelectFrame?.(activeBlock.endIndex)}
                    className="cinema-tile cinema-tile-cyan px-2.5 min-h-[36px] rounded text-[10px] font-black uppercase cursor-pointer"
                  >
                    END #{String(activeBlock.endIndex + 1).padStart(2, '0')}
                  </button>
                </CinemaToolHUD>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Gear Tracker */}
      <div className="space-y-2">
        <CinemaBadgeHeader
          icon={<Camera className="w-3.5 h-3.5" strokeWidth={2.2} />}
          label="GEAR RIGS"
          accent="emerald"
          rightSlot={
            <span className="text-[10px] font-black text-emerald-400">
              {Object.values(gearChecklist).filter(Boolean).length}/{Object.keys(gearChecklist).length}
            </span>
          }
        />

        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(gearChecklist).map(([item, isChecked]) => {
            const shortLabel = item.split(' ').slice(0, 2).join(' ').toUpperCase();
            return (
              <CinemaToolHUD
                key={item}
                title={`GEAR: ${item.toUpperCase()}`}
                en={`Toggle readiness status for ${item}.`}
                bn={`${item} সেটআপ রেডি হয়েছে কিনা মার্ক করতে ট্যাপ করুন।`}
                accent="emerald"
                blockWrapper
              >
                <button
                  type="button"
                  onClick={() => toggleGear(item)}
                  data-active={isChecked ? 'true' : 'false'}
                  className="cinema-tile cinema-tile-emerald w-full min-h-[44px] px-2.5 py-2 rounded-md flex items-center gap-1.5 font-black tracking-wider text-[10px] uppercase cursor-pointer"
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                  ) : (
                    <Square className="w-4 h-4 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                  )}
                  <span className="truncate">{shortLabel}</span>
                </button>
              </CinemaToolHUD>
            );
          })}
        </div>
      </div>

      {/* Export Official Call Sheet */}
      <div className="pt-1">
        <CinemaToolHUD
          title="EXPORT OFFICIAL CALL SHEET"
          en="Open formatted A4 DGA-standard printable production call sheet."
          bn="প্রিন্টযোগ্য অফিশিয়াল শুটিং কল শিট (PDF) ওপেন করতে চাপুন।"
          accent="amber"
          blockWrapper
        >
          <button
            type="button"
            onClick={handleExportCallSheetPdf}
            className="cinema-tile cinema-tile-amber w-full min-h-[48px] py-3 px-4 font-black text-[11px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-5 h-5 cinema-tile-icon" strokeWidth={2.2} />
            <span>CALL SHEET PDF</span>
          </button>
        </CinemaToolHUD>
      </div>
    </div>
  );
};
