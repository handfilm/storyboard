import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  clampGpuPanZoom,
  computeThreeSlotIndices,
  createSeekGuardController,
  normalizeVideoSeekTarget,
  type SeekableVideoLike
} from '../utils/stagePlaybackMath';
import {
  HANDFILM_SHOT_PATHS_KEY,
  clearAllShotNativePaths,
  deleteShotNativePath,
  loadAllShotMedia,
  loadAllShotNativePaths,
  saveShotNativePath
} from './handfilmMediaVault';

test('computeThreeSlotIndices returns unique prev/active/next circular descriptors across shot counts', () => {
  assert.deepStrictEqual(computeThreeSlotIndices(0, 0), []);
  assert.deepStrictEqual(computeThreeSlotIndices(0, 1), [{ shotIdx: 0, role: 'active' }]);

  assert.deepStrictEqual(computeThreeSlotIndices(0, 2), [
    { shotIdx: 1, role: 'prev' },
    { shotIdx: 0, role: 'active' }
  ]);

  assert.deepStrictEqual(computeThreeSlotIndices(0, 100), [
    { shotIdx: 99, role: 'prev' },
    { shotIdx: 0, role: 'active' },
    { shotIdx: 1, role: 'next' }
  ]);

  assert.deepStrictEqual(computeThreeSlotIndices(99, 100), [
    { shotIdx: 98, role: 'prev' },
    { shotIdx: 99, role: 'active' },
    { shotIdx: 0, role: 'next' }
  ]);
});

test('createSeekGuardController enforces strict single-in-flight seek lock and fastSeek -> exact snap', () => {
  const calls: Array<{ method: 'fastSeek' | 'currentTime'; time: number }> = [];
  let pauseCalls = 0;

  const mockVideo: SeekableVideoLike = {
    currentTime: 0,
    duration: 12.0,
    paused: false,
    seeking: false,
    pause: () => {
      pauseCalls++;
      mockVideo.paused = true;
    },
    fastSeek: (t: number) => {
      calls.push({ method: 'fastSeek', time: t });
      mockVideo.seeking = true;
      mockVideo.currentTime = t;
    }
  };

  const wrappedVideo = new Proxy(mockVideo, {
    set(target, prop, value) {
      if (prop === 'currentTime') {
        calls.push({ method: 'currentTime', time: Number(value) });
        target.seeking = true;
      }
      (target as unknown as Record<string | symbol, unknown>)[prop] = value;
      return true;
    }
  });

  const guard = createSeekGuardController();

  // Rapid scrub starts: pauses once and issues fastSeek #1
  assert.strictEqual(guard.requestSeek(wrappedVideo, 2.5, { exact: false, pauseFirst: true }), true);
  assert.strictEqual(pauseCalls, 1);
  assert.strictEqual(guard.isSeeking(), true);
  assert.strictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0], { method: 'fastSeek', time: 2.5 });

  // Concurrent drags while seeking === true MUST queue only latest timestamp in pendingSeek
  assert.strictEqual(guard.requestSeek(wrappedVideo, 4.1, { exact: false }), false);
  assert.strictEqual(guard.requestSeek(wrappedVideo, 7.85, { exact: true }), false);
  assert.strictEqual(calls.length, 1);
  assert.deepStrictEqual(guard.getPendingSeek(), { timeSec: 7.85, exact: true });

  // Hardware finishes seek #1 -> onSeeked dispatches exact snap from pendingSeek
  wrappedVideo.seeking = false;
  assert.strictEqual(guard.handleSeeked(wrappedVideo), true);
  assert.strictEqual(calls.length, 2);
  assert.deepStrictEqual(calls[1], { method: 'currentTime', time: 7.85 });
  assert.strictEqual(guard.getPendingSeek(), null);

  // Hardware finishes seek #2 -> idle
  wrappedVideo.seeking = false;
  assert.strictEqual(guard.handleSeeked(wrappedVideo), false);
  assert.strictEqual(guard.isSeeking(), false);

  // Target >= duration wraps cleanly inside bounds
  assert.strictEqual(normalizeVideoSeekTarget(12.5, 12.0), 0.5);
});

test('clampGpuPanZoom clamps zoom within 1.0x-4.0x, zeros pan at 1.0x, and formats GPU translate3d', () => {
  const base = clampGpuPanZoom(0.5, 240, -180, 1920, 1080);
  assert.strictEqual(base.zoom, 1.0);
  assert.strictEqual(base.panX, 0);
  assert.strictEqual(base.panY, 0);
  assert.strictEqual(base.cssTransform, 'none');

  const zoomed = clampGpuPanZoom(6.0, 5000, -5000, 1000, 500);
  assert.strictEqual(zoomed.zoom, 4.0);
  // maxPanX = ((4 - 1) * 1000) / 2 = 1500; maxPanY = ((4 - 1) * 500) / 2 = 750
  assert.strictEqual(zoomed.panX, 1500);
  assert.strictEqual(zoomed.panY, -750);
  assert.strictEqual(zoomed.cssTransform, 'translate3d(1500.0px, -750.0px, 0) scale(4.0000)');
});

import { isVideoSourceUrl } from './thumbnailEngine';
import { isVideoMediaUrl } from '../utils/playbackClock';

test('handfilmMediaVault persists per-shot Tauri native paths without cross-shot bleed and hydrates via HTTP 206 local-video endpoint', async () => {
  const originalWindow = (globalThis as Record<string, unknown>).window;
  const originalLocalStorage = (globalThis as Record<string, unknown>).localStorage;

  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    }
  };

  try {
    (globalThis as Record<string, unknown>).localStorage = mockLocalStorage;
    (globalThis as Record<string, unknown>).window = {
      __TAURI_INTERNALS__: {}
    };

    clearAllShotNativePaths();

    const entryShot3 = saveShotNativePath('3', 'C:\\Movies\\Shot003_4K.mp4');
    const entryShot17 = saveShotNativePath('17', 'D:\\Stills\\Shot017.png');

    assert.strictEqual(entryShot3.type, 'video');
    assert.strictEqual(entryShot3.isTauriAsset, true);
    assert.strictEqual(entryShot3.nativePath, 'C:\\Movies\\Shot003_4K.mp4');
    assert.strictEqual(
      entryShot3.url,
      `http://127.0.0.1:5173/api/local-video?path=${encodeURIComponent('C:\\Movies\\Shot003_4K.mp4')}`
    );
    assert.strictEqual(isVideoSourceUrl(entryShot3.url), true);
    assert.strictEqual(isVideoMediaUrl(entryShot3.url), true);

    assert.strictEqual(entryShot17.type, 'image');
    assert.strictEqual(entryShot17.nativePath, 'D:\\Stills\\Shot017.png');
    assert.strictEqual(
      entryShot17.url,
      `http://127.0.0.1:5173/api/local-video?path=${encodeURIComponent('D:\\Stills\\Shot017.png')}`
    );
    assert.strictEqual(isVideoSourceUrl(entryShot17.url), false);
    assert.strictEqual(isVideoMediaUrl(entryShot17.url), false);

    const rawPaths = loadAllShotNativePaths();
    assert.strictEqual(Object.keys(rawPaths).length, 2);
    assert.ok(store.get(HANDFILM_SHOT_PATHS_KEY));

    const hydrated = await loadAllShotMedia();
    assert.strictEqual(hydrated['3']?.nativePath, 'C:\\Movies\\Shot003_4K.mp4');
    assert.strictEqual(hydrated['17']?.nativePath, 'D:\\Stills\\Shot017.png');

    // Deleting shot 3 must leave shot 17 intact
    deleteShotNativePath('3');
    const remaining = await loadAllShotMedia();
    assert.strictEqual(remaining['3'], undefined);
    assert.strictEqual(remaining['17']?.nativePath, 'D:\\Stills\\Shot017.png');
  } finally {
    if (originalWindow === undefined) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      (globalThis as Record<string, unknown>).window = originalWindow;
    }
    if (originalLocalStorage === undefined) {
      delete (globalThis as Record<string, unknown>).localStorage;
    } else {
      (globalThis as Record<string, unknown>).localStorage = originalLocalStorage;
    }
  }
});

test('tauri.conf.json enables dragDropEnabled and Windows WebView2 GPU hardware decoding flags', () => {
  const confPath = path.resolve(process.cwd(), 'src-tauri/tauri.conf.json');
  const raw = fs.readFileSync(confPath, 'utf8');
  const conf = JSON.parse(raw) as {
    app?: {
      windows?: Array<{ dragDropEnabled?: boolean; additionalBrowserArgs?: string }>;
      security?: { assetProtocol?: { enable?: boolean; scope?: string[] } };
    };
  };

  assert.strictEqual(conf.app?.windows?.[0]?.dragDropEnabled, true);
  const args = conf.app?.windows?.[0]?.additionalBrowserArgs || '';
  assert.ok(args.includes('PlatformHEVCDecoderSupport'));
  assert.ok(args.includes('HardwareMediaKeyHandling'));
  assert.ok(args.includes('--ignore-gpu-blocklist'));
  assert.ok(args.includes('--enable-gpu-rasterization'));
  assert.ok(args.includes('--enable-zero-copy'));
  assert.ok(args.includes('--disable-background-media-suspend'));
  assert.strictEqual(conf.app?.security?.assetProtocol?.enable, true);
  assert.deepStrictEqual(conf.app?.security?.assetProtocol?.scope, ['**']);
});

test('single hardware video decoder & GPU layer promotion invariants hold across Stage & Thumbnails', () => {
  const tactileStage = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/stage/TactileStage.tsx'),
    'utf8'
  );
  assert.ok(tactileStage.includes("const shouldPreloadAuto = slot.role === 'active' || slot.role === 'next'"));
  assert.ok(tactileStage.includes("preload={shouldPreloadAuto ? 'auto' : 'metadata'}"));
  assert.ok(tactileStage.includes('crossOrigin="anonymous"'));
  assert.ok(tactileStage.includes('playsInline'));
  assert.ok(tactileStage.includes("transform: 'translateZ(0)'"));
  assert.ok(tactileStage.includes("backfaceVisibility: 'hidden'"));

  const cinemaPlayer = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/player/CinemaPlayer.tsx'),
    'utf8'
  );
  assert.ok(cinemaPlayer.includes('crossOrigin="anonymous"'));
  assert.ok(cinemaPlayer.includes('preload="auto"'));
  assert.ok(cinemaPlayer.includes('playsInline'));
  assert.ok(cinemaPlayer.includes("transform: 'translateZ(0)'"));
  assert.ok(cinemaPlayer.includes("backfaceVisibility: 'hidden'"));

  const thumb = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/ShotMediaThumbnail.tsx'),
    'utf8'
  );
  const thumbCodeOnly = thumb.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.ok(!/<video[\s>]/i.test(thumbCodeOnly), 'ShotMediaThumbnail must never mount <video> decoders');
});
