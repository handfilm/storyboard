/**
 * @file /src/components/ui/SmartHoverCard.tsx
 * @description Universal SmartHoverCard backed by <CinemaToolHUD /> so it portals cleanly
 * with viewport edge clamping, mobile long-press, Guide Mode, and Bangla instructions.
 */

import React from 'react';
import { CinemaToolHUD } from './CinemaToolHUD';
import type { CinemaHudAccent } from '../../constants/cinemaToolHudMap';

export interface SmartHoverCardProps {
  code?: string;
  title?: string;
  description: string;
  bn?: string;
  shortcut?: string;
  badge?: string;
  accent?: CinemaHudAccent;
  align?: 'left' | 'center' | 'right';
  side?: 'bottom' | 'top' | 'left' | 'right';
  children: React.ReactNode;
  className?: string;
  footerTelemetry?: string;
  cardClassName?: string;
}

export const SmartHoverCard: React.FC<SmartHoverCardProps> = ({
  code,
  title,
  description,
  bn,
  shortcut,
  accent = 'amber',
  side = 'bottom',
  children,
  className = '',
}) => {
  return (
    <CinemaToolHUD
      title={title || code || 'STUDIO COMMAND'}
      en={description}
      bn={bn || 'এই টুল বা কমান্ডটি চালু করতে ক্লিক বা ট্যাপ করুন।'}
      shortcut={shortcut}
      accent={accent}
      side={side}
      className={className}
    >
      {children}
    </CinemaToolHUD>
  );
};
