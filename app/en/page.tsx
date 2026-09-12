import NotebookHome from '../components/NotebookHome';
import MaintenanceScreen from '../components/MaintenanceScreen';
import { Metadata } from 'next';
import { getMaintenanceEnabled } from '@/lib/maintenance-server';

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

const title = "A day to keep";
const description = "Every day carries something worth keeping: a line, a poem, an image, a word, a memory, a passage of faith. A quiet space to gather them, read slowly, and keep them on paper or in the heart.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    locale: "en_US",
    siteName: "A day to keep",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default async function EnglishPage() {
  if (await getMaintenanceEnabled()) return <MaintenanceScreen locale="EN" />;
  return <NotebookHome initialLang="EN" />;
}
