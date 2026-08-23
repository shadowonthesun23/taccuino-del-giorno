'use client';
import React, { useState, useEffect } from 'react';
import { BookOpen, Quote, CalendarDays, History, BookA, Heart, Library, Feather, Loader2, Music, PlayCircle } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/oggi')
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || 'Contenuto non ancora disponibile per oggi.');
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-stone-500 mx-auto mb-4" />
          <p className="text-stone-500 font-serif italic">Sfogliando il taccuino...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <BookOpen className="w-12 h-12 text-stone-400 mx-auto mb-4" />
          <h2 className="text-xl font-serif text-stone-700 mb-2">Taccuino non ancora pronto</h2>
          <p className="text-stone-500 text-sm">{error || 'Il contenuto di oggi non è ancora stato generato. Riprova dopo le 00:05.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* TITOLO E INTENTO DELL'APP */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-stone-800 mb-2">Il Taccuino del Giorno</h1>
          <p className="text-stone-500 text-sm italic">Un rifugio quotidiano per la mente. Una raccolta curata di spunti letterari, storici e spirituali per ispirare le tue riflessioni e accompagnare le tue giornate.</p>
        </div>

        {/* HEADER E BIOGRAFIA */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4 text-stone-400" />
            <span className="text-sm text-stone-400 uppercase tracking-widest font-sans">{data.data_odierna}</span>
          </div>
          <h2 className="text-3xl font-serif font-bold text-stone-800 mb-3">{data.autore_giorno}</h2>
          <p className="text-stone-600 leading-relaxed">{data.breve_descrizione}</p>
        </div>

        {/* CITAZIONE */}
        <div className="bg-stone-800 text-stone-100 rounded-2xl shadow-sm p-6 mb-6">
          <Quote className="w-6 h-6 text-stone-400 mb-3" />
          <p className="text-lg font-serif italic leading-relaxed mb-4">&ldquo;{data.citazione.testo}&rdquo;</p>
          <p className="text-stone-400 text-sm"><strong className="text-stone-200">{data.citazione.autore}</strong>, {data.citazione.fonte}</p>
        </div>

        <hr className="border-stone-200 my-6" />

        {/* AVVENIMENTI STORICI */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-stone-500" />
            <h3 className="text-lg font-serif font-semibold text-stone-700">Avvenimenti del giorno</h3>
          </div>
          <ul className="space-y-3">
            {[...data.avvenimenti]
              .sort((a: string, b: string) => {
                const annoA = parseInt(a.split(':')[0], 10);
                const annoB = parseInt(b.split(':')[0], 10);
                return annoA - annoB;
              })
              .map((evento: string, index: number) => {
                const parti = evento.split(':');
                const anno = parti[0].trim();
                const testo = parti.slice(1).join(':').trim();
                return (
                  <li key={index} className="flex gap-3">
                    <span className="text-stone-400 font-mono text-sm font-bold min-w-[3rem]">{anno}</span>
                    <span className="text-stone-600 text-sm">{testo}</span>
                  </li>
                );
              })}
          </ul>
        </div>

        <hr className="border-stone-200 my-6" />

        {/* PAROLA E SANTO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <BookA className="w-5 h-5 text-stone-500" />
              <h3 className="text-lg font-serif font-semibold text-stone-700">Parola del giorno</h3>
            </div>
            <h4 className="text-xl font-serif font-bold text-stone-800 mb-2">{data.parola_giorno.parola}</h4>
            <p className="text-stone-600 text-sm mb-1"><strong>Definizione:</strong> {data.parola_giorno.definizione}</p>
            <p className="text-stone-500 text-sm mb-2"><strong>Etimologia:</strong> {data.parola_giorno.etimologia}</p>
            <p className="text-stone-500 text-sm italic">&ldquo;{data.parola_giorno.esempio}&rdquo;</p>
            {data.parola_giorno.nota && <p className="text-stone-400 text-xs mt-2">{data.parola_giorno.nota}</p>}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 text-stone-500" />
              <h3 className="text-lg font-serif font-semibold text-stone-700">Santi del giorno</h3>
            </div>
            {data.santi.map((santo: any, index: number) => (
              <div key={index} className={index > 0 ? 'mt-4 pt-4 border-t border-stone-100' : ''}>
                <p className="font-serif font-semibold text-stone-800">{santo.nome} <span className="text-stone-400 text-xs font-sans">({santo.ruolo})</span></p>
                <p className="text-stone-400 text-xs mb-1">{santo.anni}</p>
                <p className="text-stone-500 text-sm">{santo.biografia}</p>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-stone-200 my-6" />

        {/* PASSAGGIO BIBLICO */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-amber-700" />
            <h3 className="text-lg font-serif font-semibold text-amber-800">Passaggio Biblico</h3>
          </div>
          <p className="whitespace-pre-wrap font-serif text-base leading-loose text-stone-700 italic mb-3">{data.bibbia.testo}</p>
          <p className="text-amber-700 text-sm font-semibold">{data.bibbia.fonte}</p>
          {data.bibbia.nota && <p className="text-stone-500 text-sm mt-2">{data.bibbia.nota}</p>}
        </div>

        <hr className="border-stone-200 my-6" />

        {/* POESIA */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Feather className="w-5 h-5 text-stone-500" />
            <h3 className="text-lg font-serif font-semibold text-stone-700">Poesia del giorno</h3>
          </div>
          <p className="whitespace-pre-wrap font-serif text-base leading-loose text-stone-700 italic mb-4">{data.poesia.testo}</p>
          <p className="text-stone-500 text-sm"><strong>{data.poesia.autore}</strong>, {data.poesia.fonte}</p>
          {data.poesia.nota && <p className="text-stone-400 text-sm mt-2">{data.poesia.nota}</p>}
        </div>

        {/* CONSIGLIO MUSICALE */}
        <div className="bg-stone-800 text-stone-100 rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Music className="w-5 h-5 text-stone-400" />
            <h3 className="text-lg font-serif font-semibold">Ascolto del giorno</h3>
          </div>
          <p className="text-xl font-serif italic mb-1">&ldquo;{data.musica.brano}&rdquo;</p>
          <p className="text-stone-400 text-sm mb-1">di {data.musica.autore} <span className="text-stone-500">({data.musica.genere})</span></p>
          <p className="text-stone-300 text-sm mb-4">{data.musica.motivo}</p>
          <div className="flex gap-3 flex-wrap">
            <a
              href={`https://open.spotify.com/search/${encodeURIComponent(data.musica.chiave_ricerca)}/tracks`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded-full transition-colors"
            >
              <PlayCircle className="w-4 h-4" /> Ascolta su Spotify
            </a>
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(data.musica.chiave_ricerca)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm px-4 py-2 rounded-full transition-colors"
            >
              <PlayCircle className="w-4 h-4" /> Cerca su YouTube
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
