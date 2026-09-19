'use client';

import type { ClientEvent, PublicRoomSummary, RoomSettings, ServerEvent } from '@ludo/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ArrowRight, Clock3, Dice6, Dices, Eye, RefreshCw, Repeat, ShieldCheck, Sparkles, Swords, Target, Users } from 'lucide-react';

import { usePlayerName } from '@/lib/player-name';
import { order } from '@/lib/reveal';
import { isJoinable, sortRooms } from '@/lib/room-list';
import { cn } from '@/lib/utils';

import { PAGE_DECOR_A } from '@/components/decor';
import { PageHeader, PageShell } from '@/components/page-shell';
import { SpectatorCount } from '@/components/room/spectator-count';
import { TapTooltip } from '@/components/tap-tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const REFRESH_INTERVAL_MS = 5_000;

export default function DiscoverPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const socketRef = useRef<WebSocket | null>(null);
  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = usePlayerName();

  useEffect(() => {
    let active = true;
    const socket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001/ws');
    socketRef.current = socket;

    function requestRooms() {
      if (socket.readyState === WebSocket.OPEN) send(socket, { type: 'room:discover', payload: {} });
    }

    socket.addEventListener('open', requestRooms);
    socket.addEventListener('message', (message) => {
      if (!active) return;
      const event = JSON.parse(String(message.data)) as ServerEvent;
      if (event.type === 'room:list') {
        setRooms(event.payload.rooms);
        setLoading(false);
      }
    });

    const interval = window.setInterval(requestRooms, REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
      socket.close();
    };
  }, []);

  function joinRoom(roomCode: string) {
    router.push(`/room/${roomCode}`);
  }

  function watchRoom(roomCode: string) {
    router.push(`/watch/${roomCode}`);
  }

  return (
    <PageShell width='wide' decor={PAGE_DECOR_A}>
      <PageHeader eyebrow={t('discover.eyebrow')} title={t('discover.title')} icon={Users} accent='blue'>
        <span className={cn('eyebrow inline-flex items-center gap-2 self-start text-foreground/70 sm:self-auto', loading && 'animate-pulse')}>
          <RefreshCw size={14} strokeWidth={3} className={loading ? 'animate-spin' : ''} /> {t('discover.autoRefresh')}
        </span>
      </PageHeader>

      {/* The pop-in is on a wrapper, not on the card that directly holds the field: password managers (Proton Pass)
          freeze and release animations on a field's parent, which would replay it on every keystroke. */}
      <div className='reveal-load mb-8' style={order(4)}>
        <section className='toy-card p-5 sm:p-6'>
          <Label htmlFor='discover-name' className='mb-2'>
            {t('start.nameLabel')}
          </Label>
          <Input
            id='discover-name'
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={24}
            placeholder={t('start.namePlaceholder')}
            className='max-w-sm'
          />
        </section>
      </div>

      <h2 className='reveal-load mb-4 font-display text-3xl' style={order(5)}>
        {t('discover.listTitle')}
      </h2>

      {/* The list's space is held from the start, with placeholders while it loads, so the footer
          doesn't jump when the rooms arrive. */}
      <div className='min-h-[50dvh]'>
        {loading && (
          <ul aria-hidden='true' className='grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
            {[0, 1, 2].map((placeholder) => (
              <li key={placeholder} className='toy-card h-44 animate-pulse bg-foreground/5 shadow-none' />
            ))}
          </ul>
        )}

        {!loading && rooms.length === 0 && (
          <div className='reveal-load toy-card grid place-items-center gap-3 border-dashed p-10 text-center shadow-none' style={order(6)}>
            <Dices size={40} strokeWidth={2} className='text-foreground/50' />
            <p className='max-w-md font-bold text-foreground/70'>{t('discover.empty')}</p>
          </div>
        )}

        <ul className='grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
          {sortRooms(rooms).map((room, index) => {
            const joinable = isJoinable(room);
            // A lobby with no free seat gets its own label; only rooms you can still join say "Open".
            const status = room.phase === 'lobby' && !joinable ? 'full' : room.phase;
            return (
              // Rooms appear and disappear as the list refreshes; a new card pops in, the others stay put.
              <li
                key={room.roomCode}
                className='reveal-load toy-card flex flex-col gap-4 p-5'
                style={order(6 + Math.min(index, 5), index % 2 === 0 ? '-3deg' : '3deg')}
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='truncate font-display text-3xl tracking-[.12em]'>{room.roomCode}</p>
                    <p className='truncate text-sm font-bold text-foreground/65'>{t('discover.hostedBy', { name: room.hostName })}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-md border-2 border-border px-2 py-0.5 text-xs font-extrabold uppercase',
                      joinable ? 'bg-p-green text-white' : 'bg-background text-foreground/70',
                    )}
                  >
                    {t(`discover.phase.${status}`)}
                  </span>
                </div>

                <div className='flex flex-col gap-1.5'>
                  <div className='flex items-center justify-between gap-3'>
                    <span className='flex items-center gap-1.5' role='img' aria-label={`${room.playerCount}/${room.maxPlayers}`}>
                      {Array.from({ length: room.maxPlayers }, (_, seat) => (
                        <span
                          key={seat}
                          className={cn(
                            'size-5 rounded-full border-3 border-border',
                            seat < room.playerCount ? seatColors[seat % seatColors.length] : 'bg-background',
                          )}
                        />
                      ))}
                      <span className='ml-1 text-sm font-extrabold'>
                        {room.playerCount}/{room.maxPlayers}
                      </span>
                    </span>
                    <div className='flex items-center gap-2'>
                      {room.spectatorCount > 0 && <SpectatorCount count={room.spectatorCount} />}
                      <MoveTimeBadge seconds={room.settings.moveTimeSeconds} />
                    </div>
                  </div>
                  <RoomSettingIcons settings={room.settings} />
                </div>

                {/* A room you can't join is one you can still watch. */}
                {joinable ? (
                  <Button className='mt-auto w-full' onClick={() => joinRoom(room.roomCode)}>
                    {t('discover.join')} <ArrowRight size={18} strokeWidth={3} />
                  </Button>
                ) : (
                  <Button variant='outline' className='mt-auto w-full' onClick={() => watchRoom(room.roomCode)}>
                    <Eye size={18} strokeWidth={3} /> {t('discover.watch')}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </PageShell>
  );
}

const seatColors = ['bg-p-red', 'bg-p-blue', 'bg-p-green', 'bg-p-yellow'];

const BOOLEAN_SETTINGS = [
  { key: 'automaticSingleMove', icon: Sparkles, labelKey: 'room.settings.autoMoves', infoKey: 'room.settings.autoMovesInfo' },
  { key: 'fairDice', icon: Dices, labelKey: 'room.settings.fairDice', infoKey: 'room.settings.fairDiceInfo' },
  { key: 'mustSpawnOnSix', icon: Dice6, labelKey: 'room.settings.mustSpawnOnSix', infoKey: 'room.settings.mustSpawnOnSixInfo' },
  { key: 'extraTurnOnCapture', icon: Swords, labelKey: 'room.settings.extraTurnOnCapture', infoKey: 'room.settings.extraTurnOnCaptureInfo' },
  { key: 'safeStartSquares', icon: ShieldCheck, labelKey: 'room.settings.safeStartSquares', infoKey: 'room.settings.safeStartSquaresInfo' },
  { key: 'threeTriesToLeaveYard', icon: Repeat, labelKey: 'room.settings.threeTriesToLeaveYard', infoKey: 'room.settings.threeTriesToLeaveYardInfo' },
  { key: 'mustCapture', icon: Target, labelKey: 'room.settings.mustCapture', infoKey: 'room.settings.mustCaptureInfo' },
] as const;

/** The move time, shown next to the player count so the row of rule icons below has the card's full width. */
function MoveTimeBadge({ seconds }: { seconds: number }) {
  const { t } = useTranslation();

  return (
    <TapTooltip
      label={`${t('room.settings.moveTime')}: ${seconds}s`}
      content={<SettingTooltipBody title={t('room.settings.moveTime')} value={`${seconds}s`} info={t('room.settings.moveTimeInfo')} />}
      className={cn(SETTING_BADGE_CLASS, 'shrink-0 gap-1 px-1.5 text-xs font-bold text-foreground/70')}
    >
      <Clock3 size={15} /> {seconds}s
    </TapTooltip>
  );
}

/** One icon per rule, green when on and red when off, with the current value on hover/tap. They wrap on very narrow cards. */
function RoomSettingIcons({ settings }: { settings: RoomSettings }) {
  const { t } = useTranslation();

  return (
    <div className='flex flex-wrap items-center gap-0.5'>
      {BOOLEAN_SETTINGS.map(({ key, icon: Icon, labelKey, infoKey }) => {
        const on = settings[key];
        const state = t(on ? 'discover.settingOn' : 'discover.settingOff');
        return (
          <TapTooltip
            key={key}
            label={`${t(labelKey)}: ${state}`}
            content={<SettingTooltipBody title={t(labelKey)} value={state} valueOn={on} info={t(infoKey)} />}
            className={cn(SETTING_BADGE_CLASS, 'w-8', on ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}
          >
            <Icon size={16} />
          </TapTooltip>
        );
      })}
    </div>
  );
}

const SETTING_BADGE_CLASS =
  'inline-flex h-8 items-center justify-center rounded-full transition-colors hover:bg-foreground/10 focus-visible:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground';

function SettingTooltipBody({ title, value, valueOn, info }: { title: string; value: string; valueOn?: boolean; info: string }) {
  return (
    <>
      <p className='font-black'>
        {title}:{' '}
        <span className={cn(valueOn === undefined ? '' : valueOn ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>{value}</span>
      </p>
      <p className='mt-0.5 text-foreground/70'>{info}</p>
    </>
  );
}

function send(socket: WebSocket, event: ClientEvent) {
  socket.send(JSON.stringify(event));
}
