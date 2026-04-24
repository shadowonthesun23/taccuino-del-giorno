import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { searchParams } = new URL(request.url);
    const dataParam = searchParams.get('data');

    let dataIso: string;
    if (dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam)) {
      dataIso = dataParam;
    } else {
      const oggi = new Date();
      dataIso = oggi.toISOString().split('T')[0];
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
