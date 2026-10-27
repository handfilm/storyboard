import React, { useEffect } from 'react';
import { ECOSYSTEM_DATA } from '../../constants/ecosystemApps';

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
    <div className="fixed inset-0 z-[99999] bg-[#050505]/95 backdrop-blur-3xl overflow-y-auto px-6 py-12 md:px-16 md:py-16">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex justify-between items-center pb-8 border-b border-white/10 mb-12">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-widest font-mono">
            [ THE HIMON ECOSYSTEM ]
          </h1>
          <p className="text-xs md:text-sm text-white/40 font-mono tracking-wider mt-2">
            25+ DISTRIBUTED ARCHITECTURES // CENTRAL COMMAND OS
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white font-mono text-sm tracking-widest px-4 py-2 border border-white/10 rounded-md hover:bg-white/5 transition-all cursor-pointer"
        >
          CLOSE ✕
        </button>
      </div>

      {/* CATEGORY & CARD STACK */}
      <div className="max-w-7xl mx-auto space-y-16">
        {ECOSYSTEM_DATA.map((group) => (
          <div key={group.categoryName} className="space-y-6">
            <h2 className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-amber-500 border-l-2 border-amber-500 pl-3">
              // {group.categoryName}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {group.projects.map((proj) => (
                <div
                  key={proj.id}
                  className="group relative bg-[#0A0C10] border border-white/10 rounded-2xl overflow-hidden flex flex-col hover:border-white/30 transition-all duration-300 shadow-2xl"
                >
                  {/* CARD IMAGE */}
                  <div className="h-52 w-full overflow-hidden bg-black/40 relative">
                    <img
                      src={proj.image}
                      alt={proj.title}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                      loading="lazy"
                    />
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono text-white/70 uppercase tracking-widest border border-white/10">
                      {proj.category}
                    </div>
                  </div>

                  {/* CARD DETAILS */}
                  <div className="p-6 flex-1 flex flex-col justify-between bg-gradient-to-b from-[#0A0C10] to-[#050608]">
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono">
                        {proj.title}
                      </h3>
                      <p className="text-xs text-white/50 font-mono mt-1 leading-relaxed">
                        {proj.sub}
                      </p>
                    </div>

                    {/* NATIVE LINK ANCHOR */}
                    <a
                      href={proj.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-6 block w-full py-3 bg-white/[0.03] border border-white/15 text-center text-[10px] font-mono font-bold text-white tracking-[0.2em] rounded-lg uppercase hover:bg-white hover:text-black transition-all duration-200 cursor-pointer"
                    >
                      [ LAUNCH // ENTER ENGINE ] ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EcosystemGridModal;
