/**
 * @file /src/services/cockpitBridge.ts
 * @description Director's Cockpit Native IPC Bridges & Interchange Pipeline.
 * Delegates core execution & interchange compilers to `/src/utils/interchangeExport.ts`
 * while preserving the existing exported service API.
 */

import { CockpitDispatchTarget, CockpitDispatchResult, CockpitShotBridge } from '../types/cockpit';
import {
  isTauriRuntime,
  formatInterchangeSmpte,
  dispatchToExternalApp,
  captureCompositeCanvasPng,
  generateNLETimelineXML,
  generateCMX3600EDL,
  buildCapCutQuickPackZip,
  triggerBrowserDownload
} from '../utils/interchangeExport';

export function isTauriEnvironment(): boolean {
  return isTauriRuntime();
}

export function formatCockpitSmpte(totalSeconds: number, fps: number = 24): string {
  return formatInterchangeSmpte(totalSeconds, fps);
}

export async function dispatchToExternalTool(
  targetApp: CockpitDispatchTarget,
  shot: CockpitShotBridge,
  frameImagePath?: string,
  projectName: string = 'HANDFILM_PROJECT'
): Promise<CockpitDispatchResult> {
  return dispatchToExternalApp({
    appName: targetApp,
    shot,
    filePath: frameImagePath,
    projectName
  });
}

export async function captureCurrentCanvasFrame(
  canvas: HTMLCanvasElement | null,
  shotNumber: number | string,
  _shotTitle: string = 'frame'
): Promise<{ success: boolean; filePath: string; dataUrl: string; downloadUrl?: string }> {
  if (!canvas) {
    throw new Error('Canvas buffer not initialized');
  }

  const paddedNum = String(shotNumber).padStart(2, '0');
  const filename = `shot_${paddedNum}_master.png`;
  const dataUrl = captureCompositeCanvasPng(canvas);
  if (!dataUrl) {
    throw new Error('Failed to capture canvas frame');
  }

  if (isTauriRuntime()) {
    const win = window as any;
    const invoke = win.__TAURI_INTERNALS__?.invoke || win.__TAURI__?.core?.invoke || win.__TAURI__?.invoke;
    if (typeof invoke === 'function') {
      try {
        const savedPath = await invoke('save_project_frame', {
          shotId: paddedNum,
          dataUrl
        });
        return {
          success: true,
          filePath: savedPath || `./frames/${filename}`,
          dataUrl
        };
      } catch (err) {
        console.warn('[CockpitBridge] Tauri save error, falling back to browser download:', err);
      }
    }
  }

  triggerBrowserDownload(dataUrl, filename, 'image/png');

  return {
    success: true,
    filePath: `./frames/${filename}`,
    dataUrl,
    downloadUrl: dataUrl
  };
}

export function generateCockpitFcpxml(
  shots: CockpitShotBridge[],
  audioTrack: { name: string; duration: number; url?: string } | null,
  fps: number = 24,
  projectName: string = 'HANDFILM_SEQUENCE'
): string {
  return generateNLETimelineXML(shots, audioTrack, {
    fps: fps === 30 ? 30 : 24,
    projectName
  });
}

export function generateCmx3600Edl(
  shots: CockpitShotBridge[],
  audioTrack: { name: string; duration: number } | null,
  fps: number = 24,
  projectName: string = 'HANDFILM_SEQUENCE'
): string {
  return generateCMX3600EDL(shots, audioTrack, {
    fps: fps === 30 ? 30 : 24,
    projectName
  });
}

export async function generateCapCutQuickPack(
  shots: CockpitShotBridge[],
  audioTrack: { name: string; duration: number } | null,
  canvasElement: HTMLCanvasElement | null,
  projectName: string = 'HANDFILM_REEL'
): Promise<Blob> {
  return buildCapCutQuickPackZip(shots, audioTrack, canvasElement, {
    fps: 24,
    projectName
  });
}

export function triggerFileDownload(content: string | Blob, filename: string, mimeType: string = 'text/plain') {
  triggerBrowserDownload(content, filename, mimeType);
}
