export type WordSocialCardVariant = 'airy' | 'balanced' | 'compact';
export type WordSocialWordTier = 'short' | 'medium' | 'long';

export interface WordSocialCardLayout {
  variant: WordSocialCardVariant;
  wordTier: WordSocialWordTier;
  wordMaxLines: 2 | 3;
  definitionMaxLines: 6 | 7 | 8;
  exampleMaxLines: 3 | 4;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Deterministic density hints for the 1080 × 1920 word folio.
 *
 * The home card remains the source of truth for the content. These hints only
 * choose a stable export rhythm so a dense definition never forces the word
 * into the same scale as a short one.
 */
export function getWordSocialCardLayout(
  word: string,
  etymology: string,
  definition: string,
  example = '',
  note = '',
): WordSocialCardLayout {
  const normalizedWord = normalizeText(word);
  const wordLength = normalizedWord.length;
  const etymologyLength = normalizeText(etymology).length;
  const definitionLength = normalizeText(definition).length;
  const exampleLength = normalizeText(example).length;
  const noteLength = normalizeText(note).length;
  const bodyLoad = definitionLength + exampleLength * 0.72 + etymologyLength * 0.34 + noteLength * 0.24;

  const wordTier: WordSocialWordTier = wordLength <= 11
    ? 'short'
    : wordLength <= 20
      ? 'medium'
      : 'long';

  const variant: WordSocialCardVariant = bodyLoad > 470 || wordLength > 34
    ? 'compact'
    : bodyLoad > 285 || wordLength > 20
      ? 'balanced'
      : 'airy';

  return {
    variant,
    wordTier,
    wordMaxLines: wordLength > 34 ? 3 : 2,
    definitionMaxLines: variant === 'compact' ? 8 : variant === 'balanced' ? 7 : 6,
    exampleMaxLines: variant === 'airy' ? 4 : 3,
  };
}
