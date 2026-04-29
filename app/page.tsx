'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { EB_Garamond, Caveat } from 'next/font/google';
import { BookOpen, Quote, Type, CalendarDays, Feather, Music, Sparkles, Church, Sun, Moon, Palette, ExternalLink, X, ChevronLeft, Languages, Loader2 } from 'lucide-react';
import AuthorExportCard from './components/AuthorExportCard';
import Card from './components/Card';

const garamond = EB_Garamond({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});
const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

const paperTexture = `url("/beige-paper.png")`;

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

const WatercolorDivider = ({ isDark }: { isDark: boolean }) => {
  const color = isDark ? '#7a5c38' : '#b5956a';
  return (
    <div aria-hidden="true" className="w-full flex justify-center my-2 pointer-events-none select-none">
      <svg viewBox="0 0 800 36" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-2xl" style={{ height: '36px', display: 'block' }}>
        <defs>
          <filter id="wc-blur" x="-10%" y="-60%" width="120%" height="220%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04 0.3" numOctaves={4} seed={8} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={5} xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation={1.2} result="blurred" />
            <feComposite in="blurred" in2="SourceGraphic" operator="atop" />
          </filter>
          <filter id="wc-edge" x="-5%" y="-80%" width="110%" height="260%">
            <feTurbulence type="turbulence" baseFrequency="0.08 0.6" numOctaves={3} seed={14} result="noise2" />
            <feDisplacementMap in="SourceGraphic" in2="noise2" scale={3} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <path d="M 30 20 Q 120 12 220 18 Q 320 24 420 16 Q 520 9 630 19 Q 710 26 770 18" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" opacity="0.55" filter="url(#wc-blur)" />
        <path d="M 60 16 Q 180 10 300 15 Q 430 20 550 13 Q 660 8 750 16" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.3" filter="url(#wc-edge)" />
        <path d="M 100 22 Q 250 28 400 21 Q 550 14 700 23" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.18" filter="url(#wc-blur)" />
      </svg>
    </div>
  );
};

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
  foto_autore_url?: string | null;
}

interface ArchivioItem {
  data: string;
  autore_giorno: string;
}

function estraiTesti(d: DatiTaccuino): string[] {
  return [
    d.autore_giorno, d.breve_descrizione, d.citazione.testo, d.citazione.fonte,
    d.parola_giorno.parola, d.parola_giorno.etimologia, d.parola_giorno.definizione,
    d.parola_giorno.esempio, d.parola_giorno.nota,
    ...d.santi.flatMap(s => [s.nome, s.ruolo, s.anni, s.biografia]),
    d.bibbia.testo, d.bibbia.nota,
    d.poesia.testo, d.poesia.autore, d.poesia.fonte, d.poesia.nota,
    d.musica.brano, d.musica.autore, d.musica.genere, d.musica.motivo,
    ...d.avvenimenti,
  ];
}

function ricostruisciDati(originale: DatiTaccuino, traduzioni: string[]): DatiTaccuino {
  const flat = traduzioni;
  let i = 9;
  const t = () => flat[i++] ?? '';
  const santiTradotti = originale.santi.map(() => ({ nome: t(), ruolo: t(), anni: t(), biografia: t() }));
  let j = 9 + originale.santi.length * 4;
  const tf = () => flat[j++] ?? '';
  return {
    ...originale,
    autore_giorno: flat[0], breve_descrizione: flat[1],
    citazione: { ...originale.citazione, testo: flat[2], fonte: flat[3] },
    parola_giorno: { ...originale.parola_giorno, parola: flat[4], etimologia: flat[5], definizione: flat[6], esempio: flat[7] && flat[7] !== 'null' ? flat[7] : '', nota: flat[8] },
    santi: santiTradotti,
    bibbia: { ...originale.bibbia, testo: tf(), nota: tf() },
    poesia: { ...originale.poesia, testo: tf(), autore: tf(), fonte: tf(), nota: tf() },
    musica: { ...originale.musica, brano: tf(), autore: tf(), genere: tf(), motivo: tf() },
    avvenimenti: flat.slice(j),
  };
}

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
  const [dataOriginale, setDataOriginale] = useState<DatiTaccuino | null>(null);
  const [dataTradotta, setDataTradotta] = useState<DatiTaccuino | null>(null);
  const [opera, setOpera] = useState<OperaGiorno | null>(null);
  const [vinylCover, setVinylCover] = useState<string | null>(null);
  const [vinylOpen, setVinylOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, right: 16 });
  const [archivio, setArchivio] = useState<ArchivioItem[]>([]);
  const [dataSelezionata, setDataSelezionata] = useState<string | null>(null);
  const [lingua, setLingua] = useState<'IT' | 'EN'>('IT');
  const [traducendo, setTraducendo] = useState(false);
  const [erroreTraduzioni, setErroreTraduzioni] = useState<string | null>(null);
  const [archivioHasScroll, setArchivioHasScroll] = useState(false);
  const [archivioAtBottom, setArchivioAtBottom] = useState(false);
  const [showExportCard, setShowExportCard] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const archivioScrollRef = useRef<HTMLDivElement>(null);

  const oggi = new Date().toISOString().split('T')[0];

  const checkArchivioScroll = useCallback(() => {
    const el = archivioScrollRef.current;
    if (!el) return;
    setArchivioHasScroll(el.scrollHeight > el.clientHeight + 4);
    setArchivioAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 8);
  }, []);

  useEffect(() => { if (popoverOpen) setTimeout(checkArchivioScroll, 50); }, [popoverOpen, archivio, checkArchivioScroll]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) && triggerRef.current && !triggerRef.current.contains(e.target as Node)) setPopoverOpen(false);
    }
    if (popoverOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') setPopoverOpen(false); }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const caricaGiorno = (dataIso: string | null) => {
    setLoading(true); setError(null); setPopoverOpen(false); setLingua('IT'); setDataTradotta(null); setErroreTraduzioni(null); setShowExportCard(false); setVinylCover(null); setVinylOpen(false);
    const url = dataIso ? `/api/oggi?data=${dataIso}` : '/api/oggi';
    Promise.all([
      fetch(url).then(res => { if (!res.ok) throw new Error('Nessun contenuto per questa data.'); return res.json(); }),
      fetch('/api/opera').then(res => (res.ok ? res.json() : null)).catch(() => null),
    ])
      .then(([dati, operaData]) => {
        setData(dati); setDataOriginale(dati); setOpera(operaData); setDataSelezionata(dataIso); setLoading(false); setContentKey(k => k + 1); window.scrollTo({ top: 0, behavior: 'smooth' });
        fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(dati.musica.chiave_ricerca)}&entity=album&limit=3`)
          .then(r => r.json())
          .then(j => {
            const result = j.results?.[0];
            if (result?.artworkUrl100) {
              setVinylCover(result.artworkUrl100.replace('100x100bb', '600x600bb'));
            } else {
              setVinylCover(null);
            }
          })
          .catch(() => setVinylCover(null));
      })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  const toggleLingua = useCallback(async () => {
    if (lingua === 'EN') { setLingua('IT'); setData(dataOriginale); return; }
    if (dataTradotta) { setLingua('EN'); setData(dataTradotta); return; }
    if (!dataOriginale) return;
    setTraducendo(true); setErroreTraduzioni(null);
    try {
      const testi = estraiTesti(dataOriginale);
      const res = await fetch('/api/traduci', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testi, targetLang: 'EN' }) });
      if (!res.ok) throw new Error('Errore nella traduzione.');
      const { traduzioni } = await res.json();
      const tradotta = ricostruisciDati(dataOriginale, traduzioni);
      setDataTradotta(tradotta); setData(tradotta); setLingua('EN');
    } catch (e: unknown) {
      setErroreTraduzioni(e instanceof Error ? e.message : 'Traduzione non disponibile.');
    } finally { setTraducendo(false); }
  }, [lingua, dataOriginale, dataTradotta]);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const savedTheme = localStorage.getItem('theme');
      setIsDark(savedTheme === 'dark' || (!savedTheme && isSystemDark));
    }
    caricaGiorno(null);
    fetch('/api/archivio').then(res => res.ok ? res.json() : []).then(setArchivio).catch(() => setArchivio([]));
  }, []);

  const toggleTheme = () => { setIsDark(!isDark); localStorage.setItem('theme', !isDark ? 'dark' : 'light'); };

  const themeClasses = {
    bg: isDark ? 'bg-[#1E1E1E]' : 'bg-[#F4F0E6]',
    text: isDark ? 'text-[#E0E0E0]' : 'text-[#2A2522]',
    textMuted: isDark ? 'text-[#A0A0A0]' : 'text-[#8A817C]',
    border: isDark ? 'border-[#3D3D3D]' : 'border-[#EBE5DB]',
    highlightBg: isDark ? 'bg-[#2A2A2A]/80' : 'bg-[#F4F0E6]/60',
    selection: isDark ? 'selection:bg-[#DE6B58] selection:text-[#1E1E1E]' : 'selection:bg-[#DE6B58] selection:text-[#FDFCF8]',
    texture: paperTexture,
    popoverBg: isDark ? '#1C1C1C' : '#F4F0E6',
    popoverBgClass: isDark ? 'bg-[#1C1C1C]' : 'bg-[#F4F0E6]',
    popoverBorder: isDark ? 'border-[#3D3D3D]' : 'border-[#D4CABC]',
    popoverArrowFill: isDark ? '#1C1C1C' : '#F4F0E6',
    popoverArrowStroke: isDark ? '#3D3D3D' : '#D4CABC',
    fadeGradient: isDark ? 'linear-gradient(to bottom, transparent 0%, #1C1C1C 100%)' : 'linear-gradient(to bottom, transparent 0%, #F4F0E6 100%)',
    photoBg: '#FDFCF8',
    photoBorder: '#EBE5DB',
  };

  const groupedArchivio = groupByMonth(archivio);

  if (loading) return (
    <div 
      className="absolute inset-0 pointer-events-none" 
      style={{ 
        backgroundImage: `url("/beige-paper.png")`,
        filter: isDark ? 'invert(1) opacity(0.45)' : 'opacity(0.85)',
        mixBlendMode: isDark ? 'overlay' : 'multiply'
      }}
    ></div>
  );

  if (error) return (
    <div className={`min-h-screen ${themeClasses.bg} flex items-center justify-center ${garamond.className} p-4 relative transition-colors duration-300`}>
      <div 
        className="absolute inset-0 pointer-events-none z-0" 
        style={{ 
          backgroundImage: themeClasses.texture,
          backgroundRepeat: 'repeat',
          filter: isDark ? 'invert(1) opacity(0.45)' : 'opacity(0.85)' 
        }}
      ></div>
      <div className={`${isDark ? 'bg-[#2A2A2A] border-[#3D3D3D]' : 'bg-[#FDFCF8] border-[#EBE5DB]'} border p-8 max-w-lg text-center rounded-2xl relative z-10 transition-colors duration-300`}>
        <p className={`${themeClasses.text} text-xl font-medium mb-4`}>Il taccuino di oggi non è ancora stato compilato.</p>
        <p className={`text-sm ${themeClasses.textMuted} italic`}>{error}</p>
        {archivio.length > 0 && (
          <button onClick={() => setPopoverOpen(true)} className="mt-6 inline-flex items-center gap-2 border-2 border-[#DE6B58] text-[#DE6B58] px-6 py-3 rounded-full uppercase tracking-widest text-sm font-bold hover:bg-[#DE6B58] hover:text-white transition-colors">
            <CalendarDays className="w-4 h-4" />Vedi giorni precedenti
          </button>
        )}
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} ${garamond.className} py-12 px-4 md:px-8 ${themeClasses.selection} relative transition-colors duration-300`}>
      
      <div 
        className="absolute inset-0 pointer-events-none z-0" 
        style={{ 
          backgroundImage: themeClasses.texture,
          backgroundRepeat: 'repeat',
          filter: isDark ? 'invert(1) opacity(0.45)' : 'opacity(0.85)' 
        }}
      ></div>

      <main key={contentKey} className="max-w-4xl mx-auto space-y-12 relative z-10">
        <header className={`text-center space-y-6 relative animate-fadeInUp stagger-1`}>
          <div className="flex justify-center md:justify-end md:absolute md:right-0 md:top-0 items-center gap-2 z-30">
            <button onClick={toggleLingua} disabled={traducendo} title={lingua === 'IT' ? 'Traduci in inglese' : 'Torna in italiano'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-bold tracking-widest uppercase transition-all ${
                lingua === 'EN' ? 'border-[#DE6B58] text-[#DE6B58] bg-[#DE6B58]/8' : `${themeClasses.border} ${themeClasses.textMuted} hover:text-[#DE6B58] hover:border-[#DE6B58]`
              } disabled:opacity-50 disabled:cursor-not-allowed`} aria-label={lingua === 'IT' ? 'Traduci in inglese' : 'Torna in italiano'}>
              {traducendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
              <span>{lingua === 'IT' ? 'EN' : 'IT'}</span>
            </button>

            {archivio.length > 0 && (
              <div className="relative">
                <button
                  ref={triggerRef}
                  onClick={() => {
                    if (!popoverOpen && triggerRef.current) {
                      const rect = triggerRef.current.getBoundingClientRect();
                      setPopoverPos({
                        top: rect.bottom + 10,
                        right: window.innerWidth - rect.right,
                      });
                    }
                    setPopoverOpen(v => !v);
                  }}
                  className={`p-2 rounded-full border ${
                    popoverOpen ? 'border-[#DE6B58] text-[#DE6B58]' : `${themeClasses.border} ${themeClasses.textMuted} hover:text-[#DE6B58] hover:border-[#DE6B58]`
                  } transition-colors`} aria-label="Archivio" aria-expanded={popoverOpen} aria-haspopup="true">
                  <CalendarDays className="w-5 h-5" />
                </button>
              </div>
            )}

            <button onClick={toggleTheme} className={`p-2 rounded-full border ${themeClasses.border} ${themeClasses.textMuted} hover:text-[#DE6B58] hover:border-[#DE6B58] transition-colors`} aria-label="Cambia tema">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex justify-center mb-6 mt-2">
            <div className={`masking-tape ${caveat.className} text-xl font-bold tracking-wider`}>{data.data_odierna}</div>
          </div>
          <h1 className="text-5xl md:text-6xl font-medium tracking-tight mb-4">
            <span className="font-jocky animate-typewriter">
              {lingua === 'IT' ? 'Il Taccuino del Giorno' : 'The Daily Notebook'}
            </span>
          </h1>
          <p className={`italic text-lg ${isDark ? 'text-[#C0C0C0]' : 'text-[#4A433F]'} max-w-2xl mx-auto`}>
            {lingua === 'IT'
              ? '"Ogni giorno un taccuino diverso: citazioni, poesia, santi, avvenimenti storici, parola del giorno, musica e un\u2019opera d\u2019arte. Cultura quotidiana, scelta con cura."'
              : '"Every day a different notebook: quotes, poetry, saints, historical events, word of the day, music and a work of art. Daily culture, chosen with care."'}
          </p>
          {erroreTraduzioni && <p className="text-xs text-[#DE6B58] italic mt-2">{erroreTraduzioni}</p>}
          <WatercolorDivider isDark={isDark} />
        </header>

        <section className="py-8 animate-fadeInUp stagger-2">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-10 md:flex-row md:items-center md:justify-center">
            {data.foto_autore_url && (
              <div className="flex-shrink-0 relative" style={{ width: '160px', transform: 'rotate(-2.5deg)' }}>
                <div
                  className="masking-tape"
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    left: '-18px',
                    transform: 'rotate(-32deg)',
                    zIndex: 10,
                    width: '80px',
                    height: '22px',
                    opacity: 0.8,
                  }}
                />
                <div
                  className="relative photo-paper-shadow"
                  style={{
                    background: themeClasses.photoBg,
                    border: `1px solid ${themeClasses.photoBorder}`,
                    padding: '10px 10px 28px 10px',
                  }}
                >
                  <img
                    src={data.foto_autore_url}
                    alt={data.autore_giorno}
                    style={{
                      display: 'block',
                      width: '140px',
                      height: '180px',
                      objectFit: 'cover',
                      filter: 'grayscale(100%) contrast(90%) brightness(1.05)',
                    }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex-1 text-center md:text-left">
              <span className="text-[#DE6B58] text-sm font-bold tracking-[0.2em] uppercase block mb-2">
                {lingua === 'IT' ? 'Autore del Giorno' : 'Author of the Day'}
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">{data.autore_giorno}</h2>
              <p className={`text-xl md:text-2xl leading-relaxed font-medium ${isDark ? 'text-[#C0C0C0]' : 'text-[#4A433F]'}`}>
                {data.breve_descrizione}
              </p>

              <button
                onClick={() => setShowExportCard(v => !v)}
                className={`mt-6 inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase border rounded-full px-4 py-2 transition-all ${
                  showExportCard
                    ? 'border-[#DE6B58] text-[#DE6B58]'
                    : `${themeClasses.border} ${themeClasses.textMuted} hover:border-[#DE6B58] hover:text-[#DE6B58]`
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {showExportCard
                  ? (lingua === 'IT' ? 'Nascondi anteprima' : 'Hide preview')
                  : (lingua === 'IT' ? 'Esporta come immagine' : 'Export as image')}
              </button>
            </div>
          </div>

          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              showExportCard
                ? 'max-h-[1400px] opacity-100 translate-y-0 mt-5'
                : 'max-h-0 opacity-0 -translate-y-2 mt-0'
            }`}
            aria-hidden={!showExportCard}
          >
            <div className="pt-1 pb-1">
              <p className={`text-center text-sm ${themeClasses.textMuted} italic mb-4 transition-opacity duration-300 ${showExportCard ? 'opacity-100' : 'opacity-0'}`}>
                {lingua === 'IT'
                  ? 'Anteprima della card da condividere (formato 9:16)'
                  : 'Preview of the shareable card (9:16 format)'}
              </p>
              <AuthorExportCard
                autoreGiorno={data.autore_giorno}
                breveDescrizione={data.breve_descrizione}
                fotoAutoreUrl={data.foto_autore_url}
                citazione={data.citazione}
                dataOdierna={data.data_odierna}
                isDark={isDark}
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          <Card title={lingua === 'IT' ? 'Citazione' : 'Quote'} icon={Quote} isDark={isDark} className="md:col-span-2 animate-fadeInUp stagger-3"
            filename={`citazione-${data.autore_giorno.toLowerCase().replace(/\s+/g, '-')}` }>
            <blockquote className="md:px-8">
              <p className="medieval-box text-left text-2xl md:text-3xl italic leading-relaxed mb-6 font-medium">{data.citazione.testo}</p>
              <footer className="text-right text-lg clear-both pt-2">
                <span className="font-bold">{data.citazione.autore}</span>
                <span className={`${themeClasses.textMuted} italic font-medium`}> — {data.citazione.fonte}</span>
              </footer>
            </blockquote>
          </Card>

          <Card title={lingua === 'IT' ? 'Parola del Giorno' : 'Word of the Day'} icon={Type} isDark={isDark} className="animate-fadeInUp stagger-4"
            filename={`parola-${data.parola_giorno.parola.toLowerCase()}`}>
            <div className="text-center mb-6">
              <h4 className="text-4xl font-bold text-[#DE6B58] mb-2">{data.parola_giorno.parola}</h4>
              <p className={`${themeClasses.textMuted} italic font-medium text-lg`}>{data.parola_giorno.etimologia}</p>
            </div>
            <p className="text-xl font-medium mb-4"><strong className="font-bold">{lingua === 'IT' ? 'Definizione' : 'Definition'}:</strong> {data.parola_giorno.definizione}</p>
            {data.parola_giorno.esempio && data.parola_giorno.esempio.trim() !== '' && data.parola_giorno.esempio !== 'null' && (
              <p className={`text-lg font-medium italic ${themeClasses.highlightBg} p-4 rounded-xl border ${themeClasses.border}`}>&quot;{data.parola_giorno.esempio}&quot;</p>
            )}
          </Card>

          <Card title={lingua === 'IT' ? 'I Santi di Oggi' : "Today's Saints"} icon={Church} isDark={isDark} className="animate-fadeInUp stagger-4"
            filename="santi">
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
            <div className="md:col-span-2 notched-card-wrapper animate-fadeInUp stagger-5">
              <Card title={lingua === 'IT' ? 'Opera del Giorno' : 'Artwork of the Day'} icon={Palette} isDark={isDark} className="notched-card">
                <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
                  <div className="space-y-5 order-2 md:order-1">
                    <div>
                      <h4 className="text-3xl md:text-4xl font-bold leading-tight mb-2">{opera.titolo}</h4>
                      <p className="text-xl font-medium">{lingua === 'IT' ? 'di' : 'by'} <span className="font-bold">{opera.artista}</span>{opera.anno ? <span className={`${themeClasses.textMuted} italic`}> — {opera.anno}</span> : null}</p>
                    </div>
                    {(opera.medium || opera.dipartimento) && <p className={`text-lg ${themeClasses.textMuted} italic`}>{[opera.medium, opera.dipartimento].filter(Boolean).join(' · ')}</p>}
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <a href={opera.met_url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center justify-center gap-2 border-2 border-[#DE6B58] text-[#DE6B58] hover:bg-[#DE6B58] ${isDark ? 'hover:text-[#1E1E1E]' : 'hover:text-[#FDFCF8]'} transition-colors duration-300 px-6 py-3 rounded-full uppercase tracking-widest text-sm font-bold`}>
                        {lingua === 'IT' ? 'Vedi al museo' : 'View at the museum'}<ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  <div className="order-1 md:order-2">
                    <a href={opera.met_url} target="_blank" rel="noopener noreferrer" className="block group">
                      <img src={opera.immagine_url_hd || opera.immagine_url} alt={`${opera.titolo} by ${opera.artista}`} className={`w-full h-auto object-cover rounded-2xl border ${themeClasses.border} shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] transition-transform duration-500 group-hover:scale-[1.015]`} />
                    </a>
                    <p className={`text-sm ${themeClasses.textMuted} italic mt-3 text-center`}>{opera.museo}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <Card title={lingua === 'IT' ? 'Accadde Oggi' : 'This Day in History'} icon={CalendarDays} isDark={isDark} className="md:col-span-2 animate-fadeInUp stagger-6"
            filename="avvenimenti">
            <ul className="space-y-4">
              {data.avvenimenti.map((evento, idx) => {
                const parts = evento.split(':');
                return (
                  <li key={idx} className="flex gap-4 text-xl font-medium leading-relaxed">
                    <span className="text-[#DE6B58] font-bold">•</span>
                    <span>{parts.length > 1 ? (<><strong className="font-bold">{parts[0]}:</strong>{parts.slice(1).join(':')}</>) : evento}</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title={lingua === 'IT' ? 'Poesia del giorno' : 'Poem of the Day'} icon={Feather} isDark={isDark} className="animate-fadeInUp stagger-7"
            filename={`poesia-${data.poesia.autore.toLowerCase().replace(/\s+/g, '-')}` }>
            <div className="medieval-box whitespace-pre-wrap text-xl font-medium leading-relaxed italic mb-6">{data.poesia.testo}</div>
            <div className={`text-left border-t ${themeClasses.border} pt-4 mb-6`}>
              <p className="font-bold text-xl">{data.poesia.autore}</p>
              <p className={`${themeClasses.textMuted} font-medium italic`}>{data.poesia.fonte}</p>
            </div>
            {data.poesia.nota && (
              <div className={`mt-4 p-4 ${themeClasses.highlightBg} border-l-2 border-[#DE6B58] text-lg font-medium ${isDark ? 'text-[#C0C0C0]' : 'text-[#4A433F]'} rounded-xl`}>
                <span className="font-bold text-[#DE6B58] text-xs tracking-widest uppercase block mb-1">{lingua === 'IT' ? 'Perché questa scelta' : 'Why this choice'}</span>
                {data.poesia.nota}
              </div>
            )}
          </Card>

          <Card title={lingua === 'IT' ? 'Passaggio biblico del giorno' : 'Biblical Passage of the Day'} icon={BookOpen} isDark={isDark} className="animate-fadeInUp stagger-7"
            filename="bibbia">
            <div className="medieval-box whitespace-pre-wrap text-xl font-medium leading-relaxed mb-6">{data.bibbia.testo}</div>
            <div className={`text-left border-t ${themeClasses.border} pt-4 mb-6`}>
              <p className={`${themeClasses.textMuted} italic font-bold`}>{data.bibbia.fonte}</p>
            </div>
            {data.bibbia.nota && (
              <div className={`mt-4 p-4 ${themeClasses.highlightBg} border-l-2 border-[#DE6B58] text-lg font-medium ${isDark ? 'text-[#C0C0C0]' : 'text-[#4A433F]'} rounded-xl`}>
                <span className="font-bold text-[#DE6B58] text-xs tracking-widest uppercase block mb-1">{lingua === 'IT' ? 'Il senso del passaggio' : 'The meaning of the passage'}</span>
                {data.bibbia.nota}
              </div>
            )}
          </Card>

          {/* ── CONSIGLIO MUSICALE ──
              Layout: Card senza titolo nell'header.
              Internamente 2 colonne su desktop:
                sinistra  → solo copertina vinile (centrata verticalmente in modo naturale)
                destra    → titolo sezione + tutto il contenuto, allineato a sinistra
          */}
          <Card
            isDark={isDark}
            className="md:col-span-2 animate-fadeInUp stagger-8"
            filename={`musica-${data.musica.brano.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`}
          >
            <div className="flex flex-col md:flex-row gap-10 items-stretch">

              {/* Colonna sinistra: copertina vinile centrata verticalmente */}
              <div className="flex items-center justify-center flex-shrink-0 select-none" aria-hidden="true">
                <div
                  className="relative"
                  style={{ width: '240px', height: '240px' }}
                >
                  {/* Disco vinile */}
                  <svg
                    viewBox="0 0 240 240"
                    className="absolute inset-0 w-full h-full"
                    style={{
                      zIndex: 0,
                      filter: 'drop-shadow(3px 3px 12px rgba(0,0,0,0.6))',
                      transform: vinylOpen ? 'translateX(72px)' : 'translateX(0)',
                      transition: 'transform 700ms ease-in-out',
                    }}
                  >
                    <defs>
                      <radialGradient id="vinyl-dark" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#262626" />
                        <stop offset="40%" stopColor="#111111" />
                        <stop offset="100%" stopColor="#1c1c1c" />
                      </radialGradient>
                      <radialGradient id="vinyl-label" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={isDark ? '#4a3828' : '#d4b896'} />
                        <stop offset="100%" stopColor={isDark ? '#2e2018' : '#b09070'} />
                      </radialGradient>
                    </defs>
                    <circle cx="120" cy="120" r="118" fill="url(#vinyl-dark)" />
                    {[46, 56, 67, 76, 84, 92, 99, 105, 109, 113].map((r, i) => (
                      <circle key={i} cx="120" cy="120" r={r}
                        fill="none" stroke="#2e2e2e" strokeWidth="0.6" opacity="0.7" />
                    ))}
                    <ellipse cx="90" cy="72" rx="35" ry="13" fill="white" opacity="0.035"
                      transform="rotate(-35 90 72)" />
                    <circle cx="120" cy="120" r="34" fill="url(#vinyl-label)" />
                    <circle cx="120" cy="120" r="4.5" fill="#0a0a0a" />
                    <text x="120" y="114" textAnchor="middle" fontSize="6.5"
                      fill={isDark ? '#e8d4b4' : '#5a3a1a'} fontFamily="Georgia, serif" fontStyle="italic">
                      {data.musica.autore.slice(0, 16)}
                    </text>
                    <text x="120" y="126" textAnchor="middle" fontSize="5.5"
                      fill={isDark ? '#c4a878' : '#7a5a3a'} fontFamily="Georgia, serif">
                      {data.musica.brano.slice(0, 18)}
                    </text>
                  </svg>

                  {/* Sleeve — hover solo qui */}
                  <div
                    className="absolute inset-0 rounded-sm overflow-hidden cursor-pointer"
                    style={{
                      zIndex: 10,
                      boxShadow: '0 6px 28px rgba(0,0,0,0.32)',
                      transform: vinylOpen ? 'translateX(-4px)' : 'translateX(0)',
                      transition: 'transform 700ms ease-in-out',
                    }}
                    onMouseEnter={() => setVinylOpen(true)}
                    onMouseLeave={() => setVinylOpen(false)}
                  >
                    {vinylCover ? (
                      <img
                        src={vinylCover}
                        alt={`${data.musica.brano} cover`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-[#2A2A2A]' : 'bg-[#DDD5C4]'}`}>
                        <Music className={`w-16 h-16 ${isDark ? 'text-[#555]' : 'text-[#A09080]'}`} />
                      </div>
                    )}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <filter id="grain-vintage">
                        <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" stitchTiles="stitch" result="noise" />
                        <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
                        <feBlend in="SourceGraphic" in2="gray" mode="soft-light" result="blended" />
                        <feComponentTransfer in="blended"><feFuncA type="linear" slope="1" /></feComponentTransfer>
                      </filter>
                      <rect width="100%" height="100%" filter="url(#grain-vintage)" opacity="0.28" />
                    </svg>
                    <div
                      className="absolute inset-0 pointer-events-none rounded-sm"
                      style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.28) 100%)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Colonna destra: titolo sezione + contenuto, tutto allineato a sinistra */}
              <div className="flex-1 flex flex-col justify-center text-center md:text-left">
                {/* Titolo sezione (rimpiazza l'header della Card) */}
                <div className="flex items-center gap-2 mb-5">
                  <Music className="w-5 h-5 text-[#DE6B58] flex-shrink-0" />
                  <h3 className={`text-sm font-bold tracking-[0.2em] uppercase ${themeClasses.textMuted}`}>
                    {lingua === 'IT' ? 'Consiglio Musicale' : 'Musical Recommendation'}
                  </h3>
                </div>

                <h4 className="text-3xl font-bold mb-2">{data.musica.brano}</h4>
                <p className="text-xl font-medium mb-2">
                  {lingua === 'IT' ? 'di' : 'by'}{' '}
                  <span className="font-bold">{data.musica.autore}</span>
                </p>
                <p className="text-[#DE6B58] font-medium italic mb-6">{data.musica.genere}</p>
                <p className="text-xl font-medium leading-relaxed mb-8">{data.musica.motivo}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                  <a
                    href={`https://open.spotify.com/search/${encodeURIComponent(data.musica.chiave_ricerca)}`}
                    target="_blank" rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center border-2 border-[#DE6B58] text-[#DE6B58] hover:bg-[#DE6B58] ${isDark ? 'hover:text-[#1E1E1E]' : 'hover:text-[#FDFCF8]'} transition-colors duration-300 px-8 py-3 rounded-full uppercase tracking-widest text-sm font-bold w-full sm:w-auto`}
                  >
                    {lingua === 'IT' ? 'Ascolta su Spotify' : 'Listen on Spotify'}
                  </a>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(data.musica.chiave_ricerca)}`}
                    target="_blank" rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center border-2 border-[#DE6B58] text-[#DE6B58] hover:bg-[#DE6B58] ${isDark ? 'hover:text-[#1E1E1E]' : 'hover:text-[#FDFCF8]'} transition-colors duration-300 px-8 py-3 rounded-full uppercase tracking-widest text-sm font-bold w-full sm:w-auto`}
                  >
                    {lingua === 'IT' ? 'Ascolta su YouTube' : 'Listen on YouTube'}
                  </a>
                </div>
              </div>

            </div>
          </Card>

        </div>

        <footer className={`text-center pt-16 pb-8 ${themeClasses.textMuted} font-medium`}>
          <div className="flex flex-col items-center justify-center gap-6">
            <p className="text-lg italic tracking-wide">Made with love by Antonello</p>
            <div className="flex items-center justify-center gap-6">
              <a href="https://x.com/antonello23" target="_blank" rel="noopener noreferrer" className={`p-3 rounded-full border ${themeClasses.border} hover:border-[#DE6B58] hover:text-[#DE6B58] transition-all duration-300 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${isDark ? 'bg-[#2A2A2A]/50' : 'bg-[#FDFCF8]/50'}`} aria-label="X (Twitter)"><XIcon className="w-5 h-5" /></a>
              <a href="https://www.instagram.com/antonelloan23/" target="_blank" rel="noopener noreferrer" className={`p-3 rounded-full border ${themeClasses.border} hover:border-[#DE6B58] hover:text-[#DE6B58] transition-all duration-300 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${isDark ? 'bg-[#2A2A2A]/50' : 'bg-[#FDFCF8]/50'}`} aria-label="Instagram"><InstagramIcon className="w-5 h-5" /></a>
              <a href="https://buymeacoffee.com/antonello23" target="_blank" rel="noopener noreferrer" className={`p-3 rounded-full border ${themeClasses.border} hover:border-[#DE6B58] hover:text-[#DE6B58] transition-all duration-300 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${isDark ? 'bg-[#2A2A2A]/50' : 'bg-[#FDFCF8]/50'}`} aria-label="Buy Me a Coffee"><CoffeeIcon className="w-5 h-5" /></a>
            </div>
          </div>
        </footer>

      </main>

      {/* Portal archivio */}
      {isMounted && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Archivio dei giorni"
          className={`fixed z-[9999] rounded-2xl border shadow-[0_8px_32px_-4px_rgba(0,0,0,0.22)] flex flex-col overflow-hidden ${garamond.className} ${themeClasses.popoverBgClass} ${themeClasses.popoverBorder}`}
          style={{
            top: `${popoverPos.top}px`,
            right: `${popoverPos.right}px`,
            width: '320px',
            maxWidth: 'calc(100vw - 32px)',
            transformOrigin: 'top right',
            transition: 'opacity 180ms cubic-bezier(0.16,1,0.3,1), transform 180ms cubic-bezier(0.16,1,0.3,1)',
            opacity: popoverOpen ? 1 : 0,
            transform: popoverOpen ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(-6px)',
            pointerEvents: popoverOpen ? 'auto' : 'none',
            maxHeight: '380px',
            height: 'auto',
          }}
        >
          <svg width="20" height="10" viewBox="0 0 20 10" className="absolute -top-[9px] right-[11px]" style={{ filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.07))' }}>
            <path d="M0 10 L10 0 L20 10" fill={themeClasses.popoverArrowFill} stroke={themeClasses.popoverArrowStroke} strokeWidth="1" />
          </svg>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${themeClasses.popoverBorder} flex-shrink-0`}>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#DE6B58]" />
              <span className="font-bold tracking-widest uppercase text-sm text-[#DE6B58]">Archivio</span>
            </div>
            <button onClick={() => setPopoverOpen(false)} className={`p-1 rounded-full ${themeClasses.textMuted} hover:text-[#DE6B58] transition-colors`} aria-label="Chiudi archivio"><X className="w-4 h-4" /></button>
          </div>
          {dataSelezionata && dataSelezionata !== oggi && (
            <div className={`px-4 py-2 border-b ${themeClasses.popoverBorder} flex-shrink-0`}>
              <button onClick={() => caricaGiorno(null)} className="inline-flex items-center gap-1 text-xs text-[#DE6B58] hover:underline font-medium"><ChevronLeft className="w-3.5 h-3.5" />Torna a oggi</button>
            </div>
          )}
          <div className="relative flex-1 min-h-0">
            <div ref={archivioScrollRef} onScroll={checkArchivioScroll} className="overflow-y-auto h-full px-3 py-3" style={{ maxHeight: '300px' }}>
              {archivio.length === 0 ? (
                <p className={`text-xs italic ${themeClasses.textMuted} text-center mt-6`}>Nessun giorno in archivio.</p>
              ) : (
                Object.entries(groupedArchivio).map(([mese, items]) => (
                  <div key={mese} className="mb-4">
                    <p className={`text-xs font-bold tracking-widest uppercase ${themeClasses.textMuted} mb-2 px-1`}>{mese}</p>
                    <ul className="space-y-0.5">
                      {items.map(item => {
                        const isOggi = item.data === oggi;
                        const isSelezionato = item.data === dataSelezionata;
                        return (
                          <li key={item.data}>
                            <button onClick={() => { if (!isSelezionato) caricaGiorno(item.data); else setPopoverOpen(false); }}
                              className={`w-full text-left px-3 py-4 rounded-xl transition-colors flex items-center gap-4 ${
                                isSelezionato ? 'bg-[#DE6B58]/15 text-[#DE6B58]' : isDark ? 'hover:bg-white/5 text-[#E0E0E0]' : 'hover:bg-[#2A2522]/5 text-[#2A2522]'
                              }`}>
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOggi ? 'bg-[#DE6B58]' : isDark ? 'bg-[#555]' : 'bg-[#C8B89A]'}`} />
                              <span className="flex-1 min-w-0">
                                <span className="text-lg font-bold block truncate">{item.autore_giorno}</span>
                                <span className={`text-sm ${isSelezionato ? 'text-[#DE6B58]/70' : themeClasses.textMuted}`}>{formatDataItaliana(item.data)}{isOggi ? ' · oggi' : ''}</span>
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
            {archivioHasScroll && !archivioAtBottom && (
              <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 rounded-b-2xl" style={{ background: themeClasses.fadeGradient }} />
            )}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
