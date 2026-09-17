import type { Metadata } from 'next';
import { Archivo, Fraunces } from 'next/font/google';

import { detectLanguage } from '@/lib/i18n/server';

import { LanguageProvider } from '@/components/providers/i18n';
import { ThemeProvider } from '@/components/providers/theme';

import './globals.css';

const archivo = Archivo({ subsets: ['latin'], variable: '--font-sans' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Ludo',
  description: 'Real-time Ludo game',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lng = await detectLanguage();

  return (
    <html lang={lng} suppressHydrationWarning>
      <body className={`${archivo.variable} ${fraunces.variable}`}>
        <LanguageProvider lng={lng}>
          <ThemeProvider>{children}</ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
