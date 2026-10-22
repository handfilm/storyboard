/**
 * @file /src/types/editor.ts
 * @description Types for transport controls, dual playback modes, Cloudflare R2 streaming,
 * and federation hubs dock.
 */

import { AspectRatioType } from './project';

export type PlaybackMode = 'sequence' | 'solo';

export interface TransportState {
  isPlaying: boolean;
  isLooping: boolean;
  currentTimeSec: number;
  activeSlideIndex: number;
  playbackMode: PlaybackMode;
  aspectRatio: AspectRatioType;
  isCleanPresentation: boolean;
  isRecording: boolean;
  fps: number;
}

export interface FederationApp {
  id: string;
  name: string;
  subdomain: string;
  url: string;
  description: string;
  badge?: string;
}

export const FEDERATION_APPS: FederationApp[] = [
  {
    id: 'storyboard',
    name: 'Storyboard Studio',
    subdomain: 'storyboard',
    url: 'https://storyboard.handsandhead.com',
    description: 'Master 12.0s Storyboard & Dual-Mode NLE Editor',
    badge: 'ACTIVE'
  },
  {
    id: 'xvideos-r2',
    name: 'R2 Vault Stream',
    subdomain: 'xvideos-r2',
    url: 'https://xvideos-r2.handsandhead.com',
    description: 'Cloudflare R2 4K Zero-Egress Media Bucket',
    badge: 'EDGE R2'
  },
  {
    id: 'picseed',
    name: 'Picseed CDN',
    subdomain: 'picseed',
    url: 'https://picseed.handsandhead.com',
    description: 'Direct Visual Seed CDN & Assets Cache',
    badge: 'EDGE'
  },
  {
    id: 'vault',
    name: 'Hands & Head Vault',
    subdomain: 'vault',
    url: 'https://vault.handsandhead.com',
    description: 'Long-term Master Archive & RAW Footage Repository'
  },
  {
    id: 'bloom-app',
    name: 'Bloom App',
    subdomain: 'bloom-app',
    url: 'https://bloom-app.handsandhead.com',
    description: 'Dynamic Fluid Canvas & Generative Node Sequencer'
  },
  {
    id: 'deeper',
    name: 'Deeper Scopes',
    subdomain: 'deeper',
    url: 'https://deeper.handsandhead.com',
    description: 'Waveforms, Vectorscopes & Deep Color Telemetry'
  },
  {
    id: 'lab',
    name: 'Flow AI Lab',
    subdomain: 'lab',
    url: 'https://lab.handsandhead.com',
    description: 'Veo Cine Engine, Generative Previs & Bilingual Polish'
  },
  {
    id: 'settings',
    name: 'Studio Settings',
    subdomain: 'settings',
    url: '#settings',
    description: 'IndexedDB Quotas, Hotkeys & Diagnostics'
  },
  {
    id: 'hub',
    name: 'Hands & Head Hub',
    subdomain: 'hub',
    url: 'https://hub.handsandhead.com',
    description: 'Ecosystem Command Center & Federated Identity'
  }
];

export const SLIDE_DURATION_SEC = 12.0; // Strictly 12.0s per slide
export const SLIDE_TOTAL_FRAMES_24FPS = 288; // 12s * 24fps = 288 frames
