import { renderOpenGraphImage } from '@/app/opengraph-image-shared';

export const alt = 'Um dia para guardar: Cultura quotidiana para ler devagar e guardar';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return renderOpenGraphImage('PT');
}
