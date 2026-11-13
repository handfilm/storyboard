/**
 * @file /src/services/swVideoFragmentStrategy.ts
 * @description Custom Service Worker Cache API Strategy for 4K Video Byte-Range Fragments.
 *
 * Key capabilities:
 * - Splits arbitrary 4K video URLs into aligned 2MB fragments inside `rawx-video-fragments-v1` CacheStorage.
 * - Local-first HTTP `206 Partial Content` fulfillment: satisfies single-fragment and cross-fragment
 *   `Range: bytes=...` requests directly from Cache API when cached, eliminating disk/network stalls.
 * - Proactive background lookahead: when serving fragment `N`, schedules background `waitUntil` prefetch
 *   of contiguous fragments `N+1` and `N+2` so sequential 4K playback stays ahead of the decoder.
 * - Proactive `prefetchVideoFragments(urls)`: warms head (fragments 0..1) + tail `moov` fragment for
 *   upcoming storyboard shots without downloading entire multi-GB files into CacheStorage.
 * - Bounded LRU fragment budget (`maxFragments`, default 128 = 256MB) to prevent quota exhaustion.
 */

export const VIDEO_FRAGMENTS_CACHE = 'rawx-video-fragments-v1';
export const DEFAULT_FRAGMENT_SIZE_BYTES = 2 * 1024 * 1024; // 2MB aligned fragment blocks
export const DEFAULT_MAX_CACHED_FRAGMENTS = 128; // ~256MB fragment budget
export const MAX_OPEN_ENDED_RESPONSE_BYTES = 4 * 1024 * 1024; // Cap open-ended `bytes=0-` window to 4MB

export interface FragmentStrategyConfig {
  fragmentSizeBytes?: number;
  maxCachedFragments?: number;
  lookaheadBlocks?: number;
  vaultCacheName?: string;
}

export interface VideoFragmentMeta {
  totalBytes: number;
  contentType: string;
  etag?: string;
  updatedAt: number;
}

export interface ParsedByteRange {
  start: number;
  end: number | null; // null means open-ended (`bytes=start-`)
  isSuffix: boolean;
  suffixLength?: number;
}

export interface FragmentStrategyDeps {
  caches: Pick<CacheStorage, 'open'>;
  fetch: typeof fetch;
  origin: string;
}

export function buildFragmentCacheKey(origin: string, videoUrl: string, blockIdx: number): string {
  return `${origin}/__sw_video_fragment__?url=${encodeURIComponent(videoUrl)}&block=${blockIdx}`;
}

export function buildMetaCacheKey(origin: string, videoUrl: string): string {
  return `${origin}/__sw_video_meta__?url=${encodeURIComponent(videoUrl)}`;
}

export function parseHttpByteRange(rangeHeader: string | null): ParsedByteRange | null {
  if (!rangeHeader) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) return null;

  const startStr = match[1];
  const endStr = match[2];

  if (!startStr && endStr) {
    const suffixLength = Number(endStr);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    return {
      start: 0,
      end: null,
      isSuffix: true,
      suffixLength
    };
  }

  const start = Number(startStr || 0);
  const end = endStr ? Number(endStr) : null;
  if (!Number.isFinite(start) || start < 0) return null;
  if (end !== null && (!Number.isFinite(end) || end < start)) return null;

  return {
    start,
    end,
    isSuffix: false
  };
}

export function parseContentRangeHeader(header: string | null): {
  start: number;
  end: number;
  totalBytes: number;
} | null {
  if (!header) return null;
  const match = /^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/i.exec(header.trim());
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  const totalBytes = match[3] === '*' ? end + 1 : Number(match[3]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(totalBytes)) {
    return null;
  }
  return { start, end, totalBytes };
}

export function normalizeVideoCacheUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    // Keep /api/local-video?path=... query intact! Strip ephemeral cache-busters only if any
    if (parsed.pathname === '/api/local-video') {
      const pathParam = parsed.searchParams.get('path') || '';
      return `${parsed.origin}${parsed.pathname}?path=${encodeURIComponent(pathParam)}`;
    }
    return parsed.origin + parsed.pathname + parsed.search;
  } catch {
    return rawUrl;
  }
}

export function createVideoFragmentStrategy(
  deps: FragmentStrategyDeps,
  config: FragmentStrategyConfig = {}
) {
  const fragmentSize = Math.max(64 * 1024, config.fragmentSizeBytes ?? DEFAULT_FRAGMENT_SIZE_BYTES);
  const maxFragments = Math.max(4, config.maxCachedFragments ?? DEFAULT_MAX_CACHED_FRAGMENTS);
  const lookaheadBlocks = Math.max(0, config.lookaheadBlocks ?? 2);
  const vaultCacheName = config.vaultCacheName ?? 'rawx-media-vault-v1';

  const inflightBlocks = new Map<string, Promise<Uint8Array | null>>();

  const readMeta = async (cache: Cache, canonicalUrl: string): Promise<VideoFragmentMeta | null> => {
    try {
      const metaReq = new Request(buildMetaCacheKey(deps.origin, canonicalUrl));
      const res = await cache.match(metaReq);
      if (!res) return null;
      const data = (await res.json()) as VideoFragmentMeta;
      if (data && Number.isFinite(data.totalBytes) && data.totalBytes > 0) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  };

  const writeMeta = async (
    cache: Cache,
    canonicalUrl: string,
    meta: VideoFragmentMeta
  ): Promise<void> => {
    try {
      const metaReq = new Request(buildMetaCacheKey(deps.origin, canonicalUrl));
      const res = new Response(JSON.stringify(meta), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cached-At': String(Date.now())
        }
      });
      await cache.put(metaReq, res);
    } catch {
      // Non-fatal metadata write failure
    }
  };

  const enforceFragmentBudget = async (cache: Cache): Promise<void> => {
    try {
      const keys = await cache.keys();
      const fragmentKeys = keys.filter((req) => req.url.includes('/__sw_video_fragment__'));
      if (fragmentKeys.length <= maxFragments) return;

      const excess = fragmentKeys.length - maxFragments;
      for (let i = 0; i < excess; i++) {
        await cache.delete(fragmentKeys[i]);
      }
    } catch {
      // Ignore budget pruning errors
    }
  };

  const fetchAndCacheAlignedBlock = async (
    cache: Cache,
    rawUrl: string,
    canonicalUrl: string,
    blockIdx: number,
    knownMeta: VideoFragmentMeta | null
  ): Promise<{ bytes: Uint8Array; meta: VideoFragmentMeta | null } | null> => {
    const keyUrl = buildFragmentCacheKey(deps.origin, canonicalUrl, blockIdx);

    // 1. Local-first Cache API hit check
    const cachedResp = await cache.match(new Request(keyUrl));
    if (cachedResp) {
      const arr = new Uint8Array(await cachedResp.arrayBuffer());
      const headerTotal = Number(cachedResp.headers.get('X-Total-Bytes') || 0);
      const contentType = cachedResp.headers.get('Content-Type') || knownMeta?.contentType || 'video/mp4';
      const meta: VideoFragmentMeta | null = headerTotal > 0
        ? { totalBytes: headerTotal, contentType, updatedAt: Date.now() }
        : knownMeta;
      return { bytes: arr, meta };
    }

    // Deduplicate concurrent network fetches for the exact same aligned block
    const existingInflight = inflightBlocks.get(keyUrl);
    if (existingInflight) {
      const arr = await existingInflight;
      if (!arr) return null;
      const freshMeta = await readMeta(cache, canonicalUrl);
      return { bytes: arr, meta: freshMeta || knownMeta };
    }

    const fetchPromise = (async (): Promise<Uint8Array | null> => {
      const blockStart = blockIdx * fragmentSize;
      const blockEnd = knownMeta && knownMeta.totalBytes > 0
        ? Math.min(knownMeta.totalBytes - 1, blockStart + fragmentSize - 1)
        : blockStart + fragmentSize - 1;

      if (blockStart > blockEnd) return null;

      try {
        const res = await deps.fetch(rawUrl, {
          method: 'GET',
          headers: { Range: `bytes=${blockStart}-${blockEnd}` },
          mode: 'cors',
          credentials: 'omit'
        });

        if (!res || (!res.ok && res.status !== 206)) {
          return null;
        }

        const buf = new Uint8Array(await res.arrayBuffer());
        const contentType = res.headers.get('Content-Type') || knownMeta?.contentType || 'video/mp4';
        const etag = res.headers.get('ETag') || undefined;
        const parsedCr = parseContentRangeHeader(res.headers.get('Content-Range'));

        let totalBytes = parsedCr?.totalBytes ?? knownMeta?.totalBytes ?? 0;
        if (res.status === 200 && buf.byteLength > 0) {
          // Server ignored Range and returned whole small file cleanly
          totalBytes = buf.byteLength;
          const totalBlocks = Math.ceil(buf.byteLength / fragmentSize);
          const nextMeta: VideoFragmentMeta = {
            totalBytes,
            contentType,
            etag,
            updatedAt: Date.now()
          };
          await writeMeta(cache, canonicalUrl, nextMeta);

          for (let b = 0; b < totalBlocks; b++) {
            const s = b * fragmentSize;
            const e = Math.min(buf.byteLength, s + fragmentSize);
            const slice = buf.slice(s, e);
            const fragKey = buildFragmentCacheKey(deps.origin, canonicalUrl, b);
            await cache.put(
              new Request(fragKey),
              new Response(slice, {
                status: 200,
                headers: {
                  'Content-Type': contentType,
                  'Content-Length': String(slice.byteLength),
                  'X-Total-Bytes': String(totalBytes),
                  'X-Block-Index': String(b),
                  'X-Cached-At': String(Date.now())
                }
              })
            );
          }
          await enforceFragmentBudget(cache);
          return buf.slice(blockStart, Math.min(buf.byteLength, blockStart + fragmentSize));
        }

        if (totalBytes <= 0) {
          totalBytes = blockStart + buf.byteLength;
        }

        const nextMeta: VideoFragmentMeta = {
          totalBytes,
          contentType,
          etag,
          updatedAt: Date.now()
        };
        await writeMeta(cache, canonicalUrl, nextMeta);

        await cache.put(
          new Request(keyUrl),
          new Response(buf, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Content-Length': String(buf.byteLength),
              'X-Total-Bytes': String(totalBytes),
              'X-Block-Index': String(blockIdx),
              'X-Cached-At': String(Date.now())
            }
          })
        );
        await enforceFragmentBudget(cache);
        return buf;
      } catch {
        return null;
      }
    })().finally(() => {
      inflightBlocks.delete(keyUrl);
    });

    inflightBlocks.set(keyUrl, fetchPromise);
    const bytes = await fetchPromise;
    if (!bytes) return null;
    const latestMeta = (await readMeta(cache, canonicalUrl)) || knownMeta;
    return { bytes, meta: latestMeta };
  };

  /**
   * Schedules background prefetch of upcoming fragments (`lastBlock + 1..lookaheadBlocks`)
   * without blocking the active HTTP 206 response.
   */
  const scheduleReadAhead = (
    cache: Cache,
    rawUrl: string,
    canonicalUrl: string,
    lastServedBlock: number,
    meta: VideoFragmentMeta | null,
    waitUntil?: (p: Promise<unknown>) => void
  ) => {
    if (lookaheadBlocks <= 0) return;
    const totalBlocks = meta && meta.totalBytes > 0
      ? Math.ceil(meta.totalBytes / fragmentSize)
      : Number.POSITIVE_INFINITY;

    const job = (async () => {
      for (let offset = 1; offset <= lookaheadBlocks; offset++) {
        const targetBlock = lastServedBlock + offset;
        if (targetBlock >= totalBlocks) break;
        const fragKey = new Request(buildFragmentCacheKey(deps.origin, canonicalUrl, targetBlock));
        const alreadyCached = await cache.match(fragKey);
        if (!alreadyCached) {
          await fetchAndCacheAlignedBlock(cache, rawUrl, canonicalUrl, targetBlock, meta);
        }
      }
    })();

    if (waitUntil) {
      waitUntil(job);
    }
  };

  /**
   * Local-first byte-range handler for Service Worker `fetch` events.
   * Serves cached 2MB video fragments directly from CacheStorage; populates misses and triggers lookahead.
   */
  const handleVideoRequest = async (
    request: Request,
    waitUntil?: (p: Promise<unknown>) => void
  ): Promise<Response> => {
    const rawUrl = request.url;
    const canonicalUrl = normalizeVideoCacheUrl(rawUrl);
    const rangeHdr = request.headers.get('range');
    const parsedRange = parseHttpByteRange(rangeHdr);

    // 1. Check legacy full-file vault cache first if present (strictly local hit)
    try {
      const vaultCache = await deps.caches.open(vaultCacheName);
      const vaultMatch = await vaultCache.match(rawUrl, { ignoreSearch: true });
      if (vaultMatch && vaultMatch.status === 200) {
        if (!parsedRange) return vaultMatch;
        const fullBuf = new Uint8Array(await vaultMatch.arrayBuffer());
        const fileSize = fullBuf.byteLength;
        const reqStart = parsedRange.isSuffix
          ? Math.max(0, fileSize - (parsedRange.suffixLength || 0))
          : parsedRange.start;
        const reqEnd = parsedRange.end !== null
          ? Math.min(fileSize - 1, parsedRange.end)
          : fileSize - 1;
        if (reqStart > reqEnd || reqStart >= fileSize) {
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${fileSize}` }
          });
        }
        const sliced = fullBuf.slice(reqStart, reqEnd + 1);
        return new Response(sliced, {
          status: 206,
          headers: {
            'Content-Type': vaultMatch.headers.get('Content-Type') || 'video/mp4',
            'Content-Range': `bytes ${reqStart}-${reqEnd}/${fileSize}`,
            'Content-Length': String(sliced.byteLength),
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, X-SW-Cache',
            'X-SW-Cache': 'vault-full-hit'
          }
        });
      }
    } catch {
      // Proceed to fragment cache
    }

    // Only intercept Range requests OR explicit video destinations in fragment strategy
    const cache = await deps.caches.open(VIDEO_FRAGMENTS_CACHE);
    let meta = await readMeta(cache, canonicalUrl);

    const effectiveRange: ParsedByteRange = parsedRange ?? {
      start: 0,
      end: MAX_OPEN_ENDED_RESPONSE_BYTES - 1,
      isSuffix: false
    };

    // Resolve suffix ranges (`bytes=-N`) using known or discovered metadata
    let reqStart = effectiveRange.start;
    let reqEnd = effectiveRange.end;

    if (effectiveRange.isSuffix) {
      if (!meta) {
        // Probe head block 0 cleanly to learn totalBytes before slicing suffix
        const headResult = await fetchAndCacheAlignedBlock(cache, rawUrl, canonicalUrl, 0, null);
        if (headResult?.meta) meta = headResult.meta;
      }
      if (!meta || meta.totalBytes <= 0) {
        return deps.fetch(request);
      }
      reqStart = Math.max(0, meta.totalBytes - (effectiveRange.suffixLength || fragmentSize));
      reqEnd = meta.totalBytes - 1;
    }

    // Clamp open-ended or ultra-large ranges so SW serves a fast-start 4MB `206` window from fragments
    if (reqEnd === null) {
      if (meta && meta.totalBytes > 0) {
        reqEnd = Math.min(meta.totalBytes - 1, reqStart + MAX_OPEN_ENDED_RESPONSE_BYTES - 1);
      } else {
        reqEnd = reqStart + fragmentSize - 1;
      }
    } else if (reqEnd - reqStart + 1 > MAX_OPEN_ENDED_RESPONSE_BYTES * 2) {
      reqEnd = reqStart + MAX_OPEN_ENDED_RESPONSE_BYTES - 1;
    }

    if (meta && meta.totalBytes > 0) {
      if (reqStart >= meta.totalBytes) {
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${meta.totalBytes}` }
        });
      }
      reqEnd = Math.min(meta.totalBytes - 1, reqEnd);
    }

    const firstBlock = Math.floor(reqStart / fragmentSize);
    const lastBlock = Math.floor(reqEnd / fragmentSize);

    const chunks: Uint8Array[] = [];
    let allLocalHits = true;
    let resolvedMeta: VideoFragmentMeta | null = meta;

    for (let b = firstBlock; b <= lastBlock; b++) {
      if (resolvedMeta && resolvedMeta.totalBytes > 0) {
        reqEnd = Math.min(resolvedMeta.totalBytes - 1, reqEnd);
        if (b * fragmentSize > reqEnd) {
          break;
        }
      }

      const keyReq = new Request(buildFragmentCacheKey(deps.origin, canonicalUrl, b));
      const hitResp = await cache.match(keyReq);

      let blockBytes: Uint8Array | null = null;
      if (hitResp) {
        blockBytes = new Uint8Array(await hitResp.arrayBuffer());
        const hdrTotal = Number(hitResp.headers.get('X-Total-Bytes') || 0);
        if (hdrTotal > 0 && !resolvedMeta) {
          resolvedMeta = {
            totalBytes: hdrTotal,
            contentType: hitResp.headers.get('Content-Type') || 'video/mp4',
            updatedAt: Date.now()
          };
          reqEnd = Math.min(resolvedMeta.totalBytes - 1, reqEnd);
        }
      } else {
        allLocalHits = false;
        const fetched = await fetchAndCacheAlignedBlock(cache, rawUrl, canonicalUrl, b, resolvedMeta);
        if (fetched) {
          blockBytes = fetched.bytes;
          if (fetched.meta) {
            resolvedMeta = fetched.meta;
            reqEnd = Math.min(resolvedMeta.totalBytes - 1, reqEnd);
          }
        }
      }

      if (!blockBytes) {
        // Fallback transparently to network if fragment fetch failed (e.g., CORS blocked upstream)
        return deps.fetch(request);
      }

      const blockBase = b * fragmentSize;
      const sliceStart = Math.max(0, reqStart - blockBase);
      const sliceEnd = Math.min(blockBytes.byteLength, reqEnd - blockBase + 1);
      if (sliceEnd > sliceStart) {
        chunks.push(blockBytes.subarray(sliceStart, sliceEnd));
      }
    }

    const totalLen = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const merged = new Uint8Array(totalLen);
    let writeOffset = 0;
    for (const c of chunks) {
      merged.set(c, writeOffset);
      writeOffset += c.byteLength;
    }

    const actualEnd = totalLen > 0 ? reqStart + totalLen - 1 : reqStart;
    const totalFileBytes = resolvedMeta?.totalBytes ?? (actualEnd + 1);
    const contentType = resolvedMeta?.contentType ?? 'video/mp4';

    // Proactively prefetch next fragments (+1, +2) in background
    scheduleReadAhead(cache, rawUrl, canonicalUrl, lastBlock, resolvedMeta, waitUntil);

    return new Response(merged, {
      status: 206,
      headers: {
        'Content-Type': contentType,
        'Content-Range': `bytes ${reqStart}-${actualEnd}/${totalFileBytes}`,
        'Content-Length': String(merged.byteLength),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, X-SW-Cache',
        'X-SW-Cache': allLocalHits ? 'local-fragment-hit' : 'fragment-populated'
      }
    });
  };

  /**
   * Proactively pre-fetches head (blocks 0..1) + tail `moov` fragment for a list of video URLs.
   */
  const prefetchVideoFragments = async (urls: string[]): Promise<number> => {
    if (!urls || urls.length === 0) return 0;
    const cache = await deps.caches.open(VIDEO_FRAGMENTS_CACHE);
    let warmedCount = 0;

    for (const rawUrl of urls) {
      if (!rawUrl || rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) continue;
      const canonicalUrl = normalizeVideoCacheUrl(rawUrl);
      let meta = await readMeta(cache, canonicalUrl);

      // Warm block 0 (first 2MB)
      const b0 = await fetchAndCacheAlignedBlock(cache, rawUrl, canonicalUrl, 0, meta);
      if (!b0) continue;
      warmedCount++;
      meta = b0.meta ?? meta;

      // Warm block 1 (2MB..4MB) and last block (moov atom if non-faststart)
      if (meta && meta.totalBytes > fragmentSize) {
        await fetchAndCacheAlignedBlock(cache, rawUrl, canonicalUrl, 1, meta);
        warmedCount++;
        const lastBlockIdx = Math.floor((meta.totalBytes - 1) / fragmentSize);
        if (lastBlockIdx > 1) {
          await fetchAndCacheAlignedBlock(cache, rawUrl, canonicalUrl, lastBlockIdx, meta);
          warmedCount++;
        }
      }
    }

    return warmedCount;
  };

  const purgeFragments = async (): Promise<void> => {
    try {
      const cache = await deps.caches.open(VIDEO_FRAGMENTS_CACHE);
      const keys = await cache.keys();
      await Promise.all(keys.map((k) => cache.delete(k)));
    } catch {
      // ignore
    }
  };

  return {
    handleVideoRequest,
    prefetchVideoFragments,
    purgeFragments,
    fragmentSize,
    maxFragments
  };
}
