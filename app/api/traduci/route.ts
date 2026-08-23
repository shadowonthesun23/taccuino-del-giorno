import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/request-guard';

const ALLOWED_TARGET_LANGUAGES = new Set(['EN', 'FR', 'DE', 'ES', 'PT']);

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'traduci', { limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'DEEPL_API_KEY non configurata' }, { status: 500 });
  }

  let payload: { testi?: unknown; targetLang?: unknown };
  try {
    payload = await req.json() as { testi?: unknown; targetLang?: unknown };
  } catch {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 });
  }
  const { testi, targetLang } = payload;
  if (
    !Array.isArray(testi)
    || testi.length === 0
    || testi.length > 40
    || !testi.every((text) => typeof text === 'string')
    || testi.join('').length > 30_000
    || typeof targetLang !== 'string'
    || !ALLOWED_TARGET_LANGUAGES.has(targetLang)
  ) {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 });
  }
  const texts = testi as string[];

  // DeepL Free usa api-free.deepl.com, Pro usa api.deepl.com
  const baseUrl = apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com'
    : 'https://api.deepl.com';

  const body = new URLSearchParams();
  texts.forEach((text) => body.append('text', text));
  body.append('target_lang', targetLang);
  body.append('source_lang', 'IT');
  // Preserva la formattazione XML/HTML nei testi
  body.append('tag_handling', 'xml');
  body.append('ignore_tags', 'x');

  const res = await fetch(`${baseUrl}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const json = await res.json();
  const traduzioni: string[] = json.translations.map((t: { text: string }) => t.text);
  return NextResponse.json({ traduzioni });
}
