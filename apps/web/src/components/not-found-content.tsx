'use client';

import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { PAGE_DECOR_A } from '@/components/decor';
import { Die } from '@/components/die';
import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { order } from '@/lib/reveal';

/** What a visitor sees at an address that doesn't exist: a bad roll, and two ways back into the game. */
export function NotFoundContent() {
  const { t } = useTranslation();

  return (
    <PageShell width='narrow' decor={PAGE_DECOR_A} className='grid place-items-center'>
      <section className='reveal-load toy-card w-full max-w-lg p-6 text-center sm:p-10' style={order(0)}>
        <div className='reveal-load mx-auto w-fit' style={order(1, '30deg')}>
          {/* The worst roll there is. */}
          <Die value={1} size='xl' color='red' className='animate-bob rotate-6' label='1' />
        </div>
        <p className='eyebrow reveal-load mt-6 inline-flex rounded-md border-2 border-border bg-background-alternative px-2 py-0.5 text-foreground shadow-[0_2px_0_var(--shadow-color)]' style={order(2)}>
          404
        </p>
        <h1 className='reveal-load mt-3 font-display text-4xl leading-tight sm:text-5xl' style={order(3)}>
          {t('notFound.title')}
        </h1>
        <p className='reveal-load mx-auto mt-3 max-w-sm text-lg font-semibold leading-7 text-foreground/75' style={order(4)}>
          {t('notFound.text')}
        </p>
        <div className='reveal-load mt-7 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2' style={order(5)}>
          <Button asChild>
            <Link href='/'>
              <ArrowLeft size={18} strokeWidth={3} /> {t('notFound.home')}
            </Link>
          </Button>
          <Button asChild variant='outline'>
            <Link href='/discover'>
              <Users size={18} strokeWidth={2.5} /> {t('nav.rooms')}
            </Link>
          </Button>
        </div>
      </section>
    </PageShell>
  );
}
