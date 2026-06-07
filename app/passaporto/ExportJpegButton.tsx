'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import styles from './passaporto.module.css';

interface ExportJpegButtonProps {
  targetId: string;
  filename: string;
}

const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

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

export default function ExportJpegButton({ targetId, filename }: ExportJpegButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleDownload() {
    const node = document.getElementById(targetId);
    if (!node) return;

    setIsExporting(true);
    try {
      await document.fonts?.ready;
      await waitForImages(node);

      const dataUrl = await toJpeg(node, {
        backgroundColor: '#fbf7ee',
        cacheBust: true,
        imagePlaceholder: transparentPixel,
        pixelRatio: 3,
        quality: 0.96,
      });

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
      <span>{isExporting ? 'Preparo JPEG' : 'Scarica JPEG'}</span>
    </button>
  );
}
