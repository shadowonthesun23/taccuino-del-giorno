import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, type GenerateContentResult } from "@google/generative-ai";

export const maxDuration = 60;

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ATTEMPT_TIMEOUT_MS = 45_000;

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

function uniqueModelCandidates(primaryModel?: string) {
  return [primaryModel?.trim(), DEFAULT_GEMINI_MODEL, 'gemini-flash-latest']
    .filter((model): model is string => Boolean(model))
    .filter((model, index, models) => models.indexOf(model) === index);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} oltre ${timeoutMs / 1000}s`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
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
  parola_giorno?: { parola?: unknown };
  poesia?: { autore?: unknown };
};

function parseGeneratedJson(responseText: string): GeneratedDailyData {
  const cleanedText = stripJsonCodeFences(responseText);
  const jsonText = extractFirstJsonObject(cleanedText);

  try {
    return JSON.parse(jsonText) as GeneratedDailyData;
  } catch (err) {
    console.error('Risposta Gemini non parsabile:', cleanedText.slice(0, 1000));
    throw err;
  }
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

function validateEditorialQuality(data: GeneratedDailyData, recentRows: RecentContentRecord[] | null): string[] {
  const issues: string[] = [];
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

export async function GET(request: Request) {
  try {
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

    const cronHeader = request.headers.get('x-vercel-cron');
    const authHeader = request.headers.get('authorization');
    const isVercelCron = cronHeader === '1';
    const isManualCall = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isVercelCron && !isManualCall) {
      return new Response('Non autorizzato', { status: 401 });
    }

    const { dataIso, dataDiOggiStr } = getRomeDateParts();

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

    const prompt = `Sei un erudito critico letterario e teologo. Cura "Il giorno da custodire" per il ${dataDiOggiStr}.

REGOLE DI CURATELA:
1. AUTORE: Prediligi nati oggi. Morti solo se molto più illustri.
2. DESCRIZIONE AUTORE: **DEVE** iniziare esplicitando il motivo della scelta (es. "Nato in questo giorno nel [anno]..." oppure "Scomparso in questa data nel [anno]..."). Questa informazione è fondamentale per il contesto.
3. AVVENIMENTI: Max 5. Fatti storici, scoperte scientifiche, INVENZIONI e BREVETTI registrati oggi.
4. BIBBIA: usa sempre la traduzione CEI 2008. Scegli un passaggio collegato al tema del giorno attingendo all'intero arco dei libri sapienziali e profetici, non soltanto ai Salmi: Giobbe, Proverbi, Qoelet, Cantico dei Cantici, Sapienza, Siracide, Isaia, Geremia, Baruc, Ezechiele, Daniele e i Dodici Profeti, oltre ai Salmi solo quando sono davvero la scelta migliore. Varia le fonti nel tempo. Indica in "fonte" libro, capitolo e versetti. Rispetta TABULAZIONI, RIENTRI e "A CAPO" originali dove presenti. Includi una "nota" che illustri brevemente il senso teologico del passaggio, in forma impersonale o terza persona, senza mai usare la prima persona ("ho scelto", "mi sembra", ecc.).
5. PAROLA DEL GIORNO: scegli un lemma italiano preciso, colto ma realmente attestato, capace di aprire una sfumatura inattesa del tema. NON usare il semplice nome astratto del tema e non proporre parole generiche come libertà, responsabilità, amore, speranza, fede, verità, vita, memoria, anima, coscienza, scelta, identità, tempo o solitudine. Privilegia termini lessicalmente interessanti, con un'etimologia verificabile e una definizione comprensibile. Non ripetere parole recenti.
6. POESIA: Solo in ITALIANO. Varia radicalmente il repertorio e non usare poeti comparsi negli ultimi 45 giorni. Esplora anche autori italiani meno prevedibili e diverse epoche, correnti e forme; Montale, Leopardi, Ungaretti e Pascoli non sono scelte predefinite. Se l'autore è straniero, usa una traduzione d'autore ufficiale. Includi una "nota" che illustri il valore tematico e stilistico del testo in relazione al tema del giorno. Scrivi in forma impersonale o terza persona, senza mai usare la prima persona ("ho scelto", "mi sembra", ecc.).
7. MUSICA: Scegli un consiglio musicale non commerciale e non trap, legato al tema del giorno. NON privilegiare la classica: usala solo quando è davvero la scelta più forte. Varia tra jazz, folk, cantautorato non mainstream, elettronica ambient/minimal, post-rock, soul, blues, world music, colonne sonore d'autore, sperimentale accessibile, musica sacra non ovvia, indie non commerciale. Evita brani/artisti troppo ovvi, radiofonici o da classifica. Non ripetere brani o artisti già usati di recente. In "chiave_ricerca" inserisci soltanto artista e titolo esatti, senza genere o commenti aggiuntivi.
8. KEYWORD_ARTE_EN: Una singola parola o breve frase in INGLESE (max 2 parole) che rappresenti il tema concettuale del giorno per una ricerca nel Metropolitan Museum of Art. Deve essere un concetto visivo evocativo (es. "solitude", "divine light", "triumph", "contemplation", "vanity"). NON usare nomi propri di persone.

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

    let result: GenerateContentResult | null = null;
    let generatedData: GeneratedDailyData | null = null;
    let lastGenerationError: unknown = null;
    let qualityFeedback = '';
    const modelCandidates = uniqueModelCandidates(process.env.GEMINI_MODEL);

    for (const modelName of modelCandidates) {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const maxRetries = 2;
      for (let i = 0; i < maxRetries; i++) {
        try {
          const attemptResult = await withTimeout(
            model.generateContent(`${prompt}${qualityFeedback}`),
            GEMINI_ATTEMPT_TIMEOUT_MS,
            `Generazione Gemini (${modelName})`
          );
          const candidateData = parseGeneratedJson(attemptResult.response.text());
          const qualityIssues = validateEditorialQuality(candidateData, recentRows);
          if (qualityIssues.length > 0) {
            qualityFeedback = `\n\nLa proposta precedente è stata rifiutata perché ${qualityIssues.join('; ')}. `
              + 'Rigenera l’intero JSON correggendo rigorosamente questi problemi.';
            throw new Error(`Controllo editoriale fallito: ${qualityIssues.join('; ')}`);
          }
          result = attemptResult;
          generatedData = candidateData;
          console.info(`Contenuto generato con ${modelName} al tentativo ${i + 1}.`);
          break;
        } catch (err) {
          lastGenerationError = err;
          console.warn(`Tentativo Gemini fallito (${modelName}, ${i + 1}/${maxRetries}):`, err);
          if (i < maxRetries - 1) {
            await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
          }
        }
      }

      if (result) {
        break;
      }
    }

    if (!result) {
      throw lastGenerationError instanceof Error
        ? lastGenerationError
        : new Error('Nessuna risposta ricevuta dal modello.');
    }

    const data = generatedData ?? parseGeneratedJson(result.response.text());

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
