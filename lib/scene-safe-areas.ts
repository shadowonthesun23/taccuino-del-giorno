export const SCENE_SAFE_AREA_PADDING = 32;

export type SceneSafeAreaCategory = 'content' | 'interactive' | 'postcard';
export type SceneRect = { left: number; top: number; width: number; height: number };
export type SceneSafeArea = { id: string; category: SceneSafeAreaCategory; rect: SceneRect };
export type SceneGuideMode = 'off' | 'content' | 'interactive' | 'all';
export type SceneCollision = Pick<SceneSafeArea, 'id' | 'category'>;

export function rectFromDomRect(rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>): SceneRect {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

export function expandSceneRect(rect: SceneRect, padding = SCENE_SAFE_AREA_PADDING): SceneRect {
  return { left: rect.left - padding, top: rect.top - padding, width: rect.width + padding * 2, height: rect.height + padding * 2 };
}

/** Edge contact is permitted; a warning requires a positive-area overlap. */
export function sceneRectsIntersect(a: SceneRect, b: SceneRect): boolean {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}

export function findSceneCollisions(objectRect: SceneRect | null, safeAreas: readonly SceneSafeArea[], padding = SCENE_SAFE_AREA_PADDING): SceneCollision[] {
  if (!objectRect) return [];
  return safeAreas
    .filter((safeArea) => sceneRectsIntersect(objectRect, expandSceneRect(safeArea.rect, padding)))
    .map(({ id, category }) => ({ id, category }));
}

export function shouldShowSceneGuide(mode: SceneGuideMode, category: SceneSafeAreaCategory): boolean {
  return mode === 'all' || (mode === 'content' && (category === 'content' || category === 'postcard')) || (mode === 'interactive' && category === 'interactive');
}
