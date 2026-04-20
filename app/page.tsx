import { createClient } from '@supabase/supabase-js';
import { BookOpen, Quote, CalendarDays, History, BookA, Heart, Library, Feather, Music, PlayCircle } from 'lucide-react';

export const revalidate = 0;

export default async function Home() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const { data: post } = await supabase
    .from('contenuti_giornalieri')
    .select('*')
    .order('creato_il', { ascending: false })
    .limit(1)
    .single();

  if (!post) return <div className="p-20 text-center font-serif text-stone-400 italic">In attesa della prima generazione...</div>;

  return (
    <div className="min-h-screen bg-[#f9f8f4] text-stone-800 font-serif py-8 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto text-center mb-10">
        <h1 className="text-2xl font-serif tracking-[0.2em] uppercase mb-3 flex justify-center items-center gap-3">
          <BookOpen className="text-stone-400" size={28} /> Il Taccuino del Giorno
        </h1>
        <p className="text-stone-500 text-sm italic font-sans">Un rifugio quotidiano per la mente.</p>
      </div>

      <main className="max-w-3xl mx-auto bg-[#fdfbf7] shadow-xl border border-stone-200 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-8 border-r-2 border-double border-stone-200 bg-[#f4f2eb] hidden sm:block"></div>

        <div className="p-5 sm:pl-16 sm:pr-12 py-8 sm:py-12">
          <header className="border-b border-stone-300 pb-8 mb-8 text-center">
            <h2 className="text-sm uppercase tracking-[0.3em] text-stone-500 mb-4 flex justify-center items-center gap-2 font-sans">
              <CalendarDays size={16} /> {post.data_odierna}
            </h2>
            <h1 className="text-4xl text-stone-900 mb-4">{post.autore_giorno}</h1>
            <p className="text-stone-600 italic leading-relaxed">{post.breve_descrizione}</p>
          </header>

          <section className="bg-[#f4f2eb] p-6 border-l-4 border-stone-400 mb-10">
            <Quote className="text-stone-300 mb-4" size={32} />
            <p className="text-lg italic text-stone-700 mb-4 break-words">"{post.citazione.testo}"</p>
            <footer className="text-sm font-sans"><strong>{post.citazione.autore}</strong>, {post.citazione.fonte}</footer>
          </section>

          <div className="space-y-12">
            <section>
              <h3 className="flex items-center gap-2 text-xl font-bold mb-6 text-stone-800"><History className="text-stone-400" /> Avvenimenti e Invenzioni</h3>
              <ul className="space-y-3">
                {post.avvenimenti.map((ev: string, i: number) => {
                  const [anno, ...testo] = ev.split(":");
                  return (
                    <li key={i} className="text-sm sm:text-base flex gap-4">
                      <span className="font-bold text-stone-500 w-12 shrink-0">{anno}</span>
                      <span className="text-stone-700 break-words">{testo.join(":")}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 border border-stone-200 shadow-sm">
                <h3 className="flex items-center gap-2 font-bold mb-4 text-stone-800"><BookA size={20} /> Parola del Giorno</h3>
                <h4 className="text-xl sm:text-2xl italic mb-2 text-stone-900">{post.parola_giorno.parola}</h4>
                <p className="text-sm text-stone-600 break-words">{post.parola_giorno.definizione}</p>
                <p className="text-xs text-stone-400 mt-4 italic break-words">"{post.parola_giorno.esempio}"</p>
              </div>
              <div className="bg-white p-6 border border-stone-200 shadow-sm">
                <h3 className="flex items-center gap-2 font-bold mb-4 text-stone-800"><Heart size={20} /> Santi del Giorno</h3>
                {post.santi.map((santo: any, i: number) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <p className="text-stone-800 font-bold text-sm leading-tight">{santo.nome}</p>
                    <p className="text-[11px] text-stone-500 leading-tight">{santo.biografia}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="flex items-center gap-2 text-xl font-bold mb-6 text-stone-800"><Library className="text-stone-400" /> Passaggio Biblico (CEI 2008)</h3>
              <div className="border-l-2 border-stone-200 pl-6 mb-2">
                <p className="whitespace-pre-wrap font-serif italic text-stone-700 leading-loose break-words">
                  {post.bibbia.testo}
                </p>
              </div>
              <p className="text-xs text-stone-500 uppercase tracking-widest">{post.bibbia.fonte}</p>
              <p className="text-[11px] text-stone-400 italic mt-2 leading-relaxed">{post.bibbia.nota}</p>
            </section>

            <section>
              <h3 className="flex items-center gap-2 text-xl font-bold mb-6 text-stone-800"><Feather className="text-stone-400" /> Poesia del Giorno</h3>
              <p className="whitespace-pre-wrap text-stone-800 leading-loose mb-4 pl-6 break-words">
                {post.poesia.testo}
              </p>
              <footer className="text-sm text-stone-500 pl-6 italic">
                <strong className="text-stone-800 font-serif not-italic">{post.poesia.autore}</strong>, {post.poesia.fonte}
              </footer>
            </section>

            <section className="bg-stone-800 text-stone-100 p-8 shadow-inner">
              <h3 className="flex items-center gap-2 text-xl font-bold mb-4"><PlayCircle size={24} /> Ascolto del giorno</h3>
              <p className="text-xl italic text-white mb-1">"{post.musica.brano}"</p>
              <p className="text-stone-400 font-bold text-xs uppercase mb-4">di {post.musica.autore} ({post.musica.genere})</p>
              <p className="text-stone-300 text-sm mb-6 leading-relaxed italic border-l border-stone-600 pl-4 break-words">{post.musica.motivo}</p>
              <div className="flex flex-wrap gap-4">
                <a href={`https://open.spotify.com/search/${encodeURIComponent(post.musica.chiave_ricerca)}`} target="_blank" className="bg-white text-stone-900 px-4 py-2 rounded text-xs font-bold uppercase tracking-widest hover:bg-stone-200 transition-colors">Spotify</a>
                <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(post.musica.chiave_ricerca)}`} target="_blank" className="border border-stone-500 text-stone-300 px-4 py-2 rounded text-xs font-bold uppercase tracking-widest hover:bg-stone-700 transition-colors">YouTube</a>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}