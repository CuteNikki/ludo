'use client';

import { ArrowRight, BookOpen, Bot, CircleAlert, Dices, Flag, Laugh, Link2, Plus, Sparkles, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DecorLayer, HOME_DECOR } from '@/components/decor';
import { PreviewBoard } from '@/components/preview-board';
import { Reveal } from '@/components/scroll-reveal';
import { Toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { order } from '@/lib/reveal';
import { cn } from '@/lib/utils';

const NOTICE_COPY = {
  kicked: { titleKey: 'toast.kickedTitle', textKey: 'toast.kickedText' },
  disconnected: { titleKey: 'toast.disconnectedTitle', textKey: 'toast.disconnectedText' },
  'rematch-timeout': { titleKey: 'toast.rematchTimeoutTitle', textKey: 'toast.rematchTimeoutText' },
} as const;

// One per player color, so all four are on the cards.
const stepStyles = ['bg-p-red text-white', 'bg-p-blue text-white', 'bg-p-green text-white', 'bg-p-yellow text-primary-foreground'] as const;

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [notice, setNotice] = useState<'kicked' | 'disconnected' | 'rematch-timeout' | null>(null);

  const stepIcons = [Link2, Dices, Flag, Laugh];
  const steps = t('howItWorks.steps', { returnObjects: true }) as Array<{ title: string; text: string }>;
  const features = [
    { icon: Users, title: t('howItWorks.players.title'), text: t('howItWorks.players.text') },
    { icon: Sparkles, title: t('howItWorks.sync.title'), text: t('howItWorks.sync.text') },
    { icon: Dices, title: t('howItWorks.fairDice.title'), text: t('howItWorks.fairDice.text') },
  ];

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
    <>
      {notice && (
        <Toast
          role='alert'
          onDismiss={() => setNotice(null)}
          duration={8_000}
          className='toy-card fixed right-4 top-20 z-50 flex max-w-[calc(100vw-2rem)] items-start gap-3 p-4 pr-3 sm:right-6'
        >
          {(dismiss) => (
            <>
              <CircleAlert className='mt-0.5 shrink-0 text-p-red' size={20} strokeWidth={2.5} />
              <div>
                <p className='font-display text-lg leading-tight'>{t(NOTICE_COPY[notice].titleKey)}</p>
                <p className='mt-0.5 text-sm text-foreground/70'>{t(NOTICE_COPY[notice].textKey)}</p>
              </div>
              <button
                type='button'
                onClick={dismiss}
                aria-label={t('toast.close')}
                className='grid size-8 shrink-0 place-items-center rounded-md text-foreground/60 hover:bg-foreground/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground'
              >
                <X size={18} strokeWidth={3} />
              </button>
            </>
          )}
        </Toast>
      )}

      <section className='relative overflow-hidden'>
        <DecorLayer items={HOME_DECOR} />

        <div className='relative mx-auto grid w-full max-w-7xl gap-12 px-4 pb-24 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:px-8 lg:pb-24 2xl:max-w-[100rem] 2xl:gap-24'>
          <div className='mx-auto w-full min-w-0 max-w-xl lg:mx-0 lg:max-w-none'>
            <p className='reveal-load mb-5 inline-flex items-center gap-2.5 rounded-full border-3 border-border bg-background-alternative px-4 py-1.5 shadow-toy' style={order(0)}>
              <span className='relative flex size-3 items-center justify-center'>
                <span className='absolute size-3 animate-ping rounded-full bg-p-green' />
                <span className='absolute size-3 rounded-full border-2 border-border bg-p-green' />
              </span>
              <span className='eyebrow'>{t('hero.live')}</span>
            </p>
            <h1 className='reveal-load font-display text-[2.6rem] leading-[1.05] sm:text-7xl 2xl:text-8xl' style={order(1)}>
              {t('hero.titleLine1')}
              <br />
              <span
                className='reveal-load mt-2 inline-block -rotate-2 rounded-xl border-3 border-border bg-p-red px-3 pb-1 text-white shadow-card sm:mt-3 sm:px-4'
                style={order(2, '-9deg')}
              >
                {t('hero.titleEm')}
              </span>
            </h1>
            <p
              className='reveal-load mt-6 max-w-xl text-lg font-semibold leading-8 text-foreground/80 sm:text-xl 2xl:max-w-2xl 2xl:text-2xl 2xl:leading-9'
              style={order(3)}
            >{t('hero.subtitle')}</p>

            {/* The scroll target of the navbar's "Play" link. It is this plain wrapper, not the card: the card animates in,
                and a scroll aimed at it would land where it starts rather than where it ends up. */}
            <div id='start' className='mt-8 w-full max-w-xl'>
              <section className='reveal-load toy-card w-full p-5 sm:p-6' style={order(4)}>
                <Label htmlFor='name' className='mb-2'>
                  {t('start.nameLabel')}
                </Label>
                <Input
                  id='name'
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={24}
                  placeholder={t('start.namePlaceholder')}
                />
                <div className='mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2'>
                  <Button size='lg' onClick={() => enter('/room/new')}>
                    <Plus size={20} strokeWidth={3} /> {t('start.createRoom')}
                  </Button>
                  <Button size='lg' variant='outline' onClick={() => enter('/room/new?bots=3')}>
                    <Bot size={20} strokeWidth={2.5} /> <span className='truncate'>{t('start.playComputer')}</span>
                  </Button>
                </div>
                <div className='my-5 flex items-center gap-3 text-sm font-extrabold uppercase text-foreground/70'>
                  <span className='h-0.5 flex-1 rounded-full bg-foreground/20' /> {t('start.or')} <span className='h-0.5 flex-1 rounded-full bg-foreground/20' />
                </div>
                <Label htmlFor='room' className='mb-2'>
                  {t('start.roomLabel')}
                </Label>
                <form
                  className='flex gap-2'
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (roomCode.length === 6) enter(`/room/${roomCode}`);
                  }}
                >
                  <Input
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
                    className='min-w-0 flex-1 font-display text-xl uppercase tracking-[.2em] placeholder:font-display placeholder:tracking-[.2em]'
                  />
                  <Button type='submit' variant='outline' size='icon' className='size-12' aria-label={t('start.joinAria')} disabled={roomCode.length !== 6}>
                    <ArrowRight size={22} strokeWidth={3} />
                  </Button>
                </form>
              </section>
            </div>
          </div>

          <div className='reveal-load relative mx-auto w-full max-w-xl lg:max-w-none' style={order(3, '4deg')} role='group' aria-label={t('preview.aria')}>
            <div className='mx-auto w-full lg:max-w-136 2xl:max-w-184'>
              <div
                className='reveal-load absolute -right-1 -top-6 z-10 grid size-20 rotate-12 place-items-center rounded-xl border-3 border-border bg-primary text-primary-foreground shadow-card sm:-right-3 sm:size-24'
                style={order(7, '60deg')}
              >
                <Dices size={34} strokeWidth={2.2} />
                <span className='absolute bottom-1 hidden font-display text-[11px] uppercase tracking-wider sm:block'>{t('preview.badge')}</span>
              </div>
              <PreviewBoard />
              <p className='reveal-load eyebrow mt-6 text-center text-foreground/65' style={order(6)}>{t('preview.caption')}</p>
            </div>
          </div>
        </div>
      </section>

      <section id='how-it-works' className='border-y-3 border-border bg-background-alternative'>
        {/* One Reveal for the whole section: the pieces then pop in one after another, in order. */}
        <Reveal className='mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 2xl:max-w-[100rem]'>
          <div className='max-w-2xl'>
            <p className='reveal-item eyebrow text-accent' style={order(0)}>
              {t('howItWorks.eyebrow')}
            </p>
            <h2 className='reveal-item mt-2 font-display text-4xl leading-tight sm:text-6xl' style={order(1)}>
              {t('howItWorks.title')}
            </h2>
            <div className='reveal-item mt-4' style={order(2)}>
              <Link
                href='/rules'
                className='link-underline inline-flex items-center gap-2 font-extrabold text-foreground/80 hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-foreground'
              >
                <BookOpen size={17} strokeWidth={2.5} /> {t('howItWorks.readFullRules')}
              </Link>
            </div>
          </div>
          <div className='mt-12 grid gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-4'>
            {steps.map((step, index) => {
              const Icon = stepIcons[index] ?? Laugh;
              return (
                <div key={step.title} className='reveal-item' style={order(3 + index, index % 2 === 0 ? '-3deg' : '3deg')}>
                  <article className='toy-card card-hover-lift relative h-full p-6 pt-9'>
                    <span
                      className={cn(
                        'absolute -top-5 left-5 grid size-12 -rotate-6 place-items-center rounded-xl border-3 border-border font-display text-2xl shadow-toy',
                        stepStyles[index % stepStyles.length],
                      )}
                    >
                      {index + 1}
                    </span>
                    <Icon className='absolute right-5 top-4 text-foreground/25' size={38} strokeWidth={2} />
                    <h3 className='font-display text-3xl'>{step.title}</h3>
                    <p className='mt-2 text-lg leading-7 text-foreground/75'>{step.text}</p>
                  </article>
                </div>
              );
            })}
          </div>
        </Reveal>
      </section>

      <section>
        <Reveal rootMargin='0px 0px -30% 0px' className='mx-auto grid w-full max-w-7xl gap-6 px-4 py-16 sm:grid-cols-3 sm:px-6 sm:py-20 lg:px-8 2xl:max-w-[100rem]'>
          {features.map(({ icon: Icon, title, text }, index) => (
            <div key={title} className='reveal-item' style={order(index)}>
              <div className='toy-card card-hover-lift flex h-full items-center gap-4 p-5'>
                <span className='grid size-14 shrink-0 place-items-center rounded-xl border-3 border-border bg-primary text-primary-foreground shadow-toy'>
                  <Icon size={26} strokeWidth={2.5} />
                </span>
                <p>
                  <strong className='block font-display text-2xl leading-tight'>{title}</strong>
                  <span className='font-bold text-foreground/75'>{text}</span>
                </p>
              </div>
            </div>
          ))}
        </Reveal>
      </section>
    </>
  );
}
