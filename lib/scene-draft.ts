export const SCENE_DRAFT_SCHEMA_VERSION = 3 as const;
export type SceneObjectId = string;
export type SceneObjectRendererType = 'image' | 'coffeeCup';
export type SceneAssetReference = { source: 'bundled'; path: string; darkPath?: string } | { source: 'storage'; path: string };
export type SceneAnchorX = 'left' | 'right';
export type SceneAnchorY = 'top' | 'bottom';
export type SceneViewport = { width: number; height: number };
/** Studio offsets are visual screen-space deltas: +X moves right and +Y moves down, regardless of the production anchor. */
export const SCENE_RESPONSIVE_BREAKPOINT_IDS = ['wide', 'desktop', 'compactDesktop', 'narrowDesktop', 'wideShort', 'desktopShort', 'veryShortDesktop'] as const;
export type SceneResponsiveBreakpointId = (typeof SCENE_RESPONSIVE_BREAKPOINT_IDS)[number];
export type SceneObjectTransform = { offsetX: number; offsetY: number; scale: number; rotation: number; visible: boolean };
export type SceneObjectResponsiveOverride = Partial<SceneObjectTransform>;
export type SceneObjectDraft = SceneObjectTransform & {
  id: SceneObjectId; name: string; rendererType: SceneObjectRendererType; asset: SceneAssetReference;
  anchorX: SceneAnchorX; anchorY: SceneAnchorY; zIndex: number; locked: boolean;
  responsiveOverrides: Partial<Record<SceneResponsiveBreakpointId, SceneObjectResponsiveOverride>>;
  seasonal?: { activeFrom: string; activeUntil: string; activation: 'metadata-only' | 'calendar'; legacySeason?: 'spring' | 'summer' | 'autumn' | 'winter' };
};
export type SceneDraft = { schemaVersion: typeof SCENE_DRAFT_SCHEMA_VERSION; sceneId: 'home'; objects: SceneObjectDraft[] };
export type SceneObjectDraftPatch = Partial<Pick<SceneObjectDraft, 'offsetX' | 'offsetY' | 'scale' | 'rotation' | 'visible' | 'locked'>>;
export type SceneDraftValidation = { ok: true; value: SceneDraft } | { ok: false; issues: readonly string[] };
export const SCENE_DRAFT_TRANSFORM_BOUNDS = { offsetX: [-4000, 4000], offsetY: [-4000, 4000], scale: [0.1, 4], rotation: [-360, 360] } as const;
export const SCENE_RESPONSIVE_BREAKPOINTS: Readonly<Record<SceneResponsiveBreakpointId, string>> = { wide: '≥1600 px', desktop: '1440–1599 px', compactDesktop: '1181–1439 px', narrowDesktop: '1024–1180 px', wideShort: '≥1600 px · ≤920 px h', desktopShort: '1440–1599 px · ≤920 px h', veryShortDesktop: '≥1440 px · ≤700 px h' };
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const STORAGE_PATH_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9/_-]{0,511}$/;
export function isSceneObjectId(value: unknown): value is SceneObjectId { return typeof value === 'string' && ID_PATTERN.test(value); }
export function getSceneObject(draft: SceneDraft, id: SceneObjectId) { return draft.objects.find((object) => object.id === id); }
export function sceneObjectIds(draft: SceneDraft) { return draft.objects.map((object) => object.id); }
/** Deterministic precedence: Base → one width band → one vertical refinement. */
export function getSceneResponsiveBreakpoints({ width, height }: SceneViewport): readonly SceneResponsiveBreakpointId[] {
  const widthBreakpoint = width >= 1600 ? 'wide' : width >= 1440 ? 'desktop' : width >= 1181 ? 'compactDesktop' : width >= 1024 ? 'narrowDesktop' : null;
  const heightBreakpoint = width >= 1440 && height <= 700 ? 'veryShortDesktop' : width >= 1600 && height <= 920 ? 'wideShort' : width >= 1440 && height <= 920 ? 'desktopShort' : null;
  return [widthBreakpoint, heightBreakpoint].filter((value): value is SceneResponsiveBreakpointId => value !== null);
}
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function validateTransform(value: unknown, path: string, issues: string[], partial: boolean) { if (!isRecord(value)) { issues.push(`${path} must be an object.`); return; } for (const [key, [min, max]] of Object.entries(SCENE_DRAFT_TRANSFORM_BOUNDS)) { const current = value[key]; if (partial && current === undefined) continue; if (typeof current !== 'number' || !Number.isFinite(current) || current < min || current > max) issues.push(`${path}.${key} must be between ${min} and ${max}.`); } if ((!partial || value.visible !== undefined) && typeof value.visible !== 'boolean') issues.push(`${path}.visible must be boolean.`); }
function validateAsset(value: unknown, path: string, issues: string[]) { if (!isRecord(value) || (value.source !== 'bundled' && value.source !== 'storage') || typeof value.path !== 'string') { issues.push(`${path} is invalid.`); return; } const bundled = value.source === 'bundled' && value.path.startsWith('/images/') && !value.path.includes('..'); const storage = value.source === 'storage' && STORAGE_PATH_PATTERN.test(value.path) && !value.path.includes('..'); if (!bundled && !storage) issues.push(`${path}.path is unsafe.`); if (value.darkPath !== undefined && (value.source !== 'bundled' || typeof value.darkPath !== 'string' || !value.darkPath.startsWith('/images/') || value.darkPath.includes('..'))) issues.push(`${path}.darkPath is invalid.`); for (const key of Object.keys(value)) if (!['source', 'path', 'darkPath'].includes(key)) issues.push(`${path}.${key} is unsupported.`); }
function validateObjectDraft(value: unknown, path: string, issues: string[]) {
  if (!isRecord(value)) { issues.push(`${path} must be an object.`); return; }
  validateTransform(value, path, issues, false);
  if (!isSceneObjectId(value.id)) issues.push(`${path}.id is invalid.`);
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 100) issues.push(`${path}.name is invalid.`);
  if (value.rendererType !== 'image' && value.rendererType !== 'coffeeCup') issues.push(`${path}.rendererType is unsupported.`);
  validateAsset(value.asset, `${path}.asset`, issues);
  if (value.anchorX !== 'left' && value.anchorX !== 'right') issues.push(`${path}.anchorX is unsupported.`);
  if (value.anchorY !== 'top' && value.anchorY !== 'bottom') issues.push(`${path}.anchorY is unsupported.`);
  if (typeof value.zIndex !== 'number' || !Number.isFinite(value.zIndex) || value.zIndex < -100 || value.zIndex > 1000) issues.push(`${path}.zIndex is invalid.`);
  if (typeof value.locked !== 'boolean') issues.push(`${path}.locked must be boolean.`);
  if (!isRecord(value.responsiveOverrides)) issues.push(`${path}.responsiveOverrides must be an object.`); else for (const [id, override] of Object.entries(value.responsiveOverrides)) { if (!(SCENE_RESPONSIVE_BREAKPOINT_IDS as readonly string[]).includes(id)) issues.push(`${path}.responsiveOverrides.${id} is unsupported.`); else validateTransform(override, `${path}.responsiveOverrides.${id}`, issues, true); }
  const allowed = new Set(['id', 'name', 'rendererType', 'asset', 'anchorX', 'anchorY', 'zIndex', 'offsetX', 'offsetY', 'scale', 'rotation', 'visible', 'locked', 'responsiveOverrides', 'seasonal']); for (const key of Object.keys(value)) if (!allowed.has(key)) issues.push(`${path}.${key} is unsupported.`);
}
export function validateSceneDraft(input: unknown): SceneDraftValidation { const issues: string[] = []; if (!isRecord(input)) return { ok: false, issues: ['Scene draft must be an object.'] }; if (input.schemaVersion !== SCENE_DRAFT_SCHEMA_VERSION) issues.push('schemaVersion must be 3.'); if (input.sceneId !== 'home') issues.push('sceneId must be home.'); if (!Array.isArray(input.objects) || input.objects.length < 1 || input.objects.length > 32) issues.push('objects must contain between one and thirty-two entries.'); else { const ids = new Set<string>(); input.objects.forEach((object, index) => { validateObjectDraft(object, `objects[${index}]`, issues); if (isRecord(object) && isSceneObjectId(object.id)) { if (ids.has(object.id)) issues.push(`objects[${index}].id must be unique.`); ids.add(object.id); } }); } return issues.length === 0 ? { ok: true, value: input as SceneDraft } : { ok: false, issues }; }
export function getSceneResponsiveBreakpoint(viewport: SceneViewport): SceneResponsiveBreakpointId | null { return getSceneResponsiveBreakpoints(viewport).at(-1) ?? null; }
export function resolveSceneObjectForViewport(object: SceneObjectDraft, viewport: SceneViewport) { const breakpointIds = getSceneResponsiveBreakpoints(viewport); const resolved = { ...object }; for (const breakpointId of breakpointIds) Object.assign(resolved, object.responsiveOverrides[breakpointId]); return { breakpointId: breakpointIds.at(-1) ?? null, breakpointIds, object: resolved }; }
function formatNumber(value: number) { return String(Math.round(value * 1000) / 1000); }
export function sceneDraftToCss(draft: SceneDraft, viewport: SceneViewport) { return draft.objects.map((entry) => { const object = resolveSceneObjectForViewport(entry, viewport).object; const declarations = [`translate: ${formatNumber(object.offsetX)}px ${formatNumber(object.offsetY)}px`, `--scene-object-scale: ${formatNumber(object.scale)}`, `--scene-object-rotation: ${formatNumber(object.rotation)}deg`, object.visible ? null : 'display: none !important'].filter((value): value is string => Boolean(value)); return `[data-scene-object="${object.id}"] { ${declarations.join('; ')}; }`; }).join('\n'); }
