/**
 * @file /src/hooks/useStudioReactivePipelines.ts
 * @description Master Integration Glue Hook for RAWx Studio Modular Pipelines.
 * 
 * Binds:
 * 1. Audio-Reactive Kinetic Sync Engine (audioReactiveService)
 * 2. Zero-Cloud Voiceover & Instant Auto-Subtitle Engine (voiceSubtitleService)
 * 3. Real-Time Hardware-Accelerated LUT & Color Engine (colorGradingEngine)
 * 
 * Strict Non-Destructive Design:
 * - Operates purely as a decoupled observer and adapter hook.
 * - Does not alter 24fps render tick internals, WebCodecs export loop, or store state.
 * - Exposes real-time transforms, shader blitters, and dispatchers for canvas and UI racks.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  audioReactiveService,
  BeatEventPayload,
  FrequencyEnergyPayload,
  ReactiveVisualTransforms,
  AudioReactiveConfig
} from '../services/audioReactiveService';
import {
  voiceSubtitleService,
  VoiceSubtitleState,
  RecordedVoiceClip
} from '../services/voiceSubtitleService';
import {
  colorGradingEngine,
  ColorGradingParams,
  BuiltinLutId
} from '../services/colorGradingEngine';
import { CaptionStyle, ShotCaption } from '../types/anthology';

export interface StudioReactivePipelines {
  // 1. Audio Sync Pipeline
  energy: FrequencyEnergyPayload;
  beat: BeatEventPayload | null;
  visualTransforms: ReactiveVisualTransforms;
  audioConfig: AudioReactiveConfig;
  updateAudioConfig: (partial: Partial<AudioReactiveConfig>) => void;
  getBeatTransformStyle: () => React.CSSProperties;
  getChromaticStyle: () => React.CSSProperties;

  // 2. Voiceover & Subtitle Pipeline
  voiceState: VoiceSubtitleState;
  startVoiceRecording: (shotIndex?: number, timelineSec?: number) => Promise<void>;
  stopVoiceRecording: (shotIndex?: number, timelineSec?: number) => Promise<RecordedVoiceClip>;
  setVoiceLanguage: (lang: 'bn-BD' | 'en-US') => void;
  createKineticCaption: (transcript: string, durationSec: number, style?: CaptionStyle, bengali?: string) => ShotCaption;
  deleteVoiceClip: (id: string) => void;

  // 3. Color & LUT Pipeline
  colorParams: ColorGradingParams;
  updateColorParams: (partial: Partial<ColorGradingParams>) => void;
  loadCustomLutFile: (file: File) => Promise<string>;
  getPreviewCssFilter: () => string;
  renderGradedFrame: (
    source: CanvasImageSource,
    targetCanvas: HTMLCanvasElement,
    width: number,
    height: number,
    timeSec?: number
  ) => boolean;
}

export function useStudioReactivePipelines(): StudioReactivePipelines {
  // Audio state
  const [energy, setEnergy] = useState<FrequencyEnergyPayload>(() => audioReactiveService.getCurrentEnergy());
  const [beat, setBeat] = useState<BeatEventPayload | null>(null);
  const [visualTransforms, setVisualTransforms] = useState<ReactiveVisualTransforms>({
    scale: 1.0,
    chromaticOffsetPx: 0,
    shakeX: 0,
    shakeY: 0,
    shakeRotDeg: 0,
    glowIntensity: 1.0
  });
  const [audioConfig, setAudioConfig] = useState<AudioReactiveConfig>(() => audioReactiveService.getConfig());

  // Voice state
  const [voiceState, setVoiceState] = useState<VoiceSubtitleState>(() => voiceSubtitleService.getState());

  // Color state
  const [colorParams, setColorParams] = useState<ColorGradingParams>(() => colorGradingEngine.getParams());

  // Subscribe to audio reactive engine
  useEffect(() => {
    audioReactiveService.start();

    const unsubEnergy = audioReactiveService.onEnergy(payload => {
      setEnergy(payload);
    });

    const unsubBeat = audioReactiveService.onBeat(b => {
      setBeat(b);
    });

    const unsubVisual = audioReactiveService.onVisualTransform(v => {
      setVisualTransforms(v);
    });

    return () => {
      unsubEnergy();
      unsubBeat();
      unsubVisual();
      audioReactiveService.stop();
    };
  }, []);

  // Subscribe to voice subtitle engine
  useEffect(() => {
    const unsubVoice = voiceSubtitleService.subscribe(s => {
      setVoiceState(s);
    });
    return unsubVoice;
  }, []);

  // Handlers for Audio Config
  const updateAudioConfig = useCallback((partial: Partial<AudioReactiveConfig>) => {
    audioReactiveService.updateConfig(partial);
    setAudioConfig(audioReactiveService.getConfig());
  }, []);

  // Handlers for Voice
  const startVoiceRecording = useCallback(async (shotIndex: number = 0, timelineSec: number = 0) => {
    return voiceSubtitleService.startRecording(shotIndex, timelineSec);
  }, []);

  const stopVoiceRecording = useCallback(async (shotIndex: number = 0, timelineSec: number = 0) => {
    return voiceSubtitleService.stopRecording(shotIndex, timelineSec);
  }, []);

  const setVoiceLanguage = useCallback((lang: 'bn-BD' | 'en-US') => {
    voiceSubtitleService.setLanguage(lang);
  }, []);

  const createKineticCaption = useCallback((
    transcript: string,
    durationSec: number,
    style: CaptionStyle = 'rap_pop',
    bengali?: string
  ) => {
    return voiceSubtitleService.createKineticCaption(transcript, durationSec, style, bengali);
  }, []);

  const deleteVoiceClip = useCallback((id: string) => {
    voiceSubtitleService.deleteClip(id);
  }, []);

  // Handlers for Color & LUT
  const updateColorParams = useCallback((partial: Partial<ColorGradingParams>) => {
    colorGradingEngine.setParams(partial);
    setColorParams(colorGradingEngine.getParams());
  }, []);

  const loadCustomLutFile = useCallback(async (file: File) => {
    const title = await colorGradingEngine.loadCubeFile(file);
    setColorParams(colorGradingEngine.getParams());
    return title;
  }, []);

  const getPreviewCssFilter = useCallback(() => {
    return colorGradingEngine.getPreviewCssFilter();
  }, []);

  const renderGradedFrame = useCallback((
    source: CanvasImageSource,
    targetCanvas: HTMLCanvasElement,
    width: number,
    height: number,
    timeSec: number = 0
  ) => {
    return colorGradingEngine.renderFrame(source, targetCanvas, width, height, timeSec);
  }, []);

  // Visual helper: CSS transform properties for Stage Canvas or Kinetic Layer
  const getBeatTransformStyle = useCallback((): React.CSSProperties => {
    const { scale, shakeX, shakeY, shakeRotDeg } = visualTransforms;
    return {
      transform: `translate3d(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px, 0px) scale(${scale.toFixed(3)}) rotate(${shakeRotDeg.toFixed(2)}deg)`,
      transformOrigin: 'center center',
      willChange: 'transform'
    };
  }, [visualTransforms]);

  // Visual helper: Chromatic Aberration RGB shadow filter for beat impact
  const getChromaticStyle = useCallback((): React.CSSProperties => {
    const { chromaticOffsetPx } = visualTransforms;
    if (chromaticOffsetPx <= 0.5) return {};

    const offset = chromaticOffsetPx.toFixed(1);
    return {
      filter: `drop-shadow(${offset}px 0px 0px rgba(255, 30, 80, 0.7)) drop-shadow(-${offset}px 0px 0px rgba(0, 220, 255, 0.7))`
    };
  }, [visualTransforms]);

  return {
    energy,
    beat,
    visualTransforms,
    audioConfig,
    updateAudioConfig,
    getBeatTransformStyle,
    getChromaticStyle,

    voiceState,
    startVoiceRecording,
    stopVoiceRecording,
    setVoiceLanguage,
    createKineticCaption,
    deleteVoiceClip,

    colorParams,
    updateColorParams,
    loadCustomLutFile,
    getPreviewCssFilter,
    renderGradedFrame
  };
}
