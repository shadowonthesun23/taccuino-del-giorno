import NotebookHome from '../components/NotebookHome';
import MaintenanceScreen from '../components/MaintenanceScreen';
import { Metadata } from 'next';
import { getMaintenanceEnabled } from '@/lib/maintenance-server';

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

const title = "Un día para guardar";
const description = "Cada día trae consigo algo digno de guardar: una frase, un poema, una imagen, una palabra, un recuerdo, un pasaje de fe. Un espacio tranquilo para reunirlos, leer lentamente y guardarlos en papel o en el corazón.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    locale: "es_ES",
    siteName: "Un día para guardar",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default async function SpanishPage() {
  if (await getMaintenanceEnabled()) return <MaintenanceScreen locale="ES" />;
  return <NotebookHome initialLang="ES" />;
}
