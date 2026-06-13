import { findSaintArtwork } from '@/lib/saint-artwork';

export const maxDuration = 20;

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get('nome')?.trim() ?? '';
  if (!name || name.length > 120) {
    return Response.json({ error: 'Nome del santo non valido' }, { status: 400 });
  }

  try {
    const artwork = await findSaintArtwork(name);
    if (!artwork) return new Response(null, { status: 204 });

    return Response.json(artwork, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('Errore in /api/santo-immagine:', error);
    return new Response(null, { status: 204 });
  }
}
