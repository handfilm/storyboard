/**
 * @file /src/ui/OverlaySlotSystem.ts
 * @description Single Overlay Slot System preventing HUD telemetry and title collisions.
 * Calculates dynamic margins, safe areas, and typographic scaling across all screen sizes (390px to 2560px).
 */

export interface ViewportSlotMetrics {
  scaleMultiplier: number;
  isCompactMobile: boolean;
  isTabletOrSmallLaptop: boolean;
  safeMarginPx: number;
  titleMaxWidthPercent: number;
  centerTitleTopPercent: number;
  maxBottomDockHeightPx: number;
}

export function calculateSlotMetrics(viewportWidth: number, viewportHeight: number): ViewportSlotMetrics {
  const isCompactMobile = viewportWidth <= 480;
  const isTabletOrSmallLaptop = viewportWidth > 480 && viewportWidth <= 1024;

  let scaleMultiplier = 1.0;
  let safeMarginPx = 14;
  let titleMaxWidthPercent = 88;
  let centerTitleTopPercent = 50;
  let maxBottomDockHeightPx = 180;

  if (isCompactMobile) {
    scaleMultiplier = 0.65;
    safeMarginPx = 8;
    titleMaxWidthPercent = 94;
    centerTitleTopPercent = 46;
    maxBottomDockHeightPx = 140;
  } else if (isTabletOrSmallLaptop) {
    scaleMultiplier = 0.85;
    safeMarginPx = 10;
    titleMaxWidthPercent = 90;
    centerTitleTopPercent = 48;
    maxBottomDockHeightPx = 160;
  } else if (viewportWidth >= 1920) {
    scaleMultiplier = 1.15;
    safeMarginPx = 20;
    titleMaxWidthPercent = 82;
    centerTitleTopPercent = 50;
    maxBottomDockHeightPx = 200;
  }

  return {
    scaleMultiplier,
    isCompactMobile,
    isTabletOrSmallLaptop,
    safeMarginPx,
    titleMaxWidthPercent,
    centerTitleTopPercent,
    maxBottomDockHeightPx
  };
}

export const OVERLAY_SLOT_CLASSES = {
  slotTopLeft: 'absolute top-2 left-2.5 sm:top-3 sm:left-3.5 z-20 pointer-events-none uppercase text-[8px] sm:text-[9.5px] leading-relaxed tracking-wider text-white/60 font-mono-tech',
  slotTopRight: 'absolute top-2 right-2.5 sm:top-3 sm:right-3.5 z-20 pointer-events-none text-right uppercase text-[8px] sm:text-[9.5px] leading-relaxed tracking-wider text-white/60 font-mono-tech',
  slotBottomLeft: 'absolute bottom-2 left-2.5 sm:bottom-3 sm:left-3.5 z-20 pointer-events-none uppercase text-[8px] sm:text-[9.5px] leading-relaxed tracking-wider text-white/60 font-mono-tech max-w-[42%]',
  slotBottomRight: 'absolute bottom-2 right-2.5 sm:bottom-3 sm:right-3.5 z-20 pointer-events-none text-right uppercase text-[8px] sm:text-[9.5px] leading-relaxed tracking-wider text-white/60 font-mono-tech max-w-[42%]',
  slotCenterHero: 'absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none text-center px-4 transition-transform duration-300',
  reticleGolden: 'absolute inset-2 sm:inset-4 border border-white/10 pointer-events-none z-10'
};
