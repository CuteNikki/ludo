import type { Metadata } from 'next';
import { Archivo, Fraunces } from 'next/font/google';

import { fallbackLng } from '@/lib/i18n/settings';

import { LanguageProvider } from '@/components/providers/i18n';
import { ThemeProvider } from '@/components/providers/theme';
import { TooltipProvider } from '@/components/ui/tooltip';

import './globals.css';

const archivo = Archivo({ subsets: ['latin'], variable: '--font-sans' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Ludo',
  description: 'Real-time Ludo game',
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
