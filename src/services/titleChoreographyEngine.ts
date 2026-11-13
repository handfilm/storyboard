/**
 * @file /src/services/titleChoreographyEngine.ts
 * @description Single-Source-of-Truth Spatial Title Positioning & Directional Kinetic Choreography Engine.
 *
 * Unifies:
 * - Interactive 9-Point Anamorphic Safe-Zone Matrix (`top-left` .. `lower-right`)
 * - Subject-Aware `AUTO` negative-space composition (Rule-of-Thirds & focal opposition)
 * - Directional Kinetic Entrance (`slide-from-left` | `center-bloom` | `slide-from-right`)
 * - 1:1 DOM (`StageTextOverlay.tsx`) <-> 2D Canvas (`titleCanvasRenderer.ts`) coordinate parity
 *   adhering strictly to 90% Title-Safe & 93% Action-Safe broadcast margins.
 */

import type {
  ShotTitleAlignment,
  TitleKineticEntrance,
  TitleLayoutMode,
  TitleZone9
} from '../types/titlePreset';

export type { TitleZone9, TitleKineticEntrance };

export type SafeVerticalRow = 'top' | 'mid' | 'lower';
export type HorizontalAlign = 'LEFT' | 'MID' | 'RIGHT';

export interface Zone9Metadata {
  zone: TitleZone9;
  shortLabel: string;
  label: string;
  row: SafeVerticalRow;
  col: HorizontalAlign;
  entrance: TitleKineticEntrance;
  textAlign: 'left' | 'center' | 'right';
}

export const TITLE_ZONE_9_MATRIX: ReadonlyArray<Zone9Metadata> = [
  {
    zone: 'top-left',
    shortLabel: 'TL',
    label: 'Top Left Safe',
    row: 'top',
    col: 'LEFT',
    entrance: 'slide-from-left',
    textAlign: 'left'
  },
  {
    zone: 'top-center',
    shortLabel: 'TC',
    label: 'Top Center Safe',
    row: 'top',
    col: 'MID',
    entrance: 'center-bloom',
    textAlign: 'center'
  },
  {
    zone: 'top-right',
    shortLabel: 'TR',
    label: 'Top Right Safe',
    row: 'top',
    col: 'RIGHT',
    entrance: 'slide-from-right',
    textAlign: 'right'
  },
  {
    zone: 'mid-left',
    shortLabel: 'ML',
    label: 'Mid Left Third',
    row: 'mid',
    col: 'LEFT',
    entrance: 'slide-from-left',
    textAlign: 'left'
  },
  {
    zone: 'center-hero',
    shortLabel: 'CTR',
    label: 'Center Hero',
    row: 'mid',
    col: 'MID',
    entrance: 'center-bloom',
    textAlign: 'center'
  },
  {
    zone: 'mid-right',
    shortLabel: 'MR',
    label: 'Mid Right Third',
    row: 'mid',
    col: 'RIGHT',
    entrance: 'slide-from-right',
    textAlign: 'right'
  },
  {
    zone: 'lower-left',
    shortLabel: 'LL',
    label: 'Lower Left Safe',
    row: 'lower',
    col: 'LEFT',
    entrance: 'slide-from-left',
    textAlign: 'left'
  },
  {
    zone: 'lower-center',
    shortLabel: 'LC',
    label: 'Lower Center Safe',
    row: 'lower',
    col: 'MID',
    entrance: 'center-bloom',
    textAlign: 'center'
  },
  {
    zone: 'lower-right',
    shortLabel: 'LR',
    label: 'Lower Right Safe',
    row: 'lower',
    col: 'RIGHT',
    entrance: 'slide-from-right',
    textAlign: 'right'
  }
];

const ZONE_META_MAP: Record<TitleZone9, Zone9Metadata> = TITLE_ZONE_9_MATRIX.reduce(
  (acc, item) => {
    acc[item.zone] = item;
    return acc;
  },
  {} as Record<TitleZone9, Zone9Metadata>
);

export function isValidTitleZone9(val: unknown): val is TitleZone9 {
  return typeof val === 'string' && val in ZONE_META_MAP;
}

export function getZone9Metadata(zone: TitleZone9): Zone9Metadata {
  return ZONE_META_MAP[zone] || ZONE_META_MAP['center-hero'];
}

export function zone9ToAlign(zone: TitleZone9 | 'AUTO'): ShotTitleAlignment {
  if (zone === 'AUTO') return 'AUTO';
  return getZone9Metadata(zone).col;
}

export function getRowFromLayoutMode(layoutMode: TitleLayoutMode = 'center-hero'): SafeVerticalRow {
  switch (layoutMode) {
    case 'hud-bracket':
      return 'top';
    case 'lower-third-bar':
    case 'brutalist-box':
    case 'minimal-whisper':
      return 'lower';
    case 'editorial-split':
    case 'center-hero':
    default:
      return 'mid';
  }
}

export function composeZone9(row: SafeVerticalRow, col: HorizontalAlign): TitleZone9 {
  if (row === 'top') {
    return col === 'LEFT' ? 'top-left' : col === 'RIGHT' ? 'top-right' : 'top-center';
  }
  if (row === 'lower') {
    return col === 'LEFT' ? 'lower-left' : col === 'RIGHT' ? 'lower-right' : 'lower-center';
  }
  return col === 'LEFT' ? 'mid-left' : col === 'RIGHT' ? 'mid-right' : 'center-hero';
}

export function getKineticEntranceForAlign(align: HorizontalAlign): TitleKineticEntrance {
  if (align === 'LEFT') return 'slide-from-left';
  if (align === 'RIGHT') return 'slide-from-right';
  return 'center-bloom';
}

export function getKineticEntranceLabel(entrance: TitleKineticEntrance): string {
  switch (entrance) {
    case 'slide-from-left':
      return 'SLIDE LEFT';
    case 'slide-from-right':
      return 'SLIDE RIGHT';
    case 'center-bloom':
    default:
      return 'CENTER BLOOM';
  }
}

export function getKineticEntranceCssClass(entrance: TitleKineticEntrance): string {
  switch (entrance) {
    case 'slide-from-left':
      return 'animate-title-slide-left';
    case 'slide-from-right':
      return 'animate-title-slide-right';
    case 'center-bloom':
    default:
      return 'animate-title-center-bloom';
  }
}

export interface SpatialChoreographyInput {
  titleAlign: ShotTitleAlignment;
  zone9?: TitleZone9 | 'AUTO';
  layoutMode?: TitleLayoutMode;
  shotIndex: number;
  shotType?: string;
  panX?: number;
  panY?: number;
  smartCropMode?: string;
  aspectRatio?: string;
}

export interface SpatialTitleChoreography {
  zone9: TitleZone9;
  row: SafeVerticalRow;
  effectiveAlign: HorizontalAlign;
  kineticEntrance: TitleKineticEntrance;
  isAutoResolved: boolean;
  safeReason: string;
  // 90% Title-Safe normalized anchor ratios (0..1 of stage width/height)
  anchorXRatio: number;
  anchorYRatio: number;
  // CSS anchor styles matching 90% Title-Safe insets (no right-edge overflow)
  cssLeft: string;
  cssRight: string;
  cssTranslateX: string;
  cssMaxWidth: string;
  cssVertical: { top?: string; bottom?: string; translateY: string };
}

/**
 * Resolves exact 9-zone spatial coordinates & directional entrance choreography.
 * Guarantees 1:1 geometric parity between `StageTextOverlay.tsx` and `titleCanvasRenderer.ts`.
 */
export function resolveSpatialTitleChoreography(
  input: SpatialChoreographyInput
): SpatialTitleChoreography {
  const {
    titleAlign,
    zone9: explicitZone,
    layoutMode = 'center-hero',
    shotIndex,
    shotType,
    panX,
    panY,
    smartCropMode
  } = input;

  let resolvedZone: TitleZone9;
  let isAutoResolved = false;
  let safeReason = 'Manual Safe-Zone Lock';

  if (explicitZone && explicitZone !== 'AUTO' && isValidTitleZone9(explicitZone)) {
    resolvedZone = explicitZone;
    safeReason = `${getZone9Metadata(resolvedZone).label} (90% Title-Safe)`;
  } else if (titleAlign === 'AUTO' || explicitZone === 'AUTO') {
    isAutoResolved = true;
    const normalizedType = (shotType || '').trim().toUpperCase();
    const isHeroOrEstablishing =
      shotIndex === 0 ||
      normalizedType === 'WS' ||
      normalizedType === 'EWS' ||
      normalizedType === 'EST' ||
      normalizedType === 'HERO';

    if (isHeroOrEstablishing) {
      resolvedZone = layoutMode === 'lower-third-bar' ? 'lower-center' : 'center-hero';
      safeReason =
        shotIndex === 0
          ? 'AUTO · Establishing Hero Center'
          : `AUTO · Wide Scope (${normalizedType || 'WS'}) Center`;
    } else {
      // Subject-aware negative-space opposition:
      // Respect panX / smartCrop focal side if biased, otherwise alternate odd=LEFT / even=RIGHT
      let targetCol: HorizontalAlign = Math.abs(shotIndex) % 2 === 1 ? 'LEFT' : 'RIGHT';
      if (typeof panX === 'number' && Number.isFinite(panX)) {
        if (panX < 42) targetCol = 'RIGHT';
        else if (panX > 58) targetCol = 'LEFT';
      } else if (smartCropMode === 'LEFT') {
        targetCol = 'RIGHT';
      } else if (smartCropMode === 'RIGHT') {
        targetCol = 'LEFT';
      }

      // Close-ups / tight framing drop cleanly to lower third power points to avoid eyes/faces
      const isTightFaceShot =
        normalizedType === 'CU' ||
        normalizedType === 'ECU' ||
        normalizedType === 'MCU' ||
        normalizedType === 'OTS';
      const defaultRow = getRowFromLayoutMode(layoutMode);
      const targetRow: SafeVerticalRow =
        layoutMode === 'hud-bracket'
          ? 'top'
          : isTightFaceShot || (typeof panY === 'number' && panY < 42)
            ? 'lower'
            : defaultRow === 'top'
              ? 'top'
              : 'lower';

      resolvedZone = composeZone9(targetRow, targetCol);
      safeReason = `AUTO · ${targetCol} Negative Space (${normalizedType || 'RULE OF 3RDS'})`;
    }
  } else {
    // Fixed LEFT | MID | RIGHT without explicit zone9 override
    const normalizedAlign: HorizontalAlign =
      layoutMode === 'lower-third-bar' && titleAlign === 'MID' ? 'LEFT' : titleAlign;
    const row = getRowFromLayoutMode(layoutMode);
    resolvedZone = composeZone9(row, normalizedAlign);
    safeReason = `${getZone9Metadata(resolvedZone).label}`;
  }

  const meta = getZone9Metadata(resolvedZone);
  const anchorXRatio = meta.col === 'LEFT' ? 0.055 : meta.col === 'RIGHT' ? 0.945 : 0.5;
  const anchorYRatio = meta.row === 'top' ? 0.165 : meta.row === 'lower' ? 0.81 : 0.48;

  // Bounded 90% Title-Safe CSS anchors:
  // LEFT: left 5%, right auto, max-width 55%
  // MID:  left 50%, translateX -50%, max-width 82%
  // RIGHT: right 5%, left auto, translateX 0%, max-width 55% (prevents right-edge clipping)
  const cssLeft =
    meta.col === 'LEFT'
      ? '5%'
      : meta.col === 'RIGHT'
        ? 'auto'
        : '50%';
  const cssRight = meta.col === 'RIGHT' ? '5%' : 'auto';
  const cssTranslateX = meta.col === 'MID' ? '-50%' : '0%';
  const cssMaxWidth = meta.col === 'MID' ? '82%' : '55%';

  const cssVertical =
    meta.row === 'top'
      ? { top: '10%', translateY: '0px' }
      : meta.row === 'lower'
        ? { bottom: '12%', translateY: '0px' }
        : { top: '50%', translateY: '-50%' };

  return {
    zone9: resolvedZone,
    row: meta.row,
    effectiveAlign: meta.col,
    kineticEntrance: meta.entrance,
    isAutoResolved,
    safeReason,
    anchorXRatio,
    anchorYRatio,
    cssLeft,
    cssRight,
    cssTranslateX,
    cssMaxWidth,
    cssVertical
  };
}
