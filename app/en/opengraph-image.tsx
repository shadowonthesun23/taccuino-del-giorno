import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'A day to keep: daily culture to read slowly and cherish';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const [wordmark, imFellRegular, imFellItalic, notebookBackground] = await Promise.all([
    readFile(join(process.cwd(), 'public/fonts/JockyStarline.ttf')),
    readFile(join(process.cwd(), 'public/fonts/IMFellDoublePica-Regular.ttf')),
    readFile(join(process.cwd(), 'public/fonts/IMFellDoublePica-Italic.ttf')),
    readFile(join(process.cwd(), 'public/images/sfondo-taccuino-og.jpg')),
  ]);
  const notebookBackgroundSource = Uint8Array.from(notebookBackground).buffer;

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#f4efe5',
          color: '#2a2522',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '42px',
          position: 'relative',
          width: '100%',
        }}
      >
        <img
          alt=""
          height="630"
          // @ts-expect-error Satori accepts ArrayBuffer image sources at runtime.
          src={notebookBackgroundSource}
          width="1200"
          style={{
            height: '100%',
            inset: 0,
            objectFit: 'cover',
            opacity: 0.28,
            position: 'absolute',
            width: '100%',
          }}
        />
        <div
          style={{
            background:
              'radial-gradient(ellipse 62% 68% at 50% 49%, rgba(250, 247, 239, 0.97) 0%, rgba(250, 247, 239, 0.89) 48%, rgba(246, 240, 227, 0.62) 74%, rgba(246, 240, 227, 0.38) 100%)',
            display: 'flex',
            height: '100%',
            position: 'absolute',
            width: '100%',
          }}
        />
        <div
          style={{
            border: '1px solid rgba(181, 149, 106, 0.34)',
            display: 'flex',
            inset: '28px',
            position: 'absolute',
          }}
        />
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '980px',
            position: 'relative',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: '#9d5147',
              display: 'flex',
              fontFamily: 'IM Fell Double Pica',
              fontSize: 24,
              letterSpacing: '0.16em',
              marginBottom: 26,
              textTransform: 'uppercase',
            }}
          >
            Daily culture to read slowly
          </div>
          <div
            style={{
              color: '#26211f',
              display: 'flex',
              fontFamily: 'Jocky Starline',
              fontSize: 122,
              lineHeight: 1.08,
              padding: '18px 24px 24px',
            }}
          >
            A day to keep
          </div>
          <div
            style={{
              background: '#b5956a',
              display: 'flex',
              height: 2,
              margin: '6px 0 27px',
              opacity: 0.55,
              width: 210,
            }}
          />
          <div
            style={{
              alignItems: 'center',
              color: '#554c47',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'IM Fell Double Pica',
              fontSize: 33,
              fontStyle: 'italic',
              lineHeight: 1.25,
              width: '930px',
            }}
          >
            <div style={{ display: 'flex' }}>
              A line, a poem, an image, a word and a memory.
            </div>
            <div style={{ display: 'flex' }}>
              A passage of faith. To keep on paper or in the heart.
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Jocky Starline',
          data: wordmark,
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
}
