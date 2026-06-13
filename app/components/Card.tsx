'use client';

import { useRef, useState, useCallback } from 'react';
import localFont from 'next/font/local';
import { Download } from 'lucide-react';

const stampwriter = localFont({
  src: '../../public/fonts/STAMPWRITER-KIT.ttf',
  display: 'swap',
  preload: true,
  fallback: ['Courier New', 'monospace'],
});

const badgeVariants: Record<string, string> = {
  citazione: 'badge-tilt-right',
  parola: 'badge-tilt-left',
  santi: 'badge-tilt-right',
  opera: 'badge-tilt-left',
  avvenimenti: 'badge-tilt-right',
  poesia: 'badge-tilt-left',
  bibbia: 'badge-tilt-right',
};

interface CardProps {
  id?: string;
  title?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  isDark: boolean;
  children: React.ReactNode;
  className?: string;
  filename?: string;
}

export default function Card({ id, title, icon: Icon, isDark, children, className = '', filename }: CardProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!sectionRef.current || exporting) return;
    setExporting(true);
    try {
      await document.fonts.ready;
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(sectionRef.current, {
        pixelRatio: 2,
        filter: (node) =>
          !(node instanceof HTMLElement && node.dataset.exportIgnore),
      });
      const link = document.createElement('a');
      link.download = `taccuino-${filename ?? 'card'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Errore export card:', err);
    } finally {
      setExporting(false);
    }
  }, [exporting, filename]);

  return (
    <div id={id} className={className}>
      <section
        ref={sectionRef}
        className={`${
          isDark ? 'bg-[#2A2A2A]/90 border-white/10' : 'bg-[#FDFCF8] border-[#EBE5DB]'
        } border rounded-2xl p-6 md:p-8 card-paper-shadow relative group h-full ${id ? `card-section-${id}` : ''}`}
      >
        {filename && (
          <button
            data-export-ignore
            onClick={handleExport}
            disabled={exporting}
            aria-label="Scarica come immagine"
            title="Scarica come immagine"
            className={`card-export-button ${isDark ? 'is-dark' : ''}`}
          >
            {exporting ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {title && (
          <div className="card-section-heading flex items-center justify-center">
            <h3 className={`${stampwriter.className} section-typewriter-badge ${id ? badgeVariants[id] ?? '' : ''} text-sm text-center m-0`}>
              {Icon && <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />}
              <span>{title}</span>
            </h3>
          </div>
        )}
        <div className={`card-content ${isDark ? 'text-[#E0E0E0]' : 'text-[#2A2522]'}`}>{children}</div>
      </section>
    </div>
  );
}
