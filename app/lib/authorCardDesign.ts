export type AuthorCardTone = 'light' | 'dark';

export interface AuthorCardPalette {
  tone: AuthorCardTone;
  bg: string;
  textPrimary: string;
  textBody: string;
  textMuted: string;
  accent: string;
  labelTapeBg: string;
  labelTapeText: string;
  cardBg: string;
  sheetBg: string;
  sheetBorder: string;
  sheetShadow: string;
  borderColor: string;
  tapeBg: string;
  tapeText: string;
  wcColor: string;
  spotlight: string;
  quoteShadow: string;
  quoteInset: string;
  previewBorder: string;
  previewShadow: string;
  photoShadow: string;
  imageOpacity: number;
  paperBrightness: number;
  paperSaturation: number;
  paperOpacity: number;
}

export interface AuthorCardLayout {
  variant: 'airy' | 'balanced' | 'compact';
  topPadding: number;
  sidePadding: number;
  bottomPadding: number;
  tapeWidth: number;
  tapeHeight: number;
  tapeMarginBottom: number;
  dateFontSize: number;
  labelFontSize: number;
  labelMarginBottom: number;
  photoWidth: number;
  photoHeight: number;
  photoPaddingX: number;
  photoPaddingTop: number;
  photoPaddingBottom: number;
  photoMarginBottom: number;
  authorFontSize: number;
  authorMarginBottom: number;
  descFontSize: number;
  descLineHeight: number;
  descMaxWidth: number;
  descMarginBottom: number;
  dividerMarginBottom: number;
  quotePaddingX: number;
  quotePaddingY: number;
  quoteRadius: number;
  quoteMarkFontSize: number;
  quoteMarkMarginBottom: number;
  quoteFontSize: number;
  quoteLineHeight: number;
  quoteMarginBottom: number;
  sourceFontSize: number;
  maxDescriptionChars: number;
  maxCitationChars: number;
}

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function formatAuthorCardDate(dataIso?: string, fallback = ''): string {
  if (!dataIso || !/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return fallback;
  const [year, month, day] = dataIso.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return fallback;
  return `${day} · ${ROMAN_MONTHS[month - 1]} · ${year}`;
}

export function getAuthorDateTapeWidth(label: string): number {
  const compactLength = label.replace(/\s+/g, ' ').trim().length;
  return Math.max(244, Math.min(360, 112 + compactLength * 18));
}

export function getAuthorNameFontSize(name: string, baseSize: number): number {
  const compactLength = name.replace(/\s+/g, ' ').trim().length;
  if (compactLength > 38) return baseSize - 13;
  if (compactLength > 30) return baseSize - 9;
  if (compactLength > 23) return baseSize - 5;
  return baseSize;
}

export function makeAuthorWashiTapeSvg(
  tapeColor: string,
  width: number,
  height: number,
  isDark = false
): string {
  const p = (x: number, y: number) => `${Math.round(width * x)},${Math.round(height * y)}`;
  const points = [
    p(0.01, 0.06), p(0.09, 0.02), p(0.24, 0.04), p(0.41, 0.01),
    p(0.62, 0.03), p(0.8, 0.01), p(0.99, 0.05), p(0.98, 0.15),
    p(1, 0.28), p(0.98, 0.41), p(1, 0.54), p(0.98, 0.68),
    p(1, 0.84), p(0.98, 0.96), p(0.82, 0.98), p(0.63, 0.96),
    p(0.48, 0.99), p(0.27, 0.96), p(0.08, 0.98), p(0.01, 0.94),
    p(0.02, 0.82), p(0, 0.68), p(0.02, 0.55), p(0, 0.4),
    p(0.02, 0.27), p(0, 0.14),
  ].join(' ');
  const top = isDark ? '#ead9a7' : '#fff7dd';
  const bottom = isDark ? '#a9844f' : '#d7bc81';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="base" x1="0" x2="0.96" y1="0" y2="1">
      <stop offset="0" stop-color="${top}" stop-opacity="0.9"/>
      <stop offset="0.5" stop-color="${tapeColor}" stop-opacity="0.88"/>
      <stop offset="1" stop-color="${bottom}" stop-opacity="0.82"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" x2="1" y1="0.2" y2="0.8">
      <stop offset="0" stop-color="#fffbe6" stop-opacity="0.24"/>
      <stop offset="0.42" stop-color="#9a713f" stop-opacity="0.04"/>
      <stop offset="1" stop-color="#fffdf0" stop-opacity="0.16"/>
    </linearGradient>
    <pattern id="fibers" width="31" height="17" patternUnits="userSpaceOnUse">
      <path d="M1 4 C9 2 18 6 30 3 M-3 13 C7 9 18 15 34 11" fill="none" stroke="#604522" stroke-opacity="0.045" stroke-width="1"/>
      <circle cx="8" cy="8" r="0.7" fill="#fff" fill-opacity="0.18"/>
    </pattern>
  </defs>
  <polygon points="${points}" fill="url(#base)"/>
  <polygon points="${points}" fill="url(#sheen)"/>
  <polygon points="${points}" fill="url(#fibers)"/>
  <path d="M ${width * 0.07} ${height * 0.2} C ${width * 0.34} ${height * 0.08}, ${width * 0.61} ${height * 0.25}, ${width * 0.93} ${height * 0.14}" fill="none" stroke="#fffef2" stroke-opacity="0.34" stroke-width="2"/>
  <path d="M ${width * 0.08} ${height * 0.88} C ${width * 0.34} ${height * 0.98}, ${width * 0.65} ${height * 0.78}, ${width * 0.92} ${height * 0.9}" fill="none" stroke="#62451f" stroke-opacity="0.12" stroke-width="2"/>
</svg>`;
}

export function getAuthorCardPalette(isDark: boolean): AuthorCardPalette {
  return isDark
    ? {
        tone: 'dark',
        bg: '#2B261F',
        textPrimary: '#F1E8D8',
        textBody: '#D7CDBF',
        textMuted: '#A79D92',
        accent: '#E27664',
        labelTapeBg: '#C95347',
        labelTapeText: '#FFF4E8',
        cardBg: 'rgba(43,38,32,0.34)',
        sheetBg: 'rgba(38,34,30,0.78)',
        sheetBorder: 'rgba(231,203,172,0.12)',
        sheetShadow: '0 34px 90px -58px rgba(0,0,0,0.86), inset 0 1px 0 rgba(255,255,255,0.05)',
        borderColor: 'rgba(231,203,172,0.14)',
        tapeBg: '#D7BD83',
        tapeText: '#241A10',
        wcColor: '#D3AA73',
        spotlight: 'rgba(238,229,211,0.12)',
        quoteShadow: 'none',
        quoteInset: 'inset 8px 0 0 rgba(226,118,100,0.62)',
        previewBorder: 'rgba(255,255,255,0.1)',
        previewShadow: '0 24px 54px -42px rgba(0,0,0,0.92)',
        photoShadow: '0 14px 34px -24px rgba(0,0,0,0.58)',
        imageOpacity: 0.2,
        paperBrightness: 0.82,
        paperSaturation: 0.22,
        paperOpacity: 0.12,
      }
    : {
        tone: 'light',
        bg: '#F4F0E6',
        textPrimary: '#2A2522',
        textBody: '#4A433F',
        textMuted: '#8A817C',
        accent: '#DE6B58',
        labelTapeBg: '#D55B4F',
        labelTapeText: '#FFF7EB',
        cardBg: 'rgba(255,253,246,0.46)',
        sheetBg: 'rgba(255,253,246,0.82)',
        sheetBorder: 'rgba(181,149,106,0.2)',
        sheetShadow: '0 30px 72px -54px rgba(42,37,34,0.45), 4px 6px 0 rgba(117,88,57,0.045), inset 0 1px 0 rgba(255,255,255,0.56)',
        borderColor: 'rgba(181,149,106,0.24)',
        tapeBg: '#D8BD82',
        tapeText: '#241A10',
        wcColor: '#B5956A',
        spotlight: 'rgba(255,252,242,0.88)',
        quoteShadow: 'none',
        quoteInset: 'inset 8px 0 0 rgba(222,107,88,0.68)',
        previewBorder: 'rgba(181,149,106,0.18)',
        previewShadow: '0 22px 48px -40px rgba(42,37,34,0.46)',
        photoShadow: '0 14px 34px -26px rgba(42,37,34,0.34)',
        imageOpacity: 0.18,
        paperBrightness: 3.0,
        paperSaturation: 0.2,
        paperOpacity: 0.14,
      };
}

export function getAuthorCardLayout(citation: string, description: string, author = ''): AuthorCardLayout {
  const authorLoad = Math.max(0, author.replace(/\s+/g, ' ').trim().length - 24) * 4;
  const load = citation.length + Math.max(0, description.length - 360) * 0.55 + authorLoad;

  if (load > 460) {
    return {
      variant: 'compact',
      topPadding: 480,
      sidePadding: 76,
      bottomPadding: 54,
      tapeWidth: 286,
      tapeHeight: 70,
      tapeMarginBottom: 26,
      dateFontSize: 42,
      labelFontSize: 29,
      labelMarginBottom: 24,
      photoWidth: 224,
      photoHeight: 284,
      photoPaddingX: 20,
      photoPaddingTop: 20,
      photoPaddingBottom: 44,
      photoMarginBottom: 20,
      authorFontSize: 60,
      authorMarginBottom: 18,
      descFontSize: 27,
      descLineHeight: 1.36,
      descMaxWidth: 850,
      descMarginBottom: 24,
      dividerMarginBottom: 24,
      quotePaddingX: 34,
      quotePaddingY: 28,
      quoteRadius: 26,
      quoteMarkFontSize: 62,
      quoteMarkMarginBottom: 6,
      quoteFontSize: 31,
      quoteLineHeight: 1.42,
      quoteMarginBottom: 18,
      sourceFontSize: 26,
      maxDescriptionChars: 430,
      maxCitationChars: 560,
    };
  }

  if (load > 220) {
    return {
      variant: 'balanced',
      topPadding: 500,
      sidePadding: 74,
      bottomPadding: 52,
      tapeWidth: 292,
      tapeHeight: 72,
      tapeMarginBottom: 28,
      dateFontSize: 43,
      labelFontSize: 31,
      labelMarginBottom: 26,
      photoWidth: 246,
      photoHeight: 312,
      photoPaddingX: 22,
      photoPaddingTop: 22,
      photoPaddingBottom: 48,
      photoMarginBottom: 22,
      authorFontSize: 64,
      authorMarginBottom: 18,
      descFontSize: 29,
      descLineHeight: 1.36,
      descMaxWidth: 860,
      descMarginBottom: 24,
      dividerMarginBottom: 24,
      quotePaddingX: 38,
      quotePaddingY: 30,
      quoteRadius: 28,
      quoteMarkFontSize: 68,
      quoteMarkMarginBottom: 7,
      quoteFontSize: 34,
      quoteLineHeight: 1.44,
      quoteMarginBottom: 18,
      sourceFontSize: 28,
      maxDescriptionChars: 500,
      maxCitationChars: 450,
    };
  }

  return {
    variant: 'airy',
    topPadding: 520,
    sidePadding: 78,
    bottomPadding: 56,
    tapeWidth: 300,
    tapeHeight: 72,
    tapeMarginBottom: 30,
    dateFontSize: 44,
    labelFontSize: 33,
    labelMarginBottom: 28,
    photoWidth: 268,
    photoHeight: 340,
    photoPaddingX: 24,
    photoPaddingTop: 24,
    photoPaddingBottom: 52,
    photoMarginBottom: 24,
    authorFontSize: 70,
    authorMarginBottom: 20,
    descFontSize: 31,
    descLineHeight: 1.38,
    descMaxWidth: 860,
    descMarginBottom: 28,
    dividerMarginBottom: 26,
    quotePaddingX: 42,
    quotePaddingY: 32,
    quoteRadius: 30,
    quoteMarkFontSize: 70,
    quoteMarkMarginBottom: 8,
    quoteFontSize: 38,
    quoteLineHeight: 1.46,
    quoteMarginBottom: 18,
    sourceFontSize: 30,
    maxDescriptionChars: 620,
    maxCitationChars: 340,
  };
}

export function clampText(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) return normalized;

  const trimmed = normalized.slice(0, maxChars + 1);
  const lastSpace = trimmed.lastIndexOf(' ');
  const cut = lastSpace > maxChars * 0.72 ? trimmed.slice(0, lastSpace) : trimmed.slice(0, maxChars);
  return `${cut.trimEnd()}\u2026`;
}

export function getAuthorInitials(value: string): string {
  return value
    .replace(/\([^)]*\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
