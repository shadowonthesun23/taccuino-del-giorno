export const EDITORIAL_MEDIA_STORAGE_KEY = 'taccuino-editorial-media-v1';

export const EDITORIAL_MEDIA_SECTION_IDS = [
  'autore',
  'santi',
  'opera',
  'musica',
  'apod',
] as const;

export type EditorialMediaSectionId = typeof EDITORIAL_MEDIA_SECTION_IDS[number];
export type EditorialMediaOverrides = Partial<Record<EditorialMediaSectionId, string>>;
export interface EditorialMediaCrop {
  x: number;
  y: number;
  zoom: number;
}

export const EDITORIAL_MEDIA_CROP_IDS = [
  'autore',
  'tavola_autore',
  'tavola_santi',
  'tavola_poesia',
] as const;

export type EditorialMediaCropId = typeof EDITORIAL_MEDIA_CROP_IDS[number];
export type EditorialMediaCrops = Partial<Record<EditorialMediaCropId, EditorialMediaCrop>>;
export interface EditorialMediaDocument {
  overrides: EditorialMediaOverrides;
  crops: EditorialMediaCrops;
}

type EditorialMediaStore = Record<string, EditorialMediaDocument>;

const MAX_EDITORIAL_DATA_URL_LENGTH = 700_000;
export const DEFAULT_EDITORIAL_MEDIA_CROP: EditorialMediaCrop = { x: 50, y: 50, zoom: 1 };

export function getRenderableImageUrl(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  if (
    trimmed.startsWith('/')
    || trimmed.startsWith('data:image/')
    || trimmed.startsWith('blob:')
    || trimmed.includes('/api/image-proxy?')
  ) return trimmed;
  return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
}

function cropAxisPosition(offset: number) {
  if (offset === 0) return '50%';
  return `calc(50% ${offset > 0 ? '+' : '-'} ${Math.abs(offset).toFixed(3)}%)`;
}

/**
 * Shared rendering for editorial media crops.
 *
 * object-position alone cannot move an image whose source already has the
 * same aspect ratio as its frame. The explicit left/top offsets preserve the
 * editor's focal point even in that case, while object-position still handles
 * the intrinsic cover crop for wider or taller source images.
 */
export function getEditorialMediaCropImageStyle(crop: EditorialMediaCrop) {
  const normalizedCrop = sanitizeEditorialMediaCrop(crop) ?? DEFAULT_EDITORIAL_MEDIA_CROP;
  const offsetX = (50 - normalizedCrop.x) * (normalizedCrop.zoom - 1);
  const offsetY = (50 - normalizedCrop.y) * (normalizedCrop.zoom - 1);

  return {
    display: 'block' as const,
    height: '100%',
    left: cropAxisPosition(offsetX),
    objectFit: 'cover' as const,
    objectPosition: `${normalizedCrop.x}% ${normalizedCrop.y}%`,
    position: 'absolute' as const,
    top: cropAxisPosition(offsetY),
    transform: `translate(-50%, -50%) scale(${normalizedCrop.zoom})`,
    transformOrigin: 'center center',
    width: '100%',
  };
}

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

export function sanitizeEditorialMediaOverrides(value: unknown): EditorialMediaOverrides {
  if (!isRecord(value)) return {};

  const entries = EDITORIAL_MEDIA_SECTION_IDS.flatMap((section) => {
    const normalized = normalizeEditorialMediaValue(value[section]);
    return normalized ? [[section, normalized] as const] : [];
  });

  return Object.fromEntries(entries) as EditorialMediaOverrides;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function sanitizeEditorialMediaCrop(value: unknown): EditorialMediaCrop | null {
  if (!isRecord(value)) return null;

  const x = Number(value.x);
  const y = Number(value.y);
  const zoom = Number(value.zoom);
  if (![x, y, zoom].every(Number.isFinite)) return null;

  return {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
    zoom: clamp(zoom, 1, 3),
  };
}

export function sanitizeEditorialMediaCrops(value: unknown): EditorialMediaCrops {
  if (!isRecord(value)) return {};

  const entries = EDITORIAL_MEDIA_CROP_IDS.flatMap((cropId) => {
    const crop = sanitizeEditorialMediaCrop(value[cropId]);
    return crop ? [[cropId, crop] as const] : [];
  });

  return Object.fromEntries(entries) as EditorialMediaCrops;
}

function normalizeDocument(value: unknown): EditorialMediaDocument {
  if (!isRecord(value)) {
    return { overrides: sanitizeEditorialMediaOverrides(value), crops: {} };
  }

  const hasDocumentShape = 'overrides' in value || 'crops' in value;
  return {
    overrides: sanitizeEditorialMediaOverrides(hasDocumentShape ? value.overrides : value),
    crops: sanitizeEditorialMediaCrops(hasDocumentShape ? value.crops : {}),
  };
}

function readStore(): EditorialMediaStore {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(EDITORIAL_MEDIA_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).map(([date, document]) => [date, normalizeDocument(document)])
    );
  } catch {
    return {};
  }
}

export function getEditorialMediaDocument(date: string): EditorialMediaDocument {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { overrides: {}, crops: {} };
  return readStore()[date] ?? { overrides: {}, crops: {} };
}

export function getEditorialMediaOverrides(date: string): EditorialMediaOverrides {
  return getEditorialMediaDocument(date).overrides;
}

export function getEditorialMediaCrops(date: string): EditorialMediaCrops {
  return getEditorialMediaDocument(date).crops;
}

export function saveEditorialMediaDocument(date: string, document: EditorialMediaDocument): boolean {
  if (typeof window === 'undefined' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  try {
    const store = readStore();
    const normalized = normalizeDocument(document);
    if (Object.keys(normalized.overrides).length > 0 || Object.keys(normalized.crops).length > 0) {
      store[date] = normalized;
    } else {
      delete store[date];
    }
    window.localStorage.setItem(EDITORIAL_MEDIA_STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function saveEditorialMediaOverrides(date: string, overrides: EditorialMediaOverrides): boolean {
  const current = getEditorialMediaDocument(date);
  return saveEditorialMediaDocument(date, {
    overrides,
    crops: current.crops,
  });
}

export function clearEditorialMediaOverrides(date: string): boolean {
  return saveEditorialMediaDocument(date, { overrides: {}, crops: {} });
}
