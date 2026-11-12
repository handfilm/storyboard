import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROCEDURAL_PALETTES,
  TYPOGRAPHY_ARCHITECTURES,
  KINETIC_OPTICAL_FX_LIST,
  getShotProceduralSpec,
  isLegacyMockupPhotoUrl
} from './proceduralCinemaEngine';
import { generateInitialFrames, samplePacks, localCinematicPlates } from './frames';

describe('100-Shot Procedural Cinema & Kinetic Title Engine', () => {
  it('defines all 10 atmospheric cinema background palettes, 10 typography architectures, and 10 optical FX treatments', () => {
    assert.equal(PROCEDURAL_PALETTES.length, 10);
    assert.equal(TYPOGRAPHY_ARCHITECTURES.length, 10);
    assert.equal(KINETIC_OPTICAL_FX_LIST.length, 10);

    const paletteIds = new Set(PROCEDURAL_PALETTES.map((p) => p.id));
    const archIds = new Set(TYPOGRAPHY_ARCHITECTURES.map((a) => a.id));
    const fxIds = new Set(KINETIC_OPTICAL_FX_LIST.map((f) => f.id));

    assert.equal(paletteIds.size, 10);
    assert.equal(archIds.size, 10);
    assert.equal(fxIds.size, 10);
  });

  it('produces 100 unique procedural palette + typography + FX combinations across shots #01..#100', () => {
    const comboKeys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const spec = getShotProceduralSpec(i);
      assert.equal(spec.paletteIndex, Math.floor(i / 10) % 10);
      assert.equal(spec.archIndex, i % 10);
      assert.equal(spec.fxIndex, (i * 3) % 10);
      comboKeys.add(`${spec.palette.id}::${spec.architecture.id}::${spec.opticalFx.id}`);
    }
    // Note: since gcd(3, 10) = 1, (paletteIndex, archIndex) alone guarantees 100 unique pairs
    assert.equal(comboKeys.size, 100);
  });

  it('generates 100 initial frames with ZERO mockup/external photos and complete Bangla/English procedural metadata', () => {
    const frames = generateInitialFrames();
    assert.equal(frames.length, 100);
    assert.equal(localCinematicPlates.length, 0);
    assert.equal(samplePacks.cosmicMacro.length, 0);
    assert.equal(samplePacks.cyberNoir.length, 0);
    assert.equal(samplePacks.liquidGold.length, 0);

    frames.forEach((frame, idx) => {
      assert.equal(frame.imageUrl, undefined, `Frame ${idx} must have no mockup imageUrl`);
      assert.equal(frame.thumbnailUrl, undefined, `Frame ${idx} must have no mockup thumbnailUrl`);
      assert.equal(frame.isVideo, false);
      assert.ok(frame.title.trim().length > 0, `Frame ${idx} must have an English title`);
      assert.ok((frame.bengaliTitle || '').trim().length > 0, `Frame ${idx} must have a Bangla title`);
      assert.ok(frame.proceduralPaletteId, `Frame ${idx} must specify proceduralPaletteId`);
      assert.ok(frame.typographyArchitecture, `Frame ${idx} must specify typographyArchitecture`);
      assert.ok(frame.opticalFxId, `Frame ${idx} must specify opticalFxId`);
    });
  });

  it('identifies legacy mockup photo URLs while preserving user-dropped blob/data media', () => {
    assert.equal(isLegacyMockupPhotoUrl('/assets/aistudio/01_5fdc96be.jpg'), true);
    assert.equal(isLegacyMockupPhotoUrl('https://images.unsplash.com/photo-123?w=800'), true);
    assert.equal(isLegacyMockupPhotoUrl('blob:https://example.com/12345'), false);
    assert.equal(isLegacyMockupPhotoUrl('data:image/png;base64,iVBOR'), false);
    assert.equal(isLegacyMockupPhotoUrl('data:video/mp4;base64,AAAA'), false);
    assert.equal(isLegacyMockupPhotoUrl(undefined), false);
    assert.equal(isLegacyMockupPhotoUrl(''), false);
  });
});
