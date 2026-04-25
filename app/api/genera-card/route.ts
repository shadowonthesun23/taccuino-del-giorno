import { NextRequest, NextResponse } from 'next/server';
import satori from 'satori';
import sharp from 'sharp';
import { readFile } from 'fs/promises';
import path from 'path';
import React from 'react';

export const runtime = 'nodejs';

const W = 1080;
const H = 1920;

function truncateCitation(testo: string): { testo: string; fontSize: number } {
  const len = testo.length;
  if (len <= 200) return { testo, fontSize: 39 };
  if (len <= 350) return { testo, fontSize: 34 };
  if (len <= 500) {
    const truncated = testo.slice(0, 350).trimEnd();
    return { testo: truncated + (testo.length > 350 ? '\u2026' : ''), fontSize: 31 };
  }
  const truncated = testo.slice(0, 300).trimEnd();
  return { testo: truncated + (testo.length > 300 ? '\u2026' : ''), fontSize: 28 };
}

// Genera SVG washi tape con bordi a zigzag
function makeWashiTapeSvg(text: string, textColor: string): string {
  const W_TAPE = 520;
  const H_TAPE = 90;
  const TOOTH = 10; // ampiezza dente di sega
  const TEETH_L = Math.floor(H_TAPE / TOOTH);

  // Path bordo sinistro zigzag
  let leftPath = `M ${TOOTH},0 `;
  for (let i = 0; i < TEETH_L; i++) {
    const y1 = i * TOOTH;
    const y2 = y1 + TOOTH / 2;
    const y3 = y1 + TOOTH;
    leftPath += `L 0,${y2} L ${TOOTH},${y3} `;
  }
  leftPath += `L ${TOOTH},${H_TAPE} `;

  // Path bordo destro zigzag
  const rx = W_TAPE - TOOTH;
  let rightPath = `L ${rx},${H_TAPE} `;
  for (let i = TEETH_L; i >= 0; i--) {
    const y1 = i * TOOTH;
    const y2 = y1 + TOOTH / 2;
    leftPath; // unused, just building rightPath
    rightPath += `L ${W_TAPE},${y2 > H_TAPE ? H_TAPE : (i * TOOTH + TOOTH / 2)} L ${rx},${i * TOOTH} `;
  }
  rightPath += `Z`;

  const fullPath = leftPath + rightPath;

  const textY = H_TAPE / 2 + 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W_TAPE}" height="${H_TAPE}" viewBox="0 0 ${W_TAPE} ${H_TAPE}">
    <defs>
      <clipPath id="tape-clip">
        <path d="${fullPath}"/>
      </clipPath>
    </defs>
    <rect width="${W_TAPE}" height="${H_TAPE}" fill="#e8dcc6" clip-path="url(#tape-clip)"/>
    <rect width="${W_TAPE}" height="${H_TAPE}" fill="rgba(255,255,255,0.25)" clip-path="url(#tape-clip)"/>
    <text x="${W_TAPE / 2}" y="${textY}" text-anchor="middle" dominant-baseline="middle"
      font-family="Caveat, cursive" font-size="46" font-weight="700" fill="${textColor}">${text}</text>
  </svg>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { autoreGiorno, breveDescrizione, fotoAutoreUrl, citazione, dataOdierna } = body;

    const fontsDir = path.join(process.cwd(), 'public', 'fonts');
    const [garamondRegular, garamondBold, garamondItalic, caveatBold] = await Promise.all([
      readFile(path.join(fontsDir, 'EBGaramond-Regular.ttf')),
      readFile(path.join(fontsDir, 'EBGaramond-Bold.ttf')),
      readFile(path.join(fontsDir, 'EBGaramond-Italic.ttf')),
      readFile(path.join(fontsDir, 'Caveat-Bold.ttf')),
    ]);

    const paperPath = path.join(process.cwd(), 'public', 'beige-paper.png');
    const paperBuffer = await readFile(paperPath);

    let fotoB64: string | null = null;
    if (fotoAutoreUrl) {
      try {
        const res = await fetch(fotoAutoreUrl);
        const buf = await res.arrayBuffer();
        const mime = res.headers.get('content-type') || 'image/jpeg';
        fotoB64 = `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
      } catch {
        fotoB64 = null;
      }
    }

    const bg = '#F4F0E6';
    const textPrimary = '#2A2522';
    const textMuted = '#8A817C';
    const accent = '#DE6B58';
    const cardBg = '#FDFCF8';
    const borderColor = '#EBE5DB';
    const wcColor = '#b5956a';

    const { testo: citTesto, fontSize: citFontSize } = truncateCitation(citazione.testo);

    const dividerSvg = `<svg viewBox="0 0 800 36" xmlns="http://www.w3.org/2000/svg" width="864" height="26"><path d="M 30 20 Q 120 12 220 18 Q 320 24 420 16 Q 520 9 630 19 Q 710 26 770 18" fill="none" stroke="${wcColor}" stroke-width="7" stroke-linecap="round" opacity="0.55"/><path d="M 60 16 Q 180 10 300 15 Q 430 20 550 13 Q 660 8 750 16" fill="none" stroke="${wcColor}" stroke-width="2.5" stroke-linecap="round" opacity="0.3"/><path d="M 100 22 Q 250 28 400 21 Q 550 14 700 23" fill="none" stroke="${wcColor}" stroke-width="3" stroke-linecap="round" opacity="0.18"/></svg>`;
    const dividerB64 = `data:image/svg+xml;base64,${Buffer.from(dividerSvg).toString('base64')}`;

    // Washi tape SVG
    const washiSvg = makeWashiTapeSvg(dataOdierna, textMuted);
    const washiB64 = `data:image/svg+xml;base64,${Buffer.from(washiSvg).toString('base64')}`;

    const svg = await satori(
      React.createElement(
        'div',
        {
          style: {
            width: W,
            height: H,
            backgroundColor: bg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '90px 72px 48px',
            boxSizing: 'border-box',
            fontFamily: 'EB Garamond',
            position: 'relative',
          },
        },
        // Washi tape con zigzag
        React.createElement(
          'div',
          { style: { display: 'flex', justifyContent: 'center', width: '100%', marginBottom: 36 } },
          React.createElement('img', {
            src: washiB64,
            width: 520,
            height: 90,
            style: { display: 'block' },
          })
        ),
        // Etichetta
        React.createElement(
          'div',
          {
            style: {
              fontSize: 33,
              fontWeight: 700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: accent,
              marginBottom: 24,
              fontFamily: 'EB Garamond',
            },
          },
          'Autore del Giorno'
        ),
        // Foto + watermark laterale
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              marginBottom: 12,
              position: 'relative',
            },
          },
          // Polaroid
          fotoB64
            ? React.createElement(
                'div',
                {
                  style: {
                    transform: 'rotate(-2deg)',
                    background: cardBg,
                    border: `3px solid ${borderColor}`,
                    padding: '24px 24px 60px 24px',
                    display: 'flex',
                    boxShadow: '0 8px 24px -6px rgba(0,0,0,0.2)',
                  },
                },
                React.createElement('img', {
                  src: fotoB64,
                  width: 312,
                  height: 396,
                  style: { objectFit: 'cover', filter: 'grayscale(100%)' },
                })
              )
            : null,
          // Watermark verticale
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 18,
                alignSelf: 'center',
              },
            },
            React.createElement(
              'div',
              {
                style: {
                  fontSize: 24,
                  fontFamily: 'EB Garamond',
                  fontWeight: 400,
                  color: textMuted,
                  opacity: 0.5,
                  transform: 'rotate(90deg)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.12em',
                },
              },
              'ig: @antonelloan23'
            )
          )
        ),
        // Nome autore
        React.createElement(
          'div',
          {
            style: {
              fontSize: 78,
              fontWeight: 700,
              color: textPrimary,
              textAlign: 'center',
              marginBottom: 12,
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
              fontSize: 36,
              fontWeight: 400,
              color: textMuted,
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 1.45,
              maxWidth: 870,
              fontFamily: 'EB Garamond',
            },
          },
          breveDescrizione
        ),
        // Divisore watercolor
        React.createElement('img', {
          src: dividerB64,
          width: 864,
          height: 26,
          style: { marginBottom: 20 },
        }),
        // Box citazione
        React.createElement(
          'div',
          {
            style: {
              width: '100%',
              padding: '24px 42px 28px',
              background: cardBg,
              border: `3px solid ${borderColor}`,
              borderRadius: 30,
              display: 'flex',
              flexDirection: 'column',
            },
          },
          React.createElement(
            'div',
            {
              style: {
                fontSize: 80,
                lineHeight: 0.7,
                color: accent,
                opacity: 0.35,
                fontFamily: 'EB Garamond',
                marginBottom: 8,
              },
            },
            '\u201C'
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: citFontSize,
                fontStyle: 'italic',
                fontWeight: 400,
                color: textPrimary,
                lineHeight: 1.55,
                marginBottom: 18,
                fontFamily: 'EB Garamond',
              },
            },
            citTesto
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: 30,
                fontWeight: 700,
                color: textMuted,
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
        ],
      }
    );

    const basePng = await sharp(Buffer.from(svg)).png().toBuffer();

    const paperBright = await sharp(paperBuffer)
      .modulate({ brightness: 3.0, saturation: 0.2 })
      .png()
      .toBuffer();

    const paperTiled = await sharp({
      create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: paperBright, tile: true, blend: 'over' }])
      .ensureAlpha()
      .linear(0.18, 0)
      .png()
      .toBuffer();

    const pngBuffer = await sharp(basePng)
      .composite([{ input: paperTiled, blend: 'soft-light' }])
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
