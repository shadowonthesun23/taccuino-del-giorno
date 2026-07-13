'use client';

import { ChevronUp } from 'lucide-react';
import type { LanguageCode } from '@/lib/types';
import { notebookNavItems } from '@/lib/constants';
import { getSectionLabel } from '@/lib/translation';

export default function MobileReadingThread({
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
  const activeLabel = getSectionLabel(activeItem.id, lingua, activeItem.labelIT, activeItem.labelEN);

  return (
    <div
      className={`mobile-reading-thread ${isDark ? 'is-dark' : ''} ${open ? 'is-open' : ''} ${hidden ? 'is-footer-hidden' : ''}`}
      aria-hidden={hidden}
      inert={hidden ? true : undefined}
    >
      <nav
        id="mobile-reading-thread-menu"
        aria-label={{ IT: 'Indice di lettura', EN: 'Reading index', FR: 'Indice de lecture', DE: 'Leseindex', ES: 'Índice de lectura', PT: 'Índice de leitura' }[lingua] || 'Reading index'}
        className="mobile-reading-thread-menu"
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        {visibleItems.map(({ id, icon: Icon, labelIT, labelEN }) => {
          const label = getSectionLabel(id, lingua, labelIT, labelEN);
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
          <small>{{ IT: 'Filo di lettura', EN: 'Reading thread', FR: 'Fil de lecture', DE: 'Lesefaden', ES: 'Hilo de lectura', PT: 'Fio de leitura' }[lingua] || 'Reading thread'}</small>
          <strong>{activeLabel}</strong>
        </span>
        <ChevronUp className="mobile-reading-thread-chevron h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
      </button>
    </div>
  );
}
