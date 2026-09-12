import { load } from 'cheerio';
import { fetchJson } from './http.ts';
import {
  createMediaWikiApiUrl,
  createWikiPageUrl,
  normalizePersonName,
  type MediaWikiParseResponse,
} from './mediawiki.ts';
import type { VerifierOptions } from './types.ts';

const SOURCE_NAME = 'Wikisource in italiano';
const ORIGIN = 'https://it.wikisource.org';

export interface WikisourcePoem {
  author: string;
  title: string;
  text: string;
  sourceUrl: string;
  sourceName: string;
  pageTitle: string;
}

type WikisourceErrorCode = 'invalid_page_title' | 'http_error' | 'page_not_found' | 'author_not_structured' | 'poem_body_not_structured';

export type WikisourcePoemResult = {
  ok: true;
  poem: WikisourcePoem;
} | {
  ok: false;
  sourceUrl: string;
  sourceName: string;
  error: {
    code: WikisourceErrorCode;
    message: string;
  };
};

export async function fetchWikisourcePoem(
  pageTitleInput: string,
  options: VerifierOptions = {},
): Promise<WikisourcePoemResult> {
  const pageTitle = pageTitleInput.trim();
  const sourceUrl = pageTitle ? createWikiPageUrl(ORIGIN, pageTitle) : ORIGIN;
  if (!pageTitle) return failure(sourceUrl, 'invalid_page_title', 'Titolo pagina mancante.');

  const url = createMediaWikiApiUrl(ORIGIN, {
    action: 'parse',
    page: pageTitle,
    prop: 'text|displaytitle',
    redirects: '1',
  });
  try {
    const payload = await fetchJson<MediaWikiParseResponse>(
      url,
      options.fetch ?? fetch,
      options.timeoutMs ?? 10_000,
    );
    if (!payload.parse?.text || !payload.parse.title) {
      return failure(sourceUrl, 'page_not_found', 'La pagina Wikisource non è stata trovata.');
    }

    const extracted = extractStructuredWikisourcePoem(payload.parse.text, payload.parse.title);
    if (!extracted.author) {
      return failure(sourceUrl, 'author_not_structured', 'Autore non disponibile come link Autore:.');
    }
    if (!extracted.text) {
      return failure(sourceUrl, 'poem_body_not_structured', 'Contenitore poetico strutturato non trovato.');
    }

    return {
      ok: true,
      poem: {
        author: extracted.author,
        title: extracted.title,
        text: extracted.text,
        sourceUrl: createWikiPageUrl(ORIGIN, payload.parse.title),
        sourceName: SOURCE_NAME,
        pageTitle: payload.parse.title,
      },
    };
  } catch (error) {
    return failure(
      sourceUrl,
      'http_error',
      error instanceof Error ? error.message : 'Errore HTTP sconosciuto.',
    );
  }
}

export function extractStructuredWikisourcePoem(html: string, pageTitle: string) {
  const $ = load(html);
  const authorNames = $('a[href*="/wiki/Autore:"]')
    .map((_, element) => $(element).text().replace(/\s+/gu, ' ').trim())
    .get()
    .filter(Boolean);
  const author = [...new Map(authorNames.map((name) => [normalizePersonName(name), name])).values()][0] ?? null;

  const poemBody = $('.poem, .ws-poem, .poem-container').first().clone();
  if (poemBody.length === 0) {
    return { author, title: pageTitleToTitle(pageTitle), text: null };
  }
  poemBody.find('.noprint, .mw-editsection, .ws-noexport, sup.reference, .pagenum').remove();
  poemBody.find('br').replaceWith('\n');
  poemBody.find('p, div').each((_, element) => {
    $(element).append('\n');
  });
  const text = poemBody
    .text()
    .split(/\r?\n/u)
    .map((line) => line.replace(/[\t ]+/gu, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();

  return { author, title: pageTitleToTitle(pageTitle), text: text || null };
}

function pageTitleToTitle(pageTitle: string): string {
  return (pageTitle.split('/').at(-1) ?? pageTitle).replace(/_/gu, ' ').trim();
}

function failure(
  sourceUrl: string,
  code: WikisourceErrorCode,
  message: string,
): WikisourcePoemResult {
  return { ok: false, sourceUrl, sourceName: SOURCE_NAME, error: { code, message } };
}
