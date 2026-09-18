'use client';

import { Check, ChevronDown, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cookieName, languageCodes, languageNames, languages, type Language } from '@/lib/i18n/settings';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'en') as Language;

  function change(lng: Language) {
    if (lng === current) return;
    document.cookie = `${cookieName}=${lng}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = lng;
    void i18n.changeLanguage(lng);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          aria-label={i18n.t('language.aria')}
          className='h-10 gap-1.5 bg-background-alternative px-3 text-foreground hover:bg-background'
        >
          <Languages size={17} />
          <span className='uppercase'>{languageCodes[current]}</span>
          <ChevronDown size={14} className='text-foreground/50' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {languages.map((lng) => {
          const active = lng === current;
          return (
            <DropdownMenuItem key={lng} onSelect={() => change(lng)} aria-pressed={active}>
              <span className='grid h-4 w-4 shrink-0 place-items-center'>{active && <Check size={14} />}</span>
              {languageNames[lng]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
