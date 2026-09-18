'use client';

import { cn } from '@/lib/utils';
import type { GameState, Piece, PlayerColor } from '@ludo/shared';
import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type Coordinate,
  getCellColor,
  getCellPosition,
  getPieceCoordinate,
  getYardColor,
  isPathCoordinate,
  isStartCoordinate,
  key,
} from './board-geometry';
import { usePieceAnimations } from './use-piece-animations';

const colorStyles: Record<PlayerColor, { base: string; marker: string; pale: string; start: string; token: string }> = {
  red: {
    base: 'bg-red-500',
    marker: 'border-red-500',
    pale: 'bg-red-300',
    start: 'bg-background-alternative before:absolute before:inset-1 before:border-4 before:border-red-500 before:content-[""]',
    token: 'bg-red-500 border-red-800',
  },
  blue: {
    base: 'bg-blue-600',
    marker: 'border-blue-600',
    pale: 'bg-blue-300',
    start: 'bg-background-alternative before:absolute before:inset-1 before:border-4 before:border-blue-600 before:content-[""]',
    token: 'bg-blue-600 border-blue-900',
  },
  green: {
    base: 'bg-green-600',
    marker: 'border-green-600',
    pale: 'bg-green-300',
    start: 'bg-background-alternative before:absolute before:inset-1 before:border-4 before:border-green-600 before:content-[""]',
    token: 'bg-green-600 border-green-900',
  },
  yellow: {
    base: 'bg-yellow-500',
    marker: 'border-yellow-500',
    pale: 'bg-yellow-200',
    start: 'bg-background-alternative before:absolute before:inset-1 before:border-4 before:border-yellow-400 before:content-[""]',
    token: 'bg-yellow-400 border-yellow-700',
  },
};

interface GameBoardProps {
  state: GameState;
  playerId: string;
  onMove: (pieceId: string) => void;
}

export function GameBoard({ state, playerId, onMove }: GameBoardProps) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<{ pieceId: string; revision: number } | null>(null);
  const { animations, clearAnimation, registerNode } = usePieceAnimations(state);

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

  for (const player of state.players) {
    const pieces = state.pieces.filter((piece) => piece.playerId === player.id);
    pieces.forEach((piece) => {
      const originalIndex = parseInt(piece.id.split('-').pop() ?? '0', 10);
      const groundTruthCoordinate = getPieceCoordinate(piece, player.color, originalIndex);

      if (groundTruthCoordinate) {
        const coordinate = animations[piece.id]?.coordinate ?? groundTruthCoordinate;
        piecesByCell.set(key(groundTruthCoordinate), piece);
        positionedPieces.push({
          piece,
          owner: player,
          coordinate,
          movable: state.phase === 'playing' && state.turnStage === 'move' && state.movablePieceIds.includes(piece.id) && piece.playerId === playerId,
        });
      }
    });
  }

  return (
    <div className='aspect-square w-full max-w-170 border-4 border-border bg-border shadow-[8px_8px_0_var(--shadow-color)]'>
      <div className='relative grid h-full w-full grid-cols-11 grid-rows-11 gap-0.5 bg-border' aria-label={t('board.ariaLabel')}>
        {Array.from({ length: 121 }, (_, index) => {
          const coordinate: Coordinate = [Math.floor(index / 11), index % 11];
          const piece = piecesByCell.get(key(coordinate));
          const cellColor = getCellColor(coordinate);
          const isStart = cellColor !== null && isStartCoordinate(coordinate);
          const isPreviewTarget = previewCoordinate && key(previewCoordinate) === key(coordinate);

          return (
            <div
              key={key(coordinate)}
              data-cell-role={isStart ? 'start' : cellColor ? 'goal' : undefined}
              className={cn(
                'relative grid min-h-0 min-w-0 place-items-center transition-[filter,box-shadow] duration-180 ease-out',
                getCellStyle(coordinate, cellColor, isStart),
                isPreviewTarget && 'z-10 brightness-95',
              )}
            >
              {isPreviewTarget && !piece && previewOwner && (
                <span
                  className={cn(
                    'animate-destination-enter pointer-events-none grid h-[52%] w-[52%] place-items-center rounded-full border-[3px] bg-background-alternative/90 shadow-sm',
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
            const animation = animations[piece.id];
            const isMoving = animation?.kind === 'moving';
            const flight = animation?.kind === 'spawning' || animation?.kind === 'capturing' ? animation : undefined;
            const isCaptureTarget = previewCoordinate && key(previewCoordinate) === key(coordinate) && previewPiece?.playerId !== piece.playerId;

            const activeAnimStyle = flight
              ? ({
                  '--capture-from-left': getCellPosition(flight.from[1]),
                  '--capture-from-top': getCellPosition(flight.from[0]),
                  '--capture-to-left': getCellPosition(flight.to[1]),
                  '--capture-to-top': getCellPosition(flight.to[0]),
                } as CSSProperties)
              : undefined;

            return (
              <div
                key={piece.id}
                ref={(node) => registerNode(piece.id, node)}
                className={cn(
                  'pointer-events-none absolute flex items-center justify-center',
                  isMoving || flight ? 'z-50' : 'z-10',
                  !animation && 'transition-[left,top] duration-130 ease-[cubic-bezier(0.22,0.8,0.25,1)] will-change-[left,top]',
                  flight?.kind === 'capturing' && 'animate-piece-capture-flight',
                  flight?.kind === 'spawning' && 'animate-piece-spawn-flight',
                )}
                style={{
                  width: 'calc((100% - 1.25rem) / 11)',
                  height: 'calc((100% - 1.25rem) / 11)',
                  left: getCellPosition(coordinate[1]),
                  top: getCellPosition(coordinate[0]),
                  ...activeAnimStyle,
                }}
                onAnimationEnd={(event) => {
                  if (flight?.kind === 'capturing' && event.animationName === 'piece-capture-flight') clearAnimation(piece.id, 'capturing');
                  if (flight?.kind === 'spawning' && event.animationName === 'piece-spawn-flight') clearAnimation(piece.id, 'spawning');
                }}
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
                  aria-label={t(movable ? 'board.pieceAriaMovable' : 'board.pieceAria', { name: owner.name })}
                  className={cn(
                    'pointer-events-auto block w-[82%] h-auto aspect-square shrink-0 rounded-full border-2 shadow-[inset_0_2px_0_rgba(255,255,255,.35),0_2px_3px_rgba(0,0,0,.4)] transition-[transform,box-shadow] duration-200',
                    colorStyles[owner.color].token,
                    movable && 'animate-movable-piece cursor-pointer outline-4 outline-amber-300 hover:scale-110',
                    isCaptureTarget && 'scale-90 ring-4 ring-amber-300',
                    flight?.kind === 'capturing' && 'animate-piece-capture-token',
                  )}
                >
                  <span className='sr-only'>{owner.name}</span>
                </button>
                {isCaptureTarget && flight?.kind === 'capturing' && (
                  <span
                    className='pointer-events-none absolute -right-1.5 -top-1.5 z-30 grid h-4 w-4 place-items-center rounded-full border border-background-alternative bg-foreground text-[10px] font-black leading-none text-background shadow-sm'
                    aria-label={t('board.captureAria')}
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

function getCellStyle(coordinate: Coordinate, color: PlayerColor | null, isStart: boolean): string {
  const [row, column] = coordinate;
  const yardColor = getYardColor(row, column);
  const isCenter = row >= 4 && row <= 6 && column >= 4 && column <= 6 && !isPathCoordinate(coordinate) && !color;

  if (color) return isStart ? colorStyles[color].start : colorStyles[color].base;
  if (isPathCoordinate(coordinate)) return 'bg-background-alternative';
  if (isCenter) return 'bg-foreground/10';
  if (yardColor) return colorStyles[yardColor].pale;
  return 'bg-background';
}
