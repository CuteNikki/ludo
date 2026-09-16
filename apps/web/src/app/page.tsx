'use client';

import { GameBoard } from '@/components/game-board';
import { Button } from '@/components/ui/button';
import type { GameState, PlayerColor } from '@ludo/shared';
import { ArrowDown, ArrowRight, CircleAlert, Dices, Flag, Link2, Plus, Sparkles, Users, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const demoPath: Array<readonly [number, number]> = [
  [4, 0],
  [4, 1],
  [4, 2],
  [4, 3],
  [4, 4],
  [3, 4],
  [2, 4],
  [1, 4],
  [0, 4],
  [0, 5],
  [0, 6],
  [1, 6],
  [2, 6],
  [3, 6],
  [4, 6],
  [4, 7],
  [4, 8],
  [4, 9],
  [4, 10],
  [5, 10],
  [6, 10],
  [6, 9],
  [6, 8],
  [6, 7],
  [6, 6],
  [7, 6],
  [8, 6],
  [9, 6],
  [10, 6],
  [10, 5],
  [10, 4],
  [9, 4],
  [8, 4],
  [7, 4],
  [6, 4],
  [6, 3],
  [6, 2],
  [6, 1],
  [6, 0],
  [5, 0],
];

const demoOffsets = [0, 10, 20, 30];

const previewPlayers: Array<{ id: string; name: string; color: PlayerColor }> = [
  { id: 'preview-red', name: 'Rot', color: 'red' },
  { id: 'preview-blue', name: 'Blau', color: 'blue' },
  { id: 'preview-green', name: 'Grün', color: 'green' },
  { id: 'preview-yellow', name: 'Gelb', color: 'yellow' },
];

const previewStartPositions = [
  [3, -1, 25, 40],
  [-1, 12, 25, -1],
  [3, -1, -1, 40],
  [-1, 12, 25, 40],
];

function createPreviewState(): GameState {
  return {
    roomCode: 'DEMO',
    hostPlayerId: 'preview-red',
    settings: { moveTimeSeconds: 30, automaticSingleMove: true, fairDice: true },
    phase: 'playing',
    turnStage: 'rolling',
    turnDeadline: null,
    players: previewPlayers.map((player) => ({ ...player, connected: true, ready: true })),
    pieces: previewPlayers.flatMap((player, playerIndex) =>
      Array.from({ length: 4 }, (_, pieceIndex) => ({
        id: `${player.id}-piece-${pieceIndex}`,
        playerId: player.id,
        position: previewStartPositions[playerIndex]?.[pieceIndex] ?? -1,
      })),
    ),
    currentPlayerId: 'preview-red',
    diceResult: null,
    movablePieceIds: [],
    winnerId: null,
    rematchDeadline: null,
    rematchPlayerIds: [],
    revision: 0,
  };
}

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [wasRemoved, setWasRemoved] = useState(false);

  function PreviewBoard() {
    const [state, setState] = useState<GameState>(createPreviewState);
    const roundFinished = useRef(false);

    useEffect(() => {
      let timer: number | undefined;
      let active = true;
      let playerIndex = 0;

      function nextTurn() {
        if (!active) return;
        if (roundFinished.current) return;
        const player = previewPlayers[playerIndex]!;
        const roll = Math.floor(Math.random() * 6) + 1;
        let winner = false;

        setState((current) => {
          if (current.phase === 'finished') return current;
          const currentPieces = current.pieces.map((candidate) => ({ ...candidate }));
          const candidates = currentPieces.filter((candidate) => candidate.playerId === player.id && candidate.position < 43);
          const legalCandidates = candidates.filter((candidate) => {
            const target = candidate.position === -1 ? (roll === 6 ? 0 : -1) : candidate.position + roll;
            return (
              target >= 0 &&
              target <= 43 &&
              !currentPieces.some((other) => other.id !== candidate.id && other.playerId === player.id && other.position === target)
            );
          });
          const selected = legalCandidates[Math.floor(Math.random() * legalCandidates.length)];
          if (!selected) return { ...current, currentPlayerId: player.id, revision: current.revision + 1 };

          const target = selected.position === -1 ? (roll === 6 ? 0 : -1) : selected.position + roll;
          if (target < 0 || target > 43) return { ...current, currentPlayerId: player.id, diceResult: roll, revision: current.revision + 1 };

          selected.position = target;
          if (target < 40) {
            const boardTarget = (demoOffsets[playerIndex]! + target) % demoPath.length;
            for (const opponent of currentPieces) {
              const opponentIndex = previewPlayers.findIndex((candidate) => candidate.id === opponent.playerId);
              if (
                opponent.playerId !== player.id &&
                opponent.position >= 0 &&
                opponent.position < 40 &&
                (demoOffsets[opponentIndex]! + opponent.position) % demoPath.length === boardTarget
              ) {
                opponent.position = -1;
              }
            }
          }
          winner = currentPieces.filter((piece) => piece.playerId === player.id).every((piece) => piece.position >= 40);
          return {
            ...current,
            pieces: currentPieces,
            phase: winner ? 'finished' : 'playing',
            currentPlayerId: player.id,
            diceResult: roll,
            winnerId: winner ? player.id : null,
            revision: current.revision + 1,
          };
        });
        if (winner) {
          roundFinished.current = true;
          timer = window.setTimeout(() => {
            if (active) {
              roundFinished.current = false;
              setState(createPreviewState());
              playerIndex = 0;
              timer = window.setTimeout(nextTurn, 1_000);
            }
          }, 3_500);
          return;
        }
        playerIndex = (playerIndex + 1) % previewPlayers.length;
        timer = window.setTimeout(nextTurn, 1_400);
      }

      timer = window.setTimeout(nextTurn, 1_000);
      return () => {
        active = false;
        if (timer !== undefined) window.clearTimeout(timer);
      };
    }, []);

    return <GameBoard state={state} playerId='preview-viewer' onMove={() => undefined} />;
  }
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('notice') === 'removed') {
      setWasRemoved(true);
      url.searchParams.delete('notice');
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
    setName(sessionStorage.getItem('ludo-player-name') ?? '');
  }, []);

  function enter(path: string) {
    sessionStorage.setItem('ludo-player-name', name.trim());
    router.push(path);
  }

  return (
    <main className='min-h-screen overflow-hidden'>
      {wasRemoved && (
        <div
          role='alert'
          className='toast-enter fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] items-start gap-3 border-2 border-stone-900 bg-white p-4 pr-3 shadow-[5px_5px_0_#1c1917] sm:right-6 sm:top-6'
        >
          <CircleAlert className='mt-0.5 shrink-0 text-red-600' size={19} />
          <div>
            <p className='text-sm font-black'>Aus dem Raum entfernt</p>
            <p className='mt-0.5 text-xs text-stone-600'>Der Host hat dich aus dem Raum entfernt.</p>
          </div>
          <button
            type='button'
            onClick={() => setWasRemoved(false)}
            aria-label='Meldung schließen'
            className='grid h-7 w-7 shrink-0 place-items-center text-stone-500 hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-2 focus-visible:outline-stone-950'
          >
            <X size={16} />
          </button>
        </div>
      )}
      <nav className='mx-auto flex max-w-6xl items-center justify-between px-6 py-6'>
        <a href='/' className='flex items-center gap-2 text-lg font-black tracking-tight'>
          <span className='grid h-8 w-8 place-items-center bg-stone-950 text-sm text-white'>L</span>
          Ludo Live
        </a>
        <a href='#so-gehts' className='hidden items-center gap-2 text-sm font-bold text-stone-600 transition-colors hover:text-stone-950 sm:flex'>
          So funktioniert&apos;s <ArrowDown size={16} />
        </a>
      </nav>

      <section className='mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-16'>
        <div className='home-reveal'>
          <p className='mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-[.18em] text-red-700'>
            <span className='h-2 w-2 rounded-full bg-red-600' /> Das Brett ist eröffnet
          </p>
          <h1 className='max-w-2xl font-display text-6xl font-black leading-[.9] tracking-tight sm:text-8xl'>
            Würfeln. Ziehen.
            <br />
            <em className='text-red-600'>Nicht ärgern.</em>
          </h1>
          <p className='mt-8 max-w-xl text-lg leading-8 text-stone-600 sm:text-xl'>
            Das klassische Brettspiel, neu zusammengesetzt für echte Menschen und schnelle Runden. Raum aufmachen, Link teilen, losspielen.
          </p>
          <a
            href='#start'
            className='mt-8 inline-flex items-center gap-3 text-sm font-black uppercase tracking-[.14em] text-stone-950 underline decoration-2 underline-offset-8'
          >
            Jetzt Runde starten <ArrowRight size={18} />
          </a>
        </div>

        <div className='home-board relative mx-auto w-full max-w-lg' aria-label='Illustration eines Ludo-Spielfelds'>
          <div className='absolute -right-2 -top-5 z-10 grid h-20 w-20 rotate-12 place-items-center border-2 border-stone-900 bg-white shadow-[5px_5px_0_#1c1917] sm:-right-5 sm:h-24 sm:w-24'>
            <Dices size={38} strokeWidth={1.7} />
            <span className='absolute bottom-1 text-[10px] font-black uppercase tracking-widest hidden sm:block'>Demo-Spiel</span>
          </div>
          <PreviewBoard />
          <p className='mt-5 text-center text-xs font-black uppercase tracking-[.16em] text-stone-500'>
            Eine Runde · vier Farben · unendlich viel Schadenfreude
          </p>
        </div>
      </section>

      <section id='start' className='border-y-2 border-stone-900 bg-[#e8dfcd]'>
        <div className='mx-auto grid min-w-0 max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:py-20'>
          <div className='min-w-0'>
            <p className='mb-3 text-sm font-black uppercase tracking-[.16em] text-red-700'>Bereit?</p>
            <h2 className='max-w-full wrap-break-word font-display text-4xl font-black leading-none sm:text-5xl'>Dein Tisch wartet schon.</h2>
            <p className='mt-4 max-w-md wrap-break-word leading-7 text-stone-600'>
              Wähle einen Namen und eröffne eine Runde. Deine Freunde brauchen nur den sechsstelligen Code.
            </p>
          </div>
          <section className='min-w-0 max-w-full border-2 border-stone-900 bg-white p-6 shadow-[8px_8px_0_#1c1917] sm:p-8'>
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
              <Plus size={18} /> Raum erstellen
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
      </section>

      <section id='so-gehts' className='mx-auto max-w-6xl px-6 py-20 sm:py-28'>
        <div className='max-w-xl'>
          <p className='mb-3 text-sm font-black uppercase tracking-[.16em] text-red-700'>So funktioniert&apos;s</p>
          <h2 className='font-display text-4xl font-black leading-none sm:text-5xl'>Drei Schritte bis zum ersten Rauswurf.</h2>
        </div>
        <div className='mt-12 grid gap-8 md:grid-cols-3'>
          {[
            { icon: Link2, number: '01', title: 'Raum teilen', text: 'Erstelle einen Raum und schicke den Code an bis zu drei Mitspieler.' },
            { icon: Dices, number: '02', title: 'Würfelglück', text: 'Würfle, wähle deine Figur und bringe alle vier sicher ins Ziel.' },
            { icon: Flag, number: '03', title: 'Sieg feiern', text: 'Schmeiß Figuren raus, bleib im Zeitlimit und hol dir den ersten Platz.' },
          ].map(({ icon: Icon, number, title, text }, index) => (
            <article
              key={number}
              className={`${index === 0 ? 'border-t-0 md:border-l-0 md:pl-0' : 'border-t-2 border-stone-900 md:border-t-0 md:border-l-2 md:border-stone-900 md:pl-8'} pt-5 md:pt-0`}
            >
              <div className='flex items-center justify-between'>
                <span className='font-mono text-sm font-bold text-red-700'>{number}</span>
                <Icon size={23} />
              </div>
              <h3 className='mt-4 text-2xl font-black'>{title}</h3>
              <p className='mt-2 leading-7 text-stone-600'>{text}</p>
            </article>
          ))}
        </div>
        <div className='mt-10 grid gap-6 border-t-2 border-stone-900 pt-8 sm:grid-cols-3'>
          <div className='flex gap-3'>
            <Users className='shrink-0 text-red-600' size={22} />
            <p>
              <strong className='block'>2–4 Spieler</strong>
              <span className='text-sm text-stone-600'>Gemeinsam in einem Raum.</span>
            </p>
          </div>
          <div className='flex gap-3'>
            <Sparkles className='shrink-0 text-red-600' size={22} />
            <p>
              <strong className='block'>Live synchron</strong>
              <span className='text-sm text-stone-600'>Jeder Zug erscheint sofort.</span>
            </p>
          </div>
          <div className='flex gap-3'>
            <Dices className='shrink-0 text-red-600' size={22} />
            <p>
              <strong className='block'>Fairer Würfel</strong>
              <span className='text-sm text-stone-600'>Keiner wartet ewig auf die Sechs.</span>
            </p>
          </div>
        </div>
      </section>

      <footer className='border-t-2 border-stone-900 px-6 py-7 text-center text-xs font-bold uppercase tracking-[.15em] text-stone-500'>
        Ludo Live · Für Menschen, die noch eine Runde spielen
      </footer>
    </main>
  );
}
