'use client';

import type { GameState, Player } from '@ludo/shared';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { Bot, Check, Clock3, LogOut, RotateCcw, Trophy } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Die } from '@/components/die';
import { PlayerToken, onSolid, softBg, solidBg } from '@/components/room/player-color';
import { Button } from '@/components/ui/button';

interface TurnHudProps {
  state: GameState;
  playerId: string;
  lastRolls: Record<string, number>;
  secondsLeft: number;
}

/**
 * Whose turn it is and what they rolled, in one panel that stays in view next to the board.
 * On a phone it also carries the four seats with each player's last roll (the full player list
 * sits below the board there); from `lg` up the seats live in the players panel instead.
 */
export function TurnHud({ state, playerId, lastRolls, secondsLeft }: TurnHudProps) {
  const { t } = useTranslation();
  const current = state.players.find((player) => player.id === state.currentPlayerId);
  if (!current) return null;

  const isMyTurn = current.id === playerId;
  const rolling = state.turnStage === 'rolling';
  // Bots decide their own move, so their turns have no countdown to show.
  const showCountdown = state.turnStage === 'move' && state.turnDeadline !== null;
  const urgent = showCountdown && secondsLeft <= 5;

  return (
    <div className='toy-card overflow-hidden' aria-live='polite'>
      <div className={cn('flex items-center gap-3 p-3 pb-0 transition-colors duration-300 sm:gap-4', softBg[current.color])}>
        <div
          key={`${current.id}-${state.turnStage}-${state.diceResult}`}
          className={cn('p-1.5', !rolling && state.diceResult !== null && 'animate-dice-result')}
        >
          <Die
            value={state.diceResult}
            rolling={rolling}
            color={current.color}
            size='lg'
            label={state.diceResult === null ? undefined : t('room.hud.rolled', { name: current.name, value: state.diceResult })}
          />
        </div>

        <div className='min-w-0 flex-1'>
          <p
            className={cn(
              // Always a badge, so it reads on any banner color: the player's own color on your turn, a plain one otherwise.
              'eyebrow inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border-2 border-border px-2 py-0.5 shadow-[0_2px_0_var(--shadow-color)]',
              isMyTurn ? cn(solidBg[current.color], onSolid[current.color]) : 'bg-background-alternative text-foreground',
            )}
          >
            {isMyTurn ? t('room.hud.yourTurn') : t('room.yourTurn')}
          </p>
          <p className='mt-0.5 flex items-center gap-2 font-display text-2xl leading-tight sm:text-3xl'>
            <PlayerToken color={current.color} className='size-6' />
            <span className='min-w-0 truncate'>{current.name}</span>
            {current.isBot && <Bot size={20} className='shrink-0 text-foreground/60' aria-label={t('room.bot')} />}
          </p>
          {/* Two lines are always reserved, so a longer or shorter status never resizes the panel (and shoves the board around). */}
          <p className='mt-0.5 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-foreground/80'>{statusText(state, current, isMyTurn, t)}</p>
        </div>
      </div>

      {/* The countdown lives in its own row under the banner instead of beside the name, so the name
          keeps the full width. Without a countdown the row shows nothing and just continues the
          banner's color; it keeps its height so the panel doesn't jump when a countdown starts. */}
      <div
        className={cn(
          'flex h-9 items-center gap-2 border-y-3 px-3 transition-colors duration-300 sm:px-4',
          showCountdown ? 'border-border bg-background' : cn('border-transparent', softBg[current.color]),
        )}
      >
        {showCountdown && (
          <>
            <div
              role='timer'
              aria-label={t('room.hud.secondsLeft', { count: secondsLeft })}
              className={cn('flex w-16 shrink-0 items-center gap-1.5 font-display text-2xl leading-none tabular-nums', urgent && 'animate-bob text-p-red')}
            >
              <Clock3 size={20} strokeWidth={3} />
              {secondsLeft}
            </div>
            <div className='h-4 flex-1 overflow-hidden rounded-full border-3 border-border bg-background-alternative'>
              <div
                className={cn('h-full transition-[width] duration-200 ease-linear', urgent ? 'bg-p-red' : solidBg[current.color])}
                style={{ width: `${(secondsLeft / state.settings.moveTimeSeconds) * 100}%` }}
              />
            </div>
          </>
        )}
      </div>

      <ul aria-label={t('room.hud.seatsAria')} className='grid grid-cols-4 gap-2 p-2.5 lg:hidden'>
        {state.players.map((player) => (
          <Seat key={player.id} player={player} active={player.id === current.id} value={lastRolls[player.id] ?? null} />
        ))}
      </ul>
    </div>
  );
}

function statusText(state: GameState, current: Player, isMyTurn: boolean, t: TFunction): string {
  switch (state.turnStage) {
    case 'rolling':
      return t('room.rollAnimating');
    case 'move':
      return current.isBot ? t('room.botThinking', { name: current.name }) : isMyTurn ? t('room.chooseAPieceSelf') : t('room.chooseAPieceOther');
    case 'auto-move':
      return t('room.autoMoving');
    case 'no-move':
      return t('room.noValidMove');
  }
}

/** One player in the compact strip: their color, name, and the last number they rolled. */
function Seat({ player, active, value }: { player: Player; active: boolean; value: number | null }) {
  const { t } = useTranslation();

  return (
    <li
      className={cn(
        'relative flex min-w-0 flex-col items-center gap-1 rounded-lg border-3 px-1 pb-1.5 pt-2.5 transition-[translate,background-color,box-shadow] duration-300',
        active ? cn('-translate-y-0.5 border-border shadow-[0_3px_0_var(--shadow-color)]', softBg[player.color]) : 'border-border/20 bg-background',
        !player.connected && 'opacity-50',
      )}
    >
      <span aria-hidden='true' className={cn('absolute inset-x-2 -top-0.75 h-1.5 rounded-b-full', solidBg[player.color])} />
      {/* Keyed by the value so a fresh roll pops in instead of silently changing. */}
      <div key={value ?? 'none'} className={cn(value !== null && 'animate-dice-result')}>
        <Die
          value={value}
          size='sm'
          color={player.color}
          label={value === null ? t('room.hud.noRoll', { name: player.name }) : t('room.hud.rolled', { name: player.name, value })}
        />
      </div>
      <span className='flex w-full items-center justify-center gap-0.5 text-[11px] font-extrabold leading-tight'>
        <span className='truncate'>{player.name}</span>
        {player.isBot && <Bot size={11} className='shrink-0' aria-hidden='true' />}
      </span>
    </li>
  );
}

interface GameOverProps {
  state: GameState;
  playerId: string;
  rematchSecondsLeft: number;
  onRematch: () => void;
  onLeave: () => void;
}

/** Replaces the turn HUD once someone has won: the winner, and the vote for another round. */
export function GameOver({ state, playerId, rematchSecondsLeft, onRematch, onLeave }: GameOverProps) {
  const { t } = useTranslation();
  const winner = state.players.find((player) => player.id === state.winnerId);
  const wantsRematch = state.rematchPlayerIds.includes(playerId);
  const voting = state.rematchDeadline !== null;

  return (
    <div className='toy-card overflow-hidden text-center'>
      <div className={cn('p-4 sm:p-5', winner ? softBg[winner.color] : 'bg-background')}>
        <Trophy className='mx-auto text-amber-500 drop-shadow-[0_2px_0_var(--shadow-color)]' size={44} strokeWidth={2.5} />
        {/* Who first, then what they did: the name, and "Won" in the same kind of badge as the turn label. */}
        <p className='mt-2 flex items-center justify-center gap-2 font-display text-3xl leading-tight sm:text-4xl'>
          {winner && <PlayerToken color={winner.color} className='size-6' />}
          <span className='min-w-0 truncate'>{winner?.name}</span>
        </p>
        <p className='eyebrow mt-3 inline-flex rounded-md border-2 border-border bg-background-alternative px-2 py-0.5 text-foreground shadow-[0_2px_0_var(--shadow-color)]'>
          {t('room.won')}
        </p>
      </div>

      <div className='border-t-3 border-border p-3 sm:p-4'>
        {voting ? (
          <div
            role='status'
            aria-live='assertive'
            className='mb-3 rounded-lg border-3 border-amber-500 bg-amber-500/10 p-3 dark:border-amber-400 dark:bg-amber-400/10'
          >
            <p className='flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-400'>
              <span className='relative flex size-2 items-center justify-center'>
                <span className='absolute size-2 animate-ping rounded-full bg-amber-500 dark:bg-amber-400' />
                <span className='absolute size-2 rounded-full bg-amber-500 dark:bg-amber-400' />
              </span>
              {t('room.rematchVoteInProgress')}
            </p>
            <p className='mt-1.5 text-xs font-bold text-foreground/70'>
              {t('room.rematchStatus', {
                accepted: state.rematchPlayerIds.length,
                // Bots don't vote, they follow whoever does.
                total: state.players.filter((player) => !player.isBot).length,
                seconds: rematchSecondsLeft,
              })}
            </p>
            <div className='mt-2 h-2 overflow-hidden rounded-full bg-amber-500/25 dark:bg-amber-400/25'>
              <div className='h-full bg-amber-500 transition-[width] duration-200 dark:bg-amber-400' style={{ width: `${(rematchSecondsLeft / 30) * 100}%` }} />
            </div>
          </div>
        ) : (
          <p className='mb-3 text-sm font-bold text-foreground/70'>{t('room.oneMoreRound')}</p>
        )}
        <div className='grid grid-cols-2 gap-2'>
          <Button disabled={wantsRematch} onClick={onRematch}>
            {wantsRematch ? <Check size={18} strokeWidth={3} /> : <RotateCcw size={18} strokeWidth={3} />}
            {wantsRematch ? t('room.rematchAccepted') : t('room.rematchCta')}
          </Button>
          <Button variant='outline' onClick={onLeave}>
            <LogOut size={18} strokeWidth={3} /> {t('room.leave')}
          </Button>
        </div>
      </div>
    </div>
  );
}
