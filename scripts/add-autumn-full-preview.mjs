import { readFile, writeFile } from 'node:fs/promises';

const file = 'lib/seasonal-artwork.ts';
let source = await readFile(file, 'utf8');

const previewSchedule = {
  '08-14': 'poussin-automne',
  '08-15': 'valckenborch-autumn-september',
  '08-16': 'cole-catskill-early-autumn',
  '08-17': 'renoir-autumn-landscape',
  '08-18': 'church-autumn',
  '08-19': 'chase-gathering-autumn-flowers',
  '08-20': 'homer-autumn-tree-tops',
  '08-21': 'millet-haystacks-autumn',
  '08-22': 'boucher-autumn',
  '08-23': 'bastien-lepage-october',
  '08-24': 'millais-autumn-leaves',
  '08-25': 'grimshaw-october-gold',
  '08-26': 'klimt-beech-grove',
  '08-27': 'bruegel-return-herd',
  '08-28': 'cropsey-hudson-autumn',
  '08-29': 'inness-october',
  '08-30': 'levitan-sokolniki',
  '08-31': 'shishkin-autumn',
  '09-01': 'van-gogh-four-trees',
  '09-02': 'inness-near-village-october',
  '09-03': 'cropsey-sugar-loaf',
  '09-04': 'van-gogh-red-vineyard',
  '09-05': 'cole-crawford-notch',
  '09-06': 'gifford-october-catskills',
  '09-07': 'richards-october',
  '09-08': 'levitan-golden-autumn',
  '09-09': 'halle-vendanges-automne',
  '09-10': 'goya-vendimia-otono',
  '09-11': 'bruegel-harvesters-autumn',
  '09-12': 'monet-autumn-argenteuil',
};

const block = `  // Branch-only visual preview. These mappings are temporary and must never be merged to main.\n  const autumnPreviewSchedule: Record<string, string> = ${JSON.stringify(previewSchedule, null, 4).replace(/^/gm, '  ').trimStart()};\n  const autumnPreviewId = autumnPreviewSchedule[dataIso.slice(5)];\n  if (autumnPreviewId) {\n    const autumnArtworks = SEASONAL_ARTWORKS.autumn;\n    const previewArtwork = autumnArtworks?.find((artwork) => artwork.id === autumnPreviewId);\n    if (previewArtwork) return previewArtwork;\n  }\n\n`;

const fnMarker = `export function getSeasonalArtwork(\n  season: SeasonId,\n  dataIso = 'seasonal-default',\n): SeasonalArtwork | undefined {\n`;
if (!source.includes(fnMarker)) throw new Error('getSeasonalArtwork marker not found.');

const previewBlockRegex = /  \/\/ Branch-only visual preview\. These mappings are temporary and must never be merged to main\.[\s\S]*?    if \(previewArtwork\) return previewArtwork;\n  \}\n\n/g;
source = source.replace(previewBlockRegex, '');
source = source.replace(fnMarker, `${fnMarker}${block}`);

await writeFile(file, source);
console.log(`Mapped ${Object.keys(previewSchedule).length} autumn artworks to populated past dates for branch-only review.`);
