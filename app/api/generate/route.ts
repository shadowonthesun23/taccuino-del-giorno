import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Risoluzione errore TypeScript dicendo esplicitamente che si tratta di stringhe sicure
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const apiKey = process.env.GEMINI_API_KEY as string;
const genAI = new GoogleGenerativeAI(apiKey);

export async function GET(request: Request) {
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

  // 3. Il Prompt Premium aggiornato
  const prompt = `Sei un erudito critico letterario, storico dell'arte e teologo, incaricato di curare "Il Taccuino del Giorno" per un pubblico esigente e colto. 
  Il tuo tono deve essere elegante, evocativo, profondamente ispirazionale e impeccabile dal punto di vista grammaticale e storico.
  
  REGOLE FERREE (Pena il fallimento):
  1. AUTENTICITÀ: Non inventare MAI date, eventi, poesie o citazioni. Tutto deve essere storicamente e filologicamente accertato. Se non sei sicuro, scegli un altro autore.
  2. STILE: Scrivi in un italiano ricercato, ma accessibile. Evita la banalità.
  3. MUSICA: Scegli SOLO brani di musica classica, neoclassica, jazz d'autore o ambient ricercata. NIENTE musica pop o commerciale.
  4. POESIA E BIBBIA: Riporta i testi nella loro interezza e con gli "a capo" (newline) corretti per rispettare la metrica originale. Per la Bibbia usa la traduzione CEI 2008.
  
  Genera il materiale per la data di OGGI.
  Restituisci ESATTAMENTE questo schema JSON puro (senza markdown o backtick aggiuntivi):
  {
    "data_odierna": "Es. 20 Aprile",
    "autore_giorno": "Nome di un autore, poeta o pensatore celebre nato o morto oggi",
    "breve_descrizione": "Ritratto letterario e biografico molto curato (3-4 righe)...",
    "citazione": {
      "testo": "Testo della citazione autentica...",
      "autore": "Nome Autore",
      "fonte": "Titolo opera, anno"
    },
    "avvenimenti": [
      "ANNO: Descrizione evento...", 
      "ANNO: Descrizione evento..." // Esattamente 5 eventi storici significativi
    ],
    "parola_giorno": {
      "parola": "Parola rara o desueta della lingua italiana (es. Palingenesi, Ineffabile)",
      "definizione": "...",
      "etimologia": "...",
      "esempio": "Frase d'autore o poetica che la contiene...",
      "nota": "Legame filosofico profondo col tema di oggi"
    },
    "santi": [
      {
        "nome": "Santo Principale",
        "ruolo": "Principale",
        "anni": "Anno nascita - Anno morte",
        "biografia": "Breve biografia storicamente accurata..."
      },
      {
        "nome": "Santo Secondario",
        "ruolo": "Alternativa",
        "anni": "Anno nascita - Anno morte",
        "biografia": "Breve biografia storicamente accurata..."
      }
    ],
    "bibbia": {
      "testo": "Testo completo e impaginato correttamente (Salmi, Proverbi, Qoèlet, Cantico, Siracide o Isaia)...",
      "fonte": "Libro capitolo, versetti",
      "nota": "Riflessione teologica o poetica sul legame col tema"
    },
    "poesia": {
      "testo": "Testo completo e impaginato correttamente della poesia...",
      "autore": "Nome poeta",
      "fonte": "Titolo raccolta, anno",
      "nota": "Critica letteraria sul legame col tema"
    },
    "musica": {
      "brano": "Titolo del brano",
      "autore": "Compositore",
      "genere": "Genere colto",
      "motivo": "Descrizione evocativa del perché questo brano accompagna perfettamente la lettura di oggi",
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
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
}