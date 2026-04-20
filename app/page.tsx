import { createClient } from '@supabase/supabase-js';
import { BookOpen, Quote, CalendarDays, History, BookA, Heart, Library, Feather, Music, PlayCircle } from 'lucide-react';

export const revalidate = 3600; // Aggiorna la cache della pagina ogni ora

export default async function Home() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return <div className="p-8 text-center font-serif text-stone-500">Configura le variabili d'ambiente di Supabase.</div>;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Prende l'ultimo elemento generato dal database
  const { data: post } = await supabase
    .from('contenuti_giornalieri')
    .select('*')
    .order('creato_il', { ascending: false })
    .limit(1)
    .single();

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f8f4] font-serif text-stone-500">
        <p>In attesa della prima generazione notturna...</p>
      </div>
    );
  }

  // Il layout definitivo
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

          <header className="border-b border-stone-300 pb-8 mb-8 text-center">
            <h2 className="text-sm uppercase tracking-[0.3em] text-stone-500 mb-4 flex justify-center items-center gap-2 font-sans">
              <CalendarDays size={16} /> {post.data_odierna}
            </h2>
            <h1 className="text-4xl md:text-5xl font-normal text-stone-900 mb-4 font-serif">
              {post.autore_giorno}
            </h1>
            <p className="text-stone-600 text-base sm:text-lg italic max-w-xl mx-auto leading-relaxed mb-8">
              {post.breve_descrizione}
            </p>
          </header>

          <div className="space-y-10 sm:space-y-12">

            <section className="relative px-4 py-6 sm:px-6 sm:py-8 bg-[#f4f2eb] border-l-4 border-stone-400">
              <Quote className="absolute top-3 left-3 sm:top-4 sm:left-4 text-stone-300 opacity-50" size={36} />
              <div className="relative z-10">
                <p className="text-lg sm:text-xl italic leading-relaxed text-stone-700 mb-4">
                  "{post.citazione.testo}"
                </p>
                <footer className="text-sm text-stone-500 font-sans mb-2 sm:mb-6">
                  <strong className="text-stone-800 font-serif">{post.citazione.autore}</strong>, {post.citazione.fonte}
                </footer>
              </div>
            </section>

            <hr className="border-stone-200 w-1/2 sm:w-1/3 mx-auto" />

            <section>
              <h3 className="flex items-center gap-2 text-xl font-bold mb-6 text-stone-800">
                <History className="text-stone-400" size={24} />
                Avvenimenti del giorno
              </h3>
              <ul className="space-y-4">
                {[...post.avvenimenti]
                  .sort((a: string, b: string) => parseInt(a.split(":")[0], 10) - parseInt(b.split(":")[0], 10))
                  .map((evento: string, index: number) => {
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

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-white p-5 sm:p-6 border border-stone-200 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-bold mb-4 text-stone-800">
                  <BookA className="text-stone-400" size={20} /> Parola del giorno
                </h3>
                <h4 className="text-xl sm:text-2xl italic mb-2 text-stone-900">{post.parola_giorno.parola}</h4>
                <p className="text-sm text-stone-600 mb-2"><strong>Definizione:</strong> {post.parola_giorno.definizione}</p>
                <p className="text-sm text-stone-600 mb-2"><strong>Etimologia:</strong> {post.parola_giorno.etimologia}</p>
                <p className="text-sm italic text-stone-500 border-l-2 border-stone-300 pl-3 my-3">"{post.parola_giorno.esempio}"</p>
                <p className="text-xs text-stone-400 mt-2">{post.parola_giorno.nota}</p>
              </div>

              <div className="bg-white p-5 sm:p-6 border border-stone-200 shadow-sm flex flex-col justify-center">
                <h3 className="flex items-center gap-2 text-lg font-bold mb-4 text-stone-800">
                  <Heart className="text-stone-400" size={20} /> Santi del giorno
                </h3>
                <div className="space-y-4">
                  {post.santi.map((santo: any, index: number) => (
                    <div key={index}>
                      <p className="text-stone-800 font-bold leading-snug">
                        {santo.nome} <span className="text-stone-500 text-sm font-normal">({santo.ruolo})</span>
                      </p>
                      <p className="text-xs text-stone-400 italic mt-0.5">{santo.anni}</p>
                      <p className="text-sm text-stone-600 leading-relaxed mt-1">{santo.biografia}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <hr className="border-stone-200 w-1/2 sm:w-1/3 mx-auto" />

            <section>
              <h3 className="flex items-center gap-2 text-xl font-bold mb-6 text-stone-800">
                <Library className="text-stone-400" size={24} /> Passaggio Biblico
              </h3>
              <div className="pl-4 sm:pl-6 border-l-2 border-stone-300 mb-4 overflow-x-auto">
                <p className="whitespace-pre-wrap font-serif text-base sm:text-lg leading-loose text-stone-700 italic min-w-max pr-4">
                  {post.bibbia.testo}
                </p>
              </div>
              <p className="text-sm text-stone-500 font-sans uppercase tracking-wider mb-2">{post.bibbia.fonte}</p>
              <p className="text-sm text-stone-400 italic">{post.bibbia.nota}</p>
            </section>

            <hr className="border-stone-200 w-1/2 sm:w-1/3 mx-auto" />

            <section className="pb-4 sm:pb-8">
              <h3 className="flex items-center gap-2 text-xl font-bold mb-6 text-stone-800">
                <Feather className="text-stone-400" size={24} /> Poesia del giorno
              </h3>
              <div className="pl-4 sm:pl-6 mb-6 overflow-x-auto">
                <p className="whitespace-pre-wrap font-serif text-base sm:text-lg leading-loose text-stone-800 min-w-max pr-4">
                  {post.poesia.testo}
                </p>
              </div>
              <footer className="text-sm text-stone-500 font-sans pl-4 sm:pl-6">
                <strong className="text-stone-800 font-serif">{post.poesia.autore}</strong>, {post.poesia.fonte}
                <p className="text-sm text-stone-400 italic mt-2">{post.poesia.nota}</p>
              </footer>
            </section>

            <section className="bg-[#f4f2eb] p-5 sm:p-8 border border-stone-200 shadow-sm relative mt-4">
              <Music className="absolute top-4 right-4 sm:top-6 sm:right-6 text-stone-300 opacity-40" size={48} />
              <h3 className="flex items-center gap-2 text-xl font-bold mb-4 text-stone-800 relative z-10">
                <PlayCircle className="text-stone-400" size={24} /> Ascolto del giorno
              </h3>
              <div className="relative z-10">
                <p className="text-xl sm:text-2xl font-serif italic text-stone-900 mb-1 pr-8">
                  "{post.musica.brano}"
                </p>
                <p className="text-stone-600 font-bold mb-3 uppercase tracking-wider text-sm">
                  di {post.musica.autore} <span className="font-normal text-stone-400 ml-1 lowercase">({post.musica.genere})</span>
                </p>
                <p className="text-stone-700 leading-relaxed mb-6 italic text-sm border-l-2 border-stone-400 pl-3">
                  {post.musica.motivo}
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 font-sans text-sm mt-6">
                  <a
                    href={`https://open.spotify.com/search/${encodeURIComponent(post.musica.chiave_ricerca)}/tracks`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-stone-800 text-white px-5 py-3 sm:py-2.5 rounded hover:bg-stone-700 transition-colors shadow-sm w-full sm:w-auto text-base sm:text-sm"
                  >Ascolta su Spotify</a>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(post.musica.chiave_ricerca)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-white text-stone-800 border border-stone-300 px-5 py-3 sm:py-2.5 rounded hover:bg-stone-50 transition-colors shadow-sm w-full sm:w-auto text-base sm:text-sm"
                  >Cerca su YouTube</a>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}