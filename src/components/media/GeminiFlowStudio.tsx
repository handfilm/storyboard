/**
 * @file /src/components/media/GeminiFlowStudio.tsx
 * @description Unified Gemini Cinema Image & Google Flow / Veo Motion Video Studio
 * embedded inside the HandFilm MEDIA Asset Vault drawer & modal.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Film,
  Zap,
  PlusSquare,
  Download,
  SlidersHorizontal,
  RefreshCw,
  Upload,
  X,
  Play,
  Square,
  Dices,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Camera,
  ChevronDown,
  ChevronUp,
  Clapperboard
} from 'lucide-react';
import { AnthologyFrame } from '../../types/anthology';
import { eventBus } from '../../core/eventBus';
import { useStudioStore } from '../../core/store';
import { useLicenseStore } from '../../services/licenseService';
import { launchExternalEdit, ExternalEditApp } from '../../services/editInBridge';
import {
  AiAspectRatio,
  AiEngineStatusResponse,
  buildPromptFromShot,
  cancelFlowVideoGeneration,
  DIRECTOR_STYLE_CHIPS,
  FLOW_CAMERA_MOVEMENTS,
  FlowCameraMovement,
  FlowMotionIntensity,
  GeminiImageModelId,
  GeneratedMediaAsset,
  generateSingleCinemaImage,
  getAiEngineStatus,
  IMAGE_ASPECT_RATIOS,
  mediaSourceToBase64,
  pollFlowVideoStatus,
  resolveFlowProgressStage,
  resolveVideoUrlToVaultAsset,
  startFlowVideoGeneration,
  triggerLocalDownload
} from '../../services/aiMediaService';

type StudioSubTab = 'IMAGE' | 'FLOW';

interface ReferenceSlot {
  previewUrl: string;
  base64: string;
  mimeType: string;
  label: string;
}

export interface GeminiFlowStudioProps {
  activeShotIndex: number;
  currentFrame?: AnthologyFrame | null;
  compactLayout?: boolean;
  onPushToActiveShot?: (blob: Blob, name: string, mimeType: string) => Promise<void> | void;
  onVaultAssetSaved?: () => void;
}

export const GeminiFlowStudio: React.FC<GeminiFlowStudioProps> = ({
  activeShotIndex,
  currentFrame,
  compactLayout = false,
  onPushToActiveShot,
  onVaultAssetSaved
}) => {
  const [subTab, setSubTab] = useState<StudioSubTab>('IMAGE');

  // Server Engine Config & Status (Zero browser API key inputs; non-secret preferences persisted in localStorage)
  const [engineStatus, setEngineStatus] = useState<AiEngineStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedImageModel, setSelectedImageModel] = useState<GeminiImageModelId>(() => {
    try {
      const raw = window.localStorage.getItem('handfilm_ai_engine_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed?.selectedImageModel === 'gemini-2.5-flash-image' ||
          parsed?.selectedImageModel === 'gemini-nano-banana-2.1' ||
          parsed?.selectedImageModel === 'gemini-3.1-flash-lite-image'
        ) {
          return parsed.selectedImageModel;
        }
      }
    } catch {}
    return 'gemini-2.5-flash-image';
  });
  const [selectedImageSize, setSelectedImageSize] = useState<'1K' | '2K' | '4K'>(() => {
    try {
      const raw = window.localStorage.getItem('handfilm_ai_engine_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.selectedImageSize === '1K' || parsed?.selectedImageSize === '2K' || parsed?.selectedImageSize === '4K') {
          return parsed.selectedImageSize;
        }
      }
    } catch {}
    return '1K';
  });

  // Toast / Error Feedback
  const [notice, setNotice] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  // Engine A: Gemini Cinema Image Studio State
  const [imagePrompt, setImagePrompt] = useState<string>(() => buildPromptFromShot(currentFrame, activeShotIndex));
  const [imageAspect, setImageAspect] = useState<AiAspectRatio>('21:9');
  const [batchCount, setBatchCount] = useState<1 | 2 | 4>(2);
  const [img2ImgRef, setImg2ImgRef] = useState<ReferenceSlot | null>(null);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

  // Engine B: Google Flow / Veo Motion State
  const [flowPrompt, setFlowPrompt] = useState<string>(() => buildPromptFromShot(currentFrame, activeShotIndex));
  const [flowStartFrame, setFlowStartFrame] = useState<ReferenceSlot | null>(null);
  const [flowEndFrame, setFlowEndFrame] = useState<ReferenceSlot | null>(null);
  const [flowCameraMove, setFlowCameraMove] = useState<FlowCameraMovement>('Dolly Push-In');
  const [flowDuration, setFlowDuration] = useState<5 | 8>(5);
  const [flowAspect, setFlowAspect] = useState<'16:9' | '9:16' | '21:9'>('16:9');
  const [flowIntensity, setFlowIntensity] = useState<FlowMotionIntensity>('Cinematic');
  const [flowSeed, setFlowSeed] = useState<string>('');
  const [flowJob, setFlowJob] = useState<{
    interactionId: string;
    status: string;
    elapsedSec: number;
    error?: string;
  } | null>(null);

  // Generated Contact Sheet (Session History, newest first)
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedMediaAsset[]>([]);
  const [exportMenuAssetId, setExportMenuAssetId] = useState<string | null>(null);

  const imgRefInputRef = useRef<HTMLInputElement | null>(null);
  const flowStartInputRef = useRef<HTMLInputElement | null>(null);
  const flowEndInputRef = useRef<HTMLInputElement | null>(null);
  const activePollTimerRef = useRef<number | null>(null);
  const activeElapsedTimerRef = useRef<number | null>(null);

  const showBanner = useCallback((type: 'info' | 'error', text: string) => {
    setNotice({ type, text });
    if (type === 'info') {
      window.setTimeout(() => {
        setNotice((cur) => (cur?.text === text ? null : cur));
      }, 3600);
    }
  }, []);

  const refreshEngineStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const status = await getAiEngineStatus();
      setEngineStatus(status);
    } catch {
      setEngineStatus({
        connected: false,
        source: 'none',
        models: {
          imageFast: 'gemini-2.5-flash-image',
          imageFallback: 'imagen-3.0-generate-002',
          imagePro: 'gemini-nano-banana-2.1',
          videoFlow: 'veo-2.0-generate-001'
        }
      });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshEngineStatus();
    return () => {
      if (activePollTimerRef.current !== null) window.clearTimeout(activePollTimerRef.current);
      if (activeElapsedTimerRef.current !== null) window.clearInterval(activeElapsedTimerRef.current);
    };
  }, [refreshEngineStatus]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'handfilm_ai_engine_config',
        JSON.stringify({ selectedImageModel, selectedImageSize })
      );
    } catch {}
  }, [selectedImageModel, selectedImageSize]);

  const handlePullFromActiveShot = (target: StudioSubTab) => {
    const crafted = buildPromptFromShot(currentFrame, activeShotIndex);
    if (target === 'IMAGE') {
      setImagePrompt(crafted);
    } else {
      setFlowPrompt(crafted);
    }
    showBanner('info', `PULLED PROMPT FROM SHOT #${String(activeShotIndex + 1).padStart(2, '0')}`);
  };

  const toggleStyleChip = (token: string) => {
    setImagePrompt((prev) => {
      const trimmed = prev.trim();
      if (trimmed.includes(token)) {
        const cleaned = trimmed
          .replace(token, '')
          .replace(/,\s*,/g, ',')
          .replace(/(^,\s*|,\s*$)/g, '')
          .trim();
        return cleaned;
      }
      return trimmed ? `${trimmed}, ${token}` : token;
    });
  };

  const loadSlotFromFile = async (
    file: File,
    setter: React.Dispatch<React.SetStateAction<ReferenceSlot | null>>,
    labelPrefix: string
  ) => {
    if (!file.type.startsWith('image/')) {
      showBanner('error', 'Select a PNG, JPG, or WEBP still frame for visual conditioning.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    try {
      const { base64, mimeType } = await mediaSourceToBase64(previewUrl);
      setter({
        previewUrl,
        base64,
        mimeType,
        label: `${labelPrefix}: ${file.name}`
      });
    } catch (err: any) {
      URL.revokeObjectURL(previewUrl);
      showBanner('error', err?.message || 'Unable to decode image file');
    }
  };

  const loadSlotFromActiveShot = async (
    setter: React.Dispatch<React.SetStateAction<ReferenceSlot | null>>,
    slotName: string
  ) => {
    const shotMediaMap = useStudioStore.getState().shotMediaMap;
    const storeEntry = shotMediaMap[`shot_${currentFrame?.id}`] ||
      shotMediaMap[`shot_${activeShotIndex}`] ||
      shotMediaMap[String(currentFrame?.id)] ||
      shotMediaMap[String(activeShotIndex)];
    const sourceUrl =
      (storeEntry && storeEntry.type === 'image' ? storeEntry.url : '') ||
      (!currentFrame?.isVideo && currentFrame?.imageUrl ? currentFrame.imageUrl : '') ||
      currentFrame?.thumbnailUrl ||
      '';

    if (!sourceUrl) {
      showBanner('error', `Shot #${String(activeShotIndex + 1).padStart(2, '0')} has no still frame yet. Upload or generate a still first.`);
      return;
    }

    try {
      const { base64, mimeType } = await mediaSourceToBase64(sourceUrl);
      setter({
        previewUrl: sourceUrl,
        base64,
        mimeType,
        label: `SHOT #${String(activeShotIndex + 1).padStart(2, '0')} (${slotName})`
      });
      showBanner('info', `LOADED SHOT #${String(activeShotIndex + 1).padStart(2, '0')} INTO ${slotName}`);
    } catch (err: any) {
      showBanner('error', err?.message || 'Could not capture active shot still frame.');
    }
  };

  const handleGenerateImages = async () => {
    if (!useLicenseStore.getState().requireProAccess('Gemini Image & Google Flow Video AI')) {
      return;
    }
    if (!imagePrompt.trim()) {
      showBanner('error', 'Enter a cinematic prompt or pull metadata from the active shot.');
      return;
    }

    setIsGeneratingImages(true);
    setBatchProgress({ done: 0, total: batchCount });
    setNotice(null);

    let completedCount = 0;
    const errors: string[] = [];

    const tasks = Array.from({ length: batchCount }, (_, idx) =>
      generateSingleCinemaImage(
        {
          prompt: imagePrompt.trim(),
          aspectRatio: imageAspect,
          model: selectedImageModel,
          imageSize: selectedImageModel === 'gemini-nano-banana-2.1' ? selectedImageSize : '1K',
          referenceImageBase64: img2ImgRef?.base64,
          referenceMimeType: img2ImgRef?.mimeType,
          shotIndex: activeShotIndex
        },
        idx
      )
        .then((asset) => {
          completedCount += 1;
          setBatchProgress({ done: completedCount, total: batchCount });
          setGeneratedAssets((prev) => [asset, ...prev]);
          onVaultAssetSaved?.();
          return asset;
        })
        .catch((err: any) => {
          completedCount += 1;
          setBatchProgress({ done: completedCount, total: batchCount });
          errors.push(err?.message || 'Generation failed');
          return null;
        })
    );

    const results = await Promise.all(tasks);
    const successes = results.filter(Boolean).length;
    setIsGeneratingImages(false);
    setBatchProgress(null);

    if (successes > 0 && errors.length === 0) {
      showBanner('info', `GENERATED ${successes} CINEMA ${successes === 1 ? 'FRAME' : 'FRAMES'} · SAVED TO OPFS VAULT`);
    } else if (successes > 0) {
      showBanner('error', `${successes}/${batchCount} frames succeeded. Error: ${errors[0]}`);
    } else {
      showBanner('error', errors[0] || 'Image generation failed. Verify GEMINI_API_KEY in Settings > Secrets.');
    }
  };

  const stopFlowTimers = () => {
    if (activePollTimerRef.current !== null) {
      window.clearTimeout(activePollTimerRef.current);
      activePollTimerRef.current = null;
    }
    if (activeElapsedTimerRef.current !== null) {
      window.clearInterval(activeElapsedTimerRef.current);
      activeElapsedTimerRef.current = null;
    }
  };

  const handleStartFlowVideo = async () => {
    if (!useLicenseStore.getState().requireProAccess('Gemini Image & Google Flow Video AI')) {
      return;
    }
    if (!flowPrompt.trim() && !flowStartFrame) {
      showBanner('error', 'Provide a motion prompt or attach a Start Frame for Google Flow.');
      return;
    }

    stopFlowTimers();
    setNotice(null);
    setFlowJob({
      interactionId: '',
      status: 'queued',
      elapsedSec: 0
    });

    try {
      const started = await startFlowVideoGeneration({
        prompt: flowPrompt.trim(),
        startFrameBase64: flowStartFrame?.base64,
        startFrameMimeType: flowStartFrame?.mimeType,
        endFrameBase64: flowEndFrame?.base64,
        endFrameMimeType: flowEndFrame?.mimeType,
        aspectRatio: flowAspect,
        durationSec: flowDuration,
        cameraMovement: flowCameraMove,
        motionIntensity: flowIntensity,
        seed: flowSeed.trim() || undefined
      });

      const interactionId = started.interactionId;
      setFlowJob({
        interactionId,
        status: started.status,
        elapsedSec: 0
      });

      activeElapsedTimerRef.current = window.setInterval(() => {
        setFlowJob((cur) => (cur ? { ...cur, elapsedSec: cur.elapsedSec + 1 } : cur));
      }, 1000);

      const pollLoop = async () => {
        try {
          const pollRes = await pollFlowVideoStatus(interactionId);
          if (pollRes.done) {
            stopFlowTimers();
            if (pollRes.status === 'completed' && pollRes.videoUrl) {
              const asset = await resolveVideoUrlToVaultAsset(pollRes.videoUrl, {
                prompt: flowPrompt.trim() || `${flowCameraMove} Motion Clip`,
                aspectRatio: flowAspect,
                shotIndex: activeShotIndex
              });
              setGeneratedAssets((prev) => [asset, ...prev]);
              onVaultAssetSaved?.();
              setFlowJob(null);
              showBanner('info', `FLOW 24FPS MP4 READY · "${asset.name}" SAVED TO OPFS VAULT`);
            } else {
              setFlowJob((cur) =>
                cur
                  ? { ...cur, status: 'failed', error: pollRes.error || 'Flow job did not complete cleanly.' }
                  : null
              );
            }
            return;
          }

          setFlowJob((cur) => (cur ? { ...cur, status: pollRes.status } : cur));
          activePollTimerRef.current = window.setTimeout(pollLoop, 5000);
        } catch (err: any) {
          stopFlowTimers();
          setFlowJob((cur) =>
            cur ? { ...cur, status: 'failed', error: err?.message || 'Flow status polling interrupted.' } : null
          );
        }
      };

      activePollTimerRef.current = window.setTimeout(pollLoop, 5000);
    } catch (err: any) {
      stopFlowTimers();
      setFlowJob(null);
      showBanner('error', err?.message || 'Failed to launch Google Flow render.');
    }
  };

  const handleCancelFlowVideo = async () => {
    const currentId = flowJob?.interactionId;
    stopFlowTimers();
    setFlowJob(null);
    if (currentId) {
      await cancelFlowVideoGeneration(currentId);
    }
    showBanner('info', 'GOOGLE FLOW RENDER CANCELLED');
  };

  const handlePushAssetToActiveShot = async (asset: GeneratedMediaAsset) => {
    const file = new File([asset.blob], asset.name, { type: asset.mimeType });
    const handledByCallback = Boolean(onPushToActiveShot);
    if (onPushToActiveShot) {
      await onPushToActiveShot(file, asset.name, asset.mimeType);
    }
    eventBus.emit('media:push_to_active_shot', {
      shotIndex: activeShotIndex,
      blob: asset.blob,
      file,
      name: asset.name,
      mimeType: asset.mimeType,
      seekToStart: true,
      alreadyBound: handledByCallback
    });
    showBanner(
      'info',
      `PUSHED "${asset.name}" → SHOT #${String(activeShotIndex + 1).padStart(2, '0')} & SEEKED 00:00`
    );
  };

  const handleInsertAssetAsNewShot = (asset: GeneratedMediaAsset) => {
    const cleanTitle = asset.name.replace(/\.[^/.]+$/, '');
    eventBus.emit('media:append_to_timeline', {
      name: asset.name,
      mimeType: asset.mimeType,
      blob: asset.blob,
      durationSec: asset.kind === 'VIDEO' ? flowDuration : 12.0,
      title: cleanTitle,
      notes: asset.prompt
    });
    showBanner('info', `INSERTED "${asset.name}" AS NEW TIMELINE SHOT`);
  };

  const handleAnimateInFlow = async (asset: GeneratedMediaAsset) => {
    try {
      const { base64, mimeType } = await mediaSourceToBase64(asset.previewUrl);
      setFlowStartFrame({
        previewUrl: asset.previewUrl,
        base64,
        mimeType,
        label: `GENERATED: ${asset.name}`
      });
      if (asset.prompt) {
        setFlowPrompt(asset.prompt);
      }
      if (asset.aspectRatio === '9:16' || asset.aspectRatio === '16:9' || asset.aspectRatio === '21:9') {
        setFlowAspect(asset.aspectRatio);
      }
      setSubTab('FLOW');
      showBanner('info', `LOADED "${asset.name}" INTO FLOW START FRAME`);
    } catch (err: any) {
      showBanner('error', err?.message || 'Unable to load generated image into Flow Start Frame');
    }
  };

  const handleExternalEditHandoff = async (app: ExternalEditApp, asset: GeneratedMediaAsset) => {
    setExportMenuAssetId(null);
    await handlePushAssetToActiveShot(asset);
    void launchExternalEdit({
      app,
      shotIndex: activeShotIndex,
      frame: currentFrame
    });
    showBanner('info', `DISPATCHED "${asset.name}" TO ${app.toUpperCase()}`);
  };

  const isFlowRunning = Boolean(flowJob && flowJob.status !== 'failed');
  const flowStage = flowJob ? resolveFlowProgressStage(flowJob.elapsedSec, flowJob.status) : null;

  return (
    <div
      data-testid="gemini-flow-ai-studio"
      className="flex flex-col h-full overflow-hidden bg-[#0B0B0D] text-[#F4F4F5] font-mono select-none"
    >
      {/* Top Studio Mode Switcher & Engine Readiness Strip */}
      <div className="px-3.5 py-2.5 border-b border-white/[0.08] bg-[#111216] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 bg-[#0B0B0D] p-0.5 rounded-lg border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setSubTab('IMAGE')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
              subTab === 'IMAGE'
                ? 'bg-[#F59E0B] text-[#0B0B0D] shadow-[0_0_16px_rgba(245,158,11,0.3)]'
                : 'text-[#8E8E93] hover:text-[#F4F4F5]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>GEMINI IMAGE</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('FLOW')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
              subTab === 'FLOW'
                ? 'bg-[#38BDF8] text-[#0B0B0D] shadow-[0_0_16px_rgba(56,189,248,0.3)]'
                : 'text-[#8E8E93] hover:text-[#F4F4F5]'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>GOOGLE FLOW // VEO</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsConfigOpen((v) => !v)}
            className="h-7 px-2.5 rounded bg-[#141417] hover:bg-[#1A1B21] border border-white/[0.09] text-[9.5px] font-bold tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
            title="API Key Status & Engine Config"
          >
            <span className="text-[#8E8E93]">API KEY &amp; ENGINE CONFIG</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                engineStatus?.connected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-[#F59E0B]'
              }`}
            />
            <span className={engineStatus?.connected ? 'text-emerald-300' : 'text-[#F59E0B]'}>
              {statusLoading ? 'CHECKING...' : engineStatus?.connected ? 'CONNECTED' : 'KEY REQUIRED'}
            </span>
            <SlidersHorizontal className="w-3 h-3 text-[#8E8E93]" />
            {isConfigOpen ? <ChevronUp className="w-3 h-3 text-[#8E8E93]" /> : <ChevronDown className="w-3 h-3 text-[#8E8E93]" />}
          </button>
        </div>
      </div>

      {/* Collapsible Engine Config Bar (Zero client API key input; server-side Settings > Secrets readout) */}
      {isConfigOpen && (
        <div className="px-3.5 py-2.5 border-b border-white/[0.08] bg-[#141417]/95 flex flex-wrap items-center justify-between gap-3 text-[10px] shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[#8E8E93] font-bold">IMAGE TIER:</span>
              <button
                type="button"
                onClick={() => setSelectedImageModel('gemini-2.5-flash-image')}
                className={`px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                  selectedImageModel === 'gemini-2.5-flash-image' || selectedImageModel === 'gemini-3.1-flash-lite-image'
                    ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B] font-bold'
                    : 'bg-[#0B0B0D] border-white/[0.08] text-[#8E8E93]'
                }`}
              >
                Flash Image + Imagen 3
              </button>
              <button
                type="button"
                onClick={() => setSelectedImageModel('gemini-nano-banana-2.1')}
                className={`px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                  selectedImageModel === 'gemini-nano-banana-2.1'
                    ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B] font-bold'
                    : 'bg-[#0B0B0D] border-white/[0.08] text-[#8E8E93]'
                }`}
              >
                Nano Banana 2.1 (4K)
              </button>
            </div>

            {selectedImageModel === 'gemini-nano-banana-2.1' && (
              <div className="flex items-center gap-1">
                <span className="text-[#8E8E93] font-bold">RES:</span>
                {(['1K', '2K', '4K'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedImageSize(sz)}
                    className={`px-1.5 py-0.5 rounded border cursor-pointer tabular-nums ${
                      selectedImageSize === sz
                        ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8] font-bold'
                        : 'bg-[#0B0B0D] border-white/[0.08] text-[#8E8E93]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[9.5px] text-[#8E8E93]">
            <span>
              Engine Route:{' '}
              <strong className="text-[#F4F4F5]">
                {engineStatus?.connected ? 'Authenticated Server Proxy (GEMINI_API_KEY)' : 'Server Proxy Offline'}
              </strong>{' '}
              · Video: <strong className="text-[#38BDF8]">veo-2.0-generate-001</strong>
            </span>
            <button
              type="button"
              onClick={() => void refreshEngineStatus()}
              className="p-1 rounded bg-[#0B0B0D] border border-white/[0.08] hover:border-[#F59E0B] text-[#8E8E93] hover:text-white cursor-pointer"
              title="Re-check server engine readiness"
            >
              <RefreshCw className={`w-3 h-3 ${statusLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Status / Error Banner */}
      {notice && (
        <div
          className={`px-3.5 py-2 border-b text-[10px] font-bold flex items-center justify-between gap-2 shrink-0 ${
            notice.type === 'error'
              ? 'bg-red-500/15 border-red-500/40 text-red-300'
              : 'bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {notice.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="truncate">{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-current opacity-70 hover:opacity-100 cursor-pointer shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Scrollable Studio Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar">
        {subTab === 'IMAGE' ? (
          /* ================= ENGINE A: GEMINI CINEMA IMAGE STUDIO ================= */
          <div className="space-y-3.5">
            {/* Shot-Aware Prompt Header */}
            <div className="rounded-lg bg-[#141417] border border-white/[0.08] p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-[#F4F4F5]">
                  <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>DIRECTOR&apos;S PROMPT WORKBENCH</span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePullFromActiveShot('IMAGE')}
                  className="px-2 py-1 rounded bg-[#F59E0B]/15 hover:bg-[#F59E0B] text-[#F59E0B] hover:text-[#0B0B0D] border border-[#F59E0B]/50 text-[9.5px] font-black tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Camera className="w-3 h-3" />
                  <span>PULL FROM ACTIVE SHOT #{String(activeShotIndex + 1).padStart(2, '0')}</span>
                </button>
              </div>

              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={3}
                placeholder="Describe shot blocking, lighting, lens focal length, film stock, and emotional atmosphere..."
                className="w-full rounded bg-[#0B0B0D] border border-white/[0.08] focus:border-[#F59E0B]/70 p-2.5 text-[11px] leading-relaxed text-[#F4F4F5] placeholder:text-[#8E8E93] focus:outline-none resize-y"
              />

              {/* Style & Lens Modifier Chips */}
              <div className="space-y-1.5">
                <div className="text-[9px] font-bold tracking-widest uppercase text-[#8E8E93]">
                  DIRECTOR STYLE &amp; LENS MODIFIERS
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DIRECTOR_STYLE_CHIPS.map((chip) => {
                    const isActive = imagePrompt.includes(chip.token);
                    return (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => toggleStyleChip(chip.token)}
                        className={`px-2 py-1 rounded text-[9.5px] font-bold border cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                            : 'bg-[#0B0B0D] border-white/[0.08] text-[#8E8E93] hover:text-[#F4F4F5] hover:border-white/20'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Aspect Ratio, Batch & Visual Reference Grid */}
            <div className={`grid gap-3 ${compactLayout ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-12'}`}>
              {/* Left: Framing & Batch */}
              <div className={`${compactLayout ? '' : 'md:col-span-7'} rounded-lg bg-[#141417] border border-white/[0.08] p-3 space-y-3`}>
                <div>
                  <div className="text-[9px] font-bold tracking-widest uppercase text-[#8E8E93] mb-1.5">
                    FRAME ASPECT RATIO
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {IMAGE_ASPECT_RATIOS.map((ar) => {
                      const active = imageAspect === ar.value;
                      return (
                        <button
                          key={ar.value}
                          type="button"
                          onClick={() => setImageAspect(ar.value)}
                          className={`py-1.5 px-1 rounded border text-center cursor-pointer transition-colors ${
                            active
                              ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                              : 'bg-[#0B0B0D] border-white/[0.07] text-[#8E8E93] hover:text-white'
                          }`}
                        >
                          <div className="text-[10.5px] font-black tabular-nums">{ar.label}</div>
                          <div className="text-[8px] opacity-80 truncate">{ar.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[9px] font-bold tracking-widest uppercase text-[#8E8E93] mb-1">
                      PARALLEL BATCH
                    </div>
                    <div className="flex items-center gap-1">
                      {([1, 2, 4] as const).map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setBatchCount(cnt)}
                          className={`px-3 py-1 rounded border text-[10px] font-black tabular-nums cursor-pointer transition-colors ${
                            batchCount === cnt
                              ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8]'
                              : 'bg-[#0B0B0D] border-white/[0.07] text-[#8E8E93] hover:text-white'
                          }`}
                        >
                          {cnt}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isGeneratingImages}
                    onClick={() => void handleGenerateImages()}
                    className="flex-1 h-10 px-4 rounded-lg bg-[#F59E0B] hover:bg-[#FBBF24] disabled:opacity-50 text-[#0B0B0D] text-[11px] font-black tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_24px_rgba(245,158,11,0.25)]"
                  >
                    {isGeneratingImages ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>
                          RENDERING {batchProgress ? `${batchProgress.done}/${batchProgress.total}` : '...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>GENERATE {batchCount}X FRAMES</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right: Visual Reference (IMG2IMG) Drop Slot */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) void loadSlotFromFile(file, setImg2ImgRef, 'REF');
                }}
                className={`${compactLayout ? '' : 'md:col-span-5'} rounded-lg bg-[#141417] border border-white/[0.08] p-3 flex flex-col justify-between gap-2`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-[#8E8E93]">
                    VISUAL REFERENCE (IMG2IMG)
                  </span>
                  <button
                    type="button"
                    onClick={() => void loadSlotFromActiveShot(setImg2ImgRef, 'IMG2IMG REF')}
                    className="text-[9px] font-bold text-[#38BDF8] hover:underline cursor-pointer"
                  >
                    USE ACTIVE SHOT
                  </button>
                </div>

                <input
                  ref={imgRefInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void loadSlotFromFile(f, setImg2ImgRef, 'REF');
                    e.target.value = '';
                  }}
                />

                {img2ImgRef ? (
                  <div className="relative h-20 rounded bg-[#0B0B0D] border border-[#F59E0B]/50 overflow-hidden flex items-center gap-2.5 p-1.5">
                    <img
                      src={img2ImgRef.previewUrl}
                      alt="IMG2IMG Reference"
                      className="h-full aspect-video object-cover rounded"
                    />
                    <div className="min-w-0 flex-1 text-[9.5px] text-[#F4F4F5] truncate">{img2ImgRef.label}</div>
                    <button
                      type="button"
                      onClick={() => setImg2ImgRef(null)}
                      className="p-1 rounded bg-black/70 text-[#8E8E93] hover:text-white cursor-pointer"
                      title="Clear reference frame"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imgRefInputRef.current?.click()}
                    className="h-20 rounded border border-dashed border-white/[0.14] hover:border-[#F59E0B]/70 bg-[#0B0B0D]/70 flex flex-col items-center justify-center gap-1 text-[9.5px] text-[#8E8E93] hover:text-[#F4F4F5] cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Drop still frame or click to condition look</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ================= ENGINE B: GOOGLE FLOW / VEO MOTION STUDIO ================= */
          <div className="space-y-3.5">
            {/* Keyframe Start / End Slots */}
            <div className="rounded-lg bg-[#141417] border border-white/[0.08] p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clapperboard className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-[#F4F4F5]">
                    GOOGLE FLOW // VEO MOTION PIPELINE
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#38BDF8]/15 border border-[#38BDF8]/40 text-[#38BDF8] text-[8.5px] font-bold">
                    {flowStartFrame ? 'I2V FRAME-TO-MOTION' : 'T2V TEXT-TO-VIDEO'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePullFromActiveShot('FLOW')}
                  className="px-2 py-1 rounded bg-[#38BDF8]/15 hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#0B0B0D] border border-[#38BDF8]/50 text-[9.5px] font-black tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Camera className="w-3 h-3" />
                  <span>PULL SHOT #{String(activeShotIndex + 1).padStart(2, '0')}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Start Frame */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) void loadSlotFromFile(f, setFlowStartFrame, 'START');
                  }}
                  className="rounded bg-[#0B0B0D] border border-white/[0.08] p-2 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="font-bold text-[#8E8E93]">START FRAME (OPTIONAL I2V)</span>
                    <button
                      type="button"
                      onClick={() => void loadSlotFromActiveShot(setFlowStartFrame, 'START')}
                      className="text-[#38BDF8] font-bold hover:underline cursor-pointer"
                    >
                      USE ACTIVE SHOT
                    </button>
                  </div>
                  <input
                    ref={flowStartInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void loadSlotFromFile(f, setFlowStartFrame, 'START');
                      e.target.value = '';
                    }}
                  />
                  {flowStartFrame ? (
                    <div className="relative h-16 rounded overflow-hidden border border-[#38BDF8]/50 flex items-center gap-2 p-1 bg-[#141417]">
                      <img src={flowStartFrame.previewUrl} alt="Start frame" className="h-full aspect-video object-cover rounded" />
                      <span className="text-[9px] truncate flex-1">{flowStartFrame.label}</span>
                      <button
                        type="button"
                        onClick={() => setFlowStartFrame(null)}
                        className="p-1 rounded bg-black/70 text-[#8E8E93] hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => flowStartInputRef.current?.click()}
                      className="w-full h-16 rounded border border-dashed border-white/[0.12] hover:border-[#38BDF8]/70 flex items-center justify-center gap-1.5 text-[9.5px] text-[#8E8E93] hover:text-white cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#38BDF8]" />
                      <span>Upload / Drop Start Keyframe</span>
                    </button>
                  )}
                </div>

                {/* Optional End Frame */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) void loadSlotFromFile(f, setFlowEndFrame, 'END');
                  }}
                  className="rounded bg-[#0B0B0D] border border-white/[0.08] p-2 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="font-bold text-[#8E8E93]">END FRAME (KEYFRAME BRIDGE)</span>
                    <span className="text-[#8E8E93]">OPTIONAL</span>
                  </div>
                  <input
                    ref={flowEndInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void loadSlotFromFile(f, setFlowEndFrame, 'END');
                      e.target.value = '';
                    }}
                  />
                  {flowEndFrame ? (
                    <div className="relative h-16 rounded overflow-hidden border border-[#F59E0B]/50 flex items-center gap-2 p-1 bg-[#141417]">
                      <img src={flowEndFrame.previewUrl} alt="End frame" className="h-full aspect-video object-cover rounded" />
                      <span className="text-[9px] truncate flex-1">{flowEndFrame.label}</span>
                      <button
                        type="button"
                        onClick={() => setFlowEndFrame(null)}
                        className="p-1 rounded bg-black/70 text-[#8E8E93] hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => flowEndInputRef.current?.click()}
                      className="w-full h-16 rounded border border-dashed border-white/[0.12] hover:border-[#F59E0B]/70 flex items-center justify-center gap-1.5 text-[9.5px] text-[#8E8E93] hover:text-white cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>Upload / Drop End Keyframe</span>
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={flowPrompt}
                onChange={(e) => setFlowPrompt(e.target.value)}
                rows={2}
                placeholder="Describe motion choreography, subject action, physics, wind/rain particles, and light shifts..."
                className="w-full rounded bg-[#0B0B0D] border border-white/[0.08] focus:border-[#38BDF8]/70 p-2.5 text-[11px] text-[#F4F4F5] placeholder:text-[#8E8E93] focus:outline-none resize-y"
              />
            </div>

            {/* Camera Choreography & Physics Controls */}
            <div className="rounded-lg bg-[#141417] border border-white/[0.08] p-3 space-y-3">
              <div>
                <div className="text-[9px] font-bold tracking-widest uppercase text-[#8E8E93] mb-1.5">
                  CAMERA CHOREOGRAPHY
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {FLOW_CAMERA_MOVEMENTS.map((mv) => (
                    <button
                      key={mv}
                      type="button"
                      onClick={() => setFlowCameraMove(mv)}
                      className={`px-2 py-1 rounded text-[9.5px] font-bold border cursor-pointer transition-colors ${
                        flowCameraMove === mv
                          ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8]'
                          : 'bg-[#0B0B0D] border-white/[0.08] text-[#8E8E93] hover:text-white'
                      }`}
                    >
                      {mv}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
                <div>
                  <div className="text-[9px] font-bold tracking-widest uppercase text-[#8E8E93] mb-1">
                    DURATION @ 24FPS
                  </div>
                  <div className="flex gap-1">
                    {([5, 8] as const).map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setFlowDuration(sec)}
                        className={`px-2.5 py-1 rounded border text-[10px] font-black tabular-nums cursor-pointer ${
                          flowDuration === sec
                            ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                            : 'bg-[#0B0B0D] border-white/[0.07] text-[#8E8E93]'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-bold tracking-widest uppercase text-[#8E8E93] mb-1">
                    ASPECT
                  </div>
                  <div className="flex gap-1">
                    {(['16:9', '9:16', '21:9'] as const).map((ar) => (
                      <button
                        key={ar}
                        type="button"
                        onClick={() => setFlowAspect(ar)}
                        className={`px-2 py-1 rounded border text-[10px] font-black tabular-nums cursor-pointer ${
                          flowAspect === ar
                            ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8]'
                            : 'bg-[#0B0B0D] border-white/[0.07] text-[#8E8E93]'
                        }`}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-bold tracking-widest uppercase text-[#8E8E93] mb-1">
                    MOTION INTENSITY
                  </div>
                  <div className="flex gap-1">
                    {(['Low', 'Cinematic', 'Hyper-Kinetic'] as FlowMotionIntensity[]).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setFlowIntensity(lvl)}
                        className={`px-2 py-1 rounded border text-[9.5px] font-bold cursor-pointer ${
                          flowIntensity === lvl
                            ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                            : 'bg-[#0B0B0D] border-white/[0.07] text-[#8E8E93]'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-bold tracking-widest uppercase text-[#8E8E93] mb-1">
                    SEED LOCK
                  </div>
                  <div className="flex items-center gap-1 h-7 px-2 rounded bg-[#0B0B0D] border border-white/[0.08]">
                    <input
                      type="text"
                      value={flowSeed}
                      onChange={(e) => setFlowSeed(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Auto"
                      className="w-16 bg-transparent text-[10px] text-[#F4F4F5] tabular-nums focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setFlowSeed(String(Math.floor(100000 + Math.random() * 899999)))}
                      title="Generate Random Seed"
                      className="text-[#8E8E93] hover:text-[#F59E0B] cursor-pointer"
                    >
                      <Dices className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Async Progress Telemetry HUD OR Trigger CTA */}
              {flowJob ? (
                <div className="rounded-lg bg-[#0B0B0D] border border-[#38BDF8]/40 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <div className="flex items-center gap-2 font-black text-[#38BDF8]">
                      {flowJob.status === 'failed' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      )}
                      <span className={flowJob.status === 'failed' ? 'text-red-400' : 'text-[#38BDF8]'}>
                        {flowJob.status === 'failed'
                          ? 'FLOW PIPELINE HALTED'
                          : flowStage?.label || 'INITIALIZING FLOW'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-[#8E8E93]">
                        {String(Math.floor(flowJob.elapsedSec / 60)).padStart(2, '0')}:
                        {String(flowJob.elapsedSec % 60).padStart(2, '0')}
                      </span>
                      {flowJob.status === 'failed' ? (
                        <button
                          type="button"
                          onClick={() => void handleStartFlowVideo()}
                          className="px-2 py-0.5 rounded bg-[#F59E0B] text-[#0B0B0D] font-black cursor-pointer"
                        >
                          RETRY
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleCancelFlowVideo()}
                          className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Square className="w-2.5 h-2.5" />
                          <span>CANCEL</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {flowJob.error ? (
                    <div className="text-[10px] text-red-300">{flowJob.error}</div>
                  ) : (
                    <div className="w-full h-1.5 rounded-full bg-[#141417] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#38BDF8] via-[#F59E0B] to-emerald-400 transition-all duration-500"
                        style={{ width: `${flowStage?.percent ?? 15}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isFlowRunning}
                  onClick={() => void handleStartFlowVideo()}
                  className="w-full h-10 rounded-lg bg-[#38BDF8] hover:bg-[#7DD3FC] disabled:opacity-50 text-[#0B0B0D] text-[11px] font-black tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_24px_rgba(56,189,248,0.25)]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>RENDER {flowDuration}S FLOW CLIP @ 24FPS</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= GENERATED CONTACT SHEET & 1-CLICK NLE ACTIONS ================= */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
            <div className="text-[10px] font-black tracking-widest uppercase text-[#F4F4F5]">
              GENERATED CONTACT SHEET <span className="text-[#F59E0B]">({generatedAssets.length})</span>
            </div>
            <div className="text-[9px] text-[#8E8E93]">
              Auto-saved to OPFS Media Vault · Click PUSH TO SHOT #{String(activeShotIndex + 1).padStart(2, '0')}
            </div>
          </div>

          {generatedAssets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/[0.1] bg-[#141417]/50 p-6 text-center text-[10.5px] text-[#8E8E93]">
              Generated Gemini cinema stills &amp; Google Flow 24fps MP4 clips will appear here with 1-click timeline binding.
            </div>
          ) : (
            <div className={`grid gap-3 ${compactLayout ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {generatedAssets.map((asset) => {
                const isExportOpen = exportMenuAssetId === asset.id;
                return (
                  <div
                    key={asset.id}
                    className="rounded-lg bg-[#141417] border border-white/[0.09] hover:border-[#F59E0B]/60 overflow-hidden flex flex-col transition-all"
                  >
                    <div className="relative aspect-video bg-[#08090C] overflow-hidden">
                      {asset.kind === 'VIDEO' ? (
                        <video
                          src={asset.previewUrl}
                          controls
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={asset.previewUrl}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 border border-white/10 text-[8.5px] font-bold text-[#F59E0B]">
                        {asset.kind} · {asset.aspectRatio}
                      </div>
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 border border-emerald-500/40 text-[8.5px] font-bold text-emerald-300">
                        OPFS STORED
                      </div>
                    </div>

                    <div className="p-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10.5px] font-bold text-[#F4F4F5] truncate" title={asset.name}>
                          {asset.name}
                        </span>
                        <span className="text-[8.5px] text-[#8E8E93] shrink-0">{asset.model}</span>
                      </div>

                      {/* 4 Required 1-Click Actions */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handlePushAssetToActiveShot(asset)}
                          className="flex-1 min-w-[130px] h-7 px-2 rounded bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0B0B0D] text-[9.5px] font-black tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Zap className="w-3 h-3" />
                          <span>PUSH TO ACTIVE SHOT</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleInsertAssetAsNewShot(asset)}
                          title="Insert as New Shot on Timeline"
                          className="h-7 px-2 rounded bg-[#0B0B0D] hover:bg-[#38BDF8]/20 border border-white/[0.1] hover:border-[#38BDF8]/60 text-[#38BDF8] text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <PlusSquare className="w-3 h-3" />
                          <span>+ NEW SHOT</span>
                        </button>

                        {asset.kind === 'IMAGE' && (
                          <button
                            type="button"
                            onClick={() => void handleAnimateInFlow(asset)}
                            title="Send image directly into Google Flow / Veo Start Frame"
                            className="h-7 px-2 rounded bg-[#38BDF8]/15 hover:bg-[#38BDF8] border border-[#38BDF8]/50 text-[#38BDF8] hover:text-[#0B0B0D] text-[9.5px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Film className="w-3 h-3" />
                            <span>ANIMATE IN FLOW -&gt;</span>
                          </button>
                        )}

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setExportMenuAssetId((cur) => (cur === asset.id ? null : asset.id))}
                            title="Download PNG/MP4 or Edit In External App"
                            className="h-7 px-2 rounded bg-[#0B0B0D] hover:bg-white/10 border border-white/[0.1] text-[#F4F4F5] text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            <span>SAVE / EXPORT</span>
                          </button>

                          {isExportOpen && (
                            <div className="absolute right-0 bottom-8 z-30 w-44 rounded-lg bg-[#0B0B0D] border border-white/[0.14] shadow-2xl p-1 space-y-0.5 text-[9.5px]">
                              <button
                                type="button"
                                onClick={() => {
                                  setExportMenuAssetId(null);
                                  triggerLocalDownload(asset.blob, asset.name);
                                  showBanner('info', `DOWNLOADING "${asset.name}"`);
                                }}
                                className="w-full px-2 py-1.5 rounded text-left hover:bg-[#F59E0B] hover:text-[#0B0B0D] font-bold flex items-center justify-between cursor-pointer"
                              >
                                <span>Download Local File</span>
                                <Download className="w-3 h-3" />
                              </button>
                              {asset.kind === 'IMAGE' ? (
                                <button
                                  type="button"
                                  onClick={() => void handleExternalEditHandoff('photoshop', asset)}
                                  className="w-full px-2 py-1.5 rounded text-left hover:bg-[#38BDF8]/20 text-[#38BDF8] font-bold flex items-center justify-between cursor-pointer"
                                >
                                  <span>Edit In Photoshop</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void handleExternalEditHandoff('premiere', asset)}
                                    className="w-full px-2 py-1.5 rounded text-left hover:bg-[#38BDF8]/20 text-[#38BDF8] font-bold flex items-center justify-between cursor-pointer"
                                  >
                                    <span>Edit In Premiere</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleExternalEditHandoff('capcut', asset)}
                                    className="w-full px-2 py-1.5 rounded text-left hover:bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-between cursor-pointer"
                                  >
                                    <span>Edit In CapCut</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
