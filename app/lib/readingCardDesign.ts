export type ReadingSocialCardKind = 'poesia' | 'bibbia';

export interface ReadingSocialCardLayout {
  variant: 'airy' | 'balanced' | 'compact';
  dateFontSize: number;
  dateWidth: number;
  badgeWidth: number;
  badgeHeight: number;
  headingTop: number;
  headingLeft: number;
  headingWidth: number;
  headingFontSize: number;
  headingLineHeight: number;
  headingMaxLines: number;
  sourceTop: number;
  sourceWidth: number;
  sourceFontSize: number;
  sourceLineHeight: number;
  sourceMaxLines: number;
  photoTop: number;
  photoRight: number;
  photoWidth: number;
  photoHeight: number;
  photoPadding: number;
  photoAngle: number;
  bodyTop: number;
  bodyLeft: number;
  bodyWidth: number;
  bodyFontSize: number;
  bodyLineHeight: number;
  bodyMaxLines: number;
  bodyMaxChars: number;
  bodyRuleTop: number;
  bodyRuleWidth: number;
  footerBottom: number;
  footerSignatureFontSize: number;
  footerUrlFontSize: number;
}

const SOCIAL_CONTENT_BOTTOM = 1638;
const FOOTER_BOTTOM = 70;

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeReadingText(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeReadingInlineText(value: string | null | undefined): string {
  return normalizeReadingText(value).replace(/\s+/g, ' ').trim();
}

export function normalizeBibleReference(value: string | null | undefined): string {
  return normalizeReadingInlineText(value)
    .replace(/\s*\(\s*CEI\s*2008\s*\)\s*$/i, '')
    .replace(/\s+CEI\s*2008\s*$/i, '')
    .trim();
}

/**
 * Keeps a poem author on deliberate editorial levels instead of allowing an
 * incidental browser wrap to move the composition.
 */
export function splitReadingHeading(value: string | null | undefined): string[] {
  const normalized = normalizeReadingInlineText(value);
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

export function getReadingHeadingLines(kind: ReadingSocialCardKind, value: string | null | undefined): string[] {
  const normalized = kind === 'bibbia'
    ? normalizeBibleReference(value)
    : normalizeReadingInlineText(value);

  if (!normalized) return [];
  return kind === 'bibbia' ? [normalized] : splitReadingHeading(normalized);
}

/**
 * Truncates only as a last-resort safety valve while preserving the line
 * breaks that make a poem or a biblical passage readable.
 */
export function clampReadingText(value: string, maxChars: number): string {
  const normalized = normalizeReadingText(value);
  if (normalized.length <= maxChars) return normalized;

  const trimmed = normalized.slice(0, maxChars + 1);
  const lastSpace = trimmed.lastIndexOf(' ');
  const cut = lastSpace > maxChars * 0.72 ? trimmed.slice(0, lastSpace) : trimmed.slice(0, maxChars);
  return `${cut.trimEnd()}\u2026`;
}

function estimateReadingLineCount(value: string, width: number, fontSize: number): number {
  const normalized = normalizeReadingText(value);
  if (!normalized) return 0;

  const estimatedCharsPerLine = Math.max(16, Math.floor(width / (fontSize * 0.46)));
  return normalized.split('\n').reduce((total, line) => {
    if (!line) return total + 0.72;
    return total + Math.max(1, Math.ceil(line.length / estimatedCharsPerLine));
  }, 0);
}

function getBodyFontSize(
  kind: ReadingSocialCardKind,
  variant: ReadingSocialCardLayout['variant'],
): number {
  if (kind === 'poesia') {
    return variant === 'airy' ? 58 : variant === 'balanced' ? 49 : 41;
  }

  return variant === 'airy' ? 58 : variant === 'balanced' ? 50 : 42;
}

function getBodyLineHeight(kind: ReadingSocialCardKind, variant: ReadingSocialCardLayout['variant']): number {
  if (kind === 'poesia') {
    return variant === 'airy' ? 1.32 : variant === 'balanced' ? 1.3 : 1.27;
  }

  return variant === 'airy' ? 1.38 : variant === 'balanced' ? 1.34 : 1.3;
}

/**
 * Shared deterministic geometry for the two reading exports. Poetry gets a
 * small portrait in the upper corner; scripture keeps the whole upper field
 * for the reference and the passage itself.
 */
export function getReadingSocialCardLayout(
  kind: ReadingSocialCardKind,
  text: string,
  heading = '',
  hasPhoto = false,
  date = '',
): ReadingSocialCardLayout {
  const normalizedText = normalizeReadingText(text);
  const normalizedHeading = kind === 'bibbia'
    ? normalizeBibleReference(heading)
    : normalizeReadingInlineText(heading);
  const dateLength = normalizeReadingInlineText(date).length;
  const baseBodyWidth = 916;
  const bodyProbeSize = kind === 'poesia' ? 50 : 51;
  const estimatedBodyLines = estimateReadingLineCount(normalizedText, baseBodyWidth, bodyProbeSize);
  const weightedLength = normalizedText.replace(/\n/g, ' ').length;
  const variant = kind === 'poesia'
    ? estimatedBodyLines <= 10 && weightedLength <= 470
      ? 'airy'
      : estimatedBodyLines <= 17 && weightedLength <= 920
        ? 'balanced'
        : 'compact'
    : estimatedBodyLines <= 12 && weightedLength <= 560
      ? 'airy'
      : estimatedBodyLines <= 20 && weightedLength <= 1120
        ? 'balanced'
        : 'compact';

  const headingLines = getReadingHeadingLines(kind, normalizedHeading);
  const photoWidth = kind === 'poesia' && hasPhoto ? 304 : 0;
  const photoHeight = kind === 'poesia' && hasPhoto ? 354 : 0;
  const photoTop = kind === 'poesia' && hasPhoto ? 224 : 0;
  const headingTop = kind === 'poesia' ? 286 : 286;
  const headingWidth = kind === 'poesia' && hasPhoto ? 654 : 916;
  const headingLineHeight = kind === 'poesia' ? 1.02 : 1.04;
  const headingMaxSize = kind === 'poesia' ? 112 : 78;
  const headingMinSize = kind === 'poesia' ? 66 : 48;
  const longestHeadingLineLength = Math.max(1, ...headingLines.map((line) => line.length));
  const headingFontSize = clampNumber(
    Math.floor(headingWidth / (longestHeadingLineLength * (kind === 'poesia' ? 0.48 : 0.5))),
    headingMinSize,
    headingMaxSize,
  );
  const headingHeight = Math.max(1, headingLines.length) * headingFontSize * headingLineHeight;
  const sourceTop = Math.round(headingTop + headingHeight + 18);
  const sourceFontSize = kind === 'poesia'
    ? variant === 'airy' ? 36 : variant === 'balanced' ? 32 : 28
    : 0;
  const sourceLineHeight = 1.24;
  const sourceMaxLines = kind === 'poesia' ? 2 : 0;
  const bodyTop = kind === 'poesia'
    ? hasPhoto ? Math.max(676, sourceTop + sourceFontSize * sourceLineHeight + 40) : Math.max(548, sourceTop + sourceFontSize * sourceLineHeight + 40)
    : Math.max(492, sourceTop + 34);
  const bodyFontSize = getBodyFontSize(kind, variant);
  const bodyLineHeight = getBodyLineHeight(kind, variant);
  const bodyAvailableHeight = Math.max(380, SOCIAL_CONTENT_BOTTOM - bodyTop - 30);
  const bodyMaxLines = Math.max(
    5,
    Math.floor(bodyAvailableHeight / (bodyFontSize * bodyLineHeight)),
  );
  const bodyCharsPerLine = Math.max(24, Math.floor(baseBodyWidth / (bodyFontSize * 0.46)));
  const bodyMaxChars = Math.max(
    360,
    Math.floor(bodyMaxLines * bodyCharsPerLine * (kind === 'poesia' ? 1.14 : 1.08)),
  );
  const bodyRuleTop = Math.max(0, bodyTop - 30);

  return {
    variant,
    dateFontSize: dateLength > 28 ? 42 : dateLength > 18 ? 48 : 54,
    dateWidth: clampNumber(250 + dateLength * 12, 290, 440),
    badgeWidth: 380,
    badgeHeight: 72,
    headingTop,
    headingLeft: 82,
    headingWidth,
    headingFontSize,
    headingLineHeight,
    headingMaxLines: headingLines.length > 1 ? 2 : 1,
    sourceTop,
    sourceWidth: kind === 'poesia' ? 620 : 0,
    sourceFontSize,
    sourceLineHeight,
    sourceMaxLines,
    photoTop,
    photoRight: 82,
    photoWidth,
    photoHeight,
    photoPadding: 16,
    photoAngle: kind === 'poesia' ? 2.1 : 0,
    bodyTop,
    bodyLeft: 82,
    bodyWidth: baseBodyWidth,
    bodyFontSize,
    bodyLineHeight,
    bodyMaxLines,
    bodyMaxChars,
    bodyRuleTop,
    bodyRuleWidth: kind === 'poesia' ? 224 : 176,
    footerBottom: FOOTER_BOTTOM,
    footerSignatureFontSize: 64,
    footerUrlFontSize: 22,
  };
}
