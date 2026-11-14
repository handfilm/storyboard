import React from 'react';
import { CinemaToolHUD } from './CinemaToolHUD';
import type { CinemaHudAccent } from '../../constants/cinemaToolHudMap';

export interface ToolTooltipProps {
  title: string;
  why: string;
  how: string;
  bn?: string;
  accent?: CinemaHudAccent;
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
  placement?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Reusable workstation tooltip backed by universal <CinemaToolHUD />.
 * Preserves legacy {title, why, how} callers while upgrading to viewport-clamped
 * portal rendering, mobile long-press, Guide Mode inspection, and Bangla how-to.
 */
export const ToolTooltip: React.FC<ToolTooltipProps> = ({
  title,
  why,
  how,
  bn,
  accent = 'amber',
  children,
  delayMs = 130,
  className = '',
  placement = 'top',
}) => {
  return (
    <CinemaToolHUD
      title={title}
      en={why}
      bn={bn || how}
      accent={accent}
      side={placement}
      delayMs={delayMs}
      className={className}
    >
      {children}
    </CinemaToolHUD>
  );
};
