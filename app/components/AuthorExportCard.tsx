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

  const bg = '#F4F0E6';
  const textPrimary = '#2A2522';
  const textMuted = '#8A817C';
  const accent = '#DE6B58';
  const cardBg = '#FDFCF8';
  const borderColor = '#EBE5DB';

  return (
    <div className="relative group">
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
          padding: '16px 24px 16px',
          boxSizing: 'border-box',
          border: `1px solid ${borderColor}`,
          borderRadius: '16px',
          margin: '0 auto',
        }}
      >
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <div
            className={caveat.className}
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: textMuted,
              background: '#e8dcc6',
              padding: '4px 20px 6px',
              borderRadius: '2px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              transform: 'rotate(-1.2deg)',
              lineHeight: 1,
            }}
          >
            {dataOdierna}
          </div>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: accent,
            marginBottom: '6px',
          }}
        >
          Autore del Giorno
        </span>

        {fotoAutoreUrl && (
          <div
            style={{
              transform: 'rotate(-2deg)',
              marginBottom: '12px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                padding: '8px 8px 20px 8px',
                boxShadow: '0 4px 16px -4px rgba(0,0,0,0.18)',
              }}
            >
              <img
                src={fotoAutoreUrl}
                alt={autoreGiorno}
                crossOrigin="anonymous"
                style={{
                  display: 'block',
                  width: '104px',
                  height: '132px',
                  objectFit: 'cover',
                  filter: 'grayscale(100%) contrast(90%) brightness(1.05)',
                }}
              />
            </div>
          </div>
        )}

        <h2
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: textPrimary,
            textAlign: 'center',
            margin: '0 0 6px',
            lineHeight: 1.1,
          }}
        >
          {autoreGiorno}
        </h2>

        <p
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: textMuted,
            textAlign: 'center',
            margin: '0 0 10px',
            lineHeight: 1.45,
            maxWidth: '290px',
          }}
        >
          {breveDescrizione}
        </p>

        <div
          style={{
            width: '56px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            marginBottom: '10px',
            flexShrink: 0,
          }}
        />

        <div
          style={{
            width: '100%',
            padding: '12px 14px',
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '10px',
            boxSizing: 'border-box',
            marginTop: 'auto',
          }}
        >
          <span
            style={{
              fontSize: '30px',
              lineHeight: 1,
              color: accent,
              opacity: 0.35,
              fontFamily: 'Georgia, serif',
              display: 'block',
              marginBottom: '2px',
            }}
          >
            &ldquo;
          </span>
          <p
            style={{
              fontSize: '13px',
              fontStyle: 'italic',
              fontWeight: 500,
              color: textPrimary,
              lineHeight: 1.55,
              margin: '0 0 8px',
            }}
          >
            {citazione.testo}
          </p>
          <p
            style={{
              fontSize: '10px',
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
      </div>
    </div>
  );
}
