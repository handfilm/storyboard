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
  ShieldCheck 
} from 'lucide-react';

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
  const warnedCount = testResults.filter(r => r.status === 'warn').length;
  const failedCount = testResults.filter(r => r.status === 'fail').length;

  return (
    <div 
      className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-[#0B0C10] border border-[#D4AF37]/50 rounded-[2px] shadow-[0_30px_80px_rgba(0,0,0,0.95)] flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="font-cinzel text-xs sm:text-sm font-bold tracking-[0.2em] text-white">
              STUDIO DIAGNOSTICS & SELF-TEST
            </h2>
            <span className="px-1.5 py-0.5 rounded-[1px] bg-emerald-500/20 text-[8.5px] font-mono-tech text-emerald-300">
              HEALTH: {failedCount === 0 ? '100% OPERATIONAL' : `${failedCount} ISSUES`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runDiagnostics}
              disabled={isRunningTests}
              className="px-2 py-1 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/15 text-[9px] font-mono-tech text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${isRunningTests ? 'animate-spin text-[#D4AF37]' : ''}`} />
              <span>RE-RUN TESTS</span>
            </button>
            <button onClick={onClose} className="p-1 text-white/50 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center border-b border-white/10 bg-black/20 px-4">
          <button
            onClick={() => setActiveTab('features')}
            className={`px-4 py-2 font-mono-tech text-[10px] tracking-wider uppercase border-b-2 cursor-pointer transition-colors ${
              activeTab === 'features'
                ? 'border-[#D4AF37] text-[#FFE066] font-bold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Features ({passedCount}/{testResults.length})
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`px-4 py-2 font-mono-tech text-[10px] tracking-wider uppercase border-b-2 cursor-pointer transition-colors ${
              activeTab === 'layout'
                ? 'border-[#D4AF37] text-[#FFE066] font-bold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Layout Doctor
          </button>
          <button
            onClick={() => setActiveTab('stress')}
            className={`px-4 py-2 font-mono-tech text-[10px] tracking-wider uppercase border-b-2 cursor-pointer transition-colors ${
              activeTab === 'stress'
                ? 'border-[#D4AF37] text-[#FFE066] font-bold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Stress Test (1000 Shots)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1 no-scrollbar">
          {activeTab === 'features' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[9px] font-mono-tech text-white/40 pb-2 border-b border-white/5">
                <span>FEATURE CAPABILITY & COMPONENT</span>
                <span>STATUS / LATENCY</span>
              </div>
              {testResults.map((result) => (
                <div
                  key={result.featureId}
                  className="px-3 py-2 rounded-[1px] bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {result.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {result.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                    {result.status === 'fail' && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tech text-[11px] font-medium text-white truncate">
                          {result.name}
                        </span>
                        <span className="px-1 py-0.2 bg-white/10 text-[7px] font-mono-tech rounded text-[#D4AF37]">
                          {result.module}
                        </span>
                      </div>
                      <span className="text-[8.5px] text-white/50 truncate">
                        {result.message}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[8px] font-mono-tech text-white/40">
                      {result.durationMs}ms
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-[1px] text-[8px] font-mono-tech uppercase font-bold ${
                      result.status === 'pass' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      result.status === 'warn' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/30'
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
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-[1px]">
                  <span className="text-[8px] text-white/40 uppercase">Viewport</span>
                  <div className="text-xs text-[#FFE066] font-bold mt-1">
                    {layoutReport.viewportWidth} × {layoutReport.viewportHeight}px
                  </div>
                </div>
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-[1px]">
                  <span className="text-[8px] text-white/40 uppercase">Horizontal Overflow</span>
                  <div className={`text-xs font-bold mt-1 ${layoutReport.hasHorizontalOverflow ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {layoutReport.hasHorizontalOverflow ? 'DETECTED (CLIPPING)' : 'NONE (PERFECT)'}
                  </div>
                </div>
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-[1px]">
                  <span className="text-[8px] text-white/40 uppercase">HUD Collision</span>
                  <div className={`text-xs font-bold mt-1 ${layoutReport.hudCollisionDetected ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {layoutReport.hudCollisionDetected ? 'COLLISION DETECTED' : 'SAFE (NO OVERLAP)'}
                  </div>
                </div>
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-[1px]">
                  <span className="text-[8px] text-white/40 uppercase">Status</span>
                  <div className={`text-xs font-bold mt-1 ${layoutReport.issues.length === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {layoutReport.issues.length === 0 ? 'CLEAN PASS' : `${layoutReport.issues.length} WARNINGS`}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <h4 className="text-[9.5px] uppercase tracking-wider text-[#D4AF37]">
                  Layout Doctor Diagnostic Log:
                </h4>
                {layoutReport.issues.length === 0 ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-[1px] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>All DOM containers, aspect ratio bounds, and HUD overlays conform strictly to viewport bounds without clipping.</span>
                  </div>
                ) : (
                  layoutReport.issues.map((issue, idx) => (
                    <div key={idx} className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs rounded-[1px]">
                      ⚠ {issue}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'stress' && (
            <div className="flex flex-col gap-4 font-mono-tech">
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-[1px] flex items-center justify-between">
                <div>
                  <h4 className="text-xs text-white font-bold">1,000 Shot Memory & Virtualization Benchmark</h4>
                  <p className="text-[9px] text-white/50 mt-1">
                    Synthesizes 1,000 shot records and 5,000 media linkages to verify 60fps throughput.
                  </p>
                </div>
                <button
                  onClick={handleRunStressTest}
                  disabled={isStressRunning}
                  className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#FFE066] text-black font-bold text-[10px] rounded-[1px] flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isStressRunning ? 'BENCHMARKING...' : 'RUN BENCHMARK'}</span>
                </button>
              </div>

              {stressReport && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white/[0.03] border border-white/10 rounded-[1px]">
                    <span className="text-[8px] text-white/40 uppercase">Total Benchmark Time</span>
                    <div className="text-xs text-[#FFE066] font-bold mt-1">
                      {stressReport.elapsedMs} ms
                    </div>
                  </div>
                  <div className="p-3 bg-white/[0.03] border border-white/10 rounded-[1px]">
                    <span className="text-[8px] text-white/40 uppercase">1000 Shots Generation</span>
                    <div className="text-xs text-emerald-400 font-bold mt-1">
                      {stressReport.metrics.generationTimeMs} ms
                    </div>
                  </div>
                  <div className="p-3 bg-white/[0.03] border border-white/10 rounded-[1px]">
                    <span className="text-[8px] text-white/40 uppercase">Tag Search & Filter</span>
                    <div className="text-xs text-emerald-400 font-bold mt-1">
                      {stressReport.metrics.searchFilterTimeMs} ms
                    </div>
                  </div>
                  <div className="p-3 bg-white/[0.03] border border-white/10 rounded-[1px]">
                    <span className="text-[8px] text-white/40 uppercase">Heap Overhead</span>
                    <div className="text-xs text-white font-bold mt-1">
                      ~{stressReport.memoryEstimateMB} MB
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-black/60 border-t border-white/10 flex items-center justify-between text-[8.5px] font-mono-tech text-white/40">
          <span>Continuous Self-Test & Diagnostic Engine</span>
          <span className="text-[#D4AF37]">RAWx Storyboard Engine v5.0</span>
        </div>
      </div>
    </div>
  );
};
