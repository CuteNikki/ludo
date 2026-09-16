import type { Metadata } from 'next';
import { Archivo, Fraunces } from 'next/font/google';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], variable: '--font-sans' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Ludo Live',
  description: 'Mensch ärgere Dich nicht in Echtzeit',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='de'>
      <body className={`${archivo.variable} ${fraunces.variable}`}>{children}</body>
    </html>
  );
}
