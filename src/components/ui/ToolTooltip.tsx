import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface ToolTooltipProps {
  title: string;
  why: string;
  how: string;
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}

/**
 * Reusable brutalist workstation tooltip triggered on hover (150ms delay) or focus.
 * Uses a portal + fixed coordinates so it floats cleanly above bottom docks without
 * being clipped by horizontal scroll containers.
 */
export const ToolTooltip: React.FC<ToolTooltipProps> = ({
  title,
  why,
  how,
  children,
  delayMs = 150,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const updateCoords = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const clampedLeft = Math.max(140, Math.min(viewportW - 140, rect.left + rect.width / 2));
    const topPos = Math.max(16, rect.top - 10);
    setCoords({ left: clampedLeft, top: topPos });
  }, []);

  const handleOpen = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      updateCoords();
      setIsVisible(true);
    }, delayMs);
  }, [delayMs, updateCoords]);

  const handleClose = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const tooltipContent =
    isVisible && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              left: `${coords.left}px`,
              top: `${coords.top}px`,
              transform: 'translate(-50%, -100%)'
            }}
            className="z-50 pointer-events-none bg-neutral-950/95 border border-amber-500/50 shadow-2xl px-3.5 py-2.5 rounded-md max-w-[260px] w-max backdrop-blur-md text-left animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="text-sm font-bold text-amber-300 tracking-wide uppercase leading-tight">
              {title}
            </div>
            <p className="text-xs text-neutral-200 mt-1 leading-snug">
              {why}
            </p>
            <div className="text-[11px] font-mono text-neutral-400 mt-1 border-t border-neutral-800 pt-1 leading-snug">
              {how}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onFocus={handleOpen}
      onBlur={handleClose}
      className={`inline-flex items-center shrink-0 ${className}`}
    >
      {children}
      {tooltipContent}
    </div>
  );
};
