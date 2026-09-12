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
  ticketAlignment: 'xMinYMin' | 'xMidYMin' | 'xMaxYMin' | 'xMinYMid' | 'xMidYMid' | 'xMaxYMid' | 'xMinYMax' | 'xMidYMax' | 'xMaxYMax';
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
      revealPosition: '48% 15%',
      ticketAlignment: 'xMidYMin',
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
    {
      id: 'tuxen-sommerdag-skagen',
      title: 'Un giorno d\'estate a Skagen Sønderstrand',
      ticketTitle: 'un giorno d\'estate a skagen sønderstrand',
      year: '1909',
      artist: 'Laurits Tuxen',
      collection: 'Collezione privata',
      medium: 'Olio su tela',
      imageUrl: '/images/seasonal/tuxen-sommerdag-skagen.webp',
      sourceUrl: '',
      linkKind: 'source',
      revealPosition: '56% center',
      ticketAlignment: 'xMidYMid',
      tone: 'balanced',
    },
  ],
  autumn: [
    {
      "id": "halle-vendanges-automne",
      "title": "Les Vendanges ou l’Automne",
      "ticketTitle": "les vendanges ou l’automne",
      "year": "1776",
      "artist": "Noël Hallé",
      "collection": "Château de Versailles, Petit Trianon",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/halle-vendanges-automne.webp",
      "sourceUrl": "https://pop.culture.gouv.fr/notice/joconde/000PE011716",
      "linkKind": "museum",
      "revealPosition": "50% 42%",
      "ticketAlignment": "xMidYMid",
      "tone": "balanced"
    },
    {
      "id": "goya-vendimia-otono",
      "title": "La vendimia o El Otoño",
      "ticketTitle": "la vendimia o el otoño",
      "year": "1786",
      "artist": "Francisco de Goya",
      "collection": "Museo Nacional del Prado, Madrid",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/goya-vendimia-otono.webp",
      "sourceUrl": "https://www.museodelprado.es/coleccion/obra-de-arte/la-vendimia-o-el-otoo/3fdc2d25-e302-42ec-9ac5-6216ca7bfe74",
      "linkKind": "museum",
      "revealPosition": "50% 38%",
      "ticketAlignment": "xMidYMid",
      "tone": "bright"
    },
    {
      "id": "poussin-automne",
      "title": "L’Automne / La Grappe de Canaan",
      "ticketTitle": "l’automne / la grappe de canaan",
      "year": "1660–1664",
      "artist": "Nicolas Poussin",
      "collection": "Musée du Louvre, Parigi",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/poussin-automne.webp",
      "sourceUrl": "https://collections.louvre.fr/en/ark:/53355/cl010062440",
      "linkKind": "museum",
      "revealPosition": "50% 48%",
      "ticketAlignment": "xMidYMid",
      "tone": "dense"
    },
    {
      "id": "boucher-autumn",
      "title": "The Four Seasons: Autumn",
      "ticketTitle": "the four seasons: autumn",
      "year": "1755",
      "artist": "François Boucher",
      "collection": "The Frick Collection, New York",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/boucher-autumn.webp",
      "sourceUrl": "https://www.frick.org/exhibitions/yukhnovich/boucher_autumn",
      "linkKind": "museum",
      "revealPosition": "50% 42%",
      "ticketAlignment": "xMidYMid",
      "tone": "balanced"
    },
    {
      "id": "bruegel-harvesters-autumn",
      "title": "The Harvesters",
      "ticketTitle": "the harvesters",
      "year": "1565",
      "artist": "Pieter Bruegel il Vecchio",
      "collection": "The Metropolitan Museum of Art, New York",
      "medium": "Olio su tavola",
      "imageUrl": "/images/seasonal/bruegel-harvesters.webp",
      "sourceUrl": "https://www.metmuseum.org/art/collection/search/435809",
      "linkKind": "museum",
      "revealPosition": "56% center",
      "ticketAlignment": "xMidYMid",
      "tone": "dense"
    },
    {
      "id": "monet-autumn-argenteuil",
      "title": "Autumn Effect at Argenteuil",
      "ticketTitle": "autumn effect at argenteuil",
      "year": "1873",
      "artist": "Claude Monet",
      "collection": "The Courtauld Gallery, Londra",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/monet-autumn-argenteuil.webp",
      "sourceUrl": "https://gallerycollections.courtauld.ac.uk/object-p-1932-sc-274",
      "linkKind": "museum",
      "revealPosition": "52% center",
      "ticketAlignment": "xMidYMid",
      "tone": "balanced"
    },
    {
      "id": "levitan-golden-autumn",
      "title": "Golden Autumn",
      "ticketTitle": "golden autumn",
      "year": "1895",
      "artist": "Isaac Levitan",
      "collection": "State Tretyakov Gallery, Mosca",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/levitan-golden-autumn.webp",
      "sourceUrl": "https://www.tretyakovgallery.ru/",
      "linkKind": "museum",
      "revealPosition": "50% 52%",
      "ticketAlignment": "xMidYMid",
      "tone": "bright"
    },
    {
      "id": "church-autumn",
      "title": "Autumn",
      "ticketTitle": "autumn",
      "year": "1875",
      "artist": "Frederic Edwin Church",
      "collection": "Museo Nacional Thyssen-Bornemisza, Madrid",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/church-autumn.webp",
      "sourceUrl": "https://www.museothyssen.org/en/collection/artists/church-frederic-edwin/autumn",
      "linkKind": "museum",
      "revealPosition": "50% 48%",
      "ticketAlignment": "xMidYMid",
      "tone": "bright"
    },
    {
      "id": "valckenborch-autumn-september",
      "title": "Herbstlandschaft (September)",
      "ticketTitle": "herbstlandschaft (september)",
      "year": "1585",
      "artist": "Lucas van Valckenborch",
      "collection": "Kunsthistorisches Museum, Vienna",
      "medium": "Olio su tavola",
      "imageUrl": "/images/seasonal/valckenborch-autumn-september.webp",
      "sourceUrl": "https://www.khm.at/kunstwerke/herbstlandschaft-september-1994",
      "linkKind": "museum",
      "revealPosition": "52% 48%",
      "ticketAlignment": "xMidYMid",
      "tone": "dense"
    },
    {
      "id": "renoir-autumn-landscape",
      "title": "Autumn Landscape (Paysage d’automne)",
      "ticketTitle": "autumn landscape",
      "year": "ca. 1884",
      "artist": "Pierre-Auguste Renoir",
      "collection": "Barnes Foundation, Philadelphia",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/renoir-autumn-landscape.webp",
      "sourceUrl": "https://collection.barnesfoundation.org/objects/5087/details",
      "linkKind": "museum",
      "revealPosition": "50% 45%",
      "ticketAlignment": "xMidYMid",
      "tone": "balanced"
    },
    {
      "id": "cole-catskill-early-autumn",
      "title": "View on the Catskill—Early Autumn",
      "ticketTitle": "view on the catskill—early autumn",
      "year": "1836–1837",
      "artist": "Thomas Cole",
      "collection": "The Metropolitan Museum of Art, New York",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/cole-catskill-early-autumn.webp",
      "sourceUrl": "https://www.metmuseum.org/art/collection/search/10501",
      "linkKind": "museum",
      "revealPosition": "50% 50%",
      "ticketAlignment": "xMidYMid",
      "tone": "balanced"
    },
    {
      "id": "millet-haystacks-autumn",
      "title": "Haystacks: Autumn",
      "ticketTitle": "haystacks: autumn",
      "year": "ca. 1874",
      "artist": "Jean-François Millet",
      "collection": "The Metropolitan Museum of Art, New York",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/millet-haystacks-autumn.webp",
      "sourceUrl": "https://www.metmuseum.org/art/collection/search/437097",
      "linkKind": "museum",
      "revealPosition": "50% 50%",
      "ticketAlignment": "xMidYMid",
      "tone": "dense"
    },
    {
      "id": "chase-gathering-autumn-flowers",
      "title": "Gathering Autumn Flowers",
      "ticketTitle": "gathering autumn flowers",
      "year": "1894–1895",
      "artist": "William Merritt Chase",
      "collection": "National Gallery of Art, Washington",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/chase-gathering-autumn-flowers.webp",
      "sourceUrl": "https://www.nga.gov/artworks/157922-gathering-autumn-flowers",
      "linkKind": "museum",
      "revealPosition": "50% 42%",
      "ticketAlignment": "xMidYMid",
      "tone": "bright"
    },
    {
      "id": "homer-autumn-tree-tops",
      "title": "Autumn Tree Tops",
      "ticketTitle": "autumn tree tops",
      "year": "1873",
      "artist": "Winslow Homer",
      "collection": "Cooper Hewitt, Smithsonian Design Museum, New York",
      "medium": "Acquerello su carta",
      "imageUrl": "/images/seasonal/homer-autumn-tree-tops.webp",
      "sourceUrl": "https://collection.cooperhewitt.org/objects/18204465/",
      "linkKind": "museum",
      "revealPosition": "50% 45%",
      "ticketAlignment": "xMidYMid",
      "tone": "balanced"
    },
    {
      "id": "bastien-lepage-october",
      "title": "October (Saison d’octobre)",
      "ticketTitle": "october",
      "year": "1878",
      "artist": "Jules Bastien-Lepage",
      "collection": "National Gallery of Victoria, Melbourne",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/bastien-lepage-october.webp",
      "sourceUrl": "https://www.ngv.vic.gov.au/explore/collection/work/3768/",
      "linkKind": "museum",
      "revealPosition": "50% 38%",
      "ticketAlignment": "xMidYMin",
      "tone": "dense"
    },
    {
      "id": "millais-autumn-leaves",
      "title": "Autumn Leaves",
      "ticketTitle": "autumn leaves",
      "year": "1856",
      "artist": "John Everett Millais",
      "collection": "Manchester Art Gallery",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/millais-autumn-leaves.webp",
      "sourceUrl": "https://manchesterartgallery.org/",
      "linkKind": "museum",
      "revealPosition": "50% 42%",
      "ticketAlignment": "xMidYMid",
      "tone": "dense"
    },
    {
      "id": "grimshaw-october-gold",
      "title": "October Gold",
      "ticketTitle": "october gold",
      "year": "1885",
      "artist": "John Atkinson Grimshaw",
      "collection": "Collezione privata",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/grimshaw-october-gold.webp",
      "sourceUrl": "https://www.sothebys.com/en/auctions/ecatalogue/2018/european-art-n09869/lot.37.html",
      "linkKind": "source",
      "revealPosition": "50% 46%",
      "ticketAlignment": "xMidYMid",
      "tone": "dense"
    },
    {
      "id": "klimt-beech-grove",
      "title": "Buchenwald I / Beech Grove I",
      "ticketTitle": "beech grove i",
      "year": "1902",
      "artist": "Gustav Klimt",
      "collection": "Albertinum – Galerie Neue Meister, Dresda",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/klimt-beech-grove.webp",
      "sourceUrl": "https://skd-online-collection.skd.museum/Details/Index/246365",
      "linkKind": "museum",
      "revealPosition": "50% 50%",
      "ticketAlignment": "xMidYMid",
      "tone": "dense"
    },
    {
      "id": "bruegel-return-herd",
      "title": "The Return of the Herd (Autumn)",
      "ticketTitle": "the return of the herd",
      "year": "1565",
      "artist": "Pieter Bruegel il Vecchio",
      "collection": "Kunsthistorisches Museum, Vienna",
      "medium": "Olio su tavola",
      "imageUrl": "/images/seasonal/bruegel-return-herd.webp",
      "sourceUrl": "https://www.khm.at/",
      "linkKind": "museum",
      "revealPosition": "52% 50%",
      "ticketAlignment": "xMidYMid",
      "tone": "dense"
    },
    {
      "id": "cropsey-hudson-autumn",
      "title": "Autumn — On the Hudson River",
      "ticketTitle": "autumn — on the hudson river",
      "year": "1860",
      "artist": "Jasper Francis Cropsey",
      "collection": "National Gallery of Art, Washington",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/cropsey-hudson-autumn.webp",
      "sourceUrl": "https://www.nga.gov/artworks/46474-autumn-hudson-river",
      "linkKind": "museum",
      "revealPosition": "50% 50%",
      "ticketAlignment": "xMidYMid",
      "tone": "bright"
    },
    {
      "id": "inness-october",
      "title": "October",
      "ticketTitle": "october",
      "year": "1882/1886",
      "artist": "George Inness",
      "collection": "LACMA, Los Angeles",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/inness-october.webp",
      "sourceUrl": "https://collections.lacma.org/object/3927",
      "linkKind": "museum",
      "revealPosition": "50% 50%",
      "ticketAlignment": "xMidYMid",
      "tone": "balanced"
    },
    {
      "id": "levitan-sokolniki",
      "title": "Autumn Day. Sokolniki",
      "ticketTitle": "autumn day. sokolniki",
      "year": "1879",
      "artist": "Isaac Levitan",
      "collection": "State Tretyakov Gallery, Mosca",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/levitan-sokolniki.webp",
      "sourceUrl": "https://www.tretyakovgallery.ru/",
      "linkKind": "museum",
      "revealPosition": "50% 38%",
      "ticketAlignment": "xMidYMin",
      "tone": "balanced"
    },
    {
      "id": "shishkin-autumn",
      "title": "Autumn",
      "ticketTitle": "autumn",
      "year": "1892",
      "artist": "Ivan Shishkin",
      "collection": "Collezione privata",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/shishkin-autumn.webp",
      "sourceUrl": "https://www.sothebys.com/",
      "linkKind": "source",
      "revealPosition": "50% 40%",
      "ticketAlignment": "xMidYMin",
      "tone": "dense"
    },
    {
      "id": "van-gogh-four-trees",
      "title": "Autumn Landscape with Four Trees",
      "ticketTitle": "autumn landscape with four trees",
      "year": "novembre 1885",
      "artist": "Vincent van Gogh",
      "collection": "Kröller-Müller Museum, Otterlo",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/van-gogh-four-trees.webp",
      "sourceUrl": "https://krollermuller.nl/",
      "linkKind": "museum",
      "revealPosition": "50% 50%",
      "ticketAlignment": "xMidYMid",
      "tone": "dense"
    },
    {
      "id": "inness-near-village-october",
      "title": "Near the Village, October",
      "ticketTitle": "near the village, october",
      "year": "1892",
      "artist": "George Inness",
      "collection": "Cincinnati Art Museum",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/inness-near-village-october.webp",
      "sourceUrl": "https://collection.cincinnatiartmuseum.org/objects/108952/near-the-village-october",
      "linkKind": "museum",
      "revealPosition": "50% 50%",
      "ticketAlignment": "xMidYMid",
      "tone": "balanced"
    },
    {
      "id": "cropsey-sugar-loaf",
      "title": "Autumn Landscape, Sugar Loaf Mountain, Orange County, New York",
      "ticketTitle": "autumn landscape, sugar loaf mountain",
      "year": "ca. 1870–1875",
      "artist": "Jasper Francis Cropsey",
      "collection": "The Metropolitan Museum of Art, New York",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/cropsey-sugar-loaf.webp",
      "sourceUrl": "https://www.metmuseum.org/art/collection/search/10578",
      "linkKind": "museum",
      "revealPosition": "50% 50%",
      "ticketAlignment": "xMidYMid",
      "tone": "bright"
    },
    {
      "id": "van-gogh-red-vineyard",
      "title": "The Red Vineyard",
      "ticketTitle": "the red vineyard",
      "year": "novembre 1888",
      "artist": "Vincent van Gogh",
      "collection": "Pushkin State Museum of Fine Arts, Mosca",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/van-gogh-red-vineyard.webp",
      "sourceUrl": "https://www.conservation.pushkinmuseum.art/data/specprojects/van-gogh-red-vineyard/index-eng.html",
      "linkKind": "museum",
      "revealPosition": "50% 50%",
      "ticketAlignment": "xMidYMid",
      "tone": "dense"
    },
    {
      "id": "cole-crawford-notch",
      "title": "A View of the Mountain Pass Called the Notch of the White Mountains (Crawford Notch)",
      "ticketTitle": "crawford notch",
      "year": "1839",
      "artist": "Thomas Cole",
      "collection": "National Gallery of Art, Washington",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/cole-crawford-notch.webp",
      "sourceUrl": "https://www.nga.gov/artworks/50727-view-mountain-pass-called-notch-white-mountains-crawford-notch",
      "linkKind": "museum",
      "revealPosition": "50% 50%",
      "ticketAlignment": "xMidYMid",
      "tone": "dense"
    },
    {
      "id": "gifford-october-catskills",
      "title": "October in the Catskills",
      "ticketTitle": "october in the catskills",
      "year": "1879",
      "artist": "Sanford Robinson Gifford",
      "collection": "High Museum of Art, Atlanta",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/gifford-october-catskills.webp",
      "sourceUrl": "https://high.org/collection/october-in-the-catskills/",
      "linkKind": "museum",
      "revealPosition": "50% 46%",
      "ticketAlignment": "xMidYMid",
      "tone": "balanced"
    },
    {
      "id": "richards-october",
      "title": "October",
      "ticketTitle": "october",
      "year": "1863",
      "artist": "William Trost Richards",
      "collection": "National Gallery of Art, Washington",
      "medium": "Olio su tela",
      "imageUrl": "/images/seasonal/richards-october.webp",
      "sourceUrl": "https://www.nga.gov/artworks/127263-october",
      "linkKind": "museum",
      "revealPosition": "50% 44%",
      "ticketAlignment": "xMidYMid",
      "tone": "balanced"
    }
  ],
};

const EARLY_AUTUMN_ARTWORK_IDS = [
  "halle-vendanges-automne",
  "goya-vendimia-otono",
  "bruegel-harvesters-autumn",
  "monet-autumn-argenteuil",
  "levitan-golden-autumn",
  "poussin-automne",
  "valckenborch-autumn-september",
  "cole-catskill-early-autumn",
  "renoir-autumn-landscape",
  "church-autumn",
  "chase-gathering-autumn-flowers",
  "homer-autumn-tree-tops",
  "millet-haystacks-autumn",
  "boucher-autumn",
  "bastien-lepage-october"
] as const;

const FULL_AUTUMN_ARTWORK_IDS = [
  "millais-autumn-leaves",
  "grimshaw-october-gold",
  "klimt-beech-grove",
  "bruegel-return-herd",
  "cropsey-hudson-autumn",
  "inness-october",
  "levitan-sokolniki",
  "shishkin-autumn",
  "van-gogh-four-trees",
  "inness-near-village-october",
  "cropsey-sugar-loaf",
  "van-gogh-red-vineyard",
  "cole-crawford-notch",
  "gifford-october-catskills",
  "richards-october"
] as const;

function getAutumnArtworkForDate(dataIso: string): SeasonalArtwork | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataIso);
  if (!match) return undefined;

  const [, year, month, day] = match;
  const current = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const earlyStart = Date.UTC(Number(year), 8, 23);
  const earlyEnd = Date.UTC(Number(year), 9, 15);
  const fullStart = Date.UTC(Number(year), 9, 16);
  const fullEnd = Date.UTC(Number(year), 10, 15);

  let ids: readonly string[] | undefined;
  let start = 0;
  if (current >= earlyStart && current <= earlyEnd) {
    ids = EARLY_AUTUMN_ARTWORK_IDS;
    start = earlyStart;
  } else if (current >= fullStart && current <= fullEnd) {
    ids = FULL_AUTUMN_ARTWORK_IDS;
    start = fullStart;
  } else {
    return undefined;
  }

  const dayOffset = Math.floor((current - start) / 86_400_000);
  const id = ids[dayOffset % ids.length];
  return SEASONAL_ARTWORKS.autumn?.find((artwork) => artwork.id === id);
}

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
  // Branch-only visual preview. These mappings are temporary and must never be merged to main.
  const autumnPreviewSchedule: Record<string, string> = {
      "08-14": "poussin-automne",
      "08-15": "valckenborch-autumn-september",
      "08-16": "cole-catskill-early-autumn",
      "08-17": "renoir-autumn-landscape",
      "08-18": "church-autumn",
      "08-19": "chase-gathering-autumn-flowers",
      "08-20": "homer-autumn-tree-tops",
      "08-21": "millet-haystacks-autumn",
      "08-22": "boucher-autumn",
      "08-23": "bastien-lepage-october",
      "08-24": "millais-autumn-leaves",
      "08-25": "grimshaw-october-gold",
      "08-26": "klimt-beech-grove",
      "08-27": "bruegel-return-herd",
      "08-28": "cropsey-hudson-autumn",
      "08-29": "inness-october",
      "08-30": "levitan-sokolniki",
      "08-31": "shishkin-autumn",
      "09-01": "van-gogh-four-trees",
      "09-02": "inness-near-village-october",
      "09-03": "cropsey-sugar-loaf",
      "09-04": "van-gogh-red-vineyard",
      "09-05": "cole-crawford-notch",
      "09-06": "gifford-october-catskills",
      "09-07": "richards-october",
      "09-08": "levitan-golden-autumn",
      "09-09": "halle-vendanges-automne",
      "09-10": "goya-vendimia-otono",
      "09-11": "bruegel-harvesters-autumn",
      "09-12": "monet-autumn-argenteuil"
  };
  const autumnPreviewId = autumnPreviewSchedule[dataIso.slice(5)];
  if (autumnPreviewId) {
    const autumnArtworks = SEASONAL_ARTWORKS.autumn;
    const previewArtwork = autumnArtworks?.find((artwork) => artwork.id === autumnPreviewId);
    if (previewArtwork) return previewArtwork;
  }

  // Branch-only visual preview. These mappings are temporary and must never be merged to main.
  const autumnPreviewSchedule: Record<string, string> = {
      "08-14": "poussin-automne",
      "08-15": "valckenborch-autumn-september",
      "08-16": "cole-catskill-early-autumn",
      "08-17": "renoir-autumn-landscape",
      "08-18": "church-autumn",
      "08-19": "chase-gathering-autumn-flowers",
      "08-20": "homer-autumn-tree-tops",
      "08-21": "millet-haystacks-autumn",
      "08-22": "boucher-autumn",
      "08-23": "bastien-lepage-october",
      "08-24": "millais-autumn-leaves",
      "08-25": "grimshaw-october-gold",
      "08-26": "klimt-beech-grove",
      "08-27": "bruegel-return-herd",
      "08-28": "cropsey-hudson-autumn",
      "08-29": "inness-october",
      "08-30": "levitan-sokolniki",
      "08-31": "shishkin-autumn",
      "09-01": "van-gogh-four-trees",
      "09-02": "inness-near-village-october",
      "09-03": "cropsey-sugar-loaf",
      "09-04": "van-gogh-red-vineyard",
      "09-05": "cole-crawford-notch",
      "09-06": "gifford-october-catskills",
      "09-07": "richards-october",
      "09-08": "levitan-golden-autumn",
      "09-09": "halle-vendanges-automne",
      "09-10": "goya-vendimia-otono",
      "09-11": "bruegel-harvesters-autumn",
      "09-12": "monet-autumn-argenteuil"
  };
  const autumnPreviewId = autumnPreviewSchedule[dataIso.slice(5)];
  if (autumnPreviewId) {
    const autumnArtworks = SEASONAL_ARTWORKS.autumn;
    const previewArtwork = autumnArtworks?.find((artwork) => artwork.id === autumnPreviewId);
    if (previewArtwork) return previewArtwork;
  }

  const artworks = SEASONAL_ARTWORKS[season];
  if (!artworks?.length) return undefined;
  if (artworks.length === 1) return artworks[0];

  if (season === 'autumn') {
    const scheduledArtwork = getAutumnArtworkForDate(dataIso);
    if (scheduledArtwork) return scheduledArtwork;

    // Respect the curated seasonal windows exactly outside branch-only preview dates.
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return undefined;
  }

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
  "halle-vendanges-automne": {"title":"Les Vendanges ou l’Automne","collection":"Château de Versailles, Petit Trianon"},
  "goya-vendimia-otono": {"title":"La vendimia o El Otoño","collection":"Museo Nacional del Prado, Madrid"},
  "poussin-automne": {"title":"L’Automne / La Grappe de Canaan","collection":"Musée du Louvre, Paris"},
  "boucher-autumn": {"title":"The Four Seasons: Autumn","collection":"The Frick Collection, New York"},
  "bruegel-harvesters-autumn": {"title":"The Harvesters","collection":"The Metropolitan Museum of Art, New York"},
  "monet-autumn-argenteuil": {"title":"Autumn Effect at Argenteuil","collection":"The Courtauld Gallery, London"},
  "levitan-golden-autumn": {"title":"Golden Autumn","collection":"State Tretyakov Gallery, Moscow"},
  "church-autumn": {"title":"Autumn","collection":"Museo Nacional Thyssen-Bornemisza, Madrid"},
  "valckenborch-autumn-september": {"title":"Herbstlandschaft (September)","collection":"Kunsthistorisches Museum, Vienna"},
  "renoir-autumn-landscape": {"title":"Autumn Landscape (Paysage d’automne)","collection":"Barnes Foundation, Philadelphia"},
  "cole-catskill-early-autumn": {"title":"View on the Catskill—Early Autumn","collection":"The Metropolitan Museum of Art, New York"},
  "millet-haystacks-autumn": {"title":"Haystacks: Autumn","collection":"The Metropolitan Museum of Art, New York"},
  "chase-gathering-autumn-flowers": {"title":"Gathering Autumn Flowers","collection":"National Gallery of Art, Washington"},
  "homer-autumn-tree-tops": {"title":"Autumn Tree Tops","collection":"Cooper Hewitt, Smithsonian Design Museum, New York"},
  "bastien-lepage-october": {"title":"October (Saison d’octobre)","collection":"National Gallery of Victoria, Melbourne"},
  "millais-autumn-leaves": {"title":"Autumn Leaves","collection":"Manchester Art Gallery"},
  "grimshaw-october-gold": {"title":"October Gold","collection":"Collezione privata"},
  "klimt-beech-grove": {"title":"Buchenwald I / Beech Grove I","collection":"Albertinum – Galerie Neue Meister, Dresden"},
  "bruegel-return-herd": {"title":"The Return of the Herd (Autumn)","collection":"Kunsthistorisches Museum, Vienna"},
  "cropsey-hudson-autumn": {"title":"Autumn — On the Hudson River","collection":"National Gallery of Art, Washington"},
  "inness-october": {"title":"October","collection":"LACMA, Los Angeles"},
  "levitan-sokolniki": {"title":"Autumn Day. Sokolniki","collection":"State Tretyakov Gallery, Moscow"},
  "shishkin-autumn": {"title":"Autumn","collection":"Collezione privata"},
  "van-gogh-four-trees": {"title":"Autumn Landscape with Four Trees","collection":"Kröller-Müller Museum, Otterlo"},
  "inness-near-village-october": {"title":"Near the Village, October","collection":"Cincinnati Art Museum"},
  "cropsey-sugar-loaf": {"title":"Autumn Landscape, Sugar Loaf Mountain, Orange County, New York","collection":"The Metropolitan Museum of Art, New York"},
  "van-gogh-red-vineyard": {"title":"The Red Vineyard","collection":"Pushkin State Museum of Fine Arts, Moscow"},
  "cole-crawford-notch": {"title":"A View of the Mountain Pass Called the Notch of the White Mountains (Crawford Notch)","collection":"National Gallery of Art, Washington"},
  "gifford-october-catskills": {"title":"October in the Catskills","collection":"High Museum of Art, Atlanta"},
  "richards-october": {"title":"October","collection":"National Gallery of Art, Washington"},
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
  'tuxen-sommerdag-skagen': {
    title: 'A Summer\'s Day at Skagen Sønderstrand',
    collection: 'Private collection',
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
