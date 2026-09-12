export type AuthorMetadata = {
  imageUrl: string | null;
  birthDate: string | null;
  deathDate: string | null;
};

export type AuthorAnniversary = {
  kind: 'birth' | 'death';
  year: string;
};

type WikidataClaim = {
  rank?: string;
  mainsnak?: {
    datavalue?: {
      value?: {
        time?: unknown;
      };
    };
  };
};

const AUTHOR_METADATA_TIMEOUT_MS = 4_000;

function parseWikidataDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^[+−-](\d+)-(\d{2})-(\d{2})/u.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
  return `${String(year).padStart(4, '0')}-${match[2]}-${match[3]}`;
}

function getWikidataClaimDate(claims: unknown): string | null {
  if (!Array.isArray(claims)) return null;
  const typedClaims = claims as WikidataClaim[];
  const claim = typedClaims.find((entry) => entry?.rank === 'preferred') ?? typedClaims[0];
  return parseWikidataDate(claim?.mainsnak?.datavalue?.value?.time);
}

function getSummaryLifeDates(description: unknown, extract: unknown): Pick<AuthorMetadata, 'birthDate' | 'deathDate'> {
  const summary = [description, extract]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  const match = /\b(\d{4})\s*[–—-]\s*(\d{4})\b/u.exec(summary);

  return {
    birthDate: match?.[1] ?? null,
    deathDate: match?.[2] ?? null,
  };
}

export function getAuthorAnniversary(dataIso: string, metadata: AuthorMetadata): AuthorAnniversary | null {
  const [, month, day] = dataIso.split('-');
  if (!month || !day) return null;

  const matchesDate = (date: string | null) => Boolean(
    date && new RegExp('^\\d{4}-' + month + '-' + day + '$', 'u').test(date),
  );

  if (matchesDate(metadata.birthDate)) {
    return { kind: 'birth', year: metadata.birthDate!.slice(0, 4) };
  }
  if (matchesDate(metadata.deathDate)) {
    return { kind: 'death', year: metadata.deathDate!.slice(0, 4) };
  }
  return null;
}

export async function getAuthorMetadata(
  nomeAutore: string,
  options: { cache?: RequestCache } = {},
): Promise<AuthorMetadata> {
  const emptyMetadata: AuthorMetadata = { imageUrl: null, birthDate: null, deathDate: null };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTHOR_METADATA_TIMEOUT_MS);

  try {
    const encoded = encodeURIComponent(nomeAutore);
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      {
        headers: { 'User-Agent': 'TaccuinoDelGiorno/1.0' },
        ...(options.cache ? { cache: options.cache } : { next: { revalidate: 86400 } }),
        signal: controller.signal,
      },
    );
    if (!res.ok) return emptyMetadata;

    const json = await res.json() as {
      thumbnail?: { source?: unknown };
      originalimage?: { source?: unknown };
      wikibase_item?: unknown;
      description?: unknown;
      extract?: unknown;
    };
    const summaryDates = getSummaryLifeDates(json.description, json.extract);
    let birthDate = summaryDates.birthDate;
    let deathDate = summaryDates.deathDate;

    if (typeof json.wikibase_item === 'string' && json.wikibase_item) {
      try {
        const wikidataRes = await fetch(
          `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(json.wikibase_item)}.json`,
          {
            headers: { 'User-Agent': 'TaccuinoDelGiorno/1.0' },
            ...(options.cache ? { cache: options.cache } : { next: { revalidate: 86400 } }),
            signal: controller.signal,
          },
        );
        if (wikidataRes.ok) {
          const wikidataJson = await wikidataRes.json() as {
            entities?: Record<string, { claims?: Record<string, unknown> }>;
          };
          const claims = wikidataJson.entities?.[json.wikibase_item]?.claims;
          birthDate = getWikidataClaimDate(claims?.P569) ?? birthDate;
          deathDate = getWikidataClaimDate(claims?.P570) ?? deathDate;
        }
      } catch {
        // The Wikipedia summary fallback still gives us the portrait and, when available, the years.
      }
    }

    return {
      imageUrl: typeof json.thumbnail?.source === 'string'
        ? json.thumbnail.source
        : typeof json.originalimage?.source === 'string'
          ? json.originalimage.source
          : null,
      birthDate,
      deathDate,
    };
  } catch {
    return emptyMetadata;
  } finally {
    clearTimeout(timeout);
  }
}
