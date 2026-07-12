import type { Artwork } from './artwork';
import type { SaintArtwork } from './saint-artwork';

export type LanguageCode = 'IT' | 'EN' | 'FR' | 'DE' | 'ES' | 'PT';
export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export type MoonPhaseId = 'new' | 'waxing-crescent' | 'first-quarter' | 'waxing-gibbous' | 'full' | 'waning-gibbous' | 'last-quarter' | 'waning-crescent';

export type OperaGiorno = Artwork;
export type SaintArtworkResult = SaintArtwork & { saintName: string };

export interface ApodData {
  date: string;
  media_type: 'image' | 'video' | string;
  url: string;
  hdurl?: string;
  thumbnail_url?: string;
  title_en: string;
  explanation_en: string;
  title_it: string;
  explanation_it: string;
  copyright?: string;
}

export interface DatiTaccuino {
  data?: string;
  data_odierna: string;
  autore_giorno: string;
  breve_descrizione: string;
  citazione: { testo: string; autore: string; fonte: string };
  avvenimenti: string[];
  parola_giorno: { parola: string; definizione: string; etimologia: string; esempio: string; nota: string };
  santi: { nome: string; ruolo: string; anni: string; biografia: string }[];
  bibbia: { testo: string; fonte: string; nota: string };
  poesia: { testo: string; autore: string; fonte: string; nota: string };
  musica: { brano: string; autore: string; genere: string; motivo: string; chiave_ricerca: string };
  foto_autore_url?: string | null;
}

export interface ArchivioItem {
  data: string;
  autore_giorno: string;
}

export type SavedSectionId = 'citazione' | 'parola' | 'santi' | 'opera' | 'avvenimenti' | 'poesia' | 'bibbia' | 'musica' | 'apod';

export interface SavedCardItem {
  id: string;
  date: string;
  section: SavedSectionId;
  title: string;
  excerpt: string;
  source?: string;
  savedAt: number;
}
