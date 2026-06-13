export type ArtworkSource = 'met' | 'artic' | 'cleveland';

export interface Artwork {
  titolo: string;
  artista: string;
  anno: string;
  immagine_url: string;
  immagine_url_hd: string;
  museo: string;
  medium: string;
  medium_it?: string;
  dipartimento: string;
  dipartimento_it?: string;
  nota: string;
  keyword_ricerca: string;
  source?: ArtworkSource;
  source_id?: string;
  source_url?: string;
  rights?: string;
  met_object_id?: number;
  met_url?: string;
}

interface ArtworkSearchOptions {
  keyword: string;
  dataIso: string;
  recentKeys?: Set<string>;
  recentTitles?: Set<string>;
}

type JsonRecord = Record<string, unknown>;
type ArtworkProvider = (keyword: string, seed: string) => Promise<Artwork[]>;

const FALLBACK_THEMES = [
  'light',
  'memory',
  'nature',
  'music',
  'poetry',
  'portrait',
  'landscape',
  'devotion',
  'silence',
  'spring',
];

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function firstLine(value: unknown): string {
  return asString(value).split(/\r?\n/, 1)[0]?.trim() ?? '';
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rotate<T>(items: T[], offset: number): T[] {
  if (items.length === 0) return items;
  const start = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function seededOrder<T>(items: T[], seed: string): T[] {
  return items
    .map((item, index) => ({
      item,
      score: hashString(`${seed}:${index}:${JSON.stringify(item)}`),
    }))
    .sort((left, right) => left.score - right.score)
    .map(({ item }) => item);
}

function normalizeTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function artworkKey(artwork: Partial<Artwork>): string {
  if (artwork.source && artwork.source_id) {
    return `${artwork.source}:${artwork.source_id}`;
  }
  if (artwork.met_object_id !== undefined) {
    return `met:${artwork.met_object_id}`;
  }
  return '';
}

export function artworkTitleKey(artwork: Partial<Artwork>): string {
  return normalizeTitle(asString(artwork.titolo));
}

async function translateArtworkFieldsWithGemini(
  artwork: Artwork,
  fields: Array<{ key: 'medium_it' | 'dipartimento_it'; value: string }>
): Promise<Artwork> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return artwork;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });
    const source = Object.fromEntries(fields.map((field) => [field.key, field.value]));
    const result = await model.generateContent(
      `Traduci in italiano questi metadati museali inglesi. Mantieni termini tecnici, nomi propri e date. `
      + `Restituisci esclusivamente un oggetto JSON con le stesse chiavi: ${JSON.stringify(source)}`
    );
    const text = result.response.text().replace(/```json|```/gi, '').trim();
    const translations = asRecord(JSON.parse(text));
    if (!translations) return artwork;

    const localized: Artwork = { ...artwork };
    fields.forEach((field) => {
      const translated = asString(translations[field.key]);
      if (translated) localized[field.key] = translated;
    });
    return localized;
  } catch (error) {
    console.warn('Fallback Gemini per i metadati dell’opera non disponibile:', error);
    return artwork;
  }
}

export async function localizeArtworkToItalian(artwork: Artwork): Promise<Artwork> {
  if (
    (!artwork.medium || artwork.medium_it)
    && (!artwork.dipartimento || artwork.dipartimento_it)
  ) {
    return artwork;
  }

  const fields = [
    { key: 'medium_it' as const, value: artwork.medium },
    { key: 'dipartimento_it' as const, value: artwork.dipartimento },
  ].filter((field) => field.value && !artwork[field.key]);
  if (fields.length === 0) return artwork;

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) return translateArtworkFieldsWithGemini(artwork, fields);

  const body = new URLSearchParams();
  fields.forEach((field) => body.append('text', field.value));
  body.append('source_lang', 'EN');
  body.append('target_lang', 'IT');

  const baseUrl = apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com'
    : 'https://api.deepl.com';

  try {
    const response = await fetch(`${baseUrl}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      cache: 'no-store',
    });
    if (!response.ok) return translateArtworkFieldsWithGemini(artwork, fields);

    const payload = asRecord(await response.json());
    const translations = Array.isArray(payload?.translations) ? payload.translations : [];
    const localized: Artwork = { ...artwork };
    fields.forEach((field, index) => {
      const translated = asString(asRecord(translations[index])?.text);
      if (translated) localized[field.key] = translated;
    });
    return localized;
  } catch (error) {
    console.warn('Impossibile tradurre i metadati dell’opera:', error);
    return translateArtworkFieldsWithGemini(artwork, fields);
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'TaccuinoDelGiorno/1.0' },
  });
  if (!response.ok) {
    throw new Error(`Artwork provider responded with ${response.status}`);
  }
  return response.json();
}

async function searchMet(keyword: string, seed: string): Promise<Artwork[]> {
  const searchUrl = new URL('https://collectionapi.metmuseum.org/public/collection/v1/search');
  searchUrl.searchParams.set('q', keyword);
  searchUrl.searchParams.set('hasImages', 'true');
  searchUrl.searchParams.set('isPublicDomain', 'true');

  const payload = asRecord(await fetchJson(searchUrl.toString()));
  const ids = Array.isArray(payload?.objectIDs)
    ? payload.objectIDs.filter((id): id is number => typeof id === 'number').slice(0, 80)
    : [];
  const selectedIds = seededOrder(ids, `${seed}:met`).slice(0, 14);

  const objects = await Promise.all(
    selectedIds.map(async (id) => {
      try {
        return asRecord(await fetchJson(
          `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`
        ));
      } catch {
        return null;
      }
    })
  );

  return objects.flatMap((object) => {
    if (!object || object.isPublicDomain !== true) return [];
    const image = asString(object.primaryImageSmall);
    const title = asString(object.title);
    const id = asNumber(object.objectID);
    if (!image || !title || id === null) return [];

    const sourceUrl = asString(object.objectURL)
      || `https://www.metmuseum.org/art/collection/search/${id}`;
    return [{
      titolo: title,
      artista: asString(object.artistDisplayName) || 'Artista sconosciuto',
      anno: asString(object.objectDate),
      immagine_url: image,
      immagine_url_hd: asString(object.primaryImage) || image,
      museo: 'Metropolitan Museum of Art',
      medium: asString(object.medium),
      dipartimento: asString(object.department),
      nota: `Opera scelta sul tema: "${keyword}"`,
      keyword_ricerca: keyword,
      source: 'met',
      source_id: String(id),
      source_url: sourceUrl,
      rights: 'Public Domain',
      met_object_id: id,
      met_url: sourceUrl,
    }];
  });
}

async function searchArtic(keyword: string, seed: string): Promise<Artwork[]> {
  const searchUrl = new URL('https://api.artic.edu/api/v1/artworks/search');
  searchUrl.searchParams.set('q', keyword);
  searchUrl.searchParams.set('limit', '50');
  searchUrl.searchParams.set('query[term][is_public_domain]', 'true');
  searchUrl.searchParams.set(
    'fields',
    'id,title,artist_display,date_display,image_id,medium_display,department_title,is_public_domain'
  );

  const payload = asRecord(await fetchJson(searchUrl.toString()));
  const config = asRecord(payload?.config);
  const iiifUrl = asString(config?.iiif_url) || 'https://www.artic.edu/iiif/2';
  const rows = Array.isArray(payload?.data) ? payload.data : [];

  const artworks = rows.flatMap<Artwork>((value) => {
    const row = asRecord(value);
    if (!row || row.is_public_domain !== true) return [];
    const id = asNumber(row.id);
    const imageId = asString(row.image_id);
    const title = asString(row.title);
    if (id === null || !imageId || !title) return [];

    const smallImage = `${iiifUrl}/${imageId}/full/843,/0/default.jpg`;
    const largeImage = `${iiifUrl}/${imageId}/full/1686,/0/default.jpg`;
    return [{
      titolo: title,
      artista: firstLine(row.artist_display) || 'Artista sconosciuto',
      anno: asString(row.date_display),
      immagine_url: smallImage,
      immagine_url_hd: largeImage,
      museo: 'Art Institute of Chicago',
      medium: asString(row.medium_display),
      dipartimento: asString(row.department_title),
      nota: `Opera scelta sul tema: "${keyword}"`,
      keyword_ricerca: keyword,
      source: 'artic' as const,
      source_id: String(id),
      source_url: `https://www.artic.edu/artworks/${id}`,
      rights: 'CC0 Public Domain',
    }];
  });

  return seededOrder(artworks, `${seed}:artic`);
}

async function searchCleveland(keyword: string, seed: string): Promise<Artwork[]> {
  const searchUrl = new URL('https://openaccess-api.clevelandart.org/api/artworks/');
  searchUrl.searchParams.set('q', keyword);
  searchUrl.searchParams.set('has_image', '1');
  searchUrl.searchParams.set('cc0', '1');
  searchUrl.searchParams.set('limit', '50');

  const payload = asRecord(await fetchJson(searchUrl.toString()));
  const rows = Array.isArray(payload?.data) ? payload.data : [];

  const artworks = rows.flatMap<Artwork>((value) => {
    const row = asRecord(value);
    if (!row || asString(row.share_license_status).toUpperCase() !== 'CC0') return [];
    const idValue = row.id;
    const id = typeof idValue === 'number' || typeof idValue === 'string'
      ? String(idValue)
      : '';
    const title = asString(row.title);
    const images = asRecord(row.images);
    const webImage = asRecord(images?.web);
    const printImage = asRecord(images?.print);
    const image = asString(webImage?.url) || asString(printImage?.url);
    const hdImage = asString(printImage?.url) || image;
    if (!id || !title || !image) return [];

    const creators = Array.isArray(row.creators) ? row.creators : [];
    const artist = creators
      .map((creator) => asString(asRecord(creator)?.description))
      .filter(Boolean)
      .join('; ');
    const sourceUrl = asString(row.url) || `https://www.clevelandart.org/art/${id}`;

    return [{
      titolo: title,
      artista: artist || 'Artista sconosciuto',
      anno: asString(row.creation_date),
      immagine_url: image,
      immagine_url_hd: hdImage,
      museo: 'Cleveland Museum of Art',
      medium: asString(row.technique),
      dipartimento: asString(row.department),
      nota: `Opera scelta sul tema: "${keyword}"`,
      keyword_ricerca: keyword,
      source: 'cleveland' as const,
      source_id: id,
      source_url: sourceUrl,
      rights: 'CC0 Public Domain',
    }];
  });

  return seededOrder(artworks, `${seed}:cleveland`);
}

const PROVIDERS: Array<{ source: ArtworkSource; search: ArtworkProvider }> = [
  { source: 'met', search: searchMet },
  { source: 'artic', search: searchArtic },
  { source: 'cleveland', search: searchCleveland },
];

export async function findArtworkAcrossMuseums({
  keyword,
  dataIso,
  recentKeys = new Set(),
  recentTitles = new Set(),
}: ArtworkSearchOptions): Promise<Artwork | null> {
  const daySeed = Math.floor(Date.parse(`${dataIso}T00:00:00Z`) / 86_400_000);
  const providers = rotate(PROVIDERS, daySeed);
  const fallback = FALLBACK_THEMES[Math.abs(daySeed) % FALLBACK_THEMES.length];
  const searchTerms = keyword.toLowerCase() === fallback.toLowerCase()
    ? [keyword]
    : [keyword, fallback];
  let repeatedFallback: Artwork | null = null;

  for (const term of searchTerms) {
    for (const provider of providers) {
      try {
        const candidates = await provider.search(term, `${dataIso}:${term}`);
        for (const candidate of candidates) {
          const key = artworkKey(candidate);
          const titleKey = artworkTitleKey(candidate);
          if (
            (!key || !recentKeys.has(key))
            && (!titleKey || !recentTitles.has(titleKey))
          ) {
            return candidate;
          }
          repeatedFallback ??= candidate;
        }
      } catch (error) {
        console.warn(`Artwork provider ${provider.source} failed:`, error);
      }
    }
  }

  return repeatedFallback;
}
