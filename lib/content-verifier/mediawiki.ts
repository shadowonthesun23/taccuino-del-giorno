import { load } from 'cheerio';

export interface MediaWikiPage {
  pageid?: number;
  ns?: number;
  title: string;
  missing?: boolean;
  extract?: string;
}

export interface MediaWikiQueryResponse {
  query?: {
    normalized?: Array<{ from: string; to: string }>;
    redirects?: Array<{ from: string; to: string }>;
    pages?: MediaWikiPage[];
  };
}

export interface MediaWikiParseResponse {
  parse?: {
    pageid: number;
    title: string;
    text: string;
  };
}

export function createMediaWikiApiUrl(
  origin: string,
  params: Record<string, string>,
): URL {
  const url = new URL('/w/api.php', origin);
  for (const [key, value] of Object.entries({
    ...params,
    format: 'json',
    formatversion: '2',
    maxlag: '5',
  })) {
    url.searchParams.set(key, value);
  }
  return url;
}

export function createWikiPageUrl(origin: string, title: string): string {
  return new URL(`/wiki/${encodeURIComponent(title.replace(/ /gu, '_'))}`, origin).toString();
}

export function extractRenderedMediaWikiText(html: string): string {
  const $ = load(html);
  $('script, style, noscript, .mw-editsection').remove();
  $('br').replaceWith('\n');
  $('p, div, li, blockquote, h1, h2, h3, h4, h5, h6, tr').each((_, element) => {
    $(element).append('\n');
  });
  return $.root().text();
}

export function normalizePersonName(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[\u2018\u2019\u02bc]/gu, "'")
    .replace(/\s+/gu, ' ')
    .trim()
    .toLocaleLowerCase('it');
}
