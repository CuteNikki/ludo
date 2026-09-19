import type { GameState, Piece } from '@ludo/shared';
import { chooseBotMove, toBoardPosition } from '@ludo/shared';
import { describe, expect, test } from 'bun:test';

/** Two-player state: the bot is red, the opponent blue, with the given piece positions (padded with yard pieces). */
function stateFor(dice: number, botPositions: number[], opponentPositions: number[] = []): GameState {
  const pieces = (playerId: string, positions: number[]): Piece[] =>
    Array.from({ length: 4 }, (_, index) => ({ id: `${playerId}-${index}`, playerId, position: positions[index] ?? -1 }));
  const allPieces = [...pieces('bot', botPositions), ...pieces('human', opponentPositions)];
  const bot = allPieces.filter((piece) => piece.playerId === 'bot');
  return {
    roomCode: 'TEST',
    hostPlayerId: 'human',
    settings: {
      moveTimeSeconds: 30,
      automaticSingleMove: true,
      fairDice: true,
      isPublic: false,
      mustSpawnOnSix: false,
      extraTurnOnCapture: false,
      safeStartSquares: false,
      threeTriesToLeaveYard: false,
    },
    phase: 'playing',
    turnStage: 'move',
    turnDeadline: null,
    players: [
      { id: 'bot', name: 'Robo', color: 'red', connected: true, ready: true, isBot: true },
      { id: 'human', name: 'Ada', color: 'blue', connected: true, ready: true, isBot: false },
    ],
    pieces: allPieces,
    currentPlayerId: 'bot',
    diceResult: dice,
    movablePieceIds: bot.filter((piece) => piece.position !== -1 && piece.position + dice <= 43).map((piece) => piece.id),
    winnerId: null,
    rematchDeadline: null,
    rematchPlayerIds: [],
    revision: 0,
  };
}

const noRandom = () => 0;

describe('chooseBotMove', () => {
  test('maps relative positions onto the shared track', () => {
    expect(toBoardPosition('red', 5)).toBe(5);
    expect(toBoardPosition('blue', 35)).toBe(5);
  });

  test('returns null when there is nothing to move', () => {
    expect(chooseBotMove({ ...stateFor(3, [5]), movablePieceIds: [] }, 'bot', noRandom)).toBeNull();
    expect(chooseBotMove({ ...stateFor(3, [5]), diceResult: null }, 'bot', noRandom)).toBeNull();
  });

  test('prefers capturing an opponent', () => {
    // Bot piece 0 at 5 (+3 -> 8) hits the blue piece on board square 8 (blue relative 38);
    // piece 1 at 12 has a free move ahead instead.
    const state = stateFor(3, [5, 12], [38]);
    expect(chooseBotMove(state, 'bot', noRandom)).toBe('bot-0');
  });

  test('treats a start square as safe from opponents about to spawn', () => {
    // Blue's yard pieces would spawn onto square 10. Bot piece 0 (5 + 5) lands there, piece 1 (3 + 5 -> 8) doesn't.
    // Normally that's a risk worth avoiding, but not on a safe start square.
    const state = stateFor(5, [5, 3]);
    expect(chooseBotMove(state, 'bot', noRandom)).toBe('bot-1');

    state.settings.safeStartSquares = true;
    expect(chooseBotMove(state, 'bot', noRandom)).toBe('bot-0');
  });

  test('prefers entering the home stretch', () => {
    // Piece 1 at 38 (+3 -> 41) enters home; piece 0 at 20 (+3 -> 23) just advances.
    const state = stateFor(3, [20, 38]);
    expect(chooseBotMove(state, 'bot', noRandom)).toBe('bot-1');
  });

  test('spawns a piece on a six when nothing better is available', () => {
    const state = stateFor(6, [10]);
    state.movablePieceIds = ['bot-0', 'bot-1'];
    expect(chooseBotMove(state, 'bot', noRandom)).toBe('bot-1');
  });

  test('avoids landing right in front of an opponent piece', () => {
    // Blue piece sits on board square 12 (relative 2). Landing on 14 (bot-0: 10+4) is within its
    // reach; landing on 26 (bot-1: 22+4) is not.
    const state = stateFor(4, [10, 22], [2]);
    expect(chooseBotMove(state, 'bot', noRandom)).toBe('bot-1');
  });

  test('moves a threatened piece out of danger', () => {
    // Blue piece on board square 12 threatens the bot piece on 15 (bot-0); a 4 carries it to 19,
    // out of reach, while bot-1 is nowhere near danger.
    const state = stateFor(4, [15, 30], [2]);
    expect(chooseBotMove(state, 'bot', noRandom)).toBe('bot-0');
  });
});
