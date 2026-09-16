'use client';

import { cn } from '@/lib/utils';
import type { GameState, Piece, PlayerColor } from '@ludo/shared';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

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
const colorStyles: Record<PlayerColor, { base: string; marker: string; pale: string; start: string; token: string }> = {
  red: {
    base: 'bg-red-500',
    marker: 'border-red-500',
    pale: 'bg-red-100',
    start: 'bg-white ring-4 ring-inset ring-red-500',
    token: 'bg-red-500 border-red-800',
  },
  blue: {
    base: 'bg-blue-600',
    marker: 'border-blue-600',
    pale: 'bg-blue-100',
    start: 'bg-white ring-4 ring-inset ring-blue-600',
    token: 'bg-blue-600 border-blue-900',
  },
  green: {
    base: 'bg-emerald-600',
    marker: 'border-emerald-600',
    pale: 'bg-emerald-100',
    start: 'bg-white ring-4 ring-inset ring-emerald-600',
    token: 'bg-emerald-600 border-emerald-900',
  },
  yellow: {
    base: 'bg-amber-400',
    marker: 'border-amber-500',
    pale: 'bg-amber-100',
    start: 'bg-white ring-4 ring-inset ring-amber-400',
    token: 'bg-amber-400 border-amber-700',
  },
};

interface GameBoardProps {
  state: GameState;
  playerId: string;
  onMove: (pieceId: string) => void;
}

export function GameBoard({ state, playerId, onMove }: GameBoardProps) {
  const [preview, setPreview] = useState<{ pieceId: string; revision: number } | null>(null);
  const [visualCoordinates, setVisualCoordinates] = useState<Record<string, Coordinate>>(() => getCurrentCoordinates(state));
  const [transferringPieceIds, setTransferringPieceIds] = useState<Set<string>>(() => new Set());
  const [captureAnimations, setCaptureAnimations] = useState<Record<string, { from: Coordinate; to: Coordinate }>>({});
  const previousPositions = useRef(new Map(state.pieces.map((piece) => [piece.id, piece.position])));
  const piecesByCell = new Map<string, Piece>();
  const positionedPieces: Array<{ piece: Piece; owner: GameState['players'][number]; coordinate: Coordinate; movable: boolean }> = [];
  const previewPiece =
    preview?.revision === state.revision && state.movablePieceIds.includes(preview.pieceId)
      ? state.pieces.find((piece) => piece.id === preview.pieceId)
      : undefined;
  const previewOwner = previewPiece ? state.players.find((player) => player.id === previewPiece.playerId) : undefined;
  const previewCoordinate =
    previewPiece && previewOwner && state.diceResult !== null
      ? getPieceCoordinate({ ...previewPiece, position: previewPiece.position === -1 ? 0 : previewPiece.position + state.diceResult }, previewOwner.color, 0)
      : null;

  useEffect(() => {
    let cancelled = false;
    const previous = previousPositions.current;
    previousPositions.current = new Map(state.pieces.map((piece) => [piece.id, piece.position]));

    async function animateMoves() {
      const immediateCoordinates: Record<string, Coordinate> = {};
      const transfers = new Set<string>();
      const captures: Record<string, { from: Coordinate; to: Coordinate }> = {};
      const movingPieces: Array<{ piece: Piece; color: PlayerColor; positions: number[] }> = [];

      for (const player of state.players) {
        const pieces = state.pieces.filter((piece) => piece.playerId === player.id);
        pieces.forEach((piece, yardIndex) => {
          const previousPosition = previous.get(piece.id);
          const coordinate = getPieceCoordinate(piece, player.color, yardIndex);
          if (previousPosition !== undefined && previousPosition >= 0 && piece.position === -1 && coordinate) {
            const from = getPieceCoordinate({ ...piece, position: previousPosition }, player.color, yardIndex);
            if (from) captures[piece.id] = { from, to: coordinate };
          }
          if (previousPosition !== undefined && previousPosition >= 0 && piece.position > previousPosition) {
            movingPieces.push({ piece, color: player.color, positions: range(previousPosition + 1, piece.position) });
          } else {
            if (coordinate && !captures[piece.id]) immediateCoordinates[piece.id] = coordinate;
            if (previousPosition !== undefined && previousPosition < 0 !== piece.position < 0) transfers.add(piece.id);
          }
        });
      }

      if (Object.keys(immediateCoordinates).length > 0) {
        if (transfers.size > 0) setTransferringPieceIds(transfers);
        setVisualCoordinates((current) => ({ ...current, ...immediateCoordinates }));
        if (transfers.size > 0) {
          window.setTimeout(() => {
            if (!cancelled) setTransferringPieceIds(new Set());
          }, 260);
        }
      }

      await Promise.all(
        movingPieces.map(async ({ piece, color, positions }) => {
          for (const position of positions) {
            if (cancelled) return;
            const coordinate = getPieceCoordinate({ ...piece, position }, color, 0);
            if (coordinate) setVisualCoordinates((current) => ({ ...current, [piece.id]: coordinate }));
            await wait(135);
          }
        }),
      );

      if (Object.keys(captures).length > 0) {
        const captureCoordinates = Object.fromEntries(Object.entries(captures).map(([pieceId, capture]) => [pieceId, capture.to]));
        setVisualCoordinates((current) => ({ ...current, ...immediateCoordinates, ...captureCoordinates }));
        setCaptureAnimations(captures);
        window.setTimeout(() => {
          if (!cancelled) setCaptureAnimations({});
        }, 1_450);
      }
    }

    void animateMoves();
    return () => {
      cancelled = true;
    };
  }, [state.pieces, state.players, state.revision]);

  for (const player of state.players) {
    const pieces = state.pieces.filter((piece) => piece.playerId === player.id);
    pieces.forEach((piece, index) => {
      const coordinate = getPieceCoordinate(piece, player.color, index);
      if (coordinate) {
        piecesByCell.set(key(coordinate), piece);
        positionedPieces.push({
          piece,
          owner: player,
          coordinate: visualCoordinates[piece.id] ?? coordinate,
          movable: state.phase === 'playing' && state.turnStage === 'move' && state.movablePieceIds.includes(piece.id) && piece.playerId === playerId,
        });
      }
    });
  }

  return (
    <div className='board-enter aspect-square w-full max-w-170 border-2 border-stone-900 bg-stone-900 p-0.5 shadow-[8px_8px_0_#1c1917]'>
      <div className='relative grid h-full w-full grid-cols-11 grid-rows-11 gap-0.5 bg-stone-900' aria-label='Ludo-Spielfeld'>
        {Array.from({ length: 121 }, (_, index) => {
          const coordinate: Coordinate = [Math.floor(index / 11), index % 11];
          const piece = piecesByCell.get(key(coordinate));
          const cellColor = getCellColor(coordinate);
          const isStart = cellColor !== null && isStartCoordinate(coordinate);
          const isPreviewTarget = previewCoordinate && key(previewCoordinate) === key(coordinate);
          const isCaptureTarget = isPreviewTarget && piece && previewPiece && piece.playerId !== previewPiece.playerId;

          return (
            <div
              key={key(coordinate)}
              data-cell-role={isStart ? 'start' : cellColor ? 'goal' : undefined}
              className={cn(
                'board-cell relative grid min-h-0 min-w-0 place-items-center',
                getCellStyle(coordinate, cellColor, isStart),
                isPreviewTarget && 'z-10 brightness-95',
              )}
            >
              {isPreviewTarget && !piece && previewOwner && (
                <span
                  className={cn(
                    'destination-marker pointer-events-none grid h-[52%] w-[52%] place-items-center rounded-full border-[3px] bg-white/90 shadow-sm',
                    colorStyles[previewOwner.color].marker,
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', colorStyles[previewOwner.color].base)} />
                </span>
              )}
            </div>
          );
        })}
        <div className='pointer-events-none absolute inset-0 z-20' aria-hidden='false'>
          {positionedPieces.map(({ piece, owner, coordinate, movable }) => {
            const isCaptureTarget = previewCoordinate && key(previewCoordinate) === key(coordinate) && previewPiece?.playerId !== piece.playerId;
            const capture = captureAnimations[piece.id];
            const captureStyle = capture
              ? ({
                  '--capture-from-left': getBoardAxisPosition(capture.from[1]),
                  '--capture-from-top': getBoardAxisPosition(capture.from[0]),
                  '--capture-to-left': getBoardAxisPosition(capture.to[1]),
                  '--capture-to-top': getBoardAxisPosition(capture.to[0]),
                } as CSSProperties)
              : undefined;
            return (
              <div
                key={piece.id}
                className={cn(
                  'piece-position pointer-events-none absolute grid place-items-center',
                  transferringPieceIds.has(piece.id) && 'piece-position-instant',
                  capture && 'piece-capture-flight',
                )}
                style={{ left: getBoardAxisPosition(coordinate[1]), top: getBoardAxisPosition(coordinate[0]), ...captureStyle }}
              >
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
                    'piece-token pointer-events-auto h-full w-full rounded-full border-2 shadow-[inset_0_2px_0_rgba(255,255,255,.35),0_2px_3px_rgba(28,25,23,.3)] transition-[transform,box-shadow] duration-200',
                    colorStyles[owner.color].token,
                    movable && 'movable-piece cursor-pointer hover:scale-110',
                    isCaptureTarget && 'scale-90 ring-4 ring-amber-300',
                    capture && 'piece-capture-token',
                  )}
                >
                  <span className='sr-only'>{owner.name}</span>
                </button>
                {isCaptureTarget && (
                  <span
                    className='pointer-events-none absolute -right-1.5 -top-1.5 z-30 grid h-4 w-4 place-items-center rounded-full border border-white bg-stone-950 text-[10px] font-black leading-none text-white shadow-sm'
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

function getBoardAxisPosition(index: number): string {
  const gapOffset = index - ((index + 0.5) * 10) / 11;
  return `calc(${((index + 0.5) / 11) * 100}% + ${gapOffset * 0.125}rem)`;
}

function getCurrentCoordinates(state: GameState): Record<string, Coordinate> {
  const coordinates: Record<string, Coordinate> = {};
  for (const player of state.players) {
    state.pieces
      .filter((piece) => piece.playerId === player.id)
      .forEach((piece, yardIndex) => {
        const coordinate = getPieceCoordinate(piece, player.color, yardIndex);
        if (coordinate) coordinates[piece.id] = coordinate;
      });
  }
  return coordinates;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
