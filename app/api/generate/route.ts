import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function GET(request) {
    // 1. Sicurezza: controlla che Vercel usi la password corretta
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Non autorizzato', { status: 401 });
    }

    // 2. Impostazione Gemini per rispondere solo in formato JSON
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    // 3. Il Prompt definitivo aggiornato
    const prompt = `Sei l'assistente per il taccuino A5 dell'utente. Fornisci il materiale per la data odierna con tono positivo e ispirazionale. Usa solo informazioni autentiche e verificate. 
  Restituisci ESATTAMENTE questo schema JSON puro:
  {
    "data_odierna": "Es. 20 Aprile",
    "autore_giorno": "Nome Autore",
    "breve_descrizione": "Descrizione concisa (2-3 righe)...",
    "citazione": {
      "testo": "Testo della citazione autentica...",
      "autore": "Nome Autore",
      "fonte": "Titolo opera, anno"
    },
    "avvenimenti": [
      "ANNO: Descrizione evento...", 
      "ANNO: Descrizione evento..." 
    ],
    "parola_giorno": {
      "parola": "Parola rara italiana",
      "definizione": "...",
      "etimologia": "...",
      "esempio": "...",
      "nota": "Legame col tema"
    },
    "santi": [
      {
        "nome": "Santo 1",
        "ruolo": "Principale",
        "anni": "Anno nascita - Anno morte",
        "biografia": "Breve biografia..."
      },
      {
        "nome": "Santo 2",
        "ruolo": "Alternativa",
        "anni": "Anno nascita - Anno morte",
        "biografia": "Breve biografia..."
      }
    ],
    "bibbia": {
      "testo": "Testo completo e impaginato correttamente...",
      "fonte": "Libro capitolo, versetti",
      "nota": "Legame col tema"
    },
    "poesia": {
      "testo": "Testo completo e impaginato correttamente della poesia...",
      "autore": "Nome poeta",
      "fonte": "Titolo raccolta, anno",
      "nota": "Legame col tema"
    },
    "musica": {
      "brano": "Titolo del brano musicale",
      "autore": "Compositore/Musicista",
      "genere": "Genere (es. Classica, Ambient... no pop)",
      "motivo": "Perché questo brano si lega all'autore/tema di oggi in 2 righe",
      "chiave_ricerca": "Nome autore Titolo brano"
    }
  }`;

    try {
        // Generazione
        const result = await model.generateContent(prompt);
        const data = JSON.parse(result.response.text());

        // 4. Salvataggio su Supabase
        const { error } = await supabase.from('contenuti_giornalieri').insert([data]);

        if (error) return new Response(JSON.stringify(error), { status: 500 });
        return new Response('Generato e salvato con successo!');
    } catch (err) {
        return new Response(err.message, { status: 500 });
    }
}

