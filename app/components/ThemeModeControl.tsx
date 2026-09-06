'use client';

import { useEffect, useRef, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import type { ThemeMode } from '@/lib/browser-utils';

const THEME_MODES: Array<{ mode: ThemeMode; label: string }> = [
  { mode: 'light', label: 'Chiaro' },
  { mode: 'dark', label: 'Scuro' },
  { mode: 'system', label: 'Come il sistema' },
];

function ThemeModeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === 'light') return <Sun aria-hidden="true" />;
  if (mode === 'dark') return <Moon aria-hidden="true" />;
  return <Monitor aria-hidden="true" />;
}

export default function ThemeModeControl() {
  const { themeMode, isDark, setThemeMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = THEME_MODES.find(({ mode }) => mode === themeMode)?.label ?? 'Come il sistema';

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="theme-mode-control">
      <button
        className={`theme-mode-trigger ${isOpen ? 'is-open' : ''}`}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Tema: ${selectedLabel}`}
        title={`Tema: ${selectedLabel}`}
      >
        <ThemeModeIcon mode={themeMode} />
      </button>

      <div
        className={`theme-mode-menu ${isOpen ? 'is-open' : ''} ${isDark ? 'is-dark' : ''}`}
        role="listbox"
        aria-label="Modalità tema"
      >
        {THEME_MODES.map(({ mode, label }) => (
          <button
            key={mode}
            className={`theme-mode-option ${themeMode === mode ? 'is-selected' : ''}`}
            type="button"
            role="option"
            aria-selected={themeMode === mode}
            onClick={() => {
              setThemeMode(mode);
              setIsOpen(false);
            }}
          >
            <ThemeModeIcon mode={mode} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
