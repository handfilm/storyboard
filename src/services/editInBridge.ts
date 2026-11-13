/**
 * @file /src/services/editInBridge.ts
 * @description Zero-Prompt External App ("EDIT IN") Bridge + Live Auto-Sync Watcher.
 * Dispatches active shot media/composite frame directly to /api/edit-in with zero
 * confirmation dialogs, arms SSE + poll watcher on /api/watch-asset/:shotId, and
 * emits 'edit-in:asset-synced' on Ctrl+S disk updates for instant cache-busted hot-swap.
 */

import { AnthologyFrame } from '../types/anthology';
import { resolveEffectiveTitleAlign, useStudioStore } from '../core/store';
import { eventBus } from '../core/eventBus';
import { getShotMediaBlob, getShotMediaKey, resolveShotMediaEntry } from './handfilmMediaVault';
import { renderProceduralBackdropToCanvas } from '../data/proceduralCinemaEngine';
import { captureCompositeCanvasPng, renderAlignedCinemaTitleOverlay } from '../utils/interchangeExport';
import { audioEngine } from './audioEngine';

export type ExternalEditApp = 'photoshop' | 'premiere' | 'illustrator' | 'capcut';

export const EXTERNAL_EDIT_APP_LABELS: Record<ExternalEditApp, string> = {
  photoshop: 'PHOTOSHOP',
  premiere: 'PREMIERE PRO',
  illustrator: 'ILLUSTRATOR',
  capcut: 'CAPCUT'
};

export interface EditInAssetSyncedPayload {
  shotId: string;
  shotIndex: number;
  app: ExternalEditApp;
  filename: string;
  mediaType: 'image' | 'video';
  mimeType: string;
  mtimeMs: number;
  assetUrl: string;
}

export interface EditInStatusPayload {
  app: ExternalEditApp;
  shotIndex: number;
  message: string;
  launched?: boolean;
}

interface ActiveWatcherEntry {
  source: EventSource | null;
  pollTimer: number | null;
  lastMtimeMs: number;
  shotIndex: number;
  app: ExternalEditApp;
}

const activeWatchers = new Map<string, ActiveWatcherEntry>();

function sanitizeClientShotId(frame: AnthologyFrame | null | undefined, shotIndex: number): string {
  const key = getShotMediaKey(frame, shotIndex);
  return `shot_${String(shotIndex + 1).padStart(2, '0')}_${String(key).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

async function renderShotOfflineCompositePng(
  shotIndex: number,
  frame: AnthologyFrame | null | undefined
): Promise<string | undefined> {
  if (typeof document === 'undefined') return undefined;

  const liveCanvas =
    (document.getElementById('stage-canvas') as HTMLCanvasElement | null) ||
    (document.querySelector('main canvas') as HTMLCanvasElement | null);
  if (liveCanvas) {
    const livePng = captureCompositeCanvasPng(liveCanvas);
    if (livePng) return livePng;
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = 1920;
  offscreen.height = 1080;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return undefined;

  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, 1920, 1080);

  const imgSrc = frame?.imageUrl && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(frame.imageUrl)
    ? frame.imageUrl
    : frame?.thumbnailUrl && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(frame.thumbnailUrl)
      ? frame.thumbnailUrl
      : '';

  if (imgSrc) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, 1920, 1080);
        } catch {}
        resolve();
      };
      img.onerror = () => resolve();
      img.src = imgSrc;
    });
  } else {
    renderProceduralBackdropToCanvas(ctx, 1920, 1080, shotIndex, 0);
  }

  const state = useStudioStore.getState();
  if (state.visibility.titlesAll && frame) {
    const effectiveAlign = resolveEffectiveTitleAlign(state.titleAlign, shotIndex, frame.shotType);
    renderAlignedCinemaTitleOverlay(ctx, 1920, 1080, {
      banglaTitle: frame.bengaliTitle || '',
      englishTitle: frame.title || '',
      dialogue: frame.directorNotes || frame.tagline || '',
      effectiveAlign,
      preset: state.titleConfig?.preset || 'molten-gold',
      verticalOffset: state.titleConfig?.verticalOffset ?? 0,
      titleSize: state.titleConfig?.titleSize ?? 72,
      opacity: state.visibility?.titleOpacity ?? 1
    });
  }

  return offscreen.toDataURL('image/png', 1.0);
}

export async function captureShotAssetPayload(
  app: ExternalEditApp,
  shotIndex: number,
  frame?: AnthologyFrame | null
): Promise<{
  shotId: string;
  shotIndex: number;
  filePath?: string;
  fileName: string;
  mimeType: string;
  dataUrl?: string;
  mediaUrl?: string;
}> {
  const shotId = sanitizeClientShotId(frame, shotIndex);
  const storeState = useStudioStore.getState();
  const vaultEntry = resolveShotMediaEntry(storeState.shotMediaMap, frame, undefined, shotIndex);
  const mediaKey = getShotMediaKey(frame, shotIndex);

  const isVideoTimelineApp = app === 'premiere' || app === 'capcut';
  const padded = String(shotIndex + 1).padStart(2, '0');

  if (vaultEntry?.nativePath) {
    return {
      shotId,
      shotIndex,
      filePath: vaultEntry.nativePath,
      fileName: vaultEntry.name || `shot_${padded}_${app}.${vaultEntry.type === 'video' ? 'mp4' : 'png'}`,
      mimeType: vaultEntry.mimeType || (vaultEntry.type === 'video' ? 'video/mp4' : 'image/png')
    };
  }

  const storedBlob = await getShotMediaBlob(mediaKey).catch(() => null);
  if (storedBlob && storedBlob.size > 0) {
    const isBlobVideo = (storedBlob.type || '').startsWith('video/') || vaultEntry?.type === 'video';
    if ((isVideoTimelineApp || !isBlobVideo) && storedBlob.size <= 75 * 1024 * 1024) {
      const dataUrl = await blobToDataUrl(storedBlob);
      const ext = isBlobVideo ? 'mp4' : storedBlob.type === 'image/jpeg' ? 'jpg' : 'png';
      return {
        shotId,
        shotIndex,
        fileName: vaultEntry?.name || `shot_${padded}_${app}.${ext}`,
        mimeType: storedBlob.type || (isBlobVideo ? 'video/mp4' : 'image/png'),
        dataUrl
      };
    }
  }

  // Fallback or Paint-Over mode: capture live 1920x1080 composite stage PNG frame
  const compositePng = await renderShotOfflineCompositePng(shotIndex, frame);
  return {
    shotId,
    shotIndex,
    fileName: `shot_${padded}_${app}.png`,
    mimeType: 'image/png',
    dataUrl: compositePng,
    mediaUrl: frame?.imageUrl
  };
}

function stopWatcher(shotId: string): void {
  const existing = activeWatchers.get(shotId);
  if (!existing) return;
  try {
    existing.source?.close();
  } catch {}
  if (existing.pollTimer !== null) {
    window.clearInterval(existing.pollTimer);
  }
  activeWatchers.delete(shotId);
}

export function startWatchingShotAsset(
  shotId: string,
  shotIndex: number,
  app: ExternalEditApp,
  initialMtimeMs: number = 0
): void {
  if (typeof window === 'undefined') return;
  stopWatcher(shotId);

  const entry: ActiveWatcherEntry = {
    source: null,
    pollTimer: null,
    lastMtimeMs: initialMtimeMs,
    shotIndex,
    app
  };

  const emitUpdate = (data: Partial<EditInAssetSyncedPayload> & { mtimeMs?: number; assetUrl?: string }) => {
    const mtime = Number(data.mtimeMs || 0);
    if (mtime && mtime <= entry.lastMtimeMs) return;
    if (mtime) entry.lastMtimeMs = mtime;

    const payload: EditInAssetSyncedPayload = {
      shotId,
      shotIndex: typeof data.shotIndex === 'number' ? data.shotIndex : entry.shotIndex,
      app: (data.app as ExternalEditApp) || entry.app,
      filename: data.filename || 'updated_asset',
      mediaType: data.mediaType || 'image',
      mimeType: data.mimeType || 'image/png',
      mtimeMs: mtime || Date.now(),
      assetUrl:
        data.assetUrl ||
        `/api/edit-in/asset/${encodeURIComponent(shotId)}/${encodeURIComponent(data.filename || 'master.png')}?t=${Date.now()}`
    };

    eventBus.emit('edit-in:asset-synced', payload);
  };

  if (typeof EventSource !== 'undefined') {
    try {
      const es = new EventSource(`/api/watch-asset/${encodeURIComponent(shotId)}`);
      es.addEventListener('asset-updated', (ev) => {
        try {
          const parsed = JSON.parse((ev as MessageEvent).data || '{}');
          emitUpdate(parsed);
        } catch {}
      });
      es.onerror = () => {
        // Fallback poll remains active if SSE drops
      };
      entry.source = es;
    } catch {
      // Rely on poll fallback
    }
  }

  // Lightweight fallback status poll (1200ms) in case SSE proxy buffers in sandboxed iframes
  entry.pollTimer = window.setInterval(async () => {
    try {
      const res = await fetch(`/api/watch-asset/${encodeURIComponent(shotId)}/status`, {
        cache: 'no-store'
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.active && json?.tracked?.currentMtimeMs > entry.lastMtimeMs + 1) {
        emitUpdate({
          shotId,
          shotIndex: json.tracked.shotIndex,
          app: json.tracked.app,
          filename: json.tracked.filename,
          mediaType: json.tracked.mediaType,
          mimeType: json.tracked.mimeType,
          mtimeMs: json.tracked.currentMtimeMs,
          assetUrl: json.tracked.assetUrl
        });
      }
    } catch {}
  }, 1200);

  activeWatchers.set(shotId, entry);
}

export async function launchExternalEdit(params: {
  app: ExternalEditApp;
  shotIndex: number;
  frame?: AnthologyFrame | null;
}): Promise<void> {
  const { app, shotIndex, frame } = params;
  const label = EXTERNAL_EDIT_APP_LABELS[app];

  try {
    audioEngine.playShutterClick();
  } catch {}

  eventBus.emit<EditInStatusPayload>('edit-in:status', {
    app,
    shotIndex,
    message: `WRITING SHOT #${String(shotIndex + 1).padStart(2, '0')} → ${label}...`
  });

  try {
    const payload = await captureShotAssetPayload(app, shotIndex, frame);
    const res = await fetch('/api/edit-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app,
        shotId: payload.shotId,
        shotIndex: payload.shotIndex,
        filePath: payload.filePath,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        dataUrl: payload.dataUrl,
        mediaUrl: payload.mediaUrl
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || 'Edit-In endpoint error');
    }

    startWatchingShotAsset(payload.shotId, shotIndex, app, Number(data.mtimeMs || 0));

    const msg = data.launched
      ? `OPENED IN ${label} · AUTO-SYNC ARMED`
      : `STAGED FOR ${label} · AUTO-SYNC WATCHER ARMED`;

    eventBus.emit<EditInStatusPayload>('edit-in:status', {
      app,
      shotIndex,
      message: msg,
      launched: Boolean(data.launched)
    });
  } catch (err: any) {
    eventBus.emit<EditInStatusPayload>('edit-in:status', {
      app,
      shotIndex,
      message: `BRIDGE ERROR (${label}): ${err?.message || 'Retry'}`
    });
  }
}

export function stopAllEditInWatchers(): void {
  for (const key of Array.from(activeWatchers.keys())) {
    stopWatcher(key);
  }
}
