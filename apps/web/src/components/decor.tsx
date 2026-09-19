import type { PlayerColor } from '@ludo/shared';
import type { CSSProperties } from 'react';

import { Die } from '@/components/die';
import { cn } from '@/lib/utils';

interface Placement {
  /** Position and visibility, per breakpoint, on the wrapper that pops in. */
  className: string;
  /** Extra classes on the inner element that floats; used to shrink it on small screens. */
  inner?: string;
  /** Place in the entrance sequence; a higher number pops in later. */
  order: number;
  /** Resting tilt in degrees; it also spins in from three times as far. */
  tilt: number;
  /** Negative seconds: starts the float part-way through, so the pieces don't bob in unison. */
  drift: number;
}

export type DecorItem = Placement &
  ({ kind: 'die'; value: number; size: 'md' | 'lg' | 'xl'; color?: PlayerColor } | { kind: 'piece'; color: PlayerColor; size: 'sm' | 'md' | 'lg' });

const pieceSizes = { sm: 'size-6 border-3', md: 'size-10 border-4', lg: 'size-14 border-4' } as const;
const pieceColors: Record<PlayerColor, string> = { red: 'bg-p-red', blue: 'bg-p-blue', green: 'bg-p-green', yellow: 'bg-p-yellow' };

/**
 * Loose dice and game pieces scattered behind a page's content. They pop in when the page loads,
 * then drift. Purely decorative: hidden from assistive tech and never intercepting the pointer.
 * The layer fills its nearest positioned ancestor and sits behind whatever is rendered after it.
 */
export function DecorLayer({ items, className }: { items: DecorItem[]; className?: string }) {
  return (
    <div aria-hidden='true' className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {items.map((item, index) => (
        // The pop-in and the float both animate translate/rotate, so each gets its own element.
        <div
          key={index}
          className={cn('reveal-load absolute', item.className)}
          style={{ '--i': item.order, '--reveal-rotate': `${item.tilt * 4}deg` } as CSSProperties}
        >
          <div className={cn('animate-float', item.inner)} style={{ '--float-rotate': `${item.tilt}deg`, animationDelay: `${item.drift}s` } as CSSProperties}>
            {item.kind === 'die' ? (
              <Die value={item.value} size={item.size} {...(item.color ? { color: item.color } : {})} />
            ) : (
              <span
                className={cn(
                  'block rounded-full border-border shadow-[inset_0_4px_0_rgb(255_255_255/0.35),0_4px_0_var(--shadow-color)]',
                  pieceSizes[item.size],
                  pieceColors[item.color],
                )}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Where decorations may go, so they never sit behind text:
 * - on a phone, only beside the hero's pill and in the padding above the footer (no fixed distance
 *   from the top is safe there: text wraps differently at every width);
 * - mid-page, only in real side margins: the hero's gap between its two columns, or beyond a page's
 *   content column on wide screens.
 * When moving these, check every line of text against every decoration at many widths (including the
 * few pixels each one drifts): a placement that looks fine at one width lands on text at another.
 */

/** The hero's scatter. */
export const HOME_DECOR: DecorItem[] = [
  { kind: 'die', value: 5, size: 'lg', className: 'right-3 top-14 sm:right-[9%] sm:top-16 lg:left-[42%] lg:right-auto lg:top-[7%]', inner: 'scale-75 sm:scale-100', order: 5, tilt: -14, drift: 0 },
  { kind: 'die', value: 3, size: 'md', color: 'blue', className: 'left-[4%] bottom-3 sm:bottom-5 lg:left-[46%] lg:bottom-[6%]', order: 7, tilt: 12, drift: -2 },
  { kind: 'piece', color: 'green', size: 'lg', className: 'hidden md:right-[3%] md:top-[26rem] md:block lg:right-[1.5%] lg:top-3', order: 6, tilt: 0, drift: -1 },
  { kind: 'piece', color: 'red', size: 'md', className: 'hidden md:left-[3%] md:top-[19rem] md:block lg:left-[48%] lg:top-[52%]', order: 8, tilt: 0, drift: -3 },
  { kind: 'piece', color: 'yellow', size: 'sm', className: 'right-[8%] bottom-8 lg:right-[7%] lg:bottom-[4%]', order: 9, tilt: 0, drift: -1.5 },
];

/** Discover and legal pages. */
export const PAGE_DECOR_A: DecorItem[] = [
  { kind: 'piece', color: 'blue', size: 'sm', className: 'right-[6%] bottom-1 sm:bottom-3', order: 4, tilt: 0, drift: -2.5 },
  { kind: 'die', value: 4, size: 'md', color: 'yellow', className: 'left-[5%] bottom-2 hidden sm:block', order: 5, tilt: 10, drift: 0 },
  { kind: 'piece', color: 'green', size: 'lg', className: 'left-[1.5%] top-[30%] hidden min-[1750px]:block', order: 6, tilt: 0, drift: -2 },
  { kind: 'die', value: 6, size: 'md', className: 'left-[2%] bottom-32 hidden min-[1750px]:block', order: 7, tilt: -12, drift: -3 },
  { kind: 'piece', color: 'red', size: 'md', className: 'right-[2%] top-[22%] hidden min-[1750px]:block', order: 8, tilt: 0, drift: -1 },
  { kind: 'die', value: 3, size: 'lg', className: 'right-[1.5%] top-[58%] hidden min-[1750px]:block', order: 9, tilt: 12, drift: -1.5 },
];

/** Rules page. */
export const PAGE_DECOR_B: DecorItem[] = [
  { kind: 'piece', color: 'red', size: 'sm', className: 'right-[7%] bottom-1 sm:bottom-3', order: 4, tilt: 0, drift: -1 },
  { kind: 'die', value: 5, size: 'md', color: 'green', className: 'left-[4%] bottom-2 hidden sm:block', order: 5, tilt: 14, drift: -3 },
  { kind: 'die', value: 2, size: 'lg', className: 'left-[1.5%] top-[14%] hidden min-[1750px]:block', order: 6, tilt: -12, drift: 0 },
  { kind: 'piece', color: 'blue', size: 'lg', className: 'right-[1.5%] top-[30%] hidden min-[1750px]:block', order: 7, tilt: 0, drift: -1.5 },
  { kind: 'piece', color: 'yellow', size: 'md', className: 'left-[2.5%] top-[62%] hidden min-[1750px]:block', order: 8, tilt: 0, drift: -2 },
  { kind: 'die', value: 4, size: 'md', color: 'red', className: 'right-[2.5%] bottom-40 hidden min-[1750px]:block', order: 9, tilt: 10, drift: -3 },
];

/** The room: only in the margins of very wide screens, where there is nothing else to look at. */
export const ROOM_DECOR: DecorItem[] = [
  { kind: 'die', value: 6, size: 'lg', className: 'left-[2.5%] top-40 hidden min-[2000px]:block', order: 3, tilt: -12, drift: 0 },
  { kind: 'piece', color: 'green', size: 'lg', className: 'left-[4%] top-[55%] hidden min-[2000px]:block', order: 4, tilt: 0, drift: -2 },
  { kind: 'die', value: 3, size: 'md', color: 'red', className: 'right-[3%] top-64 hidden min-[2000px]:block', order: 5, tilt: 12, drift: -1 },
  { kind: 'piece', color: 'yellow', size: 'lg', className: 'right-[2.5%] bottom-[18%] hidden min-[2000px]:block', order: 6, tilt: 0, drift: -3 },
];
