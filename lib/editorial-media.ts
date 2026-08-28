export const EDITORIAL_MEDIA_STORAGE_KEY = 'taccuino-editorial-media-v1';

export const EDITORIAL_MEDIA_SECTION_IDS = [
  'autore',
  'citazione',
  'parola',
  'santi',
  'avvenimenti',
  'poesia',
  'bibbia',
  'opera',
  'musica',
  'effemeridi',
  'apod',
] as const;

export type EditorialMediaSectionId = typeof EDITORIAL_MEDIA_SECTION_IDS[number];
export type EditorialMediaOverrides = Partial<Record<EditorialMediaSectionId, string>>;
type EditorialMediaStore = Record<string, EditorialMediaOverrides>;

const MAX_EDITORIAL_DATA_URL_LENGTH = 700_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeEditorialMediaValue(value: unknown): string {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/^data:image\/(?:avif|gif|jpe?g|png|webp);base64,[a-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed.length <= MAX_EDITORIAL_DATA_URL_LENGTH ? trimmed : '';
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function sanitizeOverrides(value: unknown): EditorialMediaOverrides {
  if (!isRecord(value)) return {};

  const entries = EDITORIAL_MEDIA_SECTION_IDS.flatMap((section) => {
    const normalized = normalizeEditorialMediaValue(value[section]);
    return normalized ? [[section, normalized] as const] : [];
  });

  return Object.fromEntries(entries) as EditorialMediaOverrides;
}

function readStore(): EditorialMediaStore {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(EDITORIAL_MEDIA_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).map(([date, overrides]) => [date, sanitizeOverrides(overrides)])
    );
  } catch {
    return {};
  }
}

export function getEditorialMediaOverrides(date: string): EditorialMediaOverrides {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return {};
  return readStore()[date] ?? {};
}

export function saveEditorialMediaOverrides(date: string, overrides: EditorialMediaOverrides): boolean {
  if (typeof window === 'undefined' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  try {
    const store = readStore();
    const sanitized = sanitizeOverrides(overrides);
    if (Object.keys(sanitized).length > 0) {
      store[date] = sanitized;
    } else {
      delete store[date];
    }
    window.localStorage.setItem(EDITORIAL_MEDIA_STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function clearEditorialMediaOverrides(date: string): boolean {
  return saveEditorialMediaOverrides(date, {});
}
