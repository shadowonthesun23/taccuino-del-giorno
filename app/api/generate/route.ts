import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET(request: Request) {
  try {
    console.log("1. Inizializzazione chiavi...");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const apiKey = process.env.GEMINI_API_KEY as string;
    const genAI = new GoogleGenerativeAI(apiKey);

    console.log("2. Controllo autorizzazione...");
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("Errore: Autorizzazione negata. Ricevuto:", authHeader);
      return new Response('Non autorizzato', { status: 401 });
    }

    // Calcoliamo la data esatta di oggi in italiano (es. "20 aprile")
    const dataDiOggi = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });

    console.log(`3. Configurazione Gemini per la data: ${dataDiOggi}...`);
    // Utilizziamo il modello stabile Gemini 2.5 Flash per evitare errori 503 da sovraccarico
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Sei un erudito critico letterario, storico dell'arte e teologo, incaricato di curare "Il Taccuino del Giorno" per un pubblico esigente e colto. 
    Il tuo tono deve essere elegante, evocativo, profondamente ispirazionale e impeccabile dal punto di vista grammaticale e storico.
    
    REGOLE FERREE (Pena il fallimento):
    1. AUTENTICITÀ: Non inventare MAI date, eventi, poesie o citazioni. Tutto deve essere storicamente e filologicamente accertato. Se non sei sicuro, scegli un altro autore.
    2. STILE: Scrivi in un italiano ricercato, ma accessibile. Evita la banalità.
    3. MUSICA: Scegli SOLO brani di musica classica, neoclassica, jazz d'autore o ambient ricercata. NIENTE musica pop o commerciale.
    4. POESIA E BIBBIA: Riporta i testi nella loro interezza e con gli "a capo" (newline) corretti per rispettare la metrica originale. Per la Bibbia usa la traduzione CEI 2008.
    
    Genera il materiale per la data di OGGI, ovvero: ${dataDiOggi}.
    Restituisci ESATTAMENTE questo schema JSON puro (senza markdown o backtick aggiuntivi):
    {
      "data_odierna": "${dataDiOggi}",
      "autore_giorno": "Nome di un autore, poeta o pensatore celebre nato o morto oggi (${dataDiOggi})",
      "breve_descrizione": "Ritratto letterario e biografico molto curato (3-4 righe)...",
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
        "parola": "Parola rara o desueta della lingua italiana",
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
        "testo": "Testo completo e impaginato correttamente...",
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
        "motivo": "Descrizione evocativa...",
        "chiave_ricerca": "Nome autore Titolo brano"
      }
    }`;

    console.log("4. Generazione contenuti con Gemini in corso...");
    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    console.log("5. Risposta ricevuta, pulizia formato JSON...");

    // Evita errori di parsing se Gemini inserisce "```json"
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = JSON.parse(responseText);

    console.log("6. Salvataggio nel database Supabase...");
    const { error } = await supabase.from('contenuti_giornalieri').insert([data]);

    if (error) {
      console.error("ERRORE SUPABASE:", error);
      return new Response(JSON.stringify(error), { status: 500 });
    }

    console.log("7. Successo! Tutto completato.");
    return new Response('Generato e salvato con successo!');

  } catch (err: any) {
    console.error("ERRORE GRAVE DURANTE L'ESECUZIONE:", err);
    return new Response(err.message || 'Errore interno', { status: 500 });
  }
}