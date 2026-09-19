'use client';

import { useTranslation } from 'react-i18next';

import { Eye } from 'lucide-react';

import { cn } from '@/lib/utils';

/** How many people are watching a room, as just the number or spelled out ("2 watching"). */
export function SpectatorCount({ count, labelled = false, className }: { count: number; labelled?: boolean; className?: string }) {
  const { t } = useTranslation();
  const label = t('spectate.count', { count });

  return (
    <span role='img' aria-label={label} title={label} className={cn('inline-flex items-center gap-1 text-xs font-bold text-foreground/70', className)}>
      <Eye size={15} aria-hidden='true' /> {labelled ? label : count}
    </span>
  );
}
