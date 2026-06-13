export interface SaintArtwork {
  imageUrl: string;
  sourceUrl: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  source: 'wikimedia' | 'met';
}

type JsonRecord = Record<string, unknown>;

const SAINT_DESCRIPTION_TERMS = [
  'abate',
  'apostol',
  'beata',
  'beato',
  'bishop',
  'cardinal',
  'cleric',
  'eremita',
  'evangelist',
  'fondator',
  'frate',
  'friar',
  'hermit',
  'martire',
  'martyr',
  'missionar',
  'mistica',
  'mistico',
  'monaco',
  'monaca',
  'nun',
  'patriarch',
  'papa',
  'pope',
  'priest',
  'presbiter',
  'religios',
  'saint',
  'santa',
  'santo',
  'theolog',
  'vescovo',
  'virgin',
];

const ALLOWED_LICENSE_TERMS = [
  'cc0',
  'cc by',
  'cc-by',
  'creative commons attribution',
  'public domain',
  'pubblico dominio',
];

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/^(san|santa|santo|sant)\b['’]?\s*/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
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

function isAllowedLicense(license: string): boolean {
  const normalized = license.toLowerCase();
  return ALLOWED_LICENSE_TERMS.some((term) => normalized.includes(term));
}

function isLikelySaint(query: string, label: string, description: string): boolean {
  const normalizedQuery = normalizeName(query);
  const normalizedLabel = normalizeName(label);
  if (
    !normalizedQuery
    || !normalizedLabel
    || (
      normalizedQuery !== normalizedLabel
      && !normalizedQuery.includes(normalizedLabel)
      && !normalizedLabel.includes(normalizedQuery)
    )
  ) {
    return false;
  }

  const normalizedDescription = description.toLowerCase();
  return SAINT_DESCRIPTION_TERMS.some((term) => normalizedDescription.includes(term));
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'TaccuinoDelGiorno/1.0 (daily cultural journal)' },
    next: { revalidate: 2592000 },
  });
  if (!response.ok) {
    throw new Error(`Saint artwork provider responded with ${response.status}`);
  }
  return response.json();
}

async function commonsArtwork(filename: string): Promise<SaintArtwork | null> {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('titles', `File:${filename}`);
  url.searchParams.set('iiprop', 'url|extmetadata');
  url.searchParams.set('iiurlwidth', '1200');
  url.searchParams.set('origin', '*');

  const payload = asRecord(await fetchJson(url.toString()));
  const query = asRecord(payload?.query);
  const pages = asRecord(query?.pages);
  const page = pages ? Object.values(pages).map(asRecord).find(Boolean) : null;
  const imageInfo = Array.isArray(page?.imageinfo)
    ? asRecord(page.imageinfo[0])
    : null;
  const metadata = asRecord(imageInfo?.extmetadata);
  const license = metadataValue(metadata, 'LicenseShortName')
    || metadataValue(metadata, 'UsageTerms');
  const imageUrl = asString(imageInfo?.thumburl) || asString(imageInfo?.url);

  if (!imageUrl || !license || !isAllowedLicense(license)) return null;

  return {
    imageUrl,
    sourceUrl: asString(imageInfo?.descriptionurl) || 'https://commons.wikimedia.org/',
    title: metadataValue(metadata, 'ObjectName') || filename.replace(/_/g, ' '),
    author: metadataValue(metadata, 'Artist') || metadataValue(metadata, 'Credit'),
    license,
    licenseUrl: metadataValue(metadata, 'LicenseUrl'),
    source: 'wikimedia',
  };
}

interface WikidataMatch {
  englishLabel: string;
  artwork: SaintArtwork | null;
}

async function findWikidataMatch(name: string): Promise<WikidataMatch | null> {
  const searchUrl = new URL('https://www.wikidata.org/w/api.php');
  searchUrl.searchParams.set('action', 'wbsearchentities');
  searchUrl.searchParams.set('format', 'json');
  searchUrl.searchParams.set('search', name);
  searchUrl.searchParams.set('language', 'it');
  searchUrl.searchParams.set('uselang', 'it');
  searchUrl.searchParams.set('type', 'item');
  searchUrl.searchParams.set('limit', '8');
  searchUrl.searchParams.set('origin', '*');

  const searchPayload = asRecord(await fetchJson(searchUrl.toString()));
  const results = Array.isArray(searchPayload?.search) ? searchPayload.search : [];
  const match = results
    .map(asRecord)
    .find((result) => result && isLikelySaint(
      name,
      asString(result.label),
      asString(result.description)
    ));
  const entityId = asString(match?.id);
  if (!entityId) return null;

  const entityPayload = asRecord(await fetchJson(
    `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(entityId)}.json`
  ));
  const entity = asRecord(asRecord(entityPayload?.entities)?.[entityId]);
  const labels = asRecord(entity?.labels);
  const englishLabel = asString(asRecord(labels?.en)?.value);
  const claims = asRecord(entity?.claims);
  const imageClaims = Array.isArray(claims?.P18) ? claims.P18 : [];
  const imageClaim = asRecord(imageClaims[0]);
  const mainSnak = asRecord(imageClaim?.mainsnak);
  const dataValue = asRecord(mainSnak?.datavalue);
  const filename = asString(dataValue?.value);

  if (filename) {
    const artwork = await commonsArtwork(filename);
    if (artwork) {
      return { englishLabel, artwork };
    }
  }

  return { englishLabel, artwork: null };
}

function wikipediaTitleVariants(name: string): string[] {
  return Array.from(new Set([
    name,
    name.replace(/^Sant['’]\s*/i, 'San '),
    name.replace(/^Santo\s+/i, ''),
    name.replace(/^Santa\s+/i, ''),
    name.replace(/^San\s+/i, ''),
  ].map((value) => value.trim()).filter(Boolean)));
}

function commonsFilenameFromUrl(value: string): string {
  try {
    const parts = new URL(value).pathname.split('/').filter(Boolean);
    const thumbIndex = parts.indexOf('thumb');
    const filename = thumbIndex >= 0 ? parts.at(-2) : parts.at(-1);
    return filename ? decodeURIComponent(filename) : '';
  } catch {
    return '';
  }
}

async function findWikipediaArtwork(name: string): Promise<SaintArtwork | null> {
  for (const title of wikipediaTitleVariants(name)) {
    try {
      const payload = asRecord(await fetchJson(
        `https://it.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
      ));
      if (!payload || payload.type === 'disambiguation') continue;
      if (!isLikelySaint(name, asString(payload.title), asString(payload.description))) continue;

      const originalImage = asRecord(payload.originalimage);
      const thumbnail = asRecord(payload.thumbnail);
      const filename = commonsFilenameFromUrl(
        asString(originalImage?.source) || asString(thumbnail?.source)
      );
      if (!filename) continue;

      const artwork = await commonsArtwork(filename);
      if (artwork) return artwork;
    } catch {
      // Try the next title variant.
    }
  }
  return null;
}

async function findMetArtwork(name: string): Promise<SaintArtwork | null> {
  if (!name) return null;

  const searchUrl = new URL('https://collectionapi.metmuseum.org/public/collection/v1/search');
  searchUrl.searchParams.set('q', name);
  searchUrl.searchParams.set('hasImages', 'true');
  searchUrl.searchParams.set('isPublicDomain', 'true');
  const payload = asRecord(await fetchJson(searchUrl.toString()));
  const objectIds = Array.isArray(payload?.objectIDs)
    ? payload.objectIDs.filter((id): id is number => typeof id === 'number').slice(0, 10)
    : [];

  const objects = await Promise.all(objectIds.map(async (id) => {
    try {
      return asRecord(await fetchJson(
        `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`
      ));
    } catch {
      return null;
    }
  }));

  const normalizedName = normalizeName(name);
  const object = objects.find((candidate) => {
    if (!candidate || candidate.isPublicDomain !== true) return false;
    const title = normalizeName(asString(candidate.title));
    return title.includes(normalizedName) || normalizedName.includes(title);
  });
  if (!object) return null;

  const imageUrl = asString(object.primaryImageSmall) || asString(object.primaryImage);
  const objectUrl = asString(object.objectURL);
  if (!imageUrl || !objectUrl) return null;

  return {
    imageUrl,
    sourceUrl: objectUrl,
    title: asString(object.title),
    author: asString(object.artistDisplayName),
    license: 'Public Domain',
    licenseUrl: 'https://www.metmuseum.org/about-the-met/policies-and-documents/open-access',
    source: 'met',
  };
}

export async function findSaintArtwork(name: string): Promise<SaintArtwork | null> {
  try {
    const wikidataMatch = await findWikidataMatch(name);
    if (wikidataMatch) {
      if (wikidataMatch.artwork) return wikidataMatch.artwork;

      const metArtwork = await findMetArtwork(wikidataMatch.englishLabel);
      if (metArtwork) return metArtwork;
    }
  } catch (error) {
    console.warn('Ricerca iconografica Wikidata non disponibile:', error);
  }

  try {
    return await findWikipediaArtwork(name);
  } catch (error) {
    console.warn('Ricerca iconografica Wikipedia non disponibile:', error);
    return null;
  }
}
