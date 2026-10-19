import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFountainScript, exportFountainScript } from './fountainIO.ts';

test('parseFountainScript correctly identifies scene headings and dialogue blocks', () => {
  const fountainSample = `
INT. CYBERPUNK DHAKA LAB - NIGHT

Neon amber light bathes the holographic timeline.

RAKIB
Initiate the singular optical aperture.

EXT. DHAKA SKYLINE - CONTINUOUS

Rain falls through volumetric light beams.
`;

  const scenes = parseFountainScript(fountainSample);
  assert.equal(scenes.length, 2);
  assert.equal(scenes[0].heading, 'INT. CYBERPUNK DHAKA LAB - NIGHT');
  assert.ok(scenes[0].action.includes('Neon amber light'));
  assert.equal(scenes[0].dialogueBlocks.length, 1);
  assert.equal(scenes[0].dialogueBlocks[0].character, 'RAKIB');
  assert.equal(scenes[0].dialogueBlocks[0].line, 'Initiate the singular optical aperture.');

  assert.equal(scenes[1].heading, 'EXT. DHAKA SKYLINE - CONTINUOUS');
  assert.ok(scenes[1].action.includes('Rain falls'));
});

test('parseFountainScript supports Bengali scene markers (দৃশ্য)', () => {
  const bengaliFountain = `
দৃশ্য ১: মহাজাগতিক শূন্যতা // INT. VOID - NIGHT
দৃষ্টি মেলে তাকায় এক অপলক পথিক।
`;

  const scenes = parseFountainScript(bengaliFountain);
  assert.equal(scenes.length, 1);
  assert.ok(scenes[0].heading.includes('দৃশ্য ১'));
});
