import { createClient } from '@supabase/supabase-js';
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIResponseError,
  type GenerateContentResult,
  type GenerativeModel,
} from "@google/generative-ai";
import { getEditorAuthorization } from '@/lib/editor-auth';
import { getAuthorAnniversary, getAuthorMetadata } from '@/lib/author-metadata';
import { fetchWikiquoteCandidates } from '@/lib/content-verifier/wikiquote';
import { createPoliteCachedFetch } from '@/lib/content-verifier/rate-limited-fetch';
import {
  formatEditorialQuoteCandidates,
  injectSelectedEditorialQuote,
  retrieveEarlyEditorialQuotes,
  type AuthorSeed,
} from '@/lib/editorial-quote-candidates';
import { finalizeGeneratedBible } from '@/lib/finalize-generated-bible';
import { formatRecentPoemExclusions, isRecentPoemRepeat } from '@/lib/poem-history';

export const maxDuration = 180;

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
// Keep a stable, lighter model available when the primary model is busy or
// returns a transient error. Both models support structured JSON responses.
const FALLBACK_GEMINI_MODEL = 'gemini-3.5-flash-lite';
// Keep each request bounded so retry, repair, and fallback can share the
// global generation budget. The remaining time is computed per attempt.
const GEMINI_ATTEMPT_TIMEOUT_MS = 45_000;
const GEMINI_GENERATION_BUDGET_MS = 165_000;
const GEMINI_BUDGET_RESERVE_MS = 500;
const GEMINI_AUTHOR_SEED_MAX_TIMEOUT_MS = 20_000;
// Keep enough time for the final editorial check and Supabase upsert after a
// successful targeted repair.
const GEMINI_FINALIZATION_RESERVE_MS = 2_000;
const GEMINI_MIN_REQUEST_TIMEOUT_MS = 4_000;
const GEMINI_MIN_FALLBACK_TIMEOUT_MS = 8_000;
const MAX_FULL_GENERATION_ATTEMPTS = 2;
const MAX_WORD_REPAIR_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = 250;
const wikiquoteFetch = createPoliteCachedFetch({ serializedHosts: ['it.wikiquote.org'] });

class GenerationBudgetError extends Error {}

class InvalidGeneratedJsonError extends Error {}

class MissingGeneratedResponseError extends Error {}

class EditorialQualityError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Controllo editoriale fallito: ${issues.join('; ')}`);
    this.issues = issues;
  }
}

type TechnicalErrorKind = 'timeout' | 'network' | 'api' | 'json' | 'response' | 'budget';

function getElapsedGenerationMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

function getRemainingGenerationMs(startedAt: number): number {
  return Math.max(0, GEMINI_GENERATION_BUDGET_MS - getElapsedGenerationMs(startedAt));
}

function getGenerationTiming(startedAt: number): string {
  return `trascorsi ${getElapsedGenerationMs(startedAt)}ms, budget residuo ${getRemainingGenerationMs(startedAt)}ms`;
}

type GeminiAttemptOptions = {
  reserveMs?: number;
  maxTimeoutMs?: number;
  minTimeoutMs?: number;
};

function getGeminiAttemptTimeout(startedAt: number, options: GeminiAttemptOptions = {}): number | null {
  const minTimeoutMs = options.minTimeoutMs ?? GEMINI_MIN_REQUEST_TIMEOUT_MS;
  const availableMs = getRemainingGenerationMs(startedAt)
    - GEMINI_BUDGET_RESERVE_MS
    - (options.reserveMs ?? 0);
  if (availableMs < minTimeoutMs) return null;
  return Math.min(options.maxTimeoutMs ?? GEMINI_ATTEMPT_TIMEOUT_MS, availableMs);
}

function createGenerationBudgetError(operation: string, startedAt: number): GenerationBudgetError {
  return new GenerationBudgetError(`${operation} interrotta: budget Gemini esaurito (${getGenerationTiming(startedAt)}).`);
}

function getSafeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'errore sconosciuto';
  return message
    .replace(/AIza[0-9A-Za-z_-]+/gu, '[redacted]')
    .slice(0, 240);
}

function classifyTechnicalError(error: unknown): TechnicalErrorKind {
  if (error instanceof GenerationBudgetError) return 'budget';
  if (error instanceof InvalidGeneratedJsonError) return 'json';
  if (error instanceof MissingGeneratedResponseError || error instanceof GoogleGenerativeAIResponseError) return 'response';
  if (
    error instanceof GoogleGenerativeAIAbortError
    || (error instanceof Error && /abort|timeout|timed out|oltre \d+(?:\.\d+)?s/iu.test(error.message))
  ) {
    return 'timeout';
  }
  if (
    error instanceof GoogleGenerativeAIFetchError
    || (error instanceof Error && /fetch|network|econn|etimedout|enotfound|socket/iu.test(error.message))
  ) {
    return 'network';
  }
  return 'api';
}

function logTechnicalError(operation: string, modelName: string, error: unknown, startedAt: number) {
  const kind = classifyTechnicalError(error);
  console.warn(
    `Errore tecnico Gemini (${kind}) — ${operation}, modello ${modelName}; ${getGenerationTiming(startedAt)}: ${getSafeErrorMessage(error)}`,
  );
}

function getUserFacingGenerationError(error: unknown): string {
  if (error instanceof EditorialQualityError) {
    return `La generazione non ha superato i controlli editoriali: ${error.issues.join('; ')}`;
  }

  switch (classifyTechnicalError(error)) {
    case 'timeout':
      return 'La generazione ha impiegato troppo tempo. Riprova tra poco.';
    case 'network':
    case 'api':
    case 'response':
      return 'Il servizio di generazione non è momentaneamente disponibile. Riprova tra poco.';
    case 'budget':
      return 'La generazione ha superato il tempo disponibile. Riprova tra poco.';
    case 'json':
      return 'La risposta generata non era valida. Riprova tra poco.';
    default:
      return 'Generazione non riuscita. Riprova tra poco.';
  }
}

async function waitBeforeRetry(startedAt: number) {
  const remainingMs = getRemainingGenerationMs(startedAt);
  const delayMs = Math.min(RETRY_BACKOFF_MS, Math.max(0, remainingMs - GEMINI_BUDGET_RESERVE_MS - GEMINI_MIN_REQUEST_TIMEOUT_MS));
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

async function generateWithBudget(
  model: GenerativeModel,
  modelName: string,
  prompt: string,
  startedAt: number,
  operation: string,
  options: GeminiAttemptOptions = {},
): Promise<GenerateContentResult> {
  const timeoutMs = getGeminiAttemptTimeout(startedAt, options);
  if (timeoutMs === null) {
    throw createGenerationBudgetError(operation, startedAt);
  }

  console.info(`${operation} modello ${modelName}, timeout ${timeoutMs}ms; ${getGenerationTiming(startedAt)}.`);
  const controller = new AbortController();

  try {
    return await model.generateContent(prompt, { timeout: timeoutMs, signal: controller.signal });
  } finally {
    controller.abort();
  }
}

function getRomeDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dataIso = `${values.year}-${values.month}-${values.day}`;
  const dataDiOggiStr = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    day: 'numeric',
    month: 'long',
  }).format(date);

  return { dataIso, dataDiOggiStr };
}

function getDatePartsFromIso(dataIso: string) {
  const [year, month, day] = dataIso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dataDiOggiStr = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    day: 'numeric',
    month: 'long',
  }).format(date);

  return { dataIso, dataDiOggiStr };
}

type GeminiGenerationConfig = {
  responseMimeType: 'application/json';
  thinkingConfig?: {
    thinkingLevel: 'medium';
  };
};

function getGeminiGenerationConfig(modelName: string): GeminiGenerationConfig {
  const config: GeminiGenerationConfig = {
    responseMimeType: 'application/json',
  };

  if (/^gemini-3(?:\.|-)/u.test(modelName)) {
    config.thinkingConfig = { thinkingLevel: 'medium' };
  }

  return config;
}

function uniqueModelCandidates(primaryModel?: string) {
  return [primaryModel?.trim(), DEFAULT_GEMINI_MODEL, FALLBACK_GEMINI_MODEL]
    .filter((model): model is string => Boolean(model))
    .filter((model, index, models) => models.indexOf(model) === index);
}

function stripJsonCodeFences(text: string) {
  return text.replace(/```json/gi, '').replace(/```/g, '').trim();
}

function extractFirstJsonObject(text: string) {
  const start = text.indexOf('{');

  if (start === -1) {
    throw new Error('La risposta del modello non contiene un oggetto JSON.');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = inString;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;

      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  throw new Error('La risposta del modello contiene un JSON incompleto.');
}

type GeneratedDailyData = Record<string, unknown> & {
  tema_guida?: unknown;
  citazione?: Record<string, unknown>;
  parola_giorno?: Record<string, unknown> & { parola?: unknown };
  bibbia?: { testo?: unknown; fonte?: unknown; nota?: unknown };
  poesia?: Record<string, unknown> & { autore?: unknown; fonte?: unknown; testo?: unknown };
};

function parseGeneratedJson(responseText: string): GeneratedDailyData {
  const cleanedText = stripJsonCodeFences(responseText);
  try {
    const jsonText = extractFirstJsonObject(cleanedText);
    const parsed = JSON.parse(jsonText);
    if (!isRecord(parsed)) {
      throw new Error('Il JSON generato non è un oggetto.');
    }
    return parsed as GeneratedDailyData;
  } catch (err) {
    throw new InvalidGeneratedJsonError(
      `Risposta Gemini non parsabile: ${getSafeErrorMessage(err)}`,
    );
  }
}

function hasExactlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  return actualKeys.length === keys.length && actualKeys.every((key, index) => key === [...keys].sort()[index]);
}

function parseGeneratedAuthorSeed(responseText: string): AuthorSeed {
  const parsed = parseGeneratedJson(responseText);
  if (
    !hasExactlyKeys(parsed, ['autore_giorno', 'breve_descrizione'])
    || typeof parsed.autore_giorno !== 'string'
    || typeof parsed.breve_descrizione !== 'string'
    || !parsed.autore_giorno.trim()
    || !parsed.breve_descrizione.trim()
  ) {
    throw new InvalidGeneratedJsonError('La risposta author seed non contiene esattamente lo schema richiesto.');
  }
  return Object.freeze({
    autore_giorno: parsed.autore_giorno.trim(),
    breve_descrizione: parsed.breve_descrizione.trim(),
  });
}

function parseGeneratedEditorialContent(responseText: string): GeneratedDailyData & { selected_quote_id: string } {
  const parsed = parseGeneratedJson(responseText);
  const word = isRecord(parsed.parola_giorno) ? parsed.parola_giorno : null;
  const bible = isRecord(parsed.bibbia) ? parsed.bibbia : null;
  const poem = isRecord(parsed.poesia) ? parsed.poesia : null;
  const music = isRecord(parsed.musica) ? parsed.musica : null;
  const events = Array.isArray(parsed.avvenimenti) ? parsed.avvenimenti : null;
  const saints = Array.isArray(parsed.santi) ? parsed.santi : null;
  const themeWordCount = typeof parsed.tema_guida === 'string'
    ? parsed.tema_guida.trim().split(/\s+/u).filter(Boolean).length
    : 0;
  const valid = hasExactlyKeys(parsed, [
    'selected_quote_id', 'tema_guida', 'avvenimenti', 'parola_giorno', 'santi',
    'bibbia', 'poesia', 'musica', 'keyword_arte_en',
  ])
    && typeof parsed.selected_quote_id === 'string'
    && /^Q\d{2,}$/u.test(parsed.selected_quote_id.trim())
    && typeof parsed.tema_guida === 'string'
    && themeWordCount >= 1 && themeWordCount <= 4
    && typeof parsed.keyword_arte_en === 'string'
    && events !== null && events.every((event) => typeof event === 'string')
    && saints !== null && saints.every((saint) => isRecord(saint)
      && hasExactlyKeys(saint, ['nome', 'ruolo', 'anni', 'biografia'])
      && Object.values(saint).every((value) => typeof value === 'string'))
    && word !== null && hasExactlyKeys(word, ['parola', 'definizione', 'etimologia', 'esempio', 'nota'])
    && typeof word.parola === 'string' && typeof word.definizione === 'string'
    && typeof word.etimologia === 'string' && typeof word.esempio === 'string' && typeof word.nota === 'string'
    && bible !== null && hasExactlyKeys(bible, ['testo', 'fonte', 'nota'])
    && bible.testo === '' && typeof bible.fonte === 'string' && typeof bible.nota === 'string'
    && poem !== null && hasExactlyKeys(poem, ['testo', 'autore', 'fonte', 'nota'])
    && typeof poem.testo === 'string' && typeof poem.autore === 'string'
    && typeof poem.fonte === 'string' && typeof poem.nota === 'string'
    && music !== null && hasExactlyKeys(music, ['brano', 'autore', 'genere', 'motivo', 'chiave_ricerca'])
    && typeof music.brano === 'string' && typeof music.autore === 'string'
    && typeof music.genere === 'string' && typeof music.motivo === 'string' && typeof music.chiave_ricerca === 'string';

  if (!valid) {
    throw new InvalidGeneratedJsonError('La risposta editoriale non contiene esattamente lo schema richiesto.');
  }

  return parsed as GeneratedDailyData & { selected_quote_id: string };
}

function getGeneratedResponseText(result: GenerateContentResult): string {
  const responseText = result.response.text();
  if (!responseText.trim()) {
    throw new MissingGeneratedResponseError('Gemini ha restituito una risposta vuota.');
  }
  return responseText;
}

function parseGeneratedDailyWord(responseText: string): GeneratedDailyWord {
  const parsed = parseGeneratedJson(responseText);
  const fields: Array<keyof GeneratedDailyWord> = ['parola', 'definizione', 'etimologia', 'esempio', 'nota'];

  if (fields.some((field) => typeof parsed[field] !== 'string')) {
    throw new InvalidGeneratedJsonError('La risposta per parola_giorno non contiene tutti i campi testuali richiesti.');
  }

  return {
    parola: parsed.parola as string,
    definizione: parsed.definizione as string,
    etimologia: parsed.etimologia as string,
    esempio: parsed.esempio as string,
    nota: parsed.nota as string,
  };
}

type RecentContentRecord = {
  autore_giorno?: unknown;
  musica: {
    brano?: unknown;
    autore?: unknown;
    genere?: unknown;
  } | null;
  parola_giorno: {
    parola?: unknown;
  } | null;
  poesia: {
    autore?: unknown;
    fonte?: unknown;
    testo?: unknown;
  } | null;
};

const GENERIC_DAILY_WORDS = new Set([
  'amore', 'anima', 'bellezza', 'coraggio', 'coscienza', 'destino', 'fede',
  'giustizia', 'identita', 'liberta', 'memoria', 'responsabilita', 'scelta',
  'speranza', 'tempo', 'verita', 'vita', 'solitudine',
]);

const DAILY_WORD_EDITORIAL_RULES = `PAROLA DEL GIORNO: scegli un lemma italiano preciso, colto ma realmente attestato, capace di aprire una sfumatura inattesa del tema. NON usare il semplice nome astratto del tema e non proporre parole generiche come libertà, responsabilità, amore, speranza, fede, verità, vita, memoria, anima, coscienza, scelta, identità, tempo o solitudine. Privilegia termini lessicalmente interessanti, con un'etimologia verificabile e una definizione comprensibile. Non ripetere parole recenti.`;

type GeneratedDailyWord = {
  parola: string;
  definizione: string;
  etimologia: string;
  esempio: string;
  nota: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeEditorialValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function formatRecentMusicExclusions(records: RecentContentRecord[] | null): string {
  const unique = new Set<string>();

  for (const record of records ?? []) {
    const title = typeof record.musica?.brano === 'string' ? record.musica.brano.trim() : '';
    const artist = typeof record.musica?.autore === 'string' ? record.musica.autore.trim() : '';
    const genre = typeof record.musica?.genere === 'string' ? record.musica.genere.trim() : '';

    if (!title && !artist) {
      continue;
    }

    unique.add([title, artist, genre].filter(Boolean).join(' - '));
  }

  return [...unique].slice(0, 35).map((item) => `- ${item}`).join('\n');
}

function formatRecentWordExclusions(records: RecentContentRecord[] | null): string {
  return [...new Set((records ?? [])
    .map((record) => typeof record.parola_giorno?.parola === 'string' ? record.parola_giorno.parola.trim() : '')
    .filter(Boolean))]
    .slice(0, 60)
    .map((word) => `- ${word}`)
    .join('\n');
}

function validateEditorialQuality(
  data: GeneratedDailyData,
  recentRows: RecentContentRecord[] | null,
  forcedAuthor = '',
): string[] {
  const issues: string[] = [];
  if (forcedAuthor) {
    const generatedAuthor = typeof data.autore_giorno === 'string' ? data.autore_giorno.trim() : '';
    const citationAuthor = typeof data.citazione?.autore === 'string' ? data.citazione.autore.trim() : '';
    if (normalizeEditorialValue(generatedAuthor) !== normalizeEditorialValue(forcedAuthor)) {
      issues.push(`l'autore obbligatorio deve essere "${forcedAuthor}"`);
    }
    if (normalizeEditorialValue(citationAuthor) !== normalizeEditorialValue(forcedAuthor)) {
      issues.push(`la citazione deve appartenere a "${forcedAuthor}"`);
    }
  }
  const word = typeof data?.parola_giorno?.parola === 'string' ? data.parola_giorno.parola.trim() : '';
  const wordKey = normalizeEditorialValue(word);
  const recentWords = new Set((recentRows ?? [])
    .map((record) => typeof record.parola_giorno?.parola === 'string'
      ? normalizeEditorialValue(record.parola_giorno.parola)
      : '')
    .filter(Boolean));

  if (!word) issues.push('la parola del giorno è assente');
  if (wordKey && GENERIC_DAILY_WORDS.has(wordKey)) issues.push(`la parola "${word}" è troppo generica`);
  if (wordKey && recentWords.has(wordKey)) issues.push(`la parola "${word}" è già stata usata di recente`);

  const poet = typeof data?.poesia?.autore === 'string' ? data.poesia.autore.trim() : '';
  if (!poet) issues.push('l’autore della poesia è assente');
  if (isRecentPoemRepeat(data.poesia?.testo, recentRows)) {
    issues.push(`la stessa poesia di "${poet}" è già comparsa negli ultimi 45 giorni`);
  }

  return issues;
}

function getGeneratedAuthor(data: { autore_giorno?: unknown }): string {
  return typeof data.autore_giorno === 'string' ? data.autore_giorno.trim() : '';
}

function getGeneratedAuthorDescription(data: { breve_descrizione?: unknown }): string {
  return typeof data.breve_descrizione === 'string' ? data.breve_descrizione.trim() : '';
}

async function validateAutomaticAuthor(
  data: AuthorSeed,
  dataIso: string,
  dataDiOggiStr: string,
): Promise<string[]> {
  const author = getGeneratedAuthor(data);
  if (!author) return ["l'autore del giorno è assente"];

  const metadata = await getAuthorMetadata(author);
  const anniversary = getAuthorAnniversary(dataIso, metadata);
  if (!anniversary) {
    const availableDates = [metadata.birthDate, metadata.deathDate].filter(Boolean).join(' / ');
    return [
      availableDates
        ? `l'autore del giorno "${author}" non ha una nascita o una morte il ${dataDiOggiStr} (date verificate: ${availableDates})`
        : `la data biografica dell'autore del giorno "${author}" non è verificabile`,
    ];
  }

  const issues: string[] = [];
  const description = getGeneratedAuthorDescription(data);
  const prefix = /^(Nato in questo giorno|Scomparso in questa data)\s+nel\s+(\d{4})\s*[,.:—-]/iu.exec(description);
  const expectedLabel = anniversary.kind === 'birth' ? 'Nato in questo giorno' : 'Scomparso in questa data';
  if (!prefix || prefix[1].toLocaleLowerCase('it-IT') !== expectedLabel.toLocaleLowerCase('it-IT') || prefix[2] !== anniversary.year) {
    issues.push(`la descrizione deve indicare "${expectedLabel} nel ${anniversary.year}" per l'autore verificato`);
  }

  return issues;
}

function isDailyWordIssue(issue: string): boolean {
  return issue === 'la parola del giorno è assente'
    || /^la parola "[^"]*" è (?:troppo generica|già stata usata di recente)$/u.test(issue);
}

function isWordOnlyQualityIssue(issues: string[]): boolean {
  return issues.length > 0 && issues.every(isDailyWordIssue);
}

function buildAuthorSeedPrompt(
  dataIso: string,
  dataDiOggiStr: string,
  forcedAuthor = '',
  rejectedAuthor = '',
): string {
  const authorRule = forcedAuthor
    ? `Usa ESATTAMENTE l'autore imposto: ${forcedAuthor}. Non sostituirlo. È consentita l'eccezione editoriale manuale alla coincidenza con la data. Se nascita o morte coincidono, usa il relativo prefisso biografico; altrimenti scrivi una normale breve descrizione senza inventare ricorrenze.`
    : `Scegli esclusivamente uno scrittore, poeta, filosofo o figura culturale legata alla parola scritta la cui nascita o morte cada esattamente il ${dataDiOggiStr}. Preferisci la nascita; usa la morte solo per una figura significativamente più importante. Evita musicisti e compositori quando esiste una figura letteraria valida. Non scegliere in base a un tema: il tema non esiste ancora.${rejectedAuthor ? ` Escludi esplicitamente ${rejectedAuthor}.` : ''}`;

  return `Scegli soltanto l'autore del giorno per il ${dataDiOggiStr} (${dataIso}).

${authorRule}
Per la generazione automatica, breve_descrizione deve iniziare esattamente con "Nato in questo giorno nel [anno]," oppure "Scomparso in questa data nel [anno]," secondo la ricorrenza verificata.
Non generare tema, citazione, parola, poesia, Bibbia, musica, arte, santi o avvenimenti.

Restituisci esclusivamente un unico oggetto JSON valido con questa forma:
{
  "autore_giorno": "...",
  "breve_descrizione": "..."
}`;
}

async function generateAuthorSeed(
  genAI: GoogleGenerativeAI,
  modelCandidates: string[],
  dataIso: string,
  dataDiOggiStr: string,
  startedAt: number,
  forcedAuthor = '',
  rejectedAuthor = '',
): Promise<AuthorSeed> {
  const modelName = modelCandidates.includes(FALLBACK_GEMINI_MODEL)
    ? FALLBACK_GEMINI_MODEL
    : modelCandidates[0];
  if (!modelName) throw new GenerationBudgetError('Author seed impossibile: nessun modello disponibile.');
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: getGeminiGenerationConfig(modelName),
  });
  const operation = rejectedAuthor ? 'Recovery unico author seed...' : 'Author seed Gemini...';
  const result = await generateWithBudget(
    model,
    modelName,
    buildAuthorSeedPrompt(dataIso, dataDiOggiStr, forcedAuthor, rejectedAuthor),
    startedAt,
    operation,
    { maxTimeoutMs: GEMINI_AUTHOR_SEED_MAX_TIMEOUT_MS, reserveMs: GEMINI_FINALIZATION_RESERVE_MS },
  );
  const authorSeed = parseGeneratedAuthorSeed(getGeneratedResponseText(result));
  if (forcedAuthor && authorSeed.autore_giorno !== forcedAuthor) {
    throw new EditorialQualityError([`l'autore obbligatorio deve essere "${forcedAuthor}"`]);
  }
  if (rejectedAuthor && normalizeEditorialValue(authorSeed.autore_giorno) === normalizeEditorialValue(rejectedAuthor)) {
    throw new EditorialQualityError(['il recovery autore ha riproposto l’autore escluso']);
  }
  if (!forcedAuthor) {
    const issues = await validateAutomaticAuthor(authorSeed, dataIso, dataDiOggiStr);
    if (issues.length > 0) throw new EditorialQualityError(issues);
  }
  return authorSeed;
}

function formatGeneratedContentContext(data: GeneratedDailyData): string {
  return JSON.stringify({
    data_odierna: data.data_odierna,
    autore_giorno: data.autore_giorno,
    tema_guida: data.tema_guida,
    breve_descrizione: data.breve_descrizione,
    citazione: data.citazione,
    avvenimenti: data.avvenimenti,
    santi: data.santi,
    bibbia: data.bibbia,
    poesia: data.poesia,
    musica: data.musica,
  }, null, 2).slice(0, 16_000);
}

function buildDailyWordRepairPrompt(
  candidateData: GeneratedDailyData,
  dataDiOggiStr: string,
  recentWordExclusions: string,
  rejectedWords: string[],
): string {
  const latestRejectedWord = rejectedWords[rejectedWords.length - 1] ?? '';
  const rejectedWordList = rejectedWords.length > 0
    ? rejectedWords.map((word) => `- ${word}`).join('\n')
    : '- Nessuna parola specifica: controlla comunque tutte le regole.';

  return `Il JSON completo per il ${dataDiOggiStr} è già stato generato e ha superato tutti i controlli editoriali tranne quelli relativi alla parola del giorno. Non rigenerare né modificare nessun altro campo.

CONTESTO DEL CONTENUTO APPENA GENERATO:
${formatGeneratedContentContext(candidateData)}

PAROLE RECENTI DA NON RIPETERE:
${recentWordExclusions || '- Nessuna parola storica disponibile.'}

PAROLE RIFIUTATE IN QUESTA GENERAZIONE:
${rejectedWordList}
${latestRejectedWord ? `\nL'ultima parola proposta e rifiutata è "${latestRejectedWord}".` : ''}

REGOLE EDITORIALI:
${DAILY_WORD_EDITORIAL_RULES}
La citazione autentica mostrata nel contesto è immutabile e tema_guida è immutabile: non modificarli. Scegli la nuova parola esclusivamente in funzione di CITAZIONE + TEMA, tenendo conto della parola rifiutata e delle parole recenti escluse. Restituisci esclusivamente un unico piccolo oggetto JSON valido, senza testo prima o dopo, con esattamente questa forma:
{
  "parola": "...",
  "definizione": "...",
  "etimologia": "...",
  "esempio": "...",
  "nota": "..."
}`;
}

async function regenerateDailyWord(
  model: GenerativeModel,
  modelName: string,
  candidateData: GeneratedDailyData,
  dataDiOggiStr: string,
  recentWordExclusions: string,
  recentRows: RecentContentRecord[] | null,
  forcedAuthor: string,
  rejectedWord: string,
  startedAt: number,
): Promise<GeneratedDailyData> {
  const rejectedWords = new Set<string>();
  if (rejectedWord) rejectedWords.add(rejectedWord);

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_WORD_REPAIR_ATTEMPTS; attempt++) {
    try {
      const repairPrompt = buildDailyWordRepairPrompt(
        candidateData,
        dataDiOggiStr,
        recentWordExclusions,
        [...rejectedWords],
      );
      const attemptResult = await generateWithBudget(
        model,
        modelName,
        repairPrompt,
        startedAt,
        'Rigenerazione mirata parola_giorno...',
      );
      const replacementWord = parseGeneratedDailyWord(getGeneratedResponseText(attemptResult));
      const repairedData: GeneratedDailyData = {
        ...candidateData,
        parola_giorno: replacementWord,
      };
      const qualityIssues = validateEditorialQuality(repairedData, recentRows, forcedAuthor);

      if (qualityIssues.length === 0) {
        console.info(`Parola sostitutiva accettata (${replacementWord.parola.trim()}); ${getGenerationTiming(startedAt)}.`);
        return repairedData;
      }

      lastError = new EditorialQualityError(qualityIssues);
      if (replacementWord.parola.trim()) rejectedWords.add(replacementWord.parola.trim());
      console.warn(`Rifiuto editoriale: ${qualityIssues.join('; ')}; ${getGenerationTiming(startedAt)}.`);
      if (!isWordOnlyQualityIssue(qualityIssues)) break;
    } catch (error) {
      lastError = error;
      if (error instanceof GenerationBudgetError) {
        console.warn(`Budget Gemini esaurito durante la rigenerazione mirata; ${getGenerationTiming(startedAt)}.`);
        break;
      }
      if (!(error instanceof EditorialQualityError)) {
        logTechnicalError('rigenerazione mirata parola_giorno', modelName, error, startedAt);
      }
    }

    if (attempt < MAX_WORD_REPAIR_ATTEMPTS) {
      if (getGeminiAttemptTimeout(startedAt) === null) {
        lastError = createGenerationBudgetError('Rigenerazione mirata parola_giorno', startedAt);
        break;
      }
      await waitBeforeRetry(startedAt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Nessuna parola sostitutiva ricevuta dal modello.');
}

async function handleGenerate(request: Request, allowEditorRequest: boolean) {
  const generationStartedAt = Date.now();

  try {
    const requestUrl = new URL(request.url);
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

    if (!isVercelCron) {
      if (!allowEditorRequest) {
        return new Response('Non autorizzato', { status: 401 });
      }

      const editorAuthorization = await getEditorAuthorization(request);
      if (!editorAuthorization.ok) {
        return new Response(editorAuthorization.message, { status: editorAuthorization.status });
      }
    }

    const isManualCall = !isVercelCron;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configurazione Supabase incompleta: verifica NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const apiKey = process.env.GEMINI_API_KEY as string;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY mancante.');
    }
    const genAI = new GoogleGenerativeAI(apiKey);

    const dataParam = requestUrl.searchParams.get('data')?.trim();
    const forcedAuthor = isManualCall ? requestUrl.searchParams.get('autore')?.trim() ?? '' : '';
    const editorialNotes = isManualCall ? requestUrl.searchParams.get('note')?.trim() ?? '' : '';
    const { dataIso, dataDiOggiStr } = dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam)
      ? getDatePartsFromIso(dataParam)
      : getRomeDateParts();

    console.info(`Avvio /api/generate per ${dataIso}; ${getGenerationTiming(generationStartedAt)}.`);

    const { data: recentContentRows, error: recentContentError } = await supabase
      .from('contenuti_giornalieri')
      .select('autore_giorno, musica, parola_giorno, poesia')
      .lt('data', dataIso)
      .order('data', { ascending: false })
      .limit(90);

    if (recentContentError) {
      console.warn('Impossibile leggere lo storico editoriale recente:', recentContentError.message);
    }

    const recentRows = recentContentRows as RecentContentRecord[] | null;
    const recentMusicExclusions = formatRecentMusicExclusions(
      recentRows
    );
    const recentWordExclusions = formatRecentWordExclusions(recentRows);
    const recentPoemExclusions = formatRecentPoemExclusions(recentRows);
    const modelCandidates = uniqueModelCandidates(process.env.GEMINI_MODEL);
    const initialAuthorSeed = await generateAuthorSeed(
      genAI,
      modelCandidates,
      dataIso,
      dataDiOggiStr,
      generationStartedAt,
      forcedAuthor,
    );
    const { authorSeed, quotes: editorialQuotes } = await retrieveEarlyEditorialQuotes(
      initialAuthorSeed,
      {
        forcedAuthor,
        fetchCandidates: (author) => fetchWikiquoteCandidates(author, {
          fetch: wikiquoteFetch,
          timeoutMs: 8_000,
        }),
        recoverAuthor: (rejectedAuthor) => generateAuthorSeed(
          genAI,
          modelCandidates,
          dataIso,
          dataDiOggiStr,
          generationStartedAt,
          '',
          rejectedAuthor,
        ),
      },
    );
    console.info(`Author seed e ${editorialQuotes.length} citazioni Wikiquote pronti prima della generazione editoriale; ${getGenerationTiming(generationStartedAt)}.`);
    const manualDirection = forcedAuthor || editorialNotes
      ? `
DIREZIONE EDITORIALE MANUALE — PRIORITÀ MASSIMA:
${forcedAuthor ? `- L'autore imposto e già validato è: ${forcedAuthor}. Non proporre né restituire un autore diverso.` : ''}
${editorialNotes ? `- Note curatoriale da rispettare: ${editorialNotes}` : ''}
`
      : '';

    const prompt = `Sei un erudito critico letterario e teologo. Cura "Il giorno da custodire" per il ${dataDiOggiStr} (${dataIso}).

${manualDirection}

AUTORE:
${authorSeed.autore_giorno}

DESCRIZIONE:
${authorSeed.breve_descrizione}

CITAZIONI AUTENTICHE DISPONIBILI:
${formatEditorialQuoteCandidates(editorialQuotes)}

REGOLE DI CURATELA:
0. CITAZIONE PRIMA DEL TEMA: non esiste ancora un tema del giorno. Scegli prima la citazione più fertile, significativa e autosufficiente tra quelle autentiche disponibili. DOPO aver scelto la citazione, deduci tema_guida esclusivamente dal suo nucleo concettuale e dall'opera dell'autore. Non scegliere una citazione per adattarla a un tema preconcetto.
1. CITAZIONE IMMUTABILE: restituisci soltanto selected_quote_id. Non riscrivere, tradurre, accorciare, completare o inventare il testo, l'autore o la fonte della citazione. Questi campi appartengono al server.
2. TEMA GUIDA: definisci tema_guida in 1-4 parole dopo la scelta della citazione. Tutti gli altri contenuti devono discendere da questo asse.
3. GERARCHIA: CITAZIONE AUTENTICA → TEMA_GUIDA → PAROLA_GIORNO → POESIA / BIBBIA / MUSICA / ARTE.
4. AVVENIMENTI: Max 5. Fatti storici, scoperte scientifiche, INVENZIONI e BREVETTI registrati oggi.
5. BIBBIA: scegli soltanto fonte/riferimento e nota; "testo" deve essere "" perché il server recupererà la CEI 2008. Scegli un passaggio collegato al tema derivato dalla citazione, non per sola somiglianza lessicale con la parola, attingendo all'intero arco dei libri sapienziali e profetici, non soltanto ai Salmi: Giobbe, Proverbi, Qoelet, Cantico dei Cantici, Sapienza, Siracide, Isaia, Geremia, Baruc, Ezechiele, Daniele e i Dodici Profeti. Varia le fonti nel tempo. La nota deve essere impersonale o in terza persona.
6. ${DAILY_WORD_EDITORIAL_RULES}
7. POESIA: Solo in ITALIANO. Varia radicalmente il repertorio e non ripetere la stessa poesia comparsa negli ultimi 45 giorni. Lo stesso poeta può tornare con un testo diverso: il controllo riguarda il testo della poesia, non il solo nome dell'autore. Esplora anche autori italiani meno prevedibili e diverse epoche, correnti e forme; Montale, Leopardi, Ungaretti e Pascoli non sono scelte predefinite. Se l'autore è straniero, usa una traduzione d'autore ufficiale. Includi una "nota" che illustri il valore tematico e stilistico del testo in relazione al tema del giorno. Scrivi in forma impersonale o terza persona, senza mai usare la prima persona ("ho scelto", "mi sembra", ecc.).
8. MUSICA: Scegli un consiglio musicale non commerciale e non trap, legato al tema del giorno. NON privilegiare la classica: usala solo quando è davvero la scelta più forte. Varia tra jazz, folk, cantautorato non mainstream, elettronica ambient/minimal, post-rock, soul, blues, world music, colonne sonore d'autore, sperimentale accessibile, musica sacra non ovvia, indie non commerciale. Evita brani/artisti troppo ovvi, radiofonici o da classifica. Non ripetere brani o artisti già usati di recente. In "chiave_ricerca" inserisci soltanto artista e titolo esatti, senza genere o commenti aggiuntivi.
9. KEYWORD_ARTE_EN: Una singola parola o breve frase in INGLESE (max 2 parole) che rappresenti il tema concettuale del giorno per una ricerca nel Metropolitan Museum of Art. Deve essere un concetto visivo evocativo (es. "solitude", "divine light", "triumph", "contemplation", "vanity"). NON usare nomi propri di persone.

PAROLE RECENTI DA NON RIPETERE:
${recentWordExclusions || '- Nessuna parola storica disponibile: evita comunque i concetti generici elencati sopra.'}

POESIE RECENTI DA NON RIPETERE:
${recentPoemExclusions || '- Nessuno storico disponibile: scegli comunque un autore non ovvio e varia il canone.'}

CONSIGLI MUSICALI RECENTI DA NON RIPETERE:
${recentMusicExclusions || '- Nessuno storico disponibile: varia comunque genere, epoca e area geografica.'}

COERENZA EDITORIALE: parola_giorno deve illuminare una sfumatura concreta della citazione e del tema_guida; poesia deve dialogare con il loro nucleo concettuale in un estratto significativo di norma 5-10 versi (non un incipit casuale o 2-3 versi introduttivi) e la nota deve riferirsi a ciò che si legge; Bibbia, musica e keyword_arte_en devono seguire lo stesso asse citazione → tema. La scelta avviene prima per selected_quote_id, poi per tema, poi per parola/poesia/Bibbia/musica/arte.

Restituisci esclusivamente un unico oggetto JSON valido. Non aggiungere testo prima o dopo il JSON.

Restituisci questo JSON:
{
  "selected_quote_id": "Qxx",
  "tema_guida": "1-4 parole",
  "avvenimenti": [ "ANNO: Descrizione evento o brevetto..." ],
  "parola_giorno": { "parola": "...", "definizione": "...", "etimologia": "...", "esempio": "...", "nota": "..." },
  "santi": [ { "nome": "...", "ruolo": "...", "anni": "...", "biografia": "..." } ],
  "bibbia": { "testo": "", "fonte": "...", "nota": "..." },
  "poesia": { "testo": "...", "autore": "...", "fonte": "...", "nota": "..." },
  "musica": { "brano": "...", "autore": "...", "genere": "...", "motivo": "...", "chiave_ricerca": "..." },
  "keyword_arte_en": "..."
}`;

    let generatedData: GeneratedDailyData | null = null;
    let lastGenerationError: unknown = null;
    let qualityFeedback = '';
    let fullGenerationAttempts = 0;
    let modelIndex = 0;

    while (
      !generatedData
      && fullGenerationAttempts < MAX_FULL_GENERATION_ATTEMPTS
      && modelIndex < modelCandidates.length
    ) {
      const modelName = modelCandidates[modelIndex];
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: getGeminiGenerationConfig(modelName),
      });

      const fullAttemptNumber = fullGenerationAttempts + 1;
      fullGenerationAttempts = fullAttemptNumber;

      try {
        const attemptResult = await generateWithBudget(
          model,
          modelName,
          `${prompt}${qualityFeedback}`,
          generationStartedAt,
          'Generazione editoriale quote-first Gemini...',
        );
        const editorialData = parseGeneratedEditorialContent(getGeneratedResponseText(attemptResult));
        let acceptedCandidate: GeneratedDailyData;
        try {
          acceptedCandidate = injectSelectedEditorialQuote(
            editorialData,
            authorSeed,
            editorialQuotes,
            dataDiOggiStr,
          );
        } catch (error) {
          throw new InvalidGeneratedJsonError(getSafeErrorMessage(error));
        }
        const qualityIssues = validateEditorialQuality(acceptedCandidate, recentRows, forcedAuthor);

        if (qualityIssues.length > 0) {
          console.warn(`Rifiuto editoriale: ${qualityIssues.join('; ')}; ${getGenerationTiming(generationStartedAt)}.`);

          if (isWordOnlyQualityIssue(qualityIssues)) {
            try {
              generatedData = await regenerateDailyWord(
                model,
                modelName,
                acceptedCandidate,
                dataDiOggiStr,
                recentWordExclusions,
                recentRows,
                forcedAuthor,
                typeof acceptedCandidate.parola_giorno?.parola === 'string'
                  ? acceptedCandidate.parola_giorno.parola.trim()
                  : '',
                generationStartedAt,
              );
            } catch (error) {
              lastGenerationError = error;
              break;
            }
            console.info(`Contenuto completo mantenuto con parola_giorno sostitutiva; ${getGenerationTiming(generationStartedAt)}.`);
            break;
          }

          lastGenerationError = new EditorialQualityError(qualityIssues);
          if (
            fullGenerationAttempts >= MAX_FULL_GENERATION_ATTEMPTS
            || getGeminiAttemptTimeout(generationStartedAt) === null
          ) {
            break;
          }

          qualityFeedback = `\n\nLa proposta precedente è stata rifiutata perché ${qualityIssues.join('; ')}. `
            + 'Rigenera l’intero JSON correggendo rigorosamente questi problemi.';
          await waitBeforeRetry(generationStartedAt);
          continue;
        }

        generatedData = acceptedCandidate;
        console.info(`Contenuto generato con ${modelName} al tentativo completo ${fullAttemptNumber}; ${getGenerationTiming(generationStartedAt)}.`);
      } catch (error) {
        lastGenerationError = error;
        if (error instanceof GenerationBudgetError) {
          console.warn(`Budget Gemini esaurito prima di un nuovo tentativo; ${getGenerationTiming(generationStartedAt)}.`);
          break;
        }

        logTechnicalError('generazione completa', modelName, error, generationStartedAt);
        const fallbackModel = modelCandidates[modelIndex + 1];
        if (
          fullGenerationAttempts >= MAX_FULL_GENERATION_ATTEMPTS
          || !fallbackModel
          || (getGeminiAttemptTimeout(generationStartedAt) ?? 0) < GEMINI_MIN_FALLBACK_TIMEOUT_MS
        ) {
          break;
        }

        modelIndex += 1;
        qualityFeedback = '';
        console.info(`Tentativo fallback Gemini... modello ${fallbackModel}; ${getGenerationTiming(generationStartedAt)}.`);
        await waitBeforeRetry(generationStartedAt);
      }
    }

    if (!generatedData) {
      throw lastGenerationError instanceof Error
        ? lastGenerationError
        : new Error('Nessuna risposta ricevuta dal modello.');
    }

    let finalizedData: GeneratedDailyData;
    try {
      finalizedData = await finalizeGeneratedBible(generatedData, { timeoutMs: 8_000 });
      console.info(`Citazione Wikiquote immutabile e passaggio BibbiaEdu CEI 2008 finalizzati prima dell'upsert; ${getGenerationTiming(generationStartedAt)}.`);
    } catch (error) {
      console.error(
        `Finalizzazione CEI 2008 interrotta prima dell'upsert: ${getSafeErrorMessage(error)}`,
      );
      throw error;
    }

    const { tema_guida: _temaGuida, ...persistableData } = finalizedData;
    const data = {
      ...persistableData,
      // The date is derived from the route timezone, never from model prose.
      data_odierna: dataDiOggiStr,
    };

    const { error } = await supabase.from('contenuti_giornalieri').upsert(
      { ...data, data: dataIso },
      { onConflict: 'data' }
    );

    if (error) {
      console.error("Errore Supabase durante upsert:", error);
      throw error;
    }

    console.info(`Salvataggio Supabase e /api/generate completati; ${getGenerationTiming(generationStartedAt)}.`);

    return new Response('Successo!');
  } catch (err) {
    const message = getUserFacingGenerationError(err);

    console.error(`Errore fatale in /api/generate; ${getGenerationTiming(generationStartedAt)}:`, err);
    return new Response(message, { status: 500 });
  }
}

// Vercel Cron calls this route with GET and the server-only CRON_SECRET.
// Manual generation is POST-only so a top-level cross-site GET cannot mutate content.
export async function GET(request: Request) {
  return handleGenerate(request, false);
}

export async function POST(request: Request) {
  return handleGenerate(request, true);
}
