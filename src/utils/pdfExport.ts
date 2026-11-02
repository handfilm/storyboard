/**
 * @file /src/utils/pdfExport.ts
 * @description Master Cinema Storyboard PDF Exporter using jsPDF.
 * Generates comprehensive, multi-page studio-grade production storyboards,
 * director presentation bibles, stacked call sheets, and contact sheet matrices.
 * Captures all frame visuals, dual-language titles (Bengali & English),
 * camera specs (focal length, aperture, shutter, ISO, sensor format, color LUT),
 * complete director blocking notes, spoken dialogue, and sound cues.
 */

import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { AnthologyFrame } from '../types/anthology';
import { getLutFilterCSS } from './engine';

export type StoryboardPdfLayout = 1 | 2 | 4 | 6;
export type StoryboardPdfTheme = 'print' | 'dark';

export interface StoryboardPdfOptions {
  projectTitle: string;
  directorName: string;
  subtitle?: string;
  aspectRatio?: string;
  framesPerPage?: StoryboardPdfLayout; // 1 = Director's Bible (1/page), 2 = Stacked (2/page), 4 = 4-up, 6 = 6-up
  theme?: StoryboardPdfTheme; // 'print' = ink-saver white paper; 'dark' = obsidian cinema
  includeCoverPage?: boolean;
  includeIndexPage?: boolean;
  includeSpecs?: boolean;
  includeAudio?: boolean;
  includeNotes?: boolean;
  includeBilingual?: boolean;
  logline?: string;
  colorSpace?: string;
  onProgress?: (percent: number, message: string) => void;
}

/**
 * Format raw seconds to SMPTE Timecode (HH:MM:SS:FF at specified target FPS)
 */
export function formatSmpteTimecode(seconds: number, fps: number = 24): string {
  const safeSec = Math.max(0, seconds);
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);
  const frames = Math.floor((safeSec % 1) * fps);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
}

/**
 * Safely converts an image URL or data URI to a base64 data URL via HTML Canvas.
 * Handles CORS and returns null if unreachable, preventing any export crashes.
 */
export async function loadBase64Image(url?: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 640;
        canvas.height = img.naturalHeight || 360;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      } catch (err) {
        console.warn('Canvas conversion failed for image, using vector placeholder', err);
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve(null);
    };
    // 4 second timeout fallback
    setTimeout(() => resolve(null), 4000);
    img.src = url;
  });
}

/**
 * Export full storyboard sequence into a multi-page PDF document.
 */
export async function exportStoryboardToPdf(
  frames: AnthologyFrame[],
  options: StoryboardPdfOptions
): Promise<Blob> {
  const {
    projectTitle = 'Master Storyboard',
    directorName = 'Directorial Team',
    subtitle = 'DIRECTORIAL ANTHOLOGY & PRODUCTION STORYBOARD BIBLE',
    aspectRatio = '2.39:1',
    framesPerPage = 1,
    theme = 'print',
    includeCoverPage = true,
    includeIndexPage = true,
    includeSpecs = true,
    includeAudio = true,
    includeNotes = true,
    includeBilingual = true,
    logline,
    colorSpace = 'ARRI LogC3 -> Kodak 2383 / Rec.709',
    onProgress
  } = options;

  onProgress?.(5, 'Initializing Multi-Page Storyboard Engine...');

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const isDark = theme === 'dark';

  // Palette settings
  const bgFill = isDark ? [11, 12, 16] : [255, 255, 255];
  const cardFill = isDark ? [18, 20, 28] : [250, 251, 253];
  const cardBorder = isDark ? [45, 48, 64] : [215, 220, 230];
  const headerFill = isDark ? [15, 17, 24] : [242, 244, 248];
  const textPrimary = isDark ? [245, 245, 250] : [18, 22, 30];
  const textSecondary = isDark ? [165, 170, 185] : [80, 86, 100];
  const textMuted = isDark ? [110, 115, 130] : [125, 132, 148];
  const goldAccent = isDark ? [245, 166, 35] : [180, 120, 10];
  const thumbFallback = isDark ? [24, 27, 38] : [235, 239, 246];
  const tagFill = isDark ? [28, 31, 44] : [236, 240, 246];
  const tagBorder = isDark ? [70, 75, 98] : [195, 202, 215];

  // Calculate cumulative shot timing
  let runningSec = 0;
  const shotTiming = frames.map((f) => {
    const dur = f.slideHoldSec || f.durationSec || 12.0;
    const start = runningSec;
    runningSec += dur;
    return { startSec: start, endSec: runningSec, durationSec: dur };
  });
  const totalRuntimeSec = runningSec;

  // Grid layout measurements for 4-up / 6-up
  const layout = framesPerPage;
  const shotsPerPage = layout;
  const totalShotPages = Math.ceil(frames.length / shotsPerPage) || 1;
  const totalDocumentPages =
    (includeCoverPage ? 1 : 0) +
    (includeIndexPage && frames.length >= 4 ? 1 : 0) +
    totalShotPages;

  let globalPageNumber = 1;

  // Helper to draw standardized page footer
  const drawPageFooter = (pageNo: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    const footerLeft = `RAWx DIRECTORIAL ANTHOLOGY • ${projectTitle.toUpperCase()} • STRICTLY CONFIDENTIAL`;
    doc.text(footerLeft, 14, pageHeight - 6);
    const footerRight = `PAGE ${pageNo} OF ${totalDocumentPages}`;
    doc.text(footerRight, pageWidth - 14, pageHeight - 6, { align: 'right' });
  };

  // Pre-load images in chunks with progress reporting
  onProgress?.(10, `Processing ${frames.length} storyboard visual plates...`);
  const imageMap = new Map<number, string | null>();

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const dataUrl = await loadBase64Image(f.imageUrl || f.thumbnailUrl);
    imageMap.set(f.id, dataUrl);
    const progressPercent = 10 + Math.round(((i + 1) / frames.length) * 40);
    onProgress?.(progressPercent, `Loaded visual asset for Frame ${i + 1} of ${frames.length}...`);
  }

  onProgress?.(55, 'Composing Master Storyboard Document Pages...');

  // =========================================================================
  // 1. EXECUTIVE TITLE SHEET / COVER PAGE
  // =========================================================================
  if (includeCoverPage) {
    // Fill background
    doc.setFillColor(bgFill[0], bgFill[1], bgFill[2]);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Outer framing double border
    doc.setDrawColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.setLineWidth(0.6);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');

    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.setLineWidth(0.25);
    doc.rect(13, 13, pageWidth - 26, pageHeight - 26, 'S');

    // Corner decorative brackets (Gold)
    const bracketSize = 8;
    const corners = [
      { x: 10, y: 10, dx: 1, dy: 1 },
      { x: pageWidth - 10, y: 10, dx: -1, dy: 1 },
      { x: 10, y: pageHeight - 10, dx: 1, dy: -1 },
      { x: pageWidth - 10, y: pageHeight - 10, dx: -1, dy: -1 }
    ];
    doc.setDrawColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.setLineWidth(1.2);
    corners.forEach((c) => {
      doc.line(c.x, c.y, c.x + c.dx * bracketSize, c.y);
      doc.line(c.x, c.y, c.x, c.y + c.dy * bracketSize);
    });

    // Top Studio Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.text('RAWx CINEMA ENGINE // MASTER PRODUCTION STORYBOARD BIBLE', pageWidth / 2, 25, {
      align: 'center'
    });

    // Decorative center rule
    doc.setDrawColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.setLineWidth(0.3);
    doc.line(40, 29, pageWidth - 40, 29);

    // Big Project Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
    const cleanProjectUpper = projectTitle.toUpperCase();
    doc.text(cleanProjectUpper, pageWidth / 2, 48, { align: 'center' });

    // Subtitle
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.text(subtitle.toUpperCase(), pageWidth / 2, 56, { align: 'center' });

    // Central Directorial Production Slate Box
    const slateX = 26;
    const slateY = 66;
    const slateW = pageWidth - 52;
    const slateH = 88;

    doc.setFillColor(cardFill[0], cardFill[1], cardFill[2]);
    doc.rect(slateX, slateY, slateW, slateH, 'F');
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.setLineWidth(0.35);
    doc.rect(slateX, slateY, slateW, slateH, 'S');

    // Slate header band
    doc.setFillColor(headerFill[0], headerFill[1], headerFill[2]);
    doc.rect(slateX, slateY, slateW, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.text('◆ PRODUCTION SPECIFICATION MATRIX & TIMECODE LEDGER', slateX + 6, slateY + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
    doc.text(`DOC REF: RAWX-STB-${Date.now().toString(36).toUpperCase()}`, slateX + slateW - 6, slateY + 6.5, { align: 'right' });

    // Grid of Metadata inside Slate
    const colW = slateW / 3;
    const metaRows = [
      [
        { label: 'DIRECTOR / SHOWRUNNER', val: directorName.toUpperCase() },
        { label: 'TARGET CINEMA FORMAT', val: `${aspectRatio} CINEMASCOPE` },
        { label: 'TOTAL STORYBOARD SHOTS', val: `${frames.length} FULLY TIMED SHOTS` }
      ],
      [
        { label: 'MASTER RUNTIME (SMPTE)', val: `${formatSmpteTimecode(totalRuntimeSec)} (${totalRuntimeSec.toFixed(1)}s)` },
        { label: 'CAMERA OPTICS PIPELINE', val: '35mm / 50mm / 85mm T1.5 CINE PRIMES' },
        { label: 'COLOR SPACE & LUT PROFILE', val: colorSpace }
      ],
      [
        { label: 'AUDIO LANDSCAPE / DSP', val: '43.6Hz CINEMATIC SUB-DRONE & DIALOGUE' },
        { label: 'MASTER CAPTURE CADENCE', val: '24.000 FPS ARRI RAW 14-BIT' },
        { label: 'DOCUMENT GENERATED', val: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }
      ]
    ];

    let rY = slateY + 18;
    metaRows.forEach((row) => {
      row.forEach((item, colIdx) => {
        const itemX = slateX + colIdx * colW + 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
        doc.text(item.label, itemX, rY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
        doc.text(item.val, itemX, rY + 4.5);
      });
      rY += 15;
    });

    // Synopsis / Directorial Logline block
    const synopsisY = slateY + slateH - 24;
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.setLineWidth(0.2);
    doc.line(slateX + 6, synopsisY, slateX + slateW - 6, synopsisY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.text('DIRECTORIAL LOGLINE & CONCEPT:', slateX + 6, synopsisY + 4.5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
    const cleanLogline = logline || `Cinematic visual narrative comprising ${frames.length} staged storyboard frames with multi-layer depth of field, anamorphic lighting, and synchronized audio directives.`;
    const wrappedLogline = doc.splitTextToSize(cleanLogline, slateW - 12);
    doc.text(wrappedLogline.slice(0, 2), slateX + 6, synopsisY + 9.5);

    // Bottom Confidentiality Ribbon
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.text('STRICTLY CONFIDENTIAL • FOR AUTHORIZED PRODUCTION & CREW USE ONLY • ALL RIGHTS RESERVED', pageWidth / 2, pageHeight - 16, {
      align: 'center'
    });

    drawPageFooter(globalPageNumber);
    globalPageNumber++;
  }

  // =========================================================================
  // 2. SCENE BREAKDOWN & INDEX TABLE PAGE (When >= 4 shots)
  // =========================================================================
  if (includeIndexPage && frames.length >= 4) {
    doc.addPage('a4', 'landscape');

    // Background
    doc.setFillColor(bgFill[0], bgFill[1], bgFill[2]);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header Bar
    doc.setFillColor(headerFill[0], headerFill[1], headerFill[2]);
    doc.rect(14, 10, pageWidth - 28, 12, 'F');
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.setLineWidth(0.3);
    doc.rect(14, 10, pageWidth - 28, 12, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.text(`${projectTitle.toUpperCase()} // COMPLETE SHOT INDEX & TIMECODE MATRIX`, 18, 17.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
    doc.text(`TOTAL SHOTS: ${frames.length}  |  TOTAL RUNTIME: ${formatSmpteTimecode(totalRuntimeSec)}`, pageWidth - 18, 17.5, { align: 'right' });

    // Table Header
    const tableTop = 26;
    const tableW = pageWidth - 28;
    const colsSpec = [
      { header: 'SHOT #', w: 18 },
      { header: 'TC IN -> OUT', w: 42 },
      { header: 'DUR', w: 16 },
      { header: 'SCENE TITLE & BENGALI SUB', w: 75 },
      { header: 'OPTICAL LENS / SPEC', w: 48 },
      { header: 'DIRECTOR BLOCKING / ACTION', w: tableW - 199 }
    ];

    doc.setFillColor(cardFill[0], cardFill[1], cardFill[2]);
    doc.rect(14, tableTop, tableW, 6.5, 'F');
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.setLineWidth(0.2);
    doc.rect(14, tableTop, tableW, 6.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    let currX = 16;
    colsSpec.forEach((c) => {
      doc.text(c.header, currX, tableTop + 4.5);
      currX += c.w;
    });

    // Rows (render up to 24 rows per index page)
    const rowH = 6.2;
    const maxRows = Math.min(24, frames.length);
    for (let r = 0; r < maxRows; r++) {
      const f = frames[r];
      const timing = shotTiming[r];
      const y = tableTop + 6.5 + r * rowH;

      // Alternating row background
      if (r % 2 === 1) {
        doc.setFillColor(cardFill[0], cardFill[1], cardFill[2]);
        doc.rect(14, y, tableW, rowH, 'F');
      }

      doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
      doc.setLineWidth(0.1);
      doc.line(14, y + rowH, 14 + tableW, y + rowH);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      doc.text(`SH${String(r + 1).padStart(3, '0')}`, 16, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
      const tcStr = `${formatSmpteTimecode(timing.startSec)} -> ${formatSmpteTimecode(timing.endSec)}`;
      doc.text(tcStr, 16 + 18, y + 4.2);

      doc.text(`${timing.durationSec.toFixed(1)}s`, 16 + 18 + 42, y + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
      const titleStr = `${f.title || `Shot ${r + 1}`}${f.bengaliTitle ? ` (${f.bengaliTitle})` : ''}`;
      const truncatedTitle = titleStr.length > 40 ? titleStr.slice(0, 38) + '…' : titleStr;
      doc.text(truncatedTitle, 16 + 18 + 42 + 16, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
      const lensStr = `${f.cameraSpec?.focalLength || '35mm'} | ${f.cameraSpec?.aperture || 'f/1.4'} | ${(f.lutFilter || 'cinematic').toUpperCase()}`;
      doc.text(lensStr, 16 + 18 + 42 + 16 + 75, y + 4.2);

      const actionNotes = f.directorNotes || f.tagline || 'Standard hold';
      const truncatedNotes = actionNotes.length > 45 ? actionNotes.slice(0, 43) + '…' : actionNotes;
      doc.text(truncatedNotes, 16 + 18 + 42 + 16 + 75 + 48, y + 4.2);
    }

    if (frames.length > 24) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(`[ Index abridged. Showing first 24 of ${frames.length} total sequence shots. Full details on individual storyboard pages below. ]`, 14, tableTop + 6.5 + maxRows * rowH + 4.5);
    }

    drawPageFooter(globalPageNumber);
    globalPageNumber++;
  }

  // =========================================================================
  // 3. STORYBOARD SEQUENCE SHEETS
  // =========================================================================
  onProgress?.(65, 'Rendering Storyboard Sequence Plates & Directorial Notes...');

  if (layout === 1) {
    // -----------------------------------------------------------------------
    // LAYOUT 1: DIRECTOR'S PRODUCTION BIBLE (1 Shot Per Page - Comprehensive)
    // -----------------------------------------------------------------------
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const timing = shotTiming[i];

      doc.addPage('a4', 'landscape');

      // Background
      doc.setFillColor(bgFill[0], bgFill[1], bgFill[2]);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Top Shot Header Bar
      const headerY = 10;
      const headerH = 12;
      doc.setFillColor(headerFill[0], headerFill[1], headerFill[2]);
      doc.rect(14, headerY, pageWidth - 28, headerH, 'F');
      doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
      doc.setLineWidth(0.3);
      doc.rect(14, headerY, pageWidth - 28, headerH, 'S');

      // Left Shot Pill
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      doc.text(`SHOT ${String(i + 1).padStart(3, '0')}`, 18, headerY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
      const epLabel = frame.epNumber ? `// ${frame.epNumber}` : `// SCENE ${Math.floor(i / 10) + 1}`;
      doc.text(epLabel, 40, headerY + 8);

      // Timecode Range in center
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
      const tcText = `SMPTE: ${formatSmpteTimecode(timing.startSec)} -> ${formatSmpteTimecode(timing.endSec)}`;
      doc.text(tcText, 85, headerY + 8);

      // Hold duration badge
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      doc.text(`${timing.durationSec.toFixed(1)}s HOLD (${Math.round(timing.durationSec * 24)} FRAMES @ 24fps)`, 175, headerY + 8);

      // Right Sheet Index
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
      doc.text(`SHOT ${i + 1} OF ${frames.length}`, pageWidth - 18, headerY + 8, { align: 'right' });

      // LEFT SIDE: Cinema Visual Viewport (w: 154mm, h: 172mm)
      const leftX = 14;
      const contentY = 26;
      const leftW = 154;

      // Cinema Viewport Frame Box (Letterbox style)
      const cinemaBoxH = 104;
      doc.setFillColor(isDark ? 5 : 240, isDark ? 6 : 242, isDark ? 8 : 246);
      doc.rect(leftX, contentY, leftW, cinemaBoxH, 'F');
      doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
      doc.setLineWidth(0.35);
      doc.rect(leftX, contentY, leftW, cinemaBoxH, 'S');

      // Embedded Visual
      const base64Data = imageMap.get(frame.id);
      const imgPad = 2;
      const imgW = leftW - imgPad * 2;
      const imgH = cinemaBoxH - imgPad * 2;

      if (base64Data) {
        try {
          doc.addImage(base64Data, 'JPEG', leftX + imgPad, contentY + imgPad, imgW, imgH, undefined, 'FAST');
        } catch {
          doc.setFillColor(thumbFallback[0], thumbFallback[1], thumbFallback[2]);
          doc.rect(leftX + imgPad, contentY + imgPad, imgW, imgH, 'F');
        }
      } else {
        doc.setFillColor(thumbFallback[0], thumbFallback[1], thumbFallback[2]);
        doc.rect(leftX + imgPad, contentY + imgPad, imgW, imgH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text(`[ RAW MASTER PLATE // SHOT ${String(i + 1).padStart(3, '0')} ]`, leftX + leftW / 2, contentY + cinemaBoxH / 2, { align: 'center' });
      }

      // Framing Guide Reticles
      doc.setDrawColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      doc.setLineWidth(0.4);
      const rLen = 5;
      // Top Left
      doc.line(leftX + 4, contentY + 4, leftX + 4 + rLen, contentY + 4);
      doc.line(leftX + 4, contentY + 4, leftX + 4, contentY + 4 + rLen);
      // Top Right
      doc.line(leftX + leftW - 4, contentY + 4, leftX + leftW - 4 - rLen, contentY + 4);
      doc.line(leftX + leftW - 4, contentY + 4, leftX + leftW - 4, contentY + 4 + rLen);
      // Bottom Left
      doc.line(leftX + 4, contentY + cinemaBoxH - 4, leftX + 4 + rLen, contentY + cinemaBoxH - 4);
      doc.line(leftX + 4, contentY + cinemaBoxH - 4, leftX + 4, contentY + cinemaBoxH - 4 - rLen);
      // Bottom Right
      doc.line(leftX + leftW - 4, contentY + cinemaBoxH - 4, leftX + leftW - 4 - rLen, contentY + cinemaBoxH - 4);
      doc.line(leftX + leftW - 4, contentY + cinemaBoxH - 4, leftX + leftW - 4, contentY + cinemaBoxH - 4 - rLen);

      // Shot Number Pill on Image (Bottom Left)
      doc.setFillColor(10, 11, 16);
      doc.rect(leftX + 6, contentY + cinemaBoxH - 10, 22, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(245, 166, 35);
      doc.text(`SHOT ${String(i + 1).padStart(3, '0')}`, leftX + 8, contentY + cinemaBoxH - 5.8);

      // Format & Aspect Stamp (Bottom Right)
      doc.setFillColor(10, 11, 16);
      doc.rect(leftX + leftW - 32, contentY + cinemaBoxH - 10, 26, 6, 'F');
      doc.setFont('courier', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(220, 225, 235);
      doc.text(`${aspectRatio} SCOPE`, leftX + leftW - 30, contentY + cinemaBoxH - 5.8);

      // Below Cinema Frame: Camera & Optical Matrix (y = 134mm, h = 42mm)
      const specBoxY = contentY + cinemaBoxH + 4;
      const specBoxH = 40;
      doc.setFillColor(cardFill[0], cardFill[1], cardFill[2]);
      doc.rect(leftX, specBoxY, leftW, specBoxH, 'F');
      doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
      doc.setLineWidth(0.3);
      doc.rect(leftX, specBoxY, leftW, specBoxH, 'S');

      // Sub-header for specs
      doc.setFillColor(headerFill[0], headerFill[1], headerFill[2]);
      doc.rect(leftX, specBoxY, leftW, 6.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      doc.text('CAMERA SPECIFICATIONS & OPTICAL RIG SLATE', leftX + 4, specBoxY + 4.5);

      // 4 Specs Quadrants
      const qW = leftW / 4;
      const specItems = [
        { label: 'FOCAL LENGTH', val: frame.cameraSpec?.focalLength || '35mm Cine Master' },
        { label: 'APERTURE (T-STOP)', val: frame.cameraSpec?.aperture || 'f/1.4 T1.5' },
        { label: 'SHUTTER & ISO', val: `${frame.cameraSpec?.shutter || '1/48s 180°'} | ISO ${frame.cameraSpec?.iso || '800'}` },
        { label: 'SENSOR FORMAT', val: frame.cameraSpec?.sensor || 'Full-Frame Cine' }
      ];

      specItems.forEach((sp, sIdx) => {
        const spX = leftX + sIdx * qW + 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
        doc.text(sp.label, spX, specBoxY + 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
        doc.text(sp.val, spX, specBoxY + 16.5);
      });

      // Optical adjustments line
      doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
      doc.setLineWidth(0.15);
      doc.line(leftX + 4, specBoxY + 22, leftX + leftW - 4, specBoxY + 22);

      const adj = frame.adjustments || { bloom: 30, grain: 15, contrast: 100, motionBlur: 50, vignette: 40 };
      const gradeStr = `LUT GRADE: ${(frame.lutFilter || 'cinematic').toUpperCase()}  |  BLOOM: ${adj.bloom ?? 30}%  |  GRAIN: ${adj.grain ?? 15}%  |  VIGNETTE: ${adj.vignette ?? 40}%  |  MOTION BLUR: ${adj.motionBlur ?? 50}%`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
      doc.text(gradeStr, leftX + 4, specBoxY + 27.5);

      const kineticStr = `KINETIC TRANSITION: ${(frame.titleAnimation || 'flare').toUpperCase()} (600ms Ease)  |  TIMING: ${timing.durationSec.toFixed(1)} SEC HOLD  |  ASPECT: ${frame.aspectRatio || aspectRatio}`;
      doc.text(kineticStr, leftX + 4, specBoxY + 33.5);

      // RIGHT SIDE: Directorial Dossier & Script (x = 172mm, w = 111mm, h = 148mm)
      const rightX = 172;
      const rightW = pageWidth - rightX - 14;
      const rightH = cinemaBoxH + specBoxH + 4;

      doc.setFillColor(cardFill[0], cardFill[1], cardFill[2]);
      doc.rect(rightX, contentY, rightW, rightH, 'F');
      doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
      doc.setLineWidth(0.35);
      doc.rect(rightX, contentY, rightW, rightH, 'S');

      // Right Header Band
      doc.setFillColor(headerFill[0], headerFill[1], headerFill[2]);
      doc.rect(rightX, contentY, rightW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      doc.text('DIRECTORIAL DOSSIER // SCENE BEAT & SCRIPT', rightX + 4, contentY + 5);

      let dy = contentY + 13;

      // English Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
      const rawTitle = (frame.title || `Scene Beat ${i + 1}`).toUpperCase();
      const wrappedTitle = doc.splitTextToSize(rawTitle, rightW - 8);
      doc.text(wrappedTitle.slice(0, 2), rightX + 4, dy);
      dy += wrappedTitle.length * 4.5 + 1;

      // Bengali Title Calligraphy
      if (includeBilingual && frame.bengaliTitle) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
        doc.text(frame.bengaliTitle, rightX + 4, dy);
        dy += 5;
      }

      // Tagline / Narrative Hook
      if (frame.tagline) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
        doc.text(`"${frame.tagline}"`, rightX + 4, dy);
        dy += 5;
      }

      // Divider
      doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
      doc.setLineWidth(0.2);
      doc.line(rightX + 4, dy, rightX + rightW - 4, dy);
      dy += 5;

      // Section: Director's Action Notes & Blocking (Complete, multi-line)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      doc.text('DIRECTOR\'S ACTION & BLOCKING NOTES:', rightX + 4, dy);
      dy += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
      const notes = frame.directorNotes || frame.bengaliDesc || 'Camera holds steady on primary subject with subtle anamorphic breathing. Lighting emphasizes rim separation against deep shadow.';
      const wrappedNotes = doc.splitTextToSize(notes, rightW - 8);
      const notesToPrint = wrappedNotes.slice(0, 9);
      doc.text(notesToPrint, rightX + 4, dy);
      dy += notesToPrint.length * 3.6 + 4;

      // Divider
      doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
      doc.setLineWidth(0.2);
      doc.line(rightX + 4, dy, rightX + rightW - 4, dy);
      dy += 4.5;

      // Section: Spoken Dialogue / Voiceover
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      doc.text('SPOKEN DIALOGUE / SUBTITLE CUE:', rightX + 4, dy);
      dy += 4;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
      const dialogueText = frame.caption?.text || frame.directorNotes || 'No spoken dialogue for this beat.';
      const wrappedDialogue = doc.splitTextToSize(`"${dialogueText}"`, rightW - 8);
      doc.text(wrappedDialogue.slice(0, 3), rightX + 4, dy);
      dy += wrappedDialogue.length * 3.4 + 4;

      // Divider
      doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
      doc.setLineWidth(0.2);
      doc.line(rightX + 4, dy, rightX + rightW - 4, dy);
      dy += 4.5;

      // Section: Sound Design & Musical Scrim
      if (includeAudio) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
        doc.text('SOUND DESIGN & AUDIO CUE:', rightX + 4, dy);
        dy += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
        const audioText = frame.soundCue || '43.6Hz deep drone harmonic bed with subtle stereo transient.';
        const wrappedAudio = doc.splitTextToSize(audioText, rightW - 8);
        doc.text(wrappedAudio.slice(0, 2), rightX + 4, dy);
        dy += wrappedAudio.length * 3.4 + 4;
      }

      // Sequence Tags at bottom
      const tagsY = contentY + rightH - 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      doc.text('TAGS:', rightX + 4, tagsY);

      const tagsList = frame.tags || ['Scene', '12s'];
      const tagsStr = tagsList.map((t) => `[ ${t} ]`).join('  ');
      doc.setFont('courier', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
      doc.text(tagsStr, rightX + 16, tagsY);

      drawPageFooter(globalPageNumber);
      globalPageNumber++;

      onProgress?.(65 + Math.round(((i + 1) / frames.length) * 30), `Generated Sheet for Shot ${i + 1} of ${frames.length}...`);
    }
  } else if (layout === 2) {
    // -----------------------------------------------------------------------
    // LAYOUT 2: STACKED STUDIO STORYBOARD (2 Shots Per Page - Balanced)
    // -----------------------------------------------------------------------
    const totalPagesLayout2 = Math.ceil(frames.length / 2);
    for (let pageIdx = 0; pageIdx < totalPagesLayout2; pageIdx++) {
      doc.addPage('a4', 'landscape');

      // Background
      doc.setFillColor(bgFill[0], bgFill[1], bgFill[2]);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Top Page Bar
      doc.setFillColor(headerFill[0], headerFill[1], headerFill[2]);
      doc.rect(14, 8, pageWidth - 28, 10, 'F');
      doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
      doc.setLineWidth(0.3);
      doc.rect(14, 8, pageWidth - 28, 10, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      doc.text(`${projectTitle.toUpperCase()} // DUAL-SHOT STORYBOARD CALL SHEET`, 18, 14.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
      doc.text(`DIRECTOR: ${directorName.toUpperCase()}  |  FORMAT: ${aspectRatio}  |  TOTAL SHOTS: ${frames.length}`, pageWidth - 18, 14.5, { align: 'right' });

      // 2 Stacked Cards
      const pageFrames = frames.slice(pageIdx * 2, pageIdx * 2 + 2);
      const cardH = 84;
      const cardYOffsets = [22, 110];

      for (let sIdx = 0; sIdx < pageFrames.length; sIdx++) {
        const frame = pageFrames[sIdx];
        const globalIdx = pageIdx * 2 + sIdx;
        const timing = shotTiming[globalIdx];
        const cardY = cardYOffsets[sIdx];
        const cardW = pageWidth - 28;

        // Card Container
        doc.setFillColor(cardFill[0], cardFill[1], cardFill[2]);
        doc.rect(14, cardY, cardW, cardH, 'F');
        doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
        doc.setLineWidth(0.3);
        doc.rect(14, cardY, cardW, cardH, 'S');

        // Thumbnail Viewport (Left)
        const thumbW = 108;
        const thumbH = cardH - 6;
        const thumbX = 17;
        const thumbY = cardY + 3;

        const base64Data = imageMap.get(frame.id);
        if (base64Data) {
          try {
            doc.addImage(base64Data, 'JPEG', thumbX, thumbY, thumbW, thumbH, undefined, 'FAST');
          } catch {
            doc.setFillColor(thumbFallback[0], thumbFallback[1], thumbFallback[2]);
            doc.rect(thumbX, thumbY, thumbW, thumbH, 'F');
          }
        } else {
          doc.setFillColor(thumbFallback[0], thumbFallback[1], thumbFallback[2]);
          doc.rect(thumbX, thumbY, thumbW, thumbH, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
          doc.text(`[ RAW PLATE // SHOT ${String(globalIdx + 1).padStart(3, '0')} ]`, thumbX + thumbW / 2, thumbY + thumbH / 2, { align: 'center' });
        }

        // Shot Badge on Thumbnail
        doc.setFillColor(10, 11, 16);
        doc.rect(thumbX + 3, thumbY + 3, 18, 5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(245, 166, 35);
        doc.text(`SHOT ${String(globalIdx + 1).padStart(3, '0')}`, thumbX + 4.5, thumbY + 6.8);

        // Duration Badge on Thumbnail
        doc.setFillColor(10, 11, 16);
        doc.rect(thumbX + thumbW - 16, thumbY + 3, 13, 5, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(220, 225, 235);
        doc.text(`${timing.durationSec.toFixed(1)}s`, thumbX + thumbW - 14.5, thumbY + 6.8);

        // Right Metadata Block (x = 130mm, w = cardW - 120mm)
        const metaX = 130;
        const metaW = cardW - (metaX - 14) - 4;
        let my = cardY + 7;

        // Headline
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
        const titleStr = (frame.title || `Scene Beat ${globalIdx + 1}`).toUpperCase();
        doc.text(titleStr, metaX, my);
        my += 4.5;

        // Bengali subtitle & Tagline
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
        const subStr = frame.bengaliTitle ? `${frame.bengaliTitle} • ${frame.tagline || ''}` : (frame.tagline || '');
        doc.text(subStr, metaX, my);
        my += 5;

        // Director Notes (multi-line)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
        doc.text('ACTION & BLOCKING NOTES:', metaX, my);
        my += 3.8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
        const notes = frame.directorNotes || frame.bengaliDesc || 'Standard camera hold with subtle atmospheric zoom.';
        const wrappedNotes = doc.splitTextToSize(notes, metaW);
        doc.text(wrappedNotes.slice(0, 4), metaX, my);
        my += wrappedNotes.slice(0, 4).length * 3.2 + 3;

        // Dialogue / Audio Cue
        if (frame.soundCue || frame.caption?.text) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6);
          doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
          doc.text('AUDIO / DIALOGUE:', metaX, my);

          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6);
          doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
          const cue = frame.soundCue || frame.caption?.text || '';
          doc.text(doc.splitTextToSize(`"${cue}"`, metaW - 25).slice(0, 2), metaX + 22, my);
          my += 6;
        }

        // Camera Specs Badge at bottom of card
        const specY = cardY + cardH - 10;
        doc.setFillColor(headerFill[0], headerFill[1], headerFill[2]);
        doc.rect(metaX, specY, metaW, 6.5, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
        const specsText = `LENS: ${frame.cameraSpec?.focalLength || '35mm'}  |  ${frame.cameraSpec?.aperture || 'f/1.4'}  |  ${frame.cameraSpec?.shutter || '1/48s'}  |  ISO ${frame.cameraSpec?.iso || '800'}  |  GRADE: ${(frame.lutFilter || 'cinematic').toUpperCase()}`;
        doc.text(specsText, metaX + 3, specY + 4.2);
      }

      drawPageFooter(globalPageNumber);
      globalPageNumber++;

      onProgress?.(65 + Math.round(((pageIdx + 1) / totalPagesLayout2) * 30), `Generated Sheet ${pageIdx + 1} of ${totalPagesLayout2}...`);
    }
  } else {
    // -----------------------------------------------------------------------
    // LAYOUT 4 & 6: MULTI-COLUMN CONTACT SHEET MATRIX (4-Up or 6-Up Grid)
    // -----------------------------------------------------------------------
    const cols = framesPerPage === 4 ? 2 : 3;
    const rows = 2;
    const totalPerPage = cols * rows;
    const totalPagesGrid = Math.ceil(frames.length / totalPerPage) || 1;

    const marginLeft = 14;
    const marginRight = 14;
    const marginTop = 26;
    const marginBottom = 12;
    const colGap = 8;
    const rowGap = 7;

    const usableWidth = pageWidth - marginLeft - marginRight;
    const usableHeight = pageHeight - marginTop - marginBottom;

    const cardWidth = (usableWidth - (cols - 1) * colGap) / cols;
    const cardHeight = (usableHeight - (rows - 1) * rowGap) / rows;
    const thumbHeight = framesPerPage === 4 ? 44 : 34;

    for (let pageIdx = 0; pageIdx < totalPagesGrid; pageIdx++) {
      doc.addPage('a4', 'landscape');

      // 1. Page Background
      doc.setFillColor(bgFill[0], bgFill[1], bgFill[2]);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // 2. Header Banner
      doc.setFillColor(headerFill[0], headerFill[1], headerFill[2]);
      doc.rect(marginLeft, 8, usableWidth, 14, 'F');
      doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
      doc.setLineWidth(0.3);
      doc.rect(marginLeft, 8, usableWidth, 14, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      const headerTitle = `${projectTitle.toUpperCase()} // STORYBOARD CONTACT SHEET (${cols * rows}-UP)`;
      doc.text(headerTitle, marginLeft + 4, 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
      const metaText = `DIRECTOR: ${directorName.toUpperCase()}  |  FORMAT: ${aspectRatio}  |  TOTAL SHOTS: ${frames.length}  |  24.0 FPS`;
      doc.text(metaText, marginLeft + 4, 18.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      doc.text(`SHEET ${pageIdx + 1} / ${totalPagesGrid}`, marginLeft + usableWidth - 24, 16);

      // 3. Render Cards for this page
      const pageFrames = frames.slice(pageIdx * totalPerPage, (pageIdx + 1) * totalPerPage);

      for (let slotIdx = 0; slotIdx < pageFrames.length; slotIdx++) {
        const frame = pageFrames[slotIdx];
        const globalIdx = pageIdx * totalPerPage + slotIdx;
        const timing = shotTiming[globalIdx];
        const c = slotIdx % cols;
        const r = Math.floor(slotIdx / cols);

        const x = marginLeft + c * (cardWidth + colGap);
        const y = marginTop + r * (cardHeight + rowGap);

        // Card Container Box
        doc.setFillColor(cardFill[0], cardFill[1], cardFill[2]);
        doc.rect(x, y, cardWidth, cardHeight, 'F');
        doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
        doc.setLineWidth(0.25);
        doc.rect(x, y, cardWidth, cardHeight, 'S');

        // Visual Thumbnail Box
        const thumbX = x + 2.5;
        const thumbY = y + 2.5;
        const thumbW = cardWidth - 5;
        const thumbH = thumbHeight;

        const base64Data = imageMap.get(frame.id);

        if (base64Data) {
          try {
            doc.addImage(base64Data, 'JPEG', thumbX, thumbY, thumbW, thumbH, undefined, 'FAST');
          } catch {
            doc.setFillColor(thumbFallback[0], thumbFallback[1], thumbFallback[2]);
            doc.rect(thumbX, thumbY, thumbW, thumbH, 'F');
          }
        } else {
          doc.setFillColor(thumbFallback[0], thumbFallback[1], thumbFallback[2]);
          doc.rect(thumbX, thumbY, thumbW, thumbH, 'F');
          doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
          doc.setLineWidth(0.2);
          doc.rect(thumbX, thumbY, thumbW, thumbH, 'S');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
          doc.text(`[ RAW PLATE // SHOT ${String(globalIdx + 1).padStart(3, '0')} ]`, thumbX + thumbW / 2, thumbY + thumbH / 2, { align: 'center' });
        }

        // Shot Number Pill Overlay on Thumbnail
        const shotLabel = `SH${String(globalIdx + 1).padStart(3, '0')}`;
        doc.setFillColor(15, 17, 24);
        doc.rect(thumbX + 2, thumbY + 2, 14, 5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(245, 166, 35);
        doc.text(shotLabel, thumbX + 3.5, thumbY + 5.5);

        // Timecode / Hold duration
        doc.setFillColor(15, 17, 24);
        doc.rect(thumbX + thumbW - 16, thumbY + 2, 14, 5, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(200, 205, 215);
        doc.text(`${timing.durationSec.toFixed(1)}s`, thumbX + thumbW - 14, thumbY + 5.5);

        // Metadata Area below thumbnail
        let textY = thumbY + thumbH + 4;

        // English Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
        const rawTitle = (frame.title || `Shot ${globalIdx + 1}`).toUpperCase();
        const truncatedTitle = rawTitle.length > 32 ? rawTitle.slice(0, 30) + '…' : rawTitle;
        doc.text(truncatedTitle, x + 3, textY);

        // Bengali / Subtitle Tagline
        textY += 3.5;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.5);
        doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
        const subLabel = frame.bengaliTitle ? `${frame.bengaliTitle} • ${frame.tagline || ''}` : (frame.tagline || 'Cinematic Sequence');
        const truncatedSub = subLabel.length > 40 ? subLabel.slice(0, 38) + '…' : subLabel;
        doc.text(truncatedSub, x + 3, textY);

        // Action / Director Notes (Wrapped, multi-line)
        textY += 3.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
        const notes = frame.directorNotes || frame.bengaliDesc || 'Standard camera hold with subtle atmospheric zoom.';
        const wrappedNotes = doc.splitTextToSize(notes, cardWidth - 6);
        const notesToPrint = wrappedNotes.slice(0, framesPerPage === 4 ? 4 : 2);
        doc.text(notesToPrint, x + 3, textY);

        // Camera Specs Badge Row
        if (includeSpecs && frame.cameraSpec) {
          const specBoxY = y + cardHeight - 7;
          doc.setFillColor(thumbFallback[0], thumbFallback[1], thumbFallback[2]);
          doc.rect(x + 2.5, specBoxY, cardWidth - 5, 4.5, 'F');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
          const specStr = `LENS: ${frame.cameraSpec.focalLength || '35mm'}  |  ${frame.cameraSpec.aperture || 'f/1.4'}  |  ${frame.cameraSpec.shutter || '1/48s'}  |  ISO ${frame.cameraSpec.iso || '800'}`;
          doc.text(specStr, x + 4, specBoxY + 3.2);
        }
      }

      drawPageFooter(globalPageNumber);
      globalPageNumber++;

      onProgress?.(65 + Math.round(((pageIdx + 1) / totalPagesGrid) * 30), `Compiled Sheet ${pageIdx + 1} of ${totalPagesGrid}...`);
    }
  }

  onProgress?.(98, 'Finalizing Multi-Page Storyboard Document PDF...');
  const pdfBlob = doc.output('blob');
  onProgress?.(100, 'Storyboard PDF Ready for Delivery!');

  return pdfBlob;
}

/**
 * Convenience helper to generate and trigger download of Multi-Page Storyboard PDF.
 */
export async function downloadStoryboardPdf(
  frames: AnthologyFrame[],
  options: StoryboardPdfOptions
): Promise<void> {
  const blob = await exportStoryboardToPdf(frames, options);
  const cleanTitle = (options.projectTitle || 'RAWx_Storyboard').replace(/[^a-zA-Z0-9_-]/g, '_');
  const layoutLabel =
    options.framesPerPage === 1
      ? 'Director_Bible'
      : options.framesPerPage === 2
      ? 'Dual_Shot'
      : `${options.framesPerPage || 4}Up`;
  const filename = `${cleanTitle}_Storyboard_${layoutLabel}.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Renders an individual storyboard frame at high resolution (1920x1080) on an offscreen canvas
 * with active LUT color grading applied, camera specs slate, and dual-language titles.
 */
export async function renderFrameToHiResCanvas(
  frame: AnthologyFrame,
  width: number = 1920,
  height: number = 1080,
  includeSlate: boolean = true
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Fill deep cinema background
  ctx.fillStyle = '#07070A';
  ctx.fillRect(0, 0, width, height);

  // 2. Draw media image if available
  if (frame.imageUrl) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          if (frame.lutFilter) {
            ctx.filter = getLutFilterCSS(frame.lutFilter, frame.adjustments);
          }
          const imgAspect = img.naturalWidth / img.naturalHeight;
          const targetAspect = width / height;
          let drawW = width;
          let drawH = height;
          let drawX = 0;
          let drawY = 0;

          if (imgAspect > targetAspect) {
            drawW = width;
            drawH = width / imgAspect;
            drawY = (height - drawH) / 2;
          } else {
            drawH = height;
            drawW = height * imgAspect;
            drawX = (width - drawW) / 2;
          }

          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          ctx.filter = 'none';
        } catch (err) {
          console.warn('Canvas filter error in HiRes render', err);
          ctx.filter = 'none';
          ctx.drawImage(img, 0, 0, width, height);
        }
        resolve();
      };
      img.onerror = () => resolve();
      setTimeout(resolve, 4000);
      img.src = frame.imageUrl!;
    });
  } else {
    ctx.fillStyle = '#101118';
    ctx.fillRect(40, 40, width - 80, height - 80);
    ctx.strokeStyle = '#27273A';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    ctx.fillStyle = '#44485C';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`[ RAW PLATE // ${frame.epNumber || 'SH001'} ]`, width / 2, height / 2);
    ctx.textAlign = 'left';
  }

  // 3. Render Slate / Framing Overlays if requested
  if (includeSlate) {
    const gradTop = ctx.createLinearGradient(0, 0, 0, 100);
    gradTop.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    gradTop.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradTop;
    ctx.fillRect(0, 0, width, 100);

    const gradBottom = ctx.createLinearGradient(0, height - 140, 0, height);
    gradBottom.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradBottom.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
    ctx.fillStyle = gradBottom;
    ctx.fillRect(0, height - 140, width, 140);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(28, 28, width - 56, height - 56);

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`◆ FILE_${(frame.epNumber || '001').replace('#', '')} // FORMAT: 2.39:1 CINEMA SCOPE`, 48, 56);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`RAWx STORYBOARD // 24.0 FPS ARRI RAW`, width - 48, 56);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px serif';
    const mainTitle = (frame.title || 'UNTITLED SHOT').toUpperCase();
    ctx.fillText(mainTitle, 48, height - 68);

    if (frame.bengaliTitle) {
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 22px serif';
      ctx.fillText(frame.bengaliTitle, 48, height - 38);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 16px monospace';
    const specsLine = `LENS: ${frame.cameraSpec?.focalLength || '35mm'} | ${frame.cameraSpec?.aperture || 'f/1.4'} | ${frame.cameraSpec?.shutter || '1/48s'} | ISO ${frame.cameraSpec?.iso || '800'}`;
    ctx.fillText(specsLine, width - 48, height - 68);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '13px monospace';
    const gradeLine = `GRADE: ${(frame.lutFilter || 'RAW').toUpperCase()} | DURATION: ${(frame.slideHoldSec || 12.0).toFixed(1)}s`;
    ctx.fillText(gradeLine, width - 48, height - 42);
    ctx.textAlign = 'left';
  }

  return canvas;
}

/**
 * Exports an individual storyboard frame as a standalone high-resolution JPEG file.
 */
export async function exportFrameAsJpeg(
  frame: AnthologyFrame,
  projectTitle: string = 'RAWx_Storyboard',
  includeSlate: boolean = true
): Promise<void> {
  const canvas = await renderFrameToHiResCanvas(frame, 1920, 1080, includeSlate);

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas to Blob conversion failed'));
        return;
      }

      const cleanProject = projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanEp = (frame.epNumber || 'SH001').replace(/[^a-zA-Z0-9_-]/g, '');
      const cleanTitle = (frame.title || 'Shot').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${cleanProject}_${cleanEp}_${cleanTitle}_HiRes.jpg`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      resolve();
    }, 'image/jpeg', 0.95);
  });
}

/**
 * Batch exports frames as individual high-resolution JPEG files bundled in a .zip archive.
 */
export async function exportFramesAsJpegZip(
  frames: AnthologyFrame[],
  projectTitle: string = 'RAWx_Storyboard',
  onProgress?: (percent: number, message: string) => void
): Promise<void> {
  if (!frames || frames.length === 0) return;

  onProgress?.(5, `Initializing High-Resolution JPEG Batch Export (${frames.length} frames)...`);

  const zip = new JSZip();
  const folder = zip.folder('HiRes_Storyboard_JPEGs');

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const canvas = await renderFrameToHiResCanvas(frame, 1920, 1080, true);

    const blob = await new Promise<Blob | null>((res) => {
      canvas.toBlob((b) => res(b), 'image/jpeg', 0.95);
    });

    if (blob && folder) {
      const cleanEp = (frame.epNumber || `SH${String(i + 1).padStart(3, '0')}`).replace(/[^a-zA-Z0-9_-]/g, '');
      const cleanTitle = (frame.title || `Frame_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
      folder.file(`${cleanEp}_${cleanTitle}_1080p.jpg`, blob);
    }

    const pct = 5 + Math.round(((i + 1) / frames.length) * 80);
    onProgress?.(pct, `Rendered Hi-Res JPEG for Frame ${i + 1} of ${frames.length}...`);
  }

  onProgress?.(90, 'Compressing High-Resolution JPEGs into ZIP bundle...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  const cleanProject = projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanProject}_Storyboard_HiRes_JPEGs.zip`;

  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);

  onProgress?.(100, 'All High-Resolution JPEGs Downloaded!');
}
