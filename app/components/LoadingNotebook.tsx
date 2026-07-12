'use client';

import ParallaxBackground from '@/components/ui/ParallaxBackground';
import { garamond, masterSignature } from '@/lib/fonts';
import { getImageLoadingProps } from '@/lib/browser-utils';

const eagerImageProps = getImageLoadingProps(true);

export default function LoadingNotebook({ isDark }: { isDark: boolean }) {
  return (
    <ParallaxBackground>
      <div className={`min-h-screen bg-transparent ${garamond.className} flex items-center justify-center px-5 py-10`}>
        <section
          aria-live="polite"
          aria-label="Il taccuino si sta preparando"
          className={`loading-notebook-paper ${isDark ? 'is-dark' : ''}`}
        >
          <img
            draggable={false}
            className="loading-notebook-sheet"
            src="/images/loading-paper-torn.png"
            alt=""
            aria-hidden="true"
            {...eagerImageProps}
          />
          <div className="loading-notebook-content">
            <h1 className={`${masterSignature.className} notebook-wordmark`}>Il giorno da custodire</h1>
            <div className="loading-writing-stack" aria-hidden="true">
              <span className="loading-pen-line line-one" />
              <span className="loading-pen-line line-two" />
              <span className="loading-pen-line line-three" />
              <span className="loading-pen-line line-four" />
            </div>
            <p>Sto preparando la pagina del giorno.</p>
          </div>
        </section>
      </div>
    </ParallaxBackground>
  );
}
