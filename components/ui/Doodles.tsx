import type { MoonPhaseId } from '@/lib/types';

export function DoodleArrow({ isDark = false }: { isDark?: boolean }) {
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

export function MoonDoodle({ phase }: { phase: MoonPhaseId }) {
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
