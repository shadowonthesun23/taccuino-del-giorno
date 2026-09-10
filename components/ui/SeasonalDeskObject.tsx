'use client';

import Image from 'next/image';
import type { SeasonId } from '@/lib/seasonal-artwork';
import seasonalFig from '@/public/images/seasonal/day-atlas-fico-stagionale.webp';

export default function SeasonalDeskObject({
  season,
  isDark,
}: {
  season?: SeasonId;
  isDark: boolean;
}) {
  // The desk keeps a single seasonal object; the fig replaces the former
  // botanical branch instead of adding another decorative layer.
  if (season !== 'summer') return null;

  return (
    <div
      className={`seasonal-desk-object season-${season} ${isDark ? 'is-dark' : ''}`}
      aria-hidden="true"
    >
      <Image
        className="seasonal-desk-object-image"
        src={seasonalFig}
        alt=""
        aria-hidden="true"
        draggable={false}
        decoding="async"
        loading="lazy"
        sizes="(min-width: 1600px) 310px, (min-width: 1181px) 14vw, 1px"
      />
    </div>
  );
}
