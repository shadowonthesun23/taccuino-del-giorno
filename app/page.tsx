'use client';

import { useEffect, useState } from 'react';
import { EB_Garamond } from 'next/font/google';
import { BookOpen, Quote, Type, CalendarDays, Feather, Music, Sparkles, Sun, Moon, Palette, ExternalLink, X, ChevronLeft } from 'lucide-react';

const garamond = EB_Garamond({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const paperTextureLight = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.06'/%3E%3C/svg%3E")`;
const paperTextureDark = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")`;

const XIcon = ({ className, strokeWidth = 1.5 }: { className?: string, strokeWidth?: number }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
);

const InstagramIcon = ({ className, strokeWidth = 1.5 }: { className?: string, strokeWidth?: number }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const CoffeeIcon = ({ className, strokeWidth = 1.5 }: { className?: string, strokeWidth?: number }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
    <line x1="6" x2="6" y1="2" y2="4"/>
    <line x1="10" x2="10" y1="2" y2="4"/>
    <line x1="14" x2="14" y1="2" y2="4"/>
  </svg>
);

interface OperaGiorno {
  titolo: string;
  artista: string;
  anno: string;
  met_object_id: number;
  immagine_url: string;
  immagine_url_hd: string;
  museo: string;
  met_url: string;
  medium: string;
  dipartimento: string;
  nota: string;
  keyword_ricerca: string;
}

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

interface ArchivioItem {
  data: string;
  autore_giorno: string;
}

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

function formatDataItaliana(dataIso: string): string {
  const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const [anno, mese, giorno] = dataIso.split('-');
  return `${parseInt(giorno)} ${mesi[parseInt(mese) - 1]} ${anno}`;
}

function groupByMonth(items: ArchivioItem[]): Record<string, ArchivioItem[]> {
  const mesiNome = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const groups: Record<string, ArchivioItem[]> = {};
  for (const item of items) {
    const [anno, mese] = item.data.split('-');
    const key = `${mesiNome[parseInt(mese) - 1]} ${anno}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export default function Home() {
  const [data, setData] = useState<DatiTaccuino | null>(null);
  const [opera, setOpera] = useState<OperaGiorno | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [archivio, setArchivio] = useState<ArchivioItem[]>([]);
  const [dataSelezionata, setDataSelezionata] = useState<string | null>(null);

  const oggi = new Date().toISOString().split('T')[0];

  const caricaGiorno = (dataIso: string | null) => {
    setLoading(true);
    setError(null);
    setDrawerOpen(false);
    const url = dataIso ? `/api/oggi?data=${dataIso}` : '/api/oggi';
    Promise.all([
      fetch(url).then(res => {
        if (!res.ok) throw new Error('Nessun contenuto per questa data.');
        return res.json();
      }),
      fetch('/api/opera')
        .then(res => (res.ok ? res.json() : null))
        .catch(() => null),
    ])
      .then(([dati, operaData]) => {
        setData(dati);
        setOpera(operaData);
        setDataSelezionata(dataIso);
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const savedTheme = localStorage.getItem('theme');
      setIsDark(savedTheme === 'dark' || (!savedTheme && isSystemDark));
    }
    caricaGiorno(null);
    fetch('/api/archivio')
      .then(res => res.ok ? res.json() : [])
      .then(setArchivio)
      .catch(() => setArchivio([]));
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
    texture: isDark ? paperTextureDark : paperTextureLight,
    // Frost/glass drawer: sfondo semi-trasparente + blur
    drawerBg: isDark
      ? 'bg-[#1A1A1A]/75 backdrop-blur-xl'
      : 'bg-[#F4F0E6]/70 backdrop-blur-xl',
    drawerBorder: isDark ? 'border-[#3D3D3D]/60' : 'border-[#D6CCBC]/70',
  };

  const groupedArchivio = groupByMonth(archivio);

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
        {archivio.length > 0 && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="mt-6 inline-flex items-center gap-2 border-2 border-[#DE6B58] text-[#DE6B58] px-6 py-3 rounded-full uppercase tracking-widest text-sm font-bold hover:bg-[#DE6B58] hover:text-white transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Vedi giorni precedenti
          </button>
        )}
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} ${garamond.className} py-12 px-4 md:px-8 ${themeClasses.selection} relative transition-colors duration-300`}>
      <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: themeClasses.texture }}></div>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer pannello — frost/glass */}
      <div className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] z-50 flex flex-col shadow-2xl border-l transition-transform duration-300 ease-in-out ${themeClasses.drawerBg} ${themeClasses.drawerBorder} ${
        drawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className={`flex items-center justify-between p-5 border-b ${themeClasses.drawerBorder} flex-shrink-0`}>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#DE6B58]" />
            <span className="font-bold tracking-widest uppercase text-sm text-[#DE6B58]">Archivio</span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className={`p-1.5 rounded-full ${themeClasses.textMuted} hover:text-[#DE6B58] transition-colors`}
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {dataSelezionata && dataSelezionata !== oggi && (
          <div className={`px-5 py-3 border-b ${themeClasses.drawerBorder} flex-shrink-0`}>
            <button
              onClick={() => caricaGiorno(null)}
              className="inline-flex items-center gap-1.5 text-sm text-[#DE6B58] hover:underline font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Torna a oggi
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {archivio.length === 0 ? (
            <p className={`text-sm italic ${themeClasses.textMuted} text-center mt-8`}>Nessun giorno in archivio.</p>
          ) : (
            Object.entries(groupedArchivio).map(([mese, items]) => (
              <div key={mese} className="mb-6">
                <p className={`text-xs font-bold tracking-widest uppercase ${themeClasses.textMuted} mb-3`}>{mese}</p>
                <ul className="space-y-1">
                  {items.map(item => {
                    const isOggi = item.data === oggi;
                    const isSelezionato = item.data === dataSelezionata;
                    return (
                      <li key={item.data}>
                        <button
                          onClick={() => {
                            if (!isSelezionato) caricaGiorno(item.data);
                            else setDrawerOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center gap-3 group ${
                            isSelezionato
                              ? 'bg-[#DE6B58]/15 text-[#DE6B58]'
                              : isDark
                                ? 'hover:bg-white/5 text-[#E0E0E0]'
                                : 'hover:bg-[#2A2522]/5 text-[#2A2522]'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            isOggi ? 'bg-[#DE6B58]' : isDark ? 'bg-[#555]' : 'bg-[#C8B89A]'
                          }`} />
                          <span className="flex-1 min-w-0">
                            <span className="text-sm font-medium block">{item.autore_giorno}</span>
                            <span className={`text-xs ${isSelezionato ? 'text-[#DE6B58]/70' : themeClasses.textMuted}`}>
                              {formatDataItaliana(item.data)}{isOggi ? ' · oggi' : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>

      <main className="max-w-4xl mx-auto space-y-12 relative z-10">
        <header className={`text-center space-y-6 pb-8 border-b ${themeClasses.border} relative`}>
          <div className="absolute right-0 top-0 flex items-center gap-2">
            {archivio.length > 0 && (
              <button
                onClick={() => setDrawerOpen(true)}
                className={`p-2 rounded-full border ${themeClasses.border} ${themeClasses.textMuted} hover:text-[#DE6B58] hover:border-[#DE6B58] transition-colors`}
                aria-label="Archivio"
              >
                <CalendarDays className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={toggleTheme} 
              className={`p-2 rounded-full border ${themeClasses.border} ${themeClasses.textMuted} hover:text-[#DE6B58] hover:border-[#DE6B58] transition-colors`}
              aria-label="Cambia tema"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          <p className={`text-lg italic font-medium ${themeClasses.textMuted}`}>{data.data_odierna}</p>
          <h1 className="text-5xl md:text-6xl font-medium tracking-tight mb-4">
            Il Taccuino del Giorno
          </h1>
          <p className={`italic text-lg ${isDark ? 'text-[#C0C0C0]' : 'text-[#4A433F]'} max-w-2xl mx-auto`}>
            &quot;Ogni giorno un taccuino diverso: citazioni, poesia, santi, avvenimenti storici, parola del giorno, musica e un&apos;opera d&apos;arte. Cultura quotidiana, generata automaticamente.&quot;
          </p>
        </header>

        <section className="text-center space-y-4 pb-8">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          <Card title="Citazione" icon={Quote} isDark={isDark} className="md:col-span-2">
            <blockquote className="md:px-8">
              <p className="medieval-box text-left text-2xl md:text-3xl italic leading-relaxed mb-6 font-medium">
                {data.citazione.testo}
              </p>
              <footer className="text-right text-lg clear-both pt-2">
                <span className="font-bold">{data.citazione.autore}</span>
                <span className={`${themeClasses.textMuted} italic font-medium`}> — {data.citazione.fonte}</span>
              </footer>
            </blockquote>
          </Card>

          <Card title="Parola del Giorno" icon={Type} isDark={isDark}>
            <div className="text-center mb-6">
              <h4 className="text-4xl font-bold text-[#DE6B58] mb-2">{data.parola_giorno.parola}</h4>
              <p className={`${themeClasses.textMuted} italic font-medium text-lg`}>{data.parola_giorno.etimologia}</p>
            </div>
            <p className="text-xl font-medium mb-4"><strong className="font-bold">Definizione:</strong> {data.parola_giorno.definizione}</p>
            {data.parola_giorno.esempio && data.parola_giorno.esempio.trim() !== '' && (
              <p className={`text-lg font-medium italic ${themeClasses.highlightBg} p-4 rounded-xl border ${themeClasses.border}`}>
                &quot;{data.parola_giorno.esempio}&quot;
              </p>
            )}
          </Card>

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

          {opera && (
            <Card title="Opera del Giorno" icon={Palette} isDark={isDark} className="md:col-span-2 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
                <div className="space-y-5 order-2 md:order-1">
                  <div>
                    <h4 className="text-3xl md:text-4xl font-bold leading-tight mb-2">{opera.titolo}</h4>
                    <p className="text-xl font-medium">
                      di <span className="font-bold">{opera.artista}</span>
                      {opera.anno ? <span className={`${themeClasses.textMuted} italic`}> — {opera.anno}</span> : null}
                    </p>
                  </div>
                  {(opera.medium || opera.dipartimento) && (
                    <p className={`text-lg ${themeClasses.textMuted} italic`}>
                      {[opera.medium, opera.dipartimento].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <a
                      href={opera.met_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center justify-center gap-2 border-2 border-[#DE6B58] text-[#DE6B58] hover:bg-[#DE6B58] ${isDark ? 'hover:text-[#1E1E1E]' : 'hover:text-[#FDFCF8]'} transition-colors duration-300 px-6 py-3 rounded-full uppercase tracking-widest text-sm font-bold`}
                    >
                      Vedi al museo
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                <div className="order-1 md:order-2">
                  <a href={opera.met_url} target="_blank" rel="noopener noreferrer" className="block group">
                    <img
                      src={opera.immagine_url_hd || opera.immagine_url}
                      alt={`${opera.titolo} di ${opera.artista}`}
                      className={`w-full h-auto object-cover rounded-2xl border ${themeClasses.border} shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] transition-transform duration-500 group-hover:scale-[1.015]`}
                    />
                  </a>
                  <p className={`text-sm ${themeClasses.textMuted} italic mt-3 text-center`}>
                    {opera.museo}
                  </p>
                </div>
              </div>
            </Card>
          )}

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

          <Card title="Poesia del giorno" icon={Feather} isDark={isDark}>
            <div className="medieval-box whitespace-pre-wrap text-xl font-medium leading-loose italic mb-6">
              {data.poesia.testo}
            </div>
            <div className={`text-left border-t ${themeClasses.border} pt-4 mb-6`}>
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

          <Card title="Passaggio biblico del giorno" icon={BookOpen} isDark={isDark}>
            <div className="medieval-box whitespace-pre-wrap text-xl font-medium leading-relaxed mb-6">
              {data.bibbia.testo}
            </div>
            <div className={`text-left border-t ${themeClasses.border} pt-4 mb-6`}>
              <p className={`${themeClasses.textMuted} italic font-bold`}>{data.bibbia.fonte}</p>
            </div>
            {data.bibbia.nota && (
              <div className={`mt-4 p-4 ${themeClasses.highlightBg} border-l-2 border-[#DE6B58] text-lg font-medium ${isDark ? 'text-[#C0C0C0]' : 'text-[#4A433F]'} rounded-xl`}>
                <span className="font-bold text-[#DE6B58] text-xs tracking-widest uppercase block mb-1">Il senso del passaggio</span>
                {data.bibbia.nota}
              </div>
            )}
          </Card>

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
                <XIcon className="w-5 h-5" />
              </a>
              <a 
                href="https://www.instagram.com/antonelloan23/" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`p-3 rounded-full border ${themeClasses.border} hover:border-[#DE6B58] hover:text-[#DE6B58] transition-all duration-300 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${isDark ? 'bg-[#2A2A2A]/50' : 'bg-[#FDFCF8]/50'}`}
                aria-label="Instagram"
              >
                <InstagramIcon className="w-5 h-5" />
              </a>
              <a 
                href="https://buymeacoffee.com/antonello23" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`p-3 rounded-full border ${themeClasses.border} hover:border-[#DE6B58] hover:text-[#DE6B58] transition-all duration-300 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${isDark ? 'bg-[#2A2A2A]/50' : 'bg-[#FDFCF8]/50'}`}
                aria-label="Buy Me a Coffee"
              >
                <CoffeeIcon className="w-5 h-5" />
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
