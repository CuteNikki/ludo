'use client';

import { GameBoard } from '@/components/game-board';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ClientEvent, GameState, MoveTimeSeconds, Player, PlayerColor, RoomErrorCode, RoomSettings, ServerEvent } from '@ludo/shared';
import {
  Check,
  CheckCheck,
  Clock3,
  Copy,
  Dices,
  DicesIcon,
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
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const colorClasses: Record<PlayerColor, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-600',
  green: 'bg-emerald-600',
  yellow: 'bg-amber-400',
};

const activePlayerClasses: Record<PlayerColor, string> = {
  red: 'border-red-500 shadow-[inset_4px_0_0_#ef4444]',
  blue: 'border-blue-600 shadow-[inset_4px_0_0_#2563eb]',
  green: 'border-emerald-600 shadow-[inset_4px_0_0_#059669]',
  yellow: 'border-amber-400 shadow-[inset_4px_0_0_#fbbf24]',
};

export function RoomClient({ requestedCode }: { requestedCode: string }) {
  const { t } = useTranslation();
  const socketRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<{ code: RoomErrorCode; message: string } | null>(null);
  const [notice, setNotice] = useState<RoomErrorCode | null>(null);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);

  const colorNames: Record<PlayerColor, string> = {
    red: t('room.colors.red'),
    blue: t('room.colors.blue'),
    green: t('room.colors.green'),
    yellow: t('room.colors.yellow'),
  };

  useEffect(() => {
    let active = true;
    let joined = false;
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
        setPlayerId(event.payload.playerId);
        setState(event.payload.state);
        sessionStorage.setItem(`ludo-player:${event.payload.state.roomCode}`, event.payload.playerId);
        const joinedPlayer = event.payload.state.players.find((player) => player.id === event.payload.playerId);
        if (joinedPlayer) sessionStorage.setItem('ludo-player-name', joinedPlayer.name);
        if (requestedCode === 'NEW') {
          window.history.replaceState(null, '', `/room/${event.payload.state.roomCode}`);
        }
      } else if (event.type === 'game:state') {
        const storedPlayerId = sessionStorage.getItem(`ludo-player:${event.payload.roomCode}`);
        if (storedPlayerId && !event.payload.players.some((player) => player.id === storedPlayerId)) {
          sessionStorage.removeItem(`ludo-player:${event.payload.roomCode}`);
          window.location.assign('/?notice=removed');
          return;
        }
        const currentPlayer = event.payload.players.find((player) => player.id === storedPlayerId);
        if (currentPlayer) sessionStorage.setItem('ludo-player-name', currentPlayer.name);
        setState(event.payload);
      } else if (event.type === 'room:error') {
        if (joined) setNotice(event.payload.code);
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
  const rematchSecondsLeft = state.rematchDeadline === null ? 10 : Math.max(0, Math.ceil((state.rematchDeadline - now) / 1000));
  const wantsRematch = state.rematchPlayerIds.includes(playerId);
  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/room/${roomCode}`;

  async function copyRoomLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_600);
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
    <main className='room-enter room-shell mx-auto min-h-screen max-w-6xl px-5 py-6 sm:px-6 sm:py-10'>
      <header className='room-header flex flex-wrap items-center justify-between gap-5 border-2 border-stone-900 bg-white p-4 shadow-[6px_6px_0_#1c1917] sm:p-5 dark:border-stone-100 dark:bg-stone-950 dark:shadow-[6px_6px_0_#f4f0e7]'>
        <div className='flex items-center gap-4'>
          <a href='/' aria-label={t('room.message.toHomepage')}>
            <DicesIcon className='size-10 shrink-0 rounded-lg bg-black p-1.5 text-white' />
          </a>
          <div>
            <p className='text-xs font-black uppercase tracking-[.16em] text-red-700 dark:text-red-400'>{t('room.eyebrow')}</p>
            <h1 className='font-mono text-xl font-black tracking-widest'>{state.roomCode}</h1>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <ThemeToggle />
          <Button variant='outline' onClick={copyRoomLink} aria-live='polite'>
            {copied ? <CheckCheck size={17} /> : <Copy size={17} />} {copied ? t('room.copied') : t('room.copyLink')}
          </Button>
        </div>
      </header>

      <div className='grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-10'>
        <section className='flex min-w-0 justify-center p-1 sm:p-3 lg:justify-start lg:p-0'>
          <GameBoard state={state} playerId={playerId} onMove={(pieceId) => emit({ type: 'game:move', payload: { pieceId } })} />
        </section>

        <aside className='room-sidebar border-2 border-stone-900 bg-white p-5 shadow-[6px_6px_0_#1c1917] dark:border-stone-100 dark:bg-stone-950 dark:shadow-[6px_6px_0_#f4f0e7]'>
          {state.phase !== 'lobby' && (
            <section className='turn-panel mb-6 flex h-56 flex-col border-b-2 border-stone-900 pb-6 dark:border-stone-100'>
              {state.phase === 'finished' ? (
                <div className='grid flex-1 place-items-center text-center'>
                  <div className='w-full'>
                    <Trophy className='mx-auto mb-1 text-amber-500' size={27} />
                    <p className='text-xs font-bold uppercase text-stone-500 dark:text-stone-400'>{t('room.won')}</p>
                    <p className='mt-1 text-2xl font-black'>{winner?.name}</p>
                    <p className='mt-1 h-5 text-xs font-bold text-stone-500 dark:text-stone-400' aria-live='polite'>
                      {state.rematchDeadline === null
                        ? t('room.oneMoreRound')
                        : t('room.rematchStatus', {
                            accepted: state.rematchPlayerIds.length,
                            total: state.players.length,
                            seconds: rematchSecondsLeft,
                          })}
                    </p>
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
                </div>
              ) : (
                <div className='flex min-h-0 flex-1 flex-col'>
                  <div className='flex min-h-12 items-center justify-between gap-3'>
                    <div>
                      <p className='text-xs font-bold uppercase text-stone-500 dark:text-stone-400'>{t('room.yourTurn')}</p>
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
                  <div className={cn('mt-3 h-2 shrink-0 overflow-hidden', state.turnStage === 'move' && 'bg-stone-200 dark:bg-stone-800')}>
                    {state.turnStage === 'move' && (
                      <div
                        className='h-full bg-red-500 transition-[width] duration-200'
                        style={{ width: `${(secondsLeft / state.settings.moveTimeSeconds) * 100}%` }}
                      />
                    )}
                  </div>
                  <div key={`${state.revision}-${state.turnStage}`} className='status-swap grid min-h-0 flex-1 place-items-center text-center'>
                    {state.turnStage === 'rolling' ? (
                      <div>
                        <Dices className='dice-rolling mx-auto' size={58} strokeWidth={2.2} />
                        <p className='mt-2 text-sm font-bold'>{t('room.rollAnimating')}</p>
                      </div>
                    ) : (
                      <div>
                        <p className='dice-result [font-family:var(--font-display)] text-6xl font-black leading-none'>{state.diceResult}</p>
                        {state.turnStage === 'move' && (
                          <p className='mt-2 text-sm font-bold'>{isMyTurn ? t('room.chooseAPieceSelf') : t('room.chooseAPieceOther')}</p>
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
          <div className='stagger-fade-in space-y-3'>
            {state.players.map((player) => (
              <div
                key={player.id}
                className={cn(
                  'player-row card-hover-lift flex min-h-12 items-center gap-3 border bg-white p-3 transition-[border-color,box-shadow,background-color,transform] duration-300 dark:bg-stone-950',
                  player.id === state.currentPlayerId ? activePlayerClasses[player.color] : 'border-stone-300 dark:border-stone-700',
                  !player.connected && 'opacity-55',
                )}
              >
                <span className={cn('h-4 w-4 rounded-full border-2 border-white shadow-sm dark:border-stone-950', colorClasses[player.color])} />
                <span className='min-w-0 flex-1 truncate font-bold'>
                  {player.name}
                  {player.id === playerId ? t('room.you') : ''}
                </span>
                {player.id === state.hostPlayerId && state.phase === 'lobby' && (
                  <span className='text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400'>{t('room.host')}</span>
                )}
                {player.id === state.currentPlayerId && state.phase === 'playing' && (
                  <span className='text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400'>{t('room.yourTurn')}</span>
                )}
                {player.ready && <Check size={18} className='text-emerald-700 dark:text-emerald-400' aria-label={t('room.imReady')} />}
                {state.phase === 'lobby' && isHost && player.id !== playerId && (
                  <button
                    type='button'
                    onClick={() => emit({ type: 'room:kick', payload: { playerId: player.id } })}
                    aria-label={t('room.removePlayerAria', { name: player.name })}
                    title={t('room.removePlayerAria', { name: player.name })}
                    className='btn-press grid h-8 w-8 shrink-0 place-items-center text-stone-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-stone-950 dark:text-stone-400 dark:hover:bg-red-950 dark:hover:text-red-400 dark:focus-visible:outline-stone-100'
                  >
                    <UserMinus size={17} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {state.phase === 'lobby' && (
            <Button
              className='mt-5 w-full'
              variant={me?.ready ? 'outline' : 'default'}
              onClick={() => emit({ type: 'player:ready', payload: { ready: !me?.ready } })}
            >
              {me?.ready ? t('room.notReady') : t('room.imReady')}
            </Button>
          )}
          {state.phase === 'lobby' && <p className='mt-4 text-sm font-medium leading-6 text-stone-700 dark:text-stone-300'>{t('room.startHint')}</p>}
          {notice && (
            <p
              role='alert'
              className='toast-enter mt-4 border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
            >
              {t(`room.errors.${notice}`, { defaultValue: t('room.errors.UNKNOWN') })}
            </p>
          )}
        </aside>
      </div>
    </main>
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
    if (draftName === player.name) return;
    saveTimerRef.current = window.setTimeout(() => {
      onChangeRef.current({ name: draftName, color: player.color });
    }, 500);
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, [draftName, player.color, player.name]);

  function commitName() {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    if (draftName !== player.name) onChangeRef.current({ name: draftName, color: player.color });
  }

  return (
    <section className='mb-0 border-b-2 border-stone-900 pb-5 lg:mb-7 dark:border-stone-100'>
      <h2 className='mb-4 flex items-center gap-2 text-lg font-black'>
        <UserRound size={19} /> {t('room.profile.title')}
      </h2>
      <input
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        maxLength={24}
        aria-label={t('room.profile.nameAria')}
        className='h-11 w-full rounded-md border border-stone-300 bg-white px-3 outline-none focus:border-stone-950 focus:ring-2 focus:ring-amber-300 dark:border-stone-700 dark:bg-stone-900 dark:focus:border-stone-100'
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
                  'btn-press h-8 w-8 rounded-full border-2 border-white shadow-[0_0_0_1px_#a8a29e] transition-[transform,box-shadow,opacity] hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950 disabled:cursor-not-allowed disabled:opacity-25 dark:border-stone-950 dark:focus-visible:outline-stone-100',
                  colorClasses[color],
                  selected && 'scale-105 shadow-[0_0_0_3px_#1c1917] dark:shadow-[0_0_0_3px_#f4f0e7]',
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
    <section className='mb-7 border-b-2 border-stone-900 py-5 sm:pt-0 dark:border-stone-100'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <h2 className='flex items-center gap-2 text-lg font-black'>
          <Settings2 size={19} /> {t('room.settings.title')}
        </h2>
        {!isHost && <span className='text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400'>{t('room.settings.hostOnly')}</span>}
      </div>

      <fieldset className='space-y-2'>
        <div>
          <legend className='mb-2 flex w-full items-center gap-2 text-sm font-bold'>
            <Clock3 size={16} /> {t('room.settings.moveTime')}
            <InfoTooltip text={t('room.settings.moveTimeInfo')} />
          </legend>
          <div
            className={cn('grid grid-cols-4 border border-stone-300 bg-white p-1 dark:border-stone-700 dark:bg-stone-900', !isHost && 'opacity-60')}
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
                  'btn-press h-9 text-sm font-bold transition-colors disabled:cursor-not-allowed',
                  settings.moveTimeSeconds === seconds
                    ? 'bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950'
                    : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800',
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
      <button
        type='button'
        role='switch'
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full border-2 border-stone-900 transition-colors disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-100',
          checked ? 'bg-emerald-500' : 'bg-stone-200 dark:bg-stone-800',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-stone-900 bg-white transition-transform dark:border-stone-100 dark:bg-stone-200',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const { t } = useTranslation();
  const tooltipId = `setting-info-${text.slice(0, 12).replaceAll(' ', '-').toLowerCase()}`;

  return (
    <span className='group relative ml-auto inline-flex shrink-0'>
      <button
        type='button'
        aria-label={t('room.settings.title')}
        aria-describedby={tooltipId}
        className='btn-press grid h-7 w-7 place-items-center rounded-full text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-950 focus-visible:bg-stone-200 focus-visible:text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-stone-950 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 dark:focus-visible:bg-stone-800 dark:focus-visible:text-stone-100 dark:focus-visible:outline-stone-100'
      >
        <Info size={16} />
      </button>
      <span
        id={tooltipId}
        role='tooltip'
        className='pointer-events-none invisible absolute right-0 top-9 z-50 w-64 border border-stone-900 bg-stone-950 p-3 text-left text-xs font-medium leading-5 text-white opacity-0 shadow-[4px_4px_0_rgba(28,25,23,.2)] transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-950'
      >
        {text}
      </span>
    </span>
  );
}

function send(socket: WebSocket, event: ClientEvent) {
  socket.send(JSON.stringify(event));
}

function Message({ title, detail, showRoomChoices = false }: { title: string; detail: string; showRoomChoices?: boolean }) {
  const { t } = useTranslation();
  return (
    <main className='grid min-h-screen place-items-center px-6 text-center'>
      <div className='room-enter border-2 border-stone-900 bg-white p-8 shadow-[6px_6px_0_#1c1917] dark:border-stone-100 dark:bg-stone-950 dark:shadow-[6px_6px_0_#f4f0e7]'>
        <h1 className='text-4xl font-bold'>{title}</h1>
        <p className='mt-3 text-stone-600 dark:text-stone-400'>{detail}</p>
        {showRoomChoices && (
          <div className='mt-7 flex flex-col justify-center gap-3 sm:flex-row'>
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
        )}
      </div>
    </main>
  );
}
