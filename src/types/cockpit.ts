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
  titleText?: string;
  personality: TitlePersonality;
  titlePersonality?: TitlePersonality;
  inPoint: number;
  outPoint: number;
  durationSec: number;
  speedMultiplier?: number;
  mediaUrl?: string;
  thumbnailUrl?: string;
  lutFilter?: string;
  lensSpec?: string;
  directorNotes?: string;
  lightId?: string | null;
  lightName?: string;
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

export interface CockpitManifestStats {
  totalShots: number;
  activeLightsCount: number;
  audioSynced: boolean;
  audioTrackName: string | null;
  totalDurationSec: number;
  isTauriActive: boolean;
}

export interface NLEExportOptions {
  fps?: 24 | 30;
  projectName?: string;
  width?: number;
  height?: number;
}

export interface CapCutManifestData {
  projectName: string;
  exportedAt: string;
  totalDurationSec: number;
  fps: number;
  shots: Array<{
    index: number;
    shotNumber: number | string;
    filename: string;
    inPoint: number;
    outPoint: number;
    duration: number;
    startSec: number;
    endSec: number;
    startTimecode: string;
    endTimecode: string;
    personality: TitlePersonality;
    titleBn: string;
    titleEn: string;
    lightId?: string | null;
    lightName?: string;
    lutFilter?: string;
    lensSpec?: string;
    directorNotes?: string;
  }>;
  audioTrack?: {
    name: string;
    duration: number;
    filename: string;
  };
}

export interface CapCutManifestResult {
  manifestJson: string;
  directorSheetTxt: string;
  manifestData: CapCutManifestData;
}
