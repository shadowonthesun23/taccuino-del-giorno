import { finalizeGeneratedBible } from './finalize-generated-bible';
import { finalizeGeneratedQuote, type FinalizeGeneratedQuoteOptions } from './finalize-generated-quote';

export async function finalizeAuthenticatedContent<T extends Record<string, unknown>>(
  generatedData: T,
  options: FinalizeGeneratedQuoteOptions & { timeoutMs?: number } = {},
): Promise<T> {
  const [quoteData, bibleData] = await Promise.all([
    finalizeGeneratedQuote(generatedData, options),
    finalizeGeneratedBible(generatedData, { timeoutMs: options.timeoutMs ?? 8_000 }),
  ]);
  return { ...bibleData, citazione: quoteData.citazione };
}
