import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type OpenGraphLocale = 'IT' | 'EN' | 'FR' | 'DE' | 'ES' | 'PT';

type OpenGraphCopy = {
  eyebrow: string;
  titleLines: string[];
  titleFontSize: number;
  summaryLines: [string, string];
  footer: string;
};

const OPEN_GRAPH_COPY: Record<OpenGraphLocale, OpenGraphCopy> = {
  IT: {
    eyebrow: 'Cultura quotidiana',
    titleLines: ['Il giorno da', 'custodire'],
    titleFontSize: 122,
    summaryLines: [
      'Una frase, una poesia, un’immagine, una parola e una memoria.',
      'Un passaggio di fede. Da custodire sulla carta o nel cuore.',
    ],
    footer: 'Un foglio quotidiano di cultura, memoria e ascolto.',
  },
  EN: {
    eyebrow: 'Daily culture',
    titleLines: ['A day to', 'keep'],
    titleFontSize: 132,
    summaryLines: [
      'A line, a poem, an image, a word and a memory.',
      'A passage of faith. To keep on paper or in the heart.',
    ],
    footer: 'A daily page of culture, memory, and listening.',
  },
  FR: {
    eyebrow: 'Culture quotidienne',
    titleLines: ['Un jour à', 'garder'],
    titleFontSize: 124,
    summaryLines: [
      'Une phrase, un poème, une image, un mot et un souvenir.',
      'Un passage de foi. À garder sur papier ou dans le cœur.',
    ],
    footer: 'Une page quotidienne de culture, de mémoire et d’écoute.',
  },
  DE: {
    eyebrow: 'Tägliche Kultur',
    titleLines: ['Ein Tag zum', 'Bewahren'],
    titleFontSize: 118,
    summaryLines: [
      'Eine Zeile, ein Gedicht, ein Bild, ein Wort und eine Erinnerung.',
      'Eine Glaubenspassage. Auf Papier oder im Herzen zu bewahren.',
    ],
    footer: 'Ein tägliches Blatt für Kultur, Erinnerung und Zuhören.',
  },
  ES: {
    eyebrow: 'Cultura diaria',
    titleLines: ['Un día para', 'guardar'],
    titleFontSize: 120,
    summaryLines: [
      'Una frase, un poema, una imagen, una palabra y un recuerdo.',
      'Un pasaje de fe. Para guardar en papel o en el corazón.',
    ],
    footer: 'Una página diaria de cultura, memoria y escucha.',
  },
  PT: {
    eyebrow: 'Cultura quotidiana',
    titleLines: ['Um dia para', 'guardar'],
    titleFontSize: 116,
    summaryLines: [
      'Uma frase, um poema, uma imagem, uma palavra e uma memória.',
      'Uma passagem de fé. Para guardar no papel ou no coração.',
    ],
    footer: 'Uma página diária de cultura, memória e escuta.',
  },
};

const janeAustFont = readFile(join(process.cwd(), 'public/fonts/JaneAust.ttf'));
const imFellRegularFont = readFile(join(process.cwd(), 'public/fonts/IMFellDoublePica-Regular.ttf'));
const imFellItalicFont = readFile(join(process.cwd(), 'public/fonts/IMFellDoublePica-Italic.ttf'));
const notebookBackgroundSource = readFile(
  join(process.cwd(), 'public/images/sfondo-taccuino-og.jpg'),
  'base64'
).then((data) => `data:image/jpeg;base64,${data}`);

export function renderOpenGraphImage(locale: OpenGraphLocale) {
  return Promise.all([
    janeAustFont,
    imFellRegularFont,
    imFellItalicFont,
    notebookBackgroundSource,
  ]).then(([janeAust, imFellRegular, imFellItalic, notebookBackground]) => {
    const copy = OPEN_GRAPH_COPY[locale];

    return new ImageResponse(
      (
        <div
          style={{
            background: '#f2ebdf',
            color: '#2a2522',
            display: 'flex',
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
            width: '100%',
          }}
        >
          <img
            alt=""
            height="630"
            src={notebookBackground}
            width="1200"
            style={{
              height: '100%',
              inset: 0,
              objectFit: 'cover',
              opacity: 0.1,
              position: 'absolute',
              width: '100%',
            }}
          />
          <div
            style={{
              background:
                'linear-gradient(180deg, rgba(248, 244, 235, 0.96) 0%, rgba(252, 250, 245, 0.96) 48%, rgba(248, 244, 235, 0.97) 100%)',
              display: 'flex',
              inset: 0,
              position: 'absolute',
            }}
          />
          <div
            style={{
              background: 'rgba(255, 252, 246, 0.82)',
              border: '1px solid rgba(104, 73, 50, 0.14)',
              display: 'flex',
              inset: '44px 56px',
              position: 'absolute',
            }}
          />
          <div
            style={{
              border: '1px solid rgba(181, 149, 106, 0.36)',
              display: 'flex',
              inset: '25px',
              position: 'absolute',
            }}
          />
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              justifyContent: 'space-between',
              left: '88px',
              position: 'absolute',
              right: '88px',
              top: '69px',
            }}
          >
            <div
              style={{
                alignItems: 'flex-start',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  color: '#754f40',
                  display: 'flex',
                  fontFamily: 'IM Fell Double Pica',
                  fontSize: 19,
                  letterSpacing: '0.19em',
                }}
              >
                DAY ATLAS
              </div>
              <div
                style={{
                  background: '#a75545',
                  display: 'flex',
                  height: 1,
                  marginTop: 8,
                  opacity: 0.58,
                  width: 70,
                }}
              />
            </div>
            <div
              style={{
                color: '#8b604b',
                display: 'flex',
                fontFamily: 'IM Fell Double Pica',
                fontSize: 18,
                letterSpacing: '0.13em',
                textTransform: 'uppercase',
              }}
            >
              {copy.eyebrow}
            </div>
          </div>
          <div
            style={{
              alignItems: 'center',
              bottom: '92px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              left: '80px',
              position: 'absolute',
              right: '80px',
              top: '126px',
            }}
          >
            <div
              style={{
                alignItems: 'center',
                color: '#24201d',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'JaneAusten',
                fontSize: copy.titleFontSize,
                letterSpacing: '0.012em',
                lineHeight: 0.86,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {copy.titleLines.map((line) => (
                <div key={line} style={{ display: 'flex' }}>
                  {line}
                </div>
              ))}
            </div>
            <div
              style={{
                alignItems: 'center',
                display: 'flex',
                height: 10,
                justifyContent: 'center',
                marginBottom: 18,
                marginTop: 18,
                width: 250,
              }}
            >
              <div
                style={{
                  background: '#b5956a',
                  display: 'flex',
                  height: 2,
                  opacity: 0.5,
                  width: 92,
                }}
              />
              <div
                style={{
                  background: '#a75545',
                  borderRadius: '50%',
                  display: 'flex',
                  height: 7,
                  marginLeft: 13,
                  marginRight: 13,
                  opacity: 0.76,
                  width: 7,
                }}
              />
              <div
                style={{
                  background: '#b5956a',
                  display: 'flex',
                  height: 2,
                  opacity: 0.5,
                  width: 92,
                }}
              />
            </div>
            <div
              style={{
                alignItems: 'center',
                color: '#554c47',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'IM Fell Double Pica',
                fontSize: 30,
                fontStyle: 'italic',
                lineHeight: 1.22,
                textAlign: 'center',
                width: '1000px',
              }}
            >
              {copy.summaryLines.map((line) => (
                <div key={line} style={{ display: 'flex', whiteSpace: 'nowrap' }}>
                  {line}
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              alignItems: 'flex-end',
              bottom: '64px',
              display: 'flex',
              justifyContent: 'space-between',
              left: '88px',
              position: 'absolute',
              right: '88px',
            }}
          >
            <div
              style={{
                color: '#715f53',
                display: 'flex',
                fontFamily: 'IM Fell Double Pica',
                fontSize: 17,
                fontStyle: 'italic',
              }}
            >
              {copy.footer}
            </div>
            <div
              style={{
                color: '#87694d',
                display: 'flex',
                fontFamily: 'IM Fell Double Pica',
                fontSize: 15,
                letterSpacing: '0.1em',
              }}
            >
              dayatlas.vercel.app
            </div>
          </div>
        </div>
      ),
      {
        height: 630,
        width: 1200,
        fonts: [
          {
            name: 'JaneAusten',
            data: janeAust,
            style: 'normal',
            weight: 400,
          },
          {
            name: 'IM Fell Double Pica',
            data: imFellRegular,
            style: 'normal',
            weight: 400,
          },
          {
            name: 'IM Fell Double Pica',
            data: imFellItalic,
            style: 'italic',
            weight: 400,
          },
        ],
      }
    );
  });
}
