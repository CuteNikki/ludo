import 'server-only';

import { cookies, headers } from 'next/headers';
import { cache } from 'react';

import { createInstance, type TFunction } from 'i18next';

import { resources } from './resources';
import { cookieName, fallbackLng, getOptions, isLanguage, type Language } from './settings';

export const detectLanguage = cache(async (): Promise<Language> => {
  const store = await cookies();
  const fromCookie = store.get(cookieName)?.value;
  if (isLanguage(fromCookie)) return fromCookie;

  const accept = (await headers()).get('accept-language');
  if (accept) {
    for (const part of accept.split(',')) {
      const code = part.split(';')[0]?.trim().slice(0, 2).toLowerCase();
      if (isLanguage(code)) return code;
    }
  }
  return fallbackLng;
});

const getInstance = cache(async (lng: Language) => {
  const instance = createInstance();
  await instance.init({ ...getOptions(lng), resources });
  return instance;
});

export async function getTranslation(): Promise<{
  t: TFunction;
  lng: Language;
}> {
  const lng = await detectLanguage();
  const instance = await getInstance(lng);
  return { t: instance.getFixedT(lng, null), lng };
}
