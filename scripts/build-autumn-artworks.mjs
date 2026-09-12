import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUTPUT_DIR = path.join(process.cwd(), 'public/images/seasonal');
const USER_AGENT = 'DayAtlasSeasonalArt/1.0 (https://dayatlas.vercel.app/)';

// Keep the complete artwork in the local WebP. Cropping is intentionally
// non-destructive and happens only in fixed-ratio UI surfaces through
// SeasonalArtwork.ticketAlignment / revealPosition.
const assets = [
  { out: 'halle-vendanges-automne.webp', commons: "Noël Hallé - Les Vendanges ou l'Automne - 1776.jpg" },
  { out: 'goya-vendimia-otono.webp', commons: 'Francisco de Goya - La vendimia o El Otoño (1786).jpg' },
  { out: 'poussin-automne.webp', commons: 'Four-seasons-autumn.jpg' },
  { out: 'boucher-autumn.webp', commons: 'The Four Seasons, Autumn - Boucher 1755.jpg' },
  { out: 'monet-autumn-argenteuil.webp', commons: 'Monet, Autumn Effect at Argenteuil, Courtauld Gallery.jpg' },
  { out: 'levitan-golden-autumn.webp', commons: 'Golden Autumn by Isaac Levitan in the State Tretyakov Gallery IMG 5116.jpg' },
  { out: 'church-autumn.webp', commons: 'Autumn by Frederic Edwin Church, 1875 AD, oil on canvas - Museo Nacional Centro de Arte Reina Sofía - DSC08703.JPG' },
  { out: 'valckenborch-autumn-september.webp', commons: 'Lucas van Valckenborch - Autumn landscape (September).jpg' },
  { out: 'renoir-autumn-landscape.webp', commons: "Pierre-Auguste Renoir - Autumn Landscape (Paysage d'automne) - BF933 - Barnes Foundation.jpg" },
  { out: 'cole-catskill-early-autumn.webp', commons: 'View on the Catskill—Early Autumn MET DT2639.jpg' },
  { out: 'millet-haystacks-autumn.webp', commons: 'Haystacks- Autumn MET DP124093.jpg' },
  { out: 'chase-gathering-autumn-flowers.webp', commons: 'Gathering Autumn Flowers A17586.jpg' },
  { out: 'homer-autumn-tree-tops.webp', commons: 'Autumn Tree Tops by Winslow Homer.jpg' },
  { out: 'bastien-lepage-october.webp', commons: 'Jules Bastien-Lepage - October - Google Art Project.jpg' },

  { out: 'millais-autumn-leaves.webp', commons: 'John Everett Millais - Autumn Leaves.jpeg' },
  { out: 'grimshaw-october-gold.webp', commons: 'John Atkinson Grimshaw - October Gold.jpg' },
  { out: 'klimt-beech-grove.webp', commons: 'Gustav Klimt - Beech Grove I - Google Art Project.jpg' },
  { out: 'bruegel-return-herd.webp', commons: 'Pieter Bruegel (I) - The Return of the Herd (1565).jpg' },
  { out: 'cropsey-hudson-autumn.webp', commons: 'Autumn--On the Hudson River-1860-Jasper Francis Cropsey.jpg' },
  { out: 'inness-october.webp', commons: 'October LACMA 39.12.12 (2 of 2).jpg' },
  { out: 'levitan-sokolniki.webp', commons: 'Levitan Sokolniki Autumn 1879.jpg' },
  { out: 'shishkin-autumn.webp', commons: 'Autumn 1892 (Shishkin).jpg' },
  { out: 'van-gogh-four-trees.webp', commons: 'Vincent van Gogh - Herfstlandschap (1885).jpg' },
  { out: 'inness-near-village-october.webp', commons: 'George Inness - Near the Village, October - Google Art Project.jpg' },
  { out: 'cropsey-sugar-loaf.webp', metObjectId: 10578 },
  { out: 'van-gogh-red-vineyard.webp', commons: 'Vincent van Gogh - Red Vineyard at Arles (1888).jpg' },
  { out: 'cole-crawford-notch.webp', commons: 'Thomas Cole - A View of the Mountain Pass Called the Notch of the White Mountains.jpg' },
  { out: 'gifford-october-catskills.webp', commons: 'October in the Catskills by Sanford Robinson Gifford, 1879, High Museum of Art.jpg' },
  { out: 'richards-october.webp', commons: 'William Trost Richards, October, 1863, NGA 127263.jpg' },
];

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function commonsImageUrl(filename) {
  const title = `File:${filename}`;
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    iiprop: 'url|mime',
    redirects: '1',
    titles: title,
  }).toString();

  const data = await fetchJson(url);
  const page = data?.query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  if (!info?.url) throw new Error(`Wikimedia Commons file not resolved: ${title}`);
  if (!String(info.mime || '').startsWith('image/')) {
    throw new Error(`Unexpected MIME for ${title}: ${info.mime}`);
  }
  return info.url;
}

async function metImageUrl(objectId) {
  const data = await fetchJson(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectId}`);
  if (!data?.isPublicDomain || !data?.primaryImage) {
    throw new Error(`Met object ${objectId} has no public-domain primary image`);
  }
  return data.primaryImage;
}

async function download(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function buildAsset(asset) {
  const sourceUrl = asset.commons
    ? await commonsImageUrl(asset.commons)
    : await metImageUrl(asset.metObjectId);
  const input = await download(sourceUrl);
  const image = sharp(input, { failOn: 'error' }).rotate();
  const before = await image.metadata();

  const outputPath = path.join(OUTPUT_DIR, asset.out);
  await image
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, effort: 6, smartSubsample: true })
    .toFile(outputPath);
  const after = await sharp(outputPath).metadata();
  console.log(`${asset.out}: ${before.width}x${before.height} -> ${after.width}x${after.height}`);
}

await mkdir(OUTPUT_DIR, { recursive: true });
for (const asset of assets) await buildAsset(asset);
console.log(`Built ${assets.length} autumn artwork assets.`);
