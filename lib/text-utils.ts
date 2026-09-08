export const ARTWORK_TITLE_WORD_LIMIT = 7;

export function truncateTitleAtWords(
  title: string,
  maxWords = ARTWORK_TITLE_WORD_LIMIT,
): string {
  const normalized = title.replace(/\s+/gu, ' ').trim();
  const wordLimit = Math.max(1, Math.floor(maxWords));

  if (!normalized) return '';

  const words = normalized.split(' ');
  if (words.length <= wordLimit) return normalized;

  return `${words.slice(0, wordLimit).join(' ')}…`;
}
