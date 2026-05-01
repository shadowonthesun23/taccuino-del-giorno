import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const apiKey = process.env.GEMINI_API_KEY as string;
    const genAI = new GoogleGenerativeAI(apiKey);

    const cronHeader = request.headers.get('x-vercel-cron');
    const authHeader = request.headers.get('authorization');
    const isVercelCron = cronHeader === '1';
    const isManualCall = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isVercelCron && !isManualCall) {
      return new Response('Non autorizzato', { status: 401 });
    }

    const oggi = new Date();
    const dataIso = oggi.toISOString().split('T')[0];
    const dataDiOggiStr = oggi.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });

    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Sei un erudito critico letterario e teologo. Cura "Il Taccuino del Giorno" per il ${dataDiOggiStr}.

REGOLE DI CURATELA:
1. AUTORE: Prediligi nati oggi. Morti solo se molto più illustri.
2. DESCRIZIONE AUTORE: **DEVE** iniziare esplicitando il motivo della scelta (es. "Nato in questo giorno nel [anno]..." oppure "Scomparso in questa data nel [anno]..."). Questa informazione è fondamentale per il contesto.
3. AVVENIMENTI: Max 5. Fatti storici, scoperte scientifiche, INVENZIONI e BREVETTI registrati oggi.
4. BIBBIA: Traduzione CEI 2008. Rispetta TABULAZIONI, RIENTRI e "A CAPO" originali (fondamentale per Salmi e Inni). Includi una "nota" che illustri brevemente il senso teologico del passaggio, in forma impersonale o terza persona, senza mai usare la prima persona ("ho scelto", "mi sembra", ecc.).
5. POESIA: Solo in ITALIANO. Se l'autore è straniero, usa la traduzione d'autore ufficiale. Includi una "nota" che illustri il valore tematico e stilistico del testo in relazione al tema del giorno. Scrivi in forma impersonale o terza persona, senza mai usare la prima persona ("ho scelto", "mi sembra", ecc.).
6. MUSICA: Qualsiasi genere (moderna, classica, jazz, alternativa) purché NON commerciale/trap. Deve legarsi al tema del giorno.
7. KEYWORD_ARTE_EN: Una singola parola o breve frase in INGLESE (max 2 parole) che rappresenti il tema concettuale del giorno per una ricerca nel Metropolitan Museum of Art. Deve essere un concetto visivo evocativo (es. "solitude", "divine light", "triumph", "contemplation", "vanity"). NON usare nomi propri di persone.

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

    let result: any = null;
    const maxRetries = 5;
    for (let i = 0; i < maxRetries; i++) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
      }
    }

    let responseText = result.response.text();
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = JSON.parse(responseText);

    const { error } = await supabase.from('contenuti_giornalieri').upsert(
      { ...data, data: dataIso },
      { onConflict: 'data' }
    );
    
    if (error) {
      console.error("Errore Supabase durante upsert:", error);
      throw error;
    }

    return new Response('Successo!');
  } catch (err: any) {
    console.error("Errore fatale in /api/generate:", err);
    return new Response(err.message || "Errore interno del server", { status: 500 });
  }
}
