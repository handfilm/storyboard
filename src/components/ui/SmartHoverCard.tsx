/**
 * @file /src/components/ui/SmartHoverCard.tsx
 * @description Floating Explanatory Hover Card for Google Flow & Editorial Brutalist UI.
 * Provides high-contrast, informative guidance cards with smooth micro-animations.
 */

import React from 'react';

export interface SmartHoverCardProps {
  code?: string;
  title?: string;
  description: string;
  shortcut?: string;
  badge?: string;
  align?: 'left' | 'center' | 'right';
  side?: 'bottom' | 'top';
  children: React.ReactNode;
  className?: string;
  footerTelemetry?: string;
  cardClassName?: string;
}

export const SmartHoverCard: React.FC<SmartHoverCardProps> = ({
  code,
  title,
  description,
  shortcut,
  badge,
  align = 'center',
  side = 'bottom',
  children,
  className = '',
  footerTelemetry,
  cardClassName = ''
}) => {
  const alignClass = 
    align === 'left' ? 'left-0' :
    align === 'right' ? 'right-0' :
    'left-1/2 -translate-x-1/2';

  const positionClass = 
    side === 'top' 
      ? 'bottom-full mb-2' 
      : 'top-full mt-2.5';

  return (
    <div className={`relative inline-flex items-center group/smart-card ${className}`}>
      {children}

      {/* Floating Dark Glass Explanatory Card */}
      <div 
        role="tooltip"
        className={`pointer-events-none absolute ${positionClass} ${alignClass} z-50 w-64 sm:w-72 p-3 rounded-lg bg-[#0E1015]/95 border border-white/10 shadow-[0_20px_45px_rgba(0,0,0,0.95),0_0_15px_rgba(229,9,20,0.12)] backdrop-blur-2xl opacity-0 translate-y-1 group-hover/smart-card:opacity-100 group-hover/smart-card:translate-y-0 transition-all duration-200 select-none text-left ${cardClassName}`}
      >
        {/* Card Header: Amber telemetry code + optional shortcut/badge */}
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10">
          <span className="text-[10px] font-mono font-bold text-[#F5A623] tracking-wider uppercase">
            {code || title || 'HANDFILM // COMMAND'}
          </span>
          <div className="flex items-center gap-1.5">
            {badge && (
              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-white/5 border border-white/10 text-zinc-400 uppercase">
                {badge}
              </span>
            )}
            {shortcut && (
              <kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-zinc-700 text-[#FFE066] font-mono text-[9px] shadow-sm">
                {shortcut}
              </kbd>
            )}
          </div>
        </div>

        {/* Card Body: High-contrast descriptive body */}
        <p className="text-[11px] font-sans text-zinc-200 leading-relaxed font-normal">
          {description}
        </p>

        {/* Subtle accent indicator line or custom telemetry */}
        <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[8.5px] font-mono text-zinc-500">
          {footerTelemetry ? (
            <span className="text-zinc-400 font-mono tracking-wider text-[8px] truncate">
              {footerTelemetry}
            </span>
          ) : (
            <>
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-pulse" />
                DIRECTOR DESK
              </span>
              <span className="text-zinc-500">0ms LOCAL</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
