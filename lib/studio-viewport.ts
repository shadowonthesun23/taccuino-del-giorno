export const STUDIO_VIEWPORT_PRESETS = [
  { id: '1920x1080', width: 1920, height: 1080 },
  { id: '1680x1050', width: 1680, height: 1050 },
  { id: '1440x900', width: 1440, height: 900 },
  { id: '1366x768', width: 1366, height: 768 },
  { id: '1280x800', width: 1280, height: 800 },
] as const;

export type StudioViewportPreset = (typeof STUDIO_VIEWPORT_PRESETS)[number];
export type StudioViewportPresetId = StudioViewportPreset['id'];

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

export function getStudioViewportPreset(value: unknown): StudioViewportPreset {
  return STUDIO_VIEWPORT_PRESETS.find((preset) => preset.id === value) ?? STUDIO_VIEWPORT_PRESETS[2];
}

export function calculatePreviewScale(viewport: Size, available: Size, padding = 32) {
  const availableWidth = Math.max(1, available.width - padding * 2);
  const availableHeight = Math.max(1, available.height - padding * 2);
  return Math.min(1, availableWidth / viewport.width, availableHeight / viewport.height);
}

export function clampPanelPosition(position: Point, panel: Size, viewport: Size, margin = 12): Point {
  return {
    x: Math.min(Math.max(margin, position.x), Math.max(margin, viewport.width - panel.width - margin)),
    y: Math.min(Math.max(margin, position.y), Math.max(margin, viewport.height - panel.height - margin)),
  };
}
