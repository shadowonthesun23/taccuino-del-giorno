import { normalizeEditorialMediaValue } from './editorial-media.ts';

export const LOCAL_ARTWORK_BRIDGE_URL = 'http://127.0.0.1:43127';
export const LOCAL_ARTWORK_PREVIEW_TIMEOUT_MS = 30 * 1_000;
export const LOCAL_ARTWORK_GENERATE_TIMEOUT_MS = 6 * 60 * 1_000;
export const LOCAL_ARTWORK_POLL_INTERVAL_MS = 4 * 1_000;
export const LOCAL_ARTWORK_POLL_TIMEOUT_MS = 6 * 60 * 1_000;

export type LocalArtworkBridgePayload = {
  data?: unknown;
  dataUrl?: unknown;
  authorName?: unknown;
  sourceUrl?: unknown;
  error?: unknown;
};

export type LocalArtworkExpectation = {
  dataIso: string;
  authorName: string;
  sourceUrl: string;
};

export type LocalArtworkResolverOptions = {
  fetchImpl?: typeof fetch;
  onPreviewMissing?: () => void;
  onGenerationStarted?: () => void;
  onGenerationInProgress?: () => void;
  previewTimeoutMs?: number;
  generateTimeoutMs?: number;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
  wait?: (milliseconds: number) => Promise<void>;
};

type LocalArtworkResponse = {
  response: Response;
  payload: LocalArtworkBridgePayload;
};

function isAbortError(error: unknown) {
  return (error instanceof DOMException && error.name === 'AbortError')
    || (error instanceof Error && error.name === 'AbortError');
}

async function requestLocalArtwork(
  path: string,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
  fetchImpl: typeof fetch,
): Promise<LocalArtworkResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(`${LOCAL_ARTWORK_BRIDGE_URL}${path}`, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({})) as LocalArtworkBridgePayload;
    return { response, payload };
  } catch (error) {
    if (isAbortError(error)) throw new Error(timeoutMessage);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getLocalArtworkResponseError(response: Response, payload: LocalArtworkBridgePayload, fallback: string) {
  return typeof payload.error === 'string' && payload.error.trim()
    ? payload.error.trim()
    : `${fallback} (${response.status}).`;
}

function normalizeAuthorName(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateLocalArtworkResult(payload: LocalArtworkBridgePayload, expected: LocalArtworkExpectation) {
  const artworkDataUrl = normalizeEditorialMediaValue(payload.dataUrl);
  if (!/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/i.test(artworkDataUrl)) {
    throw new Error('Il ponte locale non ha restituito un WebP valido.');
  }

  if (
    normalizeAuthorName(payload.data) !== expected.dataIso
    || normalizeAuthorName(payload.authorName) !== expected.authorName
    || normalizeEditorialMediaValue(payload.sourceUrl) !== expected.sourceUrl
  ) {
    throw new Error('Il disegno ricevuto non corrisponde alla data, all’autore o alla foto visualizzati.');
  }

  return artworkDataUrl;
}

async function fetchValidatedArtworkPreview(
  expected: LocalArtworkExpectation,
  fetchImpl: typeof fetch,
  previewTimeoutMs: number,
) {
  const { response, payload } = await requestLocalArtwork(
    `/preview?data=${encodeURIComponent(expected.dataIso)}`,
    {},
    previewTimeoutMs,
    'La ricerca del disegno parcheggiato ha superato il tempo massimo.',
    fetchImpl,
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(getLocalArtworkResponseError(response, payload, 'Errore del ponte locale'));
  }

  return validateLocalArtworkResult(payload, expected);
}

async function waitForValidatedArtworkPreview(
  expected: LocalArtworkExpectation,
  fetchImpl: typeof fetch,
  previewTimeoutMs: number,
  pollIntervalMs: number,
  pollTimeoutMs: number,
  wait: (milliseconds: number) => Promise<void>,
) {
  const deadline = Date.now() + pollTimeoutMs;

  while (Date.now() < deadline) {
    const artworkDataUrl = await fetchValidatedArtworkPreview(expected, fetchImpl, previewTimeoutMs);
    if (artworkDataUrl) return artworkDataUrl;

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;
    await wait(Math.min(pollIntervalMs, remainingMs));
  }

  throw new Error('Il disegno non è diventato disponibile entro il tempo massimo di attesa.');
}

export async function resolveLocalAuthorArtwork(
  expected: LocalArtworkExpectation,
  options: LocalArtworkResolverOptions = {},
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const previewTimeoutMs = options.previewTimeoutMs ?? LOCAL_ARTWORK_PREVIEW_TIMEOUT_MS;
  const generateTimeoutMs = options.generateTimeoutMs ?? LOCAL_ARTWORK_GENERATE_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? LOCAL_ARTWORK_POLL_INTERVAL_MS;
  const pollTimeoutMs = options.pollTimeoutMs ?? LOCAL_ARTWORK_POLL_TIMEOUT_MS;
  const wait = options.wait ?? ((milliseconds: number) => new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  }));

  const parkedArtwork = await fetchValidatedArtworkPreview(expected, fetchImpl, previewTimeoutMs);
  if (parkedArtwork) return parkedArtwork;

  options.onPreviewMissing?.();
  options.onGenerationStarted?.();

  const generated = await requestLocalArtwork(
    '/generate',
    {
      body: JSON.stringify({ data: expected.dataIso }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    generateTimeoutMs,
    'La generazione del ritratto locale ha superato il tempo massimo.',
    fetchImpl,
  );

  if (generated.response.status === 409) {
    options.onGenerationInProgress?.();
    return waitForValidatedArtworkPreview(
      expected,
      fetchImpl,
      previewTimeoutMs,
      pollIntervalMs,
      pollTimeoutMs,
      wait,
    );
  }

  if (!generated.response.ok) {
    throw new Error(getLocalArtworkResponseError(generated.response, generated.payload, 'La generazione locale non è riuscita'));
  }

  return validateLocalArtworkResult(generated.payload, expected);
}
