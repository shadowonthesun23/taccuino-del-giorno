'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { EB_Garamond, Caveat } from 'next/font/google';
import localFont from 'next/font/local';
import { BookOpen, Quote, Type, CalendarDays, Feather, Music, Sparkles, Church, Sun, Moon, Palette, ExternalLink, X, ChevronLeft, ChevronUp, Languages, Loader2, Search, FileDown, Printer, Stamp, SlidersHorizontal } from 'lucide-react';
import AuthorExportCard from './components/AuthorExportCard';
import Card from './components/Card';
import ParallaxBackground from '@/components/ui/ParallaxBackground';
import type { Artwork } from '@/lib/artwork';

const garamond = EB_Garamond({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});
const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});
const jocky = localFont({
  src: '../public/fonts/JockyStarline.ttf',
  display: 'block',
  preload: true,
  fallback: ['serif'],
});
const stampwriter = localFont({
  src: '../public/fonts/STAMPWRITER-KIT.ttf',
  display: 'swap',
  preload: true,
  fallback: ['Courier New', 'monospace'],
});

const THEME_SURFACE = {
  light: '#F8F6F0',
  dark: '#252422',
} as const;

function applyBrowserTheme(nextDark: boolean) {
  if (typeof document === 'undefined') return;

  const scheme = nextDark ? 'dark' : 'light';
  const color = THEME_SURFACE[scheme];
  const root = document.documentElement;

  root.classList.toggle('dark', nextDark);
  root.dataset.theme = scheme;
  root.style.backgroundColor = color;
  root.style.colorScheme = scheme;

  document.body.style.backgroundColor = color;
  document.body.style.colorScheme = scheme;

  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => {
      meta.content = color;
    });

  let appThemeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-app-theme="true"]');
  if (!appThemeMeta) {
    appThemeMeta = document.createElement('meta');
    appThemeMeta.name = 'theme-color';
    appThemeMeta.dataset.appTheme = 'true';
    document.head.appendChild(appThemeMeta);
  }
  appThemeMeta.content = color;
}

const XIcon = ({ className, strokeWidth = 1.5 }: { className?: string, strokeWidth?: number }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
);

const InstagramIcon = ({ className, strokeWidth = 1.5 }: { className?: string, strokeWidth?: number }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const CoffeeIcon = ({ className, strokeWidth = 1.5 }: { className?: string, strokeWidth?: number }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
    <line x1="6" x2="6" y1="2" y2="4"/>
    <line x1="10" x2="10" y1="2" y2="4"/>
    <line x1="14" x2="14" y1="2" y2="4"/>
  </svg>
);

const WatercolorDivider = ({ isDark }: { isDark: boolean }) => {
  const color = isDark ? '#7a5c38' : '#b5956a';
  return (
    <div aria-hidden="true" className="watercolor-divider w-full flex justify-center pointer-events-none select-none">
      <svg viewBox="0 0 800 36" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-2xl" style={{ height: '26px', display: 'block' }}>
        <defs>
          <filter id="wc-blur" x="-10%" y="-60%" width="120%" height="220%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04 0.3" numOctaves={4} seed={8} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={5} xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation={1.2} result="blurred" />
            <feComposite in="blurred" in2="SourceGraphic" operator="atop" />
          </filter>
          <filter id="wc-edge" x="-5%" y="-80%" width="110%" height="260%">
            <feTurbulence type="turbulence" baseFrequency="0.08 0.6" numOctaves={3} seed={14} result="noise2" />
            <feDisplacementMap in="SourceGraphic" in2="noise2" scale={3} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <linearGradient id="wc-fade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0" />
            <stop offset="12%" stopColor={color} stopOpacity="0.72" />
            <stop offset="48%" stopColor={color} stopOpacity="1" />
            <stop offset="88%" stopColor={color} stopOpacity="0.7" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="watercolor-stroke stroke-main" d="M 190 20 Q 270 15 348 18 Q 424 21 494 16 Q 560 12 610 18" fill="none" stroke="url(#wc-fade)" strokeWidth="5.5" strokeLinecap="round" opacity="0.58" filter="url(#wc-blur)" />
        <path className="watercolor-stroke stroke-edge" d="M 218 16 Q 308 12 392 15 Q 480 19 582 15" fill="none" stroke="url(#wc-fade)" strokeWidth="1.8" strokeLinecap="round" opacity="0.32" filter="url(#wc-edge)" />
        <path className="watercolor-stroke stroke-ghost" d="M 248 23 Q 355 27 452 21 Q 525 16 574 22" fill="none" stroke="url(#wc-fade)" strokeWidth="2.2" strokeLinecap="round" opacity="0.18" filter="url(#wc-blur)" />
      </svg>
    </div>
  );
};

type OperaGiorno = Artwork;

interface DatiTaccuino {
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

interface ArchivioItem {
  data: string;
  autore_giorno: string;
}

function estraiTesti(d: DatiTaccuino): string[] {
  return [
    d.autore_giorno, d.breve_descrizione, d.citazione.testo, d.citazione.fonte,
    d.parola_giorno.parola, d.parola_giorno.etimologia, d.parola_giorno.definizione,
    d.parola_giorno.esempio, d.parola_giorno.nota,
    ...d.santi.flatMap(s => [s.nome, s.ruolo, s.anni, s.biografia]),
    d.bibbia.testo, d.bibbia.nota,
    d.poesia.testo, d.poesia.autore, d.poesia.fonte, d.poesia.nota,
    d.musica.brano, d.musica.autore, d.musica.genere, d.musica.motivo,
    ...d.avvenimenti,
  ];
}

function ricostruisciDati(originale: DatiTaccuino, traduzioni: string[]): DatiTaccuino {
  const flat = traduzioni;
  let i = 9;
  const t = () => flat[i++] ?? '';
  const santiTradotti = originale.santi.map(() => ({ nome: t(), ruolo: t(), anni: t(), biografia: t() }));
  let j = 9 + originale.santi.length * 4;
  const tf = () => flat[j++] ?? '';
  return {
    ...originale,
    autore_giorno: flat[0], breve_descrizione: flat[1],
    citazione: { ...originale.citazione, testo: flat[2], fonte: flat[3] },
    parola_giorno: { ...originale.parola_giorno, parola: flat[4], etimologia: flat[5], definizione: flat[6], esempio: flat[7] && flat[7] !== 'null' ? flat[7] : '', nota: flat[8] },
    santi: santiTradotti,
    bibbia: { ...originale.bibbia, testo: tf(), nota: tf() },
    poesia: { ...originale.poesia, testo: tf(), autore: tf(), fonte: tf(), nota: tf() },
    musica: { ...originale.musica, brano: tf(), autore: tf(), genere: tf(), motivo: tf() },
    avvenimenti: flat.slice(j),
  };
}

function formatDataItaliana(dataIso: string): string {
  const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const [anno, mese, giorno] = dataIso.split('-');
  return `${parseInt(giorno)} ${mesi[parseInt(mese) - 1]} ${anno}`;
}

function getMonthNumber(dataIso: string): number {
  const [, mese] = dataIso.split('-').map(Number);
  return mese;
}

function getArchiveMonthMood(dataIso: string, lingua: 'IT' | 'EN'): string {
  const month = getMonthNumber(dataIso);
  const moods: Record<number, { IT: string; EN: string }> = {
    1: { IT: 'silenzio chiaro', EN: 'clear silence' },
    2: { IT: 'luce breve', EN: 'brief light' },
    3: { IT: 'soglia verde', EN: 'green threshold' },
    4: { IT: 'aria nuova', EN: 'new air' },
    5: { IT: 'piena fioritura', EN: 'full bloom' },
    6: { IT: 'luce lunga', EN: 'long light' },
    7: { IT: 'giorni assolati', EN: 'sunlit days' },
    8: { IT: 'oro lento', EN: 'slow gold' },
    9: { IT: 'ritorno mite', EN: 'gentle return' },
    10: { IT: 'rame e memoria', EN: 'copper and memory' },
    11: { IT: 'ombra raccolta', EN: 'gathered shade' },
    12: { IT: 'notte luminosa', EN: 'luminous night' },
  };
  return moods[month]?.[lingua] ?? '';
}

function groupByMonth(items: ArchivioItem[]): Record<string, ArchivioItem[]> {
  const mesiNome = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const groups: Record<string, ArchivioItem[]> = {};
  for (const item of items) {
    const [anno, mese] = item.data.split('-');
    const key = `${mesiNome[parseInt(mese) - 1]} ${anno}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

function normalizeArchiveText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getInitials(value: string): string {
  return value
    .replace(/\([^)]*\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatExLibrisDate(dataIso: string): string {
  const mesiRomani = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const [anno, mese, giorno] = dataIso.split('-');
  return `${parseInt(giorno)} · ${mesiRomani[parseInt(mese) - 1]} · ${anno}`;
}

type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
type MoonPhaseId = 'new' | 'waxing-crescent' | 'first-quarter' | 'waxing-gibbous' | 'full' | 'waning-gibbous' | 'last-quarter' | 'waning-crescent';

const synodicMonth = 29.53058867;
const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
const dayInMs = 86_400_000;

function getSeason(dataIso: string): SeasonId {
  const [, meseString, giornoString] = dataIso.split('-');
  const mese = Number(meseString);
  const giorno = Number(giornoString);
  const valore = mese * 100 + giorno;

  if (valore >= 321 && valore < 621) return 'spring';
  if (valore >= 621 && valore < 923) return 'summer';
  if (valore >= 923 && valore < 1221) return 'autumn';
  return 'winter';
}

function formatBookmarkDate(dataIso: string, lingua: 'IT' | 'EN'): string {
  const [anno, mese, giorno] = dataIso.split('-').map(Number);
  return new Intl.DateTimeFormat(lingua === 'IT' ? 'it-IT' : 'en-GB', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(anno, mese - 1, giorno));
}

function getBookmarkMonth(dataIso: string): number {
  return getMonthNumber(dataIso);
}

function parseIsoUtc(dataIso: string): Date {
  const [anno, mese, giorno] = dataIso.split('-').map(Number);
  return new Date(Date.UTC(anno, mese - 1, giorno));
}

function getMoonPhase(dataIso: string): { phase: MoonPhaseId; illumination: number } {
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

function getNextFullMoonDate(dataIso: string): Date {
  const daysSinceNewMoon = (parseIsoUtc(dataIso).getTime() - knownNewMoon) / dayInMs;
  const fullMoonAge = synodicMonth / 2;
  const cyclesUntilFullMoon = Math.ceil((daysSinceNewMoon - fullMoonAge) / synodicMonth);
  return new Date(knownNewMoon + ((cyclesUntilFullMoon * synodicMonth) + fullMoonAge) * dayInMs);
}

function formatUtcDate(date: Date, lingua: 'IT' | 'EN'): string {
  return new Intl.DateTimeFormat(lingua === 'IT' ? 'it-IT' : 'en-GB', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getSolarConstellation(dataIso: string, lingua: 'IT' | 'EN'): string {
  const [, meseString, giornoString] = dataIso.split('-');
  const value = Number(meseString) * 100 + Number(giornoString);
  const constellations = [
    { from: 120, to: 216, IT: 'Capricorno', EN: 'Capricornus' },
    { from: 216, to: 311, IT: 'Acquario', EN: 'Aquarius' },
    { from: 311, to: 418, IT: 'Pesci', EN: 'Pisces' },
    { from: 418, to: 513, IT: 'Ariete', EN: 'Aries' },
    { from: 513, to: 621, IT: 'Toro', EN: 'Taurus' },
    { from: 621, to: 720, IT: 'Gemelli', EN: 'Gemini' },
    { from: 720, to: 810, IT: 'Cancro', EN: 'Cancer' },
    { from: 810, to: 916, IT: 'Leone', EN: 'Leo' },
    { from: 916, to: 1030, IT: 'Vergine', EN: 'Virgo' },
    { from: 1030, to: 1123, IT: 'Bilancia', EN: 'Libra' },
    { from: 1123, to: 1129, IT: 'Scorpione', EN: 'Scorpius' },
    { from: 1129, to: 1217, IT: 'Ofiuco', EN: 'Ophiuchus' },
  ];
  const constellation = constellations.find(({ from, to }) => value >= from && value < to);
  return constellation?.[lingua] ?? (lingua === 'IT' ? 'Sagittario' : 'Sagittarius');
}

function getNextAstronomicalSeasonLabel(dataIso: string, lingua: 'IT' | 'EN', mode: 'long' | 'compact' = 'long'): string {
  const date = parseIsoUtc(dataIso);
  const year = date.getUTCFullYear();
  const events = [
    { month: 2, day: 21, IT: "all'equinozio di primavera", eventIT: "l'equinozio di primavera", compactIT: "all'equinozio", EN: 'the spring equinox', compactEN: 'equinox' },
    { month: 5, day: 21, IT: "al solstizio d'estate", eventIT: "il solstizio d'estate", compactIT: 'al solstizio', EN: 'the summer solstice', compactEN: 'solstice' },
    { month: 8, day: 23, IT: "all'equinozio d'autunno", eventIT: "l'equinozio d'autunno", compactIT: "all'equinozio", EN: 'the autumn equinox', compactEN: 'equinox' },
    { month: 11, day: 21, IT: "al solstizio d'inverno", eventIT: "il solstizio d'inverno", compactIT: 'al solstizio', EN: 'the winter solstice', compactEN: 'solstice' },
    { month: 2, day: 21, IT: "all'equinozio di primavera", eventIT: "l'equinozio di primavera", compactIT: "all'equinozio", EN: 'the spring equinox', compactEN: 'equinox', nextYear: true },
  ];
  const datedEvents = events
    .map((event) => ({
      ...event,
      date: new Date(Date.UTC(year + (event.nextYear ? 1 : 0), event.month, event.day)),
    }));
  const nextEvent = datedEvents.find((event) => event.date >= date) ?? datedEvents[datedEvents.length - 1];
  const days = Math.round((nextEvent.date.getTime() - date.getTime()) / 86_400_000);

  if (lingua === 'IT') {
    if (mode === 'compact') return days === 0 ? `oggi ${nextEvent.compactIT}` : `${days}g ${nextEvent.compactIT}`;
    if (days === 0) return `Oggi: ${nextEvent.eventIT}`;
    if (days === 1) return `Domani: ${nextEvent.eventIT}`;
    return `${days} giorni ${nextEvent.IT}`;
  }
  if (mode === 'compact') return days === 0 ? `today ${nextEvent.compactEN}` : `${days}d to ${nextEvent.compactEN}`;
  if (days === 0) return `Today: ${nextEvent.EN}`;
  if (days === 1) return `Tomorrow: ${nextEvent.EN}`;
  return `${days} days to ${nextEvent.EN}`;
}

function getMarginalia(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function TypewriterText({ text, className = '' }: { text: string; className?: string }) {
  const [visibleText, setVisibleText] = useState('');

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;
    let index = 0;
    const timeoutIds = new Set<number>();

    const schedule = (callback: () => void, delay: number) => {
      const timeoutId = window.setTimeout(() => {
        timeoutIds.delete(timeoutId);
        callback();
      }, delay);
      timeoutIds.add(timeoutId);
    };

    if (reduceMotion) {
      schedule(() => setVisibleText(text), 0);
      return () => {
        cancelled = true;
        timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      };
    }

    schedule(() => setVisibleText(''), 0);

    const tick = () => {
      if (cancelled) return;
      index += 1;
      setVisibleText(text.slice(0, index));
      if (index >= text.length) return;

      const current = text[index - 1];
      const next = text[index];
      const baseDelay = 34 + ((text.charCodeAt(index) || index) % 4) * 14;
      const pause = current === ' ' || next === ' ' ? 92 : 0;
      schedule(tick, baseDelay + pause);
    };

    schedule(tick, 260);

    return () => {
      cancelled = true;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [text]);

  return (
    <span className={`typewriter-text ${className}`} aria-label={text}>
      <span className="typewriter-measure" aria-hidden="true">{text}</span>
      <span className="typewriter-live" aria-hidden="true">
        {visibleText}
        {visibleText.length < text.length && <span className="typewriter-caret" />}
      </span>
    </span>
  );
}

function DecorativeInitialText({
  text,
  className,
  initialTone = 'red',
  initialClassName = '',
  copyClassName = '',
}: {
  text: string;
  className: string;
  initialTone?: 'red' | 'blue';
  initialClassName?: string;
  copyClassName?: string;
}) {
  const [firstLetter = '', ...restLetters] = Array.from(text.trim());
  const rest = restLetters.join('');

  return (
    <p
      className={`decorative-initial-text ${className}`}
      aria-label={text}
    >
      <span
        className={`decorative-initial decorative-initial-${initialTone} ${initialClassName}`}
        aria-hidden="true"
      >
        {firstLetter}
      </span>
      <span className={`decorative-initial-copy ${copyClassName}`} aria-hidden="true">{rest}</span>
    </p>
  );
}

function EditorialQuoteText({ text }: { text: string }) {
  return (
    <DecorativeInitialText
      text={text}
      className="card-primary-quote quote-editorial-text text-left text-2xl md:text-3xl italic leading-relaxed mb-6 font-medium"
      initialClassName="quote-editorial-dropcap"
      copyClassName="quote-editorial-copy"
    />
  );
}

function DoodleArrow({ isDark = false }: { isDark?: boolean }) {
  const stroke = isDark ? '#D98072' : '#DE6B58';
  const sharedStyle = {
    color: stroke,
    flex: '0 0 auto',
    height: '26px',
    overflow: 'visible',
    width: '42px',
  } as const;

  return (
    <svg className="margin-note-doodle" viewBox="0 0 44 28" aria-hidden="true" style={sharedStyle}>
      <path className="margin-note-doodle-line" d="M4 6c5 10 15 15 33 14" pathLength="1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ strokeWidth: 2.25 }} />
      <path className="margin-note-doodle-head" d="M31 15l7 5-7 4" pathLength="1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ strokeWidth: 2.25 }} />
    </svg>
  );
}

function MoonDoodle({ phase }: { phase: MoonPhaseId }) {
  const isWaning = phase.startsWith('waning') || phase === 'last-quarter';
  const innerPath = phase === 'full'
    ? 'M11 10c2-1 3 1 2 2m6 7c2-1 3 1 2 2M12 23c2 1 4 1 5 0'
    : phase === 'new'
      ? 'M10 9c4 2 9 9 11 15'
      : phase.includes('gibbous')
        ? 'M12 7c6 4 6 14 0 18'
        : phase.includes('quarter')
          ? 'M16 6c5 4 5 16 0 20'
          : 'M20 7c-7 4-7 14 0 18';

  return (
    <svg className={isWaning ? 'is-waning' : ''} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="10" />
      <path d={innerPath} />
      <path className="moon-doodle-star" d="M26 5v4m-2-2h4" />
    </svg>
  );
}

function SeasonalBookmark({ dataIso, lingua, isDark }: { dataIso: string; lingua: 'IT' | 'EN'; isDark: boolean }) {
  const season = getSeason(dataIso);
  const seasonLabels: Record<SeasonId, { IT: string; EN: string }> = {
    spring: { IT: 'Primavera', EN: 'Spring' },
    summer: { IT: 'Estate', EN: 'Summer' },
    autumn: { IT: 'Autunno', EN: 'Autumn' },
    winter: { IT: 'Inverno', EN: 'Winter' },
  };
  const label = seasonLabels[season][lingua];
  const dateLabel = formatBookmarkDate(dataIso, lingua);
  const bookmarkMonth = getBookmarkMonth(dataIso);
  const moon = getMoonPhase(dataIso);
  const moonLabels: Record<MoonPhaseId, { IT: string; EN: string }> = {
    new: { IT: 'Luna nuova', EN: 'New moon' },
    'waxing-crescent': { IT: 'Luna crescente', EN: 'Waxing crescent' },
    'first-quarter': { IT: 'Primo quarto', EN: 'First quarter' },
    'waxing-gibbous': { IT: 'Gibbosa crescente', EN: 'Waxing gibbous' },
    full: { IT: 'Luna piena', EN: 'Full moon' },
    'waning-gibbous': { IT: 'Gibbosa calante', EN: 'Waning gibbous' },
    'last-quarter': { IT: 'Ultimo quarto', EN: 'Last quarter' },
    'waning-crescent': { IT: 'Luna calante', EN: 'Waning crescent' },
  };
  const moonLabel = moonLabels[moon.phase][lingua];
  const solarConstellation = getSolarConstellation(dataIso, lingua);
  const seasonCountdown = getNextAstronomicalSeasonLabel(dataIso, lingua, 'compact');
  const sunLabel = lingua === 'IT' ? `Sole in ${solarConstellation}` : `Sun in ${solarConstellation}`;
  const nextFullMoonLabel = formatUtcDate(getNextFullMoonDate(dataIso), lingua);
  const fullMoonAriaLabel = lingua === 'IT' ? 'Prossima luna piena' : 'Next full moon';
  const almanacLabel = lingua === 'IT' ? 'Effemeridi' : 'Almanac';
  const moonRowLabel = lingua === 'IT' ? 'Luna' : 'Moon';
  const fullMoonRowLabel = lingua === 'IT' ? 'Piena' : 'Full';
  const sunRowLabel = lingua === 'IT' ? 'Sole' : 'Sun';

  return (
    <aside
      className={`seasonal-bookmark season-${season} month-${bookmarkMonth} ${isDark ? 'is-dark' : ''}`}
      aria-label={`${dateLabel}, ${label}. ${moonLabel}, ${moon.illumination}%. ${fullMoonAriaLabel}: ${nextFullMoonLabel}. ${sunLabel}. ${seasonCountdown}`}
      title={lingua === 'IT' ? 'Effemeridi indicative, calcolate localmente' : 'Indicative ephemerides, calculated locally'}
      tabIndex={0}
    >
      <span className="seasonal-bookmark-stitch" aria-hidden="true"><span /></span>
      <span className="seasonal-bookmark-motif"><MoonDoodle phase={moon.phase} /></span>
      <span className="seasonal-bookmark-copy">
        <span className="seasonal-bookmark-label">{almanacLabel}</span>
        <span className="seasonal-bookmark-heading">
          <strong className="seasonal-bookmark-date">{dateLabel}</strong>
          <span className="seasonal-bookmark-season">{label}</span>
        </span>
        <span className="seasonal-bookmark-astronomy">
          <span><em>{moonRowLabel}</em><strong>{moonLabel} · {moon.illumination}%</strong></span>
          <span><em>{fullMoonRowLabel}</em><strong>{nextFullMoonLabel}</strong></span>
          <span><em>{sunRowLabel}</em><strong>{solarConstellation} · {seasonCountdown}</strong></span>
        </span>
      </span>
    </aside>
  );
}

function getPassportCode(dataIso: string, initials: string): string {
  return `${dataIso.replace(/-/g, '')}-${initials || 'TDG'}`;
}

function DailyPassport({
  data,
  opera,
  lingua,
  isDark,
  dataIso,
  initials,
  onClose,
}: {
  data: DatiTaccuino;
  opera: OperaGiorno | null;
  lingua: 'IT' | 'EN';
  isDark: boolean;
  dataIso: string;
  initials: string;
  onClose: () => void;
}) {
  const label = {
    title: lingua === 'IT' ? 'Passaporto del Giorno' : 'Passport of the Day',
    subtitle: lingua === 'IT'
      ? 'Una mappa pieghevole da scaricare, stampare e conservare.'
      : 'A foldable map to download, print, and keep.',
    download: lingua === 'IT' ? 'Scarica PDF' : 'Download PDF',
    print: lingua === 'IT' ? 'Apri stampa' : 'Open print',
    close: lingua === 'IT' ? 'Chiudi' : 'Close',
    author: lingua === 'IT' ? 'Autore del Giorno' : 'Author of the Day',
    quote: lingua === 'IT' ? 'Citazione' : 'Quote',
    word: lingua === 'IT' ? 'Parola del Giorno' : 'Word of the Day',
    saints: lingua === 'IT' ? 'I Santi di Oggi' : "Today's Saints",
    events: lingua === 'IT' ? 'Accadde Oggi' : 'This Day in History',
    poem: lingua === 'IT' ? 'Poesia del giorno' : 'Poem of the Day',
    bible: lingua === 'IT' ? 'Passaggio biblico' : 'Biblical passage',
    music: lingua === 'IT' ? 'Consiglio Musicale' : 'Musical Recommendation',
    artwork: lingua === 'IT' ? 'Opera del Giorno' : 'Artwork of the Day',
    stamp: lingua === 'IT' ? 'Visitato' : 'Visited',
    number: lingua === 'IT' ? 'N.' : 'No.',
    foldHint: lingua === 'IT' ? 'Piega lungo i tratteggi' : 'Fold on dashed lines',
    authorPhoto: lingua === 'IT' ? 'Ritratto dell’autore' : 'Author portrait',
    artworkImage: lingua === 'IT' ? 'Immagine dell’opera' : 'Artwork image',
  };
  const passportCode = getPassportCode(dataIso, initials);

  return (
    <div className={`daily-passport-overlay ${garamond.className} ${isDark ? 'is-dark' : ''}`} role="dialog" aria-modal="true" aria-labelledby="daily-passport-title">
      <div className="daily-passport-toolbar">
        <div>
          <span className="daily-passport-kicker">
            <Stamp className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
            {lingua === 'IT' ? 'Da conservare' : 'Keepsake'}
          </span>
          <h2 id="daily-passport-title">{lingua === 'IT' ? 'Anteprima del passaporto' : 'Passport preview'}</h2>
          <p>{label.subtitle}</p>
        </div>
        <div className="daily-passport-actions">
          <button type="button" className="daily-passport-print-button" onClick={() => window.print()}>
            <FileDown className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
            <span>{label.download}</span>
          </button>
          <button type="button" className="daily-passport-close-button" onClick={onClose} aria-label={label.close}>
            <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="daily-passport-preview">
        <article className="daily-passport-document" aria-label={`${label.title}: ${data.data_odierna}`}>
          <div className="daily-passport-paper-grain" aria-hidden="true" />
          <div className="daily-passport-folds" aria-hidden="true">
            <span /><span /><span /><span /><span />
          </div>

          <section className="daily-passport-cover-panel">
            <p className="daily-passport-small-label">{label.number} {passportCode}</p>
            <h3>{label.title}</h3>
            <p className="daily-passport-date">{data.data_odierna}</p>
            <div className="daily-passport-stamp">
              <span>{label.stamp}</span>
              <strong>{initials}</strong>
              <em>{formatExLibrisDate(dataIso)}</em>
            </div>
            <div className="daily-passport-cover-author">
              <span>{label.author}</span>
              <h4>{data.autore_giorno}</h4>
              <p>{data.breve_descrizione}</p>
            </div>
            {data.foto_autore_url && (
              <figure className="daily-passport-author-photo">
                <img src={data.foto_autore_url} alt={`${label.authorPhoto}: ${data.autore_giorno}`} />
              </figure>
            )}
            <p className="daily-passport-fold-hint">{label.foldHint}</p>
          </section>

          <section className="daily-passport-content-flow">
            <section>
              <span>{label.quote}</span>
              <blockquote>&ldquo;{data.citazione.testo}&rdquo;</blockquote>
              <p className="daily-passport-source">{data.citazione.autore}{data.citazione.fonte ? `, ${data.citazione.fonte}` : ''}</p>
            </section>

            <section>
              <span>{label.word}</span>
              <h4>{data.parola_giorno.parola}</h4>
              <p><strong>{data.parola_giorno.etimologia}</strong></p>
              <p>{data.parola_giorno.definizione}</p>
              {data.parola_giorno.esempio && data.parola_giorno.esempio.trim() !== '' && data.parola_giorno.esempio !== 'null' && (
                <blockquote>&ldquo;{data.parola_giorno.esempio}&rdquo;</blockquote>
              )}
              {data.parola_giorno.nota && <p>{data.parola_giorno.nota}</p>}
            </section>

            <section>
              <span>{label.saints}</span>
              {data.santi.map((santo, index) => (
                <div key={index} className="daily-passport-mini-entry">
                  <h5>{santo.nome}</h5>
                  <p><strong>{santo.ruolo}</strong>{santo.anni ? ` · ${santo.anni}` : ''}</p>
                  <p>{santo.biografia}</p>
                </div>
              ))}
            </section>

            <section>
              <span>{label.events}</span>
              <ul className="daily-passport-events">
                {data.avvenimenti.map((evento, index) => (
                  <li key={index}>{evento}</li>
                ))}
              </ul>
            </section>

            <section>
              <span>{label.poem}</span>
              <h4>{data.poesia.autore}</h4>
              <p className="daily-passport-source">{data.poesia.fonte}</p>
              <p className="daily-passport-poem">{data.poesia.testo}</p>
              {data.poesia.nota && <p>{data.poesia.nota}</p>}
            </section>

            <section>
              <span>{label.bible}</span>
              <h4>{data.bibbia.fonte}</h4>
              <p className="daily-passport-bible-text">{data.bibbia.testo}</p>
              {data.bibbia.nota && <p>{data.bibbia.nota}</p>}
            </section>

          </section>

          <aside className="daily-passport-art-panel">
            <section>
              <span>{label.music}</span>
              <h4>{data.musica.brano}</h4>
              <p className="daily-passport-source">{data.musica.autore} · {data.musica.genere}</p>
              <p>{data.musica.motivo}</p>
            </section>

            {opera && (
              <section>
                <span>{label.artwork}</span>
                {opera.immagine_url_hd || opera.immagine_url ? (
                  <figure className="daily-passport-artwork">
                    <img src={opera.immagine_url_hd || opera.immagine_url} alt={`${label.artworkImage}: ${opera.titolo}`} />
                  </figure>
                ) : null}
                <h4>{opera.titolo}</h4>
                <p className="daily-passport-source">{opera.artista}{opera.anno ? ` · ${opera.anno}` : ''}</p>
                <p>{[opera.medium, opera.dipartimento, opera.museo].filter(Boolean).join(' · ')}</p>
              </section>
            )}

            <footer className="daily-passport-signature">
              <strong className={`${jocky.className} notebook-wordmark`}>{lingua === 'IT' ? 'Il giorno da custodire' : 'A day to keep'}</strong>
              <span>{lingua === 'IT' ? 'Realizzato con amore da Antonello.' : 'Made with love by Antonello.'}</span>
            </footer>
          </aside>
        </article>
      </div>

      <div className="daily-passport-mobile-actions">
        <button type="button" className="daily-passport-print-button" onClick={() => window.print()}>
          <Printer className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
          <span>{label.print}</span>
        </button>
      </div>
    </div>
  );
}

const notebookNavItems = [
  { id: 'autore', icon: Feather, labelIT: 'Autore', labelEN: 'Author' },
  { id: 'citazione', icon: Quote, labelIT: 'Citazione', labelEN: 'Quote' },
  { id: 'parola', icon: Type, labelIT: 'Parola del giorno', labelEN: 'Word of the day' },
  { id: 'santi', icon: Church, labelIT: 'Santi', labelEN: 'Saints' },
  { id: 'opera', icon: Palette, labelIT: 'Opera del giorno', labelEN: 'Artwork of the day', optional: true },
  { id: 'avvenimenti', icon: CalendarDays, labelIT: 'Accadde oggi', labelEN: 'This day in history' },
  { id: 'poesia', icon: Feather, labelIT: 'Poesia', labelEN: 'Poem' },
  { id: 'bibbia', icon: BookOpen, labelIT: 'Passaggio biblico', labelEN: 'Biblical passage' },
  { id: 'musica', icon: Music, labelIT: 'Musica', labelEN: 'Music' },
];

function LoadingNotebook({ isDark }: { isDark: boolean }) {
  return (
    <ParallaxBackground>
      <div className={`min-h-screen bg-transparent ${garamond.className} flex items-center justify-center px-5 py-10`}>
        <section
          aria-live="polite"
          aria-label="Il taccuino si sta preparando"
          className={`loading-notebook-paper ${isDark ? 'is-dark' : ''}`}
        >
          <img
            className="loading-notebook-sheet"
            src="/images/loading-paper-torn.png"
            alt=""
            aria-hidden="true"
          />
          <div className="loading-notebook-content">
            <div className={`masking-tape ${caveat.className} text-xl font-bold tracking-wider`}>
              oggi
            </div>
            <div className="loading-notebook-head">
              <span />
              <BookOpen className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h1 className={`${jocky.className} notebook-wordmark`}>Il giorno da custodire</h1>
            <div className="loading-writing-stack" aria-hidden="true">
              <span className="loading-pen-line line-one" />
              <span className="loading-pen-line line-two" />
              <span className="loading-pen-line line-three" />
              <span className="loading-pen-line line-four" />
            </div>
            <p>Sto preparando la pagina del giorno.</p>
          </div>
        </section>
      </div>
    </ParallaxBackground>
  );
}

function NotebookQuickNav({
  isDark,
  lingua,
  hasOpera,
  activeSection,
  readingComplete,
}: {
  isDark: boolean;
  lingua: 'IT' | 'EN';
  hasOpera: boolean;
  activeSection: string;
  readingComplete: boolean;
}) {
  const visibleItems = notebookNavItems.filter((item) => hasOpera || !item.optional);

  return (
    <nav
      aria-label={lingua === 'IT' ? 'Sezioni del taccuino' : 'Notebook sections'}
      className={`notebook-quick-nav ${isDark ? 'is-dark' : ''} ${readingComplete ? 'is-read' : ''}`}
    >
      <span className="notebook-quick-nav-rail" aria-hidden="true">
        <span className="notebook-quick-nav-progress" />
      </span>
      {visibleItems.map(({ id, icon: Icon, labelIT, labelEN }) => {
        const label = lingua === 'IT' ? labelIT : labelEN;
        return (
          <a key={id} href={`#${id}`} aria-label={label} title={label} data-label={label} aria-current={activeSection === id ? 'true' : undefined}>
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
          </a>
        );
      })}
    </nav>
  );
}

function MobileReadingThread({
  isDark,
  lingua,
  hasOpera,
  activeSection,
  open,
  hidden,
  onToggle,
  onNavigate,
}: {
  isDark: boolean;
  lingua: 'IT' | 'EN';
  hasOpera: boolean;
  activeSection: string;
  open: boolean;
  hidden: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const visibleItems = notebookNavItems.filter((item) => hasOpera || !item.optional);
  const activeItem = visibleItems.find((item) => item.id === activeSection) ?? visibleItems[0];
  const ActiveIcon = activeItem.icon;
  const activeLabel = lingua === 'IT' ? activeItem.labelIT : activeItem.labelEN;

  return (
    <div
      className={`mobile-reading-thread ${isDark ? 'is-dark' : ''} ${open ? 'is-open' : ''} ${hidden ? 'is-footer-hidden' : ''}`}
      aria-hidden={hidden}
      inert={hidden}
    >
      <nav
        id="mobile-reading-thread-menu"
        aria-label={lingua === 'IT' ? 'Indice di lettura' : 'Reading index'}
        className="mobile-reading-thread-menu"
        aria-hidden={!open}
        inert={!open}
      >
        {visibleItems.map(({ id, icon: Icon, labelIT, labelEN }) => {
          const label = lingua === 'IT' ? labelIT : labelEN;
          return (
            <a
              key={id}
              href={`#${id}`}
              aria-current={activeSection === id ? 'true' : undefined}
              onClick={onNavigate}
            >
              <Icon className="h-4 w-4" strokeWidth={1.65} aria-hidden="true" />
              <span>{label}</span>
            </a>
          );
        })}
      </nav>
      <button
        type="button"
        className="mobile-reading-thread-tab"
        aria-expanded={open}
        aria-controls="mobile-reading-thread-menu"
        onClick={onToggle}
      >
        <span className="mobile-reading-thread-progress" aria-hidden="true"><span /></span>
        <ActiveIcon className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
        <span className="mobile-reading-thread-copy">
          <small>{lingua === 'IT' ? 'Filo di lettura' : 'Reading thread'}</small>
          <strong>{activeLabel}</strong>
        </span>
        <ChevronUp className="mobile-reading-thread-chevron h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<DatiTaccuino | null>(null);
  const [dataOriginale, setDataOriginale] = useState<DatiTaccuino | null>(null);
  const [dataTradotta, setDataTradotta] = useState<DatiTaccuino | null>(null);
  const [opera, setOpera] = useState<OperaGiorno | null>(null);
  const [vinylCover, setVinylCover] = useState<string | null>(null);
  const [vinylPreview, setVinylPreview] = useState(false);
  const [vinylPinned, setVinylPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, right: 16 });
  const [archivio, setArchivio] = useState<ArchivioItem[]>([]);
  const [archivioQuery, setArchivioQuery] = useState('');
  const [dataSelezionata, setDataSelezionata] = useState<string | null>(null);
  const [lingua, setLingua] = useState<'IT' | 'EN'>('IT');
  const [traducendo, setTraducendo] = useState(false);
  const [erroreTraduzioni, setErroreTraduzioni] = useState<string | null>(null);
  const [archivioHasScroll, setArchivioHasScroll] = useState(false);
  const [archivioAtBottom, setArchivioAtBottom] = useState(false);
  const [showExportCard, setShowExportCard] = useState(false);
  const [showDailyPassport, setShowDailyPassport] = useState(false);
  const [isTurningPage, setIsTurningPage] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [activeSection, setActiveSection] = useState('autore');
  const [readingComplete, setReadingComplete] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [footerInView, setFooterInView] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const desktopArchiveTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileArchiveTriggerRef = useRef<HTMLButtonElement>(null);
  const lastArchiveTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileToolsRef = useRef<HTMLDivElement>(null);
  const mobileToolsTriggerRef = useRef<HTMLButtonElement>(null);
  const archivioScrollRef = useRef<HTMLDivElement>(null);
  const archiveSearchRef = useRef<HTMLInputElement>(null);
  const wasPopoverOpenRef = useRef(false);
  const footerRef = useRef<HTMLElement>(null);

  const oggi = new Date().toISOString().split('T')[0];

  const checkArchivioScroll = useCallback(() => {
    const el = archivioScrollRef.current;
    if (!el) return;
    setArchivioHasScroll(el.scrollHeight > el.clientHeight + 4);
    setArchivioAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 8);
  }, []);

  useEffect(() => { if (popoverOpen) setTimeout(checkArchivioScroll, 50); }, [popoverOpen, archivio, archivioQuery, checkArchivioScroll]);

  useEffect(() => {
    if (popoverOpen) {
      wasPopoverOpenRef.current = true;
      const focusTimer = window.setTimeout(() => archiveSearchRef.current?.focus(), 80);
      return () => window.clearTimeout(focusTimer);
    }
    if (wasPopoverOpenRef.current) {
      wasPopoverOpenRef.current = false;
      lastArchiveTriggerRef.current?.focus();
    }
  }, [popoverOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const clickedArchiveTrigger =
        desktopArchiveTriggerRef.current?.contains(target) ||
        mobileArchiveTriggerRef.current?.contains(target);

      if (popoverRef.current && !popoverRef.current.contains(target) && !clickedArchiveTrigger) {
        setPopoverOpen(false);
      }
      if (mobileToolsRef.current && !mobileToolsRef.current.contains(target)) {
        setMobileToolsOpen(false);
      }
    }
    if (popoverOpen || mobileToolsOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverOpen, mobileToolsOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPopoverOpen(false);
        setMobileToolsOpen(false);
        setShowDailyPassport(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!showDailyPassport) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showDailyPassport]);

  useEffect(() => {
    if (!data) return;

    const sectionIds = notebookNavItems
      .filter((item) => Boolean(opera) || !item.optional)
      .map((item) => item.id);
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: '-28% 0px -55% 0px', threshold: [0.08, 0.2, 0.36] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [data, opera]);

  useEffect(() => {
    if (!data) return;

    let frame: number | null = null;
    let lastScrollY = window.scrollY;
    const updateReadingProgress = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress = scrollableHeight <= 0
        ? 100
        : Math.min(100, Math.max(0, (window.scrollY / scrollableHeight) * 100));
      const nextComplete = nextProgress >= 96;
      const scrollDelta = window.scrollY - lastScrollY;

      document.documentElement.style.setProperty('--reading-progress-scale', `${nextProgress / 100}`);
      setReadingComplete((current) => current === nextComplete ? current : nextComplete);
      if (window.scrollY < 120 || scrollDelta < -8) {
        setControlsHidden(false);
      } else if (scrollDelta > 8) {
        setControlsHidden(true);
        setMobileNavOpen(false);
        setMobileToolsOpen(false);
      }
      lastScrollY = window.scrollY;
      frame = null;
    };
    const handleScroll = () => {
      if (frame === null) frame = window.requestAnimationFrame(updateReadingProgress);
    };

    updateReadingProgress();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty('--reading-progress-scale');
    };
  }, [data, contentKey]);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setFooterInView(entry.isIntersecting);
        if (entry.isIntersecting) setMobileNavOpen(false);
      },
      { rootMargin: '0px 0px -80px 0px', threshold: 0.01 }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, [data, contentKey]);

  useEffect(() => {
    applyBrowserTheme(isDark);
  }, [isDark]);
  
  const caricaGiorno = (dataIso: string | null, usePageTurn = false) => {
    if (usePageTurn) {
      setIsTurningPage(true);
    } else {
      setLoading(true);
    }
    setError(null); setPopoverOpen(false); setLingua('IT'); setDataTradotta(null); setErroreTraduzioni(null); setShowExportCard(false); setShowDailyPassport(false); setVinylCover(null); setVinylPreview(false); setVinylPinned(false);
    document.documentElement.style.setProperty('--reading-progress-scale', '0'); setReadingComplete(false);
    const url = dataIso ? `/api/oggi?data=${dataIso}` : '/api/oggi';
    const minimumTurnDelay = usePageTurn ? new Promise(resolve => window.setTimeout(resolve, 680)) : Promise.resolve();
    Promise.all([
      fetch(url).then(res => { if (!res.ok) throw new Error('Nessun contenuto per questa data.'); return res.json(); }),
      fetch(dataIso ? `/api/opera?data=${encodeURIComponent(dataIso)}` : '/api/opera').then(res => {
        if (res.status === 204) return null;
        return res.ok ? res.json() : null;
      }).catch(() => null),
      minimumTurnDelay,
    ])
      .then(([dati, operaData]) => {
        setData(dati); setDataOriginale(dati); setOpera(operaData); setDataSelezionata(dataIso); setLoading(false); setIsTurningPage(false); setActiveSection('autore'); setContentKey(k => k + 1); window.scrollTo({ top: 0, behavior: 'smooth' });
        fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(dati.musica.chiave_ricerca)}&entity=album&limit=3`)
          .then(r => r.json())
          .then(j => {
            const result = j.results?.[0];
            if (result?.artworkUrl100) {
              setVinylCover(result.artworkUrl100.replace('100x100bb', '600x600bb'));
            } else {
              setVinylCover(null);
            }
          })
          .catch(() => setVinylCover(null));
      })
      .catch(err => { setError(err.message); setLoading(false); setIsTurningPage(false); });
  };

  const toggleLingua = useCallback(async () => {
    if (lingua === 'EN') { setLingua('IT'); setData(dataOriginale); return; }
    if (dataTradotta) { setLingua('EN'); setData(dataTradotta); return; }
    if (!dataOriginale) return;
    setTraducendo(true); setErroreTraduzioni(null);
    try {
      const testi = estraiTesti(dataOriginale);
      const res = await fetch('/api/traduci', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testi, targetLang: 'EN' }) });
      if (!res.ok) throw new Error('Errore nella traduzione.');
      const { traduzioni } = await res.json();
      const tradotta = ricostruisciDati(dataOriginale, traduzioni);
      setDataTradotta(tradotta); setData(tradotta); setLingua('EN');
    } catch (e: unknown) {
      setErroreTraduzioni(e instanceof Error ? e.message : 'Traduzione non disponibile.');
    } finally { setTraducendo(false); }
  }, [lingua, dataOriginale, dataTradotta]);

  useEffect(() => {
    let mountedTimer: number | undefined;
    if (typeof window !== 'undefined') {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const savedTheme = localStorage.getItem('theme');
      const calcolatoDark = savedTheme === 'dark' || (!savedTheme && isSystemDark);
      mountedTimer = window.setTimeout(() => {
        setIsMounted(true);
        setIsDark(calcolatoDark);
      }, 0);
      applyBrowserTheme(calcolatoDark);
    }
    const loadTimer = window.setTimeout(() => {
      caricaGiorno(null);
      fetch('/api/archivio').then(res => res.ok ? res.json() : []).then(setArchivio).catch(() => setArchivio([]));
    }, 0);
    return () => {
      if (mountedTimer !== undefined) window.clearTimeout(mountedTimer);
      window.clearTimeout(loadTimer);
    };
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    applyBrowserTheme(next);
  };

  const toggleArchive = (trigger: HTMLButtonElement, returnFocus = trigger) => {
    lastArchiveTriggerRef.current = returnFocus;
    if (!popoverOpen) {
      const rect = trigger.getBoundingClientRect();
      setPopoverPos({
        top: rect.bottom + 10,
        right: window.innerWidth - rect.right,
      });
    }
    setPopoverOpen((current) => !current);
  };

  const themeClasses = {
    bg: isDark ? 'bg-[#252422]' : 'bg-[#F8F6F0]',
    text: isDark ? 'text-[#E0E0E0]' : 'text-[#2A2522]',
    textMuted: isDark ? 'text-[#A0A0A0]' : 'text-[#8A817C]',
    border: isDark ? 'border-white/10' : 'border-[#EBE5DB]',
    highlightBg: isDark ? 'bg-[#2A2A2A]/80' : 'bg-[#F4F0E6]/60',
    selection: isDark ? 'selection:bg-[#DE6B58] selection:text-[#1E1E1E]' : 'selection:bg-[#DE6B58] selection:text-[#FDFCF8]',
    popoverBg: isDark ? '#1C1C1C' : '#F4F0E6',
    popoverBgClass: isDark ? 'bg-[#1C1C1C]' : 'bg-[#F4F0E6]',
    popoverBorder: isDark ? 'border-white/10' : 'border-[#D4CABC]',
    popoverArrowFill: isDark ? '#1C1C1C' : '#F4F0E6',
    popoverArrowStroke: isDark ? 'rgba(255,255,255,0.1)' : '#D4CABC',
    fadeGradient: isDark ? 'linear-gradient(to bottom, transparent 0%, #1C1C1C 100%)' : 'linear-gradient(to bottom, transparent 0%, #F4F0E6 100%)',
    photoBg: isDark ? 'rgba(253,252,248,0.94)' : '#FDFCF8',
    photoBorder: isDark ? 'rgba(255,255,255,0.12)' : '#EBE5DB',
  };

  const archivioQueryPulita = normalizeArchiveText(archivioQuery.trim());
  const archivioFiltrato = archivioQueryPulita
    ? archivio.filter((item) => {
      const haystack = normalizeArchiveText(`${item.autore_giorno} ${formatDataItaliana(item.data)} ${item.data}`);
      return haystack.includes(archivioQueryPulita);
    })
    : archivio;
  const groupedArchivio = groupByMonth(archivioFiltrato);
  const vinylOpen = vinylPinned || vinylPreview;
  const dataExLibris = dataSelezionata ?? oggi;
  const operaSourceUrl = opera?.source_url || opera?.met_url || '';
  const inizialiExLibris = data ? getInitials(data.autore_giorno) : 'TDG';

  // ── POPOVER ARCHIVIO (shared, rendered via portal) ──
  const archivioPopover = isMounted && popoverOpen ? createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="false"
      aria-label="Archivio dei giorni"
      className={`archive-popover is-open ${isDark ? 'is-dark' : ''} fixed z-[9999] border shadow-[0_8px_32px_-4px_rgba(0,0,0,0.22)] flex flex-col overflow-hidden ${garamond.className} ${themeClasses.popoverBgClass} ${themeClasses.popoverBorder}`}
      style={{
        top: `${popoverPos.top}px`,
        right: `${popoverPos.right}px`,
        width: '320px',
        maxWidth: 'calc(100vw - 32px)',
        transformOrigin: 'top right',
        maxHeight: '380px',
        height: 'auto',
      }}
    >
      <svg width="20" height="10" viewBox="0 0 20 10" className="absolute -top-[9px] right-[11px]" style={{ filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.07))' }}>
        <path d="M0 10 L10 0 L20 10" fill={themeClasses.popoverArrowFill} stroke={themeClasses.popoverArrowStroke} strokeWidth="1" />
      </svg>
      <div className={`archive-header flex items-center justify-between px-4 py-3 border-b ${themeClasses.popoverBorder} flex-shrink-0`}>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#DE6B58]" />
          <span className="font-bold tracking-widest uppercase text-sm text-[#DE6B58]">Archivio</span>
        </div>
        <button onClick={() => setPopoverOpen(false)} className={`p-1 rounded-full ${themeClasses.textMuted} hover:text-[#DE6B58] transition-colors`} aria-label="Chiudi archivio"><X className="w-4 h-4" /></button>
      </div>
      {dataSelezionata && dataSelezionata !== oggi && (
        <div className={`px-4 py-2 border-b ${themeClasses.popoverBorder} flex-shrink-0`}>
          <button onClick={() => caricaGiorno(null, Boolean(data))} className="inline-flex items-center gap-1 text-xs text-[#DE6B58] hover:underline font-medium"><ChevronLeft className="w-3.5 h-3.5" />Torna a oggi</button>
        </div>
      )}
      <div className={`archive-search-wrap px-3 py-3 border-b ${themeClasses.popoverBorder}`}>
        <label className="archive-search-field">
          <Search className="archive-search-icon" aria-hidden="true" strokeWidth={1.7} />
          <input
            ref={archiveSearchRef}
            value={archivioQuery}
            onChange={(event) => setArchivioQuery(event.target.value)}
            placeholder={lingua === 'IT' ? 'Cerca autore o data' : 'Search author or date'}
            aria-label={lingua === 'IT' ? 'Cerca nell’archivio' : 'Search archive'}
          />
        </label>
      </div>
      <div className="relative flex-1 min-h-0">
        <div ref={archivioScrollRef} onScroll={checkArchivioScroll} className="archive-scroll overflow-y-auto h-full px-3 py-3" style={{ maxHeight: '300px' }}>
          {archivio.length === 0 ? (
            <p className={`text-xs italic ${themeClasses.textMuted} text-center mt-6`}>Nessun giorno in archivio.</p>
          ) : archivioFiltrato.length === 0 ? (
            <p className={`archive-empty text-xs italic ${themeClasses.textMuted}`}>{lingua === 'IT' ? 'Nessun risultato trovato.' : 'No results found.'}</p>
          ) : (
            Object.entries(groupedArchivio).map(([mese, items]) => {
              const firstItem = items[0];
              const monthNumber = getMonthNumber(firstItem.data);
              const monthMood = getArchiveMonthMood(firstItem.data, lingua);

              return (
              <div key={mese} className={`archive-month archive-month-${monthNumber}`}>
                <p className={`archive-month-tab ${themeClasses.textMuted}`}>
                  <span className="archive-month-name">{mese}</span>
                  <span className="archive-month-note">{monthMood}</span>
                </p>
                <ul className="archive-list">
                  {items.map((item, index) => {
                    const isOggi = item.data === oggi;
                    const isSelezionato = item.data === dataSelezionata;
                    return (
                      <li key={item.data}>
                        <button onClick={() => { if (!isSelezionato) caricaGiorno(item.data, Boolean(data)); else setPopoverOpen(false); }}
                          className={`archive-entry ${
                            isSelezionato ? 'is-selected text-[#DE6B58]' : isDark ? 'text-[#E0E0E0]' : 'text-[#2A2522]'
                          } ${isOggi ? 'is-today' : ''}`}
                          style={{ '--archive-entry-delay': `${80 + Math.min(index, 7) * 34}ms` } as CSSProperties}>
                          <span className={`archive-entry-dot ${isOggi ? 'bg-[#DE6B58]' : isDark ? 'bg-[#555]' : 'bg-[#C8B89A]'}`} />
                          <span className="archive-entry-copy">
                            <span className="archive-entry-title">{item.autore_giorno}</span>
                            <span className={`archive-entry-date ${isSelezionato ? 'text-[#DE6B58]/70' : themeClasses.textMuted}`}>{formatDataItaliana(item.data)}{isOggi ? ' · oggi' : ''}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
              );
            })
          )}
        </div>
        {archivioHasScroll && !archivioAtBottom && (
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 rounded-b-2xl" style={{ background: themeClasses.fadeGradient }} />
        )}
      </div>
    </div>,
    document.body
  ) : null;

  if (loading) return (
    <>
      <LoadingNotebook isDark={isDark} />
      {archivioPopover}
    </>
  );

  if (error) return (
    <div className={`min-h-screen ${themeClasses.bg} flex items-center justify-center ${garamond.className} p-4 relative transition-colors duration-300`}>
      <div className={`${isDark ? 'bg-[#2A2A2A] border-white/10' : 'bg-[#FDFCF8] border-[#EBE5DB]'} border p-8 max-w-lg text-center rounded-2xl relative z-10 transition-colors duration-300`}>
        <p className={`${themeClasses.text} text-xl font-medium mb-4`}>Il taccuino di oggi non è ancora stato compilato.</p>
        <p className={`text-sm ${themeClasses.textMuted} italic`}>{error}</p>
        {archivio.length > 0 && (
          <button
            ref={desktopArchiveTriggerRef}
            onClick={(event) => toggleArchive(event.currentTarget)}
            className="mt-6 inline-flex items-center gap-2 border-2 border-[#DE6B58] text-[#DE6B58] px-6 py-3 rounded-full uppercase tracking-widest text-sm font-bold hover:bg-[#DE6B58] hover:text-white transition-colors"
          >
            <CalendarDays className="w-4 h-4" />Vedi giorni precedenti
          </button>
        )}
      </div>
      {archivioPopover}
    </div>
  );

  if (!data) return null;

  return (
    <ParallaxBackground season={getSeason(dataExLibris)}>
      <div className={`min-h-screen overflow-x-clip bg-transparent ${themeClasses.text} ${garamond.className} py-6 md:py-7 px-4 md:px-8 ${themeClasses.selection} relative transition-colors duration-300`}>
        <NotebookQuickNav
          isDark={isDark}
          lingua={lingua}
          hasOpera={Boolean(opera)}
          activeSection={activeSection}
          readingComplete={readingComplete}
        />
        <MobileReadingThread
          isDark={isDark}
          lingua={lingua}
          hasOpera={Boolean(opera)}
          activeSection={activeSection}
          open={mobileNavOpen}
          hidden={footerInView}
          onToggle={() => {
            setControlsHidden(false);
            setMobileToolsOpen(false);
            setMobileNavOpen((current) => !current);
          }}
          onNavigate={() => setMobileNavOpen(false)}
        />
        <SeasonalBookmark dataIso={dataExLibris} lingua={lingua} isDark={isDark} />
        <div className={`top-control-panel ${controlsHidden && !popoverOpen && !mobileNavOpen ? 'is-hidden' : ''} fixed top-4 right-4 z-50 flex items-center gap-2`}>
          <button
            onClick={toggleLingua}
            disabled={traducendo}
            title={lingua === 'IT' ? 'Traduci in inglese' : 'Torna in italiano'}
            className={`top-control-button top-language-toggle flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-bold tracking-widest uppercase transition-all backdrop-blur-sm ${
              lingua === 'EN'
                ? 'border-[#DE6B58] text-[#DE6B58] bg-[#DE6B58]/10'
                : isDark
                  ? 'border-white/10 text-[#A0A0A0] bg-[#1E1E1E]/55 hover:text-[#DE6B58] hover:border-[#DE6B58]/70'
                  : 'border-[#EBE5DB] text-[#8A817C] bg-[#F4F0E6]/60 hover:text-[#DE6B58] hover:border-[#DE6B58]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={lingua === 'IT' ? 'Traduci in inglese' : 'Torna in italiano'}
          >
            {traducendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
            <span>{lingua === 'IT' ? 'EN' : 'IT'}</span>
          </button>

          {archivio.length > 0 && (
            <button
              ref={desktopArchiveTriggerRef}
              onClick={(event) => toggleArchive(event.currentTarget)}
              className={`top-control-button p-2 rounded-full border backdrop-blur-sm transition-colors ${
                popoverOpen
                  ? 'border-[#DE6B58] text-[#DE6B58]'
                  : isDark
                    ? 'border-white/10 text-[#A0A0A0] bg-[#1E1E1E]/55 hover:text-[#DE6B58] hover:border-[#DE6B58]/70'
                    : 'border-[#EBE5DB] text-[#8A817C] bg-[#F4F0E6]/60 hover:text-[#DE6B58] hover:border-[#DE6B58]'
              }`}
              aria-label="Archivio"
              aria-expanded={popoverOpen}
              aria-haspopup="true"
            >
              <CalendarDays className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={toggleTheme}
            className={`top-control-button p-2 rounded-full border backdrop-blur-sm transition-colors ${
              isDark
                ? 'border-white/10 text-[#A0A0A0] bg-[#1E1E1E]/55 hover:text-[#DE6B58] hover:border-[#DE6B58]/70'
                : 'border-[#EBE5DB] text-[#8A817C] bg-[#F4F0E6]/60 hover:text-[#DE6B58] hover:border-[#DE6B58]'
            }`}
            aria-label="Cambia tema"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        <div
          ref={mobileToolsRef}
          className={`mobile-tools ${isDark ? 'is-dark' : ''} ${mobileToolsOpen ? 'is-open' : ''} ${controlsHidden && !mobileToolsOpen && !popoverOpen ? 'is-hidden' : ''}`}
        >
          <div
            id="mobile-tools-menu"
            className="mobile-tools-menu"
            aria-hidden={!mobileToolsOpen}
            inert={!mobileToolsOpen}
          >
            <button
              type="button"
              onClick={() => {
                setMobileToolsOpen(false);
                void toggleLingua();
              }}
              disabled={traducendo}
              aria-label={lingua === 'IT' ? 'Traduci in inglese' : 'Torna in italiano'}
            >
              {traducendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
              <span>{lingua === 'IT' ? 'English' : 'Italiano'}</span>
            </button>
            {archivio.length > 0 && (
              <button
                ref={mobileArchiveTriggerRef}
                type="button"
                onClick={(event) => {
                  setMobileToolsOpen(false);
                  toggleArchive(event.currentTarget, mobileToolsTriggerRef.current ?? event.currentTarget);
                }}
                aria-expanded={popoverOpen}
                aria-haspopup="dialog"
              >
                <CalendarDays className="h-4 w-4" />
                <span>{lingua === 'IT' ? 'Archivio' : 'Archive'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMobileToolsOpen(false);
                toggleTheme();
              }}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{lingua === 'IT' ? (isDark ? 'Tema chiaro' : 'Tema scuro') : (isDark ? 'Light theme' : 'Dark theme')}</span>
            </button>
          </div>
          <button
            ref={mobileToolsTriggerRef}
            type="button"
            className="mobile-tools-trigger"
            aria-label={lingua === 'IT' ? 'Apri strumenti' : 'Open tools'}
            aria-expanded={mobileToolsOpen}
            aria-controls="mobile-tools-menu"
            onClick={() => {
              setControlsHidden(false);
              setMobileNavOpen(false);
              setMobileToolsOpen((current) => !current);
            }}
          >
            <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>
        {isTurningPage && (
          <>
            <div className={`page-turn-atmosphere ${isDark ? 'is-dark' : ''}`} aria-hidden="true" />
            <div className={`page-turn-veil ${isDark ? 'is-dark' : ''}`} role="status" aria-live="polite">
              <span className="page-turn-mark" aria-hidden="true" />
              <span>{lingua === 'IT' ? 'Cambio pagina' : 'Turning the page'}</span>
            </div>
          </>
        )}
        <main
          key={contentKey}
          className={`journal-page-enter w-full max-w-4xl mx-auto space-y-5 md:space-y-7 relative z-10 ${isTurningPage ? 'journal-page-turning' : ''}`}
          aria-busy={isTurningPage}
        >
          <header className="journal-hero text-center relative animate-fadeInUp stagger-1 px-4">
            <div className="relative z-10">
              <div className="flex justify-center mb-2">
                <div className={`masking-tape journal-date-tape ${caveat.className} text-lg font-bold tracking-wider`}>
                  {data.data_odierna}
                </div>
              </div>
              <h1
                className="journal-hero-title text-[42px] sm:text-5xl md:text-[56px] lg:text-6xl font-medium tracking-tight mb-2"
                style={{
                  textShadow: isDark
                    ? '0 2px 10px rgba(0,0,0,0.55)'
                    : '0 1px 1px rgba(255,252,242,0.75)',
                }}
              >
                <span className={`${jocky.className} notebook-wordmark hero-ink-title animate-handwrite`}>
                  {lingua === 'IT' ? 'Il giorno da custodire' : 'A day to keep'}
                </span>
              </h1>
              <p
                className={`journal-hero-subtitle italic text-base sm:text-[1.05rem] leading-relaxed ${isDark ? 'text-[#D4D4D4]' : 'text-[#4A433F]'} max-w-2xl mx-auto`}
                style={{
                  textShadow: isDark
                    ? '0 1px 3px rgba(0,0,0,0.5)'
                    : '0 1px 1px rgba(255,252,242,0.75)',
                }}
              >
                {lingua === 'IT'
                  ? 'Ogni giorno porta con sé qualcosa da non perdere: una frase, una poesia, un’immagine, una parola, una memoria, un passaggio di fede. Uno spazio per raccoglierli, leggerli con calma e custodirli sulla carta o nel cuore.'
                  : 'Every day carries something worth keeping: a line, a poem, an image, a word, a memory, a passage of faith. A quiet space to gather them, read slowly, and keep them on paper or in the heart.'}
              </p>
              {erroreTraduzioni && <p className="text-xs text-[#DE6B58] italic mt-2">{erroreTraduzioni}</p>}
              <WatercolorDivider isDark={isDark} />
            </div>
          </header>

        <section id="autore" className="author-feature scroll-mt-28 pt-0 pb-4 md:pb-5 animate-fadeInUp stagger-2 relative px-4">
  <div className="relative z-10">
    <div className="author-feature-layout mx-auto flex max-w-3xl flex-col items-center gap-10 md:flex-row md:items-center md:justify-center">
      {data.foto_autore_url && (
        <div className="author-photo-wrap relative z-20 flex-shrink-0" style={{ width: '160px', transform: 'rotate(-2.5deg)' }}>
          <div
            className="masking-tape author-photo-tape"
            style={{
              position: 'absolute',
              top: '-8px',
              left: '-18px',
              transform: 'rotate(-32deg)',
              zIndex: 10,
              width: '80px',
              height: '22px',
              opacity: 0.8,
            }}
          />
          <div
            className="author-photo-paper relative photo-paper-shadow"
            style={{
              background: themeClasses.photoBg,
              border: `1px solid ${themeClasses.photoBorder}`,
              padding: '10px 10px 28px 10px',
              boxShadow: isDark
                ? '0 16px 34px -28px rgba(0,0,0,0.72), 0 2px 8px -6px rgba(0,0,0,0.42)'
                : '0 16px 34px -28px rgba(42,37,34,0.42), 0 2px 8px -6px rgba(42,37,34,0.2)',
            }}
          >
            <img
              src={data.foto_autore_url}
              alt={data.autore_giorno}
              style={{
                display: 'block',
                width: '140px',
                height: '180px',
                objectFit: 'cover',
                filter: 'grayscale(100%) contrast(90%) brightness(1.05)',
              }}
            />
          </div>
        </div>
      )}

      <div className="relative z-10 w-full min-w-0 flex-1 text-center md:text-left">
        <div className="relative z-10">
          <span className={`${stampwriter.className} section-typewriter-badge badge-tilt-left text-sm mb-3`}>
            {lingua === 'IT' ? 'Autore del giorno' : 'Author of the day'}
          </span>
          <h2
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{
              textShadow: isDark
                ? '0 2px 8px rgba(0,0,0,0.5)'
                : '0 1px 1px rgba(255,252,242,0.75)',
            }}
          >
            <TypewriterText text={data.autore_giorno} />
          </h2>
          <p
            className={`text-xl md:text-2xl leading-relaxed font-medium ${isDark ? 'text-[#C0C0C0]' : 'text-[#4A433F]'}`}
            style={{
              textShadow: isDark
                ? '0 1px 2px rgba(0,0,0,0.45)'
                : '0 1px 1px rgba(255,252,242,0.75)',
            }}
          >
            {data.breve_descrizione}
          </p>
          <div className={`daily-thread ${isDark ? 'is-dark' : ''}`} aria-label={lingua === 'IT' ? 'Il filo del giorno' : 'The thread of the day'}>
            <span className="daily-thread-line" aria-hidden="true" />
            <span className="daily-thread-label">{lingua === 'IT' ? 'Il filo di oggi:' : "Today's thread:"}</span>
            <strong className={`${caveat.className} daily-thread-theme`}>
              <span>{data.parola_giorno.parola}</span>
            </strong>
            <span className="daily-thread-line is-ending" aria-hidden="true" />
          </div>
          {!showExportCard && (
            <button
              onClick={() => setShowExportCard(true)}
              className={`author-share-trigger ${isDark ? 'is-dark' : ''}`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {lingua === 'IT' ? 'Esporta come immagine' : 'Export as image'}
            </button>
          )}
        </div>
      </div>
    </div> {/* chiude mx-auto flex */}

    <div
      className={`overflow-hidden transition-all duration-500 ease-in-out ${
        showExportCard
          ? 'max-h-[1400px] opacity-100 translate-y-0 mt-5'
          : 'max-h-0 opacity-0 -translate-y-2 mt-0'
      }`}
      aria-hidden={!showExportCard}
    >
      <div className="pt-1 pb-1">
        <p className={`author-export-note ${themeClasses.textMuted} ${showExportCard ? 'opacity-100' : 'opacity-0'}`}>
          {lingua === 'IT'
            ? 'Anteprima della card da condividere (formato 9:16)'
            : 'Preview of the shareable card (9:16 format)'}
        </p>
        <div className={`author-export-shell ${isDark ? 'is-dark' : ''}`}>
          <AuthorExportCard
            autoreGiorno={data.autore_giorno}
            breveDescrizione={data.breve_descrizione}
            fotoAutoreUrl={data.foto_autore_url}
            citazione={data.citazione}
            dataOdierna={data.data_odierna}
            isDark={isDark}
            onHidePreview={() => setShowExportCard(false)}
            hidePreviewLabel={lingua === 'IT' ? 'Nascondi' : 'Hide'}
            saveImageLabel={lingua === 'IT' ? 'Salva' : 'Save'}
          />
        </div>
      </div>
    </div>
  </div> {/* chiude relative z-10 */}
</section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            <Card
              id="citazione"
              title={lingua === 'IT' ? 'Citazione' : 'Quote'}
              icon={Quote}
              isDark={isDark}
              className="scroll-mt-28 md:col-span-2 animate-fadeInUp stagger-3"
              filename={`citazione-${data.autore_giorno.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <blockquote className="quote-editorial md:px-8">
                <EditorialQuoteText text={data.citazione.testo} />
                <footer className="quote-editorial-footer text-right text-lg clear-both pt-2">
                  <span className="font-bold">{data.citazione.autore}</span>
                  <span className={`${themeClasses.textMuted} italic font-medium`}> — {data.citazione.fonte}</span>
                </footer>
              </blockquote>
            </Card>

            <Card id="parola" title={lingua === 'IT' ? 'Parola del giorno' : 'Word of the day'} icon={Type} isDark={isDark} className="scroll-mt-28 animate-fadeInUp stagger-4"
              filename={`parola-${data.parola_giorno.parola.toLowerCase()}`}>
              <div className="text-center mb-6">
                <h4 className="card-primary-title text-4xl font-bold text-[#DE6B58] mb-2">{data.parola_giorno.parola}</h4>
                <p className={`card-secondary-meta ${themeClasses.textMuted} italic font-medium text-lg`}>{data.parola_giorno.etimologia}</p>
              </div>
              <p className="card-body-copy text-xl font-medium mb-4"><strong className="font-bold">{lingua === 'IT' ? 'Definizione' : 'Definition'}:</strong> {data.parola_giorno.definizione}</p>
              {data.parola_giorno.esempio && data.parola_giorno.esempio.trim() !== '' && data.parola_giorno.esempio !== 'null' && (
                <p className={`text-lg font-medium italic ${themeClasses.highlightBg} p-4 rounded-xl border ${themeClasses.border}`}>&quot;{data.parola_giorno.esempio}&quot;</p>
              )}
              {data.parola_giorno.nota && (
                <aside className={`margin-note ${isDark ? 'is-dark' : ''}`}>
                  <DoodleArrow isDark={isDark} />
                  <span className={caveat.className}>{getMarginalia(data.parola_giorno.nota)}</span>
                </aside>
              )}
            </Card>

            <Card id="santi" title={lingua === 'IT' ? 'I santi di oggi' : "Today's saints"} icon={Church} isDark={isDark} className="scroll-mt-28 animate-fadeInUp stagger-4"
              filename="santi">
              <ul className="space-y-6">
                {data.santi.map((santo, idx) => (
                  <li key={idx} className={`border-b ${themeClasses.border} last:border-0 pb-4 last:pb-0`}>
                    <h4 className="card-primary-title text-2xl font-bold mb-1">{santo.nome}</h4>
                    <p className="card-secondary-meta text-[#DE6B58] font-medium italic mb-2">{santo.ruolo} ({santo.anni})</p>
                    <p className="card-body-copy text-lg font-medium leading-relaxed">{santo.biografia}</p>
                  </li>
                ))}
              </ul>
            </Card>

            {opera && (
              <Card
                id="opera"
                title={lingua === 'IT' ? 'Opera del giorno' : 'Artwork of the day'}
                icon={Palette}
                isDark={isDark}
                className="scroll-mt-28 md:col-span-2 animate-fadeInUp stagger-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
                  <div className="space-y-5 order-2 md:order-1">
                    <div>
                      <h4 className="card-primary-title text-3xl md:text-4xl font-bold leading-tight mb-2">{opera.titolo}</h4>
                      <p className="card-byline text-xl font-medium">{lingua === 'IT' ? 'di' : 'by'} <span className="font-bold">{opera.artista}</span>{opera.anno ? <span className={`${themeClasses.textMuted} italic`}> — {opera.anno}</span> : null}</p>
                    </div>
                    {(opera.medium || opera.dipartimento) && <p className={`card-secondary-meta ${themeClasses.textMuted} italic`}>{[opera.medium, opera.dipartimento].filter(Boolean).join(' · ')}</p>}
                    {operaSourceUrl && (
                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        <a href={operaSourceUrl} target="_blank" rel="noopener noreferrer" className={`editorial-link-button ${isDark ? 'is-dark' : ''}`}>
                          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                          <span>{lingua === 'IT' ? 'Vedi al museo' : 'View at the museum'}</span>
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="order-1 md:order-2">
                    <a href={operaSourceUrl || undefined} target={operaSourceUrl ? '_blank' : undefined} rel={operaSourceUrl ? 'noopener noreferrer' : undefined} className="block group">
                      <img src={opera.immagine_url_hd || opera.immagine_url} alt={`${opera.titolo} by ${opera.artista}`} className={`w-full h-auto object-cover rounded-2xl border ${themeClasses.border} shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] transition-transform duration-500 group-hover:scale-[1.015]`} />
                    </a>
                    <p className={`card-secondary-meta text-sm ${themeClasses.textMuted} italic mt-3 text-center`}>{opera.museo}</p>
                  </div>
                </div>
              </Card>
            )}

            <Card id="avvenimenti" title={lingua === 'IT' ? 'Accadde oggi' : 'This day in history'} icon={CalendarDays} isDark={isDark} className="scroll-mt-28 md:col-span-2 animate-fadeInUp stagger-6"
              filename="avvenimenti">
              <ul className="space-y-4">
                {data.avvenimenti.map((evento, idx) => {
                  const parts = evento.split(':');
                  return (
                    <li key={idx} className="card-body-copy flex gap-4 text-xl font-medium leading-relaxed">
                      <span className="text-[#DE6B58] font-bold">•</span>
                      <span>{parts.length > 1 ? (<><strong className="font-bold">{parts[0]}:</strong>{parts.slice(1).join(':')}</>) : evento}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card id="poesia" title={lingua === 'IT' ? 'Poesia del giorno' : 'Poem of the Day'} icon={Feather} isDark={isDark} className="scroll-mt-28 animate-fadeInUp stagger-7"
              filename={`poesia-${data.poesia.autore.toLowerCase().replace(/\s+/g, '-')}`}>
              <DecorativeInitialText
                text={data.poesia.testo}
                className="whitespace-pre-wrap text-xl font-medium leading-relaxed italic mb-6"
                initialTone="blue"
              />
              <div className={`text-left border-t ${themeClasses.border} pt-4 mb-6`}>
                <p className="font-bold text-xl">{data.poesia.autore}</p>
                <p className={`${themeClasses.textMuted} font-medium italic`}>{data.poesia.fonte}</p>
              </div>
              {data.poesia.nota && (
                <div className={`mt-4 p-4 ${themeClasses.highlightBg} border-l-2 border-[#DE6B58] text-lg font-medium ${isDark ? 'text-[#C0C0C0]' : 'text-[#4A433F]'} rounded-xl`}>
                  <span className="font-bold text-[#DE6B58] text-xs tracking-widest uppercase block mb-1">{lingua === 'IT' ? 'Perché questa scelta' : 'Why this choice'}</span>
                  {data.poesia.nota}
                </div>
              )}
            </Card>

            <Card id="bibbia" title={lingua === 'IT' ? 'Passaggio biblico' : 'Biblical passage'} icon={BookOpen} isDark={isDark} className="scroll-mt-28 animate-fadeInUp stagger-7"
              filename="bibbia">
              <DecorativeInitialText
                text={data.bibbia.testo}
                className="whitespace-pre-wrap text-xl font-medium leading-relaxed italic mb-6"
              />
              <div className={`text-left border-t ${themeClasses.border} pt-4 mb-6`}>
                <p className={`${themeClasses.textMuted} italic font-bold`}>{data.bibbia.fonte}</p>
              </div>
              {data.bibbia.nota && (
                <div className={`mt-4 p-4 ${themeClasses.highlightBg} border-l-2 border-[#DE6B58] text-lg font-medium ${isDark ? 'text-[#C0C0C0]' : 'text-[#4A433F]'} rounded-xl`}>
                  <span className="font-bold text-[#DE6B58] text-xs tracking-widest uppercase block mb-1">{lingua === 'IT' ? 'Il senso del passaggio' : 'The meaning of the passage'}</span>
                  {data.bibbia.nota}
                </div>
              )}
            </Card>

            {/* ── CONSIGLIO MUSICALE ── */}
            <Card
              id="musica"
              isDark={isDark}
              className="music-feature-card scroll-mt-28 md:col-span-2 animate-fadeInUp stagger-8"
              filename={`musica-${data.musica.brano.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`}
            >
              <div className="music-card-layout">

                <div className="music-media-cell select-none">
                  <div
                    className="vinyl-stage relative"
                  >
                    <div
                      className={`vinyl-record absolute left-0 top-0 ${vinylOpen ? 'is-open' : ''}`}
                      style={{
                        zIndex: 0,
                      }}
                    >
                      <svg
                        viewBox="0 0 240 240"
                        className={`w-full h-full ${vinylOpen ? 'vinyl-spin' : ''}`}
                        aria-hidden="true"
                      >
                        <defs>
                          <radialGradient id="vinyl-dark" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#262626" />
                            <stop offset="40%" stopColor="#111111" />
                            <stop offset="100%" stopColor="#1c1c1c" />
                          </radialGradient>
                          <radialGradient id="vinyl-label" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor={isDark ? '#4a3828' : '#d4b896'} />
                            <stop offset="100%" stopColor={isDark ? '#2e2018' : '#b09070'} />
                          </radialGradient>
                        </defs>
                        <circle cx="120" cy="120" r="118" fill="url(#vinyl-dark)" />
                        {[46, 56, 67, 76, 84, 92, 99, 105, 109, 113].map((r, i) => (
                          <circle key={i} cx="120" cy="120" r={r}
                            fill="none" stroke="#2e2e2e" strokeWidth="0.6" opacity="0.7" />
                        ))}
                        <ellipse cx="90" cy="72" rx="35" ry="13" fill="white" opacity="0.035"
                          transform="rotate(-35 90 72)" />
                        <circle cx="120" cy="120" r="34" fill="url(#vinyl-label)" />
                        <circle cx="120" cy="120" r="4.5" fill="#0a0a0a" />
                        <text x="120" y="114" textAnchor="middle" fontSize="6.5"
                          fill={isDark ? '#e8d4b4' : '#5a3a1a'} fontFamily="Georgia, serif" fontStyle="italic">
                          {data.musica.autore.slice(0, 16)}
                        </text>
                        <text x="120" y="126" textAnchor="middle" fontSize="5.5"
                          fill={isDark ? '#c4a878' : '#7a5a3a'} fontFamily="Georgia, serif">
                          {data.musica.brano.slice(0, 18)}
                        </text>
                      </svg>
                    </div>

                    <button
                      type="button"
                      className="vinyl-sleeve absolute left-0 top-0 rounded-sm overflow-hidden cursor-pointer"
                      style={{
                        zIndex: 10,
                      }}
                      onMouseEnter={() => setVinylPreview(true)}
                      onMouseLeave={() => setVinylPreview(false)}
                      onFocus={() => setVinylPreview(true)}
                      onBlur={() => setVinylPreview(false)}
                      onClick={() => setVinylPinned(open => !open)}
                      aria-label={lingua === 'IT' ? 'Apri la copertina del disco' : 'Open the record sleeve'}
                      aria-pressed={vinylPinned}
                    >
                      {vinylCover ? (
                        <img
                          src={vinylCover}
                          alt={`${data.musica.brano} cover`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-[#2A2A2A]' : 'bg-[#DDD5C4]'}`}>
                          <Music className={`w-16 h-16 ${isDark ? 'text-[#555]' : 'text-[#A09080]'}`} />
                        </div>
                      )}
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <filter id="grain-vintage">
                          <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" stitchTiles="stitch" result="noise" />
                          <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
                          <feBlend in="SourceGraphic" in2="gray" mode="soft-light" result="blended" />
                          <feComponentTransfer in="blended"><feFuncA type="linear" slope="1" /></feComponentTransfer>
                        </filter>
                        <rect width="100%" height="100%" filter="url(#grain-vintage)" opacity="0.28" />
                      </svg>
                      <div
                        className="absolute inset-0 pointer-events-none rounded-sm"
                        style={{ background: isDark ? 'radial-gradient(ellipse at center, transparent 54%, rgba(0,0,0,0.22) 100%)' : 'radial-gradient(ellipse at center, transparent 56%, rgba(42,37,34,0.16) 100%)' }}
                      />
                    </button>

                  </div>
                </div>

                <div className="music-copy-cell">
                  <div className="flex items-center justify-center md:justify-start mb-5">
                    <h3 className={`${stampwriter.className} section-typewriter-badge badge-tilt-right text-sm`}>
                      <Music className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
                      <span>{lingua === 'IT' ? 'Consiglio musicale' : 'Musical recommendation'}</span>
                    </h3>
                  </div>

                  <h4 className="card-primary-title text-3xl font-bold mb-2">{data.musica.brano}</h4>
                  <p className="card-byline text-xl font-medium mb-2">
                    {lingua === 'IT' ? 'di' : 'by'}{' '}
                    <span className="font-bold">{data.musica.autore}</span>
                  </p>
                  <p className="card-secondary-meta text-[#DE6B58] font-medium italic mb-5">{data.musica.genere}</p>
                  <p className="card-body-copy text-xl font-medium leading-relaxed mb-7">{data.musica.motivo}</p>
                  <div className="music-link-actions">
                    <a
                      href={`https://open.spotify.com/search/${encodeURIComponent(data.musica.chiave_ricerca)}`}
                      target="_blank" rel="noopener noreferrer"
                      className={`editorial-link-button ${isDark ? 'is-dark' : ''}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                      <span>{lingua === 'IT' ? 'Spotify' : 'Spotify'}</span>
                    </a>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(data.musica.chiave_ricerca)}`}
                      target="_blank" rel="noopener noreferrer"
                      className={`editorial-link-button ${isDark ? 'is-dark' : ''}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                      <span>{lingua === 'IT' ? 'YouTube' : 'YouTube'}</span>
                    </a>
                  </div>
                </div>

              </div>
            </Card>

          </div>

          {/* ── FOOTER ── */}
          <footer ref={footerRef} className={`journal-footer ${isDark ? 'is-dark' : ''} ${themeClasses.textMuted}`}>
            <div className="journal-footer-inner">
              <div className="daily-ex-libris" aria-label={`${lingua === 'IT' ? 'Ex libris del giorno' : 'Daily ex libris'}: ${data.autore_giorno}`}>
                <span className="daily-ex-libris-ring" aria-hidden="true" />
                <span className="daily-ex-libris-kicker">Ex Libris</span>
                <strong>{inizialiExLibris}</strong>
                <span className="daily-ex-libris-date">{formatExLibrisDate(dataExLibris)}</span>
              </div>
              <p className={`journal-footer-title ${jocky.className} notebook-wordmark`}>
                {lingua === 'IT' ? 'Il giorno da custodire' : 'A day to keep'}
              </p>
              <p className="journal-footer-note">
              {lingua === 'IT' ? (
                <>
                  Un foglio quotidiano di cultura, memoria e ascolto.
                  <br />
                  Realizzato con amore da Antonello.
                </>
              ) : (
                <>
                  A daily page of culture, memory, and listening.
                  <br />
                  Made with love by Antonello.
                </>
              )}
              </p>
              <nav className="journal-footer-socials" aria-label={lingua === 'IT' ? 'Collegamenti social' : 'Social links'}>
                <a href="https://x.com/antonello23" target="_blank" rel="noopener noreferrer" className="journal-footer-link" aria-label="X (Twitter)">
                  <XIcon className="w-4 h-4" />
                  <span>X</span>
                </a>
                <a href="https://www.instagram.com/antonelloan23/" target="_blank" rel="noopener noreferrer" className="journal-footer-link" aria-label="Instagram">
                  <InstagramIcon className="w-4 h-4" />
                  <span>Instagram</span>
                </a>
                <a href="https://buymeacoffee.com/antonello23" target="_blank" rel="noopener noreferrer" className="journal-footer-link" aria-label="Buy Me a Coffee">
                  <CoffeeIcon className="w-4 h-4" />
                  <span>{lingua === 'IT' ? 'Supporta' : 'Support'}</span>
                </a>
              </nav>
              <button
                type="button"
                className={`daily-passport-open-button ${isDark ? 'is-dark' : ''}`}
                onClick={() => window.open(`/passaporto?data=${dataExLibris}`, '_blank', 'noopener,noreferrer')}
              >
                <FileDown className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
                <span>{lingua === 'IT' ? 'Crea il passaporto del giorno' : 'Create today’s passport'}</span>
              </button>
            </div>
          </footer>

        </main>

        {archivioPopover}
        {isMounted && showDailyPassport && createPortal(
          <DailyPassport
            data={data}
            opera={opera}
            lingua={lingua}
            isDark={isDark}
            dataIso={dataExLibris}
            initials={inizialiExLibris}
            onClose={() => setShowDailyPassport(false)}
          />,
          document.body
        )}

      </div>
    </ParallaxBackground>
  );
}
