export { verifyBibleWithBibbiaEdu } from './bibbiaedu.ts';
export { matchConservativeExcerpt, normalizeConservativeText } from './matcher.ts';
export { verifyPoemWithWikisource } from './wikisource.ts';
export { verifyQuoteWithWikiquote } from './wikiquote.ts';
export type {
  BibleVerificationInput,
  PoemVerificationInput,
  QuoteVerificationInput,
  VerificationResult,
  VerificationStatus,
  VerifierOptions,
} from './types.ts';
