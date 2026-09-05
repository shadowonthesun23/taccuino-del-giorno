const EDITORIAL_SELECTION_PREFIX = /^\s*scelta\s+editoriale\s*(?::|[—–-])\s*/iu;
const DEFAULT_AUTHOR_TEASER_MAX_LENGTH = 112;

export function sanitizeAuthorDescription(description: string): string {
  return description.replace(EDITORIAL_SELECTION_PREFIX, '');
}

export function getAuthorTeaser(text: string, maxLength = DEFAULT_AUTHOR_TEASER_MAX_LENGTH): string {
  const firstSentence = text.match(/^[\s\S]*?[.!?](?=\s|$)/u)?.[0]?.trim() || text.trim();
  const cleanedSentence = firstSentence
    .replace(/\s*[([{][^\])}]*[\])}]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (cleanedSentence.length <= maxLength) return cleanedSentence;

  const prefix = cleanedSentence.slice(0, maxLength);
  const boundary = Math.max(
    prefix.lastIndexOf(','),
    prefix.lastIndexOf(';'),
    prefix.lastIndexOf(':'),
    prefix.lastIndexOf(' — '),
    prefix.lastIndexOf(' – '),
  );
  const minimumBoundary = maxLength === DEFAULT_AUTHOR_TEASER_MAX_LENGTH
    ? 48
    : Math.max(48, Math.floor(maxLength * 0.45));

  if (boundary >= minimumBoundary) {
    return `${prefix.slice(0, boundary).replace(/[,:;–—-]+$/u, '').trim()}…`;
  }

  const words = prefix.trim().split(/\s+/u);
  let teaser = words.slice(0, -1).join(' ');
  while (/\b(?:e|ed|di|del|della|dei|degli|delle|il|lo|la|i|gli|le|un|uno|una|che|con|per|in|a|da|nel|nella|è|fu|ha)$/iu.test(teaser)) {
    teaser = teaser.replace(/\s+\S+$/u, '');
  }

  return `${teaser.replace(/[,:;–—-]+$/u, '').trim()}…`;
}
