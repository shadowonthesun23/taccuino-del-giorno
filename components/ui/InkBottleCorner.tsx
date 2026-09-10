'use client';

import { useState } from 'react';
import Image from 'next/image';
import inkBottleAndCap from '@/public/images/ink-bottle-and-cap.png';

export default function InkBottleCorner({
  isDark,
  sceneObjectId,
  sceneObjectLocked,
}: {
  isDark: boolean;
  sceneObjectId?: string;
  sceneObjectLocked?: boolean;
}) {
  const [isReady, setIsReady] = useState(false);

  return (
    <div
      className={`ink-bottle-corner ${isDark ? 'is-dark' : ''} ${isReady ? 'is-ready' : ''}`}
      data-scene-object={sceneObjectId}
      data-scene-locked={sceneObjectLocked === undefined ? undefined : String(sceneObjectLocked)}
      aria-hidden="true"
    >
      <Image
        className="ink-bottle-corner-image"
        src={inkBottleAndCap}
        alt=""
        draggable={false}
        decoding="async"
        loading="eager"
        onLoad={() => setIsReady(true)}
        sizes="(min-width: 1600px) 23vw, 340px"
      />
    </div>
  );
}
