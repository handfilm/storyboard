/**
 * @file /src/hooks/useTitleContainerRepaint.ts
 * @description Listens for changes in the component visibility state and triggers
 * a forced DOM reflow/repaint of the targeted title container element if the title
 * visibility state is toggled ON while the DOM element remains hidden.
 */

import { useEffect, useState, RefObject } from 'react';
import { ComponentVisibility } from '../components/ComponentsMatrixPopover';
import { useStudioStore } from '../core/store';

export interface UseTitleContainerRepaintOptions {
  containerRef: RefObject<HTMLElement | null>;
  visibility?: ComponentVisibility;
  isVisible: boolean;
  label?: string;
  activeKey?: string | number;
}

function isElementVisuallyHidden(
  el: HTMLElement,
  checkOpacity: boolean,
  targetOpacity: number
): {
  hidden: boolean;
  reason: string;
  diagnostics: Record<string, unknown>;
} {
  const computed = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const parsedOpacity = parseFloat(computed.opacity || '1');

  const clusterEl = el.querySelector<HTMLElement>('[data-title-cluster]');
  const clusterComputed = clusterEl ? window.getComputedStyle(clusterEl) : null;
  const clusterOpacity = clusterComputed ? parseFloat(clusterComputed.opacity || '1') : 1;

  const diagnostics = {
    display: computed.display,
    visibility: computed.visibility,
    opacity: computed.opacity,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    hasHiddenClass: el.classList.contains('hidden'),
    hasOpacityZeroClass: el.classList.contains('opacity-0'),
    clusterOpacity: clusterComputed?.opacity ?? 'n/a'
  };

  if (computed.display === 'none' || el.classList.contains('hidden')) {
    return { hidden: true, reason: 'display:none', diagnostics };
  }
  if (computed.visibility === 'hidden' || computed.visibility === 'collapse') {
    return { hidden: true, reason: `visibility:${computed.visibility}`, diagnostics };
  }
  if (el.classList.contains('opacity-0')) {
    return { hidden: true, reason: 'class:opacity-0', diagnostics };
  }
  if (rect.width === 0 || rect.height === 0) {
    return { hidden: true, reason: `zero-bounds:${rect.width}x${rect.height}`, diagnostics };
  }
  const isDirectTitleBlock = el.classList.contains('title-block');
  const expectedElOpacity = isDirectTitleBlock ? targetOpacity : 1;
  if (
    checkOpacity &&
    expectedElOpacity > 0.02 &&
    parsedOpacity < Math.min(0.05, expectedElOpacity * 0.5)
  ) {
    return { hidden: true, reason: `computed-opacity:${computed.opacity}`, diagnostics };
  }
  if (clusterEl && clusterComputed) {
    if (
      clusterComputed.display === 'none' ||
      clusterComputed.visibility === 'hidden' ||
      clusterEl.classList.contains('opacity-0') ||
      (checkOpacity && targetOpacity > 0.02 && clusterOpacity < 0.05)
    ) {
      return { hidden: true, reason: 'inner-title-cluster-hidden', diagnostics };
    }
  }

  return { hidden: false, reason: 'visible', diagnostics };
}

function forceTitleContainerRepaint(
  el: HTMLElement,
  label: string,
  reason: string,
  targetOpacity: number
): void {
  const computed = window.getComputedStyle(el);
  const previousTransform = el.style.transform;
  const isDirectTitleBlock = el.classList.contains('title-block');

  el.classList.remove('hidden', 'opacity-0', 'invisible');
  if (computed.display === 'none') {
    el.style.display = 'flex';
  }
  el.style.visibility = 'visible';
  if (isDirectTitleBlock) {
    el.style.removeProperty('opacity');
    document.documentElement.style.setProperty('--title-block-opacity', String(targetOpacity));
  } else {
    el.style.opacity = '1';
  }
  el.style.willChange = 'transform, opacity';

  const nestedTitleBlock = !isDirectTitleBlock ? el.querySelector<HTMLElement>('.title-block') : null;
  if (nestedTitleBlock) {
    nestedTitleBlock.classList.remove('hidden', 'opacity-0', 'invisible');
    nestedTitleBlock.style.visibility = 'visible';
    nestedTitleBlock.style.removeProperty('opacity');
    document.documentElement.style.setProperty('--title-block-opacity', String(targetOpacity));
  }

  const clusterEl = el.querySelector<HTMLElement>('[data-title-cluster]');
  if (clusterEl && clusterEl !== el && !clusterEl.classList.contains('title-block')) {
    clusterEl.classList.remove('hidden', 'opacity-0', 'invisible');
    clusterEl.style.visibility = 'visible';
    clusterEl.style.opacity = '1';
  }

  // Synchronous layout read forces browser reflow before compositor nudge
  void el.offsetHeight;
  el.setAttribute('data-repaint-ts', String(Date.now()));
  el.style.transform = previousTransform
    ? `${previousTransform} translateZ(0)`
    : 'translateZ(0)';

  requestAnimationFrame(() => {
    void el.getBoundingClientRect();
    el.style.transform = previousTransform;
    console.log(`[useTitleContainerRepaint:${label}] Forced repaint completed (reason: ${reason})`);
  });
}

export function useTitleContainerRepaint({
  containerRef,
  visibility,
  isVisible,
  label = 'TitleContainer',
  activeKey
}: UseTitleContainerRepaintOptions): number {
  const [repaintRevision, setRepaintRevision] = useState(0);

  const storeTitlesAll = useStudioStore((s) => s.visibility.titlesAll);
  const storeShowTitles = useStudioStore((s) => s.titleConfig?.showTitles ?? true);
  const storeTitleOpacity = useStudioStore((s) => s.titleConfig?.titleOpacity ?? 1.0);

  const titlesAll = visibility?.titlesAll ?? storeTitlesAll;
  const titleBn = visibility?.titleBn ?? true;
  const titleEn = visibility?.titleEn ?? true;
  const tagline = visibility?.tagline ?? true;
  const targetOpacity = Math.max(
    0,
    Math.min(1.0, visibility?.titleOpacity ?? storeTitleOpacity ?? 1.0)
  );

  useEffect(() => {
    console.log(`[useTitleContainerRepaint:${label}] Visibility state evaluated:`, {
      isVisible,
      titlesAll,
      titleBn,
      titleEn,
      tagline,
      targetOpacity,
      storeTitlesAll,
      storeShowTitles,
      activeKey,
      hasContainerRef: Boolean(containerRef.current)
    });

    if (!isVisible) {
      return;
    }

    let rafId: number | null = null;
    let settleTimerId: ReturnType<typeof setTimeout> | null = null;

    const inspectAndRepaintIfHidden = (checkOpacity: boolean, phase: 'immediate' | 'post-animation') => {
      const el = containerRef.current;
      if (!el) {
        console.log(`[useTitleContainerRepaint:${label}] (${phase}) Title state is ON; awaiting container ref mount.`);
        return;
      }

      const check = isElementVisuallyHidden(el, checkOpacity, targetOpacity);
      if (check.hidden) {
        console.warn(
          `[useTitleContainerRepaint:${label}] (${phase}) State is ON but title container DOM remained hidden (${check.reason}) — forcing repaint.`,
          check.diagnostics
        );
        forceTitleContainerRepaint(el, label, check.reason, targetOpacity);
        setRepaintRevision((rev) => rev + 1);
      } else {
        console.log(
          `[useTitleContainerRepaint:${label}] (${phase}) Title container verified visible in DOM:`,
          check.diagnostics
        );
      }
    };

    rafId = requestAnimationFrame(() => {
      inspectAndRepaintIfHidden(false, 'immediate');
    });

    // Verify opacity after entrance keyframes (480ms-500ms) settle
    settleTimerId = setTimeout(() => {
      inspectAndRepaintIfHidden(true, 'post-animation');
    }, 540);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (settleTimerId !== null) clearTimeout(settleTimerId);
    };
  }, [
    containerRef,
    isVisible,
    titlesAll,
    titleBn,
    titleEn,
    tagline,
    targetOpacity,
    storeTitlesAll,
    storeShowTitles,
    activeKey,
    label
  ]);

  return repaintRevision;
}
