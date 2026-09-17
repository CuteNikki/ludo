'use client';

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
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
      <Button variant='outline' disabled aria-label={t('theme.toLight')} className='h-10 w-10 border-2 border-border bg-background-alternative text-foreground'>
        <Sun size={18} />
      </Button>
    );

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant='outline'
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? t('theme.toLight') : t('theme.toDark')}
      className='h-10 w-10 px-2 bg-background-alternative text-foreground hover:bg-background hover:text-foreground'
    >
      <span className='relative grid h-5 w-5 place-items-center'>
        <Sun size={18} className={`absolute transition-transform duration-200 ${isDark ? 'scale-0 -rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`} />
        <Moon size={18} className={`absolute transition-transform duration-200 ${isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'}`} />
      </span>
    </Button>
  );
}
