import {
  SCENE_DRAFT_SCHEMA_VERSION,
  SCENE_DRAFT_TRANSFORM_BOUNDS,
  SCENE_OBJECT_IDS,
  validateSceneDraft,
  type SceneDraft,
  type SceneObjectDraftPatch,
  type SceneObjectId,
  type SceneObjectResponsiveOverride,
  type SceneResponsiveBreakpointId,
} from './scene-draft.ts';

export type SceneEditingTarget = { mode: 'base' } | { mode: 'override'; breakpointId: SceneResponsiveBreakpointId };
export const HOME_SCENE_DRAFT_BASELINE_V1: SceneDraft = {
  schemaVersion: SCENE_DRAFT_SCHEMA_VERSION,
  sceneId: 'home',
  objects: {
    'coffee-cup': { offsetX: 0, offsetY: 0, scale: 1, rotation: -3.5, locked: true, visible: true, responsiveOverrides: {} },
    'ink-bottle': { offsetX: 0, offsetY: 0, scale: 1, rotation: -6, locked: true, visible: true, responsiveOverrides: {} },
    'seasonal-fig': { offsetX: 0, offsetY: 0, scale: 1, rotation: 0, locked: false, visible: true, responsiveOverrides: {} },
  },
};
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function migrateV1Draft(candidate: unknown): SceneDraft | null {
  if (!isRecord(candidate) || candidate.schemaVersion !== 1 || candidate.sceneId !== 'home' || !isRecord(candidate.objects)) return null;
  const objects = {} as SceneDraft['objects'];
  for (const id of SCENE_OBJECT_IDS) {
    const object = candidate.objects[id];
    if (!isRecord(object) || typeof object.x !== 'number' || typeof object.y !== 'number' || typeof object.scale !== 'number' || typeof object.rotation !== 'number' || typeof object.locked !== 'boolean' || typeof object.visible !== 'boolean') return null;
    objects[id] = { offsetX: object.x, offsetY: object.y, scale: object.scale, rotation: object.rotation, locked: object.locked, visible: object.visible, responsiveOverrides: {} };
  }
  const migrated: SceneDraft = { schemaVersion: SCENE_DRAFT_SCHEMA_VERSION, sceneId: 'home', objects };
  return validateSceneDraft(migrated).ok ? migrated : null;
}
export function cloneBaselineSceneDraft(): SceneDraft { return structuredClone(HOME_SCENE_DRAFT_BASELINE_V1); }
export function resolveSceneDraft(candidate: unknown): SceneDraft {
  const result = validateSceneDraft(candidate);
  return result.ok ? result.value : migrateV1Draft(candidate) ?? cloneBaselineSceneDraft();
}
function clampTransformPatch(patch: SceneObjectDraftPatch | SceneObjectResponsiveOverride) {
  const next: SceneObjectResponsiveOverride = {};
  for (const key of ['offsetX', 'offsetY', 'scale', 'rotation'] as const) {
    const value = patch[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const [min, max] = SCENE_DRAFT_TRANSFORM_BOUNDS[key];
    next[key] = Math.min(max, Math.max(min, value));
  }
  if (typeof patch.visible === 'boolean') next.visible = patch.visible;
  return next;
}
export function updateSceneDraft(draft: SceneDraft, objectId: SceneObjectId, patch: SceneObjectDraftPatch, target: SceneEditingTarget = { mode: 'base' }): SceneDraft {
  const object = draft.objects[objectId];
  if (target.mode === 'override') {
    const override = { ...object.responsiveOverrides[target.breakpointId], ...clampTransformPatch(patch) };
    return { ...draft, objects: { ...draft.objects, [objectId]: { ...object, responsiveOverrides: { ...object.responsiveOverrides, [target.breakpointId]: override } } } };
  }
  return { ...draft, objects: { ...draft.objects, [objectId]: { ...object, ...clampTransformPatch(patch), ...(typeof patch.locked === 'boolean' ? { locked: patch.locked } : {}) } } };
}
export function createSceneResponsiveOverride(draft: SceneDraft, objectId: SceneObjectId, breakpointId: SceneResponsiveBreakpointId): SceneDraft {
  const object = draft.objects[objectId];
  if (object.responsiveOverrides[breakpointId]) return draft;
  return { ...draft, objects: { ...draft.objects, [objectId]: { ...object, responsiveOverrides: { ...object.responsiveOverrides, [breakpointId]: {} } } } };
}
export function removeSceneResponsiveOverride(draft: SceneDraft, objectId: SceneObjectId, breakpointId: SceneResponsiveBreakpointId): SceneDraft {
  const responsiveOverrides = { ...draft.objects[objectId].responsiveOverrides };
  delete responsiveOverrides[breakpointId];
  return { ...draft, objects: { ...draft.objects, [objectId]: { ...draft.objects[objectId], responsiveOverrides } } };
}
