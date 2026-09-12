import { readFile, writeFile } from 'node:fs/promises';

const file = 'lib/seasonal-artwork.ts';
let source = await readFile(file, 'utf8');

const artworks = [
  { id:'halle-vendanges-automne', title:'Les Vendanges ou l’Automne', ticketTitle:'les vendanges ou l’automne', year:'1776', artist:'Noël Hallé', collection:'Château de Versailles, Petit Trianon', medium:'Olio su tela', imageUrl:'/images/seasonal/halle-vendanges-automne.webp', sourceUrl:'https://pop.culture.gouv.fr/notice/joconde/000PE011716', linkKind:'museum', revealPosition:'50% 42%', ticketAlignment:'xMidYMid', tone:'balanced' },
  { id:'goya-vendimia-otono', title:'La vendimia o El Otoño', ticketTitle:'la vendimia o el otoño', year:'1786', artist:'Francisco de Goya', collection:'Museo Nacional del Prado, Madrid', medium:'Olio su tela', imageUrl:'/images/seasonal/goya-vendimia-otono.webp', sourceUrl:'https://www.museodelprado.es/coleccion/obra-de-arte/la-vendimia-o-el-otoo/3fdc2d25-e302-42ec-9ac5-6216ca7bfe74', linkKind:'museum', revealPosition:'50% 38%', ticketAlignment:'xMidYMid', tone:'bright' },
  { id:'poussin-automne', title:'L’Automne / La Grappe de Canaan', ticketTitle:'l’automne / la grappe de canaan', year:'1660–1664', artist:'Nicolas Poussin', collection:'Musée du Louvre, Parigi', medium:'Olio su tela', imageUrl:'/images/seasonal/poussin-automne.webp', sourceUrl:'https://collections.louvre.fr/en/ark:/53355/cl010062440', linkKind:'museum', revealPosition:'50% 48%', ticketAlignment:'xMidYMid', tone:'dense' },
  { id:'boucher-autumn', title:'The Four Seasons: Autumn', ticketTitle:'the four seasons: autumn', year:'1755', artist:'François Boucher', collection:'The Frick Collection, New York', medium:'Olio su tela', imageUrl:'/images/seasonal/boucher-autumn.webp', sourceUrl:'https://www.frick.org/exhibitions/yukhnovich/boucher_autumn', linkKind:'museum', revealPosition:'50% 42%', ticketAlignment:'xMidYMid', tone:'balanced' },
  { id:'bruegel-harvesters-autumn', title:'The Harvesters', ticketTitle:'the harvesters', year:'1565', artist:'Pieter Bruegel il Vecchio', collection:'The Metropolitan Museum of Art, New York', medium:'Olio su tavola', imageUrl:'/images/seasonal/bruegel-harvesters.webp', sourceUrl:'https://www.metmuseum.org/art/collection/search/435809', linkKind:'museum', revealPosition:'56% center', ticketAlignment:'xMidYMid', tone:'dense' },
  { id:'monet-autumn-argenteuil', title:'Autumn Effect at Argenteuil', ticketTitle:'autumn effect at argenteuil', year:'1873', artist:'Claude Monet', collection:'The Courtauld Gallery, Londra', medium:'Olio su tela', imageUrl:'/images/seasonal/monet-autumn-argenteuil.webp', sourceUrl:'https://gallerycollections.courtauld.ac.uk/object-p-1932-sc-274', linkKind:'museum', revealPosition:'52% center', ticketAlignment:'xMidYMid', tone:'balanced' },
  { id:'levitan-golden-autumn', title:'Golden Autumn', ticketTitle:'golden autumn', year:'1895', artist:'Isaac Levitan', collection:'State Tretyakov Gallery, Mosca', medium:'Olio su tela', imageUrl:'/images/seasonal/levitan-golden-autumn.webp', sourceUrl:'https://www.tretyakovgallery.ru/', linkKind:'museum', revealPosition:'50% 52%', ticketAlignment:'xMidYMid', tone:'bright' },
  { id:'church-autumn', title:'Autumn', ticketTitle:'autumn', year:'1875', artist:'Frederic Edwin Church', collection:'Museo Nacional Thyssen-Bornemisza, Madrid', medium:'Olio su tela', imageUrl:'/images/seasonal/church-autumn.webp', sourceUrl:'https://www.museothyssen.org/en/collection/artists/church-frederic-edwin/autumn', linkKind:'museum', revealPosition:'50% 48%', ticketAlignment:'xMidYMid', tone:'bright' },
  { id:'valckenborch-autumn-september', title:'Herbstlandschaft (September)', ticketTitle:'herbstlandschaft (september)', year:'1585', artist:'Lucas van Valckenborch', collection:'Kunsthistorisches Museum, Vienna', medium:'Olio su tavola', imageUrl:'/images/seasonal/valckenborch-autumn-september.webp', sourceUrl:'https://www.khm.at/kunstwerke/herbstlandschaft-september-1994', linkKind:'museum', revealPosition:'52% 48%', ticketAlignment:'xMidYMid', tone:'dense' },
  { id:'renoir-autumn-landscape', title:'Autumn Landscape (Paysage d’automne)', ticketTitle:'autumn landscape', year:'ca. 1884', artist:'Pierre-Auguste Renoir', collection:'Barnes Foundation, Philadelphia', medium:'Olio su tela', imageUrl:'/images/seasonal/renoir-autumn-landscape.webp', sourceUrl:'https://collection.barnesfoundation.org/objects/5087/details', linkKind:'museum', revealPosition:'50% 45%', ticketAlignment:'xMidYMid', tone:'balanced' },
  { id:'cole-catskill-early-autumn', title:'View on the Catskill—Early Autumn', ticketTitle:'view on the catskill—early autumn', year:'1836–1837', artist:'Thomas Cole', collection:'The Metropolitan Museum of Art, New York', medium:'Olio su tela', imageUrl:'/images/seasonal/cole-catskill-early-autumn.webp', sourceUrl:'https://www.metmuseum.org/art/collection/search/10501', linkKind:'museum', revealPosition:'50% 50%', ticketAlignment:'xMidYMid', tone:'balanced' },
  { id:'millet-haystacks-autumn', title:'Haystacks: Autumn', ticketTitle:'haystacks: autumn', year:'ca. 1874', artist:'Jean-François Millet', collection:'The Metropolitan Museum of Art, New York', medium:'Olio su tela', imageUrl:'/images/seasonal/millet-haystacks-autumn.webp', sourceUrl:'https://www.metmuseum.org/art/collection/search/437097', linkKind:'museum', revealPosition:'50% 50%', ticketAlignment:'xMidYMid', tone:'dense' },
  { id:'chase-gathering-autumn-flowers', title:'Gathering Autumn Flowers', ticketTitle:'gathering autumn flowers', year:'1894–1895', artist:'William Merritt Chase', collection:'National Gallery of Art, Washington', medium:'Olio su tela', imageUrl:'/images/seasonal/chase-gathering-autumn-flowers.webp', sourceUrl:'https://www.nga.gov/artworks/157922-gathering-autumn-flowers', linkKind:'museum', revealPosition:'50% 42%', ticketAlignment:'xMidYMid', tone:'bright' },
  { id:'homer-autumn-tree-tops', title:'Autumn Tree Tops', ticketTitle:'autumn tree tops', year:'1873', artist:'Winslow Homer', collection:'Cooper Hewitt, Smithsonian Design Museum, New York', medium:'Acquerello su carta', imageUrl:'/images/seasonal/homer-autumn-tree-tops.webp', sourceUrl:'https://collection.cooperhewitt.org/objects/18204465/', linkKind:'museum', revealPosition:'50% 45%', ticketAlignment:'xMidYMid', tone:'balanced' },
  { id:'bastien-lepage-october', title:'October (Saison d’octobre)', ticketTitle:'october', year:'1878', artist:'Jules Bastien-Lepage', collection:'National Gallery of Victoria, Melbourne', medium:'Olio su tela', imageUrl:'/images/seasonal/bastien-lepage-october.webp', sourceUrl:'https://www.ngv.vic.gov.au/explore/collection/work/3768/', linkKind:'museum', revealPosition:'50% 38%', ticketAlignment:'xMidYMin', tone:'dense' },

  { id:'millais-autumn-leaves', title:'Autumn Leaves', ticketTitle:'autumn leaves', year:'1856', artist:'John Everett Millais', collection:'Manchester Art Gallery', medium:'Olio su tela', imageUrl:'/images/seasonal/millais-autumn-leaves.webp', sourceUrl:'https://manchesterartgallery.org/', linkKind:'museum', revealPosition:'50% 42%', ticketAlignment:'xMidYMid', tone:'dense' },
  { id:'grimshaw-october-gold', title:'October Gold', ticketTitle:'october gold', year:'1885', artist:'John Atkinson Grimshaw', collection:'Collezione privata', medium:'Olio su tela', imageUrl:'/images/seasonal/grimshaw-october-gold.webp', sourceUrl:'https://www.sothebys.com/en/auctions/ecatalogue/2018/european-art-n09869/lot.37.html', linkKind:'source', revealPosition:'50% 46%', ticketAlignment:'xMidYMid', tone:'dense' },
  { id:'klimt-beech-grove', title:'Buchenwald I / Beech Grove I', ticketTitle:'beech grove i', year:'1902', artist:'Gustav Klimt', collection:'Albertinum – Galerie Neue Meister, Dresda', medium:'Olio su tela', imageUrl:'/images/seasonal/klimt-beech-grove.webp', sourceUrl:'https://skd-online-collection.skd.museum/Details/Index/246365', linkKind:'museum', revealPosition:'50% 50%', ticketAlignment:'xMidYMid', tone:'dense' },
  { id:'bruegel-return-herd', title:'The Return of the Herd (Autumn)', ticketTitle:'the return of the herd', year:'1565', artist:'Pieter Bruegel il Vecchio', collection:'Kunsthistorisches Museum, Vienna', medium:'Olio su tavola', imageUrl:'/images/seasonal/bruegel-return-herd.webp', sourceUrl:'https://www.khm.at/', linkKind:'museum', revealPosition:'52% 50%', ticketAlignment:'xMidYMid', tone:'dense' },
  { id:'cropsey-hudson-autumn', title:'Autumn — On the Hudson River', ticketTitle:'autumn — on the hudson river', year:'1860', artist:'Jasper Francis Cropsey', collection:'National Gallery of Art, Washington', medium:'Olio su tela', imageUrl:'/images/seasonal/cropsey-hudson-autumn.webp', sourceUrl:'https://www.nga.gov/artworks/46474-autumn-hudson-river', linkKind:'museum', revealPosition:'50% 50%', ticketAlignment:'xMidYMid', tone:'bright' },
  { id:'inness-october', title:'October', ticketTitle:'october', year:'1882/1886', artist:'George Inness', collection:'LACMA, Los Angeles', medium:'Olio su tela', imageUrl:'/images/seasonal/inness-october.webp', sourceUrl:'https://collections.lacma.org/object/3927', linkKind:'museum', revealPosition:'50% 50%', ticketAlignment:'xMidYMid', tone:'balanced' },
  { id:'levitan-sokolniki', title:'Autumn Day. Sokolniki', ticketTitle:'autumn day. sokolniki', year:'1879', artist:'Isaac Levitan', collection:'State Tretyakov Gallery, Mosca', medium:'Olio su tela', imageUrl:'/images/seasonal/levitan-sokolniki.webp', sourceUrl:'https://www.tretyakovgallery.ru/', linkKind:'museum', revealPosition:'50% 38%', ticketAlignment:'xMidYMin', tone:'balanced' },
  { id:'shishkin-autumn', title:'Autumn', ticketTitle:'autumn', year:'1892', artist:'Ivan Shishkin', collection:'Collezione privata', medium:'Olio su tela', imageUrl:'/images/seasonal/shishkin-autumn.webp', sourceUrl:'https://www.sothebys.com/', linkKind:'source', revealPosition:'50% 40%', ticketAlignment:'xMidYMin', tone:'dense' },
  { id:'van-gogh-four-trees', title:'Autumn Landscape with Four Trees', ticketTitle:'autumn landscape with four trees', year:'novembre 1885', artist:'Vincent van Gogh', collection:'Kröller-Müller Museum, Otterlo', medium:'Olio su tela', imageUrl:'/images/seasonal/van-gogh-four-trees.webp', sourceUrl:'https://krollermuller.nl/', linkKind:'museum', revealPosition:'50% 50%', ticketAlignment:'xMidYMid', tone:'dense' },
  { id:'inness-near-village-october', title:'Near the Village, October', ticketTitle:'near the village, october', year:'1892', artist:'George Inness', collection:'Cincinnati Art Museum', medium:'Olio su tela', imageUrl:'/images/seasonal/inness-near-village-october.webp', sourceUrl:'https://collection.cincinnatiartmuseum.org/objects/108952/near-the-village-october', linkKind:'museum', revealPosition:'50% 50%', ticketAlignment:'xMidYMid', tone:'balanced' },
  { id:'cropsey-sugar-loaf', title:'Autumn Landscape, Sugar Loaf Mountain, Orange County, New York', ticketTitle:'autumn landscape, sugar loaf mountain', year:'ca. 1870–1875', artist:'Jasper Francis Cropsey', collection:'The Metropolitan Museum of Art, New York', medium:'Olio su tela', imageUrl:'/images/seasonal/cropsey-sugar-loaf.webp', sourceUrl:'https://www.metmuseum.org/art/collection/search/10578', linkKind:'museum', revealPosition:'50% 50%', ticketAlignment:'xMidYMid', tone:'bright' },
  { id:'van-gogh-red-vineyard', title:'The Red Vineyard', ticketTitle:'the red vineyard', year:'novembre 1888', artist:'Vincent van Gogh', collection:'Pushkin State Museum of Fine Arts, Mosca', medium:'Olio su tela', imageUrl:'/images/seasonal/van-gogh-red-vineyard.webp', sourceUrl:'https://www.conservation.pushkinmuseum.art/data/specprojects/van-gogh-red-vineyard/index-eng.html', linkKind:'museum', revealPosition:'50% 50%', ticketAlignment:'xMidYMid', tone:'dense' },
  { id:'cole-crawford-notch', title:'A View of the Mountain Pass Called the Notch of the White Mountains (Crawford Notch)', ticketTitle:'crawford notch', year:'1839', artist:'Thomas Cole', collection:'National Gallery of Art, Washington', medium:'Olio su tela', imageUrl:'/images/seasonal/cole-crawford-notch.webp', sourceUrl:'https://www.nga.gov/artworks/50727-view-mountain-pass-called-notch-white-mountains-crawford-notch', linkKind:'museum', revealPosition:'50% 50%', ticketAlignment:'xMidYMid', tone:'dense' },
  { id:'gifford-october-catskills', title:'October in the Catskills', ticketTitle:'october in the catskills', year:'1879', artist:'Sanford Robinson Gifford', collection:'High Museum of Art, Atlanta', medium:'Olio su tela', imageUrl:'/images/seasonal/gifford-october-catskills.webp', sourceUrl:'https://high.org/collection/october-in-the-catskills/', linkKind:'museum', revealPosition:'50% 46%', ticketAlignment:'xMidYMid', tone:'balanced' },
  { id:'richards-october', title:'October', ticketTitle:'october', year:'1863', artist:'William Trost Richards', collection:'National Gallery of Art, Washington', medium:'Olio su tela', imageUrl:'/images/seasonal/richards-october.webp', sourceUrl:'https://www.nga.gov/artworks/127263-october', linkKind:'museum', revealPosition:'50% 44%', ticketAlignment:'xMidYMid', tone:'balanced' },
];

const earlyOrder = [
  'halle-vendanges-automne',
  'goya-vendimia-otono',
  'bruegel-harvesters-autumn',
  'monet-autumn-argenteuil',
  'levitan-golden-autumn',
  'poussin-automne',
  'valckenborch-autumn-september',
  'cole-catskill-early-autumn',
  'renoir-autumn-landscape',
  'church-autumn',
  'chase-gathering-autumn-flowers',
  'homer-autumn-tree-tops',
  'millet-haystacks-autumn',
  'boucher-autumn',
  'bastien-lepage-october',
];

const fullOrder = [
  'millais-autumn-leaves',
  'grimshaw-october-gold',
  'klimt-beech-grove',
  'bruegel-return-herd',
  'cropsey-hudson-autumn',
  'inness-october',
  'levitan-sokolniki',
  'shishkin-autumn',
  'van-gogh-four-trees',
  'inness-near-village-october',
  'cropsey-sugar-loaf',
  'van-gogh-red-vineyard',
  'cole-crawford-notch',
  'gifford-october-catskills',
  'richards-october',
];

function indentJson(value, spaces) {
  const pad = ' '.repeat(spaces);
  return JSON.stringify(value, null, 2)
    .split('\n')
    .map((line, index) => index === 0 ? line : pad + line)
    .join('\n');
}

const autumnStart = source.indexOf('  autumn: [');
if (autumnStart < 0) throw new Error('Autumn block start not found.');
const autumnEndMarker = '\n  ],\n};\n\nfunction hashDate';
const autumnEnd = source.indexOf(autumnEndMarker, autumnStart);
if (autumnEnd < 0) throw new Error('Autumn block end not found.');
const autumnBlock = `  autumn: ${indentJson(artworks, 2)},`;
source = source.slice(0, autumnStart) + autumnBlock + source.slice(autumnEnd + '\n  ],'.length);

const helperMarker = 'function hashDate(value: string): number {';
if (!source.includes('const EARLY_AUTUMN_ARTWORK_IDS')) {
  const helper = `const EARLY_AUTUMN_ARTWORK_IDS = ${JSON.stringify(earlyOrder, null, 2)} as const;\n\nconst FULL_AUTUMN_ARTWORK_IDS = ${JSON.stringify(fullOrder, null, 2)} as const;\n\nfunction getAutumnArtworkForDate(dataIso: string): SeasonalArtwork | undefined {\n  const match = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(dataIso);\n  if (!match) return undefined;\n\n  const [, year, month, day] = match;\n  const current = Date.UTC(Number(year), Number(month) - 1, Number(day));\n  const earlyStart = Date.UTC(Number(year), 8, 23);\n  const earlyEnd = Date.UTC(Number(year), 9, 15);\n  const fullStart = Date.UTC(Number(year), 9, 16);\n  const fullEnd = Date.UTC(Number(year), 10, 15);\n\n  let ids: readonly string[] | undefined;\n  let start = 0;\n  if (current >= earlyStart && current <= earlyEnd) {\n    ids = EARLY_AUTUMN_ARTWORK_IDS;\n    start = earlyStart;\n  } else if (current >= fullStart && current <= fullEnd) {\n    ids = FULL_AUTUMN_ARTWORK_IDS;\n    start = fullStart;\n  } else {\n    return undefined;\n  }\n\n  const dayOffset = Math.floor((current - start) / 86_400_000);\n  const id = ids[dayOffset % ids.length];\n  return SEASONAL_ARTWORKS.autumn?.find((artwork) => artwork.id === id);\n}\n\n`;
  source = source.replace(helperMarker, helper + helperMarker);
}

// Remove the old five-day production preview schedule, if still present.
source = source.replace(/\n  if \(season === 'autumn'\) \{\n    const previewSchedule:[\s\S]*?\n  \}\n\n  const dateMatch/, `\n  if (season === 'autumn') {\n    const scheduledArtwork = getAutumnArtworkForDate(dataIso);\n    if (scheduledArtwork) return scheduledArtwork;\n\n    // Respect the curated seasonal windows exactly outside branch-only preview dates.\n    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(dataIso)) return undefined;\n  }\n\n  const dateMatch`);

// Ensure the curated schedule exists even if the old block had already disappeared.
if (!source.includes('const scheduledArtwork = getAutumnArtworkForDate(dataIso);')) {
  const marker = '  const artworks = SEASONAL_ARTWORKS[season];\n  if (!artworks?.length) return undefined;\n  if (artworks.length === 1) return artworks[0];\n\n';
  source = source.replace(marker, `${marker}  if (season === 'autumn') {\n    const scheduledArtwork = getAutumnArtworkForDate(dataIso);\n    if (scheduledArtwork) return scheduledArtwork;\n    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(dataIso)) return undefined;\n  }\n\n`);
}

const translations = Object.fromEntries(artworks.map((artwork) => [artwork.id, {
  title: artwork.title,
  collection: artwork.collection
    .replace('Parigi', 'Paris')
    .replace('Londra', 'London')
    .replace('Mosca', 'Moscow')
    .replace('Vienna', 'Vienna')
    .replace('Dresda', 'Dresden'),
}]));

const translationsStart = source.indexOf('const ARTWORK_TRANSLATIONS:');
const translationsOpen = source.indexOf('{\n', translationsStart);
if (translationsStart >= 0 && translationsOpen >= 0) {
  const insertion = Object.entries(translations)
    .map(([id, value]) => `  ${JSON.stringify(id)}: ${JSON.stringify(value)},`)
    .join('\n') + '\n';
  for (const id of artworks.map((item) => item.id)) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    source = source.replace(new RegExp(`  ['\"]${escaped}['\"]:\\s*\\{[\\s\\S]*?\\n  \\},\\n`, 'g'), '');
  }
  const refreshedOpen = source.indexOf('{\n', source.indexOf('const ARTWORK_TRANSLATIONS:'));
  source = source.slice(0, refreshedOpen + 2) + insertion + source.slice(refreshedOpen + 2);
}

await writeFile(file, source);
console.log(`Applied complete curated autumn calendar with ${artworks.length} artworks.`);
