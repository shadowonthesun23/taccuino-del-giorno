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
      model: "gemini-2.5-flash-preview-09-2025",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Sei un erudito critico letterario, storico dell'arte e teologo, incaricato di curare "Il Taccuino del Giorno" per un pubblico esigente e colto. 
    Il tuo tono deve essere elegante, evocativo, profondamente ispirazionale e impeccabile dal punto di vista grammaticale e storico.
    
    REGOLE FERREE (Pena il fallimento):
    1. AUTENTICITÀ: Non inventare MAI date, eventi, poesie o citazioni. Tutto deve essere storicamente e filologicamente accertato.
    2. STILE: Scrivi in un italiano ricercato, ma accessibile. Evita la banalità.
    3. MUSICA: Scegli SOLO brani di musica classica, neoclassica, jazz d'autore o ambient ricercata.
    4. POESIA E BIBBIA: Riporta i testi nella loro interezza e con gli "a capo" corretti.
    
    Genera il materiale per la data di OGGI, ovvero: ${dataDiOggiStr}.
    Restituisci ESATTAMENTE questo schema JSON puro:
    {
      "data_odierna": "${dataDiOggiStr}",
      "autore_giorno": "Nome autore legato a oggi",
      "breve_descrizione": "Ritratto letterario curato...",
      "citazione": { "testo": "...", "autore": "...", "fonte": "..." },
      "avvenimenti": [ "ANNO: Descrizione...", "ANNO: Descrizione..." ],
      "parola_giorno": { "parola": "...", "definizione": "...", "etimologia": "...", "esempio": "...", "nota": "..." },
      "santi": [ { "nome": "...", "ruolo": "...", "anni": "...", "biografia": "..." } ],
      "bibbia": { "testo": "...", "fonte": "...", "nota": "..." },
      "poesia": { "testo": "...", "autore": "...", "fonte": "...", "nota": "..." },
      "musica": { "brano": "...", "autore": "...", "genere": "...", "motivo": "...", "chiave_ricerca": "..." }
    }`;

    // IMPLEMENTAZIONE RETRY CON BACKOFF ESPONENZIALE
    let result;
    const maxRetries = 5;
    const delays = [1000, 2000, 4000, 8000, 16000];

    for (let i = 0; i < maxRetries; i++) {
      try {
        result = await model.generateContent(prompt);
        break; // Se ha successo, esce dal loop
      } catch (err: any) {
        if (i === maxRetries - 1) throw err; // Se è l'ultimo tentativo, lancia l'errore
        // Aspetta prima di riprovare
        await new Promise(res => setTimeout(res, delays[i]));
      }
    }

    if (!result) throw new Error("Generazione fallita dopo vari tentativi");

    let responseText = result.response.text();
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = JSON.parse(responseText);

    const { error } = await supabase.from('contenuti_giornalieri').upsert({
      ...data,
      data: dataIso
    }, { onConflict: 'data' });

    if (error) return new Response(JSON.stringify(error), { status: 500 });

    return new Response('Generato e salvato con successo!');

  } catch (err: any) {
    console.error("ERRORE:", err);
    return new Response(err.message || 'Errore interno', { status: 500 });
  }
}
