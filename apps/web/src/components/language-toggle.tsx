'use client';

import { useTranslation } from 'react-i18next';

import { cookieName, languageCodes, languages, type Language } from '@/lib/i18n/settings';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'en') as Language;

  function change(lng: Language) {
    if (lng === current) return;
    document.cookie = `${cookieName}=${lng}; path=/; max-age=31536000; SameSite=Lax`;
    void i18n.changeLanguage(lng);
    window.location.reload();
  }

  return (
    <div className='flex shrink-0 items-center border border-stone-300 dark:border-stone-700' role='group' aria-label={i18n.t('language.aria')}>
      {languages.map((lng) => {
        const active = lng === current;
        return (
          <button
            key={lng}
            type='button'
            onClick={() => change(lng)}
            aria-pressed={active}
            className={`btn-press h-10 px-3 text-xs font-black uppercase tracking-wider transition-colors ${
              active
                ? 'bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950'
                : 'text-stone-600 bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
            }`}
          >
            {languageCodes[lng]}
          </button>
        );
      })}
    </div>
  );
}
