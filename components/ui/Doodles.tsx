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

/** A small phase-faithful moon: a dark lunar disc with a curved illuminated limb. */
export function MoonPhaseGlyph({ phase }: { phase: MoonPhaseId }) {
  const isWaning = phase.startsWith('waning') || phase === 'last-quarter';
  const litPath = phase === 'new'
    ? null
    : phase === 'first-quarter' || phase === 'last-quarter'
      ? 'M50 8A42 42 0 0 1 50 92L50 8Z'
      : phase === 'waxing-crescent' || phase === 'waning-crescent'
        ? 'M50 8A42 42 0 0 1 50 92A24 42 0 0 0 50 8Z'
        : phase === 'waxing-gibbous' || phase === 'waning-gibbous'
          ? 'M50 8A42 42 0 0 1 50 92A30 42 0 0 0 50 8Z'
          : null;

  return (
    <svg className={`moon-phase-glyph ${isWaning ? 'is-waning' : ''}`} viewBox="0 0 100 100" aria-hidden="true">
      <circle className="moon-phase-shadow" cx="50" cy="50" r="41" />
      <g transform={isWaning ? 'translate(100 0) scale(-1 1)' : undefined}>
        {!litPath && phase === 'full' ? <circle className="moon-phase-lit" cx="50" cy="50" r="41" /> : null}
        {litPath ? <path className="moon-phase-lit" d={litPath} /> : null}
        {phase !== 'new' ? (
          <g className="moon-phase-craters">
            <circle cx="59" cy="31" r="4.2" />
            <circle cx="70" cy="58" r="3" />
            <circle cx="46" cy="68" r="2.5" />
          </g>
        ) : null}
      </g>
    </svg>
  );
}
