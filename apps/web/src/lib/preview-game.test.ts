import type { GameState } from '@ludo/shared';
import { describe, expect, test } from 'bun:test';

import { createPreviewPlayers, createPreviewState, playPreviewTurn } from './preview-game';

const players = createPreviewPlayers((key) => key);
const red = players[0]!.id;
const blue = players[1]!.id;
const noRandom = () => 0;

/** A fresh demo state with every piece back in its yard, then the given positions applied. */
function stateWith(positions: Record<string, number>): GameState {
  const state = createPreviewState(players);
  return { ...state, pieces: state.pieces.map((piece) => ({ ...piece, position: positions[piece.id] ?? -1 })) };
}

describe('playPreviewTurn', () => {
  test('grants an extra turn after a six that was played', () => {
    const before = stateWith({ [`${red}-piece-0`]: 5 });
    const result = playPreviewTurn(before, red, 6, noRandom);
    expect(result.extraTurn).toBe(true);
    // The bot may prefer spawning a new piece over advancing the one on 5 - either way a piece moved.
    expect(result.state.pieces).not.toEqual(before.pieces);
  });

  test('does not grant an extra turn for other rolls', () => {
    const result = playPreviewTurn(stateWith({ [`${red}-piece-0`]: 5 }), red, 3, noRandom);
    expect(result.extraTurn).toBe(false);
    expect(result.state.pieces.find((piece) => piece.id === `${red}-piece-0`)?.position).toBe(8);
  });

  test('a six with no legal move passes the turn', () => {
    // Everything is home already and can't move past the end.
    const result = playPreviewTurn(
      stateWith({ [`${red}-piece-0`]: 43, [`${red}-piece-1`]: 42, [`${red}-piece-2`]: 41, [`${red}-piece-3`]: 40 }),
      red,
      6,
      noRandom,
    );
    expect(result.extraTurn).toBe(false);
  });

  test('a roll that is not a six leaves a yard piece where it is', () => {
    const result = playPreviewTurn(stateWith({}), red, 4, noRandom);
    expect(result.extraTurn).toBe(false);
    expect(result.state.pieces.filter((piece) => piece.playerId === red).every((piece) => piece.position === -1)).toBe(true);
  });

  test('a six brings a piece out of the yard', () => {
    const result = playPreviewTurn(stateWith({}), red, 6, noRandom);
    expect(result.state.pieces.filter((piece) => piece.playerId === red && piece.position === 0)).toHaveLength(1);
    expect(result.extraTurn).toBe(true);
  });

  test('captures an opponent on the shared track', () => {
    // Red piece on 5 moving 3 lands on board square 8 = blue relative 38.
    const result = playPreviewTurn(stateWith({ [`${red}-piece-0`]: 5, [`${blue}-piece-0`]: 38 }), red, 3, noRandom);
    expect(result.state.pieces.find((piece) => piece.id === `${blue}-piece-0`)?.position).toBe(-1);
  });

  test('finishes the round when the last piece gets home, without an extra turn', () => {
    const result = playPreviewTurn(
      stateWith({ [`${red}-piece-0`]: 40, [`${red}-piece-1`]: 41, [`${red}-piece-2`]: 42, [`${red}-piece-3`]: 37 }),
      red,
      6,
      noRandom,
    );
    expect(result.state.phase).toBe('finished');
    expect(result.state.winnerId).toBe(red);
    expect(result.extraTurn).toBe(false);
  });

  test('does not mutate the previous state', () => {
    const before = stateWith({ [`${red}-piece-0`]: 5 });
    const snapshot = JSON.stringify(before);
    playPreviewTurn(before, red, 3, noRandom);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});
