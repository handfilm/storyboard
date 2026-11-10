/**
 * @file /src/services/media/multiCamSyncEngine.test.ts
 * @description Unit tests for Multi-Cam Synchronization Engine, Procedural Feeds, and Live Angle Switching.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MultiCamSyncEngine } from '../multiCamSyncEngine';
import { ANGLE_CONFIGS } from './proceduralMultiCamFeeds';
import { MultiCamCutEvent, MultiCamGroup } from '../../types/multicam';
import { multiCamRenderPipeline } from '../multiCamRenderPipeline';

describe('MultiCam Synchronization Engine & Procedural Feeds', () => {
  it('ANGLE_CONFIGS contains at least 4 distinct cinema camera configs with unique frequencies and lens specs', () => {
    assert.strictEqual(ANGLE_CONFIGS.length >= 4, true);

    const ids = new Set(ANGLE_CONFIGS.map(a => a.id));
    assert.strictEqual(ids.size, ANGLE_CONFIGS.length, 'All angle IDs must be unique');

    // Verify distinct audio frequencies for cross-correlation
    const frequencies = new Set(ANGLE_CONFIGS.map(a => a.frequencyHz));
    assert.strictEqual(frequencies.size, ANGLE_CONFIGS.length, 'Each camera feed must have a distinct sound signature');

    // Verify labels
    assert.strictEqual(ANGLE_CONFIGS[0].label, 'CAM 01 (WIDE)');
    assert.strictEqual(ANGLE_CONFIGS[1].label, 'CAM 02 (MEDIUM)');
    assert.strictEqual(ANGLE_CONFIGS[2].label, 'CAM 03 (CLOSE)');
    assert.strictEqual(ANGLE_CONFIGS[3].label, 'CAM 04 (LOW ANG)');
  });

  it('Normalized Cross-Correlation computes zero lag when signals are aligned', () => {
    const syncEngine = new MultiCamSyncEngine();
    const sampleRate = 2000;
    const length = sampleRate * 5; // 5 seconds of envelope
    const ref = new Float32Array(length);
    const target = new Float32Array(length);

    // Create identical sinusoidal rhythmic bursts
    for (let i = 0; i < length; i++) {
      const val = Math.sin(i * 0.05) * Math.sin(i * 0.002);
      ref[i] = Math.max(0, val);
      target[i] = Math.max(0, val);
    }

    const result = syncEngine.computeLagOffset(ref, target, sampleRate, 2.0);
    assert.strictEqual(Math.abs(result.offsetMs) <= 5, true, `Expected near zero offset, got ${result.offsetMs}ms`);
    assert.strictEqual(result.confidence > 0.85, true, `Expected high confidence, got ${result.confidence}`);
  });

  it('getActiveAngleIndexAtTime correctly determines live angle across cuts', () => {
    const cuts: MultiCamCutEvent[] = [
      { id: 'cut-0', timeMs: 0, angleIndex: 0 },
      { id: 'cut-1', timeMs: 3000, angleIndex: 1 },
      { id: 'cut-2', timeMs: 6000, angleIndex: 2 },
      { id: 'cut-3', timeMs: 9000, angleIndex: 3 }
    ];

    assert.strictEqual(multiCamRenderPipeline.getActiveAngleIndexAtTime(cuts, 0), 0);
    assert.strictEqual(multiCamRenderPipeline.getActiveAngleIndexAtTime(cuts, 1500), 0);
    assert.strictEqual(multiCamRenderPipeline.getActiveAngleIndexAtTime(cuts, 3000), 1);
    assert.strictEqual(multiCamRenderPipeline.getActiveAngleIndexAtTime(cuts, 4500), 1);
    assert.strictEqual(multiCamRenderPipeline.getActiveAngleIndexAtTime(cuts, 6000), 2);
    assert.strictEqual(multiCamRenderPipeline.getActiveAngleIndexAtTime(cuts, 8999), 2);
    assert.strictEqual(multiCamRenderPipeline.getActiveAngleIndexAtTime(cuts, 9000), 3);
    assert.strictEqual(multiCamRenderPipeline.getActiveAngleIndexAtTime(cuts, 11500), 3);
  });

  it('sendMultiCamSequenceToMasterTimeline properly slices multi-cam cuts into master shots', () => {
    const testGroup: MultiCamGroup = {
      id: 'test-multicam',
      name: 'TEST LIVE SESSION',
      duration: 12.0,
      durationMs: 12000,
      masterAudioAngleIndex: 0,
      activeAngleIndex: 0,
      aspectRatio: '9:16',
      angles: ANGLE_CONFIGS.map(c => ({
        id: c.id,
        mediaId: c.mediaId,
        label: c.label,
        name: c.name,
        blobUrl: 'blob:http://localhost/test',
        aspectRatio: 9 / 16,
        syncOffsetMs: 0
      })),
      cutEvents: [
        { id: 'c0', timeMs: 0, angleIndex: 0 },
        { id: 'c1', timeMs: 3000, angleIndex: 1 },
        { id: 'c2', timeMs: 6500, angleIndex: 2 },
        { id: 'c3', timeMs: 9500, angleIndex: 3 }
      ]
    };

    const count = multiCamRenderPipeline.sendMultiCamSequenceToMasterTimeline(testGroup);
    assert.strictEqual(count, 4, 'Expected 4 sequenced shots from 4 cut events');
  });
});
