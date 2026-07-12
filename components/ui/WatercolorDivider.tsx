import React from 'react';

export default function WatercolorDivider({ isDark, accentColor }: { isDark: boolean; accentColor?: string }) {
  const color = accentColor ?? (isDark ? '#7a5c38' : '#b5956a');
  return (
    <div aria-hidden="true" className="watercolor-divider w-full flex justify-center pointer-events-none select-none">
      <svg viewBox="0 0 800 36" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-2xl" style={{ height: '26px', display: 'block' }}>
        <defs>
          <filter id="wc-blur" x="-10%" y="-60%" width="120%" height="220%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04 0.3" numOctaves="4" seed={8} result="noise" />
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
            <stop offset="52%" stopColor={color} stopOpacity="1" />
            <stop offset="88%" stopColor={color} stopOpacity="0.72" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="watercolor-stroke stroke-main" d="M 190 20 Q 270 15 348 18 Q 424 21 494 16 Q 560 12 610 18" fill="none" stroke="url(#wc-fade)" strokeWidth="5.5" strokeLinecap="round" opacity="0.58" filter="url(#wc-blur)" />
        <path className="watercolor-stroke stroke-edge" d="M 218 16 Q 308 12 392 15 Q 480 19 582 15" fill="none" stroke="url(#wc-fade)" strokeWidth="1.8" strokeLinecap="round" opacity="0.32" filter="url(#wc-edge)" />
        <path className="watercolor-stroke stroke-ghost" d="M 248 23 Q 355 27 452 21 Q 525 16 574 22" fill="none" stroke="url(#wc-fade)" strokeWidth="2.2" strokeLinecap="round" opacity="0.18" filter="url(#wc-blur)" />
      </svg>
    </div>
  );
}
