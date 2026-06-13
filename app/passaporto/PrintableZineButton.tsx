'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, Printer, Scissors, X } from 'lucide-react';
import { renderTargetToJpegDataUrl } from './ExportJpegButton';
import styles from './passaporto.module.css';

interface PrintableZineButtonProps {
  targetId: string;
  filename: string;
}

const guidePreferenceKey = 'taccuino-zine-guide-seen';
const a4LandscapeWidth = 841.89;
const a4LandscapeHeight = 595.28;

function ascii(value: string) {
  return new TextEncoder().encode(value);
}

function joinBytes(parts: Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const joined = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => {
    joined.set(part, offset);
    offset += part.length;
  });
  return joined;
}

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

function createA4Pdf(jpeg: Uint8Array, imageWidth: number, imageHeight: number) {
  const content = ascii(
    `q\n${a4LandscapeWidth} 0 0 ${a4LandscapeHeight} 0 0 cm\n/Im0 Do\nQ\n`
  );
  const objects = [
    ascii('<< /Type /Catalog /Pages 2 0 R >>'),
    ascii('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${a4LandscapeWidth} ${a4LandscapeHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),
    joinBytes([
      ascii(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
      jpeg,
      ascii('\nendstream'),
    ]),
    joinBytes([
      ascii(`<< /Length ${content.length} >>\nstream\n`),
      content,
      ascii('endstream'),
    ]),
  ];

  const parts = [ascii('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n')];
  const offsets = [0];
  let byteOffset = parts[0].length;

  objects.forEach((object, index) => {
    offsets.push(byteOffset);
    const wrapped = joinBytes([
      ascii(`${index + 1} 0 obj\n`),
      object,
      ascii('\nendobj\n'),
    ]);
    parts.push(wrapped);
    byteOffset += wrapped.length;
  });

  const xrefOffset = byteOffset;
  const xref = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref\n${xrefOffset}`,
    '%%EOF',
  ].join('\n');

  parts.push(ascii(`${xref}\n`));
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
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
      const pdf = createA4Pdf(jpeg, dimensions.width, dimensions.height);
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
