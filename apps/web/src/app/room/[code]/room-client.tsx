'use client';

import { GameBoard } from '@/components/game-board';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ClientEvent, GameState, MoveTimeSeconds, Player, PlayerColor, RoomSettings, ServerEvent } from '@ludo/shared';
import { Check, CheckCheck, Clock3, Copy, Dices, Info, Palette, Settings2, Sparkles, Trophy, UserRound, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const colorClasses: Record<PlayerColor, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-600',
  green: 'bg-emerald-600',
  yellow: 'bg-amber-400',
};

const colorNames: Record<PlayerColor, string> = {
  red: 'Rot',
  blue: 'Blau',
  green: 'Grün',
  yellow: 'Gelb',
};

const activePlayerClasses: Record<PlayerColor, string> = {
  red: 'border-red-500 shadow-[inset_4px_0_0_#ef4444]',
  blue: 'border-blue-600 shadow-[inset_4px_0_0_#2563eb]',
  green: 'border-emerald-600 shadow-[inset_4px_0_0_#059669]',
  yellow: 'border-amber-400 shadow-[inset_4px_0_0_#fbbf24]',
};

export function RoomClient({ requestedCode }: { requestedCode: string }) {
  const searchParams = useSearchParams();
  const socketRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
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
  const isHost = state.hostPlayerId === playerId;
  const settings = state.settings;
  const secondsLeft = state.turnDeadline === null ? 0 : Math.min(settings.moveTimeSeconds, Math.max(0, Math.ceil((state.turnDeadline - now) / 1000)));
  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/room/${state.roomCode}`;

  async function copyRoomLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_600);
  }

  function updateSettings(update: Partial<RoomSettings>) {
    emit({ type: 'room:settings', payload: { ...settings, ...update } });
  }

  return (
    <main className='room-enter mx-auto min-h-screen max-w-6xl px-6 py-8 sm:py-12'>
      <header className='flex flex-wrap items-end justify-between gap-5 border-b-2 border-stone-900 pb-6'>
        <div>
          <p className='mb-1 text-xs font-bold uppercase text-stone-500'>Ludo Live · Raum</p>
          <h1 className='font-mono text-4xl font-black tracking-widest'>{state.roomCode}</h1>
        </div>
        <Button variant='outline' onClick={copyRoomLink} aria-live='polite'>
          {copied ? <CheckCheck size={17} /> : <Copy size={17} />} {copied ? 'Kopiert' : 'Link kopieren'}
        </Button>
      </header>

      <div className='grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_20rem]'>
        <section className='flex min-w-0 justify-center'>
          <GameBoard state={state} playerId={playerId} onMove={(pieceId) => emit({ type: 'game:move', payload: { pieceId } })} />
        </section>

        <aside>
          {state.phase !== 'lobby' && (
            <section className='turn-panel mb-6 flex h-56 flex-col border-2 border-stone-900 bg-white p-5 shadow-[5px_5px_0_#1c1917]'>
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
                        <p className='mt-2 text-sm font-bold'>Würfel rollt ...</p>
                      </div>
                    ) : (
                      <div>
                        <p className='dice-result [font-family:var(--font-display)] text-6xl font-black leading-none'>{state.diceResult}</p>
                        {state.turnStage === 'move' && (
                          <p className='mt-2 text-sm font-bold'>{isMyTurn ? 'Wähle eine Figur, um sie zu bewegen' : 'Wählt eine Figur'}</p>
                        )}
                        {state.turnStage === 'auto-move' && <p className='mt-2 text-sm font-bold'>Einziger Zug wird automatisch ausgeführt</p>}
                        {state.turnStage === 'no-move' && <p className='mt-2 text-sm font-bold text-red-700'>Kein gültiger Zug</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {state.phase === 'lobby' && me && (
            <PlayerProfile player={me} players={state.players} onChange={(profile) => emit({ type: 'player:update', payload: profile })} />
          )}

          {state.phase === 'lobby' && <LobbySettings settings={state.settings} isHost={isHost} onChange={updateSettings} />}

          <h2 className='mb-4 flex items-center gap-2 text-lg font-black'>
            <Users size={19} /> Spieler {state.players.length}/4
          </h2>
          <div className='space-y-3'>
            {state.players.map((player) => (
              <div
                key={player.id}
                className={cn(
                  'player-row flex min-h-12 items-center gap-3 border bg-white p-3 transition-[border-color,box-shadow,background-color] duration-300',
                  player.id === state.currentPlayerId ? activePlayerClasses[player.color] : 'border-stone-300',
                  !player.connected && 'opacity-55',
                )}
              >
                <span className={cn('h-4 w-4 rounded-full border-2 border-white shadow-sm', colorClasses[player.color])} />
                <span className='min-w-0 flex-1 truncate font-bold'>
                  {player.name}
                  {player.id === playerId ? ' (du)' : ''}
                </span>
                {player.id === state.hostPlayerId && <span className='text-[10px] font-bold uppercase text-stone-500'>Host</span>}
                {player.id === state.currentPlayerId && state.phase === 'playing' && (
                  <span className='text-[10px] font-bold uppercase text-stone-500'>Am Zug</span>
                )}
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

function PlayerProfile({
  player,
  players,
  onChange,
}: {
  player: Player;
  players: Player[];
  onChange: (profile: { name: string; color: PlayerColor }) => void;
}) {
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
    <section className='mb-7 border-b-2 border-stone-900 pb-5'>
      <h2 className='mb-4 flex items-center gap-2 text-lg font-black'>
        <UserRound size={19} /> Dein Profil
      </h2>
      <input
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        maxLength={24}
        aria-label='Spielername'
        className='h-11 w-full rounded-md border border-stone-300 bg-white px-3 outline-none focus:border-stone-950 focus:ring-2 focus:ring-amber-300'
      />

      <div className='mt-4 flex items-center justify-between gap-4'>
        <span className='flex items-center gap-2 text-sm font-bold'>
          <Palette size={17} /> Farbe
        </span>
        <div className='flex gap-2' role='group' aria-label='Spielerfarbe'>
          {colors.map((color) => {
            const occupied = players.some((candidate) => candidate.id !== player.id && candidate.color === color);
            const selected = player.color === color;
            return (
              <button
                key={color}
                type='button'
                disabled={occupied}
                onClick={() => onChange({ name: draftName, color })}
                aria-label={`${colorNames[color]}${occupied ? ' – vergeben' : ''}`}
                aria-pressed={selected}
                title={occupied ? `${colorNames[color]} ist bereits vergeben` : colorNames[color]}
                className={cn(
                  'h-8 w-8 rounded-full border-2 border-white shadow-[0_0_0_1px_#a8a29e] transition-[transform,box-shadow,opacity] hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950 disabled:cursor-not-allowed disabled:opacity-25',
                  colorClasses[color],
                  selected && 'shadow-[0_0_0_3px_#1c1917] scale-105',
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
  const moveTimes: MoveTimeSeconds[] = [15, 30, 45, 60];

  return (
    <section className='mb-7 border-y-2 sm:border-t-0 sm:pt-0 border-stone-900 py-5'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <h2 className='flex items-center gap-2 text-lg font-black'>
          <Settings2 size={19} /> Raumeinstellungen
        </h2>
        {!isHost && <span className='text-[10px] font-bold uppercase text-stone-500'>Nur Host</span>}
      </div>

      <fieldset className='space-y-5'>
        <div>
          <legend className='mb-2 flex w-full items-center gap-2 text-sm font-bold'>
            <Clock3 size={16} /> Zugzeit
            <InfoTooltip text='Zeit für die Auswahl einer Figur, wenn mehrere gültige Züge möglich sind.' />
          </legend>
          <div className={cn('grid grid-cols-4 border border-stone-300 bg-white p-1', !isHost && 'opacity-60')} role='group' aria-label='Zugzeit in Sekunden'>
            {moveTimes.map((seconds) => (
              <button
                key={seconds}
                type='button'
                disabled={!isHost}
                onClick={() => onChange({ moveTimeSeconds: seconds })}
                className={cn(
                  'h-9 text-sm font-bold transition-colors disabled:cursor-not-allowed',
                  settings.moveTimeSeconds === seconds ? 'bg-stone-950 text-white' : 'text-stone-600 hover:bg-stone-100',
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
          label='Einzelzug automatisch'
          description='Kann nur eine Figur ziehen, führt der Server den Zug nach einer kurzen Anzeige automatisch aus.'
          checked={settings.automaticSingleMove}
          disabled={!isHost}
          onChange={(checked) => onChange({ automaticSingleMove: checked })}
        />
        <SettingToggle
          icon={<Dices size={17} />}
          label='Fairer Würfel'
          description='Jeder Spieler würfelt innerhalb von sechs persönlichen Würfen jede Augenzahl genau einmal – in zufälliger Reihenfolge.'
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
          'relative h-7 w-12 shrink-0 rounded-full border-2 border-stone-900 transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          checked ? 'bg-emerald-500' : 'bg-stone-200',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-stone-900 bg-white transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const tooltipId = `setting-info-${text.slice(0, 12).replaceAll(' ', '-').toLowerCase()}`;

  return (
    <span className='group relative ml-auto inline-flex shrink-0'>
      <button
        type='button'
        aria-label='Einstellung erklären'
        aria-describedby={tooltipId}
        className='grid h-7 w-7 place-items-center rounded-full text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-950 focus-visible:bg-stone-200 focus-visible:text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-stone-950'
      >
        <Info size={16} />
      </button>
      <span
        id={tooltipId}
        role='tooltip'
        className='pointer-events-none invisible absolute right-0 top-9 z-50 w-64 border border-stone-900 bg-stone-950 p-3 text-left text-xs font-medium leading-5 text-white opacity-0 shadow-[4px_4px_0_rgba(28,25,23,.2)] transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100'
      >
        {text}
      </span>
    </span>
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
