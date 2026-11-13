/**
 * @file /src/services/aiMediaService.ts
 * @description Server-proxied Gemini Cinema Image & Google Flow / Veo Motion service
 * with OPFS + IndexedDB Media Vault auto-persistence and shot-aware prompt synthesis.
 */

import { AnthologyFrame } from '../types/anthology';
import { studioDraftDb, VaultMediaItem } from './db';
import { opfsMediaStorage } from './media/opfsMediaStorage';
import { eventBus } from '../core/eventBus';

export type GeminiImageModelId = 'gemini-2.5-flash-image' | 'gemini-3.1-flash-lite-image' | 'gemini-nano-banana-2.1';
export type AiAspectRatio = '21:9' | '16:9' | '9:16' | '4:3' | '1:1';
export type FlowCameraMovement =
  | 'Dolly Push-In'
  | 'Anamorphic Whip-Pan'
  | 'Slow Crane Rise'
  | 'Handheld Steadicam Track'
  | 'Bullet-Time Orbit'
  | 'Static Locked-Off';
export type FlowMotionIntensity = 'Low' | 'Cinematic' | 'Hyper-Kinetic';

export interface AiEngineStatusResponse {
  connected: boolean;
  source?: 'server-env' | 'local-storage' | 'vite-env' | 'none';
  models: {
    imageFast: string;
    imageFallback?: string;
    imagePro: string;
    videoFlow: string;
  };
}

export interface GeneratedMediaAsset {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  name: string;
  mimeType: string;
  previewUrl: string;
  blob: Blob;
  prompt: string;
  aspectRatio: AiAspectRatio;
  model: string;
  createdAt: number;
  vaultId?: string;
}

export interface ImageGenerateParams {
  prompt: string;
  aspectRatio: AiAspectRatio;
  model: GeminiImageModelId;
  imageSize?: '1K' | '2K' | '4K';
  referenceImageBase64?: string;
  referenceMimeType?: string;
  shotIndex?: number;
}

export interface FlowVideoStartParams {
  prompt: string;
  startFrameBase64?: string;
  startFrameMimeType?: string;
  endFrameBase64?: string;
  endFrameMimeType?: string;
  aspectRatio: '16:9' | '9:16' | '21:9';
  durationSec: 5 | 8;
  cameraMovement: FlowCameraMovement;
  motionIntensity: FlowMotionIntensity;
  seed?: string;
}

export interface FlowVideoPollResult {
  status: string;
  done: boolean;
  videoUrl?: string;
  mimeType?: string;
  error?: string;
  code?: string;
}

export const DIRECTOR_STYLE_CHIPS: ReadonlyArray<{ label: string; token: string }> = [
  { label: '2.39:1 Anamorphic Scope', token: 'shot on 2.39:1 anamorphic cinema scope lenses with subtle horizontal oval bokeh and amber lens flare' },
  { label: '35mm Kodak Vision3 500T', token: '35mm Kodak Vision3 500T tungsten motion picture film stock, rich shadows and organic film grain' },
  { label: 'Tungsten & Molten Amber Rim', token: 'sculpted tungsten key lighting with molten amber rim light against deep charcoal noir shadows' },
  { label: 'Brutalist High-Fashion Editorial', token: 'brutalist architectural monolith backdrop, high-fashion editorial blocking and stark silhouette geometry' },
  { label: 'Sub-Surface Skin Detail', token: 'macro optical fidelity, natural sub-surface skin scattering, atmospheric mist droplets' },
  { label: 'Nocturnal Cyberpunk Neon', token: 'rain-slicked nocturnal metropolis reflections, moody cyan and molten amber neon rim illumination' }
];

export const FLOW_CAMERA_MOVEMENTS: ReadonlyArray<FlowCameraMovement> = [
  'Dolly Push-In',
  'Anamorphic Whip-Pan',
  'Slow Crane Rise',
  'Handheld Steadicam Track',
  'Bullet-Time Orbit',
  'Static Locked-Off'
];

export const IMAGE_ASPECT_RATIOS: ReadonlyArray<{ value: AiAspectRatio; label: string; sub: string }> = [
  { value: '21:9', label: '21:9', sub: '2.39 Scope' },
  { value: '16:9', label: '16:9', sub: 'Widescreen' },
  { value: '9:16', label: '9:16', sub: 'Speed Reel' },
  { value: '4:3', label: '4:3', sub: 'Academy' },
  { value: '1:1', label: '1:1', sub: 'Square' }
];

const LOCAL_KEY_STORAGE = 'handfilm_gemini_api_key';

function getStoredLocalGeminiKey(): { key: string; source: 'local-storage' | 'vite-env' | 'none' } {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = (window.localStorage.getItem(LOCAL_KEY_STORAGE) || '').trim();
      if (stored) return { key: stored, source: 'local-storage' };
    }
  } catch {}
  try {
    const viteKey = String((import.meta as any)?.env?.VITE_GEMINI_API_KEY || '').trim();
    if (viteKey) return { key: viteKey, source: 'vite-env' };
  } catch {}
  return { key: '', source: 'none' };
}

function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  const { key } = getStoredLocalGeminiKey();
  if (key) {
    if (/^AQ\./i.test(key) || /^ya29\./i.test(key)) {
      headers.Authorization = `Bearer ${key}`;
    } else {
      headers['x-gemini-api-key'] = key;
    }
  }
  return headers;
}

export function extractExactApiErrorMessage(payload: any, fallback: string): string {
  const msg =
    payload?.error?.message ||
    payload?.status?.message ||
    (typeof payload?.error === 'string' ? payload.error : '') ||
    payload?.message ||
    '';
  return String(msg).trim() || fallback;
}

export async function parseApiJsonSafe(res: Response): Promise<{
  isJson: boolean;
  isHtmlFallback: boolean;
  payload: any;
}> {
  const contentType = String(res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    try {
      const payload = await res.json();
      return { isJson: true, isHtmlFallback: false, payload };
    } catch {
      return { isJson: false, isHtmlFallback: false, payload: null };
    }
  }
  const rawText = await res.text().catch(() => '');
  const trimmed = rawText.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const payload = JSON.parse(trimmed);
      return { isJson: true, isHtmlFallback: false, payload };
    } catch {}
  }
  const isHtmlFallback =
    contentType.includes('text/html') ||
    /^<!doctype\s+html/i.test(trimmed) ||
    /^<html/i.test(trimmed);
  return { isJson: false, isHtmlFallback, payload: rawText };
}

async function createDirectGoogleGenAIClient(rawKey: string) {
  const { GoogleGenAI } = await import('@google/genai');
  const isBearer = /^AQ\./i.test(rawKey) || /^ya29\./i.test(rawKey);
  return new GoogleGenAI({
    apiKey: isBearer ? 'oauth-bearer' : rawKey,
    httpOptions: isBearer
      ? {
          headers: {
            Authorization: `Bearer ${rawKey}`
          }
        }
      : undefined
  });
}

const directVeoOpsCache = new Map<string, any>();

export function buildPromptFromShot(frame: AnthologyFrame | null | undefined, shotIndex: number): string {
  if (!frame) {
    return `Cinematic film still for Shot #${String(shotIndex + 1).padStart(2, '0')}, ultra-detailed ARRI Alexa LF photography, dramatic lighting.`;
  }
  const shotLabel = `Shot #${String(shotIndex + 1).padStart(2, '0')}`;
  const titles = [frame.title, frame.bengaliTitle].filter((v) => v && v.trim().length > 0).join(' / ');
  const lensBits = [
    frame.cameraSpec?.focalLength,
    frame.cameraSpec?.aperture,
    frame.cameraSpec?.sensor,
    frame.cameraSpec?.format
  ]
    .filter((v) => v && v.trim().length > 0)
    .join(', ');
  const narrative = [frame.tagline, frame.directorNotes].filter((v) => v && v.trim().length > 0).join(' — ');

  return [
    titles ? `${shotLabel} cinema frame: "${titles}".` : `${shotLabel} cinema frame.`,
    narrative ? `Scene action & mood: ${narrative}.` : '',
    lensBits ? `Optical rig: ${lensBits}.` : '',
    'Motion picture color science, moody chiaroscuro contrast, photorealistic cinema production still.'
  ]
    .filter(Boolean)
    .join(' ');
}

export function dataUrlToBlob(dataUrl: string, fallbackMime = 'image/png'): { blob: Blob; mimeType: string } {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) {
    throw new Error('Expected base64 data URL payload');
  }
  const mimeType = match[1] || fallbackMime;
  const base64 = match[2].replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { blob: new Blob([bytes], { type: mimeType }), mimeType };
}

export async function mediaSourceToBase64(urlOrData: string): Promise<{ base64: string; mimeType: string }> {
  if (!urlOrData) {
    throw new Error('Empty media source');
  }
  if (urlOrData.startsWith('data:')) {
    const match = /^data:([^;]+);base64,(.*)$/s.exec(urlOrData);
    if (match) {
      return { mimeType: match[1] || 'image/png', base64: match[2] };
    }
  }
  const res = await fetch(urlOrData);
  if (!res.ok) {
    throw new Error(`Unable to read reference image (${res.status})`);
  }
  const blob = await res.blob();
  const base64 = await blobToBase64(blob);
  return { mimeType: blob.type || 'image/png', base64 };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const idx = result.indexOf(',');
      resolve(idx !== -1 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to encode blob to base64'));
    reader.readAsDataURL(blob);
  });
}

export async function persistGeneratedBlobToVault(
  blob: Blob,
  filename: string
): Promise<{ vaultItem: VaultMediaItem | null; previewUrl: string }> {
  const file = blob instanceof File ? blob : new File([blob], filename, { type: blob.type || 'application/octet-stream' });

  let vaultItem: VaultMediaItem | null = null;
  try {
    vaultItem = await studioDraftDb.saveMediaToVault(file);
  } catch {
    vaultItem = null;
  }

  try {
    const root = await opfsMediaStorage.getRootDirectory();
    if (root) {
      const vaultDir = await root.getDirectoryHandle('media_vault', { create: true });
      const fh = await vaultDir.getFileHandle(file.name, { create: true });
      const writable = await fh.createWritable();
      await writable.write(file);
      await writable.close();
    }
  } catch {
    // Graceful OPFS fallback when quota/permissions restrict OPFS in private contexts
  }

  const previewUrl = vaultItem
    ? studioDraftDb.getActiveMediaUrl(vaultItem.id, vaultItem.blob)
    : URL.createObjectURL(file);

  eventBus.emit('media:vault_updated', {
    vaultId: vaultItem?.id,
    name: file.name,
    mimeType: file.type
  });

  return { vaultItem, previewUrl };
}

export async function getAiEngineStatus(): Promise<AiEngineStatusResponse> {
  const local = getStoredLocalGeminiKey();
  const endpoints = ['/api/ai/status', '/api/ai-config', '/api/ai-key'];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { headers: buildAuthHeaders() });
      if (!res.ok) continue;
      const parsed = await parseApiJsonSafe(res);
      if (!parsed.isJson || !parsed.payload) continue;
      const data = parsed.payload;
      const serverConnected = Boolean(data?.connected);
      return {
        connected: serverConnected || local.key.length > 0,
        source: serverConnected ? 'server-env' : local.source,
        models: {
          imageFast: data?.models?.imageFast || 'gemini-2.5-flash-image',
          imageFallback: data?.models?.imageFallback || 'imagen-3.0-generate-002',
          imagePro: data?.models?.imagePro || 'gemini-nano-banana-2.1',
          videoFlow: data?.models?.videoFlow || 'veo-2.0-generate-001'
        }
      };
    } catch {
      // Try next endpoint / local fallback
    }
  }

  return {
    connected: local.key.length > 0,
    source: local.source,
    models: {
      imageFast: 'gemini-2.5-flash-image',
      imageFallback: 'imagen-3.0-generate-002',
      imagePro: 'gemini-nano-banana-2.1',
      videoFlow: 'veo-2.0-generate-001'
    }
  };
}

async function generateImageDirectlyWithSdk(
  params: ImageGenerateParams,
  variationIndex: number,
  apiKey: string
): Promise<{ dataUrl: string; modelUsed: string }> {
  const ai = await createDirectGoogleGenAIClient(apiKey);
  const promptText =
    variationIndex > 0
      ? `${params.prompt} [Variation #${variationIndex + 1}, distinct framing nuance]`
      : params.prompt;
  const imagenAspect = params.aspectRatio === '21:9' ? '16:9' : params.aspectRatio;
  const enhancedPrompt =
    params.aspectRatio === '21:9'
      ? `${promptText}. Frame composition for 2.39:1 anamorphic cinema scope widescreen.`
      : promptText;

  const parts: any[] = [];
  if (params.referenceImageBase64) {
    const cleanRef = params.referenceImageBase64.replace(/^data:[^;]+;base64,/, '');
    if (cleanRef.length > 0) {
      parts.push({
        inlineData: {
          data: cleanRef,
          mimeType: params.referenceMimeType || 'image/png'
        }
      });
    }
  }
  parts.push({ text: enhancedPrompt });

  let lastErr: any = null;
  // Primary: gemini-2.5-flash-image via generateContent(responseModalities: ['IMAGE'])
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: ['IMAGE']
      }
    });
    const outParts = response?.candidates?.[0]?.content?.parts ?? [];
    for (const part of outParts) {
      if (part?.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        return {
          dataUrl: `data:${mimeType};base64,${part.inlineData.data}`,
          modelUsed: 'gemini-2.5-flash-image'
        };
      }
    }
    lastErr = new Error('gemini-2.5-flash-image returned no inlineData image parts.');
  } catch (err: any) {
    lastErr = err;
  }

  // Fallback: imagen-3.0-generate-002 via generateImages
  try {
    const imagenRes = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: enhancedPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: imagenAspect
      }
    });
    const imgObj = imagenRes?.generatedImages?.[0]?.image;
    if (imgObj?.imageBytes) {
      const mimeType = imgObj.mimeType || 'image/png';
      return {
        dataUrl: `data:${mimeType};base64,${imgObj.imageBytes}`,
        modelUsed: 'imagen-3.0-generate-002'
      };
    }
    lastErr = new Error('imagen-3.0-generate-002 returned an empty generatedImages response.');
  } catch (fallbackErr: any) {
    lastErr = fallbackErr || lastErr;
  }

  throw new Error(extractExactApiErrorMessage(lastErr, lastErr?.message || 'Gemini image generation failed'));
}

export async function generateSingleCinemaImage(
  params: ImageGenerateParams,
  variationIndex = 0
): Promise<GeneratedMediaAsset> {
  let imageUrl = '';
  let resolvedModel: string = params.model || 'gemini-2.5-flash-image';

  let shouldTryDirectSdk = false;
  let serverErrorMessage = '';

  try {
    const res = await fetch('/api/ai/image/generate', {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        prompt: variationIndex > 0
          ? `${params.prompt} [Variation #${variationIndex + 1}, distinct framing nuance]`
          : params.prompt,
        aspectRatio: params.aspectRatio,
        model: params.model,
        imageSize: params.imageSize || '1K',
        referenceImageBase64: params.referenceImageBase64,
        referenceMimeType: params.referenceMimeType
      })
    });

    const parsed = await parseApiJsonSafe(res);
    if (parsed.isJson && parsed.payload) {
      if (!res.ok || !parsed.payload?.success || !parsed.payload?.imageUrl) {
        serverErrorMessage = extractExactApiErrorMessage(
          parsed.payload,
          `Gemini image endpoint returned HTTP ${res.status} without image data.`
        );
      } else {
        imageUrl = parsed.payload.imageUrl;
        resolvedModel = parsed.payload.model || resolvedModel;
      }
    } else if (parsed.isHtmlFallback || !res.ok) {
      shouldTryDirectSdk = true;
      serverErrorMessage = `Static/SPA response (${res.status}) on /api/ai/image/generate — no Node API backend active.`;
    } else {
      shouldTryDirectSdk = true;
      serverErrorMessage = `Unexpected non-JSON response (${res.status}) from /api/ai/image/generate.`;
    }
  } catch (networkErr: any) {
    shouldTryDirectSdk = true;
    serverErrorMessage = networkErr?.message || 'Network error reaching /api/ai/image/generate';
  }

  if (!imageUrl) {
    const { key } = getStoredLocalGeminiKey();
    if (shouldTryDirectSdk && key) {
      const direct = await generateImageDirectlyWithSdk(params, variationIndex, key);
      imageUrl = direct.dataUrl;
      resolvedModel = direct.modelUsed;
    } else {
      throw new Error(serverErrorMessage || 'Gemini Image generation failed.');
    }
  }

  const { blob, mimeType } = dataUrlToBlob(imageUrl, 'image/png');
  const ext = mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
  const shotTag = typeof params.shotIndex === 'number' ? `SH${String(params.shotIndex + 1).padStart(2, '0')}_` : '';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(11, 19);
  const filename = `GEMINI_${shotTag}V${variationIndex + 1}_${stamp}.${ext}`;

  const { vaultItem, previewUrl } = await persistGeneratedBlobToVault(blob, filename);

  return {
    id: vaultItem?.id || `gen_img_${Date.now()}_${variationIndex}`,
    kind: 'IMAGE',
    name: filename,
    mimeType,
    previewUrl,
    blob,
    prompt: params.prompt,
    aspectRatio: params.aspectRatio,
    model: resolvedModel,
    createdAt: Date.now(),
    vaultId: vaultItem?.id
  };
}

export async function startFlowVideoGeneration(params: FlowVideoStartParams): Promise<{ interactionId: string; status: string }> {
  let shouldTryDirectSdk = false;
  let serverErrorMessage = '';

  try {
    const res = await fetch('/api/ai/video/generate', {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(params)
    });

    const parsed = await parseApiJsonSafe(res);
    if (parsed.isJson && parsed.payload) {
      if (!res.ok || !parsed.payload?.success || !parsed.payload?.interactionId) {
        throw new Error(extractExactApiErrorMessage(parsed.payload, `Failed to start Google Flow render (${res.status})`));
      }
      return {
        interactionId: String(parsed.payload.interactionId),
        status: String(parsed.payload.status || 'queued')
      };
    }
    if (parsed.isHtmlFallback || !res.ok) {
      shouldTryDirectSdk = true;
      serverErrorMessage = `Static/SPA response (${res.status}) on /api/ai/video/generate — no Node API backend active.`;
    }
  } catch (err: any) {
    if (!shouldTryDirectSdk && !/Static\/SPA|Failed to fetch|NetworkError/i.test(String(err?.message || ''))) {
      throw err;
    }
    shouldTryDirectSdk = true;
    serverErrorMessage = err?.message || 'Unable to reach /api/ai/video/generate';
  }

  const { key } = getStoredLocalGeminiKey();
  if (shouldTryDirectSdk && key) {
    const ai = await createDirectGoogleGenAIClient(key);
    const validAspect = params.aspectRatio === '9:16' ? '9:16' : '16:9';
    const motionDirectives = [
      params.prompt.trim() || 'Subtle cinematic camera choreography and atmospheric film lighting.',
      `Camera Movement: ${params.cameraMovement}.`,
      `Motion Intensity: ${params.motionIntensity}.`,
      '24fps cinema cadence, rich anamorphic depth of field, temporal coherence.',
      params.aspectRatio === '21:9' ? '2.39:1 widescreen anamorphic letterbox cinema framing.' : ''
    ].filter(Boolean).join(' ');
    const cleanStart = params.startFrameBase64
      ? params.startFrameBase64.replace(/^data:[^;]+;base64,/, '')
      : '';
    const operation = await ai.models.generateVideos({
      model: 'veo-2.0-generate-001',
      prompt: motionDirectives,
      ...(cleanStart
        ? {
            image: {
              imageBytes: cleanStart,
              mimeType: params.startFrameMimeType || 'image/png'
            }
          }
        : {}),
      config: {
        aspectRatio: validAspect,
        numberOfVideos: 1
      }
    });
    const opName = String(operation?.name || `veo_direct_${Date.now()}`);
    directVeoOpsCache.set(opName, operation);
    return {
      interactionId: opName,
      status: operation?.done ? 'completed' : 'queued'
    };
  }

  throw new Error(serverErrorMessage || 'Failed to start Google Flow / Veo video render.');
}

export async function pollFlowVideoStatus(interactionId: string): Promise<FlowVideoPollResult> {
  if (directVeoOpsCache.has(interactionId)) {
    const { key } = getStoredLocalGeminiKey();
    if (!key) {
      throw new Error('GEMINI_API_KEY missing while polling Veo operation.');
    }
    const ai = await createDirectGoogleGenAIClient(key);
    const prevOp = directVeoOpsCache.get(interactionId);
    const updatedOp = await ai.operations.getVideosOperation({ operation: prevOp });
    directVeoOpsCache.set(interactionId, updatedOp);

    if (updatedOp?.error) {
      return {
        status: 'failed',
        done: true,
        error: extractExactApiErrorMessage(updatedOp.error, 'Veo video generation failed.')
      };
    }

    if (updatedOp?.done) {
      const genVideo = updatedOp?.response?.generatedVideos?.[0]?.video;
      if (genVideo?.videoBytes) {
        const mime = genVideo.mimeType || 'video/mp4';
        return {
          status: 'completed',
          done: true,
          videoUrl: `data:${mime};base64,${genVideo.videoBytes}`,
          mimeType: mime
        };
      }
      if (genVideo?.uri) {
        const sep = genVideo.uri.includes('?') ? '&' : '?';
        const isBearer = /^AQ\./i.test(key) || /^ya29\./i.test(key);
        const signedUri = isBearer ? genVideo.uri : `${genVideo.uri}${sep}key=${encodeURIComponent(key)}`;
        return {
          status: 'completed',
          done: true,
          videoUrl: signedUri,
          mimeType: genVideo.mimeType || 'video/mp4'
        };
      }
      return {
        status: 'failed',
        done: true,
        error: 'Veo operation completed without video data.'
      };
    }

    return { status: 'in_progress', done: false };
  }

  const res = await fetch(`/api/ai/video/status/${encodeURIComponent(interactionId)}`, {
    headers: buildAuthHeaders()
  });
  const parsed = await parseApiJsonSafe(res);
  if (!parsed.isJson) {
    throw new Error(`Flow polling received non-JSON response (${res.status}).`);
  }
  const payload = parsed.payload;
  if (!res.ok && !payload?.done) {
    throw new Error(extractExactApiErrorMessage(payload, `Flow polling failed (${res.status})`));
  }
  return {
    status: String(payload?.status || 'in_progress'),
    done: Boolean(payload?.done),
    videoUrl: payload?.videoUrl,
    mimeType: payload?.mimeType || 'video/mp4',
    error: payload?.error ? extractExactApiErrorMessage(payload, payload.error) : undefined,
    code: payload?.code
  };
}

export async function cancelFlowVideoGeneration(interactionId: string): Promise<void> {
  directVeoOpsCache.delete(interactionId);
  await fetch(`/api/ai/video/cancel/${encodeURIComponent(interactionId)}`, {
    method: 'POST',
    headers: buildAuthHeaders()
  }).catch(() => null);
}

export async function resolveVideoUrlToVaultAsset(
  videoUrl: string,
  meta: { prompt: string; aspectRatio: AiAspectRatio; shotIndex?: number }
): Promise<GeneratedMediaAsset> {
  let blob: Blob;
  let mimeType = 'video/mp4';

  if (videoUrl.startsWith('data:')) {
    const parsed = dataUrlToBlob(videoUrl, 'video/mp4');
    blob = parsed.blob;
    mimeType = parsed.mimeType;
  } else {
    const { key } = getStoredLocalGeminiKey();
    const isBearer = Boolean(key && (/^AQ\./i.test(key) || /^ya29\./i.test(key)));
    const isExternalGoogleUri = videoUrl.startsWith('http');
    const res = await fetch(videoUrl, {
      headers: isExternalGoogleUri && isBearer && key ? { Authorization: `Bearer ${key}` } : buildAuthHeaders()
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch generated Flow MP4 (${res.status})`);
    }
    const rawBlob = await res.blob();
    mimeType = rawBlob.type || 'video/mp4';
    blob = rawBlob.type ? rawBlob : new Blob([rawBlob], { type: 'video/mp4' });
  }

  const shotTag = typeof meta.shotIndex === 'number' ? `SH${String(meta.shotIndex + 1).padStart(2, '0')}_` : '';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(11, 19);
  const filename = `FLOW_${shotTag}24FPS_${stamp}.mp4`;

  const { vaultItem, previewUrl } = await persistGeneratedBlobToVault(blob, filename);

  return {
    id: vaultItem?.id || `gen_vid_${Date.now()}`,
    kind: 'VIDEO',
    name: filename,
    mimeType,
    previewUrl,
    blob,
    prompt: meta.prompt,
    aspectRatio: meta.aspectRatio,
    model: 'veo-2.0-generate-001',
    createdAt: Date.now(),
    vaultId: vaultItem?.id
  };
}

export function resolveFlowProgressStage(elapsedSec: number, status: string): {
  label: string;
  percent: number;
} {
  if (status === 'completed') {
    return { label: 'COMPLETED // 24FPS MASTER READY', percent: 100 };
  }
  if (status === 'queued' || elapsedSec < 6) {
    return { label: 'INITIALIZING FLOW', percent: Math.min(28, 10 + elapsedSec * 3) };
  }
  if (elapsedSec < 24) {
    return { label: 'DIFFUSING MOTION VECTORS', percent: Math.min(72, 28 + (elapsedSec - 6) * 2.4) };
  }
  return { label: 'RENDERING 24FPS MP4', percent: Math.min(95, 72 + (elapsedSec - 24) * 0.6) };
}

export function triggerLocalDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }, 4000);
}
