'use client';

import { useEffect, useState } from 'react';

function useTypewriterText(text: string, startDelay = 260, speed = 1) {
  const [visibleText, setVisibleText] = useState('');

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
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
      const baseDelay = (34 + ((text.charCodeAt(index) || index) % 4) * 14) / safeSpeed;
      const pause = current === ' ' || next === ' ' ? 92 / safeSpeed : 0;
      schedule(tick, baseDelay + pause);
    };

    schedule(tick, startDelay);

    return () => {
      cancelled = true;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [speed, startDelay, text]);

  return visibleText;
}

export function TypewriterText({ text, className = '', startDelay = 260 }: { text: string; className?: string; startDelay?: number }) {
  const visibleText = useTypewriterText(text, startDelay);

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

export function TypewriterPhrase({
  prefix,
  word,
  wordClass = '',
  className = '',
  startDelay = 360,
  speed = 1,
}: {
  prefix: string;
  word: string;
  wordClass?: string;
  className?: string;
  startDelay?: number;
  speed?: number;
}) {
  const phrase = `${prefix} ${word}`;
  const visibleText = useTypewriterText(phrase, startDelay, speed);
  const prefixBoundary = prefix.lastIndexOf(' ');
  const leadPrefix = prefixBoundary > 0 ? prefix.slice(0, prefixBoundary) : '';
  const leadConnector = prefixBoundary > 0 ? prefix.slice(prefixBoundary + 1) : prefix;
  const connectorStart = leadPrefix ? leadPrefix.length + 1 : 0;
  const wordStart = prefix.length + 1;
  const wordSeparator = ' ';
  const phraseWordClass = `typewriter-phrase-word ${wordClass}`.trim();

  const renderCaret = (key: string) => (
    <span key={key} className="typewriter-phrase-caret-anchor"><span className="typewriter-caret" /></span>
  );

  const renderCharacter = (character: string, characterIndex: number, keyPrefix: string) => {
    const isVisible = characterIndex < visibleText.length;
    const isCaretPosition = visibleText.length < phrase.length && characterIndex === visibleText.length;
    const characterNode = (
      <span key={`${keyPrefix}-${characterIndex}`} className={`typewriter-character ${isVisible ? 'is-visible' : 'is-pending'}`}>
        {character}
      </span>
    );

    return isCaretPosition ? [renderCaret(`${keyPrefix}-caret-${characterIndex}`), characterNode] : [characterNode];
  };

  const renderCharacters = (text: string, offset: number, keyPrefix: string) => Array.from(text).flatMap((character, index) => (
    renderCharacter(character, offset + index, keyPrefix)
  ));

  return (
    <span className={`typewriter-text typewriter-phrase ${className}`} aria-label={phrase}>
      <span className="typewriter-measure" aria-hidden="true">
        {leadPrefix}
        {leadPrefix ? wordSeparator : null}
        <span className="typewriter-phrase-tail">
          {leadConnector}{wordSeparator}
          <span className={phraseWordClass}>{word}</span>
        </span>
      </span>
      <span className="typewriter-live" aria-hidden="true">
        {leadPrefix ? renderCharacters(leadPrefix, 0, 'lead-prefix') : null}
        {leadPrefix ? renderCharacter(wordSeparator, leadPrefix.length, 'lead-prefix-separator') : null}
        <span className="typewriter-phrase-tail">
          {renderCharacters(leadConnector, connectorStart, 'connector')}
          {renderCharacter(wordSeparator, prefix.length, 'word-separator')}
          <span className={phraseWordClass}>{renderCharacters(word, wordStart, 'word')}</span>
        </span>
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
