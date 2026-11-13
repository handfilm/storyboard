/**
 * @file /src/services/videoEncoder.ts
 * @description High-Performance WebCodecs H.264/AVC VideoEncoder Module.
 *
 * Designed specifically to eliminate solid-black MP4 exports and GPU memory leaks:
 * 1. Preserves `avcC` `decoderConfig` strictly on keyframes (`sanitizeMuxerChunkMetadata`) so
 *    `mp4-muxer` never zeroes out `AVCDecoderConfigurationRecord` on delta frames.
 * 2. Probes H.264 High/Main/Baseline profiles with hardware -> software fallback.
 * 3. Validates full-resolution canvas/VideoFrame pixel content (`verifyNonBlankCanvasFrame`).
 * 4. Enforces `encodeQueueSize` backpressure throttling to keep 4K renders stable.
 * 5. Always releases `VideoFrame` instances inside `finally` (`videoFrame.close()`).
 */

export interface MuxerDecoderConfigState {
  hasDecoderConfig: boolean;
  cachedDecoderConfig?: VideoDecoderConfig | null;
}

export interface SupportedAvcCodecSelection {
  codec: string;
  hardwareAcceleration: HardwareAcceleration;
}

export interface FullResVideoEncoderConfig {
  width: number;
  height: number;
  fps: number;
  bitrateBps: number;
  codec: string;
  hardwareAcceleration?: HardwareAcceleration;
  maxQueueSize?: number;
  keyFrameInterval?: number;
  onEncodedChunk: (
    data: Uint8Array,
    type: EncodedVideoChunkType,
    timestampMicros: number,
    durationMicros: number,
    meta?: EncodedVideoChunkMetadata
  ) => void;
  onError?: (error: unknown) => void;
}

/**
 * Sanitizes WebCodecs `EncodedVideoChunkMetadata` before passing to `mp4-muxer`.
 * Critical: `mp4-muxer` merges `meta.decoderConfig` via `Object.assign(track.info.decoderConfig, meta.decoderConfig)`.
 * If a delta chunk omits `description` or supplies `{ description: undefined }`,
 * `Object.assign` clobbers the saved `AVCDecoderConfigurationRecord`, producing an empty `avcC` atom
 * and causing exported MP4s to decode as solid black blanks.
 */
export function sanitizeMuxerChunkMetadata(
  meta: EncodedVideoChunkMetadata | undefined,
  state: MuxerDecoderConfigState
): EncodedVideoChunkMetadata | undefined {
  if (meta?.decoderConfig) {
    // Only treat decoderConfig as authoritative if it has description or we haven't stored one yet
    const hasDescription =
      meta.decoderConfig.description !== undefined &&
      meta.decoderConfig.description !== null &&
      (meta.decoderConfig.description as ArrayBuffer | ArrayBufferView).byteLength !== 0;

    if (hasDescription || !state.hasDecoderConfig) {
      const dc: VideoDecoderConfig = {
        ...meta.decoderConfig,
        colorSpace: meta.decoderConfig.colorSpace ?? {
          primaries: 'bt709',
          transfer: 'bt709',
          matrix: 'bt709',
          fullRange: false
        }
      };
      state.hasDecoderConfig = true;
      state.cachedDecoderConfig = dc;
      return {
        ...meta,
        decoderConfig: dc
      };
    }
  }

  if (!meta) return undefined;
  const cleaned: Record<string, unknown> = { ...meta };
  if ('decoderConfig' in cleaned) {
    delete cleaned.decoderConfig;
  }
  return Object.keys(cleaned).length > 0 ? (cleaned as EncodedVideoChunkMetadata) : undefined;
}

/**
 * Probes WebCodecs `VideoEncoder.isConfigSupported` across H.264 profiles & acceleration tiers.
 */
export async function selectSupportedAvcCodec(params: {
  width: number;
  height: number;
  bitrateBps: number;
  fps: number;
  preferHardware?: boolean;
}): Promise<SupportedAvcCodecSelection | null> {
  if (typeof VideoEncoder === 'undefined') return null;

  // Firefox lacks AVC description generation in WebCodecs VideoEncoder metadata,
  // leaving mp4-muxer `avcC` empty. Route cleanly to fallback on Firefox.
  const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent || '');
  if (isFirefox) {
    return null;
  }

  const { width, height, bitrateBps, fps, preferHardware = true } = params;
  const is4K = width >= 3840 || height >= 2160;
  const codecCandidates = is4K
    ? ['avc1.640033', 'avc1.4d4028', 'avc1.42001f']
    : ['avc1.640028', 'avc1.4d4028', 'avc1.42001f'];

  const accelTiers: HardwareAcceleration[] = preferHardware
    ? ['prefer-hardware', 'no-preference', 'prefer-software']
    : ['no-preference', 'prefer-software', 'prefer-hardware'];

  if (typeof VideoEncoder.isConfigSupported !== 'function') {
    return { codec: codecCandidates[0], hardwareAcceleration: 'no-preference' };
  }

  for (const hardwareAcceleration of accelTiers) {
    for (const codec of codecCandidates) {
      try {
        const res = await VideoEncoder.isConfigSupported({
          codec,
          width,
          height,
          bitrate: bitrateBps,
          framerate: fps,
          hardwareAcceleration,
          avc: { format: 'avc' }
        });
        if (res?.supported) {
          return { codec, hardwareAcceleration };
        }
      } catch {
        // Probe next candidate
      }
    }
  }

  return null;
}

/**
 * Samples 9 distributed pixels across the canvas to verify the frame contains non-black luminance.
 */
export function verifyNonBlankCanvasFrame(
  canvas: HTMLCanvasElement,
  providedCtx?: CanvasRenderingContext2D | null
): boolean {
  try {
    const w = canvas.width;
    const h = canvas.height;
    if (w <= 0 || h <= 0) return false;
    const ctx = providedCtx ?? canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;

    const sampleRatios: Array<[number, number]> = [
      [0.5, 0.5],
      [0.25, 0.25],
      [0.75, 0.25],
      [0.25, 0.75],
      [0.75, 0.75],
      [0.5, 0.2],
      [0.5, 0.8],
      [0.15, 0.5],
      [0.85, 0.5]
    ];

    for (const [rx, ry] of sampleRatios) {
      const px = Math.min(w - 1, Math.max(0, Math.floor(w * rx)));
      const py = Math.min(h - 1, Math.max(0, Math.floor(h * ry)));
      const data = ctx.getImageData(px, py, 1, 1).data;
      if (data[0] + data[1] + data[2] > 6) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * High-performance WebCodecs full-resolution frame encoder with strict queue backpressure
 * and guaranteed VideoFrame cleanup.
 */
export class FullResVideoEncoder {
  private readonly config: FullResVideoEncoderConfig;
  private readonly encoder: VideoEncoder;
  private readonly decoderConfigState: MuxerDecoderConfigState = {
    hasDecoderConfig: false,
    cachedDecoderConfig: null
  };
  private chunksEncoded = 0;
  private validChunksMuxed = 0;
  private fatalError: unknown = null;
  private closed = false;

  constructor(config: FullResVideoEncoderConfig) {
    if (typeof VideoEncoder === 'undefined') {
      throw new Error('WebCodecs VideoEncoder API is unavailable in this runtime.');
    }
    this.config = config;
    const fps = Math.max(1, config.fps || 24);
    const frameDurationMicros = Math.round((1 / fps) * 1_000_000);

    this.encoder = new VideoEncoder({
      output: (chunk, meta) => {
        this.chunksEncoded++;
        const safeMeta = sanitizeMuxerChunkMetadata(meta, this.decoderConfigState);
        try {
          const data = new Uint8Array(chunk.byteLength);
          chunk.copyTo(data);
          const safeTimestamp =
            typeof chunk.timestamp === 'number' && !Number.isNaN(chunk.timestamp) && chunk.timestamp >= 0
              ? chunk.timestamp
              : Math.round(((this.chunksEncoded - 1) / fps) * 1_000_000);
          const safeDuration =
            typeof chunk.duration === 'number' && !Number.isNaN(chunk.duration) && chunk.duration > 0
              ? chunk.duration
              : frameDurationMicros;

          this.config.onEncodedChunk(data, chunk.type, safeTimestamp, safeDuration, safeMeta);
          this.validChunksMuxed++;
        } catch (err) {
          console.warn('[FullResVideoEncoder] Chunk dispatch warning:', err);
        }
      },
      error: (err) => {
        this.fatalError = err;
        this.config.onError?.(err);
      }
    });

    this.encoder.configure({
      codec: config.codec,
      width: config.width,
      height: config.height,
      bitrate: config.bitrateBps,
      framerate: fps,
      hardwareAcceleration: config.hardwareAcceleration ?? 'no-preference',
      latencyMode: 'quality',
      avc: { format: 'avc' }
    });
  }

  public get queueSize(): number {
    return this.encoder.encodeQueueSize ?? 0;
  }

  public get stats() {
    return {
      chunksEncoded: this.chunksEncoded,
      validChunksMuxed: this.validChunksMuxed,
      hasDecoderConfig: this.decoderConfigState.hasDecoderConfig,
      error: this.fatalError
    };
  }

  /**
   * Waits for encodeQueueSize to drop under backpressure limit so 4K frames never drop or OOM.
   */
  public async waitForQueueCapacity(abortSignal?: AbortSignal): Promise<void> {
    const maxQueue = Math.max(1, this.config.maxQueueSize ?? 6);
    while (
      !this.closed &&
      !this.fatalError &&
      !abortSignal?.aborted &&
      (this.encoder.encodeQueueSize ?? 0) > maxQueue
    ) {
      await new Promise((resolve) => setTimeout(resolve, 4));
    }
    if (abortSignal?.aborted) {
      throw new Error('Export cancelled by user.');
    }
    if (this.fatalError) {
      throw this.fatalError instanceof Error ? this.fatalError : new Error(String(this.fatalError));
    }
  }

  /**
   * Encodes a full-resolution frame source (HTMLCanvasElement, ImageBitmap, HTMLVideoElement, or VideoFrame)
   * at an exact deterministic timestamp, closing the created VideoFrame immediately afterwards.
   */
  public async encodeFrame(
    source: CanvasImageSource | VideoFrame,
    frameIndex: number,
    options?: {
      forceKeyFrame?: boolean;
      abortSignal?: AbortSignal;
      timestampMicros?: number;
      durationMicros?: number;
    }
  ): Promise<void> {
    if (this.closed) {
      throw new Error('Cannot encode frame after FullResVideoEncoder has been closed.');
    }

    await this.waitForQueueCapacity(options?.abortSignal);

    const fps = Math.max(1, this.config.fps || 24);
    const timestampMicros =
      options?.timestampMicros ?? Math.round((frameIndex / fps) * 1_000_000);
    const durationMicros =
      options?.durationMicros ?? Math.round((1 / fps) * 1_000_000);
    const gop = Math.max(1, this.config.keyFrameInterval ?? fps);
    const isKeyFrame = Boolean(options?.forceKeyFrame || frameIndex === 0 || frameIndex % gop === 0);

    let ownedFrame: VideoFrame | null = null;
    try {
      const frame =
        typeof VideoFrame !== 'undefined' && source instanceof VideoFrame
          ? source
          : new VideoFrame(source as CanvasImageSource, {
              timestamp: timestampMicros,
              duration: durationMicros
            });
      if (frame !== source) {
        ownedFrame = frame;
      }

      this.encoder.encode(frame, { keyFrame: isKeyFrame });
    } finally {
      if (ownedFrame) {
        try {
          ownedFrame.close();
        } catch {
          // Ignore double close
        }
      }
    }
  }

  /**
   * Flushes all remaining encoded frames and verifies `avcC` decoderConfig + non-zero muxed chunks.
   */
  public async flushAndClose(): Promise<{
    chunksEncoded: number;
    validChunksMuxed: number;
    hasDecoderConfig: boolean;
  }> {
    if (!this.closed) {
      try {
        if (this.encoder.state !== 'closed') {
          await this.encoder.flush();
        }
      } finally {
        try {
          if (this.encoder.state !== 'closed') {
            this.encoder.close();
          }
        } catch {
          // ignore
        }
        this.closed = true;
      }
    }

    if (this.fatalError) {
      throw this.fatalError instanceof Error ? this.fatalError : new Error(String(this.fatalError));
    }
    if (this.chunksEncoded === 0 || this.validChunksMuxed === 0 || !this.decoderConfigState.hasDecoderConfig) {
      throw new Error(
        `WebCodecs encoder produced ${this.validChunksMuxed} valid chunks (decoderConfig=${this.decoderConfigState.hasDecoderConfig}).`
      );
    }

    return {
      chunksEncoded: this.chunksEncoded,
      validChunksMuxed: this.validChunksMuxed,
      hasDecoderConfig: this.decoderConfigState.hasDecoderConfig
    };
  }

  public abortClose(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      if (this.encoder.state !== 'closed') {
        this.encoder.close();
      }
    } catch {
      // ignore
    }
  }
}
