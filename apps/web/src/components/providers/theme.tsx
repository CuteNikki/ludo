'use client';

import { ThemeProvider as NextThemeProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider attribute='data-theme' defaultTheme='system' enableSystem storageKey='ludo-theme'>
      {children}
    </NextThemeProvider>
  );
}
