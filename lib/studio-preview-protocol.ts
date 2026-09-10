import type { SceneMode } from './scene-config';
import type { SceneObjectDraftPatch, SceneObjectId } from './scene-draft';
import type { SceneEditingTarget } from './scene-draft-editor';
import type { SceneCollision, SceneGuideMode, SceneSafeArea } from './scene-safe-areas';
import type { StudioViewportPresetId } from './studio-viewport';

export const STUDIO_PREVIEW_MESSAGE = 'day-atlas:studio-preview' as const;
export const STUDIO_TOGGLE_UI_MESSAGE = 'day-atlas:studio-toggle-ui' as const;
export const STUDIO_DRAFT_CHANGE_MESSAGE = 'day-atlas:studio-draft-change' as const;
export const STUDIO_SELECTION_CHANGE_MESSAGE = 'day-atlas:studio-selection-change' as const;
export const STUDIO_RETURN_TO_EDIT_MESSAGE = 'day-atlas:studio-return-to-edit' as const;
export const STUDIO_SCENE_SAFETY_MESSAGE = 'day-atlas:studio-scene-safety' as const;

export type StudioPreviewMessage = {
  type: typeof STUDIO_PREVIEW_MESSAGE;
  mode: SceneMode;
  viewport: StudioViewportPresetId;
  sceneDraft?: unknown;
  selectedObjectId?: SceneObjectId;
  editingTarget?: SceneEditingTarget;
  guideMode?: SceneGuideMode;
  showEditor?: boolean;
};

export type StudioDraftChangeMessage = {
  type: typeof STUDIO_DRAFT_CHANGE_MESSAGE;
  objectId: SceneObjectId;
  patch: SceneObjectDraftPatch;
  editingTarget?: SceneEditingTarget;
};

export type StudioSceneSafetyMessage = {
  type: typeof STUDIO_SCENE_SAFETY_MESSAGE;
  safeAreas: SceneSafeArea[];
  collisions: SceneCollision[];
};

export function isSceneMode(value: unknown): value is SceneMode {
  return value === 'edit' || value === 'preview' || value === 'online';
}
