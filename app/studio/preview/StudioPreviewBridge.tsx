'use client';

import { useEffect } from 'react';
import { validateSceneConfig, type SceneMode } from '@/lib/scene-config';
import {
  STUDIO_PREVIEW_MESSAGE,
  STUDIO_TOGGLE_UI_MESSAGE,
  isSceneMode,
  type StudioPreviewMessage,
} from '@/lib/studio-preview-protocol';
import { getStudioViewportPreset, type StudioViewportPresetId } from '@/lib/studio-viewport';

export default function StudioPreviewBridge({
  initialMode,
  initialViewport,
}: {
  initialMode: SceneMode;
  initialViewport: StudioViewportPresetId;
}) {
  useEffect(() => {
    const root = document.documentElement;

    const applyEnvironment = (mode: SceneMode, viewport: StudioViewportPresetId) => {
      root.dataset.studioPreview = 'true';
      root.dataset.studioMode = mode;
      root.dataset.studioViewport = viewport;
    };

    applyEnvironment(initialMode, initialViewport);

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const message = event.data;
      if (!message || typeof message !== 'object') return;

      const candidate = message as Partial<StudioPreviewMessage>;
      if (candidate.type !== STUDIO_PREVIEW_MESSAGE || !isSceneMode(candidate.mode)) return;
      const viewport = getStudioViewportPreset(candidate.viewport);
      applyEnvironment(candidate.mode, viewport.id);

      if (candidate.sceneDraft !== undefined) {
        const validation = validateSceneConfig(candidate.sceneDraft);
        if (validation.ok) {
          window.dispatchEvent(new CustomEvent('day-atlas:scene-draft', { detail: validation.value }));
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'h' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }
      event.preventDefault();
      window.parent.postMessage({ type: STUDIO_TOGGLE_UI_MESSAGE }, window.location.origin);
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('keydown', handleKeyDown);
    window.parent.postMessage({ type: 'day-atlas:studio-preview-ready' }, window.location.origin);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
      delete root.dataset.studioPreview;
      delete root.dataset.studioMode;
      delete root.dataset.studioViewport;
    };
  }, [initialMode, initialViewport]);

  return null;
}
