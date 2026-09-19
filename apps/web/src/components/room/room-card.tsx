'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CopyCheckIcon, CopyIcon, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';

const COPIED_MS = 1_600;

/**
 * The lobby's invitation: the room code, ways to share it, and leaving. Only shown while people can
 * still join; once the game is running the code is of no use to anyone, so the room shows just a
 * leave button then (see `LeaveButton`).
 */
export function RoomCard({ roomCode, onLeave }: { roomCode: string; onLeave: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  async function copy(kind: 'code' | 'link') {
    const text = kind === 'code' ? roomCode : `${window.location.origin}/room/${roomCode}`;
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(null), COPIED_MS);
  }

  return (
    <section className='toy-card @container p-4 sm:p-5'>
      <p className='eyebrow text-accent'>{t('room.invite.title')}</p>
      <button
        type='button'
        onClick={() => copy('code')}
        // The name starts with the code that is written on the button, as screen-reader users expect.
        aria-label={`${roomCode}: ${copied === 'code' ? t('room.copied') : t('room.copyCodeAria')}`}
        title={copied === 'code' ? t('room.copied') : t('room.copyCodeAria')}
        // Sized by the card, not the screen: the widest codes (all W's) only fit at the larger size in a wide card.
        className='group mt-0.5 flex max-w-full touch-manipulation items-center gap-2 rounded-lg font-display text-4xl leading-none tracking-[.14em] transition-colors hover:text-foreground/70 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-foreground @md:text-5xl'
      >
        {roomCode}
        {copied === 'code' ? (
          <CopyCheckIcon size={20} strokeWidth={3} className='shrink-0 text-p-green' />
        ) : (
          <CopyIcon size={20} strokeWidth={3} className='shrink-0 opacity-40 transition-opacity group-hover:opacity-80' />
        )}
      </button>
      <p className='mt-2 text-sm font-bold leading-6 text-foreground/70'>{t('room.invite.text')}</p>

      <div className='mt-3 grid grid-cols-1 gap-2 min-[480px]:grid-cols-2'>
        <Button size='sm' onClick={() => copy('link')}>
          {copied === 'link' ? <CopyCheckIcon size={16} strokeWidth={3} /> : <CopyIcon size={16} strokeWidth={3} />}
          {copied === 'link' ? t('room.copied') : t('room.copyLink')}
        </Button>
        <Button size='sm' variant='outline' onClick={onLeave}>
          <LogOut size={16} strokeWidth={3} /> {t('room.leave')}
        </Button>
      </div>
    </section>
  );
}

/** All the room needs to offer once a game is running. */
export function LeaveButton({ onLeave }: { onLeave: () => void }) {
  const { t } = useTranslation();

  return (
    <Button variant='outline' className='w-full' onClick={onLeave}>
      <LogOut size={18} strokeWidth={3} /> {t('room.leave')}
    </Button>
  );
}
