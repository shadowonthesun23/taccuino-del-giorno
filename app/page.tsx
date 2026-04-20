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

  if (!post) return <div className="p-20 text-center font-serif text-stone-400">In attesa...</div>;

  return (
    <div className="min-h-screen bg-[#f9f8f4] text-stone-800 font-serif py-8 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto bg-[#fdfbf7] shadow-xl border border-stone-200 p-5 sm:p-12 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-8 border-r-2 border-double border-stone-200 bg-[#f4f2eb] hidden sm:block"></div>

        <header className="border-b border-stone-300 pb-8 mb-8 text-center">
          <h2 className="text-sm uppercase tracking-widest text-stone-500 mb-4 font-sans italic">{post.data_odierna}</h2>
          <h1 className="text-4xl text-stone-900 mb-4">{post.autore_giorno}</h1>
          <p className="text-stone-600 italic leading-relaxed break-words">{post.breve_descrizione}</p>
        </header>

        <section className="bg-[#f4f2eb] p-6 border-l-4 border-stone-400 mb-10">
          <Quote className="text-stone-300 mb-2" size={30} />
          <p className="text-lg italic text-stone-700 break-words">"{post.citazione.testo}"</p>
          <footer className="mt-4 text-sm"><strong>{post.citazione.autore}</strong>, {post.citazione.fonte}</footer>
        </section>

        <div className="space-y-12">
          <section>
            <h3 className="flex items-center gap-2 text-xl font-bold mb-6"><History className="text-stone-400" /> Avvenimenti e Invenzioni</h3>
            <ul className="space-y-3">
              {post.avvenimenti.map((ev: string, i: number) => (
                <li key={i} className="text-sm sm:text-base flex gap-4">
                  <span className="font-bold text-stone-500 w-12 shrink-0">{ev.split(":")[0]}</span>
                  <span className="text-stone-700 break-words">{ev.split(":").slice(1).join(":")}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-xl font-bold mb-6"><Library className="text-stone-400" /> Passaggio Biblico (CEI 2008)</h3>
            <div className="border-l-2 border-stone-200 pl-6 mb-2">
              <p className="whitespace-pre-wrap font-serif italic text-stone-700 leading-loose break-words text-base md:text-lg">
                {post.bibbia.testo}
              </p>
            </div>
            <p className="text-xs text-stone-500 uppercase tracking-widest">{post.bibbia.fonte}</p>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-xl font-bold mb-6"><Feather className="text-stone-400" /> Poesia del Giorno</h3>
            <p className="whitespace-pre-wrap text-stone-800 leading-loose mb-4 pl-6 break-words">
              {post.poesia.testo}
            </p>
            <footer className="text-sm text-stone-500 pl-6 italic"><strong>{post.poesia.autore}</strong>, {post.poesia.fonte}</footer>
          </section>

          <section className="bg-stone-800 text-stone-100 p-8">
            <h3 className="flex items-center gap-2 text-xl font-bold mb-4"><PlayCircle size={24} /> Ascolto</h3>
            <p className="text-xl italic text-white mb-1">"{post.musica.brano}"</p>
            <p className="text-stone-400 font-bold text-xs uppercase mb-4">di {post.musica.autore}</p>
            <p className="text-stone-300 text-sm mb-6 italic leading-relaxed break-words">{post.musica.motivo}</p>
            <div className="flex gap-4">
              <a href={`https://open.spotify.com/search/${encodeURIComponent(post.musica.chiave_ricerca)}`} target="_blank" className="bg-white text-stone-900 px-4 py-2 rounded text-xs font-bold uppercase">Spotify</a>
              <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(post.musica.chiave_ricerca)}`} target="_blank" className="border border-stone-500 text-stone-300 px-4 py-2 rounded text-xs font-bold uppercase">YouTube</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}