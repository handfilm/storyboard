import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { audioEngine as serviceAudioEngine } from './audioEngine';
import { audioEngine as utilsAudioEngine } from '../utils/audioEngine';

test('audioEngine.toggleSnapToBeat toggles state cleanly and syncs across service and utils exports', () => {
  serviceAudioEngine.setSnapToBeatEnabled(false);
  assert.strictEqual(serviceAudioEngine.getIsSnapToBeatEnabled(), false);
  assert.strictEqual(utilsAudioEngine.getIsSnapToBeatEnabled(), false);

  const firstToggle = serviceAudioEngine.toggleSnapToBeat();
  assert.strictEqual(firstToggle, true);
  assert.strictEqual(serviceAudioEngine.getIsSnapToBeatEnabled(), true);
  assert.strictEqual(utilsAudioEngine.getIsSnapToBeatEnabled(), true);

  const secondToggle = utilsAudioEngine.toggleSnapToBeat();
  assert.strictEqual(secondToggle, false);
  assert.strictEqual(serviceAudioEngine.getIsSnapToBeatEnabled(), false);
  assert.strictEqual(utilsAudioEngine.getIsSnapToBeatEnabled(), false);
});

test('HUD fade-in CSS animation and ControlDock snap-to-beat toggle are wired properly', () => {
  const cssSource = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');
  assert.match(cssSource, /@keyframes\s+hudFadeIn/);
  assert.match(cssSource, /\.animate-hud-fade-in\s*\{/);

  const controlDockSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/ControlDock.tsx'),
    'utf8'
  );
  assert.match(controlDockSource, /audioEngine\.toggleSnapToBeat\(\)/);
  assert.match(controlDockSource, /data-testid="control-dock-snap-to-beat"/);
  assert.match(controlDockSource, /aria-pressed=\{effectiveSnapToBeat\}/);

  const tactileStageSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/stage/TactileStage.tsx'),
    'utf8'
  );
  assert.match(tactileStageSource, /animate-hud-fade-in/);

  const opticalFrameSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/OpticalFrame.tsx'),
    'utf8'
  );
  assert.match(opticalFrameSource, /animate-hud-fade-in/);
});
