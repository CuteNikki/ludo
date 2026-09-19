'use client';

import type { GameState, Player } from '@ludo/shared';
import { useTranslation } from 'react-i18next';

import { Bot, Check, Crown, UserMinus, Users, Vote } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Die } from '@/components/die';
import { PlayerToken, softBg } from '@/components/room/player-color';
import { LeaveButton } from '@/components/room/room-card';
import { SpectatorCount } from '@/components/room/spectator-count';
import { Button } from '@/components/ui/button';

interface PlayersPanelProps {
  state: GameState;
  playerId: string;
  isHost: boolean;
  lastRolls: Record<string, number>;
  kickConfirmId: string | null;
  onRemove: (player: Player) => void;
  onClaimHost: () => void;
  onAddBot: () => void;
  onToggleReady: (ready: boolean) => void;
  onLeave: () => void;
  /** A read-only view for someone watching without a seat: no ready button and no leave button (the page has its own way out). */
  spectating?: boolean;
}

export function PlayersPanel({
  state,
  playerId,
  isHost,
  lastRolls,
  kickConfirmId,
  onRemove,
  onClaimHost,
  onAddBot,
  onToggleReady,
  onLeave,
  spectating = false,
}: PlayersPanelProps) {
  const { t } = useTranslation();
  const me = state.players.find((player) => player.id === playerId);
  const lobby = state.phase === 'lobby';
  // Anyone still connected can take over from a host who has gone, instead of waiting for the automatic handover.
  const hostAway = state.players.some((player) => player.id === state.hostPlayerId && !player.connected);
  const canClaimHost = hostAway && !!me && !me.isBot && me.connected && me.id !== state.hostPlayerId;

  return (
    <section className='toy-card p-4 sm:p-5'>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <h2 className='flex items-center gap-2 font-display text-2xl'>
          <Users size={22} strokeWidth={2.5} /> {t('room.players')} {state.players.length}/4
        </h2>
        {state.spectatorCount > 0 && <SpectatorCount count={state.spectatorCount} labelled className='shrink-0 text-sm' />}
      </div>

      <ul className='space-y-2'>
        {state.players.map((player) => {
          const active = player.id === state.currentPlayerId && state.phase === 'playing';
          const roll = lastRolls[player.id] ?? null;
          const confirming = kickConfirmId === player.id;
          const removable = state.phase !== 'finished' && isHost && player.id !== playerId;
          return (
            <li
              key={player.id}
              className={cn(
                'relative flex min-h-13 items-center gap-2.5 rounded-lg border-3 px-3 py-1.5 transition-[background-color,translate,box-shadow] duration-300',
                active ? cn('-translate-y-px border-border shadow-[0_3px_0_var(--shadow-color)]', softBg[player.color]) : 'border-border/20 bg-background',
              )}
            >
              <PlayerToken color={player.color} className={cn('size-6', !player.connected && 'opacity-50')} />
              <span className={cn('flex min-w-0 flex-1 items-center gap-1.5 font-extrabold', !player.connected && 'opacity-60')}>
                <span className='truncate'>
                  {player.name}
                  {player.id === playerId ? t('room.you') : ''}
                </span>
                {player.isBot && <Bot size={16} className='shrink-0 text-foreground/60' aria-label={t('room.bot')} />}
                {player.id === state.hostPlayerId && <Crown size={16} className='shrink-0 text-amber-600 dark:text-amber-400' aria-label={t('room.host')} />}
              </span>

              {!player.connected && (
                <span className='shrink-0 rounded-md border-2 border-border bg-background px-1.5 py-0.5 text-[10px] font-extrabold uppercase'>
                  {t('room.away')}
                </span>
              )}
              {canClaimHost && player.id === state.hostPlayerId && (
                <Button size='sm' className='min-h-8 shrink-0 px-2.5 text-xs' onClick={onClaimHost} aria-label={t('room.claimHostAria')}>
                  <Crown size={14} strokeWidth={3} /> {t('room.claimHost')}
                </Button>
              )}
              {/* Before the die, ready check and vote, so those line up at the right edge in every row. */}
              {removable && (
                <button
                  type='button'
                  onClick={() => onRemove(player)}
                  aria-label={t(confirming ? 'room.removePlayerConfirmAria' : 'room.removePlayerAria', { name: player.name })}
                  title={t(confirming ? 'room.removePlayerConfirmAria' : 'room.removePlayerAria', { name: player.name })}
                  className={cn(
                    'grid h-9 shrink-0 touch-manipulation place-items-center rounded-md text-foreground/60 transition-colors hover:bg-p-red/20 hover:text-p-red-deep focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-foreground dark:hover:text-p-red',
                    confirming ? 'bg-p-red px-2.5 font-display text-sm uppercase text-white hover:bg-p-red hover:text-white dark:hover:text-white' : 'w-9',
                  )}
                >
                  {confirming ? t('room.removeConfirm') : <UserMinus size={18} strokeWidth={2.5} />}
                </button>
              )}
              {!lobby && (
                <div key={roll ?? 'none'} className={cn(roll !== null && 'animate-dice-result')}>
                  <Die
                    value={roll}
                    size='sm'
                    color={player.color}
                    label={roll === null ? t('room.hud.noRoll', { name: player.name }) : t('room.hud.rolled', { name: player.name, value: roll })}
                  />
                </div>
              )}
              {lobby && player.ready && <Check size={20} strokeWidth={3.5} className='text-p-green' aria-label={t('room.imReady')} />}
              {state.phase === 'finished' && state.rematchPlayerIds.includes(player.id) && (
                <Vote size={18} className='text-amber-600 dark:text-amber-400' aria-label={t('room.rematchVotedAria', { name: player.name })} />
              )}
            </li>
          );
        })}
      </ul>

      {lobby && isHost && state.players.length < 4 && (
        <Button variant='outline' className='mt-3 w-full' onClick={onAddBot}>
          <Bot size={18} strokeWidth={2.5} /> {t('room.addBot')}
        </Button>
      )}
      {lobby && spectating && <p className='mt-4 text-sm font-bold leading-6 text-foreground/70'>{t('spectate.waitingToStart')}</p>}
      {lobby && !spectating && (
        <>
          <Button size='lg' className='mt-4 w-full' variant={me?.ready ? 'outline' : 'default'} onClick={() => onToggleReady(!me?.ready)}>
            {me?.ready ? t('room.notReady') : t('room.imReady')}
          </Button>
          <p className='mt-4 text-sm font-bold leading-6 text-foreground/70'>{t('room.startHint')}</p>
        </>
      )}
      {/* Once the game is running there is no invitation card, so leaving lives with the players. */}
      {state.phase === 'playing' && !spectating && (
        <div className='mt-4 border-t-3 border-dashed border-border/20 pt-4'>
          <LeaveButton onLeave={onLeave} />
        </div>
      )}
    </section>
  );
}
