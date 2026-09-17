'use client';

import { ArrowDown, ArrowRight, CircleAlert, Dices, DicesIcon, Flag, Link2, Plus, Sparkles, Users, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { GameState, PlayerColor } from '@ludo/shared';

import { GameBoard } from '@/components/game-board';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

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
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [wasRemoved, setWasRemoved] = useState(false);

  const stepIcons = [Link2, Dices, Flag];
  const steps = t('howItWorks.steps', { returnObjects: true }) as Array<{ title: string; text: string }>;

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
          className='toast-enter fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] items-start gap-3 border-2 border-stone-900 bg-white p-4 pr-3 shadow-[5px_5px_0_#1c1917] sm:right-6 sm:top-6 dark:border-stone-700 dark:bg-stone-900 dark:shadow-[5px_5px_0_#44403c]'
        >
          <CircleAlert className='mt-0.5 shrink-0 text-red-600' size={19} />
          <div>
            <p className='text-sm font-black'>{t('toast.removedTitle')}</p>
            <p className='mt-0.5 text-xs text-stone-600 dark:text-stone-400'>{t('toast.removedText')}</p>
          </div>
          <button
            type='button'
            onClick={() => setWasRemoved(false)}
            aria-label={t('toast.close')}
            className='grid h-7 w-7 shrink-0 place-items-center text-stone-500 hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-2 focus-visible:outline-stone-950 dark:hover:bg-stone-800 dark:hover:text-stone-100'
          >
            <X size={16} />
          </button>
        </div>
      )}
      <nav className='mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-6'>
        <a href='/' className='flex items-center gap-2 text-lg font-black tracking-tight'>
          <DicesIcon className='size-10 shrink-0 rounded-lg bg-black p-1.5 text-white' />
          Ludo
        </a>
        <div className='flex items-center gap-3'>
          <a
            href='#how-it-works'
            className='link-underline hidden items-center gap-2 text-sm font-bold text-stone-600 transition-colors hover:text-stone-950 sm:flex dark:text-stone-400 dark:hover:text-stone-100'
          >
            {t('nav.howItWorks')} <ArrowDown size={16} />
          </a>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </nav>

      <section className='mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-16'>
        <div className='home-reveal'>
          <p className='mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-[.18em] text-red-700 dark:text-red-400'>
            <span className='relative flex h-2 w-2 items-center justify-center'>
              <span className='absolute h-2 w-2 rounded-full bg-red-600 animate-ping' />
              <span className='absolute h-2 w-2 rounded-full bg-red-600' />
            </span>
            {t('hero.live')}
          </p>
          <h1 className='max-w-2xl font-display text-6xl font-black leading-[.9] tracking-tight sm:text-8xl'>
            {t('hero.titleLine1')}
            <br />
            <em className='text-red-600 dark:text-red-400'>{t('hero.titleEm')}</em>
          </h1>
          <p className='mt-8 max-w-xl text-lg leading-8 text-stone-600 sm:text-xl dark:text-stone-400'>{t('hero.subtitle')}</p>
          <a
            href='#start'
            className='mt-8 inline-flex items-center gap-3 text-sm font-black uppercase tracking-[.14em] text-stone-950 underline decoration-2 underline-offset-8 dark:text-stone-100'
          >
            {t('hero.cta')} <ArrowRight size={18} />
          </a>
        </div>

        <div className='home-board relative mx-auto w-full max-w-lg' aria-label={t('preview.aria')}>
          <div className='absolute -right-2 -top-5 z-10 grid h-20 w-20 rotate-12 place-items-center border-2 border-stone-900 bg-white shadow-[5px_5px_0_#1c1917] sm:-right-5 sm:h-24 sm:w-24 dark:border-stone-700 dark:bg-stone-900 dark:shadow-[5px_5px_0_#44403c]'>
            <Dices size={38} strokeWidth={1.7} />
            <span className='absolute bottom-1 hidden text-[10px] font-black uppercase tracking-widest sm:block'>{t('preview.badge')}</span>
          </div>
          <PreviewBoard />
          <p className='mt-5 text-center text-xs font-black uppercase tracking-[.16em] text-stone-500 dark:text-stone-500'>{t('preview.caption')}</p>
        </div>
      </section>

      <section id='start' className='border-y-2 border-stone-900 bg-[#e8dfcd] dark:border-stone-700 dark:bg-stone-900'>
        <div className='mx-auto grid min-w-0 max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:py-20'>
          <div className='min-w-0'>
            <p className='mb-3 text-sm font-black uppercase tracking-[.16em] text-red-700 dark:text-red-400'>{t('start.eyebrow')}</p>
            <h2 className='max-w-full wrap-break-word font-display text-4xl font-black leading-none sm:text-5xl'>{t('start.title')}</h2>
            <p className='mt-4 max-w-md wrap-break-word leading-7 text-stone-600 dark:text-stone-400'>{t('start.subtitle')}</p>
          </div>
          <section className='min-w-0 max-w-full border-2 border-stone-900 bg-white p-6 shadow-[8px_8px_0_#1c1917] sm:p-8 dark:border-stone-700 dark:bg-stone-950 dark:shadow-[8px_8px_0_#f4f0e7]'>
            <label className='mb-2 block text-sm font-bold' htmlFor='name'>
              {t('start.nameLabel')}
            </label>
            <input
              id='name'
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={24}
              placeholder={t('start.namePlaceholder')}
              className='h-12 w-full rounded-md border border-stone-300 px-4 outline-none focus:border-stone-950 focus:ring-2 focus:ring-yellow-400 dark:border-stone-700 dark:bg-stone-900 dark:focus:border-stone-100'
            />
            <Button className='mt-5 w-full' onClick={() => enter('/room/new')}>
              <Plus size={18} /> {t('start.createRoom')}
            </Button>
            <div className='my-7 flex items-center gap-3 text-xs font-bold uppercase text-stone-400'>
              <span className='h-px flex-1 bg-stone-200 dark:bg-stone-700' /> {t('start.or')} <span className='h-px flex-1 bg-stone-200 dark:bg-stone-700' />
            </div>
            <label className='mb-2 block text-sm font-bold' htmlFor='room'>
              {t('start.roomLabel')}
            </label>
            <div className='flex gap-2'>
              <input
                id='room'
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                maxLength={6}
                placeholder={t('start.roomPlaceholder')}
                className='h-11 min-w-0 flex-1 rounded-md border border-stone-300 px-4 font-mono uppercase outline-none focus:border-stone-950 dark:border-stone-700 dark:bg-stone-900 dark:focus:border-stone-100'
              />
              <Button variant='outline' aria-label={t('start.joinAria')} disabled={roomCode.length !== 6} onClick={() => enter(`/room/${roomCode}`)}>
                <ArrowRight size={19} />
              </Button>
            </div>
          </section>
        </div>
      </section>

      <section id='how-it-works' className='mx-auto max-w-6xl px-6 py-20 sm:py-28'>
        <div className='max-w-xl'>
          <p className='mb-3 text-sm font-black uppercase tracking-[.16em] text-red-700 dark:text-red-400'>{t('howItWorks.eyebrow')}</p>
          <h2 className='font-display text-4xl font-black leading-none sm:text-5xl'>{t('howItWorks.title')}</h2>
        </div>
        <div className='stagger-fade-in mt-12 grid gap-8 md:grid-cols-3'>
          {steps.map((step, index) => {
            const Icon = stepIcons[index]!;
            return (
              <article
                key={step.title}
                className={`card-hover-lift ${index === 0 ? 'border-t-0 md:border-l-0 md:pl-0' : 'border-t-2 border-stone-900 md:border-l-2 md:border-t-0 md:border-stone-900 md:pl-8 dark:border-stone-700'} pt-5 md:pt-0`}
              >
                <div className='flex items-center justify-between'>
                  <span className='font-mono text-sm font-bold text-red-700 dark:text-red-400'>{String(index + 1).padStart(2, '0')}</span>
                  <Icon size={23} />
                </div>
                <h3 className='mt-4 text-2xl font-black'>{step.title}</h3>
                <p className='mt-2 leading-7 text-stone-600 dark:text-stone-400'>{step.text}</p>
              </article>
            );
          })}
        </div>
        <div className='mt-10 grid gap-6 border-t-2 border-stone-900 pt-8 sm:grid-cols-3 dark:border-stone-700'>
          <div className='flex gap-3'>
            <Users className='shrink-0 text-red-600 dark:text-red-400' size={22} />
            <p>
              <strong className='block'>{t('howItWorks.players.title')}</strong>
              <span className='text-sm text-stone-600 dark:text-stone-400'>{t('howItWorks.players.text')}</span>
            </p>
          </div>
          <div className='flex gap-3'>
            <Sparkles className='shrink-0 text-red-600 dark:text-red-400' size={22} />
            <p>
              <strong className='block'>{t('howItWorks.sync.title')}</strong>
              <span className='text-sm text-stone-600 dark:text-stone-400'>{t('howItWorks.sync.text')}</span>
            </p>
          </div>
          <div className='flex gap-3'>
            <Dices className='shrink-0 text-red-600 dark:text-red-400' size={22} />
            <p>
              <strong className='block'>{t('howItWorks.fairDice.title')}</strong>
              <span className='text-sm text-stone-600 dark:text-stone-400'>{t('howItWorks.fairDice.text')}</span>
            </p>
          </div>
        </div>
      </section>

      <footer className='border-t-2 border-stone-900 bg-[#e8dfcd] px-6 py-7 text-center text-xs font-bold uppercase tracking-[.15em] dark:border-stone-700 dark:bg-stone-900'>
        {t('footer')}
      </footer>
    </main>
  );
}
