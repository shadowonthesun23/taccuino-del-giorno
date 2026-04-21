import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const oggi = new Date().toISOString().split('T')[0];

    // 1. Recupera il record di oggi dal DB
    const { data: record, error: dbError } = await supabase
      .from('contenuti_giornalieri')
      .select('keyword_arte_en, opera_giorno')
      .eq('data', oggi)
      .single();

    if (dbError || !record) {
      return Response.json({ error: 'Nessun record trovato per oggi' }, { status: 404 });
    }

    // 2. Se l'opera è già in cache nel DB, restituiscila direttamente
    if (record.opera_giorno) {
      return Response.json(record.opera_giorno);
    }

    // 3. Se non c'è keyword, niente da fare
    const keyword = record.keyword_arte_en;
    if (!keyword) {
      return Response.json({ error: 'Nessuna keyword disponibile per oggi' }, { status: 404 });
    }

    // 4. Cerca nel Met Museum API
    const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(keyword)}&hasImages=true&isPublicDomain=true`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
      // Fallback: keyword più generica se non trova nulla
      const fallbackUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=contemplation&hasImages=true&isPublicDomain=true`;
      const fallbackRes = await fetch(fallbackUrl);
      const fallbackData = await fallbackRes.json();
      if (!fallbackData.objectIDs) {
        return Response.json({ error: 'Nessuna opera trovata' }, { status: 404 });
      }
      searchData.objectIDs = fallbackData.objectIDs;
    }

    // 5. Prendi un ID casuale tra i primi 50 risultati (evita risultati troppo oscuri)
    const pool = searchData.objectIDs.slice(0, 50);
    let opera = null;

    // Tenta fino a 5 oggetti casuali finché ne trova uno con immagine valida
    for (let i = 0; i < 5; i++) {
      const randomId = pool[Math.floor(Math.random() * pool.length)];
      const objRes = await fetch(
        `https://collectionapi.metmuseum.org/public/collection/v1/objects/${randomId}`
      );
      const obj = await objRes.json();

      if (obj.primaryImageSmall && obj.title && obj.artistDisplayName) {
        opera = {
          titolo: obj.title,
          artista: obj.artistDisplayName || 'Artista sconosciuto',
          anno: obj.objectDate || '',
          met_object_id: obj.objectID,
          immagine_url: obj.primaryImageSmall,
          immagine_url_hd: obj.primaryImage || obj.primaryImageSmall,
          museo: 'Metropolitan Museum of Art',
          met_url: obj.objectURL || `https://www.metmuseum.org/art/collection/search/${obj.objectID}`,
          medium: obj.medium || '',
          dipartimento: obj.department || '',
          nota: `Opera scelta sul tema: "${keyword}"`,
          keyword_ricerca: keyword,
        };
        break;
      }
    }

    if (!opera) {
      return Response.json({ error: 'Opera non trovata dopo i tentativi' }, { status: 404 });
    }

    // 6. Salva in cache nel DB per non ripetere la chiamata
    await supabase
      .from('contenuti_giornalieri')
      .update({ opera_giorno: opera })
      .eq('data', oggi);

    return Response.json(opera);

  } catch (err: any) {
    console.error('Errore in /api/opera:', err);
    return Response.json({ error: err.message || 'Errore interno' }, { status: 500 });
  }
}
