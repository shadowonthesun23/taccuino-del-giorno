const EDITORIAL_SELECTION_PREFIX = /^\s*scelta\s+editoriale\s*(?::|[—–-])\s*/iu;

export function sanitizeAuthorDescription(description: string): string {
  return description.replace(EDITORIAL_SELECTION_PREFIX, '');
}
