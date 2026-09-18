import type { Metadata, Viewport } from 'next';
import { Archivo, Fraunces } from 'next/font/google';

import { fallbackLng } from '@/lib/i18n/settings';

import { LanguageProvider } from '@/components/providers/i18n';
import { ThemeProvider } from '@/components/providers/theme';
import { TooltipProvider } from '@/components/ui/tooltip';

import './globals.css';

const archivo = Archivo({ subsets: ['latin'], variable: '--font-sans' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const title = 'Ludo · Real-time multiplayer board game';
const description =
  'Play Ludo ("Mensch ärgere Dich nicht") online in real time. Open a room, share the link, and start playing - no download or sign-up required.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: 'Ludo',
  keywords: ['Ludo', 'Mensch ärgere Dich nicht', 'board game', 'multiplayer', 'online game', 'real-time'],
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: 'Ludo',
    type: 'website',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/opengraph-image'],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f0e7' },
    { media: '(prefers-color-scheme: dark)', color: '#292524' },
  ],
};

// Intentionally reads no cookies/headers here: doing so in the root layout would opt every page
// in the app into per-request dynamic rendering just to pick a language. The server always
// renders the fallback language; `LanguageProvider` swaps in the visitor's saved language
// client-side, after hydration, based on the `ludo_lng` cookie.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={fallbackLng} suppressHydrationWarning>
      <body className={`${archivo.variable} ${fraunces.variable}`}>
        <LanguageProvider lng={fallbackLng}>
          <ThemeProvider>
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
