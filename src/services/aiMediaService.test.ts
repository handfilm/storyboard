import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPromptFromShot,
  dataUrlToBlob,
  DIRECTOR_STYLE_CHIPS,
  FLOW_CAMERA_MOVEMENTS,
  IMAGE_ASPECT_RATIOS,
  resolveFlowProgressStage
} from './aiMediaService';
import { AnthologyFrame } from '../types/anthology';

test('buildPromptFromShot extracts bilingual titles, camera optics, and director notes', () => {
  const sampleFrame: AnthologyFrame = {
    id: 4,
    epNumber: '#004',
    title: 'NEON MONSOON OVERPASS',
    bengaliTitle: 'বৃষ্টিভেজা নিয়ন উড়ালপুল',
    tagline: 'Rain slices across molten amber headlights',
    directorNotes: 'Track slowly behind silhouetted courier',
    soundCue: '43Hz Sub',
    cameraSpec: {
      focalLength: '18mm Anamorphic',
      aperture: 'F/1.4',
      shutter: '1/48s',
      iso: 'ISO 800',
      sensor: 'ARRI LF',
      format: '2.39:1 Scope'
    },
    imageUrl: '',
    colorAccent: '#F59E0B',
    hoverStyle: 1,
    lutFilter: 'cinematic',
    aspectRatio: '2.39:1',
    adjustments: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      bloom: 10,
      grain: 8,
      motionBlur: 0,
      vignette: 10
    },
    slideHoldSec: 12,
    tags: ['TEST']
  };

  const prompt = buildPromptFromShot(sampleFrame, 3);
  assert.match(prompt, /Shot #04/);
  assert.match(prompt, /NEON MONSOON OVERPASS/);
  assert.match(prompt, /বৃষ্টিভেজা নিয়ন উড়ালপুল/);
  assert.match(prompt, /18mm Anamorphic/);
  assert.match(prompt, /F\/1\.4/);
  assert.match(prompt, /Track slowly behind silhouetted courier/);

  const fallbackPrompt = buildPromptFromShot(null, 0);
  assert.match(fallbackPrompt, /Shot #01/);
});

test('dataUrlToBlob converts base64 data URLs into exact binary Blobs', async () => {
  const pngPayload = Buffer.from('fake-png-bytes').toString('base64');
  const { blob, mimeType } = dataUrlToBlob(`data:image/png;base64,${pngPayload}`);
  assert.equal(mimeType, 'image/png');
  assert.equal(blob.type, 'image/png');
  const decoded = Buffer.from(await blob.arrayBuffer()).toString('utf8');
  assert.equal(decoded, 'fake-png-bytes');

  assert.throws(() => dataUrlToBlob('https://example.com/not-data.png'));
});

test('resolveFlowProgressStage steps cleanly through Veo / Flow telemetry stages', () => {
  assert.equal(resolveFlowProgressStage(2, 'queued').label, 'INITIALIZING FLOW');
  assert.equal(resolveFlowProgressStage(12, 'in_progress').label, 'DIFFUSING MOTION VECTORS');
  assert.equal(resolveFlowProgressStage(30, 'in_progress').label, 'RENDERING 24FPS MP4');
  assert.equal(resolveFlowProgressStage(40, 'completed').percent, 100);
});

test('Studio preset lists cover all required HandFilm optics and camera choreographies', () => {
  assert.equal(DIRECTOR_STYLE_CHIPS.length, 6);
  assert.ok(DIRECTOR_STYLE_CHIPS.some((c) => c.label === '2.39:1 Anamorphic Scope'));
  assert.ok(FLOW_CAMERA_MOVEMENTS.includes('Dolly Push-In'));
  assert.ok(FLOW_CAMERA_MOVEMENTS.includes('Bullet-Time Orbit'));
  assert.deepEqual(
    IMAGE_ASPECT_RATIOS.map((r) => r.value),
    ['21:9', '16:9', '9:16', '4:3', '1:1']
  );
});
