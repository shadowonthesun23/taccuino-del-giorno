import type { LanguageCode, ArchivioItem, SavedCardItem } from './types';
import { getMonthNumber, getDayOfYearInfo, getInitials } from './date-utils';
import { SAVED_CARDS_STORAGE_KEY } from './constants';

export function getArchiveMonthMood(dataIso: string, lingua: LanguageCode): string {
  const month = getMonthNumber(dataIso);
  const moods: Record<number, Record<LanguageCode, string>> = {
    1: { IT: 'silenzio chiaro', EN: 'clear silence', FR: 'silence clair', DE: 'klare Stille', ES: 'claro silencio', PT: 'silêncio claro' },
    2: { IT: 'luce breve', EN: 'brief light', FR: 'lumière brève', DE: 'kurzes Licht', ES: 'luz breve', PT: 'luz breve' },
    3: { IT: 'soglia verde', EN: 'green threshold', FR: 'seuil vert', DE: 'grüne Schwelle', ES: 'umbral verde', PT: 'limiar verde' },
    4: { IT: 'aria nuova', EN: 'new air', FR: 'air nouveau', DE: 'neue Luft', ES: 'aire nuevo', PT: 'ar novo' },
    5: { IT: 'piena fioritura', EN: 'full bloom', FR: 'pleine floraison', DE: 'volle Blüte', ES: 'plena floración', PT: 'plena floração' },
    6: { IT: 'luce lunga', EN: 'long light', FR: 'longue lumière', DE: 'langes Licht', ES: 'luz larga', PT: 'luz longa' },
    7: { IT: 'giorni assolati', EN: 'sunlit days', FR: 'jours ensoleillés', DE: 'sonnige Tage', ES: 'días soleados', PT: 'dias ensolarados' },
    8: { IT: 'oro lento', EN: 'slow gold', FR: 'or lent', DE: 'langsames Gold', ES: 'oro lento', PT: 'ouro lento' },
    9: { IT: 'ritorno mite', EN: 'gentle return', FR: 'doux retour', DE: 'milde Rückkehr', ES: 'retorno suave', PT: 'retorno suave' },
    10: { IT: 'rame e memoria', EN: 'copper and memory', FR: 'cuivre et mémoire', DE: 'Kupfer und Erinnerung', ES: 'cobre y memoria', PT: 'cobre e memória' },
    11: { IT: 'ombra raccolta', EN: 'gathered shade', FR: 'ombre recueillie', DE: 'gesammelter Schatten', ES: 'sombra recogida', PT: 'sombra recolhida' },
    12: { IT: 'notte luminosa', EN: 'luminous night', FR: 'nuit lumineuse', DE: 'leuchtende Nacht', ES: 'noche luminosa', PT: 'noite luminosa' },
  };
  return moods[month]?.[lingua] ?? moods[month]?.['EN'] ?? '';
}

export function groupByMonth(items: ArchivioItem[], lingua: LanguageCode): Record<string, ArchivioItem[]> {
  const nomiMesi: Record<LanguageCode, string[]> = {
    IT: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
    EN: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    FR: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    DE: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    ES: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    PT: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  };
  const groups: Record<string, ArchivioItem[]> = {};

  items.forEach((item) => {
    const [anno, mese] = item.data.split('-');
    const monthIndex = parseInt(mese) - 1;
    const nomeMese = nomiMesi[lingua]?.[monthIndex] ?? nomiMesi['EN'][monthIndex];
    const mood = getArchiveMonthMood(item.data, lingua);
    const key = `${nomeMese} ${anno} · ${mood}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  return groups;
}

export function getArchiveEntryMark(item: ArchivioItem) {
  const { day } = getDayOfYearInfo(item.data);
  return {
    day: String(day).padStart(3, '0'),
    initials: getInitials(item.autore_giorno).slice(0, 2),
  };
}

export function getSavedCards(): SavedCardItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(SAVED_CARDS_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((item): item is SavedCardItem => (
      typeof item?.id === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
      && typeof item.section === 'string'
      && typeof item.title === 'string'
      && typeof item.excerpt === 'string'
      && typeof item.savedAt === 'number'
    )).slice(0, 80);
  } catch {
    window.localStorage.removeItem(SAVED_CARDS_STORAGE_KEY);
    return [];
  }
}

export function persistSavedCards(items: SavedCardItem[]) {
  try {
    window.localStorage.setItem(SAVED_CARDS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // The drawer remains usable for the current session when storage is unavailable.
  }
}
