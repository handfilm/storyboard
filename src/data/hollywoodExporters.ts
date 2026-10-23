/**
 * @file /src/data/hollywoodExporters.ts
 * @description Master Hollywood standard sequence exporters (OTIO, CMX3600 EDL, Fountain, SRT, CSV).
 */

import { AnthologyFrame, AnthologyProject } from '../types/anthology';

/**
 * Triggers in-browser file download from in-memory string or blob
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string = 'text/plain'): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Formats SMPTE timecode (HH:MM:SS:FF)
 */
function framesToTC(totalFrames: number, fps: number = 24): string {
  const f = Math.floor(totalFrames % fps);
  const s = Math.floor((totalFrames / fps) % 60);
  const m = Math.floor((totalFrames / (fps * 60)) % 60);
  const h = Math.floor(totalFrames / (fps * 3600));
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
    String(f).padStart(2, '0')
  ].join(':');
}

/**
 * Formats SRT timecode (HH:MM:SS,mmm)
 */
function secondsToSrtTime(totalSec: number): string {
  const ms = Math.floor((totalSec % 1) * 1000);
  const s = Math.floor(totalSec % 60);
  const m = Math.floor((totalSec / 60) % 60);
  const h = Math.floor(totalSec / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * 1. OpenTimelineIO (.otio) Universal Timeline Exporter
 */
export function exportToOTIO(project: AnthologyProject): string {
  const fps = 24;
  const frames = project.frames || [];
  let currentStartFrame = 0;

  const clips = frames.map((f, idx) => {
    const durationFrames = 288; // 12 seconds per slide default
    const clipObj = {
      OTIO_SCHEMA: 'Clip.1',
      name: `Shot_${f.epNumber || String(idx + 1).padStart(3, '0')}`,
      source_range: {
        OTIO_SCHEMA: 'TimeRange.1',
        start_time: {
          OTIO_SCHEMA: 'RationalTime.1',
          value: 0,
          rate: fps
        },
        duration: {
          OTIO_SCHEMA: 'RationalTime.1',
          value: durationFrames,
          rate: fps
        }
      },
      metadata: {
        rawx: {
          titleEn: f.title || '',
          titleBn: f.bengaliTitle || '',
          lens: f.cameraSpec?.focalLength || 'Master Cine',
          aperture: f.cameraSpec?.aperture || 'f/1.4',
          directorNotes: f.directorNotes || ''
        }
      }
    };
    currentStartFrame += durationFrames;
    return clipObj;
  });

  const otioDoc = {
    OTIO_SCHEMA: 'Timeline.1',
    name: project.title || 'RAWx Sequence',
    global_start_time: {
      OTIO_SCHEMA: 'RationalTime.1',
      value: 0,
      rate: fps
    },
    tracks: {
      OTIO_SCHEMA: 'Stack.1',
      children: [
        {
          OTIO_SCHEMA: 'Track.1',
          name: 'V1 - Master Storyboard Video',
          kind: 'Video',
          children: clips
        }
      ]
    }
  };

  return JSON.stringify(otioDoc, null, 2);
}

/**
 * 2. CMX 3600 EDL (Edit Decision List) for Avid / Premiere / DaVinci
 */
export function exportToCMX3600EDL(project: AnthologyProject): string {
  const fps = 24;
  const frames = project.frames || [];
  const lines: string[] = [
    `TITLE: ${project.title.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 32)}`,
    'FCM: NON-DROP FRAME',
    ''
  ];

  let recordStart = 0;

  frames.forEach((f, idx) => {
    const eventNum = String(idx + 1).padStart(3, '0');
    const reel = 'AX';
    const durationFrames = 288; // 12s
    const srcIn = framesToTC(0, fps);
    const srcOut = framesToTC(durationFrames, fps);
    const recIn = framesToTC(recordStart, fps);
    const recOut = framesToTC(recordStart + durationFrames, fps);

    lines.push(`${eventNum}  ${reel}       V     C        ${srcIn} ${srcOut} ${recIn} ${recOut}`);
    lines.push(`* FROM CLIP NAME: SHOT_${f.epNumber || eventNum}`);
    if (f.title) lines.push(`* TITLE EN: ${f.title}`);
    if (f.bengaliTitle) lines.push(`* TITLE BN: ${f.bengaliTitle}`);
    if (f.cameraSpec?.focalLength) lines.push(`* OPTICS: ${f.cameraSpec.focalLength} ${f.cameraSpec.aperture || ''}`);
    lines.push('');

    recordStart += durationFrames;
  });

  return lines.join('\r\n');
}

/**
 * 3. Fountain Screenplay Script Format
 */
export function exportToFountain(project: AnthologyProject): string {
  const lines: string[] = [
    `Title: ${project.title}`,
    `Credit: Written & Directed by`,
    `Author: ${project.director || 'Director'}`,
    `Draft date: ${new Date().toLocaleDateString()}`,
    `Contact: ${project.nodeLocation || 'Dhaka Studio'}`,
    '',
    '===',
    ''
  ];

  (project.frames || []).forEach((f, idx) => {
    const num = f.epNumber || String(idx + 1).padStart(3, '0');
    const sceneHeading = `दृश्य ${num} // EXT. DHAKA STUDIO - DAY`;
    lines.push(sceneHeading);
    lines.push('');
    if (f.title || f.bengaliTitle) {
      lines.push(`${(f.bengaliTitle || f.title || '').toUpperCase()}`);
      lines.push(`(whispering in cinematic silence)`);
      lines.push(`${f.tagline || f.title || 'A vision into the singularity.'}`);
      lines.push('');
    }
    if (f.directorNotes) {
      lines.push(`[[ DIRECTORIAL NOTE: ${f.directorNotes} ]]`);
      lines.push('');
    }
  });

  return lines.join('\n');
}

export const exportToFountainScreenplay = exportToFountain;

/**
 * 4. SubRip Subtitles (.srt) Bilingual Synchronized
 */
export function exportToSRT(project: AnthologyProject): string {
  const frames = project.frames || [];
  const durationSec = 12.0;
  const blocks: string[] = [];

  frames.forEach((f, idx) => {
    const startSec = idx * durationSec;
    const endSec = startSec + durationSec;
    const srtTime = `${secondsToSrtTime(startSec)} --> ${secondsToSrtTime(endSec)}`;

    const textLines = [
      f.bengaliTitle || '',
      f.title || '',
      f.tagline || ''
    ].filter(Boolean);

    blocks.push([
      String(idx + 1),
      srtTime,
      textLines.join('\n')
    ].join('\n'));
  });

  return blocks.join('\n\n') + '\n';
}

/**
 * 5. CSV Shot List Exporter
 */
export function exportToCSVShotList(project: AnthologyProject): string {
  const headers = ['Shot Number', 'English Title', 'Bengali Title', 'Tagline', 'Focal Length', 'Aperture', 'ISO', 'Notes'];
  const rows = (project.frames || []).map((f, idx) => {
    const ep = `"${f.epNumber || String(idx + 1).padStart(3, '0')}"`;
    const title = `"${(f.title || '').replace(/"/g, '""')}"`;
    const bn = `"${(f.bengaliTitle || '').replace(/"/g, '""')}"`;
    const tag = `"${(f.tagline || '').replace(/"/g, '""')}"`;
    const focal = `"${(f.cameraSpec?.focalLength || '').replace(/"/g, '""')}"`;
    const ap = `"${(f.cameraSpec?.aperture || '').replace(/"/g, '""')}"`;
    const iso = `"${(f.cameraSpec?.iso || '').replace(/"/g, '""')}"`;
    const notes = `"${(f.directorNotes || '').replace(/"/g, '""')}"`;
    return [ep, title, bn, tag, focal, ap, iso, notes].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
