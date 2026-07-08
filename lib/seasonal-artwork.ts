export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export type SeasonalArtworkLinkKind = 'museum' | 'source';
export type SeasonalArtworkTone = 'bright' | 'balanced' | 'dense';

export interface SeasonalArtwork {
  id: string;
  title: string;
  ticketTitle: string;
  year: string;
  artist: string;
  collection: string;
  medium: string;
  imageUrl: string;
  sourceUrl: string;
  linkKind: SeasonalArtworkLinkKind;
  revealPosition: string;
  ticketAlignment: 'xMinYMid' | 'xMidYMid' | 'xMaxYMid' | 'xMinYMax' | 'xMidYMax' | 'xMaxYMax';
  tone: SeasonalArtworkTone;
}

export const SEASONAL_ARTWORKS: Partial<Record<SeasonId, readonly SeasonalArtwork[]>> = {
  spring: [
    {
      id: 'botticelli-primavera',
      title: 'Primavera',
      ticketTitle: 'primavera',
      year: 'circa 1480',
      artist: 'Sandro Botticelli',
      collection: 'Gallerie degli Uffizi, Firenze',
      medium: 'Tempera grassa su tavola',
      imageUrl: '/images/seasonal/botticelli-primavera.webp',
      sourceUrl: 'https://www.uffizi.it/opere/botticelli-primavera',
      linkKind: 'museum',
      revealPosition: 'center center',
      ticketAlignment: 'xMidYMid',
      tone: 'dense',
    },
  ],
  summer: [
    {
      id: 'van-gogh-wheat-field-cypresses',
      title: 'Campo di grano con cipressi',
      ticketTitle: 'campo di grano con cipressi',
      year: '1889',
      artist: 'Vincent van Gogh',
      collection: 'The Metropolitan Museum of Art, New York',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/van-gogh-wheat-field-cypresses.webp',
      sourceUrl: 'https://www.metmuseum.org/art/collection/search/436535',
      linkKind: 'museum',
      revealPosition: 'center center',
      ticketAlignment: 'xMidYMid',
      tone: 'balanced',
    },
    {
      id: 'van-gogh-summer-evening',
      title: 'Sera d’estate ad Arles',
      ticketTitle: 'sera d’estate ad arles',
      year: '1888',
      artist: 'Vincent van Gogh',
      collection: 'Kunst Museum Winterthur, Svizzera',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/van-gogh-summer-evening.webp',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Sommerabend.jpeg',
      linkKind: 'source',
      revealPosition: 'center center',
      ticketAlignment: 'xMidYMid',
      tone: 'balanced',
    },
    {
      id: 'renoir-summer-landscape',
      title: 'Paesaggio estivo',
      ticketTitle: 'paesaggio estivo',
      year: '1875',
      artist: 'Pierre-Auguste Renoir',
      collection: 'Museo Nacional Thyssen-Bornemisza, Madrid',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/renoir-woman-parasol-garden.webp',
      sourceUrl: 'https://www.museothyssen.org/en/collection/artists/renoir-pierre-auguste/woman-parasol-garden',
      linkKind: 'museum',
      revealPosition: '48% 46%',
      ticketAlignment: 'xMidYMid',
      tone: 'bright',
    },
    {
      id: 'adie-floral-garden-steps',
      title: 'Steps through a floral garden',
      ticketTitle: 'steps through a floral garden',
      year: 'senza data',
      artist: 'Edith Helena Adie',
      collection: 'Collezione privata',
      medium: 'Acquerello su carta',
      imageUrl: '/images/seasonal/adie-floral-garden-steps.webp',
      sourceUrl: 'https://www.ebay.com/itm/224428114677',
      linkKind: 'source',
      revealPosition: 'center center',
      ticketAlignment: 'xMidYMid',
      tone: 'dense',
    },
    {
      id: 'bruegel-harvesters',
      title: 'I mietitori',
      ticketTitle: 'i mietitori',
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
      id: 'constable-flatford-mill',
      title: 'Il Mulino di Flatford',
      ticketTitle: 'il mulino di flatford',
      year: '1816',
      artist: 'John Constable',
      collection: 'Tate Gallery, Londra',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/constable-flatford.webp',
      sourceUrl: 'https://www.tate.org.uk/art/artworks/constable-flatford-mill-scene-on-a-navigable-river-n01273',
      linkKind: 'museum',
      revealPosition: '56% center',
      ticketAlignment: 'xMidYMid',
      tone: 'dense',
    },
    {
      id: 'monet-papaveri',
      title: 'I papaveri di Vetheuil',
      ticketTitle: 'i papaveri di vetheuil',
      year: '1873',
      artist: 'Claude Monet',
      collection: 'Musée d\'Orsay, Parigi',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/monet-papaveri.webp',
      sourceUrl: 'https://www.musee-orsay.fr/it/opere/coquelicots-1010',
      linkKind: 'museum',
      revealPosition: '56% center',
      ticketAlignment: 'xMidYMid',
      tone: 'balanced',
    },
    {
      id: 'fuller-golden-hour',
      title: 'The Golden Hour',
      ticketTitle: 'the golden hour',
      year: '1905',
      artist: 'Florence Fuller',
      collection: 'National Gallery of Australia, Canberra',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/fuller-golden-hour.webp',
      sourceUrl: 'https://nga.gov.au/on-demand/florence-fuller-a-golden-hour-c1905/',
      linkKind: 'museum',
      revealPosition: '56% center',
      ticketAlignment: 'xMidYMid',
      tone: 'balanced',
    },
     {
      id: 'kandinsky-studio-carrozza',
      title: 'Kallmünz Studio naturale per la carrozza gialla',
      ticketTitle: 'kallmünz studio naturale per la carrozza gialla',
      year: '1903',
      artist: 'Wassily Kandinsky',
      collection: 'National Gallery of Australia, Canberra',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/kandinsky-studio-carrozza.webp',
      sourceUrl: 'https://www.meisterdrucke.it/stampe-d-arte/Wassily-Kandinsky/1343912/Kallm%C3%BCnz-%E',
      linkKind: 'museum',
      revealPosition: '56% center',
      ticketAlignment: 'xMidYMid',
      tone: 'balanced',
    },
     {
      id: 'edward-hopper-risacca',
      title: 'Risacca',
      ticketTitle: 'risacca',
      year: '1939',
      artist: 'Edward Hopper',
      collection: 'National Gallery of Art, Washington',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/edward-hopper-risacca.webp',
      sourceUrl: 'https://www.nga.gov/artworks/131206-ground-swell',
      linkKind: 'museum',
      revealPosition: '56% center',
      ticketAlignment: 'xMidYMid',
      tone: 'bright',
    },
     {
      id: 'vernet-summer-evening',
      title: 'Summer evening, landscape in Italy',
      ticketTitle: 'summer evening, landscape in italy',
      year: '1773',
      artist: 'Joseph Vernet',
      collection: 'The National Museum of Western Art, Tokyo',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/vernet-summer-evening.webp',
      sourceUrl: 'https://collection.nmwa.go.jp/en/P.1988-0002.html',
      linkKind: 'museum',
      revealPosition: '56% center',
      ticketAlignment: 'xMidYMid',
      tone: 'dense',
    },
     {
      id: 'friedrich-estate',
      title: 'L\'estate',
      ticketTitle: 'L\'estate',
      year: '1807',
      artist: 'Caspar David Friedrich',
      collection: 'Neue Pinakothek, Monaco di Baviera',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/friedrich-estate.webp',
      sourceUrl: 'https://www.sammlung.pinakothek.de/en/artwork/8eGVjAYGWQ',
      linkKind: 'museum',
      revealPosition: '56% bottom',
      ticketAlignment: 'xMidYMax',
      tone: 'balanced',
    },
    {
      id: 'sisley-estate-bougival',
      title: 'Estate a Bougival',
      ticketTitle: 'estate a bougival',
      year: '1876',
      artist: 'Alexandre-Emile Sisley',
      collection: 'Stiftung Sammlung E. G. Bührle, Zurigo',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/sisley-estate-bougival.webp',
      sourceUrl: 'https://buehrle.ch/en/artworks/summer-at-argenteuil-summer-at-bougival/',
      linkKind: 'museum',
      revealPosition: '56% center',
      ticketAlignment: 'xMidYMid',
      tone: 'balanced',
    },
    {
      id: 'homer-breezing-up',
      title: 'Breezing Up (A Fair Wind)',
      ticketTitle: 'breezing up (a fair wind)',
      year: '1876',
      artist: 'Winslow Homer',
      collection: 'National Gallery of Art, Washington',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/homer-breezing-up.webp',
      sourceUrl: 'https://www.nga.gov/artworks/30228-breezing-fair-wind',
      linkKind: 'museum',
      revealPosition: '56% center',
      ticketAlignment: 'xMidYMid',
      tone: 'dense',
    },
    {
      id: 'koekkoek-summer-day-dutch',
      title: 'A summer\'s day on a Dutch river',
      ticketTitle: 'A summer\'s day on a Dutch river',
      year: '1865',
      artist: 'Hermanus Koekkoek',
      collection: 'Collezione privata',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/koekkoek-summer-day-dutch.webp',
      sourceUrl: 'https://www.christies.com/en/lot/lot-5847889',
      linkKind: 'source',
      revealPosition: '56% center',
      ticketAlignment: 'xMidYMid',
      tone: 'bright',
    },
    {
      id: 'klimt-cottage-garden',
      title: 'Giardino di fiori',
      ticketTitle: 'Giardino di fiori',
      year: '1907',
      artist: 'Gustav Klimt',
      collection: 'Collezione privata',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/klimt-cottage-garden.webp',
      sourceUrl: 'https://www.sothebys.com/en/auctions/ecatalogue/2017/impressionist-modern-art-evening-sale-l17002/lot.11.html',
      linkKind: 'source',
      revealPosition: '56% center',
      ticketAlignment: 'xMidYMid',
      tone: 'dense',
    },
     {
      id: 'sisley-ponte-moret',
      title: 'Il ponte di Moret',
      ticketTitle: 'Il ponte di Moret',
      year: '1885',
      artist: 'Alfred Sisley',
      collection: 'Musee d\'Orsay, Parigi',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/sisley-ponte-moret.webp',
      sourceUrl: 'https://www.musee-orsay.fr/it/opere/pont-de-moret-effet-dorage-71058',
      linkKind: 'museum',
      revealPosition: '56% center',
      ticketAlignment: 'xMidYMid',
      tone: 'dense',
    },
    {
      id: 'godward-dolce-far-niente',
      title: 'Dolce Far Niente',
      ticketTitle: 'Dolce Far Niente',
      year: '1904',
      artist: 'John William Godward',
      collection: 'Collezione Privata',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/godward-dolce-far-niente.webp',
      sourceUrl: 'https://web.archive.org/web/20190808055855/http://www.the-athenaeum.org/art/detail.php?ID=128809',
      linkKind: 'source',
      revealPosition: '56% center',
      ticketAlignment: 'xMidYMid',
      tone: 'balanced',
    },
    {
      id: 'monet-ninfee',
      title: 'Ninfee',
      ticketTitle: 'Ninfee',
      year: '1906',
      artist: 'Claude Monet',
      collection: 'Art Institute di Chicago',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/monet-ninfee.webp',
      sourceUrl: 'https://www.artic.edu/artworks/16568/water-lilies',
      linkKind: 'museum',
      revealPosition: '56% center',
      ticketAlignment: 'xMidYMid',
      tone: 'dense',
    },
    {
      id: 'sohlberg-notte-destate',
      title: 'Notte d\'estate',
      ticketTitle: 'Notte d\'estate',
      year: '1899',
      artist: 'Harald Sohlberg',
      collection: 'Museo Nazionale di Oslo',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/sohlberg-notte-destate.webp',
      sourceUrl: 'https://www.nasjonalmuseet.no/en/collection/object/NG.M.00525',
      linkKind: 'museum',
      revealPosition: 'center bottom',
      ticketAlignment: 'xMidYMid',
      tone: 'dense',
    },
  ],
};

function hashDate(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getSeasonalArtwork(
  season: SeasonId,
  dataIso = 'seasonal-default',
): SeasonalArtwork | undefined {
  const artworks = SEASONAL_ARTWORKS[season];
  if (!artworks?.length) return undefined;
  if (artworks.length === 1) return artworks[0];

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataIso);
  if (!dateMatch) return artworks[hashDate(`${season}:${dataIso}`) % artworks.length];

  const [, year, month, day] = dateMatch;
  const orderedArtworks = [...artworks].sort((first, second) => (
    hashDate(`${season}:${year}:${first.id}`) - hashDate(`${season}:${year}:${second.id}`)
  ));
  const utcDay = Math.floor(Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86_400_000);

  return orderedArtworks[((utcDay % orderedArtworks.length) + orderedArtworks.length) % orderedArtworks.length];
}

const ARTWORK_TRANSLATIONS: Record<string, { title?: string; collection?: string; year?: string }> = {
  'botticelli-primavera': {
    title: 'Primavera',
    collection: 'Uffizi Gallery, Florence',
  },
  'van-gogh-wheat-field-cypresses': {
    title: 'A Wheatfield with Cypresses',
    collection: 'The Metropolitan Museum of Art, New York',
  },
  'van-gogh-summer-evening': {
    title: 'Summer Evening',
    collection: 'Kunst Museum Winterthur, Switzerland',
  },
  'renoir-summer-landscape': {
    title: 'Summer Landscape',
    collection: 'Museo Nacional Thyssen-Bornemisza, Madrid',
  },
  'adie-floral-garden-steps': {
    title: 'Steps through a Floral Garden',
    year: 'undated',
    collection: 'Private collection',
  },
  'bruegel-harvesters': {
    title: 'The Harvesters',
    collection: 'The Metropolitan Museum of Art, New York',
  },
  'constable-flatford-mill': {
    title: 'Flatford Mill (Scene on a Navigable River)',
    collection: 'Tate Britain, London',
  },
  'monet-papaveri': {
    title: 'Poppies',
    collection: "Musée d'Orsay, Paris",
  },
  'fuller-golden-hour': {
    title: 'A Golden Hour',
    collection: 'National Gallery of Australia, Canberra',
  },
  'kandinsky-studio-carrozza': {
    title: 'Kallmünz - Nature Study for the Yellow Coach',
    collection: 'National Gallery of Australia, Canberra',
  },
  'edward-hopper-risacca': {
    title: 'Ground Swell',
    collection: 'National Gallery of Art, Washington',
  },
  'vernet-summer-evening': {
    title: 'Summer Evening, Landscape in Italy',
    collection: 'The National Museum of Western Art, Tokyo',
  },
  'friedrich-estate': {
    title: 'Summer',
    collection: 'Neue Pinakothek, Munich',
  },
  'sisley-estate-bougival': {
    title: 'Summer at Bougival',
    collection: 'Stiftung Sammlung E. G. Bührle, Zurich',
  },
  'homer-breezing-up': {
    title: 'Breezing Up (A Fair Wind)',
    collection: 'National Gallery of Art, Washington',
  },
  'koekkoek-summer-day-dutch': {
    title: "A Summer's Day on a Dutch River",
    collection: 'Private collection',
  },
  'klimt-cottage-garden': {
    title: 'Cottage Garden',
    collection: 'Private collection',
  },
  'sisley-ponte-moret': {
    title: 'The Bridge at Moret',
    collection: "Musée d'Orsay, Paris",
  },
  'godward-dolce-far-niente': {
    title: 'Dolce Far Niente',
    collection: 'Private collection',
  },
  'monet-ninfee': {
    title: 'Water Lilies',
    collection: 'Art Institute of Chicago',
  },
  'sohlberg-notte-destate': {
    title: 'Summer Night',
    collection: 'National Museum, Oslo',
  },
};

export function getLocalizedSeasonalArtwork(
  artwork: SeasonalArtwork | undefined,
  language: string,
): SeasonalArtwork | undefined {
  if (!artwork || language === 'IT') return artwork;
  
  const translation = ARTWORK_TRANSLATIONS[artwork.id];
  if (!translation) return artwork;
  
  return {
    ...artwork,
    title: translation.title || artwork.title,
    collection: translation.collection || artwork.collection,
    year: translation.year || artwork.year,
  };
}
