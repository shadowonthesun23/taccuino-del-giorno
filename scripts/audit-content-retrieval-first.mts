import {
  fetchCei2008Passage,
  fetchWikiquoteCandidates,
  fetchWikisourcePoem,
  parseCei2008Reference,
} from '../lib/content-verifier/index.ts';
import { createPoliteCachedFetch } from '../lib/content-verifier/rate-limited-fetch.ts';

const AUTHORS = [
  'Stanisław Lem',
  'D. H. Lawrence',
  'Mary Oliver',
  'Cesare Pavese',
  'Ludovico Ariosto',
  'Jennifer Egan',
  'Andrea Camilleri',
  'Auguste Comte',
  'Antonin Artaud',
  'Eduardo Galeano',
  'Joseph Roth',
  'Blaise Cendrars',
  'Charles Baudelaire',
  'Mary Shelley',
  'Blaise Pascal',
] as const;

const BIBLE_REFERENCES = [
  'Siracide 3,21-24 (CEI 2008)',
  'Isaia 54,10',
  'Giobbe 12,7-10 (CEI 2008)',
  'Qoelet 4,1-3 (CEI 2008)',
  'Proverbi 8,22-31',
  'Proverbi 4,23',
  'Isaia 30,15-18 (CEI 2008)',
  'Giobbe 28,12-28 (CEI 2008)',
  'Geremia 1,9-10 (CEI 2008)',
  'Siracide 35,16-20 (CEI 2008)',
  'Qoelet 1,9-11 (CEI 2008)',
  'Siracide 39,1-5',
  'Proverbi 4,23',
  'Proverbi 4,23-27',
  'Isaia 40,6-8 (CEI 2008)',
] as const;

const POEM_PAGES = [
  "Canti di Castelvecchio/Canti di Castelvecchio/L'ora di Barga",
  'Rime nuove/Libro III/Pianto antico',
  'Alcyone/La sera fiesolana',
] as const;

const auditFetch = createPoliteCachedFetch();

const bible = [];
for (const requestedReference of BIBLE_REFERENCES) {
  const expected = parseCei2008Reference(requestedReference);
  const result = await fetchCei2008Passage(requestedReference, { fetch: auditFetch });
  const expectedNumbers = expected
    ? Array.from(
      { length: expected.verseEnd - expected.verseStart + 1 },
      (_, index) => expected.verseStart + index,
    )
    : [];
  const actualNumbers = result.ok ? result.verses.map((verse) => verse.number) : [];
  bible.push({
    requestedReference,
    ok: result.ok && arraysEqual(actualNumbers, expectedNumbers),
    normalizedReference: result.reference,
    verses: actualNumbers,
    textCharacters: result.ok ? result.text.length : 0,
    sourceUrl: result.sourceUrl,
    error: result.ok ? null : result.error,
  });
}

const quotes = [];
for (const author of AUTHORS) {
  const result = await fetchWikiquoteCandidates(author, { fetch: auditFetch });
  quotes.push({
    author,
    ok: result.ok,
    pageFound: result.pageFound,
    resolvedAuthor: result.resolvedAuthor,
    sourceUrl: result.sourceUrl,
    candidateCount: result.candidates.length,
    declaredSourceCount: result.candidates.filter((candidate) => candidate.source).length,
    sample: result.candidates.slice(0, 2).map((candidate) => ({
      text: candidate.text.slice(0, 180),
      source: candidate.source,
      sourceDetail: candidate.sourceDetail,
    })),
    error: result.ok ? null : result.error,
  });
}

const poems = [];
for (const pageTitle of POEM_PAGES) {
  const result = await fetchWikisourcePoem(pageTitle, { fetch: auditFetch });
  poems.push(result.ok
    ? {
      pageTitle,
      ok: true,
      author: result.poem.author,
      title: result.poem.title,
      textCharacters: result.poem.text.length,
      textLines: result.poem.text.split('\n').length,
      sourceUrl: result.poem.sourceUrl,
      error: null,
    }
    : {
      pageTitle,
      ok: false,
      author: null,
      title: null,
      textCharacters: 0,
      textLines: 0,
      sourceUrl: result.sourceUrl,
      error: result.error,
    });
}

const report = {
  generatedAt: new Date().toISOString(),
  safety: {
    geminiCalls: 0,
    supabaseReads: 0,
    supabaseWrites: 0,
  },
  bible: {
    requested: bible.length,
    deterministicRetrievals: bible.filter((item) => item.ok).length,
    items: bible,
  },
  wikiquote: {
    requestedAuthors: quotes.length,
    pagesFound: quotes.filter((item) => item.pageFound).length,
    authorsWithCandidates: quotes.filter((item) => item.candidateCount > 0).length,
    totalCandidates: quotes.reduce((sum, item) => sum + item.candidateCount, 0),
    candidatesWithDeclaredSource: quotes.reduce((sum, item) => sum + item.declaredSourceCount, 0),
    items: quotes,
  },
  wikisource: {
    requestedPages: poems.length,
    deterministicExtractions: poems.filter((item) => item.ok).length,
    items: poems,
  },
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

function arraysEqual(left: number[], right: number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
