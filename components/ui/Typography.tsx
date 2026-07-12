'use client';

import { useEffect, useState } from 'react';

export function TypewriterText({ text, className = '' }: { text: string; className?: string }) {
  const [visibleText, setVisibleText] = useState('');

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;
    let index = 0;
    const timeoutIds = new Set<number>();

    const schedule = (callback: () => void, delay: number) => {
      const timeoutId = window.setTimeout(() => {
        timeoutIds.delete(timeoutId);
        callback();
      }, delay);
      timeoutIds.add(timeoutId);
    };

    if (reduceMotion) {
      schedule(() => setVisibleText(text), 0);
      return () => {
        cancelled = true;
        timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      };
    }

    schedule(() => setVisibleText(''), 0);

    const tick = () => {
      if (cancelled) return;
      index += 1;
      setVisibleText(text.slice(0, index));
      if (index >= text.length) return;

      const current = text[index - 1];
      const next = text[index];
      const baseDelay = 34 + ((text.charCodeAt(index) || index) % 4) * 14;
      const pause = current === ' ' || next === ' ' ? 92 : 0;
      schedule(tick, baseDelay + pause);
    };

    schedule(tick, 260);

    return () => {
      cancelled = true;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [text]);

  return (
    <span className={`typewriter-text ${className}`} aria-label={text}>
      <span className="typewriter-measure" aria-hidden="true">{text}</span>
      <span className="typewriter-live" aria-hidden="true">
        {visibleText}
        {visibleText.length < text.length && <span className="typewriter-caret" />}
      </span>
    </span>
  );
}

export function DecorativeInitialText({
  text,
  className,
  initialTone = 'red',
  initialClassName = '',
  copyClassName = '',
}: {
  text: string;
  className: string;
  initialTone?: 'red' | 'blue';
  initialClassName?: string;
  copyClassName?: string;
}) {
  const [firstLetter = '', ...restLetters] = Array.from(text.trim());
  const rest = restLetters.join('');

  return (
    <p
      className={`decorative-initial-text ${className}`}
      aria-label={text}
    >
      <span
        className={`decorative-initial decorative-initial-${initialTone} ${initialClassName}`}
        aria-hidden="true"
      >
        {firstLetter}
      </span>
      <span className={`decorative-initial-copy ${copyClassName}`} aria-hidden="true">{rest}</span>
    </p>
  );
}

export function EditorialQuoteText({ text }: { text: string }) {
  return (
    <DecorativeInitialText
      text={text}
      className="card-primary-quote quote-editorial-text text-left text-2xl md:text-3xl italic leading-relaxed mb-6 font-medium"
      initialClassName="quote-editorial-dropcap"
      copyClassName="quote-editorial-copy"
    />
  );
}
