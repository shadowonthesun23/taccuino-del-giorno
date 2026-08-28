import type { ReadingMedia } from './types';

type JsonRecord = Record<string, unknown>;

const WIKIPEDIA_LANGUAGES = ['it', 'en'] as const;
const BIBLE_FILE_NAME = 'Bible-open.jpg';

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function stripHtml(value: unknown): string {
  return asString(value)
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function metadataValue(metadata: JsonRecord | null, key: string): string {
  return stripHtml(asRecord(metadata?.[key])?.value);
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'TaccuinoDelGiorno/1.0 (daily cultural journal)' },
    next: { revalidate: 2_592_000 },
  });

  if (!response.ok) {
    throw new Error(`Reading media provider responded with ${response.status}`);
  }

  return response.json();
}

function personTitleVariants(name: string): string[] {
  const cleaned = name
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return Array.from(new Set([name.trim(), cleaned].filter(Boolean)));
}

function wikipediaPageUrl(language: string, title: string): string {
  return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`;
}

function wikipediaImageSource(payload: JsonRecord): string {
  const thumbnail = asRecord(payload.thumbnail);
  const originalImage = asRecord(payload.originalimage);
  return asString(thumbnail?.source) || asString(originalImage?.source);
}

export async function findPoetPortrait(name: string): Promise<ReadingMedia | null> {
  const variants = personTitleVariants(name);
  if (variants.length === 0) return null;

  for (const language of WIKIPEDIA_LANGUAGES) {
    for (const title of variants) {
      try {
        const payload = asRecord(await fetchJson(
          `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
        ));
        if (!payload || payload.type === 'disambiguation' || payload.type === 'missing') continue;

        const imageUrl = wikipediaImageSource(payload);
        if (!imageUrl) continue;

        const resolvedTitle = asString(payload.title) || title;
        const contentUrls = asRecord(payload.content_urls);
        const desktopUrls = asRecord(contentUrls?.desktop);

        return {
          imageUrl,
          sourceUrl: asString(desktopUrls?.page) || wikipediaPageUrl(language, resolvedTitle),
          title: resolvedTitle,
          author: '',
          license: '',
          licenseUrl: 'https://en.wikipedia.org/wiki/Wikipedia:Copyrights',
          source: 'wikipedia',
        };
      } catch {
        // Try the next language/title variant.
      }
    }
  }

  return null;
}

export async function findOpenBibleMedia(): Promise<ReadingMedia | null> {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('titles', `File:${BIBLE_FILE_NAME}`);
  url.searchParams.set('iiprop', 'url|extmetadata');
  url.searchParams.set('iiurlwidth', '1200');
  url.searchParams.set('origin', '*');

  try {
    const payload = asRecord(await fetchJson(url.toString()));
    const query = asRecord(payload?.query);
    const pages = asRecord(query?.pages);
    const page = pages ? Object.values(pages).map(asRecord).find(Boolean) : null;
    const imageInfo = Array.isArray(page?.imageinfo)
      ? asRecord(page.imageinfo[0])
      : null;
    const metadata = asRecord(imageInfo?.extmetadata);
    const imageUrl = asString(imageInfo?.thumburl) || asString(imageInfo?.url);
    if (!imageUrl) return null;

    return {
      imageUrl,
      sourceUrl: asString(imageInfo?.descriptionurl) || 'https://commons.wikimedia.org/wiki/File:Bible-open.jpg',
      title: metadataValue(metadata, 'ObjectName') || BIBLE_FILE_NAME,
      author: metadataValue(metadata, 'Artist') || 'David Ball',
      license: metadataValue(metadata, 'LicenseShortName') || 'CC BY-SA 3.0',
      licenseUrl: metadataValue(metadata, 'LicenseUrl') || 'https://creativecommons.org/licenses/by-sa/3.0/',
      source: 'wikimedia',
    };
  } catch {
    return null;
  }
}
