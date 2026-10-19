/**
 * RAWx Studio — Export / Git Publication Suite
 * Public API: ExportGitModal component
 * Handles Git commit folder exports, .rawxvault bundles, Markdown specs, and CSV shot lists.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../core/store';
import { exportRawxVaultBundle } from '../../data/rawxVaultIO';
import { generateProjectMarkdown, generateCSVExport } from '../../utils/engine';
import { 
  Download, 
  GitBranch, 
  FileText, 
  FileSpreadsheet, 
  Lock, 
  Trash2, 
  X, 
  Check, 
  AlertTriangle 
} from 'lucide-react';

export const ExportGitModal: React.FC = () => {
  const {
    activeModule,
    setActiveModule,
    project
  } = useStudioStore();

  const [passphrase, setPassphrase] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (activeModule !== 'EXPORT') return null;

  const handleDownloadVaultBundle = async () => {
    try {
      const blob = await exportRawxVaultBundle(project, isEncrypted ? passphrase : undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.rawxvault`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Downloaded .rawxvault bundle successfully');
    } catch (err: any) {
      setStatusMessage(`Export failed: ${err.message}`);
    }
  };

  const handleDownloadMarkdown = () => {
    const md = generateProjectMarkdown(project as any);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `README_${project.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Downloaded Git-ready README.md');
  };

  const handleDownloadCSV = () => {
    const csv = generateCSVExport(project.shots as any);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ShotList_${project.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Downloaded ShotList.csv');
  };

  const handleClearAllData = () => {
    if (confirm("DANGER: Are you sure you want to permanently clear all saved storyboard media, pan offsets, and local database records?")) {
      if (confirm("Final confirmation: This will wipe all local studio storage and reload. Proceed?")) {
        localStorage.clear();
        indexedDB.deleteDatabase('RAWxVault100_DB');
        indexedDB.deleteDatabase('RAWxStudio_v5_DB');
        window.location.reload();
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none animate-fadeIn font-mono text-xs"
      onClick={() => setActiveModule('PLAYER')}
    >
      <div 
        className="w-full max-w-2xl bg-[#0B0B0B] border border-[#D4AF37]/40 rounded-xl shadow-2xl p-4 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2.5">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-bold tracking-wider text-[#FFE066]">
              RAWx EXPORT / GIT PUBLICATION SUITE
            </span>
          </div>
          <button onClick={() => setActiveModule('PLAYER')} className="text-[#8A8A8A] hover:text-[#EDEDED]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="p-2 rounded bg-[#4ADE80]/10 border border-[#4ADE80]/30 text-[#4ADE80] text-[11px] flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Export Formats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* .rawxvault Bundle */}
          <div className="p-3 rounded-lg bg-[#121212] border border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#FFE066] font-bold">
              <Download className="w-4 h-4 text-[#D4AF37]" />
              <span>.rawxvault Bundle</span>
            </div>
            <p className="text-[10px] text-[#8A8A8A]">
              Complete project archive with JSON manifest, frame states, and optional AES-GCM encryption.
            </p>

            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                id="encrypt-chk"
                checked={isEncrypted}
                onChange={(e) => setIsEncrypted(e.target.checked)}
                className="accent-[#D4AF37]"
              />
              <label htmlFor="encrypt-chk" className="text-[10px] text-[#EDEDED] flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#D4AF37]" />
                <span>AES-GCM Encryption</span>
              </label>
            </div>

            {isEncrypted && (
              <input
                type="password"
                placeholder="Enter passphrase..."
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="bg-black border border-[#D4AF37]/40 rounded p-1 text-[11px] text-[#EDEDED] outline-none"
              />
            )}

            <button
              onClick={handleDownloadVaultBundle}
              className="mt-auto px-3 py-1.5 rounded bg-[#D4AF37] text-black font-bold hover:bg-[#FFE066] transition-colors"
            >
              DOWNLOAD .RAWXVAULT
            </button>
          </div>

          {/* Git Markdown & CSV */}
          <div className="p-3 rounded-lg bg-[#121212] border border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#FFE066] font-bold">
              <FileText className="w-4 h-4 text-[#D4AF37]" />
              <span>Git & Production Docs</span>
            </div>
            <p className="text-[10px] text-[#8A8A8A]">
              GitHub-ready README Markdown spec with camera specs, Bengali titles, and CSV shot lists.
            </p>

            <div className="flex flex-col gap-1.5 mt-auto">
              <button
                onClick={handleDownloadMarkdown}
                className="px-3 py-1.5 rounded bg-[#121212] border border-[#D4AF37]/30 hover:border-[#D4AF37] text-[#EDEDED] hover:text-[#FFE066] transition-colors flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>DOWNLOAD README.MD</span>
              </button>

              <button
                onClick={handleDownloadCSV}
                className="px-3 py-1.5 rounded bg-[#121212] border border-[#D4AF37]/30 hover:border-[#D4AF37] text-[#EDEDED] hover:text-[#FFE066] transition-colors flex items-center justify-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>DOWNLOAD SHOTLIST.CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone: Wipe Storage */}
        <div className="p-3 rounded-lg bg-[#FF4B4B]/5 border border-[#FF4B4B]/20 flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-[#FF4B4B]">
            <AlertTriangle className="w-4 h-4" />
            <div>
              <span className="font-bold">Reset Local Vault Database</span>
              <p className="text-[9px] text-[#8A8A8A]">
                Permanently wipes all IndexedDB tables, custom photos, and pan offsets.
              </p>
            </div>
          </div>
          <button
            onClick={handleClearAllData}
            className="px-2.5 py-1 rounded bg-[#FF4B4B]/20 border border-[#FF4B4B] text-[#FF4B4B] hover:bg-[#FF4B4B] hover:text-black font-bold text-[10px] transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>WIPE DATA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
