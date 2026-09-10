import {
  SCENE_DRAFT_SCHEMA_VERSION,
  SCENE_DRAFT_TRANSFORM_BOUNDS,
  validateSceneDraft,
  type SceneDraft,
  type SceneObjectDraftPatch,
  type SceneObjectId,
} from './scene-draft.ts';

export const HOME_SCENE_DRAFT_BASELINE_V1: SceneDraft = {
  schemaVersion: SCENE_DRAFT_SCHEMA_VERSION,
  sceneId: 'home',
  objects: {
    'coffee-cup': { x: 0, y: 0, scale: 1, rotation: -3.5, locked: true, visible: true },
    'ink-bottle': { x: 0, y: 0, scale: 1, rotation: -6, locked: true, visible: true },
    'seasonal-fig': { x: 0, y: 0, scale: 1, rotation: 0, locked: false, visible: true },
  },
};

export function cloneBaselineSceneDraft(): SceneDraft {
  return structuredClone(HOME_SCENE_DRAFT_BASELINE_V1);
}

export function resolveSceneDraft(candidate: unknown): SceneDraft {
  const result = validateSceneDraft(candidate);
  return result.ok ? result.value : cloneBaselineSceneDraft();
}

function clampSceneObjectDraftPatch(patch: SceneObjectDraftPatch): SceneObjectDraftPatch {
  const next: SceneObjectDraftPatch = {};
  for (const key of ['x', 'y', 'scale', 'rotation'] as const) {
    const value = patch[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const [min, max] = SCENE_DRAFT_TRANSFORM_BOUNDS[key];
    next[key] = Math.min(max, Math.max(min, value));
  }
  if (typeof patch.locked === 'boolean') next.locked = patch.locked;
  if (typeof patch.visible === 'boolean') next.visible = patch.visible;
  return next;
}

export function updateSceneDraft(
  draft: SceneDraft,
  objectId: SceneObjectId,
  patch: SceneObjectDraftPatch,
): SceneDraft {
  return {
    ...draft,
    objects: {
      ...draft.objects,
      [objectId]: {
        ...draft.objects[objectId],
        ...clampSceneObjectDraftPatch(patch),
      },
    },
  };
}
