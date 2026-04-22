import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'DEEPL_API_KEY non configurata' }, { status: 500 });
  }

  const { testi, targetLang } = await req.json();
  if (!Array.isArray(testi) || testi.length === 0) {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 });
  }

  // DeepL Free usa api-free.deepl.com, Pro usa api.deepl.com
  const baseUrl = apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com'
    : 'https://api.deepl.com';

  const body = new URLSearchParams();
  testi.forEach((t: string) => body.append('text', t));
  body.append('target_lang', targetLang ?? 'EN');
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
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const json = await res.json();
  const traduzioni: string[] = json.translations.map((t: { text: string }) => t.text);
  return NextResponse.json({ traduzioni });
}
