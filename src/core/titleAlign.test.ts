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
  assert.match(captionStripSrc, /h-5 min-h-\[20px\]/);
  assert.match(captionStripSrc, /text-neutral-500 group-hover:text-neutral-200/);

  const controlDockSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/ControlDock.tsx'),
    'utf8'
  );
  assert.match(controlDockSrc, /min-w-\[88px\] w-\[88px\] h-\[48px\]/);
  assert.match(controlDockSrc, /h-\[34px\] min-h-\[34px\]/);
});
