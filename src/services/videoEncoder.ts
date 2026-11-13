/**
 * @file /src/services/videoEncoder.ts
 * @description High-Performance WebCodecs H.264/AVC VideoEncoder Module.
 *
 * Pipeline guarantees & diagnostics:
 * 1. Preserves `avcC` `decoderConfig` strictly on keyframes (`sanitizeMuxerChunkMetadata`) so
 *    `mp4-muxer` never zeroes out `AVCDecoderConfigurationRecord` on delta frames.
 * 2. Probes `VideoEncoder.isTypeSupported` / `MediaRecorder.isTypeSupported` /
 *    `VideoEncoder.isConfigSupported` across H.264 profiles with hardware -> software fallback
 *    (`diagnoseWebCodecsOutputFormat`) and surfaces user alerts when hardware accel is unavailable.
 * 3. Validates full-resolution canvas/VideoFrame luminance (`inspectFrameLuminance` /
 *    `verifyNonBlankCanvasFrame`) to trace black frames before encoding.
 * 4. Enforces `encodeQueueSize` backpressure throttling and tracks submitted vs encoded chunks to
 *    trace any dropped frames across the pipeline.
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

export type EncoderTraceLevel = 'info' | 'warn' | 'error';

export type EncoderTraceStage =
  | 'diagnostics'
  | 'configure'
  | 'black-frame'
  | 'backpressure'
  | 'encode'
  | 'output'
  | 'flush'
  | 'error';

export interface EncoderTraceEvent {
  timestampMs: number;
  level: EncoderTraceLevel;
  stage: EncoderTraceStage;
  frameIndex?: number;
  message: string;
  data?: Record<string, unknown>;
}

export interface WebCodecsProbeAttempt {
  codec: string;
  hardwareAcceleration: HardwareAcceleration;
  supported: boolean;
  reason?: string;
}

export interface WebCodecsFormatDiagnostic {
  requestedFormat: string;
  width: number;
  height: number;
  fps: number;
  bitrateBps: number;
  webCodecsAvailable: boolean;
  isTypeSupportedChecked: boolean;
  isTypeSupportedResult: boolean | null;
  mediaRecorderTypeSupported: boolean | null;
  isConfigSupportedAvailable: boolean;
  hardwareAvailable: boolean;
  usedHardwareFallback: boolean;
  selectedCodec: string | null;
  selectedAcceleration: HardwareAcceleration | null;
  fallbackEngine: 'webcodecs-hardware' | 'webcodecs-software' | 'mediarecorder' | 'none';
  userAlertMessage: string | null;
  probeAttempts: WebCodecsProbeAttempt[];
}

export interface EncoderPipelineDiagnostics {
  codec: string;
  hardwareAcceleration: HardwareAcceleration;
  width: number;
  height: number;
  fps: number;
  submittedFrames: number;
  chunksEncoded: number;
  keyframesEncoded: number;
  deltaFramesEncoded: number;
  validChunksMuxed: number;
  droppedFrames: number;
  blackFramesDetected: number;
  missingDecoderConfigKeyframes: number;
  backpressureStalls: number;
  maxQueueDepthObserved: number;
  totalBytesEncoded: number;
  hasDecoderConfig: boolean;
  fatalError: string | null;
  recentEvents: EncoderTraceEvent[];
}

export interface LuminanceInspectionResult {
  isNonBlank: boolean;
  width: number;
  height: number;
  maxRgbSum: number;
  sampleRgb: Array<[number, number, number]>;
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
  rejectBlackFrames?: boolean;
  onEncodedChunk: (
    data: Uint8Array,
    type: EncodedVideoChunkType,
    timestampMicros: number,
    durationMicros: number,
    meta?: EncodedVideoChunkMetadata
  ) => void;
  onTrace?: (event: EncoderTraceEvent) => void;
  onWarning?: (message: string, details?: Record<string, unknown>) => void;
  onError?: (error: unknown) => void;
}

function logTraceToConsole(event: EncoderTraceEvent): void {
  const prefix = `[VideoEncoder:${event.stage}]`;
  const frameTag = typeof event.frameIndex === 'number' ? ` [frame #${event.frameIndex}]` : '';
  const payload = event.data ? event.data : '';
  if (event.level === 'error') {
    console.error(`${prefix}${frameTag} ${event.message}`, payload);
  } else if (event.level === 'warn') {
    console.warn(`${prefix}${frameTag} ${event.message}`, payload);
  } else {
    console.info(`${prefix}${frameTag} ${event.message}`, payload);
  }
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
 * Evaluates WebCodecs `isTypeSupported` (when exposed) alongside `MediaRecorder.isTypeSupported`
 * and `VideoEncoder.isConfigSupported` across hardware and software tiers, generating diagnostic
 * details and a user-facing alert message whenever hardware acceleration is unavailable.
 */
export async function diagnoseWebCodecsOutputFormat(params: {
  width: number;
  height: number;
  bitrateBps: number;
  fps: number;
  desiredFormat?: 'mp4-avc' | 'webm-vp9';
  preferHardware?: boolean;
  onTrace?: (event: EncoderTraceEvent) => void;
  onWarning?: (message: string, diagnostic: WebCodecsFormatDiagnostic) => void;
}): Promise<WebCodecsFormatDiagnostic> {
  const {
    width,
    height,
    bitrateBps,
    fps,
    desiredFormat = 'mp4-avc',
    preferHardware = true,
    onTrace,
    onWarning
  } = params;

  const is4K = width >= 3840 || height >= 2160;
  const codecCandidates =
    desiredFormat === 'webm-vp9'
      ? ['vp09.00.10.08']
      : is4K
        ? ['avc1.640033', 'avc1.4d4028', 'avc1.42001f']
        : ['avc1.640028', 'avc1.4d4028', 'avc1.42001f'];

  const primaryCodec = codecCandidates[0];
  const containerMime =
    desiredFormat === 'webm-vp9'
      ? `video/webm;codecs=${primaryCodec}`
      : `video/mp4;codecs=${primaryCodec}`;

  const emitDiagTrace = (
    level: EncoderTraceLevel,
    message: string,
    data?: Record<string, unknown>
  ) => {
    const evt: EncoderTraceEvent = {
      timestampMs: Date.now(),
      level,
      stage: 'diagnostics',
      message,
      data
    };
    logTraceToConsole(evt);
    onTrace?.(evt);
  };

  const encoderStatic =
    typeof VideoEncoder !== 'undefined'
      ? (VideoEncoder as unknown as {
          isConfigSupported?: (config: VideoEncoderConfig) => Promise<VideoEncoderSupport>;
          isTypeSupported?: (type: string) => boolean | Promise<boolean>;
        })
      : null;

  let isTypeSupportedChecked = false;
  let isTypeSupportedResult: boolean | null = null;
  if (encoderStatic && typeof encoderStatic.isTypeSupported === 'function') {
    isTypeSupportedChecked = true;
    try {
      const res = await encoderStatic.isTypeSupported(containerMime);
      isTypeSupportedResult = Boolean(res);
      emitDiagTrace(
        isTypeSupportedResult ? 'info' : 'warn',
        `VideoEncoder.isTypeSupported("${containerMime}") -> ${isTypeSupportedResult}`,
        { containerMime, isTypeSupportedResult }
      );
    } catch (err) {
      isTypeSupportedResult = false;
      emitDiagTrace('warn', `VideoEncoder.isTypeSupported("${containerMime}") threw error`, {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  let mediaRecorderTypeSupported: boolean | null = null;
  if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
    try {
      mediaRecorderTypeSupported = Boolean(MediaRecorder.isTypeSupported(containerMime));
    } catch {
      mediaRecorderTypeSupported = false;
    }
  }

  const probeAttempts: WebCodecsProbeAttempt[] = [];
  const diagnostic: WebCodecsFormatDiagnostic = {
    requestedFormat: containerMime,
    width,
    height,
    fps,
    bitrateBps,
    webCodecsAvailable: Boolean(encoderStatic),
    isTypeSupportedChecked,
    isTypeSupportedResult,
    mediaRecorderTypeSupported,
    isConfigSupportedAvailable: Boolean(
      encoderStatic && typeof encoderStatic.isConfigSupported === 'function'
    ),
    hardwareAvailable: false,
    usedHardwareFallback: false,
    selectedCodec: null,
    selectedAcceleration: null,
    fallbackEngine: 'none',
    userAlertMessage: null,
    probeAttempts
  };

  if (!encoderStatic) {
    diagnostic.fallbackEngine = 'mediarecorder';
    diagnostic.usedHardwareFallback = true;
    diagnostic.userAlertMessage =
      `WebCodecs VideoEncoder is unavailable for ${width}×${height} (${primaryCodec}). Using MediaRecorder fallback stream.`;
    emitDiagTrace('warn', diagnostic.userAlertMessage, { diagnostic });
    onWarning?.(diagnostic.userAlertMessage, diagnostic);
    return diagnostic;
  }

  // Firefox lacks AVC description generation in WebCodecs VideoEncoder metadata,
  // leaving mp4-muxer `avcC` empty. Route cleanly to MediaRecorder fallback on Firefox.
  const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent || '');
  if (isFirefox && desiredFormat === 'mp4-avc') {
    diagnostic.fallbackEngine = 'mediarecorder';
    diagnostic.usedHardwareFallback = true;
    diagnostic.userAlertMessage =
      `Browser WebCodecs AVC lacks avcC descriptor support for ${width}×${height}. Switching to MediaRecorder fallback to prevent black video frames.`;
    emitDiagTrace('warn', diagnostic.userAlertMessage, { isFirefox });
    onWarning?.(diagnostic.userAlertMessage, diagnostic);
    return diagnostic;
  }

  if (isTypeSupportedChecked && isTypeSupportedResult === false) {
    diagnostic.fallbackEngine = 'mediarecorder';
    diagnostic.usedHardwareFallback = true;
    diagnostic.userAlertMessage =
      `WebCodecs isTypeSupported returned false for ${containerMime} at ${width}×${height}. Switching to MediaRecorder fallback.`;
    emitDiagTrace('warn', diagnostic.userAlertMessage, { containerMime });
    onWarning?.(diagnostic.userAlertMessage, diagnostic);
    return diagnostic;
  }

  if (typeof encoderStatic.isConfigSupported !== 'function') {
    diagnostic.selectedCodec = primaryCodec;
    diagnostic.selectedAcceleration = 'no-preference';
    diagnostic.fallbackEngine = 'webcodecs-software';
    diagnostic.usedHardwareFallback = true;
    diagnostic.userAlertMessage =
      `Hardware capability probing (isConfigSupported) is unavailable for ${width}×${height}; defaulting to standard WebCodecs encoding.`;
    emitDiagTrace('warn', diagnostic.userAlertMessage, { codec: primaryCodec });
    onWarning?.(diagnostic.userAlertMessage, diagnostic);
    return diagnostic;
  }

  const probeConfig = async (
    codec: string,
    hardwareAcceleration: HardwareAcceleration
  ): Promise<boolean> => {
    try {
      const cfg: VideoEncoderConfig = {
        codec,
        width,
        height,
        bitrate: bitrateBps,
        framerate: fps,
        hardwareAcceleration,
        ...(desiredFormat === 'mp4-avc' ? { avc: { format: 'avc' as const } } : {})
      };
      const res = await encoderStatic.isConfigSupported!(cfg);
      const supported = Boolean(res?.supported);
      probeAttempts.push({
        codec,
        hardwareAcceleration,
        supported,
        reason: supported ? 'supported' : 'unsupported-by-platform'
      });
      return supported;
    } catch (err) {
      probeAttempts.push({
        codec,
        hardwareAcceleration,
        supported: false,
        reason: err instanceof Error ? err.message : String(err)
      });
      return false;
    }
  };

  // Step 1: Probe hardware acceleration explicitly when requested
  if (preferHardware) {
    for (const codec of codecCandidates) {
      if (await probeConfig(codec, 'prefer-hardware')) {
        diagnostic.hardwareAvailable = true;
        diagnostic.selectedCodec = codec;
        diagnostic.selectedAcceleration = 'prefer-hardware';
        diagnostic.fallbackEngine = 'webcodecs-hardware';
        emitDiagTrace(
          'info',
          `Hardware WebCodecs encoder verified for ${codec} at ${width}×${height}@${fps}fps.`,
          { codec, hardwareAcceleration: 'prefer-hardware', bitrateBps }
        );
        return diagnostic;
      }
    }

    emitDiagTrace(
      'warn',
      `Hardware acceleration unavailable for ${width}×${height} (${codecCandidates.join(', ')}). Probing software WebCodecs fallback...`,
      { width, height, fps, bitrateBps }
    );
  }

  // Step 2: Fallback to no-preference & software WebCodecs encoders
  const fallbackTiers: HardwareAcceleration[] = preferHardware
    ? ['no-preference', 'prefer-software']
    : ['no-preference', 'prefer-software', 'prefer-hardware'];

  for (const accel of fallbackTiers) {
    for (const codec of codecCandidates) {
      if (await probeConfig(codec, accel)) {
        diagnostic.hardwareAvailable = accel === 'prefer-hardware';
        diagnostic.usedHardwareFallback = preferHardware && accel !== 'prefer-hardware';
        diagnostic.selectedCodec = codec;
        diagnostic.selectedAcceleration = accel;
        diagnostic.fallbackEngine =
          accel === 'prefer-hardware' ? 'webcodecs-hardware' : 'webcodecs-software';

        if (diagnostic.usedHardwareFallback) {
          diagnostic.userAlertMessage =
            `Hardware acceleration is unavailable for ${width}×${height} (${codec}). Falling back to software WebCodecs encoding; export may be slower.`;
          emitDiagTrace('warn', diagnostic.userAlertMessage, {
            selectedCodec: codec,
            selectedAcceleration: accel
          });
          onWarning?.(diagnostic.userAlertMessage, diagnostic);
        } else {
          emitDiagTrace('info', `WebCodecs encoder verified: ${codec} (${accel}).`);
        }
        return diagnostic;
      }
    }
  }

  // Step 3: Neither hardware nor software WebCodecs supported for this format
  diagnostic.fallbackEngine = 'mediarecorder';
  diagnostic.usedHardwareFallback = true;
  diagnostic.userAlertMessage =
    `WebCodecs hardware and software encoding unavailable for ${width}×${height} (${primaryCodec}). Falling back to MediaRecorder stream export.`;
  emitDiagTrace('error', diagnostic.userAlertMessage, { probeAttempts });
  onWarning?.(diagnostic.userAlertMessage, diagnostic);
  return diagnostic;
}

/**
 * Probes WebCodecs `VideoEncoder.isConfigSupported` (and `isTypeSupported` diagnostics)
 * across H.264 profiles & acceleration tiers.
 */
export async function selectSupportedAvcCodec(params: {
  width: number;
  height: number;
  bitrateBps: number;
  fps: number;
  preferHardware?: boolean;
  onTrace?: (event: EncoderTraceEvent) => void;
  onWarning?: (message: string, diagnostic: WebCodecsFormatDiagnostic) => void;
}): Promise<SupportedAvcCodecSelection | null> {
  const diag = await diagnoseWebCodecsOutputFormat({
    ...params,
    desiredFormat: 'mp4-avc'
  });

  if (!diag.selectedCodec || !diag.selectedAcceleration) {
    return null;
  }

  return {
    codec: diag.selectedCodec,
    hardwareAcceleration: diag.selectedAcceleration
  };
}

/**
 * Samples 9 distributed pixels across the canvas to verify the frame contains non-black luminance
 * and returns detailed RGB telemetry to pinpoint solid-black frame sources.
 */
export function inspectFrameLuminance(
  canvas: HTMLCanvasElement,
  providedCtx?: CanvasRenderingContext2D | null
): LuminanceInspectionResult {
  const w = canvas?.width ?? 0;
  const h = canvas?.height ?? 0;
  if (w <= 0 || h <= 0) {
    return { isNonBlank: false, width: w, height: h, maxRgbSum: 0, sampleRgb: [] };
  }

  try {
    const ctx = providedCtx ?? canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { isNonBlank: true, width: w, height: h, maxRgbSum: 0, sampleRgb: [] };
    }

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

    const sampleRgb: Array<[number, number, number]> = [];
    let maxRgbSum = 0;

    for (const [rx, ry] of sampleRatios) {
      const px = Math.min(w - 1, Math.max(0, Math.floor(w * rx)));
      const py = Math.min(h - 1, Math.max(0, Math.floor(h * ry)));
      const data = ctx.getImageData(px, py, 1, 1).data;
      const rgbSum = data[0] + data[1] + data[2];
      sampleRgb.push([data[0], data[1], data[2]]);
      if (rgbSum > maxRgbSum) {
        maxRgbSum = rgbSum;
      }
      if (rgbSum > 6) {
        return { isNonBlank: true, width: w, height: h, maxRgbSum, sampleRgb };
      }
    }

    return { isNonBlank: false, width: w, height: h, maxRgbSum, sampleRgb };
  } catch (err) {
    console.warn('[VideoEncoder:black-frame] Unable to inspect canvas pixels (assuming valid frame):', err);
    return { isNonBlank: true, width: w, height: h, maxRgbSum: 0, sampleRgb: [] };
  }
}

/**
 * Boolean convenience guard around `inspectFrameLuminance`.
 */
export function verifyNonBlankCanvasFrame(
  canvas: HTMLCanvasElement,
  providedCtx?: CanvasRenderingContext2D | null
): boolean {
  const inspection = inspectFrameLuminance(canvas, providedCtx);
  if (!inspection.isNonBlank) {
    console.warn(
      `[VideoEncoder:black-frame] Detected pure-black canvas (${inspection.width}×${inspection.height}, maxRGBSum=${inspection.maxRgbSum}).`,
      { samples: inspection.sampleRgb }
    );
  }
  return inspection.isNonBlank;
}

function getSourceDimensions(
  source: CanvasImageSource | VideoFrame
): { width: number; height: number; readyState?: number } {
  const s = source as unknown as Record<string, unknown>;
  if (typeof VideoFrame !== 'undefined' && source instanceof VideoFrame) {
    return {
      width: source.displayWidth || source.codedWidth || 0,
      height: source.displayHeight || source.codedHeight || 0
    };
  }
  if (typeof s.videoWidth === 'number' && typeof s.videoHeight === 'number') {
    return {
      width: s.videoWidth,
      height: s.videoHeight,
      readyState: typeof s.readyState === 'number' ? s.readyState : undefined
    };
  }
  return {
    width: typeof s.width === 'number' ? s.width : Number(s.naturalWidth || 0),
    height: typeof s.height === 'number' ? s.height : Number(s.naturalHeight || 0)
  };
}

/**
 * High-performance WebCodecs full-resolution frame encoder with strict queue backpressure,
 * frame-drop & black-frame tracing, and guaranteed VideoFrame cleanup.
 */
export class FullResVideoEncoder {
  private readonly config: FullResVideoEncoderConfig;
  private readonly encoder: VideoEncoder;
  private readonly decoderConfigState: MuxerDecoderConfigState = {
    hasDecoderConfig: false,
    cachedDecoderConfig: null
  };
  private readonly traceHistory: EncoderTraceEvent[] = [];

  private submittedFrames = 0;
  private chunksEncoded = 0;
  private keyframesEncoded = 0;
  private deltaFramesEncoded = 0;
  private validChunksMuxed = 0;
  private droppedFrames = 0;
  private blackFramesDetected = 0;
  private missingDecoderConfigKeyframes = 0;
  private backpressureStalls = 0;
  private maxQueueDepthObserved = 0;
  private totalBytesEncoded = 0;
  private fatalError: unknown = null;
  private closed = false;

  /**
   * Runs output format capability check (including `isTypeSupported` / `isConfigSupported`)
   * before constructing the encoder pipeline.
   */
  public static async diagnoseOutputFormat(params: {
    width: number;
    height: number;
    bitrateBps: number;
    fps: number;
    desiredFormat?: 'mp4-avc' | 'webm-vp9';
    preferHardware?: boolean;
    onTrace?: (event: EncoderTraceEvent) => void;
    onWarning?: (message: string, diagnostic: WebCodecsFormatDiagnostic) => void;
  }): Promise<WebCodecsFormatDiagnostic> {
    return await diagnoseWebCodecsOutputFormat(params);
  }

  constructor(config: FullResVideoEncoderConfig) {
    if (typeof VideoEncoder === 'undefined') {
      throw new Error('WebCodecs VideoEncoder API is unavailable in this runtime.');
    }
    this.config = config;
    const fps = Math.max(1, config.fps || 24);
    const frameDurationMicros = Math.round((1 / fps) * 1_000_000);

    try {
      this.encoder = new VideoEncoder({
        output: (chunk, meta) => {
          this.handleEncodedOutput(chunk, meta, fps, frameDurationMicros);
        },
        error: (err) => {
          const wrapped =
            err instanceof Error ? err : new Error(`WebCodecs VideoEncoder fatal error: ${String(err)}`);
          this.fatalError = wrapped;
          this.recordTrace('error', 'error', wrapped.message, undefined, {
            submittedFrames: this.submittedFrames,
            chunksEncoded: this.chunksEncoded,
            droppedFrames: this.droppedFrames
          });
          this.config.onError?.(wrapped);
        }
      });

      const encoderConfig: VideoEncoderConfig = {
        codec: config.codec,
        width: config.width,
        height: config.height,
        bitrate: config.bitrateBps,
        framerate: fps,
        hardwareAcceleration: config.hardwareAcceleration ?? 'no-preference',
        latencyMode: 'quality',
        avc: { format: 'avc' }
      };

      this.encoder.configure(encoderConfig);
      this.recordTrace(
        'info',
        'configure',
        `Configured VideoEncoder (${config.codec}, ${config.width}×${config.height} @ ${fps}fps, accel=${encoderConfig.hardwareAcceleration})`,
        undefined,
        { bitrateBps: config.bitrateBps, maxQueueSize: config.maxQueueSize ?? 6 }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.recordTrace('error', 'configure', `VideoEncoder configure() failed: ${msg}`);
      this.closed = true;
      throw new Error(`[FullResVideoEncoder] Failed to initialize/configure VideoEncoder: ${msg}`);
    }
  }

  private recordTrace(
    level: EncoderTraceLevel,
    stage: EncoderTraceStage,
    message: string,
    frameIndex?: number,
    data?: Record<string, unknown>
  ): void {
    const evt: EncoderTraceEvent = {
      timestampMs: Date.now(),
      level,
      stage,
      frameIndex,
      message,
      data
    };
    this.traceHistory.push(evt);
    if (this.traceHistory.length > 60) {
      this.traceHistory.shift();
    }
    logTraceToConsole(evt);
    this.config.onTrace?.(evt);
  }

  private emitWarning(message: string, details?: Record<string, unknown>): void {
    this.config.onWarning?.(message, details);
  }

  private handleEncodedOutput(
    chunk: EncodedVideoChunk,
    meta: EncodedVideoChunkMetadata | undefined,
    fps: number,
    frameDurationMicros: number
  ): void {
    if (!chunk || chunk.byteLength <= 0) {
      this.droppedFrames++;
      const msg = `Encoded chunk #${this.chunksEncoded} arrived with byteLength=0 (frame dropped by encoder).`;
      this.recordTrace('error', 'output', msg, this.chunksEncoded);
      this.emitWarning(msg, { chunksEncoded: this.chunksEncoded, droppedFrames: this.droppedFrames });
      return;
    }

    this.chunksEncoded++;
    if (chunk.type === 'key') {
      this.keyframesEncoded++;
    } else {
      this.deltaFramesEncoded++;
    }

    const hadDecoderConfigBefore = this.decoderConfigState.hasDecoderConfig;
    const safeMeta = sanitizeMuxerChunkMetadata(meta, this.decoderConfigState);

    if (chunk.type === 'key' && !this.decoderConfigState.hasDecoderConfig && !hadDecoderConfigBefore) {
      this.missingDecoderConfigKeyframes++;
      const warnMsg =
        `Keyframe chunk #${this.chunksEncoded} omitted avcC decoderConfig.description; downstream MP4 players may decode black video frames.`;
      this.recordTrace('error', 'output', warnMsg, this.chunksEncoded - 1);
      this.emitWarning(warnMsg, { chunkType: chunk.type, chunksEncoded: this.chunksEncoded });
    }

    try {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      this.totalBytesEncoded += data.byteLength;

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

      if (this.chunksEncoded === 1 || this.chunksEncoded % 120 === 0) {
        this.recordTrace(
          'info',
          'output',
          `Chunk telemetry checkpoint: ${this.chunksEncoded} chunks (${this.keyframesEncoded} keyframes, ${(this.totalBytesEncoded / 1024).toFixed(1)} KB muxed).`,
          this.chunksEncoded - 1,
          { queueSize: this.queueSize, hasDecoderConfig: this.decoderConfigState.hasDecoderConfig }
        );
      }
    } catch (err) {
      this.droppedFrames++;
      const errMsg = err instanceof Error ? err.message : String(err);
      this.recordTrace(
        'error',
        'output',
        `Chunk dispatch/mux callback failed for chunk #${this.chunksEncoded}: ${errMsg}`,
        this.chunksEncoded - 1
      );
    }
  }

  public get queueSize(): number {
    return this.encoder.encodeQueueSize ?? 0;
  }

  public get stats() {
    return {
      submittedFrames: this.submittedFrames,
      chunksEncoded: this.chunksEncoded,
      validChunksMuxed: this.validChunksMuxed,
      droppedFrames: this.droppedFrames,
      blackFramesDetected: this.blackFramesDetected,
      hasDecoderConfig: this.decoderConfigState.hasDecoderConfig,
      totalBytesEncoded: this.totalBytesEncoded,
      error: this.fatalError
    };
  }

  public getDiagnostics(): EncoderPipelineDiagnostics {
    return {
      codec: this.config.codec,
      hardwareAcceleration: this.config.hardwareAcceleration ?? 'no-preference',
      width: this.config.width,
      height: this.config.height,
      fps: Math.max(1, this.config.fps || 24),
      submittedFrames: this.submittedFrames,
      chunksEncoded: this.chunksEncoded,
      keyframesEncoded: this.keyframesEncoded,
      deltaFramesEncoded: this.deltaFramesEncoded,
      validChunksMuxed: this.validChunksMuxed,
      droppedFrames: this.droppedFrames,
      blackFramesDetected: this.blackFramesDetected,
      missingDecoderConfigKeyframes: this.missingDecoderConfigKeyframes,
      backpressureStalls: this.backpressureStalls,
      maxQueueDepthObserved: this.maxQueueDepthObserved,
      totalBytesEncoded: this.totalBytesEncoded,
      hasDecoderConfig: this.decoderConfigState.hasDecoderConfig,
      fatalError: this.fatalError
        ? this.fatalError instanceof Error
          ? this.fatalError.message
          : String(this.fatalError)
        : null,
      recentEvents: [...this.traceHistory]
    };
  }

  /**
   * Waits for encodeQueueSize to drop under backpressure limit so 4K frames never drop or OOM.
   */
  public async waitForQueueCapacity(abortSignal?: AbortSignal, frameIndex?: number): Promise<void> {
    const maxQueue = Math.max(1, this.config.maxQueueSize ?? 6);
    const currentDepth = this.encoder.encodeQueueSize ?? 0;
    if (currentDepth > this.maxQueueDepthObserved) {
      this.maxQueueDepthObserved = currentDepth;
    }

    let waitedMs = 0;
    let loggedStall = false;
    while (
      !this.closed &&
      !this.fatalError &&
      !abortSignal?.aborted &&
      (this.encoder.encodeQueueSize ?? 0) > maxQueue
    ) {
      if (!loggedStall) {
        this.backpressureStalls++;
        loggedStall = true;
      }
      await new Promise((resolve) => setTimeout(resolve, 4));
      waitedMs += 4;
      const depth = this.encoder.encodeQueueSize ?? 0;
      if (depth > this.maxQueueDepthObserved) {
        this.maxQueueDepthObserved = depth;
      }
      if (waitedMs === 2000) {
        this.recordTrace(
          'warn',
          'backpressure',
          `Encoder queue stall (>2000ms) waiting for encodeQueueSize=${depth} <= ${maxQueue}.`,
          frameIndex,
          { queueDepth: depth, maxQueue }
        );
      }
    }

    if (abortSignal?.aborted) {
      this.recordTrace('warn', 'error', 'Export cancelled by abortSignal during queue wait.', frameIndex);
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
      const msg = `Cannot encode frame #${frameIndex} after FullResVideoEncoder has been closed.`;
      this.recordTrace('error', 'encode', msg, frameIndex);
      throw new Error(msg);
    }
    if (this.fatalError) {
      throw this.fatalError instanceof Error ? this.fatalError : new Error(String(this.fatalError));
    }

    const sourceDims = getSourceDimensions(source);
    if (sourceDims.width <= 0 || sourceDims.height <= 0) {
      this.droppedFrames++;
      const msg = `Invalid zero-dimension source (${sourceDims.width}×${sourceDims.height}) at frame #${frameIndex}; frame dropped to prevent blank encode.`;
      this.recordTrace('error', 'encode', msg, frameIndex, sourceDims);
      this.emitWarning(msg, { frameIndex, ...sourceDims });
      throw new Error(msg);
    }
    if (typeof sourceDims.readyState === 'number' && sourceDims.readyState < 2) {
      this.droppedFrames++;
      const msg = `HTMLVideoElement source not ready (readyState=${sourceDims.readyState}) at frame #${frameIndex}; waitForSeek required before encode.`;
      this.recordTrace('error', 'encode', msg, frameIndex, sourceDims);
      this.emitWarning(msg, { frameIndex, ...sourceDims });
      throw new Error(msg);
    }

    await this.waitForQueueCapacity(options?.abortSignal, frameIndex);

    const fps = Math.max(1, this.config.fps || 24);
    const timestampMicros =
      options?.timestampMicros ?? Math.round((frameIndex / fps) * 1_000_000);
    const durationMicros =
      options?.durationMicros ?? Math.round((1 / fps) * 1_000_000);
    const gop = Math.max(1, this.config.keyFrameInterval ?? fps);
    const isKeyFrame = Boolean(options?.forceKeyFrame || frameIndex === 0 || frameIndex % gop === 0);

    // Pre-encode black-frame pipeline trace for HTMLCanvasElement sources
    if (
      source &&
      typeof (source as HTMLCanvasElement).getContext === 'function' &&
      typeof (source as HTMLCanvasElement).width === 'number'
    ) {
      const canvasSource = source as HTMLCanvasElement;
      const lum = inspectFrameLuminance(canvasSource);
      if (!lum.isNonBlank) {
        this.blackFramesDetected++;
        const warnMsg =
          `Black/blank frame detected before encode at frame #${frameIndex} (t=${timestampMicros}us, ${lum.width}×${lum.height}, maxRGB=${lum.maxRgbSum}).`;
        this.recordTrace('warn', 'black-frame', warnMsg, frameIndex, {
          timestampMicros,
          sampleRgb: lum.sampleRgb
        });
        this.emitWarning(warnMsg, { frameIndex, timestampMicros, maxRgbSum: lum.maxRgbSum });
        if (this.config.rejectBlackFrames) {
          this.droppedFrames++;
          throw new Error(warnMsg);
        }
      }
    }

    let ownedFrame: VideoFrame | null = null;
    try {
      let frame: VideoFrame;
      try {
        frame =
          typeof VideoFrame !== 'undefined' && source instanceof VideoFrame
            ? source
            : new VideoFrame(source as CanvasImageSource, {
                timestamp: timestampMicros,
                duration: durationMicros
              });
      } catch (vfErr) {
        this.droppedFrames++;
        const msg = `VideoFrame construction failed at frame #${frameIndex}: ${vfErr instanceof Error ? vfErr.message : String(vfErr)}`;
        this.recordTrace('error', 'encode', msg, frameIndex, { timestampMicros, durationMicros });
        throw new Error(msg);
      }

      if (frame !== source) {
        ownedFrame = frame;
      }

      try {
        this.encoder.encode(frame, { keyFrame: isKeyFrame });
        this.submittedFrames++;
      } catch (encErr) {
        this.droppedFrames++;
        const msg = `VideoEncoder.encode() rejected frame #${frameIndex} (keyFrame=${isKeyFrame}): ${encErr instanceof Error ? encErr.message : String(encErr)}`;
        this.recordTrace('error', 'encode', msg, frameIndex, { timestampMicros, isKeyFrame });
        throw new Error(msg);
      }
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
   * Flushes all remaining encoded frames and verifies `avcC` decoderConfig + frame integrity.
   */
  public async flushAndClose(): Promise<{
    submittedFrames: number;
    chunksEncoded: number;
    validChunksMuxed: number;
    droppedFrames: number;
    blackFramesDetected: number;
    totalBytesEncoded: number;
    hasDecoderConfig: boolean;
  }> {
    if (!this.closed) {
      try {
        if (this.encoder.state !== 'closed') {
          await this.encoder.flush();
        }
      } catch (flushErr) {
        const msg = `VideoEncoder.flush() failed: ${flushErr instanceof Error ? flushErr.message : String(flushErr)}`;
        this.recordTrace('error', 'flush', msg);
        if (!this.fatalError) {
          this.fatalError = flushErr;
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

    const unencodedGap = Math.max(0, this.submittedFrames - this.chunksEncoded);
    if (unencodedGap > 0) {
      this.droppedFrames = Math.max(this.droppedFrames, unencodedGap);
      const msg = `Pipeline frame drop detected during flush: submitted=${this.submittedFrames}, chunksEncoded=${this.chunksEncoded}, dropped=${this.droppedFrames}.`;
      this.recordTrace('error', 'flush', msg, undefined, {
        submittedFrames: this.submittedFrames,
        chunksEncoded: this.chunksEncoded,
        droppedFrames: this.droppedFrames
      });
      this.emitWarning(msg, {
        submittedFrames: this.submittedFrames,
        chunksEncoded: this.chunksEncoded,
        droppedFrames: this.droppedFrames
      });
    }

    this.recordTrace(
      this.droppedFrames > 0 || this.blackFramesDetected > 0 ? 'warn' : 'info',
      'flush',
      `Pipeline flush complete: submitted=${this.submittedFrames}, encoded=${this.chunksEncoded}, muxed=${this.validChunksMuxed}, dropped=${this.droppedFrames}, blackFrames=${this.blackFramesDetected}, hasDecoderConfig=${this.decoderConfigState.hasDecoderConfig}.`,
      undefined,
      { totalBytesEncoded: this.totalBytesEncoded, maxQueueDepthObserved: this.maxQueueDepthObserved }
    );

    if (this.fatalError) {
      throw this.fatalError instanceof Error ? this.fatalError : new Error(String(this.fatalError));
    }
    if (this.chunksEncoded === 0 || this.validChunksMuxed === 0 || !this.decoderConfigState.hasDecoderConfig) {
      throw new Error(
        `WebCodecs encoder produced ${this.validChunksMuxed} valid chunks (submitted=${this.submittedFrames}, dropped=${this.droppedFrames}, decoderConfig=${this.decoderConfigState.hasDecoderConfig}).`
      );
    }

    return {
      submittedFrames: this.submittedFrames,
      chunksEncoded: this.chunksEncoded,
      validChunksMuxed: this.validChunksMuxed,
      droppedFrames: this.droppedFrames,
      blackFramesDetected: this.blackFramesDetected,
      totalBytesEncoded: this.totalBytesEncoded,
      hasDecoderConfig: this.decoderConfigState.hasDecoderConfig
    };
  }

  public abortClose(): void {
    if (this.closed) return;
    this.closed = true;
    this.recordTrace('warn', 'flush', 'Encoder aborted and closed early.', undefined, {
      submittedFrames: this.submittedFrames,
      chunksEncoded: this.chunksEncoded
    });
    try {
      if (this.encoder.state !== 'closed') {
        this.encoder.close();
      }
    } catch {
      // ignore
    }
  }
}
