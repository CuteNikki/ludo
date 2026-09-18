'use client';

import { Dices, Flag, Home, Repeat, Shield, Swords, Trophy, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

const sectionIcons = [Users, Dices, Repeat, Swords, Home, Trophy];

export default function RulesPage() {
  const { t } = useTranslation();
  const sections = t('rulesPage.sections', { returnObjects: true }) as Array<{ title: string; text: string }>;
  const variants = t('rulesPage.variants', { returnObjects: true }) as Array<{ title: string; text: string }>;

  return (
    <main className='mx-auto min-h-screen max-w-3xl px-3 py-2 sm:px-4 sm:py-6'>
      <header className='flex flex-wrap items-center justify-between gap-4 border-4 border-border bg-background-alternative p-4 shadow-card sm:p-5'>
        <a href='/' className='flex items-center gap-2' aria-label={t('room.message.toHomepage')}>
          <Flag className='size-10 shrink-0 rounded-lg bg-foreground p-2 text-background' />
          <div>
            <p className='text-xs font-black uppercase tracking-[.16em] text-red-700 dark:text-red-400'>{t('rulesPage.eyebrow')}</p>
            <h1 className='font-mono text-xl font-black tracking-widest'>{t('rulesPage.title')}</h1>
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

      <section className='mt-8 border-4 border-border bg-background-alternative p-6 shadow-card sm:p-8'>
        <p className='max-w-xl leading-7 text-foreground/80'>{t('rulesPage.subtitle')}</p>

        <ol className='mt-8 space-y-6'>
          {sections.map((section, index) => {
            const Icon = sectionIcons[index] ?? Dices;
            return (
              <li key={section.title} className='flex gap-4 border-t-2 border-border pt-6 first:border-t-0 first:pt-0'>
                <div className='grid h-11 w-11 shrink-0 place-items-center border-2 border-border bg-background'>
                  <Icon size={20} />
                </div>
                <div className='min-w-0'>
                  <h2 className='text-lg font-black'>
                    {index + 1}. {section.title}
                  </h2>
                  <p className='mt-1 leading-7 text-foreground/70'>{section.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className='mt-8 border-4 border-border bg-background-alternative p-6 shadow-card sm:p-8'>
        <h2 className='flex items-center gap-2 text-lg font-black'>
          <Shield size={19} /> {t('rulesPage.variantsTitle')}
        </h2>
        <ul className='mt-4 space-y-4'>
          {variants.map((variant) => (
            <li key={variant.title}>
              <strong className='block font-bold'>{variant.title}</strong>
              <span className='text-sm text-foreground/70'>{variant.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
