import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { resolveEffectiveTitleAlign, useStudioStore } from './store';

test('useStudioStore titleAlign defaults to MID and syncs with titlePosition', () => {
  const initial = useStudioStore.getState();
  assert.strictEqual(initial.titleAlign, 'MID');
  assert.strictEqual(initial.titlePosition, 'mid-bottom');

  initial.setTitleAlign('LEFT');
  assert.strictEqual(useStudioStore.getState().titleAlign, 'LEFT');
  assert.strictEqual(useStudioStore.getState().titlePosition, 'left-bottom');

  initial.setTitleAlign('RIGHT');
  assert.strictEqual(useStudioStore.getState().titleAlign, 'RIGHT');
  assert.strictEqual(useStudioStore.getState().titlePosition, 'right-bottom');

  initial.setTitleAlign('AUTO');
  assert.strictEqual(useStudioStore.getState().titleAlign, 'AUTO');
  assert.strictEqual(useStudioStore.getState().titlePosition, 'auto');

  // Restore default MID
  initial.setTitleAlign('MID');
  assert.strictEqual(useStudioStore.getState().titleAlign, 'MID');
});

test('resolveEffectiveTitleAlign handles fixed and AUTO rules accurately', () => {
  assert.strictEqual(resolveEffectiveTitleAlign('LEFT', 0), 'LEFT');
  assert.strictEqual(resolveEffectiveTitleAlign('MID', 3), 'MID');
  assert.strictEqual(resolveEffectiveTitleAlign('RIGHT', 2), 'RIGHT');

  // AUTO: hero establishing shot index 0 or WS/HERO shots center at MID
  assert.strictEqual(resolveEffectiveTitleAlign('AUTO', 0, 'MS'), 'MID');
  assert.strictEqual(resolveEffectiveTitleAlign('AUTO', 2, 'WS'), 'MID');
  assert.strictEqual(resolveEffectiveTitleAlign('AUTO', 3, 'HERO'), 'MID');

  // AUTO: subsequent shots alternate LEFT / RIGHT
  assert.strictEqual(resolveEffectiveTitleAlign('AUTO', 1, 'CU'), 'LEFT');
  assert.strictEqual(resolveEffectiveTitleAlign('AUTO', 2, 'MS'), 'RIGHT');
  assert.strictEqual(resolveEffectiveTitleAlign('AUTO', 3, 'MCU'), 'LEFT');
  assert.strictEqual(resolveEffectiveTitleAlign('AUTO', 4, 'OTS'), 'RIGHT');
});

test('Stage typography inside stage box, top bar wiring, duplicate 70%/100% cleanup, and technical-only bottom strip', () => {
  const overlaySrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/StageTextOverlay.tsx'),
    'utf8'
  );
  assert.match(overlaySrc, /pointer-events-none/);
  assert.match(overlaySrc, /select-none/);
  assert.match(overlaySrc, /z-20/);
  assert.match(overlaySrc, /items-start text-left pl-12/);
  assert.match(overlaySrc, /items-end text-right pr-12/);
  assert.match(overlaySrc, /items-center text-center/);
  assert.match(overlaySrc, /transition-\[left,transform\] duration-300 ease-out/);

  const topBarSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/stage/StageMetadataFxBar.tsx'),
    'utf8'
  );
  assert.match(topBarSrc, /text-neutral-500 border-neutral-900|border-neutral-900 text-neutral-500/);
  assert.match(topBarSrc, /group-hover:bg-amber-400 group-hover:text-black/);
  assert.match(topBarSrc, /data-testid=\{`title-align-\$\{align\}`\}/);
  assert.match(topBarSrc, /aria-label="Title Alignment"/);

  const stageHeaderSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/StageHeader.tsx'),
    'utf8'
  );
  assert.doesNotMatch(stageHeaderSrc, /aria-label="Header Stage Scale"/);

  const tactileStageSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/stage/TactileStage.tsx'),
    'utf8'
  );
  assert.match(tactileStageSrc, /<StageTextOverlay/);
  assert.doesNotMatch(tactileStageSrc, /SLEEK CINEMA MONITOR BEZEL RIBBON/);

  const captionStripSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/stage/StageCaptionStrip.tsx'),
    'utf8'
  );
  assert.doesNotMatch(captionStripSrc, /DEFAULT_BANGLA_HEADLINES/);
  assert.doesNotMatch(captionStripSrc, /hookText/);
  assert.match(captionStripSrc, /h-4 min-h-\[16px\]/);
  assert.match(captionStripSrc, /text-neutral-500 group-hover:text-neutral-200/);

  const controlDockSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/ControlDock.tsx'),
    'utf8'
  );
  assert.match(controlDockSrc, /min-w-\[80px\] w-\[80px\] h-\[34px\]/);
  assert.match(controlDockSrc, /h-\[22px\] min-h-\[22px\]/);
});

test('useStudioStore 9-zone title matrix syncs titleZone, titleAlign, shot titleData.zone9, and safe-zone overlay state', () => {
  const store = useStudioStore.getState();

  store.setTitleZone('top-left');
  let state = useStudioStore.getState();
  assert.strictEqual(state.titleZone, 'top-left');
  assert.strictEqual(state.titleAlign, 'LEFT');
  assert.strictEqual(state.project.shots[0]?.titleData?.zone9, 'top-left');
  assert.strictEqual(state.project.shots[0]?.titleData?.kineticEntrance, 'slide-from-left');

  store.setTitleZone('lower-right');
  state = useStudioStore.getState();
  assert.strictEqual(state.titleZone, 'lower-right');
  assert.strictEqual(state.titleAlign, 'RIGHT');
  assert.strictEqual(state.project.shots[0]?.titleData?.zone9, 'lower-right');
  assert.strictEqual(state.project.shots[0]?.titleData?.kineticEntrance, 'slide-from-right');

  store.setTitleZone('center-hero');
  state = useStudioStore.getState();
  assert.strictEqual(state.titleZone, 'center-hero');
  assert.strictEqual(state.titleAlign, 'MID');
  assert.strictEqual(state.project.shots[0]?.titleData?.kineticEntrance, 'center-bloom');

  store.setIsSafeZoneOverlayVisible(true);
  assert.strictEqual(useStudioStore.getState().isSafeZoneOverlayVisible, true);
  store.setIsSafeZoneOverlayVisible(false);
  assert.strictEqual(useStudioStore.getState().isSafeZoneOverlayVisible, false);

  store.setTitleZone('AUTO');
  state = useStudioStore.getState();
  assert.strictEqual(state.titleZone, 'AUTO');
  assert.strictEqual(state.titleAlign, 'AUTO');

  // Restore MID default
  store.setTitleAlign('MID');
});

test('resolveSpatialTitleChoreography enforces 90% title-safe anchors, directional entrance, and subject-aware AUTO', async () => {
  const { resolveSpatialTitleChoreography, TITLE_ZONE_9_MATRIX } = await import('../services/titleChoreographyEngine');

  assert.strictEqual(TITLE_ZONE_9_MATRIX.length, 9);

  // Manual 9-zone locks map strictly to 90% Title-Safe anchors & kinetic entrance
  const topLeft = resolveSpatialTitleChoreography({
    titleAlign: 'LEFT',
    zone9: 'top-left',
    layoutMode: 'center-hero',
    shotIndex: 2
  });
  assert.strictEqual(topLeft.zone9, 'top-left');
  assert.strictEqual(topLeft.effectiveAlign, 'LEFT');
  assert.strictEqual(topLeft.kineticEntrance, 'slide-from-left');
  assert.strictEqual(topLeft.anchorXRatio, 0.055);
  assert.strictEqual(topLeft.anchorYRatio, 0.165);

  const lowerRight = resolveSpatialTitleChoreography({
    titleAlign: 'RIGHT',
    zone9: 'lower-right',
    layoutMode: 'center-hero',
    shotIndex: 1
  });
  assert.strictEqual(lowerRight.zone9, 'lower-right');
  assert.strictEqual(lowerRight.effectiveAlign, 'RIGHT');
  assert.strictEqual(lowerRight.kineticEntrance, 'slide-from-right');
  assert.strictEqual(lowerRight.anchorXRatio, 0.945);
  assert.strictEqual(lowerRight.anchorYRatio, 0.81);

  // Subject-aware AUTO: establishing / hero wide shot centers at center-hero
  const autoHero = resolveSpatialTitleChoreography({
    titleAlign: 'AUTO',
    zone9: 'AUTO',
    layoutMode: 'center-hero',
    shotIndex: 0,
    shotType: 'WS'
  });
  assert.strictEqual(autoHero.zone9, 'center-hero');
  assert.strictEqual(autoHero.kineticEntrance, 'center-bloom');

  // Subject-aware AUTO: subject biased left (panX < 42) opposes title into RIGHT lower negative space
  const autoOpposeRight = resolveSpatialTitleChoreography({
    titleAlign: 'AUTO',
    zone9: 'AUTO',
    layoutMode: 'center-hero',
    shotIndex: 1,
    shotType: 'CU',
    panX: 25
  });
  assert.strictEqual(autoOpposeRight.zone9, 'lower-right');
  assert.strictEqual(autoOpposeRight.effectiveAlign, 'RIGHT');
  assert.strictEqual(autoOpposeRight.kineticEntrance, 'slide-from-right');

  // Subject-aware AUTO: smartCrop RIGHT opposes title into LEFT lower negative space
  const autoOpposeLeft = resolveSpatialTitleChoreography({
    titleAlign: 'AUTO',
    zone9: 'AUTO',
    layoutMode: 'center-hero',
    shotIndex: 2,
    shotType: 'MCU',
    smartCropMode: 'RIGHT'
  });
  assert.strictEqual(autoOpposeLeft.zone9, 'lower-left');
  assert.strictEqual(autoOpposeLeft.effectiveAlign, 'LEFT');
  assert.strictEqual(autoOpposeLeft.kineticEntrance, 'slide-from-left');
});

test('renderTitlePresetToCanvas maintains 1:1 9-zone coordinate and kinetic motion parity', async () => {
  const { renderTitlePresetToCanvas } = await import('../services/titleCanvasRenderer');
  const { CINEMATIC_TITLE_PRESETS, buildTitlePresetConfig } = await import('../constants/titleTemplates');
  const config = buildTitlePresetConfig(CINEMATIC_TITLE_PRESETS[0]);

  const captureTranslates = (zone9: 'top-left' | 'center-hero' | 'lower-right', entrance: 'slide-from-left' | 'center-bloom' | 'slide-from-right', t: number) => {
    const translates: Array<[number, number]> = [];
    const scales: Array<[number, number]> = [];
    const gradientStub = { addColorStop: () => {} };
    const ctx = {
      save: () => {},
      restore: () => {},
      translate: (x: number, y: number) => translates.push([x, y]),
      scale: (sx: number, sy: number) => scales.push([sx, sy]),
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      rect: () => {},
      roundRect: () => {},
      fill: () => {},
      stroke: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      createLinearGradient: () => gradientStub,
      createRadialGradient: () => gradientStub,
      measureText: () => ({ width: 120 }),
      fillText: () => {},
      strokeText: () => {},
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
      globalAlpha: 1
    } as unknown as CanvasRenderingContext2D;

    renderTitlePresetToCanvas(
      ctx,
      1920,
      804,
      {
        banglaTitle: 'দৃষ্টির সীমানা',
        englishTitle: 'ANAMORPHIC HORIZON',
        zone9,
        kineticEntrance: entrance,
        opacity: 1
      },
      config,
      t
    );
    return { translates, scales };
  };

  const tlSettled = captureTranslates('top-left', 'slide-from-left', 1.0);
  const tlEarly = captureTranslates('top-left', 'slide-from-left', 0.08);
  assert.strictEqual(Math.round(tlSettled.translates[0][0]), Math.round(1920 * 0.055));
  assert.strictEqual(Math.round(tlSettled.translates[0][1]), Math.round(804 * 0.165));
  assert.ok(tlEarly.translates[0][0] < tlSettled.translates[0][0], 'slide-from-left should enter from negative X offset at t=0.08s');

  const lrSettled = captureTranslates('lower-right', 'slide-from-right', 1.0);
  const lrEarly = captureTranslates('lower-right', 'slide-from-right', 0.08);
  assert.strictEqual(Math.round(lrSettled.translates[0][0]), 1920 - Math.round(1920 * 0.055));
  assert.strictEqual(Math.round(lrSettled.translates[0][1]), Math.round(804 * 0.81));
  assert.ok(lrEarly.translates[0][0] > lrSettled.translates[0][0], 'slide-from-right should enter from positive X offset at t=0.08s');

  const ctrSettled = captureTranslates('center-hero', 'center-bloom', 1.0);
  const ctrEarly = captureTranslates('center-hero', 'center-bloom', 0.08);
  assert.strictEqual(Math.round(ctrSettled.translates[0][0]), Math.round(1920 * 0.5));
  assert.strictEqual(Math.round(ctrSettled.translates[0][1]), Math.round(804 * 0.48));
  assert.ok(ctrEarly.scales[0][0] < ctrSettled.scales[0][0], 'center-bloom should scale up smoothly from sub-1.0 scale');
});

test('Consolidated 24px Top Stage HUD, 26px VlcStageBar Center Bridge, and elimination of TactileStage middle telemetry strip', () => {
  const tactileStageSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/stage/TactileStage.tsx'),
    'utf8'
  );
  assert.doesNotMatch(tactileStageSrc, /<StageCaptionStrip/, 'TactileStage must eliminate the middle StageCaptionStrip telemetry bar');
  assert.match(tactileStageSrc, /stage-safe-zone-guides/, 'TactileStage must render live 90%/93% Safe-Zone guide overlays');
  assert.match(tactileStageSrc, /totalRuntimeTimecode=/, 'TactileStage must pass totalRuntimeTimecode to VlcStageBar');

  const topBarSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/stage/StageMetadataFxBar.tsx'),
    'utf8'
  );
  assert.match(topBarSrc, /h-\[24px\]/, 'StageMetadataFxBar must enforce ultra-clean 24px height');
  assert.match(topBarSrc, /hud-lens-pill/);
  assert.match(topBarSrc, /hud-lut-pill/);
  assert.match(topBarSrc, /hud-engine-status-pill/);
  assert.match(topBarSrc, /title-choreography-grid-btn/);
  assert.match(topBarSrc, /title-zone-matrix-popover/);
  assert.doesNotMatch(topBarSrc, /onUploadMedia\(\)/, 'StageMetadataFxBar must not render duplicate Upload icon button');

  const vlcBarSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/stage/VlcStageBar.tsx'),
    'utf8'
  );
  assert.match(vlcBarSrc, /h-\[26px\]/, 'VlcStageBar must enforce 26px slim transport height');
  assert.match(vlcBarSrc, /vlc-center-telemetry-bridge/);
  assert.match(vlcBarSrc, /vlc-center-lut-badge/);
  assert.match(vlcBarSrc, /vlc-center-runtime-badge/);
});

