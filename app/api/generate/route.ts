import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const apiKey = process.env.GEMINI_API_KEY as string;
    const genAI = new GoogleGenerativeAI(apiKey);

    // Autenticazione: accetta sia il cron Vercel (x-vercel-cron) sia chiamate manuali con Bearer token
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

    // Modello: gemini-2.5-flash-preview-04-17
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-04-17",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Sei un erudito critico letterario e teologo. Cura "Il Taccuino del Giorno" per il ${dataDiOggiStr}.

REGOLE DI CURATELA:
1. AUTORE: Prediligi nati oggi. Morti solo se molto più illustri.
2. AVVENIMENTI: Max 5. Fatti storici, scoperte scientifiche, INVENZIONI e BREVETTI registrati oggi.
3. BIBBIA: Traduzione CEI 2008. Rispetta TABULAZIONI, RIENTRI e "A CAPO" originali (fondamentale per Salmi e Inni).
4. POESIA: Solo in ITALIANO. Se l'autore è straniero, usa la traduzione d'autore ufficiale.
5. MUSICA: Qualsiasi genere (moderna, classica, jazz, alternativa) purché NON commerciale/trap. Deve legarsi al tema del giorno.

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
  "musica": { "brano": "...", "autore": "...", "genere": "...", "motivo": "...", "chiave_ricerca": "..." }
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
    if (error) throw error;

    return new Response('Successo!');
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
}
