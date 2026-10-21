import React, { useState } from 'react';
import { AnthologyProject } from '../types/anthology';
import { 
  generateProjectMarkdown, 
  generateProjectJSON, 
  generateCSVExport 
} from '../utils/engine';
import {
  exportToOTIO,
  exportToCMX3600EDL,
  exportToFountain,
  exportToSRT,
  triggerFileDownload
} from '../data/hollywoodExporters';
import { generatePremiereCapCutXml, generateFcpXml } from '../services/exportXml';
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
  ShieldCheck,
  Film,
  Clapperboard,
  Sliders
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
    triggerFileDownload(content, filename, type);
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0a0a10] border border-[#272732] rounded-md shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-[#272732] flex items-center justify-between bg-[#0c0c10]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xs bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-[#fbbf24]">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cinzel text-lg font-bold text-white tracking-[0.16em] uppercase">
                Git & Hollywood Interchange Suite
              </h2>
              <p className="font-mono-tech text-xs text-zinc-400 tracking-wider">
                PREPARE REPOSITORY • OTIO / EDL / FOUNTAIN / SRT • CLOUD DEPLOY
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xs hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-[#272732] bg-[#070709]">
          {[
            { id: 'git', label: 'Git Push Setup', icon: Terminal },
            { id: 'readme', label: 'GitHub README.md', icon: FileText },
            { id: 'export', label: 'Hollywood Exporters', icon: Clapperboard },
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
                    ? 'border-[#d4af37] text-[#fbbf24] bg-[#d4af37]/10 font-bold'
                    : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/5'
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

          {/* TAB 3: HOLLYWOOD EXPORTERS */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-cinzel text-sm font-bold text-amber-300 uppercase tracking-wider mb-1">
                  Hollywood Interchange Formats
                </h3>
                <p className="font-mono-tech text-xs text-white/60">
                  Export to industry-standard NLE and screenplay formats (DaVinci Resolve, Premiere, Avid, Final Draft).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 0A. Premiere / CapCut XML (FCP 7 XML / xmeml) */}
                <div className="p-3.5 bg-gradient-to-b from-[#14141e] to-[#0a0a10] border border-[#d4af37]/60 rounded-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-[#fbbf24] font-bold">CAPCUT & PREMIERE</span>
                    <h4 className="font-cinzel text-xs font-bold text-white mt-1">Premiere / CapCut XML (.xml)</h4>
                    <p className="font-mono-tech text-[10px] text-white/60 mt-1">Direct import into CapCut Desktop and Premiere Pro with all 100 shots.</p>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(generatePremiereCapCutXml(project), `${project.title.replace(/\s+/g, '_')}_CapCut_Premiere.xml`, 'application/xml')}
                    className="mt-3 py-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/35 border border-[#D4AF37]/50 text-[#FFE066] rounded-xs text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download .xml</span>
                  </button>
                </div>

                {/* 0B. FCPXML for DaVinci Resolve & FCPX */}
                <div className="p-3.5 bg-gradient-to-b from-[#0e161c] to-[#0a0a10] border border-[#06b6d4]/50 rounded-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-[#06b6d4] font-bold">DAVINCI & FCP</span>
                    <h4 className="font-cinzel text-xs font-bold text-white mt-1">FCPXML v1.10 (.fcpxml)</h4>
                    <p className="font-mono-tech text-[10px] text-white/60 mt-1">Native Apple FCPXML spine for DaVinci Resolve 18+ and Final Cut Pro X.</p>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(generateFcpXml(project), `${project.title.replace(/\s+/g, '_')}_DaVinci_FCP.fcpxml`, 'application/xml')}
                    className="mt-3 py-1.5 bg-[#06b6d4]/20 hover:bg-[#06b6d4]/35 border border-[#06b6d4]/50 text-[#06b6d4] rounded-xs text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download .fcpxml</span>
                  </button>
                </div>
                {/* 1. OpenTimelineIO (.otio) */}
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-[#00FFCC] font-bold">NLE TIMELINE</span>
                    <h4 className="font-cinzel text-xs font-bold text-white mt-1">OpenTimelineIO (.otio)</h4>
                    <p className="font-mono-tech text-[10px] text-white/50 mt-1">Universal timeline interchange for DaVinci Resolve & Premiere.</p>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(exportToOTIO(project), `${project.title.replace(/\s+/g, '_')}.otio`, 'application/json')}
                    className="mt-3 py-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/35 border border-[#D4AF37]/40 text-[#FFE066] rounded-xs text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download .otio</span>
                  </button>
                </div>

                {/* 2. CMX 3600 EDL */}
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold">EDIT DECISION LIST</span>
                    <h4 className="font-cinzel text-xs font-bold text-white mt-1">CMX 3600 EDL (.edl)</h4>
                    <p className="font-mono-tech text-[10px] text-white/50 mt-1">Standard edit sequence for Avid Media Composer & post houses.</p>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(exportToCMX3600EDL(project), `${project.title.replace(/\s+/g, '_')}.edl`, 'text/plain')}
                    className="mt-3 py-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/35 border border-[#D4AF37]/40 text-[#FFE066] rounded-xs text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download .edl</span>
                  </button>
                </div>

                {/* 3. Fountain Screenplay */}
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold">SCREENPLAY</span>
                    <h4 className="font-cinzel text-xs font-bold text-white mt-1">Fountain Script (.fountain)</h4>
                    <p className="font-mono-tech text-[10px] text-white/50 mt-1">Plaintext script format for Highland, Fade In, and Final Draft.</p>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(exportToFountain(project), `${project.title.replace(/\s+/g, '_')}.fountain`, 'text/plain')}
                    className="mt-3 py-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/35 border border-[#D4AF37]/40 text-[#FFE066] rounded-xs text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download .fountain</span>
                  </button>
                </div>

                {/* 4. SubRip Subtitles */}
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-purple-400 font-bold">SUBTITLES</span>
                    <h4 className="font-cinzel text-xs font-bold text-white mt-1">Bilingual SRT (.srt)</h4>
                    <p className="font-mono-tech text-[10px] text-white/50 mt-1">Timed Bengali and English subtitles with timecodes.</p>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(exportToSRT(project), `${project.title.replace(/\s+/g, '_')}.srt`, 'text/plain')}
                    className="mt-3 py-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/35 border border-[#D4AF37]/40 text-[#FFE066] rounded-xs text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download .srt</span>
                  </button>
                </div>

                {/* 5. CSV Shot List */}
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-blue-400 font-bold">PRODUCTION SPREADSHEET</span>
                    <h4 className="font-cinzel text-xs font-bold text-white mt-1">Shot List CSV (.csv)</h4>
                    <p className="font-mono-tech text-[10px] text-white/50 mt-1">Camera lenses, T-stops, and notes for Excel or Google Sheets.</p>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(csvContent, 'rawx-shotlist.csv', 'text/csv')}
                    className="mt-3 py-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/35 border border-[#D4AF37]/40 text-[#FFE066] rounded-xs text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download .csv</span>
                  </button>
                </div>

                {/* 6. Full Anthology JSON */}
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-[#FFE066] font-bold">NATIVE ARCHIVE</span>
                    <h4 className="font-cinzel text-xs font-bold text-white mt-1">Full Project JSON</h4>
                    <p className="font-mono-tech text-[10px] text-white/50 mt-1">Complete RAWx engine database schema and frame parameters.</p>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(jsonContent, 'rawx-anthology-100.json', 'application/json')}
                    className="mt-3 py-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/35 border border-[#D4AF37]/40 text-[#FFE066] rounded-xs text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download .json</span>
                  </button>
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
