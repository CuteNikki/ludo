export const fallbackLng = 'en';
export const languages = ['en', 'de'] as const;
export type Language = (typeof languages)[number];

export const cookieName = 'ludo_lng';

export const defaultNS = 'translation';

export const languageNames: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
};
export const languageCodes: Record<Language, string> = {
  en: 'en',
  de: 'de',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (languages as readonly string[]).includes(value);
}

export function getOptions(lng: Language = fallbackLng) {
  return {
    supportedLngs: languages,
    fallbackLng,
    lng,
    defaultNS,
    ns: defaultNS,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  };
}
