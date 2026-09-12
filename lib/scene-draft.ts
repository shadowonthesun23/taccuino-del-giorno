export const SCENE_DRAFT_SCHEMA_VERSION = 5 as const;
export type SceneObjectId = string;
export type SceneObjectRendererType = 'image' | 'coffeeCup';
export type SceneAssetReference = { source: 'bundled'; path: string; darkPath?: string } | { source: 'storage'; path: string };
export type SceneAnchorX = 'left' | 'right';
export type SceneAnchorY = 'top' | 'bottom';
export type SceneViewport = { width: number; height: number };
/** Includes legacy physical-pixel keys for backwards-compatible draft reads. */
export const SCENE_PRESET_OVERRIDE_IDS = ['5120x2880', '3840x2160', '2560x1440', '1920x1080', '1680x1050', '1536x864', '1440x900', '1366x768', '1280x800', '768x1024', '390x844'] as const;
export type ScenePresetOverrideId = (typeof SCENE_PRESET_OVERRIDE_IDS)[number];
/** Studio offsets are visual screen-space deltas: +X moves right and +Y moves down, regardless of the production anchor. */
export const SCENE_RESPONSIVE_BREAKPOINT_IDS = ['mobile', 'tablet', 'wide', 'desktop', 'compactDesktop', 'narrowDesktop', 'wideShort', 'desktopShort', 'veryShortDesktop'] as const;
export type SceneResponsiveBreakpointId = (typeof SCENE_RESPONSIVE_BREAKPOINT_IDS)[number];
export type SceneObjectTransform = { offsetX: number; offsetY: number; scale: number; rotation: number; visible: boolean };
export type SceneObjectResponsiveOverride = Partial<SceneObjectTransform>;
export type SceneObjectDraft = SceneObjectTransform & {
  id: SceneObjectId; name: string; rendererType: SceneObjectRendererType; asset: SceneAssetReference;
  anchorX: SceneAnchorX; anchorY: SceneAnchorY; zIndex: number; locked: boolean; availability: 'permanent' | 'seasonal';
  responsiveOverrides: Partial<Record<SceneResponsiveBreakpointId, SceneObjectResponsiveOverride>>;
  presetOverrides: Partial<Record<ScenePresetOverrideId, SceneObjectResponsiveOverride>>;
  seasonal?: { activeFrom: string; activeUntil: string };
};
export type SceneDraft = { schemaVersion: typeof SCENE_DRAFT_SCHEMA_VERSION; sceneId: 'home'; objects: SceneObjectDraft[] };
export type SceneObjectDraftPatch = Partial<Pick<SceneObjectDraft, 'offsetX' | 'offsetY' | 'scale' | 'rotation' | 'visible' | 'locked' | 'zIndex' | 'availability' | 'seasonal'>>;
export type SceneDraftValidation = { ok: true; value: SceneDraft } | { ok: false; issues: readonly string[] };
export const SCENE_DRAFT_TRANSFORM_BOUNDS = { offsetX: [-4000, 4000], offsetY: [-4000, 4000], scale: [0.1, 4], rotation: [-360, 360] } as const;
export const SCENE_RESPONSIVE_BREAKPOINTS: Readonly<Record<SceneResponsiveBreakpointId, string>> = { mobile: '0–767 px', tablet: '768–1023 px', wide: '≥1600 px', desktop: '1440–1599 px', compactDesktop: '1181–1439 px', narrowDesktop: '1024–1180 px', wideShort: '≥1600 px · ≤920 px h', desktopShort: '1440–1599 px · ≤920 px h', veryShortDesktop: '≥1440 px · ≤700 px h' };
export const SCENE_RESPONSIVE_LABELS: Readonly<Record<SceneResponsiveBreakpointId, string>> = { mobile: 'MOBILE', tablet: 'TABLET', wide: 'WIDE', desktop: 'DESKTOP', compactDesktop: 'COMPACT DESKTOP', narrowDesktop: 'NARROW DESKTOP', wideShort: 'WIDE · SHORT', desktopShort: 'DESKTOP · SHORT', veryShortDesktop: 'VERY SHORT DESKTOP' };
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const STORAGE_PATH_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9/_.-]{0,511}$/;
export function isSceneObjectId(value: unknown): value is SceneObjectId { return typeof value === 'string' && ID_PATTERN.test(value); }
export function getSceneObject(draft: SceneDraft, id: SceneObjectId) { return draft.objects.find((object) => object.id === id); }
export function sceneObjectIds(draft: SceneDraft) { return draft.objects.map((object) => object.id); }
/** Deterministic precedence: Base → one width band → one vertical refinement. */
export function getSceneResponsiveBreakpoints({ width, height }: SceneViewport): readonly SceneResponsiveBreakpointId[] {
  const widthBreakpoint = width >= 1600 ? 'wide' : width >= 1440 ? 'desktop' : width >= 1181 ? 'compactDesktop' : width >= 1024 ? 'narrowDesktop' : width >= 768 ? 'tablet' : 'mobile';
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
  if (!Number.isInteger(value.zIndex) || (value.zIndex as number) < 1 || (value.zIndex as number) > 9) issues.push(`${path}.zIndex must be an integer between 1 and 9.`);
  if (typeof value.locked !== 'boolean') issues.push(`${path}.locked must be boolean.`);
  if (value.availability !== 'permanent' && value.availability !== 'seasonal') issues.push(`${path}.availability is unsupported.`);
  if (!isRecord(value.responsiveOverrides)) issues.push(`${path}.responsiveOverrides must be an object.`); else for (const [id, override] of Object.entries(value.responsiveOverrides)) { if (!(SCENE_RESPONSIVE_BREAKPOINT_IDS as readonly string[]).includes(id)) issues.push(`${path}.responsiveOverrides.${id} is unsupported.`); else validateTransform(override, `${path}.responsiveOverrides.${id}`, issues, true); }
  if (!isRecord(value.presetOverrides)) issues.push(`${path}.presetOverrides must be an object.`); else for (const [id, override] of Object.entries(value.presetOverrides)) { if (!(SCENE_PRESET_OVERRIDE_IDS as readonly string[]).includes(id)) issues.push(`${path}.presetOverrides.${id} is unsupported.`); else validateTransform(override, `${path}.presetOverrides.${id}`, issues, true); }
  if (value.availability === 'seasonal') {
    if (!isRecord(value.seasonal) || !isMonthDay(value.seasonal.activeFrom) || !isMonthDay(value.seasonal.activeUntil)) issues.push(`${path}.seasonal must contain valid MM-DD dates.`);
  } else if (value.seasonal !== undefined) issues.push(`${path}.seasonal is only supported for seasonal objects.`);
  const allowed = new Set(['id', 'name', 'rendererType', 'asset', 'anchorX', 'anchorY', 'zIndex', 'offsetX', 'offsetY', 'scale', 'rotation', 'visible', 'locked', 'availability', 'responsiveOverrides', 'presetOverrides', 'seasonal']); for (const key of Object.keys(value)) if (!allowed.has(key)) issues.push(`${path}.${key} is unsupported.`);
}
function isMonthDay(value: unknown) { if (typeof value !== 'string' || !/^\d{2}-\d{2}$/.test(value)) return false; const [month, day] = value.split('-').map(Number); const date = new Date(Date.UTC(2000, month - 1, day)); return date.getUTCMonth() === month - 1 && date.getUTCDate() === day; }
export function validateSceneDraft(input: unknown): SceneDraftValidation { const issues: string[] = []; if (!isRecord(input)) return { ok: false, issues: ['Scene draft must be an object.'] }; if (input.schemaVersion !== SCENE_DRAFT_SCHEMA_VERSION) issues.push('schemaVersion must be 5.'); if (input.sceneId !== 'home') issues.push('sceneId must be home.'); if (!Array.isArray(input.objects) || input.objects.length < 1 || input.objects.length > 32) issues.push('objects must contain between one and thirty-two entries.'); else { const ids = new Set<string>(); input.objects.forEach((object, index) => { validateObjectDraft(object, `objects[${index}]`, issues); if (isRecord(object) && isSceneObjectId(object.id)) { if (ids.has(object.id)) issues.push(`objects[${index}].id must be unique.`); ids.add(object.id); } }); } return issues.length === 0 ? { ok: true, value: input as SceneDraft } : { ok: false, issues }; }
export function getSceneResponsiveBreakpoint(viewport: SceneViewport): SceneResponsiveBreakpointId | null { return getSceneResponsiveBreakpoints(viewport).at(-1) ?? null; }
export function getScenePresetOverrideId(viewport: SceneViewport): ScenePresetOverrideId | undefined { const id = `${viewport.width}x${viewport.height}`; return SCENE_PRESET_OVERRIDE_IDS.includes(id as ScenePresetOverrideId) ? id as ScenePresetOverrideId : undefined; }
function getScenePresetSize(id: ScenePresetOverrideId): SceneViewport { const [width, height] = id.split('x').map(Number); return { width, height }; }
function getConfiguredScenePresetIds(object: SceneObjectDraft): ScenePresetOverrideId[] { return SCENE_PRESET_OVERRIDE_IDS.filter((id) => object.presetOverrides[id] !== undefined); }
function resolveScenePresetOverrideId(object: SceneObjectDraft, viewport: SceneViewport, preferredPresetId?: ScenePresetOverrideId): ScenePresetOverrideId | undefined {
  const configuredPresetIds = getConfiguredScenePresetIds(object);
  if (configuredPresetIds.length === 0) return undefined;

  const exactPresetId = getScenePresetOverrideId(viewport);
  if (exactPresetId && object.presetOverrides[exactPresetId] !== undefined) return exactPresetId;
  if (preferredPresetId && preferredPresetId === exactPresetId && object.presetOverrides[preferredPresetId] !== undefined) return preferredPresetId;

  const sameWidth = configuredPresetIds.filter((id) => getScenePresetSize(id).width === viewport.width);
  if (sameWidth.length > 0) return sameWidth.reduce((closest, id) => Math.abs(getScenePresetSize(id).height - viewport.height) < Math.abs(getScenePresetSize(closest).height - viewport.height) ? id : closest);

  const viewportBand = getSceneResponsiveBreakpoints(viewport)[0];
  const sameBand = configuredPresetIds.filter((id) => getSceneResponsiveBreakpoints(getScenePresetSize(id))[0] === viewportBand);
  if (sameBand.length === 0) return undefined;
  return sameBand.reduce((closest, id) => {
    const candidate = getScenePresetSize(id);
    const current = getScenePresetSize(closest);
    const candidateDistance = (candidate.width - viewport.width) ** 2 + (candidate.height - viewport.height) ** 2;
    const currentDistance = (current.width - viewport.width) ** 2 + (current.height - viewport.height) ** 2;
    return candidateDistance < currentDistance ? id : closest;
  });
}
export function resolveSceneObjectForViewport(object: SceneObjectDraft, viewport: SceneViewport, presetId?: ScenePresetOverrideId) { const breakpointIds = getSceneResponsiveBreakpoints(viewport); const resolved = { ...object }; for (const breakpointId of breakpointIds) Object.assign(resolved, object.responsiveOverrides[breakpointId]); const resolvedPresetId = resolveScenePresetOverrideId(object, viewport, presetId); if (resolvedPresetId) { Object.assign(resolved, object.presetOverrides[resolvedPresetId]); const presetViewport = getScenePresetSize(resolvedPresetId); if (presetViewport.width !== viewport.width || presetViewport.height !== viewport.height) { if (resolved.anchorX === 'right') resolved.offsetX += presetViewport.width - viewport.width; if (resolved.anchorY === 'bottom') resolved.offsetY += presetViewport.height - viewport.height; } } return { breakpointId: breakpointIds.at(-1) ?? null, breakpointIds, presetId: resolvedPresetId, object: resolved }; }
export function getSceneObjectResponsiveState(object: SceneObjectDraft, viewport: SceneViewport, presetId?: ScenePresetOverrideId) {
  const resolved = resolveSceneObjectForViewport(object, viewport, presetId);
  const overridePresetId = resolved.presetId && object.presetOverrides[resolved.presetId] !== undefined ? resolved.presetId : null;
  const overrideBreakpointId = resolved.breakpointIds.filter((breakpointId) => object.responsiveOverrides[breakpointId] !== undefined).at(-1) ?? null;
  return { bandId: resolved.breakpointIds[0] ?? null, overrideBreakpointId, overridePresetId, status: resolved.object.visible === false ? 'hidden' as const : overridePresetId || overrideBreakpointId ? 'override' as const : 'base' as const, object: resolved.object };
}
function formatNumber(value: number) { return String(Math.round(value * 1000) / 1000); }
export function sceneDraftToCss(draft: SceneDraft, viewport: SceneViewport, presetId?: ScenePresetOverrideId) { return draft.objects.map((entry) => { const object = resolveSceneObjectForViewport(entry, viewport, presetId).object; const declarations = [`translate: ${formatNumber(object.offsetX)}px ${formatNumber(object.offsetY)}px`, 'transform-origin: 50% 50%', `--scene-object-scale: ${formatNumber(object.scale)}`, `--scene-object-rotation: ${formatNumber(object.rotation)}deg`, `z-index: ${object.zIndex}`, object.visible ? null : 'display: none !important'].filter((value): value is string => Boolean(value)); return `[data-scene-object="${object.id}"] { ${declarations.join('; ')}; }`; }).join('\n'); }
