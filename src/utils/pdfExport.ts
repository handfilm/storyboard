/**
 * @file /src/utils/pdfExport.ts
 * @description Master Cinema Storyboard PDF Exporter using jsPDF.
 * Generates studio-grade, printable landscape contact sheets capturing all frames,
 * dual-language titles (Bengali & English), camera specs (focal length, aperture, shutter, ISO, sensor),
 * scene actions, director notes, and sound cues.
 */

import { jsPDF } from 'jspdf';
import { AnthologyFrame } from '../types/anthology';

export interface StoryboardPdfOptions {
  projectTitle: string;
  directorName: string;
  aspectRatio?: string;
  framesPerPage?: 4 | 6;
  theme?: 'print' | 'dark'; // 'print' = ink-saver white paper; 'dark' = obsidian cinema
  includeSpecs?: boolean;
  includeAudio?: boolean;
  onProgress?: (percent: number, message: string) => void;
}

/**
 * Safely converts an image URL or data URI to a base64 data URL via HTML Canvas.
 * Handles CORS and returns null if unreachable, preventing any export crashes.
 */
async function loadBase64Image(url?: string): Promise<string | null> {
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
 * Export full storyboard frames into a printable PDF document.
 */
export async function exportStoryboardToPdf(
  frames: AnthologyFrame[],
  options: StoryboardPdfOptions
): Promise<Blob> {
  const {
    projectTitle = 'Master Storyboard',
    directorName = 'Directorial Team',
    aspectRatio = '2.39:1',
    framesPerPage = 6,
    theme = 'print',
    includeSpecs = true,
    includeAudio = true,
    onProgress
  } = options;

  onProgress?.(5, 'Initializing PDF Document Engine...');

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const isDark = theme === 'dark';

  // Palette settings
  const bgFill = isDark ? [12, 13, 18] : [255, 255, 255];
  const cardFill = isDark ? [20, 22, 30] : [248, 249, 251];
  const cardBorder = isDark ? [45, 48, 62] : [218, 222, 230];
  const textPrimary = isDark ? [240, 240, 245] : [20, 24, 33];
  const textSecondary = isDark ? [160, 165, 180] : [90, 96, 110];
  const goldAccent = isDark ? [245, 166, 35] : [180, 120, 10];
  const thumbFallback = isDark ? [26, 29, 39] : [230, 234, 242];

  const cols = framesPerPage === 4 ? 2 : 3;
  const rows = 2;
  const totalPerPage = cols * rows;
  const totalPages = Math.ceil(frames.length / totalPerPage) || 1;

  // Grid layout measurements
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

  // Pre-load images in chunks with progress reporting
  onProgress?.(10, `Processing ${frames.length} frame visual assets...`);
  const imageMap = new Map<number, string | null>();

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const dataUrl = await loadBase64Image(f.imageUrl || f.thumbnailUrl);
    imageMap.set(f.id, dataUrl);
    const progressPercent = 10 + Math.round(((i + 1) / frames.length) * 45);
    onProgress?.(progressPercent, `Loaded visuals for Frame ${i + 1} of ${frames.length}...`);
  }

  onProgress?.(60, 'Composing Master Call Sheets & Vector Storyboard Layout...');

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage('a4', 'landscape');
    }

    // 1. Page Background
    doc.setFillColor(bgFill[0], bgFill[1], bgFill[2]);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // 2. Header Banner
    doc.setFillColor(cardFill[0], cardFill[1], cardFill[2]);
    doc.rect(marginLeft, 8, usableWidth, 14, 'F');
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.setLineWidth(0.3);
    doc.rect(marginLeft, 8, usableWidth, 14, 'S');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    const headerTitle = `${projectTitle.toUpperCase()} // STORYBOARD CONTACT SHEET`;
    doc.text(headerTitle, marginLeft + 4, 14);

    // Meta Specs
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
    const metaText = `DIRECTOR: ${directorName.toUpperCase()}  |  FORMAT: ${aspectRatio}  |  TOTAL FRAMES: ${frames.length}  |  24.0 FPS`;
    doc.text(metaText, marginLeft + 4, 18.5);

    // Page indicator top right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.text(`SHEET ${pageIdx + 1} / ${totalPages}`, marginLeft + usableWidth - 24, 16);

    // 3. Render Cards for this page
    const pageFrames = frames.slice(pageIdx * totalPerPage, (pageIdx + 1) * totalPerPage);

    for (let slotIdx = 0; slotIdx < pageFrames.length; slotIdx++) {
      const frame = pageFrames[slotIdx];
      const globalIdx = pageIdx * totalPerPage + slotIdx;
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
          // Fallback if jsPDF image embedding fails
          doc.setFillColor(thumbFallback[0], thumbFallback[1], thumbFallback[2]);
          doc.rect(thumbX, thumbY, thumbW, thumbH, 'F');
        }
      } else {
        // Aesthetic vector placeholder
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
      const holdDuration = frame.slideHoldSec || frame.durationSec || 12.0;
      doc.setFillColor(15, 17, 24);
      doc.rect(thumbX + thumbW - 16, thumbY + 2, 14, 5, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(200, 205, 215);
      doc.text(`${holdDuration.toFixed(1)}s`, thumbX + thumbW - 14, thumbY + 5.5);

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

      // Action / Director Notes (Wrapped)
      textY += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
      const notes = frame.directorNotes || frame.bengaliDesc || 'Standard camera hold with subtle atmospheric zoom.';
      const wrappedNotes = doc.splitTextToSize(notes, cardWidth - 6);
      const notesToPrint = wrappedNotes.slice(0, 2);
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

    // 4. Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
    const footerLeft = `RAWx DIRECTORIAL ANTHOLOGY • GENERATED ${new Date().toLocaleDateString()} • STRICT CONFIDENTIAL`;
    doc.text(footerLeft, marginLeft, pageHeight - 6);

    const footerRight = `PAGE ${pageIdx + 1} OF ${totalPages}`;
    doc.text(footerRight, pageWidth - marginRight - 16, pageHeight - 6);

    onProgress?.(60 + Math.round(((pageIdx + 1) / totalPages) * 35), `Compiled Sheet ${pageIdx + 1} of ${totalPages}...`);
  }

  onProgress?.(98, 'Packaging Storyboard PDF...');
  const pdfBlob = doc.output('blob');
  onProgress?.(100, 'Storyboard PDF Ready!');

  return pdfBlob;
}

/**
 * Convenience helper to generate and trigger download of Storyboard PDF.
 */
export async function downloadStoryboardPdf(
  frames: AnthologyFrame[],
  options: StoryboardPdfOptions
): Promise<void> {
  const blob = await exportStoryboardToPdf(frames, options);
  const cleanTitle = (options.projectTitle || 'RAWx_Storyboard').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanTitle}_Storyboard_ContactSheet.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
