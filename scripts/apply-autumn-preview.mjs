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
    '09-08': 'levitan-golden-autumn',
    '09-09': 'halle-vendanges-automne',
    '09-10': 'goya-vendimia-otono',
    '09-11': 'bruegel-harvesters-autumn',
    '09-12': 'monet-autumn-argenteuil',
  };
  const autumnPreviewId = autumnPreviewSchedule[dataIso.slice(5)];
  if (autumnPreviewId) {
    const autumnArtworks = SEASONAL_ARTWORKS.autumn;
    const previewArtwork = autumnArtworks?.find((artwork) => artwork.id === autumnPreviewId);
    if (previewArtwork) return previewArtwork;
  }

`;

const existingPreviewRegex = /  \/\/ Branch-only visual preview:[\s\S]*?  }\n\n/;
if (source.includes('const autumnPreviewSchedule: Record<string, string>')) {
  source = source.replace(existingPreviewRegex, previewOverride);
} else {
  if (!source.includes(marker)) throw new Error('getSeasonalArtwork marker not found.');
  source = source.replace(marker, `${marker}${previewOverride}`);
}

await writeFile(file, source);
console.log('Autumn preview mapped to populated dates 8–12 September.');
