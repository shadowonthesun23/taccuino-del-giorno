'use client';

import React, { useState, useEffect } from 'react';

export default function ParallaxBackground({ children }: { children: React.ReactNode }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Legge la classe dark dall'elemento html per sincronizzarsi con il tema
    const update = () => setDark(document.documentElement.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const maxScroll = docHeight - winHeight;
      setScrollProgress(maxScroll > 0 ? scrollTop / maxScroll : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const bgColor = dark ? '#201F1D' : '#F4F0E6';
  const imageOpacity = dark ? 0.44 : 0.2;
  const imageFilter = dark ? 'grayscale(1) brightness(0.52) contrast(1.08)' : 'none';

  return (
    <>
      {/* Sfondo solido che copre tutta la viewport incluse le barre Safari iOS */}
      <div
        className="safe-viewport-backdrop fixed z-0 pointer-events-none"
        style={{ backgroundColor: bgColor, transition: 'background-color 300ms' }}
      />

      {/* Immagine parallax sovrapposta */}
      <div className="safe-viewport-backdrop fixed z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-0 w-full h-[150vh] will-change-transform"
          style={{
            backgroundImage: `url('/images/sfondo-taccuino.webp')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            transform: `translateY(-${scrollProgress * 33.33}%)`,
            filter: imageFilter,
            opacity: imageOpacity,
          }}
        />
      </div>

      {/* Contenuto */}
      <div className="relative z-10">
        {children}
      </div>
    </>
  );
}
