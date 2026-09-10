export const SCENE_DRAFT_SCHEMA_VERSION = 1 as const;

export const SCENE_OBJECT_IDS = ['coffee-cup', 'ink-bottle', 'seasonal-fig'] as const;

export type SceneObjectId = (typeof SCENE_OBJECT_IDS)[number];

export type SceneObjectDraft = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  locked: boolean;
  visible: boolean;
};

export type SceneDraft = {
  schemaVersion: typeof SCENE_DRAFT_SCHEMA_VERSION;
  sceneId: 'home';
  objects: Record<SceneObjectId, SceneObjectDraft>;
};

export type SceneObjectDraftPatch = Partial<SceneObjectDraft>;

export type SceneDraftValidation =
  | { ok: true; value: SceneDraft }
  | { ok: false; issues: readonly string[] };

const BOUNDS = {
  x: [-4000, 4000],
  y: [-4000, 4000],
  scale: [0.1, 4],
  rotation: [-360, 360],
} as const;

export const HOME_SCENE_DRAFT_BASELINE_V1: SceneDraft = {
  schemaVersion: SCENE_DRAFT_SCHEMA_VERSION,
  sceneId: 'home',
  objects: {
    'coffee-cup': { x: 0, y: 0, scale: 1, rotation: -3.5, locked: true, visible: true },
    'ink-bottle': { x: 0, y: 0, scale: 1, rotation: -6, locked: true, visible: true },
    'seasonal-fig': { x: 0, y: 0, scale: 1, rotation: 0, locked: false, visible: true },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateObjectDraft(value: unknown, path: string, issues: string[]) {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object.`);
    return;
  }

  for (const [key, [min, max]] of Object.entries(BOUNDS)) {
    const current = value[key];
    if (typeof current !== 'number' || !Number.isFinite(current) || current < min || current > max) {
      issues.push(`${path}.${key} must be between ${min} and ${max}.`);
    }
  }

  if (typeof value.locked !== 'boolean') issues.push(`${path}.locked must be boolean.`);
  if (typeof value.visible !== 'boolean') issues.push(`${path}.visible must be boolean.`);

  const allowedKeys = new Set(['x', 'y', 'scale', 'rotation', 'locked', 'visible']);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) issues.push(`${path}.${key} is unsupported.`);
  }
}

export function validateSceneDraft(input: unknown): SceneDraftValidation {
  const issues: string[] = [];
  if (!isRecord(input)) return { ok: false, issues: ['Scene draft must be an object.'] };

  if (input.schemaVersion !== SCENE_DRAFT_SCHEMA_VERSION) issues.push('schemaVersion must be 1.');
  if (input.sceneId !== 'home') issues.push('sceneId must be home.');
  if (!isRecord(input.objects)) {
    issues.push('objects must be an object.');
  } else {
    const allowedIds = new Set<string>(SCENE_OBJECT_IDS);
    for (const id of SCENE_OBJECT_IDS) validateObjectDraft(input.objects[id], `objects.${id}`, issues);
    for (const id of Object.keys(input.objects)) {
      if (!allowedIds.has(id)) issues.push(`objects.${id} is unsupported.`);
    }
  }

  return issues.length === 0
    ? { ok: true, value: input as SceneDraft }
    : { ok: false, issues };
}

export function cloneBaselineSceneDraft(): SceneDraft {
  return structuredClone(HOME_SCENE_DRAFT_BASELINE_V1);
}

export function resolveSceneDraft(candidate: unknown): SceneDraft {
  const result = validateSceneDraft(candidate);
  return result.ok ? result.value : cloneBaselineSceneDraft();
}

export function clampSceneObjectDraftPatch(patch: SceneObjectDraftPatch): SceneObjectDraftPatch {
  const next: SceneObjectDraftPatch = {};
  for (const key of ['x', 'y', 'scale', 'rotation'] as const) {
    const value = patch[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const [min, max] = BOUNDS[key];
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

function formatNumber(value: number) {
  return String(Math.round(value * 1000) / 1000);
}

export function sceneDraftToCss(draft: SceneDraft) {
  return SCENE_OBJECT_IDS.map((id) => {
    const object = draft.objects[id];
    const selector = `[data-scene-object="${id}"]`;
    const declarations = [
      `translate: ${formatNumber(object.x)}px ${formatNumber(object.y)}px`,
      `--scene-object-scale: ${formatNumber(object.scale)}`,
      `--scene-object-rotation: ${formatNumber(object.rotation)}deg`,
      object.visible ? null : 'display: none !important',
    ].filter((value): value is string => Boolean(value));
    return `${selector} { ${declarations.join('; ')}; }`;
  }).join('\n');
}
