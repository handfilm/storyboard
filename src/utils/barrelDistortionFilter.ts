/**
 * @file /src/utils/barrelDistortionFilter.ts
 * @description Dynamic Canvas SVG Barrel Distortion Engine for RAWx Cinema Stages.
 * Generates an optimized 256x256 radial displacement map data URL where:
 * - Red channel encodes horizontal radial distortion (dx * r^2)
 * - Green channel encodes vertical radial distortion (dy * r^2)
 * - Blue channel is neutral 128
 * Used in SVG <filter id="barrel-distortion-filter"><feDisplacementMap ... /></filter>
 */

let cachedDisplacementMapUrl: string | null = null;

/**
 * Clamps barrel distortion value to [0, 1] range with 2 decimal places.
 */
export function clampBarrelDistortion(val: unknown): number {
  const numeric = typeof val === 'number' && !Number.isNaN(val) ? val : 0;
  return Math.max(0, Math.min(1, Math.round(numeric * 100) / 100));
}

/**
 * Calculates radial vector displacement for barrel distortion at normalized coordinates.
 * Normalized coordinates (u, v) in range [0, 1].
 * Returns [r, g] in range [0, 255].
 */
export function calculateRadialDisplacementPixel(u: number, v: number): { r: number; g: number } {
  // Convert [0, 1] to centered [-1, 1]
  const dx = (u - 0.5) * 2;
  const dy = (v - 0.5) * 2;
  const r2 = dx * dx + dy * dy;

  // Barrel distortion pushes peripheral pixels inward/outward radially
  const dispX = dx * r2 * 0.75;
  const dispY = dy * r2 * 0.75;

  const r = Math.max(0, Math.min(255, Math.round(128 + 127 * dispX)));
  const g = Math.max(0, Math.min(255, Math.round(128 + 127 * dispY)));

  return { r, g };
}

/**
 * Generates an offscreen canvas radial displacement map and returns its PNG data URL.
 * Memoizes result so canvas is only rendered once per session.
 */
export function getBarrelDistortionMapUrl(size = 256): string {
  if (cachedDisplacementMapUrl) {
    return cachedDisplacementMapUrl;
  }

  if (typeof document === 'undefined') {
    return '';
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let y = 0; y < size; y++) {
      const v = (y + 0.5) / size;
      for (let x = 0; x < size; x++) {
        const u = (x + 0.5) / size;
        const { r, g } = calculateRadialDisplacementPixel(u, v);
        const idx = (y * size + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = 128;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    cachedDisplacementMapUrl = canvas.toDataURL('image/png');
    return cachedDisplacementMapUrl;
  } catch (err) {
    console.warn('[BarrelDistortion] Failed to generate displacement map:', err);
    return '';
  }
}
