import { readFile, writeFile } from 'node:fs/promises';

const file = 'lib/seasonal-artwork.ts';
let source = await readFile(file, 'utf8');

if (source.includes("id: 'halle-vendanges-automne'")) {
  console.log('Autumn preview already applied.');
  process.exit(0);
}

const autumnBlock = `  autumn: [
    {
      id: 'halle-vendanges-automne',
      title: 'Les Vendanges ou l’Automne',
      ticketTitle: 'les vendanges ou l’automne',
      year: '1776',
      artist: 'Noël Hallé',
      collection: 'Château de Versailles, Petit Trianon',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/halle-vendanges-automne.webp',
      sourceUrl: 'https://pop.culture.gouv.fr/notice/joconde/000PE011716',
      linkKind: 'museum',
      revealPosition: '50% 42%',
      ticketAlignment: 'xMidYMid',
      tone: 'balanced',
    },
    {
      id: 'goya-vendimia-otono',
      title: 'La vendimia o El Otoño',
      ticketTitle: 'la vendimia o el otoño',
      year: '1786',
      artist: 'Francisco de Goya',
      collection: 'Museo Nacional del Prado, Madrid',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/goya-vendimia-otono.webp',
      sourceUrl: 'https://www.museodelprado.es/coleccion/obra-de-arte/la-vendimia-o-el-otoo/3fdc2d25-e302-42ec-9ac5-6216ca7bfe74',
      linkKind: 'museum',
      revealPosition: '50% 38%',
      ticketAlignment: 'xMidYMid',
      tone: 'bright',
    },
    {
      id: 'bruegel-harvesters-autumn',
      title: 'The Harvesters',
      ticketTitle: 'the harvesters',
      year: '1565',
      artist: 'Pieter Bruegel il Vecchio',
      collection: 'The Metropolitan Museum of Art, New York',
      medium: 'Olio su tavola',
      imageUrl: '/images/seasonal/bruegel-harvesters.webp',
      sourceUrl: 'https://www.metmuseum.org/art/collection/search/435809',
      linkKind: 'museum',
      revealPosition: '56% center',
      ticketAlignment: 'xMidYMid',
      tone: 'dense',
    },
    {
      id: 'monet-autumn-argenteuil',
      title: 'Autumn Effect at Argenteuil',
      ticketTitle: 'autumn effect at argenteuil',
      year: '1873',
      artist: 'Claude Monet',
      collection: 'The Courtauld Gallery, Londra',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/monet-autumn-argenteuil.webp',
      sourceUrl: 'https://gallerycollections.courtauld.ac.uk/object-p-1932-sc-274',
      linkKind: 'museum',
      revealPosition: '52% center',
      ticketAlignment: 'xMidYMid',
      tone: 'balanced',
    },
    {
      id: 'levitan-golden-autumn',
      title: 'Golden Autumn',
      ticketTitle: 'golden autumn',
      year: '1895',
      artist: 'Isaac Levitan',
      collection: 'State Tretyakov Gallery, Mosca',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/levitan-golden-autumn.webp',
      sourceUrl: 'https://www.tretyakovgallery.ru/',
      linkKind: 'museum',
      revealPosition: '50% 52%',
      ticketAlignment: 'xMidYMid',
      tone: 'bright',
    },
  ],
`;

const collectionMarker = '  ],\n};\n\nfunction hashDate';
if (!source.includes(collectionMarker)) {
  throw new Error('Seasonal artwork collection marker not found.');
}
source = source.replace(collectionMarker, `  ],\n${autumnBlock}};\n\nfunction hashDate`);

const scheduleLogic = `  if (season === 'autumn') {
    const previewSchedule: Record<string, string> = {
      '09-23': 'halle-vendanges-automne',
      '09-24': 'goya-vendimia-otono',
      '09-25': 'bruegel-harvesters-autumn',
      '09-26': 'monet-autumn-argenteuil',
      '09-27': 'levitan-golden-autumn',
    };
    const scheduledId = previewSchedule[dataIso.slice(5)];
    if (scheduledId) return artworks.find((artwork) => artwork.id === scheduledId) ?? artworks[0];
  }

`;
const scheduleMarker = '  if (artworks.length === 1) return artworks[0];\n\n  const dateMatch';
if (!source.includes(scheduleMarker)) {
  throw new Error('Seasonal artwork selection marker not found.');
}
source = source.replace(scheduleMarker, `  if (artworks.length === 1) return artworks[0];\n\n${scheduleLogic}  const dateMatch`);

const translations = `  'halle-vendanges-automne': {
    title: 'The Grape Harvest, or Autumn',
    collection: 'Château de Versailles, Petit Trianon',
  },
  'goya-vendimia-otono': {
    title: 'The Grape Harvest, or Autumn',
    collection: 'Museo Nacional del Prado, Madrid',
  },
  'bruegel-harvesters-autumn': {
    title: 'The Harvesters',
    collection: 'The Metropolitan Museum of Art, New York',
  },
  'monet-autumn-argenteuil': {
    title: 'Autumn Effect at Argenteuil',
    collection: 'The Courtauld Gallery, London',
  },
  'levitan-golden-autumn': {
    title: 'Golden Autumn',
    collection: 'State Tretyakov Gallery, Moscow',
  },
`;
const translationMarker = "const ARTWORK_TRANSLATIONS: Record<string, { title?: string; collection?: string; year?: string }> = {\n";
if (!source.includes(translationMarker)) {
  throw new Error('Artwork translation marker not found.');
}
source = source.replace(translationMarker, `${translationMarker}${translations}`);

await writeFile(file, source);
console.log('Applied curated autumn preview for 23–27 September.');
