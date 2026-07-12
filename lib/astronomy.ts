import type { MoonPhaseId, LanguageCode } from './types';
import { parseIsoUtc } from './date-utils';

const synodicMonth = 29.53058867;
const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
const dayInMs = 86_400_000;

export function getMoonPhase(dataIso: string): { phase: MoonPhaseId; illumination: number } {
  const daysSinceNewMoon = (parseIsoUtc(dataIso).getTime() - knownNewMoon) / dayInMs;
  const age = ((daysSinceNewMoon % synodicMonth) + synodicMonth) % synodicMonth;
  const illumination = Math.round((1 - Math.cos((2 * Math.PI * age) / synodicMonth)) * 50);

  if (age < 1.84566 || age >= 27.68493) return { phase: 'new', illumination };
  if (age < 5.53699) return { phase: 'waxing-crescent', illumination };
  if (age < 9.22831) return { phase: 'first-quarter', illumination };
  if (age < 12.91963) return { phase: 'waxing-gibbous', illumination };
  if (age < 16.61096) return { phase: 'full', illumination };
  if (age < 20.30228) return { phase: 'waning-gibbous', illumination };
  if (age < 23.99361) return { phase: 'last-quarter', illumination };
  return { phase: 'waning-crescent', illumination };
}

export function getNextFullMoonDate(dataIso: string): Date {
  const daysSinceNewMoon = (parseIsoUtc(dataIso).getTime() - knownNewMoon) / dayInMs;
  const fullMoonAge = synodicMonth / 2;
  const cyclesUntilFullMoon = Math.ceil((daysSinceNewMoon - fullMoonAge) / synodicMonth);
  return new Date(knownNewMoon + ((cyclesUntilFullMoon * synodicMonth) + fullMoonAge) * dayInMs);
}

export function getNextAstronomicalSeasonLabel(dataIso: string, lingua: LanguageCode): { event: string; countdown: string } {
  const date = parseIsoUtc(dataIso);
  const year = date.getUTCFullYear();
  const events = [
    {
      month: 2,
      day: 21,
      IT: 'Equinozio di primavera',
      EN: 'Spring equinox',
      FR: 'Équinoxe de printemps',
      DE: 'Frühlings-Tagundnachtgleiche',
      ES: 'Equinoccio de primavera',
      PT: 'Equinócio de primavera',
    },
    {
      month: 5,
      day: 21,
      IT: "Solstizio d'estate",
      EN: 'Summer solstice',
      FR: "Solstice d'été",
      DE: 'Sommersonnenwende',
      ES: 'Solsticio de verano',
      PT: 'Solstício de verão',
    },
    {
      month: 8,
      day: 23,
      IT: "Equinozio d'autunno",
      EN: 'Autumn equinox',
      FR: "Équinoxe d'automne",
      DE: 'Herbst-Tagundnachtgleiche',
      ES: 'Equinoccio de otoño',
      PT: 'Equinócio de outono',
    },
    {
      month: 11,
      day: 21,
      IT: "Solstizio d'inverno",
      EN: 'Winter solstice',
      FR: "Solstice d'hiver",
      DE: 'Wintersonnenwende',
      ES: 'Solsticio de invierno',
      PT: 'Solstício de invierno',
    },
    {
      month: 2,
      day: 21,
      IT: 'Equinozio di primavera',
      EN: 'Spring equinox',
      FR: 'Équinoxe de printemps',
      DE: 'Frühlings-Tagundnachtgleiche',
      ES: 'Equinoccio de primavera',
      PT: 'Equinócio de primavera',
      nextYear: true,
    },
  ];
  const datedEvents = events
    .map((event) => ({
      ...event,
      date: new Date(Date.UTC(year + (event.nextYear ? 1 : 0), event.month, event.day)),
    }));
  const nextEvent = datedEvents.find((event) => event.date >= date) ?? datedEvents[datedEvents.length - 1];
  const days = Math.round((nextEvent.date.getTime() - date.getTime()) / 86_400_000);

  const countdowns: Record<LanguageCode, (d: number) => string> = {
    IT: (d) => d === 0 ? 'oggi' : d === 1 ? 'domani' : `tra ${d} giorni`,
    EN: (d) => d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`,
    FR: (d) => d === 0 ? "aujourd'hui" : d === 1 ? 'demain' : `dans ${d} jours`,
    DE: (d) => d === 0 ? 'heute' : d === 1 ? 'morgen' : `in ${d} Tagen`,
    ES: (d) => d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`,
    PT: (d) => d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d} dias`,
  };

  return {
    event: nextEvent[lingua] || nextEvent['EN'],
    countdown: (countdowns[lingua] || countdowns['EN'])(days),
  };
}
