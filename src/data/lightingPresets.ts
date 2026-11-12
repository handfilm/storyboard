/**
 * @file /src/data/lightingPresets.ts
 * @description 34-Preset Cinematic Lighting Engine for HANDFILM Studio.
 * Categorized into 4 groups: ATMOSPHERE, OPTICAL, EXPOSURE, STUDIO.
 * Provides CSS/canvas filters, canvas blend modes, and hardware-accelerated 2D overlay rendering.
 */

export type LightingCategory = 'ATMOSPHERE' | 'OPTICAL' | 'EXPOSURE' | 'STUDIO';

export interface LightingPreset {
  id: string;
  name: string;
  category: LightingCategory;
  filter: string; // CSS/Canvas filter string
  blendMode: GlobalCompositeOperation; // Canvas blend mode
  renderOverlay: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    elapsedTime: number
  ) => void;
}

export const LIGHTING_PRESETS: LightingPreset[] = [
  // =========================================================================
  // 1. HIGH KEY (EXPOSURE)
  // Low contrast, luminous highlights, minimal deep shadows
  // =========================================================================
  {
    id: 'high-key',
    name: 'High Key',
    category: 'EXPOSURE',
    filter: 'brightness(1.18) contrast(0.88) saturate(0.92)',
    blendMode: 'screen',
    renderOverlay: (ctx, width, height) => {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 2. LOW KEY (EXPOSURE)
  // High contrast, deep blacks, moody shadow pooling
  // =========================================================================
  {
    id: 'low-key',
    name: 'Low Key',
    category: 'EXPOSURE',
    filter: 'brightness(0.72) contrast(1.48) saturate(0.85)',
    blendMode: 'multiply',
    renderOverlay: (ctx, width, height) => {
      const grad = ctx.createRadialGradient(
        width * 0.48, height * 0.48, width * 0.15,
        width * 0.5, height * 0.5, width * 0.72
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.55)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 3. REMBRANDT (STUDIO)
  // Classical 45-degree key light + inverted triangle on shadow cheek
  // =========================================================================
  {
    id: 'rembrandt',
    name: 'Rembrandt',
    category: 'STUDIO',
    filter: 'contrast(1.28) brightness(0.92) saturate(1.05)',
    blendMode: 'overlay',
    renderOverlay: (ctx, width, height) => {
      // 45-degree directional illumination from top-left
      const keyGrad = ctx.createRadialGradient(
        width * 0.28, height * 0.22, 10,
        width * 0.4, height * 0.45, width * 0.65
      );
      keyGrad.addColorStop(0, 'rgba(255, 235, 205, 0.38)');
      keyGrad.addColorStop(0.5, 'rgba(255, 220, 180, 0.12)');
      keyGrad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
      ctx.fillStyle = keyGrad;
      ctx.fillRect(0, 0, width, height);

      // Distinctive Rembrandt triangle on shadow cheek zone
      ctx.save();
      ctx.beginPath();
      const tx = width * 0.62;
      const ty = height * 0.48;
      ctx.moveTo(tx - width * 0.05, ty - height * 0.04);
      ctx.lineTo(tx + width * 0.05, ty - height * 0.04);
      ctx.lineTo(tx, ty + height * 0.06);
      ctx.closePath();
      const triGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, width * 0.06);
      triGrad.addColorStop(0, 'rgba(255, 225, 185, 0.28)');
      triGrad.addColorStop(1, 'rgba(255, 225, 185, 0)');
      ctx.fillStyle = triGrad;
      ctx.fill();
      ctx.restore();
    }
  },

  // =========================================================================
  // 4. BUTTERFLY (STUDIO)
  // Paramount glamour lighting placed high and directly in front
  // =========================================================================
  {
    id: 'butterfly',
    name: 'Butterfly',
    category: 'STUDIO',
    filter: 'contrast(1.12) brightness(1.06) saturate(1.04)',
    blendMode: 'screen',
    renderOverlay: (ctx, width, height) => {
      // Central high top light beam
      const spot = ctx.createRadialGradient(
        width * 0.5, height * 0.25, width * 0.05,
        width * 0.5, height * 0.5, width * 0.55
      );
      spot.addColorStop(0, 'rgba(255, 248, 235, 0.32)');
      spot.addColorStop(0.6, 'rgba(255, 240, 220, 0.08)');
      spot.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 5. SPLIT LIGHT (STUDIO)
  // 90-degree lateral light halving the frame into pure light and shadow
  // =========================================================================
  {
    id: 'split-light',
    name: 'Split Light',
    category: 'STUDIO',
    filter: 'contrast(1.52) brightness(0.9)',
    blendMode: 'multiply',
    renderOverlay: (ctx, width, height) => {
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
      grad.addColorStop(0.46, 'rgba(0, 0, 0, 0.0)');
      grad.addColorStop(0.54, 'rgba(0, 0, 0, 0.72)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.94)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 6. LOOP LIGHT (STUDIO)
  // 30-40 degree portrait key creating subtle cheek loop shadow
  // =========================================================================
  {
    id: 'loop-light',
    name: 'Loop Light',
    category: 'STUDIO',
    filter: 'contrast(1.18) brightness(1.02) saturate(1.06)',
    blendMode: 'overlay',
    renderOverlay: (ctx, width, height) => {
      const grad = ctx.createLinearGradient(width * 0.2, 0, width * 0.85, height);
      grad.addColorStop(0, 'rgba(255, 240, 220, 0.28)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
      grad.addColorStop(1, 'rgba(10, 10, 20, 0.45)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 7. BROAD LIGHT (STUDIO)
  // Primary light illuminates the wider camera-facing plane
  // =========================================================================
  {
    id: 'broad-light',
    name: 'Broad Light',
    category: 'STUDIO',
    filter: 'brightness(1.08) contrast(1.12) saturate(1.05)',
    blendMode: 'overlay',
    renderOverlay: (ctx, width, height) => {
      const grad = ctx.createRadialGradient(
        width * 0.65, height * 0.42, width * 0.08,
        width * 0.6, height * 0.5, width * 0.7
      );
      grad.addColorStop(0, 'rgba(255, 245, 230, 0.35)');
      grad.addColorStop(0.5, 'rgba(255, 235, 210, 0.1)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 8. SHORT LIGHT (STUDIO)
  // Key illuminates side turned away from lens; near side in shadow
  // =========================================================================
  {
    id: 'short-light',
    name: 'Short Light',
    category: 'STUDIO',
    filter: 'contrast(1.32) brightness(0.94) saturate(0.98)',
    blendMode: 'multiply',
    renderOverlay: (ctx, width, height) => {
      const grad = ctx.createLinearGradient(width * 0.15, 0, width, 0);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
      grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.3)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 9. CHIAROSCURO (EXPOSURE)
  // Caravaggesque masterclass: piercing light emerging from pitch dark
  // =========================================================================
  {
    id: 'chiaroscuro',
    name: 'Chiaroscuro',
    category: 'EXPOSURE',
    filter: 'contrast(1.65) brightness(0.82) saturate(0.88)',
    blendMode: 'overlay',
    renderOverlay: (ctx, width, height) => {
      // Slanted high-contrast shaft
      const shaft = ctx.createLinearGradient(0, 0, width, height);
      shaft.addColorStop(0, 'rgba(255, 220, 160, 0.55)');
      shaft.addColorStop(0.35, 'rgba(255, 200, 130, 0.15)');
      shaft.addColorStop(0.7, 'rgba(0, 0, 0, 0.65)');
      shaft.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
      ctx.fillStyle = shaft;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 10. SILHOUETTE (EXPOSURE)
  // Backlit subject contour outlined against incandescent plate
  // =========================================================================
  {
    id: 'silhouette',
    name: 'Silhouette',
    category: 'EXPOSURE',
    filter: 'brightness(0.58) contrast(1.85) saturate(0.7)',
    blendMode: 'multiply',
    renderOverlay: (ctx, width, height) => {
      // Heavy center dark mask with luminous perimeter
      const grad = ctx.createRadialGradient(
        width * 0.5, height * 0.5, width * 0.18,
        width * 0.5, height * 0.5, width * 0.68
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
      grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.45)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 11. RIM LIGHT (STUDIO)
  // Back-angle kicker highlighting edge silhouettes
  // =========================================================================
  {
    id: 'rim-light',
    name: 'Rim Light',
    category: 'STUDIO',
    filter: 'contrast(1.25) brightness(0.96) saturate(1.02)',
    blendMode: 'screen',
    renderOverlay: (ctx, width, height) => {
      // Top and side contour luminous edges
      const edgeGrad = ctx.createRadialGradient(
        width * 0.5, height * 0.05, width * 0.35,
        width * 0.5, height * 0.5, width * 0.75
      );
      edgeGrad.addColorStop(0, 'rgba(220, 240, 255, 0.35)');
      edgeGrad.addColorStop(0.5, 'rgba(200, 225, 255, 0.08)');
      edgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(0, 0, width, height);

      // Sharp white rim stroke at perimeter
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, width - 8, height - 8);
      ctx.restore();
    }
  },

  // =========================================================================
  // 12. HARD LIGHT (EXPOSURE)
  // Direct specular illumination with crisp, unforgiving shadow drop-off
  // =========================================================================
  {
    id: 'hard-light-preset',
    name: 'Hard Light',
    category: 'EXPOSURE',
    filter: 'contrast(1.48) brightness(1.08) saturate(1.15)',
    blendMode: 'overlay',
    renderOverlay: (ctx, width, height) => {
      const grad = ctx.createLinearGradient(0, height * 0.1, width, height * 0.9);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.0)');
      grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.45)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 13. SOFT LIGHT (EXPOSURE)
  // 12x12 diffused butterfly frame wrapping smoothly around subject
  // =========================================================================
  {
    id: 'soft-light-preset',
    name: 'Soft Light',
    category: 'EXPOSURE',
    filter: 'contrast(0.92) brightness(1.08) saturate(1.06)',
    blendMode: 'screen',
    renderOverlay: (ctx, width, height) => {
      const grad = ctx.createRadialGradient(
        width * 0.5, height * 0.5, width * 0.05,
        width * 0.5, height * 0.5, width * 0.65
      );
      grad.addColorStop(0, 'rgba(255, 245, 235, 0.22)');
      grad.addColorStop(0.6, 'rgba(255, 240, 230, 0.08)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 14. BOUNCE LIGHT (EXPOSURE)
  // Low angle reflected fill from polystyrene or bead board
  // =========================================================================
  {
    id: 'bounce-light',
    name: 'Bounce Light',
    category: 'EXPOSURE',
    filter: 'brightness(1.05) contrast(1.06) saturate(1.08)',
    blendMode: 'screen',
    renderOverlay: (ctx, width, height) => {
      const grad = ctx.createLinearGradient(0, height, 0, height * 0.35);
      grad.addColorStop(0, 'rgba(255, 240, 210, 0.32)');
      grad.addColorStop(0.6, 'rgba(255, 235, 200, 0.08)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 15. TOP LIGHT (STUDIO)
  // Overhead theatrical par / Godfather moody brow shadow
  // =========================================================================
  {
    id: 'top-light',
    name: 'Top Light',
    category: 'STUDIO',
    filter: 'contrast(1.38) brightness(0.86)',
    blendMode: 'multiply',
    renderOverlay: (ctx, width, height) => {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
      grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.35)');
      grad.addColorStop(0.85, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 16. UNDERLIGHT (STUDIO)
  // Low upward horror/campfire angle creating inverted facial shadows
  // =========================================================================
  {
    id: 'underlight',
    name: 'Underlight',
    category: 'STUDIO',
    filter: 'contrast(1.35) brightness(0.96) hue-rotate(-8deg)',
    blendMode: 'color-dodge',
    renderOverlay: (ctx, width, height) => {
      const grad = ctx.createRadialGradient(
        width * 0.5, height * 1.05, width * 0.1,
        width * 0.5, height * 0.45, width * 0.7
      );
      grad.addColorStop(0, 'rgba(255, 170, 90, 0.45)');
      grad.addColorStop(0.5, 'rgba(220, 100, 40, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 17. GOLDEN HOUR (ATMOSPHERE)
  // 2800K low sun grazing angle with amber atmospheric diffusion
  // =========================================================================
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    category: 'ATMOSPHERE',
    filter: 'sepia(0.32) saturate(1.42) contrast(1.12) brightness(1.05)',
    blendMode: 'overlay',
    renderOverlay: (ctx, width, height) => {
      const grad = ctx.createLinearGradient(0, height * 0.2, width, height * 0.8);
      grad.addColorStop(0, 'rgba(255, 180, 40, 0.45)');
      grad.addColorStop(0.5, 'rgba(255, 130, 20, 0.22)');
      grad.addColorStop(1, 'rgba(120, 40, 10, 0.1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Low sun flare bloom in top-left
      const sun = ctx.createRadialGradient(0, height * 0.15, 0, 0, height * 0.15, width * 0.45);
      sun.addColorStop(0, 'rgba(255, 245, 200, 0.4)');
      sun.addColorStop(0.5, 'rgba(255, 190, 80, 0.15)');
      sun.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 18. BLUE HOUR (ATMOSPHERE)
  // Post-sunset deep twilight cool cobalt gradient
  // =========================================================================
  {
    id: 'blue-hour',
    name: 'Blue Hour',
    category: 'ATMOSPHERE',
    filter: 'hue-rotate(185deg) saturate(1.28) contrast(1.14) brightness(0.86)',
    blendMode: 'screen',
    renderOverlay: (ctx, width, height) => {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(20, 50, 140, 0.38)');
      grad.addColorStop(0.6, 'rgba(30, 80, 180, 0.18)');
      grad.addColorStop(1, 'rgba(10, 25, 60, 0.25)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 19. DAY FOR NIGHT (ATMOSPHERE)
  // Deep underexposed daylight with monochromatic cobalt cyan grade
  // =========================================================================
  {
    id: 'day-for-night',
    name: 'Day for Night',
    category: 'ATMOSPHERE',
    filter: 'brightness(0.54) contrast(1.38) saturate(0.58) hue-rotate(195deg)',
    blendMode: 'multiply',
    renderOverlay: (ctx, width, height) => {
      const grad = ctx.createRadialGradient(
        width * 0.5, height * 0.5, width * 0.2,
        width * 0.5, height * 0.5, width * 0.75
      );
      grad.addColorStop(0, 'rgba(15, 30, 80, 0.45)');
      grad.addColorStop(0.6, 'rgba(8, 18, 55, 0.75)');
      grad.addColorStop(1, 'rgba(2, 5, 20, 0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 20. MOONLIGHT (ATMOSPHERE)
  // 5600K silver-blue ethereal illumination
  // =========================================================================
  {
    id: 'moonlight',
    name: 'Moonlight',
    category: 'ATMOSPHERE',
    filter: 'brightness(0.72) contrast(1.22) saturate(0.68) hue-rotate(175deg)',
    blendMode: 'screen',
    renderOverlay: (ctx, width, height) => {
      const moonBeam = ctx.createLinearGradient(width * 0.8, 0, width * 0.2, height);
      moonBeam.addColorStop(0, 'rgba(180, 215, 255, 0.32)');
      moonBeam.addColorStop(0.5, 'rgba(140, 180, 240, 0.12)');
      moonBeam.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = moonBeam;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 21. WINDOW LIGHT (OPTICAL)
  // Sunlight pouring through window frame with mullion crossbars
  // =========================================================================
  {
    id: 'window-light',
    name: 'Window Light',
    category: 'OPTICAL',
    filter: 'contrast(1.18) brightness(1.06) saturate(1.02)',
    blendMode: 'screen',
    renderOverlay: (ctx, width, height) => {
      // Perspective angled window trapezoid
      ctx.save();
      ctx.fillStyle = 'rgba(255, 245, 225, 0.25)';
      ctx.beginPath();
      ctx.moveTo(width * 0.1, 0);
      ctx.lineTo(width * 0.7, 0);
      ctx.lineTo(width * 0.9, height);
      ctx.lineTo(width * 0.25, height);
      ctx.closePath();
      ctx.fill();

      // Mullion cross shadow lines
      ctx.strokeStyle = 'rgba(10, 10, 15, 0.4)';
      ctx.lineWidth = width * 0.025;
      // Vertical sash
      ctx.beginPath();
      ctx.moveTo(width * 0.4, 0);
      ctx.lineTo(width * 0.58, height);
      ctx.stroke();
      // Horizontal sash
      ctx.beginPath();
      ctx.moveTo(width * 0.15, height * 0.45);
      ctx.lineTo(width * 0.8, height * 0.45);
      ctx.stroke();
      ctx.restore();
    }
  },

  // =========================================================================
  // 22. PRACTICAL LIGHT (OPTICAL)
  // Warm localized incandescent lamp falloff in scene
  // =========================================================================
  {
    id: 'practical-light',
    name: 'Practical Light',
    category: 'OPTICAL',
    filter: 'contrast(1.12) brightness(0.96) saturate(1.1)',
    blendMode: 'screen',
    renderOverlay: (ctx, width, height) => {
      const lamp = ctx.createRadialGradient(
        width * 0.72, height * 0.38, 5,
        width * 0.72, height * 0.38, width * 0.5
      );
      lamp.addColorStop(0, 'rgba(255, 200, 110, 0.55)');
      lamp.addColorStop(0.3, 'rgba(255, 160, 60, 0.25)');
      lamp.addColorStop(0.7, 'rgba(200, 100, 30, 0.06)');
      lamp.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lamp;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 23. FIRELIGHT (ATMOSPHERE)
  // Dynamic animated flickering campfire / fireplace glow
  // =========================================================================
  {
    id: 'firelight',
    name: 'Firelight',
    category: 'ATMOSPHERE',
    filter: 'sepia(0.38) saturate(1.55) contrast(1.22) brightness(0.96)',
    blendMode: 'overlay',
    renderOverlay: (ctx, width, height, elapsedTime) => {
      // Dynamic flicker modulation
      const t = (elapsedTime || 0) * 0.007;
      const flicker = 0.35 + 0.12 * Math.sin(t * 3.1) + 0.08 * Math.cos(t * 7.3);

      const fire = ctx.createRadialGradient(
        width * 0.45, height * 0.95, width * 0.05,
        width * 0.45, height * 0.75, width * 0.65
      );
      fire.addColorStop(0, `rgba(255, 120, 20, ${flicker + 0.15})`);
      fire.addColorStop(0.4, `rgba(230, 80, 10, ${flicker})`);
      fire.addColorStop(0.8, 'rgba(120, 30, 5, 0.12)');
      fire.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fire;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 24. VENETIAN BLINDS (OPTICAL)
  // Film Noir horizontal shadow slats cutting across the frame
  // =========================================================================
  {
    id: 'venetian-blinds',
    name: 'Venetian Blinds',
    category: 'OPTICAL',
    filter: 'contrast(1.36) brightness(0.92)',
    blendMode: 'multiply',
    renderOverlay: (ctx, width, height) => {
      ctx.save();
      const slatCount = 14;
      const slatHeight = height / slatCount;
      for (let i = 0; i < slatCount; i++) {
        const y = i * slatHeight;
        const slatGrad = ctx.createLinearGradient(0, y, 0, y + slatHeight);
        slatGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
        slatGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
        slatGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.0)');
        slatGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        ctx.fillStyle = slatGrad;
        ctx.fillRect(0, y, width, slatHeight);
      }
      ctx.restore();
    }
  },

  // =========================================================================
  // 25. DAPPLED LIGHT (ATMOSPHERE)
  // Organic tree canopy foliage bokeh shadow patches
  // =========================================================================
  {
    id: 'dappled-light',
    name: 'Dappled Light',
    category: 'ATMOSPHERE',
    filter: 'contrast(1.16) brightness(1.04) saturate(1.12)',
    blendMode: 'overlay',
    renderOverlay: (ctx, width, height, elapsedTime) => {
      ctx.save();
      const t = (elapsedTime || 0) * 0.001;
      const spots = [
        { x: 0.25, y: 0.25, r: 0.14 },
        { x: 0.45, y: 0.35, r: 0.18 },
        { x: 0.65, y: 0.22, r: 0.12 },
        { x: 0.32, y: 0.65, r: 0.20 },
        { x: 0.72, y: 0.58, r: 0.16 },
        { x: 0.52, y: 0.75, r: 0.15 }
      ];
      for (let i = 0; i < spots.length; i++) {
        const s = spots[i];
        const driftX = Math.sin(t + i) * width * 0.015;
        const driftY = Math.cos(t * 0.8 + i) * height * 0.015;
        const px = s.x * width + driftX;
        const py = s.y * height + driftY;
        const radius = s.r * width;
        const radGrad = ctx.createRadialGradient(px, py, radius * 0.1, px, py, radius);
        radGrad.addColorStop(0, 'rgba(255, 250, 220, 0.28)');
        radGrad.addColorStop(0.6, 'rgba(255, 240, 200, 0.1)');
        radGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  // =========================================================================
  // 26. VOLUMETRIC LIGHT (OPTICAL)
  // Crepuscular god rays pouring through dense atmosphere
  // =========================================================================
  {
    id: 'volumetric-light',
    name: 'Volumetric Light',
    category: 'OPTICAL',
    filter: 'contrast(1.12) brightness(1.08)',
    blendMode: 'screen',
    renderOverlay: (ctx, width, height) => {
      ctx.save();
      const numBeams = 5;
      for (let i = 0; i < numBeams; i++) {
        const startX = width * (0.05 + i * 0.12);
        const endX = width * (0.2 + i * 0.18);
        const grad = ctx.createLinearGradient(startX, 0, endX, height);
        grad.addColorStop(0, 'rgba(255, 255, 240, 0.35)');
        grad.addColorStop(0.5, 'rgba(255, 250, 220, 0.15)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX + width * 0.08, 0);
        ctx.lineTo(endX + width * 0.15, height);
        ctx.lineTo(endX, height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  },

  // =========================================================================
  // 27. FLAT LIGHT (EXPOSURE)
  // Low-ratio, clinical diffuse exposure minimizing facial modeling
  // =========================================================================
  {
    id: 'flat-light',
    name: 'Flat Light',
    category: 'EXPOSURE',
    filter: 'contrast(0.85) brightness(1.08) saturate(0.96)',
    blendMode: 'screen',
    renderOverlay: (ctx, width, height) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 28. NEON LIGHT (ATMOSPHERE)
  // Cyberpunk dual-tone electric magenta & cyan specular wash
  // =========================================================================
  {
    id: 'neon-light',
    name: 'Neon Light',
    category: 'ATMOSPHERE',
    filter: 'saturate(1.65) contrast(1.32) brightness(1.04)',
    blendMode: 'hard-light',
    renderOverlay: (ctx, width, height, elapsedTime) => {
      const pulse = Math.sin((elapsedTime || 0) * 0.005) * 0.08;
      // Electric magenta from left
      const mag = ctx.createLinearGradient(0, 0, width * 0.6, 0);
      mag.addColorStop(0, `rgba(255, 0, 128, ${0.35 + pulse})`);
      mag.addColorStop(1, 'rgba(255, 0, 128, 0)');
      ctx.fillStyle = mag;
      ctx.fillRect(0, 0, width, height);

      // Electric cyan from right
      const cy = ctx.createLinearGradient(width, 0, width * 0.4, 0);
      cy.addColorStop(0, `rgba(0, 240, 255, ${0.35 - pulse})`);
      cy.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = cy;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 29. TEAL AND ORANGE (ATMOSPHERE)
  // Blockbuster cinema color separation (warm key, cool shadows)
  // =========================================================================
  {
    id: 'teal-and-orange',
    name: 'Teal & Orange',
    category: 'ATMOSPHERE',
    filter: 'contrast(1.26) saturate(1.35) hue-rotate(-8deg)',
    blendMode: 'overlay',
    renderOverlay: (ctx, width, height) => {
      // Warm amber center-top
      const amber = ctx.createRadialGradient(
        width * 0.5, height * 0.35, width * 0.1,
        width * 0.5, height * 0.35, width * 0.65
      );
      amber.addColorStop(0, 'rgba(255, 140, 20, 0.28)');
      amber.addColorStop(0.6, 'rgba(200, 100, 20, 0.08)');
      amber.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = amber;
      ctx.fillRect(0, 0, width, height);

      // Cool teal perimeter shadow
      const teal = ctx.createLinearGradient(0, height, 0, 0);
      teal.addColorStop(0, 'rgba(0, 120, 150, 0.35)');
      teal.addColorStop(0.5, 'rgba(0, 80, 120, 0.1)');
      teal.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = teal;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 30. MONOCHROME RED (ATMOSPHERE)
  // Darkroom / emergency red alert deep crimson saturation
  // =========================================================================
  {
    id: 'monochrome-red',
    name: 'Monochrome Red',
    category: 'ATMOSPHERE',
    filter: 'grayscale(0.85) sepia(1) saturate(8) hue-rotate(-50deg) brightness(0.85)',
    blendMode: 'multiply',
    renderOverlay: (ctx, width, height) => {
      const grad = ctx.createRadialGradient(
        width * 0.5, height * 0.5, width * 0.15,
        width * 0.5, height * 0.5, width * 0.75
      );
      grad.addColorStop(0, 'rgba(255, 20, 20, 0.65)');
      grad.addColorStop(0.7, 'rgba(180, 10, 10, 0.85)');
      grad.addColorStop(1, 'rgba(60, 0, 0, 0.98)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 31. SCREEN GLOW (OPTICAL)
  // Electronic phosphor laptop/phone display light on face
  // =========================================================================
  {
    id: 'screen-glow',
    name: 'Screen Glow',
    category: 'OPTICAL',
    filter: 'brightness(1.06) contrast(1.18) hue-rotate(160deg) saturate(1.22)',
    blendMode: 'screen',
    renderOverlay: (ctx, width, height, elapsedTime) => {
      const flicker = 0.05 * Math.sin((elapsedTime || 0) * 0.012);
      const grad = ctx.createLinearGradient(0, height, 0, height * 0.2);
      grad.addColorStop(0, `rgba(160, 220, 255, ${0.38 + flicker})`);
      grad.addColorStop(0.4, `rgba(120, 180, 240, ${0.18 + flicker})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // =========================================================================
  // 32. PASSING LIGHT (OPTICAL)
  // Kinetic moving vehicular headlights sweeping laterally across the set
  // =========================================================================
  {
    id: 'passing-light',
    name: 'Passing Light',
    category: 'OPTICAL',
    filter: 'contrast(1.22) brightness(0.96)',
    blendMode: 'screen',
    renderOverlay: (ctx, width, height, elapsedTime) => {
      ctx.save();
      // Periodically sweeps from left to right every 4 seconds
      const cycle = ((elapsedTime || 0) * 0.0004) % 1;
      const sweepX = (cycle * 2.2 - 0.6) * width;
      const beamW = width * 0.35;

      const beam = ctx.createLinearGradient(sweepX, 0, sweepX + beamW, 0);
      beam.addColorStop(0, 'rgba(255, 255, 255, 0)');
      beam.addColorStop(0.45, 'rgba(255, 245, 220, 0.45)');
      beam.addColorStop(0.55, 'rgba(255, 255, 255, 0.55)');
      beam.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(sweepX - width * 0.1, 0);
      ctx.lineTo(sweepX + beamW + width * 0.1, 0);
      ctx.lineTo(sweepX + beamW, height);
      ctx.lineTo(sweepX, height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  },

  // =========================================================================
  // 33. STROBE LIGHT (OPTICAL)
  // High-cadence rhythmic strobe flash
  // =========================================================================
  {
    id: 'strobe-light',
    name: 'Strobe Light',
    category: 'OPTICAL',
    filter: 'contrast(1.35) brightness(1.05)',
    blendMode: 'screen',
    renderOverlay: (ctx, width, height, elapsedTime) => {
      // 6 Hz pulse
      const wave = Math.sin((elapsedTime || 0) * 0.02);
      if (wave > 0.65) {
        const flashIntensity = (wave - 0.65) / 0.35;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.45 * flashIntensity})`;
        ctx.fillRect(0, 0, width, height);
      }
    }
  },

  // =========================================================================
  // 34. THEATRICAL LIGHT (STUDIO)
  // Sharp iris follow-spot beam with high-contrast vignette blackout
  // =========================================================================
  {
    id: 'theatrical-light',
    name: 'Theatrical Light',
    category: 'STUDIO',
    filter: 'contrast(1.42) brightness(0.88) saturate(1.08)',
    blendMode: 'overlay',
    renderOverlay: (ctx, width, height) => {
      const spot = ctx.createRadialGradient(
        width * 0.5, height * 0.48, width * 0.18,
        width * 0.5, height * 0.48, width * 0.48
      );
      spot.addColorStop(0, 'rgba(255, 248, 230, 0.42)');
      spot.addColorStop(0.7, 'rgba(255, 230, 200, 0.15)');
      spot.addColorStop(0.85, 'rgba(10, 10, 25, 0.6)');
      spot.addColorStop(1, 'rgba(2, 2, 8, 0.95)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, width, height);
    }
  }
];

export const LIGHTING_PRESETS_MAP: Record<string, LightingPreset> = LIGHTING_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.id] = preset;
    return acc;
  },
  {} as Record<string, LightingPreset>
);

export function getLightingPresetById(id?: string | null): LightingPreset | undefined {
  if (!id) return undefined;
  return LIGHTING_PRESETS_MAP[id];
}
