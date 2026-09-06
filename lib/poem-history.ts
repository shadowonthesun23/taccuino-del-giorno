export type PoemHistoryRecord = {
  poesia?: {
    autore?: unknown;
    fonte?: unknown;
    testo?: unknown;
  } | null;
};

function getText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizePoemText(value: unknown): string {
  return getText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isRecentPoemRepeat(
  poemText: unknown,
  records: PoemHistoryRecord[] | null,
): boolean {
  const poemKey = normalizePoemText(poemText);
  if (!poemKey) return false;

  return (records ?? []).slice(0, 45).some((record) => (
    normalizePoemText(record.poesia?.testo) === poemKey
  ));
}

export function formatRecentPoemExclusions(records: PoemHistoryRecord[] | null): string {
  const unique = new Map<string, string>();

  for (const record of (records ?? []).slice(0, 45)) {
    const author = getText(record.poesia?.autore);
    const source = getText(record.poesia?.fonte);
    const text = getText(record.poesia?.testo);
    const poemKey = normalizePoemText(text) || normalizePoemText(`${author} ${source}`);
    if (!poemKey) continue;

    const excerpt = text.replace(/\s+/gu, ' ').slice(0, 140);
    const label = [author, source, excerpt ? `incipit: ${excerpt}` : '']
      .filter(Boolean)
      .join(' — ');
    unique.set(poemKey, label);
  }

  return [...unique.values()].map((poem) => `- ${poem}`).join('\n');
}
