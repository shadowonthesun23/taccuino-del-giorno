import { clampText } from '@/app/lib/authorCardDesign';

export interface SaintSocialCardEntry {
  nome: string;
  ruolo: string;
  anni: string;
  biografia: string;
}

export interface SaintSocialCardLayout {
  variant: 'airy' | 'balanced' | 'compact';
  dateFontSize: number;
  dateWidth: number;
  badgeWidth: number;
  badgeHeight: number;
  photoTop: number;
  photoRight: number;
  photoWidth: number;
  photoHeight: number;
  photoPadding: number;
  photoAngle: number;
  primaryNameTop: number;
  primaryNameLeft: number;
  primaryNameWidth: number;
  primaryNameFontSize: number;
  primaryNameLineHeight: number;
  primaryNameMaxLines: number;
  primaryMetaTop: number;
  primaryMetaWidth: number;
  primaryMetaFontSize: number;
  primaryMetaLineHeight: number;
  primaryDescriptionTop: number;
  primaryDescriptionLeft: number;
  primaryDescriptionWidth: number;
  primaryDescriptionFontSize: number;
  primaryDescriptionLineHeight: number;
  primaryDescriptionMaxLines: number;
  primaryDescriptionMaxChars: number;
  secondaryTop: number;
  secondaryWidth: number;
  secondaryItemHeight: number;
  secondaryItemGap: number;
  secondaryNameFontSize: number;
  secondaryNameLineHeight: number;
  secondaryNameMaxLines: number;
  secondaryMetaFontSize: number;
  secondaryMetaLineHeight: number;
  secondaryMetaMaxLines: number;
  secondaryDescriptionFontSize: number;
  secondaryDescriptionLineHeight: number;
  secondaryDescriptionMaxLines: number;
  secondaryDescriptionMaxChars: number;
  footerBottom: number;
  footerSignatureFontSize: number;
  footerUrlFontSize: number;
}

const SOCIAL_CONTENT_BOTTOM = 1648;

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeSaintCardText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Keeps saint names on deliberate editorial levels rather than letting an
 * incidental word wrap change the composition from one day to the next.
 */
export function splitSaintNameForSocialCard(value: string): string[] {
  const normalized = normalizeSaintCardText(value);
  if (!normalized) return [];

  const words = normalized.split(' ');
  if (words.length <= 1) return words;

  let bestSplit = 1;
  let bestImbalance = Number.POSITIVE_INFINITY;

  for (let split = 1; split < words.length; split += 1) {
    const firstLine = words.slice(0, split).join(' ');
    const secondLine = words.slice(split).join(' ');
    const imbalance = Math.abs(firstLine.length - secondLine.length);

    if (imbalance < bestImbalance) {
      bestImbalance = imbalance;
      bestSplit = split;
    }
  }

  return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
}

function estimateLineCount(value: string, width: number, fontSize: number, maxLines: number): number {
  const compactText = normalizeSaintCardText(value);
  if (!compactText) return 0;

  const estimatedCharsPerLine = Math.max(18, Math.floor(width / (fontSize * 0.45)));
  return Math.min(maxLines, Math.max(1, Math.ceil(compactText.length / estimatedCharsPerLine)));
}

function getSaintMeta(saint: SaintSocialCardEntry | undefined): string {
  if (!saint) return '';

  const role = normalizeSaintCardText(saint.ruolo);
  const years = normalizeSaintCardText(saint.anni);
  return [role, years ? `(${years})` : ''].filter(Boolean).join(' ');
}

/**
 * Deterministic geometry for the saint social folio.
 *
 * The first saint owns the visual focus. Additional saints are rendered in a
 * compact list below it, while the footer remains anchored to the same safe
 * area used by the author social folio.
 */
export function getSaintSocialCardLayout(
  saints: SaintSocialCardEntry[],
  hasPhoto: boolean,
  date = '',
): SaintSocialCardLayout {
  const primarySaint = saints[0];
  const additionalSaintCount = Math.max(0, saints.length - 1);
  const primaryName = normalizeSaintCardText(primarySaint?.nome);
  const primaryDescription = normalizeSaintCardText(primarySaint?.biografia);
  const dateLength = normalizeSaintCardText(date).length;
  const primaryNameLines = splitSaintNameForSocialCard(primaryName);
  const longestPrimaryNameLineLength = Math.max(1, ...primaryNameLines.map((line) => line.length));
  const isDense = additionalSaintCount >= 3 || primaryDescription.length > 560;
  const isBalanced = additionalSaintCount > 0 || primaryDescription.length > 300;
  const variant = isDense ? 'compact' : isBalanced ? 'balanced' : 'airy';

  const photoWidth = hasPhoto
    ? additionalSaintCount === 0 ? 520 : additionalSaintCount === 1 ? 492 : 464
    : 0;
  const photoHeight = hasPhoto
    ? additionalSaintCount === 0 ? 610 : additionalSaintCount === 1 ? 510 : 454
    : 0;
  const photoTop = hasPhoto ? (additionalSaintCount === 0 ? 240 : 228) : 0;
  const primaryNameTop = hasPhoto
    ? additionalSaintCount === 0 ? 402 : 360
    : 292;
  const primaryNameWidth = hasPhoto ? 670 : 916;
  // Keep enough leading for IM Fell's descenders (for example the "g" in
  // Magno). The title is deliberately split into explicit editorial lines,
  // so the line box can breathe without changing the wrapping logic.
  const primaryNameLineHeight = primaryName.length > 36 ? 1.02 : 1.06;
  const primaryNameMaxSize = hasPhoto
    ? additionalSaintCount === 0 ? 158 : 144
    : additionalSaintCount === 0 ? 178 : 158;
  const primaryNameAreaBottom = hasPhoto
    ? additionalSaintCount === 0 ? 732 : 674
    : 650;
  const nameFontSizeByWidth = primaryNameWidth / (longestPrimaryNameLineLength * 0.47);
  const nameFontSizeByHeight = primaryNameLines.length > 0
    ? (primaryNameAreaBottom - primaryNameTop - 12) / (primaryNameLineHeight * primaryNameLines.length)
    : primaryNameMaxSize;
  const primaryNameFontSize = clampNumber(
    Math.floor(Math.min(primaryNameMaxSize, nameFontSizeByWidth, nameFontSizeByHeight)),
    72,
    primaryNameMaxSize,
  );
  const primaryNameHeight = primaryNameLines.length * primaryNameFontSize * primaryNameLineHeight;
  const primaryMetaTop = Math.round(primaryNameTop + primaryNameHeight + 18);
  const primaryMetaWidth = hasPhoto ? 548 : 820;
  const primaryMetaFontSize = hasPhoto ? additionalSaintCount > 1 ? 27 : 32 : 35;
  const primaryMetaLineHeight = 1.18;
  const primaryMeta = getSaintMeta(primarySaint);
  const primaryMetaLines = estimateLineCount(primaryMeta, primaryMetaWidth, primaryMetaFontSize, 2);
  const primaryDescriptionTop = hasPhoto
    ? photoTop + photoHeight + (additionalSaintCount === 0 ? 56 : 44)
    : Math.max(650, primaryMetaTop + primaryMetaLines * primaryMetaFontSize * primaryMetaLineHeight + 38);
  const primaryDescriptionFontSize = additionalSaintCount === 0
    ? hasPhoto ? 40 : 43
    : additionalSaintCount === 1 ? 35 : 31;
  const primaryDescriptionLineHeight = additionalSaintCount === 0 ? 1.34 : 1.3;
  const primaryDescriptionMaxLines = additionalSaintCount === 0
    ? 14
    : additionalSaintCount === 1 ? 7 : additionalSaintCount === 2 ? 6 : additionalSaintCount === 3 ? 5 : 4;
  const primaryDescriptionMaxChars = additionalSaintCount === 0
    ? hasPhoto ? 760 : 820
    : additionalSaintCount === 1 ? 410 : additionalSaintCount === 2 ? 330 : additionalSaintCount === 3 ? 280 : 230;
  const primaryDescriptionText = clampText(primaryDescription, primaryDescriptionMaxChars);
  const primaryDescriptionLines = estimateLineCount(
    primaryDescriptionText,
    916,
    primaryDescriptionFontSize,
    primaryDescriptionMaxLines,
  );
  const primaryDescriptionBottom = primaryDescriptionTop
    + primaryDescriptionLines * primaryDescriptionFontSize * primaryDescriptionLineHeight;
  const secondaryTop = additionalSaintCount > 0
    ? Math.round(primaryDescriptionBottom + (additionalSaintCount > 2 ? 30 : 46))
    : 0;
  const secondaryItemGap = additionalSaintCount > 3 ? 18 : 26;
  const secondaryItemHeight = additionalSaintCount > 0
    ? Math.max(
      124,
      Math.floor((SOCIAL_CONTENT_BOTTOM - secondaryTop - secondaryItemGap * (additionalSaintCount - 1)) / additionalSaintCount),
    )
    : 0;
  const secondaryNameFontSize = secondaryItemHeight >= 220 ? 44 : secondaryItemHeight >= 170 ? 38 : 32;
  const secondaryNameLineHeight = 0.98;
  const secondaryNameMaxLines = secondaryItemHeight >= 180 ? 2 : 1;
  const secondaryMetaFontSize = secondaryItemHeight >= 220 ? 27 : secondaryItemHeight >= 170 ? 24 : 21;
  const secondaryMetaLineHeight = 1.16;
  const secondaryMetaMaxLines = secondaryItemHeight >= 180 ? 2 : 1;
  const secondaryDescriptionFontSize = secondaryItemHeight >= 220 ? 30 : secondaryItemHeight >= 170 ? 26 : 22;
  const secondaryDescriptionLineHeight = 1.27;
  const reservedSecondaryTextHeight = secondaryNameFontSize * secondaryNameLineHeight * secondaryNameMaxLines
    + secondaryMetaFontSize * secondaryMetaLineHeight * secondaryMetaMaxLines
    + 42;
  const secondaryDescriptionMaxLines = additionalSaintCount > 0
    ? Math.max(
      1,
      Math.floor((secondaryItemHeight - reservedSecondaryTextHeight) / (secondaryDescriptionFontSize * secondaryDescriptionLineHeight)),
    )
    : 0;
  const secondaryDescriptionCharsPerLine = Math.max(18, Math.floor(916 / (secondaryDescriptionFontSize * 0.45)));
  const secondaryDescriptionMaxChars = Math.max(
    60,
    secondaryDescriptionMaxLines * secondaryDescriptionCharsPerLine,
  );

  return {
    variant,
    dateFontSize: dateLength > 28 ? 42 : dateLength > 18 ? 48 : 54,
    dateWidth: clampNumber(250 + dateLength * 12, 290, 440),
    badgeWidth: 380,
    badgeHeight: 72,
    photoTop,
    photoRight: 76,
    photoWidth,
    photoHeight,
    photoPadding: additionalSaintCount > 1 ? 18 : 20,
    photoAngle: -2.2,
    primaryNameTop,
    primaryNameLeft: 76,
    primaryNameWidth,
    primaryNameFontSize,
    primaryNameLineHeight,
    primaryNameMaxLines: primaryNameLines.length > 1 ? 2 : 1,
    primaryMetaTop,
    primaryMetaWidth,
    primaryMetaFontSize,
    primaryMetaLineHeight,
    primaryDescriptionTop,
    primaryDescriptionLeft: 82,
    primaryDescriptionWidth: 916,
    primaryDescriptionFontSize,
    primaryDescriptionLineHeight,
    primaryDescriptionMaxLines,
    primaryDescriptionMaxChars,
    secondaryTop,
    secondaryWidth: 916,
    secondaryItemHeight,
    secondaryItemGap,
    secondaryNameFontSize,
    secondaryNameLineHeight,
    secondaryNameMaxLines,
    secondaryMetaFontSize,
    secondaryMetaLineHeight,
    secondaryMetaMaxLines,
    secondaryDescriptionFontSize,
    secondaryDescriptionLineHeight,
    secondaryDescriptionMaxLines,
    secondaryDescriptionMaxChars,
    footerBottom: 70,
    footerSignatureFontSize: 64,
    footerUrlFontSize: 22,
  };
}
