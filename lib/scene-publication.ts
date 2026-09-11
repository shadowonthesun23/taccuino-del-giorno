import { validateSceneDraft, type SceneDraft, type SceneObjectDraft } from './scene-draft.ts';

export function isMonthDayActive(date: Date, activeFrom: string, activeUntil: string) {
  const current = `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  return activeFrom <= activeUntil ? current >= activeFrom && current <= activeUntil : current >= activeFrom || current <= activeUntil;
}

export function isSceneObjectActive(object: SceneObjectDraft, date: Date) {
  return object.visible && (object.availability === 'permanent' || Boolean(object.seasonal && isMonthDayActive(date, object.seasonal.activeFrom, object.seasonal.activeUntil)));
}

export function resolvePublishedScene(candidate: unknown, date = new Date()): SceneDraft | null {
  const validation = validateSceneDraft(candidate);
  if (!validation.ok) return null;
  return { ...validation.value, objects: validation.value.objects.filter((object) => isSceneObjectActive(object, date)) };
}
