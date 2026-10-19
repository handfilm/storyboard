import type { AnthologyFrame, AnthologyProject, FrameAdjustments, LutPreset } from '../types/anthology.ts';

/**
 * Calculates slideshow interval in milliseconds from slider value (1 - 100)
 * 1 -> 12000ms (slow epic cinema pace)
 * 50 -> 3500ms (standard gallery pace)
 * 100 -> 600ms (high-speed shutter flick)
 */
export function calculateSlideshowInterval(speedSliderValue: number): number {
  const clamped = Math.max(1, Math.min(100, speedSliderValue));
  return Math.round(12000 - (clamped - 1) * (11400 / 99));
}

/**
 * Generates the CSS filter string corresponding to the LUT preset and user adjustments
 */
export function getLutFilterCSS(preset?: LutPreset, adj?: Partial<FrameAdjustments>): string {
  const safeAdj = { brightness: 100, contrast: 100, saturation: 100, ...adj };
  const b = (typeof safeAdj.brightness === 'number' && !isNaN(safeAdj.brightness) ? safeAdj.brightness : 100) / 100;
  const c = (typeof safeAdj.contrast === 'number' && !isNaN(safeAdj.contrast) ? safeAdj.contrast : 100) / 100;
  const s = (typeof safeAdj.saturation === 'number' && !isNaN(safeAdj.saturation) ? safeAdj.saturation : 100) / 100;

  switch (preset) {
    case 'noir':
      return `grayscale(1) contrast(${c * 1.3}) brightness(${b * 0.95})`;
    case 'golden':
      return `sepia(0.35) saturate(${s * 1.35}) contrast(${c * 1.15}) brightness(${b * 0.95}) hue-rotate(-12deg)`;
    case 'tungsten':
      return `sepia(0.2) saturate(${s * 1.1}) contrast(${c * 1.2}) brightness(${b * 0.9}) hue-rotate(15deg)`;
    case 'cyberpunk':
      return `saturate(${s * 1.6}) contrast(${c * 1.3}) hue-rotate(-25deg) brightness(${b * 0.9})`;
    case 'infrared':
      return `invert(0.15) hue-rotate(180deg) saturate(${s * 1.5}) contrast(${c * 1.3})`;
    case 'monolith':
      return `grayscale(0.85) contrast(${c * 1.4}) brightness(${b * 0.85})`;
    case 'matrix':
      return `sepia(0.5) hue-rotate(85deg) saturate(${s * 1.5}) contrast(${c * 1.25}) brightness(${b * 0.9})`;
    case 'raw':
      return `contrast(${c * 0.9}) saturate(${s * 0.9}) brightness(${b * 1.05})`;
    case 'cinematic':
    default:
      return `contrast(${c * 1.15}) saturate(${s * 1.1}) brightness(${b * 0.85}) sepia(0.15) hue-rotate(-5deg)`;
  }
}

/**
 * Filters frames by title, Bengali subtitle, episode number, tag, or camera spec
 */
export function filterFrames(frames: AnthologyFrame[], query: string, activeTag?: string): AnthologyFrame[] {
  if (!Array.isArray(frames)) return [];
  const q = (query || '').trim().toLowerCase();
  return frames.filter(frame => {
    if (!frame) return false;
    const tags = Array.isArray(frame.tags) ? frame.tags : [];
    const matchesTag = !activeTag || tags.includes(activeTag);
    if (!matchesTag) return false;
    if (!q) return true;

    const title = (frame.title || '').toLowerCase();
    const bengaliTitle = (frame.bengaliTitle || '').toLowerCase();
    const epNumber = (frame.epNumber || '').toLowerCase();
    const tagline = (frame.tagline || '').toLowerCase();
    const directorNotes = (frame.directorNotes || '').toLowerCase();
    const focalLength = (frame.cameraSpec?.focalLength || '').toLowerCase();

    return (
      title.includes(q) ||
      bengaliTitle.includes(q) ||
      epNumber.includes(q) ||
      tagline.includes(q) ||
      directorNotes.includes(q) ||
      focalLength.includes(q)
    );
  });
}

/**
 * Computes statistical health of the anthology project
 */
export function calculateAnthologyStats(frames: AnthologyFrame[]): {
  total: number;
  populated: number;
  percentComplete: number;
  uniqueTags: string[];
} {
  const total = frames.length;
  const populated = frames.filter(f => Boolean(f.imageUrl)).length;
  const percentComplete = total === 0 ? 0 : Math.round((populated / total) * 100);
  const tagSet = new Set<string>();
  frames.forEach(f => f.tags.forEach(t => tagSet.add(t)));

  return {
    total,
    populated,
    percentComplete,
    uniqueTags: Array.from(tagSet).sort()
  };
}

/**
 * Generates an ultra-clean, GitHub-ready README.md string
 * Complete with badges, project overview, camera specs, and shot index!
 */
export function generateProjectMarkdown(project: AnthologyProject): string {
  const populated = project.frames.filter(f => f.imageUrl).length;
  const percent = Math.round((populated / project.frames.length) * 100);

  let md = `# ${project.title}\n\n`;
  md += `> **Directorial Anthology Engine 100** | A cinematic vision by **${project.director}**\n\n`;
  md += `[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)\n`;
  md += `[![Frames](https://img.shields.io/badge/Anthology-100%20Frames-gold.svg)](#frames-index)\n`;
  md += `[![Completed](https://img.shields.io/badge/Production-${percent}%25%20Loaded-emerald.svg)](#overview)\n`;
  md += `[![Node](https://img.shields.io/badge/Archive-${project.nodeLocation}-crimson.svg)](#)\n\n`;

  md += `## Overview\n\n`;
  md += `**${project.title}** is a high-speed, 100-frame optical anthology exploring macro intimacy, cosmic singularity, and cinematic human emotion. Created with procedural optical shaders, multi-tier focal blur, and responsive HUD telemetry.\n\n`;
  md += `- **Director:** ${project.director}\n`;
  md += `- **Archive Node:** ${project.nodeLocation}\n`;
  md += `- **Native Aspect Ratio:** ${project.aspectRatio}\n`;
  md += `- **Populated Frames:** ${populated} / ${project.frames.length} (${percent}%)\n`;
  md += `- **Generated Date:** ${new Date().toISOString().split('T')[0]}\n\n`;

  md += `## Quick Start & Local Run\n\n`;
  md += `\`\`\`bash\n`;
  md += `# Clone this repository\n`;
  md += `git clone https://github.com/your-username/rawx-anthology-engine.git\n\n`;
  md += `# Enter repository directory\n`;
  md += `cd rawx-anthology-engine\n\n`;
  md += `# Install dependencies\n`;
  md += `npm install\n\n`;
  md += `# Launch the cinematic dev server\n`;
  md += `npm run dev\n`;
  md += `\`\`\`\n\n`;

  md += `## Master Shot List & Script Index (Top Selections)\n\n`;
  md += `| EP | English Title | Bengali Title | Focal / Aperture | Directorial Intent |\n`;
  md += `|---|---|---|---|---|\n`;

  project.frames.slice(0, 25).forEach(f => {
    md += `| \`${f.epNumber}\` | **${f.title}** | ${f.bengaliTitle} | ${f.cameraSpec.focalLength} (${f.cameraSpec.aperture}) | ${f.directorNotes.replace(/\|/g, '-')} |\n`;
  });

  if (project.frames.length > 25) {
    md += `| ... | *(See full anthology in application or export JSON)* | ... | ... | ... |\n`;
  }

  md += `\n## Keyboard Shortcuts\n\n`;
  md += `- \`Left\` / \`Right\` : Navigate frames\n`;
  md += `- \`Space\` : Toggle Autopilot Slideshow\n`;
  md += `- \`F\` : Toggle Fullscreen presentation\n`;
  md += `- \`G\` : Toggle 100-Frame Contact Sheet Grid\n`;
  md += `- \`M\` : Toggle Ambient Audio drone\n`;
  md += `- \`H\` : Toggle HUD Telemetry overlay\n\n`;

  md += `## License\n\n`;
  md += `Distributed under the Apache-2.0 License. See \`LICENSE\` for more information.\n`;

  return md;
}

/**
 * Generates CSV string for exporting full camera and shot specifications
 */
export function generateCSVExport(frames: AnthologyFrame[]): string {
  const headers = ["Episode", "Title", "Bengali Title", "Tagline", "Director Notes", "Focal Length", "Aperture", "Shutter", "ISO", "Sound Cue", "Has Image", "Tags"].map(h => `"${h}"`);
  const rows = frames.map(f => [
    `"${f.epNumber}"`,
    `"${f.title.replace(/"/g, '""')}"`,
    `"${f.bengaliTitle.replace(/"/g, '""')}"`,
    `"${f.tagline.replace(/"/g, '""')}"`,
    `"${f.directorNotes.replace(/"/g, '""')}"`,
    `"${f.cameraSpec.focalLength}"`,
    `"${f.cameraSpec.aperture}"`,
    `"${f.cameraSpec.shutter}"`,
    `"${f.cameraSpec.iso}"`,
    `"${f.soundCue.replace(/"/g, '""')}"`,
    f.imageUrl ? "YES" : "NO",
    `"${f.tags.join(', ')}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Generates JSON string of the complete project
 */
export function generateProjectJSON(project: AnthologyProject): string {
  return JSON.stringify(project, null, 2);
}
