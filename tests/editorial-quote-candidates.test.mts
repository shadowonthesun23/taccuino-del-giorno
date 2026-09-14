import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EarlyWikiquoteError,
  injectSelectedEditorialQuote,
  prepareEditorialQuoteCandidates,
  retrieveEarlyEditorialQuotes,
  type AuthorSeed,
} from '../lib/editorial-quote-candidates.ts';
import type { WikiquoteCandidate, WikiquoteRetrievalResult } from '../lib/content-verifier/wikiquote.ts';
import { finalizeGeneratedBible } from '../lib/finalize-generated-bible.ts';

function candidate(text: string, source = 'Opera', author = 'Autore'): WikiquoteCandidate {
  return {
    author,
    text,
    source,
    sourceDetail: 'section',
    sourceUrl: 'https://it.wikiquote.org/wiki/Autore',
  };
}

function words(count: number): string {
  return Array.from({ length: count }, (_, index) => `parola${index + 1}`).join(' ');
}

function result(author: string, candidates: WikiquoteCandidate[], pageFound = true): WikiquoteRetrievalResult {
  return {
    ok: true,
    requestedAuthor: author,
    resolvedAuthor: pageFound ? author : null,
    pageFound,
    sourceUrl: pageFound ? `https://it.wikiquote.org/wiki/${author}` : null,
    sourceName: 'Wikiquote in italiano',
    candidates,
  };
}

test('quote length thresholds include 20 and 40 words, exclude over 45 words and over 360 characters', () => {
  const tooLongByCharacters = ['Lunghissima', 'citazione', 'con', 'testo', 'x'.repeat(340)].join(' ');
  const prepared = prepareEditorialQuoteCandidates([
    candidate(words(20), 'Venti'),
    candidate(words(40), 'Quaranta'),
    candidate(words(46), 'Troppi'),
    candidate(tooLongByCharacters, 'Caratteri'),
  ]);

  assert.deepEqual(prepared.map((quote) => quote.source), ['Venti', 'Quaranta']);
});

test('short fragments are excluded, normalized duplicates collapse and text is never truncated', () => {
  const authentic = 'Questo è un testo autentico abbastanza lungo';
  const prepared = prepareEditorialQuoteCandidates([
    candidate('Tre sole parole'),
    candidate(authentic),
    candidate('  QUESTO  È UN TESTO AUTENTICO ABBASTANZA LUNGO  '),
  ]);

  assert.equal(prepared.length, 1);
  assert.equal(prepared[0].text, authentic);
  assert.doesNotMatch(prepared[0].text, /\.\.\.$/u);
});

test('IDs and capped source round-robin sampling are deterministic and varied', () => {
  const input = [
    candidate('Prima citazione completa della fonte alfa', 'Alfa'),
    candidate('Seconda citazione completa della fonte alfa', 'Alfa'),
    candidate('Terza citazione completa della fonte alfa', 'Alfa'),
    candidate('Prima citazione completa della fonte beta', 'Beta'),
    candidate('Prima citazione completa della fonte gamma', 'Gamma'),
  ];
  const first = prepareEditorialQuoteCandidates(input, 4);
  const second = prepareEditorialQuoteCandidates(input, 4);

  assert.deepEqual(first, second);
  assert.deepEqual(first.map((quote) => quote.id), ['Q01', 'Q02', 'Q03', 'Q04']);
  assert.deepEqual(first.map((quote) => quote.source), ['Alfa', 'Beta', 'Gamma', 'Alfa']);
});

test('selected quote is injected verbatim from the server-side map and unknown IDs fail', () => {
  const quotes = Array.from({ length: 7 }, (_, index) => Object.freeze({
    id: `Q${String(index + 1).padStart(2, '0')}`,
    author: 'Autore',
    text: index === 6 ? 'TESTO AUTENTICO' : `Testo autentico numero ${index + 1}`,
    source: index === 6 ? 'Opera' : 'Altra opera',
    sourceUrl: 'https://it.wikiquote.org/wiki/Autore',
  }));
  const generated = {
    selected_quote_id: 'Q07',
    tema_guida: 'Tema',
    parola_giorno: { parola: 'Ascesi' },
    citazione: { testo: 'TESTO INVENTATO', autore: 'Altro', fonte: 'Fonte falsa' },
  };
  const assembled = injectSelectedEditorialQuote(generated, {
    autore_giorno: 'Autore',
    breve_descrizione: 'Descrizione',
  }, quotes, '14 settembre');

  assert.deepEqual(assembled.citazione, {
    testo: 'TESTO AUTENTICO',
    autore: 'Autore',
    fonte: 'Opera',
  });
  assert.equal('selected_quote_id' in assembled, false);
  assert.throws(() => injectSelectedEditorialQuote({ selected_quote_id: 'Q99' }, {
    autore_giorno: 'Autore', breve_descrizione: 'Descrizione',
  }, quotes, '14 settembre'), /sconosciuto/u);
});

test('early retrieval succeeds without recovery when the first author has quotes', async () => {
  let retrievals = 0;
  let recoveries = 0;
  const seed: AuthorSeed = { autore_giorno: 'Primo', breve_descrizione: 'Descrizione' };
  const output = await retrieveEarlyEditorialQuotes(seed, {
    fetchCandidates: async (author) => { retrievals += 1; return result(author, [candidate('Una citazione autentica completa e valida', 'Opera', author)]); },
    recoverAuthor: async () => { recoveries += 1; return seed; },
  });
  assert.equal(output.authorSeed, seed);
  assert.equal(retrievals, 1);
  assert.equal(recoveries, 0);
});

test('early retrieval performs one author recovery and a second retrieval, then succeeds', async () => {
  let retrievals = 0;
  let recoveries = 0;
  const output = await retrieveEarlyEditorialQuotes(
    { autore_giorno: 'Primo', breve_descrizione: 'Descrizione' },
    {
      fetchCandidates: async (author) => {
        retrievals += 1;
        return author === 'Primo' ? result(author, [], false) : result(author, [candidate('Una citazione autentica completa e valida', 'Opera', author)]);
      },
      recoverAuthor: async () => { recoveries += 1; return { autore_giorno: 'Secondo', breve_descrizione: 'Descrizione due' }; },
    },
  );
  assert.equal(output.authorSeed.autore_giorno, 'Secondo');
  assert.equal(retrievals, 2);
  assert.equal(recoveries, 1);
});

test('early retrieval fails closed after at most one recovery when both authors have no quotes', async () => {
  let retrievals = 0;
  let recoveries = 0;
  await assert.rejects(() => retrieveEarlyEditorialQuotes(
    { autore_giorno: 'Primo', breve_descrizione: 'Descrizione' },
    {
      fetchCandidates: async (author) => { retrievals += 1; return result(author, []); },
      recoverAuthor: async () => { recoveries += 1; return { autore_giorno: 'Secondo', breve_descrizione: 'Descrizione due' }; },
    },
  ), (error: unknown) => error instanceof EarlyWikiquoteError && error.code === 'no_candidates');
  assert.equal(retrievals, 2);
  assert.equal(recoveries, 1);
});

test('forced author and technical errors fail without author recovery', async () => {
  for (const scenario of ['forced', 'http'] as const) {
    let recoveries = 0;
    await assert.rejects(() => retrieveEarlyEditorialQuotes(
      { autore_giorno: 'Primo', breve_descrizione: 'Descrizione' },
      {
        forcedAuthor: scenario === 'forced' ? 'Primo' : '',
        fetchCandidates: async (author) => scenario === 'forced'
          ? result(author, [])
          : {
            ok: false, requestedAuthor: author, resolvedAuthor: null, pageFound: false,
            sourceUrl: null, sourceName: 'Wikiquote in italiano', candidates: [],
            error: { code: 'http_error', message: 'offline' },
          },
        recoverAuthor: async () => { recoveries += 1; return { autore_giorno: 'Secondo', breve_descrizione: 'Descrizione' }; },
      },
    ), EarlyWikiquoteError);
    assert.equal(recoveries, 0);
  }
});

test('mocked quote-first pipeline preserves order and CEI finalization cannot change the quote', async () => {
  const events: string[] = ['AUTHOR'];
  const early = await retrieveEarlyEditorialQuotes(
    { autore_giorno: 'Autore', breve_descrizione: 'Descrizione' },
    {
      fetchCandidates: async (author) => {
        events.push('WIKIQUOTE CANDIDATES');
        return result(author, [candidate('Una citazione autentica completa e fertile', 'Opera', author)]);
      },
      recoverAuthor: async () => { throw new Error('recovery inatteso'); },
    },
  );
  events.push('SELECTED QUOTE', 'THEME', 'WORD/POEM/BIBLE/MUSIC');
  const assembled = injectSelectedEditorialQuote({
    selected_quote_id: 'Q01',
    tema_guida: 'Elevazione',
    parola_giorno: { parola: 'Ascesi' },
    bibbia: { testo: '', fonte: 'Isaia 35,1', nota: 'Nota' },
  }, early.authorSeed, early.quotes, '14 settembre');
  const quoteBeforeCei = assembled.citazione;
  const finalized = await finalizeGeneratedBible(assembled, {
    fetchPassage: async () => ({
      ok: true,
      reference: 'Isaia 35,1',
      text: 'Si rallegrino il deserto e la terra arida.',
      verses: [{ number: 1, text: 'Si rallegrino il deserto e la terra arida.' }],
      sourceUrl: 'https://www.bibbiaedu.it/CEI2008/at/Is/35/',
      sourceName: 'BibbiaEdu CEI 2008',
    }),
  });
  events.push('CEI', 'READY FOR UPSERT');

  assert.deepEqual(events, [
    'AUTHOR', 'WIKIQUOTE CANDIDATES', 'SELECTED QUOTE', 'THEME',
    'WORD/POEM/BIBLE/MUSIC', 'CEI', 'READY FOR UPSERT',
  ]);
  assert.equal(finalized.citazione, quoteBeforeCei);
});
