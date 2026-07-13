import Home from '../page';
import { Metadata } from 'next';

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

const title = "Ein Tag zum Bewahren";
const description = "Jeder Tag bringt etwas Wertvolles mit sich: eine Zeile, ein Gedicht, ein Bild, ein Wort, eine Erinnerung, eine Glaubenspassage. Ein stiller Ort, um sie zu sammeln, langsam zu lesen und auf Papier oder im Herzen zu bewahren.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    locale: "de_DE",
    siteName: "Ein Tag zum Bewahren",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function GermanPage() {
  return <Home initialLang="DE" />;
}
