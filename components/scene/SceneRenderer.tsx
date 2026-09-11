'use client';
/* eslint-disable @next/next/no-img-element -- generic Studio assets are validated paths and are not public LCP content. */

import { useEffect, useState } from 'react';
import EspressoCorner from '@/components/ui/EspressoCorner';
import InkBottleCorner from '@/components/ui/InkBottleCorner';
import SeasonalDeskObject from '@/components/ui/SeasonalDeskObject';
import { HOME_SCENE_BASELINE_V1 } from '@/lib/scene-baseline';
import { resolveSceneConfig, sceneConfigToCss } from '@/lib/scene-config';
import { getSceneObject, getScenePresetOverrideId, resolveSceneObjectForViewport, sceneDraftToCss, validateSceneDraft, type SceneDraft, type SceneObjectDraft, type SceneViewport } from '@/lib/scene-draft';
import type { SeasonId } from '@/lib/seasonal-artwork';
import { getSceneAssetUrl } from '@/lib/scene-assets';

type SceneRendererProps = {
  config?: unknown;
  draft?: SceneDraft;
  viewport?: SceneViewport;
  isDark: boolean;
  season?: SeasonId;
};

export default function SceneRenderer({ config, draft, isDark, season, viewport }: SceneRendererProps) {
  const scene = resolveSceneConfig(config, HOME_SCENE_BASELINE_V1);
  const safeDraft = draft && validateSceneDraft(draft).ok ? draft : undefined;
  const [browserViewport, setBrowserViewport] = useState<SceneViewport>({ width: 1440, height: 900 });
  useEffect(() => {
    if (!safeDraft || viewport) return;
    const update = () => setBrowserViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [safeDraft, viewport]);
  const effectiveViewport = viewport ?? browserViewport;
  const presetId = getScenePresetOverrideId(effectiveViewport);

  return (
    <>
      <style data-scene-styles={scene.id}>{sceneConfigToCss(scene)}</style>
      {safeDraft ? <style data-scene-draft={safeDraft.sceneId}>{sceneDraftToCss(safeDraft, effectiveViewport, presetId)}</style> : null}
      {scene.objects.map((object) => {
        const objectDraft = safeDraft ? getSceneObject(safeDraft, object.id) : undefined;
        const resolvedDraft = objectDraft ? resolveSceneObjectForViewport(objectDraft, effectiveViewport, presetId).object : objectDraft;
        if (safeDraft && !objectDraft) return null;
        if (!object.visible || resolvedDraft?.visible === false) return null;

        const sceneProps = {
          sceneObjectId: object.id,
          sceneObjectLocked: objectDraft?.locked ?? object.locked,
        };

        switch (object.renderer) {
          case 'espresso-smoke':
            return <EspressoCorner key={object.id} isDark={isDark} {...sceneProps} />;
          case 'ink-bottle-image':
            return <InkBottleCorner key={object.id} isDark={isDark} {...sceneProps} />;
          case 'seasonal-image':
            return (
              <SeasonalDeskObject
                key={object.id}
                season={season}
                isDark={isDark}
                asset={objectDraft?.asset}
                {...sceneProps}
              />
            );
        }
      })}
      {safeDraft ? safeDraft.objects
        .filter((object) => !scene.objects.some((baseline) => baseline.id === object.id))
        .map((object) => <StudioImageObject key={object.id} object={object} viewport={effectiveViewport} presetId={presetId} />) : null}
    </>
  );
}

function StudioImageObject({ object, viewport, presetId }: { object: SceneObjectDraft; viewport: SceneViewport; presetId?: import('@/lib/scene-draft').ScenePresetOverrideId }) {
  const resolved = resolveSceneObjectForViewport(object, viewport, presetId).object;
  const src = getSceneAssetUrl(resolved.asset);
  if (resolved.rendererType !== 'image' || !resolved.visible || !src) return null;
  return (
    <div
      data-scene-object={resolved.id}
      data-scene-locked={String(resolved.locked)}
      aria-hidden="true"
      style={{
        position: 'absolute', display: 'block', pointerEvents: 'none',
        [resolved.anchorX]: 0, [resolved.anchorY]: 0, width: 180, zIndex: resolved.zIndex,
        transform: 'scale(var(--scene-object-scale)) rotate(var(--scene-object-rotation))',
        // Anchors position the object; scale/rotation always use its visual centre.
        transformOrigin: '50% 50%',
      }}
    >
      {/* Generic editor-only image renderer; storage is validated now but intentionally not loaded before Storage exists. */}
      <img src={src} alt="" draggable={false} style={{ display: 'block', width: '100%', height: 'auto' }} />
    </div>
  );
}
