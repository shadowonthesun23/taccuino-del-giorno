'use client';
/* eslint-disable @next/next/no-img-element -- generic Studio assets are validated paths and are not public LCP content. */

import EspressoCorner from '@/components/ui/EspressoCorner';
import InkBottleCorner from '@/components/ui/InkBottleCorner';
import SeasonalDeskObject from '@/components/ui/SeasonalDeskObject';
import { HOME_SCENE_BASELINE_V1 } from '@/lib/scene-baseline';
import { resolveSceneConfig, sceneConfigToCss } from '@/lib/scene-config';
import { getSceneObject, resolveSceneObjectForViewport, sceneDraftToCss, validateSceneDraft, type SceneDraft, type SceneObjectDraft, type SceneViewport } from '@/lib/scene-draft';
import type { SeasonId } from '@/lib/seasonal-artwork';

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

  return (
    <>
      <style data-scene-styles={scene.id}>{sceneConfigToCss(scene)}</style>
      {safeDraft && viewport ? <style data-scene-draft={safeDraft.sceneId}>{sceneDraftToCss(safeDraft, viewport)}</style> : null}
      {scene.objects.map((object) => {
        const objectDraft = safeDraft ? getSceneObject(safeDraft, object.id) : undefined;
        const resolvedDraft = objectDraft && viewport ? resolveSceneObjectForViewport(objectDraft, viewport).object : objectDraft;
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
                {...sceneProps}
              />
            );
        }
      })}
      {safeDraft && viewport ? safeDraft.objects
        .filter((object) => !scene.objects.some((baseline) => baseline.id === object.id))
        .map((object) => <StudioImageObject key={object.id} object={object} viewport={viewport} />) : null}
    </>
  );
}

function StudioImageObject({ object, viewport }: { object: SceneObjectDraft; viewport: SceneViewport }) {
  const resolved = resolveSceneObjectForViewport(object, viewport).object;
  if (resolved.rendererType !== 'image' || !resolved.visible || resolved.asset.source !== 'bundled') return null;
  return (
    <div
      data-scene-object={resolved.id}
      data-scene-locked={String(resolved.locked)}
      aria-hidden="true"
      style={{
        position: 'absolute', display: 'block', pointerEvents: 'none',
        [resolved.anchorX]: 0, [resolved.anchorY]: 0, width: 180, zIndex: resolved.zIndex,
        transform: 'scale(var(--scene-object-scale)) rotate(var(--scene-object-rotation))',
        transformOrigin: `${resolved.anchorX} ${resolved.anchorY}`,
      }}
    >
      {/* Generic editor-only image renderer; storage is validated now but intentionally not loaded before Storage exists. */}
      <img src={resolved.asset.path} alt="" draggable={false} style={{ display: 'block', width: '100%', height: 'auto' }} />
    </div>
  );
}
