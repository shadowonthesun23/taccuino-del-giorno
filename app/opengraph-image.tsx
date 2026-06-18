import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Il giorno da custodire: cultura quotidiana da leggere con calma e conservare';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const [wordmark, imFellRegular, imFellItalic] = await Promise.all([
    readFile(join(process.cwd(), 'public/fonts/JockyStarline.ttf')),
    readFile(join(process.cwd(), 'public/fonts/IMFellDoublePica-Regular.ttf')),
    readFile(join(process.cwd(), 'public/fonts/IMFellDoublePica-Italic.ttf')),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background:
            'radial-gradient(circle at 16% 18%, rgba(157, 81, 71, 0.1), transparent 24%), radial-gradient(circle at 83% 76%, rgba(82, 102, 108, 0.09), transparent 27%), repeating-linear-gradient(0deg, rgba(117, 91, 57, 0.04) 0 1px, transparent 1px 34px), repeating-linear-gradient(90deg, rgba(117, 91, 57, 0.03) 0 1px, transparent 1px 48px), #f6f1e7',
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
        <div
          style={{
            background: 'rgba(251, 247, 238, 0.58)',
            border: '1px solid rgba(157, 81, 71, 0.26)',
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
            Cultura quotidiana da leggere con calma
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
            Il giorno da custodire
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
              Una frase, una poesia, un’immagine, una parola e una memoria.
            </div>
            <div style={{ display: 'flex' }}>
              Un passaggio di fede. Da custodire sulla carta o nel cuore.
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
