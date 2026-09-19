'use client';

import { useTranslation } from 'react-i18next';

import { Eye } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * How many people are watching a room. The number alone by default; `spelledOut` adds the words ("2 watching")
 * for as long as the surrounding container (an ancestor with `@container`) is wide enough for them.
 */
export function SpectatorCount({ count, spelledOut = false, className }: { count: number; spelledOut?: boolean; className?: string }) {
  const { t } = useTranslation();
  const label = t('spectate.count', { count });

  return (
    <span role='img' aria-label={label} title={label} className={cn('inline-flex items-center gap-1 text-xs font-bold text-foreground/70', className)}>
      <Eye size={15} aria-hidden='true' />
      {spelledOut ? (
        <>
          <span className='@xs:hidden'>{count}</span>
          <span className='hidden @xs:inline'>{label}</span>
        </>
      ) : (
        count
      )}
    </span>
  );
}
