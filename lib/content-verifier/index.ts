export {
  fetchCei2008Passage,
  parseCei2008Reference,
  verifyBibleWithBibbiaEdu,
} from './bibbiaedu.ts';
export type {
  Cei2008PassageResult,
  Cei2008Verse,
  ParsedBibleReference,
} from './bibbiaedu.ts';
export { matchConservativeExcerpt, normalizeConservativeText } from './matcher.ts';
export { verifyPoemWithWikisource } from './wikisource.ts';
export { fetchWikisourcePoem } from './wikisource-retrieval.ts';
export type { WikisourcePoem, WikisourcePoemResult } from './wikisource-retrieval.ts';
export { fetchWikiquoteCandidates, verifyQuoteWithWikiquote } from './wikiquote.ts';
export type { WikiquoteCandidate, WikiquoteRetrievalResult } from './wikiquote.ts';
export type {
  BibleVerificationInput,
  PoemVerificationInput,
  QuoteVerificationInput,
  VerificationResult,
  VerificationStatus,
  VerifierOptions,
} from './types.ts';
