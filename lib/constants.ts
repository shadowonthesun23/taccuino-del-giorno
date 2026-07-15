import type { SkyRegion } from './visible-planets';
import { Feather, Quote, Type, Church, Palette, CalendarDays, BookOpen, Telescope, Music } from 'lucide-react';

export const SKY_REGION_OPTIONS: { id: SkyRegion; IT: string; EN: string; cityIT: string; cityEN: string }[] = [
  { id: 'north', IT: 'Nord', EN: 'North', cityIT: 'Milano', cityEN: 'Milan' },
  { id: 'center', IT: 'Centro', EN: 'Central', cityIT: 'Roma', cityEN: 'Rome' },
  { id: 'south', IT: 'Sud', EN: 'South', cityIT: 'Palermo', cityEN: 'Palermo' },
];

export const SKY_REGION_STORAGE_KEY = 'taccuino-sky-region-v1';
export const TICKET_DOWNLOAD_EVENT = 'taccuino:download-ticket';
export const VISITED_ARCHIVE_STORAGE_KEY = 'taccuino-visited-days-v1';
export const SAVED_CARDS_STORAGE_KEY = 'taccuino-saved-cards-v1';
export const DEFAULT_DAILY_ACCENT = '#b5956a';

export const THEME_SURFACE = {
  light: '#F8F6F0',
  dark: '#171614',
} as const;

export const SEAL_COLOR_MAP: Record<string, { color: string; rgb: string }> = {
  blu: { color: '#11304e', rgb: '17, 48, 78' },
  rosso: { color: '#7e0814', rgb: '126, 8, 20' },
  oro: { color: '#86683a', rgb: '134, 104, 58' },
  'verde-scuro': { color: '#3c6146', rgb: '60, 97, 70' },
  salvia: { color: '#6c7d60', rgb: '108, 125, 96' },
  'verde-chiaro': { color: '#7d8e75', rgb: '125, 142, 117' },
  borgogna: { color: '#54191f', rgb: '84, 25, 31' },
  rame: { color: '#bb7652', rgb: '187, 118, 82' },
  terracotta: { color: '#a8480e', rgb: '168, 72, 14' },
  argento: { color: '#9fa3a6', rgb: '159, 163, 166' },
  ocra: { color: '#ca8e2d', rgb: '202, 142, 45' },
  antracite: { color: '#424143', rgb: '66, 65, 67' },
  ottanio: { color: '#196066', rgb: '25, 96, 102' },
};

export const notebookNavItems = [
  { id: 'autore', icon: Feather, labelIT: 'Autore', labelEN: 'Author' },
  { id: 'citazione', icon: Quote, labelIT: 'Citazione', labelEN: 'Quote' },
  { id: 'parola', icon: Type, labelIT: 'Parola del giorno', labelEN: 'Word of the day' },
  { id: 'santi', icon: Church, labelIT: 'Santi', labelEN: 'Saints' },
  { id: 'avvenimenti', icon: CalendarDays, labelIT: 'Accadde oggi', labelEN: 'This day in history' },
  { id: 'poesia', icon: Feather, labelIT: 'Poesia', labelEN: 'Poem' },
  { id: 'bibbia', icon: BookOpen, labelIT: 'Passaggio biblico', labelEN: 'Biblical passage' },
  { id: 'opera', icon: Palette, labelIT: 'Opera del giorno', labelEN: 'Artwork of the day', optional: true },
  { id: 'musica', icon: Music, labelIT: 'Musica', labelEN: 'Music' },
  { id: 'apod', icon: Telescope, labelIT: 'Foto astronomica', labelEN: 'Astronomy picture', optional: true },
];
