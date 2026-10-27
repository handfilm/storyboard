/**
 * @file /src/components/menus/EcosystemGridModal.tsx
 * @description Full-screen visual card launcher titled "[ THE HIMON ECOSYSTEM ]"
 * matching the cinema reference design. Integrates the creator's complete 25+ domain portfolio
 * grouped into editorial categories with high-contrast Unsplash imagery and native outbound launch anchors.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, ExternalLink, Globe } from 'lucide-react';
import { 
  ECOSYSTEM_DATA, 
  EcosystemProject, 
  EcosystemCategory,
  TOTAL_ECOSYSTEM_COUNT 
} from '../../constants/ecosystemApps';

export interface EcosystemGridModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EcosystemGridModal: React.FC<EcosystemGridModalProps> = ({
  isOpen,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape & Lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);
    } else {
      setSearchQuery('');
      setSelectedCategory('ALL');
    }
  }, [isOpen]);

  // Categories list with counts
  const categoryOptions = useMemo(() => {
    const list = [
      { name: 'ALL', label: `ALL (${TOTAL_ECOSYSTEM_COUNT})` }
    ];
    ECOSYSTEM_DATA.forEach((cat) => {
      list.push({
        name: cat.categoryName,
        label: `${cat.categoryName} (${cat.projects.length})`
      });
    });
    return list;
  }, []);

  // Filtered dataset
  const filteredCategories: EcosystemCategory[] = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return ECOSYSTEM_DATA
      .filter((cat) => {
        if (selectedCategory === 'ALL') return true;
        return cat.categoryName === selectedCategory;
      })
      .map((cat) => {
        if (!query) return cat;

        const matchedProjects = cat.projects.filter((p) => {
          return (
            p.title.toLowerCase().includes(query) ||
            p.sub.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query) ||
            p.url.toLowerCase().includes(query)
          );
        });

        return {
          categoryName: cat.categoryName,
          projects: matchedProjects
        };
      })
      .filter((cat) => cat.projects.length > 0);
  }, [searchQuery, selectedCategory]);

  const totalMatchingCount = useMemo(() => {
    return filteredCategories.reduce((acc, cat) => acc + cat.projects.length, 0);
  }, [filteredCategories]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-[#050505]/95 backdrop-blur-3xl overflow-y-auto p-6 md:p-12 pointer-events-auto select-none font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col min-h-full">
        {/* Top Header Block matching reference */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-amber-400 text-2xl font-mono">㗊</span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase tracking-widest font-mono">
                [ THE HIMON ECOSYSTEM ]
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-white/50 mt-1.5 font-mono tracking-wider flex items-center gap-2">
              <span>HIMON ARCHITECTURE</span>
              <span>•</span>
              <span className="text-amber-400/90 font-bold">{TOTAL_ECOSYSTEM_COUNT} PRODUCTION DOMAINS</span>
              <span>•</span>
              <span>7 EDITORIAL CATEGORIES</span>
            </p>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/20 text-white/70 hover:text-white cursor-pointer text-xs font-mono font-bold tracking-widest transition-all flex items-center gap-2"
              title="Close Ecosystem Matrix [ESC]"
            >
              <span>CLOSE ✕</span>
              <span className="text-[10px] text-zinc-500 font-normal">[ESC]</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mb-10 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across 28 domains (e.g. 'b2b', 'vault', 'leather', 'bloom', 'aural')..."
                className="w-full h-11 pl-10 pr-9 bg-[#0A0C10] border border-white/15 focus:border-amber-400/80 rounded-xl text-xs sm:text-sm font-mono text-white placeholder-zinc-500 focus:outline-none transition-colors shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Status / Total Matching Indicator */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0A0C10] border border-white/10 text-xs font-mono text-zinc-400 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span>SHOWING: <strong className="text-white">{totalMatchingCount}</strong> / {TOTAL_ECOSYSTEM_COUNT} DOMAINS</span>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categoryOptions.map((cat) => {
              const isActive = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-lg text-[10.5px] font-mono font-bold tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,166,35,0.25)]'
                      : 'bg-[#0A0C10] text-zinc-400 border-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty Search Result */}
        {filteredCategories.length === 0 ? (
          <div className="py-24 text-center border border-white/5 rounded-2xl bg-[#0A0C10]/40 font-mono">
            <Globe className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">No Domains Found</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
              No subdomains matched your query "{searchQuery}". Try searching for 'b2b', 'studio', 'leather', or 'audio'.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
              className="mt-4 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Category Sections */
          <div className="space-y-12 flex-1">
            {filteredCategories.map((catSection) => (
              <section key={catSection.categoryName} className="space-y-5">
                {/* Editorial Category Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-white/10 font-mono">
                  <div className="flex items-center gap-2.5">
                    <span className="text-amber-400 font-bold text-xs tracking-[0.25em] uppercase">
                      [ {catSection.categoryName} ]
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 border border-white/10">
                    {catSection.projects.length} {catSection.projects.length === 1 ? 'DOMAIN' : 'DOMAINS'}
                  </span>
                </div>

                {/* Card Grid matching reference 3-column layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {catSection.projects.map((proj: EcosystemProject) => {
                    const displayDomain = proj.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
                    return (
                      <div
                        key={proj.id}
                        className="group relative bg-[#0A0C10] border border-white/10 hover:border-amber-500/50 rounded-xl overflow-hidden flex flex-col transition-all duration-300 shadow-xl hover:shadow-[0_12px_40px_rgba(245,166,35,0.18)] hover:-translate-y-1"
                      >
                        {/* Top Image Banner */}
                        <div className="h-48 overflow-hidden bg-gradient-to-br from-[#12151E] via-[#0B0D13] to-[#06070A] relative">
                          <img
                            src={proj.image}
                            alt={proj.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                            loading="lazy"
                          />

                          {/* Subtle cinema vignette gradient */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C10] via-transparent to-black/30 pointer-events-none" />

                          {/* Category Badge */}
                          <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/15 text-[8.5px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                            {proj.category}
                          </div>

                          {/* Domain Pill */}
                          <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-mono text-zinc-300 group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>{displayDomain}</span>
                          </div>

                          {/* Top-Right Quick External Glyph */}
                          <div className="absolute top-3 right-3 w-6 h-6 rounded-md bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-amber-400 group-hover:border-amber-400/40 transition-colors">
                            <ExternalLink className="w-3 h-3" />
                          </div>
                        </div>

                        {/* Card Content Body */}
                        <div className="p-6 p-6! flex-1 flex flex-col justify-between font-mono">
                          <div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider group-hover:text-amber-300 transition-colors">
                              {proj.title}
                            </h3>
                            <p className="text-sm text-white/50 mt-1 mt-1! leading-relaxed">
                              {proj.sub}
                            </p>
                          </div>

                          {/* Native Outbound HTML Anchor Tag for Guaranteed Direct Routing */}
                          <a
                            href={proj.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-6 mt-6! block w-full py-3 py-3! border border-white/20 text-center text-xs font-bold text-white tracking-widest hover:bg-white hover:text-black group-hover:border-amber-400/60 group-hover:bg-amber-500/10 group-hover:text-amber-300 hover:group-hover:bg-white hover:group-hover:text-black transition-all no-underline cursor-pointer pointer-events-auto shadow-md"
                          >
                            [ LAUNCH // ENTER ENGINE ]
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Footer Telemetry */}
        <footer className="mt-16 pt-8 pb-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF2B2B] animate-pulse" />
            <span className="text-zinc-400 uppercase font-bold tracking-widest">
              HANDFILM ZERO-CLOUD CINEMA // THE HIMON ECOSYSTEM
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-500 tracking-wider">
              {TOTAL_ECOSYSTEM_COUNT} SUBDOMAINS ARCHIVAL MATRIX
            </span>
            <span>•</span>
            <span className="text-amber-400/80">PRESS [ESC] TO CLOSE</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default EcosystemGridModal;
