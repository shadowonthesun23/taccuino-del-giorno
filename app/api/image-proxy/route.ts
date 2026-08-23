export const maxDuration = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return new Response('Missing image URL', { status: 400 });
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(rawUrl);
  } catch {
    return new Response('Invalid image URL', { status: 400 });
  }

  if (!['http:', 'https:'].includes(imageUrl.protocol)) {
    return new Response('Unsupported image URL', { status: 400 });
  }

  const upstream = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'TaccuinoDelGiorno/1.0',
    },
    // Let the CDN cache the streamed response. The Next.js Data Cache rejects
    // source images over 2 MB, which otherwise produces a noisy runtime error.
    cache: 'no-store',
  });

  if (!upstream.ok || !upstream.body) {
    return new Response('Image unavailable', { status: upstream.status || 502 });
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg';

  return new Response(upstream.body, {
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'Content-Type': contentType,
    },
  });
}
