'use client';

import { useTranslation } from 'react-i18next';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted)
    return (
      <button
        type='button'
        disabled
        aria-label={t('theme.toLight')}
        className='btn-press grid h-10 w-10 shrink-0 place-items-center border border-stone-300 bg-white text-stone-950 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800'
      >
        <Sun size={19} />
      </button>
    );

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type='button'
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? t('theme.toLight') : t('theme.toDark')}
      className='btn-press grid h-10 w-10 shrink-0 place-items-center border border-stone-300 bg-white text-stone-950 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800'
    >
      <span className='relative grid h-5 w-5 place-items-center'>
        <Sun size={19} className={`icon-swap absolute ${isDark ? 'scale-0 -rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`} />
        <Moon size={19} className={`icon-swap absolute ${isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'}`} />
      </span>
    </button>
  );
}
