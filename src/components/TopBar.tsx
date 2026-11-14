/**
 * @file /src/components/TopBar.tsx
 * @description Master Editorial Cinema TopBar for HANDFILM:
 * - Left: Cinema Red Diamond Monogram, HANDFILM brand, minimal nav links (Home, Top 10 Reels, Manifesto)
 * - Center/Right:
 *   - Unified [ EXPORT ▾ ] dropdown:
 *     1. FCP 7 XML (Premiere Pro)
 *     2. FCPXML (CapCut / DaVinci)
 *     3. MP4 Master (WebCodecs Render)
 *     4. Contact Sheet PDF
 *     5. Full Project Backup (.rawx)
 *   - [ ▶ PRO STUDIO ] / [ HOME ] toggle
 *   - Right Ecosystem Menu with restored links:
 *     HUB, VAULT, R2 / STREAM, BLOOM-APP, DEEPER, LAB, SETTINGS
 */

import React, { useState, useEffect } from 'react';
import { WorkspaceMode } from '../core/theme';
import { SaveState } from '../core/storage';
import { exportFullIdbBackup } from '../utils/backup';
import { AnthologyFrame } from '../types/anthology';
import { downloadStoryboardPdf } from '../utils/pdfExport';
import {
  Film,
  Home,
  Play,
  FolderOpen,
  Layers,
  Activity,
  HardDriveDownload,
  Cloud,
  Video,
  Sparkles,
  Download,
  Scissors,
  FileText,
  Globe,
  Settings,
  ChevronDown,
  Keyboard,
  Type,
  Circle,
  LogIn,
  Package,
  Zap,
  BarChart2,
  Compass,
  FileCode
} from 'lucide-react';
import {
  CinemaToolHUD,
  CinemaGuideToggleButton,
  CinemaBadgeHeader
} from './ui/CinemaToolHUD';
import { signInWithGoogle, signOutUser, onAuthChange, auth } from '../services/firebase';
import { useLicenseStore } from '../services/licenseService';
import { firestoreSync, CloudSyncStatus } from '../services/firestoreSync';
import { User } from 'firebase/auth';
import { ExportModalTab } from './CutNativeExportModal';
import { ComponentVisibility } from './ComponentsMatrixPopover';
import { useStudioStore } from '../core/store';
import { PlaybackMode } from '../types/editor';
import {
  calculateMasterSequenceDuration,
  formatRuntimeTimecode,
  formatSoloShotTelemetry,
  getShotDurationSec,
  getShotTargetFps
} from '../types/storyboard';

export interface TopBarProps {
  projectTitle?: string;
  onUpdateTitle?: (title: string) => void;
  activeMode?: WorkspaceMode;
  onSelectMode?: (mode: WorkspaceMode) => void;
  onGoHome?: () => void;
  activeModule?: string;
  isProMode?: boolean;
  onToggleProMode?: () => void;
  componentsBadgeText?: string;
  onToggleComponentsPopover?: () => void;
  onOpenThemeSettings?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenSelfTest?: () => void;
  onOpenShortcuts?: () => void;
  onOpenPublishModal?: () => void;
  onOpenProjectManager?: () => void;
  onOpenAnimatic?: () => void;
  onToggleFullscreen?: () => void;
  onToggleTitles?: () => void;
  showTitles?: boolean;
  componentsVisibility?: ComponentVisibility;
  onChangeComponentsVisibility?: (next: ComponentVisibility) => void;
  saveState?: SaveState;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onOpenR2Automation?: () => void;
  onOpenExportTimeline?: () => void;
  onOpenExportRange?: () => void;
  onOpenExportStudio?: (tab?: ExportModalTab) => void;
  onOpenWalkthrough?: () => void;
  onOpenVideoScopes?: () => void;
  onOpenAiStudio?: () => void;
  onOpenBloomSequencer?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenScreenRecorder?: () => void;
  currentView?: 'HOME' | 'STUDIO';
  onSelectView?: (view: 'HOME' | 'STUDIO') => void;
  currentShotIndex?: number;
  totalShots?: number;
  activePanel?: 'TACTILE_STAGE' | 'SPLIT' | 'OPTICAL' | 'SEQUENCER' | 'MULTICAM';
  onSelectPanel?: (panel: 'TACTILE_STAGE' | 'SPLIT' | 'OPTICAL' | 'SEQUENCER' | 'MULTICAM') => void;
  onSaveProjectJson?: () => void;
  onRestoreProjectJson?: () => void;
  frames?: AnthologyFrame[];
  onOpenContactSheet?: () => void;
  onOpenCompilationWizard?: () => void;
  playbackMode?: PlaybackMode;
  onSelectPlaybackMode?: (mode: PlaybackMode) => void;
  onOpenProjectStats?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectTitle = 'UNTITLED_CANVAS_01',
  activeMode = 'STAGE',
  onSelectMode,
  onGoHome,
  frames,
  onOpenContactSheet,
  onOpenCompilationWizard,
  playbackMode = 'sequence',
  onSelectPlaybackMode,
  onOpenProjectStats,
  isProMode = true,
  onToggleProMode,
  componentsBadgeText = '12/13 ON',
  onToggleComponentsPopover,
  onOpenThemeSettings,
  onOpenSelfTest,
  onOpenShortcuts,
  onOpenProjectManager,
  onOpenAnimatic,
  onOpenR2Automation,
  onOpenExportTimeline,
  onOpenExportRange,
  onOpenExportStudio,
  onOpenWalkthrough,
  onOpenScreenRecorder,
  onOpenVideoScopes,
  onOpenAiStudio,
  onOpenBloomSequencer,
  onOpenSettingsModal,
  onToggleTitles,
  showTitles = true,
  componentsVisibility,
  onChangeComponentsVisibility,
  currentView = 'HOME',
  onSelectView,
  currentShotIndex = 0,
  totalShots,
  activePanel = 'TACTILE_STAGE',
  onSelectPanel,
  onSaveProjectJson,
  onRestoreProjectJson
}) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isEcosystemMenuOpen, setIsEcosystemMenuOpen] = useState(false);
  const license = useLicenseStore((s) => s.license);
  const openOnboardingFlow = useLicenseStore((s) => s.openOnboardingFlow);

  const activeFrame = frames && frames.length > 0
    ? frames[Math.max(0, Math.min(frames.length - 1, currentShotIndex))]
    : undefined;
  const activeShotDurationSec = getShotDurationSec(activeFrame, 12.0);
  const activeShotFps = getShotTargetFps(activeFrame, 24);
  const totalShotsCount = frames && frames.length > 0 ? frames.length : (totalShots || 100);
  const masterRuntimeSec = frames && frames.length > 0
    ? calculateMasterSequenceDuration(frames, 12.0)
    : totalShotsCount * activeShotDurationSec;
  const soloHudLabel = formatSoloShotTelemetry(currentShotIndex, activeShotDurationSec, activeShotFps);
  const masterRuntimeLabel = `TOTAL RUNTIME: ${formatRuntimeTimecode(masterRuntimeSec, activeShotFps)} // ${totalShotsCount} SHOTS`;

  // Explicit check of component visibility state for TopBar title toggle button
  const effectiveShowTitles = componentsVisibility !== undefined
    ? Boolean(
        componentsVisibility.titlesAll &&
        (componentsVisibility.titleBn !== false ||
          componentsVisibility.titleEn !== false ||
          componentsVisibility.tagline !== false)
      )
    : Boolean(showTitles);

  const handleTitleToggleClick = () => {
    const nextVisible = !effectiveShowTitles;
    console.log('[TopBar] Title toggle clicked — syncing with componentVisibility:', {
      previousTitlesVisible: effectiveShowTitles,
      nextTitlesVisible: nextVisible,
      componentsVisibility
    });

    if (onChangeComponentsVisibility && componentsVisibility) {
      const allSubChannelsOff =
        componentsVisibility.titleBn === false &&
        componentsVisibility.titleEn === false &&
        componentsVisibility.tagline === false;

      const nextVisibility: ComponentVisibility = {
        ...componentsVisibility,
        titlesAll: nextVisible,
        titleBn: nextVisible && allSubChannelsOff ? true : componentsVisibility.titleBn,
        titleEn: nextVisible && allSubChannelsOff ? true : componentsVisibility.titleEn,
        tagline: nextVisible && allSubChannelsOff ? true : componentsVisibility.tagline
      };
      onChangeComponentsVisibility(nextVisibility);
    } else if (onToggleTitles) {
      onToggleTitles();
    } else {
      useStudioStore.getState().toggleTitles();
    }
  };

  // Firebase Auth & Cloud Sync State
  const [authUser, setAuthUser] = useState<User | null>(auth.currentUser);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>({ isSynced: false, lastSyncedAt: null, error: null });

  useEffect(() => {
    const unsubAuth = onAuthChange(u => setAuthUser(u));
    const unsubSync = firestoreSync.subscribeStatus(s => setCloudStatus(s));
    return () => {
      unsubAuth();
      unsubSync();
    };
  }, []);

  const handleNavHome = () => {
    if (onSelectView) onSelectView('HOME');
    else if (onGoHome) onGoHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavTop10 = () => {
    if (currentView !== 'HOME') {
      onSelectView?.('HOME');
      setTimeout(() => {
        document.getElementById('top-10-reels-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById('top-10-reels-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavManifesto = () => {
    if (onOpenWalkthrough) onOpenWalkthrough();
  };

  // Printable Contact Sheet Generator
  const handleExportContactSheet = () => {
    if (frames && frames.length > 0) {
      downloadStoryboardPdf(frames, {
        projectTitle,
        directorName: 'Directorial Team',
        aspectRatio: '2.39:1',
        framesPerPage: 6,
        theme: 'print'
      });
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${projectTitle} - Contact Sheet PDF</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "JetBrains Mono", monospace; background: #0a0a0f; color: #ededed; padding: 24px; margin: 0; }
            h1 { font-size: 22px; color: #f5a623; margin: 0 0 6px 0; border-bottom: 1px solid #333; padding-bottom: 10px; }
            .meta { font-size: 11px; color: #888; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
            .card { border: 1px solid #272732; background: #121218; border-radius: 4px; padding: 10px; }
            .thumb { height: 95px; background: #07070a; border: 1px solid #1a1a24; border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #555; }
            .title { font-size: 11px; font-weight: bold; color: #f5a623; margin-top: 8px; }
            .sub { font-size: 9.5px; color: #aaa; margin-top: 2px; }
            @media print {
              body { background: #fff; color: #000; }
              .card { border-color: #ddd; background: #fafafa; }
              .thumb { background: #eee; border-color: #ccc; color: #666; }
              .title { color: #b37400; }
              .sub { color: #444; }
            }
          </style>
        </head>
        <body>
          <h1>RAWx Storyboard Contact Sheet // ${projectTitle}</h1>
          <div class="meta">24.0 FPS Master Anthology • 12.000s Slide Holds • Formatted for Print & PDF Export</div>
          <div class="grid">
            ${Array.from({ length: 16 }).map((_, i) => `
              <div class="card">
                <div class="thumb">◆ SHOT ${String(i + 1).padStart(3, '0')}</div>
                <div class="title">SH${String(i + 1).padStart(3, '0')} // KINETIC FLOW</div>
                <div class="sub">12.0s • 288 Frames @ 24fps • ARRI RAW</div>
              </div>
            `).join('')}
          </div>
          <script>
            setTimeout(() => { window.print(); }, 350);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <header className="h-18 sm:h-20 w-full bg-gradient-to-b from-[#070709]/98 via-[#070709]/90 to-transparent backdrop-blur-md sticky top-0 z-50 border-b border-white/10 select-none font-sans">
      <div className="max-w-7xl mx-auto px-4 md:px-10 w-full h-full flex items-center justify-between gap-2">
        {/* Left: Brand HANDFILM + Compact Icon Nav */}
        <div className="flex items-center gap-4 sm:gap-7 min-w-0">
          <CinemaToolHUD
            title="HANDFILM SOVEREIGN ENGINE"
            en="Zero-cloud local NLE locked at 24/60fps with bilingual kinetic titles."
            bn="লোগোতে চাপ দিয়ে মূল হোম পেজ ও মাস্টার শট ডেকে ফিরে যান।"
            accent="crimson"
            side="bottom"
          >
            <div
              onClick={handleNavHome}
              className="flex items-center gap-2.5 cursor-pointer py-1 shrink-0"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rotate-45 border-2 border-[#E50914] bg-gradient-to-tr from-[#8B0000] via-[#E50914] to-[#ff4d4d] flex items-center justify-center shadow-[0_0_18px_rgba(229,9,20,0.6)]">
                <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white font-black -rotate-45" strokeWidth={2.3} />
              </div>
              <div className="flex flex-col leading-none select-none">
                <div className="flex items-center tracking-wider text-lg sm:text-2xl">
                  <span className="font-cinzel text-red-600 font-black">HAND</span>
                  <span className="font-cinzel text-white font-black">FILM</span>
                </div>
                <span className="font-mono text-[8px] text-amber-400 tracking-[0.22em] uppercase font-black">
                  PRO NLE
                </span>
              </div>
            </div>
          </CinemaToolHUD>

          <nav className="flex items-center gap-2 sm:gap-3">
            <CinemaToolHUD hudId="nav-home" side="bottom">
              <button
                type="button"
                onClick={handleNavHome}
                data-active={currentView === 'HOME' ? 'true' : 'false'}
                className="cinema-tile cinema-tile-amber px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-black tracking-wider text-[10px] sm:text-[11px] uppercase cursor-pointer"
              >
                <Home className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.3} />
                <span>HOME</span>
              </button>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="TOP 10 MASTER REELS"
              en="Jump directly to curated 24fps master reels with scope framing."
              bn="সেরা ১০টি মাস্টার রিলস শট গ্যালারিতে যেতে TOP REELS চাপুন।"
              accent="amber"
              side="bottom"
            >
              <button
                type="button"
                onClick={handleNavTop10}
                className="cinema-tile cinema-tile-amber px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-black tracking-wider text-[10px] sm:text-[11px] uppercase cursor-pointer"
              >
                <Film className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.3} />
                <span>TOP REELS</span>
              </button>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="DIRECTOR MANIFESTO"
              en="Interactive studio walkthrough and workflow guide."
              bn="হ্যান্ডফিল্ম স্টুডিও ব্যবহারের পূর্ণ নির্দেশিকা দেখতে MANIFESTO চাপুন।"
              accent="cyan"
              side="bottom"
            >
              <button
                type="button"
                onClick={handleNavManifesto}
                className="cinema-tile cinema-tile-cyan px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-black tracking-wider text-[10px] sm:text-[11px] uppercase cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.3} />
                <span>MANIFESTO</span>
              </button>
            </CinemaToolHUD>
          </nav>
        </div>

        {/* Right: Tactical Icon Action Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <CinemaGuideToggleButton />

          {onOpenProjectStats && (
            <CinemaToolHUD
              title="PROJECT STATS"
              en="Inspect runtime duration, shot count, and pacing telemetry."
              bn="প্রজেক্টের মোট সময় ও শট সংখ্যা দেখতে STATS চাপুন।"
              accent="amber"
              side="bottom"
            >
              <button
                type="button"
                onClick={onOpenProjectStats}
                className="cinema-tile cinema-tile-amber px-2.5 py-1.5 rounded-md font-black tracking-wider text-[10px] sm:text-[11px] uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <BarChart2 className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                <span className="hidden sm:inline">STATS</span>
              </button>
            </CinemaToolHUD>
          )}

          {authUser ? (
            <CinemaToolHUD
              title="CLOUD ACCOUNT SYNCED"
              en={`Signed in as ${authUser.email || 'Director'}. Click to sign out.`}
              bn="অ্যাকাউন্ট লগইন করা আছে; সাইন-আউট করতে এখানে চাপুন।"
              accent="emerald"
              side="bottom"
            >
              <button
                type="button"
                onClick={signOutUser}
                className="cinema-tile cinema-tile-emerald px-2.5 py-1.5 rounded-md font-black tracking-wider text-[10px] sm:text-[11px] uppercase flex items-center gap-1.5 cursor-pointer"
                data-active="true"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="hidden md:inline max-w-[80px] truncate">{authUser.displayName?.split(' ')[0] || 'SYNCED'}</span>
              </button>
            </CinemaToolHUD>
          ) : (
            <CinemaToolHUD
              title="GOOGLE CLOUD SIGN IN"
              en="Sign in with Google to sync projects to cloud vault."
              bn="প্রজেক্ট ক্লাউডে সেভ ও সিঙ্ক করতে SIGN IN বাটনে চাপুন।"
              accent="amber"
              side="bottom"
            >
              <button
                type="button"
                onClick={signInWithGoogle}
                className="cinema-tile cinema-tile-amber px-2.5 py-1.5 rounded-md font-black tracking-wider text-[10px] sm:text-[11px] uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                <span className="hidden sm:inline">SIGN IN</span>
              </button>
            </CinemaToolHUD>
          )}

          {onOpenCompilationWizard && (
            <CinemaToolHUD
              title="AUTO-COMPILE ENGINE"
              en="1-click multi-clip music video & documentary auto assembler."
              bn="সব ক্লিপ দিয়ে এক ক্লিকেই অটো ভিডিও বানাতে AUTO COMPILE চাপুন।"
              accent="amber"
              side="bottom"
            >
              <button
                type="button"
                onClick={onOpenCompilationWizard}
                className="cinema-tile cinema-tile-amber px-3 py-1.5 rounded-md font-black tracking-wider text-[10px] sm:text-[11px] uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.3} />
                <span>AUTO COMPILE</span>
              </button>
            </CinemaToolHUD>
          )}

          {onOpenScreenRecorder && (
            <CinemaToolHUD
              title="4K SCREEN RECORDER"
              en="Record display and studio microphone audio directly into Media Vault."
              bn="স্ক্রিন ও মাইক অডিও সরাসরি রেকর্ড করতে REC বাটনে চাপুন।"
              shortcut="Alt+R"
              accent="crimson"
              side="bottom"
            >
              <button
                type="button"
                onClick={onOpenScreenRecorder}
                className="cinema-tile cinema-tile-crimson px-3 py-1.5 rounded-md font-black tracking-wider text-[10px] sm:text-[11px] uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
                <span>REC</span>
              </button>
            </CinemaToolHUD>
          )}

          {/* Unified EXPORT Dropdown */}
          <div className="relative">
            <CinemaToolHUD hudId="export-4k" side="bottom">
              <button
                type="button"
                onClick={() => {
                  setIsExportMenuOpen((prev) => !prev);
                  setIsEcosystemMenuOpen(false);
                }}
                data-active={isExportMenuOpen ? 'true' : 'false'}
                className="cinema-tile cinema-tile-emerald px-3 py-1.5 rounded-md font-black tracking-wider text-[10px] sm:text-[11px] uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.3} />
                <span>EXPORT</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </CinemaToolHUD>

            {isExportMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-60 bg-[#0B0C0F]/98 border border-[#26282E] rounded-xl shadow-2xl p-2 z-50 space-y-1.5 backdrop-blur-2xl animate-in fade-in duration-150"
                onMouseLeave={() => setIsExportMenuOpen(false)}
              >
                <CinemaBadgeHeader
                  icon={<Download className="w-3 h-3" />}
                  label="EXPORT"
                  accent="emerald"
                />
                <div className="grid grid-cols-1 gap-1">
                  <CinemaToolHUD
                    title="PREMIERE PRO XML"
                    en="Export Final Cut Pro 7 XML sequence for Adobe Premiere Pro."
                    bn="প্রিমিয়ার প্রোতে এডিট করতে PREMIERE XML ডাউনলোড করুন।"
                    accent="amber"
                    side="left"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenExportStudio) onOpenExportStudio('premiere');
                        else if (onOpenExportTimeline) onOpenExportTimeline();
                        setIsExportMenuOpen(false);
                      }}
                      className="cinema-tile cinema-tile-amber w-full px-2.5 py-2 rounded-lg flex items-center justify-between text-[10px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                        <span>PREMIERE XML</span>
                      </span>
                      <span className="text-[8.5px] text-zinc-400">XML</span>
                    </button>
                  </CinemaToolHUD>

                  <CinemaToolHUD
                    title="CAPCUT / DAVINCI FCPXML"
                    en="Export timeline interchange for CapCut Desktop & DaVinci Resolve."
                    bn="ক্যাপকাট বা ডাভিঞ্চি রিজলভে নিতে FCPXML এক্সপোর্ট করুন।"
                    accent="cyan"
                    side="left"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenExportStudio) onOpenExportStudio('fcpxml');
                        else if (onOpenExportTimeline) onOpenExportTimeline();
                        setIsExportMenuOpen(false);
                      }}
                      className="cinema-tile cinema-tile-cyan w-full px-2.5 py-2 rounded-lg flex items-center justify-between text-[10px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                        <span>CAPCUT FCPXML</span>
                      </span>
                      <span className="text-[8.5px] text-zinc-400">FCP</span>
                    </button>
                  </CinemaToolHUD>

                  <CinemaToolHUD hudId="export-4k" side="left" blockWrapper>
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenExportStudio) onOpenExportStudio('mp4');
                        else if (onOpenExportRange) onOpenExportRange();
                        setIsExportMenuOpen(false);
                      }}
                      className="cinema-tile cinema-tile-emerald w-full px-2.5 py-2 rounded-lg flex items-center justify-between text-[10px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Video className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                        <span>MP4 RENDER</span>
                      </span>
                      <span className="text-[8.5px] text-emerald-300">H.264</span>
                    </button>
                  </CinemaToolHUD>

                  <CinemaToolHUD
                    title="NLE PRODUCTION ZIP"
                    en="Bundle media assets, LUTs, and timeline XML into one zip archive."
                    bn="সব মিডিয়া ও টাইমলাইন একসাথে জিপ প্যাকেজে সেভ করতে চাপুন।"
                    accent="amber"
                    side="left"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenExportStudio) onOpenExportStudio('package');
                        setIsExportMenuOpen(false);
                      }}
                      className="cinema-tile cinema-tile-amber w-full px-2.5 py-2 rounded-lg flex items-center justify-between text-[10px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Package className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                        <span>PROJECT ZIP</span>
                      </span>
                      <span className="text-[8.5px] text-zinc-400">ZIP</span>
                    </button>
                  </CinemaToolHUD>

                  <CinemaToolHUD
                    title="CONTACT SHEET PDF"
                    en="Generate printable storyboard bible PDF with shot telemetry."
                    bn="স্টোরিবোর্ড পিডিএফ প্রিন্ট ও ডাউনলোড করতে PDF BIBLE চাপুন।"
                    accent="amber"
                    side="left"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenExportStudio) onOpenExportStudio('pdf');
                        else handleExportContactSheet();
                        setIsExportMenuOpen(false);
                      }}
                      className="cinema-tile cinema-tile-amber w-full px-2.5 py-2 rounded-lg flex items-center justify-between text-[10px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                        <span>PDF BIBLE</span>
                      </span>
                      <span className="text-[8.5px] text-zinc-400">PDF</span>
                    </button>
                  </CinemaToolHUD>

                  <CinemaToolHUD
                    title="FULL RAWX BACKUP"
                    en="Download complete encrypted IndexedDB snapshot (.rawx)."
                    bn="পুরো প্রজেক্টের ফুল ব্যাকআপ ফাইল (.rawx) সেভ করতে চাপুন।"
                    accent="cyan"
                    side="left"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenExportStudio) onOpenExportStudio('backup');
                        else exportFullIdbBackup();
                        setIsExportMenuOpen(false);
                      }}
                      className="cinema-tile cinema-tile-cyan w-full px-2.5 py-2 rounded-lg flex items-center justify-between text-[10px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <HardDriveDownload className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                        <span>RAWX BACKUP</span>
                      </span>
                      <span className="text-[8.5px] text-zinc-400">RAWX</span>
                    </button>
                  </CinemaToolHUD>
                </div>
              </div>
            )}
          </div>

          {/* STUDIO / HOME toggle */}
          {currentView === 'HOME' ? (
            <CinemaToolHUD
              title="LAUNCH CINEMA STUDIO"
              en="Open the full 24fps multi-track NLE studio workspace."
              bn="মূল ভিডিও এডিটিং স্টুডিও চালু করতে STUDIO বাটনে চাপুন।"
              accent="crimson"
              side="bottom"
            >
              <button
                type="button"
                onClick={() => onSelectView?.('STUDIO')}
                className="cinema-tile cinema-tile-crimson px-3.5 py-1.5 rounded-md font-black tracking-wider text-[10px] sm:text-[11px] uppercase flex items-center gap-1.5 cursor-pointer"
                data-active="true"
              >
                <Play className="w-3.5 h-3.5 fill-current cinema-tile-icon" />
                <span>STUDIO</span>
              </button>
            </CinemaToolHUD>
          ) : (
            <CinemaToolHUD hudId="nav-home" side="bottom">
              <button
                type="button"
                onClick={() => onSelectView?.('HOME')}
                className="cinema-tile cinema-tile-amber px-3.5 py-1.5 rounded-md font-black tracking-wider text-[10px] sm:text-[11px] uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5 cinema-tile-icon" />
                <span>HOME</span>
              </button>
            </CinemaToolHUD>
          )}

          {/* TRY FREE */}
          <CinemaToolHUD
            title="HANDFILM STUDIO DOWNLOAD"
            en={
              license?.authenticated
                ? `Account active (${(license.proTier || license.tier).toUpperCase()}). Manage plan or installers.`
                : 'Start 30-day free trial or download Windows, Android & Web app.'
            }
            bn="৩০ দিনের ফ্রি ট্রায়াল নিতে বা উইন্ডোজ/অ্যান্ড্রয়েড অ্যাপ ডাউনলোড করতে চাপুন।"
            accent="cyan"
            side="bottom"
          >
            <button
              type="button"
              data-testid="topbar-try-download-btn"
              onClick={() => openOnboardingFlow()}
              className="px-3.5 py-1.5 rounded-md bg-gradient-to-r from-[#22D3EE] via-[#38BDF8] to-[#F59E0B] hover:brightness-110 text-[#0B0B0D] font-black text-[10px] sm:text-[11px] tracking-wider uppercase flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
              <span>TRY FREE</span>
            </button>
          </CinemaToolHUD>

          {/* Title Toggle */}
          {(onToggleTitles || onChangeComponentsVisibility) && (
            <CinemaToolHUD
              title="TOGGLE KINETIC TITLES"
              en={`Show or hide all cinema typography overlays (currently ${effectiveShowTitles ? 'ON' : 'OFF'}).`}
              bn="স্ক্রিনের ওপর টাইটেল লেখাগুলো দেখাতে বা লুকাতে T বাটনে চাপুন।"
              shortcut="T"
              accent="amber"
              side="bottom"
            >
              <button
                type="button"
                onClick={handleTitleToggleClick}
                aria-pressed={effectiveShowTitles}
                data-active={effectiveShowTitles ? 'true' : 'false'}
                aria-label="Toggle Kinetic Hero Typography"
                className="cinema-tile cinema-tile-amber w-9 h-9 rounded-md flex items-center justify-center cursor-pointer"
              >
                <Type className="w-4 h-4 cinema-tile-icon" strokeWidth={2.3} />
              </button>
            </CinemaToolHUD>
          )}

          {/* Matrix Toggle */}
          {onToggleComponentsPopover && (
            <CinemaToolHUD
              title="COMPONENTS VISIBILITY MATRIX"
              en={`Layer controls active: ${componentsBadgeText}. Toggle titles, HUD & optical FX.`}
              bn="টাইটেল, গ্রিড ও ফিল্ম ইফেক্টের আলাদা আলাদা সুইচ খুলতে চাপুন।"
              shortcut="V"
              accent="amber"
              side="bottom"
            >
              <button
                type="button"
                onClick={onToggleComponentsPopover}
                aria-label="Open Components Visibility Matrix"
                className="cinema-tile cinema-tile-amber w-9 h-9 rounded-md flex items-center justify-center cursor-pointer"
              >
                <Layers className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
              </button>
            </CinemaToolHUD>
          )}

          {/* Shortcuts */}
          <CinemaToolHUD
            title="HOTKEY CHEATSHEET"
            en="Open complete keyboard transport, cut, and grading shortcuts."
            bn="দ্রুত কাজের সব কিবোর্ড শর্টকাট তালিকা দেখতে এখানে চাপুন।"
            shortcut="⇧?"
            accent="amber"
            side="bottom"
          >
            <button
              type="button"
              onClick={onOpenShortcuts}
              aria-label="Keyboard Shortcuts"
              className="cinema-tile cinema-tile-amber w-9 h-9 rounded-md flex items-center justify-center cursor-pointer"
            >
              <Keyboard className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
            </button>
          </CinemaToolHUD>

          {/* Right APPS Menu */}
          <div className="relative">
            <CinemaToolHUD
              title="ECOSYSTEM APPS"
              en="Launch Hub, Vault, R2 Stream, Bloom, Video Scopes, AI Lab & JSON backup."
              bn="সবগুলো স্টুডিও অ্যাপ এবং প্রজেক্ট সেভ/লোড মেনু খুলতে APPS চাপুন।"
              accent="cyan"
              side="bottom"
            >
              <button
                type="button"
                onClick={() => {
                  setIsEcosystemMenuOpen((prev) => !prev);
                  setIsExportMenuOpen(false);
                }}
                data-active={isEcosystemMenuOpen ? 'true' : 'false'}
                className="cinema-tile cinema-tile-cyan px-3 py-1.5 rounded-md font-black tracking-wider text-[10px] sm:text-[11px] uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                <span className="hidden sm:inline">APPS</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </CinemaToolHUD>

            {isEcosystemMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-64 bg-[#0B0C0F]/98 border border-[#26282E] rounded-xl shadow-2xl p-2 z-50 space-y-2 backdrop-blur-2xl animate-in fade-in duration-150"
                onMouseLeave={() => setIsEcosystemMenuOpen(false)}
              >
                <CinemaBadgeHeader
                  icon={<Globe className="w-3 h-3" />}
                  label="SUITE APPS"
                  accent="cyan"
                />

                <div className="grid grid-cols-2 gap-1.5">
                  <CinemaToolHUD
                    title="HUB CENTER"
                    en="Open main HandFilm web command hub."
                    bn="মূল ওয়েব কমান্ড হাব খুলতে HUB চাপুন।"
                    accent="amber"
                    side="left"
                    blockWrapper
                  >
                    <a
                      href="https://hub.handsandhead.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cinema-tile cinema-tile-amber w-full px-2 py-2 rounded-lg flex flex-col items-center gap-1 text-[10px] font-black tracking-wider uppercase"
                    >
                      <Globe className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                      <span>HUB</span>
                    </a>
                  </CinemaToolHUD>

                  <CinemaToolHUD
                    title="PROJECT VAULT"
                    en="Switch, duplicate, or manage saved projects."
                    bn="সেভ করা প্রজেক্ট ম্যানেজ করতে VAULT চাপুন।"
                    accent="amber"
                    side="left"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onOpenProjectManager?.();
                        setIsEcosystemMenuOpen(false);
                      }}
                      className="cinema-tile cinema-tile-amber w-full px-2 py-2 rounded-lg flex flex-col items-center gap-1 text-[10px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      <FolderOpen className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                      <span>VAULT</span>
                    </button>
                  </CinemaToolHUD>

                  <CinemaToolHUD
                    title="R2 EDGE STREAM"
                    en="Cloudflare R2 asset streaming & upload sync."
                    bn="ক্লাউডফ্লেয়ার R2 দিয়ে মিডিয়া সিঙ্ক করতে চাপুন।"
                    accent="crimson"
                    side="left"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onOpenR2Automation?.();
                        setIsEcosystemMenuOpen(false);
                      }}
                      className="cinema-tile cinema-tile-crimson w-full px-2 py-2 rounded-lg flex flex-col items-center gap-1 text-[10px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      <Cloud className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                      <span>R2 STREAM</span>
                    </button>
                  </CinemaToolHUD>

                  <CinemaToolHUD
                    title="BLOOM SEQUENCER"
                    en="Launch interactive optical Bloom sequencer node."
                    bn="গ্লো এবং ব্লুম সিকোয়েন্সার নোড খুলতে BLOOM চাপুন।"
                    accent="crimson"
                    side="left"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenBloomSequencer) onOpenBloomSequencer();
                        else if (onSelectMode) onSelectMode('BLOOM');
                        setIsEcosystemMenuOpen(false);
                      }}
                      className="cinema-tile cinema-tile-crimson w-full px-2 py-2 rounded-lg flex flex-col items-center gap-1 text-[10px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                      <span>BLOOM</span>
                    </button>
                  </CinemaToolHUD>

                  <CinemaToolHUD
                    title="VIDEO SCOPES"
                    en="RGB parade, waveform & luminance analysis monitor."
                    bn="ভিডিওর কালার ও এক্সপোজার স্কোপ দেখতে SCOPES চাপুন।"
                    accent="emerald"
                    side="left"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onOpenVideoScopes?.();
                        setIsEcosystemMenuOpen(false);
                      }}
                      className="cinema-tile cinema-tile-emerald w-full px-2 py-2 rounded-lg flex flex-col items-center gap-1 text-[10px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      <Activity className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                      <span>SCOPES</span>
                    </button>
                  </CinemaToolHUD>

                  <CinemaToolHUD
                    title="AI DIRECTOR LAB"
                    en="Generate prompts, shot beats, and visual ideas."
                    bn="এআই দিয়ে শট ও দৃশ্যের আইডিয়া পেতে AI LAB চাপুন।"
                    accent="amber"
                    side="left"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAiStudio?.();
                        setIsEcosystemMenuOpen(false);
                      }}
                      className="cinema-tile cinema-tile-amber w-full px-2 py-2 rounded-lg flex flex-col items-center gap-1 text-[10px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                      <span>AI LAB</span>
                    </button>
                  </CinemaToolHUD>

                  <CinemaToolHUD
                    title="SAVE SESSION JSON"
                    en="Download project state snapshot as local .json file."
                    bn="প্রজেক্টের বর্তমান অবস্থা কম্পিউটারে সেভ করতে SAVE JSON চাপুন।"
                    accent="cyan"
                    side="left"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSaveProjectJson?.();
                        setIsEcosystemMenuOpen(false);
                      }}
                      className="cinema-tile cinema-tile-cyan w-full px-2 py-2 rounded-lg flex flex-col items-center gap-1 text-[10px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      <Download className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                      <span>SAVE JSON</span>
                    </button>
                  </CinemaToolHUD>

                  <CinemaToolHUD
                    title="LOAD SESSION JSON"
                    en="Restore project session from a saved .json file."
                    bn="আগে সেভ করা JSON প্রজেক্ট ফাইল লোড করতে LOAD JSON চাপুন।"
                    accent="amber"
                    side="left"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onRestoreProjectJson?.();
                        setIsEcosystemMenuOpen(false);
                      }}
                      className="cinema-tile cinema-tile-amber w-full px-2 py-2 rounded-lg flex flex-col items-center gap-1 text-[10px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      <FolderOpen className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                      <span>LOAD JSON</span>
                    </button>
                  </CinemaToolHUD>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10">
                  <CinemaToolHUD
                    title="STUDIO SETTINGS"
                    en="Preferences, quotas, and hardware diagnostics."
                    bn="স্টুডিওর মূল সেটিংস খুলতে SETTINGS চাপুন।"
                    accent="cyan"
                    side="left"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenSettingsModal) onOpenSettingsModal();
                        else if (onOpenThemeSettings) onOpenThemeSettings();
                        setIsEcosystemMenuOpen(false);
                      }}
                      className="cinema-tile cinema-tile-cyan w-full px-2 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 cinema-tile-icon" />
                      <span>SETTINGS</span>
                    </button>
                  </CinemaToolHUD>

                  <CinemaToolHUD
                    title="KEYBOARD SHORTCUTS"
                    en="View editorial transport & grading hotkeys."
                    bn="সব শর্টকাট কী দেখতে HOTKEYS চাপুন।"
                    shortcut="?"
                    accent="amber"
                    side="left"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onOpenShortcuts?.();
                        setIsEcosystemMenuOpen(false);
                      }}
                      className="cinema-tile cinema-tile-amber w-full px-2 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-black tracking-wider uppercase cursor-pointer"
                    >
                      <Keyboard className="w-3.5 h-3.5 cinema-tile-icon" />
                      <span>HOTKEYS</span>
                    </button>
                  </CinemaToolHUD>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
