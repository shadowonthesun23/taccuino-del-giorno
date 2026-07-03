import { Body, Equator, Horizon, Illumination, Observer, SearchRiseSet } from 'astronomy-engine';

export type SkyRegion = 'north' | 'center' | 'south';

export interface VisiblePlanet {
  body: Body;
  name: string;
  direction: string;
  bestTime: string;
  altitude: number;
  magnitude: number;
}

interface SkyLocation {
  latitude: number;
  longitude: number;
  height: number;
}

const ROME_TIME_ZONE = 'Europe/Rome';
const SAMPLE_MINUTES = 15;
const MINIMUM_ALTITUDE = 8;
const MAXIMUM_MAGNITUDE = 2.5;

const LOCATIONS: Record<SkyRegion, SkyLocation> = {
  north: { latitude: 45.4642, longitude: 9.19, height: 120 },
  center: { latitude: 41.9028, longitude: 12.4964, height: 20 },
  south: { latitude: 38.1157, longitude: 13.3615, height: 14 },
};

const PLANETS = [
  { body: Body.Mercury, IT: 'Mercurio', EN: 'Mercury' },
  { body: Body.Venus, IT: 'Venere', EN: 'Venus' },
  { body: Body.Mars, IT: 'Marte', EN: 'Mars' },
  { body: Body.Jupiter, IT: 'Giove', EN: 'Jupiter' },
  { body: Body.Saturn, IT: 'Saturno', EN: 'Saturn' },
] as const;

function getTimeZoneOffset(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ROME_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return localAsUtc - date.getTime();
}

function makeRomeDate(dataIso: string, hour: number): Date {
  const [year, month, day] = dataIso.split('-').map(Number);
  const desiredWallTime = Date.UTC(year, month - 1, day, hour);
  let result = new Date(desiredWallTime);

  // A second pass handles the rare case in which the first estimate crosses a DST boundary.
  for (let pass = 0; pass < 2; pass += 1) {
    result = new Date(desiredWallTime - getTimeZoneOffset(result));
  }

  return result;
}

function getHorizontalPosition(body: Body, date: Date, observer: Observer) {
  const equatorial = Equator(body, date, observer, true, true);
  return Horizon(date, observer, equatorial.ra, equatorial.dec, 'normal');
}

function getDirection(azimuth: number, lingua: 'IT' | 'EN'): string {
  const directions = lingua === 'IT'
    ? ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
    : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(azimuth / 45) % directions.length];
}

function formatTime(date: Date, lingua: 'IT' | 'EN'): string {
  return new Intl.DateTimeFormat(lingua === 'IT' ? 'it-IT' : 'en-GB', {
    timeZone: ROME_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function getVisiblePlanets(
  dataIso: string,
  region: SkyRegion,
  lingua: 'IT' | 'EN',
): VisiblePlanet[] {
  const location = LOCATIONS[region];
  const observer = new Observer(location.latitude, location.longitude, location.height);
  const start = makeRomeDate(dataIso, 12);
  const sampleCount = (24 * 60) / SAMPLE_MINUTES;
  const darkSamples: Date[] = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const date = new Date(start.getTime() + index * SAMPLE_MINUTES * 60_000);
    const sun = getHorizontalPosition(Body.Sun, date, observer);
    if (sun.altitude <= -6) darkSamples.push(date);
  }

  return PLANETS.flatMap((planet) => {
    const magnitude = Illumination(planet.body, start).mag;
    if (magnitude > MAXIMUM_MAGNITUDE) return [];

    const visibleSamples = darkSamples
      .map((date) => ({
        date,
        horizontal: getHorizontalPosition(planet.body, date, observer),
      }))
      .filter(({ horizontal }) => horizontal.altitude >= MINIMUM_ALTITUDE);

    if (visibleSamples.length < 2) return [];

    const best = visibleSamples.reduce((current, sample) => (
      sample.horizontal.altitude > current.horizontal.altitude ? sample : current
    ));

    return [{
      body: planet.body,
      name: planet[lingua],
      direction: getDirection(best.horizontal.azimuth, lingua),
      bestTime: formatTime(best.date, lingua),
      altitude: Math.round(best.horizontal.altitude),
      magnitude,
    }];
  })
    .sort((first, second) => (
      first.magnitude - second.magnitude ||
      second.altitude - first.altitude
    ))
    .slice(0, 3);
}

export function getDaylightDuration(dataIso: string): string {
  // Use Rome coordinates (latitude, longitude, height) as the standard observer location
  const observer = new Observer(41.9028, 12.4964, 20);
  const midnight = makeRomeDate(dataIso, 0);

  const rise = SearchRiseSet(Body.Sun, observer, 1, midnight, 1);
  const searchStart = rise ? rise.date : midnight;
  const set = SearchRiseSet(Body.Sun, observer, -1, searchStart, 1);

  if (rise && set) {
    const diffMs = set.date.getTime() - rise.date.getTime();
    const diffMinutes = Math.round(diffMs / 60_000);
    if (diffMinutes > 0) {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours} h ${minutes} min`;
    }
  }

  return '—';
}
