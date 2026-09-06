'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { SeasonId } from '@/lib/seasonal-artwork';
import summerHerbariumSprig from '@/public/images/seasonal/summer-herbarium-sprig.webp';

export default function SeasonalDeskObject({
  season,
  isDark,
}: {
  season?: SeasonId;
  isDark: boolean;
}) {
  const [isReady, setIsReady] = useState(false);

  // Start with one carefully controlled summer specimen. More seasonal
  // objects should earn their place one at a time rather than becoming a set.
  if (season !== 'summer') return null;

  return (
    <div
      className={`seasonal-desk-object season-${season} ${isDark ? 'is-dark' : ''} ${isReady ? 'is-ready' : ''}`}
      aria-hidden="true"
    >
      <Image
        className="seasonal-desk-object-image"
        src={summerHerbariumSprig}
        alt=""
        draggable={false}
        decoding="async"
        loading="eager"
        onLoad={() => setIsReady(true)}
        sizes="(min-width: 1600px) 12vw, 180px"
      />
    </div>
  );
}
