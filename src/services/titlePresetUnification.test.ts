import { test } from 'node:test';
import assert from 'node:assert';
import {
  CINEMATIC_TITLE_PRESETS,
  buildTitlePresetConfig,
  buildDopamineTitlePresetConfig,
  applyTitleTemplateToFrame,
  stripDopamineDirectorNote,
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
