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
const SOCIAL_EXPORT_SIDE_PADDING = 48;
const SOCIAL_EXPORT_VERTICAL_PADDING = 80;

const exportAccents: Record<string, { color: string; soft: string }> = {
  citazione: { color: '#B34F3F', soft: 'rgba(179,79,63,0.14)' },
  parola: { color: '#C35F4D', soft: 'rgba(195,95,77,0.13)' },
  santi: { color: '#9B6D47', soft: 'rgba(155,109,71,0.13)' },
  opera: { color: '#8A6E9E', soft: 'rgba(138,110,158,0.12)' },
  avvenimenti: { color: '#7D7743', soft: 'rgba(125,119,67,0.13)' },
  poesia: { color: '#24478F', soft: 'rgba(36,71,143,0.11)' },
  bibbia: { color: '#A73532', soft: 'rgba(167,53,50,0.12)' },
  musica: { color: '#8A6547', soft: 'rgba(138,101,71,0.13)' },
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
    let exportFrame: HTMLDivElement | null = null;

    try {
      await document.fonts.ready;
      const { toPng } = await import('html-to-image');

      const source = sectionRef.current;
      const sourceStyle = window.getComputedStyle(source);
      const sourceFontFamily = sourceStyle.fontFamily;
      const sourceRect = source.getBoundingClientRect();
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
      exportFrame.style.alignItems = 'center';
      exportFrame.style.justifyContent = 'center';
      exportFrame.style.padding = `${SOCIAL_EXPORT_VERTICAL_PADDING}px ${SOCIAL_EXPORT_SIDE_PADDING}px`;
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

      const accent = id ? exportAccents[id] ?? exportAccents.citazione : exportAccents.citazione;
      const exportLabel = clone
        .querySelector('.section-typewriter-badge')
        ?.textContent
        ?.replace(/\s+/g, ' ')
        .trim() || title?.toString() || 'Taccuino';

      const exportVignette = document.createElement('div');
      exportVignette.style.position = 'absolute';
      exportVignette.style.inset = '34px';
      exportVignette.style.border = isDark
        ? '1px solid rgba(255, 255, 255, 0.08)'
        : '1px solid rgba(117, 88, 57, 0.13)';
      exportVignette.style.borderRadius = '34px';
      exportVignette.style.boxShadow = isDark
        ? 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -80px 120px rgba(0,0,0,0.08)'
        : 'inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -80px 120px rgba(117,88,57,0.055)';
      exportVignette.style.pointerEvents = 'none';
      exportVignette.style.zIndex = '0';

      const exportTopline = document.createElement('div');
      exportTopline.style.position = 'absolute';
      exportTopline.style.left = '74px';
      exportTopline.style.right = '74px';
      exportTopline.style.top = '54px';
      exportTopline.style.display = 'flex';
      exportTopline.style.alignItems = 'center';
      exportTopline.style.justifyContent = 'space-between';
      exportTopline.style.color = isDark ? 'rgba(238,229,211,0.56)' : 'rgba(117,88,57,0.48)';
      exportTopline.style.fontSize = '21px';
      exportTopline.style.fontWeight = '700';
      exportTopline.style.letterSpacing = '0.16em';
      exportTopline.style.lineHeight = '1';
      exportTopline.style.textTransform = 'uppercase';
      exportTopline.style.pointerEvents = 'none';
      exportTopline.style.zIndex = '2';

      const exportToplineName = document.createElement('span');
      exportToplineName.textContent = exportLabel;
      exportToplineName.className = stampwriter.className;
      exportToplineName.style.color = accent.color;

      const exportToplineRule = document.createElement('span');
      exportToplineRule.style.height = '1px';
      exportToplineRule.style.flex = '1';
      exportToplineRule.style.margin = '0 18px';
      exportToplineRule.style.background = isDark ? 'rgba(238,229,211,0.16)' : 'rgba(117,88,57,0.16)';

      const exportToplineFormat = document.createElement('span');
      exportToplineFormat.textContent = '9:16';
      exportToplineFormat.style.opacity = '0.78';

      exportTopline.append(exportToplineName, exportToplineRule, exportToplineFormat);

      const exportAccent = document.createElement('div');
      exportAccent.style.position = 'absolute';
      exportAccent.style.left = '56px';
      exportAccent.style.top = '166px';
      exportAccent.style.bottom = '166px';
      exportAccent.style.width = '5px';
      exportAccent.style.borderRadius = '999px';
      exportAccent.style.background = `linear-gradient(180deg, transparent, ${accent.soft} 12%, ${accent.color} 46%, ${accent.soft} 86%, transparent)`;
      exportAccent.style.opacity = isDark ? '0.56' : '0.46';
      exportAccent.style.pointerEvents = 'none';
      exportAccent.style.zIndex = '1';

      const exportSignature = document.createElement('div');
      exportSignature.textContent = 'Il giorno da custodire';
      exportSignature.className = stampwriter.className;
      exportSignature.style.position = 'absolute';
      exportSignature.style.left = '0';
      exportSignature.style.right = '0';
      exportSignature.style.bottom = '44px';
      exportSignature.style.color = isDark ? 'rgba(238,229,211,0.48)' : 'rgba(117,88,57,0.42)';
      exportSignature.style.fontSize = '25px';
      exportSignature.style.letterSpacing = '0.18em';
      exportSignature.style.lineHeight = '1';
      exportSignature.style.textAlign = 'center';
      exportSignature.style.textTransform = 'uppercase';
      exportSignature.style.transform = 'rotate(-0.5deg)';
      exportSignature.style.pointerEvents = 'none';

      const contentMaxWidth = SOCIAL_EXPORT_WIDTH - SOCIAL_EXPORT_SIDE_PADDING * 2;
      const contentMaxHeight = SOCIAL_EXPORT_HEIGHT - SOCIAL_EXPORT_VERTICAL_PADDING * 2;
      const scale = Math.min(
        2.05,
        contentMaxWidth / Math.max(sourceRect.width, 1),
        contentMaxHeight / Math.max(sourceRect.height, 1)
      );

      const contentWrap = document.createElement('div');
      contentWrap.style.width = `${contentMaxWidth}px`;
      contentWrap.style.maxHeight = `${contentMaxHeight}px`;
      contentWrap.style.display = 'flex';
      contentWrap.style.alignItems = 'center';
      contentWrap.style.justifyContent = 'center';
      contentWrap.style.overflow = 'visible';
      contentWrap.style.position = 'relative';
      contentWrap.style.zIndex = '2';

      const scaledCardMount = document.createElement('div');
      scaledCardMount.style.width = `${sourceRect.width * scale}px`;
      scaledCardMount.style.height = `${sourceRect.height * scale}px`;
      scaledCardMount.style.position = 'relative';
      scaledCardMount.style.flex = '0 0 auto';

      clone.style.width = `${sourceRect.width}px`;
      clone.style.maxWidth = 'none';
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.boxSizing = 'border-box';
      clone.style.fontFamily = sourceFontFamily;
      clone.style.transform = `scale(${scale})`;
      clone.style.transformOrigin = 'top left';
      clone.style.margin = '0';

      scaledCardMount.appendChild(clone);
      contentWrap.appendChild(scaledCardMount);
      exportFrame.append(exportVignette, exportTopline, exportAccent, contentWrap, exportSignature);
      document.body.appendChild(exportFrame);

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
