import type { Piece } from '@ludo/shared';
import { describe, expect, test } from 'bun:test';

import {
  PATH,
  START_OFFSETS,
  getCellColor,
  getCellPosition,
  getPieceCoordinate,
  getYardColor,
  isPathCoordinate,
  isStartCoordinate,
  key,
  range,
} from './board-geometry';

function piece(position: number): Piece {
  return { id: 'p', playerId: 'player', position };
}

describe('getPieceCoordinate', () => {
  test('returns the yard slot for a piece at home', () => {
    expect(getPieceCoordinate(piece(-1), 'red', 0)).toEqual([1, 1]);
    expect(getPieceCoordinate(piece(-1), 'red', 2)).toEqual([2, 1]);
  });

  test('returns the start square for position 0, per color offset', () => {
    expect(getPieceCoordinate(piece(0), 'red', 0)).toEqual(PATH[0]!);
    expect(getPieceCoordinate(piece(0), 'blue', 0)).toEqual(PATH[10]!);
    expect(getPieceCoordinate(piece(0), 'green', 0)).toEqual(PATH[20]!);
    expect(getPieceCoordinate(piece(0), 'yellow', 0)).toEqual(PATH[30]!);
  });

  test('wraps around the shared track using the color offset', () => {
    // Blue starts at PATH index 10, so position 35 lands at (10 + 35) % 40 = 5.
    expect(getPieceCoordinate(piece(35), 'blue', 0)).toEqual(PATH[5]!);
  });

  test('returns the home lane for positions 40-43', () => {
    expect(getPieceCoordinate(piece(40), 'red', 0)).toEqual([5, 1]);
    expect(getPieceCoordinate(piece(43), 'red', 0)).toEqual([5, 4]);
  });

  test('returns null once a piece is past the end of its home lane', () => {
    expect(getPieceCoordinate(piece(44), 'red', 0)).toBeNull();
  });
});

describe('getCellColor', () => {
  test('identifies each color’s start square', () => {
    for (const color of Object.keys(START_OFFSETS) as (keyof typeof START_OFFSETS)[]) {
      expect(getCellColor(PATH[START_OFFSETS[color]]!)).toBe(color);
    }
  });

  test('identifies home lane cells', () => {
    expect(getCellColor([5, 2])).toBe('red');
    expect(getCellColor([2, 5])).toBe('blue');
  });

  test('returns null for a regular path cell', () => {
    expect(getCellColor(PATH[1]!)).toBeNull();
  });

  test('returns null for a yard cell', () => {
    expect(getCellColor([1, 1])).toBeNull();
  });
});

describe('isStartCoordinate / isPathCoordinate', () => {
  test('start squares are also path cells', () => {
    expect(isStartCoordinate(PATH[0]!)).toBe(true);
    expect(isPathCoordinate(PATH[0]!)).toBe(true);
  });

  test('non-start path cells are not start squares', () => {
    expect(isStartCoordinate(PATH[1]!)).toBe(false);
    expect(isPathCoordinate(PATH[1]!)).toBe(true);
  });

  test('a yard cell is neither', () => {
    expect(isStartCoordinate([1, 1])).toBe(false);
    expect(isPathCoordinate([1, 1])).toBe(false);
  });
});

describe('getYardColor', () => {
  test('maps each quadrant to its color', () => {
    expect(getYardColor(1, 1)).toBe('red');
    expect(getYardColor(1, 9)).toBe('blue');
    expect(getYardColor(9, 9)).toBe('green');
    expect(getYardColor(9, 1)).toBe('yellow');
  });

  test('returns null for the center cross', () => {
    expect(getYardColor(5, 5)).toBeNull();
  });
});

describe('key', () => {
  test('formats a coordinate as "row-column"', () => {
    expect(key([4, 7])).toBe('4-7');
  });
});

describe('getCellPosition', () => {
  test('produces a calc() expression scaled by the given index', () => {
    expect(getCellPosition(0)).toBe('calc(0 * ((100% - 1.25rem) / 11) + 0 * 0.125rem)');
    expect(getCellPosition(3)).toBe('calc(3 * ((100% - 1.25rem) / 11) + 3 * 0.125rem)');
  });
});

describe('range', () => {
  test('is inclusive of both ends', () => {
    expect(range(2, 5)).toEqual([2, 3, 4, 5]);
  });

  test('handles a single-element range', () => {
    expect(range(4, 4)).toEqual([4]);
  });
});
