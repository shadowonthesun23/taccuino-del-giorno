import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { applyEditorialContentOverrides, sanitizeEditorialContentOverrides } from '@/lib/editorial-content';
import { sanitizeEditorialMediaCrops, sanitizeEditorialMediaOverrides } from '@/lib/editorial-media';

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

type AuthorMetadata = {
  imageUrl: string | null;
  birthDate: string | null;
  deathDate: string | null;
};

type WikidataClaim = {
  rank?: string;
  mainsnak?: {
    datavalue?: {
      value?: {
        time?: unknown;
      };
    };
  };
};

function parseWikidataDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^[+−-](\d+)-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
  return `${String(year).padStart(4, '0')}-${match[2]}-${match[3]}`;
}

function getWikidataClaimDate(claims: unknown): string | null {
  if (!Array.isArray(claims)) return null;
  const typedClaims = claims as WikidataClaim[];
  const claim = typedClaims.find((entry) => entry?.rank === 'preferred') ?? typedClaims[0];
  return parseWikidataDate(claim?.mainsnak?.datavalue?.value?.time);
}

function getSummaryLifeDates(description: unknown, extract: unknown): Pick<AuthorMetadata, 'birthDate' | 'deathDate'> {
  const summary = [description, extract]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  const match = /\b(\d{4})\s*[–—-]\s*(\d{4})\b/.exec(summary);

  return {
    birthDate: match?.[1] ?? null,
    deathDate: match?.[2] ?? null,
  };
}

async function getAuthorMetadata(nomeAutore: string): Promise<AuthorMetadata> {
  const emptyMetadata: AuthorMetadata = { imageUrl: null, birthDate: null, deathDate: null };

  try {
    const encoded = encodeURIComponent(nomeAutore);
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      { headers: { 'User-Agent': 'TaccuinoDelGiorno/1.0' }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return emptyMetadata;

    const json = await res.json() as {
      thumbnail?: { source?: unknown };
      originalimage?: { source?: unknown };
      wikibase_item?: unknown;
      description?: unknown;
      extract?: unknown;
    };
    const summaryDates = getSummaryLifeDates(json.description, json.extract);
    let birthDate = summaryDates.birthDate;
    let deathDate = summaryDates.deathDate;

    if (typeof json.wikibase_item === 'string' && json.wikibase_item) {
      try {
        const wikidataRes = await fetch(
          `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(json.wikibase_item)}.json`,
          { headers: { 'User-Agent': 'TaccuinoDelGiorno/1.0' }, next: { revalidate: 86400 } }
        );
        if (wikidataRes.ok) {
          const wikidataJson = await wikidataRes.json() as {
            entities?: Record<string, { claims?: Record<string, unknown> }>;
          };
          const claims = wikidataJson.entities?.[json.wikibase_item]?.claims;
          birthDate = getWikidataClaimDate(claims?.P569) ?? birthDate;
          deathDate = getWikidataClaimDate(claims?.P570) ?? deathDate;
        }
      } catch {
        // The Wikipedia summary fallback still gives us the portrait and, when available, the years.
      }
    }

    return {
      imageUrl: typeof json.thumbnail?.source === 'string'
        ? json.thumbnail.source
        : typeof json.originalimage?.source === 'string'
          ? json.originalimage.source
          : null,
      birthDate,
      deathDate,
    };
  } catch {
    return emptyMetadata;
  }
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

    const { data, error } = await supabase
      .from('contenuti_giornalieri')
      .select('*')
      .eq('data', dataIso)
      .single();

    if (error || !data) {
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
      getAuthorMetadata(data.autore_giorno),
    ]);

    if (editorialMediaError) {
      console.error('Errore lettura immagini editoriali:', editorialMediaError);
    }
    if (editorialContentError) {
      console.error('Errore lettura contenuti editoriali:', editorialContentError);
    }

    const editorialContent = sanitizeEditorialContentOverrides(editorialContentRow?.overrides);
    const editorialMedia = sanitizeEditorialMediaOverrides(editorialMediaRow?.overrides);

    const dataWithContent = applyEditorialContentOverrides(data, editorialContent);

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
