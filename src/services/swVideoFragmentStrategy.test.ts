import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractBufferedSegments,
  computeBufferedSummary,
  isTimeInBufferedSegments,
  type TimeRangesLike
} from '../utils/bufferRanges';
import {
  createVideoFragmentStrategy,
  parseHttpByteRange,
  parseContentRangeHeader,
  VIDEO_FRAGMENTS_CACHE
} from './swVideoFragmentStrategy';

class MemoryCache implements Cache {
  private store = new Map<string, { req: Request; res: Response }>();

  async match(request: RequestInfo | URL, options?: CacheQueryOptions): Promise<Response | undefined> {
    const url = typeof request === 'string' ? request : request instanceof URL ? request.toString() : request.url;
    if (options?.ignoreSearch) {
      const targetPath = url.split('?')[0];
      for (const [k, entry] of this.store.entries()) {
        if (k.split('?')[0] === targetPath) {
          return entry.res.clone();
        }
      }
      return undefined;
    }
    const found = this.store.get(url);
    return found ? found.res.clone() : undefined;
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    const req = request instanceof Request ? request : new Request(typeof request === 'string' ? request : request.toString());
    this.store.delete(req.url);
    this.store.set(req.url, { req, res: response.clone() });
  }

  async delete(request: RequestInfo | URL): Promise<boolean> {
    const url = typeof request === 'string' ? request : request instanceof URL ? request.toString() : request.url;
    return this.store.delete(url);
  }

  async keys(): Promise<readonly Request[]> {
    return Array.from(this.store.values()).map((entry) => entry.req);
  }

  async add(): Promise<void> {
    throw new Error('Not implemented in test mock');
  }
  async addAll(): Promise<void> {
    throw new Error('Not implemented in test mock');
  }
  async matchAll(): Promise<readonly Response[]> {
    return [];
  }
}

class MemoryCacheStorage {
  private cachesMap = new Map<string, MemoryCache>();

  async open(cacheName: string): Promise<Cache> {
    let c = this.cachesMap.get(cacheName);
    if (!c) {
      c = new MemoryCache();
      this.cachesMap.set(cacheName, c);
    }
    return c;
  }
}

function makeTimeRanges(pairs: Array<[number, number]>): TimeRangesLike {
  return {
    length: pairs.length,
    start: (i) => pairs[i][0],
    end: (i) => pairs[i][1]
  };
}

function makeSyntheticFile(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    bytes[i] = (i * 17 + 31) & 0xff;
  }
  return bytes;
}

describe('bufferRanges TimeRanges utilities', () => {
  it('merges overlapping/touching ranges and preserves discontinuous seek segments', () => {
    const ranges = makeTimeRanges([
      [15, 22],
      [0, 5],
      [5.01, 10], // within 0.02s merge threshold -> [0, 10]
      [-2, 1],
      [20, 35] // clamped to duration 30
    ]);

    const segs = extractBufferedSegments(ranges, 30);
    assert.equal(segs.length, 2);
    assert.equal(segs[0].startSec, 0);
    assert.equal(segs[0].endSec, 10);
    assert.equal(Math.round(segs[0].leftPct), 0);
    assert.equal(Math.round(segs[0].widthPct), 33);

    assert.equal(segs[1].startSec, 15);
    assert.equal(segs[1].endSec, 30);
    assert.equal(Math.round(segs[1].leftPct), 50);
    assert.equal(Math.round(segs[1].widthPct), 50);

    assert.equal(isTimeInBufferedSegments(segs, 7.5), true);
    assert.equal(isTimeInBufferedSegments(segs, 12.5), false);
    assert.equal(isTimeInBufferedSegments(segs, 29.5), true);
  });

  it('computes contiguous ahead-of-playhead runway and total buffered percentage', () => {
    const ranges = makeTimeRanges([
      [0, 12],
      [24, 36]
    ]);

    const summary = computeBufferedSummary(ranges, 4, 40);
    assert.equal(summary.currentTimePct, 10);
    assert.equal(summary.contiguousEndSec, 12);
    assert.equal(summary.contiguousAheadSec, 8);
    assert.equal(summary.contiguousEndPct, 30);
    assert.equal(summary.aheadWidthPct, 20);
    assert.equal(summary.totalBufferedSec, 24);
    assert.equal(summary.totalBufferedPct, 60);

    // Seeking into discontinuous segment [24..36] tracks runway from playhead (28 -> 36) without painting [0..28]
    const jumped = computeBufferedSummary(ranges, 28, 40);
    assert.equal(jumped.currentTimePct, 70);
    assert.equal(jumped.contiguousEndPct, 90);
    assert.equal(jumped.aheadWidthPct, 20);
  });
});

describe('swVideoFragmentStrategy byte-range & Cache API behavior', () => {
  it('parses HTTP Range and Content-Range headers accurately', () => {
    assert.deepEqual(parseHttpByteRange('bytes=0-65535'), { start: 0, end: 65535, isSuffix: false });
    assert.deepEqual(parseHttpByteRange('bytes=1024-'), { start: 1024, end: null, isSuffix: false });
    assert.deepEqual(parseHttpByteRange('bytes=-4096'), { start: 0, end: null, isSuffix: true, suffixLength: 4096 });
    assert.equal(parseHttpByteRange('invalid'), null);

    assert.deepEqual(parseContentRangeHeader('bytes 0-65535/524288'), {
      start: 0,
      end: 65535,
      totalBytes: 524288
    });
  });

  it('populates aligned blocks on miss, triggers lookahead, and serves repeat & cross-block ranges locally', async () => {
    const fileSize = 512 * 1024; // 512KB synthetic 4K stub (8 x 64KB fragments)
    const fileBytes = makeSyntheticFile(fileSize);
    const cacheStorage = new MemoryCacheStorage();
    const fetchRanges: string[] = [];

    const mockFetch: typeof fetch = async (_input, init) => {
      const headers = new Headers(init?.headers);
      const rangeHdr = headers.get('Range');
      fetchRanges.push(rangeHdr || 'full');
      const parsed = parseHttpByteRange(rangeHdr);
      const start = parsed ? parsed.start : 0;
      const end = parsed && parsed.end !== null ? Math.min(fileSize - 1, parsed.end) : fileSize - 1;
      const slice = fileBytes.slice(start, end + 1);
      return new Response(slice, {
        status: 206,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': String(slice.byteLength),
          'Accept-Ranges': 'bytes'
        }
      });
    };

    const strategy = createVideoFragmentStrategy(
      { caches: cacheStorage, fetch: mockFetch, origin: 'http://127.0.0.1:3000' },
      { fragmentSizeBytes: 64 * 1024, lookaheadBlocks: 2, maxCachedFragments: 16 }
    );

    const videoUrl = 'http://127.0.0.1:3000/api/local-video?path=C%3A%5Cmedia%5C4k_take.mp4';
    const backgroundJobs: Array<Promise<unknown>> = [];
    const waitUntil = (p: Promise<unknown>) => {
      backgroundJobs.push(p);
    };

    // 1. Initial range miss within block 0 -> fetches block 0 + lookahead blocks 1 and 2
    const res1 = await strategy.handleVideoRequest(
      new Request(videoUrl, { headers: { Range: 'bytes=0-16383' } }),
      waitUntil
    );
    assert.equal(res1.status, 206);
    assert.equal(res1.headers.get('X-SW-Cache'), 'fragment-populated');
    assert.equal(res1.headers.get('Content-Range'), `bytes 0-16383/${fileSize}`);
    assert.deepEqual(new Uint8Array(await res1.arrayBuffer()), fileBytes.slice(0, 16384));

    await Promise.all(backgroundJobs);
    assert.deepEqual(fetchRanges, [
      'bytes=0-65535',
      'bytes=65536-131071',
      'bytes=131072-196607'
    ]);

    // 2. Cross-fragment range spanning blocks 0..2 (already warmed!) returns immediately from local CacheStorage
    const res2 = await strategy.handleVideoRequest(
      new Request(videoUrl, { headers: { Range: 'bytes=60000-140000' } }),
      waitUntil
    );
    assert.equal(res2.status, 206);
    assert.equal(res2.headers.get('X-SW-Cache'), 'local-fragment-hit');
    assert.equal(res2.headers.get('Content-Range'), `bytes 60000-140000/${fileSize}`);
    assert.deepEqual(new Uint8Array(await res2.arrayBuffer()), fileBytes.slice(60000, 140001));

    // Await lookahead triggered by res2 (warms blocks 3 and 4 in background)
    await Promise.all(backgroundJobs);
    const countAfterWarm34 = fetchRanges.length;

    // 3. Subsequent request into block 3 now serves 100% locally with 0 additional network calls
    const res2b = await strategy.handleVideoRequest(
      new Request(videoUrl, { headers: { Range: 'bytes=197000-220000' } }),
      waitUntil
    );
    await Promise.all(backgroundJobs);
    assert.equal(res2b.status, 206);
    assert.equal(res2b.headers.get('X-SW-Cache'), 'local-fragment-hit');
    assert.deepEqual(new Uint8Array(await res2b.arrayBuffer()), fileBytes.slice(197000, 220001));
    assert.equal(fetchRanges[countAfterWarm34 - 1], 'bytes=262144-327679');

    // 4. Suffix range (bytes=-4096 -> tail block) returns exact trailing bytes
    const res3 = await strategy.handleVideoRequest(
      new Request(videoUrl, { headers: { Range: 'bytes=-4096' } }),
      waitUntil
    );
    await Promise.all(backgroundJobs);
    assert.equal(res3.status, 206);
    assert.equal(res3.headers.get('Content-Range'), `bytes ${fileSize - 4096}-${fileSize - 1}/${fileSize}`);
    assert.deepEqual(new Uint8Array(await res3.arrayBuffer()), fileBytes.slice(fileSize - 4096));
  });

  it('proactively prefetches head + tail fragments, enforces LRU cap, and supports purge', async () => {
    const fileSize = 640 * 1024; // 10 x 64KB blocks (indices 0..9)
    const fileBytes = makeSyntheticFile(fileSize);
    const cacheStorage = new MemoryCacheStorage();
    const fetchedRanges: string[] = [];

    const mockFetch: typeof fetch = async (_input, init) => {
      const rangeHdr = new Headers(init?.headers).get('Range');
      fetchedRanges.push(rangeHdr || 'full');
      const parsed = parseHttpByteRange(rangeHdr)!;
      const end = parsed.end !== null ? Math.min(fileSize - 1, parsed.end) : fileSize - 1;
      const slice = fileBytes.slice(parsed.start, end + 1);
      return new Response(slice, {
        status: 206,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Range': `bytes ${parsed.start}-${end}/${fileSize}`,
          'Content-Length': String(slice.byteLength)
        }
      });
    };

    const strategy = createVideoFragmentStrategy(
      { caches: cacheStorage, fetch: mockFetch, origin: 'http://127.0.0.1:3000' },
      { fragmentSizeBytes: 64 * 1024, lookaheadBlocks: 0, maxCachedFragments: 4 }
    );

    const videoA = 'http://127.0.0.1:3000/media/a.mp4';
    const videoB = 'http://127.0.0.1:3000/media/b.mp4';
    const warmedA = await strategy.prefetchVideoFragments([videoA]);
    assert.equal(warmedA, 3); // Block 0, Block 1, Tail Block 9
    assert.deepEqual(fetchedRanges, [
      'bytes=0-65535',
      'bytes=65536-131071',
      `bytes=${9 * 64 * 1024}-${fileSize - 1}`
    ]);

    // Prefetching videoB adds 3 more blocks -> total 6 fragments, capped down to maxCachedFragments = 4
    await strategy.prefetchVideoFragments([videoB]);
    const cache = await cacheStorage.open(VIDEO_FRAGMENTS_CACHE);
    const remainingKeys = (await cache.keys()).filter((r) => r.url.includes('/__sw_video_fragment__'));
    assert.equal(remainingKeys.length, 4);

    // Purge empties all fragment + meta entries cleanly
    await strategy.purgeFragments();
    assert.equal((await cache.keys()).length, 0);
  });

  it('handles open-ended range on short file smaller than initial block estimate cleanly', async () => {
    const fileSize = 20 * 1024; // 20KB short video < 64KB fragment size
    const fileBytes = makeSyntheticFile(fileSize);
    const cacheStorage = new MemoryCacheStorage();

    const mockFetch: typeof fetch = async (_input, init) => {
      const parsed = parseHttpByteRange(new Headers(init?.headers).get('Range'));
      const start = parsed ? parsed.start : 0;
      const end = parsed && parsed.end !== null ? Math.min(fileSize - 1, parsed.end) : fileSize - 1;
      const slice = fileBytes.slice(start, end + 1);
      return new Response(slice, {
        status: 206,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': String(slice.byteLength)
        }
      });
    };

    const strategy = createVideoFragmentStrategy(
      { caches: cacheStorage, fetch: mockFetch, origin: 'http://127.0.0.1:3000' },
      { fragmentSizeBytes: 64 * 1024, lookaheadBlocks: 2, maxCachedFragments: 8 }
    );

    const res = await strategy.handleVideoRequest(
      new Request('http://127.0.0.1:3000/media/short.mp4', { headers: { Range: 'bytes=0-' } })
    );
    assert.equal(res.status, 206);
    assert.equal(res.headers.get('Content-Range'), `bytes 0-${fileSize - 1}/${fileSize}`);
    assert.deepEqual(new Uint8Array(await res.arrayBuffer()), fileBytes);
  });
});
