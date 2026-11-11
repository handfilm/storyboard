/**
 * @file /src/types/cockpit.ts
 * @description Type definitions for the Director's Cockpit, External Pipeline Bridges,
 * NLE Interchange formats (FCPXML / CMX 3600 EDL), and CapCut Quick-Pack bundles.
 */

export type TitlePersonality = 'AUTO' | 'DOPAMINE' | 'MINIMAL' | 'B2B' | 'KINETIC';

export type CockpitDispatchTarget = 'photoshop' | 'premiere' | 'capcut' | 'davinci' | 'illustrator';

export interface CockpitShotBridge {
  shotId: string;
  shotNumber: number | string;
  titleEn: string;
  titleBn: string;
  personality: TitlePersonality;
  inPoint: number;
  outPoint: number;
  durationSec: number;
  mediaUrl?: string;
  thumbnailUrl?: string;
  lutFilter?: string;
  lensSpec?: string;
  directorNotes?: string;
}

export interface CockpitDispatchResult {
  success: boolean;
  targetApp: CockpitDispatchTarget;
  shotNumber: number | string;
  filePath: string;
  message: string;
  timestamp: number;
  isNativeTauri: boolean;
}

export interface CockpitPipelineStatus {
  isTauriActive: boolean;
  projectDirectory: string;
  watchedFramesCount: number;
  lastWatchEvent?: {
    shotNumber: number;
    filePath: string;
    timestamp: number;
  };
  connectedTools: Record<CockpitDispatchTarget, boolean>;
}

export interface CapCutManifestData {
  projectName: string;
  exportedAt: string;
  totalDurationSec: number;
  fps: number;
  shots: Array<{
    index: number;
    shotNumber: number;
    filename: string;
    inPoint: number;
    outPoint: number;
    duration: number;
    startSec: number;
    personality: TitlePersonality;
    titleBn: string;
    titleEn: string;
    directorNotes?: string;
  }>;
  audioTrack?: {
    name: string;
    duration: number;
    filename: string;
  };
}
