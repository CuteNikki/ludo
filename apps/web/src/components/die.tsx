'use client';

import type { PlayerColor } from '@ludo/shared';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/** Which of the nine cells of a 3x3 grid hold a pip, per face. */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const sizes = {
  sm: 'size-7 gap-px rounded-md border-2 p-1',
  md: 'size-11 gap-0.5 rounded-lg border-3 p-1.5',
  lg: 'size-16 gap-0.5 rounded-xl border-3 p-2 sm:size-20 sm:gap-1 sm:p-2.5',
  xl: 'size-24 gap-1 rounded-2xl border-4 p-3',
} as const;

// Fixed light faces (not the themed soft colors): the pips are dark, so the face must stay light in dark mode too.
const tints: Record<PlayerColor, string> = {
  red: 'bg-[#ffc9c4]',
  blue: 'bg-[#c6d9ff]',
  green: 'bg-[#c2eed3]',
  yellow: 'bg-[#ffeaa6]',
};

/**
 * A six-sided die drawn with CSS. With `rolling` it flickers through random faces (and tumbles, via
 * the caller's animation class) instead of showing `value`. `value` null shows an empty face.
 */
export function Die({
  value,
  rolling = false,
  size = 'md',
  color,
  label,
  className,
}: {
  value: number | null;
  rolling?: boolean;
  size?: keyof typeof sizes;
  color?: PlayerColor;
  label?: string | undefined;
  className?: string;
}) {
  const [flicker, setFlicker] = useState(1);

  useEffect(() => {
    if (!rolling) return;
    const interval = window.setInterval(() => setFlicker(Math.floor(Math.random() * 6) + 1), 90);
    return () => window.clearInterval(interval);
  }, [rolling]);

  const face = rolling ? flicker : value;
  const pips = face === null ? [] : (PIPS[face] ?? []);

  return (
    <div
      role='img'
      aria-label={label ?? (face === null ? undefined : String(face))}
      className={cn(
        'grid shrink-0 grid-cols-3 grid-rows-3 border-border shadow-[0_3px_0_var(--shadow-color)]',
        sizes[size],
        color ? tints[color] : 'bg-white',
        face === null && 'opacity-60 shadow-none',
        rolling && 'animate-dice-rolling',
        className,
      )}
    >
      {Array.from({ length: 9 }, (_, cell) => (
        // The pip color is fixed, not themed: the face is always light, even in dark mode.
        <span key={cell} className={cn('rounded-full', pips.includes(cell) && 'bg-[#1e1533]')} />
      ))}
    </div>
  );
}
