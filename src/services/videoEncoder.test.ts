import { test } from 'node:test';
import assert from 'node:assert';
import {
  FullResVideoEncoder,
  sanitizeMuxerChunkMetadata,
  selectSupportedAvcCodec,
  verifyNonBlankCanvasFrame,
  type MuxerDecoderConfigState
} from './videoEncoder';

test('sanitizeMuxerChunkMetadata injects bt709 colorSpace on keyframe and strips empty decoderConfig on delta chunks', () => {
  const avcC = new Uint8Array([1, 100, 0, 40, 255, 225, 0, 12]);
  const state: MuxerDecoderConfigState = {
    hasDecoderConfig: false,
    cachedDecoderConfig: null
  };

  const keyMeta = sanitizeMuxerChunkMetadata(
    {
      decoderConfig: {
        codec: 'avc1.640028',
        description: avcC
      }
    },
    state
  );

  assert.strictEqual(state.hasDecoderConfig, true);
  assert.ok(keyMeta?.decoderConfig?.description);
  assert.deepStrictEqual(keyMeta?.decoderConfig?.colorSpace, {
    primaries: 'bt709',
    transfer: 'bt709',
    matrix: 'bt709',
    fullRange: false
  });

  // Simulate delta chunk containing decoderConfig without description (which would wipe avcC in mp4-muxer)
  const deltaWithBlankDesc = sanitizeMuxerChunkMetadata(
    {
      decoderConfig: {
        codec: 'avc1.640028',
        description: new Uint8Array(0)
      }
    },
    state
  );
  assert.strictEqual(deltaWithBlankDesc, undefined);

  const deltaUndefinedDesc = sanitizeMuxerChunkMetadata(
    {
      decoderConfig: {
        codec: 'avc1.640028'
      },
      svc: { temporalLayerId: 0 }
    },
    state
  );
  assert.ok(deltaUndefinedDesc);
  assert.strictEqual('decoderConfig' in deltaUndefinedDesc, false);
  assert.deepStrictEqual(deltaUndefinedDesc.svc, { temporalLayerId: 0 });
});

test('verifyNonBlankCanvasFrame returns false for pure black canvas and true when non-black pixels exist', () => {
  const makeMockCanvas = (pixelSum: number) => {
    const r = Math.min(255, Math.floor(pixelSum / 3));
    const g = Math.min(255, Math.floor(pixelSum / 3));
    const b = Math.min(255, pixelSum - r - g);
    const mockCtx = {
      getImageData: () => ({
        data: new Uint8ClampedArray([r, g, b, 255])
      })
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      width: 1920,
      height: 1080,
      getContext: () => mockCtx
    } as unknown as HTMLCanvasElement;

    return { mockCanvas, mockCtx };
  };

  const black = makeMockCanvas(0);
  assert.strictEqual(verifyNonBlankCanvasFrame(black.mockCanvas, black.mockCtx), false);

  const lit = makeMockCanvas(24);
  assert.strictEqual(verifyNonBlankCanvasFrame(lit.mockCanvas, lit.mockCtx), true);

  const empty = { width: 0, height: 0 } as unknown as HTMLCanvasElement;
  assert.strictEqual(verifyNonBlankCanvasFrame(empty), false);
});

test('selectSupportedAvcCodec falls back across profiles and tiers and returns null on Firefox', async () => {
  const originalVideoEncoder = (globalThis as Record<string, unknown>).VideoEncoder;
  const originalNavigator = (globalThis as Record<string, unknown>).navigator;

  try {
    const probed: Array<{ codec: string; hardwareAcceleration?: string }> = [];
    (globalThis as Record<string, unknown>).VideoEncoder = {
      isConfigSupported: async (cfg: VideoEncoderConfig) => {
        probed.push({ codec: cfg.codec, hardwareAcceleration: cfg.hardwareAcceleration });
        return {
          supported: cfg.codec === 'avc1.4d4028' && cfg.hardwareAcceleration === 'prefer-software',
          config: cfg
        };
      }
    };
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 Chrome/130.0.0.0' },
      configurable: true
    });

    const selected = await selectSupportedAvcCodec({
      width: 3840,
      height: 2160,
      bitrateBps: 80_000_000,
      fps: 24,
      preferHardware: true
    });

    assert.deepStrictEqual(selected, {
      codec: 'avc1.4d4028',
      hardwareAcceleration: 'prefer-software'
    });
    assert.ok(probed.some((p) => p.codec === 'avc1.640033' && p.hardwareAcceleration === 'prefer-hardware'));

    // Firefox must return null so WebCodecs avoids empty avcC metadata bug
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 Firefox/131.0' },
      configurable: true
    });
    const ffSelected = await selectSupportedAvcCodec({
      width: 1920,
      height: 1080,
      bitrateBps: 28_000_000,
      fps: 24
    });
    assert.strictEqual(ffSelected, null);
  } finally {
    (globalThis as Record<string, unknown>).VideoEncoder = originalVideoEncoder;
    if (originalNavigator !== undefined) {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true
      });
    }
  }
});

test('FullResVideoEncoder enforces backpressure, closes VideoFrames in finally, and preserves avcC decoderConfig', async () => {
  const originalVideoEncoder = (globalThis as Record<string, unknown>).VideoEncoder;
  const originalVideoFrame = (globalThis as Record<string, unknown>).VideoFrame;

  try {
    let createdFrames = 0;
    let closedFrames = 0;
    const encodeCalls: Array<{ keyFrame: boolean; timestamp: number }> = [];
    const muxedChunks: Array<{
      type: EncodedVideoChunkType;
      timestamp: number;
      hasDecoderConfig: boolean;
    }> = [];

    class MockVideoFrame {
      public readonly timestamp: number;
      public readonly duration: number;
      constructor(_src: unknown, init: { timestamp: number; duration?: number }) {
        createdFrames++;
        this.timestamp = init.timestamp;
        this.duration = init.duration ?? 41667;
      }
      close() {
        closedFrames++;
      }
    }

    class MockVideoEncoder {
      public state: CodecState = 'unconfigured';
      public encodeQueueSize = 0;
      private readonly outputCb: EncodedVideoChunkOutputCallback;

      constructor(init: VideoEncoderInit) {
        this.outputCb = init.output;
      }

      configure() {
        this.state = 'configured';
      }

      encode(frame: MockVideoFrame, options?: { keyFrame?: boolean }) {
        encodeCalls.push({ keyFrame: Boolean(options?.keyFrame), timestamp: frame.timestamp });
        this.encodeQueueSize = 8; // trigger backpressure before next frame

        setTimeout(() => {
          this.encodeQueueSize = 0;
          const payload = new Uint8Array([0, 0, 0, 2, 101, 136]);
          const fakeChunk = {
            type: (options?.keyFrame ? 'key' : 'delta') as EncodedVideoChunkType,
            byteLength: payload.byteLength,
            timestamp: frame.timestamp,
            duration: frame.duration,
            copyTo: (dest: Uint8Array) => dest.set(payload)
          } as unknown as EncodedVideoChunk;

          this.outputCb(
            fakeChunk,
            options?.keyFrame
              ? {
                  decoderConfig: {
                    codec: 'avc1.640033',
                    description: new Uint8Array([1, 100, 0, 51])
                  }
                }
              : {}
          );
        }, 6);
      }

      async flush() {
        await new Promise((r) => setTimeout(r, 20));
      }

      close() {
        this.state = 'closed';
      }
    }

    (globalThis as Record<string, unknown>).VideoFrame = MockVideoFrame;
    (globalThis as Record<string, unknown>).VideoEncoder = MockVideoEncoder;

    const encoder = new FullResVideoEncoder({
      width: 3840,
      height: 1608,
      fps: 24,
      bitrateBps: 80_000_000,
      codec: 'avc1.640033',
      maxQueueSize: 4,
      keyFrameInterval: 2,
      onEncodedChunk: (_data, type, timestamp, _duration, meta) => {
        muxedChunks.push({
          type,
          timestamp,
          hasDecoderConfig: Boolean(meta?.decoderConfig?.description)
        });
      }
    });

    const fakeCanvas = {} as HTMLCanvasElement;
    await encoder.encodeFrame(fakeCanvas, 0);
    await encoder.encodeFrame(fakeCanvas, 1);
    await encoder.encodeFrame(fakeCanvas, 2);

    const summary = await encoder.flushAndClose();

    assert.strictEqual(createdFrames, 3);
    assert.strictEqual(closedFrames, 3, 'Every constructed VideoFrame must be closed immediately in finally');
    assert.strictEqual(encodeCalls.length, 3);
    assert.strictEqual(encodeCalls[0].keyFrame, true);
    assert.strictEqual(encodeCalls[1].keyFrame, false);
    assert.strictEqual(encodeCalls[2].keyFrame, true);

    assert.strictEqual(summary.chunksEncoded, 3);
    assert.strictEqual(summary.validChunksMuxed, 3);
    assert.strictEqual(summary.hasDecoderConfig, true);
    assert.strictEqual(muxedChunks[0].hasDecoderConfig, true);
    assert.strictEqual(muxedChunks[1].hasDecoderConfig, false);
  } finally {
    (globalThis as Record<string, unknown>).VideoEncoder = originalVideoEncoder;
    (globalThis as Record<string, unknown>).VideoFrame = originalVideoFrame;
  }
});
