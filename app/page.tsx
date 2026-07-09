'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { IM_Fell_Double_Pica, Caveat } from 'next/font/google';
import localFont from 'next/font/local';
import { QRCodeSVG } from 'qrcode.react';
import { BookOpen, Quote, Type, CalendarDays, Feather, Music, Sparkles, Church, Sun, Moon, Palette, ExternalLink, X, ChevronLeft, ChevronUp, ChevronDown, Languages, Loader2, Search, FileDown, Printer, Stamp, SlidersHorizontal, Bookmark, BookmarkCheck, Telescope } from 'lucide-react';
import AuthorExportCard from './components/AuthorExportCard';
import Card from './components/Card';
import ParallaxBackground from '@/components/ui/ParallaxBackground';
import type { Artwork } from '@/lib/artwork';
import type { SaintArtwork } from '@/lib/saint-artwork';
import type { SkyRegion, VisiblePlanet } from '@/lib/visible-planets';
import { getSeasonalArtwork, getLocalizedSeasonalArtwork } from '@/lib/seasonal-artwork';

const SKY_REGION_OPTIONS: { id: SkyRegion; IT: string; EN: string; cityIT: string; cityEN: string }[] = [
  { id: 'north', IT: 'Nord', EN: 'North', cityIT: 'Milano', cityEN: 'Milan' },
  { id: 'center', IT: 'Centro', EN: 'Central', cityIT: 'Roma', cityEN: 'Rome' },
  { id: 'south', IT: 'Sud', EN: 'South', cityIT: 'Palermo', cityEN: 'Palermo' },
];
const SKY_REGION_STORAGE_KEY = 'taccuino-sky-region-v1';
const TICKET_DOWNLOAD_EVENT = 'taccuino:download-ticket';

function isMobileChromiumBrowser(): boolean {
  const userAgent = window.navigator.userAgent;
  return window.matchMedia('(max-width: 1179px)').matches
    && /Chrome|Chromium|CriOS|EdgA|EdgiOS/i.test(userAgent);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Impossibile incorporare l’immagine del quadro.'));
    reader.readAsDataURL(blob);
  });
}

function proxiedImageUrl(url: string | null | undefined) {
  return url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : '';
}

function uniqueImageCandidates(...urls: Array<string | null | undefined>) {
  return Array.from(new Set(urls.filter((url): url is string => Boolean(url))));
}

const garamond = IM_Fell_Double_Pica({
  subsets: ['latin'],
  weight: ['400'],
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
const masterSignature = localFont({
  src: '../public/fonts/MasterSignature.otf',
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
  dark: '#171614',
} as const;

const SEAL_COLOR_MAP: Record<string, { color: string; rgb: string }> = {
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

function runWhenIdle(callback: () => void) {
  if (typeof window === 'undefined') return;

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: 1400 });
    return;
  }

  globalThis.setTimeout(callback, 350);
}

function getImageLoadingProps(priority = false) {
  return priority
    ? { decoding: 'async' as const, fetchPriority: 'high' as const }
    : { loading: 'lazy' as const, decoding: 'async' as const };
}

const eagerImageProps = getImageLoadingProps(true);
const lazyImageProps = getImageLoadingProps();
const lowPriorityImageProps = { decoding: 'async' as const, fetchPriority: 'low' as const };

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

const WatercolorDivider = ({ isDark, accentColor }: { isDark: boolean; accentColor?: string }) => {
  const color = accentColor ?? (isDark ? '#7a5c38' : '#b5956a');
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
type SaintArtworkResult = SaintArtwork & { saintName: string };

interface ApodData {
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

type LanguageCode = 'IT' | 'EN' | 'FR' | 'DE' | 'ES' | 'PT';

interface DatiTaccuino {
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

interface ArchivioItem {
  data: string;
  autore_giorno: string;
}

type SavedSectionId = 'citazione' | 'parola' | 'santi' | 'opera' | 'avvenimenti' | 'poesia' | 'bibbia' | 'musica' | 'apod';

interface SavedCardItem {
  id: string;
  date: string;
  section: SavedSectionId;
  title: string;
  excerpt: string;
  source?: string;
  savedAt: number;
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

function formatDataInglese(dataIso: string): string {
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

function formatDataMultilingua(dataIso: string, lingua: LanguageCode): string {
  if (!dataIso || !/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return '';
  const [anno, mese, giorno] = dataIso.split('-');
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

const UI_TRANSLATIONS: Record<string, Record<LanguageCode, string>> = {
  almanac: {
    IT: 'Effemeridi', EN: 'Almanac', FR: 'Éphémérides', DE: 'Almanach', ES: 'Efemérides', PT: 'Efemérides'
  },
  moon: {
    IT: 'Luna:', EN: 'Moon:', FR: 'Lune:', DE: 'Mond:', ES: 'Luna:', PT: 'Lua:'
  },
  fullMoon: {
    IT: 'Luna piena:', EN: 'Full moon:', FR: 'Pleine lune:', DE: 'Vollmond:', ES: 'Luna llena:', PT: 'Lua cheia:'
  },
  daylight: {
    IT: 'Luce del giorno:', EN: 'Daylight:', FR: 'Lumière du jour:', DE: 'Tageslicht:', ES: 'Luz del día:', PT: 'Luz do dia:'
  },
  planets: {
    IT: 'Pianeti osservabili', EN: 'Observable planets', FR: 'Planètes observables', DE: 'Beobachtbare Planeten', ES: 'Planetas observables', PT: 'Planetas observáveis'
  },
  readingSky: {
    IT: 'Calcolo del cielo…', EN: 'Reading the sky…', FR: 'Lecture du ciel…', DE: 'Himmel wird berechnet…', ES: 'Leyendo el cielo…', PT: 'Lendo o céu…'
  },
  noPlanets: {
    IT: 'Nessuno ben osservabile stanotte', EN: 'None clearly observable tonight', FR: 'Aucune bien observable ce soir', DE: 'Heute Nacht keine gut sichtbar', ES: 'Ninguno claramente observable esta noche', PT: 'Nenhum claramente observável esta noite'
  },
  dayTitle: {
    IT: 'Il giorno da custodire', EN: 'A day to keep', FR: 'Un jour à garder', DE: 'Ein Tag zum Bewahren', ES: 'Un día para guardar', PT: 'Um dia para guardar'
  },
  daySubtitle: {
    IT: 'Ogni giorno porta con sé qualcosa da non perdere: una frase, una poesia, un’immagine, una parola, una memoria, un passaggio di fede. Uno spazio per raccoglierli, leggerli con calma e custodirli sulla carta o nel cuore.',
    EN: 'Every day carries something worth keeping: a line, a poem, an image, a word, a memory, a passage of faith. A quiet space to gather them, read slowly, and keep them on paper or in the heart.',
    FR: 'Chaque jour apporte son lot de choses à ne pas manquer : une phrase, un poème, une image, un mot, un souvenir, un passage de foi. Un espace pour les rassembler, les lire calmement et les garder sur le papier ou dans le cœur.',
    DE: 'Jeder Tag bringt etwas Wertvolles mit sich: eine Zeile, ein Gedicht, ein Bild, ein Wort, eine Erinnerung, eine Glaubenspassage. Ein stiller Ort, um sie zu sammeln, langsam zu lesen und auf Papier oder im Herzen zu bewahren.',
    ES: 'Cada día trae consigo algo digno de guardar: una frase, un poema, una imagen, una palabra, un recuerdo, un pasaje de fe. Un espacio tranquilo para reunirlos, leer lentamente y guardarlos en papel o en el corazón.',
    PT: 'Cada dia traz consigo algo que vale a pena guardar: uma frase, um poema, uma imagem, uma palavra, uma memória, uma passagem de fé. Um espaço tranquilo para recolhê-los, ler devagar e guardá-los no papel ou no coração.'
  },
  savedPages: {
    IT: 'Cose custodite', EN: 'Saved pages', FR: 'Pages sauvegardées', DE: 'Gespeicherte Seiten', ES: 'Páginas guardadas', PT: 'Páginas salvas'
  },
  savedPagesTitle: {
    IT: 'Cose custodite', EN: 'Kept items', FR: 'Objets gardés', DE: 'Aufbewahrte Dinge', ES: 'Cosas guardadas', PT: 'Coisas guardadas'
  },
  noSaved: {
    IT: 'Non hai ancora custodito nulla. Clicca sull\'icona della piuma o del segnalibro per salvare i tuoi momenti preferiti.',
    EN: 'You haven\'t kept anything yet. Click the feather or bookmark icon to save your favorite moments.',
    FR: 'Vous n\'avez encore rien gardé. Cliquez sur la plume ou le signet pour sauvegarder vos moments préférés.',
    DE: 'Sie haben noch nichts gespeichert. Klicken Sie auf das Feder- oder Lesezeichensymbol, um Ihre Lieblingsmomente zu speichern.',
    ES: 'Aún no has guardado nada. Haz clic en la pluma o en el marcador para guardar tus momentos favoritos.',
    PT: 'Ainda não guardou nada. Clique na pena ou no marcador para guardar os seus momentos favoritos.'
  },
  clearAll: {
    IT: 'Cancella tutto', EN: 'Clear all', FR: 'Tout effacer', DE: 'Alles löschen', ES: 'Borrar todo', PT: 'Limpar tudo'
  },
  visited: {
    IT: 'già consultato', EN: 'already visited', FR: 'déjà visité', DE: 'bereits besucht', ES: 'ya visitado', PT: 'já visitado'
  },
  passportPreview: {
    IT: 'Anteprima del passaporto', EN: 'Passport preview', FR: 'Aperçu du passeport', DE: 'Reisepass-Vorschau', ES: 'Vista previa del pasaporte', PT: 'Visualização del pasaporte'
  },
  keepsake: {
    IT: 'Da conservare', EN: 'Keepsake', FR: 'À conserver', DE: 'Zum Aufbewahren', ES: 'Para conservar', PT: 'Para guardar'
  },
  zineSubtitle: {
    IT: 'Un foglio A4, otto facciate di cultura quotidiana.', EN: 'One A4 sheet, eight pages of daily culture.', FR: 'Une feuille A4, huit pages de culture quotidienne.', DE: 'Ein A4-Blatt, acht Seiten täglicher Kultur.', ES: 'Una hoja A4, ocho páginas de cultura diaria.', PT: 'Uma folha A4, oito páginas de cultura quotidiana.'
  },
  printPdf: {
    IT: 'Stampa / Salva PDF', EN: 'Print / Save PDF', FR: 'Imprimer / Sauver PDF', DE: 'Drucken / Als PDF speichern', ES: 'Imprimir / Guardar PDF', PT: 'Imprimir / Salvar PDF'
  },
  close: {
    IT: 'Chiudi', EN: 'Close', FR: 'Fermer', DE: 'Schließen', ES: 'Cerrar', PT: 'Fechar'
  },
  closePreview: {
    IT: 'Chiudi anteprima', EN: 'Close preview', FR: 'Fermer l\'aperçu', DE: 'Vorschau schließen', ES: 'Cerrar vista previa', PT: 'Fechar visualização'
  },
  author: {
    IT: 'Autore', EN: 'Author', FR: 'Auteur', DE: 'Autor', ES: 'Autor', PT: 'Autor'
  },
  visitedStamp: {
    IT: 'Visitato', EN: 'Visited', FR: 'Visité', DE: 'Besucht', ES: 'Visitado', PT: 'Visitado'
  },
  foldHint: {
    IT: 'Piega lungo i tratteggi', EN: 'Fold on dashed lines', FR: 'Plier le long des pointillés', DE: 'An den gestrichelten Linien falten', ES: 'Doblar por las líneas discontinuas', PT: 'Dobrar ao longo das linhas tracejadas'
  },
  authorPhoto: {
    IT: 'Ritratto dell’autore', EN: 'Author portrait', FR: 'Portrait de l\'auteur', DE: 'Porträt des Autors', ES: 'Retrato del autor', PT: 'Retrato do autor'
  },
  artworkImage: {
    IT: 'Immagine dell’opera', EN: 'Artwork image', FR: 'Image de l\'œuvre', DE: 'Bild des Kunstwerks', ES: 'Imagen de la obra', PT: 'Imagem da obra'
  },
  authorOfTheDay: {
    IT: 'Autore del giorno', EN: 'Author of the day', FR: 'Auteur du jour', DE: 'Autor des Tages', ES: 'Autor del día', PT: 'Autor do dia'
  },
  shareCardPreview: {
    IT: 'Anteprima della card da condividere (formato 9:16)', EN: 'Preview of the shareable card (9:16 format)', FR: 'Aperçu de la carte à partager (format 9:16)', DE: 'Vorschau der teilbaren Karte (9:16 Format)', ES: 'Vista previa de la tarjeta para compartir (formato 9:16)', PT: 'Visualização do cartão de partilha (formato 9:16)'
  },
  hide: {
    IT: 'Nascondi', EN: 'Hide', FR: 'Masquer', DE: 'Ausblenden', ES: 'Ocultar', PT: 'Ocultar'
  },
  save: {
    IT: 'Salva', EN: 'Save', FR: 'Sauver', DE: 'Speichern', ES: 'Guardar', PT: 'Salvar'
  },
  generating: {
    IT: 'Generando', EN: 'Generating', FR: 'Génération', DE: 'Wird generiert', ES: 'Generando', PT: 'Gerando'
  },
  createPassport: {
    IT: 'Crea il passaporto del giorno', EN: 'Create today’s passport', FR: 'Créer le passeport du jour', DE: 'Reisepass des Tages erstellen', ES: 'Crear el pasaporte del día', PT: 'Criar o passaporte do dia'
  },
  download: {
    IT: 'Scarica', EN: 'Download', FR: 'Télécharger', DE: 'Herunterladen', ES: 'Descargar', PT: 'Descarregar'
  },
  downloadTicket: {
    IT: 'Scarica il biglietto', EN: 'Download ticket', FR: 'Télécharger le billet', DE: 'Ticket herunterladen', ES: 'Descargar billete', PT: 'Descarregar bilhete'
  },
  downloadTicketAria: {
    IT: 'Scarica il biglietto in PNG ad alta risoluzione', EN: 'Download the ticket as a high-resolution PNG', FR: 'Télécharger le billet en PNG haute résolution', DE: 'Ticket als hochauflösendes PNG herunterladen', ES: 'Descargar el billete en PNG de alta resolución', PT: 'Descarregar o bilhete em PNG de alta resolução'
  },
  ticketReadyTitle: {
    IT: 'Il biglietto è pronto', EN: 'Your ticket is ready', FR: 'Le billet est prêt', DE: 'Das Ticket ist bereit', ES: 'El billete está listo', PT: 'O bilhete está pronto'
  },
  ticketReadySubtitle: {
    IT: 'Tocca qui sotto per salvarlo in alta risoluzione.', EN: 'Tap below to save it in high resolution.', FR: 'Appuyez ci-dessous pour le sauvegarder en haute résolution.', DE: 'Tippen Sie unten, um es in hoher Auflösung zu speichern.', ES: 'Toque a continuación para guardarlo en alta resolución.', PT: 'Toque abaixo para guardá-lo em alta resolução.'
  },
  saveTicket: {
    IT: 'Salva il biglietto', EN: 'Save ticket', FR: 'Sauver le billet', DE: 'Ticket speichern', ES: 'Guardar billete', PT: 'Salvar bilhete'
  },
  openDay: {
    IT: 'Apri il giorno', EN: 'Open the day', FR: 'Ouvrir le jour', DE: 'Tag öffnen', ES: 'Abrir el día', PT: 'Abrir o dia'
  },
  openDayAria: {
    IT: 'Apri il giorno {date}', EN: 'Open {date}', FR: 'Ouvrir le {date}', DE: '{date} öffnen', ES: 'Abrir el día {date}', PT: 'Abrir o dia {date}'
  },
  changeTheme: {
    IT: 'Cambia tema', EN: 'Change theme', FR: 'Changer de thème', DE: 'Thema ändern', ES: 'Cambiar tema', PT: 'Mudar de tema'
  },
  passportTitle: {
    IT: 'Passaporto del Giorno', EN: 'Passport of the Day', FR: 'Passeport du Jour', DE: 'Reisepass des Tages', ES: 'Pasaporte del Día', PT: 'Passaporte do Dia'
  },
  passportSubtitle: {
    IT: 'Una mappa pieghevole da scaricare, stampare e conservare.', EN: 'A foldable map to download, print, and keep.', FR: 'Une carte pliable à télécharger, imprimer et conserver.', DE: 'Eine faltbare Karte zum Herunterladen, Drucken und Aufbewahren.', ES: 'Un mapa plegable para descargar, imprimir y guardar.', PT: 'Um mapa dobrável para descarregar, imprimir e guardar.'
  },
  downloadPdf: {
    IT: 'Scarica PDF', EN: 'Download PDF', FR: 'Télécharger PDF', DE: 'PDF herunterladen', ES: 'Descargar PDF', PT: 'Descarregar PDF'
  },
  openPrint: {
    IT: 'Apri stampa', EN: 'Open print', FR: "Ouvrir l'impression", DE: 'Druckansicht', ES: 'Abrir impresión', PT: 'Abrir impressão'
  },
  quote: {
    IT: 'Citazione', EN: 'Quote', FR: 'Citation', DE: 'Zitat', ES: 'Cita', PT: 'Citação'
  },
  word: {
    IT: 'Parola del Giorno', EN: 'Word of the Day', FR: 'Mot du Jour', DE: 'Wort des Tages', ES: 'Palabra del Día', PT: 'Palavra do Dia'
  },
  saintsTitle: {
    IT: 'I Santi di Oggi', EN: "Today's Saints", FR: "Les Saints d'Aujourd'hui", DE: 'Die heutigen Heiligen', ES: 'Los Santos de Hoy', PT: 'Os Santos de Hoje'
  },
  eventsTitle: {
    IT: 'Accadde Oggi', EN: 'This Day in History', FR: "Ce Jour-là dans l'Histoire", DE: 'Historische Ereignisse', ES: 'Un Día Como Hoy', PT: 'Aconteceu Hoje'
  },
  poemTitle: {
    IT: 'Poesia del giorno', EN: 'Poem of the Day', FR: 'Poème du Jour', DE: 'Gedicht des Tages', ES: 'Poema del Día', PT: 'Poema do Dia'
  },
  bibleTitle: {
    IT: 'Passaggio biblico', EN: 'Biblical passage', FR: 'Passage biblique', DE: 'Bibelpassage', ES: 'Pasaje bíblico', PT: 'Passagem bíblica'
  },
  musicTitle: {
    IT: 'Consiglio Musicale', EN: 'Musical Recommendation', FR: 'Recommandation Musicale', DE: 'Musikempfehlung', ES: 'Recomendación Musical', PT: 'Recomendação Musical'
  },
  artworkTitle: {
    IT: 'Opera del Giorno', EN: 'Artwork of the Day', FR: 'Œuvre du Jour', DE: 'Kunstwerk des Tages', ES: 'Obra del Día', PT: 'Obra do Dia'
  },
  artworkSelectorPrefix: {
    IT: 'Opera d’', EN: 'Artwork of d’', FR: 'Œuvre d’', DE: 'Kunstwerk d’', ES: 'Obra d’', PT: 'Obra d’'
  },
  artworkSelectorSuffix: {
    IT: ' · selezione del giorno', EN: ' · selection of the day', FR: ' · sélection du jour', DE: ' · Auswahl des Tages', ES: ' · selección del día', PT: ' · seleção do dia'
  },
  artworkSelectorSpring: {
    IT: 'Opera di primavera', EN: 'Spring artwork', FR: 'Œuvre de printemps', DE: 'Frühlingskunstwerk', ES: 'Obra de primavera', PT: 'Obra de primavera'
  },
  madeWithLove: {
    IT: 'Realizzato con amore da Antonello.',
    EN: 'Made with love by Antonello.',
    FR: 'Fait avec amour par Antonello.',
    DE: 'Mit Liebe gemacht von Antonello.',
    ES: 'Hecho con amor por Antonello.',
    PT: 'Feito com amor por Antonello.'
  },
  waxSealAria: {
    IT: 'Sigillo di ceralacca del giorno',
    EN: 'Daily wax seal',
    FR: 'Sceau de cire quotidien',
    DE: 'Tägliches Wachssiegel',
    ES: 'Sello de lacre diario',
    PT: 'Selo de lacre diário'
  },
  edition: {
    IT: 'edizione', EN: 'edition', FR: 'édition', DE: 'Edition', ES: 'edición', PT: 'edição'
  },
  of: {
    IT: 'di', EN: 'of', FR: 'de', DE: 'von', ES: 'de', PT: 'de'
  },
  number: {
    IT: 'n.', EN: 'no.', FR: 'n°', DE: 'Nr.', ES: 'n.º', PT: 'n.º'
  },
  footerText: {
    IT: 'Un foglio quotidiano di cultura, memoria e ascolto.',
    EN: 'A daily page of culture, memory, and listening.',
    FR: "Une page quotidienne de culture, de mémoire et d'écoute.",
    DE: 'Ein tägliches Blatt für Kultur, Erinnerung und Zuhören.',
    ES: 'Una página diaria de cultura, memoria y escucha.',
    PT: 'Uma página diária de cultura, memória e escuta.'
  },
  socialLinks: {
    IT: 'Collegamenti social', EN: 'Social links', FR: 'Liens réseaux sociaux', DE: 'Social Links', ES: 'Enlaces sociales', PT: 'Links de redes sociais'
  },
  support: {
    IT: 'Supporta', EN: 'Support', FR: 'Soutenir', DE: 'Unterstützen', ES: 'Apoyar', PT: 'Apoiar'
  },
  quoteCard: {
    IT: 'Citazione', EN: 'Quote', FR: 'Citation', DE: 'Zitat', ES: 'Cita', PT: 'Citação'
  },
  wordCard: {
    IT: 'Parola del giorno', EN: 'Word of the day', FR: 'Mot du jour', DE: 'Wort des Tages', ES: 'Palabra del día', PT: 'Palavra do dia'
  },
  saintsCard: {
    IT: 'I santi di oggi', EN: "Today's saints", FR: "Les saints d'aujourd'hui", DE: 'Die heutigen Heiligen', ES: 'Los santos de hoy', PT: 'Os saints de hoje'
  },
  artworkCard: {
    IT: 'Opera del giorno', EN: 'Artwork of the day', FR: 'Œuvre du jour', DE: 'Kunstwerk des Tages', ES: 'Obra del día', PT: 'Obra do dia'
  },
  eventsCard: {
    IT: 'Accadde oggi', EN: 'This day in history', FR: "Ce jour-là dans l'histoire", DE: 'Historische Ereignisse', ES: 'Un día como hoy', PT: 'Aconteceu hoje'
  },
  poemCard: {
    IT: 'Poesia del giorno', EN: 'Poem of the Day', FR: 'Poème du jour', DE: 'Gedicht des Tages', ES: 'Poema del día', PT: 'Poema do dia'
  },
  bibleCard: {
    IT: 'Passaggio biblico', EN: 'Biblical passage', FR: 'Passage biblique', DE: 'Bibelpassage', ES: 'Pasaje bíblico', PT: 'Passagem bíblica'
  },
  musicCard: {
    IT: 'Consiglio musicale', EN: 'Musical recommendation', FR: 'Recommandation musicale', DE: 'Musikempfehlung', ES: 'Recomendación musical', PT: 'Recomendação musical'
  },
  apodCard: {
    IT: 'Foto astronomica del giorno', EN: 'Astronomy picture of the day', FR: 'Photo astronomique du jour', DE: 'Astronomisches Bild des Tages', ES: 'Foto astronómica del día', PT: 'Foto astronómica do dia'
  },
  archiveTitle: {
    IT: 'Archivio', EN: 'Archive', FR: 'Archives', DE: 'Archiv', ES: 'Archivo', PT: 'Arquivo'
  }
};

function t(key: keyof typeof UI_TRANSLATIONS, lingua: LanguageCode): string {
  return UI_TRANSLATIONS[key]?.[lingua] ?? UI_TRANSLATIONS[key]?.['EN'] ?? '';
}

function getDisplayDate(data: DatiTaccuino, lingua: LanguageCode, dataSelezionata: string | null): string {
  if (lingua === 'IT') return data.data_odierna;
  const isoDate = data.data || dataSelezionata || new Date().toISOString().split('T')[0];
  return formatDataMultilingua(isoDate, lingua) || data.data_odierna;
}

function getMonthNumber(dataIso: string): number {
  const [, mese] = dataIso.split('-').map(Number);
  return mese;
}

function getArchiveMonthMood(dataIso: string, lingua: LanguageCode): string {
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

function groupByMonth(items: ArchivioItem[], lingua: LanguageCode): Record<string, ArchivioItem[]> {
  const mesiNome: Record<LanguageCode, string[]> = {
    IT: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
    EN: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    FR: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    DE: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    ES: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    PT: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  };
  const groups: Record<string, ArchivioItem[]> = {};
  for (const item of items) {
    const [anno, mese] = item.data.split('-');
    const mList = mesiNome[lingua] || mesiNome['EN'];
    const key = `${mList[parseInt(mese) - 1]} ${anno}`;
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

function getDayOfYearInfo(dataIso: string) {
  const date = new Date(`${dataIso}T12:00:00Z`);
  const year = date.getUTCFullYear();
  const start = new Date(`${year}-01-01T12:00:00Z`);
  const day = Math.floor((date.getTime() - start.getTime()) / 86_400_000) + 1;
  const total = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1 ? 366 : 365;
  return { day, total };
}

function formatExLibrisLedger(dataIso: string, lingua: LanguageCode): string {
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

function getArchiveEntryMark(item: ArchivioItem) {
  const { day } = getDayOfYearInfo(item.data);
  return {
    day: String(day).padStart(3, '0'),
    initials: getInitials(item.autore_giorno).slice(0, 2),
  };
}

type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
type MoonPhaseId = 'new' | 'waxing-crescent' | 'first-quarter' | 'waxing-gibbous' | 'full' | 'waning-gibbous' | 'last-quarter' | 'waning-crescent';

const VISITED_ARCHIVE_STORAGE_KEY = 'taccuino-visited-days-v1';
const SAVED_CARDS_STORAGE_KEY = 'taccuino-saved-cards-v1';
const DEFAULT_DAILY_ACCENT = '#b5956a';

function getSavedVisitedDates() {
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

function getSavedCards(): SavedCardItem[] {
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

function persistSavedCards(items: SavedCardItem[]) {
  try {
    window.localStorage.setItem(SAVED_CARDS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // The drawer remains usable for the current session when storage is unavailable.
  }
}

function sampleArtworkAccent(image: HTMLImageElement): { color: string; rgb: string } | null {
  try {
    const canvas = document.createElement('canvas');
    const size = 24;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    let red = 0;
    let green = 0;
    let blue = 0;
    let totalWeight = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const alpha = pixels[index + 3] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lightness = (max + min) / 510;
      if (alpha < 0.8 || lightness < 0.08 || lightness > 0.92) continue;
      const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
      const weight = alpha * (0.45 + saturation * 1.6) * (1 - Math.abs(lightness - 0.5));
      red += r * weight;
      green += g * weight;
      blue += b * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) return null;
    const raw = [red, green, blue].map((channel) => channel / totalWeight);
    const paper = [181, 149, 106];
    const muted = raw.map((channel, index) => Math.round(channel * 0.68 + paper[index] * 0.32));
    const [r, g, b] = muted;
    return {
      color: `#${muted.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`,
      rgb: `${r}, ${g}, ${b}`,
    };
  } catch {
    return null;
  }
}

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

function getRomeDateIso(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isSeasonId(value: string | null): value is SeasonId {
  return value === 'spring' || value === 'summer' || value === 'autumn' || value === 'winter';
}

function getAmbientLightStyle(now: Date, isDark: boolean): CSSProperties {
  const minute = now.getHours() * 60 + now.getMinutes();
  const stops = [
    { minute: 0, x: 47, y: 6, color: [193, 205, 218], alpha: 0.1 },
    { minute: 360, x: 24, y: 10, color: [255, 219, 168], alpha: 0.22 },
    { minute: 600, x: 39, y: 7, color: [255, 237, 199], alpha: 0.27 },
    { minute: 780, x: 52, y: 5, color: [255, 243, 211], alpha: 0.24 },
    { minute: 1020, x: 68, y: 9, color: [255, 220, 159], alpha: 0.24 },
    { minute: 1230, x: 78, y: 12, color: [235, 174, 125], alpha: 0.18 },
    { minute: 1320, x: 63, y: 8, color: [193, 205, 218], alpha: 0.11 },
    { minute: 1440, x: 47, y: 6, color: [193, 205, 218], alpha: 0.1 },
  ];
  const upperIndex = stops.findIndex((stop) => stop.minute >= minute);
  const upper = stops[Math.max(1, upperIndex)];
  const lower = stops[Math.max(0, upperIndex - 1)];
  const progress = Math.max(0, Math.min(1, (minute - lower.minute) / (upper.minute - lower.minute)));
  const interpolate = (from: number, to: number) => from + (to - from) * progress;
  const color = lower.color.map((channel, index) => Math.round(interpolate(channel, upper.color[index])));
  const alpha = interpolate(lower.alpha, upper.alpha) * (isDark ? 0.48 : 1);

  return {
    '--journal-light-x': `${interpolate(lower.x, upper.x).toFixed(2)}%`,
    '--journal-light-y': `${interpolate(lower.y, upper.y).toFixed(2)}%`,
    '--journal-light-color': isDark ? 'transparent' : `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha.toFixed(3)})`,
    '--journal-material-blend': isDark ? 'screen' : 'multiply',
    '--journal-material-opacity': isDark ? 0.56 : 0.9,
  } as CSSProperties;
}

function formatBookmarkDate(dataIso: string, lingua: LanguageCode): string {
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

function formatUtcDate(date: Date, lingua: LanguageCode): string {
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

function getNextAstronomicalSeasonLabel(dataIso: string, lingua: LanguageCode): { event: string; countdown: string } {
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
      PT: 'Solstício de inverno',
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

function SeasonalBookmark({
  dataIso,
  lingua,
  isDark,
}: {
  dataIso: string;
  lingua: LanguageCode;
  isDark: boolean;
}) {
  const ticketRef = useRef<HTMLSpanElement>(null);
  const [skyRegion, setSkyRegion] = useState<SkyRegion>('center');
  const [planetResult, setPlanetResult] = useState<{ key: string; planets: VisiblePlanet[]; daylight: string } | null>(null);
  const [dayPermalink, setDayPermalink] = useState('');
  const [exportingTicket, setExportingTicket] = useState(false);
  const [desktopTicketEnabled, setDesktopTicketEnabled] = useState(false);
  const [preparedTicketDownload, setPreparedTicketDownload] = useState<{ url: string; filename: string } | null>(null);
  const preparedTicketUrlRef = useRef<string | null>(null);
  const season = getSeason(dataIso);
  const seasonLabels: Record<SeasonId, Record<LanguageCode, string>> = {
    spring: { IT: 'Primavera', EN: 'Spring', FR: 'Printemps', DE: 'Frühling', ES: 'Primavera', PT: 'Primavera' },
    summer: { IT: 'Estate', EN: 'Summer', FR: 'Été', DE: 'Sommer', ES: 'Verano', PT: 'Verão' },
    autumn: { IT: 'Autunno', EN: 'Autumn', FR: 'Automne', DE: 'Herbst', ES: 'Otoño', PT: 'Outono' },
    winter: { IT: 'Inverno', EN: 'Winter', FR: 'Hiver', DE: 'Winter', ES: 'Invierno', PT: 'Inverno' },
  };
  const label = seasonLabels[season][lingua];
  const dateLabel = formatBookmarkDate(dataIso, lingua);
  const ticketSerial = dataIso.slice(2).replaceAll('-', '');
  const bookmarkMonth = getBookmarkMonth(dataIso);
  const moon = getMoonPhase(dataIso);
  const moonLabels: Record<MoonPhaseId, Record<LanguageCode, string>> = {
    new: { IT: 'Luna nuova', EN: 'New moon', FR: 'Nouvelle lune', DE: 'Neumond', ES: 'Luna nueva', PT: 'Lua nova' },
    'waxing-crescent': { IT: 'Luna crescente', EN: 'Waxing crescent', FR: 'Premier croissant', DE: 'Zunehmende Sichel', ES: 'Luna crescente', PT: 'Lua crescente' },
    'first-quarter': { IT: 'Primo quarto', EN: 'First quarter', FR: 'Premier quartier', DE: 'Erstes Viertel', ES: 'Cuarto creciente', PT: 'Quarto crescente' },
    'waxing-gibbous': { IT: 'Gibbosa crescente', EN: 'Waxing gibbous', FR: 'Lune gibbeuse croissante', DE: 'Zunehmender Dreiviertelmond', ES: 'Gibosa creciente', PT: 'Gibosa crescente' },
    full: { IT: 'Luna piena', EN: 'Full moon', FR: 'Pleine lune', DE: 'Vollmond', ES: 'Luna llena', PT: 'Lua cheia' },
    'waning-gibbous': { IT: 'Gibbosa calante', EN: 'Waning gibbous', FR: 'Lune gibbeuse décroissante', DE: 'Abnehmender Dreiviertelmond', ES: 'Gibosa menguante', PT: 'Gibosa minguante' },
    'last-quarter': { IT: 'Ultimo quarto', EN: 'Last quarter', FR: 'Dernier quartier', DE: 'Letztes Viertel', ES: 'Cuarto menguante', PT: 'Quarto minguante' },
    'waning-crescent': { IT: 'Luna calante', EN: 'Waning crescent', FR: 'Dernier croissant', DE: 'Abnehmende Sichel', ES: 'Luna menguante', PT: 'Lua minguante' },
  };
  const moonLabel = moonLabels[moon.phase][lingua];
  const nextFullMoonLabel = formatUtcDate(getNextFullMoonDate(dataIso), lingua);
  const fullMoonAriaLabel = t('fullMoon', lingua).replace(':', '');
  const almanacLabel = t('almanac', lingua);
  const moonRowLabel = t('moon', lingua);
  const fullMoonRowLabel = t('fullMoon', lingua);
  const daylightRowLabel = t('daylight', lingua);
  const planetsLabel = t('planets', lingua);
  const selectedRegion = SKY_REGION_OPTIONS.find((region) => region.id === skyRegion) ?? SKY_REGION_OPTIONS[1];
  const dayOfYear = getDayOfYearInfo(dataIso);
  const rawSeasonalArtwork = getSeasonalArtwork(season, dataIso);
  const seasonalArtwork = getLocalizedSeasonalArtwork(rawSeasonalArtwork, lingua);
  const artworkSourceUrl = seasonalArtwork?.sourceUrl || dayPermalink;
  const ticketArtworkImageUrl = seasonalArtwork?.imageUrl || '';
  const planetResultKey = `${dataIso}:${skyRegion}:${lingua}`;
  const visiblePlanets = planetResult?.key === planetResultKey ? planetResult.planets : null;
  const daylightValue = planetResult?.key === planetResultKey ? planetResult.daylight : null;
  const planetSummary = visiblePlanets?.length
    ? visiblePlanets.map((planet) => `${planet.name}, ${planet.direction}, ${planet.bestTime}`).join('. ')
    : t('noPlanets', lingua);

  useEffect(() => {
    const savedRegion = window.localStorage.getItem(SKY_REGION_STORAGE_KEY);
    if (savedRegion !== 'north' && savedRegion !== 'center' && savedRegion !== 'south') return;

    const frame = window.requestAnimationFrame(() => setSkyRegion(savedRegion));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      url.searchParams.set('data', dataIso);
      setDayPermalink(url.toString());
    });
    return () => window.cancelAnimationFrame(frame);
  }, [dataIso]);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1180px)');
    const updateDesktopTicket = () => setDesktopTicketEnabled(desktopQuery.matches);
    updateDesktopTicket();
    desktopQuery.addEventListener('change', updateDesktopTicket);

    return () => desktopQuery.removeEventListener('change', updateDesktopTicket);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void import('@/lib/visible-planets').then(({ getVisiblePlanets, getDaylightDuration }) => {
      if (!cancelled) {
        setPlanetResult({
          key: planetResultKey,
          planets: getVisiblePlanets(dataIso, skyRegion, lingua),
          daylight: getDaylightDuration(dataIso),
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [dataIso, lingua, planetResultKey, skyRegion]);

  const selectSkyRegion = (region: SkyRegion) => {
    setSkyRegion(region);
    window.localStorage.setItem(SKY_REGION_STORAGE_KEY, region);
  };

  const dismissPreparedTicket = useCallback(() => {
    if (preparedTicketUrlRef.current) URL.revokeObjectURL(preparedTicketUrlRef.current);
    preparedTicketUrlRef.current = null;
    setPreparedTicketDownload(null);
  }, []);

  useEffect(() => () => {
    if (preparedTicketUrlRef.current) URL.revokeObjectURL(preparedTicketUrlRef.current);
  }, []);

  const downloadTicket = useCallback(async () => {
    if (!ticketRef.current || exportingTicket) return;
    setExportingTicket(true);
    let exportFrame: HTMLElement | null = null;
    try {
      await document.fonts.ready;
      const { toBlob, toPng } = await import('html-to-image');

      const exportOptions = {
        width: 588,
        height: 226,
        pixelRatio: 4,
        backgroundColor: 'transparent',
        cacheBust: true,
        style: {
          inset: 'auto',
          position: 'relative',
          transform: 'none',
        },
      } as const;

      if (!window.matchMedia('(max-width: 1179px)').matches) {
        const dataUrl = await toPng(ticketRef.current, {
          ...exportOptions,
          filter: (node) => {
            const exportMarker = node.getAttribute?.('data-ticket-export-ignore');
            return exportMarker === null || exportMarker === undefined;
          },
        });
        const link = document.createElement('a');
        link.download = `effemeridi-${dataIso}-4x.png`;
        link.href = dataUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      const sourceBookmark = ticketRef.current.closest<HTMLElement>('.seasonal-bookmark');
      if (!sourceBookmark) throw new Error('Contenitore del biglietto non trovato.');

      const sourceFontFamily = window.getComputedStyle(sourceBookmark).fontFamily;
      const artworkDataUrl = ticketArtworkImageUrl
        ? await fetch(ticketArtworkImageUrl, { cache: 'force-cache' })
          .then((response) => {
            if (!response.ok) throw new Error(`Immagine del quadro non disponibile (${response.status}).`);
            return response.blob();
          })
          .then(blobToDataUrl)
        : null;

      exportFrame = sourceBookmark.cloneNode(true) as HTMLElement;
      exportFrame.classList.add(garamond.className);
      exportFrame.removeAttribute('aria-hidden');
      exportFrame.removeAttribute('inert');
      exportFrame.querySelectorAll('[data-ticket-export-ignore]').forEach((node) => node.remove());
      if (artworkDataUrl) {
        const artworkImage = exportFrame.querySelector<SVGImageElement>('.seasonal-bookmark-artwork image');
        artworkImage?.setAttribute('href', artworkDataUrl);
        artworkImage?.setAttributeNS('http://www.w3.org/1999/xlink', 'href', artworkDataUrl);
      }
      Object.assign(exportFrame.style, {
        filter: 'none',
        fontFamily: sourceFontFamily,
        left: '0',
        opacity: '1',
        pointerEvents: 'none',
        position: 'fixed',
        right: 'auto',
        top: '0',
        transform: 'none',
        transition: 'none',
        zIndex: '-1',
      });
      document.body.appendChild(exportFrame);

      const imageBlob = await toBlob(exportFrame, exportOptions);
      if (!imageBlob) throw new Error('Impossibile creare il file PNG del biglietto.');

      const filename = `effemeridi-${dataIso}-4x.png`;
      const objectUrl = URL.createObjectURL(imageBlob);
      if (isMobileChromiumBrowser()) {
        if (preparedTicketUrlRef.current) URL.revokeObjectURL(preparedTicketUrlRef.current);
        preparedTicketUrlRef.current = objectUrl;
        setPreparedTicketDownload({ url: objectUrl, filename });
      } else {
        const link = document.createElement('a');
        link.download = filename;
        link.href = objectUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      }
    } catch (error) {
      console.error('Errore durante l’esportazione delle effemeridi:', error);
    } finally {
      exportFrame?.remove();
      setExportingTicket(false);
    }
  }, [dataIso, exportingTicket, ticketArtworkImageUrl]);

  useEffect(() => {
    const handleTicketDownload = () => void downloadTicket();
    window.addEventListener(TICKET_DOWNLOAD_EVENT, handleTicketDownload);
    return () => window.removeEventListener(TICKET_DOWNLOAD_EVENT, handleTicketDownload);
  }, [downloadTicket]);

  const artworkQrLabel = seasonalArtwork?.linkKind === 'source'
    ? (lingua === 'IT' ? 'Apri la fonte' : 'View source')
    : (lingua === 'IT' ? 'Apri al museo' : 'View at museum');

  return (
    <>
      <aside
      id="effemeridi"
      className={`seasonal-bookmark season-${season} month-${bookmarkMonth} ${seasonalArtwork ? `artwork-${seasonalArtwork.id} artwork-tone-${seasonalArtwork.tone}` : ''} ${isDark ? 'is-dark' : ''}`}
      aria-label={`${dateLabel}, ${label}. ${moonLabel}, ${moon.illumination}%. ${fullMoonAriaLabel}: ${nextFullMoonLabel}. ${daylightRowLabel}: ${daylightValue || '…'}. ${planetsLabel}: ${planetSummary}`}
      aria-hidden={!desktopTicketEnabled}
      inert={!desktopTicketEnabled ? true : undefined}
      tabIndex={desktopTicketEnabled ? 0 : -1}
    >
      <span ref={ticketRef} className="seasonal-bookmark-ticket">
        <span className="seasonal-bookmark-stub" aria-hidden="true">
          <span className="seasonal-bookmark-label">{almanacLabel}</span>
          <span className="seasonal-bookmark-motif"><MoonDoodle phase={moon.phase} /></span>
          <span className="seasonal-bookmark-serial">No. {ticketSerial}</span>
        </span>
        <span className="seasonal-bookmark-stitch" aria-hidden="true" />
        <span className={`seasonal-bookmark-copy ${ticketArtworkImageUrl ? 'has-artwork' : ''}`}>
          {ticketArtworkImageUrl ? (
            <svg
              className="seasonal-bookmark-artwork"
              viewBox="0 0 404 226"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <filter id="ticket-ink-edge" x="-12%" y="-18%" width="124%" height="136%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.018 0.055" numOctaves="4" seed="17" result="paperNoise" />
                  <feDisplacementMap in="SourceGraphic" in2="paperNoise" scale="13" xChannelSelector="R" yChannelSelector="B" result="roughEdge" />
                  <feGaussianBlur in="roughEdge" stdDeviation="1.4" />
                </filter>
                <mask id="ticket-ink-mask">
                  <rect x="7" y="6" width="390" height="214" rx="5" fill="white" filter="url(#ticket-ink-edge)" />
                </mask>
              </defs>
              <image
                href={ticketArtworkImageUrl}
                width="404"
                height="226"
                preserveAspectRatio={`${seasonalArtwork?.ticketAlignment ?? 'xMidYMid'} slice`}
                mask="url(#ticket-ink-mask)"
              />
            </svg>
          ) : null}
          {ticketArtworkImageUrl ? <span className="seasonal-bookmark-artwork-wash" aria-hidden="true" /> : null}
          <span className="seasonal-bookmark-heading">
            <strong className="seasonal-bookmark-date">{dateLabel}</strong>
            <span className="seasonal-bookmark-season">{label}</span>
          </span>
          <span className="seasonal-bookmark-astronomy">
            <span><em>{moonRowLabel}</em><strong>{moonLabel} · {moon.illumination}%</strong></span>
            <span><em>{fullMoonRowLabel}</em><strong>{nextFullMoonLabel}</strong></span>
            <span><em>{daylightRowLabel}</em><strong>{daylightValue || (lingua === 'IT' ? 'Calcolo…' : 'Calculating…')}</strong></span>
          </span>
          <span className="seasonal-bookmark-planets">
            <span className="seasonal-bookmark-planets-heading">
              <strong>{planetsLabel}</strong>
            </span>
            <span className="seasonal-bookmark-planet-list" aria-live="polite">
              {visiblePlanets === null ? (
                <em>{t('readingSky', lingua)}</em>
              ) : visiblePlanets.length > 0 ? visiblePlanets.map((planet) => (
                <span key={planet.body} className="seasonal-bookmark-planet-row">
                  <strong>{planet.name}</strong>
                  <span>{planet.direction}</span>
                  <span>{planet.bestTime}</span>
                </span>
              )) : (
                <em>{t('noPlanets', lingua)}</em>
              )}
            </span>
          </span>
          <button
            type="button"
            className="seasonal-bookmark-download"
            data-ticket-export-ignore="true"
            disabled={exportingTicket}
            aria-label={t('downloadTicketAria', lingua)}
            title={t('downloadTicket', lingua)}
            onClick={() => void downloadTicket()}
          >
            {exportingTicket
              ? <Loader2 aria-hidden="true" className="animate-spin" strokeWidth={1.7} />
              : <FileDown aria-hidden="true" strokeWidth={1.7} />}
            <span>{t('download', lingua)}</span>
          </button>
        </span>
        <span className="seasonal-bookmark-stitch is-trailing" aria-hidden="true" />
        <span className={`seasonal-bookmark-tail ${seasonalArtwork ? 'has-artwork' : ''}`}>
          {artworkSourceUrl ? (
            <a
              className="seasonal-bookmark-qr-link"
              href={artworkSourceUrl}
              target={seasonalArtwork ? '_blank' : undefined}
              rel={seasonalArtwork ? 'noopener noreferrer' : undefined}
              aria-label={seasonalArtwork
                ? seasonalArtwork.linkKind === 'museum'
                  ? (lingua === 'IT' ? `Apri ${seasonalArtwork.title} sul sito del museo` : `Open ${seasonalArtwork.title} on the museum website`)
                  : (lingua === 'IT' ? `Apri la fonte di ${seasonalArtwork.title}` : `Open the source for ${seasonalArtwork.title}`)
                : (lingua === 'IT' ? `Apri il giorno ${dateLabel}` : `Open ${dateLabel}`)}
              title={seasonalArtwork ? artworkQrLabel : (lingua === 'IT' ? 'Apri il permalink di questo giorno' : 'Open this day’s permalink')}
            >
              <span className="seasonal-bookmark-qr">
                <QRCodeSVG
                  value={artworkSourceUrl}
                  size={68}
                  level="H"
                  marginSize={3}
                  bgColor="transparent"
                  fgColor="currentColor"
                  title={seasonalArtwork
                    ? seasonalArtwork.linkKind === 'museum'
                      ? (lingua === 'IT' ? `QR della scheda museale di ${seasonalArtwork.title}` : `Museum page QR for ${seasonalArtwork.title}`)
                      : (lingua === 'IT' ? `QR della fonte di ${seasonalArtwork.title}` : `Source QR for ${seasonalArtwork.title}`)
                    : (lingua === 'IT' ? `QR del ${dateLabel}` : `${dateLabel} QR code`)}
                />
                <span className="seasonal-bookmark-qr-mark" aria-hidden="true">
                  <MoonDoodle phase={moon.phase} />
                </span>
              </span>
              <small>{seasonalArtwork ? artworkQrLabel : (lingua === 'IT' ? 'Apri il giorno' : 'Open the day')}</small>
            </a>
          ) : null}
          {seasonalArtwork ? (
            <span className="seasonal-bookmark-artwork-caption">
              <strong title={seasonalArtwork.title}>{seasonalArtwork.title}</strong>
              <span>{seasonalArtwork.artist} · {seasonalArtwork.year}</span>
              <b>{lingua === 'IT'
                ? `Opera ${season === 'spring' ? 'di primavera' : `d’${label.toLocaleLowerCase('it-IT')}`} · selezione del giorno`
                : `${label} artwork · daily selection`}</b>
              <em>{seasonalArtwork.medium} · {seasonalArtwork.collection}</em>
              <small>{lingua === 'IT' ? 'Edizione' : 'Edition'} {dayOfYear.day}/{dayOfYear.total}</small>
            </span>
          ) : null}
          {!seasonalArtwork ? (
            <span className="seasonal-bookmark-tail-ledger" aria-hidden="true">
              <span><em>{lingua === 'IT' ? 'Foglio' : 'Sheet'}</em><strong>{dayOfYear.day}/{dayOfYear.total}</strong></span>
              <span><em>{lingua === 'IT' ? 'Valido' : 'Valid'}</em><strong>{lingua === 'IT' ? '1 giorno' : '1 day'}</strong></span>
            </span>
          ) : null}
        </span>
      </span>
      </aside>
      {preparedTicketDownload ? createPortal(
        <div className={`ticket-download-ready ${isDark ? 'is-dark' : ''}`} role="dialog" aria-modal="true" aria-labelledby="ticket-download-ready-title">
          <div className="ticket-download-ready-card">
            <button
              type="button"
              className="ticket-download-ready-close"
              onClick={dismissPreparedTicket}
              aria-label={lingua === 'IT' ? 'Chiudi' : 'Close'}
            >
              <X aria-hidden="true" />
            </button>
            <FileDown className="ticket-download-ready-icon" aria-hidden="true" />
            <strong id="ticket-download-ready-title">
              {lingua === 'IT' ? 'Il biglietto è pronto' : 'Your ticket is ready'}
            </strong>
            <span>
              {lingua === 'IT' ? 'Tocca qui sotto per salvarlo in alta risoluzione.' : 'Tap below to save it in high resolution.'}
            </span>
            <a
              href={preparedTicketDownload.url}
              download={preparedTicketDownload.filename}
              onClick={() => window.setTimeout(dismissPreparedTicket, 2_000)}
            >
              {lingua === 'IT' ? 'Salva il biglietto' : 'Save ticket'}
            </a>
          </div>
        </div>,
        document.body
      ) : null}
    </>
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
  lingua: LanguageCode;
  isDark: boolean;
  dataIso: string;
  initials: string;
  onClose: () => void;
}) {
  const label = {
    title: t('passportTitle', lingua),
    subtitle: t('passportSubtitle', lingua),
    download: t('downloadPdf', lingua),
    print: t('openPrint', lingua),
    close: t('close', lingua),
    author: t('authorOfTheDay', lingua),
    quote: t('quote', lingua),
    word: t('word', lingua),
    saints: t('saintsTitle', lingua),
    events: t('eventsTitle', lingua),
    poem: t('poemTitle', lingua),
    bible: t('bibleTitle', lingua),
    music: t('musicTitle', lingua),
    artwork: t('artworkTitle', lingua),
    stamp: t('visitedStamp', lingua),
    number: t('number', lingua),
    foldHint: t('foldHint', lingua),
    authorPhoto: t('authorPhoto', lingua),
    artworkImage: t('artworkImage', lingua),
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
        <article className="daily-passport-document" aria-label={`${label.title}: ${getDisplayDate(data, lingua, dataIso)}`}>
          <div className="daily-passport-paper-grain" aria-hidden="true" />
          <div className="daily-passport-folds" aria-hidden="true">
            <span /><span /><span /><span /><span />
          </div>

          <section className="daily-passport-cover-panel">
            <p className="daily-passport-small-label">{label.number} {passportCode}</p>
            <h3>{label.title}</h3>
            <p className="daily-passport-date">{getDisplayDate(data, lingua, dataIso)}</p>
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
                <img draggable={false} src={data.foto_autore_url} alt={`${label.authorPhoto}: ${data.autore_giorno}`} {...lazyImageProps} />
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
                    <img draggable={false} src={opera.immagine_url || opera.immagine_url_hd} alt={`${label.artworkImage}: ${opera.titolo}`} {...lazyImageProps} />
                  </figure>
                ) : null}
                <h4>{opera.titolo}</h4>
                <p className="daily-passport-source">{opera.artista}{opera.anno ? ` · ${opera.anno}` : ''}</p>
                <p>{[
                  lingua === 'IT' ? opera.medium_it || opera.medium : opera.medium,
                  lingua === 'IT' ? opera.dipartimento_it || opera.dipartimento : opera.dipartimento,
                  opera.museo,
                ].filter(Boolean).join(' · ')}</p>
              </section>
            )}

            <footer className="daily-passport-signature">
              <strong className={`${masterSignature.className} notebook-wordmark`}>{t('dayTitle', lingua)}</strong>
              <span>{t('madeWithLove', lingua)}</span>
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
  { id: 'apod', icon: Telescope, labelIT: 'Foto astronomica', labelEN: 'Astronomy picture', optional: true },
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
            draggable={false}
            className="loading-notebook-sheet"
            src="/images/loading-paper-torn.png"
            alt=""
            aria-hidden="true"
            {...eagerImageProps}
          />
          <div className="loading-notebook-content">
            <h1 className={`${masterSignature.className} notebook-wordmark`}>Il giorno da custodire</h1>
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
  hasApod,
  activeSection,
  readingComplete,
}: {
  isDark: boolean;
  lingua: LanguageCode;
  hasOpera: boolean;
  hasApod: boolean;
  activeSection: string;
  readingComplete: boolean;
}) {
  const visibleItems = notebookNavItems.filter((item) => {
    if (item.id === 'opera') return hasOpera;
    if (item.id === 'apod') return hasApod;
    return true;
  });

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
  hasApod,
  activeSection,
  open,
  hidden,
  onToggle,
  onNavigate,
}: {
  isDark: boolean;
  lingua: LanguageCode;
  hasOpera: boolean;
  hasApod: boolean;
  activeSection: string;
  open: boolean;
  hidden: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const visibleItems = notebookNavItems.filter((item) => {
    if (item.id === 'opera') return hasOpera;
    if (item.id === 'apod') return hasApod;
    return true;
  });
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

interface ScrollRevealBadgeProps {
  className: string;
  children: React.ReactNode;
  resetTrigger?: any;
  as?: 'div' | 'h3';
}

function ScrollRevealBadge({
  className,
  children,
  resetTrigger,
  as: Component = 'div',
}: ScrollRevealBadgeProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const ref = useRef<any>(null);

  useEffect(() => {
    setIsRevealed(false);
    const el = ref.current;
    if (!el) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsRevealed(true);
      return;
    }

    if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.unobserve(el);
        }
      },
      {
        rootMargin: '0px 0px -40px 0px',
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [resetTrigger]);

  return (
    <Component ref={ref} className={`${className} ${isRevealed ? 'is-revealed' : ''}`}>
      {children}
    </Component>
  );
}

interface LanguageConfig {
  code: LanguageCode;
  name: string;
  flag: React.ReactNode;
}

const LANGUAGES: LanguageConfig[] = [
  {
    code: 'IT',
    name: 'Italiano',
    flag: (
      <svg viewBox="0 0 30 20" className="w-5 h-3.5 select-none opacity-85 saturate-[0.75] contrast-[0.9] rounded-[2px] inline-block shrink-0">
        <rect width="10" height="20" fill="#4B634E" />
        <rect x="10" width="10" height="20" fill="#FBF8F2" />
        <rect x="20" width="10" height="20" fill="#AD4A3F" />
      </svg>
    ),
  },
  {
    code: 'EN',
    name: 'English',
    flag: (
      <svg viewBox="0 0 30 20" className="w-5 h-3.5 select-none opacity-85 saturate-[0.75] contrast-[0.9] rounded-[2px] inline-block shrink-0">
        <rect width="30" height="20" fill="#2B3A54" />
        <path d="M0,0 L30,20 M30,0 L0,20" stroke="#FBF8F2" strokeWidth="3" />
        <path d="M0,0 L30,20 M30,0 L0,20" stroke="#AD4A3F" strokeWidth="1" />
        <path d="M15,0 L15,20 M0,10 L30,10" stroke="#FBF8F2" strokeWidth="5" />
        <path d="M15,0 L15,20 M0,10 L30,10" stroke="#AD4A3F" strokeWidth="3" />
      </svg>
    ),
  },
  {
    code: 'FR',
    name: 'Français',
    flag: (
      <svg viewBox="0 0 30 20" className="w-5 h-3.5 select-none opacity-85 saturate-[0.75] contrast-[0.9] rounded-[2px] inline-block shrink-0">
        <rect width="10" height="20" fill="#2B3A54" />
        <rect x="10" width="10" height="20" fill="#FBF8F2" />
        <rect x="20" width="10" height="20" fill="#AD4A3F" />
      </svg>
    ),
  },
  {
    code: 'DE',
    name: 'Deutsch',
    flag: (
      <svg viewBox="0 0 30 20" className="w-5 h-3.5 select-none opacity-85 saturate-[0.75] contrast-[0.9] rounded-[2px] inline-block shrink-0">
        <rect width="30" height="6.6" fill="#2A2A2A" />
        <rect y="6.6" width="30" height="6.8" fill="#AD4A3F" />
        <rect y="13.4" width="30" height="6.6" fill="#C99B49" />
      </svg>
    ),
  },
  {
    code: 'ES',
    name: 'Español',
    flag: (
      <svg viewBox="0 0 30 20" className="w-5 h-3.5 select-none opacity-85 saturate-[0.75] contrast-[0.9] rounded-[2px] inline-block shrink-0">
        <rect width="30" height="5" fill="#AD4A3F" />
        <rect y="5" width="30" height="10" fill="#C99B49" />
        <rect y="15" width="30" height="5" fill="#AD4A3F" />
        <circle cx="8" cy="10" r="1.8" fill="#AD4A3F" />
      </svg>
    ),
  },
  {
    code: 'PT',
    name: 'Português',
    flag: (
      <svg viewBox="0 0 30 20" className="w-5 h-3.5 select-none opacity-85 saturate-[0.75] contrast-[0.9] rounded-[2px] inline-block shrink-0">
        <rect width="12" height="20" fill="#4B634E" />
        <rect x="12" width="18" height="20" fill="#AD4A3F" />
        <circle cx="12" cy="10" r="2" fill="#C99B49" />
      </svg>
    ),
  },
];

function LanguageSelector({
  lingua,
  onChange,
  disabled,
  isDark,
}: {
  lingua: LanguageCode;
  onChange: (code: LanguageCode) => void;
  disabled: boolean;
  isDark: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isOpen]);

  const activeLang = LANGUAGES.find((l) => l.code === lingua) || LANGUAGES[0];

  return (
    <div ref={containerRef} className="relative inline-block text-left select-none">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`top-control-button p-2 rounded-full border backdrop-blur-sm transition-colors ${
          isOpen
            ? 'border-[#DE6B58] text-[#DE6B58]'
            : isDark
              ? 'border-white/10 text-[#A0A0A0] bg-[#1E1E1E]/55 hover:text-[#DE6B58] hover:border-[#DE6B58]/70'
              : 'border-[#EBE5DB] text-[#8A817C] bg-[#F4F0E6]/60 hover:text-[#DE6B58] hover:border-[#DE6B58]'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Seleziona lingua / Select language"
      >
        <Languages className="w-5 h-5" />
      </button>

      <div
        className={`archive-popover ${isOpen ? 'is-open' : ''} ${
          isDark ? 'is-dark' : ''
        } absolute right-0 mt-2 w-44 z-50 overflow-hidden flex flex-col`}
        style={{
          transformOrigin: 'top right',
        }}
        role="listbox"
      >
        <div className="p-2 flex flex-col gap-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                onChange(lang.code);
                setIsOpen(false);
              }}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold transition-all duration-200 text-left rounded-lg ${
                lingua === lang.code
                  ? 'text-[#DE6B58] font-bold bg-[#DE6B58]/5'
                  : isDark
                    ? 'text-[#bbb2ad] hover:bg-white/5 hover:text-white hover:translate-x-0.5'
                    : 'text-[#746b66] hover:bg-black/5 hover:text-black hover:translate-x-0.5'
              }`}
              role="option"
              aria-selected={lingua === lang.code}
            >
              {lang.flag}
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<DatiTaccuino | null>(null);
  const [dataOriginale, setDataOriginale] = useState<DatiTaccuino | null>(null);
  const [translationsCache, setTranslationsCache] = useState<Record<string, DatiTaccuino>>({});
  const [opera, setOpera] = useState<OperaGiorno | null>(null);
  const [apod, setApod] = useState<ApodData | null>(null);
  const [apodLoading, setApodLoading] = useState(false);
  const [isApodExpanded, setIsApodExpanded] = useState(false);
  const [saintArtwork, setSaintArtwork] = useState<SaintArtworkResult | null>(null);
  const [musicCover, setMusicCover] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [savedDrawerOpen, setSavedDrawerOpen] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCardItem[]>(getSavedCards);
  const [dailyAccent, setDailyAccent] = useState({ color: DEFAULT_DAILY_ACCENT, rgb: '181, 149, 106' });
  const [popoverPos, setPopoverPos] = useState({ top: 0, right: 16 });
  const [savedDrawerPos, setSavedDrawerPos] = useState({ top: 0, right: 16 });
  const [archivio, setArchivio] = useState<ArchivioItem[]>([]);
  const [visitedArchiveDates, setVisitedArchiveDates] = useState<Set<string>>(getSavedVisitedDates);
  const [archivioQuery, setArchivioQuery] = useState('');
  const [dataSelezionata, setDataSelezionata] = useState<string | null>(null);
  const [lingua, setLingua] = useState<LanguageCode>('IT');
  const [traducendo, setTraducendo] = useState(false);
  const [erroreTraduzioni, setErroreTraduzioni] = useState<string | null>(null);
  const [archivioHasScroll, setArchivioHasScroll] = useState(false);
  const [archivioAtBottom, setArchivioAtBottom] = useState(false);
  const [showExportCard, setShowExportCard] = useState(false);
  const [showDailyPassport, setShowDailyPassport] = useState(false);
  const [isTurningPage, setIsTurningPage] = useState(false);
  const [pageTurnPhase, setPageTurnPhase] = useState<'idle' | 'covering' | 'revealing'>('idle');
  const [contentKey, setContentKey] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [activeSection, setActiveSection] = useState('autore');
  const [readingComplete, setReadingComplete] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileReadingVisible, setMobileReadingVisible] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [footerInView, setFooterInView] = useState(false);
  const [ambientLightStyle, setAmbientLightStyle] = useState<CSSProperties>(() => getAmbientLightStyle(new Date(), false));
  const popoverRef = useRef<HTMLDivElement>(null);
  const savedDrawerRef = useRef<HTMLDivElement>(null);
  const desktopArchiveTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileArchiveTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopSavedTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileSavedTriggerRef = useRef<HTMLButtonElement>(null);
  const lastArchiveTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileToolsRef = useRef<HTMLDivElement>(null);
  const mobileToolsTriggerRef = useRef<HTMLButtonElement>(null);
  const archivioScrollRef = useRef<HTMLDivElement>(null);
  const archiveSearchRef = useRef<HTMLInputElement>(null);
  const wasPopoverOpenRef = useRef(false);
  const footerRef = useRef<HTMLElement>(null);

  const oggi = getRomeDateIso();

  const rememberVisitedDate = useCallback((dataIso: string) => {
    setVisitedArchiveDates((current) => {
      if (current.has(dataIso)) return current;
      const next = new Set(current);
      next.add(dataIso);
      window.localStorage.setItem(VISITED_ARCHIVE_STORAGE_KEY, JSON.stringify(Array.from(next).slice(-120)));
      return next;
    });
  }, []);

  const toggleSavedCard = useCallback((item: Omit<SavedCardItem, 'id' | 'savedAt'>) => {
    const id = `${item.date}:${item.section}`;
    setSavedCards((current) => {
      const exists = current.some((saved) => saved.id === id);
      const next = exists
        ? current.filter((saved) => saved.id !== id)
        : [{ ...item, id, savedAt: Date.now() }, ...current].slice(0, 80);
      persistSavedCards(next);
      return next;
    });
  }, []);

  const removeSavedCard = useCallback((id: string) => {
    setSavedCards((current) => {
      const next = current.filter((saved) => saved.id !== id);
      persistSavedCards(next);
      return next;
    });
  }, []);

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
      const clickedSavedTrigger =
        desktopSavedTriggerRef.current?.contains(target) ||
        mobileSavedTriggerRef.current?.contains(target);

      if (popoverRef.current && !popoverRef.current.contains(target) && !clickedArchiveTrigger) {
        setPopoverOpen(false);
      }
      if (savedDrawerRef.current && !savedDrawerRef.current.contains(target) && !clickedSavedTrigger) {
        setSavedDrawerOpen(false);
      }
      if (mobileToolsRef.current && !mobileToolsRef.current.contains(target)) {
        setMobileToolsOpen(false);
      }
    }
    if (popoverOpen || savedDrawerOpen || mobileToolsOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverOpen, savedDrawerOpen, mobileToolsOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPopoverOpen(false);
        setSavedDrawerOpen(false);
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
      .filter((item) => {
        if (item.id === 'opera') return Boolean(opera);
        if (item.id === 'apod') return Boolean(apod);
        return true;
      })
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
  }, [data, opera, apod]);

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
      const mobileReadingThreshold = Math.max(220, window.innerHeight * 0.3);

      document.documentElement.style.setProperty('--reading-progress-scale', `${nextProgress / 100}`);
      setReadingComplete((current) => current === nextComplete ? current : nextComplete);
      setMobileReadingVisible((current) => {
        const nextVisible = window.scrollY > mobileReadingThreshold;
        return current === nextVisible ? current : nextVisible;
      });
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

  useEffect(() => {
    const updateAmbientLight = () => setAmbientLightStyle(getAmbientLightStyle(new Date(), isDark));
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') updateAmbientLight();
    };

    updateAmbientLight();
    const interval = window.setInterval(updateAmbientLight, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isDark]);

  
  const caricaGiorno = (dataIso: string | null, usePageTurn = false, targetSection = 'autore') => {
    if (usePageTurn) {
      setIsTurningPage(true);
      setPageTurnPhase('covering');
    } else {
      setLoading(true);
    }
    setError(null); setPopoverOpen(false); setSavedDrawerOpen(false); setLingua('IT'); setTranslationsCache({}); setErroreTraduzioni(null); setShowExportCard(false); setShowDailyPassport(false); setSaintArtwork(null); setMusicCover(null); setApod(null); setApodLoading(false); setIsApodExpanded(false); setDailyAccent({ color: DEFAULT_DAILY_ACCENT, rgb: '181, 149, 106' });
    document.documentElement.style.setProperty('--reading-progress-scale', '0'); setReadingComplete(false);
    const url = dataIso ? `/api/oggi?data=${dataIso}` : '/api/oggi';
    const minimumTurnDelay = usePageTurn
      ? new Promise(resolve => window.setTimeout(resolve, 760))
      : Promise.resolve();
    Promise.all([
      fetch(url).then(res => { if (!res.ok) throw new Error('Nessun contenuto per questa data.'); return res.json(); }),
      fetch(dataIso ? `/api/opera?data=${encodeURIComponent(dataIso)}` : '/api/opera').then(res => {
        if (res.status === 204) return null;
        return res.ok ? res.json() : null;
      }).catch(() => null),
      minimumTurnDelay,
    ])
      .then(([dati, operaData]) => {
        setData(dati); setDataOriginale(dati); setOpera(operaData); setDataSelezionata(dataIso); setLoading(false); setActiveSection(targetSection); setContentKey(k => k + 1);
        const nextUrl = new URL(window.location.href);
        if (dataIso) nextUrl.searchParams.set('data', dataIso);
        else nextUrl.searchParams.delete('data');
        window.history.replaceState(window.history.state, '', nextUrl);

        // Caricamento asincrono in background dell'APOD
        setApodLoading(true);
        fetch(dataIso ? `/api/apod?data=${encodeURIComponent(dataIso)}` : '/api/apod')
          .then((res) => (res.status === 204 ? null : res.ok ? res.json() : null))
          .then((apodData) => setApod(apodData))
          .catch(() => setApod(null))
          .finally(() => setApodLoading(false));
        rememberVisitedDate(dataIso ?? oggi);
        if (targetSection === 'autore') {
          window.scrollTo({ top: 0, behavior: usePageTurn ? 'auto' : 'smooth' });
        } else {
          window.setTimeout(() => {
            document.getElementById(targetSection)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, usePageTurn ? 880 : 120);
        }
        if (usePageTurn) {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => setPageTurnPhase('revealing'));
          });
          window.setTimeout(() => {
            setIsTurningPage(false);
            setPageTurnPhase('idle');
          }, 820);
        } else {
          setIsTurningPage(false);
          setPageTurnPhase('idle');
        }
        const singleSaintName = dati.santi.length === 1 ? dati.santi[0]?.nome?.trim() : '';
        if (singleSaintName) {
          runWhenIdle(() => {
            fetch(`/api/santo-immagine?nome=${encodeURIComponent(singleSaintName)}`)
              .then((response) => {
                if (response.status === 204) return null;
                return response.ok ? response.json() as Promise<SaintArtwork> : null;
              })
              .then((artwork) => {
                if (artwork) setSaintArtwork({ ...artwork, saintName: singleSaintName });
              })
              .catch(() => setSaintArtwork(null));
          });
        }
        runWhenIdle(() => {
          const coverParams = new URLSearchParams({
            title: dati.musica.brano,
            artist: dati.musica.autore,
          });
          if (dati.musica.chiave_ricerca) {
            coverParams.set('query', dati.musica.chiave_ricerca);
          }
          fetch(`/api/music-cover?${coverParams.toString()}`)
            .then((response) => response.status === 204 ? null : response.ok ? response.json() : null)
            .then((cover) => setMusicCover(proxiedImageUrl(cover?.imageUrl)))
            .catch(() => setMusicCover(null));
        });
      })
      .catch(err => {
        setError(err.message); setLoading(false); setIsTurningPage(false); setPageTurnPhase('idle');
      });
  };

  const cambiaLingua = useCallback(async (targetLang: LanguageCode) => {
    if (targetLang === 'IT') {
      setLingua('IT');
      setData(dataOriginale);
      return;
    }
    if (!dataOriginale) return;
    const dateKey = dataOriginale.data || dataSelezionata || 'oggi';
    const cacheKey = `${targetLang}:${dateKey}`;
    const cached = translationsCache[cacheKey];
    if (cached) {
      setLingua(targetLang);
      setData(cached);
      return;
    }
    setTraducendo(true);
    setErroreTraduzioni(null);
    try {
      const testi = estraiTesti(dataOriginale);
      const res = await fetch('/api/traduci', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testi, targetLang }) });
      if (!res.ok) throw new Error('Errore nella traduzione.');
      const { traduzioni } = await res.json();
      const tradotta = ricostruisciDati(dataOriginale, traduzioni);
      setTranslationsCache(prev => ({ ...prev, [cacheKey]: tradotta }));
      setData(tradotta);
      setLingua(targetLang);
    } catch (e: unknown) {
      setErroreTraduzioni(e instanceof Error ? e.message : 'Traduzione non disponibile.');
    } finally { setTraducendo(false); }
  }, [dataOriginale, dataSelezionata, translationsCache]);

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
      const requestedDate = new URLSearchParams(window.location.search).get('data');
      const initialDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
        ? requestedDate
        : null;
      caricaGiorno(initialDate);
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

  const toggleSavedDrawer = (trigger: HTMLButtonElement, returnFocus = trigger) => {
    setPopoverOpen(false);
    if (!savedDrawerOpen) {
      const rect = trigger.getBoundingClientRect();
      setSavedDrawerPos({
        top: rect.bottom + 10,
        right: window.innerWidth - rect.right,
      });
    }
    setSavedDrawerOpen((current) => !current);
  };

  const themeClasses = {
    bg: isDark ? 'bg-[#171614]' : 'bg-[#F8F6F0]',
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
  const groupedArchivio = groupByMonth(archivioFiltrato, lingua);
  const dataExLibris = dataSelezionata ?? oggi;
  const operaSourceUrl = opera?.source_url || opera?.met_url || '';
  const operaImageUrl = opera?.immagine_url || opera?.immagine_url_hd || '';
  const operaImageHdUrl = opera?.immagine_url_hd || opera?.immagine_url || '';
  const operaImageCandidates = uniqueImageCandidates(
    proxiedImageUrl(operaImageUrl),
    proxiedImageUrl(operaImageHdUrl),
    operaImageUrl,
    operaImageHdUrl,
  );
  const operaMedium = lingua === 'IT' ? opera?.medium_it || opera?.medium : opera?.medium;
  const operaDepartment = lingua === 'IT'
    ? opera?.dipartimento_it || opera?.dipartimento
    : opera?.dipartimento;
  const inizialiExLibris = data ? getInitials(data.autore_giorno) : 'TDG';
  const { day: dayOfYear, total: totalDays } = getDayOfYearInfo(dataExLibris);
  const sealColors = [
    'blu', 'rosso', 'oro', 'verde-scuro', 'salvia', 'verde-chiaro', 'borgogna', 
    'rame', 'terracotta', 'argento', 'ocra', 'antracite', 'ottanio'
  ];
  const currentSealColor = sealColors[(dayOfYear - 1) % sealColors.length];

  const tapeFilters = [
    'hue-rotate(205deg) saturate(0.8) brightness(0.8)', // 1. blu
    'hue-rotate(350deg) saturate(1.1) brightness(1.1)', // 2. rosso
    'hue-rotate(45deg) saturate(0.9) brightness(1.3)', // 3. oro
    'hue-rotate(120deg) saturate(0.55) brightness(0.8)', // 4. verde-scuro
    'hue-rotate(95deg) saturate(0.4) brightness(1.1)', // 5. salvia
    'hue-rotate(90deg) saturate(0.45) brightness(1.3)', // 6. verde-chiaro
    'none', // 7. borgogna (original burgundy matches base washi tape)
    'hue-rotate(20deg) saturate(0.8) brightness(1.1)', // 8. rame
    'hue-rotate(15deg) saturate(0.9) brightness(0.9)', // 9. terracotta
    'saturate(0) brightness(1.35) contrast(0.95)', // 10. argento
    'hue-rotate(45deg) saturate(0.7) brightness(1.1)', // 11. ocra
    'saturate(0.08) brightness(0.65)', // 12. antracite
    'hue-rotate(170deg) saturate(0.6) brightness(0.85)', // 13. ottanio
  ];
  const currentTapeFilter = tapeFilters[(dayOfYear - 1) % tapeFilters.length];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty('--tape-filter', currentTapeFilter);
    }
  }, [currentTapeFilter]);

  useEffect(() => {
    const sealColorData = SEAL_COLOR_MAP[currentSealColor] || { color: DEFAULT_DAILY_ACCENT, rgb: '181, 149, 106' };
    setDailyAccent(sealColorData);
  }, [currentSealColor]);



  const visibleSaintArtwork = (
    saintArtwork
    && data?.santi.length === 1
    && saintArtwork.saintName === dataOriginale?.santi[0]?.nome
  ) ? saintArtwork : null;
  const isCardSaved = (section: SavedSectionId) => savedCards.some((item) => item.id === `${dataExLibris}:${section}`);
  const saveCard = (section: SavedSectionId, title: string, excerpt: string, source?: string) => {
    toggleSavedCard({ date: dataExLibris, section, title, excerpt, source });
  };
  const openSavedCard = (item: SavedCardItem) => {
    setSavedDrawerOpen(false);
    if (item.date === dataExLibris) {
      setActiveSection(item.section);
      document.getElementById(item.section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    caricaGiorno(item.date, Boolean(data), item.section);
  };

  // ── POPOVER ARCHIVIO (shared, rendered via portal) ──
  const archivioPopover = isMounted ? createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="false"
      aria-label="Archivio dei giorni"
      className={`archive-popover ${popoverOpen ? 'is-open' : ''} ${isDark ? 'is-dark' : ''} fixed z-[9999] flex flex-col overflow-hidden ${garamond.className}`}
      style={{
        top: `${popoverPos.top}px`,
        right: `${popoverPos.right}px`,
        width: '360px',
        maxWidth: 'calc(100vw - 32px)',
        transformOrigin: 'top right',
        maxHeight: '480px',
        height: 'auto',
      }}
    >
      <div className="archive-header">
        <div className="archive-heading">
          <CalendarDays className="archive-heading-icon" strokeWidth={1.45} aria-hidden="true" />
          <span className={`${garamond.className} italic font-bold archive-heading-title`}>{t('archiveTitle', lingua)}</span>
        </div>
        <button onClick={() => setPopoverOpen(false)} className="archive-close" aria-label="Chiudi archivio"><X aria-hidden="true" /></button>
      </div>
      {dataSelezionata && dataSelezionata !== oggi && (
        <div className="archive-today-row">
          <button onClick={() => caricaGiorno(null, Boolean(data))} className="archive-today-link"><ChevronLeft aria-hidden="true" />Torna a oggi</button>
        </div>
      )}
      <div className="archive-search-wrap">
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
        <div ref={archivioScrollRef} onScroll={checkArchivioScroll} className="archive-scroll overflow-y-auto h-full" style={{ maxHeight: '350px' }}>
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
                <p className="archive-month-tab">
                  <span className="archive-month-name">{mese}</span>
                  <span className="archive-month-note">{monthMood}</span>
                </p>
                <ul className="archive-list">
                  {items.map((item, index) => {
                    const isOggi = item.data === oggi;
                    const isSelezionato = item.data === dataSelezionata;
                    const isVisited = visitedArchiveDates.has(item.data);
                    const archiveMark = getArchiveEntryMark(item);
                    return (
                      <li key={item.data}>
                        <button onClick={() => { if (!isSelezionato) caricaGiorno(item.data, Boolean(data)); else setPopoverOpen(false); }}
                          aria-label={`${item.autore_giorno}, ${formatDataItaliana(item.data)}${isVisited ? ', già consultato' : ''}`}
                          className={`archive-entry ${
                            isSelezionato ? 'is-selected text-[#DE6B58]' : isDark ? 'text-[#E0E0E0]' : 'text-[#2A2522]'
                          } ${isOggi ? 'is-today' : ''} ${isVisited ? 'is-visited' : ''}`}
                          style={{ '--archive-entry-delay': `${80 + Math.min(index, 7) * 34}ms` } as CSSProperties}>
                          <span className="archive-entry-mark" aria-hidden="true">
                            <span>{archiveMark.initials}</span>
                            <small>{archiveMark.day}</small>
                          </span>
                          <span className="archive-entry-copy">
                            <span className="archive-entry-title">{item.autore_giorno}</span>
                            {isOggi && <span className="archive-entry-today">oggi</span>}
                          </span>
                          <span className="archive-entry-date">{formatDataItaliana(item.data)}</span>
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

  const savedCardsDrawer = isMounted ? createPortal(
    <aside
      ref={savedDrawerRef}
      role="dialog"
      aria-modal="false"
      aria-label={lingua === 'IT' ? 'Cose custodite' : 'Saved pages'}
      className={`saved-cards-drawer ${savedDrawerOpen ? 'is-open' : ''} ${isDark ? 'is-dark' : ''} ${garamond.className}`}
      style={{
        top: `${savedDrawerPos.top}px`,
        right: `${savedDrawerPos.right}px`,
      }}
    >
      <header className="saved-cards-header">
        <div>
          <span className="saved-cards-kicker">{lingua === 'IT' ? 'Il tuo cassetto' : 'Your drawer'}</span>
          <h2 className={`${garamond.className} italic font-bold`}>{t('savedPages', lingua)}</h2>
        </div>
        <button type="button" onClick={() => setSavedDrawerOpen(false)} aria-label={lingua === 'IT' ? 'Chiudi' : 'Close'}>
          <X aria-hidden="true" />
        </button>
      </header>
      {savedCards.length === 0 ? (
        <div className="saved-cards-empty">
          <Bookmark className="h-5 w-5" strokeWidth={1.45} aria-hidden="true" />
          <p>{lingua === 'IT' ? 'Qui ritroverai le schede che vorrai tenere con te.' : 'The pages you choose to keep will appear here.'}</p>
        </div>
      ) : (
        <ol className="saved-cards-list">
          {savedCards.map((item) => (
            <li key={item.id}>
              <button type="button" className="saved-card-open" onClick={() => openSavedCard(item)}>
                <span className="saved-card-date">{formatDataItaliana(item.date)}</span>
                <strong>{item.title}</strong>
                <span className="saved-card-excerpt">{item.excerpt}</span>
                {item.source ? <em>{item.source}</em> : null}
              </button>
              <button
                type="button"
                className="saved-card-remove"
                onClick={() => removeSavedCard(item.id)}
                aria-label={`${lingua === 'IT' ? 'Rimuovi' : 'Remove'} ${item.title}`}
                title={lingua === 'IT' ? 'Rimuovi' : 'Remove'}
              >
                <X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <footer>{lingua === 'IT' ? `${savedCards.length} ${savedCards.length === 1 ? 'scheda custodita' : 'schede custodite'}` : `${savedCards.length} saved`}</footer>
    </aside>,
    document.body
  ) : null;

  if (loading) return (
    <>
      <LoadingNotebook isDark={isDark} />
      {archivioPopover}
      {savedCardsDrawer}
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
      {savedCardsDrawer}
    </div>
  );

  if (!data) return null;

  const localSeasonPreview = process.env.NODE_ENV === 'development' && isMounted
    ? new URLSearchParams(window.location.search).get('season')
    : null;
  const season = isSeasonId(localSeasonPreview) ? localSeasonPreview : getSeason(dataExLibris);

  return (
    <ParallaxBackground season={season} dataIso={dataExLibris} showEspresso captionClassName={garamond.className} language={lingua} sealColor={currentSealColor}>
      <div
        className={`journal-material journal-material-${season} min-h-screen overflow-x-clip bg-transparent ${themeClasses.text} ${garamond.className} py-6 md:py-7 px-4 md:px-8 ${themeClasses.selection} relative transition-colors duration-300`}
        style={{
          ...ambientLightStyle,
          '--daily-accent': dailyAccent.color,
          '--daily-accent-rgb': dailyAccent.rgb,
        } as CSSProperties}
      >
        <NotebookQuickNav
          isDark={isDark}
          lingua={lingua}
          hasOpera={Boolean(opera)}
          hasApod={Boolean(apod) || apodLoading}
          activeSection={activeSection}
          readingComplete={readingComplete}
        />
        <MobileReadingThread
          isDark={isDark}
          lingua={lingua}
          hasOpera={Boolean(opera)}
          hasApod={Boolean(apod) || apodLoading}
          activeSection={activeSection}
          open={mobileNavOpen}
          hidden={footerInView || !mobileReadingVisible}
          onToggle={() => {
            setControlsHidden(false);
            setMobileToolsOpen(false);
            setMobileNavOpen((current) => !current);
          }}
          onNavigate={() => setMobileNavOpen(false)}
        />
        <SeasonalBookmark
          dataIso={dataExLibris}
          lingua={lingua}
          isDark={isDark}
        />
        <div className={`top-control-panel ${controlsHidden && !popoverOpen && !savedDrawerOpen && !mobileNavOpen ? 'is-hidden' : ''} fixed top-4 right-4 z-50 flex items-center gap-2`}>
          <LanguageSelector
            lingua={lingua}
            onChange={cambiaLingua}
            disabled={traducendo}
            isDark={isDark}
          />

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
            ref={desktopSavedTriggerRef}
            type="button"
            onClick={(event) => {
              toggleSavedDrawer(event.currentTarget);
            }}
            className={`top-control-button p-2 rounded-full border backdrop-blur-sm transition-colors ${
              savedDrawerOpen
                ? 'border-[#DE6B58] text-[#DE6B58]'
                : isDark
                  ? 'border-white/10 text-[#A0A0A0] bg-[#1E1E1E]/55 hover:text-[#DE6B58] hover:border-[#DE6B58]/70'
                  : 'border-[#EBE5DB] text-[#8A817C] bg-[#F4F0E6]/60 hover:text-[#DE6B58] hover:border-[#DE6B58]'
            }`}
            aria-label={lingua === 'IT' ? 'Cose custodite' : 'Saved pages'}
            aria-expanded={savedDrawerOpen}
            aria-haspopup="dialog"
            title={lingua === 'IT' ? 'Cose custodite' : 'Saved pages'}
          >
            {savedCards.length > 0 ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          </button>

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
          className={`mobile-tools ${isDark ? 'is-dark' : ''} ${mobileToolsOpen ? 'is-open' : ''} ${controlsHidden && !mobileToolsOpen && !popoverOpen && !savedDrawerOpen ? 'is-hidden' : ''}`}
        >
          <div
            id="mobile-tools-menu"
            className="mobile-tools-menu"
            aria-hidden={!mobileToolsOpen}
            inert={!mobileToolsOpen}
          >
            <div className="mobile-tools-lang flex items-center justify-between gap-2 px-2.5 py-1 select-none border-b border-stone-200 dark:border-white/5 pb-2.5 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8A817C] dark:text-[#A0A0A0] flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-[#DE6B58]" />
                {lingua === 'IT' ? 'Lingua' : 'Language'}
              </span>
              <LanguageSelector
                lingua={lingua}
                onChange={(code) => {
                  setMobileToolsOpen(false);
                  void cambiaLingua(code);
                }}
                disabled={traducendo}
                isDark={isDark}
              />
            </div>
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
              ref={mobileSavedTriggerRef}
              type="button"
              onClick={(event) => {
                setMobileToolsOpen(false);
                toggleSavedDrawer(event.currentTarget, mobileToolsTriggerRef.current ?? event.currentTarget);
              }}
              aria-expanded={savedDrawerOpen}
              aria-haspopup="dialog"
            >
              {savedCards.length > 0 ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              <span>{lingua === 'IT' ? 'Cose custodite' : 'Saved pages'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileToolsOpen(false);
                window.dispatchEvent(new Event(TICKET_DOWNLOAD_EVENT));
              }}
              aria-label={lingua === 'IT' ? 'Scarica il biglietto' : 'Download ticket'}
            >
              <FileDown className="h-4 w-4" />
              <span>{lingua === 'IT' ? 'Scarica il biglietto' : 'Download ticket'}</span>
            </button>
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
        <span className="sr-only" role="status" aria-live="polite">
          {isTurningPage ? (lingua === 'IT' ? 'Cambio giorno in corso' : 'Changing day') : ''}
        </span>
        {isTurningPage && (
          <div
            className={`ink-day-transition is-${pageTurnPhase} ${isDark ? 'is-dark' : ''}`}
            aria-hidden="true"
          >
            <div className="ink-day-transition-canvas">
              <div className="ink-day-transition-sprite" />
            </div>
          </div>
        )}
        <main
          className={`journal-page-enter journal-page-transition is-${pageTurnPhase} w-full max-w-4xl mx-auto space-y-5 md:space-y-7 relative z-10`}
          aria-busy={isTurningPage}
        >
          <header className="journal-hero text-center relative animate-fadeInUp stagger-1 px-4">
            <div className="relative z-10" data-reveal-readability>
              <div className="flex justify-center mb-2">
                <div className={`masking-tape journal-date-tape ${caveat.className} text-lg font-bold tracking-wider`}>
                  {getDisplayDate(data, lingua, dataSelezionata)}
                </div>
              </div>
              <h1
                className="journal-hero-title text-[36px] sm:text-[44px] md:text-[48px] lg:text-[52px] font-medium tracking-tight mb-2"
                style={{
                  textShadow: isDark
                    ? '0 2px 10px rgba(0,0,0,0.55)'
                    : '0 1px 1px rgba(255,252,242,0.75)',
                }}
              >
                <span className={`${masterSignature.className} notebook-wordmark hero-ink-title journal-wordmark-reserve animate-handwrite`}>
                  {t('dayTitle', lingua)}
                </span>
              </h1>
              <p
                className={`journal-hero-subtitle italic text-base sm:text-[1.05rem] leading-relaxed ${isDark ? 'text-[#D4D4D4]' : 'text-[#4A433F]'} mx-auto`}
                style={{
                  textShadow: isDark
                    ? '0 1px 3px rgba(0,0,0,0.5)'
                    : '0 1px 1px rgba(255,252,242,0.75)',
                }}
              >
                {t('daySubtitle', lingua)}
              </p>
              {erroreTraduzioni && <p className="text-xs text-[#DE6B58] italic mt-2">{erroreTraduzioni}</p>}
              <WatercolorDivider isDark={isDark} accentColor={dailyAccent.color} />
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
            }}
          >
            <img
              draggable={false}
              src={data.foto_autore_url}
              alt={data.autore_giorno}
              {...eagerImageProps}
              style={{
                display: 'block',
                width: '140px',
                height: '180px',
                objectFit: 'cover',
                filter: 'grayscale(100%) contrast(90%) brightness(1.05)',
              }}
            />
            <span className={`${caveat.className} author-photo-caption`}>
              {inizialiExLibris} · {formatExLibrisDate(dataExLibris)}
            </span>
          </div>
        </div>
      )}

      <div
        className="relative z-10 w-full min-w-0 flex-1 text-center md:text-left"
        data-reveal-readability
      >
        <div className="relative z-10">
          <div className="mb-3 select-none flex justify-center md:justify-start">
            <ScrollRevealBadge className="author-tape-title-wrapper" resetTrigger={dataExLibris}>
              <span className="badge-tape-bg" aria-hidden="true" />
              <Feather className="w-[17px] h-[17px] text-[#E5B869] flex-shrink-0" strokeWidth={1.6} />
              <span className={`${garamond.className} italic text-[19px] font-medium text-[#f4f0e6] leading-none`}>
                {t('authorOfTheDay', lingua)}
              </span>
            </ScrollRevealBadge>
          </div>
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
            dataOdierna={getDisplayDate(data, lingua, dataSelezionata)}
            dataIso={dataExLibris}
            isDark={isDark}
            onHidePreview={() => setShowExportCard(false)}
            hidePreviewLabel={lingua === 'IT' ? 'Nascondi' : 'Hide'}
            saveImageLabel={lingua === 'IT' ? 'Salva' : 'Save'}
            lingua={lingua}
          />
        </div>
      </div>
    </div>
  </div> {/* chiude relative z-10 */}
</section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            <Card
              key={`${dataExLibris}:citazione`}
              id="citazione"
              title={t('quoteCard', lingua)}
              icon={Quote}
              isDark={isDark}
              className="scroll-mt-28 md:col-span-2 animate-fadeInUp stagger-3"
              filename={`citazione-${data.autore_giorno.toLowerCase().replace(/\s+/g, '-')}`}
              isSaved={isCardSaved('citazione')}
              onToggleSaved={() => saveCard('citazione', `${lingua === 'IT' ? 'Citazione di' : 'Quote by'} ${data.citazione.autore}`, data.citazione.testo, data.citazione.fonte)}
            >
              <blockquote className="quote-editorial md:px-8">
                <EditorialQuoteText text={data.citazione.testo} />
                <footer className="quote-editorial-footer text-right text-lg clear-both pt-2">
                  <span className="font-bold">{data.citazione.autore}</span>
                  <span className={`${themeClasses.textMuted} italic font-medium`}> — {data.citazione.fonte}</span>
                </footer>
              </blockquote>
            </Card>

            <Card key={`${dataExLibris}:parola`} id="parola" title={t('wordCard', lingua)} icon={Type} isDark={isDark} className="scroll-mt-28 animate-fadeInUp stagger-4"
              filename={`parola-${data.parola_giorno.parola.toLowerCase()}`}
              isSaved={isCardSaved('parola')}
              onToggleSaved={() => saveCard('parola', data.parola_giorno.parola, data.parola_giorno.definizione, data.parola_giorno.etimologia)}>
              <div className="text-center mb-6">
                <h4 className="card-primary-title text-4xl font-bold text-[#DE6B58] mb-2">{data.parola_giorno.parola}</h4>
                <p className={`card-secondary-meta ${themeClasses.textMuted} italic font-medium text-lg`}>{data.parola_giorno.etimologia}</p>
              </div>
              <p className="card-body-copy text-xl font-medium mb-4"><strong className="font-bold">{lingua === 'IT' ? 'Definizione' : 'Definition'}:</strong> {data.parola_giorno.definizione}</p>
              {data.parola_giorno.esempio && data.parola_giorno.esempio.trim() !== '' && data.parola_giorno.esempio !== 'null' && (
                <p className={`text-lg font-medium italic quote-example-note ${isDark ? 'is-dark' : ''}`}>&quot;{data.parola_giorno.esempio}&quot;</p>
              )}
              {data.parola_giorno.nota && (
                <aside className={`margin-note ${isDark ? 'is-dark' : ''}`}>
                  <DoodleArrow isDark={isDark} />
                  <span className={caveat.className}>{getMarginalia(data.parola_giorno.nota)}</span>
                </aside>
              )}
            </Card>

            <Card key={`${dataExLibris}:santi`} id="santi" title={t('saintsCard', lingua)} icon={Church} isDark={isDark} className="scroll-mt-28 animate-fadeInUp stagger-4"
              filename="santi"
              isSaved={isCardSaved('santi')}
              onToggleSaved={() => saveCard('santi', data.santi.map((santo) => santo.nome).join(', '), data.santi[0]?.biografia ?? '', data.santi.map((santo) => santo.ruolo).join(' · '))}>
              <div className="saints-card-layout">
                {visibleSaintArtwork ? (
                  <figure className="saint-card-artwork">
                    <img
                      draggable={false}
                      src={`/api/image-proxy?url=${encodeURIComponent(visibleSaintArtwork.imageUrl)}`}
                      alt=""
                      crossOrigin="anonymous"
                      {...lazyImageProps}
                    />
                  </figure>
                ) : null}
                <ul className="saints-card-copy space-y-6">
                {data.santi.map((santo, idx) => (
                  <li key={idx} className={`border-b ${themeClasses.border} last:border-0 pb-4 last:pb-0`}>
                    <h4 className="card-primary-title text-2xl font-bold mb-1">{santo.nome}</h4>
                    <p className="card-secondary-meta text-[#DE6B58] font-medium italic mb-2">{santo.ruolo} ({santo.anni})</p>
                    <p className="card-body-copy text-lg font-medium leading-relaxed">{santo.biografia}</p>
                  </li>
                ))}
                </ul>
                {visibleSaintArtwork ? (
                  <a
                    href={visibleSaintArtwork.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="saint-card-credit"
                    aria-label={[
                      lingua === 'IT' ? 'Fonte iconografica' : 'Artwork source',
                      visibleSaintArtwork.title,
                      visibleSaintArtwork.author,
                      visibleSaintArtwork.license,
                    ].filter(Boolean).join(': ')}
                  >
                    {lingua === 'IT' ? 'Iconografia' : 'Artwork'}: {visibleSaintArtwork.source === 'met' ? 'The Met' : 'Wikimedia Commons'} · {visibleSaintArtwork.license}
                  </a>
                ) : null}
              </div>
            </Card>

            {opera && (
              <Card
                key={`${dataExLibris}:opera`}
                id="opera"
                title={t('artworkCard', lingua)}
                icon={Palette}
                isDark={isDark}
                className="scroll-mt-28 md:col-span-2 animate-fadeInUp stagger-5"
                filename={`opera-${dataExLibris}`}
                isSaved={isCardSaved('opera')}
                onToggleSaved={() => saveCard('opera', opera.titolo, [operaMedium, operaDepartment].filter(Boolean).join(' · '), opera.artista)}
              >
                <div className="opera-postcard grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
                  <div className="opera-postcard-copy space-y-5 order-2 md:order-1">
                    <div>
                      <h4 className="card-primary-title text-3xl md:text-4xl font-bold leading-tight mb-2">{opera.titolo}</h4>
                      <p className="card-byline text-xl font-medium">{lingua === 'IT' ? 'di' : 'by'} <span className="font-bold">{opera.artista}</span>{opera.anno ? <span className={`${themeClasses.textMuted} italic`}> — {opera.anno}</span> : null}</p>
                    </div>
                    {(operaMedium || operaDepartment) && <p className={`card-secondary-meta ${themeClasses.textMuted} italic`}>{[operaMedium, operaDepartment].filter(Boolean).join(' · ')}</p>}
                    {operaSourceUrl && (
                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        <a href={operaSourceUrl} target="_blank" rel="noopener noreferrer" className={`editorial-link-button ${isDark ? 'is-dark' : ''}`}>
                          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                          <span>{lingua === 'IT' ? 'Vedi al museo' : 'View at the museum'}</span>
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="opera-postcard-media order-1 md:order-2">
                    <a href={operaSourceUrl || undefined} target={operaSourceUrl ? '_blank' : undefined} rel={operaSourceUrl ? 'noopener noreferrer' : undefined} className="opera-postcard-link block group">
                      {operaImageCandidates.length > 0 ? (
                        <img
                          draggable={false}
                          src={operaImageCandidates[0]}
                          alt={`${opera.titolo} by ${opera.artista}`}
                          className={`opera-postcard-image w-full h-auto object-cover border ${themeClasses.border} transition-transform duration-500 group-hover:scale-[1.01]`}
                          onError={(event) => {
                            const currentIndex = Number(event.currentTarget.dataset.fallbackIndex ?? '0');
                            const nextIndex = currentIndex + 1;
                            const fallback = operaImageCandidates[nextIndex];
                            if (fallback) {
                              event.currentTarget.dataset.fallbackIndex = String(nextIndex);
                              event.currentTarget.src = fallback;
                            }
                          }}
                          {...lowPriorityImageProps}
                        />
                      ) : null}
                      <span className="opera-postcard-source-label">
                        {lingua === 'IT' ? 'Fonte' : 'Source'}: {opera.museo}
                        {opera.rights ? ` · ${opera.rights}` : ''}
                      </span>
                    </a>
                  </div>
                </div>
              </Card>
            )}

            <Card key={`${dataExLibris}:avvenimenti`} id="avvenimenti" title={t('eventsCard', lingua)} icon={CalendarDays} isDark={isDark} className="scroll-mt-28 md:col-span-2 animate-fadeInUp stagger-6"
              filename="avvenimenti"
              isSaved={isCardSaved('avvenimenti')}
              onToggleSaved={() => saveCard('avvenimenti', t('eventsCard', lingua), data.avvenimenti[0] ?? '')}>
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

            <Card key={`${dataExLibris}:poesia`} id="poesia" title={t('poemCard', lingua)} icon={Feather} isDark={isDark} className="scroll-mt-28 animate-fadeInUp stagger-7"
              filename={`poesia-${data.poesia.autore.toLowerCase().replace(/\s+/g, '-')}`}
              isSaved={isCardSaved('poesia')}
              onToggleSaved={() => saveCard('poesia', data.poesia.fonte || t('poemCard', lingua), data.poesia.testo.slice(0, 180), data.poesia.autore)}>
              <DecorativeInitialText
                text={data.poesia.testo}
                className="whitespace-pre-wrap text-xl font-medium leading-relaxed mb-6"
                initialTone="blue"
              />
              <div className={`text-left border-t ${themeClasses.border} pt-4 mb-6`}>
                <p className="font-bold text-xl">{data.poesia.autore}</p>
                <p className={`${themeClasses.textMuted} font-medium italic`}>{data.poesia.fonte}</p>
              </div>
              {data.poesia.nota && (
                <div className={`reading-note ${isDark ? 'is-dark' : ''}`}>
                  <span className="font-bold text-[#DE6B58] text-xs tracking-widest uppercase block mb-1">{lingua === 'IT' ? 'Perché questa scelta' : 'Why this choice'}</span>
                  {data.poesia.nota}
                </div>
              )}
              </Card>

            <Card key={`${dataExLibris}:bibbia`} id="bibbia" title={t('bibleCard', lingua)} icon={BookOpen} isDark={isDark} className="scroll-mt-28 animate-fadeInUp stagger-7"
              filename="bibbia"
              isSaved={isCardSaved('bibbia')}
              onToggleSaved={() => saveCard('bibbia', data.bibbia.fonte, data.bibbia.testo.slice(0, 180))}>
              <DecorativeInitialText
                text={data.bibbia.testo}
                className="whitespace-pre-wrap text-xl font-medium leading-relaxed mb-6"
              />
              <div className={`text-left border-t ${themeClasses.border} pt-4 mb-6`}>
                <p className={`${themeClasses.textMuted} italic font-bold`}>{data.bibbia.fonte}</p>
              </div>
              {data.bibbia.nota && (
                <div className={`reading-note ${isDark ? 'is-dark' : ''}`}>
                  <span className="font-bold text-[#DE6B58] text-xs tracking-widest uppercase block mb-1">{lingua === 'IT' ? 'Il senso del passaggio' : 'The meaning of the passage'}</span>
                  {data.bibbia.nota}
                </div>
              )}
            </Card>

            {/* ── IMMAGINE ASTRONOMICA ── */}
            {(apod || apodLoading) && (
              <Card
                key={`${dataExLibris}:apod`}
                id="apod"
                isDark={isDark}
                className="scroll-mt-28 md:col-span-2 animate-fadeInUp stagger-8"
                filename={apod ? `apod-${dataExLibris}` : undefined}
                isSaved={isCardSaved('apod')}
                onToggleSaved={
                  apod
                    ? () =>
                        saveCard(
                          'apod',
                          lingua === 'IT' ? apod.title_it : apod.title_en,
                          (lingua === 'IT' ? apod.explanation_it : apod.explanation_en).slice(0, 180),
                          apod.copyright
                        )
                    : undefined
                }
              >
                <div className="card-section-heading flex items-center justify-start">
                  <ScrollRevealBadge className="apod-card-tape-wrapper" resetTrigger={dataExLibris}>
                    <img
                      draggable={false}
                      src={lingua === 'IT' ? "/images/tape-astronomia.png" : "/images/tape-astronomia-en.png"}
                      alt={t('apodCard', lingua)}
                      className="apod-card-tape"
                    />
                  </ScrollRevealBadge>
                </div>

                {apodLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-4">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <Telescope className="w-8 h-8 text-[#DE6B58] animate-pulse" strokeWidth={1.5} />
                      <div 
                        className="absolute inset-0 border-2 border-dashed border-[#DE6B58]/30 rounded-full"
                        style={{ animation: 'spin 10s linear infinite' }}
                      />
                    </div>
                    <p className={`text-xl font-medium italic ${isDark ? 'text-[#A0A0A0]' : 'text-[#7D7571]'} animate-pulse`}>
                      {lingua === 'IT' ? 'Osservo le stelle...' : 'Observing the stars...'}
                    </p>
                  </div>
                ) : (
                  apod && (
                    <div className="apod-card-layout">
                      <div className="apod-media-container select-none">
                        <div className={`apod-postcard ${isDark ? 'is-dark' : ''}`}>
                          {apod.media_type === 'video' ? (
                            <div className="relative w-full aspect-video rounded-md overflow-hidden bg-black/10 border border-black/5 dark:border-white/5">
                              {apod.thumbnail_url ? (
                                <img
                                  draggable={false}
                                  src={`/api/image-proxy?url=${encodeURIComponent(apod.thumbnail_url)}`}
                                  alt={lingua === 'IT' ? apod.title_it : apod.title_en}
                                  className="w-full h-full object-cover filter saturate-[0.94] contrast-[0.98]"
                                  {...lazyImageProps}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm text-neutral-400 italic">
                                  {lingua === 'IT' ? 'Anteprima video non disponibile' : 'Video preview not available'}
                                </div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                                <span className="w-14 h-14 rounded-full bg-white/90 dark:bg-neutral-900/90 flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                                  <ExternalLink className="w-6 h-6 text-[#DE6B58]" strokeWidth={2} />
                                </span>
                              </div>
                            </div>
                          ) : (
                            <img
                              draggable={false}
                              src={`/api/image-proxy?url=${encodeURIComponent(apod.url)}`}
                              alt={lingua === 'IT' ? apod.title_it : apod.title_en}
                              className="apod-image"
                              {...lazyImageProps}
                            />
                          )}
                          <span className="apod-postcard-source-label">
                            NASA APOD · {lingua === 'IT' ? apod.title_it : apod.title_en} · {getDisplayDate(data, lingua, dataSelezionata)}
                          </span>
                        </div>
                      </div>

                      <div className="apod-copy-cell mt-6 md:mt-0 flex flex-col h-full justify-between">
                        <div>
                          <h4 className="card-primary-title text-3xl font-bold mb-2">
                            {lingua === 'IT' ? apod.title_it : apod.title_en}
                          </h4>
                          {apod.copyright && (
                            <p className="card-byline text-lg font-medium mb-4">
                              {lingua === 'IT' ? 'Crediti:' : 'Credit:'}{' '}
                              <span className="font-bold">{apod.copyright}</span>
                            </p>
                          )}
                          <div className="relative">
                            <p className={`card-body-copy text-xl font-medium leading-relaxed mb-1 whitespace-pre-line transition-all duration-300 ${
                              !isApodExpanded ? 'max-h-[220px] overflow-hidden' : ''
                            }`}>
                              {lingua === 'IT' ? apod.explanation_it : apod.explanation_en}
                            </p>
                            {!isApodExpanded && (
                              <div 
                                className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none"
                                style={{
                                  backgroundImage: isDark
                                    ? 'linear-gradient(to top, #2A2A2A 0%, rgba(42, 42, 42, 0) 100%)'
                                    : 'linear-gradient(to top, #FDFCF8 0%, rgba(253, 252, 248, 0) 100%)'
                                }}
                              />
                            )}
                          </div>
                          
                          <button
                            onClick={() => setIsApodExpanded(!isApodExpanded)}
                            className="mt-2 text-lg font-bold text-[#DE6B58] hover:text-[#c55b4a] transition-colors inline-flex items-center gap-1 cursor-pointer focus:outline-none"
                          >
                            <span>
                              {isApodExpanded 
                                ? (lingua === 'IT' ? 'Mostra meno' : 'Show less') 
                                : (lingua === 'IT' ? 'Leggi tutto' : 'Read more')}
                            </span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isApodExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>

                        <div className="apod-link-actions flex gap-4 mt-6" data-export-ignore>
                          <a
                            href={apod.hdurl || apod.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`editorial-link-button ${isDark ? 'is-dark' : ''}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                            <span>
                              {apod.media_type === 'video'
                                ? (lingua === 'IT' ? 'Guarda il video' : 'Watch video')
                                : (lingua === 'IT' ? 'Vedi risoluzione originale' : 'View original resolution')}
                            </span>
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </Card>
            )}

            {/* ── CONSIGLIO MUSICALE ── */}
            <Card
              key={`${dataExLibris}:musica`}
              id="musica"
              isDark={isDark}
              className="music-feature-card scroll-mt-28 md:col-span-2 animate-fadeInUp stagger-9"
              filename={`musica-${data.musica.brano.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`}
              isSaved={isCardSaved('musica')}
              onToggleSaved={() => saveCard('musica', data.musica.brano, data.musica.motivo, data.musica.autore)}
            >
              <div className="music-card-layout">

                {/* Mobile-only tape (first element at the top on mobile) */}
                <div className="flex md:hidden items-center justify-center mb-1 select-none w-full">
                  <ScrollRevealBadge 
                    as="h3"
                    className={`${garamond.className} italic section-typewriter-badge badge-musica badge-tilt-right text-sm`}
                    resetTrigger={dataExLibris}
                  >
                    <span className="badge-tape-bg" aria-hidden="true" />
                    <Music className="w-[17px] h-[17px] flex-shrink-0" strokeWidth={1.6} />
                    <span>{t('musicCard', lingua)}</span>
                  </ScrollRevealBadge>
                </div>

                <div className="music-media-cell select-none">
                  <div className="music-vinyl-wrapper">
                    <div className="music-vinyl-disc" aria-hidden="true">
                      <div
                        className="music-vinyl-label"
                        style={{ backgroundImage: musicCover ? `url('${musicCover}')` : 'none' }}
                      />
                    </div>
                    <figure className={`music-cover-frame ${isDark ? 'is-dark' : ''}`}>
                      {musicCover ? (
                        <img
                          draggable={false}
                          src={musicCover}
                          alt={`${data.musica.brano} cover`}
                          onError={() => setMusicCover(null)}
                          {...lazyImageProps}
                        />
                      ) : (
                        <div className="music-cover-placeholder" aria-hidden="true">
                          <Music className="h-10 w-10" strokeWidth={1.4} />
                        </div>
                      )}
                    </figure>
                  </div>
                </div>

                <div className="music-copy-cell">
                  {/* Desktop-only tape */}
                  <div className="hidden md:flex items-center justify-start mb-5 select-none">
                    <ScrollRevealBadge 
                      as="h3"
                      className={`${garamond.className} italic section-typewriter-badge badge-musica badge-tilt-right text-sm`}
                      resetTrigger={dataExLibris}
                    >
                      <span className="badge-tape-bg" aria-hidden="true" />
                      <Music className="w-[17px] h-[17px] flex-shrink-0" strokeWidth={1.6} />
                      <span>{t('musicCard', lingua)}</span>
                    </ScrollRevealBadge>
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
            <div className="journal-footer-inner" data-reveal-readability>
              <div className={`daily-wax-seal seal-${currentSealColor}`} aria-label={`${t('waxSealAria', lingua)}: ${data.autore_giorno}`}>
                <div className="daily-wax-seal-inner">
                  <span className="seal-initials">{inizialiExLibris}</span>
                  <span className="seal-date">{formatExLibrisDate(dataExLibris)}</span>
                  <span className="seal-edition">
                    {t('edition', lingua)}
                    <br />
                    {`${t('number', lingua)} ${dayOfYear} ${t('of', lingua)} ${totalDays}`}
                  </span>
                </div>
              </div>
              <p className={`journal-footer-title ${masterSignature.className} notebook-wordmark`}>
                {t('dayTitle', lingua)}
              </p>
              <p className="journal-footer-note">
                {t('footerText', lingua)}
                <br />
                {t('madeWithLove', lingua)}
              </p>
              <nav className="journal-footer-socials" aria-label={t('socialLinks', lingua)}>
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
                  <span>{t('support', lingua)}</span>
                </a>
              </nav>
              <button
                type="button"
                className={`daily-passport-open-button ${isDark ? 'is-dark' : ''}`}
                onClick={() => window.open(`/passaporto?data=${dataExLibris}`, '_blank', 'noopener,noreferrer')}
              >
                <FileDown className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
                <span>{t('createPassport', lingua)}</span>
              </button>
            </div>
          </footer>

        </main>

        {archivioPopover}
        {savedCardsDrawer}
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
