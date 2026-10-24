/**
 * @file /src/components/menus/EcosystemLauncherModal.tsx
 * @description Mega Ecosystem Launcher (Omniverse Central Command OS) for handsandhead.com.
 * Houses 25+ categorized subdomains across Commerce, Studio, Creator Tools,
 * Kids, Physical Atelier, Lifestyle Blogs, and Concept Libraries in a stunning glassmorphic grid.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  ExternalLink, 
  Globe, 
  Film, 
  Wrench, 
  Sparkles, 
  Package, 
  Compass, 
  Flame, 
  Building2, 
  ShieldCheck, 
  ShoppingBag, 
  Layers, 
  FolderLock, 
  Activity, 
  Cloud, 
  Music, 
  Image as ImageIcon, 
  CreditCard, 
  FileText, 
  Smile, 
  Scissors, 
  Shirt, 
  Briefcase, 
  Leaf, 
  Watch, 
  User, 
  BookOpen, 
  Dumbbell, 
  Coffee, 
  Heart, 
  Lock,
  Mic,
  PenTool,
  Check
} from 'lucide-react';
import { 
  ECOSYSTEM_CATEGORIES, 
  EcosystemAppItem, 
  TOTAL_ECOSYSTEM_COUNT 
} from '../../constants/ecosystemApps';

export interface EcosystemLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNeuralVox?: () => void;
  onOpenVectorForge?: () => void;
  onOpenMasteringBus?: () => void;
  onOpenColorLab?: () => void;
  onOpenProjectManager?: () => void;
  onOpenR2Automation?: () => void;
  onOpenBloomSequencer?: () => void;
  onOpenVideoScopes?: () => void;
  onOpenAiStudio?: () => void;
  className?: string;
}

export const EcosystemLauncherModal: React.FC<EcosystemLauncherModalProps> = ({
  isOpen,
  onClose,
  onOpenNeuralVox,
  onOpenVectorForge,
  onOpenMasteringBus,
  onOpenColorLab,
  onOpenProjectManager,
  onOpenR2Automation,
  onOpenBloomSequencer,
  onOpenVideoScopes,
  onOpenAiStudio,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Icon mapping helper
  const renderAppIcon = (iconName: string) => {
    const iconClass = "w-4 h-4 text-white/60 group-hover:text-amber-400 group-hover:scale-110 transition-all";
    switch (iconName) {
      case 'Building2': return <Building2 className={iconClass} />;
      case 'ShieldCheck': return <ShieldCheck className={iconClass} />;
      case 'ShoppingBag': return <ShoppingBag className={iconClass} />;
      case 'Layers': return <Layers className={iconClass} />;
      case 'FolderLock': return <FolderLock className={iconClass} />;
      case 'Activity': return <Activity className={iconClass} />;
      case 'Cloud': return <Cloud className={iconClass} />;
      case 'Music': return <Music className={iconClass} />;
      case 'Image': return <ImageIcon className={iconClass} />;
      case 'CreditCard': return <CreditCard className={iconClass} />;
      case 'FileText': return <FileText className={iconClass} />;
      case 'Smile': return <Smile className={iconClass} />;
      case 'Sparkles': return <Sparkles className={iconClass} />;
      case 'Scissors': return <Scissors className={iconClass} />;
      case 'Shirt': return <Shirt className={iconClass} />;
      case 'Briefcase': return <Briefcase className={iconClass} />;
      case 'Leaf': return <Leaf className={iconClass} />;
      case 'Watch': return <Watch className={iconClass} />;
      case 'User': return <User className={iconClass} />;
      case 'BookOpen': return <BookOpen className={iconClass} />;
      case 'Dumbbell': return <Dumbbell className={iconClass} />;
      case 'Coffee': return <Coffee className={iconClass} />;
      case 'Heart': return <Heart className={iconClass} />;
      case 'Lock': return <Lock className={iconClass} />;
      default: return <Globe className={iconClass} />;
    }
  };

  // Filter apps across all categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return ECOSYSTEM_CATEGORIES;
    const q = searchQuery.toLowerCase().trim();
    return ECOSYSTEM_CATEGORIES.map(category => {
      const matchedApps = category.apps.filter(app => 
        app.name.toLowerCase().includes(q) ||
        app.subdomain.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        (app.badge && app.badge.toLowerCase().includes(q))
      );
      return {
        ...category,
        apps: matchedApps
      };
    }).filter(category => category.apps.length > 0);
  }, [searchQuery]);

  const handleLaunchApp = (app: EcosystemAppItem, e: React.MouseEvent) => {
    // Intercept internal routing if app aligns with active workspace feature
    if (app.id === 'vault' && onOpenProjectManager) {
      e.preventDefault();
      onOpenProjectManager();
      onClose();
      return;
    }
    if (app.id === 'r2' && onOpenR2Automation) {
      e.preventDefault();
      onOpenR2Automation();
      onClose();
      return;
    }
    if (app.id === 'bloom' && onOpenBloomSequencer) {
      e.preventDefault();
      onOpenBloomSequencer();
      onClose();
      return;
    }
    if (app.id === 'deeper' && onOpenVideoScopes) {
      e.preventDefault();
      onOpenVideoScopes();
      onClose();
      return;
    }

    // Default: Open in new tab
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={menuRef}
      className={`w-[800px] max-w-[95vw] max-h-[82vh] overflow-y-auto bg-[#08090C]/95 backdrop-blur-3xl border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.98),0_0_40px_rgba(245,166,35,0.12)] rounded-2xl z-[9999] absolute top-14 right-4 p-5 sm:p-6 text-white font-mono select-none animate-in fade-in zoom-in-95 duration-150 custom-scrollbar ${className}`}
    >
      {/* 1. Header: Command Center Banner + Close */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,166,35,0.3)]">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black tracking-wider text-white">
                HANDSANDHEAD // OMNIVERSE COMMAND OS
              </span>
              <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                {TOTAL_ECOSYSTEM_COUNT} SUBDOMAINS
              </span>
            </div>
            <p className="text-[9.5px] text-zinc-400">
              Central ecosystem directory across commerce, studio, physical atelier & creator tools
            </p>
          </div>
        </div>

        <button 
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Close Mega Launcher [ESC]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Omni-Studio Active Tools Quick Bar */}
      <div className="mb-4 p-2.5 rounded-xl bg-black/60 border border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
          <span className="text-[10px] font-bold text-amber-300 uppercase">LOCAL STUDIO SUITE:</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9.5px] font-bold flex items-center gap-1.5">
            <Film className="w-3 h-3" />
            <span>🎬 HANDFILM NLE (ACTIVE)</span>
          </div>

          {onOpenNeuralVox && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNeuralVox();
              }}
              className="px-2.5 py-1 rounded-md bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/40 hover:border-red-400 text-[9.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Mic className="w-3 h-3 text-red-400" />
              <span>🗣️ NEURAL VOX</span>
            </button>
          )}

          {onOpenVectorForge && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenVectorForge();
              }}
              className="px-2.5 py-1 rounded-md bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 text-[9.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PenTool className="w-3 h-3 text-cyan-400" />
              <span>✒️ VECTOR FORGE</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="relative mb-5">
        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input 
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter 25+ subdomains (e.g. 'b2b', 'vault', 'leather', 'aural', 'food')..."
          className="w-full h-9 pl-9 pr-8 bg-black/60 border border-white/10 hover:border-white/20 focus:border-amber-500/70 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
        />
        {searchQuery && (
          <button 
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 4. Categorized CSS Grid Layout */}
      {filteredCategories.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 text-xs">
          No subdomains match "{searchQuery}". Try searching for 'studio', 'textile', or 'tools'.
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((category) => (
            <div key={category.id} className="space-y-2.5">
              {/* Category Header */}
              <div className="text-[10px] text-amber-500 font-mono tracking-[0.2em] uppercase flex items-center justify-between border-b border-white/5 pb-1">
                <span>{category.title}</span>
                {category.badge && (
                  <span className="text-[8px] text-zinc-500 font-normal">
                    {category.badge}
                  </span>
                )}
              </div>

              {/* 3-Column Responsive App Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {category.apps.map((app) => (
                  <a
                    key={app.id}
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => handleLaunchApp(app, e)}
                    className="h-14 bg-white/[0.02] border border-white/5 rounded-lg flex items-center px-3 gap-3 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group text-left relative overflow-hidden"
                    title={`${app.name} — ${app.description}`}
                  >
                    {/* Left Icon Block */}
                    <div className="w-8 h-8 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-amber-400/50 group-hover:bg-amber-500/10 transition-colors">
                      {renderAppIcon(app.iconName)}
                    </div>

                    {/* App Name & Subdomain Stack */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="text-white/90 text-xs font-bold truncate group-hover:text-white flex items-center gap-1.5">
                        <span className="truncate">{app.name}</span>
                        {app.badge && (
                          <span className="text-[7.5px] px-1 py-0.2 rounded bg-white/5 text-zinc-400 border border-white/10 font-normal shrink-0">
                            {app.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-white/40 text-[9px] font-mono group-hover:text-amber-300 truncate transition-colors">
                        {app.subdomain}
                      </div>
                    </div>

                    {/* Hover External Arrow Indicator */}
                    <ExternalLink className="w-3 h-3 text-white/30 group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Footer Telemetry */}
      <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between text-[8.5px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-pulse" />
          <span>HANDFILM ZERO-CLOUD NLE // OMNIVERSE CONNECTOR</span>
        </span>
        <span>PRESS [ESC] TO CLOSE</span>
      </div>
    </div>
  );
};
