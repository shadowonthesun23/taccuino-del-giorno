export type AuthorCardTone = 'light' | 'dark';

export interface AuthorCardPalette {
  tone: AuthorCardTone;
  bg: string;
  textPrimary: string;
  textBody: string;
  textMuted: string;
  accent: string;
  cardBg: string;
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

export function getAuthorCardPalette(isDark: boolean): AuthorCardPalette {
  return isDark
    ? {
        tone: 'dark',
        bg: '#2B261F',
        textPrimary: '#F1E8D8',
        textBody: '#D7CDBF',
        textMuted: '#A79D92',
        accent: '#E27664',
        cardBg: 'rgba(43,38,32,0.76)',
        borderColor: 'rgba(231,203,172,0.14)',
        tapeBg: '#D7BD83',
        tapeText: '#241A10',
        wcColor: '#D3AA73',
        spotlight: 'rgba(238,229,211,0.12)',
        quoteShadow: '0 24px 54px -38px rgba(0,0,0,0.66), 4px 6px 0 rgba(0,0,0,0.1)',
        quoteInset: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -18px 42px rgba(0,0,0,0.12)',
        previewBorder: 'rgba(255,255,255,0.1)',
        previewShadow: '0 24px 54px -42px rgba(0,0,0,0.92)',
        photoShadow: '0 14px 34px -24px rgba(0,0,0,0.58)',
        imageOpacity: 0.14,
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
        cardBg: 'rgba(255,253,246,0.9)',
        borderColor: 'rgba(181,149,106,0.24)',
        tapeBg: '#D8BD82',
        tapeText: '#241A10',
        wcColor: '#B5956A',
        spotlight: 'rgba(255,252,242,0.88)',
        quoteShadow: '0 22px 48px -36px rgba(42,37,34,0.4), 4px 6px 0 rgba(117,88,57,0.055)',
        quoteInset: 'inset 0 1px 0 rgba(255,255,255,0.54), inset 0 -18px 42px rgba(181,149,106,0.06)',
        previewBorder: 'rgba(181,149,106,0.18)',
        previewShadow: '0 22px 48px -40px rgba(42,37,34,0.46)',
        photoShadow: '0 14px 34px -26px rgba(42,37,34,0.34)',
        imageOpacity: 0.12,
        paperBrightness: 3.0,
        paperSaturation: 0.2,
        paperOpacity: 0.14,
      };
}

export function getAuthorCardLayout(citation: string, description: string): AuthorCardLayout {
  const load = citation.length + Math.max(0, description.length - 360) * 0.55;

  if (load > 460) {
    return {
      variant: 'compact',
      topPadding: 202,
      sidePadding: 76,
      bottomPadding: 54,
      tapeWidth: 330,
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
      quoteFontSize: 27,
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
      topPadding: 210,
      sidePadding: 74,
      bottomPadding: 52,
      tapeWidth: 340,
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
      quoteFontSize: 30,
      quoteLineHeight: 1.44,
      quoteMarginBottom: 18,
      sourceFontSize: 28,
      maxDescriptionChars: 500,
      maxCitationChars: 450,
    };
  }

  return {
    variant: 'airy',
    topPadding: 218,
    sidePadding: 78,
    bottomPadding: 56,
    tapeWidth: 350,
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
    quoteFontSize: 34,
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
