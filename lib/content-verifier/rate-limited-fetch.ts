interface CachedResponse {
  body: string;
  headers: Headers;
  status: number;
}

export interface PoliteFetchOptions {
  serializedHosts?: string[];
  minimumIntervalMs?: number;
  maximumRetryAfterMs?: number;
}

export function createPoliteCachedFetch({
  serializedHosts = ['it.wikiquote.org', 'it.wikisource.org'],
  minimumIntervalMs = 400,
  maximumRetryAfterMs = 8_000,
}: PoliteFetchOptions = {}): typeof fetch {
  const cache = new Map<string, Promise<CachedResponse>>();
  let queue = Promise.resolve();

  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const cacheKey = url.toString();
    let pending = cache.get(cacheKey);
    if (!pending) {
      const serialized = serializedHosts.includes(url.hostname);
      const execute = async () => {
        if (serialized) await wait(minimumIntervalMs);
        let response = await fetch(input, init);
        if (serialized && response.status === 429) {
          const retryAfterSeconds = Number(response.headers.get('retry-after') ?? 2);
          const retryAfterMs = Number.isFinite(retryAfterSeconds)
            ? Math.min(retryAfterSeconds * 1_000, maximumRetryAfterMs)
            : 2_000;
          await wait(retryAfterMs);
          response = await fetch(input, init);
        }
        return {
          body: await response.text(),
          headers: new Headers(response.headers),
          status: response.status,
        };
      };

      pending = serialized ? queue.then(execute) : execute();
      if (serialized) queue = pending.then(() => undefined, () => undefined);
      cache.set(cacheKey, pending);
    }

    const cached = await pending;
    return new Response(cached.body, { headers: cached.headers, status: cached.status });
  };
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
