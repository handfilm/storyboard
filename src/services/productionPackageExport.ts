/**
 * @file /src/services/productionPackageExport.ts
 * @description Bundles project into a professional "Production Package" ZIP archive.
 * 
 * Contents of the Production Package:
 * 1. `manifest.json`: Comprehensive universal NLE JSON manifest with frame-accurate
 *    SMPTE timecodes, durations, Bengali & English metadata, camera specs, and NLE import mappings.
 * 2. `assets/`: Full-resolution frame plates (PNG/MP4) for every shot in the timeline.
 * 3. `sequence.edl`: Standard CMX 3600 Edit Decision List mapping each shot to `shot_XXX.png`.
 * 4. `sequence.xml`: Industry-standard Final Cut Pro 7 XML sequence referencing `assets/shot_XXX.png`
 *    for instant 1-click conform in Adobe Premiere Pro, DaVinci Resolve, and Final Cut Pro.
 * 5. `README_NLE_IMPORT.md`: Step-by-step external NLE import and conform documentation.
 */

import JSZip from 'jszip';
import { AnthologyFrame } from '../types/anthology';
import { SlideDraft } from '../types/project';
import { studioDraftDb } from './db';
import { SLIDE_DURATION_SEC } from '../types/editor';

export interface ProductionPackageOptions {
  projectTitle: string;
  directorName: string;
  aspectRatio: string;
  frames: AnthologyFrame[];
  slides?: SlideDraft[];
  fps?: number;
  customFilename?: string;
  burnInTitles?: boolean;
  includeXmlEdl?: boolean;
  targetResolution?: '4k_scope' | '1080p_scope' | 'source';
  onProgress?: (progress: {
    percent: number;
    stage: string;
    current: number;
    total: number;
  }) => void;
  abortSignal?: AbortSignal;
}

/**
 * Format frame count to SMPTE Timecode (HH:MM:SS:FF)
 */
export function formatSMPTETimecode(frameNum: number, fps: number = 24): string {
  const safeFps = Math.max(1, Math.round(fps));
  const ff = Math.floor(frameNum % safeFps);
  const totalSecs = Math.floor(frameNum / safeFps);
  const ss = totalSecs % 60;
  const mm = Math.floor(totalSecs / 60) % 60;
  const hh = Math.floor(totalSecs / 3600);

  return [
    String(hh).padStart(2, '0'),
    String(mm).padStart(2, '0'),
    String(ss).padStart(2, '0'),
    String(ff).padStart(2, '0')
  ].join(':');
}

/**
 * Resolves or renders a high-quality frame asset PNG blob for packaging
 */
async function resolveFrameAssetBlob(
  frame: AnthologyFrame,
  slide: SlideDraft | undefined,
  shotIndex: number,
  burnInTitles: boolean,
  targetWidth: number,
  targetHeight: number
): Promise<{ blob: Blob; filename: string }> {
  const shotNumPadded = String(shotIndex + 1).padStart(3, '0');
  const filename = `shot_${shotNumPadded}.png`;

  // Check if frame has direct media URL or media_vault item
  let mediaUrl = frame.imageUrl || slide?.remoteUrl || '';

  if (!mediaUrl) {
    try {
      const slot = await studioDraftDb.getTimelineSlot(shotIndex);
      if (slot?.mediaId) {
        const item = await studioDraftDb.getVaultMediaItem(slot.mediaId);
        if (item?.blob) {
          mediaUrl = URL.createObjectURL(item.blob);
        }
      }
    } catch {}
  }

  // Draw high-resolution canvas plate to guarantee uniform quality and dimensions
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return { blob: new Blob([], { type: 'image/png' }), filename };
  }

  // Draw background fill
  ctx.fillStyle = '#06070a';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  let imageRendered = false;

  if (mediaUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = mediaUrl;
      });

      if (img.complete && img.naturalWidth > 0) {
        // Compute cover crop
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const targetRatio = targetWidth / targetHeight;
        let sW = img.naturalWidth;
        let sH = img.naturalHeight;
        let sX = 0;
        let sY = 0;

        if (imgRatio > targetRatio) {
          sW = img.naturalHeight * targetRatio;
          sX = (img.naturalWidth - sW) / 2;
        } else {
          sH = img.naturalWidth / targetRatio;
          const panY = slide?.panY ?? 50;
          sY = ((img.naturalHeight - sH) * panY) / 100;
        }

        ctx.drawImage(img, sX, sY, sW, sH, 0, 0, targetWidth, targetHeight);
        imageRendered = true;
      }
    } catch {
      // Fallback to stylized cinema canvas plate
    }
  }

  if (!imageRendered) {
    // Stylized Anamorphic Scope Slate
    const grad = ctx.createLinearGradient(0, 0, targetWidth, targetHeight);
    grad.addColorStop(0, '#0a0d14');
    grad.addColorStop(0.5, '#121622');
    grad.addColorStop(1, '#06070a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Subtle Grid pattern
    ctx.strokeStyle = 'rgba(245, 166, 35, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(targetWidth * 0.2, 0);
    ctx.lineTo(targetWidth * 0.2, targetHeight);
    ctx.moveTo(targetWidth * 0.8, 0);
    ctx.lineTo(targetWidth * 0.8, targetHeight);
    ctx.moveTo(0, targetHeight * 0.5);
    ctx.lineTo(targetWidth, targetHeight * 0.5);
    ctx.stroke();

    // Slate Center Watermark
    ctx.fillStyle = 'rgba(245, 166, 35, 0.35)';
    ctx.font = `bold ${Math.round(targetHeight * 0.08)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`RAWx SHOT ${shotNumPadded} // 2.39:1 CINEMA PLATE`, targetWidth / 2, targetHeight / 2 - 12);
  }

  // Burn-in Titles if requested
  if (burnInTitles) {
    const titleBn = slide?.titleBn || frame.bengaliTitle || 'দৃশ্য ফ্রেম';
    const titleEn = slide?.titleEn || frame.title || `Shot ${shotIndex + 1}`;

    ctx.save();
    ctx.textAlign = 'center';

    // Ambient gold bloom
    ctx.shadowColor = 'rgba(245, 166, 35, 0.65)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#FFD54F';
    ctx.font = `bold ${Math.round(targetHeight * 0.065)}px "Anek Bangla", "Noto Serif Bengali", sans-serif`;
    ctx.fillText(titleBn, targetWidth / 2, targetHeight / 2 - 10);

    // English Subtitle
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#E2E8F0';
    ctx.font = `bold ${Math.round(targetHeight * 0.026)}px "JetBrains Mono", monospace`;
    ctx.fillText(titleEn.toUpperCase(), targetWidth / 2, targetHeight / 2 + Math.round(targetHeight * 0.04));

    ctx.restore();
  }

  // Timecode Watermark (lower right)
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  const badgeW = 200;
  const badgeH = 26;
  ctx.fillRect(targetWidth - badgeW - 20, targetHeight - badgeH - 20, badgeW, badgeH);
  ctx.strokeStyle = 'rgba(245, 166, 35, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(targetWidth - badgeW - 20, targetHeight - badgeH - 20, badgeW, badgeH);
  ctx.fillStyle = '#FFE066';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  const startFrame = shotIndex * 288;
  ctx.fillText(`SH${shotNumPadded} • ${formatSMPTETimecode(startFrame, 24)}`, targetWidth - (badgeW / 2) - 20, targetHeight - 20 - 8);
  ctx.restore();

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob([], { type: 'image/png' })), 'image/png');
  });

  return { blob, filename };
}

/**
 * Generates Universal NLE Interoperability JSON Manifest
 */
export function generateNleManifestJson(options: ProductionPackageOptions): string {
  const fps = options.fps || 24;
  const frames = options.frames;
  const slides = options.slides || [];
  const durationPerShotSec = SLIDE_DURATION_SEC;
  const framesPerShot = Math.round(durationPerShotSec * fps);

  const manifest = {
    manifestVersion: '1.0.0',
    generator: 'HANDFILM / RAWx Cinema Storyboard OS',
    format: 'HANDFILM_PRODUCTION_PACKAGE_V1',
    exportTimestamp: new Date().toISOString(),
    project: {
      title: options.projectTitle,
      director: options.directorName,
      aspectRatio: options.aspectRatio,
      fps,
      timebase: `${fps}`,
      dropFrame: false,
      colorSpace: 'ARRI LogC3 / Rec.709 Cinema Emulation',
      totalShots: frames.length,
      shotDurationSec: durationPerShotSec,
      totalDurationSec: frames.length * durationPerShotSec,
      totalFrames: frames.length * framesPerShot
    },
    assets: frames.map((_, idx) => {
      const shotNumPadded = String(idx + 1).padStart(3, '0');
      return {
        id: `asset_${shotNumPadded}`,
        shotNumber: idx + 1,
        filename: `shot_${shotNumPadded}.png`,
        path: `assets/shot_${shotNumPadded}.png`,
        mimeType: 'image/png',
        aspectRatio: options.aspectRatio,
        durationFrames: framesPerShot
      };
    }),
    timeline: frames.map((frame, idx) => {
      const slide = slides[idx];
      const shotNum = idx + 1;
      const shotNumPadded = String(shotNum).padStart(3, '0');
      const startFrame = idx * framesPerShot;
      const endFrame = (idx + 1) * framesPerShot;

      return {
        shotIndex: idx,
        shotNumber: shotNum,
        shotId: frame.id || `shot_${shotNum}`,
        clipName: `SH${shotNumPadded}_${(frame.title || `SHOT_${shotNum}`).toUpperCase().replace(/\s+/g, '_')}`,
        assetRef: `asset_${shotNumPadded}`,
        assetPath: `assets/shot_${shotNumPadded}.png`,
        timecodeIn: formatSMPTETimecode(startFrame, fps),
        timecodeOut: formatSMPTETimecode(endFrame, fps),
        recordTimecodeIn: formatSMPTETimecode(startFrame, fps),
        recordTimecodeOut: formatSMPTETimecode(endFrame, fps),
        durationFrames: framesPerShot,
        durationSec: durationPerShotSec,
        titles: {
          bengali: slide?.titleBn || frame.bengaliTitle || 'দৃশ্য ফ্রেম',
          english: slide?.titleEn || frame.title || `Shot ${shotNum}`,
          tagline: slide?.tagline || frame.tagline || ''
        },
        directorialNotes: slide?.directorNotes || frame.directorNotes || '',
        audioCue: slide?.soundCue || frame.soundCue || 'Ambient Sub Drone 43.6Hz',
        cameraSpec: {
          focalLength: frame.cameraSpec?.focalLength || (idx % 2 === 0 ? '35mm Anamorphic' : '50mm Anamorphic'),
          aperture: frame.cameraSpec?.aperture || 'T1.5',
          shutterAngle: '180°',
          fps
        },
        optics: {
          lut: frame.lutFilter || 'Anamorphic Gold',
          aspectRatio: options.aspectRatio,
          bloomHalation: true
        }
      };
    }),
    nleInterchange: {
      adobePremierePro: {
        recommendedImport: 'Import sequence.xml directly via File > Import. Clips in assets/ will automatically link.',
        defaultTransition: 'Cross Dissolve (0.3s)',
        scaleToFrameSize: true
      },
      daVinciResolve: {
        recommendedImport: 'File > Import Timeline > Import AAF, EDL, XML... Choose sequence.xml or sequence.edl.',
        colorManagement: 'DaVinci YRGB Color Managed or Rec.709 / Gamma 2.4',
        conformFramerate: fps
      },
      finalCutPro: {
        recommendedImport: 'File > Import > XML... Choose sequence.xml.',
        spatialConform: 'Fit'
      }
    }
  };

  return JSON.stringify(manifest, null, 2);
}

/**
 * Generates CMX 3600 Edit Decision List (EDL) referencing `assets/shot_XXX.png`
 */
export function generateCmx3600Edl(options: ProductionPackageOptions): string {
  const fps = options.fps || 24;
  const frames = options.frames;
  const framesPerShot = Math.round(SLIDE_DURATION_SEC * fps);

  let edl = `TITLE: ${options.projectTitle.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}\n`;
  edl += `FCM: NON-DROP FRAME\n\n`;

  frames.forEach((frame, idx) => {
    const shotNum = idx + 1;
    const shotNumPadded = String(shotNum).padStart(3, '0');
    const startFrame = idx * framesPerShot;
    const endFrame = (idx + 1) * framesPerShot;

    const sourceIn = '00:00:00:00';
    const sourceOut = formatSMPTETimecode(framesPerShot, fps);
    const recIn = formatSMPTETimecode(startFrame, fps);
    const recOut = formatSMPTETimecode(endFrame, fps);

    edl += `${shotNumPadded}  AX       V     C        ${sourceIn} ${sourceOut} ${recIn} ${recOut}\n`;
    edl += `* FROM CLIP NAME: assets/shot_${shotNumPadded}.png\n`;
    const titleEn = frame.title || `Shot ${shotNum}`;
    const titleBn = frame.bengaliTitle || '';
    edl += `* COMMENT: SHOT ${shotNumPadded} | ${titleBn} | ${titleEn}\n\n`;
  });

  return edl;
}

/**
 * Generates FCP 7 XML sequence linking to `assets/shot_XXX.png`
 */
export function generateProductionPackageXml(
  options: ProductionPackageOptions,
  width: number,
  height: number
): string {
  const fps = options.fps || 24;
  const frames = options.frames;
  const framesPerShot = Math.round(SLIDE_DURATION_SEC * fps);
  const totalFrames = frames.length * framesPerShot;

  const clipItemsXml = frames.map((frame, idx) => {
    const shotNum = idx + 1;
    const shotNumPadded = String(shotNum).padStart(3, '0');
    const startFrame = idx * framesPerShot;
    const endFrame = (idx + 1) * framesPerShot;
    const clipName = `SH${shotNumPadded}_${(frame.title || `SHOT_${shotNum}`).replace(/&/g, '&amp;')}`;
    const assetFilename = `shot_${shotNumPadded}.png`;

    return `
          <clipitem id="clipitem-${shotNum}">
            <name>${clipName}</name>
            <duration>${framesPerShot}</duration>
            <rate>
              <timebase>${fps}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${startFrame}</start>
            <end>${endFrame}</end>
            <in>0</in>
            <out>${framesPerShot}</out>
            <file id="file-${shotNum}">
              <name>${assetFilename}</name>
              <pathurl>assets/${assetFilename}</pathurl>
              <rate>
                <timebase>${fps}</timebase>
                <ntsc>FALSE</ntsc>
              </rate>
              <duration>${framesPerShot}</duration>
              <media>
                <video>
                  <samplecharacteristics>
                    <width>${width}</width>
                    <height>${height}</height>
                  </samplecharacteristics>
                </video>
              </media>
            </file>
            <comments>
              <mastercomment1>${(frame.bengaliTitle || '').replace(/&/g, '&amp;')}</mastercomment1>
              <mastercomment2>${(frame.directorNotes || frame.tagline || '').replace(/&/g, '&amp;')}</mastercomment2>
            </comments>
          </clipitem>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <project>
    <name>${options.projectTitle.replace(/&/g, '&amp;')}</name>
    <children>
      <sequence id="sequence-1">
        <name>${options.projectTitle.replace(/&/g, '&amp;')} Master Sequence</name>
        <duration>${totalFrames}</duration>
        <rate>
          <timebase>${fps}</timebase>
          <ntsc>FALSE</ntsc>
        </rate>
        <timecode>
          <rate>
            <timebase>${fps}</timebase>
            <ntsc>FALSE</ntsc>
          </rate>
          <string>00:00:00:00</string>
          <frame>0</frame>
          <displayformat>NDF</displayformat>
        </timecode>
        <media>
          <video>
            <format>
              <samplecharacteristics>
                <width>${width}</width>
                <height>${height}</height>
                <anamorphic>FALSE</anamorphic>
                <pixelaspectratio>square</pixelaspectratio>
                <fielddominance>none</fielddominance>
                <rate>
                  <timebase>${fps}</timebase>
                  <ntsc>FALSE</ntsc>
                </rate>
              </samplecharacteristics>
            </format>
            <track>
              <enabled>TRUE</enabled>
              <locked>FALSE</locked>
              ${clipItemsXml}
            </track>
          </video>
        </media>
      </sequence>
    </children>
  </project>
</xmeml>`;
}

/**
 * Generates README_NLE_IMPORT.md documentation
 */
export function generateReadmeNleImport(options: ProductionPackageOptions): string {
  return `# ${options.projectTitle.toUpperCase()} — PRODUCTION PACKAGE

**Director:** ${options.directorName}  
**Aspect Ratio:** ${options.aspectRatio} (Cinemascope)  
**Timebase:** ${options.fps || 24} FPS  
**Total Shots:** ${options.frames.length}  
**Total Duration:** ${(options.frames.length * SLIDE_DURATION_SEC).toFixed(1)} seconds  
**Created:** ${new Date().toUTCString()}  

---

## PACKAGE STRUCTURE

\`\`\`
/
├── manifest.json          # Complete JSON manifest for NLE automation & pipeline tools
├── sequence.xml           # Apple FCP 7 XML sequence (for Adobe Premiere & DaVinci Resolve)
├── sequence.edl           # Standard CMX 3600 Edit Decision List
├── README_NLE_IMPORT.md   # This post-production guide
└── assets/                # Full-resolution frame plates
    ├── shot_001.png
    ├── shot_002.png
    └── ...
\`\`\`

---

## 1. ADOBE PREMIERE PRO IMPORT

1. Extract this entire ZIP archive into a dedicated project folder.
2. In Adobe Premiere Pro, go to **File > Import...** (or \`Ctrl+I\` / \`Cmd+I\`).
3. Select \`sequence.xml\`.
4. Premiere Pro will import the timeline sequence with all ${options.frames.length} clips placed at exact 12.0s intervals, already linked to the images in the \`assets/\` directory!

---

## 2. DAVINCI RESOLVE IMPORT

1. Extract this ZIP archive.
2. Open DaVinci Resolve and navigate to **File > Import Timeline > Import AAF, EDL, XML...**
3. Select \`sequence.xml\` (or \`sequence.edl\`).
4. Set the project frame rate to **${options.fps || 24} fps**.
5. DaVinci will conform the edit timeline directly with all shot markers and timecodes.

---

## 3. FINAL CUT PRO / CAPCUT DESKTOP

1. Extract the ZIP archive.
2. CapCut Desktop: **File > Import > XML** -> Choose \`sequence.xml\`.
3. Final Cut Pro: **File > Import > XML** -> Choose \`sequence.xml\`.

---

## 4. PIPELINE / PYTHON AUTOMATION VIA MANIFEST.JSON

The \`manifest.json\` file provides frame-accurate timeline metadata:
- Exact SMPTE \`timecodeIn\` and \`timecodeOut\`
- Bengali and English titles (\`titles.bengali\`, \`titles.english\`)
- Director's camera setups (\`cameraSpec.focalLength\`, \`cameraSpec.aperture\`)
- Dialogue and audio cues (\`audioCue\`)

(c) HANDFILM ANTHOLOGY CORE — ALL RIGHTS RESERVED.
`;
}

/**
 * Main export function: bundles all assets and generates the Production Package ZIP
 */
export async function exportProductionPackageZip(
  options: ProductionPackageOptions
): Promise<string> {
  const zip = new JSZip();
  const frames = options.frames;
  const slides = options.slides || [];
  const fps = options.fps || 24;
  const burnInTitles = Boolean(options.burnInTitles);

  let targetWidth = 1920;
  let targetHeight = 804; // 2.39:1 scope

  if (options.targetResolution === '4k_scope') {
    targetWidth = 3840;
    targetHeight = 1608;
  }

  const assetsFolder = zip.folder('assets');
  if (!assetsFolder) {
    throw new Error('Could not create assets folder in ZIP archive.');
  }

  // 1. Resolve and write all frame assets into `assets/`
  const totalShots = frames.length;

  for (let i = 0; i < totalShots; i++) {
    if (options.abortSignal?.aborted) {
      throw new Error('Production package export cancelled by user.');
    }

    const frame = frames[i];
    const slide = slides[i];
    const currentShotNum = i + 1;

    if (options.onProgress) {
      const pct = Math.round((i / (totalShots + 2)) * 80);
      options.onProgress({
        percent: pct,
        stage: `Packaging Shot ${currentShotNum} of ${totalShots} (SH${String(currentShotNum).padStart(3, '0')})...`,
        current: currentShotNum,
        total: totalShots
      });
    }

    const { blob, filename } = await resolveFrameAssetBlob(
      frame,
      slide,
      i,
      burnInTitles,
      targetWidth,
      targetHeight
    );

    const arrayBuffer = await blob.arrayBuffer();
    assetsFolder.file(filename, arrayBuffer);
  }

  // 2. Generate NLE Manifest JSON
  if (options.onProgress) {
    options.onProgress({
      percent: 82,
      stage: 'Generating Universal NLE JSON manifest...',
      current: totalShots,
      total: totalShots
    });
  }

  const manifestJson = generateNleManifestJson(options);
  zip.file('manifest.json', manifestJson);

  // 3. Generate Sequence XML & CMX 3600 EDL
  if (options.includeXmlEdl !== false) {
    if (options.onProgress) {
      options.onProgress({
        percent: 86,
        stage: 'Building Premiere & DaVinci XML conform sequences...',
        current: totalShots,
        total: totalShots
      });
    }

    const edl = generateCmx3600Edl(options);
    zip.file('sequence.edl', edl);

    const xml = generateProductionPackageXml(options, targetWidth, targetHeight);
    zip.file('sequence.xml', xml);
  }

  // 4. Generate README documentation
  const readme = generateReadmeNleImport(options);
  zip.file('README_NLE_IMPORT.md', readme);

  // 5. Compress and generate ZIP blob
  if (options.onProgress) {
    options.onProgress({
      percent: 90,
      stage: 'Compressing Production Package ZIP archive...',
      current: totalShots,
      total: totalShots
    });
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      if (options.onProgress) {
        const pct = 90 + Math.round((metadata.percent / 100) * 9);
        options.onProgress({
          percent: Math.min(99, pct),
          stage: `Compressing ZIP archive (${metadata.percent.toFixed(0)}%)...`,
          current: totalShots,
          total: totalShots
        });
      }
    }
  );

  const cleanProject = options.projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_') || 'UNTITLED';
  const timeStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = options.customFilename
    ? `${options.customFilename.replace(/\.zip$/i, '')}_ProductionPackage.zip`
    : `HANDFILM_${cleanProject}_ProductionPackage_${timeStr}.zip`;

  // Trigger client-side browser download
  const downloadUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 10000);

  if (options.onProgress) {
    options.onProgress({
      percent: 100,
      stage: 'Production Package successfully generated and downloaded!',
      current: totalShots,
      total: totalShots
    });
  }

  return filename;
}
