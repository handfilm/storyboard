/**
 * RAWx Studio — Export / Git Publication Suite
 * Public API: ExportGitModal component
 * Handles Git commit folder exports, .rawxvault bundles, Markdown specs, and CSV shot lists.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../core/store';
import { exportRawxVaultBundle } from '../../data/rawxVaultIO';
import { generateProjectMarkdown, generateCSVExport } from '../../utils/engine';
import { CinemaToolHUD, CinemaBadgeHeader } from '../../components/ui/CinemaToolHUD';
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
import { ExportLutPreviewCard } from '../../components/export/ExportLutPreviewCard';

export const ExportGitModal: React.FC = () => {
  const {
    activeModule,
    setActiveModule,
    project,
    activeShotIndex,
    shotMediaMap,
    activeLut,
    aspectRatio,
    titleAlign
  } = useStudioStore();

  const [passphrase, setPassphrase] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  if (activeModule !== 'EXPORT') return null;

  const activeShot = project.shots?.[activeShotIndex];

  const handleDownloadVaultBundle = async () => {
    try {
      const blob = await exportRawxVaultBundle(project, isEncrypted ? passphrase : undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.rawxvault`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('VAULT SAVED');
    } catch (err: any) {
      setStatusMessage(`ERR: ${err.message}`);
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
    setStatusMessage('README SAVED');
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
    setStatusMessage('CSV SAVED');
  };

  const handleClearAllData = () => {
    if (!confirmWipe) {
      setConfirmWipe(true);
      setTimeout(() => setConfirmWipe(false), 4000);
      return;
    }
    localStorage.clear();
    indexedDB.deleteDatabase('RAWxVault100_DB');
    indexedDB.deleteDatabase('RAWxStudio_v5_DB');
    window.location.reload();
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
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
          <CinemaBadgeHeader
            icon={<GitBranch className="w-3.5 h-3.5 text-amber-400" />}
            label="GIT EXPORT"
            accent="amber"
          />
          <CinemaToolHUD
            title="CLOSE EXPORT SUITE"
            en="Return to active studio stage."
            bn="কীভাবে ব্যবহার করবেন: প্যানেল বন্ধ করতে চাপুন।"
            accent="amber"
            side="left"
          >
            <button
              type="button"
              onClick={() => setActiveModule('PLAYER')}
              className="cinema-tile cinema-tile-amber min-h-[36px] px-2.5 flex items-center gap-1 text-[10px] font-black tracking-wider uppercase"
            >
              <X className="w-4 h-4" strokeWidth={2.2} />
              <span>CLOSE</span>
            </button>
          </CinemaToolHUD>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-black tracking-wider flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Selected Frame LUT Verification Preview */}
        <ExportLutPreviewCard
          compact
          shotIndex={activeShotIndex}
          storeShot={activeShot}
          shotMediaMap={shotMediaMap}
          fallbackLut={activeLut}
          aspectRatio={aspectRatio}
          titleAlign={titleAlign}
        />

        {/* Export Formats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* .rawxvault Bundle */}
          <div className="p-3 rounded-lg bg-[#111215] border border-[#26282E] flex flex-col gap-2.5">
            <CinemaBadgeHeader
              icon={<Download className="w-3.5 h-3.5 text-amber-400" />}
              label="VAULT ZIP"
              accent="amber"
            />

            <CinemaToolHUD
              title="AES-GCM ENCRYPTION"
              en="Lock exported .rawxvault archive with a custom passphrase."
              bn="কীভাবে ব্যবহার করবেন: ফাইল পাসওয়ার্ড দিয়ে লক করতে AES-256 অন করুন।"
              accent="amber"
              side="top"
              blockWrapper
            >
              <button
                type="button"
                onClick={() => setIsEncrypted(!isEncrypted)}
                data-active={isEncrypted ? 'true' : 'false'}
                className="cinema-tile cinema-tile-amber w-full min-h-[38px] px-2.5 flex items-center justify-between text-[10px] font-black tracking-wider uppercase"
              >
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" strokeWidth={2.2} />
                  <span>AES LOCK</span>
                </span>
                <span>{isEncrypted ? 'ON' : 'OFF'}</span>
              </button>
            </CinemaToolHUD>

            {isEncrypted && (
              <input
                type="password"
                placeholder="Passphrase..."
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="bg-black border border-amber-500/40 rounded p-2 text-[11px] text-[#EDEDED] outline-none"
              />
            )}

            <CinemaToolHUD
              title="EXPORT .RAWXVAULT BUNDLE"
              en="Download complete project JSON manifest and shot states."
              bn="কীভাবে ব্যবহার করবেন: পুরো প্রজেক্ট ব্যাকআপ ফাইল ডাউনলোড করতে চাপুন।"
              accent="amber"
              side="top"
              blockWrapper
            >
              <button
                type="button"
                onClick={handleDownloadVaultBundle}
                data-active="true"
                className="cinema-tile cinema-tile-amber w-full min-h-[44px] mt-auto px-3 flex items-center justify-center gap-1.5 text-[11px] font-black tracking-wider uppercase"
              >
                <Download className="w-4 h-4" strokeWidth={2.2} />
                <span>RAWX VAULT</span>
              </button>
            </CinemaToolHUD>
          </div>

          {/* Git Markdown & CSV */}
          <div className="p-3 rounded-lg bg-[#111215] border border-[#26282E] flex flex-col gap-2.5">
            <CinemaBadgeHeader
              icon={<FileText className="w-3.5 h-3.5 text-cyan-400" />}
              label="GIT DOCS"
              accent="cyan"
            />

            <div className="flex flex-col gap-2 mt-auto">
              <CinemaToolHUD
                title="EXPORT GIT README.MD"
                en="Download Markdown spec with camera notes and Bengali titles."
                bn="কীভাবে ব্যবহার করবেন: GitHub-রেডি README.md ডাউনলোড করতে ক্লিক করুন।"
                accent="cyan"
                side="top"
                blockWrapper
              >
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="cinema-tile cinema-tile-cyan w-full min-h-[44px] px-3 flex items-center justify-center gap-1.5 text-[11px] font-black tracking-wider uppercase"
                >
                  <FileText className="w-4 h-4" strokeWidth={2.2} />
                  <span>README.MD</span>
                </button>
              </CinemaToolHUD>

              <CinemaToolHUD
                title="EXPORT SHOTLIST.CSV"
                en="Download structured CSV spreadsheet of all storyboard shots."
                bn="কীভাবে ব্যবহার করবেন: এক্সেল বা শিট ফরম্যাটে শটলিস্ট পেতে চাপুন।"
                accent="emerald"
                side="top"
                blockWrapper
              >
                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  className="cinema-tile cinema-tile-emerald w-full min-h-[44px] px-3 flex items-center justify-center gap-1.5 text-[11px] font-black tracking-wider uppercase"
                >
                  <FileSpreadsheet className="w-4 h-4" strokeWidth={2.2} />
                  <span>SHOT CSV</span>
                </button>
              </CinemaToolHUD>
            </div>
          </div>
        </div>

        {/* Danger Zone: Wipe Storage */}
        <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 flex items-center justify-between mt-1">
          <CinemaBadgeHeader
            icon={<AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
            label="VAULT RESET"
            accent="crimson"
          />
          <CinemaToolHUD
            title="WIPE LOCAL STORAGE"
            en="Double-tap to permanently delete local IndexedDB media and resets."
            bn="কীভাবে ব্যবহার করবেন: সব লোকাল মিডিয়া ও ডেটা মুছতে পরপর দুবার চাপুন।"
            accent="crimson"
            side="left"
          >
            <button
              type="button"
              onClick={handleClearAllData}
              data-active={confirmWipe ? 'true' : 'false'}
              className="cinema-tile cinema-tile-crimson min-h-[40px] px-3 flex items-center gap-1.5 text-[10.5px] font-black tracking-wider uppercase"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>{confirmWipe ? 'CONFIRM WIPE' : 'WIPE DATA'}</span>
            </button>
          </CinemaToolHUD>
        </div>
      </div>
    </div>
  );
};
