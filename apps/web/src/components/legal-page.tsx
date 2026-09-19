'use client';

import { useTranslation } from 'react-i18next';

import { Scale } from 'lucide-react';

import { order } from '@/lib/reveal';

import { PAGE_DECOR_A } from '@/components/decor';
import { PageHeader, PageShell } from '@/components/page-shell';

interface LegalSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

/**
 * Shared layout for the imprint, privacy policy and terms. The copy lives in the locale files under
 * `legal.<page>`; `children` is rendered ahead of the sections for anything that isn't static text
 * (the imprint's operator details).
 */
export function LegalPage({ page, children }: { page: 'imprint' | 'privacy' | 'terms'; children?: React.ReactNode }) {
  const { t } = useTranslation();
  const sections = t(`legal.${page}.sections`, { returnObjects: true }) as LegalSection[];

  return (
    <PageShell decor={PAGE_DECOR_A}>
      <PageHeader eyebrow={t('legal.eyebrow')} title={t(`legal.${page}.title`)} icon={Scale} accent='blue' />

      <article className='reveal-load toy-card p-5 sm:p-8 lg:p-10' style={order(4)}>
        <p className='inline-block rounded-md border-2 border-border bg-primary px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-primary-foreground'>
          {t('legal.lastUpdated')}
        </p>
        {children}
        {/* Two columns from `lg` keep the lines a readable length while using the width of a large screen. */}
        <div className='mt-6 lg:columns-2 lg:gap-x-14'>
          {sections.map((section, index) => (
            <section key={section.title} className='mb-8 break-inside-avoid'>
              <h2 className='font-display text-2xl'>
                {index + 1}. {section.title}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className='mt-2 leading-7 text-foreground/80'>
                  {paragraph}
                </p>
              ))}
              {section.items && (
                <ul className='mt-2 list-disc space-y-1.5 pl-5 leading-7 text-foreground/80 marker:text-accent'>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </article>
    </PageShell>
  );
}
