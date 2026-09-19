'use client';

import { Github } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { LogoMark, Wordmark } from '@/components/logo';
import { repositoryUrl } from '@/lib/legal';

const linkClassName =
  'inline-flex items-center gap-1.5 rounded-sm py-1 font-bold text-footer-foreground/75 transition-colors hover:text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary';

/** The one footer, mounted by the root layout: tagline, site links and the legal links every page must carry. */
export function SiteFooter() {
  const { t } = useTranslation();

  const columns = [
    {
      title: t('footerLinks.play'),
      links: [
        { href: '/#start', label: t('footerLinks.createRoom') },
        { href: '/discover', label: t('nav.rooms') },
        { href: '/rules', label: t('nav.rules') },
      ],
    },
    {
      title: t('legal.nav.aria'),
      links: [
        { href: '/imprint', label: t('legal.nav.imprint') },
        { href: '/privacy', label: t('legal.nav.privacy') },
        { href: '/terms', label: t('legal.nav.terms') },
      ],
    },
  ];

  return (
    <footer className='mt-auto border-t-3 border-border bg-footer text-footer-foreground'>
      {/* A row of the four player colors, like the edge of a game box. */}
      <div aria-hidden='true' className='grid h-3 grid-cols-4 border-b-3 border-border'>
        <span className='bg-p-red' />
        <span className='bg-p-blue' />
        <span className='bg-p-yellow' />
        <span className='bg-p-green' />
      </div>
      <div className='mx-auto grid w-full max-w-480 gap-10 px-4 py-10 sm:px-6 sm:py-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:px-8'>
        <div className='max-w-sm'>
          <div className='flex items-center gap-2.5'>
            <LogoMark />
            <Wordmark className='text-4xl' />
          </div>
          <p className='mt-4 font-bold leading-7 text-footer-foreground/75 text-pretty'>{t('footer')}</p>
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className='eyebrow text-primary'>{column.title}</h2>
            <ul className='mt-3 space-y-1'>
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClassName}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <nav aria-label={t('footerLinks.project')}>
          <h2 className='eyebrow text-primary'>{t('footerLinks.project')}</h2>
          <ul className='mt-3 space-y-1'>
            <li>
              <a href={repositoryUrl} target='_blank' rel='noreferrer' className={linkClassName}>
                <Github size={16} /> {t('legal.nav.github')}
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
