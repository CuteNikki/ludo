'use client';

import { ArrowRight, CircleAlert, Dices, DicesIcon, Flag, Link2, Plus, Sparkles, Users, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { GameState, PlayerColor } from '@ludo/shared';

import { GameBoard } from '@/components/game-board';
import { LanguageToggle } from '@/components/language-toggle';
import { Reveal } from '@/components/scroll-reveal';
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

const NOTICE_COPY = {
  kicked: { titleKey: 'toast.kickedTitle', textKey: 'toast.kickedText' },
  disconnected: { titleKey: 'toast.disconnectedTitle', textKey: 'toast.disconnectedText' },
  'rematch-timeout': { titleKey: 'toast.rematchTimeoutTitle', textKey: 'toast.rematchTimeoutText' },
} as const;

type PreviewPlayer = { id: string; name: string; color: PlayerColor };

function createPreviewPlayers(t: (key: string) => string): PreviewPlayer[] {
  return [
    { id: 'preview-red', name: t('room.colors.red'), color: 'red' },
    { id: 'preview-blue', name: t('room.colors.blue'), color: 'blue' },
    { id: 'preview-green', name: t('room.colors.green'), color: 'green' },
    { id: 'preview-yellow', name: t('room.colors.yellow'), color: 'yellow' },
  ];
}

const previewStartPositions = [
  [3, -1, 25, 40],
  [-1, 12, 25, -1],
  [3, -1, -1, 40],
  [-1, 12, 25, 40],
];

function createPreviewState(previewPlayers: PreviewPlayer[]): GameState {
  return {
    roomCode: 'DEMO',
    hostPlayerId: 'preview-red',
    settings: { moveTimeSeconds: 30, automaticSingleMove: true, fairDice: true, isPublic: false, mustSpawnOnSix: false },
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
  const [notice, setNotice] = useState<'kicked' | 'disconnected' | 'rematch-timeout' | null>(null);

  const stepIcons = [Link2, Dices, Flag];
  const steps = t('howItWorks.steps', { returnObjects: true }) as Array<{ title: string; text: string }>;

  function PreviewBoard() {
    const previewPlayers = useMemo(() => createPreviewPlayers(t), [t]);
    const [state, setState] = useState<GameState>(() => createPreviewState(previewPlayers));
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
              setState(createPreviewState(previewPlayers));
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
    const noticeParam = url.searchParams.get('notice');
    if (noticeParam === 'kicked' || noticeParam === 'disconnected' || noticeParam === 'rematch-timeout') {
      setNotice(noticeParam);
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
      {notice && (
        <div
          role='alert'
          className='animate-toast-enter fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] items-start gap-3 border-2 border-border bg-background-alternative p-4 pr-3 shadow-card sm:right-6 sm:top-6'
        >
          <CircleAlert className='mt-0.5 shrink-0 text-red-600' size={19} />
          <div>
            <p className='text-sm font-black'>{t(NOTICE_COPY[notice].titleKey)}</p>
            <p className='mt-0.5 text-xs text-foreground/70'>{t(NOTICE_COPY[notice].textKey)}</p>
          </div>
          <button
            type='button'
            onClick={() => setNotice(null)}
            aria-label={t('toast.close')}
            className='grid h-7 w-7 shrink-0 place-items-center text-foreground/60 hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground'
          >
            <X size={16} />
          </button>
        </div>
      )}

      <nav className='mx-auto mt-2 sm:mt-4 flex w-[calc(100%-1.5rem)] max-w-6xl items-center justify-between gap-2 p-4 bg-background-alternative z-120 border-4 shadow-card border-border'>
        <a href='/' className='flex items-center gap-2 text-lg font-black tracking-tight'>
          <DicesIcon className='size-10 shrink-0 rounded-lg bg-foreground p-1.5 text-background' />
          Ludo
        </a>
        <div className='flex items-center gap-1'>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </nav>

      <section className='mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-16 lg:pb-28'>
        <div className='home-reveal'>
          <p className='mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-[.18em] text-red-600'>
            <span className='relative flex h-2 w-2 items-center justify-center'>
              <span className='absolute h-2 w-2 rounded-full bg-red-600 animate-ping' />
              <span className='absolute h-2 w-2 rounded-full bg-red-600' />
            </span>
            {t('hero.live')}
          </p>
          <h1 className='max-w-2xl font-display text-6xl font-black leading-[.9] tracking-tight sm:text-8xl'>
            {t('hero.titleLine1')}
            <br />
            <em className='text-red-600'>{t('hero.titleEm')}</em>
          </h1>
          <p className='mt-8 max-w-xl text-lg leading-8 text-foreground/80 sm:text-xl'>{t('hero.subtitle')}</p>
          <a
            href='#start'
            className='mt-8 inline-flex items-center gap-3 text-sm font-black uppercase tracking-[.14em] text-foreground underline decoration-2 underline-offset-8'
          >
            {t('hero.cta')} <ArrowRight size={18} />
          </a>
        </div>

        <div className='home-board relative mx-auto w-full max-w-lg' aria-label={t('preview.aria')}>
          <div className='absolute z-100 -right-2 -top-5 grid h-20 w-20 rotate-12 place-items-center border-4 border-border bg-background-alternative shadow-card sm:-right-5 sm:h-24 sm:w-24'>
            <Dices size={38} strokeWidth={1.7} />
            <span className='absolute bottom-1 hidden text-[10px] font-black uppercase tracking-widest sm:block'>{t('preview.badge')}</span>
          </div>
          <PreviewBoard />
          <p className='mt-5 text-center text-xs font-black uppercase tracking-[.16em] text-foreground/60'>{t('preview.caption')}</p>
        </div>
      </section>

      <section id='start' className='border-y-2 border-border bg-background-alternative'>
        <Reveal className='scroll-reveal mx-auto grid min-w-0 max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:py-20'>
          <div className='min-w-0'>
            <p className='mb-3 text-sm font-black uppercase tracking-[.16em] text-red-600'>{t('start.eyebrow')}</p>
            <h2 className='max-w-full wrap-break-word font-display text-4xl font-black leading-none sm:text-5xl'>{t('start.title')}</h2>
            <p className='mt-4 max-w-md wrap-break-word leading-7 text-foreground/70'>{t('start.subtitle')}</p>
          </div>
          <section className='min-w-0 max-w-full border-4 border-border bg-background p-6 shadow-card sm:p-8'>
            <label className='mb-2 block text-sm font-bold' htmlFor='name'>
              {t('start.nameLabel')}
            </label>
            <input
              id='name'
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={24}
              placeholder={t('start.namePlaceholder')}
              className='h-12 w-full border-2 border-border bg-background-alternative px-4 outline-none focus:border-foreground focus:ring-2 focus:ring-amber-300'
            />
            <Button className='mt-5 w-full' onClick={() => enter('/room/new')}>
              <Plus size={18} /> {t('start.createRoom')}
            </Button>
            <div className='my-7 flex items-center gap-3 text-xs font-bold uppercase text-foreground/40'>
              <span className='h-px flex-1 bg-border' /> {t('start.or')} <span className='h-px flex-1 bg-border' />
            </div>
            <label className='mb-2 block text-sm font-bold' htmlFor='room'>
              {t('start.roomLabel')}
            </label>
            <form
              className='flex gap-2'
              onSubmit={(event) => {
                event.preventDefault();
                if (roomCode.length === 6) enter(`/room/${roomCode}`);
              }}
            >
              <input
                id='room'
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                maxLength={6}
                placeholder={t('start.roomPlaceholder')}
                autoComplete='off'
                autoCorrect='off'
                autoCapitalize='characters'
                spellCheck={false}
                inputMode='text'
                className='h-11 min-w-0 flex-1 border-2 border-border bg-background-alternative px-4 font-mono uppercase outline-none focus:border-foreground'
              />
              <Button type='submit' variant='outline' aria-label={t('start.joinAria')} disabled={roomCode.length !== 6}>
                <ArrowRight size={19} />
              </Button>
            </form>
            <a href='/discover' className='mt-4 flex items-center justify-center gap-1.5 text-sm font-bold text-foreground/70 hover:text-foreground'>
              <Users size={15} /> {t('start.browsePublicRooms')}
            </a>
          </section>
        </Reveal>
      </section>

      <section id='how-it-works' className='mx-auto max-w-6xl px-6 py-20 sm:py-28'>
        <div className='max-w-xl'>
          <p className='mb-3 text-sm font-black uppercase tracking-[.16em] text-red-600'>{t('howItWorks.eyebrow')}</p>
          <h2 className='font-display text-4xl font-black leading-none sm:text-5xl'>{t('howItWorks.title')}</h2>
        </div>
        <Reveal className='stagger-fade-in mt-12 grid gap-8 md:grid-cols-3'>
          {steps.map((step, index) => {
            const Icon = stepIcons[index]!;
            return (
              <article
                key={step.title}
                className={`card-hover-lift ${index === 0 ? 'border-t-0 md:border-l-0 md:pl-0' : 'border-t-2 border-border md:border-l-2 md:border-t-0 md:border-border md:pl-8'} pt-5 md:pt-0`}
              >
                <div className='flex items-center justify-between'>
                  <span className='font-mono text-sm font-bold text-red-600'>{String(index + 1).padStart(2, '0')}</span>
                  <Icon size={23} />
                </div>
                <h3 className='mt-4 text-2xl font-black'>{step.title}</h3>
                <p className='mt-2 leading-7 text-foreground/70'>{step.text}</p>
              </article>
            );
          })}
        </Reveal>
        <Reveal className='scroll-reveal mt-10 grid gap-6 border-t-2 border-border pt-8 sm:grid-cols-3'>
          <div className='flex gap-3'>
            <Users className='shrink-0 text-red-600' size={22} />
            <p>
              <strong className='block'>{t('howItWorks.players.title')}</strong>
              <span className='text-sm text-foreground/70'>{t('howItWorks.players.text')}</span>
            </p>
          </div>
          <div className='flex gap-3'>
            <Sparkles className='shrink-0 text-red-600' size={22} />
            <p>
              <strong className='block'>{t('howItWorks.sync.title')}</strong>
              <span className='text-sm text-foreground/70'>{t('howItWorks.sync.text')}</span>
            </p>
          </div>
          <div className='flex gap-3'>
            <Dices className='shrink-0 text-red-600' size={22} />
            <p>
              <strong className='block'>{t('howItWorks.fairDice.title')}</strong>
              <span className='text-sm text-foreground/70'>{t('howItWorks.fairDice.text')}</span>
            </p>
          </div>
        </Reveal>
      </section>

      <footer className='border-t-2 border-border bg-background-alternative px-6 py-7 text-center text-xs font-bold uppercase tracking-[.15em]'>
        {t('footer')}
      </footer>
    </main>
  );
}
