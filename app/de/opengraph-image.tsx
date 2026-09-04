import { renderOpenGraphImage } from '@/app/opengraph-image-shared';

export const alt = 'Ein Tag zum Bewahren: Tägliche Kultur zum langsamen Lesen und Bewahren';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return renderOpenGraphImage('DE');
}
