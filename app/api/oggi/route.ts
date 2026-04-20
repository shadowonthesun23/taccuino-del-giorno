import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const oggi = new Date();
    const dataIso = oggi.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('contenuti_giornalieri')
      .select('*')
      .eq('data', dataIso)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Nessun contenuto per oggi' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
