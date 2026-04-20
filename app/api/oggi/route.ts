import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Prima prova: cerca il contenuto di oggi
    const oggi = new Date();
    const dataIso = oggi.toISOString().split('T')[0];

    const { data: dataOggi, error: errorOggi } = await supabase
      .from('contenuti_giornalieri')
      .select('*')
      .eq('data', dataIso)
      .maybeSingle();

    if (dataOggi) {
      return NextResponse.json(dataOggi);
    }

    // Fallback: prendi l'ultima riga disponibile (nel caso il cron non sia ancora girato oggi)
    const { data: ultimaRiga, error: errorUltima } = await supabase
      .from('contenuti_giornalieri')
      .select('*')
      .order('data', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errorUltima || !ultimaRiga) {
      return NextResponse.json(
        { error: 'Nessun contenuto disponibile. Il taccuino verrà generato alle 00:05.' },
        { status: 404 }
      );
    }

    return NextResponse.json(ultimaRiga);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
