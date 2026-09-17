'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cookieName, languageCodes, languages, type Language } from '@/lib/i18n/settings';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = (i18n.resolvedLanguage ?? 'en') as Language;

  function change(lng: Language) {
    if (lng === current) return;
    document.cookie = `${cookieName}=${lng}; path=/; max-age=31536000; SameSite=Lax`;
    void i18n.changeLanguage(lng);
    startTransition(() => router.refresh());
  }

  return (
    <div className='flex shrink-0 items-center -space-x-px' role='group' aria-label={i18n.t('language.aria')}>
      {languages.map((lng) => {
        const active = lng === current;
        return (
          <Button
            variant='outline'
            key={lng}
            onClick={() => change(lng)}
            disabled={pending}
            aria-pressed={active}
            className={`uppercase px-2 border-2 border-border h-10 rounded-none ${
              active ? 'bg-foreground text-background font-black z-10 hover:bg-foreground' : 'bg-background-alternative text-foreground hover:bg-background'
            }`}
          >
            {languageCodes[lng]}
          </Button>
        );
      })}
    </div>
  );
}
