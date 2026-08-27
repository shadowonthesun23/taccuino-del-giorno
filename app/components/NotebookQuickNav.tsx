'use client';

import { createPortal } from 'react-dom';
import type { LanguageCode } from '@/lib/types';
import { notebookNavItems, OPEN_EPHEMERIS_EVENT } from '@/lib/constants';
import { getSectionLabel } from '@/lib/translation';

export default function NotebookQuickNav({
  isDark,
  lingua,
  hasOpera,
  hasApod,
  activeSection,
  readingComplete,
  isMounted,
}: {
  isDark: boolean;
  lingua: LanguageCode;
  hasOpera: boolean;
  hasApod: boolean;
  activeSection: string;
  readingComplete: boolean;
  isMounted: boolean;
}) {
  const visibleItems = notebookNavItems.filter((item) => {
    if (item.id === 'opera') return hasOpera;
    if (item.id === 'apod') return hasApod;
    return true;
  });

  const navigation = (
    <nav
      aria-label={{ IT: 'Sezioni del taccuino', EN: 'Notebook sections', FR: 'Sections du carnet', DE: 'Notizbuchabschnitte', ES: 'Secciones del cuaderno', PT: 'Seções do caderno' }[lingua] || 'Notebook sections'}
      className={`notebook-quick-nav ${isDark ? 'is-dark' : ''} ${readingComplete ? 'is-read' : ''}`}
    >
      <span className="notebook-quick-nav-rail" aria-hidden="true">
        <span className="notebook-quick-nav-progress" />
      </span>
      {visibleItems.map(({ id, icon: Icon, labelIT, labelEN }) => {
        const label = getSectionLabel(id, lingua, labelIT, labelEN);
        return (
          <a
            key={id}
            href={`#${id}`}
            aria-label={label}
            title={label}
            data-label={label}
            aria-current={activeSection === id ? 'true' : undefined}
            onClick={(event) => {
              if (id !== 'effemeridi' || !window.matchMedia('(min-width: 1180px)').matches) return;
              event.preventDefault();
              window.dispatchEvent(new Event(OPEN_EPHEMERIS_EVENT));
            }}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
          </a>
        );
      })}
    </nav>
  );

  return isMounted ? createPortal(navigation, document.body) : null;
}
