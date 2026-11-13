/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { RangeRequestsPlugin } from 'workbox-range-requests';
import {
  createVideoFragmentStrategy,
  VIDEO_FRAGMENTS_CACHE
} from './services/swVideoFragmentStrategy';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null } | string>;
};

const VAULT_CACHE_NAME = 'rawx-media-vault-v1';
const FONTS_CACHE_NAME = 'handfilm-fonts-v1';
const STATIC_ASSETS_CACHE = 'handfilm-static-assets-v1';
const STORYBOARD_PAGES_CACHE = 'handfilm-storyboard-pages-v1';

const VIDEO_EXT_REGEX = /\.(mp4|webm|mov|mkv|m4v|ogv)$/i;
const MEDIA_EXT_REGEX = /\.(png|jpe?g|webp|gif|svg|wav|mp3|ogg|aac|flac)$/i;

const videoFragmentStrategy = createVideoFragmentStrategy({
  caches: self.caches,
  fetch: (...args) => self.fetch(...args),
  origin: self.location.origin
});

// Activate immediately and claim open studio tabs
self.skipWaiting();
clientsClaim();

// Remove legacy Workbox precaches automatically on update
cleanupOutdatedCaches();

// Precache all core build assets injected by vite-plugin-pwa
const manifestEntries = self.__WB_MANIFEST ?? [];
precacheAndRoute(manifestEntries);

// 1. Offline Navigation Fallback (SPA Shell + Storyboard routes)
const hasPrecachedIndex = manifestEntries.some((entry) => {
  const url = typeof entry === 'string' ? entry : entry.url;
  return url === 'index.html' || url === '/index.html' || url === './index.html';
});

if (hasPrecachedIndex) {
  try {
    const handler = createHandlerBoundToURL('index.html');
    registerRoute(
      new NavigationRoute(handler, {
        denylist: [/^\/api\//, /^\/downloads\//, /^\/@vite\//, /^\/@fs\//]
      })
    );
  } catch {
    registerRoute(
      ({ request, url }) =>
        request.mode === 'navigate' &&
        !url.pathname.startsWith('/api/') &&
        !url.pathname.startsWith('/downloads/') &&
        !url.pathname.includes('/@vite/'),
      new NetworkFirst({
        cacheName: STORYBOARD_PAGES_CACHE,
        networkTimeoutSeconds: 4,
        plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })]
      })
    );
  }
} else {
  registerRoute(
    ({ request, url }) =>
      request.mode === 'navigate' &&
      !url.pathname.startsWith('/api/') &&
      !url.pathname.startsWith('/downloads/') &&
      !url.pathname.includes('/@vite/'),
    new NetworkFirst({
      cacheName: STORYBOARD_PAGES_CACHE,
      networkTimeoutSeconds: 4,
      plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })]
    })
  );
}

// 2. Custom Cache API Byte-Range Fragment Strategy for 4K Video Playback (Local-First 206 Fulfillment)
registerRoute(
  ({ request, url }) => {
    if (request.method !== 'GET') return false;
    if (url.pathname.includes('/@vite/')) return false;
    const isVideoRequest =
      request.destination === 'video' ||
      VIDEO_EXT_REGEX.test(url.pathname) ||
      (url.pathname === '/api/local-video' && request.headers.has('range'));
    return isVideoRequest;
  },
  async ({ request, event }) => {
    const waitUntil =
      event && 'waitUntil' in event && typeof event.waitUntil === 'function'
        ? (p: Promise<unknown>) => event.waitUntil(p)
        : undefined;
    return videoFragmentStrategy.handleVideoRequest(request, waitUntil);
  }
);

// 3. Storyboard & Vault Still/Audio Media Assets: CacheFirst + RangeRequestsPlugin
registerRoute(
  ({ request, url }) =>
    request.method === 'GET' &&
    !url.pathname.startsWith('/api/') &&
    !url.pathname.includes('/@vite/') &&
    request.destination !== 'video' &&
    !VIDEO_EXT_REGEX.test(url.pathname) &&
    (MEDIA_EXT_REGEX.test(url.pathname) ||
      request.destination === 'audio' ||
      request.destination === 'image' ||
      url.pathname.startsWith('/assets/aistudio/') ||
      url.pathname.startsWith('/assets/')),
  new CacheFirst({
    cacheName: VAULT_CACHE_NAME,
    matchOptions: {
      ignoreSearch: true
    },
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new RangeRequestsPlugin(),
      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 60 * 60 * 24 * 90,
        purgeOnQuotaError: true
      })
    ]
  })
);

// 4. Google Fonts Stylesheets & Font Binaries (True Offline Editorial Typography)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: FONTS_CACHE_NAME,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 40,
        maxAgeSeconds: 60 * 60 * 24 * 365
      })
    ]
  })
);

// 5. Runtime JS/CSS/JSON Core Assets (StaleWhileRevalidate)
registerRoute(
  ({ request, url }) =>
    request.method === 'GET' &&
    !url.pathname.startsWith('/api/') &&
    !url.pathname.includes('/@vite/') &&
    !url.pathname.includes('hot-update') &&
    (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'font' ||
      url.pathname.endsWith('.json') ||
      url.pathname.endsWith('.webmanifest')),
  new StaleWhileRevalidate({
    cacheName: STATIC_ASSETS_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 150,
        maxAgeSeconds: 60 * 60 * 24 * 30
      })
    ]
  })
);

// 6. Client Communication Bridge (Proactive Video Fragment Prefetch, Vault Precaching, Metrics, Purge)
self.addEventListener('message', (event) => {
  const { type, payload } = (event.data || {}) as {
    type?: string;
    payload?: { urls?: string[] };
  };

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (type === 'PREFETCH_VIDEO_FRAGMENTS' && Array.isArray(payload?.urls)) {
    event.waitUntil(
      videoFragmentStrategy.prefetchVideoFragments(payload.urls).then((warmedCount) => {
        if (event.source && 'postMessage' in event.source) {
          event.source.postMessage({
            type: 'PREFETCH_VIDEO_FRAGMENTS_COMPLETE',
            payload: { warmedCount }
          });
        }
      })
    );
    return;
  }

  if (type === 'CACHE_MEDIA_URLS' && Array.isArray(payload?.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(VAULT_CACHE_NAME);
        for (const mediaUrl of payload.urls!) {
          if (
            !mediaUrl ||
            mediaUrl.startsWith('blob:') ||
            mediaUrl.startsWith('data:') ||
            mediaUrl.includes('/api/local-video')
          ) {
            continue;
          }
          try {
            const match = await cache.match(mediaUrl, { ignoreSearch: true });
            if (!match) {
              const resp = await fetch(mediaUrl);
              if (resp && resp.status === 200) {
                await cache.put(mediaUrl, resp);
              }
            }
          } catch (err) {
            console.warn('[Workbox SW] Precache item notice:', mediaUrl, err);
          }
        }
        if (event.source && 'postMessage' in event.source) {
          event.source.postMessage({ type: 'CACHE_MEDIA_URLS_COMPLETE', success: true });
        }
      })()
    );
    return;
  }

  if (type === 'GET_CACHE_METRICS') {
    event.waitUntil(
      (async () => {
        let itemCount = 0;
        let totalBytes = 0;

        for (const cacheName of [VAULT_CACHE_NAME, VIDEO_FRAGMENTS_CACHE]) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          itemCount += keys.length;
          for (const req of keys) {
            try {
              const resp = await cache.match(req);
              if (resp) {
                const lenHdr = Number(resp.headers.get('Content-Length') || 0);
                if (lenHdr > 0) {
                  totalBytes += lenHdr;
                } else {
                  const blob = await resp.clone().blob();
                  totalBytes += blob.size;
                }
              }
            } catch {
              // ignore opaque/unreadable entry
            }
          }
        }

        if (event.source && 'postMessage' in event.source) {
          event.source.postMessage({
            type: 'CACHE_METRICS_RESPONSE',
            payload: {
              cacheName: VAULT_CACHE_NAME,
              itemCount,
              totalBytes
            }
          });
        }
      })()
    );
    return;
  }

  if (type === 'PURGE_MEDIA_CACHE') {
    event.waitUntil(
      (async () => {
        await caches.delete(VAULT_CACHE_NAME);
        await caches.open(VAULT_CACHE_NAME);
        await videoFragmentStrategy.purgeFragments();
        if (event.source && 'postMessage' in event.source) {
          event.source.postMessage({ type: 'PURGE_MEDIA_CACHE_COMPLETE', success: true });
        }
      })()
    );
  }
});
