import { createClient } from '@supabase/supabase-js';

type RestorePayload = {
  data?: unknown;
  contenuto?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Non autorizzato', { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response('Configurazione Supabase incompleta', { status: 500 });
  }

  let payload: RestorePayload;
  try {
    payload = await request.json() as RestorePayload;
  } catch {
    return new Response('Payload non valido', { status: 400 });
  }

  const dataIso = typeof payload.data === 'string' ? payload.data.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) {
    return new Response('Data non valida', { status: 400 });
  }

  if (!isRecord(payload.contenuto)) {
    return new Response('Contenuto da ripristinare non valido', { status: 400 });
  }

  const { data: _ignoredData, foto_autore_url: _ignoredPhoto, ...content } = payload.contenuto;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { error } = await supabase
    .from('contenuti_giornalieri')
    .upsert({ ...content, data: dataIso }, { onConflict: 'data' });

  if (error) {
    console.error('Errore ripristino editor:', error);
    return new Response(error.message, { status: 500 });
  }

  return Response.json({ ok: true });
}
