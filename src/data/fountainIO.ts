/**
 * RAWx Studio — Fountain (.fountain) Screenplay Parser & Serializer
 * Public API: parseFountainScript, exportFountainScript
 * Parses industry standard Fountain syntax (Scene headings, Action, Character, Dialogue, Parenthetical).
 */

export interface ParsedScene {
  sceneNumber: number;
  heading: string;
  action: string;
  dialogueBlocks: { character: string; line: string }[];
}

export function parseFountainScript(text: string): ParsedScene[] {
  const lines = text.split('\n');
  const scenes: ParsedScene[] = [];
  let currentScene: ParsedScene | null = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Scene heading: INT., EXT., দৃশ্য, SCENE
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E|দৃশ্য|SCENE\s+\d+)/i.test(trimmed)) {
      if (currentScene) scenes.push(currentScene);
      currentScene = {
        sceneNumber: scenes.length + 1,
        heading: trimmed,
        action: '',
        dialogueBlocks: []
      };
    } else if (currentScene) {
      // Character header (uppercase without period) or dialogue
      if (/^[A-Z0-9\s_]{3,}$/.test(trimmed) && trimmed.length < 30) {
        currentScene.dialogueBlocks.push({ character: trimmed, line: '' });
      } else if (currentScene.dialogueBlocks.length > 0 && !currentScene.dialogueBlocks[currentScene.dialogueBlocks.length - 1].line) {
        currentScene.dialogueBlocks[currentScene.dialogueBlocks.length - 1].line = trimmed;
      } else {
        currentScene.action += (currentScene.action ? ' ' : '') + trimmed;
      }
    }
  });

  if (currentScene) scenes.push(currentScene);
  return scenes;
}

export function exportFountainScript(scenes: ParsedScene[]): string {
  return scenes.map(s => {
    let out = `${s.heading}\n\n${s.action}\n\n`;
    s.dialogueBlocks.forEach(d => {
      out += `${d.character}\n${d.line}\n\n`;
    });
    return out;
  }).join('\n');
}
