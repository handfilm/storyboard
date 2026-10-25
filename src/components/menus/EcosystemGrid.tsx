import React, { useEffect } from 'react';

export interface EcosystemProjectItem {
  id: string;
  title: string;
  sub: string;
  url: string;
  image: string;
}

export const ECOSYSTEM_PROJECTS: EcosystemProjectItem[] = [
  {
    id: 'handfilm',
    title: 'HANDFILM STUDIO',
    sub: 'B2B Video Engine',
    url: 'https://b2b.handsandhead.com',
    image: 'https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?q=80&w=800'
  },
  {
    id: 'rawx',
    title: 'RAWx APPAREL',
    sub: 'Full-Grain Leather Jackets',
    url: 'https://handsandhead.com',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800'
  },
  {
    id: 'arutemika',
    title: 'ARUTEMIKA',
    sub: 'Goodyear Welted Boots',
    url: 'https://handsandhead.com',
    image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800'
  },
  {
    id: 'bloom',
    title: 'KHUKIR BAGAN',
    sub: 'Bangla Smart TV App',
    url: 'https://play.google.com/store/apps',
    image: 'https://images.unsplash.com/photo-1512626120412-faf41adb4874?q=80&w=800'
  },
  {
    id: 'nexos',
    title: 'NexOS / B2B HUB',
    sub: 'React & Next.js Portals',
    url: 'https://account.handsandhead.com',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800'
  }
];

export const EcosystemGrid = ({ onClose }: { onClose: () => void }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[99999] bg-[#050505]/95 backdrop-blur-3xl overflow-y-auto p-12 p-12! pointer-events-auto">
      <div className="flex justify-between items-center mb-12 mb-12!">
        <h1 className="text-4xl font-black text-white uppercase tracking-widest">[ THE HIMON ECOSYSTEM ]</h1>
        <button
          type="button"
          onClick={onClose}
          className="text-white/50 hover:text-white cursor-pointer text-sm font-bold tracking-widest px-3! py-1.5! transition-colors"
        >
          CLOSE ✕
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ECOSYSTEM_PROJECTS.map((proj) => (
          <div
            key={proj.id}
            className="group relative bg-[#0A0C10] border border-white/10 rounded-xl overflow-hidden flex flex-col"
          >
            <div className="h-48 overflow-hidden bg-gradient-to-br from-[#12151E] via-[#0B0D13] to-[#06070A]">
              <img
                src={proj.image}
                alt={proj.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
              />
            </div>
            <div className="p-6 p-6! flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">{proj.title}</h3>
                <p className="text-sm text-white/50 mt-1 mt-1!">{proj.sub}</p>
              </div>
              {/* NATIVE HTML ANCHOR TAG FOR GUARANTEED ROUTING */}
              <a
                href={proj.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 mt-6! block w-full py-3 py-3! border border-white/20 text-center text-xs font-bold text-white tracking-widest hover:bg-white hover:text-black transition-colors no-underline cursor-pointer pointer-events-auto"
              >
                [ LAUNCH // ENTER ENGINE ]
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EcosystemGrid;
