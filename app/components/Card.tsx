'use client';

import { useRef, useState, useCallback } from 'react';
import { Download } from 'lucide-react';

interface CardProps {
  title: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  isDark: boolean;
  children: React.ReactNode;
  className?: string;
  filename?: string;
}

export default function Card({ title, icon: Icon, isDark, children, className = '', filename }: CardProps) {
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

  // Le classi di animazione (animate-fadeInUp, stagger-N) vengono applicate
  // al wrapper esterno, NON alla section con card-paper-shadow.
  // Questo evita che opacity/translate animati creino uno stacking context
  // che rompe i ::before/::after con z-index: -1 delle ombre.
  return (
    <div className={className}>
      <section
        ref={sectionRef}
        className={`${
          isDark ? 'bg-[#2A2A2A] border-[#3D3D3D]' : 'bg-[#FDFCF8] border-[#EBE5DB]'
        } border rounded-2xl p-6 md:p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-colors duration-300 card-paper-shadow relative group h-full`}
      >
        {filename && (
          <button
            data-export-ignore
            onClick={handleExport}
            disabled={exporting}
            aria-label="Scarica come immagine"
            title="Scarica come immagine"
            className={`
              absolute top-3 right-3 z-10
              p-1.5 rounded-lg
              opacity-0 group-hover:opacity-100
              transition-opacity duration-200
              disabled:cursor-not-allowed
              ${
                isDark
                  ? 'bg-[#2A2A2A] border border-[#3D3D3D] text-[#A0A0A0] hover:text-[#DE6B58] hover:border-[#DE6B58]'
                  : 'bg-[#FDFCF8] border border-[#EBE5DB] text-[#8A817C] hover:text-[#DE6B58] hover:border-[#DE6B58]'
              }
            `}
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

        <div className="flex items-center justify-center gap-2 mb-6">
          {Icon && <Icon className="w-5 h-5 text-[#DE6B58]" strokeWidth={1.5} />}
          <h3 className="text-[#DE6B58] text-sm font-bold tracking-[0.2em] uppercase text-center m-0">{title}</h3>
        </div>
        <div className={isDark ? 'text-[#E0E0E0]' : 'text-[#2A2522]'}>{children}</div>
      </section>
    </div>
  );
}
