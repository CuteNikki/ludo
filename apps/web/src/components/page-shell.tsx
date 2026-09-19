import type { LucideIcon } from 'lucide-react';

import { order } from '@/lib/reveal';
import { cn } from '@/lib/utils';

import { DecorLayer, type DecorItem } from '@/components/decor';

const widths = {
  narrow: 'max-w-3xl',
  default: 'max-w-6xl',
  wide: 'max-w-[90rem]',
} as const;

const accents = {
  red: 'bg-p-red text-white',
  blue: 'bg-p-blue text-white',
  green: 'bg-p-green text-white',
  yellow: 'bg-p-yellow text-primary-foreground',
} as const;

/** The content column every ordinary page sits in, so gutters and rhythm match across the site. */
export function PageShell({
  width = 'default',
  decor,
  className,
  children,
}: {
  width?: keyof typeof widths;
  /** Loose dice and pieces behind the content (see decor.tsx). */
  decor?: DecorItem[];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className='relative flex flex-1 flex-col'>
      {decor && <DecorLayer items={decor} />}
      <div className={cn('relative mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8', widths[width], className)}>{children}</div>
    </div>
  );
}

/** Icon tile, eyebrow and page title; the first thing on every page except the home page and the room. */
export function PageHeader({
  eyebrow,
  title,
  icon: Icon,
  accent = 'red',
  children,
}: {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  accent?: keyof typeof accents;
  children?: React.ReactNode;
}) {
  return (
    <header className='mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex min-w-0 items-center gap-4 sm:gap-5'>
        <div
          className={cn(
            'reveal-load grid size-14 shrink-0 -rotate-3 place-items-center rounded-xl border-3 border-border shadow-toy sm:size-16',
            accents[accent],
          )}
          style={order(0, '25deg')}
        >
          <Icon className='size-7 sm:size-8' strokeWidth={2.5} />
        </div>
        <div className='min-w-0'>
          <p className='reveal-load eyebrow text-accent' style={order(1)}>
            {eyebrow}
          </p>
          <h1 className='reveal-load font-display text-4xl leading-none wrap-break-word sm:text-5xl' style={order(2)}>
            {title}
          </h1>
        </div>
      </div>
      {children && (
        <div className='reveal-load' style={order(3)}>
          {children}
        </div>
      )}
    </header>
  );
}
