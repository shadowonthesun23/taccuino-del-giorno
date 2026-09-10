export const SCENE_DRAFT_SCHEMA_VERSION = 2 as const;
export const SCENE_OBJECT_IDS = ['coffee-cup', 'ink-bottle', 'seasonal-fig'] as const;
export type SceneObjectId = (typeof SCENE_OBJECT_IDS)[number];
/** Studio offsets are visual screen-space deltas: +X moves right and +Y moves down, regardless of the production anchor. */
export const SCENE_OBJECT_ANCHORS: Readonly<Record<SceneObjectId, 'left-top' | 'right-bottom'>> = {
  'coffee-cup': 'left-top',
  'ink-bottle': 'left-top',
  'seasonal-fig': 'right-bottom',
};
export const SCENE_RESPONSIVE_BREAKPOINT_IDS = ['wide', 'desktop', 'compactDesktop', 'narrowDesktop', 'wideShort', 'desktopShort', 'veryShortDesktop'] as const;
export type SceneResponsiveBreakpointId = (typeof SCENE_RESPONSIVE_BREAKPOINT_IDS)[number];
export type SceneViewport = { width: number; height: number };
export type SceneObjectTransform = { offsetX: number; offsetY: number; scale: number; rotation: number; visible: boolean };
export type SceneObjectResponsiveOverride = Partial<SceneObjectTransform>;
export type SceneObjectDraft = SceneObjectTransform & { locked: boolean; responsiveOverrides: Partial<Record<SceneResponsiveBreakpointId, SceneObjectResponsiveOverride>> };
export type SceneDraft = { schemaVersion: typeof SCENE_DRAFT_SCHEMA_VERSION; sceneId: 'home'; objects: Record<SceneObjectId, SceneObjectDraft> };
export type SceneObjectDraftPatch = Partial<Omit<SceneObjectDraft, 'responsiveOverrides'>>;
export type SceneDraftValidation = { ok: true; value: SceneDraft } | { ok: false; issues: readonly string[] };

export const SCENE_DRAFT_TRANSFORM_BOUNDS = { offsetX: [-4000, 4000], offsetY: [-4000, 4000], scale: [0.1, 4], rotation: [-360, 360] } as const;
export const SCENE_RESPONSIVE_BREAKPOINTS: Readonly<Record<SceneResponsiveBreakpointId, string>> = {
  wide: '≥1600 px', desktop: '1440–1599 px', compactDesktop: '1181–1439 px', narrowDesktop: '1024–1180 px',
  wideShort: '≥1600 px · ≤920 px h', desktopShort: '1440–1599 px · ≤920 px h', veryShortDesktop: '≥1440 px · ≤700 px h',
};

/**
 * Deterministic precedence: Base → one width band → one vertical refinement.
 * The vertical refinement is applied last and therefore wins only for fields it declares.
 */
export function getSceneResponsiveBreakpoints({ width, height }: SceneViewport): readonly SceneResponsiveBreakpointId[] {
  const widthBreakpoint = width >= 1600
    ? 'wide'
    : width >= 1440
      ? 'desktop'
      : width >= 1181
        ? 'compactDesktop'
        : width >= 1024
          ? 'narrowDesktop'
          : null;
  const heightBreakpoint = width >= 1440 && height <= 700
    ? 'veryShortDesktop'
    : width >= 1600 && height <= 920
      ? 'wideShort'
      : width >= 1440 && height <= 920
        ? 'desktopShort'
        : null;
  return [widthBreakpoint, heightBreakpoint].filter((value): value is SceneResponsiveBreakpointId => value !== null);
}

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function validateTransform(value: unknown, path: string, issues: string[], partial: boolean) {
  if (!isRecord(value)) { issues.push(`${path} must be an object.`); return; }
  for (const [key, [min, max]] of Object.entries(SCENE_DRAFT_TRANSFORM_BOUNDS)) {
    const current = value[key];
    if (partial && current === undefined) continue;
    if (typeof current !== 'number' || !Number.isFinite(current) || current < min || current > max) issues.push(`${path}.${key} must be between ${min} and ${max}.`);
  }
  if ((!partial || value.visible !== undefined) && typeof value.visible !== 'boolean') issues.push(`${path}.visible must be boolean.`);
  const allowed = new Set(partial ? ['offsetX', 'offsetY', 'scale', 'rotation', 'visible'] : ['offsetX', 'offsetY', 'scale', 'rotation', 'visible', 'locked', 'responsiveOverrides']);
  for (const key of Object.keys(value)) if (!allowed.has(key)) issues.push(`${path}.${key} is unsupported.`);
}
function validateObjectDraft(value: unknown, path: string, issues: string[]) {
  if (!isRecord(value)) { issues.push(`${path} must be an object.`); return; }
  validateTransform(value, path, issues, false);
  if (typeof value.locked !== 'boolean') issues.push(`${path}.locked must be boolean.`);
  if (!isRecord(value.responsiveOverrides)) issues.push(`${path}.responsiveOverrides must be an object.`);
  else {
    const allowed = new Set<string>(SCENE_RESPONSIVE_BREAKPOINT_IDS);
    for (const [id, override] of Object.entries(value.responsiveOverrides)) {
      if (!allowed.has(id)) issues.push(`${path}.responsiveOverrides.${id} is unsupported.`);
      else validateTransform(override, `${path}.responsiveOverrides.${id}`, issues, true);
    }
  }
  const allowed = new Set(['offsetX', 'offsetY', 'scale', 'rotation', 'visible', 'locked', 'responsiveOverrides']);
  for (const key of Object.keys(value)) if (!allowed.has(key)) issues.push(`${path}.${key} is unsupported.`);
}
export function validateSceneDraft(input: unknown): SceneDraftValidation {
  const issues: string[] = [];
  if (!isRecord(input)) return { ok: false, issues: ['Scene draft must be an object.'] };
  if (input.schemaVersion !== SCENE_DRAFT_SCHEMA_VERSION) issues.push('schemaVersion must be 2.');
  if (input.sceneId !== 'home') issues.push('sceneId must be home.');
  if (!isRecord(input.objects)) issues.push('objects must be an object.');
  else { const allowed = new Set<string>(SCENE_OBJECT_IDS); for (const id of SCENE_OBJECT_IDS) validateObjectDraft(input.objects[id], `objects.${id}`, issues); for (const id of Object.keys(input.objects)) if (!allowed.has(id)) issues.push(`objects.${id} is unsupported.`); }
  return issues.length === 0 ? { ok: true, value: input as SceneDraft } : { ok: false, issues };
}
export function getSceneResponsiveBreakpoint({ width, height }: SceneViewport): SceneResponsiveBreakpointId | null {
  const active = getSceneResponsiveBreakpoints({ width, height });
  return active.at(-1) ?? null;
}
export function resolveSceneObjectForViewport(object: SceneObjectDraft, viewport: SceneViewport) {
  const breakpointIds = getSceneResponsiveBreakpoints(viewport);
  const resolved = { ...object };
  for (const breakpointId of breakpointIds) Object.assign(resolved, object.responsiveOverrides[breakpointId]);
  return { breakpointId: breakpointIds.at(-1) ?? null, breakpointIds, object: resolved };
}
function formatNumber(value: number) { return String(Math.round(value * 1000) / 1000); }
export function sceneDraftToCss(draft: SceneDraft, viewport: SceneViewport) {
  return SCENE_OBJECT_IDS.map((id) => {
    const object = resolveSceneObjectForViewport(draft.objects[id], viewport).object;
    const declarations = [`translate: ${formatNumber(object.offsetX)}px ${formatNumber(object.offsetY)}px`, `--scene-object-scale: ${formatNumber(object.scale)}`, `--scene-object-rotation: ${formatNumber(object.rotation)}deg`, object.visible ? null : 'display: none !important'].filter((value): value is string => Boolean(value));
    return `[data-scene-object="${id}"] { ${declarations.join('; ')}; }`;
  }).join('\n');
}
