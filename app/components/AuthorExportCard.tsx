'use client';

import { useRef, useState } from 'react';
import { EB_Garamond, Caveat } from 'next/font/google';
import { Download, Loader2 } from 'lucide-react';

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

interface AuthorExportCardProps {
  autoreGiorno: string;
  breveDescrizione: string;
  fotoAutoreUrl?: string | null;
  citazione: { testo: string; autore: string; fonte: string };
  dataOdierna: string;
  isDark: boolean;
}

export default function AuthorExportCard({
  autoreGiorno,
  breveDescrizione,
  fotoAutoreUrl,
  citazione,
  dataOdierna,
  isDark,
}: AuthorExportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement('a');
      const nomeFile = autoreGiorno
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      link.download = `taccuino-${nomeFile}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.93);
      link.click();
    } catch (e) {
      console.error('Errore durante l\'export:', e);
    } finally {
      setExporting(false);
    }
  };

  // Colori statici per la card export (sempre in tema chiaro per leggibilità su social)
  const bg = '#F4F0E6';
  const textPrimary = '#2A2522';
  const textMuted = '#8A817C';
  const accent = '#DE6B58';
  const cardBg = '#FDFCF8';
  const borderColor = '#EBE5DB';

  return (
    <div className="relative group">
      {/* Bottone export — visibile sopra la card */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handleExport}
          disabled={exporting}
          title="Esporta come immagine"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-bold tracking-widest uppercase transition-all"
          style={{
            borderColor: accent,
            color: accent,
            background: 'transparent',
            opacity: exporting ? 0.6 : 1,
            cursor: exporting ? 'wait' : 'pointer',
          }}
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {exporting ? 'Esportando...' : 'Salva come immagine'}
        </button>
      </div>

      {/* ———————————————————————————————————————————
          CARD CHE VIENE FOTOGRAFATA — proporzione 9:16
          Larghezza fissa 360px → altezza 640px
      ——————————————————————————————————————————— */}
      <div
        ref={cardRef}
        className={garamond.className}
        style={{
          width: '360px',
          height: '640px',
          background: bg,
          backgroundImage: 'url("/beige-paper.png")',
          backgroundRepeat: 'repeat',
          backgroundBlendMode: 'multiply',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '28px 24px 20px',
          boxSizing: 'border-box',
          border: `1px solid ${borderColor}`,
          borderRadius: '16px',
          margin: '0 auto',
        }}
      >
        {/* Logo / intestazione */}
        <div style={{ width: '100%', textAlign: 'center', marginBottom: '12px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            Il Taccuino del Giorno
          </span>
          <span
            className={caveat.className}
            style={{
              display: 'block',
              fontSize: '13px',
              color: textMuted,
              marginTop: '2px',
            }}
          >
            {dataOdierna}
          </span>
        </div>

        {/* Divisore sottile */}
        <div style={{ width: '40px', height: '1px', background: borderColor, marginBottom: '16px' }} />

        {/* Etichetta */}
        <span
          style={{
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: accent,
            marginBottom: '10px',
          }}
        >
          Autore del Giorno
        </span>

        {/* Diapositiva fotografica */}
        {fotoAutoreUrl && (
          <div
            style={{
              transform: 'rotate(-2deg)',
              marginBottom: '14px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                padding: '8px 8px 22px 8px',
                boxShadow: '0 4px 16px -4px rgba(0,0,0,0.18)',
              }}
            >
              <img
                src={fotoAutoreUrl}
                alt={autoreGiorno}
                crossOrigin="anonymous"
                style={{
                  display: 'block',
                  width: '110px',
                  height: '140px',
                  objectFit: 'cover',
                  filter: 'grayscale(100%) contrast(90%) brightness(1.05)',
                }}
              />
            </div>
          </div>
        )}

        {/* Nome autore */}
        <h2
          style={{
            fontSize: '26px',
            fontWeight: 700,
            color: textPrimary,
            textAlign: 'center',
            margin: '0 0 8px',
            lineHeight: 1.2,
          }}
        >
          {autoreGiorno}
        </h2>

        {/* Biografia breve */}
        <p
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: textMuted,
            textAlign: 'center',
            margin: '0 0 16px',
            lineHeight: 1.5,
            maxWidth: '290px',
          }}
        >
          {breveDescrizione}
        </p>

        {/* Divisore decorativo */}
        <div
          style={{
            width: '60px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            marginBottom: '16px',
            flexShrink: 0,
          }}
        />

        {/* Citazione */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: '100%',
            padding: '14px 16px',
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '10px',
            boxSizing: 'border-box',
          }}
        >
          {/* Virgolette decorative */}
          <span
            style={{
              fontSize: '36px',
              lineHeight: 1,
              color: accent,
              opacity: 0.4,
              fontFamily: 'Georgia, serif',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            &ldquo;
          </span>
          <p
            style={{
              fontSize: '14px',
              fontStyle: 'italic',
              fontWeight: 500,
              color: textPrimary,
              lineHeight: 1.65,
              margin: '0 0 10px',
              flexGrow: 1,
            }}
          >
            {citazione.testo}
          </p>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: textMuted,
              textAlign: 'right',
              margin: 0,
            }}
          >
            — {citazione.autore}
            {citazione.fonte ? (
              <span style={{ fontWeight: 400, fontStyle: 'italic' }}>, {citazione.fonte}</span>
            ) : null}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '14px',
            fontSize: '9px',
            letterSpacing: '0.15em',
            color: textMuted,
            opacity: 0.6,
            textTransform: 'uppercase',
          }}
        >
          taccuinodelgiorno.vercel.app
        </div>
      </div>
    </div>
  );
}
