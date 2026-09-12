import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import {
  verifyBibleWithBibbiaEdu,
  verifyPoemWithWikisource,
  verifyQuoteWithWikiquote,
} from '../lib/content-verifier/index.ts';
import type { VerificationResult, VerificationStatus } from '../lib/content-verifier/types.ts';
import { createPoliteCachedFetch } from '../lib/content-verifier/rate-limited-fetch.ts';

const { loadEnvConfig } = nextEnv;
const SAMPLE_SIZE = 15;
const auditFetch = createPoliteCachedFetch();

interface DailyAuditRow {
  data: string;
  citazione?: { testo?: string; autore?: string; fonte?: string } | null;
  poesia?: { testo?: string; autore?: string; fonte?: string; nota?: string } | null;
  bibbia?: { testo?: string; fonte?: string; nota?: string } | null;
}

interface EditorialOverrideRow {
  data: string;
  overrides?: {
    citazione?: Partial<NonNullable<DailyAuditRow['citazione']>>;
    poesia?: Partial<NonNullable<DailyAuditRow['poesia']>>;
    bibbia?: Partial<NonNullable<DailyAuditRow['bibbia']>>;
  } | null;
}

type SourceKey = 'wikiquote' | 'wikisource' | 'bibbiaedu';

interface AuditItem {
  date: string;
  kind: 'citazione' | 'poesia' | 'bibbia';
  input: { author?: string; reference?: string; source?: string; text: string };
  result: VerificationResult;
  failureClass: 'verified' | 'probable_matching_issue' | 'not_present_in_source' | 'technical_source_problem';
}

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Configurazione Supabase pubblica incompleta.');
}

// Audit safety boundary: this client only executes SELECT queries below.
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: rows, error } = await supabase
  .from('contenuti_giornalieri')
  .select('data, citazione, poesia, bibbia')
  .order('data', { ascending: false })
  .limit(SAMPLE_SIZE);
if (error) throw new Error(`Lettura contenuti fallita: ${error.message}`);

const dailyRows = (rows ?? []) as DailyAuditRow[];
const dates = dailyRows.map((row) => row.data);
let overridesByDate = new Map<string, EditorialOverrideRow['overrides']>();
if (dates.length > 0) {
  const { data: overrideRows, error: overrideError } = await supabase
    .from('editorial_content_overrides')
    .select('data, overrides')
    .in('data', dates);
  if (overrideError) throw new Error(`Lettura override fallita: ${overrideError.message}`);
  overridesByDate = new Map(
    ((overrideRows ?? []) as EditorialOverrideRow[]).map((row) => [row.data, row.overrides]),
  );
}

const items: AuditItem[] = [];
for (const rawRow of dailyRows) {
  const row = applyPublishedOverrides(rawRow, overridesByDate.get(rawRow.data));
  const checks: Array<Promise<AuditItem | null>> = [
    auditQuote(row),
    auditPoem(row),
    auditBible(row),
  ];
  const dayItems = await Promise.all(checks);
  items.push(...dayItems.filter((item): item is AuditItem => item !== null));
}

const bySource: Record<SourceKey, ReturnType<typeof summarize>> = {
  wikiquote: summarize(items.filter((item) => item.kind === 'citazione')),
  wikisource: summarize(items.filter((item) => item.kind === 'poesia')),
  bibbiaedu: summarize(items.filter((item) => item.kind === 'bibbia')),
};

const report = {
  generatedAt: new Date().toISOString(),
  sampleRequested: SAMPLE_SIZE,
  daysRead: dailyRows.length,
  totalControllable: items.length,
  totals: countStatuses(items.map((item) => item.result.status)),
  bySource,
  representativeFailures: items
    .filter((item) => item.result.status !== 'verified')
    .slice(0, 12)
    .map((item) => ({
      date: item.date,
      kind: item.kind,
      author: item.input.author,
      reference: item.input.reference,
      source: item.input.source,
      status: item.result.status,
      reason: item.result.reason,
      failureClass: item.failureClass,
      sourceUrl: item.result.sourceUrl,
    })),
  items: items.map((item) => ({
    date: item.date,
    kind: item.kind,
    author: item.input.author,
    reference: item.input.reference,
    source: item.input.source,
    status: item.result.status,
    reason: item.result.reason,
    failureClass: item.failureClass,
    sourceName: item.result.sourceName,
    sourceUrl: item.result.sourceUrl,
    verificationMethod: item.result.verificationMethod,
  })),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

async function auditQuote(row: DailyAuditRow): Promise<AuditItem | null> {
  const text = row.citazione?.testo?.trim();
  const author = row.citazione?.autore?.trim();
  if (!text || !author) return null;
  const result = await verifyQuoteWithWikiquote({ text, author }, { fetch: auditFetch });
  return makeItem(row.data, 'citazione', { text, author, source: row.citazione?.fonte }, result);
}

async function auditPoem(row: DailyAuditRow): Promise<AuditItem | null> {
  const text = row.poesia?.testo?.trim();
  const author = row.poesia?.autore?.trim();
  if (!text || !author) return null;
  const source = row.poesia?.fonte?.trim();
  const result = await verifyPoemWithWikisource({ text, author, source }, { fetch: auditFetch });
  return makeItem(row.data, 'poesia', { text, author, source }, result);
}

async function auditBible(row: DailyAuditRow): Promise<AuditItem | null> {
  const text = row.bibbia?.testo?.trim();
  const reference = row.bibbia?.fonte?.trim();
  if (!text || !reference) return null;
  const result = await verifyBibleWithBibbiaEdu({ text, reference }, { fetch: auditFetch });
  return makeItem(row.data, 'bibbia', { text, reference }, result);
}

function applyPublishedOverrides(
  row: DailyAuditRow,
  overrides: EditorialOverrideRow['overrides'],
): DailyAuditRow {
  if (!overrides) return row;
  return {
    ...row,
    citazione: { ...row.citazione, ...overrides.citazione },
    poesia: { ...row.poesia, ...overrides.poesia },
    bibbia: { ...row.bibbia, ...overrides.bibbia },
  };
}

function makeItem(
  date: string,
  kind: AuditItem['kind'],
  input: AuditItem['input'],
  result: VerificationResult,
): AuditItem {
  return { date, kind, input, result, failureClass: classifyFailure(result) };
}

function classifyFailure(result: VerificationResult): AuditItem['failureClass'] {
  if (result.status === 'verified') return 'verified';
  if (result.status === 'error') return 'technical_source_problem';
  if (/not_found_by_mediawiki_search|author_page_not_found/u.test(result.reason)) {
    return 'not_present_in_source';
  }
  return 'probable_matching_issue';
}

function countStatuses(statuses: VerificationStatus[]) {
  return {
    verified: statuses.filter((status) => status === 'verified').length,
    unverified: statuses.filter((status) => status === 'unverified').length,
    error: statuses.filter((status) => status === 'error').length,
  };
}

function summarize(sourceItems: AuditItem[]) {
  const counts = countStatuses(sourceItems.map((item) => item.result.status));
  return {
    controllable: sourceItems.length,
    ...counts,
    coveragePercent: sourceItems.length === 0
      ? 0
      : Number(((counts.verified / sourceItems.length) * 100).toFixed(1)),
    failureClasses: {
      probableMatchingIssue: sourceItems.filter((item) => item.failureClass === 'probable_matching_issue').length,
      notPresentInSource: sourceItems.filter((item) => item.failureClass === 'not_present_in_source').length,
      technicalSourceProblem: sourceItems.filter((item) => item.failureClass === 'technical_source_problem').length,
    },
  };
}
