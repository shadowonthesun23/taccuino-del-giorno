import { renderOpenGraphImage } from '@/app/opengraph-image-shared';

export const alt = 'Un día para guardar: Cultura diaria para leer lentamente y guardar';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return renderOpenGraphImage('ES');
}
