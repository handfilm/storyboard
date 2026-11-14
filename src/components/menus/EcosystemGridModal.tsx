import React, { useEffect } from 'react';
import { ExternalLink, LayoutGrid, X } from 'lucide-react';
import { ECOSYSTEM_DATA } from '../../constants/ecosystemApps';
import { CinemaBadgeHeader, CinemaToolHUD } from '../ui/CinemaToolHUD';

interface EcosystemGridModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EcosystemGridModal: React.FC<EcosystemGridModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-[#050505]/95 backdrop-blur-3xl overflow-y-auto px-4 py-8 md:px-12 md:py-12">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex justify-between items-center pb-6 border-b border-white/10 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#111215] border border-amber-500/40 flex items-center justify-center text-amber-400">
            <LayoutGrid className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider font-mono">
            APPS ECOSYSTEM
          </h1>
        </div>

        <CinemaToolHUD
          title="CLOSE APPS HUB"
          en="Return to the main HandFilm cinema workspace."
          bn="অ্যাপস গ্যালারি বন্ধ করে মূল স্টুডিওতে ফিরতে CLOSE চাপুন।"
          shortcut="ESC"
          accent="crimson"
        >
          <button
            type="button"
            onClick={onClose}
            className="cinema-tile cinema-tile-crimson px-3.5 py-2 rounded-lg font-black tracking-wider text-xs uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4 cinema-tile-icon" />
            <span>CLOSE</span>
          </button>
        </CinemaToolHUD>
      </div>

      {/* CATEGORY & COMPACT ICON CARD GRID */}
      <div className="max-w-7xl mx-auto space-y-10">
        {ECOSYSTEM_DATA.map((group) => (
          <div key={group.categoryName} className="space-y-4">
            <CinemaBadgeHeader
              icon={<LayoutGrid className="w-3.5 h-3.5" />}
              label={group.categoryName.split(' ')[0].toUpperCase()}
              accent="amber"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {group.projects.map((proj) => (
                <CinemaToolHUD
                  key={proj.id}
                  title={proj.title.toUpperCase()}
                  en={proj.sub}
                  bn={`${proj.title} অ্যাপটি নতুন ট্যাবে চালু করতে কার্ডে ক্লিক করুন।`}
                  accent="amber"
                  blockWrapper
                >
                  <a
                    href={proj.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="cinema-tile cinema-tile-amber w-full rounded-xl overflow-hidden flex flex-col cursor-pointer group"
                  >
                    <div className="h-32 sm:h-36 w-full overflow-hidden bg-black/50 relative">
                      <img
                        src={proj.image}
                        alt={proj.title}
                        className="w-full h-full object-cover opacity-75 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                        loading="lazy"
                      />
                      <span className="absolute top-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider text-amber-300 uppercase border border-white/10">
                        {proj.category}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between gap-2 bg-[#111215]">
                      <span className="text-[11px] font-black tracking-wider uppercase text-white truncate">
                        {proj.title}
                      </span>
                      <ExternalLink className="w-4 h-4 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                    </div>
                  </a>
                </CinemaToolHUD>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EcosystemGridModal;
