import { createClient } from '@supabase/supabase-js';
import {
  artworkKey,
  artworkTitleKey,
  findArtworkAcrossMuseums,
  type Artwork,
} from '@/lib/artwork';

export const maxDuration = 30;

interface DailyArtworkRecord {
  opera_giorno: Partial<Artwork> | null;
}

function requestedDate(request: Request): string {
  const value = new URL(request.url).searchParams.get('data');
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : new Date().toISOString().split('T')[0];
}

function cachedArtwork(value: unknown): Partial<Artwork> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<Artwork>
    : null;
}

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(null, { status: 204 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const dataIso = requestedDate(request);

    const { data: record, error: dbError } = await supabase
      .from('contenuti_giornalieri')
      .select('keyword_arte_en, opera_giorno')
      .eq('data', dataIso)
      .single();

    if (dbError || !record) {
      return Response.json({ error: 'Nessun record trovato per la data richiesta' }, { status: 404 });
    }

    const existingArtwork = cachedArtwork(record.opera_giorno);
    if (existingArtwork) {
      return Response.json(existingArtwork);
    }

    const keyword = typeof record.keyword_arte_en === 'string'
      ? record.keyword_arte_en.trim()
      : '';
    if (!keyword) {
      return Response.json({ error: 'Nessuna keyword disponibile per la data richiesta' }, { status: 404 });
    }

    const { data: recentRows, error: recentError } = await supabase
      .from('contenuti_giornalieri')
      .select('opera_giorno')
      .lt('data', dataIso)
      .not('opera_giorno', 'is', null)
      .order('data', { ascending: false })
      .limit(90);

    if (recentError) {
      console.warn('Impossibile leggere lo storico recente delle opere:', recentError.message);
    }

    const recentArtworks = (recentRows as DailyArtworkRecord[] | null ?? [])
      .map((row) => cachedArtwork(row.opera_giorno))
      .filter((artwork): artwork is Partial<Artwork> => artwork !== null);
    const recentKeys = new Set(recentArtworks.map(artworkKey).filter(Boolean));
    const recentTitles = new Set(recentArtworks.map(artworkTitleKey).filter(Boolean));

    const artwork = await findArtworkAcrossMuseums({
      keyword,
      dataIso,
      recentKeys,
      recentTitles,
    });

    if (!artwork) {
      return Response.json({ error: 'Nessuna opera adatta trovata' }, { status: 404 });
    }

    if (supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { error: cacheError } = await supabaseAdmin
        .from('contenuti_giornalieri')
        .update({ opera_giorno: artwork })
        .eq('data', dataIso);

      if (cacheError) {
        console.warn('Impossibile salvare in cache l’opera del giorno:', cacheError.message);
      }
    }

    return Response.json(artwork);
  } catch (error: unknown) {
    console.error('Errore in /api/opera:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Errore interno' },
      { status: 500 }
    );
  }
}
