'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ludo-player-name';

/**
 * The name field shared by the home page and the public rooms page. It is saved to session storage as you
 * type, not on submit, so it is still there after you move between the two (or leave and come back).
 * The room page reads the same key when it connects, and trims it there.
 */
export function usePlayerName(): [string, (name: string) => void] {
  const [name, setName] = useState('');

  // Read after mount: session storage doesn't exist on the server, and reading it during render would mismatch.
  useEffect(() => setName(sessionStorage.getItem(STORAGE_KEY) ?? ''), []);

  function update(value: string) {
    setName(value);
    sessionStorage.setItem(STORAGE_KEY, value);
  }

  return [name, update];
}
