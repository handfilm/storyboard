/**
 * @file /public/sw.js
 * @description Master Service Worker for RAWx Storyboard & HANDFILM Studio.
 * 
 * Capabilities:
 * 1. Dedicated Media Asset Cache ('rawx-media-vault-v1'):
 *    - Intercepts and caches 4K video plates (.mp4, .webm, .mov), audio stems (.wav, .mp3),
 *      and storyboard frames (.png, .jpg, .webp).
 *    - Implements CacheFirst strategy for high-bandwidth assets with Range Request support
 *      for buttery-smooth HTML5 <video> seeking and scrubbing.
 * 2. Storyboard Fast-Load Precache:
 *    - Precaches active and adjacent shots on the storyboard timeline to guarantee zero playback stalls.
 * 3. Client Messaging API (postMessage):
 *    - CACHE_MEDIA_ASSET: Precaches specific blobs / URLs.
 *    - GET_CACHE_METRICS: Returns total stored items and byte footprint for D3 dashboard.
 *    - PURGE_MEDIA_CACHE: Clears cached assets on demand.
 */

const CACHE_NAME = 'rawx-media-vault-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Media extensions targeted for zero-wait caching
const MEDIA_EXT_REGEX = /\.(mp4|webm|mov|mkv|png|jpg|jpeg|webp|svg|wav|mp3|ogg|m4v)($|\?)/i;

// 1. Installation: Precaching core shell and skipping wait
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Precache shell notice:', err);
      });
    })
  );
});

// 2. Activation: Claim all clients immediately and purge older caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('rawx-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Handle HTTP 206 Partial Content (Range requests) from cache
async function handleRangeRequest(request, cachedResponse) {
  const rangeHeader = request.headers.get('Range');
  if (!rangeHeader) return cachedResponse;

  const arrayBuffer = await cachedResponse.arrayBuffer();
  const bytesMatch = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
  if (!bytesMatch) return cachedResponse;

  const totalLength = arrayBuffer.byteLength;
  const start = parseInt(bytesMatch[1], 10);
  const end = bytesMatch[2] ? parseInt(bytesMatch[2], 10) : totalLength - 1;

  if (start >= totalLength || end >= totalLength) {
    return new Response(null, {
      status: 416,
      statusText: 'Range Not Satisfiable',
      headers: { 'Content-Range': `bytes */${totalLength}` }
    });
  }

  const slicedBuffer = arrayBuffer.slice(start, end + 1);
  return new Response(slicedBuffer, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Range': `bytes ${start}-${end}/${totalLength}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(slicedBuffer.byteLength),
      'Content-Type': cachedResponse.headers.get('Content-Type') || 'video/mp4'
    }
  });
}

// 3. Fetch Event Interceptor
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass non-GET requests and internal Vite HMR / API calls
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/@vite/')) return;

  const isMediaAsset = MEDIA_EXT_REGEX.test(url.pathname) || url.pathname.startsWith('/assets/');

  if (isMediaAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request, { ignoreSearch: true });
        if (cached) {
          if (event.request.headers.get('Range')) {
            return handleRangeRequest(event.request, cached);
          }
          return cached;
        }

        // Network Fetch with resilient local cache write
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            // Clone and store in cache asynchronously
            cache.put(event.request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch (fetchErr) {
          // If offline and not in cache, fallback
          if (cached) return cached;
          throw fetchErr;
        }
      })
    );
  }
});

// 4. Client Communication (postMessage API for D3 dashboard & fast-load manager)
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  if (type === 'CACHE_MEDIA_URLS' && Array.isArray(payload?.urls)) {
    // Background precaching for storyboard shots
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const mediaUrl of payload.urls) {
        if (!mediaUrl || mediaUrl.startsWith('blob:')) continue;
        try {
          const match = await cache.match(mediaUrl);
          if (!match) {
            const resp = await fetch(mediaUrl);
            if (resp && resp.status === 200) {
              await cache.put(mediaUrl, resp);
            }
          }
        } catch (err) {
          console.warn('[ServiceWorker] Precache item failed:', mediaUrl, err);
        }
      }
      if (event.source) {
        event.source.postMessage({ type: 'CACHE_MEDIA_URLS_COMPLETE', success: true });
      }
    });
  }

  if (type === 'GET_CACHE_METRICS') {
    caches.open(CACHE_NAME).then(async (cache) => {
      const keys = await cache.keys();
      let totalBytes = 0;
      for (const req of keys) {
        try {
          const resp = await cache.match(req);
          if (resp) {
            const blob = await resp.clone().blob();
            totalBytes += blob.size;
          }
        } catch {
          // ignore
        }
      }
      if (event.source) {
        event.source.postMessage({
          type: 'CACHE_METRICS_RESPONSE',
          payload: {
            cacheName: CACHE_NAME,
            itemCount: keys.length,
            totalBytes
          }
        });
      }
    });
  }

  if (type === 'PURGE_MEDIA_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      caches.open(CACHE_NAME).then(() => {
        if (event.source) {
          event.source.postMessage({ type: 'PURGE_MEDIA_CACHE_COMPLETE', success: true });
        }
      });
    });
  }
});
