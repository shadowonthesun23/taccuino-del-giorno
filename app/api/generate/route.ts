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

function parseGeneratedJson(responseText: string) {
  const cleanedText = stripJsonCodeFences(responseText);
  const jsonText = extractFirstJsonObject(cleanedText);

  try {
    return JSON.parse(jsonText);
  } catch (err) {
    console.error('Risposta Gemini non parsabile:', cleanedText.slice(0, 1000));
    throw err;
  }
}

type RecentMusicRecord = {
  musica: {
    brano?: unknown;
    autore?: unknown;
    genere?: unknown;
  } | null;
};

function formatRecentMusicExclusions(records: RecentMusicRecord[] | null): string {
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

    const { data: recentMusicRows, error: recentMusicError } = await supabase
      .from('contenuti_giornalieri')
      .select('musica')
      .lt('data', dataIso)
      .not('musica', 'is', null)
      .order('data', { ascending: false })
      .limit(90);

    if (recentMusicError) {
      console.warn('Impossibile leggere lo storico musicale recente:', recentMusicError.message);
    }

    const recentMusicExclusions = formatRecentMusicExclusions(
      recentMusicRows as RecentMusicRecord[] | null
    );

    const prompt = `Sei un erudito critico letterario e teologo. Cura "Il giorno da custodire" per il ${dataDiOggiStr}.

REGOLE DI CURATELA:
1. AUTORE: Prediligi nati oggi. Morti solo se molto più illustri.
2. DESCRIZIONE AUTORE: **DEVE** iniziare esplicitando il motivo della scelta (es. "Nato in questo giorno nel [anno]..." oppure "Scomparso in questa data nel [anno]..."). Questa informazione è fondamentale per il contesto.
3. AVVENIMENTI: Max 5. Fatti storici, scoperte scientifiche, INVENZIONI e BREVETTI registrati oggi.
4. BIBBIA: usa sempre la traduzione CEI 2008. Scegli un passaggio collegato al tema del giorno attingendo all'intero arco dei libri sapienziali e profetici, non soltanto ai Salmi: Giobbe, Proverbi, Qoelet, Cantico dei Cantici, Sapienza, Siracide, Isaia, Geremia, Baruc, Ezechiele, Daniele e i Dodici Profeti, oltre ai Salmi solo quando sono davvero la scelta migliore. Varia le fonti nel tempo. Indica in "fonte" libro, capitolo e versetti. Rispetta TABULAZIONI, RIENTRI e "A CAPO" originali dove presenti. Includi una "nota" che illustri brevemente il senso teologico del passaggio, in forma impersonale o terza persona, senza mai usare la prima persona ("ho scelto", "mi sembra", ecc.).
5. POESIA: Solo in ITALIANO. Se l'autore è straniero, usa la traduzione d'autore ufficiale. Includi una "nota" che illustri il valore tematico e stilistico del testo in relazione al tema del giorno. Scrivi in forma impersonale o terza persona, senza mai usare la prima persona ("ho scelto", "mi sembra", ecc.).
6. MUSICA: Scegli un consiglio musicale non commerciale e non trap, legato al tema del giorno. NON privilegiare la classica: usala solo quando è davvero la scelta più forte. Varia tra jazz, folk, cantautorato non mainstream, elettronica ambient/minimal, post-rock, soul, blues, world music, colonne sonore d'autore, sperimentale accessibile, musica sacra non ovvia, indie non commerciale. Evita brani/artisti troppo ovvi, radiofonici o da classifica. Non ripetere brani o artisti già usati di recente.
7. KEYWORD_ARTE_EN: Una singola parola o breve frase in INGLESE (max 2 parole) che rappresenti il tema concettuale del giorno per una ricerca nel Metropolitan Museum of Art. Deve essere un concetto visivo evocativo (es. "solitude", "divine light", "triumph", "contemplation", "vanity"). NON usare nomi propri di persone.

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
    let lastGenerationError: unknown = null;
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
          result = await withTimeout(
            model.generateContent(prompt),
            GEMINI_ATTEMPT_TIMEOUT_MS,
            `Generazione Gemini (${modelName})`
          );
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

    const responseText = result.response.text();
    const data = parseGeneratedJson(responseText);

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
