import { load } from 'cheerio';
import { fetchJson } from './http.ts';
import { matchConservativeExcerpt, normalizeConservativeText } from './matcher.ts';
import {
  createMediaWikiApiUrl,
  createWikiPageUrl,
  extractRenderedMediaWikiText,
  normalizePersonName,
  type MediaWikiPage,
  type MediaWikiParseResponse,
  type MediaWikiQueryResponse,
} from './mediawiki.ts';
import type {
  PoemVerificationInput,
  VerificationResult,
  VerifierOptions,
} from './types.ts';

const SOURCE_NAME = 'Wikisource in italiano';
const ORIGIN = 'https://it.wikisource.org';
const METHOD = 'mediawiki-search-rendered-page-author-and-exact-excerpt';

export function extractPoemWorkTitle(source: string | undefined): string | null {
  if (!source?.trim()) return null;
  const quoted = source.match(/[“«"]([^”»"]+)[”»"]/u);
  if (quoted?.[1]) return quoted[1].trim();

  const compact = source
    .replace(/^\s*da\s+/iu, '')
    .replace(/\s*[—–-]\s*\d{4}.*$/u, '')
    .split(',')[0]
    ?.trim();
  return compact || null;
}

export async function verifyPoemWithWikisource(
  input: PoemVerificationInput,
  options: VerifierOptions = {},
): Promise<VerificationResult> {
  const fetcher = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const workTitle = extractPoemWorkTitle(input.source);
  const fallbackUrl = ORIGIN;
  if (!input.text.trim() || !input.author.trim()) {
    return result('unverified', fallbackUrl, null, 'missing_poem_or_author');
  }

  const searchTerms = [workTitle ? `"${workTitle}"` : null, `"${input.author.trim()}"`]
    .filter(Boolean)
    .join(' ');
  const searchUrl = createMediaWikiApiUrl(ORIGIN, {
    action: 'query',
    generator: 'search',
    gsrsearch: searchTerms,
    gsrnamespace: '0',
    gsrlimit: '5',
    prop: 'info',
  });

  try {
    const search = await fetchJson<MediaWikiQueryResponse>(searchUrl, fetcher, timeoutMs);
    const pages = rankCandidates(search.query?.pages ?? [], workTitle);
    if (pages.length === 0) {
      return result('unverified', fallbackUrl, null, 'work_not_found_by_mediawiki_search');
    }

    let foundCorrectAuthor = false;
    let correctAuthorPageUrl: string | null = null;
    for (const page of pages) {
      if (typeof page.pageid !== 'number') continue;
      const pageUrl = createWikiPageUrl(ORIGIN, page.title);
      const parseUrl = createMediaWikiApiUrl(ORIGIN, {
        action: 'parse',
        pageid: String(page.pageid),
        prop: 'text',
      });
      const parsed = await fetchJson<MediaWikiParseResponse>(parseUrl, fetcher, timeoutMs);
      const html = parsed.parse?.text;
      if (!html) continue;
      if (!renderedPageHasAuthor(html, input.author)) continue;
      foundCorrectAuthor = true;
      correctAuthorPageUrl ??= pageUrl;

      const match = matchConservativeExcerpt(input.text, extractRenderedMediaWikiText(html));
      if (match.matched) {
        return result('verified', pageUrl, match.matchedText, 'exact_conservative_match');
      }
    }

    return result(
      'unverified',
      correctAuthorPageUrl ?? ORIGIN,
      null,
      foundCorrectAuthor ? 'poem_excerpt_not_found' : 'candidate_author_mismatch',
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

function rankCandidates(
  pages: MediaWikiPage[],
  workTitle: string | null,
) {
  if (!workTitle) return pages;
  const normalizedTitle = normalizeConservativeText(workTitle).toLocaleLowerCase('it');
  return [...pages].sort((left, right) => {
    const leftTail = normalizeConservativeText(left.title.split('/').at(-1) ?? '').toLocaleLowerCase('it');
    const rightTail = normalizeConservativeText(right.title.split('/').at(-1) ?? '').toLocaleLowerCase('it');
    return Number(rightTail === normalizedTitle) - Number(leftTail === normalizedTitle);
  });
}

function renderedPageHasAuthor(html: string, author: string): boolean {
  const expected = normalizePersonName(author);
  const $ = load(html);
  const authorLinks = $('a[href*="/wiki/Autore:"]')
    .map((_, element) => normalizePersonName($(element).text()))
    .get();
  return authorLinks.includes(expected);
}

function result(
  status: VerificationResult['status'],
  sourceUrl: string,
  matchedText: string | null,
  reason: string,
): VerificationResult {
  return { status, sourceName: SOURCE_NAME, sourceUrl, matchedText, verificationMethod: METHOD, reason };
}
