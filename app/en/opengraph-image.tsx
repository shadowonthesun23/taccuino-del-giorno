import { renderOpenGraphImage } from '@/app/opengraph-image-shared';

export const alt = 'A day to keep: daily culture to read slowly and cherish';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return renderOpenGraphImage('EN');
}
