import type { DatiTaccuino } from './types';

type TextField = 'testo' | 'autore' | 'fonte' | 'parola' | 'definizione' | 'etimologia' | 'esempio' | 'nota';
type TextOverrides = Partial<Record<TextField, string>>;

export interface EditorialContentOverrides {
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

function normalizeText(value: unknown, field: TextField): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  return normalized.slice(0, MAX_TEXT_LENGTHS[field]);
}

function sanitizeTextGroup(value: unknown, fields: readonly TextField[]) {
  if (!isRecord(value)) return undefined;
  const entries = fields.flatMap((field) => {
    const normalized = normalizeText(value[field], field);
    return normalized ? [[field, normalized] as const] : [];
  });
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function sanitizeEditorialContentOverrides(value: unknown): EditorialContentOverrides {
  if (!isRecord(value)) return {};

  const result: EditorialContentOverrides = {};
  const citazione = sanitizeTextGroup(value.citazione, ['testo', 'autore', 'fonte']);
  const parola = sanitizeTextGroup(value.parola_giorno, ['parola', 'definizione', 'etimologia', 'esempio', 'nota']);
  const poesia = sanitizeTextGroup(value.poesia, ['testo', 'autore', 'fonte', 'nota']);
  const bibbia = sanitizeTextGroup(value.bibbia, ['testo', 'fonte', 'nota']);

  if (citazione) result.citazione = citazione as EditorialContentOverrides['citazione'];
  if (parola) result.parola_giorno = parola as EditorialContentOverrides['parola_giorno'];
  if (poesia) result.poesia = poesia as EditorialContentOverrides['poesia'];
  if (bibbia) result.bibbia = bibbia as EditorialContentOverrides['bibbia'];

  if (Array.isArray(value.avvenimenti)) {
    const events = value.avvenimenti
      .map((event) => normalizeText(event, 'testo'))
      .filter((event): event is string => Boolean(event))
      .slice(0, MAX_EVENTS);
    if (events.length) result.avvenimenti = events;
  }

  return result;
}

export function applyEditorialContentOverrides(
  data: DatiTaccuino,
  overrides: EditorialContentOverrides,
): DatiTaccuino {
  return {
    ...data,
    ...(overrides.citazione ? { citazione: { ...data.citazione, ...overrides.citazione } } : {}),
    ...(overrides.parola_giorno ? { parola_giorno: { ...data.parola_giorno, ...overrides.parola_giorno } } : {}),
    ...(overrides.avvenimenti ? { avvenimenti: overrides.avvenimenti } : {}),
    ...(overrides.poesia ? { poesia: { ...data.poesia, ...overrides.poesia } } : {}),
    ...(overrides.bibbia ? { bibbia: { ...data.bibbia, ...overrides.bibbia } } : {}),
  };
}
