'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  function enter(path: string) {
    const playerName = name.trim();
    router.push(`${path}?name=${encodeURIComponent(playerName)}`);
  }

  return (
    <main className='mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12'>
      <div className='grid w-full gap-12 lg:grid-cols-[1.15fr_.85fr] lg:items-center'>
        <section>
          <p className='mb-4 text-sm font-bold uppercase text-red-700'>Ludo Live</p>
          <h1 className='max-w-3xl font-black text-6xl leading-[.95] sm:text-8xl'>Würfeln. Ziehen. Nicht ärgern.</h1>
          <p className='mt-7 max-w-xl text-lg leading-8 text-stone-600'>
            Ein Raum, bis zu vier Freunde und ein Spielstand, der auf allen Geräten gleichzeitig stimmt.
          </p>
        </section>

        <section className='border-2 border-stone-900 bg-white p-6 shadow-[8px_8px_0_#1c1917] sm:p-8'>
          <label className='mb-2 block text-sm font-bold' htmlFor='name'>
            Dein Name
          </label>
          <input
            id='name'
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={24}
            placeholder='Spielername'
            className='h-12 w-full rounded-md border border-stone-300 px-4 outline-none focus:border-stone-950 focus:ring-2 focus:ring-yellow-400'
          />
          <Button className='mt-5 w-full' onClick={() => enter('/room/new')}>
            <Plus size={18} /> Neuen Raum erstellen
          </Button>

          <div className='my-7 flex items-center gap-3 text-xs font-bold uppercase text-stone-400'>
            <span className='h-px flex-1 bg-stone-200' /> oder <span className='h-px flex-1 bg-stone-200' />
          </div>

          <label className='mb-2 block text-sm font-bold' htmlFor='room'>
            Raum-Code
          </label>
          <div className='flex gap-2'>
            <input
              id='room'
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              maxLength={6}
              placeholder='ABC123'
              className='h-11 min-w-0 flex-1 rounded-md border border-stone-300 px-4 font-mono uppercase outline-none focus:border-stone-950'
            />
            <Button variant='outline' aria-label='Raum beitreten' disabled={roomCode.length !== 6} onClick={() => enter(`/room/${roomCode}`)}>
              <ArrowRight size={19} />
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
