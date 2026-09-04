import { renderOpenGraphImage } from '@/app/opengraph-image-shared';

export const alt = 'Un jour à garder : culture quotidienne à lire calmement et conserver';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return renderOpenGraphImage('FR');
}
