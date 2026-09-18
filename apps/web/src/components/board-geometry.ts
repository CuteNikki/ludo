import type { Piece, PlayerColor } from '@ludo/shared';

export type Coordinate = readonly [row: number, column: number];

export const PATH: Coordinate[] = [
  [4, 0],
  [4, 1],
  [4, 2],
  [4, 3],
  [4, 4],
  [3, 4],
  [2, 4],
  [1, 4],
  [0, 4],
  [0, 5],
  [0, 6],
  [1, 6],
  [2, 6],
  [3, 6],
  [4, 6],
  [4, 7],
  [4, 8],
  [4, 9],
  [4, 10],
  [5, 10],
  [6, 10],
  [6, 9],
  [6, 8],
  [6, 7],
  [6, 6],
  [7, 6],
  [8, 6],
  [9, 6],
  [10, 6],
  [10, 5],
  [10, 4],
  [9, 4],
  [8, 4],
  [7, 4],
  [6, 4],
  [6, 3],
  [6, 2],
  [6, 1],
  [6, 0],
  [5, 0],
];

export const HOME_LANES: Record<PlayerColor, Coordinate[]> = {
  red: [
    [5, 1],
    [5, 2],
    [5, 3],
    [5, 4],
  ],
  blue: [
    [1, 5],
    [2, 5],
    [3, 5],
    [4, 5],
  ],
  green: [
    [5, 9],
    [5, 8],
    [5, 7],
    [5, 6],
  ],
  yellow: [
    [9, 5],
    [8, 5],
    [7, 5],
    [6, 5],
  ],
};

export const YARDS: Record<PlayerColor, Coordinate[]> = {
  red: [
    [1, 1],
    [1, 2],
    [2, 1],
    [2, 2],
  ],
  blue: [
    [1, 8],
    [1, 9],
    [2, 8],
    [2, 9],
  ],
  green: [
    [8, 8],
    [8, 9],
    [9, 8],
    [9, 9],
  ],
  yellow: [
    [8, 1],
    [8, 2],
    [9, 1],
    [9, 2],
  ],
};

export const START_OFFSETS: Record<PlayerColor, number> = { red: 0, blue: 10, green: 20, yellow: 30 };

/** Board coordinate for a piece: -1 is its yard slot, 0-39 is the shared track, 40+ is its home lane. */
export function getPieceCoordinate(piece: Piece, color: PlayerColor, yardIndex: number): Coordinate | null {
  if (piece.position === -1) return YARDS[color][yardIndex] ?? null;
  if (piece.position < 40) return PATH[(START_OFFSETS[color] + piece.position) % PATH.length] ?? null;
  return HOME_LANES[color][piece.position - 40] ?? null;
}

/** The player color a cell belongs to, if it's that color's start square or home lane. */
export function getCellColor(coordinate: Coordinate): PlayerColor | null {
  for (const color of Object.keys(HOME_LANES) as PlayerColor[]) {
    if (HOME_LANES[color].some((candidate) => key(candidate) === key(coordinate))) return color;
    if (key(PATH[START_OFFSETS[color]]!) === key(coordinate)) return color;
  }
  return null;
}

export function isStartCoordinate(coordinate: Coordinate): boolean {
  return (Object.keys(START_OFFSETS) as PlayerColor[]).some((color) => key(PATH[START_OFFSETS[color]]!) === key(coordinate));
}

export function isPathCoordinate(coordinate: Coordinate): boolean {
  return PATH.some((candidate) => key(candidate) === key(coordinate));
}

/** The yard quadrant a non-path, non-home-lane cell sits in, if any. */
export function getYardColor(row: number, column: number): PlayerColor | null {
  if (row <= 3 && column <= 3) return 'red';
  if (row <= 3 && column >= 7) return 'blue';
  if (row >= 7 && column >= 7) return 'green';
  if (row >= 7 && column <= 3) return 'yellow';
  return null;
}

export function key(coordinate: Coordinate): string {
  return `${coordinate[0]}-${coordinate[1]}`;
}

/** Pixel offset (as a CSS calc() expression) of a row/column index within the 11x11 board grid. */
export function getCellPosition(index: number): string {
  return `calc(${index} * ((100% - 1.25rem) / 11) + ${index} * 0.125rem)`;
}

/** Inclusive range of positions a piece passes through when moving from one board position to another. */
export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
