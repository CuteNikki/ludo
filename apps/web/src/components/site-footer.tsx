'use client';

import { Github } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { repositoryUrl } from '@/lib/legal';

const linkClassName = 'link-underline hover:text-foreground/70';

/** Tagline plus the legal links, which have to be reachable from every page. */
export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className='border-t-2 border-border bg-background-alternative px-6 py-7 text-center text-xs font-bold uppercase tracking-[.15em]'>
      <p>{t('footer')}</p>
      <nav aria-label={t('legal.nav.aria')} className='mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-foreground/70'>
        <a href='/imprint' className={linkClassName}>
          {t('legal.nav.imprint')}
        </a>
        <a href='/privacy' className={linkClassName}>
          {t('legal.nav.privacy')}
        </a>
        <a href='/terms' className={linkClassName}>
          {t('legal.nav.terms')}
        </a>
        <a href={repositoryUrl} target='_blank' rel='noreferrer' className={`${linkClassName} inline-flex items-center gap-1.5`}>
          <Github size={14} /> {t('legal.nav.github')}
        </a>
      </nav>
    </footer>
  );
}
