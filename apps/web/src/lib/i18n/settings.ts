export const fallbackLng = 'en';
export const languages = ['en'] as const;
export type Language = (typeof languages)[number];

export const cookieName = 'ludo_lng';

export const defaultNS = 'translation';

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
