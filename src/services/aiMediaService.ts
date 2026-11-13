/**
 * @file /src/services/aiMediaService.ts
 * @description Server-proxied Gemini Cinema Image & Google Flow / Veo Motion service
 * with OPFS + IndexedDB Media Vault auto-persistence and shot-aware prompt synthesis.
 */

import { AnthologyFrame } from '../types/anthology';
import { studioDraftDb, VaultMediaItem } from './db';
import { opfsMediaStorage } from './media/opfsMediaStorage';
import { eventBus } from '../core/eventBus';

export type GeminiImageModelId = 'gemini-3.1-flash-lite-image' | 'gemini-nano-banana-2.1';
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
  models: {
    imageFast: string;
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
  const res = await fetch('/api/ai/status');
  if (!res.ok) {
    throw new Error(`Status check failed (${res.status})`);
  }
  const data = await res.json();
  return {
    connected: Boolean(data?.connected),
    models: {
      imageFast: data?.models?.imageFast || 'gemini-3.1-flash-lite-image',
      imagePro: data?.models?.imagePro || 'gemini-nano-banana-2.1',
      videoFlow: data?.models?.videoFlow || 'gemini-omni-1.2-flash'
    }
  };
}

export async function generateSingleCinemaImage(
  params: ImageGenerateParams,
  variationIndex = 0
): Promise<GeneratedMediaAsset> {
  const res = await fetch('/api/ai/image/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload?.success || !payload?.imageUrl) {
    throw new Error(payload?.error || `Gemini Image generation failed (${res.status})`);
  }

  const { blob, mimeType } = dataUrlToBlob(payload.imageUrl, 'image/png');
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
    model: payload.model || params.model,
    createdAt: Date.now(),
    vaultId: vaultItem?.id
  };
}

export async function startFlowVideoGeneration(params: FlowVideoStartParams): Promise<{ interactionId: string; status: string }> {
  const res = await fetch('/api/ai/video/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload?.success || !payload?.interactionId) {
    throw new Error(payload?.error || `Failed to start Google Flow render (${res.status})`);
  }

  return {
    interactionId: String(payload.interactionId),
    status: String(payload.status || 'queued')
  };
}

export async function pollFlowVideoStatus(interactionId: string): Promise<FlowVideoPollResult> {
  const res = await fetch(`/api/ai/video/status/${encodeURIComponent(interactionId)}`);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok && !payload?.done) {
    throw new Error(payload?.error || `Flow polling failed (${res.status})`);
  }
  return {
    status: String(payload?.status || 'in_progress'),
    done: Boolean(payload?.done),
    videoUrl: payload?.videoUrl,
    mimeType: payload?.mimeType || 'video/mp4',
    error: payload?.error,
    code: payload?.code
  };
}

export async function cancelFlowVideoGeneration(interactionId: string): Promise<void> {
  await fetch(`/api/ai/video/cancel/${encodeURIComponent(interactionId)}`, {
    method: 'POST'
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
    const res = await fetch(videoUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch generated Flow MP4 (${res.status})`);
    }
    blob = await res.blob();
    mimeType = blob.type || 'video/mp4';
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
    model: 'gemini-omni-1.2-flash',
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
