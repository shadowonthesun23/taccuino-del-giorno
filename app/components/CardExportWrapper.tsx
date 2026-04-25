'use client';

import { useRef, useState, useCallback } from 'react';
import { Download } from 'lucide-react';

interface CardExportWrapperProps {
  children: React.ReactNode;
  filename?: string;
  isDark: boolean;
  className?: string;
}

export default function CardExportWrapper({ children, filename = 'card', isDark, className = '' }: CardExportWrapperProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    try {
      await document.fonts.ready;
      const { toJpeg } = await import('html-to-image');
      const dataUrl = await toJpeg(cardRef.current, {
        quality: 0.94,
        pixelRatio: 2,
        backgroundColor: isDark ? '#1E1E1E' : '#F4F0E6',
        style: { borderRadius: '0' },
        filter: (node) => {
          if (node instanceof HTMLElement && node.dataset.exportIgnore) return false;
          return true;
        },
      });
      const link = document.createElement('a');
      link.download = `taccuino-${filename}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Errore export card:', err);
    } finally {
      setExporting(false);
    }
  }, [exporting, filename, isDark]);

  return (
    <div className={`relative group ${className}`}>
      <button
        data-export-ignore="true"
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
          ${isDark
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

      <div
        ref={cardRef}
        style={{
          backgroundImage: `url('/beige-paper.png')`,
          backgroundRepeat: 'repeat',
          backgroundColor: isDark ? '#1E1E1E' : '#F4F0E6',
          padding: '2px',
        }}
      >
        {children}
      </div>
    </div>
  );
}
