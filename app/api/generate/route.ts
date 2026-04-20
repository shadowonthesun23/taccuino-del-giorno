import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const apiKey = process.env.GEMINI_API_KEY as string;
    const genAI = new GoogleGenerativeAI(apiKey);

    // Controllo sicurezza Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Non autorizzato', { status: 401 });
    }

    // Calcolo data dinamica
    const oggi = new Date();
    const dataIso = oggi.toISOString().split('T')[0];
    const dataDiOggiStr = oggi.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });

    // Modello STABILE certificato: Gemini 2.0 Flash
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Sei un erudito critico letterario, storico dell'arte e teologo, incaricato di curare "Il Taccuino del Giorno". 
    Il tuo tono deve essere elegante, evocativo e impeccabile.
    
    REGOLE FERREE:
    1. AUTENTICITÀ: Non inventare MAI nulla. Tutto deve essere storicamente accertato.
    2. STILE: Scrivi in un italiano ricercato (erudito).
    3. MUSICA: Scegli SOLO brani di musica classica, jazz o ambient colta.
    4. TESTI: Riporta poesia e Bibbia integralmente con i corretti "a capo".
    
    Genera per la data: ${dataDiOggiStr}.
    Restituisci questo JSON:
    {
      "data_odierna": "${dataDiOggiStr}",
      "autore_giorno": "Autore legato a oggi",
      "breve_descrizione": "Ritratto letterario (3-4 righe)...",
      "citazione": { "testo": "...", "autore": "...", "fonte": "..." },
      "avvenimenti": [ "ANNO: Descrizione...", "ANNO: Descrizione..." ],
      "parola_giorno": { "parola": "...", "definizione": "...", "etimologia": "...", "esempio": "...", "nota": "..." },
      "santi": [ { "nome": "...", "ruolo": "...", "anni": "...", "biografia": "..." } ],
      "bibbia": { "testo": "...", "fonte": "...", "nota": "..." },
      "poesia": { "testo": "...", "autore": "...", "fonte": "...", "nota": "..." },
      "musica": { "brano": "...", "autore": "...", "genere": "...", "motivo": "...", "chiave_ricerca": "..." }
    }`;

    // Sistema di Retry per evitare sovraccarichi - Inizializzato a null per TypeScript
    let result: any = null;
    const maxRetries = 5;
    const delays = [1000, 2000, 4000, 8000, 16000];

    for (let i = 0; i < maxRetries; i++) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise(res => setTimeout(res, delays[i]));
      }
    }

    // Controllo di sicurezza per TypeScript: se arriviamo qui e result è ancora null, lanciamo errore
    if (!result || !result.response) {
      throw new Error("Il modello AI non ha restituito una risposta valida.");
    }

    let responseText = result.response.text();
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = JSON.parse(responseText);

    // Salvataggio con UPSERT (sovrascrive se la data esiste già)
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