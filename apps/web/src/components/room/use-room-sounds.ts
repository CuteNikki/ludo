import type { GameState } from '@ludo/shared';
import { useEffect, useRef } from 'react';

import { useSound } from '@/components/providers/sound';

/** How long the piece-move animation takes to land, so a capture is heard as the piece arrives. */
const CAPTURE_DELAY_MS = 220;
const TICK_FROM_SECONDS = 5;

/**
 * Plays the sound for whatever just changed in the room by comparing each new state with the last
 * one: dice, moves, captures, turns, joins, and the end of the game. The first state after joining is
 * only a baseline, so arriving in a running game doesn't replay its history.
 * Call it before any early return; it accepts a room that hasn't loaded yet.
 */
export function useRoomSounds(state: GameState | null, playerId: string | null, now: number) {
  const { play } = useSound();
  const previous = useRef<GameState | null>(null);

  useEffect(() => {
    if (!state || !playerId) return;
    const before = previous.current;
    previous.current = state;
    if (!before || before.roomCode !== state.roomCode) return;

    if (before.phase !== state.phase) {
      if (state.phase === 'playing') play('start');
      else if (state.phase === 'finished') play(state.winnerId === playerId ? 'win' : 'lose');
      return;
    }

    if (state.players.length > before.players.length) play('join');
    else if (state.players.length < before.players.length) play('leave');

    if (state.phase === 'lobby') {
      const someoneReady = state.players.some((player) => player.id !== playerId && player.ready && !before.players.find((old) => old.id === player.id)?.ready);
      if (someoneReady) play('ready');
      return;
    }
    if (state.phase !== 'playing') return;

    // The dice.
    if (before.turnStage !== 'rolling' && state.turnStage === 'rolling') play('roll');
    if (before.turnStage === 'rolling' && state.turnStage !== 'rolling' && state.diceResult !== null) play(state.diceResult === 6 ? 'six' : 'land');

    // Pieces: a tick per step, a pop for leaving the yard, and a crash for being sent back to it.
    let moveSoundEnded = 0;
    for (const piece of state.pieces) {
      const old = before.pieces.find((candidate) => candidate.id === piece.id);
      if (!old || old.position === piece.position) continue;
      if (piece.position === -1) {
        play('capture', CAPTURE_DELAY_MS);
      } else if (old.position === -1) {
        play('spawn');
      } else {
        const steps = Math.min(6, Math.max(1, piece.position - old.position));
        for (let step = 0; step < steps; step += 1) play('move', step * 90);
        moveSoundEnded = Math.max(moveSoundEnded, steps * 90);
      }
    }

    // Whose turn it is now, held back a beat so it doesn't talk over the move.
    if (before.currentPlayerId !== state.currentPlayerId) {
      play(state.currentPlayerId === playerId ? 'yourTurn' : 'turn', moveSoundEnded + 260);
    }
  }, [state, playerId, play]);

  // The last seconds of your own move timer.
  const myMove = !!state && !!playerId && state.phase === 'playing' && state.turnStage === 'move' && state.currentPlayerId === playerId && state.turnDeadline !== null;
  const secondsLeft = myMove && state.turnDeadline !== null ? Math.max(0, Math.ceil((state.turnDeadline - now) / 1000)) : null;
  useEffect(() => {
    if (secondsLeft !== null && secondsLeft > 0 && secondsLeft <= TICK_FROM_SECONDS) play('tick');
  }, [secondsLeft, play]);
}
