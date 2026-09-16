'use client';

import { cn } from '@/lib/utils';
import type { GameState, Piece, PlayerColor } from '@ludo/shared';
import { useState } from 'react';

type Coordinate = readonly [row: number, column: number];

const PATH: Coordinate[] = [
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

const HOME_LANES: Record<PlayerColor, Coordinate[]> = {
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

const YARDS: Record<PlayerColor, Coordinate[]> = {
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

const START_OFFSETS: Record<PlayerColor, number> = { red: 0, blue: 10, green: 20, yellow: 30 };
const colorStyles: Record<PlayerColor, { base: string; pale: string; start: string; token: string }> = {
  red: { base: 'bg-red-500', pale: 'bg-red-100', start: 'bg-white ring-4 ring-inset ring-red-500', token: 'bg-red-500 border-red-800' },
  blue: { base: 'bg-blue-600', pale: 'bg-blue-100', start: 'bg-white ring-4 ring-inset ring-blue-600', token: 'bg-blue-600 border-blue-900' },
  green: { base: 'bg-emerald-600', pale: 'bg-emerald-100', start: 'bg-white ring-4 ring-inset ring-emerald-600', token: 'bg-emerald-600 border-emerald-900' },
  yellow: { base: 'bg-amber-400', pale: 'bg-amber-100', start: 'bg-white ring-4 ring-inset ring-amber-400', token: 'bg-amber-400 border-amber-700' },
};

interface GameBoardProps {
  state: GameState;
  playerId: string;
  onMove: (pieceId: string) => void;
}

export function GameBoard({ state, playerId, onMove }: GameBoardProps) {
  const [preview, setPreview] = useState<{ pieceId: string; revision: number } | null>(null);
  const piecesByCell = new Map<string, Piece>();
  const previewPiece =
    preview?.revision === state.revision && state.movablePieceIds.includes(preview.pieceId)
      ? state.pieces.find((piece) => piece.id === preview.pieceId)
      : undefined;
  const previewOwner = previewPiece ? state.players.find((player) => player.id === previewPiece.playerId) : undefined;
  const previewCoordinate =
    previewPiece && previewOwner && state.diceResult !== null
      ? getPieceCoordinate({ ...previewPiece, position: previewPiece.position === -1 ? 0 : previewPiece.position + state.diceResult }, previewOwner.color, 0)
      : null;

  for (const player of state.players) {
    const pieces = state.pieces.filter((piece) => piece.playerId === player.id);
    pieces.forEach((piece, index) => {
      const coordinate = getPieceCoordinate(piece, player.color, index);
      if (coordinate) piecesByCell.set(key(coordinate), piece);
    });
  }

  return (
    <div className='aspect-square w-full max-w-170 border-2 border-stone-900 bg-stone-900 p-0.5 shadow-[8px_8px_0_#1c1917]'>
      <div className='grid h-full w-full grid-cols-11 grid-rows-11 gap-0.5 bg-stone-900' aria-label='Ludo-Spielfeld'>
        {Array.from({ length: 121 }, (_, index) => {
          const coordinate: Coordinate = [Math.floor(index / 11), index % 11];
          const piece = piecesByCell.get(key(coordinate));
          const owner = piece ? state.players.find((player) => player.id === piece.playerId) : undefined;
          const movable = piece ? state.movablePieceIds.includes(piece.id) && piece.playerId === playerId : false;
          const cellColor = getCellColor(coordinate);
          const isStart = cellColor !== null && isStartCoordinate(coordinate);
          const isPreviewTarget = previewCoordinate && key(previewCoordinate) === key(coordinate);
          const isCaptureTarget = isPreviewTarget && piece && previewPiece && piece.playerId !== previewPiece.playerId;

          return (
            <div
              key={key(coordinate)}
              data-cell-role={isStart ? 'start' : cellColor ? 'goal' : undefined}
              className={cn(
                'relative grid min-h-0 min-w-0 place-items-center',
                getCellStyle(coordinate, cellColor, isStart),
                isPreviewTarget && 'z-10 ring-4 ring-inset ring-amber-300',
              )}
            >
              {isPreviewTarget && !piece && previewOwner && (
                <span
                  className={cn('pointer-events-none h-[62%] w-[62%] rounded-full border-2 border-dashed opacity-55', colorStyles[previewOwner.color].token)}
                />
              )}
              {piece && owner && (
                <button
                  type='button'
                  disabled={!movable}
                  onClick={() => {
                    setPreview(null);
                    onMove(piece.id);
                  }}
                  onMouseEnter={() => movable && setPreview({ pieceId: piece.id, revision: state.revision })}
                  onMouseLeave={() => setPreview(null)}
                  onFocus={() => movable && setPreview({ pieceId: piece.id, revision: state.revision })}
                  onBlur={() => setPreview(null)}
                  aria-label={`Figur von ${owner.name}${movable ? ' bewegen' : ''}`}
                  className={cn(
                    'h-[72%] w-[72%] rounded-full border-2 shadow-sm transition-transform',
                    colorStyles[owner.color].token,
                    movable && 'z-10 cursor-pointer ring-4 ring-white ring-offset-2 ring-offset-stone-950 hover:scale-110 animate-pulse',
                    isCaptureTarget && 'scale-90 ring-4 ring-amber-300',
                  )}
                >
                  <span className='sr-only'>{owner.name}</span>
                </button>
              )}
              {isCaptureTarget && (
                <span
                  className='pointer-events-none absolute -right-1 -top-1 z-30 grid h-5 w-5 place-items-center rounded-full bg-stone-950 text-xs font-black text-white'
                  aria-label='Figur wird geschlagen'
                >
                  ×
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getPieceCoordinate(piece: Piece, color: PlayerColor, yardIndex: number): Coordinate | null {
  if (piece.position === -1) return YARDS[color][yardIndex] ?? null;
  if (piece.position < 40) return PATH[(START_OFFSETS[color] + piece.position) % PATH.length] ?? null;
  return HOME_LANES[color][piece.position - 40] ?? null;
}

function getCellColor(coordinate: Coordinate): PlayerColor | null {
  for (const color of Object.keys(HOME_LANES) as PlayerColor[]) {
    if (HOME_LANES[color].some((candidate) => key(candidate) === key(coordinate))) return color;
    if (key(PATH[START_OFFSETS[color]]!) === key(coordinate)) return color;
  }
  return null;
}

function getCellStyle(coordinate: Coordinate, color: PlayerColor | null, isStart: boolean): string {
  const [row, column] = coordinate;
  const isPath = PATH.some((candidate) => key(candidate) === key(coordinate));
  const yardColor = getYardColor(row, column);
  const isCenter = row >= 4 && row <= 6 && column >= 4 && column <= 6 && !isPath && !color;

  if (color) return isStart ? colorStyles[color].start : colorStyles[color].base;
  if (isPath) return 'bg-white';
  if (isCenter) return 'bg-stone-800';
  if (yardColor) return colorStyles[yardColor].pale;
  return 'bg-stone-100';
}

function isStartCoordinate(coordinate: Coordinate): boolean {
  return (Object.keys(START_OFFSETS) as PlayerColor[]).some((color) => key(PATH[START_OFFSETS[color]]!) === key(coordinate));
}

function getYardColor(row: number, column: number): PlayerColor | null {
  if (row <= 3 && column <= 3) return 'red';
  if (row <= 3 && column >= 7) return 'blue';
  if (row >= 7 && column >= 7) return 'green';
  if (row >= 7 && column <= 3) return 'yellow';
  return null;
}

function key(coordinate: Coordinate): string {
  return `${coordinate[0]}-${coordinate[1]}`;
}
