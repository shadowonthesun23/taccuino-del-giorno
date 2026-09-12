import { readFile, writeFile } from 'node:fs/promises';

const file = 'lib/seasonal-artwork.ts';
let source = await readFile(file, 'utf8');

if (!source.includes("id: 'halle-vendanges-automne'")) {
  throw new Error('Curated autumn artworks are missing from seasonal-artwork.ts.');
}

const marker = `export function getSeasonalArtwork(
  season: SeasonId,
  dataIso = 'seasonal-default',
): SeasonalArtwork | undefined {
`;

const previewOverride = `  // Branch-only visual preview: reuse dates that already have editorial content.
  // This lets us inspect the real museum/ticket rendering before 23 September.
  const autumnPreviewSchedule: Record<string, string> = {
    '09-09': 'halle-vendanges-automne',
    '09-10': 'goya-vendimia-otono',
    '09-11': 'bruegel-harvesters-autumn',
    '09-12': 'monet-autumn-argenteuil',
    '09-13': 'levitan-golden-autumn',
  };
  const autumnPreviewId = autumnPreviewSchedule[dataIso.slice(5)];
  if (autumnPreviewId) {
    const autumnArtworks = SEASONAL_ARTWORKS.autumn;
    const previewArtwork = autumnArtworks?.find((artwork) => artwork.id === autumnPreviewId);
    if (previewArtwork) return previewArtwork;
  }

`;

if (!source.includes('const autumnPreviewSchedule: Record<string, string>')) {
  if (!source.includes(marker)) throw new Error('getSeasonalArtwork marker not found.');
  source = source.replace(marker, `${marker}${previewOverride}`);
}

await writeFile(file, source);
console.log('Autumn preview mapped to populated dates 9–13 September.');
