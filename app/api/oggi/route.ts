import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getRomeDateIso(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function getFotoAutore(nomeAutore: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(nomeAutore);
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      { headers: { 'User-Agent': 'TaccuinoDelGiorno/1.0' }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.thumbnail?.source ?? json?.originalimage?.source ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Configurazione Supabase incompleta: verifica NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { searchParams } = new URL(request.url);
    const dataParam = searchParams.get('data');

    let dataIso: string;
    if (dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam)) {
      dataIso = dataParam;
    } else {
      dataIso = getRomeDateIso();
    }

    const { data, error } = await supabase
      .from('contenuti_giornalieri')
      .select('*')
      .eq('data', dataIso)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Nessun contenuto per questa data' }, { status: 404 });
    }

    const fotoUrl = await getFotoAutore(data.autore_giorno);

    return NextResponse.json({ ...data, foto_autore_url: fotoUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Errore inatteso durante il caricamento del giorno.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
