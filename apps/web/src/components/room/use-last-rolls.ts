import type { GameState } from '@ludo/shared';
import { useEffect, useState } from 'react';

/**
 * What each player last rolled. The server only reports the roll of the turn in progress and clears
 * it when the turn passes, so without this nobody could tell what the previous player got.
 */
export function useLastRolls({ diceResult, currentPlayerId, phase }: Pick<GameState, 'diceResult' | 'currentPlayerId' | 'phase'>): Record<string, number> {
  const [rolls, setRolls] = useState<Record<string, number>>({});

  useEffect(() => {
    if (phase === 'lobby') {
      setRolls((previous) => (Object.keys(previous).length === 0 ? previous : {}));
      return;
    }
    if (diceResult === null || currentPlayerId === null) return;
    setRolls((previous) => (previous[currentPlayerId] === diceResult ? previous : { ...previous, [currentPlayerId]: diceResult }));
  }, [diceResult, currentPlayerId, phase]);

  return rolls;
}
