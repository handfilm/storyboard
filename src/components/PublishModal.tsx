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
import { useStudioStore } from '../core/store';
import { ExportLutPreviewCard } from './export/ExportLutPreviewCard';
import { CinemaToolHUD, CinemaBadgeHeader } from './ui/CinemaToolHUD';

interface PublishModalProps {
  project: AnthologyProject;
  currentIndex?: number;
  onClose: () => void;
  onImportProject: (imported: AnthologyProject) => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  project,
  currentIndex,
  onClose,
  onImportProject
}) => {
  const [activeTab, setActiveTab] = useState<'git' | 'readme' | 'export' | 'deploy'>('git');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const storeShotIndex = useStudioStore((s) => s.activeShotIndex);
  const storeShotMediaMap = useStudioStore((s) => s.shotMediaMap);
  const storeActiveLut = useStudioStore((s) => s.activeLut);
  const titleAlign = useStudioStore((s) => s.titleAlign);
  const selectedShotIndex = Math.max(
    0,
    Math.min(
      Math.max(0, (project.frames?.length || 1) - 1),
      typeof currentIndex === 'number' ? currentIndex : storeShotIndex || 0
    )
  );
  const selectedFrame = project.frames?.[selectedShotIndex];

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

  const gitCommands = `# Recommended: Run Autonomous Handfilm Git Push Engine
./scripts/git-push.sh https://github.com/YOUR_GITHUB_USERNAME/rawx-storyboard-engine.git

# Or with GitHub Personal Access Token (PAT):
./scripts/git-push.sh ghp_YOUR_TOKEN https://github.com/YOUR_GITHUB_USERNAME/rawx-storyboard-engine.git

# Manual fallback commands:
git config --global --add safe.directory "$PWD"
git add .
git commit -m "feat(core): unified workstation stabilization, showcase pipeline & git recovery"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/rawx-storyboard-engine.git
git push -u origin main --force-with-lease`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0a0a10] border border-[#272732] rounded-md shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-[#272732] flex items-center justify-between bg-[#0c0c10]">
          <CinemaBadgeHeader
            icon={<Github className="w-4 h-4 text-[#fbbf24]" strokeWidth={2.2} />}
            label="GIT & INTERCHANGE"
            accent="amber"
          />

          <CinemaToolHUD
            title="CLOSE PUBLISH SUITE"
            en="Close Git & Hollywood Interchange modal."
            bn="কীভাবে ব্যবহার করবেন: প্যানেল বন্ধ করতে ক্লিক করুন।"
            shortcut="ESC"
            accent="crimson"
            side="left"
          >
            <button
              onClick={onClose}
              className="cinema-tile cinema-tile-crimson min-h-[38px] px-2.5 flex items-center gap-1"
              aria-label="Close Modal"
            >
              <X className="w-4 h-4" strokeWidth={2.2} />
              <span className="font-black tracking-wider text-[10px] uppercase">CLOSE</span>
            </button>
          </CinemaToolHUD>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1.5 p-2 border-b border-[#272732] bg-[#070709]">
          {[
            { id: 'git', label: 'GIT PUSH', icon: Terminal, accent: 'amber' as const, title: 'GIT PUSH SETUP', en: 'Copy terminal commands to push repository to GitHub.', bn: 'কীভাবে ব্যবহার করবেন: গিট পুশ কমান্ড পেতে ক্লিক করুন।' },
            { id: 'readme', label: 'README', icon: FileText, accent: 'cyan' as const, title: 'GITHUB README.MD', en: 'Preview and download auto-generated project README.', bn: 'কীভাবে ব্যবহার করবেন: প্রজেক্ট README দেখতে ক্লিক করুন।' },
            { id: 'export', label: 'EXPORTERS', icon: Clapperboard, accent: 'emerald' as const, title: 'HOLLYWOOD EXPORTERS', en: 'Export OTIO, EDL, FCPXML, XML, Fountain, SRT, CSV & JSON.', bn: 'কীভাবে ব্যবহার করবেন: এক্সপোর্ট ফরম্যাট বাছতে ক্লিক করুন।' },
            { id: 'deploy', label: 'DEPLOY', icon: Globe, accent: 'amber' as const, title: 'CLOUD DEPLOY', en: 'View CLI deploy commands for Vercel, Netlify, or GitHub Pages.', bn: 'কীভাবে ব্যবহার করবেন: হোস্টিং ডিপ্লয় কমান্ড দেখতে ক্লিক করুন।' },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <CinemaToolHUD key={tab.id} title={tab.title} en={tab.en} bn={tab.bn} accent={tab.accent} side="bottom" blockWrapper>
                <button
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  data-active={isActive ? 'true' : 'false'}
                  className={`cinema-tile cinema-tile-${tab.accent} w-full min-h-[42px] py-2 px-3 flex items-center justify-center gap-2`}
                >
                  <Icon className="w-4 h-4" strokeWidth={2.2} />
                  <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">{tab.label}</span>
                </button>
              </CinemaToolHUD>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GIT SETUP */}
          {activeTab === 'git' && (
            <div className="space-y-4">
              <CinemaBadgeHeader
                icon={<Terminal className="w-4 h-4 text-amber-300" strokeWidth={2.2} />}
                label="GIT PUSH"
                accent="amber"
              />

              <div className="relative">
                <pre className="p-4 bg-black/80 border border-white/15 rounded-xs font-mono-tech text-xs text-emerald-300 overflow-x-auto leading-relaxed">
                  {gitCommands}
                </pre>
                <div className="absolute top-3 right-3">
                  <CinemaToolHUD
                    title="COPY GIT COMMANDS"
                    en="Copy git initialization and push script to clipboard."
                    bn="কীভাবে ব্যবহার করবেন: গিট কমান্ড কপি করতে ক্লিক করুন।"
                    accent="emerald"
                    side="left"
                  >
                    <button
                      onClick={() => handleCopy(gitCommands, 'git')}
                      data-active={copiedType === 'git' ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-emerald px-3 py-1.5 text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5"
                    >
                      {copiedType === 'git' ? <Check className="w-3.5 h-3.5" strokeWidth={2.2} /> : <Copy className="w-3.5 h-3.5" strokeWidth={2.2} />}
                      <span>{copiedType === 'git' ? 'COPIED' : 'COPY CMD'}</span>
                    </button>
                  </CinemaToolHUD>
                </div>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-xs flex items-center justify-between gap-3">
                <CinemaBadgeHeader
                  icon={<FileSpreadsheet className="w-4 h-4 text-amber-300" strokeWidth={2.2} />}
                  label="ANTHOLOGY JSON"
                  accent="amber"
                />
                <CinemaToolHUD
                  title="SAVE ANTHOLOGY JSON"
                  en="Download anthology-project.json with all shot edits."
                  bn="কীভাবে ব্যবহার করবেন: প্রজেক্ট JSON সেভ করতে ক্লিক করুন।"
                  accent="amber"
                  side="left"
                >
                  <button
                    onClick={() => handleDownloadFile(jsonContent, 'anthology-project.json', 'application/json')}
                    className="cinema-tile cinema-tile-amber min-h-[42px] px-4 py-2 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" strokeWidth={2.2} />
                    <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">SAVE JSON</span>
                  </button>
                </CinemaToolHUD>
              </div>
            </div>
          )}

          {/* TAB 2: GITHUB README.MD */}
          {activeTab === 'readme' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <CinemaBadgeHeader
                  icon={<FileText className="w-4 h-4 text-cyan-400" strokeWidth={2.2} />}
                  label="README.MD"
                  accent="cyan"
                />
                <div className="flex items-center gap-2">
                  <CinemaToolHUD
                    title="COPY MARKDOWN"
                    en="Copy generated README.md contents to clipboard."
                    bn="কীভাবে ব্যবহার করবেন: README টেক্সট কপি করতে ক্লিক করুন।"
                    accent="cyan"
                    side="bottom"
                  >
                    <button
                      onClick={() => handleCopy(markdownContent, 'readme')}
                      data-active={copiedType === 'readme' ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-cyan min-h-[40px] px-3 py-1.5 flex items-center gap-1.5"
                    >
                      {copiedType === 'readme' ? <Check className="w-3.5 h-3.5" strokeWidth={2.2} /> : <Copy className="w-3.5 h-3.5" strokeWidth={2.2} />}
                      <span className="font-black tracking-wider text-[10px] uppercase">{copiedType === 'readme' ? 'COPIED' : 'COPY MD'}</span>
                    </button>
                  </CinemaToolHUD>
                  <CinemaToolHUD
                    title="DOWNLOAD README.MD"
                    en="Download formatted README.md file."
                    bn="কীভাবে ব্যবহার করবেন: README.md ফাইল ডাউনলোড করতে ক্লিক করুন।"
                    accent="amber"
                    side="left"
                  >
                    <button
                      onClick={() => handleDownloadFile(markdownContent, 'README.md', 'text/markdown')}
                      className="cinema-tile cinema-tile-amber min-h-[40px] px-3 py-1.5 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" strokeWidth={2.2} />
                      <span className="font-black tracking-wider text-[10px] uppercase">DOWNLOAD</span>
                    </button>
                  </CinemaToolHUD>
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
            <div className="space-y-5">
              <CinemaBadgeHeader
                icon={<Clapperboard className="w-4 h-4 text-emerald-400" strokeWidth={2.2} />}
                label="NLE INTERCHANGE"
                accent="emerald"
              />

              <ExportLutPreviewCard
                shotIndex={selectedShotIndex}
                frame={selectedFrame}
                shotMediaMap={storeShotMediaMap}
                fallbackLut={storeActiveLut}
                aspectRatio={selectedFrame?.aspectRatio || '2.39:1'}
                titleAlign={titleAlign}
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'xml', label: 'PREMIERE XML', accent: 'amber' as const, icon: Film, title: 'PREMIERE / CAPCUT XML', en: 'Export FCP7 XML timeline for CapCut & Premiere Pro.', bn: 'কীভাবে ব্যবহার করবেন: .xml টাইমলাইন ডাউনলোড করতে চাপুন।', action: () => handleDownloadFile(generatePremiereCapCutXml(project), `${project.title.replace(/\s+/g, '_')}_CapCut_Premiere.xml`, 'application/xml') },
                  { id: 'fcpxml', label: 'FCPXML 1.10', accent: 'cyan' as const, icon: Clapperboard, title: 'DAVINCI & FCPXML', en: 'Export Apple FCPXML v1.10 for DaVinci Resolve & Final Cut.', bn: 'কীভাবে ব্যবহার করবেন: .fcpxml ডাউনলোড করতে চাপুন।', action: () => handleDownloadFile(generateFcpXml(project), `${project.title.replace(/\s+/g, '_')}_DaVinci_FCP.fcpxml`, 'application/xml') },
                  { id: 'otio', label: 'OTIO TIMELINE', accent: 'emerald' as const, icon: Sliders, title: 'OPENTIMELINEIO (.OTIO)', en: 'Universal OpenTimelineIO interchange file.', bn: 'কীভাবে ব্যবহার করবেন: .otio ফাইল ডাউনলোড করতে চাপুন।', action: () => handleDownloadFile(exportToOTIO(project), `${project.title.replace(/\s+/g, '_')}.otio`, 'application/json') },
                  { id: 'edl', label: 'CMX 3600 EDL', accent: 'amber' as const, icon: FileText, title: 'CMX 3600 EDL', en: 'Industry-standard edit decision list for Avid & Resolve.', bn: 'কীভাবে ব্যবহার করবেন: .edl ফাইল ডাউনলোড করতে চাপুন।', action: () => handleDownloadFile(exportToCMX3600EDL(project), `${project.title.replace(/\s+/g, '_')}.edl`, 'text/plain') },
                  { id: 'fountain', label: 'FOUNTAIN', accent: 'emerald' as const, icon: FileText, title: 'FOUNTAIN SCREENPLAY', en: 'Export screenplay text for Highland, Fade In & Final Draft.', bn: 'কীভাবে ব্যবহার করবেন: স্ক্রিপ্ট (.fountain) ডাউনলোড করতে চাপুন।', action: () => handleDownloadFile(exportToFountain(project), `${project.title.replace(/\s+/g, '_')}.fountain`, 'text/plain') },
                  { id: 'srt', label: 'BILINGUAL SRT', accent: 'cyan' as const, icon: FileText, title: 'BILINGUAL SUBTITLES (.SRT)', en: 'Timed Bengali & English subtitle tracks with timecodes.', bn: 'কীভাবে ব্যবহার করবেন: .srt সাবটাইটেল ডাউনলোড করতে চাপুন।', action: () => handleDownloadFile(exportToSRT(project), `${project.title.replace(/\s+/g, '_')}.srt`, 'text/plain') },
                  { id: 'csv', label: 'SHOTLIST CSV', accent: 'amber' as const, icon: FileSpreadsheet, title: 'SHOT LIST CSV', en: 'Camera lenses, T-stops, and cues spreadsheet.', bn: 'কীভাবে ব্যবহার করবেন: .csv শিট ডাউনলোড করতে চাপুন।', action: () => handleDownloadFile(csvContent, 'rawx-shotlist.csv', 'text/csv') },
                  { id: 'json', label: 'PROJECT JSON', accent: 'emerald' as const, icon: Layers, title: 'FULL ANTHOLOGY JSON', en: 'Complete RAWx schema and frame parameters archive.', bn: 'কীভাবে ব্যবহার করবেন: প্রজেক্ট JSON ডাউনলোড করতে চাপুন।', action: () => handleDownloadFile(jsonContent, 'rawx-anthology-100.json', 'application/json') },
                ].map((exp) => {
                  const Icon = exp.icon;
                  return (
                    <CinemaToolHUD key={exp.id} title={exp.title} en={exp.en} bn={exp.bn} accent={exp.accent} side="top" blockWrapper>
                      <button
                        onClick={exp.action}
                        className={`cinema-tile cinema-tile-${exp.accent} w-full min-h-[56px] p-3 flex flex-col items-center justify-center gap-1.5`}
                      >
                        <Icon className="w-5 h-5" strokeWidth={2.2} />
                        <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">{exp.label}</span>
                      </button>
                    </CinemaToolHUD>
                  );
                })}
              </div>

              {/* Safety Backup & Restore */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CinemaToolHUD
                  title="FULL DATABASE BACKUP"
                  en="Export every IndexedDB object store, 100 frames, pan offsets, and preferences."
                  bn="কীভাবে ব্যবহার করবেন: সম্পূর্ণ সেফটি ব্যাকআপ ডাউনলোড করতে চাপুন।"
                  accent="amber"
                  side="top"
                  blockWrapper
                >
                  <button
                    onClick={() => exportFullIdbBackup()}
                    className="cinema-tile cinema-tile-amber w-full min-h-[52px] px-4 py-3 flex items-center justify-center gap-2"
                  >
                    <HardDriveDownload className="w-5 h-5" strokeWidth={2.2} />
                    <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">IDB BACKUP</span>
                  </button>
                </CinemaToolHUD>

                <CinemaToolHUD
                  title="RESTORE JSON BACKUP"
                  en="Load a previously exported .json file to restore all shots and settings."
                  bn="কীভাবে ব্যবহার করবেন: ব্যাকআপ JSON ফাইল ইমপোর্ট করতে চাপুন।"
                  accent="cyan"
                  side="top"
                  blockWrapper
                >
                  <label className="cinema-tile cinema-tile-cyan w-full min-h-[52px] px-4 py-3 flex items-center justify-center gap-2 cursor-pointer">
                    <Layers className="w-5 h-5" strokeWidth={2.2} />
                    <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">IMPORT JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJSON}
                      className="hidden"
                    />
                  </label>
                </CinemaToolHUD>
              </div>
            </div>
          )}

          {/* TAB 4: DEPLOY TO CLOUD */}
          {activeTab === 'deploy' && (
            <div className="space-y-4">
              <CinemaBadgeHeader
                icon={<Globe className="w-4 h-4 text-amber-300" strokeWidth={2.2} />}
                label="CLOUD DEPLOY"
                accent="amber"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {[
                  { name: 'VERCEL', cmd: 'vercel --prod' },
                  { name: 'NETLIFY', cmd: 'netlify deploy --prod' },
                  { name: 'GH PAGES', cmd: 'npm run build' },
                ].map((host) => (
                  <CinemaToolHUD
                    key={host.name}
                    title={`COPY ${host.name} CLI`}
                    en={`Copy ${host.cmd} deployment command.`}
                    bn="কীভাবে ব্যবহার করবেন: ডিপ্লয় কমান্ড কপি করতে ক্লিক করুন।"
                    accent="amber"
                    side="top"
                    blockWrapper
                  >
                    <button
                      onClick={() => handleCopy(host.cmd, host.name)}
                      data-active={copiedType === host.name ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-amber w-full min-h-[64px] p-3 flex flex-col items-center justify-center gap-1.5"
                    >
                      <span className="font-black tracking-wider text-[11px] uppercase">{host.name}</span>
                      <code className="text-[10px] font-mono opacity-80">{copiedType === host.name ? 'COPIED' : host.cmd}</code>
                    </button>
                  </CinemaToolHUD>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
