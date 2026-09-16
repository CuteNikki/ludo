import { describe, expect, test } from 'bun:test';
import { FairDice } from './fair-dice';

describe('FairDice', () => {
  test('deals every face exactly once per six personal rolls', () => {
    const dice = new FairDice();

    for (const playerId of ['red-player', 'blue-player']) {
      for (let batch = 0; batch < 20; batch += 1) {
        const rolls = Array.from({ length: 6 }, () => dice.roll(playerId)).sort();
        expect(rolls).toEqual([1, 2, 3, 4, 5, 6]);
      }
    }
  });
});
