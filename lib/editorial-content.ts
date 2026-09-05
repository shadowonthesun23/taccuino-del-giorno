import type { DatiTaccuino } from './types';

type TextField = 'testo' | 'autore' | 'fonte' | 'breve_descrizione' | 'parola' | 'definizione' | 'etimologia' | 'esempio' | 'nota';
type TextOverrides = Partial<Record<TextField, string>>;

export interface EditorialContentOverrides {
  breve_descrizione?: string;
  citazione?: Pick<TextOverrides, 'testo' | 'autore' | 'fonte'>;
  parola_giorno?: Pick<TextOverrides, 'parola' | 'definizione' | 'etimologia' | 'esempio' | 'nota'>;
  avvenimenti?: string[];
  poesia?: Pick<TextOverrides, 'testo' | 'autore' | 'fonte' | 'nota'>;
  bibbia?: Pick<TextOverrides, 'testo' | 'fonte' | 'nota'>;
}

const MAX_TEXT_LENGTHS: Record<TextField, number> = {
  testo: 12_000,
  autore: 240,
  fonte: 240,
  breve_descrizione: 4_000,
  parola: 160,
  definizione: 4_000,
  etimologia: 1_000,
  esempio: 4_000,
  nota: 4_000,
};
const MAX_EVENTS = 12;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value: unknown, field: TextField, allowEmpty = false): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().slice(0, MAX_TEXT_LENGTHS[field]);
  if (normalized || allowEmpty) return normalized;
  return undefined;
}

function sanitizeTextGroup(value: unknown, fields: readonly TextField[]) {
  if (!isRecord(value)) return undefined;
  const entries = fields.flatMap((field) => {
    const normalized = normalizeText(value[field], field, true);
    return normalized !== undefined ? [[field, normalized] as const] : [];
  });
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function sanitizeEditorialContentOverrides(value: unknown): EditorialContentOverrides {
  if (!isRecord(value)) return {};

  const result: EditorialContentOverrides = {};
  const breveDescrizione = normalizeText(value.breve_descrizione, 'breve_descrizione', true);
  const citazione = sanitizeTextGroup(value.citazione, ['testo', 'autore', 'fonte']);
  const parola = sanitizeTextGroup(value.parola_giorno, ['parola', 'definizione', 'etimologia', 'esempio', 'nota']);
  const poesia = sanitizeTextGroup(value.poesia, ['testo', 'autore', 'fonte', 'nota']);
  const bibbia = sanitizeTextGroup(value.bibbia, ['testo', 'fonte', 'nota']);

  if (breveDescrizione !== undefined) result.breve_descrizione = breveDescrizione;
  if (citazione) {
    const citationOverride = { ...citazione };
    const changesQuote = Object.hasOwn(citationOverride, 'testo') || Object.hasOwn(citationOverride, 'autore');
    // Never keep attributing a manually changed quote to the automatic source.
    // A non-empty replacement can still be supplied explicitly in `fonte`.
    if (changesQuote && !Object.hasOwn(citationOverride, 'fonte')) {
      citationOverride.fonte = '';
    }
    result.citazione = citationOverride as EditorialContentOverrides['citazione'];
  }
  if (parola) result.parola_giorno = parola as EditorialContentOverrides['parola_giorno'];
  if (poesia) result.poesia = poesia as EditorialContentOverrides['poesia'];
  if (bibbia) result.bibbia = bibbia as EditorialContentOverrides['bibbia'];

  if (Array.isArray(value.avvenimenti)) {
    const events = value.avvenimenti
      .map((event) => normalizeText(event, 'testo'))
      .filter((event): event is string => Boolean(event))
      .slice(0, MAX_EVENTS);
    // An explicitly empty list is meaningful: it lets the Editor hide the
    // automatically generated events without deleting the whole override row.
    result.avvenimenti = events;
  }

  return result;
}

export function applyEditorialContentOverrides(
  data: DatiTaccuino,
  overrides: EditorialContentOverrides,
): DatiTaccuino {
  return {
    ...data,
    ...(Object.hasOwn(overrides, 'breve_descrizione') ? { breve_descrizione: overrides.breve_descrizione ?? '' } : {}),
    ...(overrides.citazione ? { citazione: { ...data.citazione, ...overrides.citazione } } : {}),
    ...(overrides.parola_giorno ? { parola_giorno: { ...data.parola_giorno, ...overrides.parola_giorno } } : {}),
    ...(overrides.avvenimenti ? { avvenimenti: overrides.avvenimenti } : {}),
    ...(overrides.poesia ? { poesia: { ...data.poesia, ...overrides.poesia } } : {}),
    ...(overrides.bibbia ? { bibbia: { ...data.bibbia, ...overrides.bibbia } } : {}),
  };
}
