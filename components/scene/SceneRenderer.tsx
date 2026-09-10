'use client';

import EspressoCorner from '@/components/ui/EspressoCorner';
import InkBottleCorner from '@/components/ui/InkBottleCorner';
import SeasonalDeskObject from '@/components/ui/SeasonalDeskObject';
import { HOME_SCENE_BASELINE_V1 } from '@/lib/scene-baseline';
import { resolveSceneConfig, sceneConfigToCss } from '@/lib/scene-config';
import { resolveSceneObjectForViewport, sceneDraftToCss, validateSceneDraft, type SceneDraft, type SceneViewport } from '@/lib/scene-draft';
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
        const objectDraft = safeDraft?.objects[object.id as keyof SceneDraft['objects']];
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
    </>
  );
}
