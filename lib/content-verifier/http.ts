import type { FetchLike } from './types.ts';

export class VerificationHttpError extends Error {
  readonly status: number | null;

  constructor(
    message: string,
    status: number | null = null,
  ) {
    super(message);
    this.name = 'VerificationHttpError';
    this.status = status;
  }
}

export async function fetchJson<T>(
  url: URL,
  fetcher: FetchLike,
  timeoutMs: number,
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: {
        'user-agent': 'taccuino-content-verifier-audit/1.0 (+https://github.com/shadowonthesun23/taccuino-del-giorno)',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new VerificationHttpError(
      error instanceof Error ? error.message : 'Richiesta HTTP non riuscita.',
    );
  }

  if (!response.ok) {
    throw new VerificationHttpError(
      `La fonte ha risposto con HTTP ${response.status}.`,
      response.status,
    );
  }

  try {
    return await response.json() as T;
  } catch {
    throw new VerificationHttpError('La fonte ha restituito JSON non valido.', response.status);
  }
}

export async function fetchText(
  url: URL,
  fetcher: FetchLike,
  timeoutMs: number,
): Promise<string> {
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: {
        'user-agent': 'taccuino-content-verifier-audit/1.0 (+https://github.com/shadowonthesun23/taccuino-del-giorno)',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new VerificationHttpError(
      error instanceof Error ? error.message : 'Richiesta HTTP non riuscita.',
    );
  }

  if (!response.ok) {
    throw new VerificationHttpError(
      `La fonte ha risposto con HTTP ${response.status}.`,
      response.status,
    );
  }
  return response.text();
}
