'use client';

import { GameBoard } from '@/components/game-board';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ClientEvent, GameState, PlayerColor, ServerEvent } from '@ludo/shared';
import { Check, Clock3, Copy, Dices, Trophy, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const colorClasses: Record<PlayerColor, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-600',
  green: 'bg-emerald-600',
  yellow: 'bg-amber-400',
};

export function RoomClient({ requestedCode }: { requestedCode: string }) {
  const searchParams = useSearchParams();
  const socketRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const playerName = searchParams.get('name')?.trim() ?? '';

  useEffect(() => {
    let active = true;
    let joined = false;
    const socket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001/ws');
    socketRef.current = socket;
    socket.addEventListener('open', () => {
      if (!active) return;
      send(
        socket,
        requestedCode === 'NEW'
          ? { type: 'room:create', payload: { playerName } }
          : {
              type: 'room:join',
              payload: {
                roomCode: requestedCode,
                playerName,
                ...(sessionStorage.getItem(`ludo-player:${requestedCode}`) ? { playerId: sessionStorage.getItem(`ludo-player:${requestedCode}`)! } : {}),
              },
            },
      );
    });
    socket.addEventListener('message', (message) => {
      if (!active) return;
      const event = JSON.parse(String(message.data)) as ServerEvent;
      if (event.type === 'room:joined') {
        joined = true;
        setPlayerId(event.payload.playerId);
        setState(event.payload.state);
        sessionStorage.setItem(`ludo-player:${event.payload.state.roomCode}`, event.payload.playerId);
        if (requestedCode === 'NEW') {
          window.history.replaceState(null, '', `/room/${event.payload.state.roomCode}?name=${encodeURIComponent(playerName)}`);
        }
      } else if (event.type === 'game:state') {
        setState(event.payload);
      } else if (event.type === 'room:error') {
        if (joined) setNotice(event.payload.message);
        else setError(event.payload.message);
      }
    });
    socket.addEventListener('error', () => {
      if (active) setError('Keine Verbindung zum Spielserver.');
    });
    return () => {
      active = false;
      socket.close();
    };
  }, [playerName, requestedCode]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  function emit(event: ClientEvent) {
    if (socketRef.current?.readyState === WebSocket.OPEN) send(socketRef.current, event);
  }

  if (error) return <Message title='Verbindung fehlgeschlagen' detail={error} />;
  if (!state || !playerId) return <Message title='Raum wird geöffnet' detail='Verbindung zum Spielserver wird hergestellt ...' />;

  const me = state.players.find((player) => player.id === playerId);
  const currentPlayer = state.players.find((player) => player.id === state.currentPlayerId);
  const winner = state.players.find((player) => player.id === state.winnerId);
  const isMyTurn = state.currentPlayerId === playerId;
  const secondsLeft = state.turnDeadline === null ? 0 : Math.min(30, Math.max(0, Math.ceil((state.turnDeadline - now) / 1000)));
  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/room/${state.roomCode}`;

  return (
    <main className='mx-auto min-h-screen max-w-6xl px-6 py-8 sm:py-12'>
      <header className='flex flex-wrap items-end justify-between gap-5 border-b-2 border-stone-900 pb-6'>
        <div>
          <p className='text-xs font-bold uppercase text-stone-500'>Raum</p>
          <h1 className='font-mono text-4xl font-black tracking-widest'>{state.roomCode}</h1>
        </div>
        <Button variant='outline' onClick={() => navigator.clipboard.writeText(shareUrl)}>
          <Copy size={17} /> Link kopieren
        </Button>
      </header>

      <div className='grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_20rem]'>
        <section className='flex min-w-0 justify-center'>
          <GameBoard state={state} playerId={playerId} onMove={(pieceId) => emit({ type: 'game:move', payload: { pieceId } })} />
        </section>

        <aside>
          {state.phase !== 'lobby' && (
            <section className='mb-6 flex h-56 flex-col border-2 border-stone-900 bg-white p-5 shadow-[5px_5px_0_#1c1917]'>
              {state.phase === 'finished' ? (
                <div className='grid flex-1 place-items-center text-center'>
                  <div>
                    <Trophy className='mx-auto mb-2 text-amber-500' size={32} />
                    <p className='text-xs font-bold uppercase text-stone-500'>Gewonnen</p>
                    <p className='mt-1 text-2xl font-black'>{winner?.name}</p>
                  </div>
                </div>
              ) : (
                <div className='flex min-h-0 flex-1 flex-col'>
                  <div className='flex min-h-12 items-center justify-between gap-3'>
                    <div>
                      <p className='text-xs font-bold uppercase text-stone-500'>Am Zug</p>
                      <p className='max-w-48 truncate text-xl font-black'>{currentPlayer?.name}</p>
                    </div>
                    <div className='flex h-8 w-16 shrink-0 items-center justify-end gap-2 font-mono text-2xl font-black'>
                      {state.turnStage === 'move' && (
                        <>
                          <Clock3 size={20} /> {secondsLeft}
                        </>
                      )}
                    </div>
                  </div>
                  <div className={cn('mt-3 h-2 shrink-0 overflow-hidden', state.turnStage === 'move' && 'bg-stone-200')}>
                    {state.turnStage === 'move' && (
                      <div className='h-full bg-red-500 transition-[width] duration-200' style={{ width: `${(secondsLeft / 30) * 100}%` }} />
                    )}
                  </div>
                  <div className='grid min-h-0 flex-1 place-items-center text-center'>
                    {state.turnStage === 'rolling' ? (
                      <div>
                        <Dices className='dice-rolling mx-auto' size={58} strokeWidth={2.2} />
                        <p className='mt-2 text-sm font-bold'>Würfel rollt ...</p>
                      </div>
                    ) : (
                      <div>
                        <p className='text-6xl font-black leading-none'>{state.diceResult}</p>
                        {state.turnStage === 'move' && (
                          <p className='mt-2 text-sm font-bold'>
                            {isMyTurn ? 'Wähle eine Figur, um sie zu bewegen' : `${currentPlayer?.name} wählt eine Figur`}
                          </p>
                        )}
                        {state.turnStage === 'no-move' && <p className='mt-2 text-sm font-bold text-red-700'>Kein gültiger Zug</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          <h2 className='mb-4 flex items-center gap-2 text-lg font-black'>
            <Users size={19} /> Spieler {state.players.length}/4
          </h2>
          <div className='space-y-3'>
            {state.players.map((player) => (
              <div key={player.id} className='flex items-center gap-3 border border-stone-300 bg-white p-3'>
                <span className={`h-4 w-4 rounded-full ${colorClasses[player.color]}`} />
                <span className='min-w-0 flex-1 truncate font-bold'>
                  {player.name}
                  {player.id === playerId ? ' (du)' : ''}
                </span>
                {player.ready && <Check size={18} className='text-emerald-700' aria-label='Bereit' />}
              </div>
            ))}
          </div>
          {state.phase === 'lobby' && (
            <Button
              className='mt-5 w-full'
              variant={me?.ready ? 'outline' : 'default'}
              onClick={() => emit({ type: 'player:ready', payload: { ready: !me?.ready } })}
            >
              {me?.ready ? 'Nicht bereit' : 'Ich bin bereit'}
            </Button>
          )}
          {state.phase === 'lobby' && (
            <p className='mt-4 text-sm leading-6 text-stone-500'>Das Spiel startet automatisch, sobald mindestens zwei Spieler bereit sind.</p>
          )}
          {notice && (
            <p role='alert' className='mt-4 border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800'>
              {notice}
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}

function send(socket: WebSocket, event: ClientEvent) {
  socket.send(JSON.stringify(event));
}

function Message({ title, detail }: { title: string; detail: string }) {
  return (
    <main className='grid min-h-screen place-items-center px-6 text-center'>
      <div>
        <h1 className='text-4xl font-bold'>{title}</h1>
        <p className='mt-3 text-stone-600'>{detail}</p>
      </div>
    </main>
  );
}
