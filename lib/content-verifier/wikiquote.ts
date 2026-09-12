import { fetchJson } from './http.ts';
import { matchConservativeExcerpt } from './matcher.ts';
import {
  createMediaWikiApiUrl,
  createWikiPageUrl,
  normalizePersonName,
  type MediaWikiQueryResponse,
} from './mediawiki.ts';
import type {
  QuoteVerificationInput,
  VerificationResult,
  VerifierOptions,
} from './types.ts';

const SOURCE_NAME = 'Wikiquote in italiano';
const ORIGIN = 'https://it.wikiquote.org';
const METHOD = 'mediawiki-author-page-exact-extract';

export interface WikiquoteCandidate {
  author: string;
  text: string;
  source: string | null;
  sourceDetail: 'inline' | 'section' | null;
  sourceUrl: string;
}

export type WikiquoteRetrievalResult = {
  ok: true;
  requestedAuthor: string;
  resolvedAuthor: string | null;
  pageFound: boolean;
  sourceUrl: string | null;
  sourceName: string;
  candidates: WikiquoteCandidate[];
} | {
  ok: false;
  requestedAuthor: string;
  resolvedAuthor: null;
  pageFound: false;
  sourceUrl: string | null;
  sourceName: string;
  candidates: [];
  error: { code: 'invalid_author' | 'http_error' | 'author_mismatch'; message: string };
};

interface ResolvedAuthorPage {
  title: string;
  extract: string;
  sourceUrl: string;
}

export async function verifyQuoteWithWikiquote(
  input: QuoteVerificationInput,
  options: VerifierOptions = {},
): Promise<VerificationResult> {
  const fetcher = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const author = input.author.trim();
  const fallbackUrl = author ? createWikiPageUrl(ORIGIN, author) : ORIGIN;

  if (!author || !input.text.trim()) {
    return result('unverified', fallbackUrl, null, 'missing_quote_or_author');
  }

  try {
    const resolved = await resolveWikiquoteAuthorPage(author, fetcher, timeoutMs);
    if (!resolved) {
      return result('unverified', fallbackUrl, null, 'author_page_not_found');
    }
    const match = matchConservativeExcerpt(input.text, resolved.extract);
    return result(
      match.matched ? 'verified' : 'unverified',
      resolved.sourceUrl,
      match.matchedText,
      match.matched ? 'exact_conservative_match' : 'quote_not_found_on_author_page',
    );
  } catch (error) {
    if (error instanceof WikiquoteAuthorMismatchError) {
      return result('unverified', error.sourceUrl, null, 'resolved_page_author_mismatch');
    }
    return result(
      'error',
      fallbackUrl,
      null,
      `http_or_api_error: ${error instanceof Error ? error.message : 'errore sconosciuto'}`,
    );
  }
}

export async function fetchWikiquoteCandidates(
  authorInput: string,
  options: VerifierOptions = {},
): Promise<WikiquoteRetrievalResult> {
  const author = authorInput.trim();
  if (!author) {
    return {
      ok: false,
      requestedAuthor: authorInput,
      resolvedAuthor: null,
      pageFound: false,
      sourceUrl: null,
      sourceName: SOURCE_NAME,
      candidates: [],
      error: { code: 'invalid_author', message: 'Autore mancante.' },
    };
  }

  try {
    const resolved = await resolveWikiquoteAuthorPage(
      author,
      options.fetch ?? fetch,
      options.timeoutMs ?? 10_000,
    );
    if (!resolved) {
      return {
        ok: true,
        requestedAuthor: author,
        resolvedAuthor: null,
        pageFound: false,
        sourceUrl: null,
        sourceName: SOURCE_NAME,
        candidates: [],
      };
    }

    return {
      ok: true,
      requestedAuthor: author,
      resolvedAuthor: resolved.title,
      pageFound: true,
      sourceUrl: resolved.sourceUrl,
      sourceName: SOURCE_NAME,
      candidates: parseWikiquoteCandidates(resolved.extract, resolved.title, resolved.sourceUrl),
    };
  } catch (error) {
    const mismatch = error instanceof WikiquoteAuthorMismatchError;
    return {
      ok: false,
      requestedAuthor: author,
      resolvedAuthor: null,
      pageFound: false,
      sourceUrl: mismatch ? error.sourceUrl : createWikiPageUrl(ORIGIN, author),
      sourceName: SOURCE_NAME,
      candidates: [],
      error: {
        code: mismatch ? 'author_mismatch' : 'http_error',
        message: error instanceof Error ? error.message : 'Errore sconosciuto.',
      },
    };
  }
}

export function parseWikiquoteCandidates(
  extract: string,
  author: string,
  sourceUrl: string,
): WikiquoteCandidate[] {
  const lines = extract.split(/\r?\n/u);
  const hasAuthorQuotesHeading = lines.some((rawLine) => {
    const heading = rawLine.trim().match(/^(={2,6})\s*(.+?)\s*\1$/u);
    return heading ? normalizePersonName(heading[2]).startsWith('citazioni di ') : false;
  });
  const candidates: WikiquoteCandidate[] = [];
  let inAuthorQuotes = !hasAuthorQuotesHeading;
  let skippedLeadDescription = false;
  let sectionSource: { level: number; title: string } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const heading = line.match(/^(={2,6})\s*(.+?)\s*\1$/u);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim();
      const normalized = normalizePersonName(title);
      if (normalized.startsWith('citazioni di ')) {
        inAuthorQuotes = true;
        sectionSource = null;
      } else if (isExcludedWikiquoteSection(normalized)) {
        inAuthorQuotes = false;
        sectionSource = null;
      } else if (inAuthorQuotes && isGenericQuoteSubsection(normalized)) {
        if (sectionSource && level <= sectionSource.level) sectionSource = null;
      } else if (inAuthorQuotes) {
        sectionSource = { level, title };
      }
      continue;
    }

    if (!inAuthorQuotes || line.length < 12) continue;
    if (!hasAuthorQuotesHeading && !skippedLeadDescription) {
      skippedLeadDescription = true;
      continue;
    }
    const inline = splitWikiquoteInlineSource(line);
    const text = inline.text.replace(/\s+\|\s+/gu, '\n').trim();
    if (!text) continue;
    candidates.push({
      author,
      text,
      source: inline.source ?? sectionSource?.title ?? null,
      sourceDetail: inline.source ? 'inline' : sectionSource ? 'section' : null,
      sourceUrl,
    });
  }

  return candidates;
}

async function resolveWikiquoteAuthorPage(
  author: string,
  fetcher: NonNullable<VerifierOptions['fetch']>,
  timeoutMs: number,
): Promise<ResolvedAuthorPage | null> {
  const url = createMediaWikiApiUrl(ORIGIN, {
    action: 'query',
    prop: 'extracts',
    explaintext: '1',
    redirects: '1',
    titles: author,
  });
  const payload = await fetchJson<MediaWikiQueryResponse>(url, fetcher, timeoutMs);
  const page = payload.query?.pages?.[0];
  if (!page || page.missing || !page.extract) return null;

  const requestedName = normalizePersonName(author);
  const normalizedInput = payload.query?.normalized?.find(
    (entry) => normalizePersonName(entry.from) === requestedName,
  )?.to ?? author;
  const normalizedRequestedName = normalizePersonName(normalizedInput);
  const pageName = normalizePersonName(page.title);
  const acceptedRedirect = payload.query?.redirects?.some(
    (entry) => normalizePersonName(entry.from) === normalizedRequestedName
      && normalizePersonName(entry.to) === pageName,
  );
  if (pageName !== normalizedRequestedName && !acceptedRedirect) {
    throw new WikiquoteAuthorMismatchError(createWikiPageUrl(ORIGIN, page.title));
  }
  return {
    title: page.title,
    extract: page.extract,
    sourceUrl: createWikiPageUrl(ORIGIN, page.title),
  };
}

function splitWikiquoteInlineSource(line: string): { text: string; source: string | null } {
  const match = line.match(/^(.*?)\s+\((?:da|in|tratto da|citato in)\s+(.{3,})\)\s*$/iu);
  if (!match) return { text: line, source: null };
  return { text: match[1].trim(), source: match[2].trim() };
}

function isExcludedWikiquoteSection(normalizedHeading: string): boolean {
  return /^(citazioni su|attribuite|attribuzioni errate|note|bibliografia|altri progetti|voci correlate|collegamenti esterni|fonti)/u
    .test(normalizedHeading);
}

function isGenericQuoteSubsection(normalizedHeading: string): boolean {
  return /^(citazioni|incipit|explicit|frasi|estratti|aforismi|poesie|interviste)$/u
    .test(normalizedHeading);
}

class WikiquoteAuthorMismatchError extends Error {
  readonly sourceUrl: string;

  constructor(sourceUrl: string) {
    super('La pagina risolta appartiene a un autore diverso.');
    this.name = 'WikiquoteAuthorMismatchError';
    this.sourceUrl = sourceUrl;
  }
}

function result(
  status: VerificationResult['status'],
  sourceUrl: string,
  matchedText: string | null,
  reason: string,
): VerificationResult {
  return { status, sourceName: SOURCE_NAME, sourceUrl, matchedText, verificationMethod: METHOD, reason };
}
