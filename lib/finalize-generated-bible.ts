import {
  fetchCei2008Passage,
  type Cei2008PassageResult,
  type FetchCei2008Options,
} from './cei2008.ts';

export interface GeneratedBibleContent extends Record<string, unknown> {
  testo?: unknown;
  fonte?: unknown;
  nota?: unknown;
}

export interface GeneratedContentWithBible extends Record<string, unknown> {
  bibbia?: GeneratedBibleContent;
}

type FetchPassage = (
  reference: string,
  options?: FetchCei2008Options,
) => Promise<Cei2008PassageResult>;

export interface FinalizeGeneratedBibleOptions extends FetchCei2008Options {
  fetchPassage?: FetchPassage;
}

export class Cei2008FinalizationError extends Error {
  readonly code: Extract<Cei2008PassageResult, { ok: false }>['error']['code'];
  readonly reference: string | null;

  constructor(
    code: Cei2008FinalizationError['code'],
    reference: string | null,
    detail: string,
  ) {
    super(`Finalizzazione CEI 2008 fallita (${code}): ${detail}`);
    this.name = 'Cei2008FinalizationError';
    this.code = code;
    this.reference = reference;
  }
}

export async function finalizeGeneratedBible<T extends GeneratedContentWithBible>(
  generatedData: T,
  options: FinalizeGeneratedBibleOptions = {},
): Promise<T & { bibbia: GeneratedBibleContent & { testo: string; fonte: string } }> {
  const generatedReference = typeof generatedData.bibbia?.fonte === 'string'
    ? generatedData.bibbia.fonte.trim()
    : '';
  const { fetchPassage = fetchCei2008Passage, ...fetchOptions } = options;
  const passage = await fetchPassage(generatedReference, fetchOptions);

  if (!passage.ok) {
    throw new Cei2008FinalizationError(
      passage.error.code,
      passage.reference ?? (generatedReference || null),
      passage.error.message,
    );
  }

  return {
    ...generatedData,
    bibbia: {
      ...generatedData.bibbia,
      testo: passage.text,
      fonte: `${passage.reference} — CEI 2008`,
    },
  };
}
