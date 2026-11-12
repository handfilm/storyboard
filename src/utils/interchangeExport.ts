/**
 * @file /src/utils/interchangeExport.ts
 * @description Dual-Environment Execution Engine & Interchange Hub for The Director's Cockpit.
 *
 * Capabilities:
 * 1. Smart Environment Detector (`dispatchToExternalApp`) with native Tauri IPC (`__TAURI_INTERNALS__`)
 *    and instant browser/AI Studio sandbox fallback.
 * 2. Standards-compliant FCPXML v1.9 & CMX 3600 EDL compilers (`generateNLETimelineXML`, `generateCMX3600EDL`)
 *    embedding exact frame timings, master audio track alignment, Lighting Rig metadata markers, and Title strings.
 * 3. CapCut Quick-Pack Manifest Generator (`generateCapCutManifest`, `buildCapCutQuickPackZip`) producing
 *    structured JSON + human-readable `CAPCUT_DIRECTOR_SHEET.txt`.
 */

import JSZip from 'jszip';
import {
  CapCutManifestData,
  CapCutManifestResult,
  CockpitDispatchResult,
  CockpitDispatchTarget,
  CockpitShotBridge,
  NLEExportOptions
} from '../types/cockpit';
import { getLightingPresetById } from '../data/lightingPresets';

export interface ExternalAppDispatchParams {
  appName: CockpitDispatchTarget;
  shot: CockpitShotBridge;
  filePath?: string;
  base64Frame?: string;
  allShots?: CockpitShotBridge[];
  audioTrack?: { name: string; duration: number; url?: string; offsetSec?: number } | null;
  canvas?: HTMLCanvasElement | null;
  fps?: 24 | 30;
  projectName?: string;
}

/**
 * Checks whether the app is executing inside a native Tauri desktop runtime.
 */
export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
}

function getTauriInvoke(): ((cmd: string, args?: Record<string, unknown>) => Promise<any>) | null {
  if (typeof window === 'undefined') return null;
  const win = window as any;
  if (win.__TAURI_INTERNALS__ && typeof win.__TAURI_INTERNALS__.invoke === 'function') {
    return win.__TAURI_INTERNALS__.invoke.bind(win.__TAURI_INTERNALS__);
  }
  if (win.__TAURI__?.core && typeof win.__TAURI__.core.invoke === 'function') {
    return win.__TAURI__.core.invoke.bind(win.__TAURI__.core);
  }
  if (win.__TAURI__ && typeof win.__TAURI__.invoke === 'function') {
    return win.__TAURI__.invoke.bind(win.__TAURI__);
  }
  return null;
}

/**
 * Format seconds into SMPTE timecode (HH:MM:SS:FF)
 */
export function formatInterchangeSmpte(totalSeconds: number, fps: number = 24): string {
  const safeFps = Math.max(1, Math.round(fps));
  const safeSec = Math.max(0, totalSeconds);
  const totalFrames = Math.floor(safeSec * safeFps);
  const ff = totalFrames % safeFps;
  const s = Math.floor(safeSec % 60);
  const m = Math.floor((safeSec / 60) % 60);
  const h = Math.floor(safeSec / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
}

function secToRational(seconds: number, fps: number = 24): string {
  const frames = Math.max(0, Math.round(seconds * fps));
  return `${frames * 100}/${Math.round(fps * 100)}s`;
}

function escapeXml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function resolveShotLightLabel(shot: CockpitShotBridge): string {
  if (shot.lightName) return shot.lightName;
  if (shot.lightId) {
    const preset = getLightingPresetById(shot.lightId);
    if (preset) return preset.name;
    return shot.lightId;
  }
  return 'Natural / Unlit';
}

function resolveShotTitleLabel(shot: CockpitShotBridge): string {
  if (shot.titleText) return shot.titleText;
  if (shot.titleBn && shot.titleEn) return `${shot.titleBn} // ${shot.titleEn}`;
  return shot.titleBn || shot.titleEn || `Shot ${shot.shotNumber}`;
}

/**
 * Triggers a clean browser file download for a string, Blob, or data URL.
 */
export function triggerBrowserDownload(
  content: string | Blob,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  if (typeof document === 'undefined') return;
  if (typeof content === 'string' && content.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = content;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Captures the live 3-tier composite stage canvas buffer as a lossless PNG data URL
 * without interrupting the 60 FPS video playback loop.
 */
export function captureCompositeCanvasPng(canvas: HTMLCanvasElement | null): string | null {
  if (!canvas) return null;
  try {
    return canvas.toDataURL('image/png', 1.0);
  } catch (err) {
    console.warn('[InterchangeExport] Canvas capture warning:', err);
    return null;
  }
}

/**
 * Registers a Tauri file-system hot-reload listener if running in Tauri runtime.
 */
export async function registerTauriFrameWatcher(
  onFrameModified: (payload: { filePath: string; shotNumber?: number }) => void
): Promise<(() => void) | null> {
  if (typeof window === 'undefined' || !isTauriRuntime()) return null;
  const win = window as any;
  const listen = win.__TAURI__?.event?.listen;
  if (typeof listen === 'function') {
    try {
      const unlisten = await listen('cockpit:frame_modified', (event: any) => {
        if (event?.payload) {
          onFrameModified(event.payload);
        }
      });
      return unlisten;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * MODULE 4.1: Smart Environment Detector & External Tool Dispatcher
 * Executes natively via Tauri IPC when `'__TAURI_INTERNALS__' in window` (or `__TAURI__`),
 * and gracefully falls back to instant browser blob downloads in AI Studio preview.
 */
export async function dispatchToExternalApp(
  params: ExternalAppDispatchParams
): Promise<CockpitDispatchResult> {
  const {
    appName,
    shot,
    filePath: providedPath,
    base64Frame: providedBase64,
    allShots,
    audioTrack = null,
    canvas = null,
    fps = 24,
    projectName = 'HANDFILM_SEQUENCE'
  } = params;

  const paddedNum = String(shot.shotNumber).padStart(2, '0');
  const frameFilename = `shot_${paddedNum}_master.png`;
  const targetFilePath =
    providedPath ||
    (appName === 'premiere' || appName === 'davinci'
      ? `./exports/${projectName}_TIMELINE.fcpxml`
      : appName === 'capcut'
      ? `./exports/${projectName}_CapCut_Pack.zip`
      : `./frames/${frameFilename}`);

  const base64Frame =
    providedBase64 ??
    (appName === 'photoshop' || appName === 'illustrator'
      ? captureCompositeCanvasPng(canvas) ?? undefined
      : undefined);

  // Native Tauri IPC path
  if (isTauriRuntime()) {
    const invoke = getTauriInvoke();
    if (invoke) {
      try {
        const nativeMsg = await invoke('dispatch_external_tool', {
          appName,
          filePath: targetFilePath,
          base64Frame: base64Frame ?? null
        });
        return {
          success: true,
          targetApp: appName,
          shotNumber: shot.shotNumber,
          filePath: targetFilePath,
          message: typeof nativeMsg === 'string' ? nativeMsg : `[TAURI IPC] Dispatched to ${appName}`,
          timestamp: Date.now(),
          isNativeTauri: true
        };
      } catch (err) {
        console.warn('[InterchangeExport] Tauri IPC failed, using browser fallback:', err);
      }
    }
  }

  // Browser / AI Studio Preview Sandbox Fallback
  if (appName === 'photoshop' || appName === 'illustrator') {
    if (base64Frame) {
      triggerBrowserDownload(base64Frame, frameFilename, 'image/png');
    }
    return {
      success: true,
      targetApp: appName,
      shotNumber: shot.shotNumber,
      filePath: `./frames/${frameFilename}`,
      message: '[SANDBOX MODE] Frame exported — Tauri IPC ready for Windows .exe',
      timestamp: Date.now(),
      isNativeTauri: false
    };
  }

  if (appName === 'premiere' || appName === 'davinci') {
    const shotsToExport = allShots && allShots.length > 0 ? allShots : [shot];
    const xml = generateNLETimelineXML(shotsToExport, audioTrack, { fps, projectName });
    const xmlFilename = `${projectName}_SHOT_${paddedNum}.fcpxml`;
    triggerBrowserDownload(xml, xmlFilename, 'application/xml');
    return {
      success: true,
      targetApp: appName,
      shotNumber: shot.shotNumber,
      filePath: xmlFilename,
      message: `[SANDBOX MODE] FCPXML exported (${shotsToExport.length} shots + Light/Title markers) — Tauri IPC ready`,
      timestamp: Date.now(),
      isNativeTauri: false
    };
  }

  if (appName === 'capcut') {
    const shotsToExport = allShots && allShots.length > 0 ? allShots : [shot];
    const zipBlob = await buildCapCutQuickPackZip(shotsToExport, audioTrack, canvas, {
      fps,
      projectName
    });
    const zipFilename = `${projectName}_CapCut_Bundle.zip`;
    triggerBrowserDownload(zipBlob, zipFilename, 'application/zip');
    return {
      success: true,
      targetApp: appName,
      shotNumber: shot.shotNumber,
      filePath: zipFilename,
      message: '[SANDBOX MODE] CapCut Reel Bundle exported — Tauri IPC ready for Windows .exe',
      timestamp: Date.now(),
      isNativeTauri: false
    };
  }

  if (base64Frame) {
    triggerBrowserDownload(base64Frame, frameFilename, 'image/png');
  }

  return {
    success: true,
    targetApp: appName,
    shotNumber: shot.shotNumber,
    filePath: targetFilePath,
    message: '[SANDBOX MODE] Frame exported — Tauri IPC ready for Windows .exe',
    timestamp: Date.now(),
    isNativeTauri: false
  };
}

/**
 * MODULE 4.2: Real FCPXML v1.9 Compiler (`generateNLETimelineXML`)
 * Generates standards-compliant FCPXML v1.9 containing:
 * - Frame-accurate clip sequence (24fps / 30fps timebase)
 * - Synchronized Master Audio track (`masterAudioRef` filename & offset)
 * - Director's Metadata Markers at every cut boundary embedding active Lighting Rig preset name & Dynamic Title text
 */
export function generateNLETimelineXML(
  shots: CockpitShotBridge[],
  audioTrack: { name: string; duration: number; url?: string; offsetSec?: number } | null = null,
  options: NLEExportOptions = {}
): string {
  const safeFps = options.fps === 30 ? 30 : 24;
  const projectName = options.projectName || 'HANDFILM_SEQUENCE';
  const width = options.width || 1920;
  const height = options.height || 803;
  const formatId = 'r1';
  const formatName = safeFps === 30 ? 'FFVideoFormat1080p30' : 'FFVideoFormat1080p24';
  const frameDur = secToRational(1 / safeFps, safeFps);

  const normalizedShots = shots.map((s) => {
    const inPt = Math.max(0, Number(s.inPoint) || 0);
    const rawOut = Number(s.outPoint) || inPt + (Number(s.durationSec) || 12.0);
    const outPt = Math.max(inPt + 0.1, rawOut);
    return {
      ...s,
      inPoint: inPt,
      outPoint: outPt,
      durationSec: Math.max(0.1, outPt - inPt)
    };
  });

  const totalDurationSec = normalizedShots.reduce((acc, s) => acc + s.durationSec, 0);
  const totalDurationFcp = secToRational(totalDurationSec, safeFps);

  const assetDefinitions = normalizedShots
    .map((shot) => {
      const padded = String(shot.shotNumber).padStart(2, '0');
      const assetId = `asset-sh${padded}`;
      const safeSrc = shot.mediaUrl
        ? escapeXml(shot.mediaUrl)
        : `file://localhost/Media/SH${padded}.mp4`;
      return `    <asset id="${assetId}" name="${escapeXml(`SH${padded}`)}" src="${safeSrc}" format="${formatId}" hasVideo="1" hasAudio="0" />`;
    })
    .join('\n');

  const audioAssetXml = audioTrack
    ? `\n    <asset id="asset-master-audio" name="${escapeXml(audioTrack.name)}" src="${escapeXml(audioTrack.url || `file://localhost/Audio/${audioTrack.name}`)}" hasVideo="0" hasAudio="1" />`
    : '';

  let currentOffsetSec = 0;
  const spineClips = normalizedShots
    .map((shot) => {
      const padded = String(shot.shotNumber).padStart(2, '0');
      const personality = shot.titlePersonality || shot.personality || 'KINETIC';
      const lightLabel = resolveShotLightLabel(shot);
      const titleText = resolveShotTitleLabel(shot);
      const duration = shot.durationSec;
      const offsetStr = secToRational(currentOffsetSec, safeFps);
      const durationStr = secToRational(duration, safeFps);
      const startStr = secToRational(shot.inPoint, safeFps);
      currentOffsetSec += duration;

      const clipName = `SH${padded} [${personality}] ${shot.titleEn}`;
      const directorMarkerValue = `LIGHT: ${lightLabel} | TITLE [${personality}]: ${titleText}`;
      const directorMarkerNote = `SHOT #${padded} | LUT: ${shot.lutFilter || 'RAWx Cinema 35'} | LENS: ${shot.lensSpec || '35mm'} | ${shot.directorNotes || ''}`;

      return `      <asset-clip name="${escapeXml(clipName)}" ref="asset-sh${padded}" offset="${offsetStr}" duration="${durationStr}" start="${startStr}" format="${formatId}">
        <metadata>
          <md key="com.apple.quicktime.Description" value="${escapeXml(directorMarkerNote)}" />
          <md key="com.apple.quicktime.Keywords" value="${escapeXml(`${personality}, LIGHT:${lightLabel}, ${shot.lutFilter || 'RAWx Cinema 35'}`)}" />
        </metadata>
        <marker start="0s" duration="${frameDur}" value="${escapeXml(directorMarkerValue)}" note="${escapeXml(directorMarkerNote)}" />
        <chapter-marker start="0s" duration="${frameDur}" value="${escapeXml(`Shot ${padded} — LIGHT: ${lightLabel}`)}" />
      </asset-clip>`;
    })
    .join('\n');

  let audioTrackXml = '';
  if (audioTrack) {
    const audioOffsetSec = Math.max(0, audioTrack.offsetSec || 0);
    const audioDurSec = Math.max(0.1, Math.min(totalDurationSec, audioTrack.duration || totalDurationSec));
    audioTrackXml = `
      <asset-clip name="${escapeXml(audioTrack.name)}" ref="asset-master-audio" lane="-1" offset="${secToRational(audioOffsetSec, safeFps)}" duration="${secToRational(audioDurSec, safeFps)}" start="0s" role="music">
        <marker start="0s" duration="${frameDur}" value="${escapeXml(`MASTER AUDIO: ${audioTrack.name}`)}" note="Synchronized Master Music Floor" />
      </asset-clip>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    <format id="${formatId}" name="${formatName}" frameDuration="${frameDur}" width="${width}" height="${height}" />
${assetDefinitions}${audioAssetXml}
  </resources>
  <library>
    <event name="${escapeXml(projectName)}">
      <project name="${escapeXml(projectName)}">
        <sequence format="${formatId}" duration="${totalDurationFcp}" tcStart="0s" tcFormat="NDF">
          <spine>
${spineClips}${audioTrackXml}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;
}

/**
 * MODULE 4.2b: CMX 3600 EDL Compiler (`generateCMX3600EDL`)
 */
export function generateCMX3600EDL(
  shots: CockpitShotBridge[],
  audioTrack: { name: string; duration: number } | null = null,
  options: NLEExportOptions = {}
): string {
  const safeFps = options.fps === 30 ? 30 : 24;
  const projectName = options.projectName || 'HANDFILM_SEQUENCE';
  const lines: string[] = [
    `TITLE: ${projectName}`,
    `FCM: NON-DROP FRAME`,
    ``
  ];

  let cumulativeSec = 0;

  shots.forEach((shot, idx) => {
    const eventNum = String(idx + 1).padStart(3, '0');
    const padded = String(shot.shotNumber).padStart(2, '0');
    const inPt = Math.max(0, Number(shot.inPoint) || 0);
    const outPt = Math.max(inPt + 0.1, Number(shot.outPoint) || inPt + (Number(shot.durationSec) || 12.0));
    const dur = Math.max(0.1, outPt - inPt);

    const srcIn = formatInterchangeSmpte(inPt, safeFps);
    const srcOut = formatInterchangeSmpte(outPt, safeFps);
    const recIn = formatInterchangeSmpte(cumulativeSec, safeFps);
    cumulativeSec += dur;
    const recOut = formatInterchangeSmpte(cumulativeSec, safeFps);

    const lightLabel = resolveShotLightLabel(shot);
    const personality = shot.titlePersonality || shot.personality || 'KINETIC';
    const titleLabel = resolveShotTitleLabel(shot);

    lines.push(`${eventNum}  AX       V     C        ${srcIn} ${srcOut} ${recIn} ${recOut}`);
    lines.push(`* FROM CLIP NAME: SHOT_${padded}_${personality}.MP4`);
    lines.push(`* COMMENT: LIGHT: ${lightLabel} | TITLE: ${titleLabel}`);
    if (shot.directorNotes) {
      lines.push(`* NOTES: ${shot.directorNotes}`);
    }
    lines.push(``);
  });

  if (audioTrack) {
    const audioEvent = String(shots.length + 1).padStart(3, '0');
    const audioOut = formatInterchangeSmpte(cumulativeSec, safeFps);
    lines.push(`${audioEvent}  AUD      A     C        00:00:00:00 ${audioOut} 00:00:00:00 ${audioOut}`);
    lines.push(`* FROM CLIP NAME: ${audioTrack.name}`);
    lines.push(`* COMMENT: MASTER AUDIO SYNC FLOOR`);
    lines.push(``);
  }

  return lines.join('\n');
}

/**
 * MODULE 4.3: CapCut Quick-Pack Manifest & Director Sheet Generator (`generateCapCutManifest`)
 * Compiles structured `.json` + human-readable `CAPCUT_DIRECTOR_SHEET.txt` containing:
 * - Shot-by-shot cut list (#01 to #14) with exact start/end timecodes and durations
 * - Lighting & Optical FX notes per shot
 * - Copy-paste-ready Bangla & English kinetic typography lines synced to beat markers
 */
export function generateCapCutManifest(
  shots: CockpitShotBridge[],
  audioTrack: { name: string; duration: number } | null = null,
  options: NLEExportOptions = {}
): CapCutManifestResult {
  const safeFps = options.fps === 30 ? 30 : 24;
  const projectName = options.projectName || 'HANDFILM_REEL';
  const exportedAt = new Date().toISOString();

  let runningSec = 0;
  const manifestShots: CapCutManifestData['shots'] = shots.map((shot, idx) => {
    const inPt = Math.max(0, Number(shot.inPoint) || 0);
    const outPt = Math.max(inPt + 0.1, Number(shot.outPoint) || inPt + (Number(shot.durationSec) || 12.0));
    const duration = Math.max(0.1, outPt - inPt);
    const startSec = runningSec;
    const endSec = runningSec + duration;
    runningSec = endSec;

    const personality = shot.titlePersonality || shot.personality || 'KINETIC';
    const lightName = resolveShotLightLabel(shot);
    const padded = String(shot.shotNumber).padStart(2, '0');

    return {
      index: idx,
      shotNumber: shot.shotNumber,
      filename: `${padded}_${personality.toLowerCase()}_shot.png`,
      inPoint: inPt,
      outPoint: outPt,
      duration,
      startSec,
      endSec,
      startTimecode: formatInterchangeSmpte(startSec, safeFps),
      endTimecode: formatInterchangeSmpte(endSec, safeFps),
      personality,
      titleBn: shot.titleBn || '',
      titleEn: shot.titleEn || '',
      lightId: shot.lightId ?? null,
      lightName,
      lutFilter: shot.lutFilter || 'RAWx Cinema 35',
      lensSpec: shot.lensSpec || '35mm Cine',
      directorNotes: shot.directorNotes || ''
    };
  });

  const manifestData: CapCutManifestData = {
    projectName,
    exportedAt,
    totalDurationSec: Number(runningSec.toFixed(2)),
    fps: safeFps,
    shots: manifestShots,
    audioTrack: audioTrack
      ? {
          name: audioTrack.name,
          duration: audioTrack.duration,
          filename: audioTrack.name
        }
      : undefined
  };

  const manifestJson = JSON.stringify(manifestData, null, 2);

  const sheetLines: string[] = [
    `====================================================================`,
    `HANDFILM DIRECTOR COCKPIT // CAPCUT DIRECTOR SHEET`,
    `====================================================================`,
    `PROJECT      : ${projectName}`,
    `EXPORTED AT  : ${exportedAt}`,
    `TIMEBASE     : ${safeFps} FPS`,
    `TOTAL SHOTS  : ${manifestShots.length}`,
    `TOTAL LENGTH : ${runningSec.toFixed(2)}s (${formatInterchangeSmpte(runningSec, safeFps)})`,
    audioTrack
      ? `MASTER AUDIO : ${audioTrack.name} (${audioTrack.duration.toFixed(2)}s) @ 00:00:00:00`
      : `MASTER AUDIO : UNROUTED / SILENT BED`,
    `====================================================================`,
    ``,
    `[ SHOT-BY-SHOT CUT LIST, LIGHTING FX & KINETIC TYPOGRAPHY ]`,
    ``
  ];

  manifestShots.forEach((s) => {
    const padded = String(s.shotNumber).padStart(2, '0');
    sheetLines.push(`--------------------------------------------------------------------`);
    sheetLines.push(`SHOT #${padded}  |  ${s.startTimecode} -> ${s.endTimecode}  (${s.duration.toFixed(2)}s)`);
    sheetLines.push(`LIGHTING FX  : LIGHT: ${s.lightName}`);
    sheetLines.push(`OPTICS / LUT : ${s.lensSpec}  //  ${s.lutFilter}`);
    sheetLines.push(`PERSONALITY  : ${s.personality}`);
    sheetLines.push(`BANGLA COPY  : ${s.titleBn}`);
    sheetLines.push(`ENGLISH COPY : ${s.titleEn}`);
    if (s.directorNotes) {
      sheetLines.push(`DIR. NOTES   : ${s.directorNotes}`);
    }
  });

  sheetLines.push(``);
  sheetLines.push(`====================================================================`);
  sheetLines.push(`[ COPY-PASTE KINETIC CAPTION TIMING SHEET ]`);
  manifestShots.forEach((s) => {
    const padded = String(s.shotNumber).padStart(2, '0');
    sheetLines.push(`[${s.startTimecode}] #${padded}: ${s.titleBn} — ${s.titleEn}`);
  });
  sheetLines.push(`====================================================================`);

  return {
    manifestJson,
    directorSheetTxt: sheetLines.join('\n'),
    manifestData
  };
}

/**
 * Packages `manifest.json`, `CAPCUT_DIRECTOR_SHEET.txt`, and current stage reference frame into a ZIP blob.
 */
export async function buildCapCutQuickPackZip(
  shots: CockpitShotBridge[],
  audioTrack: { name: string; duration: number } | null = null,
  canvasElement: HTMLCanvasElement | null = null,
  options: NLEExportOptions = {}
): Promise<Blob> {
  const projectName = options.projectName || 'HANDFILM_REEL';
  const { manifestJson, directorSheetTxt } = generateCapCutManifest(shots, audioTrack, options);

  const zip = new JSZip();
  const folder = zip.folder(`${projectName}_CapCut_Pack`) || zip;

  folder.file('manifest.json', manifestJson);
  folder.file('CAPCUT_DIRECTOR_SHEET.txt', directorSheetTxt);
  folder.file('captions_and_beats.txt', directorSheetTxt);

  const frameDataUrl = captureCompositeCanvasPng(canvasElement);
  if (frameDataUrl) {
    const base64Data = frameDataUrl.split(',')[1];
    if (base64Data) {
      folder.file('01_hero_reference_frame.png', base64Data, { base64: true });
    }
  }

  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/**
 * Freezes all shot frames into lossless PNGs (writing to `./frames/` in Tauri, or bundling into a ZIP in browser).
 */
export async function freezeAllShotFrames(
  shots: CockpitShotBridge[],
  renderShotDataUrl: (shotIndex: number) => string | null
): Promise<{ count: number; isNativeTauri: boolean; message: string }> {
  const isNative = isTauriRuntime();
  const invoke = isNative ? getTauriInvoke() : null;

  if (isNative && invoke) {
    let savedCount = 0;
    for (let i = 0; i < shots.length; i++) {
      const dataUrl = renderShotDataUrl(i);
      if (!dataUrl) continue;
      const padded = String(shots[i].shotNumber).padStart(2, '0');
      try {
        await invoke('save_project_frame', { shotId: padded, dataUrl });
        savedCount++;
      } catch {
        // continue with remaining frames
      }
    }
    return {
      count: savedCount,
      isNativeTauri: true,
      message: `[TAURI IPC] Froze ${savedCount} master PNG frames to ./frames/`
    };
  }

  // Browser fallback: bundle all frozen composite frames into a single lossless ZIP
  const zip = new JSZip();
  const framesFolder = zip.folder('frames') || zip;
  let capturedCount = 0;

  for (let i = 0; i < shots.length; i++) {
    const dataUrl = renderShotDataUrl(i);
    if (!dataUrl) continue;
    const base64 = dataUrl.split(',')[1];
    if (base64) {
      const padded = String(shots[i].shotNumber).padStart(2, '0');
      framesFolder.file(`shot_${padded}_master.png`, base64, { base64: true });
      capturedCount++;
    }
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  triggerBrowserDownload(blob, `HANDFILM_ALL_${capturedCount}_FRAMES.zip`, 'application/zip');

  return {
    count: capturedCount,
    isNativeTauri: false,
    message: `[SANDBOX MODE] ${capturedCount} composite frames exported — Tauri IPC ready for Windows .exe`
  };
}
