import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  CINEMATIC_TITLE_PRESETS,
  buildTitlePresetConfig,
  buildDopamineTitlePresetConfig,
  applyTitleTemplateToFrame,
  stripDopamineDirectorNote,
  resolveShotTitleData,
  resolveShotTitlePresetConfig
} from '../constants/titleTemplates';
import { useStudioStore } from '../core/store';
import { resolveShotVideoOrImageCandidate, verifySequenceMediaReadiness } from './videoExportEngine';
import { renderTitlePresetToCanvas } from './titleCanvasRenderer';
import { AnthologyFrame } from '../types/anthology';
import { TitleLayoutMode, TitlePresetConfig } from '../types/titlePreset';

function createMockCanvasContext(): {
  ctx: CanvasRenderingContext2D;
  drawnTexts: string[];
  operations: string[];
} {
  const drawnTexts: string[] = [];
  const operations: string[] = [];
  const gradientStub = {
    addColorStop: () => {}
  };

  const ctx = {
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    translate: () => operations.push('translate'),
    scale: () => operations.push('scale'),
    beginPath: () => operations.push('beginPath'),
    moveTo: () => {},
    lineTo: () => {},
    rect: () => operations.push('rect'),
    roundRect: () => operations.push('roundRect'),
    fill: () => operations.push('fill'),
    stroke: () => operations.push('stroke'),
    fillRect: () => operations.push('fillRect'),
    strokeRect: () => operations.push('strokeRect'),
    createLinearGradient: () => gradientStub,
    createRadialGradient: () => gradientStub,
    measureText: (txt: string) => ({ width: (txt?.length || 1) * 14 }),
    fillText: (txt: string) => {
      drawnTexts.push(txt);
      operations.push(`fillText:${txt}`);
    },
    strokeText: (txt: string) => {
      operations.push(`strokeText:${txt}`);
    },
    setLineDash: () => {},
    font: '',
    textAlign: 'center',
    textBaseline: 'alphabetic',
    fillStyle: '#FFFFFF',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineJoin: 'round',
    shadowColor: 'transparent',
    shadowBlur: 0,
    globalAlpha: 1,
    letterSpacing: '0em'
  } as unknown as CanvasRenderingContext2D;

  return { ctx, drawnTexts, operations };
}

test('CINEMATIC_TITLE_PRESETS builds 15 distinct TitlePresetConfig objects across diverse layoutModes', () => {
  assert.strictEqual(CINEMATIC_TITLE_PRESETS.length, 15);
  const configs = CINEMATIC_TITLE_PRESETS.map((p) => buildTitlePresetConfig(p));

  const presetIds = new Set(configs.map((c) => c.presetId));
  const layoutModes = new Set(configs.map((c) => c.layoutMode));
  const animations = new Set(configs.map((c) => c.motionAnimation));
  const primaryColors = new Set(configs.map((c) => c.primaryColor));

  assert.strictEqual(presetIds.size, 15, 'Every preset must produce a unique presetId');
  assert.ok(layoutModes.size >= 5, `Expected at least 5 distinct layoutModes, got ${Array.from(layoutModes).join(', ')}`);
  assert.ok(animations.size >= 4, `Expected at least 4 distinct animations, got ${Array.from(animations).join(', ')}`);
  assert.ok(primaryColors.size >= 5, 'Expected distinct color palettes across presets');

  const sciFi = configs.find((c) => c.presetId === 'anamorphic-scifi-hud');
  assert.ok(sciFi);
  assert.strictEqual(sciFi.layoutMode, 'hud-bracket');
  assert.strictEqual(sciFi.primaryColor, '#00F0FF');

  const docu = configs.find((c) => c.presetId === 'docu-lower-third');
  assert.ok(docu);
  assert.strictEqual(docu.layoutMode, 'lower-third-bar');
  assert.strictEqual(docu.backdropPlate.enabled, true);

  const brutalist = configs.find((c) => c.presetId === 'brutalist-industrial');
  assert.ok(brutalist);
  assert.strictEqual(brutalist.layoutMode, 'brutalist-box');
  assert.ok(brutalist.strokeWidth > 0);
});

test('applyTitleTemplateToFrame clears Dopamine metadata, sets activeTitlePreset + titleStyleConfig, and preserves media', () => {
  const sciFiPreset = CINEMATIC_TITLE_PRESETS.find((p) => p.id === 'anamorphic-scifi-hud')!;
  const mockFrame: AnthologyFrame = {
    id: 1,
    epNumber: 'SH001',
    title: 'OLD DOPAMINE SHOT',
    bengaliTitle: 'ঘূর্ণন',
    tagline: 'STALE SUBTITLE',
    imageUrl: 'https://example.com/poster.jpg',
    videoUrl: 'blob:https://studio.local/shot-1-video',
    durationSec: 12,
    dopamineConfig: {
      presetId: 'viral_loop_1',
      presetName: 'THE HYPNOTIC TURN',
      hookText: 'ঘূর্ণন',
      subText: 'THE HYPNOTIC TURN',
      accentColor: '#FF2B2B',
      glitchIntensity: 90,
      strobeRate: 12,
      motionSpeed: 1.25
    },
    directorNotes: '[🌪️ DOPAMINE: THE HYPNOTIC TURN] — Spin lock on iris',
    tags: ['dopamine', 'hero'],
    aspectRatio: '2.39:1',
    colorAccent: '#FF2B2B',
    hoverStyle: 1,
    soundCue: '808 Sub',
    lutFilter: 'cinematic',
    adjustments: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      bloom: 20,
      grain: 15,
      motionBlur: 0,
      vignette: 25
    },
    cameraSpec: {
      focalLength: '35mm',
      aperture: 'T1.5',
      shutter: '180°',
      iso: '800',
      sensor: 'ARRI',
      format: '4K RAW'
    }
  };

  const updated = applyTitleTemplateToFrame(mockFrame, sciFiPreset);

  assert.strictEqual(updated.dopamineConfig, undefined);
  assert.strictEqual(updated.activeTitlePreset, 'anamorphic-scifi-hud');
  assert.ok(updated.titleStyleConfig);
  assert.strictEqual(updated.titleStyleConfig.layoutMode, 'hud-bracket');
  assert.strictEqual(updated.titleStyleConfig.primaryColor, '#00F0FF');
  assert.strictEqual(updated.videoUrl, 'blob:https://studio.local/shot-1-video');
  assert.strictEqual(updated.imageUrl, 'https://example.com/poster.jpg');
  assert.strictEqual(updated.durationSec, 12);
  assert.deepStrictEqual(updated.tags, ['hero']);
  assert.strictEqual(stripDopamineDirectorNote('[🌪️ DOPAMINE: THE HYPNOTIC TURN]'), '');
  assert.doesNotMatch(updated.directorNotes || '', /DOPAMINE/i);
});

test('useStudioStore synchronizes titleConfig sliders and shot titleStyleConfig bidirectionally', () => {
  const store = useStudioStore.getState();
  const docuPreset = CINEMATIC_TITLE_PRESETS.find((p) => p.id === 'docu-lower-third')!;
  const docuConfig = buildTitlePresetConfig(docuPreset);

  store.setShotTitlePresetConfig(0, docuConfig, true);
  let state = useStudioStore.getState();
  assert.strictEqual(state.titleConfig.activePresetConfig?.presetId, 'docu-lower-third');
  assert.strictEqual(state.project.shots[0]?.titleStyleConfig?.presetId, 'docu-lower-third');
  assert.strictEqual(state.project.shots[0]?.activeTitlePreset, 'docu-lower-third');
  assert.strictEqual(state.project.shots[0]?.dopamineConfig, undefined);

  store.setTitleSize(96);
  store.setTitleGlowIntensity(1.6);
  store.setTitleTracking(0.28);
  store.setTitleVerticalOffset(-40);

  state = useStudioStore.getState();
  assert.strictEqual(state.titleConfig.titleSize, 96);
  assert.strictEqual(state.titleConfig.activePresetConfig?.fontScale, 96);
  assert.strictEqual(state.project.shots[0]?.titleStyleConfig?.fontScale, 96);
  assert.strictEqual(state.project.shots[0]?.titleStyleConfig?.glowIntensity, 1.6);
  assert.strictEqual(state.project.shots[0]?.titleStyleConfig?.letterTracking, 0.28);
  assert.strictEqual(state.project.shots[0]?.titleStyleConfig?.verticalOffset, -40);

  // Restore Hero Molten Gold
  store.setTitlePreset('molten-gold');
  state = useStudioStore.getState();
  assert.strictEqual(state.titleConfig.preset, 'molten-gold');
  assert.strictEqual(state.project.shots[0]?.activeTitlePreset, 'molten-gold');
});

test('resolveShotVideoOrImageCandidate prioritizes video streams over poster thumbnails and skips SVG placeholders', () => {
  // 1. Video URL on shot wins over thumbnail image
  const vidFirst = resolveShotVideoOrImageCandidate(
    { videoUrl: 'blob:https://app.local/clip-01#vid', thumbnailUrl: 'https://cdn.local/thumb.jpg' },
    { imageUrl: 'https://cdn.local/still.png' },
    { thumbnail: 'https://cdn.local/slide-thumb.jpg' },
    0
  );
  assert.strictEqual(vidFirst.isVideo, true);
  assert.strictEqual(vidFirst.sourceKind, 'video');
  assert.strictEqual(vidFirst.url, 'blob:https://app.local/clip-01#vid');

  // 2. Slide videoSrc with isVideo hint beats SVG poster placeholders
  const slideVid = resolveShotVideoOrImageCandidate(
    { imageUrl: 'data:image/svg+xml;utf8,<svg></svg>' },
    { thumbnailUrl: 'data:image/svg+xml;utf8,<svg></svg>' },
    { assetUrl: 'https://cdn.local/scene_02.mp4', isVideo: true },
    1
  );
  assert.strictEqual(slideVid.isVideo, true);
  assert.strictEqual(slideVid.sourceKind, 'video');
  assert.strictEqual(slideVid.url, 'https://cdn.local/scene_02.mp4');

  // 3. SVG-only placeholder yields sourceKind === 'none'
  const svgOnly = resolveShotVideoOrImageCandidate(
    { imageUrl: 'data:image/svg+xml;utf8,<svg></svg>' },
    { thumbnailUrl: 'data:image/svg+xml;utf8,<svg></svg>' },
    {},
    2
  );
  assert.strictEqual(svgOnly.sourceKind, 'none');
  assert.strictEqual(svgOnly.url, null);

  // 4. verifySequenceMediaReadiness accurately counts videos, stills, and procedural slates
  const readiness = verifySequenceMediaReadiness(
    [0, 1, 2],
    [
      { videoUrl: 'https://cdn.local/a.mp4' },
      { remoteUrl: 'https://cdn.local/b.png' },
      {}
    ],
    [{}, {}, {}]
  );
  assert.strictEqual(readiness.totalShots, 3);
  assert.strictEqual(readiness.videoReadyCount, 1);
  assert.strictEqual(readiness.imageOnlyCount, 1);
  assert.strictEqual(readiness.proceduralSlateCount, 1);
});

test('renderTitlePresetToCanvas renders all 6 layoutModes + DOPAMINE cleanly without breaking Bangla ligatures', () => {
  const sampleByLayout: Array<{ layout: TitleLayoutMode; config: TitlePresetConfig }> = [
    {
      layout: 'center-hero',
      config: buildTitlePresetConfig(CINEMATIC_TITLE_PRESETS.find((p) => p.id === 'atelier-gold-dual')!)
    },
    {
      layout: 'lower-third-bar',
      config: buildTitlePresetConfig(CINEMATIC_TITLE_PRESETS.find((p) => p.id === 'docu-lower-third')!)
    },
    {
      layout: 'hud-bracket',
      config: buildTitlePresetConfig(CINEMATIC_TITLE_PRESETS.find((p) => p.id === 'anamorphic-scifi-hud')!)
    },
    {
      layout: 'brutalist-box',
      config: buildTitlePresetConfig(CINEMATIC_TITLE_PRESETS.find((p) => p.id === 'brutalist-industrial')!)
    },
    {
      layout: 'editorial-split',
      config: buildTitlePresetConfig(CINEMATIC_TITLE_PRESETS.find((p) => p.id === 'editorial-runway')!)
    },
    {
      layout: 'minimal-whisper',
      config: buildTitlePresetConfig(CINEMATIC_TITLE_PRESETS.find((p) => p.id === 'minimal-poetry-cinema')!)
    },
    {
      layout: 'brutalist-box',
      config: buildDopamineTitlePresetConfig({
        presetId: 'viral_loop_1',
        presetName: 'THE HYPNOTIC TURN',
        accentColor: '#FF2B2B',
        glitchIntensity: 85
      })
    }
  ];

  const banglaConjunct = 'দৃষ্টির সীমানা';

  for (const sample of sampleByLayout) {
    assert.strictEqual(sample.config.layoutMode, sample.layout);
    const { ctx, drawnTexts } = createMockCanvasContext();
    renderTitlePresetToCanvas(
      ctx,
      1920,
      804,
      {
        banglaTitle: banglaConjunct,
        englishTitle: 'THE SINGULARITY',
        dialogue: 'Slow spiral camera movement',
        cameraInfo: '35mm · T1.5',
        effectiveAlign: 'MID',
        opacity: 1.0
      },
      sample.config,
      0.5
    );
    assert.ok(
      drawnTexts.some((t) => t.includes(banglaConjunct)),
      `Layout "${sample.layout}" (${sample.config.presetId}) must render complete Bangla conjunct string without character splitting`
    );
  }

  // Also check resolveShotTitlePresetConfig respects explicit Dopamine vs cleared preset
  const resolvedNonDopamine = resolveShotTitlePresetConfig({
    titleStyleConfig: sampleByLayout[2].config,
    dopamineConfig: undefined
  });
  assert.strictEqual(resolvedNonDopamine.layoutMode, 'hud-bracket');
});

test('Per-shot ShotTitleData isolation & Copy Style To All preserve unique shot text', () => {
  const store = useStudioStore.getState();
  assert.strictEqual(store.titleConfig.heroGlobal, false, 'heroGlobal should default to false for strict per-shot isolation');

  // Customize Shot 0 and Shot 1 text independently
  store.updateShotTitleData(0, {
    banglaTitle: 'প্রথম শট বাংলা',
    englishSubtitle: 'SHOT ONE TITLE',
    captionNote: 'Note One'
  });
  store.updateShotTitleData(1, {
    banglaTitle: 'দ্বিতীয় শট বাংলা',
    englishSubtitle: 'SHOT TWO TITLE',
    captionNote: 'Note Two'
  });

  // Update Shot 2 typography & preset ONLY
  const glitchPreset = CINEMATIC_TITLE_PRESETS.find((p) => p.id === 'neon-glitch-pulse')!;
  const glitchConfig = buildTitlePresetConfig(glitchPreset);
  store.updateShotTitleData(2, {
    enabled: false,
    presetId: glitchPreset.id,
    banglaTitle: 'তৃতীয় শট বাংলা',
    englishSubtitle: 'SHOT THREE UNIQUE',
    alignment: 'RIGHT',
    fontScale: 84,
    glowIntensity: 1.75,
    letterTracking: 0.32,
    verticalOffset: -30,
    styleConfig: glitchConfig
  });

  let state = useStudioStore.getState();
  assert.strictEqual(state.project.shots[0]?.titleData?.banglaTitle, 'প্রথম শট বাংলা');
  assert.strictEqual(state.project.shots[1]?.titleData?.banglaTitle, 'দ্বিতীয় শট বাংলা');
  assert.strictEqual(state.project.shots[2]?.titleData?.banglaTitle, 'তৃতীয় শট বাংলা');
  assert.strictEqual(state.project.shots[2]?.titleData?.enabled, false);
  assert.notStrictEqual(state.project.shots[0]?.titleData?.presetId, glitchPreset.id);

  // Copy style from Shot 2 to all shots -> visual style propagates, Shot 0 & 1 text stays intact
  store.copyTitleStyleToAllShots(2);
  state = useStudioStore.getState();
  assert.strictEqual(state.project.shots[0]?.titleData?.presetId, glitchPreset.id);
  assert.strictEqual(state.project.shots[0]?.titleData?.alignment, 'RIGHT');
  assert.strictEqual(state.project.shots[0]?.titleData?.fontScale, 84);
  assert.strictEqual(state.project.shots[0]?.titleData?.banglaTitle, 'প্রথম শট বাংলা');
  assert.strictEqual(state.project.shots[1]?.titleData?.englishSubtitle, 'SHOT TWO TITLE');

  const resolvedShot2 = resolveShotTitleData(state.project.shots[2], 2);
  assert.strictEqual(resolvedShot2.enabled, false);
});

test('StudioNavRail has exact 10 ordered tools (STORY..SYSTEM with LIGHT above FX) and ControlDock applies active-only color', () => {
  const railSource = readFileSync(new URL('../components/StudioNavRail.tsx', import.meta.url), 'utf8');
  const keys = Array.from(railSource.matchAll(/key:\s*'([A-Z]+)'/g)).map((m) => m[1]);
  assert.deepStrictEqual(keys, ['STORY', 'MEDIA', 'TEXT', 'AUDIO', 'CUT', 'CROP', 'LIGHT', 'FX', 'BRIDGE', 'SYSTEM']);
  assert.ok(railSource.includes('w-[18px] h-[18px]'), 'StudioNavRail must render compact 18px icons');
  assert.ok(railSource.includes('w-[50px]'), 'StudioNavRail must use compact 50px collapsed width');
  assert.strictEqual(keys.includes('CLOUD'), false);

  const dockSource = readFileSync(new URL('../components/ControlDock.tsx', import.meta.url), 'utf8');
  assert.ok(dockSource.includes('scale-[1.04]'), 'Active thumbnail card must lift with scale-[1.04]');
  assert.ok(dockSource.includes('grayscale(100%)'), 'Inactive thumbnail cards must render monochrome stealth filter');
  assert.ok(dockSource.includes('blur(1.5px)'), 'Inactive thumbnail cards must render subtle blur(1.5px)');
  assert.ok(dockSource.includes('opacity-50'), 'Inactive thumbnail cards must dim to opacity-50');
});

test('Compact chrome proportions, decoupled ManifestoOverlay, single-screen 73/27 HandfilmHome, and 2.39:1 Stage aspect lock', () => {
  const headerSource = readFileSync(new URL('../components/StageHeader.tsx', import.meta.url), 'utf8');
  assert.ok(headerSource.includes('h-[38px]'), 'StageHeader must render at compact 38px height');
  assert.ok(headerSource.includes("Director&apos;s Manifesto"), 'StageHeader HOME dropdown must expose Director\'s Manifesto separately');

  const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  assert.ok(appSource.includes('<ManifestoOverlay onLaunchStudio={handleCloseWalkthrough} />'), 'App must render standalone ManifestoOverlay decoupled from HandfilmHome');
  assert.ok(appSource.includes('max-w-screen h-screen max-h-screen'), 'App root shell must enforce 100vw/100vh bounds');

  const manifestoSource = readFileSync(new URL('../components/landing/ManifestoOverlay.tsx', import.meta.url), 'utf8');
  assert.ok(manifestoSource.includes("DIRECTOR'S MANIFESTO"), 'ManifestoOverlay must retain original RAWx // DIRECTOR\'S MANIFESTO header');
  assert.ok(manifestoSource.includes('SKIP TO STUDIO'), 'ManifestoOverlay must retain SKIP TO STUDIO trigger');
  assert.ok(manifestoSource.includes('ACTIVE PROBE'), 'ManifestoOverlay must retain original SYSTEM TELEMETRY / ACTIVE PROBE widget');

  const overlaySource = readFileSync(new URL('../components/StageTextOverlay.tsx', import.meta.url), 'utf8');
  assert.ok(overlaySource.includes('clamp('), 'StageTextOverlay must clamp hero font size responsively');
  assert.ok(overlaySource.includes('cqw'), 'StageTextOverlay must scale proportionally inside locked stage container');

  const homeSource = readFileSync(new URL('../components/home/HandfilmHome.tsx', import.meta.url), 'utf8');
  assert.ok(homeSource.includes('h-[calc(100vh-38px)] max-h-[calc(100vh-38px)] overflow-hidden'), 'HandfilmHome must fit cleanly in a single screen with zero vertical scroll');
  assert.ok(homeSource.includes('lg:grid-cols-[73fr_27fr]'), 'HandfilmHome must use wider 73% slider + 27% compact workspace deck layout');

  const expectedSlides = [
    'দৃষ্টির সীমানা',
    'BEYOND THE FRAME // RAW 4K ANAMORPHIC ARCHITECTURE',
    'সময়ের গতি',
    'VELOCITY WITHOUT COMPROMISE // LIGHT-SPEED NLE ENGINE',
    'আলোর কাব্য',
    'SCULPTED IN TUNGSTEN & SHADOW // 35MM HALATION SCIENCE',
    'নিখুঁত ছন্দ',
    'FRAME-ACCURATE PRECISION // EVERY CUT IS A PULSE',
    'কল্পনার যন্ত্র',
    'WHERE AI MEETS AUTEUR CINEMA // ZERO LATENCY CREATION',
    'বারো সেকেন্ডের ঝড়',
    '12S HYPER-REEL ENGINE // ENGINEERED FOR INSTANT IMPACT',
    'অদম্য শিল্প',
    'BRUTALIST INDUSTRIAL AESTHETIC // BUILT FOR STORYTELLERS',
    'প্রতিটি ফ্রেমে প্রাণ',
    'TRUE 16-BIT COLOR & MOTION // UNCOMPRESSED VISION',
    'শব্দের প্রতিধ্বনি',
    'SUB-HARMONIC AUDIO SYNC // FEEL THE TRANSIENT BEAT',
    'নতুন যুগের সিনেমা',
    'HANDFILM STUDIO // ARCHITECT THE FUTURE OF FILM',
  ];
  for (const text of expectedSlides) {
    assert.ok(homeSource.includes(text), `Missing manifesto slide string: ${text}`);
  }
  for (const label of ['STAGE', '12S REELS', 'SCRUB', 'COCKPIT', 'ENTER STUDIO WORKSPACE', '#F59E0B', '#F43F5E', '#06B6D4', '#A855F7']) {
    assert.ok(homeSource.includes(label), `Missing compact animated deck token: ${label}`);
  }

  const stageSource = readFileSync(new URL('../components/stage/TactileStage.tsx', import.meta.url), 'utf8');
  assert.ok(stageSource.includes('computeLockedStageBoxStyle'), 'TactileStage must lock stage canvas using computeLockedStageBoxStyle');
  assert.ok(stageSource.includes('bg-[#050505]'), 'TactileStage must center locked frame inside #050505 matte theater well');

  const aspectSource = readFileSync(new URL('../utils/stageAspect.ts', import.meta.url), 'utf8');
  assert.ok(aspectSource.includes('aspectRatio:'), 'stageAspect must apply explicit CSS aspectRatio lock');
  assert.ok(aspectSource.includes('2.39'), 'stageAspect must default to 2.39:1 anamorphic gate');
});

