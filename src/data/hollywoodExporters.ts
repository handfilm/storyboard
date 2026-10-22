/**
 * @file /src/data/hollywoodExporters.ts
 * @description Industry-standard Hollywood interchange exporters:
 * OpenTimelineIO (.otio), CMX 3600 EDL (.edl), Fountain Screenplay (.fountain),
 * SRT Subtitles (.srt), and CSV Shot List.
 */

import { AnthologyFrame, AnthologyProject } from '../types/anthology';

/**
 * Format frames count to SMPTE Timecode string HH:MM:SS:FF
 */
function framesToTimecode(totalFrames: number, fps: number = 24): string {
  const safeFps = fps > 0 ? fps : 24;
  const ff = Math.floor(totalFrames % safeFps);
  const totalSeconds = Math.floor(totalFrames / safeFps);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);

  return [
    String(hh).padStart(2, '0'),
    String(mm).padStart(2, '0'),
    String(ss).padStart(2, '0'),
    String(ff).padStart(2, '0')
  ].join(':');
}

/**
 * Format seconds to SRT subtitle format: HH:MM:SS,mmm
 */
function secondsToSRTTime(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const ss = totalSec % 60;
  const mm = Math.floor(totalSec / 60) % 60;
  const hh = Math.floor(totalSec / 3600);

  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * 1. OpenTimelineIO (.otio) Exporter
 * Generates valid JSON conforming to the OTIO specification for DaVinci Resolve, Premiere, and Final Cut Pro.
 */
export function exportToOTIO(project: AnthologyProject, fps: number = 24): string {
  const safeFps = fps || 24;

  let cumulativeFrame = 0;
  const clips = project.frames.map((frame, index) => {
    // Real assigned duration takes precedence over preview hold
    const assignedDurationSec = frame.durationSec ?? 2.5;
    const durationFrames = Math.max(1, Math.round(assignedDurationSec * safeFps));
    const previewHoldSec = frame.slideHoldSec ?? project.defaultSlideHoldSec ?? 12.0;
    const durationSource = frame.durationSec !== undefined ? 'Assigned Shot Duration (durationSec)' : 'Standard Assigned Duration (2.5s)';
    
    const startFrame = cumulativeFrame;
    cumulativeFrame += durationFrames;

    return {
      OTIO_SCHEMA: "Clip.1",
      name: `SHOT_${frame.epNumber}_${frame.title.replace(/\s+/g, '_')}`,
      source_range: {
        OTIO_SCHEMA: "TimeRange.1",
        start_time: {
          OTIO_SCHEMA: "RationalTime.1",
          value: 0,
          rate: safeFps
        },
        duration: {
          OTIO_SCHEMA: "RationalTime.1",
          value: durationFrames,
          rate: safeFps
        }
      },
      metadata: {
        RAWx: {
          bengaliTitle: frame.bengaliTitle,
          focalLength: frame.cameraSpec?.focalLength,
          aperture: frame.cameraSpec?.aperture,
          directorNotes: frame.directorNotes,
          soundCue: frame.soundCue,
          shotNumber: index + 1,
          assignedDurationSec,
          durationFrames,
          durationSource,
          previewHoldSec
        }
      }
    };
  });

  const otioDoc = {
    OTIO_SCHEMA: "Timeline.1",
    name: project.title || "RAWx Storyboard Sequence",
    global_start_time: {
      OTIO_SCHEMA: "RationalTime.1",
      value: 0,
      rate: safeFps
    },
    tracks: {
      OTIO_SCHEMA: "Stack.1",
      children: [
        {
          OTIO_SCHEMA: "Track.1",
          name: "V1 (Main Storyboard Sequence)",
          kind: "Video",
          children: clips
        }
      ]
    },
    metadata: {
      director: project.director,
      nodeLocation: project.nodeLocation,
      created: project.createdAt || new Date().toISOString(),
      durationCalculationNote: "Export uses real assigned shot duration (durationSec), not Stage preview hold"
    }
  };

  return JSON.stringify(otioDoc, null, 2);
}

/**
 * 2. CMX 3600 EDL Exporter
 * Standard Edit Decision List supported by Avid Media Composer, DaVinci Resolve, and Premiere Pro.
 */
export function exportToCMX3600EDL(project: AnthologyProject, fps: number = 24): string {
  const safeFps = fps || 24;

  let edl = `TITLE: ${project.title.substring(0, 32).toUpperCase()}\n`;
  edl += `FCM: NON-DROP FRAME\n`;
  edl += `* TIMELINE: REAL ASSIGNED DURATIONS (EXCLUDES PREVIEW HOLD)\n\n`;

  let timelineIn = 0;

  project.frames.forEach((frame, idx) => {
    const shotNum = String(idx + 1).padStart(3, '0');
    const assignedDurationSec = frame.durationSec ?? 2.5;
    const duration = Math.max(1, Math.round(assignedDurationSec * safeFps));
    const previewHoldSec = frame.slideHoldSec ?? project.defaultSlideHoldSec ?? 12.0;
    const durationSource = frame.durationSec !== undefined ? 'Assigned Shot Duration' : 'Default Assigned (2.5s)';
    const timelineOut = timelineIn + duration;

    const srcInTC = framesToTimecode(0, safeFps);
    const srcOutTC = framesToTimecode(duration, safeFps);
    const dstInTC = framesToTimecode(timelineIn, safeFps);
    const dstOutTC = framesToTimecode(timelineOut, safeFps);

    // Standard CMX 3600 entry line
    edl += `${shotNum}  AX       V     C        ${srcInTC} ${srcOutTC} ${dstInTC} ${dstOutTC}\n`;
    edl += `* FROM CLIP NAME: SHOT_${frame.epNumber}_${frame.title.toUpperCase()}\n`;
    edl += `* COMMENT: [${frame.bengaliTitle}] ${frame.cameraSpec.focalLength} ${frame.cameraSpec.aperture}\n`;
    edl += `* DURATION: ${assignedDurationSec.toFixed(2)}s [${durationSource}] (Preview Hold: ${previewHoldSec.toFixed(1)}s)\n\n`;

    timelineIn = timelineOut;
  });

  return edl;
}

/**
 * 3. Fountain Screenplay Exporter (.fountain)
 * Standard screenplay plaintext format used by Highland, Fade In, Final Draft, and Slugline.
 */
export function exportToFountain(project: AnthologyProject): string {
  let fountain = `Title: ${project.title}\n`;
  fountain += `Author: ${project.director}\n`;
  fountain += `Source: RAWx Storyboard Studio Anthology\n`;
  fountain += `Draft date: ${new Date().toLocaleDateString()}\n`;
  fountain += `Contact: ${project.nodeLocation}\n\n`;
  fountain += `===\n\n`;

  project.frames.forEach((frame, idx) => {
    const sceneNum = idx + 1;
    const shotType = idx % 2 === 0 ? "INT." : "EXT.";
    
    fountain += `${shotType} SCENE ${sceneNum} // ${frame.title.toUpperCase()} - NIGHT\n\n`;
    fountain += `/* বাংলা শীর্ষক: ${frame.bengaliTitle} */\n`;
    fountain += `/* CAMERA: ${frame.cameraSpec.focalLength} at ${frame.cameraSpec.aperture} // ISO ${frame.cameraSpec.iso} */\n\n`;
    fountain += `${frame.tagline}\n\n`;
    
    if (frame.directorNotes) {
      fountain += `DIRECTOR'S NOTE\n${frame.directorNotes}\n\n`;
    }

    if (frame.soundCue) {
      fountain += `> SOUND CUE: ${frame.soundCue} <\n\n`;
    }
  });

  return fountain;
}

/**
 * 4. SubRip Subtitle Exporter (.srt)
 * Timed bilingual subtitles for YouTube, Vimeo, and Media Players.
 */
export function exportToSRT(project: AnthologyProject, defaultDurationSec: number = 2.5): string {
  let srt = '';
  let currentTime = 0;

  project.frames.forEach((frame, idx) => {
    // Respect real assigned duration
    const shotDuration = frame.durationSec ?? defaultDurationSec;
    const startTime = currentTime;
    const endTime = currentTime + shotDuration;
    currentTime = endTime;

    const startStr = secondsToSRTTime(startTime);
    const endStr = secondsToSRTTime(endTime);

    srt += `${idx + 1}\n`;
    srt += `${startStr} --> ${endStr}\n`;
    srt += `${frame.bengaliTitle}\n`;
    srt += `${frame.title} — ${frame.tagline}\n\n`;
  });

  return srt;
}

/**
 * 5. CSV Shot List Exporter (.csv)
 * Exports full shot specifications including assigned duration, source type, and preview hold
 */
export function exportToCSVShotList(project: AnthologyProject): string {
  const headers = [
    'Shot #', 
    'Bengali Title', 
    'English Title', 
    'Tagline', 
    'Assigned Duration (s)', 
    'Duration Source', 
    'Preview Hold (s)', 
    'Focal Length', 
    'Aperture', 
    'ISO', 
    'Shutter', 
    'Sensor', 
    'Sound Cue', 
    'Director Notes'
  ];
  const rows = project.frames.map((frame, idx) => {
    const assignedDuration = frame.durationSec ?? 2.5;
    const durationSource = frame.durationSec !== undefined ? 'Assigned' : 'Default (2.5s)';
    const previewHold = frame.slideHoldSec ?? project.defaultSlideHoldSec ?? 12.0;

    return [
      `"${frame.epNumber || idx + 1}"`,
      `"${(frame.bengaliTitle || '').replace(/"/g, '""')}"`,
      `"${(frame.title || '').replace(/"/g, '""')}"`,
      `"${(frame.tagline || '').replace(/"/g, '""')}"`,
      `"${assignedDuration.toFixed(2)}"`,
      `"${durationSource}"`,
      `"${previewHold.toFixed(1)}"`,
      `"${(frame.cameraSpec?.focalLength || '').replace(/"/g, '""')}"`,
      `"${(frame.cameraSpec?.aperture || '').replace(/"/g, '""')}"`,
      `"${(frame.cameraSpec?.iso || '').replace(/"/g, '""')}"`,
      `"${(frame.cameraSpec?.shutter || '').replace(/"/g, '""')}"`,
      `"${(frame.cameraSpec?.sensor || '').replace(/"/g, '""')}"`,
      `"${(frame.soundCue || '').replace(/"/g, '""')}"`,
      `"${(frame.directorNotes || '').replace(/"/g, '""')}"`
    ];
  });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export const exportToFountainScreenplay = exportToFountain;

/**
 * Helper to download text content as file
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

