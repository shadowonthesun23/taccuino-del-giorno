'use client';

import type { LanguageCode } from '@/lib/types';
import { notebookNavItems } from '@/lib/constants';
import { getSectionLabel } from '@/lib/translation';

export default function NotebookQuickNav({
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
      aria-label={{ IT: 'Sezioni del taccuino', EN: 'Notebook sections', FR: 'Sections du carnet', DE: 'Notizbuchabschnitte', ES: 'Secciones del cuaderno', PT: 'Seções do caderno' }[lingua] || 'Notebook sections'}
      className={`notebook-quick-nav ${isDark ? 'is-dark' : ''} ${readingComplete ? 'is-read' : ''}`}
    >
      <span className="notebook-quick-nav-rail" aria-hidden="true">
        <span className="notebook-quick-nav-progress" />
      </span>
      {visibleItems.map(({ id, icon: Icon, labelIT, labelEN }) => {
        const label = getSectionLabel(id, lingua, labelIT, labelEN);
        return (
          <a key={id} href={`#${id}`} aria-label={label} title={label} data-label={label} aria-current={activeSection === id ? 'true' : undefined}>
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
          </a>
        );
      })}
    </nav>
  );
}
