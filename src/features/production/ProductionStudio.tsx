/**
 * RAWx Studio — Production Management & Call Sheets
 * Public API: ProductionStudio component
 * Features Scene breakdown sheets (Cast, Props, Wardrobe, Vehicles, VFX),
 * multi-day shooting schedule, shot lists, budget calculator (BDT/USD/EUR/JPY), and print-ready call sheets.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../core/store';
import { 
  FileSpreadsheet, 
  Calendar, 
  DollarSign, 
  Printer, 
  Users, 
  Car, 
  Sparkles, 
  Clock, 
  MapPin, 
  CheckSquare 
} from 'lucide-react';

export const ProductionStudio: React.FC = () => {
  const {
    project,
    activeShotIndex
  } = useStudioStore();

  const [activeTab, setActiveTab] = useState<'schedule' | 'breakdown' | 'budget' | 'callsheet'>('schedule');
  const [currency, setCurrency] = useState<'BDT' | 'USD' | 'EUR' | 'JPY'>('BDT');

  const currencySymbols = { BDT: '৳', USD: '$', EUR: '€', JPY: '¥' };
  const currencyRate = { BDT: 120, USD: 1, EUR: 0.92, JPY: 155 };

  // Sample Breakdown Data
  const breakdownItems = [
    { category: 'CAST', item: 'RAKIB (HERO)', shots: '#001, #002, #005', status: 'Confirmed' },
    { category: 'CAST', item: 'CYBER SHADOW', shots: '#003, #004', status: 'Auditioning' },
    { category: 'PROPS', item: 'Anamorphic Hologram Emitter', shots: '#001, #006', status: 'Fabricated' },
    { category: 'WARDROBE', item: 'Distressed Cyber Trenchcoat', shots: '#001-#010', status: 'Ready' },
    { category: 'VEHICLES', item: '1984 Vintage Electric Sedan', shots: '#004, #008', status: 'Permit Pending' },
    { category: 'VFX', item: 'Singularity Event Horizon Glow', shots: '#003', status: 'In Render' }
  ];

  // Budget Items
  const budgetItems = [
    { desc: 'ARRI Alexa Mini LF + Anamorphic Primes Package', costUSD: 4500 },
    { desc: 'Studio Stage & Dhaka Cyber Alley Set Build', costUSD: 6000 },
    { desc: 'Principal Cast & Stunt Choreography', costUSD: 8500 },
    { desc: 'Lighting & Grip Package (Aputure 1200d x 4)', costUSD: 2800 },
    { desc: 'Sound Designer & Binaural Mix', costUSD: 2000 },
    { desc: 'Catering & Crew Logistics (5 Days)', costUSD: 3200 }
  ];

  const totalBudgetUSD = budgetItems.reduce((acc, item) => acc + item.costUSD, 0);

  const handlePrintCallSheet = () => {
    window.print();
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050505] text-[#EDEDED] font-mono select-none overflow-hidden">
      {/* Production Header */}
      <div className="h-12 border-b border-[#D4AF37]/20 bg-[#0B0B0B] px-4 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[#D4AF37]" />
          <span className="font-bold text-[#FFE066]">HOLLYWOOD PRODUCTION STUDIO</span>
          <span className="text-[#8A8A8A]">| {project.title}</span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[#121212] p-1 rounded border border-[#D4AF37]/20">
          {(['schedule', 'breakdown', 'budget', 'callsheet'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded text-xs capitalize transition-colors ${
                activeTab === tab ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A] hover:text-[#EDEDED]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <button
          onClick={handlePrintCallSheet}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121212] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/30 rounded text-xs transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>PRINT / PDF</span>
        </button>
      </div>

      {/* Main Production Workspace */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* TAB 1: SHOOTING SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="flex flex-col gap-4 max-w-5xl mx-auto">
            <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2">
              <h2 className="font-bold text-[#FFE066] text-sm">SHOOTING SCHEDULE // 3-DAY BLOCK</h2>
              <span className="text-xs text-[#8A8A8A]">TOTAL: 100 SHOTS ESTIMATED</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { day: 'DAY 01', date: 'FRI, OCT 24', loc: 'DHAKA NODE 01 (STUDIO STAGE A)', shots: 'SHOTS 001 - 035', pages: '3.5 PAGES' },
                { day: 'DAY 02', date: 'SAT, OCT 25', loc: 'PURANA PALTAN CYBER ROOFTOP', shots: 'SHOTS 036 - 070', pages: '4.2 PAGES' },
                { day: 'DAY 03', date: 'SUN, OCT 26', loc: 'UNDERGROUND TRANSIT TUNNEL', shots: 'SHOTS 071 - 100', pages: '2.8 PAGES' }
              ].map(block => (
                <div key={block.day} className="p-4 bg-[#0B0B0B] border border-[#D4AF37]/20 rounded-lg flex flex-col gap-3">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-[#FFE066]">{block.day}</span>
                    <span className="text-[10px] text-[#8A8A8A]">{block.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#EDEDED]">
                    <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <span>{block.loc}</span>
                  </div>
                  <div className="p-2 bg-[#121212] rounded border border-[#D4AF37]/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-[#00FFCC]">{block.shots}</span>
                    <span className="text-[#8A8A8A]">{block.pages}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: SCENE BREAKDOWN SHEETS */}
        {activeTab === 'breakdown' && (
          <div className="flex flex-col gap-4 max-w-5xl mx-auto">
            <h2 className="font-bold text-[#FFE066] text-sm border-b border-[#D4AF37]/20 pb-2">
              SCENE & SHOT BREAKDOWN SHEETS
            </h2>
            <div className="border border-[#D4AF37]/20 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#121212] text-[#FFE066] border-b border-[#D4AF37]/20">
                  <tr>
                    <th className="p-3">CATEGORY</th>
                    <th className="p-3">ELEMENT DESCRIPTION</th>
                    <th className="p-3">SHOT NUMBERS</th>
                    <th className="p-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10">
                  {breakdownItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#121212]/50">
                      <td className="p-3 font-bold text-[#D4AF37]">{item.category}</td>
                      <td className="p-3 text-[#EDEDED]">{item.item}</td>
                      <td className="p-3 font-mono text-[#00FFCC]">{item.shots}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-[#121212] border border-[#D4AF37]/30 rounded text-[10px] text-[#FFE066]">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: BUDGET ESTIMATOR */}
        {activeTab === 'budget' && (
          <div className="flex flex-col gap-4 max-w-5xl mx-auto">
            <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2">
              <h2 className="font-bold text-[#FFE066] text-sm">PRODUCTION BUDGET ESTIMATOR</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8A8A8A]">CURRENCY:</span>
                {(['BDT', 'USD', 'EUR', 'JPY'] as const).map(cur => (
                  <button
                    key={cur}
                    onClick={() => setCurrency(cur)}
                    className={`px-2 py-0.5 rounded text-xs ${currency === cur ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A]'}`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-[#D4AF37]/20 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#121212] text-[#FFE066] border-b border-[#D4AF37]/20">
                  <tr>
                    <th className="p-3">LINE ITEM DESCRIPTION</th>
                    <th className="p-3 text-right">COST ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10">
                  {budgetItems.map((item, idx) => {
                    const converted = Math.round(item.costUSD * (currencyRate[currency] / currencyRate.USD));
                    return (
                      <tr key={idx} className="hover:bg-[#121212]/50">
                        <td className="p-3 text-[#EDEDED]">{item.desc}</td>
                        <td className="p-3 text-right font-mono text-[#FFE066] font-bold">
                          {currencySymbols[currency]} {converted.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#121212] font-bold text-sm border-t border-[#D4AF37]/30">
                  <tr>
                    <td className="p-3 text-[#FFE066]">ESTIMATED TOTAL PRODUCTION BUDGET</td>
                    <td className="p-3 text-right font-mono text-[#FFE066]">
                      {currencySymbols[currency]} {Math.round(totalBudgetUSD * (currencyRate[currency] / currencyRate.USD)).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CALL SHEET */}
        {activeTab === 'callsheet' && (
          <div className="p-6 bg-white text-black font-sans max-w-4xl mx-auto rounded-lg shadow-2xl print:m-0 print:p-0 print:shadow-none">
            {/* Call Sheet Header */}
            <div className="border-b-4 border-black pb-4 mb-4 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tight uppercase">DAILY CALL SHEET — DAY 01</h1>
                <p className="text-sm font-semibold text-gray-700">PROJECT: RAWx Storyboard Anthology // DIRECTOR: Rakib Himon</p>
                <p className="text-xs text-gray-500">DATE: Friday, October 24 // WEATHER: 26°C Clear Night</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold bg-black text-white px-3 py-1">CREW CALL: 06:30 AM</div>
                <div className="text-xs text-gray-600 mt-1">SHOOTING CALL: 07:15 AM</div>
              </div>
            </div>

            {/* Location & Hospital */}
            <div className="grid grid-cols-2 gap-4 border-b border-black pb-4 mb-4 text-xs">
              <div>
                <span className="font-bold uppercase">LOCATION ADDRESS:</span>
                <p>RAWx Cine Studio — Stage 01, Tejgaon Industrial Area, Dhaka 1208</p>
                <p className="text-gray-600">PARKING: Gate 03 Crew Lot</p>
              </div>
              <div>
                <span className="font-bold uppercase text-red-700">NEAREST EMERGENCY HOSPITAL:</span>
                <p>Square Hospital Emergency Dept, Panthapath, Dhaka</p>
                <p className="text-gray-600">HOTLINE: 10616 // 02-8144400</p>
              </div>
            </div>

            {/* Cast Schedule */}
            <h3 className="font-bold text-sm uppercase mb-2">Principal Cast Call Times</h3>
            <table className="w-full text-left text-xs border border-black mb-4">
              <thead className="bg-gray-100 border-b border-black">
                <tr>
                  <th className="p-2">CAST ID</th>
                  <th className="p-2">CHARACTER</th>
                  <th className="p-2">ACTOR</th>
                  <th className="p-2">PICKUP</th>
                  <th className="p-2">H/MU</th>
                  <th className="p-2">ON SET</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="p-2 font-bold">#01</td>
                  <td className="p-2">RAKIB (HERO)</td>
                  <td className="p-2">Lead Performer</td>
                  <td className="p-2">06:00 AM</td>
                  <td className="p-2">06:30 AM</td>
                  <td className="p-2 font-bold">07:15 AM</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold">#02</td>
                  <td className="p-2">CYBER SHADOW</td>
                  <td className="p-2">Supporting Performer</td>
                  <td className="p-2">07:30 AM</td>
                  <td className="p-2">08:00 AM</td>
                  <td className="p-2 font-bold">08:45 AM</td>
                </tr>
              </tbody>
            </table>

            <div className="border-t border-black pt-2 text-[10px] text-gray-500 text-center">
              A RAWx Storyboard Production • Executive Producer: Rakib Himon • Dhaka Studio Hub
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
