import React, { useState } from 'react';
import { AnthologyProject } from '../types/anthology';
import { 
  generateProjectMarkdown, 
  generateProjectJSON, 
  generateCSVExport 
} from '../utils/engine';
import { 
  X, 
  Github, 
  Download, 
  Copy, 
  Check, 
  Terminal, 
  Globe, 
  FileText, 
  FileSpreadsheet,
  Layers,
  HardDriveDownload,
  ShieldCheck
} from 'lucide-react';
import { exportFullIdbBackup } from '../utils/backup';

interface PublishModalProps {
  project: AnthologyProject;
  onClose: () => void;
  onImportProject: (imported: AnthologyProject) => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  project,
  onClose,
  onImportProject
}) => {
  const [activeTab, setActiveTab] = useState<'git' | 'readme' | 'export' | 'deploy'>('git');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const markdownContent = generateProjectMarkdown(project);
  const jsonContent = generateProjectJSON(project);
  const csvContent = generateCSVExport(project.frames);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && Array.isArray(parsed.frames)) {
            onImportProject(parsed);
            onClose();
          }
        } catch {
          // invalid json handling
        }
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  const gitCommands = `# 1. Initialize local Git repository
git init

# 2. Stage all codebase files & anthology assets
git add .

# 3. Create initial commit
git commit -m "feat: complete RAWx Master Anthology Engine 100 with optical shaders and audio"

# 4. Set main branch & attach your remote repository
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/rawx-anthology-engine.git

# 5. Push to GitHub!
git push -u origin main`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0d0e14] border border-white/20 rounded-xs shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xs bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cinzel text-lg font-bold text-white tracking-widest uppercase">
                Git & Platform Publishing Suite
              </h2>
              <p className="font-mono-tech text-xs text-white/50 tracking-wider">
                PREPARE REPOSITORY • EXPORT DATASETS • DEPLOY TO PRODUCTION
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xs hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-white/10 bg-black/20">
          {[
            { id: 'git', label: 'Git Push Setup', icon: Terminal },
            { id: 'readme', label: 'GitHub README.md', icon: FileText },
            { id: 'export', label: 'Export Data (JSON/CSV)', icon: Download },
            { id: 'deploy', label: 'Deploy to Cloud', icon: Globe },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 py-3 px-3 flex items-center justify-center gap-2 text-xs font-mono-tech tracking-wider border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-amber-400 text-amber-300 bg-white/5 font-semibold'
                    : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GIT SETUP */}
          {activeTab === 'git' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-cinzel text-sm font-bold text-amber-300 uppercase tracking-wider mb-1">
                  Ready to Push to GitHub
                </h3>
                <p className="font-mono-tech text-xs text-white/70">
                  Execute these commands in your project terminal to commit your complete project to GitHub:
                </p>
              </div>

              <div className="relative">
                <pre className="p-4 bg-black/80 border border-white/15 rounded-xs font-mono-tech text-xs text-emerald-300 overflow-x-auto leading-relaxed">
                  {gitCommands}
                </pre>
                <button
                  onClick={() => handleCopy(gitCommands, 'git')}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xs text-[11px] font-mono-tech text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedType === 'git' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedType === 'git' ? 'Copied Commands!' : 'Copy Commands'}
                </button>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-xs flex items-center justify-between">
                <div>
                  <h4 className="font-cinzel text-xs font-bold text-white uppercase tracking-wider">
                    Include Pre-populated Anthology State
                  </h4>
                  <p className="font-mono-tech text-[11px] text-white/50 mt-0.5">
                    Download <code className="text-amber-300">anthology-project.json</code> to include all your frame edits directly in the repo.
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadFile(jsonContent, 'anthology-project.json', 'application/json')}
                  className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xs text-xs font-mono-tech flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Save JSON
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: GITHUB README.MD */}
          {activeTab === 'readme' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-cinzel text-sm font-bold text-amber-300 uppercase tracking-wider">
                    Generated README.md
                  </h3>
                  <p className="font-mono-tech text-xs text-white/60">
                    Includes badges, shot list index, keyboard controls, and license info.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(markdownContent, 'readme')}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xs text-xs font-mono-tech text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedType === 'readme' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Markdown
                  </button>
                  <button
                    onClick={() => handleDownloadFile(markdownContent, 'README.md', 'text/markdown')}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xs text-xs font-mono-tech text-amber-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download README.md
                  </button>
                </div>
              </div>

              <div className="max-h-[380px] overflow-y-auto p-4 bg-black/70 border border-white/15 rounded-xs">
                <pre className="font-mono-tech text-[11px] text-white/80 whitespace-pre-wrap leading-relaxed">
                  {markdownContent}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: EXPORT DATA */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-cinzel text-sm font-bold text-amber-300 uppercase tracking-wider mb-1">
                  Export Anthology Datasets
                </h3>
                <p className="font-mono-tech text-xs text-white/60">
                  Export all 100 frames with camera specs, tags, Bengali titles, and optical parameters.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* JSON Export */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-xs flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-xs bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h4 className="font-cinzel text-sm font-bold text-white uppercase tracking-wider">
                      Full Anthology JSON
                    </h4>
                    <p className="font-mono-tech text-xs text-white/50 mt-1">
                      Complete project schema with all 100 frames and optical presets.
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleDownloadFile(jsonContent, 'rawx-anthology-100.json', 'application/json')}
                      className="flex-1 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xs text-xs font-mono-tech text-amber-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download JSON
                    </button>
                  </div>
                </div>

                {/* CSV Export */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-xs flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-xs bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <h4 className="font-cinzel text-sm font-bold text-white uppercase tracking-wider">
                      Production Shot List CSV
                    </h4>
                    <p className="font-mono-tech text-xs text-white/50 mt-1">
                      Tabular format for Excel, Google Sheets, or production call sheets.
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleDownloadFile(csvContent, 'rawx-shotlist.csv', 'text/csv')}
                      className="flex-1 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-xs text-xs font-mono-tech text-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Safety Net: Full IDB Safety Backup */}
              <div className="p-4 bg-gradient-to-r from-[#D4AF37]/10 via-black/40 to-[#D4AF37]/5 border border-[#D4AF37]/40 rounded-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xs bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#FFE066] shrink-0 mt-0.5 sm:mt-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-cinzel text-xs font-bold text-[#FFE066] uppercase tracking-wider">
                        Full Database Safety Backup (IndexedDB + Storage)
                      </h4>
                      <span className="px-1.5 py-0.2 rounded-xs bg-emerald-500/20 text-emerald-300 font-mono-tech text-[8.5px]">
                        SAFETY NET
                      </span>
                    </div>
                    <p className="font-mono-tech text-[11px] text-white/60 mt-0.5">
                      Exports every IndexedDB object store, 100 frames, pan offsets, and local preferences to a single portable JSON file.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => exportFullIdbBackup()}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#FFE066] text-black font-mono-tech text-xs font-bold rounded-xs flex items-center gap-2 cursor-pointer transition-colors shrink-0 shadow-lg"
                >
                  <HardDriveDownload className="w-3.5 h-3.5 text-black" />
                  Export full backup
                </button>
              </div>

              {/* Import Existing Project */}
              <div className="p-4 border border-dashed border-white/20 rounded-xs bg-white/5 flex items-center justify-between">
                <div>
                  <h4 className="font-cinzel text-xs font-bold text-white uppercase tracking-wider">
                    Restore Project from JSON Backup
                  </h4>
                  <p className="font-mono-tech text-[11px] text-white/50 mt-0.5">
                    Load a previously exported .json file to restore all frames and settings.
                  </p>
                </div>
                <label className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xs text-xs font-mono-tech text-white flex items-center gap-2 cursor-pointer transition-colors">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Import JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: DEPLOY TO CLOUD */}
          {activeTab === 'deploy' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-cinzel text-sm font-bold text-amber-300 uppercase tracking-wider mb-1">
                  1-Click Deploy to Web Hosting
                </h3>
                <p className="font-mono-tech text-xs text-white/60">
                  Deploy this repository to global edge networks with zero configuration:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xs">
                  <h4 className="font-cinzel text-xs font-bold text-white uppercase mb-1">Vercel</h4>
                  <p className="font-mono-tech text-[10px] text-white/50 mb-3">
                    Connect GitHub repo, auto-detects Vite React. Instant deployment.
                  </p>
                  <code className="block p-2 bg-black/60 rounded text-[10px] font-mono-tech text-amber-300">
                    vercel --prod
                  </code>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-xs">
                  <h4 className="font-cinzel text-xs font-bold text-white uppercase mb-1">Netlify</h4>
                  <p className="font-mono-tech text-[10px] text-white/50 mb-3">
                    Build command: <code>npm run build</code>, Publish dir: <code>dist</code>.
                  </p>
                  <code className="block p-2 bg-black/60 rounded text-[10px] font-mono-tech text-amber-300">
                    netlify deploy --prod
                  </code>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-xs">
                  <h4 className="font-cinzel text-xs font-bold text-white uppercase mb-1">GitHub Pages</h4>
                  <p className="font-mono-tech text-[10px] text-white/50 mb-3">
                    Push to gh-pages branch or use GitHub Actions workflow.
                  </p>
                  <code className="block p-2 bg-black/60 rounded text-[10px] font-mono-tech text-amber-300">
                    npm run build
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
