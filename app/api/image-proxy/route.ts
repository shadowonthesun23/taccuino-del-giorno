export const maxDuration = 30;

const ALLOWED_IMAGE_HOSTS = new Set([
  'images.metmuseum.org',
  'openaccess-cdn.clevelandart.org',
  'upload.wikimedia.org',
  'www.artic.edu',
]);

const ALLOWED_IMAGE_HOST_SUFFIXES = ['.dzcdn.net', '.mzstatic.com'];

function isAllowedImageHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  return ALLOWED_IMAGE_HOSTS.has(normalizedHost)
    || ALLOWED_IMAGE_HOST_SUFFIXES.some((suffix) => normalizedHost.endsWith(suffix));
}

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

  if (imageUrl.protocol !== 'https:') {
    return new Response('Unsupported image URL', { status: 400 });
  }

  if (!isAllowedImageHost(imageUrl.hostname)) {
    return new Response('Image host not allowed', { status: 403 });
  }

  const upstream = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'TaccuinoDelGiorno/1.0',
    },
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(15_000),
  });

  if (!upstream.ok || !upstream.body) {
    return new Response('Image unavailable', { status: upstream.status || 502 });
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) {
    return new Response('Unsupported upstream content', { status: 415 });
  }

  return new Response(upstream.body, {
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'Content-Type': contentType,
    },
  });
}
