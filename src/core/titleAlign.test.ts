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

test('Right-zone title anchoring prevents right-edge clipping & TactileStage enforces bounded 2.39:1 gate', async () => {
  const { resolveSpatialTitleChoreography } = await import('../services/titleChoreographyEngine');

  const rightTop = resolveSpatialTitleChoreography({
    titleAlign: 'RIGHT',
    zone9: 'top-right',
    layoutMode: 'center-hero',
    shotIndex: 2
  });
  assert.strictEqual(rightTop.cssLeft, 'auto');
  assert.strictEqual(rightTop.cssRight, '5%');
  assert.strictEqual(rightTop.cssTranslateX, '0%');
  assert.strictEqual(rightTop.cssMaxWidth, '55%');

  const leftTop = resolveSpatialTitleChoreography({
    titleAlign: 'LEFT',
    zone9: 'top-left',
    layoutMode: 'center-hero',
    shotIndex: 1
  });
  assert.strictEqual(leftTop.cssLeft, '5%');
  assert.strictEqual(leftTop.cssRight, 'auto');
  assert.strictEqual(leftTop.cssTranslateX, '0%');
  assert.strictEqual(leftTop.cssMaxWidth, '55%');

  const midCenter = resolveSpatialTitleChoreography({
    titleAlign: 'MID',
    zone9: 'center-hero',
    layoutMode: 'center-hero',
    shotIndex: 0
  });
  assert.strictEqual(midCenter.cssLeft, '50%');
  assert.strictEqual(midCenter.cssTranslateX, '-50%');
  assert.strictEqual(midCenter.cssMaxWidth, '82%');

  const overlaySrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/StageTextOverlay.tsx'),
    'utf8'
  );
  assert.match(overlaySrc, /wordBreak:\s*'keep-all'/);
  assert.match(overlaySrc, /overflowWrap:\s*'break-word'/);
  assert.doesNotMatch(overlaySrc, /\bw-max\b/, 'StageTextOverlay must not use unbounded w-max that clips right-aligned titles');

  const tactileStageSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/stage/TactileStage.tsx'),
    'utf8'
  );
  assert.match(tactileStageSrc, /2\.39 \/ 1/);
  assert.match(tactileStageSrc, /rgba\(245, 158, 11, 0\.22\)/);
  assert.match(tactileStageSrc, /bg-\[#050505\]/);
});

test('aiMediaService safely handles HTTP 200 HTML SPA responses without throwing generic failed (200)', async () => {
  const { parseApiJsonSafe, extractExactApiErrorMessage } = await import('../services/aiMediaService');

  const htmlRes = new Response('<!doctype html><html><body>SPA</body></html>', {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
  const parsedHtml = await parseApiJsonSafe(htmlRes);
  assert.strictEqual(parsedHtml.isJson, false);
  assert.strictEqual(parsedHtml.isHtmlFallback, true);

  const jsonRes = new Response(JSON.stringify({ success: true, imageUrl: 'data:image/png;base64,abc' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
  const parsedJson = await parseApiJsonSafe(jsonRes);
  assert.strictEqual(parsedJson.isJson, true);
  assert.strictEqual(parsedJson.isHtmlFallback, false);
  assert.strictEqual(parsedJson.payload.success, true);

  const msg = extractExactApiErrorMessage({ status: { message: 'Quota exceeded on model' } }, 'Fallback');
  assert.strictEqual(msg, 'Quota exceeded on model');

  const serviceSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/services/aiMediaService.ts'),
    'utf8'
  );
  assert.match(serviceSrc, /gemini-2\.5-flash-image/);
  assert.match(serviceSrc, /imagen-3\.0-generate-002/);
  assert.match(serviceSrc, /veo-2\.0-generate-001/);
});

test('Zero-Slider [ TITLE FX ] Cinema Typography & Framing Deck structure, Safe Guard bounds, Director Roles, Optical Finishes, and SYNC ALL', async () => {
  const topBarSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/stage/StageMetadataFxBar.tsx'),
    'utf8'
  );
  const overlaySrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/StageTextOverlay.tsx'),
    'utf8'
  );

  // Zero <input type="range"> sliders in Title FX Deck and StageTextOverlay quick HUD
  assert.doesNotMatch(topBarSrc, /type=["']range["']/i, 'StageMetadataFxBar must contain ZERO range sliders');
  assert.doesNotMatch(overlaySrc, /type=["']range["']/i, 'StageTextOverlay must contain ZERO range sliders');

  // Verify 4 tactile rows & controls exist (including template-driven 9-zone, roles, scale, tracking, swatches, finishes)
  for (const needle of [
    'title-fx-zone-auto',
    'title-fx-zone-${cell.lbl}',
    "lbl: 'TL'",
    "lbl: 'MC'",
    "lbl: 'BR'",
    'title-fx-nudge-up',
    'title-fx-nudge-down',
    'title-fx-nudge-left',
    'title-fx-nudge-right',
    'title-fx-nudge-reset',
    'title-fx-safe-guard',
    'title-fx-role-${role.id}',
    "id: 'imax-card'",
    "id: 'lower-3rd'",
    "id: 'subtitle'",
    "id: 'credit'",
    'title-fx-scale-minus',
    'title-fx-scale-${sz.lbl}',
    'title-fx-scale-plus',
    'title-fx-tracking-${trk.lbl}',
    "lbl: 'TIGHT'",
    "lbl: 'ANAMORPHIC'",
    'title-fx-swatch-${sw.id}',
    "id: 'pure-white'",
    "id: 'amber'",
    'title-fx-finish-${fin.id}',
    "id: 'clean'",
    "id: 'halation'",
    "id: 'scrim'",
    "id: 'kinetic'",
    'title-fx-open-drawer',
    'title-fx-sync-all',
    'SAVE TO ALL',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'e.shiftKey ? 2 : 12'
  ]) {
    assert.ok(topBarSrc.includes(needle), `Missing Title FX Deck control needle: ${needle}`);
  }

  for (const needle of [
    'quick-hud-nudge-up',
    'quick-hud-nudge-down',
    'quick-hud-nudge-left',
    'quick-hud-nudge-right',
    'quick-hud-nudge-reset',
    'quick-hud-save-all',
    'SAVE TO ALL',
    'e.shiftKey ? 2 : 12'
  ]) {
    assert.ok(overlaySrc.includes(needle), `Missing StageTextOverlay Quick Deck needle: ${needle}`);
  }

  // Safe Guard bounds & clamping logic
  const { clampTitleOffsetsForSafeGuard, resolveSpatialTitleChoreography } = await import(
    '../services/titleChoreographyEngine'
  );
  const clampedRightLower = clampTitleOffsetsForSafeGuard('lower-right', 180, 180, true);
  assert.strictEqual(clampedRightLower.x, 0, 'Safe Guard must prevent pushing lower-right title further into 9:16 right icon column');
  assert.strictEqual(clampedRightLower.y, 8, 'Safe Guard must prevent pushing lower-right title into 2.39:1 / 9:16 bottom dead-zone');

  const safeLr = resolveSpatialTitleChoreography({
    titleAlign: 'RIGHT',
    zone9: 'lower-right',
    shotIndex: 1,
    safeGuard: true,
    horizontalOffset: 120,
    verticalOffset: 100
  });
  assert.strictEqual(safeLr.safeGuardApplied, true);
  assert.strictEqual(safeLr.cssRight, '16%', 'Safe Guard clears 9:16 right-side engagement icons');
  assert.strictEqual(safeLr.cssVertical.bottom, '24%', 'Safe Guard clears 2.39:1 matte + 9:16 bottom caption dead-zone');
  assert.strictEqual(safeLr.clampedHorizontalOffset, 0);
  assert.strictEqual(safeLr.clampedVerticalOffset, 8);

  // Tactile store actions: Nudge (12px & 2px), Safe Guard, Director Role, Optical Finish, Swatch, SAVE TO ALL
  const store = useStudioStore.getState();
  store.setActiveShotIndex(0);
  store.updateShotTitleData(0, { banglaTitle: 'শট এক', englishSubtitle: 'SHOT ONE', eyebrowText: 'CH 01' });
  store.updateShotTitleData(1, { banglaTitle: 'শট দুই', englishSubtitle: 'SHOT TWO', eyebrowText: 'CH 02' });

  store.resetTitleOffset();
  store.nudgeTitleOffset(12, -12);
  let state = useStudioStore.getState();
  assert.strictEqual(state.project.shots[0]?.titleData?.horizontalOffset, 12);
  assert.strictEqual(state.project.shots[0]?.titleData?.verticalOffset, -12);

  // Shift-key 2px micro-precision nudge
  store.nudgeTitleOffset(2, -2);
  state = useStudioStore.getState();
  assert.strictEqual(state.project.shots[0]?.titleData?.horizontalOffset, 14);
  assert.strictEqual(state.project.shots[0]?.titleData?.verticalOffset, -14);

  store.toggleTitleSafeGuard();
  state = useStudioStore.getState();
  assert.strictEqual(state.project.shots[0]?.titleData?.safeGuard, true);

  store.applyDirectorTitleRole('lower-3rd');
  state = useStudioStore.getState();
  assert.strictEqual(state.project.shots[0]?.titleData?.directorRole, 'lower-3rd');
  assert.strictEqual(state.project.shots[0]?.titleData?.zone9, 'lower-left');
  assert.strictEqual(state.project.shots[0]?.titleData?.horizontalOffset, 0);
  assert.strictEqual(state.project.shots[0]?.titleData?.styleConfig?.backdropPlate?.enabled, true);

  store.nudgeTitleOffset(12, -12);
  store.setTitleMaterialSwatch('pure-white');
  state = useStudioStore.getState();
  assert.strictEqual(state.project.shots[0]?.titleData?.presetId, 'pure-white');
  assert.strictEqual(state.project.shots[0]?.titleData?.styleConfig?.primaryColor, '#FFFFFF');
  // Material swatch must preserve active directorRole
  assert.strictEqual(state.project.shots[0]?.titleData?.directorRole, 'lower-3rd');

  store.setTitleOpticalFinish('halation');
  state = useStudioStore.getState();
  assert.strictEqual(state.project.shots[0]?.titleData?.opticalFinish, 'halation');
  assert.strictEqual(state.project.shots[0]?.titleData?.styleConfig?.glowIntensity, 1.45);

  // SAVE TO ALL propagates grid, film role, and optical settings without overwriting Shot 1's unique titles
  store.copyTitleStyleToAllShots(0);
  state = useStudioStore.getState();
  assert.strictEqual(state.project.shots[1]?.titleData?.presetId, 'pure-white');
  assert.strictEqual(state.project.shots[1]?.titleData?.zone9, 'lower-left');
  assert.strictEqual(state.project.shots[1]?.titleData?.directorRole, 'lower-3rd');
  assert.strictEqual(state.project.shots[1]?.titleData?.opticalFinish, 'halation');
  assert.strictEqual(state.project.shots[1]?.titleData?.safeGuard, true);
  assert.strictEqual(state.project.shots[1]?.titleData?.horizontalOffset, 12);
  assert.strictEqual(state.project.shots[1]?.titleData?.verticalOffset, -12);
  assert.strictEqual(state.project.shots[1]?.titleData?.banglaTitle, 'শট দুই');
  assert.strictEqual(state.project.shots[1]?.titleData?.englishSubtitle, 'SHOT TWO');
  assert.strictEqual(state.project.shots[1]?.titleData?.eyebrowText, 'CH 02');

  // Restore clean defaults
  store.resetTitleOffset();
  store.setTitleSafeGuard(false);
  store.setTitlePreset('molten-gold');
  store.setTitleAlign('MID');
});


