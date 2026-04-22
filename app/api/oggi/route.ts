import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
