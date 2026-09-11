'use client';

import Image from 'next/image';
import type { SeasonId } from '@/lib/seasonal-artwork';
import seasonalFig from '@/public/images/seasonal/day-atlas-fico-stagionale.webp';
import { resolveSceneAssetUrl } from '@/lib/scene-assets';
import type { SceneAssetReference } from '@/lib/scene-draft';

export default function SeasonalDeskObject({
  season,
  isDark,
  sceneObjectId,
  sceneObjectLocked,
  asset,
}: {
  season?: SeasonId;
  isDark: boolean;
  sceneObjectId?: string;
  sceneObjectLocked?: boolean;
  asset?: SceneAssetReference;
}) {
  // The desk keeps a single seasonal object; the fig replaces the former
  // botanical branch instead of adding another decorative layer.
  if (season !== 'summer') return null;
  const assetSrc = resolveSceneAssetUrl(asset, '/images/seasonal/day-atlas-fico-stagionale.webp');

  return (
    <div
      className={`seasonal-desk-object season-${season} ${isDark ? 'is-dark' : ''}`}
      data-scene-object={sceneObjectId}
      data-scene-locked={sceneObjectLocked === undefined ? undefined : String(sceneObjectLocked)}
      aria-hidden="true"
    >
      {assetSrc ? (
        <img className="seasonal-desk-object-image" src={assetSrc} alt="" aria-hidden="true" draggable={false} decoding="async" loading="lazy" />
      ) : (
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
      )}
    </div>
  );
}
