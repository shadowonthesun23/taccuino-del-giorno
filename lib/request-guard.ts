import { NextResponse } from 'next/server';

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

function getClientKey(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'anonymous';
}

export function rateLimit(request: Request, scope: string, { limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  // This limiter is process-local, so keep the small in-memory store bounded.
  // Production can replace it with a shared store without changing route code.
  if (buckets.size > 1_000) {
    for (const [bucketKey, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(bucketKey);
    }
  }
  const key = `${scope}:${getClientKey(request)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (current.count >= limit) {
    return NextResponse.json(
      { error: 'Troppe richieste. Riprova tra poco.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((current.resetAt - now) / 1000)) },
      }
    );
  }

  current.count += 1;
  return null;
}
