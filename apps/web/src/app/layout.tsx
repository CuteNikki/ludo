import type { Metadata, Viewport } from 'next';
import { Lilita_One, Nunito } from 'next/font/google';

import { fallbackLng } from '@/lib/i18n/settings';
import { siteDescription, siteName, siteTitle, siteUrl, themeColors } from '@/lib/site';

import { LanguageProvider } from '@/components/providers/i18n';
import { SoundProvider } from '@/components/providers/sound';
import { ThemeProvider } from '@/components/providers/theme';
import { SiteFooter } from '@/components/site-footer';
import { SiteNavbar } from '@/components/site-navbar';
import { TooltipProvider } from '@/components/ui/tooltip';

import './globals.css';

const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' });
const lilita = Lilita_One({ subsets: ['latin'], weight: '400', variable: '--font-lilita' });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // Pages set just their own name (see the layout of each route); the site name follows.
  title: { default: siteTitle, template: `%s · ${siteName}` },
  description: siteDescription,
  applicationName: siteName,
  category: 'games',
  keywords: ['Ludo', 'Mensch ärgere Dich nicht', 'board game', 'multiplayer', 'online game', 'real-time'],
  // The icon, the touch icon, the manifest and the share image come from the files next to this one
  // (icon.svg, apple-icon.tsx, manifest.ts, opengraph-image.tsx).
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName,
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['de_DE'],
  },
  twitter: { card: 'summary_large_image', title: siteTitle, description: siteDescription },
  appleWebApp: { capable: true, title: siteName, statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: themeColors.light },
    { media: '(prefers-color-scheme: dark)', color: themeColors.dark },
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
