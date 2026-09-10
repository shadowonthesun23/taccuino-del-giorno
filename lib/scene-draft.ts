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

export const SCENE_DRAFT_TRANSFORM_BOUNDS = {
  x: [-4000, 4000],
  y: [-4000, 4000],
  scale: [0.1, 4],
  rotation: [-360, 360],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateObjectDraft(value: unknown, path: string, issues: string[]) {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object.`);
    return;
  }

  for (const [key, [min, max]] of Object.entries(SCENE_DRAFT_TRANSFORM_BOUNDS)) {
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
