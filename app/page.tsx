import React, { useState } from 'react';
import { BookOpen, Quote, CalendarDays, History, BookA, Heart, Library, Feather, Loader2, Music, PlayCircle } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(false);

  // Dati di esempio
  const [data, setData] = useState({
    data_odierna: "20 Aprile",
    autore_giorno: "Odilon Redon",
    breve_descrizione: "Odilon Redon (1840-1916) è stato un celebre pittore e incisore francese, nato il 20 aprile a Bordeaux. Maestro del simbolismo, le sue opere esplorano il mondo dell'inconscio, dei sogni e dell'immaginazione, con un uso magistrale del pastello e del colore, trasformando il visibile in una finestra sull'invisibile.",
    citazione: {
      testo: "Credo di aver obbedito, durante tutta la mia vita, alla necessità segreta del mio essere. Ho fatto arte, come si respira, senza rendermene conto, naturalmente. Tutto il mio sforzo, tutta la mia pena, consistevano solo nell'essere sincero. L'arte è uno stato dell'animo.",
      autore: "Odilon Redon",
      fonte: "A soi-même, 1922"
    },
    avvenimenti: [
      "1841: Viene pubblicato 'I delitti della Rue Morgue' di Edgar Allan Poe; inventando di fatto il genere letterario del 'giallo'.",
      "1972: La missione Apollo 16, con gli astronauti John Young e Charles Duke, tocca la superficie lunare.",
      "1657: Gli ebrei residenti a Nuova Amsterdam ottengono la libertà di religione, un passo fondamentale verso la tolleranza.",
      "1912: Si spegne lo scrittore irlandese Bram Stoker, autore del celebre romanzo Dracula.",
      "1775: Inizia l'assedio di Boston da parte delle milizie coloniali durante la Rivoluzione Americana."
    ],
    parola_giorno: {
      parola: "Palingenesi",
      definizione: "Rinascita, rinnovamento profondo, ritorno alla vita o a una nuova condizione esistenziale.",
      etimologia: "Dal greco palin (di nuovo) e génesis (nascita).",
      esempio: "Ogni primavera rappresenta una piccola palingenesi della natura, che si risveglia dal rigido letargo invernale.",
      nota: "Si lega al tema artistico di Redon, poiché l'arte è spesso un processo di rinascita."
    },
    santi: [
      {
        nome: "San Teodoro Trichinas",
        ruolo: "Principale",
        anni: "n. ignota - m. 400 ca.",
        biografia: "Monaco, è conosciuto per il suo rigore ascetico e per il 'pelo' (trichinas) che indossava come cilicio."
      },
      {
        nome: "Sant'Agnese di Montepulciano",
        ruolo: "Alternativa",
        anni: "1268 - 1317",
        biografia: "Santa domenicana celebre per la sua profonda mistica e visione del divino."
      }
    ],
    bibbia: {
      testo: `Figlio, se ti presenti per servire il Signore,
preparati alla tentazione.
Abbi un cuore retto e sii costante,
non ti smarrire nel tempo della prova.
Sta' unito a lui senza voltargli le spalle,
perché tu sia esaltato nei tuoi ultimi giorni.
Accetta quanto ti capita,
sii paziente nelle vicende penose,
perché l'oro si prova col fuoco,
e gli uomini ben accetti nel crogiuolo del dolore.
Affidati a lui ed egli ti aiuterà,
segui la via diritta e spera in lui.`,
      fonte: "Siracide 2, 1-6",
      nota: "Questo brano invita alla resilienza e alla costanza, valori che risuonano con la necessità di 'essere sinceri' nell'arte."
    },
    poesia: {
      testo: `Meriggiare pallido e assorto
presso un rovente muro d'orto,
ascoltare tra i pruni e gli sterpi
schiocchi di merli, frusci di serpi.

Nelle crepe del suolo o su veccia
spiar le file di rosse formiche
ch'ora si rompono ed ora s'intrecciano
a sommo di minuscole biche.

Osservare tra frondi il palpitare
lontano di scaglie di mare
mentre si levano tremuli scricchi
di cicale dai calvi picchi.

E andando nel sole che abbaglia
sentire con triste meraviglia
com'è tutta la vita e il suo travaglio
in questo seguitare una muraglia
che ha in cima cocci aguzzi di bottiglia.`,
      autore: "Eugenio Montale",
      fonte: "Ossi di seppia, 1925",
      nota: "La poesia, con le sue immagini lucide e ferme, riflette sulla fatica del vivere, in contrasto con la vitalità cercata dall'artista."
    },
    musica: {
      brano: "Trois Gymnopédies: No. 1",
      autore: "Erik Satie",
      genere: "Classica / Impressionismo",
      motivo: "Le atmosfere oniriche e sospese di Satie sono il perfetto equivalente sonoro dell'arte simbolista di Redon. Questo brano invita a quell'introspezione e a quel 'viaggio nell'invisibile' descritti dall'autore.",
      chiave_ricerca: "Erik Satie Trois Gymnopédies 1"
    }
  });

  const simulaGenerazione = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert("Nella realtà, questo avverrebbe automaticamente ogni notte a mezzanotte!");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#f9f8f4] text-stone-800 font-serif selection:bg-stone-200 py-8 px-4 sm:px-8">

      {/* TITOLO E INTENTO DELL'APP */}
      <div className="max-w-3xl mx-auto text-center mb-10 px-4">
        <h1 className="text-2xl md:text-3xl font-serif text-stone-800 tracking-[0.2em] uppercase mb-3 flex justify-center items-center gap-3">
          <BookOpen className="text-stone-400" size={28} />
          Il Taccuino del Giorno
        </h1>
        <p className="text-stone-500 text-sm md:text-base max-w-lg mx-auto leading-relaxed font-sans italic">
          Un rifugio quotidiano per la mente. Una raccolta curata di spunti letterari, storici e spirituali per ispirare le tue riflessioni e accompagnare le tue giornate.
        </p>
      </div>

      <main className="max-w-3xl mx-auto bg-[#fdfbf7] shadow-xl border border-stone-200 relative">
        <div className="absolute left-0 top-0 bottom-0 w-8 border-r-2 border-double border-stone-200 bg-[#f4f2eb] hidden sm:block"></div>

        <div className="p-5 sm:pl-16 sm:pr-12 py-8 sm:py-12">

          {/* HEADER E BIOGRAFIA */}
          <header className="border-b border-stone-300 pb-8 mb-8 text-center">
            <h2 className="text-sm uppercase tracking-[0.3em] text-stone-500 mb-4 flex justify-center items-center gap-2 font-sans">
              <CalendarDays size={16} /> {data.data_odierna}
            </h2>
            <h1 className="text-4xl md:text-5xl font-normal text-stone-900 mb-4 font-serif">
              {data.autore_giorno}
            </h1>
            <p className="text-stone-600 text-base sm:text-lg italic max-w-xl mx-auto leading-relaxed mb-8">
              {data.breve_descrizione}
            </p>
          </header>

          <div className="space-y-10 sm:space-y-12">

            {/* CITAZIONE */}
            <section className="relative px-4 py-6 sm:px-6 sm:py-8 bg-[#f4f2eb] border-l-4 border-stone-400">
              <Quote className="absolute top-3 left-3 sm:top-4 sm:left-4 text-stone-300 opacity-50" size={36} />
              <div className="relative z-10">
                <p className="text-lg sm:text-xl italic leading-relaxed text-stone-700 mb-4">
                  "{data.citazione.testo}"
                </p>
                <footer className="text-sm text-stone-500 font-sans mb-2 sm:mb-6">
                  <strong className="text-stone-800 font-serif">{data.citazione.autore}</strong>, {data.citazione.fonte}
                </footer>
              </div>
            </section>

            <hr className="border-stone-200 w-1/2 sm:w-1/3 mx-auto" />

            {/* AVVENIMENTI STORICI */}
            <section>
              <h3 className="flex items-center gap-2 text-xl font-bold mb-6 text-stone-800">
                <History className="text-stone-400" size={24} />
                Avvenimenti del giorno
              </h3>
              <ul className="space-y-4">
                {[...data.avvenimenti]
                  .sort((a, b) => {
                    // Estraiamo l'anno dalla stringa per poterli ordinare matematicamente
                    const annoA = parseInt(a.split(":")[0], 10);
                    const annoB = parseInt(b.split(":")[0], 10);
                    return annoA - annoB;
                  })
                  .map((evento, index) => {
                    // Separiamo in modo sicuro l'anno dal resto del testo
                    const parti = evento.split(":");
                    const anno = parti[0].trim();
                    const testo = parti.slice(1).join(":").trim();

                    return (
                      <li key={index} className="flex gap-3 sm:gap-4 leading-relaxed text-sm sm:text-base">
                        <span className="font-bold text-stone-500 w-10 sm:w-12 shrink-0">{anno}</span>
                        <span className="text-stone-700">{testo}</span>
                      </li>
                    );
                  })}
              </ul>
            </section>

            <hr className="border-stone-200 w-1/2 sm:w-1/3 mx-auto" />

            {/* PAROLA E SANTO */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-white p-5 sm:p-6 border border-stone-200 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-bold mb-4 text-stone-800">
                  <BookA className="text-stone-400" size={20} />
                  Parola del giorno
                </h3>
                <h4 className="text-xl sm:text-2xl italic mb-2 text-stone-900">{data.parola_giorno.parola}</h4>
                <p className="text-sm text-stone-600 mb-2"><strong>Definizione:</strong> {data.parola_giorno.definizione}</p>
                <p className="text-sm text-stone-600 mb-2"><strong>Etimologia:</strong> {data.parola_giorno.etimologia}</p>
                <p className="text-sm italic text-stone-500 border-l-2 border-stone-300 pl-3 my-3">"{data.parola_giorno.esempio}"</p>
                <p className="text-xs text-stone-400 mt-2">{data.parola_giorno.nota}</p>
              </div>

              <div className="bg-white p-5 sm:p-6 border border-stone-200 shadow-sm flex flex-col justify-center">
                <h3 className="flex items-center gap-2 text-lg font-bold mb-4 text-stone-800">
                  <Heart className="text-stone-400" size={20} />
                  Santi del giorno
                </h3>
                <div className="space-y-4">
                  {data.santi.map((santo, index) => (
                    <div key={index}>
                      <p className="text-stone-800 font-bold leading-snug">
                        {santo.nome} <span className="text-stone-500 text-sm font-normal">({santo.ruolo})</span>
                      </p>
                      <p className="text-xs text-stone-400 italic mt-0.5">
                        {santo.anni}
                      </p>
                      <p className="text-sm text-stone-600 leading-relaxed mt-1">
                        {santo.biografia}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <hr className="border-stone-200 w-1/2 sm:w-1/3 mx-auto" />

            {/* PASSAGGIO BIBLICO */}
            <section>
              <h3 className="flex items-center gap-2 text-xl font-bold mb-6 text-stone-800">
                <Library className="text-stone-400" size={24} />
                Passaggio Biblico
              </h3>
              <div className="pl-4 sm:pl-6 border-l-2 border-stone-300 mb-4 overflow-x-auto">
                <p className="whitespace-pre-wrap font-serif text-base sm:text-lg leading-loose sm:leading-loose text-stone-700 italic min-w-max pr-4">
                  {data.bibbia.testo}
                </p>
              </div>
              <p className="text-sm text-stone-500 font-sans uppercase tracking-wider mb-2">{data.bibbia.fonte}</p>
              <p className="text-sm text-stone-400 italic">{data.bibbia.nota}</p>
            </section>

            <hr className="border-stone-200 w-1/2 sm:w-1/3 mx-auto" />

            {/* POESIA */}
            <section className="pb-4 sm:pb-8">
              <h3 className="flex items-center gap-2 text-xl font-bold mb-6 text-stone-800">
                <Feather className="text-stone-400" size={24} />
                Poesia del giorno
              </h3>
              <div className="pl-4 sm:pl-6 mb-6 overflow-x-auto">
                <p className="whitespace-pre-wrap font-serif text-base sm:text-lg leading-loose sm:leading-loose text-stone-800 min-w-max pr-4">
                  {data.poesia.testo}
                </p>
              </div>
              <footer className="text-sm text-stone-500 font-sans pl-4 sm:pl-6">
                <strong className="text-stone-800 font-serif">{data.poesia.autore}</strong>, {data.poesia.fonte}
                <p className="text-sm text-stone-400 italic mt-2">{data.poesia.nota}</p>
              </footer>
            </section>

            {/* CONSIGLIO MUSICALE */}
            <section className="bg-[#f4f2eb] p-5 sm:p-8 border border-stone-200 shadow-sm relative mt-4">
              <Music className="absolute top-4 right-4 sm:top-6 sm:right-6 text-stone-300 opacity-40" size={48} />
              <h3 className="flex items-center gap-2 text-xl font-bold mb-4 text-stone-800 relative z-10">
                <PlayCircle className="text-stone-400" size={24} />
                Ascolto del giorno
              </h3>

              <div className="relative z-10">
                <p className="text-xl sm:text-2xl font-serif italic text-stone-900 mb-1 pr-8">
                  "{data.musica.brano}"
                </p>
                <p className="text-stone-600 font-bold mb-3 uppercase tracking-wider text-sm">
                  di {data.musica.autore} <span className="font-normal text-stone-400 ml-1 lowercase">({data.musica.genere})</span>
                </p>
                <p className="text-stone-700 leading-relaxed mb-6 italic text-sm border-l-2 border-stone-400 pl-3">
                  {data.musica.motivo}
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 font-sans text-sm mt-6">
                  <a
                    href={`https://open.spotify.com/search/${encodeURIComponent(data.musica.chiave_ricerca)}/tracks`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-stone-800 text-white px-5 py-3 sm:py-2.5 rounded hover:bg-stone-700 transition-colors shadow-sm w-full sm:w-auto text-base sm:text-sm"
                  >
                    Ascolta su Spotify
                  </a>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(data.musica.chiave_ricerca)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-white text-stone-800 border border-stone-300 px-5 py-3 sm:py-2.5 rounded hover:bg-stone-50 transition-colors shadow-sm w-full sm:w-auto text-base sm:text-sm"
                  >
                    Cerca su YouTube
                  </a>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}