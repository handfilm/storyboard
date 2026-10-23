/**
 * @file /src/types/editor.ts
 * @description Core constants, playback modes, and federation app manifests for RAWx Storyboard Studio.
 */

export type PlaybackMode = 'sequence' | 'solo' | 'loop';

export const SLIDE_DURATION_SEC = 12.0;
export const SLIDE_TOTAL_FRAMES_24FPS = 288;

export interface FederationApp {
  name: string;
  subdomain: string;
  url: string;
  description: string;
}

export const FEDERATION_APPS: FederationApp[] = [
  {
    name: 'X-Videos R2',
    subdomain: 'xvideos-r2',
    url: 'https://xvideos-r2.handsandhead.com',
    description: 'Cloudflare R2 Byte-Range Video Streaming'
  },
  {
    name: 'Vault Storage',
    subdomain: 'vault',
    url: 'https://vault.handsandhead.com',
    description: 'IndexedDB Zero-Cloud Media Vault'
  },
  {
    name: 'Anthology Hub',
    subdomain: 'hub',
    url: 'https://hub.handsandhead.com',
    description: 'Central Film Production Hub'
  },
  {
    name: 'Bloom App',
    subdomain: 'bloom-app',
    url: 'https://bloom.handsandhead.com',
    description: 'Interactive Optical Flare & Bloom Canvas'
  }
];
