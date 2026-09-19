import { cn } from '@/lib/utils';

/** The four-color board with a die pip in the middle. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 40 40' aria-hidden='true' className={cn('size-10 shrink-0 drop-shadow-[0_2px_0_var(--shadow-color)]', className)}>
      <rect x='2' y='2' width='36' height='36' rx='8' fill='var(--border)' />
      <rect x='5' y='5' width='14' height='14' rx='4' fill='var(--p-red)' />
      <rect x='21' y='5' width='14' height='14' rx='4' fill='var(--p-blue)' />
      <rect x='5' y='21' width='14' height='14' rx='4' fill='var(--p-yellow)' />
      <rect x='21' y='21' width='14' height='14' rx='4' fill='var(--p-green)' />
      <circle cx='20' cy='20' r='6.5' fill='#fff' stroke='var(--border)' strokeWidth='3' />
      <circle cx='20' cy='20' r='2' fill='var(--border)' />
    </svg>
  );
}

const letterColors = ['text-p-red', 'text-p-blue', 'text-p-green', 'text-p-yellow'];

/** "Ludo" with each letter in a player color and a sticker-style outline. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display leading-none tracking-wide [-webkit-text-stroke:5px_var(--border)] [paint-order:stroke_fill]', className)}>
      {'Ludo'.split('').map((letter, index) => (
        <span key={index} className={letterColors[index]}>
          {letter}
        </span>
      ))}
    </span>
  );
}
