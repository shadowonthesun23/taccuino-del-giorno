import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveLocalAuthorArtwork, type LocalArtworkBridgePayload, type LocalArtworkExpectation } from '../lib/local-author-artwork.ts';

const expected: LocalArtworkExpectation = {
  dataIso: '2026-09-14',
  authorName: 'Andrea Camilleri',
  sourceUrl: 'https://example.com/andrea-camilleri.jpg',
};
const dataUrl = 'data:image/webp;base64,UklGRg==';

function jsonResponse(status: number, payload: LocalArtworkBridgePayload) {
  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

function queuedFetch(responses: Response[]) {
  const requests: Array<{ method: string; url: string; body?: string }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    requests.push({
      body: typeof init?.body === 'string' ? init.body : undefined,
      method: init?.method ?? 'GET',
      url: String(input),
    });
    const response = responses.shift();
    if (!response) throw new Error('Risposta mock esaurita.');
    return response;
  };
  return { fetchImpl, requests };
}

function validPayload(overrides: Partial<LocalArtworkBridgePayload> = {}): LocalArtworkBridgePayload {
  return {
    authorName: expected.authorName,
    data: expected.dataIso,
    dataUrl,
    sourceUrl: expected.sourceUrl,
    ...overrides,
  };
}

test('usa immediatamente il WebP parcheggiato senza chiamare generate', async () => {
  const { fetchImpl, requests } = queuedFetch([jsonResponse(200, validPayload())]);

  const result = await resolveLocalAuthorArtwork(expected, { fetchImpl });

  assert.equal(result, dataUrl);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'GET');
  assert.match(requests[0].url, /\/preview\?data=2026-09-14$/);
});

test('su preview 404 genera il ritratto e restituisce il WebP della generazione', async () => {
  const messages: string[] = [];
  const { fetchImpl, requests } = queuedFetch([
    jsonResponse(404, { error: 'Disegno non disponibile.' }),
    jsonResponse(200, validPayload()),
  ]);

  const result = await resolveLocalAuthorArtwork(expected, {
    fetchImpl,
    onGenerationStarted: () => messages.push('started'),
    onPreviewMissing: () => messages.push('missing'),
  });

  assert.equal(result, dataUrl);
  assert.deepEqual(messages, ['missing', 'started']);
  assert.equal(requests[1].method, 'POST');
  assert.deepEqual(JSON.parse(requests[1].body ?? '{}'), { data: expected.dataIso });
});

test('su 409 attende con polling e attiva il WebP quando compare', async () => {
  const messages: string[] = [];
  const { fetchImpl, requests } = queuedFetch([
    jsonResponse(404, {}),
    jsonResponse(409, { error: 'È già in corso una generazione locale.' }),
    jsonResponse(404, {}),
    jsonResponse(200, validPayload()),
  ]);

  const result = await resolveLocalAuthorArtwork(expected, {
    fetchImpl,
    onGenerationInProgress: () => messages.push('in-progress'),
    onGenerationStarted: () => messages.push('started'),
    onPreviewMissing: () => messages.push('missing'),
    wait: async () => undefined,
  });

  assert.equal(result, dataUrl);
  assert.deepEqual(messages, ['missing', 'started', 'in-progress']);
  assert.deepEqual(requests.map(({ method }) => method), ['GET', 'POST', 'GET', 'GET']);
});

test('propaga il bridge spento come errore di rete per la UX dell’Editor', async () => {
  const fetchImpl: typeof fetch = async () => {
    throw new TypeError('fetch failed');
  };

  await assert.rejects(
    resolveLocalAuthorArtwork(expected, { fetchImpl }),
    (error: unknown) => error instanceof TypeError && error.message === 'fetch failed',
  );
});

test('propaga l’errore utile restituito da una generazione fallita', async () => {
  const { fetchImpl } = queuedFetch([
    jsonResponse(404, {}),
    jsonResponse(502, { error: 'Image Playground/Shortcuts non ha completato la generazione.' }),
  ]);

  await assert.rejects(
    resolveLocalAuthorArtwork(expected, { fetchImpl }),
    /Image Playground\/Shortcuts non ha completato la generazione/,
  );
});

test('rifiuta risultati con data, autore, sorgente o formato WebP non coerenti', async () => {
  const mismatches: Array<Partial<LocalArtworkBridgePayload>> = [
    { data: '2026-09-13' },
    { authorName: 'Italo Calvino' },
    { sourceUrl: 'https://example.com/other.jpg' },
    { dataUrl: 'data:image/png;base64,AAAA' },
  ];

  for (const mismatch of mismatches) {
    const { fetchImpl } = queuedFetch([jsonResponse(200, validPayload(mismatch))]);
    await assert.rejects(
      resolveLocalAuthorArtwork(expected, { fetchImpl }),
      /non corrisponde|WebP valido/,
    );
  }
});
