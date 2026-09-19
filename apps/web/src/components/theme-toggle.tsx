'use client';
import { Check, ChevronDown, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/components/segmented-control';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const themes = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const;

type ThemeValue = (typeof themes)[number]['value'];

const triggerClassName = 'min-h-10 gap-1.5 px-3';

/** `dropdown` for the desktop navbar; `segmented` lays every option out at once for the mobile menu. */
export function ThemeToggle({ layout = 'dropdown' }: { layout?: 'dropdown' | 'segmented' }) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // The stored theme is only known on the client, so render a neutral placeholder until mounted.
  if (!mounted)
    return layout === 'segmented' ? (
      <div aria-hidden='true' className='h-12 rounded-lg border-3 border-border bg-background-alternative' />
    ) : (
      <Button variant='outline' disabled aria-label={t('theme.aria')} className={triggerClassName}>
        <Monitor size={18} />
        <ChevronDown size={14} className='text-foreground/60' />
      </Button>
    );

  const current = themes.find((option) => option.value === theme) ?? themes[2];
  const CurrentIcon = current.icon;

  if (layout === 'segmented')
    return (
      <SegmentedControl<ThemeValue>
        aria-label={t('theme.aria')}
        value={current.value}
        onChange={setTheme}
        options={themes.map(({ value, icon: Icon }) => ({
          value,
          label: (
            <>
              <Icon size={16} /> {t(`theme.${value}`)}
            </>
          ),
        }))}
      />
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' aria-label={t('theme.aria')} className={triggerClassName}>
          <CurrentIcon size={18} />
          <ChevronDown size={14} className='text-foreground/60' />
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
