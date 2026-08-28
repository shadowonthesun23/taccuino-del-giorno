import type { ReadingMediaResult } from '@/lib/types';
import { findOpenBibleMedia, findPoetPortrait } from '@/lib/reading-media';

export const maxDuration = 20;

const EMPTY_RESULT: ReadingMediaResult = { poesia: null, bibbia: null };

export async function GET(request: Request) {
  const author = new URL(request.url).searchParams.get('autore')?.trim() ?? '';
  const poemMedia = author && author.length <= 160
    ? findPoetPortrait(author)
    : Promise.resolve(null);

  const [poesia, bibbia] = await Promise.all([poemMedia, findOpenBibleMedia()]);
  const result: ReadingMediaResult = { poesia, bibbia };

  return Response.json(result ?? EMPTY_RESULT, {
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800',
    },
  });
}
