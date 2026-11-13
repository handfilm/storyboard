import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import http from 'node:http';
import {
  createLocalVideoRangeMiddleware,
  LruByteBlockCache
} from '../server/localVideoRangeServer';
import {
  HEAD_PREFETCH_BYTES,
  MAX_KEYFRAME_BITMAPS,
  MAX_RAM_BLOB_CACHE_BYTES,
  videoCacheService
} from './videoCacheService';

test('LruByteBlockCache enforces max byte budget and LRU recency eviction', () => {
  const cache = new LruByteBlockCache(256 * 1024, 64 * 1024); // 256KB max
  const b0 = Buffer.alloc(100 * 1024, 1);
  const b1 = Buffer.alloc(100 * 1024, 2);
  const b2 = Buffer.alloc(100 * 1024, 3);

  cache.set('fileA', 0, b0);
  cache.set('fileA', 1, b1);
  // Touch block 0 so block 1 becomes least recently used
  assert.ok(cache.get('fileA', 0));
  assert.strictEqual(cache.hits, 1);

  cache.set('fileA', 2, b2); // Evicts block 1 to stay <= 256KB
  assert.ok(cache.get('fileA', 0));
  assert.strictEqual(cache.get('fileA', 1), undefined);
  assert.ok(cache.get('fileA', 2));
  assert.ok(cache.getStats().cachedBytes <= 256 * 1024);
});

test('localVideoRangeServer serves HTTP 206, ETag/304, private Cache-Control, and RAM block cache hits', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'handfilm-range-test-'));
  const filePath = path.join(tmpDir, 'sample_4k.mp4');

  // Create deterministic 1.5MB file
  const totalSize = 1536 * 1024;
  const fixture = Buffer.alloc(totalSize);
  for (let i = 0; i < totalSize; i += 4096) {
    fixture.writeUInt32BE(i, i);
  }
  fs.writeFileSync(filePath, fixture);

  const handler = createLocalVideoRangeMiddleware({
    maxCacheBytes: 4 * 1024 * 1024,
    chunkBytes: 512 * 1024,
    statTtlMs: 2000
  });

  const app = express();
  app.use('/api/local-video', handler.middleware);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}/api/local-video?path=${encodeURIComponent(filePath)}`;

  try {
    // 1. Initial range read: misses disk once and populates 512KB RAM block 0
    const res1 = await fetch(baseUrl, { headers: { Range: 'bytes=0-65535' } });
    assert.strictEqual(res1.status, 206);
    assert.strictEqual(res1.headers.get('accept-ranges'), 'bytes');
    assert.strictEqual(res1.headers.get('cache-control'), 'private, max-age=3600');
    assert.strictEqual(res1.headers.get('content-range'), `bytes 0-65535/${totalSize}`);
    const etag = res1.headers.get('etag');
    assert.ok(etag && etag.startsWith('"v1-'));
    const body1 = Buffer.from(await res1.arrayBuffer());
    assert.strictEqual(body1.byteLength, 65536);
    assert.deepStrictEqual(body1, fixture.subarray(0, 65536));
    assert.strictEqual(handler.cache.misses, 1);

    // 2. Repeat range read in block 0: served strictly from RAM block cache (0 extra misses!)
    const res2 = await fetch(baseUrl, { headers: { Range: 'bytes=4096-12287' } });
    assert.strictEqual(res2.status, 206);
    const body2 = Buffer.from(await res2.arrayBuffer());
    assert.deepStrictEqual(body2, fixture.subarray(4096, 12288));
    assert.strictEqual(handler.cache.hits, 1);
    assert.strictEqual(handler.cache.misses, 1);

    // 3. Conditional ETag request returns 304 Not Modified
    const res304 = await fetch(baseUrl, { headers: { 'If-None-Match': etag! } });
    assert.strictEqual(res304.status, 304);
    await res304.arrayBuffer();

    // 4. Tail moov range read returns exact trailing slice
    const tailStart = totalSize - 8192;
    const resTail = await fetch(baseUrl, { headers: { Range: `bytes=${tailStart}-${totalSize - 1}` } });
    assert.strictEqual(resTail.status, 206);
    const bodyTail = Buffer.from(await resTail.arrayBuffer());
    assert.deepStrictEqual(bodyTail, fixture.subarray(tailStart, totalSize));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('videoCacheService prefetches head+moov ranges, skips full-blob promotion on /api/local-video, and enforces RAM + bitmap LRU limits', async () => {
  const originalFetch = globalThis.fetch;
  const originalRevoke = URL.revokeObjectURL;

  const calls: Array<{ url: string; range: string | null }> = [];
  const revokedUrls: string[] = [];

  try {
    videoCacheService.clearAll();
    URL.revokeObjectURL = ((u: string) => {
      revokedUrls.push(u);
    }) as typeof URL.revokeObjectURL;

    // 10MB simulated file sizes so both head (0..4MB-1) and tail moov (total-1MB..total-1) ranges fire
    const simulatedTotal = 10 * 1024 * 1024;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = (init?.headers || {}) as Record<string, string>;
      const range = headers.Range || headers.range || null;
      calls.push({ url, range });

      if (range === `bytes=0-${HEAD_PREFETCH_BYTES - 1}`) {
        return new Response(new Uint8Array(64), {
          status: 206,
          headers: {
            'Content-Range': `bytes 0-${HEAD_PREFETCH_BYTES - 1}/${simulatedTotal}`,
            'Content-Length': '64'
          }
        });
      }
      return new Response(new Uint8Array(32), {
        status: 206,
        headers: {
          'Content-Range': `bytes ${simulatedTotal - 1048576}-${simulatedTotal - 1}/${simulatedTotal}`,
          'Content-Length': '32'
        }
      });
    }) as typeof fetch;

    const frames = [
      { id: 1, imageUrl: 'http://127.0.0.1:5173/api/local-video?path=C%3A%5Cshot1.mp4', isVideo: true },
      { id: 2, imageUrl: 'https://cdn.example.com/shot2.mp4', isVideo: true },
      { id: 3, imageUrl: 'https://cdn.example.com/shot3.png', isVideo: false }, // Still image skipped by video prefetcher
      { id: 4, imageUrl: 'https://cdn.example.com/shot4.mp4', isVideo: true }
    ];

    const scheduled = videoCacheService.prefetchShotWindow(frames, 0);
    assert.deepStrictEqual(scheduled, [
      'http://127.0.0.1:5173/api/local-video?path=C%3A%5Cshot1.mp4',
      'https://cdn.example.com/shot2.mp4',
      'https://cdn.example.com/shot4.mp4'
    ]);

    // Wait for async lookahead worker queue to drain
    await new Promise((r) => setTimeout(r, 40));

    // Verify head 4MB + tail 1MB range prefetches fired for shot1 (/api/local-video), and shot1 was NOT full-blob fetched
    const localVideoCalls = calls.filter((c) => c.url.includes('/api/local-video'));
    assert.strictEqual(localVideoCalls.length, 2);
    assert.strictEqual(localVideoCalls[0].range, `bytes=0-${HEAD_PREFETCH_BYTES - 1}`);
    assert.ok(localVideoCalls[1].range?.startsWith(`bytes=${simulatedTotal - 1048576}-`));

    // Verify Promoted RAM Blob LRU honors 256MB budget and revokes oldest ObjectURL on eviction
    const chunk40Mb = 40 * 1024 * 1024;
    for (let i = 0; i < 8; i++) {
      videoCacheService.insertPromotedBlob(
        `https://cdn.example.com/clip_${i}.mp4`,
        `blob:mock-${i}`,
        chunk40Mb
      );
    }
    const stats = videoCacheService.getStats();
    assert.ok(stats.promotedBlobBytes <= MAX_RAM_BLOB_CACHE_BYTES);
    assert.strictEqual(stats.promotedBlobCount, 6); // 6 * 40MB = 240MB <= 256MB
    assert.strictEqual(videoCacheService.getFastUrlSync('https://cdn.example.com/clip_0.mp4'), 'https://cdn.example.com/clip_0.mp4'); // Evicted
    assert.strictEqual(videoCacheService.getFastUrlSync('https://cdn.example.com/clip_7.mp4'), 'blob:mock-7');
    assert.ok(revokedUrls.includes('blob:mock-0'));
    assert.ok(revokedUrls.includes('blob:mock-1'));

    // Verify Keyframe ImageBitmap quantization & 150-frame LRU .close() eviction
    let closedCount = 0;
    const makeMockBitmap = (id: number) =>
      ({
        id,
        width: 160,
        height: 90,
        close: () => {
          closedCount++;
        }
      }) as unknown as ImageBitmap;

    videoCacheService.setKeyframeBitmap('https://cdn.example.com/a.mp4', 1.24, makeMockBitmap(999));
    // Quantized to 1.25s bucket
    const hitBitmap = videoCacheService.getKeyframeBitmap('https://cdn.example.com/a.mp4', 1.26) as any;
    assert.ok(hitBitmap && hitBitmap.id === 999);

    for (let i = 0; i < MAX_KEYFRAME_BITMAPS + 10; i++) {
      videoCacheService.setKeyframeBitmap(`https://cdn.example.com/b.mp4`, i * 0.5, makeMockBitmap(i));
    }
    assert.strictEqual(videoCacheService.getStats().keyframeBitmapCount, MAX_KEYFRAME_BITMAPS);
    assert.ok(closedCount >= 10);
  } finally {
    globalThis.fetch = originalFetch;
    URL.revokeObjectURL = originalRevoke;
    videoCacheService.clearAll();
  }
});
