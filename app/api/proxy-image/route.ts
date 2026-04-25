import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TaccuinoBot/1.0)' },
      // nessun cache aggressivo, ma ok per immagini statiche
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: res.status });

    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('[proxy-image]', err);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
