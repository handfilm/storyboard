import test from 'node:test';
import assert from 'node:assert/strict';
import { kineticAdEngine } from '../services/kineticAdEngine';
import { colorGradingEngine } from '../services/colorGradingEngine';
import { voiceSubtitleService } from '../services/voiceSubtitleService';

test('kineticAdEngine: Chopper Rap Snapping word timeline calculation', () => {
  const lyrics = 'RAPID FIRE FLOW BENGALI BEAT';
  const durationSec = 5.0;

  // Test synthesizeTimedWords
  const timedWords = kineticAdEngine.synthesizeTimedWords(lyrics, durationSec);
  assert.equal(timedWords.length, 5);
  assert.equal(timedWords[0].word, 'RAPID');
  assert.equal(timedWords[4].word, 'BEAT');

  // Test computeKineticFrame at 0.5s for chopper_rap_snapping
  const caption = {
    text: lyrics,
    style: 'rap_pop' as const,
    words: timedWords
  };

  const frameAtStart = kineticAdEngine.computeKineticFrame(caption, 0.1, durationSec, 'chopper_rap_snapping');
  assert.equal(frameAtStart.preset, 'chopper_rap_snapping');
  assert.equal(frameAtStart.activeWordIndex, 0);
  assert.ok(frameAtStart.words[0].isActive);
  assert.ok(frameAtStart.words[0].scale >= 1.05, 'Active word should scale pop to >= 1.05x');
  assert.equal(frameAtStart.words[1].opacity, 0.35, 'Inactive word should dim to 35% opacity');

  // Later word check
  const frameAtEnd = kineticAdEngine.computeKineticFrame(caption, 4.8, durationSec, 'chopper_rap_snapping');
  assert.equal(frameAtEnd.activeWordIndex, 4);
  assert.ok(frameAtEnd.words[4].isActive);
});

test('kineticAdEngine: Commercial Ad Punch kinetic slam and chromatic decay', () => {
  const caption = {
    text: 'MEGA CINEMA',
    bengaliText: 'দৃষ্টি',
    style: 'bilingual_dual' as const
  };

  // At entry (t = 0.0s)
  const entryFrame = kineticAdEngine.computeKineticFrame(caption, 0.0, 4.0, 'commercial_ad_punch', 'দৃষ্টি', 'MEGA CINEMA');
  assert.ok(entryFrame.slamScale >= 1.35, 'Initial slam zoom should start at ~140%');
  assert.ok(entryFrame.chromaticShiftPx >= 2.5, 'Initial chromatic aberration should start at ~3px');

  // After 4 frames (~0.166s at 24fps), zoom settles to 1.0
  const midFrame = kineticAdEngine.computeKineticFrame(caption, 0.25, 4.0, 'commercial_ad_punch', 'দৃষ্টি', 'MEGA CINEMA');
  assert.equal(midFrame.slamScale, 1.0, 'Scale should settle to 1.0 after slam duration');

  // After 120ms chromatic aberration decays to 0
  assert.equal(midFrame.chromaticShiftPx, 0, 'Chromatic shift should decay to 0 within 120ms');

  // Bengali Unicode preserved
  assert.equal(midFrame.bengaliTitleText, 'দৃষ্টি');
  assert.equal(midFrame.subtext, 'MEGA CINEMA');
});

test('colorGradingEngine: .cube LUT parser and parameters', () => {
  const initialParams = colorGradingEngine.getParams();
  assert.ok(initialParams);
  assert.equal(typeof initialParams.exposure, 'number');
  assert.equal(typeof initialParams.contrast, 'number');
  assert.equal(typeof initialParams.filmGrain, 'number');
  assert.equal(typeof initialParams.halation, 'number');

  // Test standard .cube parser
  const sampleCube = `
# Sample 3D LUT
TITLE "Vintage Film"
LUT_3D_SIZE 2
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0
`;
  const parsed = colorGradingEngine.parseCubeString(sampleCube, 'Vintage Film.cube');
  assert.equal(parsed.size, 2);
  assert.equal(parsed.data.length, 2 * 2 * 2 * 4); // RGBA floats
  assert.equal(parsed.title, 'Vintage Film');
});

test('voiceSubtitleService: aligns Unicode phonetics and creates kinetic caption', () => {
  const transcript = 'গতি এবং ছন্দ দিয়ে সিনেমা তৈরি';
  const timedWords = voiceSubtitleService.alignUnicodePhonetics(transcript, 6.0);

  assert.ok(timedWords.length > 0);
  assert.equal(timedWords[0].word, 'গতি');
  assert.ok(timedWords[timedWords.length - 1].endSec <= 6.0);

  const caption = voiceSubtitleService.createKineticCaption(transcript, 6.0, 'rap_pop', 'গতি ছন্দ');
  assert.equal(caption.text, transcript);
  assert.equal(caption.bengaliText, 'গতি ছন্দ');
  assert.equal(caption.words?.length, timedWords.length);
});
