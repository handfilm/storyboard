/**
 * @file /src/components/SelfTestModal.tsx
 * @description Self-Test Diagnostics panel displaying green/amber/red status per feature,
 * the Layout Doctor viewport analyzer, and the 1000-shot Stress Test benchmark.
 */

import React, { useState, useEffect } from 'react';
import { selfTestEngine, TestResult, LayoutDoctorReport, StressTestReport } from '../core/selfTest';
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Monitor,
  Cpu,
  Play,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { CinemaToolHUD, CinemaBadgeHeader } from './ui/CinemaToolHUD';

interface SelfTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SelfTestModal: React.FC<SelfTestModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'features' | 'layout' | 'stress'>('features');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [layoutReport, setLayoutReport] = useState<LayoutDoctorReport | null>(null);
  const [stressReport, setStressReport] = useState<StressTestReport | null>(null);
  const [isStressRunning, setIsStressRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunningTests(true);
    const results = await selfTestEngine.runAllFeatureTests();
    setTestResults(results);
    const report = selfTestEngine.runLayoutDoctor();
    setLayoutReport(report);
    setIsRunningTests(false);
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  const handleRunStressTest = async () => {
    setIsStressRunning(true);
    const report = await selfTestEngine.runStressTest(1000, 5000);
    setStressReport(report);
    setIsStressRunning(false);
  };

  if (!isOpen) return null;

  const passedCount = testResults.filter(r => r.status === 'pass').length;
  const failedCount = testResults.filter(r => r.status === 'fail').length;

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#0B0C10] border border-[#26282E] rounded-lg shadow-[0_30px_80px_rgba(0,0,0,0.95)] flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-2.5 border-b border-[#26282E] flex flex-wrap items-center justify-between gap-2 bg-[#111215]">
          <div className="flex items-center gap-2.5">
            <CinemaBadgeHeader
              icon={<Activity className="w-4 h-4" strokeWidth={2.2} />}
              label="SELF TEST"
              accent="emerald"
            />
            <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border ${
              failedCount === 0
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-red-500/15 text-red-300 border-red-500/30'
            }`}>
              {failedCount === 0 ? '100% PASS' : `${failedCount} ISSUES`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CinemaToolHUD
              title="RE-RUN SELF DIAGNOSTICS"
              en="Execute all feature checks and layout boundary diagnostics."
              bn="কীভাবে ব্যবহার করবেন: সব স্টুডিও ফিচার ঠিক আছে কিনা আবার পরীক্ষা করতে RE-RUN চাপুন।"
              accent="cyan"
              side="bottom"
            >
              <button
                type="button"
                onClick={runDiagnostics}
                disabled={isRunningTests}
                className="cinema-tile cinema-tile-cyan px-3 py-2 min-h-[44px] rounded-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 cinema-tile-icon ${isRunningTests ? 'animate-spin' : ''}`} strokeWidth={2.2} />
                <span className="font-black tracking-wider text-[10px] uppercase">RE-RUN</span>
              </button>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="CLOSE DIAGNOSTICS"
              en="Close the studio self-test window."
              bn="কীভাবে ব্যবহার করবেন: ডায়াগনস্টিক প্যানেল বন্ধ করতে X বাটনে চাপুন।"
              shortcut="ESC"
              accent="crimson"
              side="bottom"
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="cinema-tile cinema-tile-crimson min-h-[44px] min-w-[44px] px-2.5 rounded-md flex items-center justify-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4 cinema-tile-icon" strokeWidth={2.3} />
                <span className="hidden sm:inline font-black tracking-wider text-[10px] uppercase">CLOSE</span>
              </button>
            </CinemaToolHUD>
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-b border-[#26282E] bg-[#0B0C10] px-4 py-2 overflow-x-auto no-scrollbar">
          <CinemaToolHUD
            title="FEATURE HEALTH CHECKS"
            en={`Inspect automated test status across all studio engines (${passedCount}/${testResults.length}).`}
            bn="কীভাবে ব্যবহার করবেন: প্রতিটি ফিচারের স্ট্যাটাস দেখতে FEATURES ট্যাবে চাপুন।"
            accent="amber"
            side="bottom"
          >
            <button
              type="button"
              data-active={activeTab === 'features' ? 'true' : 'false'}
              onClick={() => setActiveTab('features')}
              className="cinema-tile cinema-tile-amber px-3 py-2 min-h-[44px] rounded-md flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
              <span className="font-black tracking-wider text-[10px] uppercase whitespace-nowrap">
                FEATURES ({passedCount}/{testResults.length})
              </span>
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="LAYOUT DOCTOR"
            en="Check viewport overflow, HUD collisions, and responsive bounds."
            bn="কীভাবে ব্যবহার করবেন: স্ক্রিনে কোনো বাটন বা টেক্সট কেটে যাচ্ছে কিনা দেখতে LAYOUT চাপুন।"
            accent="cyan"
            side="bottom"
          >
            <button
              type="button"
              data-active={activeTab === 'layout' ? 'true' : 'false'}
              onClick={() => setActiveTab('layout')}
              className="cinema-tile cinema-tile-cyan px-3 py-2 min-h-[44px] rounded-md flex items-center gap-1.5 cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
              <span className="font-black tracking-wider text-[10px] uppercase whitespace-nowrap">LAYOUT</span>
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="1000-SHOT STRESS BENCHMARK"
            en="Synthesize 1,000 shot records and 5,000 media links to measure speed."
            bn="কীভাবে ব্যবহার করবেন: ১০০০ শট দিয়ে স্পিড ও মেমোরি পরীক্ষা করতে STRESS ট্যাবে চাপুন।"
            accent="emerald"
            side="bottom"
          >
            <button
              type="button"
              data-active={activeTab === 'stress' ? 'true' : 'false'}
              onClick={() => setActiveTab('stress')}
              className="cinema-tile cinema-tile-emerald px-3 py-2 min-h-[44px] rounded-md flex items-center gap-1.5 cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
              <span className="font-black tracking-wider text-[10px] uppercase whitespace-nowrap">STRESS 1K</span>
            </button>
          </CinemaToolHUD>
        </div>

        <div className="p-5 overflow-y-auto flex-1 no-scrollbar">
          {activeTab === 'features' && (
            <div className="flex flex-col gap-2">
              {testResults.map((result) => (
                <div
                  key={result.featureId}
                  className="px-3 py-2.5 rounded-md bg-[#111215] border border-[#26282E] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {result.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {result.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                    {result.status === 'fail' && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                    <span className="font-mono-tech text-[11px] font-black tracking-wider uppercase text-white truncate">
                      {result.name}
                    </span>
                    <span className="px-1.5 py-0.5 bg-black/60 border border-[#26282E] text-[9px] font-black uppercase rounded text-amber-300 shrink-0">
                      {result.module}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-mono-tech text-zinc-400 tabular-nums">
                      {result.durationMs}MS
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      result.status === 'pass' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                      result.status === 'warn' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                      'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'layout' && layoutReport && (
            <div className="flex flex-col gap-4 font-mono-tech">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#111215] border border-[#26282E] rounded-md">
                  <span className="text-[9px] text-zinc-400 font-black uppercase">VIEWPORT</span>
                  <div className="text-xs text-amber-300 font-black mt-1">
                    {layoutReport.viewportWidth} × {layoutReport.viewportHeight}
                  </div>
                </div>
                <div className="p-3 bg-[#111215] border border-[#26282E] rounded-md">
                  <span className="text-[9px] text-zinc-400 font-black uppercase">OVERFLOW</span>
                  <div className={`text-xs font-black mt-1 ${layoutReport.hasHorizontalOverflow ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {layoutReport.hasHorizontalOverflow ? 'CLIPPED' : 'CLEAN'}
                  </div>
                </div>
                <div className="p-3 bg-[#111215] border border-[#26282E] rounded-md">
                  <span className="text-[9px] text-zinc-400 font-black uppercase">HUD BOUNDS</span>
                  <div className={`text-xs font-black mt-1 ${layoutReport.hudCollisionDetected ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {layoutReport.hudCollisionDetected ? 'COLLISION' : 'SAFE'}
                  </div>
                </div>
                <div className="p-3 bg-[#111215] border border-[#26282E] rounded-md">
                  <span className="text-[9px] text-zinc-400 font-black uppercase">STATUS</span>
                  <div className={`text-xs font-black mt-1 ${layoutReport.issues.length === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {layoutReport.issues.length === 0 ? 'PASS' : `${layoutReport.issues.length} WARN`}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {layoutReport.issues.length === 0 ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-black uppercase rounded-md flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>VIEWPORT BOUNDS VERIFIED</span>
                  </div>
                ) : (
                  layoutReport.issues.map((issue, idx) => (
                    <div key={idx} className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs rounded-md">
                      {issue}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'stress' && (
            <div className="flex flex-col gap-4 font-mono-tech">
              <div className="p-4 bg-[#111215] border border-[#26282E] rounded-md flex flex-wrap items-center justify-between gap-3">
                <CinemaBadgeHeader
                  icon={<Cpu className="w-4 h-4" strokeWidth={2.2} />}
                  label="1K BENCHMARK"
                  accent="amber"
                />
                <CinemaToolHUD
                  title="RUN 1000-SHOT BENCHMARK"
                  en="Synthesize 1,000 shot records and 5,000 media links at 60fps."
                  bn="কীভাবে ব্যবহার করবেন: ১০০০ শটের লোড টেস্ট চালাতে RUN TEST বাটনে চাপুন।"
                  accent="amber"
                >
                  <button
                    type="button"
                    onClick={handleRunStressTest}
                    disabled={isStressRunning}
                    data-active="true"
                    className="cinema-tile cinema-tile-amber px-4 py-2 min-h-[44px] rounded-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Play className="w-4 h-4 cinema-tile-icon fill-current" strokeWidth={2.2} />
                    <span className="font-black tracking-wider text-[10px] uppercase">
                      {isStressRunning ? 'RUNNING...' : 'RUN TEST'}
                    </span>
                  </button>
                </CinemaToolHUD>
              </div>

              {stressReport && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#111215] border border-[#26282E] rounded-md">
                    <span className="text-[9px] text-zinc-400 font-black uppercase">ELAPSED</span>
                    <div className="text-xs text-amber-300 font-black mt-1">
                      {stressReport.elapsedMs} MS
                    </div>
                  </div>
                  <div className="p-3 bg-[#111215] border border-[#26282E] rounded-md">
                    <span className="text-[9px] text-zinc-400 font-black uppercase">GENERATION</span>
                    <div className="text-xs text-emerald-400 font-black mt-1">
                      {stressReport.metrics.generationTimeMs} MS
                    </div>
                  </div>
                  <div className="p-3 bg-[#111215] border border-[#26282E] rounded-md">
                    <span className="text-[9px] text-zinc-400 font-black uppercase">FILTER</span>
                    <div className="text-xs text-emerald-400 font-black mt-1">
                      {stressReport.metrics.searchFilterTimeMs} MS
                    </div>
                  </div>
                  <div className="p-3 bg-[#111215] border border-[#26282E] rounded-md">
                    <span className="text-[9px] text-zinc-400 font-black uppercase">HEAP</span>
                    <div className="text-xs text-white font-black mt-1">
                      ~{stressReport.memoryEstimateMB} MB
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="min-h-[40px] px-4 py-2 bg-[#111215] border-t border-[#26282E] flex items-center justify-between text-[10px] font-black tracking-wider uppercase text-zinc-400">
          <span>DIAGNOSTICS V5</span>
          <span className="text-amber-400">RAWx CORE</span>
        </div>
      </div>
    </div>
  );
};

