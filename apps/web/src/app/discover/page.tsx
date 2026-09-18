'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import type { ClientEvent, PublicRoomSummary, ServerEvent } from '@ludo/shared';
import { ArrowRight, DicesIcon, Home, RefreshCw, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

const REFRESH_INTERVAL_MS = 5_000;

export default function DiscoverPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const socketRef = useRef<WebSocket | null>(null);
  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');

  useEffect(() => {
    setName(sessionStorage.getItem('ludo-player-name') ?? '');
  }, []);

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
    sessionStorage.setItem('ludo-player-name', name.trim());
    router.push(`/room/${roomCode}`);
  }

  return (
    <main className='mx-auto min-h-screen max-w-4xl px-3 py-2 sm:px-4 sm:py-6'>
      <header className='flex flex-wrap items-center justify-between gap-4 border-4 border-border bg-background-alternative p-4 shadow-card sm:p-5'>
        <a href='/' className='flex items-center gap-2' aria-label={t('room.message.toHomepage')}>
          <DicesIcon className='size-10 shrink-0 rounded-lg bg-foreground p-1.5 text-background' />
          <div>
            <p className='text-xs font-black uppercase tracking-[.16em] text-red-700 dark:text-red-400'>{t('discover.eyebrow')}</p>
            <h1 className='font-mono text-xl font-black tracking-widest'>{t('discover.title')}</h1>
          </div>
        </a>
        <div className='flex items-center gap-2'>
          <LanguageToggle />
          <ThemeToggle />
          <Button variant='outline' asChild className='h-10 px-3 bg-background-alternative text-foreground hover:bg-background hover:text-foreground'>
            <a href='/'>
              <Home size={17} /> {t('room.message.toHomepage')}
            </a>
          </Button>
        </div>
      </header>

      <section className='mt-8 border-4 border-border bg-background-alternative p-5 shadow-card sm:p-8'>
        <Label htmlFor='discover-name' className='mb-2'>
          {t('start.nameLabel')}
        </Label>
        <Input
          id='discover-name'
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={24}
          placeholder={t('start.namePlaceholder')}
          className='mb-6 h-12 max-w-sm bg-background'
        />

        <div className='mb-4 flex items-center justify-between gap-3'>
          <h2 className='flex items-center gap-2 text-lg font-black'>
            <Users size={19} /> {t('discover.listTitle')}
          </h2>
          <span className={cn('flex items-center gap-1.5 text-[10px] font-bold uppercase text-foreground/60', loading && 'animate-pulse')}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> {t('discover.autoRefresh')}
          </span>
        </div>

        {!loading && rooms.length === 0 && <p className='py-10 text-center text-sm font-medium text-foreground/70'>{t('discover.empty')}</p>}

        <div className='space-y-2'>
          {rooms.map((room) => {
            const joinable = room.phase === 'lobby' && room.playerCount < room.maxPlayers;
            return (
              <div
                key={room.roomCode}
                className='flex flex-wrap items-center justify-between gap-3 border-2 border-border bg-background p-3 transition-colors duration-300'
              >
                <div className='min-w-0'>
                  <p className='truncate font-mono text-lg font-black tracking-widest'>{room.roomCode}</p>
                  <p className='truncate text-xs font-bold text-foreground/60'>{t('discover.hostedBy', { name: room.hostName })}</p>
                </div>
                <div className='flex items-center gap-3'>
                  <span className='text-sm font-bold'>
                    {room.playerCount}/{room.maxPlayers}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase',
                      room.phase === 'lobby' ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground/50',
                    )}
                  >
                    {t(`discover.phase.${room.phase}`)}
                  </span>
                  <Button className='h-10 px-3 text-xs' disabled={!joinable} onClick={() => joinRoom(room.roomCode)}>
                    {t('discover.join')} <ArrowRight size={15} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function send(socket: WebSocket, event: ClientEvent) {
  socket.send(JSON.stringify(event));
}
