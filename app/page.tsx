'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Languages, CalendarDays, BookmarkCheck, Bookmark, Sun, Moon, SlidersHorizontal, ChevronLeft, ChevronRight, X, Search, Feather, Quote, Type, Church, Palette, Music, Telescope, ExternalLink, FileDown, Loader2, ChevronDown, Sparkles, BookOpen, Mail } from 'lucide-react';

// Custom components
import AuthorExportCard from './components/AuthorExportCard';
import Card from './components/Card';
import ParallaxBackground from '@/components/ui/ParallaxBackground';
import DailyPassport from './components/DailyPassport';
import SeasonalBookmark from './components/SeasonalBookmark';
import LoadingNotebook from './components/LoadingNotebook';
import NotebookQuickNav from './components/NotebookQuickNav';
import MobileReadingThread from './components/MobileReadingThread';
import GuestbookModal from './components/GuestbookModal';
import { TypewriterText, DecorativeInitialText, EditorialQuoteText } from '@/components/ui/Typography';
import { DoodleArrow } from '@/components/ui/Doodles';
import { XIcon, InstagramIcon, CoffeeIcon } from '@/components/ui/Icons';
import WatercolorDivider from '@/components/ui/WatercolorDivider';

// Library utilities & types
import type { Artwork } from '@/lib/artwork';
import type { SaintArtwork } from '@/lib/saint-artwork';
import type { SkyRegion, VisiblePlanet } from '@/lib/visible-planets';
import type { LanguageCode, OperaGiorno, SaintArtworkResult, ApodData, DatiTaccuino, ArchivioItem, SavedSectionId, SavedCardItem } from '@/lib/types';
import { SKY_REGION_OPTIONS, SKY_REGION_STORAGE_KEY, TICKET_DOWNLOAD_EVENT, VISITED_ARCHIVE_STORAGE_KEY, SAVED_CARDS_STORAGE_KEY, DEFAULT_DAILY_ACCENT, SEAL_COLOR_MAP } from '@/lib/constants';
import { t } from '@/lib/translation';
import { formatDataItaliana, getRomeDateIso, getSavedVisitedDates, getMonthNumber, getDisplayDate, getDayOfYearInfo, getInitials, getSeason, formatExLibrisDate, isSeasonId, getMarginalia, normalizeArchiveText } from '@/lib/date-utils';
import { getAmbientLightStyle, applyBrowserTheme, runWhenIdle, getImageLoadingProps, uniqueImageCandidates, proxiedImageUrl } from '@/lib/browser-utils';
import { getSavedCards, persistSavedCards, groupByMonth, getArchiveMonthMood, getArchiveEntryMark } from '@/lib/archive-utils';
import { garamond, caveat, masterSignature } from '@/lib/fonts';

const eagerImageProps = getImageLoadingProps(true);
const lazyImageProps = getImageLoadingProps();
const lowPriorityImageProps = { decoding: 'async' as const, fetchPriority: 'low' as const };

interface ScrollRevealBadgeProps {
  className: string;
  children: React.ReactNode;
  resetTrigger?: string | null;
  as?: 'div' | 'h3';
}

function ScrollRevealBadge({
  className,
  children,
  resetTrigger,
  as: Component = 'div',
}: ScrollRevealBadgeProps) {
  const [prevTrigger, setPrevTrigger] = useState(resetTrigger);
  const [isRevealed, setIsRevealed] = useState(false);

  if (resetTrigger !== prevTrigger) {
    setPrevTrigger(resetTrigger);
    setIsRevealed(false);
  }

  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsRevealed(true);
          }, 60);
          observer.disconnect();
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
    <Component ref={ref as unknown as React.RefObject<HTMLDivElement>} className={`${className} ${isRevealed ? 'is-revealed' : ''}`}>
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

  return (
    <div ref={containerRef} className="relative inline-block text-left select-none">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`top-control-button tab-language p-2 rounded-full border backdrop-blur-sm transition-colors ${
          isOpen
            ? 'border-[#DE6B58] text-[#DE6B58]'
            : isDark
              ? 'border-white/10 text-[#A0A0A0] bg-[#1E1E1E]/55 hover:text-[#DE6B58] hover:border-[#DE6B58]/70'
              : 'border-[#EBE5DB] text-[#8A817C] bg-[#F4F0E6]/60 hover:text-[#DE6B58] hover:border-[#DE6B58]'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Seleziona lingua / Select language"
        data-tooltip={{ IT: 'Lingua', EN: 'Language', FR: 'Langue', DE: 'Sprache', ES: 'Idioma', PT: 'Idioma' }[lingua] || 'Language'}
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
  const getNextField = () => flat[i++] ?? '';
  const santiTradotti = originale.santi.map(() => ({ nome: getNextField(), ruolo: getNextField(), anni: getNextField(), biografia: getNextField() }));
  let j = 9 + originale.santi.length * 4;
  const getNextContentField = () => flat[j++] ?? '';
  return {
    ...originale,
    autore_giorno: flat[0], breve_descrizione: flat[1],
    citazione: { ...originale.citazione, testo: flat[2], fonte: flat[3] },
    parola_giorno: { ...originale.parola_giorno, parola: flat[4], etimologia: flat[5], definizione: flat[6], esempio: flat[7] && flat[7] !== 'null' ? flat[7] : '', nota: flat[8] },
    santi: santiTradotti,
    bibbia: { ...originale.bibbia, testo: getNextContentField(), nota: getNextContentField() },
    poesia: { ...originale.poesia, testo: getNextContentField(), autore: getNextContentField(), fonte: getNextContentField(), nota: getNextContentField() },
    musica: { ...originale.musica, brano: getNextContentField(), autore: getNextContentField(), genere: getNextContentField(), motivo: getNextContentField() },
    avvenimenti: flat.slice(j),
  };
}

export default function Home({ initialLang = 'IT' }: { initialLang?: LanguageCode }) {
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
  const [popoverPos, setPopoverPos] = useState({ top: 0, right: 16 });
  const [savedDrawerPos, setSavedDrawerPos] = useState({ top: 0, right: 16 });
  const [archivio, setArchivio] = useState<ArchivioItem[]>([]);
  const [visitedArchiveDates, setVisitedArchiveDates] = useState<Set<string>>(getSavedVisitedDates);
  const [archivioQuery, setArchivioQuery] = useState('');
  const [dataSelezionata, setDataSelezionata] = useState<string | null>(null);
  const [lingua, setLingua] = useState<LanguageCode>(initialLang);
  const [traducendo, setTraducendo] = useState(false);
  const [erroreTraduzioni, setErroreTraduzioni] = useState<string | null>(null);
  const [archivioHasScroll, setArchivioHasScroll] = useState(false);
  const [archivioAtBottom, setArchivioAtBottom] = useState(false);
  const [showExportCard, setShowExportCard] = useState(false);
  const [showDailyPassport, setShowDailyPassport] = useState(false);
  const [guestbookOpen, setGuestbookOpen] = useState(false);
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
  const [mobileMenuTab, setMobileMenuTab] = useState<'main' | 'lang'>('main');
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
    if (!mobileToolsOpen) {
      const timer = setTimeout(() => {
        setMobileMenuTab('main');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [mobileToolsOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPopoverOpen(false);
        setSavedDrawerOpen(false);
        setMobileToolsOpen(false);
        setShowDailyPassport(false);
        setGuestbookOpen(false);
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

    const sectionIds = ['autore', 'citazione', 'parola', 'santi', 'opera', 'avvenimenti', 'poesia', 'bibbia', 'apod', 'musica']
      .filter((id) => {
        if (id === 'opera') return Boolean(opera);
        if (id === 'apod') return Boolean(apod);
        return true;
      });
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

      const scale = nextProgress / 100;
      const progressEl1 = document.querySelector<HTMLElement>('.notebook-quick-nav-progress');
      const progressEl2 = document.querySelector<HTMLElement>('.mobile-reading-thread-progress > span');
      if (progressEl1) progressEl1.style.transform = `translateX(-50%) scaleY(${scale})`;
      if (progressEl2) progressEl2.style.transform = `scaleX(${scale})`;
      setReadingComplete((current) => current === nextComplete ? current : nextComplete);
      setMobileReadingVisible((current) => {
        const nextVisible = window.scrollY > mobileReadingThreshold;
        return current === nextVisible ? current : nextVisible;
      });
      if (window.scrollY < 120 || scrollDelta < -8) {
        setControlsHidden((prev) => {
          if (!prev) return prev;
          return false;
        });
      } else if (scrollDelta > 8) {
        setControlsHidden((prev) => {
          if (prev) return prev;
          return true;
        });
        setMobileNavOpen((prev) => {
          if (!prev) return prev;
          return false;
        });
        setMobileToolsOpen((prev) => {
          if (!prev) return prev;
          return false;
        });
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
    setError(null); setPopoverOpen(false); setSavedDrawerOpen(false); setTranslationsCache({}); setErroreTraduzioni(null); setShowExportCard(false); setShowDailyPassport(false); setSaintArtwork(null); setMusicCover(null); setApod(null); setApodLoading(false); setIsApodExpanded(false);
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

  // Sincronizza le traduzioni all'avvio o al cambio data dell'archivio se la lingua non è IT
  useEffect(() => {
    if (dataOriginale && lingua !== 'IT') {
      const dateKey = dataOriginale.data || dataSelezionata || 'oggi';
      const cacheKey = `${lingua}:${dateKey}`;
      const cached = translationsCache[cacheKey];
      if (cached) {
        window.setTimeout(() => {
          setData(cached);
        }, 0);
      } else {
        window.setTimeout(() => {
          void cambiaLingua(lingua);
        }, 0);
      }
    }
  }, [dataOriginale, lingua, cambiaLingua, translationsCache, dataSelezionata]);

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
    text: isDark ? 'text-[#D2C9B9]' : 'text-[#2A2522]',
    textMuted: isDark ? 'text-[#9B9285]' : 'text-[#8A817C]',
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

  const dailyAccent = SEAL_COLOR_MAP[currentSealColor] || { color: DEFAULT_DAILY_ACCENT, rgb: '181, 149, 106' };

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
            placeholder={{ IT: 'Cerca autore o data', EN: 'Search author or date', FR: 'Rechercher un auteur ou une date', DE: 'Suche nach Autor oder Datum', ES: 'Buscar autor o fecha', PT: 'Buscar autor ou data' }[lingua] || 'Search author or date'}
            aria-label={{ IT: 'Cerca nell’archivio', EN: 'Search archive', FR: 'Rechercher dans les archives', DE: 'Im Archiv suchen', ES: 'Buscar en el archivo', PT: 'Pesquisar no arquivo' }[lingua] || 'Search archive'}
          />
        </label>
      </div>
      <div className="relative flex-1 min-h-0">
        <div ref={archivioScrollRef} onScroll={checkArchivioScroll} className="archive-scroll overflow-y-auto h-full" style={{ maxHeight: '350px' }}>
          {archivio.length === 0 ? (
            <p className={`text-xs italic ${themeClasses.textMuted} text-center mt-6`}>Nessun giorno in archivio.</p>
          ) : archivioFiltrato.length === 0 ? (
            <p className={`archive-empty text-xs italic ${themeClasses.textMuted}`}>{({ IT: 'Nessun risultato trovato.', EN: 'No results found.', FR: 'Aucun résultat trouvé.', DE: 'Keine Ergebnisse gefunden.', ES: 'No se encontraron resultados.', PT: 'Nenhum risultato encontrado.' }[lingua] || 'No results found.')}</p>
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
                            isSelezionato ? 'is-selected text-[#DE6B58]' : isDark ? 'text-[#D2C9B9]' : 'text-[#2A2522]'
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
      aria-label={{ IT: 'Cose custodite', EN: 'Saved pages', FR: 'Pages sauvegardées', DE: 'Gespeicherte Seiten', ES: 'Páginas guardadas', PT: 'Páginas salvas' }[lingua] || 'Saved pages'}
      className={`saved-cards-drawer ${savedDrawerOpen ? 'is-open' : ''} ${isDark ? 'is-dark' : ''} ${garamond.className}`}
      style={{
        top: `${savedDrawerPos.top}px`,
        right: `${savedDrawerPos.right}px`,
      }}
    >
      <header className="saved-cards-header">
        <div>
          <span className="saved-cards-kicker">{{ IT: 'Il tuo cassetto', EN: 'Your drawer', FR: 'Votre tiroir', DE: 'Deine Schublade', ES: 'Tu cajón', PT: 'Sua gaveta' }[lingua] || 'Your drawer'}</span>
          <h2 className={`${garamond.className} italic font-bold`}>{t('savedPages', lingua)}</h2>
        </div>
        <button type="button" onClick={() => setSavedDrawerOpen(false)} aria-label={t('close', lingua)}>
          <X aria-hidden="true" />
        </button>
      </header>
      {savedCards.length === 0 ? (
        <div className="saved-cards-empty">
          <Bookmark className="h-5 w-5" strokeWidth={1.45} aria-hidden="true" />
          <p>{({ IT: 'Qui ritroverai le schede che vorrai tenere con te.', EN: 'The pages you choose to keep will appear here.', FR: 'Ici vous trouverez les fiches que vous souhaitez conserver.', DE: 'Hier finden Sie die Seiten, die Sie aufbewahren möchten.', ES: 'Aquí encontrarás las fichas que quieras conservar.', PT: 'Aqui você encontrará as páginas que deseja manter.' }[lingua] || 'The pages you choose to keep will appear here.')}</p>
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
                aria-label={`${{ IT: 'Rimuovi', EN: 'Remove', FR: 'Supprimer', DE: 'Entfernen', ES: 'Eliminar', PT: 'Remover' }[lingua] || 'Remove'} ${item.title}`}
                title={{ IT: 'Rimuovi', EN: 'Remove', FR: 'Supprimer', DE: 'Entfernen', ES: 'Eliminar', PT: 'Remover' }[lingua] || 'Remove'}
              >
                <X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <footer>{
        {
          IT: `${savedCards.length} ${savedCards.length === 1 ? 'scheda custodita' : 'schede custodite'}`,
          EN: `${savedCards.length} saved ${savedCards.length === 1 ? 'item' : 'items'}`,
          FR: `${savedCards.length} ${savedCards.length === 1 ? 'fiche gardée' : 'fiches gardées'}`,
          DE: `${savedCards.length} ${savedCards.length === 1 ? 'gespeicherte Seite' : 'gespeicherte Seiten'}`,
          ES: `${savedCards.length} ${savedCards.length === 1 ? 'ficha guardada' : 'fichas guardadas'}`,
          PT: `${savedCards.length} ${savedCards.length === 1 ? 'página salva' : 'páginas salvas'}`
        }[lingua] || `${savedCards.length} saved`
      }</footer>
    </aside>,
    document.body
  ) : null;

  if (loading) return (
    <>
      <LoadingNotebook isDark={isDark} lingua={lingua} />
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
              className={`top-control-button tab-archive p-2 rounded-full border backdrop-blur-sm transition-colors ${
                popoverOpen
                  ? 'border-[#DE6B58] text-[#DE6B58]'
                  : isDark
                    ? 'border-white/10 text-[#A0A0A0] bg-[#1E1E1E]/55 hover:text-[#DE6B58] hover:border-[#DE6B58]/70'
                    : 'border-[#EBE5DB] text-[#8A817C] bg-[#F4F0E6]/60 hover:text-[#DE6B58] hover:border-[#DE6B58]'
              }`}
              aria-label="Archivio"
              data-tooltip={{ IT: 'Archivio', EN: 'Archive', FR: 'Archives', DE: 'Archiv', ES: 'Archivo', PT: 'Arquivo' }[lingua] || 'Archive'}
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
            className={`top-control-button tab-saved p-2 rounded-full border backdrop-blur-sm transition-colors ${
              savedDrawerOpen
                ? 'border-[#DE6B58] text-[#DE6B58]'
                : isDark
                  ? 'border-white/10 text-[#A0A0A0] bg-[#1E1E1E]/55 hover:text-[#DE6B58] hover:border-[#DE6B58]/70'
                  : 'border-[#EBE5DB] text-[#8A817C] bg-[#F4F0E6]/60 hover:text-[#DE6B58] hover:border-[#DE6B58]'
            }`}
            aria-label={{ IT: 'Cose custodite', EN: 'Saved pages', FR: 'Pages sauvegardées', DE: 'Gespeicherte Seiten', ES: 'Páginas guardadas', PT: 'Páginas salvas' }[lingua] || 'Saved pages'}
            data-tooltip={{ IT: 'Cose custodite', EN: 'Saved', FR: 'Pages sauvegardées', DE: 'Gespeichert', ES: 'Guardado', PT: 'Salvo' }[lingua] || 'Saved'}
            aria-expanded={savedDrawerOpen}
            aria-haspopup="dialog"
          >
            {savedCards.length > 0 ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleTheme}
            className={`top-control-button tab-theme p-2 rounded-full border backdrop-blur-sm transition-colors ${
              isDark
                ? 'border-white/10 text-[#A0A0A0] bg-[#1E1E1E]/55 hover:text-[#DE6B58] hover:border-[#DE6B58]/70'
                : 'border-[#EBE5DB] text-[#8A817C] bg-[#F4F0E6]/60 hover:text-[#DE6B58] hover:border-[#DE6B58]'
            }`}
            aria-label="Cambia tema"
            data-tooltip={{ IT: 'Tema', EN: 'Theme', FR: 'Thème', DE: 'Thema', ES: 'Tema', PT: 'Tema' }[lingua] || 'Theme'}
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
            inert={!mobileToolsOpen ? true : undefined}
          >
            {mobileMenuTab === 'main' ? (
              <div className="flex flex-col gap-[3px] animate-menu-fade">
                <button
                  type="button"
                  onClick={() => setMobileMenuTab('lang')}
                  className="w-full"
                >
                  <Languages className="h-4 w-4" />
                  <div className="flex items-center justify-between w-full pr-1">
                    <span>{{ IT: 'Lingua', EN: 'Language', FR: 'Langue', DE: 'Sprache', ES: 'Idioma', PT: 'Idioma' }[lingua] || 'Language'}</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-60 flex items-center gap-0.5 not-italic font-sans">
                      {lingua}
                      <ChevronRight className="w-3 h-3 text-[#DE6B58]" />
                    </span>
                  </div>
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
                    <span>{{ IT: 'Archivio', EN: 'Archive', FR: 'Archives', DE: 'Archiv', ES: 'Archivo', PT: 'Arquivo' }[lingua] || 'Archive'}</span>
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
                  <span>{{ IT: 'Cose custodite', EN: 'Saved pages', FR: 'Pages sauvegardées', DE: 'Gespeicherte Seiten', ES: 'Páginas guardadas', PT: 'Páginas salvas' }[lingua] || 'Saved pages'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileToolsOpen(false);
                    window.dispatchEvent(new Event(TICKET_DOWNLOAD_EVENT));
                  }}
                  aria-label={{ IT: 'Scarica il biglietto', EN: 'Download ticket', FR: 'Télécharger le billet', DE: 'Ticket herunterladen', ES: 'Descargar billete', PT: 'Descarregar bilhete' }[lingua] || 'Download ticket'}
                >
                  <FileDown className="h-4 w-4" />
                  <span>{{ IT: 'Scarica il biglietto', EN: 'Download ticket', FR: 'Télécharger le billet', DE: 'Ticket herunterladen', ES: 'Descargar billete', PT: 'Descarregar bilhete' }[lingua] || 'Download ticket'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileToolsOpen(false);
                    toggleTheme();
                  }}
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span>{
                    {
                      IT: isDark ? 'Tema chiaro' : 'Tema scuro',
                      EN: isDark ? 'Light theme' : 'Dark theme',
                      FR: isDark ? 'Thème clair' : 'Thème sombre',
                      DE: isDark ? 'Helles Thema' : 'Dunkles Thema',
                      ES: isDark ? 'Tema claro' : 'Tema oscuro',
                      PT: isDark ? 'Tema claro' : 'Tema escuro'
                    }[lingua] || (isDark ? 'Light theme' : 'Dark theme')
                  }</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-[3px] animate-menu-fade">
                <button
                  type="button"
                  onClick={() => setMobileMenuTab('main')}
                  className="mobile-tools-back-btn w-full flex items-center justify-between text-left border-b border-stone-200 dark:border-white/5 pb-2.5 mb-1.5 rounded-none"
                >
                  <ChevronLeft className="h-4 w-4 text-[#DE6B58]" />
                  <div className="flex items-center justify-between w-full pr-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] dark:text-[#A0A0A0] not-italic font-sans">
                      {{ IT: 'Lingua', EN: 'Language', FR: 'Langue', DE: 'Sprache', ES: 'Idioma', PT: 'Idioma' }[lingua] || 'Language'}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider opacity-60 flex items-center gap-0.5 not-italic font-sans">
                      {{ IT: 'Indietro', EN: 'Back', FR: 'Retour', DE: 'Zurück', ES: 'Atrás', PT: 'Voltar' }[lingua] || 'Back'}
                    </span>
                  </div>
                </button>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    disabled={traducendo}
                    onClick={() => {
                      setMobileToolsOpen(false);
                      void cambiaLingua(lang.code);
                    }}
                    className={
                      lingua === lang.code
                        ? 'mobile-tools-lang-active'
                        : 'hover:translate-x-0.5'
                    }
                  >
                    {lang.flag}
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            ref={mobileToolsTriggerRef}
            type="button"
            className="mobile-tools-trigger"
            aria-label={{ IT: 'Apri strumenti', EN: 'Open tools', FR: 'Ouvrir les outils', DE: 'Werkzeuge öffnen', ES: 'Abrir herramientas', PT: 'Abrir ferramentas' }[lingua] || 'Open tools'}
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
          {isTurningPage ? ({ IT: 'Cambio giorno in corso', EN: 'Changing day', FR: 'Changement de jour...', DE: 'Tag wird gewechselt...', ES: 'Cambiando de día...', PT: 'Alterando o dia...' }[lingua] || 'Changing day') : ''}
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
          <div className={`daily-thread ${isDark ? 'is-dark' : ''}`} aria-label={{ IT: 'Il filo del giorno', EN: 'The thread of the day', FR: 'Le fil du jour', DE: 'Der Faden des Tages', ES: 'El hilo del día', PT: 'O fio do dia' }[lingua] || 'The thread of the day'}>
            <span className="daily-thread-line" aria-hidden="true" />
            <span className="daily-thread-label">{{ IT: 'Il filo di oggi:', EN: "Today's thread:", FR: 'Le fil d’aujourd’hui :', DE: 'Der Faden von heute:', ES: 'El hilo de hoy:', PT: 'O fio de hoje:' }[lingua] || "Today's thread:"}</span>
            <strong className={`${caveat.className} daily-thread-theme`}>
              <span>{data.parola_giorno.parola}</span>
            </strong>
            <span className="daily-thread-line is-ending" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div> {/* chiude mx-auto flex */}

    <div className="mt-8 animate-fadeInUp stagger-3">
      <Card
        key={`${dataExLibris}:citazione`}
        id="citazione"
        title={t('quoteCard', lingua)}
        icon={Quote}
        isDark={isDark}
        className="scroll-mt-28"
        filename={`citazione-${data.autore_giorno.toLowerCase().replace(/\s+/g, '-')}`}
        isSaved={isCardSaved('citazione')}
        onToggleSaved={() => saveCard('citazione', `${{ IT: 'Citazione di', EN: 'Quote by', FR: 'Citation de', DE: 'Zitat von', ES: 'Cita de', PT: 'Citação de' }[lingua] || 'Quote by'} ${data.citazione.autore}`, data.citazione.testo, data.citazione.fonte)}
      >
        <blockquote className="quote-editorial md:px-8">
          <EditorialQuoteText text={data.citazione.testo} />
          <footer className="quote-editorial-footer text-right text-lg clear-both pt-2">
            <span className="font-bold">{data.citazione.autore}</span>
            <span className={`${themeClasses.textMuted} italic font-medium`}> — {data.citazione.fonte}</span>
          </footer>
        </blockquote>
      </Card>
    </div>

    <div className="flex justify-center mt-6">
      {!showExportCard && (
        <button
          onClick={() => setShowExportCard(true)}
          className={`author-share-trigger ${isDark ? 'is-dark' : ''}`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {{ IT: 'Esporta come immagine', EN: 'Export as image', FR: 'Exporter comme image', DE: 'Als Bild exportieren', ES: 'Exportar como imagen', PT: 'Exportar como imagem' }[lingua] || 'Export as image'}
        </button>
      )}
    </div>

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
          {{
            IT: 'Anteprima della card da condividere (formato 9:16)',
            EN: 'Preview of the shareable card (9:16 format)',
            FR: 'Aperçu de la carte à partager (format 9:16)',
            DE: 'Vorschau der teilbaren Karte (Format 9:16)',
            ES: 'Vista previa de la tarjeta para compartir (formato 9:16)',
            PT: 'Visualização do cartão a partilhar (formato 9:16)'
          }[lingua] || 'Preview of the shareable card (9:16 format)'}
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
            hidePreviewLabel={t('hide', lingua)}
            saveImageLabel={t('save', lingua)}
            lingua={lingua}
          />
        </div>
      </div>
    </div>
  </div> {/* chiude relative z-10 */}
</section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            <Card key={`${dataExLibris}:parola`} id="parola" title={t('wordCard', lingua)} icon={Type} isDark={isDark} className="scroll-mt-28 animate-fadeInUp stagger-4"
              filename={`parola-${data.parola_giorno.parola.toLowerCase()}`}
              isSaved={isCardSaved('parola')}
              onToggleSaved={() => saveCard('parola', data.parola_giorno.parola, data.parola_giorno.definizione, data.parola_giorno.etimologia)}>
              <div className="text-center mb-6">
                <h4 className="card-primary-title text-4xl font-bold text-[#DE6B58] mb-2">{data.parola_giorno.parola}</h4>
                <p className={`card-secondary-meta ${themeClasses.textMuted} italic font-medium text-lg`}>{data.parola_giorno.etimologia}</p>
              </div>
              <p className="card-body-copy text-xl font-medium mb-4"><strong className="font-bold">{{ IT: 'Definizione', EN: 'Definition', FR: 'Définition', DE: 'Definition', ES: 'Definición', PT: 'Definição' }[lingua] || 'Definition'}:</strong> {data.parola_giorno.definizione}</p>
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
                      { IT: 'Fonte iconografica', EN: 'Artwork source', FR: 'Source de l’œuvre', DE: 'Quelle des Kunstwerks', ES: 'Fuente de la obra', PT: 'Fonte da obra' }[lingua] || 'Artwork source',
                      visibleSaintArtwork.title,
                      visibleSaintArtwork.author,
                      visibleSaintArtwork.license,
                    ].filter(Boolean).join(': ')}
                  >
                    {{ IT: 'Iconografia', EN: 'Artwork', FR: 'Iconographie', DE: 'Kunstwerk', ES: 'Iconografía', PT: 'Obra de arte' }[lingua] || 'Artwork'}: {visibleSaintArtwork.source === 'met' ? 'The Met' : 'Wikimedia Commons'} · {visibleSaintArtwork.license}
                  </a>
                ) : null}
              </div>
            </Card>

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
                  <span className="font-bold text-[#DE6B58] text-xs tracking-widest uppercase block mb-1">{{ IT: 'Perché questa scelta', EN: 'Why this choice', FR: 'Pourquoi ce choix', DE: 'Warum diese Wahl', ES: '¿Por qué esta elección?', PT: 'Por que esta escolha' }[lingua] || 'Why this choice'}</span>
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
                  <span className="font-bold text-[#DE6B58] text-xs tracking-widest uppercase block mb-1">{{ IT: 'Il senso del passaggio', EN: 'The meaning of the passage', FR: 'Le sens du passage', DE: 'Die Bedeutung der Passage', ES: 'El sentido del pasaje', PT: 'O sentido da passagem' }[lingua] || 'The meaning of the passage'}</span>
                  {data.bibbia.nota}
                </div>
              )}
            </Card>

            {opera && (
              <Card
                key={`${dataExLibris}:opera`}
                id="opera"
                title={t('artworkCard', lingua)}
                icon={Palette}
                isDark={isDark}
                className="scroll-mt-28 md:col-span-2 animate-fadeInUp stagger-8"
                filename={`opera-${dataExLibris}`}
                isSaved={isCardSaved('opera')}
                onToggleSaved={() => saveCard('opera', opera.titolo, [operaMedium, operaDepartment].filter(Boolean).join(' · '), opera.artista)}
              >
                <div className="opera-postcard grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
                  <div className="opera-postcard-copy space-y-5 order-2 md:order-1">
                    <div>
                      <h4 className="card-primary-title text-3xl md:text-4xl font-bold leading-tight mb-2">{opera.titolo}</h4>
                      <p className="card-byline text-xl font-medium">{{ IT: 'di', EN: 'by', FR: 'par', DE: 'von', ES: 'de', PT: 'de' }[lingua] || 'by'} <span className="font-bold">{opera.artista}</span>{opera.anno ? <span className={`${themeClasses.textMuted} italic`}> — {opera.anno}</span> : null}</p>
                    </div>
                    {(operaMedium || operaDepartment) && <p className={`card-secondary-meta ${themeClasses.textMuted} italic`}>{[operaMedium, operaDepartment].filter(Boolean).join(' · ')}</p>}
                    {operaSourceUrl && (
                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        <a href={operaSourceUrl} target="_blank" rel="noopener noreferrer" className={`editorial-link-button ${isDark ? 'is-dark' : ''}`}>
                          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                          <span>{{ IT: 'Vedi al museo', EN: 'View at the museum', FR: 'Voir au musée', DE: 'Im Museum ansehen', ES: 'Ver en el museo', PT: 'Ver no museu' }[lingua] || 'View at the museum'}</span>
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
                        {{ IT: 'Fonte', EN: 'Source', FR: 'Source', DE: 'Quelle', ES: 'Fuente', PT: 'Fonte' }[lingua] || 'Source'}: {opera.museo}
                        {opera.rights ? ` · ${opera.rights}` : ''}
                      </span>
                    </a>
                  </div>
                </div>
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
                    {{ IT: 'di', EN: 'by', FR: 'par', DE: 'von', ES: 'de', PT: 'de' }[lingua] || 'by'}{' '}
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
                      <span>Spotify</span>
                    </a>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(data.musica.chiave_ricerca)}`}
                      target="_blank" rel="noopener noreferrer"
                      className={`editorial-link-button ${isDark ? 'is-dark' : ''}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                      <span>YouTube</span>
                    </a>
                  </div>
                </div>

              </div>
            </Card>

            {/* ── IMMAGINE ASTRONOMICA ── */}
            {(apod || apodLoading) && (
              <Card
                key={`${dataExLibris}:apod`}
                id="apod"
                isDark={isDark}
                className="scroll-mt-28 md:col-span-2 animate-fadeInUp stagger-10"
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
                      {{ IT: 'Osservo le stelle...', EN: 'Observing the stars...', FR: 'J’observe les étoiles...', DE: 'Sterne beobachten...', ES: 'Observando las estrellas...', PT: 'Observando as estrelas...' }[lingua] || 'Observing the stars...'}
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
                                  {{ IT: 'Anteprima video non disponibile', EN: 'Video preview not available', FR: 'Aperçu vidéo non disponible', DE: 'Videovorschau nicht verfügbar', ES: 'Vista previa de video no disponible', PT: 'Visualização do vídeo não disponível' }[lingua] || 'Video preview not available'}
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
                              {{ IT: 'Crediti:', EN: 'Credit:', FR: 'Crédit :', DE: 'Bildnachweis:', ES: 'Crédito:', PT: 'Créditos:' }[lingua] || 'Credit:'}{' '}
                              <span className="font-bold">{apod.copyright}</span>
                            </p>
                          )}
                          <div className="relative">
                            <p 
                              className={`card-body-copy text-xl font-medium leading-relaxed mb-1 whitespace-pre-line transition-all duration-300 ${
                                !isApodExpanded ? 'max-h-[220px] overflow-hidden' : ''
                              }`}
                              style={!isApodExpanded ? {
                                WebkitMaskImage: 'linear-gradient(to bottom, black 120px, transparent 220px)',
                                maskImage: 'linear-gradient(to bottom, black 120px, transparent 220px)'
                              } : undefined}
                            >
                              {lingua === 'IT' ? apod.explanation_it : apod.explanation_en}
                            </p>
                          </div>
                          
                          <button
                            onClick={() => setIsApodExpanded(!isApodExpanded)}
                            className="mt-2 text-lg font-bold text-[#DE6B58] hover:text-[#c55b4a] transition-colors inline-flex items-center gap-1 cursor-pointer focus:outline-none"
                          >
                            <span>
                              {isApodExpanded 
                                ? ({ IT: 'Mostra meno', EN: 'Show less', FR: 'Voir moins', DE: 'Weniger anzeigen', ES: 'Mostrar menos', PT: 'Mostrar menos' }[lingua] || 'Show less') 
                                : ({ IT: 'Leggi tutto', EN: 'Read more', FR: 'Lire la suite', DE: 'Mehr lesen', ES: 'Leer más', PT: 'Ler mais' }[lingua] || 'Read more')}
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
                <button
                  type="button"
                  onClick={() => setGuestbookOpen(true)}
                  className="journal-footer-link"
                  aria-label={t('leaveAPenny', lingua)}
                >
                  <Mail className="w-4 h-4" />
                  <span>{t('leaveAPenny', lingua)}</span>
                </button>
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

        <GuestbookModal
          isOpen={guestbookOpen}
          onClose={() => setGuestbookOpen(false)}
          isDark={isDark}
          lingua={lingua}
        />

      </div>
    </ParallaxBackground>
  );
}
