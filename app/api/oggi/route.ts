import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { applyEditorialContentOverrides, sanitizeEditorialContentOverrides } from '@/lib/editorial-content';
import { sanitizeEditorialMediaCrops, sanitizeEditorialMediaOverrides } from '@/lib/editorial-media';
import { getAuthorMetadata } from '@/lib/author-metadata';
import { getFallbackContent } from '@/lib/fallback-content';

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

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
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

    const { data } = await supabase
      .from('contenuti_giornalieri')
      .select('*')
      .eq('data', dataIso)
      .single();

    const baseData = data ?? getFallbackContent(dataIso);

    if (!baseData) {
      return NextResponse.json({ error: 'Nessun contenuto per questa data' }, { status: 404 });
    }

    const [
      { data: editorialMediaRow, error: editorialMediaError },
      { data: editorialContentRow, error: editorialContentError },
      authorMetadata,
    ] = await Promise.all([
      supabase
        .from('editorial_media_overrides')
        .select('overrides, crops')
        .eq('data', dataIso)
        .maybeSingle(),
      supabase
        .from('editorial_content_overrides')
        .select('overrides')
        .eq('data', dataIso)
        .maybeSingle(),
      getAuthorMetadata(baseData.autore_giorno),
    ]);

    if (editorialMediaError) {
      console.error('Errore lettura immagini editoriali:', editorialMediaError);
    }
    if (editorialContentError) {
      console.error('Errore lettura contenuti editoriali:', editorialContentError);
    }

    const editorialContent = sanitizeEditorialContentOverrides(editorialContentRow?.overrides);
    const editorialMedia = sanitizeEditorialMediaOverrides(editorialMediaRow?.overrides);

    const dataWithContent = applyEditorialContentOverrides(baseData, editorialContent);

    return NextResponse.json(
      {
        ...dataWithContent,
        foto_autore_url: authorMetadata.imageUrl ?? dataWithContent.foto_autore_url ?? null,
        autore_data_nascita: authorMetadata.birthDate ?? dataWithContent.autore_data_nascita ?? null,
        autore_data_decesso: authorMetadata.deathDate ?? dataWithContent.autore_data_decesso ?? null,
        editorial_media: editorialMedia,
        editorial_media_crops: sanitizeEditorialMediaCrops(editorialMediaRow?.crops),
        editorial_content: editorialContent,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Errore inatteso' }, { status: 500 });
  }
}
