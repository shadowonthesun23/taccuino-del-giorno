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

const SOCIAL_EXPORT_WIDTH = 1080;
const SOCIAL_EXPORT_HEIGHT = 1920;

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
    let exportFrame: HTMLDivElement | null = null;

    try {
      await document.fonts.ready;
      const { toPng } = await import('html-to-image');

      const source = sectionRef.current;
      const sourceStyle = window.getComputedStyle(source);
      const sourceFontFamily = sourceStyle.fontFamily;
      const clone = source.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[data-export-ignore]').forEach((node) => node.remove());

      exportFrame = document.createElement('div');
      exportFrame.style.position = 'fixed';
      exportFrame.style.left = '0';
      exportFrame.style.top = '0';
      exportFrame.style.width = `${SOCIAL_EXPORT_WIDTH}px`;
      exportFrame.style.height = `${SOCIAL_EXPORT_HEIGHT}px`;
      exportFrame.style.boxSizing = 'border-box';
      exportFrame.style.display = 'flex';
      exportFrame.style.flexDirection = 'column';
      exportFrame.style.alignItems = 'center';
      exportFrame.style.justifyContent = 'center';
      exportFrame.style.padding = '138px 90px 128px';
      exportFrame.style.overflow = 'hidden';
      exportFrame.style.pointerEvents = 'none';
      exportFrame.style.zIndex = '-1';
      exportFrame.style.backgroundColor = '#eee5d3';
      exportFrame.style.backgroundImage = [
        isDark
          ? 'linear-gradient(rgba(238, 229, 211, 0.58), rgba(238, 229, 211, 0.58))'
          : 'linear-gradient(rgba(246, 239, 226, 0.64), rgba(246, 239, 226, 0.64))',
        'url("/images/sfondo-taccuino.webp")',
        isDark
          ? 'radial-gradient(ellipse 80% 45% at 50% 16%, rgba(255, 226, 184, 0.18), transparent 70%)'
          : 'radial-gradient(ellipse 80% 45% at 50% 16%, rgba(255, 255, 255, 0.62), transparent 70%)',
      ].join(', ');
      exportFrame.style.backgroundSize = 'cover, cover, cover';
      exportFrame.style.backgroundPosition = 'center, center, center';
      exportFrame.style.fontFamily = sourceFontFamily;

      const header = document.createElement('div');
      header.textContent = 'Il giorno da custodire';
      header.style.position = 'absolute';
      header.style.top = '62px';
      header.style.left = '90px';
      header.style.right = '90px';
      header.style.fontSize = '28px';
      header.style.fontStyle = 'italic';
      header.style.letterSpacing = '0.03em';
      header.style.textAlign = 'center';
      header.style.color = 'rgba(83, 65, 47, 0.66)';

      const footer = document.createElement('div');
      footer.textContent = 'taccuino del giorno';
      footer.style.position = 'absolute';
      footer.style.bottom = '54px';
      footer.style.left = '90px';
      footer.style.right = '90px';
      footer.style.fontSize = '18px';
      footer.style.fontWeight = '700';
      footer.style.letterSpacing = '0.18em';
      footer.style.textAlign = 'center';
      footer.style.textTransform = 'uppercase';
      footer.style.color = 'rgba(83, 65, 47, 0.38)';

      const contentWrap = document.createElement('div');
      contentWrap.style.width = '900px';
      contentWrap.style.maxHeight = '1580px';
      contentWrap.style.display = 'flex';
      contentWrap.style.alignItems = 'center';
      contentWrap.style.justifyContent = 'center';

      clone.style.width = '900px';
      clone.style.maxWidth = '900px';
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.boxSizing = 'border-box';
      clone.style.fontFamily = sourceFontFamily;
      clone.style.transformOrigin = 'center center';
      clone.style.margin = '0';

      contentWrap.appendChild(clone);
      exportFrame.append(header, contentWrap, footer);
      document.body.appendChild(exportFrame);

      const scale = Math.min(
        1,
        900 / Math.max(clone.scrollWidth, 1),
        1580 / Math.max(clone.scrollHeight, 1)
      );
      clone.style.transform = `scale(${scale})`;

      const dataUrl = await toPng(exportFrame, {
        width: SOCIAL_EXPORT_WIDTH,
        height: SOCIAL_EXPORT_HEIGHT,
        pixelRatio: 1,
      });
      const link = document.createElement('a');
      link.download = `taccuino-${filename ?? 'card'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Errore export card:', err);
    } finally {
      exportFrame?.remove();
      setExporting(false);
    }
  }, [exporting, filename, isDark]);

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
