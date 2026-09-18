'use client';

import { Home, Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { LanguageToggle } from '@/components/language-toggle';
import { SiteFooter } from '@/components/site-footer';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

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
    <>
      <main className='mx-auto min-h-screen max-w-3xl px-3 py-2 sm:px-4 sm:py-6'>
        <header className='flex flex-wrap items-center justify-between gap-4 border-4 border-border bg-background-alternative p-4 shadow-card sm:p-5'>
          <a href='/' className='flex items-center gap-2' aria-label={t('room.message.toHomepage')}>
            <Scale className='size-10 shrink-0 rounded-lg bg-foreground p-2 text-background' />
            <div>
              <p className='text-xs font-black uppercase tracking-[.16em] text-red-700 dark:text-red-400'>{t('legal.eyebrow')}</p>
              <h1 className='font-mono text-xl font-black tracking-widest'>{t(`legal.${page}.title`)}</h1>
            </div>
          </a>
          <div className='flex items-center gap-2'>
            <LanguageToggle />
            <ThemeToggle />
            <Button variant='outline' asChild className='h-10 px-3 bg-background-alternative text-foreground hover:bg-background hover:text-foreground'>
              <a href='/'>
                <Home size={17} /> {t('room.message.toHomepage')}
              </a>
            </Button>
          </div>
        </header>

        <article className='mt-8 border-4 border-border bg-background-alternative p-6 shadow-card sm:p-8'>
          <p className='text-xs font-bold uppercase tracking-wide text-foreground/60'>{t('legal.lastUpdated')}</p>
          {children}
          <div className='mt-6 space-y-8'>
            {sections.map((section, index) => (
              <section key={section.title} className='border-t-2 border-border pt-6 first:border-t-0 first:pt-0'>
                <h2 className='text-lg font-black'>
                  {index + 1}. {section.title}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className='mt-2 leading-7 text-foreground/75'>
                    {paragraph}
                  </p>
                ))}
                {section.items && (
                  <ul className='mt-2 list-disc space-y-1.5 pl-5 leading-7 text-foreground/75'>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
