import { createPoliteCachedFetch } from './content-verifier/rate-limited-fetch.ts';
import { matchConservativeExcerpt, normalizeConservativeText } from './content-verifier/matcher.ts';
import { fetchWikiquoteCandidates, type WikiquoteCandidate, type WikiquoteRetrievalResult } from './content-verifier/wikiquote.ts';
import type { FetchLike } from './content-verifier/types.ts';

const wikiquoteFetch = createPoliteCachedFetch({ serializedHosts: ['it.wikiquote.org'] });
const STOPWORDS = new Set('che del della delle degli dei un una uno il lo la i gli le e o di a in per con non è è da su al alla ai alle come questa questo'.split(' '));

export class WikiquoteFinalizationError extends Error {
  readonly code: 'invalid_author' | 'http_error' | 'author_mismatch' | 'no_candidates';
  constructor(code: 'invalid_author' | 'http_error' | 'author_mismatch' | 'no_candidates', message: string) {
    super(message);
    this.name = 'WikiquoteFinalizationError';
    this.code = code;
  }
}

export type QuoteCandidateFetcher = (author: string, options: { fetch?: FetchLike; timeoutMs?: number }) => Promise<WikiquoteRetrievalResult>;

function terms(value: string): Set<string> {
  return new Set(normalizeConservativeText(value).toLocaleLowerCase('it').replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/u).filter((word) => word.length >= 3 && !STOPWORDS.has(word)));
}

function chooseCandidate(candidates: WikiquoteCandidate[], signal: string, generatedSource: string): WikiquoteCandidate {
  const signalTerms = terms(signal);
  const sourceTerms = terms(generatedSource);
  return candidates.map((candidate, index) => {
    const candidateTerms = terms(candidate.text);
    let overlap = 0;
    for (const word of signalTerms) if (candidateTerms.has(word)) overlap += 1;
    let score = overlap * 1000 + (signalTerms.size ? overlap / signalTerms.size : 0) * 100;
    if (matchConservativeExcerpt(signal, candidate.text).matched) score += 1_000_000;
    if (generatedSource.trim() && candidate.source) {
      const candidateSourceTerms = terms(candidate.source);
      for (const word of sourceTerms) if (candidateSourceTerms.has(word)) score += 250;
      if (normalizeConservativeText(candidate.source).toLocaleLowerCase('it').includes(normalizeConservativeText(generatedSource).toLocaleLowerCase('it'))) score += 10_000;
    }
    return { candidate, score, declared: candidate.source ? 1 : 0, index };
  }).sort((a, b) => b.score - a.score || b.declared - a.declared || a.index - b.index)[0].candidate;
}

export interface FinalizeGeneratedQuoteOptions {
  fetch?: FetchLike;
  timeoutMs?: number;
  fetchCandidates?: QuoteCandidateFetcher;
}

export async function finalizeGeneratedQuote<T extends Record<string, unknown>>(
  generatedData: T,
  options: FinalizeGeneratedQuoteOptions = {},
): Promise<T> {
  const author = typeof generatedData.autore_giorno === 'string' ? generatedData.autore_giorno.trim() : '';
  if (!author) throw new WikiquoteFinalizationError('invalid_author', 'Autore del giorno mancante.');
  const citation = generatedData.citazione && typeof generatedData.citazione === 'object' ? generatedData.citazione as Record<string, unknown> : {};
  const result = await (options.fetchCandidates ?? fetchWikiquoteCandidates)(author, { fetch: options.fetch ?? wikiquoteFetch, timeoutMs: options.timeoutMs ?? 8_000 });
  if (!result.ok) throw new WikiquoteFinalizationError(result.error.code, result.error.message);
  if (!result.pageFound || result.candidates.length === 0) throw new WikiquoteFinalizationError('no_candidates', `Nessuna citazione Wikiquote disponibile per ${author}.`);
  const selected = chooseCandidate(result.candidates, typeof citation.testo === 'string' ? citation.testo : '', typeof citation.fonte === 'string' ? citation.fonte : '');
  return { ...generatedData, citazione: { ...citation, testo: selected.text, autore: selected.author, fonte: selected.source ?? `Wikiquote — ${selected.author}` } };
}
