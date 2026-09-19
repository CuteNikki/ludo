'use client';

import { BookOpen, Menu, Play, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LanguageToggle } from '@/components/language-toggle';
import { LogoMark, Wordmark } from '@/components/logo';
import { SoundToggle } from '@/components/sound-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** The one navbar, mounted by the root layout. Links collapse into a menu panel below `md`. */
export function SiteNavbar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Following a link out of a room would close its connection and drop you from the game, so in a room
  // the links open in a new tab instead.
  const newTab = pathname.startsWith('/room') ? ({ target: '_blank', rel: 'noreferrer' } as const) : {};

  const links = [
    { href: '/discover', label: t('nav.rooms'), icon: Users },
    { href: '/rules', label: t('nav.rules'), icon: BookOpen },
  ];

  // Following a link in the menu should also close it.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <header className='relative z-40 border-b-3 border-border bg-background-alternative shadow-[0_4px_0_var(--shadow-color)]'>
      <a
        href='#main'
        className='absolute left-4 top-2 z-50 -translate-y-20 rounded-lg border-3 border-border bg-primary px-4 py-2 font-display text-primary-foreground shadow-toy focus:translate-y-0'
      >
        {t('nav.skip')}
      </a>
      <div className='mx-auto flex h-16 w-full max-w-480 items-center gap-2 px-4 sm:px-6 lg:px-8'>
        <Link href='/' aria-label={t('nav.home')} className='flex items-center gap-2.5 rounded-lg focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-foreground'>
          <LogoMark />
          <Wordmark className='text-4xl' />
        </Link>

        <nav aria-label={t('nav.aria')} className='ml-6 hidden items-center gap-1.5 md:flex'>
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                {...newTab}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-lg border-3 px-3.5 font-display tracking-wide transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foreground',
                  active ? 'border-border bg-primary text-primary-foreground shadow-[0_3px_0_var(--shadow-color)]' : 'border-transparent hover:bg-foreground/10',
                )}
              >
                <Icon size={18} strokeWidth={2.5} /> {label}
              </Link>
            );
          })}
        </nav>

        <div className='ml-auto flex items-center gap-2'>
          <div className='hidden items-center gap-2 md:flex'>
            <LanguageToggle />
            <ThemeToggle />
            <SoundToggle />
          </div>
          <Button asChild size='sm' className='min-h-10 px-4'>
            <Link href='/#start'>
              <Play size={16} fill='currentColor' /> {t('nav.play')}
            </Link>
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='size-10 md:hidden'
            aria-expanded={open}
            aria-controls='mobile-menu'
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} strokeWidth={3} /> : <Menu size={20} strokeWidth={3} />}
          </Button>
        </div>
      </div>

      {open && (
        <div id='mobile-menu' className='animate-status-swap absolute inset-x-0 top-full border-b-3 border-border bg-background-alternative shadow-[0_4px_0_var(--shadow-color)] md:hidden'>
          <div className='mx-auto grid max-w-lg gap-3 px-4 py-4 sm:px-6'>
            <nav aria-label={t('nav.aria')} className='grid gap-2'>
              {links.map(({ href, label, icon: Icon }) => (
                <Button key={href} asChild variant={pathname === href ? 'default' : 'outline'} className='min-h-12 justify-start px-4 text-lg'>
                  <Link href={href} {...newTab}>
                    <Icon size={20} strokeWidth={2.5} /> {label}
                  </Link>
                </Button>
              ))}
            </nav>
            <LanguageToggle layout='segmented' />
            <ThemeToggle layout='segmented' />
            <SoundToggle layout='segmented' />
          </div>
        </div>
      )}
    </header>
  );
}
