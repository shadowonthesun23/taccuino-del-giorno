import { renderOpenGraphImage } from '@/app/opengraph-image-shared';

export const alt = 'Il giorno da custodire: cultura quotidiana da leggere con calma e conservare';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return renderOpenGraphImage('IT');
}
