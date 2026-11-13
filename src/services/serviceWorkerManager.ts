/**
 * @file /src/services/serviceWorkerManager.ts
 * @description Master Service Worker Manager for RAWx Storyboard & HANDFILM Studio.
 * Integrates Workbox via vite-plugin-pwa (`virtual:pwa-register`) for core storyboard precaching,
 * media vault caching (`rawx-media-vault-v1`), Range Request scrubbing, and cache telemetry.
 */

import { registerSW } from 'virtual:pwa-register';

export interface ServiceWorkerMetrics {
  isRegistered: boolean;
  isActive: boolean;
  cacheName: string;
  itemCount: number;
  totalBytes: number;
}

const CACHE_NAME = 'rawx-media-vault-v1';

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = typeof window !== 'undefined' && 'serviceWorker' in navigator;
  private initialized: boolean = false;
  private metricsListeners: Set<(metrics: ServiceWorkerMetrics) => void> = new Set();
  private lastMetrics: ServiceWorkerMetrics = {
    isRegistered: false,
    isActive: false,
    cacheName: CACHE_NAME,
    itemCount: 0,
    totalBytes: 0
  };

  constructor() {
    if (this.isSupported) {
      this.init();
    }
  }

  /**
   * Initializes and registers the Workbox service worker
   */
  public async init(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported) return null;
    if (this.initialized) return this.registration;
    this.initialized = true;

    try {
      // Listen for metrics responses from Workbox sw.ts
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'CACHE_METRICS_RESPONSE') {
          const payload = event.data.payload;
          this.lastMetrics.itemCount = payload.itemCount || 0;
          this.lastMetrics.totalBytes = payload.totalBytes || 0;
          this.notifyListeners();
        }
      });

      const updateSW = registerSW({
        immediate: true,
        onRegisteredSW: (_swUrl, reg) => {
          if (reg) {
            this.registration = reg;
            this.lastMetrics.isRegistered = true;
            this.lastMetrics.isActive = Boolean(reg.active || navigator.serviceWorker?.controller);
            this.notifyListeners();
            this.refreshMetrics();

            reg.addEventListener('updatefound', () => {
              const installingWorker = reg.installing;
              if (installingWorker) {
                installingWorker.addEventListener('statechange', () => {
                  if (installingWorker.state === 'activated') {
                    this.lastMetrics.isActive = true;
                    this.notifyListeners();
                  }
                });
              }
            });
          }
        },
        onNeedRefresh: () => {
          // Auto-activate updated Workbox precache shell smoothly
          updateSW(true).catch(() => {});
        },
        onOfflineReady: () => {
          this.lastMetrics.isRegistered = true;
          this.lastMetrics.isActive = true;
          this.notifyListeners();
          this.refreshMetrics();
        },
        onRegisterError: (err) => {
          console.warn('[ServiceWorkerManager] Workbox registration notice:', err);
        }
      });

      // Resolve existing registration if already controlled
      const existingReg = await navigator.serviceWorker.getRegistration();
      if (existingReg) {
        this.registration = existingReg;
        this.lastMetrics.isRegistered = true;
        this.lastMetrics.isActive = Boolean(existingReg.active || navigator.serviceWorker?.controller);
      }

      this.refreshMetrics();
      return this.registration;
    } catch (err) {
      console.warn('[ServiceWorkerManager] Registration notice:', err);
      return null;
    }
  }

  /**
   * Precaches an array of media URLs into the Workbox Vault cache for instant offline playback
   */
  public async precacheMediaUrls(urls: string[]): Promise<void> {
    if (!urls || urls.length === 0) return;
    const cleanUrls = Array.from(
      new Set(
        urls.filter(
          (u) =>
            u &&
            !u.startsWith('blob:') &&
            !u.startsWith('data:') &&
            !u.includes('/api/local-video')
        )
      )
    );
    if (cleanUrls.length === 0) return;

    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_MEDIA_URLS',
        payload: { urls: cleanUrls }
      });
    } else if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        for (const url of cleanUrls) {
          const match = await cache.match(url, { ignoreSearch: true });
          if (!match) {
            const resp = await fetch(url);
            if (resp && resp.status === 200) {
              await cache.put(url, resp);
            }
          }
        }
        await this.refreshMetrics();
      } catch (err) {
        console.warn('[ServiceWorkerManager] Direct cache fallback notice:', err);
      }
    }
  }

  /**
   * Caches a single shot's media asset
   */
  public async cacheShotMedia(url: string): Promise<void> {
    if (!url || url.startsWith('blob:') || url.startsWith('data:') || url.includes('/api/local-video')) return;
    await this.precacheMediaUrls([url]);
  }

  /**
   * Precaches media from all active Storyboard frames
   */
  public async precacheStoryboardFrames(
    frames: Array<{ imageUrl?: string; videoSrc?: string; thumbnailUrl?: string; blobUrl?: string }>
  ): Promise<void> {
    const urls: string[] = [];
    frames.forEach((f) => {
      if (f.imageUrl) urls.push(f.imageUrl);
      if (f.videoSrc) urls.push(f.videoSrc);
      if (f.thumbnailUrl) urls.push(f.thumbnailUrl);
    });
    await this.precacheMediaUrls(urls);
  }

  /**
   * Queries real-time metrics from the Workbox Service Worker and CacheStorage
   */
  public async refreshMetrics(): Promise<ServiceWorkerMetrics> {
    let itemCount = 0;
    let totalBytes = 0;

    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        itemCount = keys.length;

        for (const key of keys) {
          try {
            const resp = await cache.match(key);
            if (resp) {
              const blob = await resp.clone().blob();
              totalBytes += blob.size;
            }
          } catch {
            // ignore opaque/unreadable entry
          }
        }
      } catch (err) {
        console.warn('[ServiceWorkerManager] Cache query error:', err);
      }
    }

    this.lastMetrics = {
      isRegistered: Boolean(this.registration || navigator.serviceWorker?.controller),
      isActive: Boolean(this.registration?.active || navigator.serviceWorker?.controller),
      cacheName: CACHE_NAME,
      itemCount,
      totalBytes
    };

    this.notifyListeners();
    return this.lastMetrics;
  }

  /**
   * Purges all media assets from the Service Worker Vault cache
   */
  public async purgeCache(): Promise<void> {
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        await caches.delete(CACHE_NAME);
        await caches.open(CACHE_NAME);
      } catch (err) {
        console.warn('[ServiceWorkerManager] Purge cache error:', err);
      }
    }

    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PURGE_MEDIA_CACHE'
      });
    }

    await this.refreshMetrics();
  }

  /**
   * Subscribe to metrics updates
   */
  public subscribe(listener: (metrics: ServiceWorkerMetrics) => void): () => void {
    this.metricsListeners.add(listener);
    listener(this.lastMetrics);
    return () => {
      this.metricsListeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.metricsListeners.forEach((listener) => {
      try {
        listener(this.lastMetrics);
      } catch (err) {
        console.warn('[ServiceWorkerManager] Listener error:', err);
      }
    });
  }

  public getMetrics(): ServiceWorkerMetrics {
    return this.lastMetrics;
  }
}

export const serviceWorkerManager = new ServiceWorkerManager();
