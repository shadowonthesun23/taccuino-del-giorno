'use client';

import { useEffect, useState } from 'react';
import { EB_Garamond } from 'next/font/google';

// Importazione del font EB Garamond ottimizzato per Next.js
const garamond = EB_Garamond({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

// Texture rumore/carta SVG (Base64)
const paperTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.06'/%3E%3C/svg%3E")`;

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
const Card = ({ title, children, className = "" }: { title: string, children: React.ReactNode, className?: string }) => (
  <section className={`bg-[#FDFCF8] border border-[#EBE5DB] rounded-2xl p-6 md:p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] ${className}`}>
    <h3 className="text-[#DE6B58] text-sm font-semibold tracking-[0.2em] uppercase mb-6 text-center">
      {title}
    </h3>
    <div className="text-[#2A2522]">
      {children}
    </div>
  </section>
);

export default function Home() {
  const [data, setData] = useState<DatiTaccuino | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  if (loading) return (
    <div className={`min-h-screen bg-[#F4F0E6] flex items-center justify-center ${garamond.className} relative`}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: paperTexture }}></div>
      <div className="text-[#DE6B58] text-xl animate-pulse tracking-widest uppercase relative z-10">Apertura del taccuino...</div>
    </div>
  );

  if (error) return (
    <div className={`min-h-screen bg-[#F4F0E6] flex items-center justify-center ${garamond.className} p-4 relative`}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: paperTexture }}></div>
      <div className="bg-[#FDFCF8] border border-[#EBE5DB] p-8 max-w-lg text-center rounded-2xl relative z-10">
        <p className="text-[#2A2522] text-xl mb-4">Il taccuino di oggi non è ancora stato compilato.</p>
        <p className="text-sm text-[#8A817C] italic">{error}</p>
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className={`min-h-screen bg-[#F4F0E6] text-[#2A2522] ${garamond.className} py-12 px-4 md:px-8 selection:bg-[#DE6B58] selection:text-[#FDFCF8] relative`}>
      {/* Overlay Texture Carta */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: paperTexture }}></div>
      
      <main className="max-w-4xl mx-auto space-y-12 relative z-10">
        
        {/* Intestazione */}
        <header className="text-center space-y-6 pb-10 border-b border-[#EBE5DB]">
          <p className="text-lg italic text-[#8A817C]">{data.data_odierna}</p>
          <h1 className="text-5xl md:text-6xl font-normal text-[#2A2522] tracking-tight">
            Il Taccuino del Giorno
          </h1>
        </header>

        {/* Autore del Giorno (Hero Section) */}
        <section className="text-center space-y-4 py-8">
          <span className="text-[#DE6B58] text-sm font-semibold tracking-[0.2em] uppercase">
            Autore del Giorno
          </span>
          <h2 className="text-4xl md:text-5xl font-medium mt-2 mb-6">
            {data.autore_giorno}
          </h2>
          <p className="text-xl md:text-2xl leading-relaxed max-w-2xl mx-auto text-[#4A433F]">
            {data.breve_descrizione}
          </p>
        </section>

        {/* Griglia Contenuti */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Citazione - Spazia su due colonne */}
          <Card title="Citazione" className="md:col-span-2">
            <blockquote className="text-center">
              <span className="text-6xl text-[#DE6B58]/30 leading-none block mb-[-20px]">"</span>
              <p className="text-2xl md:text-3xl italic leading-relaxed mb-6">
                {data.citazione.testo}
              </p>
              <footer className="text-lg">
                <span className="font-semibold">{data.citazione.autore}</span>
                <span className="text-[#8A817C] italic"> — {data.citazione.fonte}</span>
              </footer>
            </blockquote>
          </Card>

          {/* Parola del Giorno */}
          <Card title="Parola del Giorno">
            <div className="text-center mb-6">
              <h4 className="text-4xl font-medium text-[#DE6B58] mb-2">{data.parola_giorno.parola}</h4>
              <p className="text-[#8A817C] italic text-lg">{data.parola_giorno.etimologia}</p>
            </div>
            <p className="text-xl mb-4"><strong className="font-semibold">Definizione:</strong> {data.parola_giorno.definizione}</p>
            <p className="text-lg italic bg-[#F4F0E6]/50 p-4 rounded-xl border border-[#EBE5DB]/50">
              "{data.parola_giorno.esempio}"
            </p>
          </Card>

          {/* Santi */}
          <Card title="I Santi di Oggi">
            <ul className="space-y-6">
              {data.santi.map((santo, idx) => (
                <li key={idx} className="border-b border-[#EBE5DB]/50 last:border-0 pb-4 last:pb-0">
                  <h4 className="text-2xl font-medium mb-1">{santo.nome}</h4>
                  <p className="text-[#DE6B58] italic mb-2">{santo.ruolo} ({santo.anni})</p>
                  <p className="text-lg leading-relaxed">{santo.biografia}</p>
                </li>
              ))}
            </ul>
          </Card>

          {/* Avvenimenti - Spazia su due colonne */}
          <Card title="Accadde Oggi" className="md:col-span-2">
            <ul className="space-y-4">
              {data.avvenimenti.map((evento, idx) => {
                const parts = evento.split(':');
                return (
                  <li key={idx} className="flex gap-4 text-xl leading-relaxed">
                    <span className="text-[#DE6B58]">•</span>
                    <span>
                      {parts.length > 1 ? (
                        <>
                          <strong className="font-semibold">{parts[0]}:</strong>
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
          <Card title="Poesia del giorno">
            <div className="whitespace-pre-wrap text-xl leading-loose italic mb-6">
              {data.poesia.testo}
            </div>
            <div className="text-right border-t border-[#EBE5DB]/50 pt-4 mb-6">
              <p className="font-semibold text-xl">{data.poesia.autore}</p>
              <p className="text-[#8A817C] italic">{data.poesia.fonte}</p>
            </div>
            {data.poesia.nota && (
              <div className="mt-4 p-4 bg-[#F4F0E6]/60 border-l-2 border-[#DE6B58] text-lg text-[#4A433F] rounded-xl">
                <span className="font-semibold text-[#DE6B58] text-xs tracking-widest uppercase block mb-1">Perché questa scelta</span>
                {data.poesia.nota}
              </div>
            )}
          </Card>

          {/* Bibbia */}
          <Card title="Passaggio biblico del giorno">
            <div className="whitespace-pre-wrap text-xl leading-relaxed mb-6">
              {data.bibbia.testo}
            </div>
            <div className="text-right border-t border-[#EBE5DB]/50 pt-4 mb-6">
              <p className="text-[#8A817C] italic font-semibold">{data.bibbia.fonte}</p>
            </div>
            {data.bibbia.nota && (
              <div className="mt-4 p-4 bg-[#F4F0E6]/60 border-l-2 border-[#DE6B58] text-lg text-[#4A433F] rounded-xl">
                <span className="font-semibold text-[#DE6B58] text-xs tracking-widest uppercase block mb-1">Il senso del passaggio</span>
                {data.bibbia.nota}
              </div>
            )}
          </Card>

          {/* Musica - Spazia su due colonne */}
          <Card title="Consiglio Musicale" className="md:col-span-2 text-center">
            <div className="max-w-2xl mx-auto">
              <h4 className="text-3xl font-medium mb-2">{data.musica.brano}</h4>
              <p className="text-xl mb-2">di <span className="font-semibold">{data.musica.autore}</span></p>
              <p className="text-[#DE6B58] italic mb-6">{data.musica.genere}</p>
              <p className="text-xl leading-relaxed mb-8">
                {data.musica.motivo}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <a 
                  href={`https://open.spotify.com/search/${encodeURIComponent(data.musica.chiave_ricerca)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center border border-[#DE6B58] text-[#DE6B58] hover:bg-[#DE6B58] hover:text-[#FDFCF8] transition-colors duration-300 px-8 py-3 rounded-full uppercase tracking-widest text-sm font-semibold w-full sm:w-auto"
                >
                  Ascolta su Spotify
                </a>
                <a 
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(data.musica.chiave_ricerca)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center border border-[#DE6B58] text-[#DE6B58] hover:bg-[#DE6B58] hover:text-[#FDFCF8] transition-colors duration-300 px-8 py-3 rounded-full uppercase tracking-widest text-sm font-semibold w-full sm:w-auto"
                >
                  Ascolta su YouTube
                </a>
              </div>
            </div>
          </Card>

        </div>
        
        {/* Footer */}
        <footer className="text-center pt-12 pb-6 text-[#8A817C] text-sm">
          <p>Compilato automaticamente — {data.data_odierna}</p>
        </footer>
      </main>
    </div>
  );
}
