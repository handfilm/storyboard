import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { HelpCircle, Sparkles, X } from 'lucide-react';
import { CinemaHudAccent, CinemaHudDefinition, getCinemaHud } from '../../constants/cinemaToolHudMap';

export interface ActiveHudPayload extends CinemaHudDefinition {
  rect: { left: number; top: number; right: number; bottom: number; width: number; height: number };
  pinned?: boolean;
}

interface GuideModeState {
  isGuideMode: boolean;
  pinnedHud: ActiveHudPayload | null;
  toggleGuideMode: () => void;
  setGuideMode: (value: boolean) => void;
  setPinnedHud: (hud: ActiveHudPayload | null) => void;
  clearPinnedHud: () => void;
}

export const useGuideModeStore = create<GuideModeState>((set) => ({
  isGuideMode: false,
  pinnedHud: null,
  toggleGuideMode: () =>
    set((state) => ({
      isGuideMode: !state.isGuideMode,
      pinnedHud: null,
    })),
  setGuideMode: (value) => set({ isGuideMode: value, pinnedHud: value ? undefined : null }),
  setPinnedHud: (hud) => set({ pinnedHud: hud }),
  clearPinnedHud: () => set({ pinnedHud: null }),
}));

const ACCENT_STYLES: Record<
  CinemaHudAccent,
  { border: string; title: string; badge: string; bar: string; glow: string }
> = {
  amber: {
    border: 'border-amber-500/60',
    title: 'text-amber-400',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
    bar: 'bg-amber-400',
    glow: 'shadow-[0_18px_48px_rgba(0,0,0,0.94),0_0_26px_rgba(245,158,11,0.22)]',
  },
  cyan: {
    border: 'border-cyan-400/60',
    title: 'text-cyan-300',
    badge: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/35',
    bar: 'bg-cyan-400',
    glow: 'shadow-[0_18px_48px_rgba(0,0,0,0.94),0_0_26px_rgba(6,182,212,0.24)]',
  },
  crimson: {
    border: 'border-red-500/60',
    title: 'text-red-400',
    badge: 'bg-red-500/15 text-red-300 border-red-500/35',
    bar: 'bg-red-500',
    glow: 'shadow-[0_18px_48px_rgba(0,0,0,0.94),0_0_26px_rgba(239,68,68,0.24)]',
  },
  emerald: {
    border: 'border-emerald-400/60',
    title: 'text-emerald-300',
    badge: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/35',
    bar: 'bg-emerald-400',
    glow: 'shadow-[0_18px_48px_rgba(0,0,0,0.94),0_0_26px_rgba(16,185,129,0.24)]',
  },
};

const CARD_WIDTH = 296;
const CARD_ESTIMATED_HEIGHT = 152;
const VIEWPORT_PADDING = 12;

function computeClampedPosition(
  rect: ActiveHudPayload['rect'],
  preferredSide: 'top' | 'bottom' | 'left' | 'right' | 'auto' = 'auto'
): { left: number; top: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const cardW = Math.min(CARD_WIDTH, vw - VIEWPORT_PADDING * 2);

  let left = rect.left + rect.width / 2 - cardW / 2;
  let top = rect.top - CARD_ESTIMATED_HEIGHT - 10;

  if (preferredSide === 'bottom') {
    top = rect.bottom + 10;
  } else if (preferredSide === 'right') {
    left = rect.right + 12;
    top = rect.top + rect.height / 2 - CARD_ESTIMATED_HEIGHT / 2;
  } else if (preferredSide === 'left') {
    left = rect.left - cardW - 12;
    top = rect.top + rect.height / 2 - CARD_ESTIMATED_HEIGHT / 2;
  } else {
    // Auto-flip vertically if too close to top edge
    if (rect.top < CARD_ESTIMATED_HEIGHT + 24) {
      top = rect.bottom + 10;
    }
  }

  // Flip horizontal if left/right overflowed
  if (preferredSide === 'right' && left + cardW > vw - VIEWPORT_PADDING) {
    left = rect.left - cardW - 12;
  } else if (preferredSide === 'left' && left < VIEWPORT_PADDING) {
    left = rect.right + 12;
  }

  // Final strict viewport clamping so HUD never clips on mobile or desktop edges
  left = Math.max(VIEWPORT_PADDING, Math.min(vw - cardW - VIEWPORT_PADDING, left));
  top = Math.max(VIEWPORT_PADDING, Math.min(vh - CARD_ESTIMATED_HEIGHT - VIEWPORT_PADDING, top));

  return { left, top };
}

function formatBanglaLine(bn: string): string {
  const trimmed = bn.trim();
  if (trimmed.startsWith('কীভাবে ব্যবহার করবেন:')) {
    return trimmed.replace(/^কীভাবে ব্যবহার করবেন:\s*/, '');
  }
  return trimmed;
}

export const CinemaHudCard: React.FC<{
  hud: ActiveHudPayload;
  side?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  onClose?: () => void;
}> = ({ hud, side = 'auto', onClose }) => {
  const accent = hud.accent || 'amber';
  const style = ACCENT_STYLES[accent];
  const { left, top } = computeClampedPosition(hud.rect, side);
  const banglaText = formatBanglaLine(hud.bn);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="tooltip"
      data-testid="cinema-tool-hud-card"
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: 'min(296px, calc(100vw - 24px))',
        zIndex: 10050,
      }}
      onClick={(e) => e.stopPropagation()}
      className={`${hud.pinned ? 'pointer-events-auto' : 'pointer-events-none'} rounded-lg bg-[#0B0C0F]/95 border ${style.border} ${style.glow} backdrop-blur-xl text-left overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none`}
    >
      {/* Top category luminance strip */}
      <div className={`h-0.5 w-full ${style.bar}`} />

      <div className="p-3 space-y-2">
        {/* 1. BIG BOLD TITLE */}
        <div className="flex items-start justify-between gap-2">
          <div className={`text-xs sm:text-[13px] font-black tracking-wider uppercase leading-tight ${style.title}`}>
            {hud.title}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hud.shortcut && (
              <kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-zinc-700 text-zinc-200 font-mono text-[10px] font-bold leading-none">
                {hud.shortcut}
              </kbd>
            )}
            {hud.pinned && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close guide"
                className="p-0.5 rounded bg-white/10 hover:bg-white/20 text-zinc-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. SHORT ENGLISH EXPLANATION */}
        <p className="text-[11px] text-zinc-200 font-medium leading-snug">
          {hud.en}
        </p>

        {/* 3. DIRECT BANGLA HOW-TO */}
        <div className="pt-1.5 border-t border-white/10">
          <p className="font-bangla text-[11.5px] leading-snug text-zinc-100">
            <span className={`inline-block font-bold mr-1 px-1 py-0.5 rounded border text-[10px] ${style.badge}`}>
              কীভাবে ব্যবহার করবেন:
            </span>
            <span>{banglaText}</span>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * Mount once at the root (App.tsx) so long-press and `?` Guide Mode pinned HUD cards
 * render globally and dismiss cleanly on Escape or outside tap.
 */
export const CinemaHudRootOverlay: React.FC = () => {
  const pinnedHud = useGuideModeStore((s) => s.pinnedHud);
  const clearPinnedHud = useGuideModeStore((s) => s.clearPinnedHud);

  useEffect(() => {
    if (!pinnedHud) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearPinnedHud();
    };
    const onPointerDown = () => {
      clearPinnedHud();
    };
    window.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => {
      window.addEventListener('pointerdown', onPointerDown, { once: true });
    }, 30);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [pinnedHud, clearPinnedHud]);

  if (!pinnedHud) return null;
  return <CinemaHudCard hud={pinnedHud} onClose={clearPinnedHud} />;
};

export interface CinemaToolHUDProps {
  hud?: CinemaHudDefinition;
  hudId?: string;
  title?: string;
  en?: string;
  bn?: string;
  shortcut?: string;
  accent?: CinemaHudAccent;
  side?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  delayMs?: number;
  disabled?: boolean;
  className?: string;
  blockWrapper?: boolean;
  children: React.ReactNode;
}

export const CinemaToolHUD: React.FC<CinemaToolHUDProps> = ({
  hud,
  hudId,
  title,
  en,
  bn,
  shortcut,
  accent,
  side = 'auto',
  delayMs = 120,
  disabled = false,
  className = '',
  blockWrapper = false,
  children,
}) => {
  const isGuideMode = useGuideModeStore((s) => s.isGuideMode);
  const setPinnedHud = useGuideModeStore((s) => s.setPinnedHud);
  const [hoverHud, setHoverHud] = useState<ActiveHudPayload | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const resolvedHud: CinemaHudDefinition = hud
    ? hud
    : hudId
      ? getCinemaHud(hudId, { title, en, bn, shortcut, accent })
      : {
          title: title || 'STUDIO TOOL',
          en: en || 'Activates this studio action.',
          bn: bn || 'এই টুলটি ব্যবহার করতে বাটনে চাপুন।',
          shortcut,
          accent: accent || 'amber',
        };

  const getRect = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
      width: r.width,
      height: r.height,
    };
  }, []);

  const openHover = useCallback(() => {
    if (disabled) return;
    if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
    const delay = isGuideMode ? 0 : delayMs;
    hoverTimerRef.current = window.setTimeout(() => {
      const rect = getRect();
      if (rect && (rect.width > 0 || rect.height > 0)) {
        setHoverHud({ ...resolvedHud, rect, pinned: false });
      }
    }, delay);
  }, [disabled, isGuideMode, delayMs, getRect, resolvedHud]);

  const closeHover = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoverHud(null);
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      longPressTriggeredRef.current = false;
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        clearLongPress();
        longPressTimerRef.current = window.setTimeout(() => {
          const rect = getRect();
          if (rect) {
            longPressTriggeredRef.current = true;
            setPinnedHud({ ...resolvedHud, rect, pinned: true });
          }
        }, 420);
      }
    },
    [disabled, clearLongPress, getRect, resolvedHud, setPinnedHud]
  );

  const handleClickCapture = useCallback(
    (e: React.MouseEvent) => {
      if (longPressTriggeredRef.current) {
        e.preventDefault();
        e.stopPropagation();
        longPressTriggeredRef.current = false;
        return;
      }
      if (isGuideMode && !disabled) {
        e.preventDefault();
        e.stopPropagation();
        const rect = getRect();
        if (rect) {
          setPinnedHud({ ...resolvedHud, rect, pinned: true });
        }
      }
    },
    [isGuideMode, disabled, getRect, resolvedHud, setPinnedHud]
  );

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
      if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={openHover}
      onMouseLeave={closeHover}
      onFocus={openHover}
      onBlur={closeHover}
      onPointerDown={handlePointerDown}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onPointerMove={clearLongPress}
      onClickCapture={handleClickCapture}
      className={`${blockWrapper ? 'flex w-full' : 'inline-flex items-center'} ${isGuideMode ? 'ring-1 ring-cyan-400/25 rounded-md' : ''} ${className}`}
    >
      {children}
      {hoverHud && <CinemaHudCard hud={hoverHud} side={side} />}
    </div>
  );
};

/**
 * Top bar `?` Guide Mode toggle button.
 */
export const CinemaGuideToggleButton: React.FC<{
  compact?: boolean;
  className?: string;
}> = ({ compact = false, className = '' }) => {
  const isGuideMode = useGuideModeStore((s) => s.isGuideMode);
  const toggleGuideMode = useGuideModeStore((s) => s.toggleGuideMode);

  return (
    <CinemaToolHUD hudId="guide-mode" side="bottom">
      <button
        type="button"
        data-testid="cinema-guide-toggle"
        onClick={toggleGuideMode}
        aria-pressed={isGuideMode}
        aria-label="Guide Mode"
        className={`cinema-tile cinema-tile-cyan flex items-center justify-center gap-1.5 rounded-md px-2.5 min-h-[32px] sm:min-h-[34px] font-black tracking-wider text-[10px] sm:text-[11px] uppercase cursor-pointer ${
          isGuideMode ? 'animate-pulse' : ''
        } ${className}`}
        data-active={isGuideMode ? 'true' : 'false'}
      >
        <HelpCircle className="w-4 h-4 cinema-tile-icon shrink-0" strokeWidth={2.3} />
        {!compact && <span>{isGuideMode ? 'GUIDE ON' : 'GUIDE'}</span>}
      </button>
    </CinemaToolHUD>
  );
};

/**
 * Standardized Icon + 1-2 Word Bold Uppercase Tool Tile with Category Color Glow + HUD.
 */
export interface CinemaToolTileProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  icon: React.ReactNode;
  label: string;
  accent?: CinemaHudAccent;
  active?: boolean;
  badge?: string;
  hud?: CinemaHudDefinition;
  hudId?: string;
  hudSide?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  layout?: 'vertical' | 'horizontal';
  tileClassName?: string;
}

export const CinemaToolTile: React.FC<CinemaToolTileProps> = ({
  icon,
  label,
  accent = 'amber',
  active = false,
  badge,
  hud,
  hudId,
  hudSide = 'auto',
  layout = 'vertical',
  tileClassName = '',
  className = '',
  type = 'button',
  ...rest
}) => {
  const accentClass =
    accent === 'cyan'
      ? 'cinema-tile-cyan'
      : accent === 'crimson'
        ? 'cinema-tile-crimson'
        : accent === 'emerald'
          ? 'cinema-tile-emerald'
          : 'cinema-tile-amber';

  const buttonNode = (
    <button
      type={type}
      data-active={active ? 'true' : 'false'}
      className={`cinema-tile ${accentClass} relative w-full rounded-lg cursor-pointer select-none ${
        layout === 'vertical'
          ? 'flex flex-col items-center justify-center gap-1.5 px-2 py-2.5 min-h-[60px]'
          : 'flex items-center justify-center gap-2 px-3 py-2 min-h-[44px]'
      } ${tileClassName} ${className}`}
      {...rest}
    >
      {badge && (
        <span className="absolute top-1 right-1 px-1 py-0.5 rounded bg-black/70 border border-white/15 text-[8px] font-black tracking-wider uppercase leading-none text-amber-300">
          {badge}
        </span>
      )}
      <span className="cinema-tile-icon inline-flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase leading-none text-center truncate max-w-full">
        {label}
      </span>
    </button>
  );

  if (!hud && !hudId) return buttonNode;

  return (
    <CinemaToolHUD hud={hud} hudId={hudId} accent={accent} side={hudSide} blockWrapper>
      {buttonNode}
    </CinemaToolHUD>
  );
};

/**
 * Compact Icon + 1-2 Word Bold Section Badge Header (zero descriptive subtext).
 */
export const CinemaBadgeHeader: React.FC<{
  icon: React.ReactNode;
  label: string;
  accent?: CinemaHudAccent;
  rightSlot?: React.ReactNode;
  className?: string;
}> = ({ icon, label, accent = 'amber', rightSlot, className = '' }) => {
  const textTone =
    accent === 'cyan'
      ? 'text-cyan-300 border-cyan-500/30'
      : accent === 'crimson'
        ? 'text-red-400 border-red-500/30'
        : accent === 'emerald'
          ? 'text-emerald-300 border-emerald-500/30'
          : 'text-amber-400 border-amber-500/30';

  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <div className={`cinema-section-badge ${textTone}`}>
        <span className="inline-flex items-center shrink-0">{icon}</span>
        <span>{label}</span>
      </div>
      {rightSlot}
    </div>
  );
};

export const CinemaSparkleBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#111215] border border-[#26282E] text-[9px] font-black tracking-wider uppercase text-amber-400">
    <Sparkles className="w-2.5 h-2.5" strokeWidth={2.4} />
    {label}
  </span>
);
