/**
 * @file /src/components/bridge/EditInAppStrip.tsx
 * @description Zero-Prompt "EDIT IN" External App Launcher Strip with authentic
 * vector marks for Adobe Photoshop (Ps), Premiere Pro (Pr), Illustrator (Ai), and CapCut.
 * One click immediately writes scratch media and arms the live auto-sync file watcher.
 */

import React, { useState } from 'react';
import { AnthologyFrame } from '../../types/anthology';
import { ExternalEditApp, launchExternalEdit } from '../../services/editInBridge';

export interface EditInAppStripProps {
  shotIndex: number;
  frame?: AnthologyFrame | null;
  variant?: 'hud' | 'context' | 'drawer';
  onLaunched?: (app: ExternalEditApp) => void;
  className?: string;
}

interface AppDescriptor {
  id: ExternalEditApp;
  code: string;
  label: string;
  accent: string;
  bgHex: string;
  fgHex: string;
  title: string;
}

const EDIT_IN_APPS: AppDescriptor[] = [
  {
    id: 'photoshop',
    code: 'Ps',
    label: 'Photoshop',
    accent: '#31A8FF',
    bgHex: '#001E36',
    fgHex: '#31A8FF',
    title: 'Edit In Adobe Photoshop (Instant 1-Click + Ctrl+S Live Sync)'
  },
  {
    id: 'premiere',
    code: 'Pr',
    label: 'Premiere Pro',
    accent: '#9999FF',
    bgHex: '#00005B',
    fgHex: '#9999FF',
    title: 'Edit In Adobe Premiere Pro (Instant 1-Click + Live Sync)'
  },
  {
    id: 'illustrator',
    code: 'Ai',
    label: 'Illustrator',
    accent: '#FF9A00',
    bgHex: '#330000',
    fgHex: '#FF9A00',
    title: 'Edit In Adobe Illustrator (Instant 1-Click + Ctrl+S Live Sync)'
  },
  {
    id: 'capcut',
    code: 'CC',
    label: 'CapCut',
    accent: '#F4F4F5',
    bgHex: '#0A0A0C',
    fgHex: '#FFFFFF',
    title: 'Edit In CapCut Desktop (Instant 1-Click + Live Sync)'
  }
];

const AppBrandBadgeSvg: React.FC<{ app: AppDescriptor; size?: number }> = ({ app, size = 18 }) => {
  if (app.id === 'capcut') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="0.75" y="0.75" width="22.5" height="22.5" rx="5.25" fill="#0A0A0C" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
        <path
          d="M6.5 8.1L14.2 12L6.5 15.9V13.8L10.3 12L6.5 10.2V8.1Z"
          fill="#FFFFFF"
        />
        <path
          d="M17.5 8.1L11.6 11.1L13.5 12L17.5 10.0V8.1ZM17.5 15.9V14.0L13.5 12L11.6 12.9L17.5 15.9Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="0.75"
        y="0.75"
        width="22.5"
        height="22.5"
        rx="5"
        fill={app.bgHex}
        stroke={app.fgHex}
        strokeOpacity="0.65"
        strokeWidth="1.25"
      />
      <text
        x="12"
        y="15.8"
        textAnchor="middle"
        fill={app.fgHex}
        fontFamily="Space Grotesk, Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize="11.2"
        letterSpacing="-0.4"
      >
        {app.code}
      </text>
    </svg>
  );
};

export const EditInAppStrip: React.FC<EditInAppStripProps> = ({
  shotIndex,
  frame,
  variant = 'hud',
  onLaunched,
  className = ''
}) => {
  const [launchingApp, setLaunchingApp] = useState<ExternalEditApp | null>(null);

  const handleClick = (e: React.MouseEvent, app: ExternalEditApp) => {
    e.stopPropagation();
    setLaunchingApp(app);
    void launchExternalEdit({ app, shotIndex, frame }).finally(() => {
      window.setTimeout(() => {
        setLaunchingApp((cur) => (cur === app ? null : cur));
      }, 650);
    });
    onLaunched?.(app);
  };

  if (variant === 'context') {
    return (
      <div
        data-testid="edit-in-app-strip-context"
        className={`flex flex-col gap-1 ${className}`}
      >
        <div className="px-1 pt-0.5 text-[8px] font-mono font-bold tracking-widest uppercase text-[#8E8E93] flex items-center justify-between">
          <span>EDIT IN · ZERO-PROMPT</span>
          <span className="text-[#F59E0B]">LIVE SYNC</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {EDIT_IN_APPS.map((app) => {
            const isBusy = launchingApp === app.id;
            return (
              <button
                key={app.id}
                type="button"
                data-testid={`edit-in-${app.id}`}
                onClick={(e) => handleClick(e, app.id)}
                title={app.title}
                style={{ '--item-accent': app.accent } as React.CSSProperties}
                className={`nle-editorial-btn px-1.5 py-1 rounded bg-[#141417] border border-white/[0.08] text-[9.5px] font-mono font-bold text-[#F4F4F5] flex items-center gap-1.5 cursor-pointer ${
                  isBusy ? 'ring-1 ring-[#F59E0B]' : ''
                }`}
              >
                <AppBrandBadgeSvg app={app} size={17} />
                <span className="truncate">{app.id === 'capcut' ? 'CapCut' : app.code}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === 'drawer') {
    return (
      <div
        data-testid="edit-in-app-strip-drawer"
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#0E0F14]/95 border border-white/[0.08] ${className}`}
      >
        <span className="text-[9px] font-mono font-bold tracking-[0.14em] uppercase text-[#8E8E93] whitespace-nowrap mr-0.5">
          EDIT IN:
        </span>
        {EDIT_IN_APPS.map((app) => {
          const isBusy = launchingApp === app.id;
          return (
            <button
              key={app.id}
              type="button"
              data-testid={`edit-in-${app.id}`}
              onClick={(e) => handleClick(e, app.id)}
              title={app.title}
              style={{ '--item-accent': app.accent } as React.CSSProperties}
              className={`nle-editorial-btn h-7 px-2 rounded-md bg-[#141417] border border-white/[0.08] text-[10px] font-mono font-bold text-[#F4F4F5] flex items-center gap-1.5 cursor-pointer ${
                isBusy ? 'ring-1 ring-[#F59E0B] scale-95' : ''
              }`}
            >
              <AppBrandBadgeSvg app={app} size={18} />
              <span className="hidden md:inline whitespace-nowrap">{app.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Default 'hud' variant for 28px StageMetadataFxBar
  return (
    <div
      data-testid="edit-in-app-strip-hud"
      data-active="true"
      className={`hidden lg:inline-flex items-center gap-1 px-1.5 py-0 h-[16px] rounded bg-[#141417] border border-white/[0.08] shrink-0 ${className}`}
      role="group"
      aria-label="Edit In External App"
    >
      <span className="text-[7.5px] font-mono font-bold tracking-wider uppercase text-[#8E8E93] mr-0.5 leading-none">
        EDIT IN
      </span>
      {EDIT_IN_APPS.map((app) => {
        const isBusy = launchingApp === app.id;
        return (
          <button
            key={app.id}
            type="button"
            data-testid={`edit-in-${app.id}`}
            onClick={(e) => handleClick(e, app.id)}
            title={app.title}
            style={{ '--item-accent': app.accent } as React.CSSProperties}
            className={`nle-editorial-btn rounded-[3px] p-0 cursor-pointer flex items-center justify-center ${
              isBusy ? 'ring-1 ring-[#F59E0B] scale-95' : ''
            }`}
          >
            <AppBrandBadgeSvg app={app} size={13} />
          </button>
        );
      })}
    </div>
  );
};
