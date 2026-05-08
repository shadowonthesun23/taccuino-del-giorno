import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Il Taccuino del Giorno",
  description: "Ogni giorno un taccuino diverso: citazioni, poesia, santi, avvenimenti storici, parola del giorno e musica. Cultura quotidiana, generata automaticamente.",
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">✒️</text></svg>',
  },
  // theme-color dice al browser mobile quale colore usare per la chrome
  // media queries per light/dark mode
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F0E6' },
    { media: '(prefers-color-scheme: dark)', color: '#1E1E1E' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
