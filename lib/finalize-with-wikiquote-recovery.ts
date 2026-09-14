import { WikiquoteFinalizationError } from './finalize-generated-quote.ts';

export type WikiquoteRecoveryOptions<T> = {
  forcedAuthor?: string;
  finalize: (data: T) => Promise<T>;
  recover: (data: T) => Promise<T>;
};

/** Finalizes once, with one and only one automatic recovery after no_candidates. */
export async function finalizeWithWikiquoteRecovery<T>(
  data: T,
  { forcedAuthor = '', finalize, recover }: WikiquoteRecoveryOptions<T>,
): Promise<T> {
  try {
    return await finalize(data);
  } catch (error) {
    if (
      !(error instanceof WikiquoteFinalizationError)
      || error.code !== 'no_candidates'
      || forcedAuthor.trim() !== ''
    ) {
      throw error;
    }

    const recoveredData = await recover(data);
    return finalize(recoveredData);
  }
}
