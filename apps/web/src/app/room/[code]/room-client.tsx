'use client';

import type { ClientEvent, GameState, Player, PlayerLeftReason, RoomErrorCode, RoomSettings, ServerEvent } from '@ludo/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';

import { order } from '@/lib/reveal';
import { cn } from '@/lib/utils';

import { DecorLayer, ROOM_DECOR } from '@/components/decor';
import { GameBoard } from '@/components/game-board';
import { useSound } from '@/components/providers/sound';
import { LobbyPanel } from '@/components/room/lobby-panel';
import { PlayersPanel } from '@/components/room/players-panel';
import { RoomCard } from '@/components/room/room-card';
import { GameOver, TurnHud } from '@/components/room/turn-hud';
import { useLastRolls } from '@/components/room/use-last-rolls';
import { useRoomSounds } from '@/components/room/use-room-sounds';
import { Toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function RoomClient({ requestedCode }: { requestedCode: string }) {
  const { t } = useTranslation();
  const socketRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<{ code: RoomErrorCode; message: string } | null>(null);
  // `id` keys each notice's <Toast>, so a repeat of the same notice restarts its timer.
  const noticeIdRef = useRef(0);
  const [notice, setNotice] = useState<{ id: number; code: RoomErrorCode } | null>(null);
  // Someone joining or leaving, shown as a short-lived notice.
  const [presenceNotice, setPresenceNotice] = useState<{ id: number; playerName: string; reason: PlayerLeftReason | 'joined' } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [kickConfirmId, setKickConfirmId] = useState<string | null>(null);
  const { play } = useSound();
  const lastRolls = useLastRolls({
    diceResult: state?.diceResult ?? null,
    currentPlayerId: state?.currentPlayerId ?? null,
    phase: state?.phase ?? 'lobby',
  });

  useEffect(() => {
    let active = true;
    let joined = false;
    let currentRoomCode = requestedCode === 'NEW' ? null : requestedCode;
    let myPlayerId: string | null = null;
    // Clears any error/state left over from a previous requestedCode (e.g. a failed room lookup)
    // so a client-side retry shows "connecting" instead of getting stuck on the old result.
    setError(null);
    setState(null);
    setPlayerId(null);
    const playerName = sessionStorage.getItem('ludo-player-name')?.trim() ?? '';
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
        currentRoomCode = event.payload.state.roomCode;
        myPlayerId = event.payload.playerId;
        setPlayerId(event.payload.playerId);
        setState(event.payload.state);
        sessionStorage.setItem(`ludo-player:${event.payload.state.roomCode}`, event.payload.playerId);
        const joinedPlayer = event.payload.state.players.find((player) => player.id === event.payload.playerId);
        if (joinedPlayer) sessionStorage.setItem('ludo-player-name', joinedPlayer.name);
        if (requestedCode === 'NEW') {
          // "Play against the computer" on the home page creates the room with this many bots already seated.
          const botCount = Math.min(3, Math.max(0, Number(new URLSearchParams(window.location.search).get('bots')) || 0));
          for (let index = 0; index < botCount; index += 1) send(socket, { type: 'room:addBot', payload: {} });
          window.history.replaceState(null, '', `/room/${event.payload.state.roomCode}`);
        }
      } else if (event.type === 'game:state') {
        const storedPlayerId = sessionStorage.getItem(`ludo-player:${event.payload.roomCode}`);
        const currentPlayer = event.payload.players.find((player) => player.id === storedPlayerId);
        if (currentPlayer) sessionStorage.setItem('ludo-player-name', currentPlayer.name);
        setState(event.payload);
      } else if (event.type === 'player:joined') {
        if (event.payload.playerId !== myPlayerId) setPresenceNotice({ id: ++noticeIdRef.current, playerName: event.payload.playerName, reason: 'joined' });
      } else if (event.type === 'player:left') {
        if (event.payload.playerId === myPlayerId) {
          // A voluntary leave already navigates itself via leaveRoom() below; only kicks and
          // disconnect timeouts need to redirect home here, each with their own accurate reason.
          if (event.payload.reason !== 'left') {
            if (currentRoomCode) sessionStorage.removeItem(`ludo-player:${currentRoomCode}`);
            window.location.assign(`/?notice=${event.payload.reason}`);
          }
          return;
        }
        setPresenceNotice({ id: ++noticeIdRef.current, playerName: event.payload.playerName, reason: event.payload.reason });
      } else if (event.type === 'room:rematch') {
        const storedPlayerId = currentRoomCode ? sessionStorage.getItem(`ludo-player:${currentRoomCode}`) : null;
        if (currentRoomCode) sessionStorage.removeItem(`ludo-player:${currentRoomCode}`);
        if (event.payload.roomCode && storedPlayerId && event.payload.movedPlayerIds.includes(storedPlayerId)) {
          sessionStorage.setItem(`ludo-player:${event.payload.roomCode}`, storedPlayerId);
          window.location.assign(`/room/${event.payload.roomCode}`);
        } else {
          window.location.assign('/?notice=rematch-timeout');
        }
        return;
      } else if (event.type === 'room:error') {
        if (joined) setNotice({ id: ++noticeIdRef.current, code: event.payload.code });
        else setError(event.payload);
      }
    });
    socket.addEventListener('error', () => {
      if (active) setError({ code: 'UNKNOWN', message: 'connection' });
    });
    return () => {
      active = false;
      socket.close();
    };
  }, [requestedCode]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  useRoomSounds(state, playerId, now);

  // A refused action (not your turn, a piece that can't move, ...) gets the error buzz.
  useEffect(() => {
    if (notice) play('invalid');
  }, [notice, play]);

  // Asking to confirm a removal expires again, so a stray first click doesn't linger.
  useEffect(() => {
    if (!kickConfirmId) return;
    const timer = window.setTimeout(() => setKickConfirmId(null), 4_000);
    return () => window.clearTimeout(timer);
  }, [kickConfirmId]);

  function emit(event: ClientEvent) {
    if (socketRef.current?.readyState === WebSocket.OPEN) send(socketRef.current, event);
  }

  if (error) {
    // Being unable to get into this particular room is a dead end, not a broken connection: say what
    // happened, and offer another way in.
    const titles: Partial<Record<RoomErrorCode, string>> = {
      ROOM_NOT_FOUND: t('room.message.roomNotFound'),
      GAME_ALREADY_RUNNING: t('room.message.gameRunning'),
      ROOM_FULL: t('room.message.roomFull'),
    };
    const cannotEnter = error.code in titles;
    return (
      <Message
        title={titles[error.code] ?? t('room.message.connectionFailed')}
        detail={t(`room.errors.${error.code}`, { defaultValue: t('room.errors.UNKNOWN') })}
        showRoomChoices={cannotEnter}
      />
    );
  }

  if (!state || !playerId) return <RoomLoading />;

  const me = state.players.find((player) => player.id === playerId);
  const isHost = state.hostPlayerId === playerId;
  const settings = state.settings;
  const roomCode = state.roomCode;
  const lobby = state.phase === 'lobby';
  const secondsLeft = state.turnDeadline === null ? 0 : Math.min(settings.moveTimeSeconds, Math.max(0, Math.ceil((state.turnDeadline - now) / 1000)));
  const rematchSecondsLeft = state.rematchDeadline === null ? 30 : Math.max(0, Math.ceil((state.rematchDeadline - now) / 1000));

  function removePlayer(target: Player) {
    // Removing someone from a running game can't be undone, so it takes a second click.
    if (state?.phase === 'playing' && kickConfirmId !== target.id) {
      setKickConfirmId(target.id);
      return;
    }
    setKickConfirmId(null);
    emit({ type: 'room:kick', payload: { playerId: target.id } });
  }

  function updateSettings(update: Partial<RoomSettings>) {
    emit({ type: 'room:settings', payload: { ...settings, ...update } });
  }

  function leaveRoom() {
    sessionStorage.removeItem(`ludo-player:${roomCode}`);
    emit({ type: 'room:leave', payload: {} });
    window.setTimeout(() => window.location.assign('/'), 80);
  }

  return (
    <div className='relative flex flex-1 flex-col'>
      <DecorLayer items={ROOM_DECOR} />
      <div className='relative mx-auto w-full max-w-480 flex-1 px-3 py-3 sm:px-6 sm:py-5 lg:px-8 lg:py-6'>
        {/* Notices float above the page, so they're seen wherever the panels have scrolled to. */}
        <div className='pointer-events-none fixed inset-x-3 top-20 z-50 mx-auto flex max-w-md flex-col gap-2'>
          {presenceNotice && (
            <Toast
              key={presenceNotice.id}
              role='status'
              aria-live='polite'
              duration={5_000}
              onDismiss={() => setPresenceNotice(null)}
              className='toy-card pointer-events-auto p-3 text-sm font-extrabold'
            >
              {t(`room.leaveNotice.${presenceNotice.reason}`, { name: presenceNotice.playerName })}
            </Toast>
          )}
          {notice && (
            <Toast
              key={notice.id}
              role='alert'
              onDismiss={() => setNotice(null)}
              className='toy-card pointer-events-auto border-p-red bg-p-red-soft p-3 text-sm font-extrabold'
            >
              {t(`room.errors.${notice.code}`, { defaultValue: t('room.errors.UNKNOWN') })}
            </Toast>
          )}
        </div>

        <div className='room-grid'>
          <div className='room-hud reveal-load' style={order(0)} data-sticky={state.phase === 'playing' ? '' : undefined}>
            {lobby ? (
              <RoomCard roomCode={roomCode} onLeave={leaveRoom} />
            ) : state.phase === 'finished' ? (
              <GameOver
                state={state}
                playerId={playerId}
                rematchSecondsLeft={rematchSecondsLeft}
                onRematch={() => emit({ type: 'game:rematch', payload: {} })}
                onLeave={leaveRoom}
              />
            ) : (
              <TurnHud state={state} playerId={playerId} lastRolls={lastRolls} secondsLeft={secondsLeft} />
            )}
          </div>

          {/* Nothing to play yet in the lobby, so on a phone the setup panels get the space instead. */}
          <section className={cn('room-board reveal-load', lobby && 'hidden lg:block')} style={order(1)}>
            <GameBoard
              className='room-board-size mx-auto'
              state={state}
              playerId={playerId}
              onMove={(pieceId) => emit({ type: 'game:move', payload: { pieceId } })}
            />
          </section>

          <div className='room-players reveal-load' style={order(2)}>
            <PlayersPanel
              state={state}
              playerId={playerId}
              isHost={isHost}
              lastRolls={lastRolls}
              kickConfirmId={kickConfirmId}
              onRemove={removePlayer}
              onClaimHost={() => emit({ type: 'room:claimHost', payload: {} })}
              onAddBot={() => emit({ type: 'room:addBot', payload: {} })}
              onToggleReady={(ready) => emit({ type: 'player:ready', payload: { ready } })}
              onLeave={leaveRoom}
            />
          </div>

          {/* Only the lobby has anything for this slot (your profile and the room settings). */}
          {lobby && (
            <div className='room-side reveal-load' style={order(3)}>
              <LobbyPanel
                me={me}
                players={state.players}
                settings={settings}
                isHost={isHost}
                onProfileChange={(profile) => emit({ type: 'player:update', payload: profile })}
                onSettingsChange={updateSettings}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function send(socket: WebSocket, event: ClientEvent) {
  socket.send(JSON.stringify(event));
}

/**
 * What the room shows while it connects. It is laid out like the room itself and fills the screen, so
 * when the real room arrives the footer is already below the fold and nothing visibly jumps.
 */
function RoomLoading() {
  const { t } = useTranslation();

  return (
    <div className='mx-auto flex min-h-dvh w-full max-w-480 flex-col px-3 py-3 sm:px-6 sm:py-5 lg:px-8 lg:py-6' role='status'>
      <div className='room-grid'>
        <div className='room-hud'>
          <div className='toy-card p-4 sm:p-5'>
            <p className='eyebrow text-accent'>{t('room.message.openingRoom')}</p>
            <p className='mt-1 font-display text-3xl leading-tight sm:text-4xl'>{t('room.message.connecting')}</p>
          </div>
        </div>
        <div className='room-board'>
          <div className='room-board-size mx-auto aspect-square animate-pulse rounded-2xl border-4 border-border bg-foreground/5 shadow-[8px_8px_0_var(--shadow-color)]' />
        </div>
        <div className='room-players'>
          <div className='toy-card h-56 animate-pulse bg-foreground/5 shadow-none' />
        </div>
      </div>
    </div>
  );
}

function Message({ title, detail, showRoomChoices = false }: { title: string; detail: string; showRoomChoices?: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className='grid flex-1 place-items-center px-4 py-12 text-center'>
      <div className='reveal-load toy-card w-full max-w-md p-6 sm:p-8'>
        <h1 className='font-display text-4xl leading-tight'>{title}</h1>
        <p className='mt-3 font-bold text-foreground/70'>{detail}</p>
        {showRoomChoices && (
          <>
            <form
              className='mt-7 flex gap-2'
              onSubmit={(event) => {
                event.preventDefault();
                if (roomCode.length !== 6) return;
                setSubmitting(true);
                // A client-side transition (rather than a full reload) reuses this same screen, so a
                // wrong code lands back here with a clear "not found" result instead of a blank retry.
                router.push(`/room/${roomCode}`);
              }}
            >
              <Input
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                maxLength={6}
                placeholder={t('start.roomPlaceholder')}
                aria-label={t('start.roomLabel')}
                autoComplete='off'
                autoCorrect='off'
                autoCapitalize='characters'
                spellCheck={false}
                inputMode='text'
                disabled={submitting}
                className='min-w-0 flex-1 font-display text-xl uppercase tracking-[.2em] placeholder:font-display placeholder:tracking-[.2em]'
              />
              <Button
                type='submit'
                variant='outline'
                size='icon'
                className='size-12'
                aria-label={t('start.joinAria')}
                disabled={roomCode.length !== 6 || submitting}
              >
                <ArrowRight size={22} strokeWidth={3} />
              </Button>
            </form>
            <p className='mt-2 h-4 text-xs font-bold text-foreground/60' aria-live='polite'>
              {submitting ? t('room.message.lookingUpRoom') : ''}
            </p>
            <div className='mt-2 flex items-center gap-3 text-xs font-extrabold uppercase text-foreground/70'>
              <span className='h-0.5 flex-1 rounded-full bg-foreground/20' /> {t('start.or')} <span className='h-0.5 flex-1 rounded-full bg-foreground/20' />
            </div>
            <div className='mt-4 flex flex-col justify-center gap-3 sm:flex-row'>
              <Button asChild>
                <a href='/room/new'>
                  <Plus size={18} strokeWidth={3} /> {t('room.message.newRoom')}
                </a>
              </Button>
              <Button variant='outline' asChild>
                <a href='/'>
                  <ArrowLeft size={18} strokeWidth={3} /> {t('room.message.toHomepage')}
                </a>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
