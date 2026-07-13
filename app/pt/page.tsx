import Home from '../page';
import { Metadata } from 'next';

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

const title = "Um dia para guardar";
const description = "Cada dia traz consigo algo que vale a pena guardar: uma frase, um poema, uma imagem, uma palavra, uma memória, uma passagem de fé. Um espaço tranquilo para recolhê-los, ler devagar e guardá-los no papel ou no coração.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    locale: "pt_PT",
    siteName: "Um dia para guardar",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function PortuguesePage() {
  return <Home initialLang="PT" />;
}
