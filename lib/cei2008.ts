import { load } from 'cheerio';

const SOURCE_NAME = 'BibbiaEdu — CEI 2008';
const ORIGIN = 'https://www.bibbiaedu.it';

interface BibleBookRoute {
  testament: 'at' | 'nt';
  slug: string;
  name: string;
}

export interface ParsedCei2008Reference extends BibleBookRoute {
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

export interface Cei2008Verse {
  number: number;
  text: string;
}

export type Cei2008PassageResult = {
  ok: true;
  reference: string;
  text: string;
  verses: Cei2008Verse[];
  sourceUrl: string;
  sourceName: string;
} | {
  ok: false;
  reference: string | null;
  text: null;
  verses: [];
  sourceUrl: string | null;
  sourceName: string;
  error: {
    code: 'invalid_reference' | 'http_error' | 'source_structure_error';
    message: string;
  };
};

export type Cei2008Fetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface FetchCei2008Options {
  fetch?: Cei2008Fetch;
  timeoutMs?: number;
}

const BOOKS = new Map<string, BibleBookRoute>();

function addBooks(testament: BibleBookRoute['testament'], entries: Array<[string, string, ...string[]]>) {
  for (const [slug, ...names] of entries) {
    const canonicalName = names[0] ?? slug;
    for (const name of [slug, ...names]) {
      BOOKS.set(normalizeBookName(name), { testament, slug, name: canonicalName });
    }
  }
}

addBooks('at', [
  ['Gen', 'Genesi'], ['Es', 'Esodo'], ['Lv', 'Levitico'], ['Nm', 'Numeri'], ['Dt', 'Deuteronomio'],
  ['Gs', 'Giosuè'], ['Gdc', 'Giudici'], ['Rt', 'Rut'], ['1Sam', '1 Samuele'], ['2Sam', '2 Samuele'],
  ['1Re', '1 Re'], ['2Re', '2 Re'], ['1Cr', '1 Cronache'], ['2Cr', '2 Cronache'], ['Esd', 'Esdra'],
  ['Ne', 'Neemia'], ['Tb', 'Tobia'], ['Gdt', 'Giuditta'], ['Est', 'Ester'], ['1Mac', '1 Maccabei'],
  ['2Mac', '2 Maccabei'], ['Gb', 'Giobbe'], ['Sal', 'Salmo', 'Salmi'], ['Pr', 'Proverbi'], ['Qo', 'Qoelet', 'Qoèlet'],
  ['Ct', 'Cantico dei Cantici'], ['Sap', 'Sapienza'], ['Sir', 'Siracide'], ['Is', 'Isaia'], ['Ger', 'Geremia'],
  ['Lam', 'Lamentazioni'], ['Bar', 'Baruc'], ['Ez', 'Ezechiele'], ['Dn', 'Daniele'], ['Os', 'Osea'],
  ['Gl', 'Gioele'], ['Am', 'Amos'], ['Abd', 'Abdia'], ['Gio', 'Giona'], ['Mi', 'Michea'],
  ['Na', 'Naum'], ['Ab', 'Abacuc'], ['Sof', 'Sofonia'], ['Ag', 'Aggeo'], ['Zc', 'Zaccaria'], ['Ml', 'Malachia'],
]);
addBooks('nt', [
  ['Mt', 'Matteo'], ['Mc', 'Marco'], ['Lc', 'Luca'], ['Gv', 'Giovanni'], ['At', 'Atti', 'Atti degli Apostoli'],
  ['Rm', 'Romani'], ['1Cor', '1 Corinzi'], ['2Cor', '2 Corinzi'], ['Gal', 'Galati'], ['Ef', 'Efesini'],
  ['Fil', 'Filippesi'], ['Col', 'Colossesi'], ['1Ts', '1 Tessalonicesi'], ['2Ts', '2 Tessalonicesi'],
  ['1Tm', '1 Timoteo'], ['2Tm', '2 Timoteo'], ['Tt', 'Tito'], ['Fm', 'Filemone'], ['Eb', 'Ebrei'],
  ['Gc', 'Giacomo'], ['1Pt', '1 Pietro'], ['2Pt', '2 Pietro'], ['1Gv', '1 Giovanni'], ['2Gv', '2 Giovanni'],
  ['3Gv', '3 Giovanni'], ['Gd', 'Giuda'], ['Ap', 'Apocalisse'],
]);

export function parseCei2008Reference(reference: string): ParsedCei2008Reference | null {
  const cleaned = reference
    .replace(/\s*(?:[—–-]\s*)?\(?\s*CEI\s*2008\s*\)?\s*$/iu, '')
    .trim();
  const match = cleaned.match(/^(.+?)\s+(\d+)\s*,\s*(\d+)(?:\s*[-–—]\s*(\d+))?$/u);
  if (!match) return null;
  const route = BOOKS.get(normalizeBookName(match[1]));
  if (!route) return null;
  const chapter = Number(match[2]);
  const verseStart = Number(match[3]);
  const verseEnd = Number(match[4] ?? match[3]);
  if (chapter < 1 || verseStart < 1 || verseEnd < verseStart) return null;
  return { ...route, chapter, verseStart, verseEnd };
}

export function extractCei2008Verses(
  html: string,
  reference: ParsedCei2008Reference,
): { ok: true; text: string; verses: Cei2008Verse[] } | { ok: false; reason: string } {
  const $ = load(html);
  const body = $('body');
  if (!body.hasClass('content-CEI2008')
    || !body.hasClass(`book-${reference.slug}`)
    || !body.hasClass(`chapter-${reference.chapter}`)) {
    return { ok: false, reason: 'source_identity_or_version_mismatch' };
  }

  const verses = new Map<number, string>();
  const duplicateVerseNumbers = new Set<number>();
  $('.verses-container span.verse').each((_, element) => {
    const verse = $(element);
    const rawNumber = verse.find('.verse_number').first().text().trim()
      || verse.find('button.show-note').first().text().trim();
    const number = Number(rawNumber);
    if (!Number.isInteger(number)) return;

    const textNode = verse.children('.text-to-speech').first().clone();
    textNode.find('button, sup, .verse_number').remove();
    textNode.find('br').replaceWith('\n');
    const text = textNode.text().replace(/\s+$/u, '').trim();
    if (text) {
      if (verses.has(number)) duplicateVerseNumbers.add(number);
      verses.set(number, text);
    }
  });

  const selected: Cei2008Verse[] = [];
  for (let number = reference.verseStart; number <= reference.verseEnd; number += 1) {
    if (duplicateVerseNumbers.has(number)) {
      return { ok: false, reason: `ambiguous_structured_verse_${number}` };
    }
    const text = verses.get(number);
    if (!text) return { ok: false, reason: `missing_structured_verse_${number}` };
    selected.push({ number, text });
  }
  return { ok: true, text: selected.map((verse) => verse.text).join('\n'), verses: selected };
}

export async function fetchCei2008Passage(
  reference: string,
  options: FetchCei2008Options = {},
): Promise<Cei2008PassageResult> {
  const parsed = parseCei2008Reference(reference);
  if (!parsed) {
    return failure(null, null, 'invalid_reference', 'Riferimento biblico non supportato.');
  }

  const normalizedReference = formatCei2008Reference(parsed);
  const sourceUrl = new URL(
    `/CEI2008/${parsed.testament}/${parsed.slug}/${parsed.chapter}/`,
    ORIGIN,
  ).toString();
  try {
    const response = await (options.fetch ?? fetch)(sourceUrl, {
      headers: {
        'user-agent': 'day-atlas-cei2008-retriever/1.0 (+https://github.com/shadowonthesun23/taccuino-del-giorno)',
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? 8_000),
    });
    if (!response.ok) {
      return failure(
        normalizedReference,
        sourceUrl,
        'http_error',
        `BibbiaEdu ha risposto con HTTP ${response.status}.`,
      );
    }

    const extracted = extractCei2008Verses(await response.text(), parsed);
    if (!extracted.ok) {
      return failure(normalizedReference, sourceUrl, 'source_structure_error', extracted.reason);
    }
    return {
      ok: true,
      reference: normalizedReference,
      text: extracted.text,
      verses: extracted.verses,
      sourceUrl,
      sourceName: SOURCE_NAME,
    };
  } catch (error) {
    return failure(
      normalizedReference,
      sourceUrl,
      'http_error',
      error instanceof Error ? error.message : 'Richiesta BibbiaEdu non riuscita.',
    );
  }
}

function failure(
  reference: string | null,
  sourceUrl: string | null,
  code: Extract<Cei2008PassageResult, { ok: false }>['error']['code'],
  message: string,
): Cei2008PassageResult {
  return {
    ok: false,
    reference,
    text: null,
    verses: [],
    sourceUrl,
    sourceName: SOURCE_NAME,
    error: { code, message },
  };
}

function formatCei2008Reference(reference: ParsedCei2008Reference): string {
  const verses = reference.verseStart === reference.verseEnd
    ? String(reference.verseStart)
    : `${reference.verseStart}-${reference.verseEnd}`;
  return `${reference.name} ${reference.chapter},${verses}`;
}

function normalizeBookName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/[.\s]+/gu, '')
    .toLocaleLowerCase('it');
}
