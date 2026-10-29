'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { author, repositoryUrl } from '@/lib/legal';
import { siteName } from '@/lib/site';
import { cn } from '@/lib/utils';

import { LogoMark, Wordmark } from '@/components/logo';

const linkClassName =
  'inline-flex items-center gap-1.5 rounded-sm py-1 font-bold text-footer-foreground/75 transition-colors hover:text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary';

/** Lucide's GitHub mark, which Lucide 1.0 dropped along with its other brand icons. */
function GithubIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4' />
      <path d='M9 18c-4.51 2-5-2-7-2' />
    </svg>
  );
}

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
      <div className='mx-auto grid w-full max-w-480 gap-10 px-4 pb-8 pt-10 sm:px-6 sm:pt-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:px-8'>
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
                <GithubIcon size={16} /> {t('legal.nav.github')}
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className='mx-auto w-full max-w-480 px-4 sm:px-6 lg:px-8'>
        <div className='flex flex-wrap items-center justify-between gap-x-6 border-t-2 border-footer-foreground/15 py-3 text-sm font-bold text-footer-foreground/75'>
          <p>
            © {new Date().getFullYear()} {siteName}
          </p>
          <p>
            {t('madeBy')}{' '}
            <a href={author.url} target='_blank' rel='noreferrer' className={cn(linkClassName, 'text-primary')}>
              {author.name}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
