'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, Printer, Scissors, X } from 'lucide-react';
import { renderTargetToJpegDataUrl } from './ExportJpegButton';
import { createA4PdfBytes } from './pdf';
import styles from './passaporto.module.css';

interface PrintableZineButtonProps {
  targetId: string;
  filename: string;
}

const guidePreferenceKey = 'taccuino-zine-guide-seen';
function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1];
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function jpegDimensions(dataUrl: string) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  return { width: image.naturalWidth, height: image.naturalHeight };
}

export default function PrintableZineButton({ targetId, filename }: PrintableZineButtonProps) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [skipGuide, setSkipGuide] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!guideOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setGuideOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [guideOpen]);

  async function downloadPdf() {
    setIsExporting(true);
    try {
      const dataUrl = await renderTargetToJpegDataUrl(targetId);
      const jpeg = dataUrlToBytes(dataUrl);
      const dimensions = await jpegDimensions(dataUrl);
      const pdfBytes = createA4PdfBytes(jpeg, dimensions.width, dimensions.height);
      const pdf = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdf);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setGuideOpen(false);
    } finally {
      setIsExporting(false);
    }
  }

  function handlePrintableClick() {
    if (window.localStorage.getItem(guidePreferenceKey) === 'true') {
      void downloadPdf();
      return;
    }
    setGuideOpen(true);
  }

  function handleConfirmedDownload() {
    if (skipGuide) window.localStorage.setItem(guidePreferenceKey, 'true');
    void downloadPdf();
  }

  return (
    <>
      <div className={styles.printableAction}>
        <button className={styles.exportButton} type="button" onClick={handlePrintableClick} disabled={isExporting}>
          <FileText aria-hidden="true" size={18} strokeWidth={1.8} />
          <span>{isExporting ? 'Preparo il PDF' : 'Crea il libricino A4'}</span>
        </button>
        <button className={styles.guideLink} type="button" onClick={() => setGuideOpen(true)}>
          Come si piega?
        </button>
      </div>

      {guideOpen && (
        <div className={styles.guideOverlay} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setGuideOpen(false);
        }}>
          <section className={styles.guideDialog} role="dialog" aria-modal="true" aria-labelledby="zine-guide-title">
            <button className={styles.guideClose} type="button" onClick={() => setGuideOpen(false)} aria-label="Chiudi la guida">
              <X aria-hidden="true" />
            </button>

            <div className={styles.guideIntro}>
              <span className={styles.guideEyebrow}>Da un foglio a un piccolo libro</span>
              <h2 id="zine-guide-title">Il tuo passaporto diventa una zine</h2>
              <p>
                Scaricherai un vero PDF A4 orizzontale: stampalo su un solo lato, piegalo e pratica
                un unico taglio centrale. Le otto facciate si ricomporranno in un libricino.
              </p>
            </div>

            <div className={styles.guidePrintNotes} aria-label="Impostazioni di stampa">
              <span><Printer aria-hidden="true" />A4 orizzontale</span>
              <span><FileText aria-hidden="true" />Dimensioni reali, 100%</span>
              <span><Scissors aria-hidden="true" />Un solo taglio centrale</span>
            </div>

            <figure className={styles.guideFigure}>
              <img
                draggable={false}
                src="/images/zine-folding-guide.png"
                alt="Sequenza illustrata per piegare un foglio A4 in una zine di otto facciate"
              />
              <figcaption>Segui i passaggi da sinistra a destra, riga per riga.</figcaption>
            </figure>

            <footer className={styles.guideFooter}>
              <label className={styles.guidePreference}>
                <input
                  type="checkbox"
                  checked={skipGuide}
                  onChange={(event) => setSkipGuide(event.target.checked)}
                />
                <span>La prossima volta scarica direttamente</span>
              </label>
              <button className={styles.guideDownload} type="button" onClick={handleConfirmedDownload} disabled={isExporting}>
                {isExporting ? <span>Preparo il PDF…</span> : (
                  <>
                    <Download aria-hidden="true" />
                    <span>Ho capito, scarica il foglio da piegare</span>
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
