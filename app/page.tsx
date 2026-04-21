'use client';

import { useEffect, useState } from 'react';
import { EB_Garamond } from 'next/font/google';
import { BookOpen, Quote, Type, CalendarDays, Feather, Music, Sparkles, Sun, Moon, Twitter, Instagram, Coffee } from 'lucide-react';

// Importazione del font EB Garamond ottimizzato per Next.js
const garamond = EB_Garamond({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

// Texture rumore/carta SVG (Base64)
const paperTextureLight = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.06'/%3E%3C/svg%3E")`;
const paperTextureDark = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")`;

interface DatiTaccuino {
  data_odierna: string;
  autore_giorno: string;
  breve_descrizione: string;
  citazione: { testo: string; autore: string; fonte: string };
  avvenimenti: string[];
  parola_giorno: { parola: string; definizione: string; etimologia: string; esempio: string; nota: string };
  santi: { nome: string; ruolo: string; anni: string; biografia: string }[];
  bibbia: { testo: string; fonte: string; nota: string };
  poesia: { testo: string; autore: string; fonte: string; nota: string };
  musica: { brano: string; autore: string; genere: string; motivo: string; chiave_ricerca: string };
}

// Componente helper per le "tessere" eleganti
const Card = ({ title, icon: Icon, isDark, children, className = "" }: { title: string, icon?: any, isDark: boolean, children: React.ReactNode, className?: string }) => (
  <section className={`${isDark ? 'bg-[#2A2A2A] border-[#3D3D3D]' : 'bg-[#FDFCF8] border-[#EBE5DB]'} border rounded-2xl p-6 md:p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-colors duration-300 ${className}`}>
    <div className="flex items-center justify-center gap-2 mb-6">
      {Icon && <Icon className="w-5 h-5 text-[#DE6B58]" strokeWidth={1.5} />}
      <h3 className="text-[#DE6B58] text-sm font-bold tracking-[0.2em] uppercase text-center m-0">
        {title}
      </h3>
    </div>
    <div className={isDark ? 'text-[#E0E0E0]' : 'text-[#2A2522]'}>
      {children}
    </div>
  </section>
);

export default function Home() {
  const [data, setData] = useState<DatiTaccuino | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Controlla la preferenza di sistema o il salvataggio locale all'avvio
    if (typeof window !== 'undefined') {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const savedTheme = localStorage.getItem('theme');
      setIsDark(savedTheme === 'dark' || (!savedTheme && isSystemDark));
    }

    fetch('/api/oggi')
      .then(res => {
        if (!res.ok) throw new Error('Dati non ancora disponibili per oggi.');
        return res.json();
      })
      .then(dati => {
        setData(dati);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    localStorage.setItem('theme', !isDark ? 'dark' : 'light');
  };

  const themeClasses = {
    bg: isDark ? 'bg-[#1E1E1E]' : 'bg-[#F4F0E6]',
    text: isDark ? 'text-[#E0E0E0]' : 'text-[#2A2522]',
    textMuted: isDark ? 'text-[#A0A0A0]' : 'text-[#8A817C]',
    border: isDark ? 'border-[#3D3D3D]' : 'border-[#EBE5DB]',
    highlightBg: isDark ? 'bg-[#2A2A2A]/80' : 'bg-[#F4F0E6]/60',
    selection: isDark ? 'selection:bg-[#DE6B58] selection:text-[#1E1E1E]' : 'selection:bg-[#DE6B58] selection:text-[#FDFCF8]',
    texture: isDark ? paperTextureDark : paperTextureLight
  };

  if (loading) return (
    <div className={`min-h-screen ${themeClasses.bg} flex items-center justify-center ${garamond.className} relative transition-colors duration-300`}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: themeClasses.texture }}></div>
      <div className="text-[#DE6B58] text-xl animate-pulse tracking-widest font-bold uppercase relative z-10">Apertura del taccuino...</div>
    </div>
  );

  if (error) return (
    <div className={`min-h-screen ${themeClasses.bg} flex items-center justify-center ${garamond.className} p-4 relative transition-colors duration-300`}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: themeClasses.texture }}></div>
      <div className={`${isDark ? 'bg-[#2A2A2A] border-[#3D3D3D]' : 'bg-[#FDFCF8] border-[#EBE5DB]'} border p-8 max-w-lg text-center rounded-2xl relative z-10 transition-colors duration-300`}>
        <p className={`${themeClasses.text} text-xl font-medium mb-4`}>Il taccuino di oggi non è ancora stato compilato.</p>
        <p className={`text-sm ${themeClasses.textMuted} italic`}>{error}</p>
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} ${garamond.className} py-12 px-4 md:px-8 ${themeClasses.selection} relative transition-colors duration-300`}>
      {/* Overlay Texture Carta */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: themeClasses.texture }}></div>
      
      <main className="max-w-4xl mx-auto space-y-12 relative z-10">
        
        {/* Intestazione */}
        <header className={`text-center space-y-6 pb-10 border-b ${themeClasses.border} relative`}>
          <button 
            onClick={toggleTheme} 
            className={`absolute right-0 top-0 p-2 rounded-full border ${themeClasses.border} ${themeClasses.textMuted} hover:text-[#DE6B58] hover:border-[#DE6B58] transition-colors`}
            aria-label="Cambia tema"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <p className={`text-lg italic font-medium ${themeClasses.textMuted}`}>{data.data_odierna}</p>
          <h1 className="text-5xl md:text-6xl font-medium tracking-tight mb-4">
            Il Taccuino del Giorno
          </h1>
          <p className={`italic text-lg ${isDark ? 'text-[#C0C0C0]' : 'text-[#4A433F]'} max-w-2xl mx-auto`}>
            "Ogni giorno un taccuino diverso: citazioni, poesia, santi, avvenimenti storici, parola del giorno e musica. Cultura quotidiana, generata automaticamente."
          </p>
        </header>

        {/* Autore del Giorno (Hero Section) */}
        <section className="text-center space-y-4 py-8">
          <span className="text-[#DE6B58] text-sm font-bold tracking-[0.2em] uppercase">
            Autore del Giorno
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-6">
            {data.autore_giorno}
          </h2>
          <p className={`text-xl md:text-2xl leading-relaxed max-w-2xl mx-auto font-medium ${isDark ? 'text-[#C0C0C0]' : 'text-[#4A433F]'}`}>
            {data.breve_descrizione}
          </p>
        </section>

        {/* Griglia Contenuti */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Citazione - Spazia su due colonne */}
          <Card title="Citazione" icon={Quote} isDark={isDark} className="md:col-span-2">
            <blockquote className="text-center">
              <span className="text-6xl text-[#DE6B58]/30 leading-none block mb-[-20px]">"</span>
              <p className="text-2xl md:text-3xl italic leading-relaxed mb-6 font-medium">
                {data.citazione.testo}
              </p>
              <footer className="text-lg">
                <span className="font-bold">{data.citazione.autore}</span>
                <span className={`${themeClasses.textMuted} italic font-medium`}> — {data.citazione.fonte}</span>
              </footer>
            </blockquote>
          </Card>

          {/* Parola del Giorno */}
          <Card title="Parola del Giorno" icon={Type} isDark={isDark}>
            <div className="text-center mb-6">
              <h4 className="text-4xl font-bold text-[#DE6B58] mb-2">{data.parola_giorno.parola}</h4>
              <p className={`${themeClasses.textMuted} italic font-medium text-lg`}>{data.parola_giorno.etimologia}</p>
            </div>
            <p className="text-xl font-medium mb-4"><strong className="font-bold">Definizione:</strong> {data.parola_giorno.definizione}</p>
            <p className={`text-lg font-medium italic ${themeClasses.highlightBg} p-4 rounded-xl border ${themeClasses.border}`}>
              "{data.parola_giorno.esempio}"
            </p>
          </Card>

          {/* Santi */}
          <Card title="I Santi di Oggi" icon={Sparkles} isDark={isDark}>
            <ul className="space-y-6">
              {data.santi.map((santo, idx) => (
                <li key={idx} className={`border-b ${themeClasses.border} last:border-0 pb-4 last:pb-0`}>
                  <h4 className="text-2xl font-bold mb-1">{santo.nome}</h4>
                  <p className="text-[#DE6B58] font-medium italic mb-2">{santo.ruolo} ({santo.anni})</p>
                  <p className="text-lg font-medium leading-relaxed">{santo.biografia}</p>
                </li>
              ))}
            </ul>
          </Card>

          {/* Avvenimenti - Spazia su due colonne */}
          <Card title="Accadde Oggi" icon={CalendarDays} isDark={isDark} className="md:col-span-2">
            <ul className="space-y-4">
              {data.avvenimenti.map((evento, idx) => {
                const parts = evento.split(':');
                return (
                  <li key={idx} className="flex gap-4 text-xl font-medium leading-relaxed">
                    <span className="text-[#DE6B58] font-bold">•</span>
                    <span>
                      {parts.length > 1 ? (
                        <>
                          <strong className="font-bold">{parts[0]}:</strong>
                          {parts.slice(1).join(':')}
                        </>
                      ) : (
                        evento
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Poesia */}
          <Card title="Poesia del giorno" icon={Feather} isDark={isDark}>
            <div className="whitespace-pre-wrap text-xl font-medium leading-loose italic mb-6">
              {data.poesia.testo}
            </div>
            <div className={`text-right border-t ${themeClasses.border} pt-4 mb-6`}>
              <p className="font-bold text-xl">{data.poesia.autore}</p>
              <p className={`${themeClasses.textMuted} font-medium italic`}>{data.poesia.fonte}</p>
            </div>
            {data.poesia.nota && (
              <div className={`mt-4 p-4 ${themeClasses.highlightBg} border-l-2 border-[#DE6B58] text-lg font-medium ${isDark ? 'text-[#C0C0C0]' : 'text-[#4A433F]'} rounded-xl`}>
                <span className="font-bold text-[#DE6B58] text-xs tracking-widest uppercase block mb-1">Perché questa scelta</span>
                {data.poesia.nota}
              </div>
            )}
          </Card>

          {/* Bibbia */}
          <Card title="Passaggio biblico del giorno" icon={BookOpen} isDark={isDark}>
            <div className="whitespace-pre-wrap text-xl font-medium leading-relaxed mb-6">
              {data.bibbia.testo}
            </div>
            <div className={`text-right border-t ${themeClasses.border} pt-4 mb-6`}>
              <p className={`${themeClasses.textMuted} italic font-bold`}>{data.bibbia.fonte}</p>
            </div>
            {data.bibbia.nota && (
              <div className={`mt-4 p-4 ${themeClasses.highlightBg} border-l-2 border-[#DE6B58] text-lg font-medium ${isDark ? 'text-[#C0C0C0]' : 'text-[#4A433F]'} rounded-xl`}>
                <span className="font-bold text-[#DE6B58] text-xs tracking-widest uppercase block mb-1">Il senso del passaggio</span>
                {data.bibbia.nota}
              </div>
            )}
          </Card>

          {/* Musica - Spazia su due colonne */}
          <Card title="Consiglio Musicale" icon={Music} isDark={isDark} className="md:col-span-2 text-center">
            <div className="max-w-2xl mx-auto">
              <h4 className="text-3xl font-bold mb-2">{data.musica.brano}</h4>
              <p className="text-xl font-medium mb-2">di <span className="font-bold">{data.musica.autore}</span></p>
              <p className="text-[#DE6B58] font-medium italic mb-6">{data.musica.genere}</p>
              <p className="text-xl font-medium leading-relaxed mb-8">
                {data.musica.motivo}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <a 
                  href={`https://open.spotify.com/search/${encodeURIComponent(data.musica.chiave_ricerca)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center border-2 border-[#DE6B58] text-[#DE6B58] hover:bg-[#DE6B58] ${isDark ? 'hover:text-[#1E1E1E]' : 'hover:text-[#FDFCF8]'} transition-colors duration-300 px-8 py-3 rounded-full uppercase tracking-widest text-sm font-bold w-full sm:w-auto`}
                >
                  Ascolta su Spotify
                </a>
                <a 
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(data.musica.chiave_ricerca)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center border-2 border-[#DE6B58] text-[#DE6B58] hover:bg-[#DE6B58] ${isDark ? 'hover:text-[#1E1E1E]' : 'hover:text-[#FDFCF8]'} transition-colors duration-300 px-8 py-3 rounded-full uppercase tracking-widest text-sm font-bold w-full sm:w-auto`}
                >
                  Ascolta su YouTube
                </a>
              </div>
            </div>
          </Card>

        </div>
        
        {/* Footer */}
        <footer className={`text-center pt-16 pb-8 ${themeClasses.textMuted} font-medium`}>
          <div className="flex flex-col items-center justify-center gap-6">
            <p className="text-lg italic tracking-wide">Made with love by Antonello</p>
            
            <div className="flex items-center justify-center gap-6">
              <a 
                href="https://x.com/antonello23" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`p-3 rounded-full border ${themeClasses.border} hover:border-[#DE6B58] hover:text-[#DE6B58] transition-all duration-300 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${isDark ? 'bg-[#2A2A2A]/50' : 'bg-[#FDFCF8]/50'}`}
                aria-label="X (Twitter)"
              >
                <Twitter className="w-5 h-5" strokeWidth={1.5} />
              </a>
              <a 
                href="https://www.instagram.com/antonelloan23/" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`p-3 rounded-full border ${themeClasses.border} hover:border-[#DE6B58] hover:text-[#DE6B58] transition-all duration-300 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${isDark ? 'bg-[#2A2A2A]/50' : 'bg-[#FDFCF8]/50'}`}
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" strokeWidth={1.5} />
              </a>
              <a 
                href="https://buymeacoffee.com/antonello23" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`p-3 rounded-full border ${themeClasses.border} hover:border-[#DE6B58] hover:text-[#DE6B58] transition-all duration-300 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${isDark ? 'bg-[#2A2A2A]/50' : 'bg-[#FDFCF8]/50'}`}
                aria-label="Buy Me a Coffee"
              >
                <Coffee className="w-5 h-5" strokeWidth={1.5} />
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
