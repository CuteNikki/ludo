'use client';
import { Check, ChevronDown, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const themes = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const;

const triggerClassName = 'h-10 gap-1.5 bg-background-alternative px-3 text-foreground hover:bg-background';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // The stored theme is only known on the client, so render a neutral placeholder until mounted.
  if (!mounted)
    return (
      <Button variant='outline' disabled aria-label={t('theme.aria')} className={triggerClassName}>
        <Monitor size={17} />
        <ChevronDown size={14} className='text-foreground/50' />
      </Button>
    );

  const current = themes.find((option) => option.value === theme) ?? themes[2];
  const CurrentIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' aria-label={t('theme.aria')} className={triggerClassName}>
          <CurrentIcon size={17} />
          <ChevronDown size={14} className='text-foreground/50' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {themes.map(({ value, icon: Icon }) => {
          const active = value === current.value;
          return (
            <DropdownMenuItem key={value} onSelect={() => setTheme(value)} aria-pressed={active}>
              <Icon size={16} />
              {t(`theme.${value}`)}
              <span className='ml-auto grid h-4 w-4 shrink-0 place-items-center px-2 box-content'>{active && <Check size={14} />}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}