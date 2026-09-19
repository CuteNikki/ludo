'use client';

import type { ClientEvent, GameState, ServerEvent } from '@ludo/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ArrowLeft, Eye, Trophy } from 'lucide-react';

import { order } from '@/lib/reveal';
import { cn } from '@/lib/utils';

import { DecorLayer, ROOM_DECOR } from '@/components/decor';
import { GameBoard } from '@/components/game-board';
import { PlayerToken, softBg } from '@/components/room/player-color';
import { PlayersPanel } from '@/components/room/players-panel';
import { TurnHud } from '@/components/room/turn-hud';
import { useLastRolls } from '@/components/room/use-last-rolls';
import { Button } from '@/components/ui/button';

type Problem = 'notFound' | 'connection' | 'ended';

const noop = () => undefined;

/**
 * Watching a public game without a seat: the same board, turn panel and player list as in a room, but
 * read-only. The server sends a spectator the room's state updates and refuses everything else, so
 * nothing here can act on the game.
 */
export function SpectatorClient({ requestedCode }: { requestedCode: string }) {
  const { t } = useTranslation();
  const [state, setState] = useState<GameState | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [now, setNow] = useState(Date.now());
  const lastRolls = useLastRolls({
    diceResult: state?.diceResult ?? null,
    currentPlayerId: state?.currentPlayerId ?? null,
    phase: state?.phase ?? 'lobby',
  });

  useEffect(() => {
    let active = true;
    setState(null);
    setProblem(null);
    const socket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001/ws');
    socket.addEventListener('open', () => {
      if (active) send(socket, { type: 'room:spectate', payload: { roomCode: requestedCode } });
    });
    socket.addEventListener('message', (message) => {
      if (!active) return;
      const event = JSON.parse(String(message.data)) as ServerEvent;
      if (event.type === 'room:spectating') setState(event.payload.state);
      else if (event.type === 'game:state') setState(event.payload);
      // The room is gone, or its players moved on to a new one; either way there is nothing left to watch.
      else if (event.type === 'room:closed' || event.type === 'room:rematch') setProblem('ended');
      else if (event.type === 'room:error') setProblem(event.payload.code === 'ROOM_NOT_FOUND' ? 'notFound' : 'connection');
    });
    // A connection that drops mid-game would otherwise leave a board that silently stopped updating.
    const dropped = () => {
      if (active) setProblem((current) => current ?? 'connection');
    };
    socket.addEventListener('error', dropped);
    socket.addEventListener('close', dropped);
    return () => {
      active = false;
      socket.close();
    };
  }, [requestedCode]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  if (problem) {
    return (
      <WatchMessage
        title={t(problem === 'notFound' ? 'spectate.notFound.title' : problem === 'ended' ? 'spectate.ended.title' : 'room.message.connectionFailed')}
        detail={t(problem === 'notFound' ? 'spectate.notFound.text' : problem === 'ended' ? 'spectate.ended.text' : 'room.errors.UNKNOWN')}
      />
    );
  }

  if (!state) return <WatchLoading />;

  const lobby = state.phase === 'lobby';
  const secondsLeft = state.turnDeadline === null ? 0 : Math.min(state.settings.moveTimeSeconds, Math.max(0, Math.ceil((state.turnDeadline - now) / 1000)));

  return (
    <div className='relative flex flex-1 flex-col'>
      <DecorLayer items={ROOM_DECOR} />
      <div className='relative mx-auto w-full max-w-480 flex-1 px-3 py-3 sm:px-6 sm:py-5 lg:px-8 lg:py-6'>
        <div className='toy-card reveal-load mb-3 flex items-center justify-between gap-3 p-3 sm:mb-4' style={order(0)}>
          <p className='flex min-w-0 items-center gap-2'>
            <Eye size={20} strokeWidth={2.5} className='shrink-0' aria-hidden='true' />
            <span className='eyebrow text-accent'>{t('spectate.watching')}</span>
            <span className='truncate font-display text-xl tracking-[.12em]'>{state.roomCode}</span>
          </p>
          <Button asChild size='sm' variant='outline' className='shrink-0'>
            <Link href='/discover'>
              <ArrowLeft size={16} strokeWidth={3} /> {t('spectate.back')}
            </Link>
          </Button>
        </div>

        <div className='room-grid'>
          {/* Nothing to show above the board in the lobby, where nobody has rolled yet. */}
          {!lobby && (
            <div className='room-hud reveal-load' style={order(1)} data-sticky={state.phase === 'playing' ? '' : undefined}>
              {state.phase === 'finished' ? (
                <SpectatorFinished state={state} />
              ) : (
                <TurnHud state={state} playerId='' lastRolls={lastRolls} secondsLeft={secondsLeft} />
              )}
            </div>
          )}

          <section className={cn('room-board reveal-load', lobby && 'hidden lg:block')} style={order(2)}>
            <GameBoard className='room-board-size mx-auto' state={state} playerId='' onMove={noop} />
          </section>

          <div className='room-players reveal-load' style={order(3)}>
            <PlayersPanel
              state={state}
              playerId=''
              isHost={false}
              lastRolls={lastRolls}
              kickConfirmId={null}
              onRemove={noop}
              onClaimHost={noop}
              onAddBot={noop}
              onToggleReady={noop}
              onLeave={noop}
              spectating
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The winner, while the players vote on a rematch; a spectator has no vote of their own. */
function SpectatorFinished({ state }: { state: GameState }) {
  const { t } = useTranslation();
  const winner = state.players.find((player) => player.id === state.winnerId);

  return (
    <div className={cn('toy-card p-4 text-center sm:p-5', winner ? softBg[winner.color] : 'bg-background')}>
      <Trophy className='mx-auto text-amber-500 drop-shadow-[0_2px_0_var(--shadow-color)]' size={40} strokeWidth={2.5} />
      <p className='mt-2 flex items-center justify-center gap-2 font-display text-3xl leading-tight'>
        {winner && <PlayerToken color={winner.color} className='size-6' />}
        <span className='min-w-0 truncate'>{winner?.name}</span>
      </p>
      <p className='eyebrow mt-3 inline-flex rounded-md border-2 border-border bg-background-alternative px-2 py-0.5 text-foreground shadow-[0_2px_0_var(--shadow-color)]'>
        {t('room.won')}
      </p>
      <p className='mt-3 text-sm font-bold text-foreground/70'>{t('spectate.rematchNote')}</p>
    </div>
  );
}

function WatchLoading() {
  const { t } = useTranslation();

  return (
    <div className='grid flex-1 place-items-center px-4 py-12' role='status'>
      <div className='toy-card w-full max-w-md p-6 sm:p-8'>
        <p className='eyebrow text-accent'>{t('spectate.watching')}</p>
        <p className='mt-1 font-display text-3xl leading-tight sm:text-4xl'>{t('room.message.connecting')}</p>
      </div>
    </div>
  );
}

function WatchMessage({ title, detail }: { title: string; detail: string }) {
  const { t } = useTranslation();

  return (
    <div className='grid flex-1 place-items-center px-4 py-12 text-center'>
      <div className='reveal-load toy-card w-full max-w-md p-6 sm:p-8'>
        <h1 className='font-display text-4xl leading-tight'>{title}</h1>
        <p className='mt-3 font-bold text-foreground/70'>{detail}</p>
        <div className='mt-6 flex justify-center'>
          <Button asChild>
            <Link href='/discover'>
              <ArrowLeft size={18} strokeWidth={3} /> {t('spectate.back')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function send(socket: WebSocket, event: ClientEvent) {
  socket.send(JSON.stringify(event));
}
