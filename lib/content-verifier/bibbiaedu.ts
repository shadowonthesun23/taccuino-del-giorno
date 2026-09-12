import { load } from 'cheerio';
import { fetchText } from './http.ts';
import { matchConservativeExcerpt } from './matcher.ts';
import type {
  BibleVerificationInput,
  VerificationResult,
  VerifierOptions,
} from './types.ts';

const SOURCE_NAME = 'BibbiaEdu — CEI 2008';
const ORIGIN = 'https://www.bibbiaedu.it';
const METHOD = 'bibbiaedu-cei2008-structured-verse-dom';

interface BibleBookRoute {
  testament: 'at' | 'nt';
  slug: string;
}

interface ParsedBibleReference extends BibleBookRoute {
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

const BOOKS = new Map<string, BibleBookRoute>();

function addBooks(testament: BibleBookRoute['testament'], entries: Array<[string, string, ...string[]]>) {
  for (const [slug, ...names] of entries) {
    for (const name of [slug, ...names]) BOOKS.set(normalizeBookName(name), { testament, slug });
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

export function parseCei2008Reference(reference: string): ParsedBibleReference | null {
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
  reference: ParsedBibleReference,
): { ok: true; text: string } | { ok: false; reason: string } {
  const $ = load(html);
  const body = $('body');
  if (!body.hasClass('content-CEI2008')
    || !body.hasClass(`book-${reference.slug}`)
    || !body.hasClass(`chapter-${reference.chapter}`)) {
    return { ok: false, reason: 'source_identity_or_version_mismatch' };
  }

  const verses = new Map<number, string>();
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
    if (text) verses.set(number, text);
  });

  const selected: string[] = [];
  for (let number = reference.verseStart; number <= reference.verseEnd; number += 1) {
    const verse = verses.get(number);
    if (!verse) return { ok: false, reason: `missing_structured_verse_${number}` };
    selected.push(verse);
  }
  return { ok: true, text: selected.join('\n') };
}

export async function verifyBibleWithBibbiaEdu(
  input: BibleVerificationInput,
  options: VerifierOptions = {},
): Promise<VerificationResult> {
  const parsed = parseCei2008Reference(input.reference);
  if (!parsed || !input.text.trim()) {
    return result('unverified', ORIGIN, null, 'missing_text_or_unsupported_reference');
  }

  const sourceUrl = new URL(
    `/CEI2008/${parsed.testament}/${parsed.slug}/${parsed.chapter}/`,
    ORIGIN,
  ).toString();
  try {
    const html = await fetchText(
      new URL(sourceUrl),
      options.fetch ?? fetch,
      options.timeoutMs ?? 10_000,
    );
    const extracted = extractCei2008Verses(html, parsed);
    if (!extracted.ok) {
      return result('error', sourceUrl, null, `source_structure_error: ${extracted.reason}`);
    }
    const match = matchConservativeExcerpt(input.text, extracted.text);
    return result(
      match.matched ? 'verified' : 'unverified',
      sourceUrl,
      match.matchedText,
      match.matched ? 'exact_conservative_match' : 'passage_not_found_in_selected_verses',
    );
  } catch (error) {
    return result(
      'error',
      sourceUrl,
      null,
      `http_or_source_error: ${error instanceof Error ? error.message : 'errore sconosciuto'}`,
    );
  }
}

function normalizeBookName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/[.\s]+/gu, '')
    .toLocaleLowerCase('it');
}

function result(
  status: VerificationResult['status'],
  sourceUrl: string,
  matchedText: string | null,
  reason: string,
): VerificationResult {
  return { status, sourceName: SOURCE_NAME, sourceUrl, matchedText, verificationMethod: METHOD, reason };
}
