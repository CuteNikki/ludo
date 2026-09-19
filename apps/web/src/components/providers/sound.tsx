'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { playSound, setSoundEnabled, unlockAudio, type SoundName } from '@/lib/sound';

const STORAGE_KEY = 'ludo-sound';

/** Things that get a hover and click sound. Opt out with `data-sound="none"` on the element or an ancestor. */
const INTERACTIVE = "button, a[href], summary, [role='switch'], [role='menuitem'], [role='tab']";

interface SoundContextValue {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  play: (name: SoundName, delayMs?: number) => void;
}

const SoundContext = createContext<SoundContextValue>({ enabled: true, setEnabled: () => undefined, play: playSound });

export function useSound() {
  return useContext(SoundContext);
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(true);

  // The saved choice is only known on the client; sound stays on for the first paint.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'off') {
        setEnabledState(false);
        setSoundEnabled(false);
      }
    } catch {
      // Storage can be blocked; the choice just won't persist.
    }
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    setSoundEnabled(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
    } catch {
      // See above.
    }
    if (value) playSound('click');
  }, []);

  // Audio only starts after a gesture, so the first press or key unlocks it.
  useEffect(() => {
    const unlock = () => void unlockAudio();
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, []);

  // One pair of delegated listeners covers every button and link on every page.
  useEffect(() => {
    function interactive(target: EventTarget | null): Element | null {
      const element = target instanceof Element ? target.closest(INTERACTIVE) : null;
      if (!element || element.closest('[data-sound="none"]')) return null;
      if ((element as HTMLButtonElement).disabled || element.getAttribute('aria-disabled') === 'true') return null;
      return element;
    }
    function onOver(event: PointerEvent) {
      // Touch has no hover, and a tap already gets its click sound.
      if (event.pointerType !== 'mouse') return;
      const element = interactive(event.target);
      if (!element) return;
      // Moving between children of the same button isn't a new hover.
      if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
      playSound('hover');
    }
    function onClick(event: MouseEvent) {
      if (interactive(event.target)) playSound('click');
    }
    document.addEventListener('pointerover', onOver, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('pointerover', onOver, true);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  const value = useMemo(() => ({ enabled, setEnabled, play: playSound }), [enabled, setEnabled]);
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}
