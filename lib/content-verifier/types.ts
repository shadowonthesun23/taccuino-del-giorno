export type VerificationStatus = 'verified' | 'unverified' | 'error';

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface VerificationResult {
  status: VerificationStatus;
  sourceName: string;
  sourceUrl: string | null;
  matchedText: string | null;
  verificationMethod: string;
  reason: string;
}

export interface VerifierOptions {
  fetch?: FetchLike;
  timeoutMs?: number;
}

export interface QuoteVerificationInput {
  text: string;
  author: string;
}

export interface PoemVerificationInput {
  text: string;
  author: string;
  source?: string;
}

export interface BibleVerificationInput {
  text: string;
  reference: string;
}
