import type { CSSProperties } from 'react';

/**
 * Converts a studio aspect ratio label (e.g. '2.39:1', '16:9', '9:16', '4:3', '1:1', '4:5')
 * into a positive numeric width/height ratio. Defaults to 2.39:1 Anamorphic Scope.
 */
export function parseAspectRatioValue(aspectRatio?: string): number {
  const normalized = (aspectRatio || '2.39:1').trim().toLowerCase();
  if (!normalized) return 2.39;

  if (normalized.includes('2.39')) return 2.39;
  if (normalized.includes('2.35')) return 2.35;
  if (normalized.includes('16:9')) return 16 / 9;
  if (normalized.includes('9:16')) return 9 / 16;
  if (normalized.includes('4:3')) return 4 / 3;
  if (normalized.includes('4:5')) return 4 / 5;
  if (normalized.includes('1:1')) return 1;

  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (match) {
    const w = parseFloat(match[1]);
    const h = parseFloat(match[2]);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return w / h;
    }
  }
  return 2.39;
}

/**
 * Computes mathematical aspect-ratio-locked containment dimensions relative to a
 * container-query-enabled theater well (`containerType: 'size'`) so the Stage gate
 * maintains true aspect ratio (2.39:1 default) without ever stretching across
 * ultrawide viewports or overflowing 100% viewport bounds.
 */
export function computeLockedStageBoxStyle(
  aspectRatio?: string,
  stageScale: number = 1
): CSSProperties {
  const ratioNum = parseAspectRatioValue(aspectRatio);
  const scaleFactor = stageScale === 0.7 ? 0.72 : 0.985;

  return {
    aspectRatio: `${ratioNum} / 1`,
    width: `min(calc(100cqw * ${scaleFactor}), calc(100cqh * ${(ratioNum * scaleFactor).toFixed(5)}))`,
    height: `min(calc(100cqh * ${scaleFactor}), calc((100cqw / ${ratioNum.toFixed(5)}) * ${scaleFactor}))`,
    maxWidth: '100%',
    maxHeight: '100%',
    margin: 'auto',
    containerType: 'size',
    border: '1px solid rgba(245, 158, 11, 0.25)'
  };
}
