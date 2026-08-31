'use client';

import { useEffect, useState } from 'react';
import { Feather } from 'lucide-react';
import ParallaxBackground from '@/components/ui/ParallaxBackground';
import { garamond, janeAust } from '@/lib/fonts';
import { t } from '@/lib/translation';
import type { LanguageCode } from '@/lib/types';

export default function LoadingNotebook({ isDark, lingua = 'IT' }: { isDark: boolean; lingua?: LanguageCode }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeState, setFadeState] = useState<'fade-in' | 'fade-out'>('fade-in');
  const dateLabel = new Intl.DateTimeFormat(lingua === 'IT' ? 'it-IT' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Rome',
  }).format(new Date());

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
          <div className="loading-notebook-content">
            <div className="loading-notebook-center">
              <p className="loading-date-line" suppressHydrationWarning>{dateLabel}</p>
              <h1 className={`${janeAust.className} jane-aust-wordmark notebook-wordmark`}>
                {t('dayTitle', lingua)}
              </h1>
            </div>

            <div className="loading-composition-mark" aria-hidden="true">
              <span className="loading-mark-rule loading-mark-rule-top" />
              <Feather className="loading-feather-icon" />
              <span className="loading-mark-rule loading-mark-rule-bottom" />
            </div>

            <div className="loading-writing-stack" aria-hidden="true">
              <span className="loading-pen-line line-one" />
              <span className="loading-pen-line line-two" />
              <span className="loading-pen-line line-three" />
              <span className="loading-pen-line line-four" />
            </div>

            <p className={`loading-step-text ${fadeState}`} aria-live="polite">
              {t(steps[currentStep], lingua)}
            </p>
          </div>
        </section>
      </div>
    </ParallaxBackground>
  );
}
