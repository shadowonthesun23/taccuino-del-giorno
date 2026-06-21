export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonalArtwork {
  title: string;
  year: string;
  artist: string;
  collection: string;
  medium: string;
  imageUrl: string;
  museumUrl: string;
}

export const SEASONAL_ARTWORKS: Partial<Record<SeasonId, SeasonalArtwork>> = {
  spring: {
    title: 'Primavera',
    year: 'circa 1480',
    artist: 'Sandro Botticelli',
    collection: 'Gallerie degli Uffizi, Firenze',
    medium: 'Tempera grassa su tavola',
    imageUrl: '/images/seasonal/botticelli-primavera.webp',
    museumUrl: 'https://www.uffizi.it/opere/botticelli-primavera',
  },
  summer: {
    title: 'Campo di grano con cipressi',
    year: '1889',
    artist: 'Vincent van Gogh',
    collection: 'The Metropolitan Museum of Art, New York',
    medium: 'Olio su tela',
    imageUrl: '/images/seasonal/van-gogh-wheat-field-cypresses.webp',
    museumUrl: 'https://www.metmuseum.org/art/collection/search/436535',
  },
};

export function getSeasonalArtwork(season: SeasonId): SeasonalArtwork | undefined {
  return SEASONAL_ARTWORKS[season];
}
