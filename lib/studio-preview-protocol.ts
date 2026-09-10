import type { SceneMode } from './scene-config';
import type { StudioViewportPresetId } from './studio-viewport';

export const STUDIO_PREVIEW_MESSAGE = 'day-atlas:studio-preview' as const;
export const STUDIO_TOGGLE_UI_MESSAGE = 'day-atlas:studio-toggle-ui' as const;

export type StudioPreviewMessage = {
  type: typeof STUDIO_PREVIEW_MESSAGE;
  mode: SceneMode;
  viewport: StudioViewportPresetId;
  sceneDraft?: unknown;
};

export function isSceneMode(value: unknown): value is SceneMode {
  return value === 'edit' || value === 'preview' || value === 'online';
}
