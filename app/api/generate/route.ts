import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const apiKey = process.env.GEMINI_API_KEY as string;
    const genAI = new GoogleGenerativeAI(apiKey);

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Non autorizzato', { status: 401 });
    }

    const oggi = new Date();
    const dataIso = oggi.toISOString().split('T')[0];
    const dataDiOggiStr = oggi.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Sei un erudito critico letterario, storico dell'arte e teologo, incaricato di curare "Il Taccuino del Giorno". 
    Il tuo tono deve essere elegante, evocativo e impeccabile.
    
    REGOLE DI SELEZIONE E FORMATTAZIONE:
    1. SCELTA AUTORE: Prediligi personaggi NATI in data ${dataDiOggiStr}. Scegli un personaggio morto oggi solo se la sua fama o importanza storica è nettamente superiore ai nati oggi.
    2. AVVENIMENTI: Inserisci un massimo di 5 avvenimenti di rilievo accaduti il giorno ${dataDiOggiStr}. Includi prioritariamente fatti storici, scoperte scientifiche, grandi opere dell'ingegno, invenzioni o brevetti registrati in questa data.
    3. TESTI SACRI (CEI 2008): Tutto in ITALIANO. Usa esclusivamente la traduzione Bibbia CEI 2008. Per Salmi, Inni o cantici, RISPETTA RIGOROSAMENTE la tabulazione originale (rientri e spazi bianchi) e gli "a capo" ufficiali.
    4. POESIA: Se l'autore è straniero, usa la traduzione d'autore ufficiale in italiano. Mai testi in inglese. Rispetta metrica e spazi originali.
    5. MUSICA: Scegli brani di QUALSIASI GENERE (classica, jazz, sacra, moderna, contemporanea, cantautorato, alternativa). DIVIETO ASSOLUTO per musica commerciale/pop mainstream o trap. Il brano deve avere un LEGAME TEMATICO profondo con l'autore o il tema del giorno.
    6. AUTENTICITÀ: Non inventare nulla. Tutto deve essere storicamente e filologicamente accertato.
    
    Genera per la data: ${dataDiOggiStr}.
    Restituisci questo JSON:
    {
      "data_odierna": "${dataDiOggiStr}",
      "autore_giorno": "Nome autore scelto",
      "breve_descrizione": "Ritratto letterario curato (3-4 righe)...",
      "citazione": { "testo": "...", "autore": "...", "fonte": "..." },
      "avvenimenti": [ "ANNO: Descrizione evento o brevetto...", "ANNO: Descrizione..." ],
      "parola_giorno": { "parola": "...", "definizione": "...", "etimologia": "...", "esempio": "...", "nota": "..." },
      "santi": [ { "nome": "...", "ruolo": "...", "anni": "...", "biografia": "..." } ],
      "bibbia": { "testo": "Testo CEI 2008 formattato correttamente...", "fonte": "Libro Capitolo, Versetti", "nota": "Riflessione breve" },
      "poesia": { "testo": "...", "autore": "...", "fonte": "...", "nota": "..." },
      "musica": { "brano": "...", "autore": "...", "genere": "...", "motivo": "Legame col giorno...", "chiave_ricerca": "..." }
    }`;

    let result: any = null;
    const maxRetries = 5;
    const delays = [2000, 4000, 8000, 16000, 32000];

    for (let i = 0; i < maxRetries; i++) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (err: any) {
        if (i === maxRetries - 1) throw err;
        await new Promise(res => setTimeout(res, delays[i]));
      }
    }

    if (!result || !result.response) throw new Error("Risposta AI non valida.");

    let responseText = result.response.text();
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = JSON.parse(responseText);

    const { error } = await supabase.from('contenuti_giornalieri').upsert({
      ...data,
      data: dataIso
    }, { onConflict: 'data' });

    if (error) throw error;

    return new Response('Generato e salvato con successo!');
  } catch (err: any) {
    console.error(err);
    return new Response(err.message || 'Errore interno', { status: 500 });
  }
}
