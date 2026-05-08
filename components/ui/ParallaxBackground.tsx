'use client';

import React, { useState, useEffect } from 'react';

export default function ParallaxBackground({ children }: { children: React.ReactNode }) {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // Quanto abbiamo scrollato dall'alto
      const scrollTop = window.scrollY;
      // Altezza totale del documento
      const docHeight = document.documentElement.scrollHeight;
      // Altezza della finestra del browser
      const winHeight = window.innerHeight;
      // Il massimo scroll possibile
      const maxScroll = docHeight - winHeight;

      if (maxScroll > 0) {
        // Calcola una percentuale da 0.0 a 1.0
        setScrollProgress(scrollTop / maxScroll);
      } else {
        setScrollProgress(0);
      }
    };

    // Aggiungiamo i listener per lo scroll e il resize della finestra
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    
    // Inizializzazione al primo render
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-0 w-full h-[150vh] will-change-transform"
          style={{
            // Percorso aggiornato con il nuovo file WebP
            backgroundImage: `url('/images/sfondo-taccuino.webp')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            
            // Il cuore del parallax fluido
            transform: `translateY(-${scrollProgress * 33.33}%)`,
            
            // Regola l'opacità come preferisci (es. 0.15 per un effetto molto leggero)
            opacity: 0.25,
          }}
        />
      </div>
      
      {/* Contenitore automatico per i contenuti principali */}
      <div className="relative z-10">
        {children}
      </div>
    </>
  );
}
