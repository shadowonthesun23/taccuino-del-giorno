import type { Metadata, Viewport } from "next";
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

const themeBootstrapScript = `
(() => {
  try {
    const savedTheme = localStorage.getItem('theme');
    const dark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const scheme = dark ? 'dark' : 'light';
    const color = dark ? '#1E1E1E' : '#F4F0E6';
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.dataset.theme = scheme;
    root.style.backgroundColor = color;
    root.style.colorScheme = scheme;
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', color);
    });
    document.body.style.backgroundColor = color;
    document.body.style.colorScheme = scheme;
  } catch (_) {}
})();
`;

export const metadata: Metadata = {
  title: "Il Taccuino del Giorno",
  description: "Ogni giorno un taccuino diverso: citazioni, poesia, santi, avvenimenti storici, parola del giorno e musica. Cultura quotidiana, generata automaticamente.",
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">✒️</text></svg>',
  },
};

export const viewport: Viewport = {
  // theme-color dice al browser mobile quale colore usare per la chrome
  // media queries per light/dark mode
  viewportFit: 'cover',
  colorScheme: 'light dark',
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
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
