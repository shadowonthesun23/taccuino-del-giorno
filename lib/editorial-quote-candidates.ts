import type { WikiquoteCandidate, WikiquoteRetrievalResult } from './content-verifier/wikiquote.ts';

export const MIN_QUOTE_WORDS = 4;
export const MIN_QUOTE_CHARACTERS = 18;
export const MAX_QUOTE_WORDS = 45;
export const MAX_QUOTE_CHARACTERS = 360;
export const DEFAULT_MAX_EDITORIAL_QUOTES = 48;

export type EditorialQuoteCandidate = Readonly<{
  id: string;
  author: string;
  text: string;
  source: string | null;
  sourceUrl: string;
}>;

export type AuthorSeed = Readonly<{
  autore_giorno: string;
  breve_descrizione: string;
}>;

export class EarlyWikiquoteError extends Error {
  readonly code: 'invalid_author' | 'http_error' | 'author_mismatch' | 'no_candidates';

  constructor(code: EarlyWikiquoteError['code'], message: string) {
    super(message);
    this.name = 'EarlyWikiquoteError';
    this.code = code;
  }
}

function normalizeForDeduplication(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('it-IT')
    .replace(/[\s\u00a0]+/gu, ' ')
    .replace(/[“”«»„‟]/gu, '"')
    .replace(/[’‘]/gu, "'")
    .trim();
}

function normalizeSource(value: string | null): string {
  return normalizeForDeduplication(value ?? '') || '(senza fonte)';
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function isUsable(candidate: WikiquoteCandidate): boolean {
  const text = candidate.text.trim();
  const words = wordCount(text);
  return text.length >= MIN_QUOTE_CHARACTERS
    && words >= MIN_QUOTE_WORDS
    && words <= MAX_QUOTE_WORDS
    && text.length <= MAX_QUOTE_CHARACTERS;
}

function editorialLengthTier(candidate: WikiquoteCandidate): number {
  const words = wordCount(candidate.text);
  if (words >= 8 && words <= 30) return 0;
  if (words >= 31 && words <= MAX_QUOTE_WORDS) return 1;
  return 2;
}

/** Filters without rewriting quote text, then caps with stable source round-robin sampling. */
export function prepareEditorialQuoteCandidates(
  input: readonly WikiquoteCandidate[],
  maxCandidates = DEFAULT_MAX_EDITORIAL_QUOTES,
): EditorialQuoteCandidate[] {
  if (maxCandidates <= 0) return [];

  const seenTexts = new Set<string>();
  const groups = new Map<string, WikiquoteCandidate[]>();

  for (const candidate of input) {
    if (!isUsable(candidate)) continue;
    const textKey = normalizeForDeduplication(candidate.text);
    if (seenTexts.has(textKey)) continue;
    seenTexts.add(textKey);

    const sourceKey = normalizeSource(candidate.source);
    const group = groups.get(sourceKey) ?? [];
    group.push(candidate);
    groups.set(sourceKey, group);
  }

  const selected: WikiquoteCandidate[] = [];
  const queues = [...groups.values()].map((group) => group
    .map((candidate, index) => ({ candidate, index }))
    .sort((left, right) => editorialLengthTier(left.candidate) - editorialLengthTier(right.candidate)
      || left.index - right.index)
    .map(({ candidate }) => candidate));
  for (let offset = 0; selected.length < maxCandidates; offset += 1) {
    let added = false;
    for (const group of queues) {
      const candidate = group[offset];
      if (!candidate) continue;
      selected.push(candidate);
      added = true;
      if (selected.length === maxCandidates) break;
    }
    if (!added) break;
  }

  return selected.map((candidate, index) => Object.freeze({
    id: `Q${String(index + 1).padStart(2, '0')}`,
    author: candidate.author,
    text: candidate.text,
    source: candidate.source,
    sourceUrl: candidate.sourceUrl,
  }));
}

type EarlyRetrievalOptions = {
  forcedAuthor?: string;
  fetchCandidates: (author: string) => Promise<WikiquoteRetrievalResult>;
  recoverAuthor: (rejectedAuthor: string) => Promise<AuthorSeed>;
};

export async function retrieveEarlyEditorialQuotes(
  initialAuthor: AuthorSeed,
  { forcedAuthor = '', fetchCandidates, recoverAuthor }: EarlyRetrievalOptions,
): Promise<{ authorSeed: AuthorSeed; quotes: EditorialQuoteCandidate[] }> {
  let authorSeed = initialAuthor;

  for (let retrieval = 1; retrieval <= 2; retrieval += 1) {
    const result = await fetchCandidates(authorSeed.autore_giorno);
    if (!result.ok) throw new EarlyWikiquoteError(result.error.code, result.error.message);

    const quotes = prepareEditorialQuoteCandidates(result.candidates);
    if (result.pageFound && quotes.length > 0) return { authorSeed, quotes };

    if (forcedAuthor.trim() || retrieval === 2) {
      throw new EarlyWikiquoteError(
        'no_candidates',
        `Nessuna citazione Wikiquote editorialmente utilizzabile per ${authorSeed.autore_giorno}.`,
      );
    }

    const rejectedAuthor = authorSeed.autore_giorno;
    authorSeed = await recoverAuthor(rejectedAuthor);
    if (normalizeForDeduplication(authorSeed.autore_giorno) === normalizeForDeduplication(rejectedAuthor)) {
      throw new EarlyWikiquoteError('no_candidates', 'Il recovery autore ha riproposto l’autore senza citazioni utilizzabili.');
    }
  }

  throw new EarlyWikiquoteError('no_candidates', 'Nessuna citazione Wikiquote editorialmente utilizzabile.');
}

export function formatEditorialQuoteCandidates(quotes: readonly EditorialQuoteCandidate[]): string {
  return quotes.map((quote) => `${quote.id} | ${quote.source ?? `Wikiquote — ${quote.author}`} | ${quote.text}`).join('\n');
}

export function injectSelectedEditorialQuote<T extends Record<string, unknown>>(
  generated: T & { selected_quote_id?: unknown },
  authorSeed: AuthorSeed,
  quotes: readonly EditorialQuoteCandidate[],
  dataOdierna: string,
): Omit<T, 'selected_quote_id'> & Record<string, unknown> {
  const selectedQuoteId = typeof generated.selected_quote_id === 'string'
    ? generated.selected_quote_id.trim()
    : '';
  const selected = quotes.find((quote) => quote.id === selectedQuoteId);
  if (!selected) throw new Error(`selected_quote_id sconosciuto: ${selectedQuoteId || '(assente)'}`);

  const { selected_quote_id: _selectedQuoteId, ...editorialFields } = generated;
  return {
    ...editorialFields,
    data_odierna: dataOdierna,
    autore_giorno: authorSeed.autore_giorno,
    breve_descrizione: authorSeed.breve_descrizione,
    citazione: {
      testo: selected.text,
      autore: selected.author,
      fonte: selected.source ?? `Wikiquote — ${selected.author}`,
    },
  };
}
