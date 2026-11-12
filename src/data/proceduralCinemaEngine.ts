/**
 * @file /src/data/proceduralCinemaEngine.ts
 * @description 100-Shot Procedural Cinema & Kinetic Title Engine (Zero External/Mockup Photos).
 *
 * Combines deterministically for every shot (shotIndex 0..99):
 * 1. 10 Atmospheric Cinema Background Palettes: paletteIndex = Math.floor(shotIndex / 10) % 10
 * 2. 10 Dopamine & Kinetics Typography Architectures: archIndex = shotIndex % 10
 * 3. 10 Kinetic Entrance & Stage Optical FX: fxIndex = (shotIndex * 3) % 10
 */

export interface ProceduralPalette {
  index: number;
  id: string;
  name: string;
  stops: [string, string, string];
  accentHex: string;
  leakHex: string;
  rimHex: string;
  cssBackdrop: string;
  thumbCssBackdrop: string;
  lightLeakCss: string;
}

export type TypographyDividerKind =
  | 'streak'
  | 'slash'
  | 'double'
  | 'prism'
  | 'pulse'
  | 'strobe'
  | 'neon-bar'
  | 'anamorphic-wide'
  | 'brutalist-rule'
  | 'zero-line';

export interface TypographyArchitecture {
  index: number;
  id: string;
  name: string;
  banglaClass: string;
  englishClass: string;
  dividerKind: TypographyDividerKind;
  trackingBoostEm: number;
  scaleMultiplier: number;
  uppercaseBangla?: boolean;
  italicStyle?: boolean;
}

export interface KineticOpticalFx {
  index: number;
  id: string;
  name: string;
  entranceClass: string;
  hasRgbSplit: boolean;
  hasFlareStreak: boolean;
  hasStrobePulse: boolean;
  hasBrutalistFrame: boolean;
  hasScanlines: boolean;
  hasCoronaRing: boolean;
}

export interface ShotProceduralSpec {
  shotIndex: number;
  paletteIndex: number;
  palette: ProceduralPalette;
  archIndex: number;
  architecture: TypographyArchitecture;
  fxIndex: number;
  opticalFx: KineticOpticalFx;
}

export const PROCEDURAL_PALETTES: readonly ProceduralPalette[] = [
  {
    index: 0,
    id: 'molten-amber-noir',
    name: 'MOLTEN AMBER NOIR',
    stops: ['#1a0d00', '#78350f', '#050505'],
    accentHex: '#F59E0B',
    leakHex: 'rgba(245, 158, 11, 0.34)',
    rimHex: 'rgba(251, 191, 36, 0.22)',
    cssBackdrop:
      'radial-gradient(circle at 52% 46%, rgba(120, 53, 15, 0.72) 0%, rgba(26, 13, 0, 0.92) 48%, #050505 100%), linear-gradient(135deg, #1a0d00 0%, #78350f 48%, #050505 100%)',
    thumbCssBackdrop:
      'radial-gradient(circle at 55% 45%, #78350f 0%, #1a0d00 58%, #050505 100%)',
    lightLeakCss:
      'radial-gradient(ellipse 65% 40% at 18% 22%, rgba(245, 158, 11, 0.26) 0%, transparent 70%)'
  },
  {
    index: 1,
    id: 'abyssal-cyan-lab',
    name: 'ABYSSAL CYAN LAB',
    stops: ['#021318', '#0e7490', '#030712'],
    accentHex: '#22D3EE',
    leakHex: 'rgba(14, 116, 144, 0.4)',
    rimHex: 'rgba(34, 211, 238, 0.26)',
    cssBackdrop:
      'radial-gradient(circle at 60% 42%, rgba(14, 116, 144, 0.68) 0%, rgba(2, 19, 24, 0.94) 52%, #030712 100%), linear-gradient(150deg, #021318 0%, #0e7490 50%, #030712 100%)',
    thumbCssBackdrop:
      'radial-gradient(circle at 60% 42%, #0e7490 0%, #021318 58%, #030712 100%)',
    lightLeakCss:
      'radial-gradient(ellipse 60% 36% at 84% 25%, rgba(34, 211, 238, 0.24) 0%, transparent 72%)'
  },
  {
    index: 2,
    id: 'crimson-volt',
    name: 'CRIMSON VOLT',
    stops: ['#190407', '#881337', '#09090b'],
    accentHex: '#F43F5E',
    leakHex: 'rgba(136, 19, 55, 0.44)',
    rimHex: 'rgba(244, 63, 94, 0.26)',
    cssBackdrop:
      'radial-gradient(circle at 46% 50%, rgba(136, 19, 55, 0.72) 0%, rgba(25, 4, 7, 0.94) 52%, #09090b 100%), linear-gradient(125deg, #190407 0%, #881337 50%, #09090b 100%)',
    thumbCssBackdrop:
      'radial-gradient(circle at 46% 50%, #881337 0%, #190407 58%, #09090b 100%)',
    lightLeakCss:
      'radial-gradient(ellipse 58% 42% at 22% 76%, rgba(244, 63, 94, 0.25) 0%, transparent 70%)'
  },
  {
    index: 3,
    id: 'acid-kinetic',
    name: 'ACID KINETIC',
    stops: ['#0a0f05', '#3f6212', '#050505'],
    accentHex: '#A3E635',
    leakHex: 'rgba(63, 98, 18, 0.42)',
    rimHex: 'rgba(163, 230, 53, 0.24)',
    cssBackdrop:
      'radial-gradient(circle at 50% 48%, rgba(63, 98, 18, 0.68) 0%, rgba(10, 15, 5, 0.94) 52%, #050505 100%), linear-gradient(140deg, #0a0f05 0%, #3f6212 48%, #050505 100%)',
    thumbCssBackdrop:
      'radial-gradient(circle at 50% 48%, #3f6212 0%, #0a0f05 58%, #050505 100%)',
    lightLeakCss:
      'radial-gradient(ellipse 68% 30% at 80% 72%, rgba(163, 230, 53, 0.22) 0%, transparent 70%)'
  },
  {
    index: 4,
    id: 'ultraviolet-eclipse',
    name: 'ULTRAVIOLET ECLIPSE',
    stops: ['#0d051a', '#581c87', '#030305'],
    accentHex: '#C084FC',
    leakHex: 'rgba(88, 28, 135, 0.46)',
    rimHex: 'rgba(217, 70, 239, 0.24)',
    cssBackdrop:
      'radial-gradient(circle at 50% 46%, rgba(88, 28, 135, 0.72) 0%, rgba(13, 5, 26, 0.94) 52%, #030305 100%), linear-gradient(135deg, #0d051a 0%, #581c87 50%, #030305 100%)',
    thumbCssBackdrop:
      'radial-gradient(circle at 50% 46%, #581c87 0%, #0d051a 58%, #030305 100%)',
    lightLeakCss:
      'radial-gradient(ellipse 56% 42% at 24% 28%, rgba(217, 70, 239, 0.24) 0%, transparent 72%)'
  },
  {
    index: 5,
    id: 'copper-industrial',
    name: 'COPPER INDUSTRIAL',
    stops: ['#170b05', '#9a3412', '#09090b'],
    accentHex: '#FB923C',
    leakHex: 'rgba(154, 52, 18, 0.42)',
    rimHex: 'rgba(251, 146, 60, 0.24)',
    cssBackdrop:
      'radial-gradient(circle at 44% 52%, rgba(154, 52, 18, 0.7) 0%, rgba(23, 11, 5, 0.94) 52%, #09090b 100%), linear-gradient(155deg, #170b05 0%, #9a3412 48%, #09090b 100%)',
    thumbCssBackdrop:
      'radial-gradient(circle at 44% 52%, #9a3412 0%, #170b05 58%, #09090b 100%)',
    lightLeakCss:
      'radial-gradient(ellipse 62% 35% at 78% 26%, rgba(251, 146, 60, 0.23) 0%, transparent 72%)'
  },
  {
    index: 6,
    id: 'emerald-matrix',
    name: 'EMERALD MATRIX',
    stops: ['#02140d', '#065f46', '#050505'],
    accentHex: '#34D399',
    leakHex: 'rgba(6, 95, 70, 0.42)',
    rimHex: 'rgba(52, 211, 153, 0.24)',
    cssBackdrop:
      'radial-gradient(circle at 55% 48%, rgba(6, 95, 70, 0.7) 0%, rgba(2, 20, 13, 0.94) 52%, #050505 100%), linear-gradient(135deg, #02140d 0%, #065f46 50%, #050505 100%)',
    thumbCssBackdrop:
      'radial-gradient(circle at 55% 48%, #065f46 0%, #02140d 58%, #050505 100%)',
    lightLeakCss:
      'radial-gradient(ellipse 60% 38% at 20% 70%, rgba(52, 211, 153, 0.22) 0%, transparent 70%)'
  },
  {
    index: 7,
    id: 'infrared-heat',
    name: 'INFRARED HEAT',
    stops: ['#1c0703', '#b91c1c', '#09090b'],
    accentHex: '#FB7185',
    leakHex: 'rgba(185, 28, 28, 0.46)',
    rimHex: 'rgba(249, 115, 22, 0.26)',
    cssBackdrop:
      'radial-gradient(circle at 48% 48%, rgba(185, 28, 28, 0.72) 0%, rgba(28, 7, 3, 0.94) 52%, #09090b 100%), linear-gradient(140deg, #1c0703 0%, #b91c1c 48%, #09090b 100%)',
    thumbCssBackdrop:
      'radial-gradient(circle at 48% 48%, #b91c1c 0%, #1c0703 58%, #09090b 100%)',
    lightLeakCss:
      'radial-gradient(ellipse 64% 38% at 75% 74%, rgba(249, 115, 22, 0.26) 0%, transparent 72%)'
  },
  {
    index: 8,
    id: 'titanium-monochrome',
    name: 'TITANIUM MONOCHROME',
    stops: ['#18181b', '#3f3f46', '#09090b'],
    accentHex: '#E4E4E7',
    leakHex: 'rgba(161, 161, 170, 0.28)',
    rimHex: 'rgba(244, 244, 245, 0.2)',
    cssBackdrop:
      'radial-gradient(circle at 50% 45%, rgba(63, 63, 70, 0.72) 0%, rgba(24, 24, 27, 0.94) 54%, #09090b 100%), linear-gradient(135deg, #18181b 0%, #3f3f46 50%, #09090b 100%)',
    thumbCssBackdrop:
      'radial-gradient(circle at 50% 45%, #3f3f46 0%, #18181b 60%, #09090b 100%)',
    lightLeakCss:
      'radial-gradient(ellipse 66% 32% at 30% 22%, rgba(228, 228, 231, 0.18) 0%, transparent 72%)'
  },
  {
    index: 9,
    id: 'solar-eclipse',
    name: 'SOLAR ECLIPSE',
    stops: ['#000000', '#b45309', '#000000'],
    accentHex: '#FBBF24',
    leakHex: 'rgba(180, 83, 9, 0.48)',
    rimHex: 'rgba(251, 191, 36, 0.34)',
    cssBackdrop:
      'radial-gradient(circle at 50% 50%, #000000 0%, #000000 22%, rgba(180, 83, 9, 0.78) 34%, rgba(120, 53, 15, 0.35) 50%, #000000 76%), linear-gradient(180deg, #000000 0%, #1c0f00 50%, #000000 100%)',
    thumbCssBackdrop:
      'radial-gradient(circle at 50% 50%, #000000 0%, #000000 20%, #b45309 38%, #000000 76%)',
    lightLeakCss:
      'radial-gradient(circle at 50% 50%, transparent 22%, rgba(251, 191, 36, 0.25) 35%, transparent 56%)'
  }
];

export const TYPOGRAPHY_ARCHITECTURES: readonly TypographyArchitecture[] = [
  {
    index: 0,
    id: 'volt-surge',
    name: 'VOLT SURGE',
    banglaClass: 'font-black tracking-tight uppercase',
    englishClass: 'font-extrabold tracking-[0.38em]',
    dividerKind: 'streak',
    trackingBoostEm: 0.02,
    scaleMultiplier: 1.06
  },
  {
    index: 1,
    id: 'velocity-slash',
    name: 'VELOCITY SLASH',
    banglaClass: 'font-black italic -skew-x-6 tracking-wide',
    englishClass: 'font-bold italic tracking-[0.28em]',
    dividerKind: 'slash',
    trackingBoostEm: 0.04,
    scaleMultiplier: 1.02,
    italicStyle: true
  },
  {
    index: 2,
    id: 'macro-obsession',
    name: 'MACRO OBSESSION',
    banglaClass: 'font-black tracking-[0.18em]',
    englishClass: 'font-semibold tracking-[0.44em]',
    dividerKind: 'double',
    trackingBoostEm: 0.08,
    scaleMultiplier: 1.1
  },
  {
    index: 3,
    id: 'chromatic-pulse',
    name: 'CHROMATIC PULSE',
    banglaClass: 'font-extrabold tracking-wider',
    englishClass: 'font-bold tracking-[0.32em]',
    dividerKind: 'prism',
    trackingBoostEm: 0.03,
    scaleMultiplier: 1.0
  },
  {
    index: 4,
    id: 'hypnotic-turn',
    name: 'HYPNOTIC TURN',
    banglaClass: 'font-bold tracking-[0.22em]',
    englishClass: 'font-medium tracking-[0.48em]',
    dividerKind: 'pulse',
    trackingBoostEm: 0.1,
    scaleMultiplier: 0.98
  },
  {
    index: 5,
    id: 'strobe-cut',
    name: 'STROBE CUT',
    banglaClass: 'font-black tracking-tighter',
    englishClass: 'font-black tracking-[0.22em]',
    dividerKind: 'strobe',
    trackingBoostEm: -0.02,
    scaleMultiplier: 1.08
  },
  {
    index: 6,
    id: 'neon-rhythm',
    name: 'NEON RHYTHM',
    banglaClass: 'font-extrabold tracking-[0.12em]',
    englishClass: 'font-bold tracking-[0.36em]',
    dividerKind: 'neon-bar',
    trackingBoostEm: 0.05,
    scaleMultiplier: 1.02
  },
  {
    index: 7,
    id: 'anamorphic-stretch',
    name: 'ANAMORPHIC STRETCH',
    banglaClass: 'font-black tracking-[0.26em] scale-x-105',
    englishClass: 'font-bold tracking-[0.52em]',
    dividerKind: 'anamorphic-wide',
    trackingBoostEm: 0.12,
    scaleMultiplier: 0.96
  },
  {
    index: 8,
    id: 'raw-tension',
    name: 'RAW TENSION',
    banglaClass: 'font-black tracking-normal',
    englishClass: 'font-black tracking-[0.18em]',
    dividerKind: 'brutalist-rule',
    trackingBoostEm: 0.0,
    scaleMultiplier: 1.05
  },
  {
    index: 9,
    id: 'zero-gravity',
    name: 'ZERO GRAVITY',
    banglaClass: 'font-semibold tracking-[0.2em]',
    englishClass: 'font-normal tracking-[0.45em]',
    dividerKind: 'zero-line',
    trackingBoostEm: 0.09,
    scaleMultiplier: 0.95
  }
];

export const KINETIC_OPTICAL_FX_LIST: readonly KineticOpticalFx[] = [
  {
    index: 0,
    id: 'scale-drift',
    name: 'SCALE DRIFT',
    entranceClass: 'animate-proc-scale-drift',
    hasRgbSplit: false,
    hasFlareStreak: false,
    hasStrobePulse: false,
    hasBrutalistFrame: false,
    hasScanlines: false,
    hasCoronaRing: false
  },
  {
    index: 1,
    id: 'horizontal-kinetic-slide',
    name: 'KINETIC SLIDE',
    entranceClass: 'animate-proc-kinetic-slide',
    hasRgbSplit: false,
    hasFlareStreak: true,
    hasStrobePulse: false,
    hasBrutalistFrame: false,
    hasScanlines: false,
    hasCoronaRing: false
  },
  {
    index: 2,
    id: 'rgb-chromatic-split',
    name: 'RGB CHROMATIC SPLIT',
    entranceClass: 'animate-proc-rgb-split',
    hasRgbSplit: true,
    hasFlareStreak: false,
    hasStrobePulse: false,
    hasBrutalistFrame: false,
    hasScanlines: false,
    hasCoronaRing: false
  },
  {
    index: 3,
    id: 'anamorphic-flare-streak',
    name: 'ANAMORPHIC FLARE',
    entranceClass: 'animate-proc-flare-streak',
    hasRgbSplit: false,
    hasFlareStreak: true,
    hasStrobePulse: false,
    hasBrutalistFrame: false,
    hasScanlines: false,
    hasCoronaRing: false
  },
  {
    index: 4,
    id: 'strobe-pulse',
    name: 'STROBE PULSE',
    entranceClass: 'animate-proc-strobe-pulse',
    hasRgbSplit: false,
    hasFlareStreak: false,
    hasStrobePulse: true,
    hasBrutalistFrame: false,
    hasScanlines: false,
    hasCoronaRing: false
  },
  {
    index: 5,
    id: 'blur-sharp-snap',
    name: 'BLUR-TO-SHARP SNAP',
    entranceClass: 'animate-proc-blur-snap',
    hasRgbSplit: false,
    hasFlareStreak: false,
    hasStrobePulse: false,
    hasBrutalistFrame: false,
    hasScanlines: false,
    hasCoronaRing: false
  },
  {
    index: 6,
    id: 'brutalist-border-accent',
    name: 'BRUTALIST FRAME',
    entranceClass: 'animate-proc-brutalist-snap',
    hasRgbSplit: false,
    hasFlareStreak: false,
    hasStrobePulse: false,
    hasBrutalistFrame: true,
    hasScanlines: false,
    hasCoronaRing: false
  },
  {
    index: 7,
    id: 'vertigo-counter-drift',
    name: 'VERTIGO DRIFT',
    entranceClass: 'animate-proc-vertigo-drift',
    hasRgbSplit: true,
    hasFlareStreak: true,
    hasStrobePulse: false,
    hasBrutalistFrame: false,
    hasScanlines: false,
    hasCoronaRing: false
  },
  {
    index: 8,
    id: 'scanline-telemetry',
    name: 'SCANLINE SENSOR',
    entranceClass: 'animate-proc-scanline-lock',
    hasRgbSplit: false,
    hasFlareStreak: false,
    hasStrobePulse: false,
    hasBrutalistFrame: true,
    hasScanlines: true,
    hasCoronaRing: false
  },
  {
    index: 9,
    id: 'corona-halation',
    name: 'CORONA HALATION',
    entranceClass: 'animate-proc-corona-bloom',
    hasRgbSplit: false,
    hasFlareStreak: true,
    hasStrobePulse: true,
    hasBrutalistFrame: false,
    hasScanlines: false,
    hasCoronaRing: true
  }
];

/**
 * Resolves the deterministic procedural palette, typography architecture, and kinetic optical FX
 * for any shot index (0..99+).
 */
export function getShotProceduralSpec(shotIndex: number): ShotProceduralSpec {
  const safeIdx = Math.max(0, Math.floor(Number.isFinite(shotIndex) ? shotIndex : 0));
  const paletteIndex = Math.floor(safeIdx / 10) % 10;
  const archIndex = safeIdx % 10;
  const fxIndex = (safeIdx * 3) % 10;

  return {
    shotIndex: safeIdx,
    paletteIndex,
    palette: PROCEDURAL_PALETTES[paletteIndex],
    archIndex,
    architecture: TYPOGRAPHY_ARCHITECTURES[archIndex],
    fxIndex,
    opticalFx: KINETIC_OPTICAL_FX_LIST[fxIndex]
  };
}

/**
 * Checks whether a URL is a legacy bundled mockup asset or remote stock placeholder photo
 * rather than user-dropped local media (`blob:`, `data:`, or custom video/photo).
 */
export function isLegacyMockupPhotoUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return false;
  return (
    trimmed.includes('/assets/aistudio/') ||
    trimmed.includes('images.unsplash.com') ||
    trimmed.includes('picsum.photos')
  );
}

/**
 * Draws the deterministic procedural cinema color palette, anamorphic light leak,
 * optical flare streak / corona halo, and subtle film grain directly onto a 2D canvas.
 * Used both for the live stage canvas and lossless PNG freeze-frame exports.
 */
export function renderProceduralBackdropToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shotIndex: number,
  timeSec = 0
): void {
  const spec = getShotProceduralSpec(shotIndex);
  const { palette, opticalFx } = spec;
  const [darkStop, coreStop, edgeStop] = palette.stops;

  ctx.save();

  // 1. Base Diagonal Linear Gradient
  const lin = ctx.createLinearGradient(0, 0, width, height);
  lin.addColorStop(0, darkStop);
  lin.addColorStop(0.5, coreStop);
  lin.addColorStop(1, edgeStop);
  ctx.fillStyle = lin;
  ctx.fillRect(0, 0, width, height);

  // 2. Central / Off-axis Atmospheric Radial Core (breathing gently with timeSec)
  const driftX = Math.sin(timeSec * 0.45 + shotIndex) * width * 0.04;
  const driftY = Math.cos(timeSec * 0.35 + shotIndex * 0.5) * height * 0.03;
  const cx = width * 0.5 + driftX;
  const cy = height * 0.48 + driftY;
  const maxR = Math.max(width, height) * 0.72;

  const rad = ctx.createRadialGradient(cx, cy, maxR * 0.04, cx, cy, maxR);
  if (palette.id === 'solar-eclipse') {
    rad.addColorStop(0, '#000000');
    rad.addColorStop(0.24, '#000000');
    rad.addColorStop(0.36, coreStop);
    rad.addColorStop(0.55, 'rgba(120, 53, 15, 0.35)');
    rad.addColorStop(1, '#000000');
  } else {
    rad.addColorStop(0, coreStop);
    rad.addColorStop(0.52, darkStop);
    rad.addColorStop(1, edgeStop);
  }
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, width, height);

  // 3. Anamorphic Light Leak Accent
  const leakX = (shotIndex % 2 === 0 ? 0.2 : 0.8) * width;
  const leakY = (shotIndex % 3 === 0 ? 0.25 : 0.72) * height;
  const leakRad = ctx.createRadialGradient(leakX, leakY, 0, leakX, leakY, maxR * 0.48);
  leakRad.addColorStop(0, palette.leakHex);
  leakRad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = leakRad;
  ctx.fillRect(0, 0, width, height);

  // 4. Optional Anamorphic Horizontal Streak / Corona Ring
  if (opticalFx.hasFlareStreak) {
    const streakY = height * 0.5;
    const streakGrad = ctx.createLinearGradient(0, streakY, width, streakY);
    streakGrad.addColorStop(0, 'rgba(0,0,0,0)');
    streakGrad.addColorStop(0.5, palette.rimHex);
    streakGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = streakGrad;
    ctx.fillRect(0, streakY - 2, width, 4);
  }

  if (opticalFx.hasCoronaRing) {
    ctx.strokeStyle = palette.rimHex;
    ctx.lineWidth = Math.max(1.5, width * 0.002);
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.5, Math.min(width, height) * 0.28, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 5. Subtle Edge Vignette for Depth
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const vig = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    Math.min(width, height) * 0.3,
    width * 0.5,
    height * 0.5,
    maxR * 0.92
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.68)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}
