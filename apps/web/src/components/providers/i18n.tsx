'use client';

import { createInstance, type i18n as I18nInstance } from 'i18next';
import { useEffect, useState } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import { resources } from '@/lib/i18n/resources';
import { getOptions, Language } from '@/lib/i18n/settings';

export function LanguageProvider({ lng, children }: { lng: Language; children: React.ReactNode }) {
  const [instance] = useState<I18nInstance>(() => {
    const i18n = createInstance();
    void i18n.use(initReactI18next).init({
      ...getOptions(lng),
      resources,
      initAsync: false,
    });
    return i18n;
  });

  useEffect(() => {
    if (instance.resolvedLanguage !== lng) void instance.changeLanguage(lng);
  }, [instance, lng]);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
