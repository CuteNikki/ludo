import type { PlayerColor } from '@ludo/shared';

import { cn } from '@/lib/utils';

export const solidBg: Record<PlayerColor, string> = {
  red: 'bg-p-red',
  blue: 'bg-p-blue',
  green: 'bg-p-green',
  yellow: 'bg-p-yellow',
};

export const softBg: Record<PlayerColor, string> = {
  red: 'bg-p-red-soft',
  blue: 'bg-p-blue-soft',
  green: 'bg-p-green-soft',
  yellow: 'bg-p-yellow-soft',
};

/** Readable text color for something drawn on a `solidBg` fill. */
export const onSolid: Record<PlayerColor, string> = {
  red: 'text-white',
  blue: 'text-white',
  green: 'text-white',
  yellow: 'text-primary-foreground',
};

/** A player's color as a little game piece. */
export function PlayerToken({ color, className }: { color: PlayerColor; className?: string }) {
  return (
    <span
      aria-hidden='true'
      className={cn('inline-block size-5 shrink-0 rounded-full border-3 border-border shadow-[inset_0_2px_0_rgb(255_255_255/0.4)]', solidBg[color], className)}
    />
  );
}
