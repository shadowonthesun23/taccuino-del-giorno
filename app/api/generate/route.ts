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

export const maxDuration = 60;

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
// Controlled test: duplicate candidates are deduplicated, so no model fallback is attempted.
const FALLBACK_GEMINI_MODEL = DEFAULT_GEMINI_MODEL;
// Leave a small margin inside Vercel's 60-second function limit.
const GEMINI_ATTEMPT_TIMEOUT_MS = 45_000;
const GEMINI_GENERATION_BUDGET_MS = 52_000;
const GEMINI_BUDGET_RESERVE_MS = 500;
const GEMINI_MIN_REQUEST_TIMEOUT_MS = 4_000;
const GEMINI_MIN_FALLBACK_TIMEOUT_MS = 10_000;
const MAX_FULL_GENERATION_ATTEMPTS = 1;
const MAX_WORD_REPAIR_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = 250;

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

function getGeminiAttemptTimeout(startedAt: number): number | null {
  const availableMs = getRemainingGenerationMs(startedAt) - GEMINI_BUDGET_RESERVE_MS;
  if (availableMs < GEMINI_MIN_REQUEST_TIMEOUT_MS) return null;
  return Math.min(GEMINI_ATTEMPT_TIMEOUT_MS, availableMs);
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
): Promise<GenerateContentResult> {
  const timeoutMs = getGeminiAttemptTimeout(startedAt);
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
  citazione?: { autore?: unknown };
  parola_giorno?: { parola?: unknown };
  poesia?: { autore?: unknown };
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

function formatRecentPoemExclusions(records: RecentContentRecord[] | null): string {
  const unique = new Set<string>();
  for (const record of (records ?? []).slice(0, 45)) {
    const author = typeof record.poesia?.autore === 'string' ? record.poesia.autore.trim() : '';
    const source = typeof record.poesia?.fonte === 'string' ? record.poesia.fonte.trim() : '';
    if (author) unique.add([author, source].filter(Boolean).join(' — '));
  }
  return [...unique].map((poem) => `- ${poem}`).join('\n');
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
  const poetKey = normalizeEditorialValue(poet);
  const recentPoets = new Set((recentRows ?? []).slice(0, 45)
    .map((record) => typeof record.poesia?.autore === 'string'
      ? normalizeEditorialValue(record.poesia.autore)
      : '')
    .filter(Boolean));

  if (!poet) issues.push('l’autore della poesia è assente');
  if (poetKey && recentPoets.has(poetKey)) issues.push(`il poeta "${poet}" è già comparso negli ultimi 45 giorni`);

  return issues;
}

function isDailyWordIssue(issue: string): boolean {
  return issue === 'la parola del giorno è assente'
    || /^la parola "[^"]*" è (?:troppo generica|già stata usata di recente)$/u.test(issue);
}

function isWordOnlyQualityIssue(issues: string[]): boolean {
  return issues.length > 0 && issues.every(isDailyWordIssue);
}

function formatGeneratedContentContext(data: GeneratedDailyData): string {
  return JSON.stringify({
    data_odierna: data.data_odierna,
    autore_giorno: data.autore_giorno,
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
Mantieni la nuova parola coerente con il tema e il contesto appena generati. Restituisci esclusivamente un unico piccolo oggetto JSON valido, senza testo prima o dopo, con esattamente questa forma:
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
    const manualDirection = forcedAuthor || editorialNotes
      ? `
DIREZIONE EDITORIALE MANUALE — PRIORITÀ MASSIMA:
${forcedAuthor ? `- Autore del giorno obbligatorio: ${forcedAuthor}. Usa esattamente questo autore come "autore_giorno".` : ''}
${editorialNotes ? `- Note curatoriale da rispettare: ${editorialNotes}` : ''}
${forcedAuthor ? '- Verifica prima il giorno e il mese di nascita e di morte dell’autore obbligatorio. Se la nascita cade in questa data, la "breve_descrizione" deve iniziare con "Nato in questo giorno nel [anno],"; se la morte cade in questa data, deve iniziare con "Scomparso in questa data nel [anno],". Se nessuna delle due date coincide, inizia direttamente con una normale frase biografica o editoriale, senza prefissi speciali.' : ''}
- La citazione deve appartenere all'autore obbligatorio e deve essere restituita in ITALIANO. Se il testo originale è in un'altra lingua, usa una traduzione italiana pubblicata e indica in "fonte" l'opera o l'edizione; non restituire il testo originale in francese, inglese o altra lingua.
`
      : '';

    const prompt = `Sei un erudito critico letterario e teologo. Cura "Il giorno da custodire" per il ${dataDiOggiStr}.

${manualDirection}

REGOLE DI CURATELA:
1. AUTORE: Scegli prima di tutto scrittori, poeti, filosofi e altre figure culturali legate alla parola scritta. Prediligi nati oggi; morti solo se molto più illustri. Evita musicisti e compositori come autore del giorno quando esiste una figura letteraria adatta alla data.
2. DESCRIZIONE AUTORE: Se la nascita dell'autore cade nel giorno e mese della data curata, la "breve_descrizione" deve iniziare con "Nato in questo giorno nel [anno],"; se la morte coincide, deve iniziare con "Scomparso in questa data nel [anno],". Se nessuna delle due date coincide, inizia direttamente con una normale frase biografica o editoriale, senza prefissi o etichette sulla selezione dell'autore.
3. CITAZIONE: Solo in ITALIANO. Usa una citazione autentica dell'autore con fonte verificabile e riporta una traduzione italiana pubblicata quando l'originale è in un'altra lingua; non lasciare la citazione in lingua originale.
4. AVVENIMENTI: Max 5. Fatti storici, scoperte scientifiche, INVENZIONI e BREVETTI registrati oggi.
5. BIBBIA: usa sempre la traduzione CEI 2008. Scegli un passaggio collegato al tema del giorno attingendo all'intero arco dei libri sapienziali e profetici, non soltanto ai Salmi: Giobbe, Proverbi, Qoelet, Cantico dei Cantici, Sapienza, Siracide, Isaia, Geremia, Baruc, Ezechiele, Daniele e i Dodici Profeti, oltre ai Salmi solo quando sono davvero la scelta migliore. Varia le fonti nel tempo. Indica in "fonte" libro, capitolo e versetti. Rispetta TABULAZIONI, RIENTRI e "A CAPO" originali dove presenti. Includi una "nota" che illustri brevemente il senso teologico del passaggio, in forma impersonale o terza persona, senza mai usare la prima persona ("ho scelto", "mi sembra", ecc.).
6. ${DAILY_WORD_EDITORIAL_RULES}
7. POESIA: Solo in ITALIANO. Varia radicalmente il repertorio e non usare poeti comparsi negli ultimi 45 giorni. Esplora anche autori italiani meno prevedibili e diverse epoche, correnti e forme; Montale, Leopardi, Ungaretti e Pascoli non sono scelte predefinite. Se l'autore è straniero, usa una traduzione d'autore ufficiale. Includi una "nota" che illustri il valore tematico e stilistico del testo in relazione al tema del giorno. Scrivi in forma impersonale o terza persona, senza mai usare la prima persona ("ho scelto", "mi sembra", ecc.).
8. MUSICA: Scegli un consiglio musicale non commerciale e non trap, legato al tema del giorno. NON privilegiare la classica: usala solo quando è davvero la scelta più forte. Varia tra jazz, folk, cantautorato non mainstream, elettronica ambient/minimal, post-rock, soul, blues, world music, colonne sonore d'autore, sperimentale accessibile, musica sacra non ovvia, indie non commerciale. Evita brani/artisti troppo ovvi, radiofonici o da classifica. Non ripetere brani o artisti già usati di recente. In "chiave_ricerca" inserisci soltanto artista e titolo esatti, senza genere o commenti aggiuntivi.
9. KEYWORD_ARTE_EN: Una singola parola o breve frase in INGLESE (max 2 parole) che rappresenti il tema concettuale del giorno per una ricerca nel Metropolitan Museum of Art. Deve essere un concetto visivo evocativo (es. "solitude", "divine light", "triumph", "contemplation", "vanity"). NON usare nomi propri di persone.

PAROLE RECENTI DA NON RIPETERE:
${recentWordExclusions || '- Nessuna parola storica disponibile: evita comunque i concetti generici elencati sopra.'}

POETI E POESIE RECENTI DA NON RIPETERE:
${recentPoemExclusions || '- Nessuno storico disponibile: scegli comunque un autore non ovvio e varia il canone.'}

CONSIGLI MUSICALI RECENTI DA NON RIPETERE:
${recentMusicExclusions || '- Nessuno storico disponibile: varia comunque genere, epoca e area geografica.'}

Restituisci esclusivamente un unico oggetto JSON valido. Non aggiungere testo prima o dopo il JSON.

Restituisci questo JSON:
{
  "data_odierna": "${dataDiOggiStr}",
  "autore_giorno": "...",
  "breve_descrizione": "...",
  "citazione": { "testo": "...", "autore": "...", "fonte": "..." },
  "avvenimenti": [ "ANNO: Descrizione evento o brevetto..." ],
  "parola_giorno": { "parola": "...", "definizione": "...", "etimologia": "...", "esempio": "...", "nota": "..." },
  "santi": [ { "nome": "...", "ruolo": "...", "anni": "...", "biografia": "..." } ],
  "bibbia": { "testo": "Testo CEI 2008 formattato con tabulazioni...", "fonte": "...", "nota": "..." },
  "poesia": { "testo": "...", "autore": "...", "fonte": "...", "nota": "..." },
  "musica": { "brano": "...", "autore": "...", "genere": "...", "motivo": "...", "chiave_ricerca": "..." },
  "keyword_arte_en": "..."
}`;

    let generatedData: GeneratedDailyData | null = null;
    let lastGenerationError: unknown = null;
    let qualityFeedback = '';
    let fullGenerationAttempts = 0;
    let modelIndex = 0;
    const modelCandidates = uniqueModelCandidates(process.env.GEMINI_MODEL);

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
          'Generazione completa Gemini...',
        );
        const candidateData = parseGeneratedJson(getGeneratedResponseText(attemptResult));
        const qualityIssues = validateEditorialQuality(candidateData, recentRows, forcedAuthor);

        if (qualityIssues.length > 0) {
          console.warn(`Rifiuto editoriale: ${qualityIssues.join('; ')}; ${getGenerationTiming(generationStartedAt)}.`);

          if (isWordOnlyQualityIssue(qualityIssues)) {
            try {
              generatedData = await regenerateDailyWord(
                model,
                modelName,
                candidateData,
                dataDiOggiStr,
                recentWordExclusions,
                recentRows,
                forcedAuthor,
                typeof candidateData.parola_giorno?.parola === 'string'
                  ? candidateData.parola_giorno.parola.trim()
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

        generatedData = candidateData;
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

    const data = generatedData;

    const { error } = await supabase.from('contenuti_giornalieri').upsert(
      { ...data, data: dataIso },
      { onConflict: 'data' }
    );

    if (error) {
      console.error("Errore Supabase durante upsert:", error);
      throw error;
    }

    return new Response('Successo!');
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno del server";

    console.error("Errore fatale in /api/generate:", err);
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
