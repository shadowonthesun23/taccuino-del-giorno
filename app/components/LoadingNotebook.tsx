'use client';

import { useEffect, useState } from 'react';
import { Feather } from 'lucide-react';
import ParallaxBackground from '@/components/ui/ParallaxBackground';
import { garamond, masterSignature } from '@/lib/fonts';
import { getImageLoadingProps } from '@/lib/browser-utils';
import { t } from '@/lib/translation';
import type { LanguageCode } from '@/lib/types';

const eagerImageProps = getImageLoadingProps(true);

export default function LoadingNotebook({ isDark, lingua = 'IT' }: { isDark: boolean; lingua?: LanguageCode }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeState, setFadeState] = useState<'fade-in' | 'fade-out'>('fade-in');

  useEffect(() => {
    const timer = setInterval(() => {
      setFadeState('fade-out');
      setTimeout(() => {
        setCurrentStep((prev) => (prev + 1) % 3);
        setFadeState('fade-in');
      }, 500); // Half a second to fade out before switching text
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  const steps = [
    'preparingPageStep1',
    'preparingPageStep2',
    'preparingPageStep3',
  ] as const;

  return (
    <ParallaxBackground>
      <div className={`min-h-screen bg-transparent ${garamond.className} flex items-center justify-center px-5 py-10`}>
        <section
          aria-live="polite"
          aria-label={t('preparingNotebookAria', lingua)}
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
            <h1 className={`${masterSignature.className} notebook-wordmark`}>
              {t('dayTitle', lingua)}
            </h1>

            <div className="loading-feather-wrapper" aria-hidden="true">
              <Feather className="loading-feather-icon" />
            </div>

            <div className="loading-writing-stack" aria-hidden="true">
              <span className="loading-pen-line line-one" />
              <span className="loading-pen-line line-two" />
              <span className="loading-pen-line line-three" />
              <span className="loading-pen-line line-four" />
            </div>

            <p className={`loading-step-text ${fadeState}`}>
              {t(steps[currentStep], lingua)}
            </p>
          </div>
        </section>
      </div>
    </ParallaxBackground>
  );
}
