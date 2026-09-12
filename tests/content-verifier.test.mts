import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  extractCei2008Verses,
  fetchCei2008Passage,
  parseCei2008Reference,
  verifyBibleWithBibbiaEdu,
} from '../lib/content-verifier/bibbiaedu.ts';
import {
  matchConservativeExcerpt,
  normalizeConservativeText,
} from '../lib/content-verifier/matcher.ts';
import { verifyPoemWithWikisource } from '../lib/content-verifier/wikisource.ts';
import {
  fetchWikiquoteCandidates,
  parseWikiquoteCandidates,
  verifyQuoteWithWikiquote,
} from '../lib/content-verifier/wikiquote.ts';
import { fetchWikisourcePoem } from '../lib/content-verifier/wikisource-retrieval.ts';
import type { FetchLike } from '../lib/content-verifier/types.ts';

const fixture = async (name: string) => readFile(
  new URL(`./fixtures/content-verifier/${name}`, import.meta.url),
  'utf8',
);

const jsonResponse = (payload: string, status = 200) => new Response(payload, {
  status,
  headers: { 'content-type': 'application/json' },
});

test('identical quote on the requested author page is verified', async () => {
  const payload = await fixture('wikiquote-giovanni-pascoli.json');
  const result = await verifyQuoteWithWikiquote({
    text: 'Il ricordo è poesia, e la poesia non è se non ricordo.',
    author: 'Giovanni Pascoli',
  }, { fetch: async () => jsonResponse(payload) });

  assert.equal(result.status, 'verified');
  assert.equal(result.reason, 'exact_conservative_match');
  assert.match(result.sourceUrl ?? '', /Giovanni_Pascoli/u);
});

test('Wikiquote retrieval returns author quotes and declared sources only', async () => {
  const payload = await fixture('wikiquote-giovanni-pascoli.json');
  const result = await fetchWikiquoteCandidates(
    'Giovanni Pascoli',
    { fetch: async () => jsonResponse(payload) },
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.pageFound, true);
    assert.equal(result.candidates.length, 2);
    assert.equal(result.candidates[1].source, "L'ora di Barga");
    assert.equal(result.candidates[1].sourceDetail, 'inline');
    assert.doesNotMatch(result.candidates.map((candidate) => candidate.text).join(' '), /non è sua/u);
  }
});

test('Wikiquote parser uses a work heading as source without inventing bibliography', () => {
  const candidates = parseWikiquoteCandidates(
    '== Citazioni di Autrice ==\nUna frase senza fonte.\n== Opera dichiarata ==\nUna seconda frase autentica.',
    'Autrice',
    'https://example.test/Autrice',
  );
  assert.equal(candidates[0].source, null);
  assert.equal(candidates[1].source, 'Opera dichiarata');
  assert.equal(candidates[1].sourceDetail, 'section');
});

test('Wikiquote parser supports short pages whose quotes precede the first heading', () => {
  const candidates = parseWikiquoteCandidates(
    'Auguste Comte (1798-1857), filosofo francese.\nLa scienza produce previsione.\n\n== Citazioni su Auguste Comte ==\nUna frase altrui.',
    'Auguste Comte',
    'https://it.wikiquote.org/wiki/Auguste_Comte',
  );

  assert.deepEqual(candidates.map((candidate) => candidate.text), ['La scienza produce previsione.']);
});

test('Wikiquote parser keeps a work title across generic nested headings', () => {
  const candidates = parseWikiquoteCandidates(
    'Mary Shelley, scrittrice britannica.\n== Frankenstein ==\n=== Incipit ===\nEra una notte cupa e tempestosa.',
    'Mary Shelley',
    'https://it.wikiquote.org/wiki/Mary_Shelley',
  );

  assert.equal(candidates[0]?.source, 'Frankenstein');
});

test('typographic quotes and apostrophes normalize conservatively', () => {
  assert.equal(
    normalizeConservativeText('“L’acqua”  d’argento'),
    normalizeConservativeText('"L\'acqua"\td\'argento'),
  );
});

test('line-break differences are accepted', () => {
  assert.equal(
    matchConservativeExcerpt(
      'Al mio cantuccio, donde non sento\nse non le reste brusir del grano,',
      'Al mio cantuccio, donde non sento se non le reste brusir del grano,',
    ).matched,
    true,
  );
});

test('a substituted word is unverified', () => {
  assert.equal(
    matchConservativeExcerpt('la poesia non è se non memoria', 'la poesia non è se non ricordo').matched,
    false,
  );
});

test('a paraphrase is unverified', () => {
  assert.equal(
    matchConservativeExcerpt('La poesia nasce dai ricordi', 'Il ricordo è poesia, e la poesia non è se non ricordo.').matched,
    false,
  );
});

test('a page belonging to another author is unverified', async () => {
  const payload = JSON.stringify({
    query: {
      pages: [{ pageid: 99, title: 'Gabriele D’Annunzio', extract: 'Il ricordo è poesia.' }],
    },
  });
  const result = await verifyQuoteWithWikiquote({
    text: 'Il ricordo è poesia.',
    author: 'Giovanni Pascoli',
  }, { fetch: async () => jsonResponse(payload) });

  assert.equal(result.status, 'unverified');
  assert.equal(result.reason, 'resolved_page_author_mismatch');
});

test('a valid omission keeps the remaining chunks in source order', () => {
  assert.equal(
    matchConservativeExcerpt(
      'Nel mezzo [...] mi ritrovai per una selva oscura',
      'Nel mezzo del cammin di nostra vita mi ritrovai per una selva oscura',
    ).matched,
    true,
  );
});

test('an omission with reversed chunks is unverified', () => {
  assert.equal(
    matchConservativeExcerpt(
      'selva oscura … Nel mezzo',
      'Nel mezzo del cammin di nostra vita mi ritrovai per una selva oscura',
    ).matched,
    false,
  );
});

test('Wikisource verifies author and rendered poem excerpt', async () => {
  const search = await fixture('wikisource-search.json');
  const parsed = await fixture('wikisource-ora-di-barga-parse.json');
  const fetcher: FetchLike = async (input) => {
    const url = new URL(input.toString());
    return jsonResponse(url.searchParams.get('action') === 'parse' ? parsed : search);
  };
  const result = await verifyPoemWithWikisource({
    text: 'Al mio cantuccio, donde non sento\nse non le reste brusir del grano,',
    author: 'Giovanni Pascoli',
    source: '“L’ora di Barga”, da Canti di Castelvecchio, 1907',
  }, { fetch: fetcher });

  assert.equal(result.status, 'verified');
  assert.equal(result.reason, 'exact_conservative_match');
});

test('Wikisource retrieval returns structured author, title, text and URL', async () => {
  const parsed = await fixture('wikisource-ora-di-barga-parse.json');
  const result = await fetchWikisourcePoem(
    "Canti di Castelvecchio/Canti di Castelvecchio/L'ora di Barga",
    { fetch: async () => jsonResponse(parsed) },
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.poem.author, 'Giovanni Pascoli');
    assert.equal(result.poem.title, "L'ora di Barga");
    assert.match(result.poem.text, /Al mio cantuccio/u);
    assert.match(result.poem.sourceUrl, /wiki\//u);
  }
});

test('Wikisource rejects matching text attributed to a different structured author', async () => {
  const search = JSON.stringify({
    query: { pages: [{ pageid: 7, ns: 0, title: 'Opera omonima' }] },
  });
  const parsed = JSON.stringify({
    parse: {
      pageid: 7,
      title: 'Opera omonima',
      text: '<a href="/wiki/Autore:Autore_Diverso">Autore Diverso</a><p>Il verso cercato. Giovanni Pascoli è citato in nota.</p>',
    },
  });
  const fetcher: FetchLike = async (input) => {
    const url = new URL(input.toString());
    return jsonResponse(url.searchParams.get('action') === 'parse' ? parsed : search);
  };
  const result = await verifyPoemWithWikisource({
    text: 'Il verso cercato.',
    author: 'Giovanni Pascoli',
    source: 'Opera omonima',
  }, { fetch: fetcher });

  assert.equal(result.status, 'unverified');
  assert.equal(result.reason, 'candidate_author_mismatch');
});

test('BibbiaEdu parser selects only requested CEI 2008 verse nodes', async () => {
  const html = await fixture('bibbiaedu-proverbi-2.html');
  const reference = parseCei2008Reference('Proverbi 2,1-2 — CEI 2008');
  assert.ok(reference);
  const extracted = extractCei2008Verses(html, reference);
  assert.equal(extracted.ok, true);
  if (extracted.ok) {
    assert.match(extracted.text, /Figlio mio/u);
    assert.match(extracted.text, /tendendo il tuo orecchio/u);
    assert.doesNotMatch(extracted.text, /nota che non deve/u);
    assert.doesNotMatch(extracted.text, /navigazione|altra traduzione/u);
    assert.deepEqual(extracted.verses.map((verse) => verse.number), [1, 2]);
  }

  const passage = await fetchCei2008Passage(
    'Proverbi 2,1-2 — CEI 2008',
    { fetch: async () => new Response(html, { status: 200 }) },
  );
  assert.equal(passage.ok, true);
  if (passage.ok) {
    assert.equal(passage.reference, 'Proverbi 2,1-2');
    assert.deepEqual(passage.verses.map((verse) => verse.number), [1, 2]);
    assert.equal(passage.sourceName, 'BibbiaEdu — CEI 2008');
  }

  const result = await verifyBibleWithBibbiaEdu({
    text: 'Figlio mio, se tu accoglierai le mie parole\ne custodirai in te i miei precetti,',
    reference: 'Proverbi 2,1 — CEI 2008',
  }, { fetch: async () => new Response(html, { status: 200 }) });
  assert.equal(result.status, 'verified');
});

test('CEI 2008 references accept both parenthetical and dash suffixes', () => {
  assert.ok(parseCei2008Reference('Siracide 3,21-24 (CEI 2008)'));
  assert.ok(parseCei2008Reference('Isaia 40, 6-8 — CEI 2008'));
});

test('HTTP failure becomes error rather than unverified', async () => {
  const result = await verifyQuoteWithWikiquote({
    text: 'Una frase.',
    author: 'Un autore',
  }, { fetch: async () => new Response('upstream unavailable', { status: 503 }) });

  assert.equal(result.status, 'error');
  assert.match(result.reason, /HTTP 503/u);
});
