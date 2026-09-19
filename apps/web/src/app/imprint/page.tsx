'use client';

import { useTranslation } from 'react-i18next';

import { Mail, MapPin, Phone, TriangleAlert } from 'lucide-react';

import { isOperatorConfigured, operator } from '@/lib/legal';

import { LegalPage } from '@/components/legal-page';

export default function ImprintPage() {
  const { t } = useTranslation();

  return (
    <LegalPage page='imprint'>
      {isOperatorConfigured ? (
        <address className='mt-6 max-w-md space-y-2 toy-tile p-4 not-italic'>
          <p className='font-black'>{operator.name}</p>
          <p className='flex gap-2 text-sm text-foreground/80'>
            <MapPin size={16} className='mt-0.5 shrink-0' aria-label={t('legal.imprint.address')} />
            <span>
              {operator.addressLines.map((line) => (
                <span key={line} className='block'>
                  {line}
                </span>
              ))}
            </span>
          </p>
          {operator.email && (
            <p className='flex items-center gap-2 text-sm text-foreground/80'>
              <Mail size={16} className='shrink-0' aria-label={t('legal.imprint.email')} />
              <a href={`mailto:${operator.email}`} className='link-underline'>
                {operator.email}
              </a>
            </p>
          )}
          {operator.phone && (
            <p className='flex items-center gap-2 text-sm text-foreground/80'>
              <Phone size={16} className='shrink-0' aria-label={t('legal.imprint.phone')} />
              <a href={`tel:${operator.phone.replace(/[^+\d]/g, '')}`} className='link-underline'>
                {operator.phone}
              </a>
            </p>
          )}
        </address>
      ) : (
        <p
          role='status'
          className='mt-6 flex gap-2 rounded-lg border-3 border-amber-500 bg-amber-500/10 p-4 text-sm font-bold text-amber-700 dark:text-amber-400'
        >
          <TriangleAlert size={18} className='shrink-0' /> {t('legal.imprint.notConfigured')}
        </p>
      )}
    </LegalPage>
  );
}
