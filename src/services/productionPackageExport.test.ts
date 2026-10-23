import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSMPTETimecode,
  generateNleManifestJson,
  generateCmx3600Edl,
  generateProductionPackageXml,
  generateReadmeNleImport
} from './productionPackageExport';
import { AnthologyFrame } from '../types/anthology';
import { SlideDraft } from '../types/project';

const mockFrames: AnthologyFrame[] = [
  {
    id: 1,
    epNumber: 'EP01',
    title: 'STREET AMBIENCE',
    bengaliTitle: 'রাস্তার কোলাহল',
    tagline: '24.0 FPS RAW MASTER',
    directorNotes: 'Slow dolly in',
    soundCue: 'Ambient Sub Drone 43.6Hz',
    colorAccent: '#F5A623',
    hoverStyle: 1,
    lutFilter: 'golden',
    adjustments: { brightness: 100, contrast: 100, saturation: 100, bloom: 0, grain: 0, motionBlur: 0, vignette: 0 },
    tags: ['street', 'day'],
    imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1',
    aspectRatio: '2.39:1',
    cameraSpec: { focalLength: '35mm', aperture: 'T1.5', shutter: '1/48', iso: '800', sensor: 'Full Frame', format: 'Anamorphic' }
  },
  {
    id: 2,
    epNumber: 'EP02',
    title: 'MIDNIGHT NEON',
    bengaliTitle: 'মধ্যরাতের আলো',
    tagline: 'ANAMORPHIC FLARE',
    directorNotes: 'Static lock-off',
    soundCue: 'Neon Hum',
    colorAccent: '#38BDF8',
    hoverStyle: 2,
    lutFilter: 'noir',
    adjustments: { brightness: 100, contrast: 100, saturation: 100, bloom: 0, grain: 0, motionBlur: 0, vignette: 0 },
    tags: ['night', 'neon'],
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
    aspectRatio: '2.39:1',
    cameraSpec: { focalLength: '50mm', aperture: 'T1.3', shutter: '1/48', iso: '1600', sensor: 'Full Frame', format: 'Anamorphic' }
  }
];

const mockSlides: SlideDraft[] = [
  {
    id: 'slide_1',
    orderIndex: 0,
    duration: 12.0,
    titleEn: 'STREET AMBIENCE',
    titleBn: 'রাস্তার কোলাহল',
    tagline: '24.0 FPS RAW MASTER',
    directorNotes: 'Slow dolly in',
    remoteUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1',
    cameraSpec: {
      focalLength: '35mm',
      aperture: 'T1.5',
      iso: '800'
    }
  },
  {
    id: 'slide_2',
    orderIndex: 1,
    duration: 12.0,
    titleEn: 'MIDNIGHT NEON',
    titleBn: 'মধ্যরাতের আলো',
    tagline: 'ANAMORPHIC FLARE',
    directorNotes: 'Static lock-off',
    remoteUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
    cameraSpec: {
      focalLength: '50mm',
      aperture: 'T1.3',
      iso: '1600'
    }
  }
];

test('formatSMPTETimecode formats HH:MM:SS:FF accurately at 24fps', () => {
  assert.equal(formatSMPTETimecode(0, 24), '00:00:00:00');
  assert.equal(formatSMPTETimecode(24, 24), '00:00:01:00');
  assert.equal(formatSMPTETimecode(288, 24), '00:00:12:00');
  assert.equal(formatSMPTETimecode(289, 24), '00:00:12:01');
});

test('generateNleManifestJson produces structured, parseable JSON with all shot assets', () => {
  const jsonStr = generateNleManifestJson({
    projectTitle: 'DHAKA_NOIR',
    directorName: 'Rakib Himon',
    aspectRatio: '2.39:1',
    frames: mockFrames,
    slides: mockSlides,
    fps: 24
  });

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.manifestVersion, '1.0.0');
  assert.equal(parsed.project.title, 'DHAKA_NOIR');
  assert.equal(parsed.project.director, 'Rakib Himon');
  assert.equal(parsed.project.totalShots, 2);
  assert.equal(parsed.project.totalDurationSec, 24);
  assert.equal(parsed.assets.length, 2);
  assert.equal(parsed.assets[0].filename, 'shot_001.png');
  assert.equal(parsed.assets[1].filename, 'shot_002.png');
  assert.equal(parsed.timeline[0].titles.english, 'STREET AMBIENCE');
  assert.equal(parsed.timeline[0].titles.bengali, 'রাস্তার কোলাহল');
  assert.equal(parsed.timeline[1].titles.english, 'MIDNIGHT NEON');
});

test('generateCmx3600Edl generates valid CMX 3600 format with clip comments', () => {
  const edl = generateCmx3600Edl({
    projectTitle: 'DHAKA_NOIR',
    directorName: 'Rakib Himon',
    aspectRatio: '2.39:1',
    frames: mockFrames,
    slides: mockSlides,
    fps: 24
  });

  assert.ok(edl.includes('TITLE: DHAKA_NOIR'));
  assert.ok(edl.includes('FCM: NON-DROP FRAME'));
  assert.ok(edl.includes('001  AX       V     C        00:00:00:00 00:00:12:00 00:00:00:00 00:00:12:00'));
  assert.ok(edl.includes('* FROM CLIP NAME: assets/shot_001.png'));
  assert.ok(edl.includes('002  AX       V     C        00:00:00:00 00:00:12:00 00:00:12:00 00:00:24:00'));
  assert.ok(edl.includes('* FROM CLIP NAME: assets/shot_002.png'));
});

test('generateProductionPackageXml outputs FCP7 xmeml format referencing assets folder', () => {
  const xml = generateProductionPackageXml(
    {
      projectTitle: 'DHAKA_NOIR',
      directorName: 'Rakib Himon',
      aspectRatio: '2.39:1',
      frames: mockFrames,
      slides: mockSlides,
      fps: 24
    },
    1920,
    804
  );

  assert.ok(xml.includes('<!DOCTYPE xmeml>'));
  assert.ok(xml.includes('<xmeml version="5">'));
  assert.ok(xml.includes('<name>DHAKA_NOIR</name>'));
  assert.ok(xml.includes('assets/shot_001.png'));
  assert.ok(xml.includes('assets/shot_002.png'));
  assert.ok(xml.includes('<width>1920</width>'));
  assert.ok(xml.includes('<height>804</height>'));
});

test('generateReadmeNleImport includes Premiere, DaVinci and FCP import instructions', () => {
  const readme = generateReadmeNleImport({
    projectTitle: 'DHAKA_NOIR',
    directorName: 'Rakib Himon',
    aspectRatio: '2.39:1',
    frames: mockFrames,
    slides: mockSlides,
    fps: 24
  });

  assert.ok(readme.includes('DHAKA_NOIR — PRODUCTION PACKAGE'));
  assert.ok(readme.includes('ADOBE PREMIERE PRO'));
  assert.ok(readme.includes('DAVINCI RESOLVE'));
  assert.ok(readme.includes('FINAL CUT PRO'));
  assert.ok(readme.includes('manifest.json'));
});
