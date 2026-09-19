'use client';

import { useTranslation } from 'react-i18next';

import { Dices, Flag, Home, Shield, Swords, Target, Trophy, Users } from 'lucide-react';

import { order } from '@/lib/reveal';
import { cn } from '@/lib/utils';

import { PAGE_DECOR_B } from '@/components/decor';
import { PageHeader, PageShell } from '@/components/page-shell';
import { Reveal } from '@/components/scroll-reveal';

// One per `rulesPage.sections` entry, in order: objective, setup, rolling, leaving the yard, capturing, winning.
const sectionIcons = [Target, Users, Dices, Home, Swords, Trophy];
const sectionColors = ['bg-p-red', 'bg-p-blue', 'bg-p-yellow', 'bg-p-green'] as const;

export default function RulesPage() {
  const { t } = useTranslation();
  const sections = t('rulesPage.sections', { returnObjects: true }) as Array<{ title: string; text: string }>;
  const variants = t('rulesPage.variants', { returnObjects: true }) as Array<{ title: string; text: string }>;

  return (
    <PageShell decor={PAGE_DECOR_B}>
      <PageHeader eyebrow={t('rulesPage.eyebrow')} title={t('rulesPage.title')} icon={Flag} accent='green' />
      <Reveal>
        <p className='reveal-item mb-8 max-w-2xl text-lg leading-8 text-foreground/80' style={order(0)}>
          {t('rulesPage.subtitle')}
        </p>

        <ol className='grid gap-5 [--step:110ms] md:grid-cols-2 xl:grid-cols-3'>
          {sections.map((section, index) => {
            const Icon = sectionIcons[index] ?? Dices;
            return (
              <li
                key={section.title}
                className='reveal-item toy-card flex flex-col gap-3 p-5 sm:p-6'
                style={order(1 + index, index % 2 === 0 ? '-3deg' : '3deg')}
              >
                <div className='flex items-center gap-3'>
                  <span
                    className={cn(
                      'grid size-11 shrink-0 place-items-center rounded-lg border-3 border-border text-primary-foreground shadow-[0_3px_0_var(--shadow-color)]',
                      sectionColors[index % sectionColors.length],
                      index % sectionColors.length !== 3 && 'text-white',
                    )}
                  >
                    <Icon size={22} strokeWidth={2.5} />
                  </span>
                  <h2 className='min-w-0 font-display text-2xl leading-tight'>
                    {index + 1}. {section.title}
                  </h2>
                </div>
                <p className='leading-7 text-foreground/75'>{section.text}</p>
              </li>
            );
          })}
        </ol>
      </Reveal>

      <Reveal>
        <section className='toy-card mt-8 bg-background-alternative p-5 sm:p-8'>
          <h2 className='flex items-center gap-2.5 font-display text-3xl'>
            <Shield size={26} strokeWidth={2.5} /> {t('rulesPage.variantsTitle')}
          </h2>
          <ul className='mt-6 grid gap-x-10 gap-y-5 [--step:110ms] md:grid-cols-2'>
            {variants.map((variant, index) => (
              <li key={variant.title} className='reveal-item toy-tile bg-background p-4' style={order(index)}>
                <strong className='block font-display text-xl'>{variant.title}</strong>
                <span className='mt-1 block text-sm leading-6 text-foreground/75'>{variant.text}</span>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>
    </PageShell>
  );
}
