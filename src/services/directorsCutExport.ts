/**
 * @file /src/services/directorsCutExport.ts
 * @description Bundles Director's Cut production assets into a single ZIP archive:
 * 1. `shot_list.csv`: Formatted production shot list (Shot #, Timecode In/Out, Duration, Lens, Description, Dialogue/Audio Cue)
 * 2. `screenplay.fountain`: Industry-standard Fountain format screenplay script
 * 3. `project_master.json`: Master project metadata, sequence timings, frame markers, and camera setup
 * 4. `README.txt`: Package manifest and production specs
 */

import JSZip from 'jszip';
import { AnthologyFrame } from '../types/anthology';

export interface DirectorsCutExportOptions {
  projectTitle: string;
  directorName: string;
  aspectRatio: string;
  frames: AnthologyFrame[];
  fps?: number;
  totalDurationSec?: number;
  customFilename?: string;
}

export function formatSmpteTimecode(seconds: number, fps: number = 24): string {
  const totalFrames = Math.round(seconds * fps);
  const hrs = Math.floor(totalFrames / (3600 * fps));
  const rem1 = totalFrames % (3600 * fps);
  const mins = Math.floor(rem1 / (60 * fps));
  const rem2 = rem1 % (60 * fps);
  const secs = Math.floor(rem2 / fps);
  const frames = rem2 % fps;

  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

export function generateShotListCsv(
  frames: AnthologyFrame[],
  projectTitle: string,
  directorName: string,
  fps: number = 24
): string {
  const headers = [
    'Shot Number',
    'Timecode In',
    'Timecode Out',
    'Duration Frames',
    'Duration Sec',
    'Scene',
    'Shot Type / Angle',
    'Camera Lens',
    'Aspect Ratio',
    'English Title',
    'Bengali Title',
    'Audio & Sound Cue',
    'Directorial Action Notes'
  ];

  let cumulativeSec = 0;
  const rows = frames.map((frame, idx) => {
    const shotNum = `SH${String(idx + 1).padStart(3, '0')}`;
    const durationSec = 12.0; // 12.0s per slide
    const durationFrames = Math.round(durationSec * fps);
    const tcIn = formatSmpteTimecode(cumulativeSec, fps);
    cumulativeSec += durationSec;
    const tcOut = formatSmpteTimecode(cumulativeSec, fps);

    const escapeCsv = (str: string | undefined) => {
      if (!str) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const sceneNum = `SCENE ${Math.floor(idx / 4) + 1}`;
    const shotType = idx % 3 === 0 ? 'WIDE ESTABLISHING' : idx % 3 === 1 ? 'MEDIUM CLOSE-UP' : 'CINEMATIC MACRO';
    const lens = idx % 2 === 0 ? 'ARRI Master Anamorphic 35mm T1.9' : 'Cooke Anamorphic /i Full Frame Plus 50mm';
    const aspectRatio = '2.39:1 Anamorphic Scope';
    const titleEn = frame.title || `Shot ${idx + 1}`;
    const titleBn = frame.bengaliTitle || 'দৃশ্য ফ্রেম';
    const soundCue = frame.soundCue || (frame as any).caption || '43.6Hz Sub Drone & Anamorphic Halation Cue';
    const notes = frame.tagline || frame.directorNotes || 'Master composition with 35mm grain and center skin bloom.';

    return [
      shotNum,
      tcIn,
      tcOut,
      durationFrames,
      `${durationSec.toFixed(2)}s`,
      escapeCsv(sceneNum),
      escapeCsv(shotType),
      escapeCsv(lens),
      escapeCsv(aspectRatio),
      escapeCsv(titleEn),
      escapeCsv(titleBn),
      escapeCsv(soundCue),
      escapeCsv(notes)
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

export function generateFountainScreenplay(
  frames: AnthologyFrame[],
  projectTitle: string,
  directorName: string
): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let fountain = `Title: ${projectTitle.toUpperCase()}\n`;
  fountain += `Credit: Written and Directed by\n`;
  fountain += `Author: ${directorName}\n`;
  fountain += `Source: RAWx / HANDFILM Storyboard Master OS\n`;
  fountain += `Draft date: ${dateStr}\n`;
  fountain += `Contact: HANDFILM ANTHOLOGY SUITE\n\n`;
  fountain += `===\n\n`;

  frames.forEach((frame, idx) => {
    const sceneNum = Math.floor(idx / 4) + 1;
    const shotNum = `SH${String(idx + 1).padStart(3, '0')}`;
    const titleEn = frame.title || `Shot ${idx + 1}`;
    const titleBn = frame.bengaliTitle ? ` [${frame.bengaliTitle}]` : '';

    if (idx % 4 === 0) {
      fountain += `EXT. ANTHOLOGY ENVIRONMENT - SCENE ${sceneNum} - DUSK\n\n`;
    }

    fountain += `.${shotNum} - ${titleEn.toUpperCase()}${titleBn}\n\n`;
    
    if (frame.tagline) {
      fountain += `${frame.tagline}\n\n`;
    } else {
      fountain += `The frame holds in continuous anamorphic scope. Ambient light washes across the composition.\n\n`;
    }

    const cue = frame.soundCue || (frame as any).caption;
    if (cue) {
      fountain += `DIRECTOR'S CUE (V.O.)\n`;
      fountain += `(softly)\n`;
      fountain += `${cue}\n\n`;
    }
  });

  fountain += `\nTHE END\n`;
  return fountain;
}

export function generateProjectMasterJson(
  options: DirectorsCutExportOptions
): string {
  const masterPayload = {
    schemaVersion: '2.4.0',
    engine: 'HANDFILM / RAWx Cinema Storyboard OS',
    exportTimestamp: new Date().toISOString(),
    project: {
      title: options.projectTitle,
      director: options.directorName,
      aspectRatio: options.aspectRatio,
      fps: options.fps || 24,
      totalShots: options.frames.length,
      shotDurationSec: 12.0,
      totalRuntimeSec: options.frames.length * 12.0,
      colorScience: 'ARRI LogC3 / Rec.709 Cinema Emulation',
      audioProfile: 'Web Audio DSP 43.6Hz Cinematic Sub Harmonic'
    },
    shots: options.frames.map((frame, idx) => ({
      shotNumber: idx + 1,
      id: frame.id || `shot_${idx + 1}`,
      titleEn: frame.title || `Shot ${idx + 1}`,
      titleBn: frame.bengaliTitle || 'দৃশ্য ফ্রেম',
      caption: frame.soundCue || (frame as any).caption || '',
      tagline: frame.tagline || '',
      aspectRatio: frame.aspectRatio || options.aspectRatio,
      durationSec: 12.0,
      durationFrames: 288,
      mediaProxy: frame.imageUrl ? 'embedded_or_remote' : 'raw_plate',
      optics: {
        grainIso: 800,
        shutterAngle: '180°',
        anamorphicSqueeze: '1.33x',
        bloomHalation: true
      }
    }))
  };

  return JSON.stringify(masterPayload, null, 2);
}

export function generateReadmeManifest(
  options: DirectorsCutExportOptions
): string {
  const dateStr = new Date().toUTCString();
  return `========================================================================
HANDFILM / RAWx STORYBOARD ENGINE — DIRECTOR'S CUT MASTER BUNDLE
========================================================================

Project Title:     ${options.projectTitle}
Director:          ${options.directorName}
Aspect Ratio:      ${options.aspectRatio}
Shot Count:        ${options.frames.length} Shots
Duration:          ${(options.frames.length * 12.0).toFixed(1)} seconds @ 24.0 FPS
Generated:         ${dateStr}

PACKAGE CONTENTS:
-----------------
1. shot_list.csv
   Complete tabular production shot list containing shot numbers, SMPTE 
   timecodes (In/Out), frame counts, camera angles, lens specifications, 
   dialogue cues, and curatorial notes. Can be opened in Excel, Google Sheets, 
   or imported into production management tools.

2. screenplay.fountain
   Industry-standard Fountain-formatted screenplay specification of all shots, 
   scene headings, action descriptions, and voiceover cues. Compatible with 
   Highland 2, Fade In, Final Draft, and Slugline.

3. project_master.json
   Comprehensive lossless project archive containing all metadata, optical 
   parameters, frame indices, and sequence settings.

IMPORT & WORKFLOW NOTES:
------------------------
- To import shot list into Premiere or DaVinci, utilize the accompanying 
  FCPXML / Premiere XML exports from the Export Studio.
- All shots are calibrated to 24fps cinema standard (288 frames per 12.0s hold).

(c) HANDFILM ANTHOLOGY CORE — ALL RIGHTS RESERVED.
========================================================================
`;
}

/**
 * Generate and trigger download of the Director's Cut ZIP archive
 */
export async function exportDirectorsCutBundle(
  options: DirectorsCutExportOptions
): Promise<string> {
  const zip = new JSZip();

  const csv = generateShotListCsv(
    options.frames,
    options.projectTitle,
    options.directorName,
    options.fps || 24
  );
  const fountain = generateFountainScreenplay(
    options.frames,
    options.projectTitle,
    options.directorName
  );
  const masterJson = generateProjectMasterJson(options);
  const readme = generateReadmeManifest(options);

  // Add files to ZIP
  zip.file('shot_list.csv', csv);
  zip.file('screenplay.fountain', fountain);
  zip.file('project_master.json', masterJson);
  zip.file('README.txt', readme);

  // Generate blob
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const cleanProject = options.projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = options.customFilename
    ? `${options.customFilename.replace(/\.zip$/i, '')}.zip`
    : `HANDFILM_${cleanProject}_DirectorsCut_Bundle.zip`;

  // Trigger download
  const url = URL.createObjectURL(zipBlob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10000);

  return filename;
}
