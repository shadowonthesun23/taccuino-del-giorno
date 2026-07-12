'use client';

import { ChevronUp } from 'lucide-react';
import type { LanguageCode } from '@/lib/types';
import { notebookNavItems } from '@/lib/constants';

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
  const activeLabel = lingua === 'IT' ? activeItem.labelIT : activeItem.labelEN;

  return (
    <div
      className={`mobile-reading-thread ${isDark ? 'is-dark' : ''} ${open ? 'is-open' : ''} ${hidden ? 'is-footer-hidden' : ''}`}
      aria-hidden={hidden}
      inert={hidden ? true : undefined}
    >
      <nav
        id="mobile-reading-thread-menu"
        aria-label={lingua === 'IT' ? 'Indice di lettura' : 'Reading index'}
        className="mobile-reading-thread-menu"
        aria-hidden={!open}
        inert={!open ? true : undefined}
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
