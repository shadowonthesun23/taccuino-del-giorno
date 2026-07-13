import Home from '../page';
import { Metadata } from 'next';

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

const title = "Un jour à garder";
const description = "Chaque jour apporte son lot de choses à ne pas manquer : une phrase, un poème, une image, un mot, un souvenir, un passage de foi. Un espace pour les rassembler, les lire calmement et les garder sur le papier ou dans le cœur.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    locale: "fr_FR",
    siteName: "Un jour à garder",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function FrenchPage() {
  return <Home initialLang="FR" />;
}
