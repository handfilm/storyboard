/**
 * @file /src/utils/vlcAudioPreamp.ts
 * @description VLC-style 0%–200% Software Preamp Gain Controller for HTMLMediaElement.
 * Routes eligible local/blob/CORS-enabled media elements through a Web Audio GainNode
 * (cached per element in a WeakMap) so gain > 1.0 amplifies quiet footage up to 200%,
 * while gracefully falling back to native element.volume on CORS-restricted URLs.
 */

interface AttachedAudioNode {
  ctx: AudioContext;
  gainNode: GainNode;
  sourceNode: MediaElementAudioSourceNode;
  failedCors?: boolean;
}

const mediaAudioNodes = new WeakMap<HTMLMediaElement, AttachedAudioNode>();
const blockedElements = new WeakSet<HTMLMediaElement>();

let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedAudioCtx) return sharedAudioCtx;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  try {
    sharedAudioCtx = new Ctx();
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function resumeVlcAudioContext(): void {
  const ctx = getSharedAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

function canUseWebAudioPreamp(el: HTMLMediaElement): boolean {
  const src = el.currentSrc || el.getAttribute('src') || '';
  if (!src) return false;
  if (src.startsWith('blob:') || src.startsWith('data:')) return true;
  if (typeof window !== 'undefined' && src.startsWith(window.location.origin)) return true;
  if (el.crossOrigin === 'anonymous' || el.crossOrigin === 'use-credentials') return true;
  return false;
}

/**
 * Applies VLC-style gain [0.0 .. 2.0] and mute state to an HTMLMediaElement.
 * Gain <= 1.0 uses clean native element.volume unless WebAudio is already attached.
 * Gain > 1.0 engages WebAudio GainNode amplification for local/blob/same-origin media.
 */
export function applyVlcMediaGain(
  el: HTMLMediaElement | null | undefined,
  gain: number,
  isMuted: boolean
): void {
  if (!el) return;

  const clampedGain = Math.max(0, Math.min(2.0, Number.isFinite(gain) ? gain : 1.0));
  const targetGain = isMuted ? 0 : clampedGain;

  el.muted = isMuted || targetGain <= 0.001;

  const existing = mediaAudioNodes.get(el);
  if (existing && !existing.failedCors) {
    el.volume = 1.0;
    try {
      if (existing.ctx.state === 'suspended' && !el.muted) {
        existing.ctx.resume().catch(() => {});
      }
      existing.gainNode.gain.setTargetAtTime(targetGain, existing.ctx.currentTime, 0.015);
      return;
    } catch {
      existing.failedCors = true;
    }
  }

  // Only attach MediaElementAudioSourceNode when boost > 1.01 is needed & safe,
  // preserving full native playback compatibility for ordinary 0-100% streams.
  if (targetGain > 1.01 && !blockedElements.has(el) && canUseWebAudioPreamp(el)) {
    const ctx = getSharedAudioContext();
    if (ctx) {
      try {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const sourceNode = ctx.createMediaElementSource(el);
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(targetGain, ctx.currentTime);
        sourceNode.connect(gainNode);
        gainNode.connect(ctx.destination);
        mediaAudioNodes.set(el, { ctx, gainNode, sourceNode });
        el.volume = 1.0;
        return;
      } catch {
        blockedElements.add(el);
      }
    }
  }

  // Standard HTML5 clamped fallback [0..1]
  try {
    el.volume = Math.max(0, Math.min(1, targetGain));
  } catch {
    // ignore read-only volume environments (iOS Safari)
  }
}
