export type SceneVersionLike = {
  version_number: number;
  is_current: boolean;
  is_baseline: boolean;
  id: string;
};

export function nextSceneVersionNumber(versions: readonly SceneVersionLike[]) {
  return Math.max(0, ...versions.map((version) => version.version_number)) + 1;
}

export function currentSceneVersion(versions: readonly SceneVersionLike[]) {
  return versions.find((version) => version.is_current) ?? null;
}

export function rollbackVersionLabel(versionNumber: number) {
  return `Ripristino di v${versionNumber}`;
}

export function canDeleteSceneVersion() {
  return false;
}
