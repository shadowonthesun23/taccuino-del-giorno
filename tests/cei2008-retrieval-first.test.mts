import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  extractCei2008Verses,
  fetchCei2008Passage,
  parseCei2008Reference,
  type Cei2008PassageResult,
} from '../lib/cei2008.ts';
import {
  Cei2008FinalizationError,
  finalizeGeneratedBible,
} from '../lib/finalize-generated-bible.ts';

const fixture = () => readFile(
  new URL('./fixtures/cei2008-proverbi-2.html', import.meta.url),
  'utf8',
);

test('a valid reference replaces generated text with ordered CEI 2008 verses', async () => {
  const html = await fixture();
  const generated = {
    bibbia: {
      testo: 'Questo testo Gemini è falso e non deve sopravvivere.',
      fonte: 'Proverbi 2,1-2',
      nota: 'Nota editoriale conservata.',
    },
  };

  const finalized = await finalizeGeneratedBible(generated, {
    fetch: async () => new Response(html, { status: 200 }),
  });

  assert.match(finalized.bibbia.testo, /Figlio mio/u);
  assert.match(finalized.bibbia.testo, /tendendo il tuo orecchio/u);
  assert.doesNotMatch(finalized.bibbia.testo, /testo Gemini|navigazione|altra traduzione/u);
  assert.equal(finalized.bibbia.fonte, 'Proverbi 2,1-2 — CEI 2008');
  assert.equal(finalized.bibbia.nota, 'Nota editoriale conservata.');
});

test('a normalizable reference with typographic dash retrieves CEI 2008', async () => {
  const html = await fixture();
  const passage = await fetchCei2008Passage('Proverbi 2, 1–2 (CEI 2008)', {
    fetch: async () => new Response(html, { status: 200 }),
  });

  assert.equal(passage.ok, true);
  if (passage.ok) {
    assert.equal(passage.reference, 'Proverbi 2,1-2');
    assert.deepEqual(passage.verses.map((verse) => verse.number), [1, 2]);
    assert.equal(passage.sourceName, 'BibbiaEdu — CEI 2008');
  }
});

test('failed retrieval prevents the persistence path from being reached', async () => {
  let upsertReached = false;
  const failedPassage: Cei2008PassageResult = {
    ok: false,
    reference: null,
    text: null,
    verses: [],
    sourceUrl: null,
    sourceName: 'BibbiaEdu — CEI 2008',
    error: { code: 'invalid_reference', message: 'Riferimento non valido.' },
  };

  await assert.rejects(async () => {
    const finalized = await finalizeGeneratedBible(
      { bibbia: { testo: 'Testo Gemini', fonte: 'riferimento inventato' } },
      { fetchPassage: async () => failedPassage },
    );
    upsertReached = true;
    return finalized;
  }, Cei2008FinalizationError);

  assert.equal(upsertReached, false);
});

test('incomplete verse ranges fail structurally', async () => {
  const html = await fixture();
  const passage = await fetchCei2008Passage('Proverbi 2,1-4', {
    fetch: async () => new Response(html, { status: 200 }),
  });

  assert.equal(passage.ok, false);
  if (!passage.ok) {
    assert.equal(passage.error.code, 'source_structure_error');
    assert.equal(passage.error.message, 'missing_structured_verse_4');
  }
});

test('an unexpected DOM or different edition fails structurally', async () => {
  const wrongDom = '<html><body class="content-CEI2008 book-Pr chapter-99"><p>Testo ambiguo</p></body></html>';
  const passage = await fetchCei2008Passage('Proverbi 2,1', {
    fetch: async () => new Response(wrongDom, { status: 200 }),
  });

  assert.equal(passage.ok, false);
  if (!passage.ok) {
    assert.equal(passage.error.code, 'source_structure_error');
    assert.equal(passage.error.message, 'source_identity_or_version_mismatch');
  }
});

test('an ambiguous duplicate verse fails structurally', async () => {
  const html = (await fixture()).replace(
    '</div>\n    <section class="other-translation">',
    '<span class="verse"><span class="text-to-speech"><sup><span class="verse_number">2</span></sup>Duplicato ambiguo.</span></span></div>\n    <section class="other-translation">',
  );
  const passage = await fetchCei2008Passage('Proverbi 2,2', {
    fetch: async () => new Response(html, { status: 200 }),
  });

  assert.equal(passage.ok, false);
  if (!passage.ok) {
    assert.equal(passage.error.code, 'source_structure_error');
    assert.equal(passage.error.message, 'ambiguous_structured_verse_2');
  }
});

test('an HTTP failure is structured and cannot preserve generated text', async () => {
  const result = await fetchCei2008Passage('Proverbi 2,1', {
    fetch: async () => new Response('upstream unavailable', { status: 503 }),
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'http_error');

  await assert.rejects(
    finalizeGeneratedBible(
      { bibbia: { testo: 'Testo Gemini', fonte: 'Proverbi 2,1' } },
      { fetchPassage: async () => result },
    ),
    Cei2008FinalizationError,
  );
});

test('the parser excludes headings, notes, navigation and verse numbers', async () => {
  const html = await fixture();
  const reference = parseCei2008Reference('Proverbi 2,1-2');
  assert.ok(reference);
  const extracted = extractCei2008Verses(html, reference);
  assert.equal(extracted.ok, true);
  if (extracted.ok) {
    assert.deepEqual(extracted.verses.map((verse) => verse.number), [1, 2]);
    assert.doesNotMatch(extracted.text, /2,1-10|sapienza è dono|capitolo 99|altra traduzione/u);
  }
});

test('the route finalizes CEI after Gemini and before the only upsert', async () => {
  const route = await readFile(
    new URL('../app/api/generate/route.ts', import.meta.url),
    'utf8',
  );
  const geminiSdkCalls = route.match(/\.generateContent\(/gu) ?? [];
  const finalizationIndex = route.indexOf('await finalizeGeneratedBible(generatedData');
  const upsertIndex = route.indexOf(".from('contenuti_giornalieri').upsert(");

  assert.equal(geminiSdkCalls.length, 1);
  assert.ok(finalizationIndex > route.indexOf('if (!generatedData)'));
  assert.ok(upsertIndex > finalizationIndex);
  assert.equal(route.indexOf(".from('contenuti_giornalieri').upsert(", upsertIndex + 1), -1);
});
