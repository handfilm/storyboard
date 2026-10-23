/**
 * @file /src/services/multiCamRenderPipeline.ts
 * @description Real-Time Multi-Camera Composite Renderer & 9:16 Shorts Export Pipeline.
 * 
 * Capabilities:
 * 1. Cut Event Sequencer: Evaluates ordered cut events to determine exact active angle for any timestamp.
 * 2. 9:16 Center-Crop Transformer: Intelligently crops landscape (16:9) and square angles into 1080x1920 vertical shorts.
 * 3. Master Audio Route: Binds the master audio angle's sound stream to the composite render without cut transients.
 * 4. High-Efficiency Muxer: Records via Canvas Stream + MediaRecorder into high-bitrate WebM/MP4.
 * 5. Instant IndexedDB Commit: Automatically stores rendered output into `media_vault` as an ingested asset.
 */

import { MultiCamGroup, MultiCamCutEvent } from '../types/multicam';
import { db, VaultMediaItem } from './db';
import { useStudioStore } from '../core/store';
import { eventBus } from '../core/eventBus';

export interface MultiCamRenderOptions {
  width?: number; // Default 1080 for 9:16 Shorts
  height?: number; // Default 1920 for 9:16 Shorts
  fps?: number; // Default 30 or 60
  bitrate?: number; // Default 12_000_000 (12 Mbps)
  onProgress?: (progressPercent: number, statusMessage: string) => void;
}

export interface MultiCamRenderResult {
  file: File;
  blobUrl: string;
  vaultItem: VaultMediaItem;
  durationSec: number;
}

export class MultiCamRenderPipeline {
  /**
   * Helper to determine which angle is active at a given time in milliseconds.
   */
  public getActiveAngleIndexAtTime(cutEvents: MultiCamCutEvent[], timeMs: number, defaultIndex = 0): number {
    if (!cutEvents || cutEvents.length === 0) return defaultIndex;
    const sorted = [...cutEvents].sort((a, b) => a.timeMs - b.timeMs);
    let active = defaultIndex;
    for (const cut of sorted) {
      if (cut.timeMs <= timeMs) {
        active = cut.angleIndex;
      } else {
        break;
      }
    }
    return active;
  }

  /**
   * Slices the MultiCamGroup sequence and maps each cut segment into the Master Timeline (Shots 001-100).
   */
  public sendMultiCamSequenceToMasterTimeline(group: MultiCamGroup): number {
    const durationMs = group.durationMs || Math.round((group.duration || 15) * 1000);
    const cuts = [...group.cutEvents].sort((a, b) => a.timeMs - b.timeMs);
    if (cuts.length === 0 || cuts[0].timeMs > 0) {
      cuts.unshift({ id: 'cut-init', timeMs: 0, angleIndex: group.activeAngleIndex || 0 });
    }

    const segments: Array<{
      startMs: number;
      endMs: number;
      durationMs: number;
      angleIndex: number;
    }> = [];

    for (let i = 0; i < cuts.length; i++) {
      const current = cuts[i];
      const nextTime = (i < cuts.length - 1) ? cuts[i + 1].timeMs : durationMs;
      const segDuration = Math.max(500, nextTime - current.timeMs);
      segments.push({
        startMs: current.timeMs,
        endMs: nextTime,
        durationMs: segDuration,
        angleIndex: current.angleIndex,
      });
    }

    // Map segments to shots 001-100 in master store
    const store = useStudioStore.getState();
    const count = Math.min(segments.length, 100);

    for (let i = 0; i < count; i++) {
      const seg = segments[i];
      const angle = group.angles[seg.angleIndex] || group.angles[0];
      const durSec = +(seg.durationMs / 1000).toFixed(1);

      store.updateShot(i, {
        imageUrl: angle.blobUrl,
        isVideo: true,
        title: `${group.name} - ${angle.label}`,
        tagline: `CAM ${seg.angleIndex + 1} // IN: ${(seg.startMs / 1000).toFixed(2)}s - OUT: ${(seg.endMs / 1000).toFixed(2)}s`,
        directorNotes: `Multi-camera live switched angle (${angle.label}). Duration: ${durSec}s. Sync offset: ${angle.syncOffsetMs || 0}ms.`,
        durationSeconds: Math.max(1.0, durSec),
        aspectRatio: group.aspectRatio === '9:16' ? '9:16' : (group.aspectRatio === '1:1' ? '1:1' : '16:9'),
        status: 'planned'
      });
    }

    // Set first shot as active
    store.setActiveShotIndex(0);
    eventBus.emit('multicam:sent_to_timeline', { count, groupName: group.name });
    return count;
  }

  /**
   * Renders the complete MultiCamGroup into a vertical 9:16 Short (or custom aspect ratio)
   * and commits it to the IndexedDB media vault.
   */
  public async renderMultiCamGroup(
    group: MultiCamGroup,
    options: MultiCamRenderOptions = {}
  ): Promise<MultiCamRenderResult> {
    const isVertical = group.aspectRatio === '9:16';
    const targetW = options.width || (isVertical ? 1080 : 1920);
    const targetH = options.height || (isVertical ? 1920 : 1080);
    const fps = options.fps || 30;
    const bitrate = options.bitrate || 10_000_000;
    const onProgress = options.onProgress;

    onProgress?.(5, 'Preparing multi-angle media sources...');

    // 1. Prepare video elements for all angles
    const videoElements: HTMLVideoElement[] = [];
    for (let i = 0; i < group.angles.length; i++) {
      const angle = group.angles[i];
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = angle.blobUrl;
      videoElements.push(video);
    }

    // Wait for all videos to load metadata
    await Promise.all(
      videoElements.map((v) => {
        return new Promise<void>((resolve) => {
          if (v.readyState >= 1) {
            resolve();
          } else {
            v.onloadedmetadata = () => resolve();
            v.onerror = () => resolve();
          }
        });
      })
    );

    // 2. Setup Master Audio
    const masterIdx = Math.max(0, Math.min(group.angles.length - 1, group.masterAudioAngleIndex));
    const masterAudioVideo = document.createElement('video');
    masterAudioVideo.src = group.angles[masterIdx].blobUrl;
    masterAudioVideo.muted = false;
    masterAudioVideo.preload = 'auto';

    // 3. Setup Offscreen Canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Failed to create 2D rendering context for multi-cam pipeline');
    }

    // 4. Setup AudioContext and Stream
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx();
    const dest = audioCtx.createMediaStreamDestination();

    let audioSource: MediaElementAudioSourceNode | null = null;
    try {
      audioSource = audioCtx.createMediaElementSource(masterAudioVideo);
      audioSource.connect(dest);
    } catch (e) {
      console.warn('[MultiCamRender] Could not route audio source node:', e);
    }

    // Combine canvas video stream and audio destination
    const videoStream = canvas.captureStream(fps);
    const combinedTracks = [
      ...videoStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ];
    const combinedStream = new MediaStream(combinedTracks);

    // 5. Codec support
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
    }

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: bitrate
    });

    const recordedChunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    onProgress?.(15, 'Compositing multi-camera sequence...');

    const durationSec = group.duration || (group.durationMs ? group.durationMs / 1000 : 15);
    const totalFrames = Math.ceil(durationSec * fps);
    const frameIntervalMs = 1000 / fps;

    recorder.start(1000);

    // Function to draw video frame with center-crop
    const drawVideoCover = (v: HTMLVideoElement) => {
      const vw = v.videoWidth || 1920;
      const vh = v.videoHeight || 1080;
      const scale = Math.max(targetW / vw, targetH / vh);
      const drawW = vw * scale;
      const drawH = vh * scale;
      const drawX = (targetW - drawW) / 2;
      const drawY = (targetH - drawH) / 2;

      ctx.fillStyle = '#08090C';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(v, drawX, drawY, drawW, drawH);
    };

    // Render loop frame by frame
    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      const currentSec = frameIdx / fps;
      const currentMs = currentSec * 1000;
      const activeAngleIdx = this.getActiveAngleIndexAtTime(group.cutEvents, currentMs, group.activeAngleIndex || 0);

      const targetVideo = videoElements[activeAngleIdx] || videoElements[0];
      const angle = group.angles[activeAngleIdx] || group.angles[0];

      // Seek video to synced time
      const videoTime = Math.max(0, (currentMs - (angle.syncOffsetMs || 0)) / 1000);
      if (Math.abs(targetVideo.currentTime - videoTime) > 0.05) {
        targetVideo.currentTime = videoTime;
        // Brief await for video seek
        await new Promise<void>((res) => {
          const onSeek = () => {
            targetVideo.removeEventListener('seeked', onSeek);
            res();
          };
          targetVideo.addEventListener('seeked', onSeek);
          setTimeout(res, 20); // Fallback timeout
        });
      }

      drawVideoCover(targetVideo);

      // Report progress
      if (frameIdx % 15 === 0 || frameIdx === totalFrames - 1) {
        const percent = Math.round(15 + (frameIdx / totalFrames) * 75);
        onProgress?.(percent, `Rendering frame ${frameIdx + 1}/${totalFrames} (${currentSec.toFixed(1)}s / ${durationSec.toFixed(1)}s)...`);
      }

      // Small tick delay to let recorder capture canvas frame
      await new Promise(r => setTimeout(r, Math.max(1, Math.floor(frameIntervalMs * 0.4))));
    }

    onProgress?.(92, 'Finalizing video stream...');
    recorder.stop();

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    try {
      await audioCtx.close();
    } catch {}

    onProgress?.(96, 'Saving composite short to Media Vault...');

    const finalBlob = new Blob(recordedChunks, { type: mimeType });
    const filename = `${group.name.replace(/\s+/g, '_').toLowerCase()}_shorts_${Date.now()}.webm`;
    const finalFile = new File([finalBlob], filename, { type: mimeType, lastModified: Date.now() });

    // Commit directly into IndexedDB media_vault
    const vaultItem = await db.saveMediaToVault(finalFile);
    const blobUrl = URL.createObjectURL(finalBlob);

    onProgress?.(100, 'Multi-Camera Short successfully exported!');

    return {
      file: finalFile,
      blobUrl,
      vaultItem,
      durationSec
    };
  }
}

export const multiCamRenderPipeline = new MultiCamRenderPipeline();
