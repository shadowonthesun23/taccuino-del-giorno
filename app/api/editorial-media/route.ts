import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  sanitizeEditorialMediaCrops,
  sanitizeEditorialMediaOverrides,
} from '@/lib/editorial-media';
import { getEditorAuthorization } from '@/lib/editor-auth';

type EditorialMediaPayload = {
  data?: unknown;
  overrides?: unknown;
  crops?: unknown;
};

const EDITORIAL_MEDIA_MUTATION_TIMEOUT_MS = 15_000;

function isRequestTimeout(error: unknown, signal: AbortSignal) {
  return signal.aborted || (
    error instanceof Error
    && (error.name === 'AbortError' || error.name === 'TimeoutError')
  );
}

function mutationErrorResponse(action: string, error: unknown, signal: AbortSignal) {
  console.error(`Errore ${action} immagini editoriali:`, error);

  if (isRequestTimeout(error, signal)) {
    return new Response('Supabase non ha risposto entro 15 secondi.', { status: 504 });
  }

  return new Response(error instanceof Error ? error.message : 'Errore Supabase non identificato.', { status: 500 });
}

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

  let payload: EditorialMediaPayload;
  try {
    payload = await request.json() as EditorialMediaPayload;
  } catch {
    return new Response('Payload non valido', { status: 400 });
  }

  const dataIso = typeof payload.data === 'string' ? payload.data.trim() : '';
  if (!isValidIsoDate(dataIso)) {
    return new Response('Data non valida', { status: 400 });
  }

  const overrides = sanitizeEditorialMediaOverrides(payload.overrides);
  const crops = sanitizeEditorialMediaCrops(payload.crops);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (Object.keys(overrides).length === 0 && Object.keys(crops).length === 0) {
    const signal = AbortSignal.timeout(EDITORIAL_MEDIA_MUTATION_TIMEOUT_MS);
    try {
      const { error } = await supabase
        .from('editorial_media_overrides')
        .delete()
        .eq('data', dataIso)
        .retry(false)
        .abortSignal(signal);

      if (error) {
        return mutationErrorResponse('rimozione', error, signal);
      }
    } catch (error) {
      return mutationErrorResponse('rimozione', error, signal);
    }

    return NextResponse.json({ ok: true, data: dataIso, overrides: {}, crops: {} });
  }

  const signal = AbortSignal.timeout(EDITORIAL_MEDIA_MUTATION_TIMEOUT_MS);
  try {
    const { error } = await supabase
      .from('editorial_media_overrides')
      .upsert({
        data: dataIso,
        overrides,
        crops,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'data' })
      .retry(false)
      .abortSignal(signal);

    if (error) {
      return mutationErrorResponse('salvataggio', error, signal);
    }
  } catch (error) {
    return mutationErrorResponse('salvataggio', error, signal);
  }

  return NextResponse.json({ ok: true, data: dataIso, overrides, crops });
}
