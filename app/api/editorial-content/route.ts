import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sanitizeEditorialContentOverrides } from '@/lib/editorial-content';
import { getEditorAuthorization } from '@/lib/editor-auth';

type EditorialContentPayload = {
  data?: unknown;
  overrides?: unknown;
};

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export async function POST(request: Request) {
  const authorization = await getEditorAuthorization(request);
  if (!authorization.ok) {
    return new Response(authorization.message, { status: authorization.status });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response('Configurazione Supabase incompleta', { status: 500 });
  }

  let payload: EditorialContentPayload;
  try {
    payload = await request.json() as EditorialContentPayload;
  } catch {
    return new Response('Payload non valido', { status: 400 });
  }

  const dataIso = typeof payload.data === 'string' ? payload.data.trim() : '';
  if (!isValidIsoDate(dataIso)) {
    return new Response('Data non valida', { status: 400 });
  }

  const overrides = sanitizeEditorialContentOverrides(payload.overrides);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (Object.keys(overrides).length === 0) {
    const { error } = await supabase
      .from('editorial_content_overrides')
      .delete()
      .eq('data', dataIso);

    if (error) {
      console.error('Errore rimozione contenuti editoriali:', error);
      return new Response(error.message, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: dataIso, overrides: {} });
  }

  const { error } = await supabase
    .from('editorial_content_overrides')
    .upsert({
      data: dataIso,
      overrides,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'data' });

  if (error) {
    console.error('Errore salvataggio contenuti editoriali:', error);
    return new Response(error.message, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: dataIso, overrides });
}
