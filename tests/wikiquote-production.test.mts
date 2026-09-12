import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeGeneratedQuote } from '../lib/finalize-generated-quote.ts';

const candidateResult = (candidates: Array<{ text: string; source?: string | null }>) => ({
  ok: true as const, requestedAuthor: 'Dante Alighieri', resolvedAuthor: 'Dante Alighieri', pageFound: true,
  sourceUrl: 'https://it.wikiquote.org/wiki/Dante_Alighieri', sourceName: 'Wikiquote in italiano',
  candidates: candidates.map((candidate) => ({ author: 'Dante Alighieri', text: candidate.text, source: candidate.source ?? null, sourceDetail: candidate.source ? 'section' as const : null, sourceUrl: 'https://it.wikiquote.org/wiki/Dante_Alighieri' })),
});

test('uses exact Wikiquote match and preserves its immutable text and source', async () => {
  const data = await finalizeGeneratedQuote({ autore_giorno: 'Dante Alighieri', citazione: { testo: 'Nel mezzo della vita', autore: 'Wrong', fonte: 'Inferno' } }, { fetchCandidates: async () => candidateResult([{ text: 'Nel mezzo della vita', source: 'Inferno, canto I' }]) });
  assert.deepEqual(data.citazione, { testo: 'Nel mezzo della vita', autore: 'Dante Alighieri', fonte: 'Inferno, canto I' });
});

test('replaces a different Gemini quote deterministically and requires the definitive author', async () => {
  let requested = '';
  const data = await finalizeGeneratedQuote({ autore_giorno: 'Dante Alighieri', citazione: { testo: 'Amor che move il sole', autore: 'Other', fonte: '' } }, { fetchCandidates: async (author) => { requested = author; return candidateResult([{ text: 'Nel mezzo del cammin di nostra vita' }, { text: 'Amor che a nullo amato amar perdona', source: 'Inferno, canto V' }]); } });
  assert.equal(requested, 'Dante Alighieri');
  assert.equal(data.citazione.testo, 'Amor che a nullo amato amar perdona');
  assert.equal(data.citazione.autore, 'Dante Alighieri');
});

test('fails closed when Wikiquote has no candidates or an HTTP error', async () => {
  await assert.rejects(() => finalizeGeneratedQuote({ autore_giorno: 'Dante Alighieri', citazione: { testo: 'inventata' } }, { fetchCandidates: async () => ({ ...candidateResult([]), pageFound: false, candidates: [] }) }), /Nessuna citazione/);
  await assert.rejects(() => finalizeGeneratedQuote({ autore_giorno: 'Dante Alighieri', citazione: { testo: 'inventata' } }, { fetchCandidates: async () => ({ ok: false, requestedAuthor: 'Dante Alighieri', resolvedAuthor: null, pageFound: false, sourceUrl: null, sourceName: 'Wikiquote in italiano', candidates: [], error: { code: 'http_error', message: 'offline' } }) }), /offline/);
});
