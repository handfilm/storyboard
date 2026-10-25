import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { 
  getSafeDurationSec, 
  calculateSafeTotalDuration, 
  getSafeShotAtIndex, 
  DEFAULT_SHOT_DURATION, 
  MIN_SHOT_DURATION,
  addShotToTimeline,
  appendClipToTimeline
} from './timelineState';
import { ECOSYSTEM_PROJECTS } from '../../components/menus/MegaEcosystemLauncher';

describe('Timeline State & DurationSec Safety Reducers', () => {
  test('handles null or undefined shot without crashing and returns default', () => {
    assert.equal(getSafeDurationSec(null), DEFAULT_SHOT_DURATION);
    assert.equal(getSafeDurationSec(undefined), DEFAULT_SHOT_DURATION);
  });

  test('extracts valid durationSec correctly', () => {
    assert.equal(getSafeDurationSec({ durationSec: 15.5 }), 15.5);
    assert.equal(getSafeDurationSec({ durationSeconds: 8.0 }), 8.0);
    assert.equal(getSafeDurationSec({ slideHoldSec: 6.0 }), 6.0);
    assert.equal(getSafeDurationSec({ duration: 4.5 }), 4.5);
  });

  test('enforces minimum duration boundary', () => {
    assert.equal(getSafeDurationSec({ durationSec: -10 }), DEFAULT_SHOT_DURATION);
    assert.equal(getSafeDurationSec({ durationSec: 0.1 }), MIN_SHOT_DURATION);
  });

  test('calculateSafeTotalDuration sums safely with fallback', () => {
    assert.equal(calculateSafeTotalDuration(null), DEFAULT_SHOT_DURATION);
    assert.equal(calculateSafeTotalDuration([]), DEFAULT_SHOT_DURATION);
    assert.equal(calculateSafeTotalDuration([
      { durationSec: 2.0 },
      { durationSeconds: 3.0 },
      null,
      { slideHoldSec: 5.0 }
    ]), 2.0 + 3.0 + DEFAULT_SHOT_DURATION + 5.0);
  });

  test('getSafeShotAtIndex protects against out of bounds', () => {
    assert.equal(getSafeShotAtIndex(null, 5), undefined);
    assert.equal(getSafeShotAtIndex([], 0), undefined);
    const mockShots = [{ id: 1 }, { id: 2 }];
    assert.deepEqual(getSafeShotAtIndex(mockShots, 0), { id: 1 });
    assert.deepEqual(getSafeShotAtIndex(mockShots, 99), { id: 2 });
  });

  test('addShotToTimeline appends shot with valid duration and updates timeline', () => {
    const created = addShotToTimeline({
      durationSec: 5,
      type: 'ai_generated',
      thumbnail: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800',
      prompt: 'Cinematic hyper-lapse through rainy alley'
    });
    assert.ok(created);
    assert.equal(created.durationSeconds, 5);
    assert.equal(created.imageUrl, 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800');
    assert.ok(created.tags.includes('AI_GENERATED'));
  });
});

describe('Mega Ecosystem Launcher Registry', () => {
  test('contains all 5 required projects with multi-image arrays', () => {
    assert.equal(ECOSYSTEM_PROJECTS.length, 5);
    const ids = ECOSYSTEM_PROJECTS.map((p) => p.id);
    assert.deepEqual(ids, ['handfilm', 'rawx', 'arutemika', 'bloom', 'nexos']);

    for (const project of ECOSYSTEM_PROJECTS) {
      assert.ok(project.images.length >= 2, `${project.id} must contain multiple preview images for hover cycling`);
      for (const img of project.images) {
        assert.ok(img.startsWith('https://images.unsplash.com'), `${img} must be a valid unsplash URL`);
      }
      assert.ok(project.name.length > 0);
      assert.ok(project.tagline.length > 0);
      assert.ok(project.specs.length > 0);
      assert.ok(project.features.length > 0);
    }
  });
});
