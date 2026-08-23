import { MAX_REMOTE_IMAGE_BYTES, isImageContentType, trustedImageUrl } from '@/lib/remote-images';
import { rateLimit } from '@/lib/request-guard';

export const maxDuration = 30;

export async function GET(request: Request) {
  const limited = rateLimit(request, 'image-proxy', { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return new Response('Missing image URL', { status: 400 });
  }

  const imageUrl = trustedImageUrl(rawUrl);
  if (!imageUrl) {
    return new Response('Unsupported image source', { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'TaccuinoDelGiorno/1.0',
      },
      // Let the CDN cache the streamed response. The Next.js Data Cache rejects
      // source images over 2 MB, which otherwise produces a noisy runtime error.
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return new Response('Image unavailable', { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response('Image unavailable', { status: upstream.status || 502 });
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg';
  const contentLength = Number(upstream.headers.get('content-length') || 0);
  if (!isImageContentType(contentType) || contentLength > MAX_REMOTE_IMAGE_BYTES) {
    return new Response('Image exceeds proxy limits', { status: 413 });
  }

  return new Response(upstream.body, {
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'Content-Type': contentType,
    },
  });
}
