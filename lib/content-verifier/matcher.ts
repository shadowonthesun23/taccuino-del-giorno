const TYPOGRAPHIC_SPACES = /[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/gu;
const ZERO_WIDTH_SPACING = /[\u00ad\u200b-\u200d\u2060\ufeff]/gu;
const SINGLE_QUOTES = /[\u2018\u2019\u201a\u201b\u2032\u2035\u02bc\uff07]/gu;
const DOUBLE_QUOTES = /[\u201c\u201d\u201e\u201f\u2033\u2036\uff02]/gu;
const OMISSION = /\[\s*\.{3}\s*\]|…/gu;

export interface StrictMatchResult {
  matched: boolean;
  matchedText: string | null;
}

/**
 * Normalizes only canonically equivalent Unicode, typographic quote variants,
 * and spacing. Letter case, punctuation and lexical content remain unchanged.
 */
export function normalizeConservativeText(value: string): string {
  return value
    .normalize('NFC')
    .replace(TYPOGRAPHIC_SPACES, ' ')
    .replace(ZERO_WIDTH_SPACING, '')
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * Finds an exact normalized excerpt. Omission markers may skip arbitrary source
 * text, but every remaining chunk must occur verbatim and in the same order.
 */
export function matchConservativeExcerpt(
  candidate: string,
  source: string,
): StrictMatchResult {
  const normalizedSource = normalizeConservativeText(source);
  const hasOmission = OMISSION.test(candidate);
  OMISSION.lastIndex = 0;

  if (!hasOmission) {
    const normalizedCandidate = normalizeConservativeText(candidate);
    if (!normalizedCandidate) return { matched: false, matchedText: null };
    const start = normalizedSource.indexOf(normalizedCandidate);
    return start === -1
      ? { matched: false, matchedText: null }
      : {
          matched: true,
          matchedText: normalizedSource.slice(start, start + normalizedCandidate.length),
        };
  }

  const chunks = candidate
    .split(OMISSION)
    .map(normalizeConservativeText)
    .filter(Boolean);
  OMISSION.lastIndex = 0;
  if (chunks.length === 0) return { matched: false, matchedText: null };

  let cursor = 0;
  let matchStart = -1;
  let matchEnd = -1;
  for (const chunk of chunks) {
    const index = normalizedSource.indexOf(chunk, cursor);
    if (index === -1) return { matched: false, matchedText: null };
    if (matchStart === -1) matchStart = index;
    matchEnd = index + chunk.length;
    cursor = matchEnd;
  }

  return {
    matched: true,
    matchedText: normalizedSource.slice(matchStart, matchEnd),
  };
}
