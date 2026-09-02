export function getConfiguredEditorUserId() {
  const userId = process.env.EDITOR_USER_ID?.trim();
  return userId || null;
}

export function isConfiguredEditorUser(userId: string | null | undefined) {
  const configuredUserId = getConfiguredEditorUserId();
  return Boolean(configuredUserId && userId && configuredUserId === userId);
}
