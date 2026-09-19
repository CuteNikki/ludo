'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { createPreviewPlayers, createPreviewState, playPreviewTurn } from '@/lib/preview-game';

import { GameBoard } from '@/components/game-board';

const FIRST_TURN_DELAY_MS = 1_000;
const TURN_DELAY_MS = 1_400;
const FINISHED_PAUSE_MS = 3_500;

/** The landing page's demo: four bots playing a game against each other, restarting when one wins. */
export function PreviewBoard() {
  const { t } = useTranslation();
  const previewPlayers = useMemo(() => createPreviewPlayers(t), [t]);
  const [state, setState] = useState(() => createPreviewState(previewPlayers));

  useEffect(() => {
    let timer: number | undefined;
    let current = createPreviewState(previewPlayers);
    let playerIndex = 0;
    setState(current);

    function nextTurn() {
      const roll = Math.floor(Math.random() * 6) + 1;
      const result = playPreviewTurn(current, previewPlayers[playerIndex]!.id, roll);
      current = result.state;
      setState(current);

      if (current.phase === 'finished') {
        timer = window.setTimeout(() => {
          current = createPreviewState(previewPlayers);
          playerIndex = 0;
          setState(current);
          timer = window.setTimeout(nextTurn, FIRST_TURN_DELAY_MS);
        }, FINISHED_PAUSE_MS);
        return;
      }
      // A six that was played earns another roll for the same player, like in a real game.
      if (!result.extraTurn) playerIndex = (playerIndex + 1) % previewPlayers.length;
      timer = window.setTimeout(nextTurn, TURN_DELAY_MS);
    }

    timer = window.setTimeout(nextTurn, FIRST_TURN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [previewPlayers]);

  return <GameBoard state={state} playerId='preview-viewer' onMove={() => undefined} />;
}
