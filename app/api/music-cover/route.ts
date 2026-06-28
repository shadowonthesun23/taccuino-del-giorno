export const maxDuration = 15;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'TaccuinoDelGiorno/1.0' },
    signal: AbortSignal.timeout(7_000),
  });
  if (!response.ok) throw new Error(`Cover provider responded with ${response.status}`);
  return response.json();
}

function scoreMatch(candidateTitle: string, candidateArtist: string, title: string, artist: string): number {
  const titleKey = normalize(title);
  const artistKey = normalize(artist);
  const candidateTitleKey = normalize(candidateTitle);
  const candidateArtistKey = normalize(candidateArtist);
  let score = 0;
  if (candidateTitleKey === titleKey) score += 8;
  else if (candidateTitleKey.includes(titleKey) || titleKey.includes(candidateTitleKey)) score += 3;
  if (candidateArtistKey === artistKey) score += 6;
  else if (candidateArtistKey.includes(artistKey) || artistKey.includes(candidateArtistKey)) score += 2;
  return score;
}

async function findItunesCover(title: string, artist: string, searchTerm: string): Promise<string> {
  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', searchTerm);
  url.searchParams.set('entity', 'song');
  url.searchParams.set('limit', '12');
  url.searchParams.set('country', 'IT');
  const payload = asRecord(await fetchJson(url.toString()));
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const ranked = results
    .map((value) => asRecord(value))
    .filter((value): value is JsonRecord => value !== null)
    .map((value) => ({
      value,
      score: scoreMatch(asString(value.trackName), asString(value.artistName), title, artist),
    }))
    .sort((left, right) => right.score - left.score);
  const bestMatch = ranked.find((candidate) => candidate.score >= 7);
  const artwork = asString(bestMatch?.value.artworkUrl100);
  return artwork.replace(/100x100bb/i, '600x600bb');
}

async function findItunesAlbumCover(title: string, artist: string, searchTerm: string): Promise<string> {
  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', searchTerm);
  url.searchParams.set('entity', 'album');
  url.searchParams.set('limit', '10');
  url.searchParams.set('country', 'IT');
  const payload = asRecord(await fetchJson(url.toString()));
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const ranked = results
    .map((value) => asRecord(value))
    .filter((value): value is JsonRecord => value !== null)
    .map((value) => ({
      value,
      score: scoreMatch(asString(value.collectionName), asString(value.artistName), title, artist),
    }))
    .sort((left, right) => right.score - left.score);
  const bestMatch = ranked.find((candidate) => candidate.score >= 2) ?? ranked[0];
  const artwork = asString(bestMatch?.value.artworkUrl100);
  return artwork.replace(/100x100bb/i, '600x600bb');
}

async function findDeezerCover(title: string, artist: string): Promise<string> {
  const url = new URL('https://api.deezer.com/search');
  url.searchParams.set('q', `artist:"${artist}" track:"${title}"`);
  url.searchParams.set('limit', '10');
  const payload = asRecord(await fetchJson(url.toString()));
  const results = Array.isArray(payload?.data) ? payload.data : [];
  const ranked = results
    .map((value) => asRecord(value))
    .filter((value): value is JsonRecord => value !== null)
    .map((value) => {
      const artistRecord = asRecord(value.artist);
      return {
        value,
        score: scoreMatch(asString(value.title), asString(artistRecord?.name), title, artist),
      };
    })
    .sort((left, right) => right.score - left.score);
  const bestMatch = ranked.find((candidate) => candidate.score >= 7);
  return asString(asRecord(bestMatch?.value.album)?.cover_xl)
    || asString(asRecord(bestMatch?.value.album)?.cover_big);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title')?.trim() ?? '';
  const artist = searchParams.get('artist')?.trim() ?? '';
  const query = searchParams.get('query')?.trim() ?? '';
  if (!title || !artist) {
    return Response.json({ error: 'Titolo e artista sono obbligatori' }, { status: 400 });
  }

  const searchTerm = query || `${artist} ${title}`.trim();
  const providers = [
    () => findItunesCover(title, artist, searchTerm),
    () => findItunesAlbumCover(title, artist, searchTerm),
    () => findDeezerCover(title, artist),
  ];

  for (const provider of providers) {
    try {
      const imageUrl = await provider();
      if (imageUrl) {
        return Response.json(
          { imageUrl },
          { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } }
        );
      }
    } catch (error) {
      console.warn('Ricerca copertina non disponibile:', error);
    }
  }

  return new Response(null, { status: 204 });
}
