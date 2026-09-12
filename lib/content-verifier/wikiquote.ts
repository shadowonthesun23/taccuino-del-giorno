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

  const url = createMediaWikiApiUrl(ORIGIN, {
    action: 'query',
    prop: 'extracts',
    explaintext: '1',
    redirects: '1',
    titles: author,
  });

  try {
    const payload = await fetchJson<MediaWikiQueryResponse>(url, fetcher, timeoutMs);
    const page = payload.query?.pages?.[0];
    if (!page || page.missing || !page.extract) {
      return result('unverified', fallbackUrl, null, 'author_page_not_found');
    }

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
      return result(
        'unverified',
        createWikiPageUrl(ORIGIN, page.title),
        null,
        'resolved_page_author_mismatch',
      );
    }

    const match = matchConservativeExcerpt(input.text, page.extract);
    return result(
      match.matched ? 'verified' : 'unverified',
      createWikiPageUrl(ORIGIN, page.title),
      match.matchedText,
      match.matched ? 'exact_conservative_match' : 'quote_not_found_on_author_page',
    );
  } catch (error) {
    return result(
      'error',
      fallbackUrl,
      null,
      `http_or_api_error: ${error instanceof Error ? error.message : 'errore sconosciuto'}`,
    );
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
