'use client';

import { Check, ChevronDown, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/components/segmented-control';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cookieName, languageCodes, languageNames, languages, type Language } from '@/lib/i18n/settings';

/** `dropdown` for the desktop navbar; `segmented` lays every language out at once for the mobile menu. */
export function LanguageToggle({ layout = 'dropdown' }: { layout?: 'dropdown' | 'segmented' }) {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'en') as Language;

  function change(lng: Language) {
    if (lng === current) return;
    document.cookie = `${cookieName}=${lng}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = lng;
    void i18n.changeLanguage(lng);
  }

  if (layout === 'segmented')
    return (
      <SegmentedControl
        aria-label={i18n.t('language.aria')}
        value={current}
        onChange={change}
        options={languages.map((lng) => ({ value: lng, label: languageNames[lng] }))}
      />
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' aria-label={i18n.t('language.aria')} className='min-h-10 gap-1.5 px-3'>
          <Languages size={18} />
          <span className='uppercase'>{languageCodes[current]}</span>
          <ChevronDown size={14} className='text-foreground/60' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {languages.map((lng) => {
          const active = lng === current;
          return (
            <DropdownMenuItem key={lng} onSelect={() => change(lng)} aria-pressed={active}>
              {languageNames[lng]}
              <span className='ml-auto grid h-4 w-4 shrink-0 place-items-center px-2 box-content'>{active && <Check size={14} />}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
