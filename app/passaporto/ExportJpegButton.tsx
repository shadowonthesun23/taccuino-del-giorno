'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import styles from './passaporto.module.css';

interface ExportJpegButtonProps {
  targetId: string;
  filename: string;
  children?: React.ReactNode;
}

const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

export async function renderTargetToJpegDataUrl(targetId: string) {
  const node = document.getElementById(targetId);
  if (!node) throw new Error('Foglio da esportare non trovato.');

  await document.fonts?.ready;
  await waitForImages(node);

  return toJpeg(node, {
    backgroundColor: '#fbf7ee',
    cacheBust: true,
    imagePlaceholder: transparentPixel,
    includeQueryParams: true,
    pixelRatio: 3,
    quality: 0.96,
  });
}

async function waitForImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    images.map(async (image) => {
      if (image.complete) return;
      try {
        await image.decode();
      } catch {
        // html-to-image will use imagePlaceholder if an external image cannot be embedded.
      }
    })
  );
}

export default function ExportJpegButton({ targetId, filename, children }: ExportJpegButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleDownload() {
    setIsExporting(true);
    try {
      const dataUrl = await renderTargetToJpegDataUrl(targetId);

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button className={styles.exportButton} type="button" onClick={handleDownload} disabled={isExporting}>
      <Download aria-hidden="true" size={18} strokeWidth={1.8} />
      <span>{isExporting ? 'Preparo JPEG' : children ?? 'Scarica JPEG'}</span>
    </button>
  );
}
