import type { Metadata, Viewport } from 'next';
import { Lilita_One, Nunito } from 'next/font/google';

import { fallbackLng } from '@/lib/i18n/settings';

import { LanguageProvider } from '@/components/providers/i18n';
import { SoundProvider } from '@/components/providers/sound';
import { ThemeProvider } from '@/components/providers/theme';
import { SiteFooter } from '@/components/site-footer';
import { SiteNavbar } from '@/components/site-navbar';
import { TooltipProvider } from '@/components/ui/tooltip';

import './globals.css';

const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' });
const lilita = Lilita_One({ subsets: ['latin'], weight: '400', variable: '--font-lilita' });

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
    { media: '(prefers-color-scheme: light)', color: '#fdf2d8' },
    { media: '(prefers-color-scheme: dark)', color: '#191430' },
  ],
};

// Intentionally reads no cookies/headers here: doing so in the root layout would opt every page
// in the app into per-request dynamic rendering just to pick a language. The server always
// renders the fallback language; `LanguageProvider` swaps in the visitor's saved language
// client-side, after hydration, based on the `ludo_lng` cookie.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={fallbackLng} suppressHydrationWarning>
      <body className={`${nunito.variable} ${lilita.variable}`}>
        <LanguageProvider lng={fallbackLng}>
          <ThemeProvider>
            <SoundProvider>
              <TooltipProvider delayDuration={200}>
                {/* One navbar, one footer, for every page. Pages render only their own content. */}
                <div className='flex min-h-dvh flex-col'>
                  <SiteNavbar />
                  <main id='main' className='flex flex-1 flex-col'>
                    {children}
                  </main>
                  <SiteFooter />
                </div>
              </TooltipProvider>
            </SoundProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
