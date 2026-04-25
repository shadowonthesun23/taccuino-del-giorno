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
    const paperB64 = `data:image/png;base64,${paperBuffer.toString('base64')}`;

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

    const { testo: citTesto, fontSize: citFontSize } = truncateCitation(citazione.testo);

    const svg = await satori(
      React.createElement(
        'div',
        {
          style: {
            width: W,
            height: H,
            backgroundColor: bg,
            backgroundImage: `url(${paperB64})`,
            backgroundRepeat: 'repeat',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '60px 72px 48px',
            boxSizing: 'border-box',
            fontFamily: 'EB Garamond',
          },
        },
        React.createElement(
          'div',
          { style: { display: 'flex', justifyContent: 'center', width: '100%', marginBottom: 18 } },
          React.createElement(
            'div',
            {
              style: {
                fontSize: 60,
                fontFamily: 'Caveat',
                fontWeight: 700,
                color: textMuted,
                background: '#e8dcc6',
                padding: '12px 72px 18px',
                borderRadius: 6,
              },
            },
            dataOdierna
          )
        ),
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
        fotoB64
          ? React.createElement(
              'div',
              {
                style: {
                  transform: 'rotate(-2deg)',
                  marginBottom: 12,
                  background: cardBg,
                  border: `3px solid ${borderColor}`,
                  padding: '24px 24px 60px 24px',
                  boxShadow: '0 12px 48px -12px rgba(0,0,0,0.18)',
                  display: 'flex',
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
        React.createElement(
          'div',
          {
            style: {
              fontSize: 36,
              fontWeight: 400,
              color: textMuted,
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 1.45,
              maxWidth: 870,
              fontFamily: 'EB Garamond',
            },
          },
          breveDescrizione
        ),
        React.createElement('div', {
          style: {
            width: '80%',
            height: 3,
            background: '#b5956a',
            opacity: 0.4,
            borderRadius: 2,
            marginBottom: 24,
          },
        }),
        React.createElement(
          'div',
          {
            style: {
              width: '100%',
              padding: '30px 42px',
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
                fontSize: 90,
                lineHeight: 1,
                color: accent,
                opacity: 0.35,
                fontFamily: 'EB Garamond',
                marginBottom: 6,
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

    // SVG -> PNG via sharp
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    const nomeFile = autoreGiorno
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return new NextResponse(pngBuffer, {
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
