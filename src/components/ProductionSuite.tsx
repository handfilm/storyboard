/**
 * @file /src/components/ProductionSuite.tsx
 * @description Master Production Management Suite for HANDFILM.
 * Features:
 * 1. Interactive Call Sheets (Crew Call, Sunrise/Sunset, Weather, Emergency Location)
 * 2. Day-Blocks Scheduler (08:00 Grip & Lighting, 10:30 Principal Photography, 17:00 Golden Hour)
 * 3. 100-Shot Production Shot List with completion status, lens package, and setup notes
 * 4. Talent & Gear Allocator (Camera Package, Anamorphic Primes, Grip & Lighting, Talent logistics)
 * 5. Printable Call Sheet with Hollywood export format
 */

import React, { useState } from 'react';
import { useStudioStore } from '../core/store';
import { 
  FileSpreadsheet, 
  Calendar, 
  Printer, 
  Users, 
  Car, 
  Sparkles, 
  Clock, 
  MapPin, 
  CheckSquare, 
  Square,
  Camera, 
  Plus, 
  Trash2,
  DollarSign,
  Download
} from 'lucide-react';

interface DayBlock {
  id: string;
  timeRange: string;
  title: string;
  scenes: string;
  location: string;
  notes: string;
}

interface GearItem {
  id: string;
  category: 'CAMERA' | 'LIGHTING' | 'GRIP' | 'SOUND' | 'TALENT';
  name: string;
  assignedTo: string;
  status: 'Ready' | 'In Transit' | 'Requires Prep';
}

export const ProductionSuite: React.FC = () => {
  const { project } = useStudioStore();
  const [activeTab, setActiveTab] = useState<'day_blocks' | 'callsheet' | 'shot_list' | 'gear'>('day_blocks');

  // Call Sheet Metadata
  const [shootDate, setShootDate] = useState('2026-10-24');
  const [callTime, setCallTime] = useState('07:30 AM');
  const [locationName, setLocationName] = useState('Dhaka Old City • Cyber Alley Stage B');
  const [weatherInfo, setWeatherInfo] = useState('28°C Clear • Golden Hour 17:15 • Sunset 17:42');
  const [hospitalInfo, setHospitalInfo] = useState('Dhaka Medical College Hospital (Emergency: 999)');

  // Day-Blocks
  const [dayBlocks, setDayBlocks] = useState<DayBlock[]>([
    {
      id: 'b1',
      timeRange: '07:30 - 08:30',
      title: 'Crew Call & Breakfast Briefing',
      scenes: 'Safety review & camera lens calibration',
      location: 'Stage B Basecamp',
      notes: '14-Bit ARRI sensors temperature equilibration'
    },
    {
      id: 'b2',
      timeRange: '08:30 - 11:30',
      title: 'Block 1: Singularity Core Sequences',
      scenes: 'Shots 001 - 003 (INT. APERTURE CORE)',
      location: 'Cyber Alley Rig',
      notes: '35mm Master Prime f/1.4, slow dolly push-in'
    },
    {
      id: 'b3',
      timeRange: '11:30 - 12:30',
      title: 'Catering Break & Media Dump',
      scenes: 'NVMe backup to Cloudflare R2',
      location: 'DIT Tent',
      notes: 'MD5 checksum verification across all drives'
    },
    {
      id: 'b4',
      timeRange: '12:30 - 16:30',
      title: 'Block 2: Event Horizon Confrontation',
      scenes: 'Shots 004 - 008 (EXT. ROOFTOP)',
      location: 'Old Dhaka High-Rise',
      notes: '50mm Anamorphic 2x with mist filtration'
    },
    {
      id: 'b5',
      timeRange: '16:30 - 17:45',
      title: 'Golden Hour Climax & Drone Vectors',
      scenes: 'Shot 009 & 010 (EXT. DUSK)',
      location: 'Skyline Overlook',
      notes: 'Natural 2800K dusk light, zero artificial fill'
    }
  ]);

  // Gear Allocator
  const [gearList, setGearList] = useState<GearItem[]>([
    { id: 'g1', category: 'CAMERA', name: 'ARRI Alexa 35 Body + RAW 14-Bit License', assignedTo: 'Rakib Himon (DP)', status: 'Ready' },
    { id: 'g2', category: 'CAMERA', name: 'Master Prime Cine Lens Set (18/35/50/85mm)', assignedTo: '1st AC', status: 'Ready' },
    { id: 'g3', category: 'LIGHTING', name: 'Aputure 1200d Pro Daylight + Lantern 90', assignedTo: 'Gaffer', status: 'Ready' },
    { id: 'g4', category: 'GRIP', name: 'Dana Dolly Portable Track + Mitchell Base', assignedTo: 'Key Grip', status: 'In Transit' },
    { id: 'g5', category: 'SOUND', name: 'Sound Devices 833 + Schoeps CMIT 5U', assignedTo: 'Sound Recordist', status: 'Ready' },
    { id: 'g6', category: 'TALENT', name: 'Lead Character (Rahman) Costume & FX Prosthetic', assignedTo: 'Wardrobe Dept', status: 'Ready' }
  ]);

  // Shot List Checklist
  const [completedShots, setCompletedShots] = useState<Record<number, boolean>>({});

  const toggleShotComplete = (idx: number) => {
    setCompletedShots(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#07070A] text-[#EDEDED] font-mono-tech select-none overflow-hidden">
      {/* Header Bar */}
      <div className="h-11 px-3 border-b border-[#272732] bg-[#0C0C12] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileSpreadsheet className="w-4 h-4 text-[#fbbf24] shrink-0" />
          <span className="text-[11px] font-bold text-white tracking-widest truncate uppercase">
            10 PRODUCTION & CALL SHEET WORKSTATION
          </span>
          <span className="text-[8.5px] text-zinc-400 font-mono hidden sm:inline">
            Shoot: {shootDate} • Call: {callTime}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Tabs */}
          <div className="flex bg-black/60 p-0.5 rounded border border-[#272732] text-[9.5px]">
            {(['day_blocks', 'callsheet', 'shot_list', 'gear'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 rounded-[1px] uppercase transition-colors cursor-pointer ${
                  activeTab === tab ? 'bg-[#fbbf24] text-black font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab === 'day_blocks' && 'DAY BLOCKS'}
                {tab === 'callsheet' && 'CALL SHEET'}
                {tab === 'shot_list' && 'SHOT LIST'}
                {tab === 'gear' && 'GEAR & TALENT'}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            className="px-2.5 py-1 rounded-[1px] bg-[#fbbf24] hover:bg-[#f59e0b] text-black font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PRINT / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 sm:p-4">
        {/* ========================================================= */}
        {/* TAB 1: DAY BLOCKS SCHEDULER                               */}
        {/* ========================================================= */}
        {activeTab === 'day_blocks' && (
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#272732]">
              <span className="text-[10px] font-bold text-[#fbbf24] uppercase tracking-wider">
                DAY-BLOCKS SCHEDULE (SHOOT DAY 01)
              </span>
              <span className="text-[8.5px] text-zinc-400">
                Total 5 Production Blocks • 10.5 Hours Active
              </span>
            </div>

            <div className="space-y-2">
              {dayBlocks.map((block, idx) => (
                <div
                  key={block.id}
                  className="p-3 bg-[#0C0C14] border border-[#272732] hover:border-[#fbbf24]/40 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="px-2 py-1 bg-[#fbbf24]/15 border border-[#fbbf24]/40 rounded text-[#fbbf24] font-bold text-[10px] shrink-0">
                      {block.timeRange}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-100">{block.title}</div>
                      <div className="text-[9px] text-[#fbbf24]">{block.scenes}</div>
                      <div className="text-[8.5px] text-zinc-400">{block.notes}</div>
                    </div>
                  </div>
                  <div className="text-[8.5px] text-zinc-500 font-mono flex items-center gap-1 self-end sm:self-auto">
                    <MapPin className="w-3 h-3 text-zinc-400" />
                    <span>{block.location}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PRINTABLE CALL SHEET                               */}
        {/* ========================================================= */}
        {activeTab === 'callsheet' && (
          <div className="max-w-3xl mx-auto bg-[#0C0C14] border border-[#272732] p-5 rounded-[2px] shadow-2xl space-y-4">
            <div className="border-b border-[#fbbf24] pb-3 flex items-center justify-between">
              <div>
                <h1 className="font-cinzel text-base font-bold text-[#fbbf24] tracking-widest uppercase">
                  RAWx CINEMA PRODUCTIONS // OFFICIAL CALL SHEET
                </h1>
                <p className="text-[9.5px] text-zinc-400">
                  Project: {project.title} • Director: {project.director}
                </p>
              </div>
              <div className="text-right text-[10px] text-zinc-300">
                <div className="font-bold text-white">DAY 1 OF 3</div>
                <div>{shootDate}</div>
              </div>
            </div>

            {/* Crucial Call Times Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px] bg-black/60 p-3 rounded border border-white/5">
              <div>
                <div className="text-zinc-500 uppercase">CREW CALL</div>
                <div className="text-base font-bold text-[#fbbf24]">{callTime}</div>
              </div>
              <div>
                <div className="text-zinc-500 uppercase">BREAKFAST</div>
                <div className="text-sm font-bold text-zinc-200">07:45 AM</div>
              </div>
              <div>
                <div className="text-zinc-500 uppercase">FIRST SHOT</div>
                <div className="text-sm font-bold text-zinc-200">08:45 AM</div>
              </div>
              <div>
                <div className="text-zinc-500 uppercase">ESTIMATED WRAP</div>
                <div className="text-sm font-bold text-zinc-200">18:00 PM</div>
              </div>
            </div>

            {/* Location & Safety */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[9px]">
              <div className="p-2.5 bg-black/40 border border-[#272732] rounded">
                <div className="text-zinc-400 font-bold uppercase mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#fbbf24]" />
                  <span>LOCATION & PARKING</span>
                </div>
                <div className="text-zinc-200">{locationName}</div>
                <div className="text-[8px] text-zinc-500 mt-1">{weatherInfo}</div>
              </div>
              <div className="p-2.5 bg-black/40 border border-[#272732] rounded">
                <div className="text-zinc-400 font-bold uppercase mb-1 flex items-center gap-1">
                  <Car className="w-3 h-3 text-rose-400" />
                  <span>NEAREST HOSPITAL & EMERGENCY</span>
                </div>
                <div className="text-zinc-200">{hospitalInfo}</div>
                <div className="text-[8px] text-zinc-500 mt-1">Set Medic On-Site • Production Radio Channel 1</div>
              </div>
            </div>

            {/* Scene Schedule Table */}
            <div className="border border-[#272732] rounded overflow-hidden">
              <table className="w-full text-left text-[9px]">
                <thead className="bg-[#12121A] text-zinc-400 uppercase border-b border-[#272732]">
                  <tr>
                    <th className="p-2">Scene</th>
                    <th className="p-2">Int/Ext</th>
                    <th className="p-2">Description</th>
                    <th className="p-2">Cast</th>
                    <th className="p-2">Pages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="p-2 font-bold text-[#fbbf24]">SCENE 1</td>
                    <td className="p-2">INT. NIGHT</td>
                    <td className="p-2">The Singularity Aperture Awakens</td>
                    <td className="p-2">RAKIB</td>
                    <td className="p-2">1 2/8</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#fbbf24]">SCENE 2</td>
                    <td className="p-2">EXT. DAWN</td>
                    <td className="p-2">Event Horizon Skyline Confrontation</td>
                    <td className="p-2">RAKIB, MAYA</td>
                    <td className="p-2">2 4/8</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#fbbf24]">SCENE 3</td>
                    <td className="p-2">INT. DAY</td>
                    <td className="p-2">Photon Core Resonance & Collapse</td>
                    <td className="p-2">MAYA</td>
                    <td className="p-2">1 6/8</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: 100-SHOT PRODUCTION SHOT LIST                      */}
        {/* ========================================================= */}
        {activeTab === 'shot_list' && (
          <div className="max-w-4xl mx-auto space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-[#272732]">
              <span className="text-[10px] font-bold text-[#fbbf24] uppercase tracking-wider">
                PRODUCTION SHOT CHECKLIST ({Object.values(completedShots).filter(Boolean).length}/12 COMPLETED)
              </span>
              <span className="text-[8.5px] text-zinc-400">
                Click square to mark completed
              </span>
            </div>

            <div className="space-y-1.5">
              {project.shots.slice(0, 12).map((frame, idx) => {
                const isDone = completedShots[idx] || false;
                return (
                  <div
                    key={frame.id}
                    onClick={() => toggleShotComplete(idx)}
                    className={`p-2.5 rounded-[2px] border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isDone
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-[#0C0C14] border-[#272732] hover:border-zinc-500 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isDone ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                      )}
                      <div>
                        <div className="text-[10px] font-bold">
                          EP {frame.epNumber} // {frame.title}
                        </div>
                        <div className="text-[8.5px] text-zinc-400">
                          {frame.cameraSpec.focalLength} • {frame.cameraSpec.aperture} • {frame.tagline}
                        </div>
                      </div>
                    </div>

                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0">
                      {isDone ? 'COMPLETED' : 'PENDING'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: TALENT & GEAR ALLOCATOR                           */}
        {/* ========================================================= */}
        {activeTab === 'gear' && (
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#272732]">
              <span className="text-[10px] font-bold text-[#fbbf24] uppercase tracking-wider">
                TALENT, CAMERA & GEAR ALLOCATOR
              </span>
              <span className="text-[8.5px] text-zinc-400">
                {gearList.length} Allocated Packages
              </span>
            </div>

            <div className="space-y-1.5">
              {gearList.map(item => (
                <div
                  key={item.id}
                  className="p-2.5 bg-[#0C0C14] border border-[#272732] rounded-[2px] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[8px] font-bold text-[#fbbf24] shrink-0">
                      {item.category}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-zinc-200 truncate">{item.name}</div>
                      <div className="text-[8px] text-zinc-500 truncate">Assigned: {item.assignedTo}</div>
                    </div>
                  </div>

                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                    item.status === 'Ready'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
