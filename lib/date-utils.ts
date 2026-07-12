import type { LanguageCode, SeasonId } from './types';
import { VISITED_ARCHIVE_STORAGE_KEY } from './constants';

export function formatDataItaliana(dataIso: string): string {
  const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const [anno, mese, giorno] = dataIso.split('-');
  return `${parseInt(giorno)} ${mesi[parseInt(mese) - 1]} ${anno}`;
}

export function formatDataInglese(dataIso: string): string {
  if (!dataIso || !/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return '';
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const [, mese, giorno] = dataIso.split('-');
  const dayNum = parseInt(giorno);
  
  let suffix = 'th';
  if (dayNum < 11 || dayNum > 13) {
    switch (dayNum % 10) {
      case 1: suffix = 'st'; break;
      case 2: suffix = 'nd'; break;
      case 3: suffix = 'rd'; break;
    }
  }
  
  return `${months[parseInt(mese) - 1]} ${dayNum}${suffix}`;
}

export function formatDataMultilingua(dataIso: string, lingua: LanguageCode): string {
  if (!dataIso || !/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return '';
  const [, mese, giorno] = dataIso.split('-');
  const dayNum = parseInt(giorno);
  const monthNum = parseInt(mese) - 1;

  if (lingua === 'IT') {
    const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    return `${dayNum} ${mesi[monthNum]}`;
  }
  
  if (lingua === 'EN') {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let suffix = 'th';
    if (dayNum < 11 || dayNum > 13) {
      switch (dayNum % 10) {
        case 1: suffix = 'st'; break;
        case 2: suffix = 'nd'; break;
        case 3: suffix = 'rd'; break;
      }
    }
    return `${months[monthNum]} ${dayNum}${suffix}`;
  }

  if (lingua === 'FR') {
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const suffix = dayNum === 1 ? 'er' : '';
    return `${dayNum}${suffix} ${months[monthNum]}`;
  }

  if (lingua === 'DE') {
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return `${dayNum}. ${months[monthNum]}`;
  }

  if (lingua === 'ES') {
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${dayNum} de ${months[monthNum]}`;
  }

  if (lingua === 'PT') {
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${dayNum} de ${months[monthNum]}`;
  }

  return '';
}

export function getRomeDateIso(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getSavedVisitedDates(): Set<string> {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const savedVisitedDates = JSON.parse(window.localStorage.getItem(VISITED_ARCHIVE_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(savedVisitedDates)) return new Set<string>();
    return new Set(savedVisitedDates.filter((date): date is string => /^\d{4}-\d{2}-\d{2}$/.test(date)));
  } catch {
    window.localStorage.removeItem(VISITED_ARCHIVE_STORAGE_KEY);
    return new Set<string>();
  }
}

export function getMonthNumber(dataIso: string): number {
  const [, mese] = dataIso.split('-');
  return parseInt(mese);
}

export function getDayOfYearInfo(dataIso: string) {
  const date = new Date(`${dataIso}T12:00:00Z`);
  const year = date.getUTCFullYear();
  const start = new Date(`${year}-01-01T12:00:00Z`);
  const day = Math.floor((date.getTime() - start.getTime()) / 86_400_000) + 1;
  const total = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1 ? 366 : 365;
  return { day, total };
}

export function getSeason(dataIso: string): SeasonId {
  const [, meseString, giornoString] = dataIso.split('-');
  const mese = Number(meseString);
  const giorno = Number(giornoString);
  const valore = mese * 100 + giorno;

  if (valore >= 321 && valore < 621) return 'spring';
  if (valore >= 621 && valore < 923) return 'summer';
  if (valore >= 923 && valore < 1221) return 'autumn';
  return 'winter';
}

export function isSeasonId(value: string | null): value is SeasonId {
  return value === 'spring' || value === 'summer' || value === 'autumn' || value === 'winter';
}

export function formatExLibrisDate(dataIso: string): string {
  const mesiRomani = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const [anno, mese, giorno] = dataIso.split('-');
  return `${parseInt(giorno)} · ${mesiRomani[parseInt(mese) - 1]} · ${anno}`;
}

export function formatExLibrisLedger(dataIso: string, lingua: LanguageCode): string {
  const { day, total } = getDayOfYearInfo(dataIso);
  const labels: Record<LanguageCode, string> = {
    IT: 'foglio',
    EN: 'page',
    FR: 'page',
    DE: 'Blatt',
    ES: 'hoja',
    PT: 'folha',
  };
  const label = labels[lingua] || 'page';
  return `${label} ${day}/${total}`;
}

export function formatBookmarkDate(dataIso: string, lingua: LanguageCode): string {
  const [anno, mese, giorno] = dataIso.split('-').map(Number);
  if (lingua === 'IT') {
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(anno, mese - 1, giorno));
  } else if (lingua === 'EN') {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    let suffix = 'th';
    if (giorno < 11 || giorno > 13) {
      switch (giorno % 10) {
        case 1: suffix = 'st'; break;
        case 2: suffix = 'nd'; break;
        case 3: suffix = 'rd'; break;
      }
    }
    return `${months[mese - 1]} ${giorno}${suffix}, ${anno}`;
  } else {
    const locales: Record<Exclude<LanguageCode, 'IT' | 'EN'>, string> = {
      FR: 'fr-FR',
      DE: 'de-DE',
      ES: 'es-ES',
      PT: 'pt-PT',
    };
    return new Intl.DateTimeFormat(locales[lingua as Exclude<LanguageCode, 'IT' | 'EN'>] || 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(anno, mese - 1, giorno));
  }
}

export function getBookmarkMonth(dataIso: string): number {
  return getMonthNumber(dataIso);
}

export function parseIsoUtc(dataIso: string): Date {
  const [anno, mese, giorno] = dataIso.split('-').map(Number);
  return new Date(Date.UTC(anno, mese - 1, giorno));
}

export function formatUtcDate(date: Date, lingua: LanguageCode): string {
  const locales: Record<LanguageCode, string> = {
    IT: 'it-IT',
    EN: 'en-US',
    FR: 'fr-FR',
    DE: 'de-DE',
    ES: 'es-ES',
    PT: 'pt-PT',
  };
  if (lingua === 'EN') {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const d = date.getUTCDate();
    let suffix = 'th';
    if (d < 11 || d > 13) {
      switch (d % 10) {
        case 1: suffix = 'st'; break;
        case 2: suffix = 'nd'; break;
        case 3: suffix = 'rd'; break;
      }
    }
    return `${months[date.getUTCMonth()]} ${d}${suffix}`;
  }
  return new Intl.DateTimeFormat(locales[lingua] || 'en-US', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function normalizeArchiveText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function getInitials(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function getMarginalia(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function getDisplayDate(data: { data_odierna: string; data?: string }, lingua: LanguageCode, dataSelezionata: string | null): string {
  if (lingua === 'IT') return data.data_odierna;
  const isoDate = data.data || dataSelezionata || new Date().toISOString().split('T')[0];
  return formatDataMultilingua(isoDate, lingua) || data.data_odierna;
}
