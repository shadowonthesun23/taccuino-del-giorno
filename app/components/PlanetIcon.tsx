const PLANET_ICON_SOURCES: Record<string, string> = {
  Venus: '/images/planet-icons/venere.svg',
  Mars: '/images/planet-icons/marte.svg',
  Saturn: '/images/planet-icons/saturno.svg',
  Jupiter: '/images/planet-icons/giove.svg',
};

interface PlanetIconProps {
  body: string;
}

export default function PlanetIcon({ body }: PlanetIconProps) {
  const bodyClass = `planet-${body.toLowerCase()}`;
  const source = PLANET_ICON_SOURCES[body];

  if (source) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element -- local hand-drawn planet artwork is decorative and must also render in DOM exports */
      <img
        className={`correspondence-planet-icon ${bodyClass}`}
        src={source}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    );
  }

  return <span className={`correspondence-planet-icon correspondence-planet-fallback ${bodyClass}`} aria-hidden="true" />;
}
