import { NextRequest, NextResponse } from 'next/server';
import satori from 'satori';
import sharp from 'sharp';
import { readFile } from 'fs/promises';
import path from 'path';
import React from 'react';
import { clampText, getAuthorCardLayout, getAuthorCardPalette, getAuthorInitials } from '@/app/lib/authorCardDesign';

export const runtime = 'nodejs';

const W = 1080;
const H = 1920;

function makeWashiTapeSvg(bgColor: string, tapeColor: string, width: number, height: number): string {
  const TW = width;
  const TH = height;
  const p = (x: number, y: number) => `${Math.round(TW * x)},${Math.round(TH * y)}`;
  const points = [
    p(0.01, 0.06), p(0.09, 0.02), p(0.24, 0.04), p(0.41, 0.01),
    p(0.62, 0.03), p(0.8, 0.01), p(0.99, 0.05), p(0.98, 0.15),
    p(1, 0.28), p(0.98, 0.41), p(1, 0.54), p(0.98, 0.68),
    p(1, 0.84), p(0.98, 0.96), p(0.82, 0.98), p(0.63, 0.96),
    p(0.48, 0.99), p(0.27, 0.96), p(0.08, 0.98), p(0.01, 0.94),
    p(0.02, 0.82), p(0, 0.68), p(0.02, 0.55), p(0, 0.4),
    p(0.02, 0.27), p(0, 0.14),
  ].join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}" viewBox="0 0 ${TW} ${TH}">
  <defs>
    <linearGradient id="wash" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#fffbe6" stop-opacity="0.52"/>
      <stop offset="0.48" stop-color="${tapeColor}" stop-opacity="0.88"/>
      <stop offset="1" stop-color="#c9ad75" stop-opacity="0.78"/>
    </linearGradient>
  </defs>
  <rect width="${TW}" height="${TH}" fill="${bgColor}" opacity="0"/>
  <polygon points="${points}" fill="url(#wash)"/>
  <polygon points="${points}" fill="rgba(255,255,255,0.12)"/>
  <path d="M ${TW * 0.08} ${TH * 0.24} C ${TW * 0.34} ${TH * 0.12}, ${TW * 0.58} ${TH * 0.28}, ${TW * 0.92} ${TH * 0.16}" fill="none" stroke="rgba(255,255,246,0.34)" stroke-width="3"/>
  <path d="M ${TW * 0.08} ${TH * 0.86} C ${TW * 0.38} ${TH * 0.96}, ${TW * 0.6} ${TH * 0.78}, ${TW * 0.92} ${TH * 0.9}" fill="none" stroke="rgba(80,58,33,0.16)" stroke-width="2"/>
</svg>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { autoreGiorno, breveDescrizione, fotoAutoreUrl, citazione, dataOdierna, isDark = false } = body;

    const palette = getAuthorCardPalette(Boolean(isDark));
    const layout = getAuthorCardLayout(citazione.testo, breveDescrizione);
    const citTesto = clampText(citazione.testo, layout.maxCitationChars);
    const descTesto = clampText(breveDescrizione, layout.maxDescriptionChars);
    const initials = getAuthorInitials(autoreGiorno).slice(0, 3) || 'TDG';

    const fontsDir = path.join(process.cwd(), 'public', 'fonts');
    const [garamondRegular, garamondBold, garamondItalic, caveatBold, stampwriterRegular] = await Promise.all([
      readFile(path.join(fontsDir, 'EBGaramond-Regular.ttf')),
      readFile(path.join(fontsDir, 'EBGaramond-Bold.ttf')),
      readFile(path.join(fontsDir, 'EBGaramond-Italic.ttf')),
      readFile(path.join(fontsDir, 'Caveat-Bold.ttf')),
      readFile(path.join(fontsDir, 'STAMPWRITER-KIT.ttf')),
    ]);

    const paperPath = path.join(process.cwd(), 'public', 'beige-paper.png');
    const paperBuffer = await readFile(paperPath);
    const backgroundPath = path.join(process.cwd(), 'public', 'images', 'sfondo-taccuino.webp');
    const backgroundBuffer = await readFile(backgroundPath);
    const backgroundPng = await sharp(backgroundBuffer)
      .resize(W, H, { fit: 'cover' })
      .modulate({
        brightness: palette.tone === 'dark' ? 0.76 : 1.16,
        saturation: palette.tone === 'dark' ? 0.22 : 0.58,
      })
      .png()
      .toBuffer();
    const backgroundB64 = `data:image/png;base64,${backgroundPng.toString('base64')}`;

    let fotoB64: string | null = null;
    if (fotoAutoreUrl) {
      try {
        const res = await fetch(fotoAutoreUrl);
        const buf = await res.arrayBuffer();
        const photoPng = await sharp(Buffer.from(buf))
          .resize(layout.photoWidth * 2, layout.photoHeight * 2, { fit: 'cover' })
          .grayscale()
          .modulate({ brightness: 1.04 })
          .png()
          .toBuffer();
        fotoB64 = `data:image/png;base64,${photoPng.toString('base64')}`;
      } catch {
        fotoB64 = null;
      }
    }

    const dividerSvg = `<svg viewBox="0 0 800 36" xmlns="http://www.w3.org/2000/svg" width="864" height="26"><path d="M 30 20 Q 120 12 220 18 Q 320 24 420 16 Q 520 9 630 19 Q 710 26 770 18" fill="none" stroke="${palette.wcColor}" stroke-width="7" stroke-linecap="round" opacity="0.55"/><path d="M 60 16 Q 180 10 300 15 Q 430 20 550 13 Q 660 8 750 16" fill="none" stroke="${palette.wcColor}" stroke-width="2.5" stroke-linecap="round" opacity="0.3"/><path d="M 100 22 Q 250 28 400 21 Q 550 14 700 23" fill="none" stroke="${palette.wcColor}" stroke-width="3" stroke-linecap="round" opacity="0.18"/></svg>`;
    const dividerB64 = `data:image/svg+xml;base64,${Buffer.from(dividerSvg).toString('base64')}`;

    // Tape con tacche verso l'interno, passando il colore bg per le tacche
    const washiSvg = makeWashiTapeSvg(palette.bg, palette.tapeBg, layout.tapeWidth, layout.tapeHeight);
    const washiB64 = `data:image/svg+xml;base64,${Buffer.from(washiSvg).toString('base64')}`;

    const svg = await satori(
      React.createElement(
        'div',
        {
          style: {
            width: W,
            height: H,
            backgroundColor: palette.bg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: `${layout.topPadding}px ${layout.sidePadding}px ${layout.bottomPadding}px`,
            boxSizing: 'border-box',
            fontFamily: 'EB Garamond',
            position: 'relative',
            overflow: 'hidden',
          },
        },
        React.createElement('img', {
          src: backgroundB64,
          width: W,
          height: H,
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: W,
            height: H,
            objectFit: 'cover',
            opacity: palette.imageOpacity,
          },
        }),
        React.createElement('div', {
          style: {
            position: 'absolute',
            top: 64,
            left: 44,
            right: 44,
            bottom: 54,
            borderRadius: 46,
            background: palette.spotlight,
            boxShadow: palette.tone === 'dark'
              ? '0 0 120px 96px rgba(30,30,30,0.54)'
              : '0 0 120px 96px rgba(255,252,242,0.36)',
          },
        }),
        React.createElement(
          'div',
          {
            style: {
              position: 'absolute',
              bottom: 128,
              left: 392,
              width: 296,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: 'rotate(-0.8deg)',
              color: palette.textMuted,
              opacity: palette.tone === 'dark' ? 0.38 : 0.46,
            },
          },
          React.createElement(
            'div',
            {
              style: {
                fontSize: 26,
                fontFamily: 'Stampwriter',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              },
            },
            'Il giorno da custodire'
          ),
          React.createElement('div', {
            style: {
              height: 1,
              marginTop: 12,
              width: 260,
              background: palette.wcColor,
              opacity: 0.42,
            },
          })
        ),
        // Washi tape
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'center',
              width: '100%',
              marginBottom: layout.tapeMarginBottom,
              position: 'relative',
              height: layout.tapeHeight,
            },
          },
          React.createElement('img', {
            src: washiB64,
            width: layout.tapeWidth,
            height: layout.tapeHeight,
            style: { transform: 'rotate(-2deg)' },
          }),
          // Testo data sopra il tape — Satori con Caveat
          React.createElement(
            'div',
            {
              style: {
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              },
            },
            React.createElement(
              'div',
              {
                style: {
                  fontSize: layout.dateFontSize,
                  fontFamily: 'Caveat',
                  fontWeight: 700,
                  color: palette.tapeText,
                  transform: 'rotate(-2deg)',
                },
              },
              dataOdierna
            )
          )
        ),
        // Nastro sezione
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'center',
              width: '100%',
              height: 76,
              marginBottom: layout.labelMarginBottom,
              position: 'relative',
              zIndex: 2,
            },
          },
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 438,
                padding: '0 34px',
                background: palette.labelTapeBg,
                border: '2px solid rgba(109,42,36,0.18)',
                borderRadius: 7,
                boxShadow: palette.tone === 'dark'
                  ? '0 14px 28px -24px rgba(0,0,0,0.88), inset 0 1px 0 rgba(255,255,255,0.18)'
                  : '0 12px 28px -24px rgba(117,55,46,0.52), inset 0 1px 0 rgba(255,255,255,0.28)',
                color: palette.labelTapeText,
                fontSize: layout.labelFontSize + 2,
                fontFamily: 'Stampwriter',
                fontWeight: 400,
                letterSpacing: '0.035em',
                transform: 'rotate(-1.2deg)',
              },
            },
            'Autore del giorno'
          )
        ),
        // Watermark verticale — figlio diretto del root (position:relative),
        // right:0 = vero bordo destro della card
        React.createElement(
          'div',
          {
            style: {
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          },
          React.createElement(
            'div',
            {
              style: {
                fontSize: 22,
                fontFamily: 'EB Garamond',
                fontWeight: 400,
                color: palette.textMuted,
                opacity: 0.45,
                transform: 'rotate(90deg)',
                whiteSpace: 'nowrap',
                letterSpacing: '0.15em',
              },
            },
            'ig: @antonelloan23'
          )
        ),
        // Contenitore foto
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'center',
              width: '100%',
              marginBottom: layout.photoMarginBottom,
              position: 'relative',
              zIndex: 1,
            },
          },
          React.createElement(
            'div',
            {
              style: {
                transform: fotoB64 ? 'rotate(-2deg)' : 'rotate(1.2deg)',
                background: palette.tone === 'dark' ? '#F4F0E6' : '#FDFCF8',
                border: `3px solid ${palette.tone === 'dark' ? '#D8CDBC' : palette.borderColor}`,
                padding: `${layout.photoPaddingTop}px ${layout.photoPaddingX}px ${layout.photoPaddingBottom}px`,
                display: 'flex',
                boxShadow: palette.photoShadow,
              },
            },
            fotoB64
              ? React.createElement('img', {
                  src: fotoB64,
                  width: layout.photoWidth,
                  height: layout.photoHeight,
                  style: { objectFit: 'cover', filter: 'grayscale(100%) contrast(92%) brightness(1.04)' },
                })
              : React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: layout.photoWidth,
                      height: layout.photoHeight,
                      background: palette.tone === 'dark' ? '#EDE5D8' : '#F6F0E5',
                      color: '#8B6D4E',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        color: '#B85045',
                        fontSize: 28,
                        fontFamily: 'Stampwriter',
                        letterSpacing: '0.18em',
                        marginBottom: 22,
                        textTransform: 'uppercase',
                      },
                    },
                    'Ex Libris'
                  ),
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '3px solid rgba(139,109,78,0.42)',
                        borderRadius: 999,
                        color: '#654B35',
                        fontSize: 74,
                        fontFamily: 'EB Garamond',
                        fontWeight: 700,
                        height: 150,
                        width: 150,
                      },
                    },
                    initials
                  )
                )
          )
        ),
        // Nome autore
        React.createElement(
          'div',
          {
            style: {
              fontSize: layout.authorFontSize,
              fontWeight: 700,
              color: palette.textPrimary,
              textAlign: 'center',
              marginBottom: layout.authorMarginBottom,
              lineHeight: 1.1,
              fontFamily: 'EB Garamond',
            },
          },
          autoreGiorno
        ),
        // Descrizione
        React.createElement(
          'div',
          {
            style: {
              fontSize: layout.descFontSize,
              fontWeight: 400,
              color: palette.textBody,
              textAlign: 'center',
              marginBottom: layout.descMarginBottom,
              lineHeight: layout.descLineHeight,
              maxWidth: layout.descMaxWidth,
              fontFamily: 'EB Garamond',
            },
          },
          descTesto
        ),
        // Divisore
        React.createElement('img', {
          src: dividerB64,
          width: 864,
          height: 26,
          style: { marginBottom: layout.dividerMarginBottom },
        }),
        // Box citazione
        React.createElement(
          'div',
          {
            style: {
              width: '100%',
              padding: `${layout.quotePaddingY}px ${layout.quotePaddingX}px ${layout.quotePaddingY + 2}px ${layout.quotePaddingX + 18}px`,
              background: palette.cardBg,
              border: '0',
              borderRadius: layout.quoteRadius,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: `${palette.quoteShadow}, ${palette.quoteInset}`,
            },
          },
          React.createElement(
            'div',
            {
              style: {
                fontSize: layout.quoteMarkFontSize,
                lineHeight: 0.7,
                color: palette.accent,
                opacity: 0.35,
                fontFamily: 'EB Garamond',
                marginBottom: layout.quoteMarkMarginBottom,
              },
            },
            '\u201C'
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: layout.quoteFontSize,
                fontStyle: 'italic',
                fontWeight: 400,
                color: palette.textPrimary,
                lineHeight: layout.quoteLineHeight,
                marginBottom: layout.quoteMarginBottom,
                fontFamily: 'EB Garamond',
              },
            },
            citTesto
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: layout.sourceFontSize,
                fontWeight: 700,
                color: palette.textMuted,
                textAlign: 'right',
                fontFamily: 'EB Garamond',
              },
            },
            `\u2014 ${citazione.autore}${citazione.fonte ? `, ${citazione.fonte}` : ''}`
          )
        )
      ),
      {
        width: W,
        height: H,
        fonts: [
          { name: 'EB Garamond', data: garamondRegular, weight: 400, style: 'normal' },
          { name: 'EB Garamond', data: garamondBold, weight: 700, style: 'normal' },
          { name: 'EB Garamond', data: garamondItalic, weight: 400, style: 'italic' },
          { name: 'Caveat', data: caveatBold, weight: 700, style: 'normal' },
          { name: 'Stampwriter', data: stampwriterRegular, weight: 400, style: 'normal' },
        ],
      }
    );

    const basePng = await sharp(Buffer.from(svg)).png().toBuffer();

    const paperBright = await sharp(paperBuffer)
      .modulate({ brightness: palette.paperBrightness, saturation: palette.paperSaturation })
      .png()
      .toBuffer();

    const paperTiled = await sharp({
      create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: paperBright, tile: true, blend: 'over' }])
      .ensureAlpha()
      .linear(palette.paperOpacity, 0)
      .png()
      .toBuffer();

    const pngBuffer = await sharp(basePng)
      .composite([{ input: paperTiled, blend: palette.tone === 'dark' ? 'screen' : 'soft-light' }])
      .png()
      .toBuffer();

    const nomeFile = autoreGiorno
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="taccuino-${nomeFile}.png"`,
      },
    });
  } catch (err) {
    console.error('Errore genera-card:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
