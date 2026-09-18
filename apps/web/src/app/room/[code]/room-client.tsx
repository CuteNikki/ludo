'use client';

import { GameBoard } from '@/components/game-board';
import { LanguageToggle } from '@/components/language-toggle';
import { SiteFooter } from '@/components/site-footer';
import { TapTooltip } from '@/components/tap-tooltip';
import { ThemeToggle } from '@/components/theme-toggle';
import { Toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { ClientEvent, GameState, MoveTimeSeconds, Player, PlayerColor, PlayerLeftReason, RoomErrorCode, RoomSettings, ServerEvent } from '@ludo/shared';
import {
  ArrowRight,
  Bot,
  BookOpen,
  Check,
  Clock3,
  CopyCheckIcon,
  CopyIcon,
  Crown,
  Dice6,
  Dices,
  DicesIcon,
  Globe,
  Home,
  Info,
  LogOut,
  Palette,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Trophy,
  UserMinus,
  UserRound,
  Users,
  Vote,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const colorClasses: Record<PlayerColor, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  yellow: 'bg-yellow-400',
};

const activePlayerClasses: Record<PlayerColor, string> = {
  red: 'border-red-500 shadow-[inset_4px_0_0_#ef4444]',
  blue: 'border-blue-600 shadow-[inset_4px_0_0_#2563eb]',
  green: 'border-green-600 shadow-[inset_4px_0_0_#059669]',
  yellow: 'border-yellow-400 shadow-[inset_4px_0_0_#fbbf24]',
};

export function RoomClient({ requestedCode }: { requestedCode: string }) {
  const { t } = useTranslation();
  const socketRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<{ code: RoomErrorCode; message: string } | null>(null);
  // `id` keys each notice's <Toast>, so a repeat of the same notice restarts its timer.
  const noticeIdRef = useRef(0);
  const [notice, setNotice] = useState<{ id: number; code: RoomErrorCode } | null>(null);
  const [leaveNotice, setLeaveNotice] = useState<{ id: number; playerName: string; reason: PlayerLeftReason } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [kickConfirmId, setKickConfirmId] = useState<string | null>(null);

  const colorNames: Record<PlayerColor, string> = {
    red: t('room.colors.red'),
    blue: t('room.colors.blue'),
    green: t('room.colors.green'),
    yellow: t('room.colors.yellow'),
  };

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
        setLeaveNotice({ id: ++noticeIdRef.current, playerName: event.payload.playerName, reason: event.payload.reason });
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
    const roomNotFound = error.code === 'ROOM_NOT_FOUND';
    return (
      <Message
        title={roomNotFound ? t('room.message.roomNotFound') : t('room.message.connectionFailed')}
        detail={t(`room.errors.${error.code}`, { defaultValue: t('room.errors.UNKNOWN') })}
        showRoomChoices={roomNotFound}
      />
    );
  }

  if (!state || !playerId) return <Message title={t('room.message.openingRoom')} detail={t('room.message.connecting')} />;

  const me = state.players.find((player) => player.id === playerId);
  const currentPlayer = state.players.find((player) => player.id === state.currentPlayerId);
  const winner = state.players.find((player) => player.id === state.winnerId);
  const isMyTurn = state.currentPlayerId === playerId;
  const isHost = state.hostPlayerId === playerId;
  const settings = state.settings;
  const roomCode = state.roomCode;
  const secondsLeft = state.turnDeadline === null ? 0 : Math.min(settings.moveTimeSeconds, Math.max(0, Math.ceil((state.turnDeadline - now) / 1000)));
  const rematchSecondsLeft = state.rematchDeadline === null ? 30 : Math.max(0, Math.ceil((state.rematchDeadline - now) / 1000));
  const wantsRematch = state.rematchPlayerIds.includes(playerId);
  // Bots decide their own move, so their turns have no countdown to show.
  const showCountdown = state.turnStage === 'move' && state.turnDeadline !== null;
  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/room/${roomCode}`;

  async function copyRoomLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1_600);
  }

  async function copyRoomCode() {
    await navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1_600);
  }

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
    <>
      <main className='room-shell mx-auto min-h-screen max-w-6xl px-3 py-2 sm:px-4 sm:py-6'>
        <header className='room-header flex flex-wrap items-center justify-between gap-4 border-4 border-border bg-background-alternative p-4 shadow-card sm:p-5'>
          <div className='flex items-center gap-2'>
            <a href='/' aria-label={t('room.message.toHomepage')}>
              <DicesIcon className='size-10 shrink-0 rounded-lg bg-foreground p-1.5 text-background' />
            </a>
            <div>
              <p className='text-xs font-black uppercase tracking-[.16em] text-red-700 dark:text-red-400'>{t('room.eyebrow')}</p>
              <button
                type='button'
                onClick={copyRoomCode}
                aria-label={copiedCode ? t('room.copied') : t('room.copyCodeAria')}
                title={copiedCode ? t('room.copied') : t('room.copyCodeAria')}
                className='group flex touch-manipulation items-center gap-1.5 font-mono text-xl font-black tracking-widest transition-colors hover:text-foreground/70'
              >
                {state.roomCode}
                {copiedCode ? (
                  <CopyCheckIcon size={16} className='shrink-0' />
                ) : (
                  <CopyIcon size={16} className='shrink-0 opacity-0 transition-opacity group-hover:opacity-60' />
                )}
              </button>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <LanguageToggle />
            <ThemeToggle />
            <Button
              variant='outline'
              asChild
              className='hidden h-10 px-2 bg-background-alternative text-foreground hover:bg-background hover:text-foreground sm:inline-flex'
            >
              <a href='/rules' target='_blank' rel='noreferrer'>
                <BookOpen size={17} /> {t('room.rules')}
              </a>
            </Button>
            <Button
              variant='outline'
              className='h-10 px-2 bg-background-alternative text-foreground hover:bg-background hover:text-foreground'
              onClick={copyRoomLink}
            >
              {copiedLink ? <CopyCheckIcon /> : <CopyIcon />} {copiedLink ? t('room.copied') : t('room.copyLink')}
            </Button>
          </div>
        </header>

        <div className='grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-10'>
          <section className='animate-board-enter flex min-w-0 self-start justify-center p-1 sm:p-3 lg:justify-start lg:p-0'>
            <GameBoard state={state} playerId={playerId} onMove={(pieceId) => emit({ type: 'game:move', payload: { pieceId } })} />
          </section>

          <aside className='self-start border-4 border-border bg-background-alternative p-5 shadow-card'>
            {state.phase !== 'lobby' && (
              <section className={cn('turn-panel mb-6 flex flex-col border-b-2 border-border pb-6', state.phase === 'finished' ? 'min-h-56' : 'h-56')}>
                {state.phase === 'finished' ? (
                  <div className='grid flex-1 place-items-center text-center'>
                    <div className='w-full'>
                      <Trophy className='mx-auto mb-1 text-amber-500' size={27} />
                      <p className='text-xs font-bold uppercase text-foreground/60'>{t('room.won')}</p>
                      <p className='mt-1 text-2xl font-black'>{winner?.name}</p>

                      {state.rematchDeadline === null ? (
                        <>
                          <p className='mt-1 h-5 text-xs font-bold text-foreground/60'>{t('room.oneMoreRound')}</p>
                          <div className='mt-3 grid grid-cols-2 gap-2'>
                            <Button className='h-10 px-3 text-xs' disabled={wantsRematch} onClick={() => emit({ type: 'game:rematch', payload: {} })}>
                              {wantsRematch ? <Check size={16} /> : <RotateCcw size={16} />}
                              {wantsRematch ? t('room.rematchAccepted') : t('room.rematchCta')}
                            </Button>
                            <Button className='h-10 px-3 text-xs' variant='outline' onClick={leaveRoom}>
                              <LogOut size={16} /> {t('room.mainMenu')}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div
                          role='status'
                          aria-live='assertive'
                          className='mt-3 border-2 border-amber-500 bg-amber-500/10 p-3 dark:border-amber-400 dark:bg-amber-400/10'
                        >
                          <p className='flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wide text-amber-700 dark:text-amber-400'>
                            <span className='relative flex h-2 w-2 items-center justify-center'>
                              <span className='absolute h-2 w-2 rounded-full bg-amber-500 animate-ping dark:bg-amber-400' />
                              <span className='absolute h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400' />
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
                          <div className='mt-2 h-1.5 overflow-hidden bg-amber-500/20 dark:bg-amber-400/20'>
                            <div
                              className='h-full bg-amber-500 transition-[width] duration-200 dark:bg-amber-400'
                              style={{ width: `${(rematchSecondsLeft / 30) * 100}%` }}
                            />
                          </div>
                          <div className='mt-3 grid grid-cols-2 gap-2'>
                            <Button className='h-10 px-3 text-xs' disabled={wantsRematch} onClick={() => emit({ type: 'game:rematch', payload: {} })}>
                              {wantsRematch ? <Check size={16} /> : <RotateCcw size={16} />}
                              {wantsRematch ? t('room.rematchAccepted') : t('room.rematchCta')}
                            </Button>
                            <Button className='h-10 px-3 text-xs' variant='outline' onClick={leaveRoom}>
                              <LogOut size={16} /> {t('room.mainMenu')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className='flex min-h-0 flex-1 flex-col'>
                    <div className='flex min-h-12 items-center justify-between gap-3'>
                      <div>
                        <p className='text-xs font-bold uppercase text-foreground/60'>{t('room.yourTurn')}</p>
                        <p className='max-w-48 truncate text-xl font-black'>{currentPlayer?.name}</p>
                      </div>
                      <div className='flex h-8 w-16 shrink-0 items-center justify-end gap-2 font-mono text-2xl font-black'>
                        {showCountdown && (
                          <>
                            <Clock3 size={20} /> {secondsLeft}
                          </>
                        )}
                      </div>
                    </div>
                    <div className={cn('mt-3 h-2 shrink-0 overflow-hidden', showCountdown && 'bg-border/20')}>
                      {showCountdown && (
                        <div
                          className='h-full bg-red-500 transition-[width] duration-200'
                          style={{ width: `${(secondsLeft / state.settings.moveTimeSeconds) * 100}%` }}
                        />
                      )}
                    </div>
                    <div key={`${state.revision}-${state.turnStage}`} className='animate-status-swap grid min-h-0 flex-1 place-items-center text-center'>
                      {state.turnStage === 'rolling' ? (
                        <div>
                          <Dices className='animate-dice-rolling mx-auto' size={58} strokeWidth={2.2} />
                          <p className='mt-2 text-sm font-bold'>{t('room.rollAnimating')}</p>
                        </div>
                      ) : (
                        <div>
                          <p className='animate-dice-result font-display text-6xl font-black leading-none'>{state.diceResult}</p>
                          {state.turnStage === 'move' && (
                            <p className='mt-2 text-sm font-bold'>
                              {currentPlayer?.isBot
                                ? t('room.botThinking', { name: currentPlayer.name })
                                : isMyTurn
                                  ? t('room.chooseAPieceSelf')
                                  : t('room.chooseAPieceOther')}
                            </p>
                          )}
                          {state.turnStage === 'auto-move' && <p className='mt-2 text-sm font-bold'>{t('room.autoMoving')}</p>}
                          {state.turnStage === 'no-move' && <p className='mt-2 text-sm font-bold text-red-700 dark:text-red-400'>{t('room.noValidMove')}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {state.phase === 'lobby' && me && (
              <PlayerProfile
                player={me}
                players={state.players}
                colorNames={colorNames}
                onChange={(profile) => emit({ type: 'player:update', payload: profile })}
              />
            )}

            {state.phase === 'lobby' && <LobbySettings settings={state.settings} isHost={isHost} onChange={updateSettings} />}

            <h2 className='mb-4 flex items-center gap-2 text-lg font-black'>
              <Users size={19} /> {t('room.players')} {state.players.length}/4
            </h2>
            <div className='space-y-2'>
              {state.players.map((player) => (
                <div
                  key={player.id}
                  className={cn(
                    'relative flex min-h-12 items-center gap-3 border-2 bg-background p-3 transition-[border-color,box-shadow,background-color,transform] duration-300',
                    player.id === state.currentPlayerId ? activePlayerClasses[player.color] : 'border-border',
                    !player.connected && 'opacity-55',
                  )}
                >
                  <span className={cn('h-4 w-4 rounded-full border-2 border-background-alternative shadow-sm', colorClasses[player.color])} />
                  <span className='flex min-w-0 flex-1 items-center gap-1.5 font-bold'>
                    <span className='truncate'>
                      {player.name}
                      {player.id === playerId ? t('room.you') : ''}
                    </span>
                    {player.isBot && <Bot size={15} className='shrink-0 text-foreground/60' aria-label={t('room.bot')} />}
                  </span>
                  {player.id === state.hostPlayerId &&
                    (state.phase === 'lobby' ? (
                      <span className='text-[10px] font-bold uppercase text-foreground/60'>{t('room.host')}</span>
                    ) : (
                      <Crown size={15} className='shrink-0 text-amber-600 dark:text-amber-400' aria-label={t('room.host')} />
                    ))}
                  {player.id === state.currentPlayerId && state.phase === 'playing' && (
                    <span className='text-[10px] font-bold uppercase text-foreground/60'>{t('room.yourTurn')}</span>
                  )}
                  {player.ready && <Check size={18} className='text-emerald-700 dark:text-emerald-400' aria-label={t('room.imReady')} />}
                  {state.phase === 'finished' && state.rematchPlayerIds.includes(player.id) && (
                    <Vote size={16} className='text-amber-600 dark:text-amber-400' aria-label={t('room.rematchVotedAria', { name: player.name })} />
                  )}
                  {state.phase !== 'finished' && isHost && player.id !== playerId && (
                    <button
                      type='button'
                      onClick={() => removePlayer(player)}
                      aria-label={t(kickConfirmId === player.id ? 'room.removePlayerConfirmAria' : 'room.removePlayerAria', { name: player.name })}
                      title={t(kickConfirmId === player.id ? 'room.removePlayerConfirmAria' : 'room.removePlayerAria', { name: player.name })}
                      className={cn(
                        'btn-press grid h-8 shrink-0 touch-manipulation place-items-center text-foreground/60 transition-colors hover:bg-red-500/15 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground',
                        kickConfirmId === player.id ? 'bg-red-500/15 px-2 text-xs font-black uppercase text-red-600 dark:text-red-400' : 'w-8',
                      )}
                    >
                      {kickConfirmId === player.id ? t('room.removeConfirm') : <UserMinus size={17} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {state.phase === 'lobby' && isHost && state.players.length < 4 && (
              <Button variant='outline' className='mt-3 w-full' onClick={() => emit({ type: 'room:addBot', payload: {} })}>
                <Bot size={17} /> {t('room.addBot')}
              </Button>
            )}
            {state.phase === 'lobby' && (
              <Button
                className='mt-5 w-full'
                variant={me?.ready ? 'outline' : 'default'}
                onClick={() => emit({ type: 'player:ready', payload: { ready: !me?.ready } })}
              >
                {me?.ready ? t('room.notReady') : t('room.imReady')}
              </Button>
            )}
            {state.phase === 'lobby' && <p className='mt-4 text-sm font-medium leading-6 text-foreground/80'>{t('room.startHint')}</p>}
            {leaveNotice && (
              <Toast
                key={leaveNotice.id}
                role='status'
                aria-live='polite'
                duration={5_000}
                onDismiss={() => setLeaveNotice(null)}
                className='mt-4 border border-border bg-background p-3 text-sm font-bold text-foreground/80'
              >
                {t(`room.leaveNotice.${leaveNotice.reason}`, { name: leaveNotice.playerName })}
              </Toast>
            )}
            {notice && (
              <Toast
                key={notice.id}
                role='alert'
                onDismiss={() => setNotice(null)}
                className='mt-4 border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-600 dark:text-red-400'
              >
                {t(`room.errors.${notice.code}`, { defaultValue: t('room.errors.UNKNOWN') })}
              </Toast>
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function PlayerProfile({
  player,
  players,
  colorNames,
  onChange,
}: {
  player: Player;
  players: Player[];
  colorNames: Record<PlayerColor, string>;
  onChange: (profile: { name: string; color: PlayerColor }) => void;
}) {
  const { t } = useTranslation();
  const [draftName, setDraftName] = useState(player.name);
  const onChangeRef = useRef(onChange);
  const saveTimerRef = useRef<number | null>(null);
  const colors = Object.keys(colorNames) as PlayerColor[];

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setDraftName(player.name);
  }, [player.name]);

  useEffect(() => {
    // Skip autosaving while the field is blank - the server would just fall back to a default name,
    // and that fallback echoing back mid-edit would overwrite whatever the player is about to type.
    if (draftName === player.name || draftName.trim() === '') return;
    saveTimerRef.current = window.setTimeout(() => {
      onChangeRef.current({ name: draftName, color: player.color });
    }, 500);
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, [draftName, player.color, player.name]);

  function commitName() {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    if (draftName.trim() === '') {
      setDraftName(player.name);
      return;
    }
    if (draftName !== player.name) onChangeRef.current({ name: draftName, color: player.color });
  }

  return (
    <section className='mb-0 border-b-2 border-border pb-5 lg:mb-7'>
      <h2 className='mb-4 flex items-center gap-2 text-lg font-black'>
        <UserRound size={19} /> {t('room.profile.title')}
      </h2>
      <Input
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        maxLength={24}
        aria-label={t('room.profile.nameAria')}
        className='bg-background px-3'
      />

      <div className='mt-4 flex items-center justify-between gap-4'>
        <span className='flex items-center gap-2 text-sm font-bold'>
          <Palette size={17} /> {t('room.profile.color')}
        </span>
        <div className='flex gap-2' role='group' aria-label={t('room.profile.colorGroupAria')}>
          {colors.map((color) => {
            const occupied = players.some((candidate) => candidate.id !== player.id && candidate.color === color);
            const selected = player.color === color;
            return (
              <button
                key={color}
                type='button'
                disabled={occupied}
                onClick={() => onChange({ name: draftName, color })}
                aria-label={`${colorNames[color]}${occupied ? t('room.profile.occupiedSuffix') : ''}`}
                aria-pressed={selected}
                title={occupied ? `${colorNames[color]}${t('room.profile.occupiedSuffix')}` : colorNames[color]}
                className={cn(
                  'h-8 w-8 touch-manipulation rounded-full border-2 border-background-alternative shadow-[0_0_0_2px_var(--color-border)] transition-[transform,box-shadow,opacity] hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-25',
                  colorClasses[color],
                  selected && 'scale-105 shadow-[0_0_0_3px_var(--color-foreground)]',
                )}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LobbySettings({ settings, isHost, onChange }: { settings: RoomSettings; isHost: boolean; onChange: (update: Partial<RoomSettings>) => void }) {
  const { t } = useTranslation();
  const moveTimes: MoveTimeSeconds[] = [15, 30, 45, 60];

  return (
    <section className='mb-7 border-b-2 border-border py-5 sm:pt-0'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <h2 className='flex items-center gap-2 text-lg font-black'>
          <Settings2 size={19} /> {t('room.settings.title')}
        </h2>
        {!isHost && <span className='text-[10px] font-bold uppercase text-foreground/60'>{t('room.settings.hostOnly')}</span>}
      </div>

      <fieldset className='space-y-2'>
        <div>
          <legend className='mb-2 flex w-full items-center gap-2 text-sm font-bold'>
            <Clock3 size={16} /> {t('room.settings.moveTime')}
            <InfoTooltip text={t('room.settings.moveTimeInfo')} />
          </legend>
          <div
            className={cn('grid grid-cols-4 border-2 border-border bg-background p-1', !isHost && 'opacity-60')}
            role='group'
            aria-label={t('room.settings.moveTimeGroupAria')}
          >
            {moveTimes.map((seconds) => (
              <button
                key={seconds}
                type='button'
                disabled={!isHost}
                onClick={() => onChange({ moveTimeSeconds: seconds })}
                className={cn(
                  'h-9 touch-manipulation text-sm font-bold transition-colors disabled:cursor-not-allowed',
                  settings.moveTimeSeconds === seconds ? 'bg-foreground text-background' : 'text-foreground/70 hover:bg-background-alternative',
                )}
                aria-pressed={settings.moveTimeSeconds === seconds}
              >
                {seconds}s
              </button>
            ))}
          </div>
        </div>

        <SettingToggle
          icon={<Sparkles size={17} />}
          label={t('room.settings.autoMoves')}
          description={t('room.settings.autoMovesInfo')}
          checked={settings.automaticSingleMove}
          disabled={!isHost}
          onChange={(checked) => onChange({ automaticSingleMove: checked })}
        />
        <SettingToggle
          icon={<Dices size={17} />}
          label={t('room.settings.fairDice')}
          description={t('room.settings.fairDiceInfo')}
          checked={settings.fairDice}
          disabled={!isHost}
          onChange={(checked) => onChange({ fairDice: checked })}
        />
        <SettingToggle
          icon={<Dice6 size={17} />}
          label={t('room.settings.mustSpawnOnSix')}
          description={t('room.settings.mustSpawnOnSixInfo')}
          checked={settings.mustSpawnOnSix}
          disabled={!isHost}
          onChange={(checked) => onChange({ mustSpawnOnSix: checked })}
        />
        <SettingToggle
          icon={<Globe size={17} />}
          label={t('room.settings.isPublic')}
          description={t('room.settings.isPublicInfo')}
          checked={settings.isPublic}
          disabled={!isHost}
          onChange={(checked) => onChange({ isPublic: checked })}
        />
      </fieldset>
    </section>
  );
}

function SettingToggle({
  icon,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className='flex min-h-10 items-center justify-between gap-4'>
      <span className='flex min-w-0 flex-1 items-center gap-2 text-sm font-bold'>
        <span className={cn('flex min-w-0 items-center gap-2', disabled && 'opacity-60')}>
          {icon}
          <span className='min-w-0'>{label}</span>
        </span>
        <InfoTooltip text={description} />
      </span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const { t } = useTranslation();

  return (
    <TapTooltip
      content={text}
      label={t('room.settings.title')}
      contentClassName='w-64'
      className='ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-full text-foreground/60 transition-colors hover:bg-background hover:text-foreground focus-visible:bg-background focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground'
    >
      <Info size={16} />
    </TapTooltip>
  );
}

function send(socket: WebSocket, event: ClientEvent) {
  socket.send(JSON.stringify(event));
}

function Message({ title, detail, showRoomChoices = false }: { title: string; detail: string; showRoomChoices?: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <main className='grid min-h-screen place-items-center px-6 text-center'>
      <div className='border-4 border-border bg-background-alternative p-8 shadow-card'>
        <h1 className='text-4xl font-bold'>{title}</h1>
        <p className='mt-3 text-foreground/70'>{detail}</p>
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
                className='min-w-0 flex-1 bg-background font-mono uppercase'
              />
              <Button type='submit' variant='outline' aria-label={t('start.joinAria')} disabled={roomCode.length !== 6 || submitting}>
                <ArrowRight size={19} />
              </Button>
            </form>
            <p className='mt-2 h-4 text-xs font-bold text-foreground/60' aria-live='polite'>
              {submitting ? t('room.message.lookingUpRoom') : ''}
            </p>
            <div className='mt-2 flex items-center gap-3 text-xs font-bold uppercase text-foreground/40'>
              <span className='h-px flex-1 bg-border' /> {t('start.or')} <span className='h-px flex-1 bg-border' />
            </div>
            <div className='flex flex-col justify-center gap-3 sm:flex-row'>
              <Button asChild>
                <a href='/room/new'>
                  <Plus size={17} /> {t('room.message.newRoom')}
                </a>
              </Button>
              <Button variant='outline' asChild>
                <a href='/'>
                  <Home size={17} /> {t('room.message.toHomepage')}
                </a>
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
