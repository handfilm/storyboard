/**
 * @file /src/services/serviceWorkerManager.ts
 * @description Master Service Worker Manager for RAWx Storyboard & HANDFILM Studio.
 * Handles background registration, Storyboard shot media precaching, and cache telemetry.
 */

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
   * Initializes and registers the service worker
   */
  public async init(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported) return null;

    try {
      // In development / preview, register sw.js from root
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      this.registration = reg;

      this.lastMetrics.isRegistered = true;
      this.lastMetrics.isActive = Boolean(reg.active);

      // Listen for updates
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

      // Listen for messages from sw.js
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'CACHE_METRICS_RESPONSE') {
          const payload = event.data.payload;
          this.lastMetrics.itemCount = payload.itemCount || 0;
          this.lastMetrics.totalBytes = payload.totalBytes || 0;
          this.notifyListeners();
        }
      });

      // Initial metrics query
      this.refreshMetrics();

      return reg;
    } catch (err) {
      console.warn('[ServiceWorkerManager] Registration notice:', err);
      return null;
    }
  }

  /**
   * Precaches an array of media URLs for instantaneous Storyboard shot loading
   */
  public async precacheMediaUrls(urls: string[]): Promise<void> {
    if (!urls || urls.length === 0) return;
    const cleanUrls = urls.filter((u) => u && !u.startsWith('blob:') && !u.startsWith('data:'));
    if (cleanUrls.length === 0) return;

    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_MEDIA_URLS',
        payload: { urls: cleanUrls }
      });
    } else if (typeof window !== 'undefined' && 'caches' in window) {
      // Fallback: direct CacheStorage write
      try {
        const cache = await caches.open(CACHE_NAME);
        for (const url of cleanUrls) {
          const match = await cache.match(url);
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
    if (!url || url.startsWith('blob:') || url.startsWith('data:')) return;
    await this.precacheMediaUrls([url]);
  }

  /**
   * Precaches media from all active Storyboard frames
   */
  public async precacheStoryboardFrames(frames: Array<{ imageUrl?: string; videoSrc?: string; blobUrl?: string }>): Promise<void> {
    const urls: string[] = [];
    frames.forEach((f) => {
      if (f.imageUrl) urls.push(f.imageUrl);
      if (f.videoSrc) urls.push(f.videoSrc);
    });
    await this.precacheMediaUrls(urls);
  }

  /**
   * Queries real-time metrics from the Service Worker and CacheStorage
   */
  public async refreshMetrics(): Promise<ServiceWorkerMetrics> {
    let itemCount = 0;
    let totalBytes = 0;

    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        itemCount = keys.length;

        // Estimate total bytes from cache
        for (const key of keys) {
          try {
            const resp = await cache.match(key);
            if (resp) {
              const blob = await resp.clone().blob();
              totalBytes += blob.size;
            }
          } catch {
            // ignore
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
   * Purges all media assets from the Service Worker cache
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
