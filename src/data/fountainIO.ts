/**
 * @file /src/data/fountainIO.ts
 * @description Bilingual Screenplay Parser for Fountain format with Bengali and English support.
 */

export interface DialogueBlock {
  character: string;
  line: string;
}

export interface ParsedScene {
  heading: string;
  body: string;
  action: string;
  dialogueBlocks: DialogueBlock[];
}

/**
 * Parses Fountain script into structured scene objects
 */
export function parseFountainScript(script: string): ParsedScene[] {
  if (!script || typeof script !== 'string') return [];

  // Scene heading matching pattern (INT., EXT., দৃশ্য)
  const sceneRegex = /(?:^|\n)(?:(দৃশ্য\s*\d+[^:\n]*|INT\.[^\n]+|EXT\.[^\n]+):?)/gi;
  const matches = Array.from(script.matchAll(sceneRegex));

  if (matches.length === 0) {
    const trimmed = script.trim();
    return [
      {
        heading: 'SCENE 01 // GENERAL',
        body: trimmed,
        action: trimmed,
        dialogueBlocks: []
      }
    ];
  }

  return matches.map((m, idx) => {
    const heading = m[1].trim();
    const startPos = m.index! + m[0].length;
    const nextMatch = matches[idx + 1];
    const endPos = nextMatch ? nextMatch.index! : script.length;
    const body = script.slice(startPos, endPos).trim();

    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
    const dialogueBlocks: DialogueBlock[] = [];

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      // Character cues are typically all uppercase words without punctuation
      if (/^[A-Z0-9\s_'-]{2,}$/.test(line) && !line.includes('.')) {
        dialogueBlocks.push({
          character: line,
          line: lines[i + 1]
        });
        i++; // skip next line as it is the speech line
      }
    }

    return {
      heading,
      body,
      action: body,
      dialogueBlocks
    };
  });
}

/**
 * Exports structured scene objects back into a Fountain screenplay format string
 */
export function exportFountainScript(scenes: ParsedScene[]): string {
  if (!scenes || scenes.length === 0) return '';
  return scenes.map(s => {
    let out = `${s.heading}\n\n${s.action || s.body || ''}\n`;
    if (s.dialogueBlocks && s.dialogueBlocks.length > 0) {
      for (const d of s.dialogueBlocks) {
        out += `\n${d.character}\n${d.line}\n`;
      }
    }
    return out;
  }).join('\n\n');
}

